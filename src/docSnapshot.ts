/**
 * DocSnapshot is the explicit boundary shape we accept from the editor.
 * It is intentionally minimal and validated in the shell.
 */
export type DocSnapshot = {
	type: "doc";
	content?: unknown[];
};

/**
 * Basic runtime check to keep invalid editor output from entering the core.
 */
export function isDocSnapshot(input: unknown): input is DocSnapshot {
	if (!input || typeof input !== "object") return false;
	const record = input as { type?: unknown; content?: unknown };
	if (record.type !== "doc") return false;
	if (record.content === undefined) return true;
	return Array.isArray(record.content);
}
