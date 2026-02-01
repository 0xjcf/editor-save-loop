import { makeAutoObservable, runInAction, toJS } from "mobx";
import { createActor } from "xstate";
import { FakeDocAdapter } from "./adapter";
import {
	type DocEvent,
	type DocState,
	initialDocState,
	reduceDoc,
} from "./core";
import { type DocFsmState, docMachine } from "./docMachine";
import { type DocSnapshot, toDocEvent } from "./docSnapshot";
import type { DocPort } from "./ports";
import { type DocView, type DocViewModel, projectDoc } from "./projection";

/**
 * Store holds state + FSM and forwards reducer emits. It never performs I/O.
 */
class DocStore {
	private state: DocState = initialDocState;
	private actor = createActor(docMachine);
	private fsmState: DocFsmState = "idle";

	constructor() {
		this.actor.start();
		this.actor.subscribe((snapshot) => {
			runInAction(() => {
				this.fsmState = snapshot.value;
			});
		});
		makeAutoObservable(this, {}, { autoBind: true });
	}

	get projection(): DocView {
		return projectDoc(this.state, this.fsmState);
	}

	get workflowState(): DocFsmState {
		return this.fsmState;
	}

	get doc(): DocSnapshot | null {
		return this.state.doc;
	}

	dispatch(event: DocEvent) {
		const result = reduceDoc(this.state, event);
		this.state = result.state;

		if (result.emit) {
			const snapshot = this.actor.getSnapshot();
			if (!snapshot.can(result.emit)) {
				throw new Error(`Illegal lifecycle event: ${result.emit.type}`);
			}
			this.actor.send(result.emit);
		}
	}
}

/**
 * DocShell orchestrates time, cancellation, and I/O.
 * It exposes a view model and forwards user intent to the lifecycle boundary.
 */
export class DocShell {
	private store: DocStore;
	private docPort: DocPort;
	private controller: AbortController | null = null;
	private saveRequestId = 0;

	constructor(docPort: DocPort, store = new DocStore()) {
		this.docPort = docPort;
		this.store = store;
		makeAutoObservable(this, {}, { autoBind: true });
	}

	// UI-facing view model; consumers should use this instead of raw state.
	get view(): DocViewModel {
		return {
			...this.store.projection,
			saveNow: this.saveNow,
			onEditorChanged: this.onEditorChanged,
		};
	}

	// Delivery / UI intent: editor changed
	onEditorChanged(doc: unknown) {
		this.store.dispatch(toDocEvent(doc));
	}

	/**
	 * Measure document size in the shell so the core can make policy decisions
	 * without performing serialization work itself.
	 */
	private getDocSizeBytes(
		doc: DocSnapshot | null,
	): { ok: true; bytes: number } | { ok: false; error: string } {
		if (!doc) {
			return { ok: false, error: "No document to save." };
		}

		try {
			const json = JSON.stringify(toJS(doc));
			const bytes = new TextEncoder().encode(json).length;
			return { ok: true, bytes };
		} catch {
			return { ok: false, error: "Unable to measure document size." };
		}
	}

	/**
	 * Explicit save action: ask the core if saving is allowed, then call the port.
	 * The core can reject the save, and the shell respects that decision.
	 */
	async saveNow() {
		// cancel in-flight saves; latest wins (performance + sanity)
		this.controller?.abort();
		this.controller = new AbortController();
		const requestId = ++this.saveRequestId;

		const doc = this.store.doc;
		const sizeResult = this.getDocSizeBytes(doc);
		this.store.dispatch({
			type: "SAVE_REQUESTED",
			docPresent: doc !== null,
			sizeResult,
		});

		// If core rejected the request (e.g., policy guard), stop here.
		if (this.store.workflowState !== "saving") return;

		const docToSave = this.store.doc;
		if (!docToSave) return;

		// Call through the port interface; the concrete docPort is interchangeable.
		const result = await this.docPort.save(docToSave, this.controller.signal);

		// Ignore stale results if a newer save started.
		if (requestId !== this.saveRequestId) return;

		// treat as fact → core decides the state
		this.store.dispatch({ type: "SAVE_COMPLETED", at: Date.now(), result });
	}
}

// Default wiring: FakeDocAdapter is one concrete adapter for the DocPort.
export const docShell = new DocShell(new FakeDocAdapter());
