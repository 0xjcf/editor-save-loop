import { makeAutoObservable, toJS } from "mobx";
import { FakeDocAdapter } from "./adapter";
import {
	type DocEvent,
	type DocState,
	initialDocState,
	reduceDoc,
} from "./core";
import { type DocSnapshot, isDocSnapshot } from "./docSnapshot";
import type { DocPort } from "./ports";

/**
 * DocStore is the imperative shell. It owns long-lived state, coordinates
 * workflows (save/cancel), and talks to ports. All state changes flow
 * through core events so behavior remains deterministic.
 */
export class DocStore {
	// --- State owned over time (actor-ish owner)
	state: DocState = initialDocState;

	// --- Port interface injected; any adapter implementing DocPort can be swapped in.
	private adapter: DocPort;

	// --- Shell concerns (cancellation)
	private controller: AbortController | null = null;

	constructor(adapter: DocPort) {
		this.adapter = adapter;
		makeAutoObservable(this, {}, { autoBind: true });
	}

	// Functional-core boundary: all mutations go through events
	dispatch(event: DocEvent) {
		this.state = reduceDoc(this.state, event);
	}

	// Delivery / UI intent: editor changed
	onEditorChanged(doc: unknown) {
		if (isDocSnapshot(doc)) {
			this.dispatch({ type: "DOC_CHANGED", doc });
			return;
		}

		this.dispatch({
			type: "DOC_INVALID",
			message: "Editor produced an invalid document snapshot.",
		});
	}

	/**
	 * Measure document size in the shell so the core can make policy decisions
	 * without performing serialization work itself.
	 */
	private getDocSizeBytes(doc: DocSnapshot) {
		try {
			return { ok: true, bytes: JSON.stringify(toJS(doc)).length } as const;
		} catch {
			return { ok: false, error: "Unable to measure document size." } as const;
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

		const doc = this.state.doc;
		if (!doc) {
			this.dispatch({ type: "SAVE_REQUESTED", docSizeBytes: 0 });
			return;
		}

		const sizeResult = this.getDocSizeBytes(doc);
		if (sizeResult.ok) {
			this.dispatch({
				type: "SAVE_REQUESTED",
				docSizeBytes: sizeResult.bytes,
			});
		} else {
			this.dispatch({
				type: "SAVE_REQUESTED",
				docSizeBytes: null,
				docSizeError: sizeResult.error,
			});
		}

		// If core rejected the request (e.g., policy guard), stop here.
		if (this.state.status !== "saving") return;

		// Call through the port interface; the concrete adapter is interchangeable.
		const result = await this.adapter.save(doc, this.controller.signal);

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
