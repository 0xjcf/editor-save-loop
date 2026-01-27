/**
 * SaveResult is an explicit outcome from an adapter.
 * It encodes success or failure without throwing.
 */
import type { DocSnapshot } from "./docSnapshot";

export type SaveResult =
    | { ok: true }
    | { ok: false; reason: "aborted" }
    | { ok: false; reason: "failed"; error: string };

/**
 * DocPort is the IO boundary for persistence. The shell depends on this
 * interface so adapters can be swapped without touching behavior.
 * Adapters (like FakeDocAdapter) implement this port.
 */
export interface DocPort {
    save(doc: DocSnapshot, signal?: AbortSignal): Promise<SaveResult>;
}
