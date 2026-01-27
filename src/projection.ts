import type { DocState } from "./core";
import type { DocFsmState } from "./docMachine";

/**
 * DocView is a UI-friendly shape derived from core state.
 * It keeps formatting and display logic out of components.
 */
export type DocView = {
	statusLabel: string;
	statusClass: string;
	revision: number;
	canSaveNow: boolean;
	lastSavedLabel: string;
	showError: boolean;
	errorText: string | null;
};

export type DocViewModel = DocView & {
	// Allowed UI actions (composed by the shell, not the projection).
	saveNow: () => void;
};

/**
 * projectDoc maps core state into display data for the UI.
 * It is pure and deterministic, just like the core.
 */
export function projectDoc(state: DocState, fsmState: DocFsmState): DocView {
	const statusLabel =
		fsmState === "idle"
			? "Idle"
			: fsmState === "dirty"
				? "Unsaved changes"
				: fsmState === "saving"
					? "Saving…"
					: fsmState === "saved"
						? "Saved"
						: "Error";

    return {
        statusLabel,
		statusClass: `status-badge--${fsmState}`,
		revision: state.revision,
        canSaveNow: !!state.doc && fsmState !== "saving",
        lastSavedLabel: state.lastSavedAt
            ? new Date(state.lastSavedAt).toLocaleTimeString()
            : "—",
        showError: fsmState === "error",
        errorText: state.error,
    };
}
