export type SaveResult = { ok: true } | { ok: false; error: string };

export interface DocPort {
    save(doc: unknown, signal?: AbortSignal): Promise<SaveResult>;
}
