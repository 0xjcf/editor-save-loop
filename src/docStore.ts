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
import { type DocViewModel, projectDoc } from "./projection";

/**
 * DocStore is the imperative shell. It owns long-lived state, coordinates
 * workflows (save/cancel), talks to ports, and forwards reducer emits to the FSM.
 * All state changes flow through core events so behavior remains deterministic.
 */
export class DocStore {
	// --- State owned over time (actor-ish owner)
	private state: DocState = initialDocState;

	// --- Port interface injected; any adapter implementing DocPort can be swapped in.
	private docPort: DocPort;

	// --- Shell concerns (cancellation)
	private controller: AbortController | null = null;
	private saveRequestId = 0;
	private fsmActor = createActor(docMachine);
	private fsmState: DocFsmState = "idle";

	// UI-facing view model; consumers should use this instead of raw state.
	get view(): DocViewModel {
		return {
			...projectDoc(this.state, this.fsmState),
			saveNow: this.saveNow,
		};
	}

	constructor(docPort: DocPort) {
		this.docPort = docPort;
		this.fsmActor.start();
		this.fsmActor.subscribe((snapshot) => {
			runInAction(() => {
				this.fsmState = snapshot.value;
			});
		});
		makeAutoObservable(this, {}, { autoBind: true });
	}

	// Functional-core boundary: all mutations go through events
	private dispatch(event: DocEvent) {
		const result = reduceDoc(this.state, event);
		this.state = result.state;
		if (result.emit) {
			this.fsmActor.send(result.emit);
		}
		return result.emit;
	}

	// Delivery / UI intent: editor changed
	onEditorChanged(doc: unknown) {
		this.dispatch(toDocEvent(doc));
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

		const doc = this.state.doc;
		const sizeResult = this.getDocSizeBytes(doc);
		const emit = this.dispatch({
			type: "SAVE_REQUESTED",
			docPresent: doc !== null,
			sizeResult,
		});

		// If core rejected the request (e.g., policy guard), stop here.
		if (!emit || emit.type !== "SAVE_STARTED") return;

		const docToSave = this.state.doc;
		if (!docToSave) return;

		// Call through the port interface; the concrete docPort is interchangeable.
		const result = await this.docPort.save(docToSave, this.controller.signal);

		// Ignore stale results if a newer save started.
		if (requestId !== this.saveRequestId) return;
		if (!result.ok && result.error === "aborted") return;

		if (result.ok) {
			this.dispatch({ type: "SAVE_SUCCEEDED", at: Date.now() });
		} else {
			// treat as fact → core decides the state
			this.dispatch({ type: "SAVE_FAILED", message: result.error });
		}
	}
}

// Default wiring: FakeDocAdapter is one concrete adapter for the DocPort.
export const docStore = new DocStore(new FakeDocAdapter());
