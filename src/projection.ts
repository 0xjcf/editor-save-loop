import type { DocState } from "./core";

/**
 * DocView is a UI-friendly shape derived from core state.
 * It keeps formatting and display logic out of components.
 */
export type DocView = {
    statusLabel: string;
    canSaveNow: boolean;
    lastSavedLabel: string;
    showError: boolean;
    errorText: string | null;
};

/**
 * projectDoc maps core state into display data for the UI.
 * It is pure and deterministic, just like the core.
 */
export function projectDoc(state: DocState): DocView {
    const statusLabel =
        state.status === "idle"
            ? "Idle"
            : state.status === "dirty"
                ? "Unsaved changes"
                : state.status === "saving"
                    ? "Saving…"
                    : state.status === "saved"
                        ? "Saved"
                        : "Error";

    return {
        statusLabel,
        canSaveNow: !!state.doc && state.status !== "saving",
        lastSavedLabel: state.lastSavedAt
            ? new Date(state.lastSavedAt).toLocaleTimeString()
            : "—",
        showError: state.status === "error",
        errorText: state.error,
    };
}
