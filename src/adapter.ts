import type { DocPort, SaveResult } from "./ports";

export class FakeDocAdapter implements DocPort {
    async save(_doc: unknown, signal?: AbortSignal): Promise<SaveResult> {
        try {
            // simulate latency
            await wait(250, signal);
            return { ok: true };
        } catch (e) {
            const msg =
                e instanceof DOMException && e.name === "AbortError"
                    ? "aborted"
                    : "save failed";
            return { ok: false, error: msg };
        }
    }
}

function wait(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            window.clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
}
