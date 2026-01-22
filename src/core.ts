export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type DocState = {
    status: SaveStatus;
    revision: number;
    lastSavedAt: number | null;
    error: string | null;
    doc: unknown | null; // TipTap JSON snapshot
};

export type DocEvent =
    | { type: "DOC_CHANGED"; doc: unknown }
    | { type: "SAVE_REQUESTED"; docSizeBytes: number | null; docSizeError?: string }
    | { type: "SAVE_SUCCEEDED"; at: number }
    | { type: "SAVE_FAILED"; message: string };

// Core-level policy: reject overly large docs to keep saves bounded.
const MAX_DOC_BYTES = 50_000;

export const initialDocState: DocState = {
    status: "idle",
    revision: 0,
    lastSavedAt: null,
    error: null,
    doc: null,
};

export function reduceDoc(state: DocState, event: DocEvent): DocState {
    switch (event.type) {
        case "DOC_CHANGED":
            return {
                ...state,
                doc: event.doc,
                status: "dirty",
                error: null,
            };

        case "SAVE_REQUESTED": {
            // Guard: don't "save" without a doc snapshot.
            if (!state.doc) return state;

            if (event.docSizeBytes === null) {
                return {
                    ...state,
                    status: "error",
                    error: event.docSizeError ?? "Unable to measure document size.",
                };
            }

            if (event.docSizeBytes > MAX_DOC_BYTES) {
                return {
                    ...state,
                    status: "error",
                    error: "Document is too large to save.",
                };
            }

            return { ...state, status: "saving", error: null };
        }

        case "SAVE_SUCCEEDED":
            return {
                ...state,
                status: "saved",
                revision: state.revision + 1,
                lastSavedAt: event.at,
                error: null,
            };

        case "SAVE_FAILED":
            return { ...state, status: "error", error: event.message };

        default:
            return state;
    }
}
