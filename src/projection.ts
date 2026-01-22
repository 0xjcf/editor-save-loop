import type { DocState } from "./core";

export type DocView = {
    statusLabel: string;
    canSaveNow: boolean;
    lastSavedLabel: string;
    showError: boolean;
    errorText: string | null;
};

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
