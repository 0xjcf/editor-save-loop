import type { DocSnapshot } from "./docSnapshot";
import type { DocPort, SaveResult } from "./ports";

/**
 * FakeDocAdapter is a concrete adapter that implements the DocPort interface.
 * It simulates persistence with a small delay and returns errors as data.
 * This keeps the imperative shell in control of outcomes instead of relying
 * on thrown exceptions that bypass decision-making in the core.
 */
export class FakeDocAdapter implements DocPort {
	/**
	 * Simulate a save operation. This never throws; it returns a SaveResult
	 * that the shell can interpret and dispatch as an event.
	 */
	async save(_doc: DocSnapshot, signal?: AbortSignal): Promise<SaveResult> {
		try {
			// Simulate IO latency so UI states (saving/error) are visible.
			await wait(250, signal);
			return { ok: true };
		} catch (e) {
			// Convert cancellation or failure into explicit data.
			const msg =
				e instanceof DOMException && e.name === "AbortError"
					? "aborted"
					: "save failed";
			return { ok: false, error: msg };
		}
	}
}

/**
 * Wait for a short duration. If the AbortSignal fires, reject with an AbortError.
 * This mirrors how real adapters can be cancelled and report that outcome.
 */
function wait(ms: number, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const t = window.setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			window.clearTimeout(t);
			reject(new DOMException("Aborted", "AbortError"));
		});
	});
}
