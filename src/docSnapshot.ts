/**
 * DocSnapshot is the explicit boundary shape we accept from the editor.
 * It is intentionally minimal and validated in the shell.
 */
export type DocSnapshot = {
	type: "doc";
	content?: unknown[];
};

export type DocChangedEvent = { type: "DOC_CHANGED"; doc: DocSnapshot };
export type DocInvalidEvent = { type: "DOC_INVALID"; message: string };
// Domain events emitted at the editor boundary.
export type DocChangeEvent = DocChangedEvent | DocInvalidEvent;

/**
 * Basic runtime check to keep invalid editor output from entering the core.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDocSnapshot(input: unknown): input is DocSnapshot {
	if (!isRecord(input)) return false;
	if (input.type !== "doc") return false;
	if (input.content === undefined) return true;
	return Array.isArray(input.content);
}

/**
 * Boundary mapper: convert unknown editor output into a typed domain event.
 * Keeps validation out of the shell while preserving core purity.
 */
export function toDocEvent(
	input: unknown,
): DocChangeEvent {
	if (isDocSnapshot(input)) {
		return { type: "DOC_CHANGED", doc: input };
	}

	return {
		type: "DOC_INVALID",
		message: "Editor produced an invalid document snapshot.",
	};
}
