import { makeAutoObservable, runInAction, toJS } from "mobx";
import { FakeDocAdapter } from "./adapter";
import {
	type DocEvent,
	type DocState,
	initialDocState,
	reduceDoc,
} from "./core";
import type { DocPort } from "./ports";

export class DocStore {
	// --- State owned over time (actor-ish owner)
	state: DocState = initialDocState;

	// --- Ports (contract) injected; adapter is replaceable
	private port: DocPort;

	// --- Shell concerns (cancellation)
	private controller: AbortController | null = null;

	constructor(port: DocPort) {
		this.port = port;
		makeAutoObservable(this, {}, { autoBind: true });
	}

	// Functional-core boundary: all mutations go through events
	dispatch(event: DocEvent) {
		this.state = reduceDoc(this.state, event);
	}

	// Delivery / UI intent: editor changed
	onEditorChanged(doc: unknown) {
		this.dispatch({ type: "DOC_CHANGED", doc });
	}

	private getDocSizeBytes(doc: unknown) {
		try {
			return { ok: true, bytes: JSON.stringify(toJS(doc)).length } as const;
		} catch {
			return { ok: false, error: "Unable to measure document size." } as const;
		}
	}

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

		const result = await this.port.save(doc, this.controller.signal);

		runInAction(() => {
			if (result.ok) {
				this.dispatch({ type: "SAVE_SUCCEEDED", at: Date.now() });
			} else {
				// treat as fact → core decides the state
				this.dispatch({ type: "SAVE_FAILED", message: result.error });
			}
		});
	}
}

// default wiring (swap adapter later without touching core)
export const docStore = new DocStore(new FakeDocAdapter());
