import type { DocFsmEvent } from "./docMachine";
import type { DocChangeEvent, DocSnapshot } from "./docSnapshot";

/**
 * DocState holds business data and persisted meaning.
 * Workflow state is tracked by the FSM; this stays deterministic and serializable.
 */
export type DocState = {
    revision: number;
    lastSavedAt: number | null;
    error: string | null;
    doc: DocSnapshot | null;
};

/**
 * DocEvent is the input to the core. It describes what happened,
 * not how to respond. The core decides how state should change.
 */
export type DocEvent =
    | DocChangeEvent
    | {
          type: "SAVE_REQUESTED";
          docPresent: boolean;
          sizeResult: { ok: true; bytes: number } | { ok: false; error: string };
      }
    | { type: "SAVE_SUCCEEDED"; at: number }
    | { type: "SAVE_FAILED"; message: string };

// Core-level policy: reject overly large docs to keep saves bounded.
// The shell measures bytes; the core only decides based on that data.
const MAX_DOC_BYTES = 50_000;

export const initialDocState: DocState = {
    revision: 0,
    lastSavedAt: null,
    error: null,
    doc: null,
};

export type DocReduceResult = {
    state: DocState;
    emit?: DocFsmEvent;
};

/**
 * Pure reducer: given the current state and an event, returns the next state
 * plus an optional FSM event to emit for visualization.
 * No IO, no time reads, and no environment access.
 */
export function reduceDoc(state: DocState, event: DocEvent): DocReduceResult {
    switch (event.type) {
        case "DOC_CHANGED":
            return {
                state: {
                    ...state,
                    doc: event.doc,
                    error: null,
                },
                emit: { type: "DOC_CHANGED" },
            };

        case "DOC_INVALID":
            return {
                state: {
                    ...state,
                    error: event.message,
                    doc: null,
                },
                emit: { type: "DOC_INVALID" },
            };

        case "SAVE_REQUESTED": {
            if (!event.docPresent) {
                return { state };
            }

            if (!event.sizeResult.ok) {
                return {
                    state: {
                        ...state,
                        error: event.sizeResult.error,
                    },
                    emit: { type: "SAVE_REJECTED" },
                };
            }

            if (event.sizeResult.bytes > MAX_DOC_BYTES) {
                return {
                    state: {
                        ...state,
                        error: "Document is too large to save.",
                    },
                    emit: { type: "SAVE_REJECTED" },
                };
            }

            return {
                state: { ...state, error: null },
                emit: { type: "SAVE_STARTED" },
            };
        }

        case "SAVE_SUCCEEDED":
            return {
                state: {
                    ...state,
                    revision: state.revision + 1,
                    lastSavedAt: event.at,
                    error: null,
                },
                emit: { type: "SAVE_SUCCEEDED" },
            };

        case "SAVE_FAILED":
            return {
                state: { ...state, error: event.message },
                emit: { type: "SAVE_FAILED" },
            };

        default:
            return { state };
    }
}
