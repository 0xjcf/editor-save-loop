import { describe, expect, it } from "vitest";
import type { DocState } from "./core";
import { projectDoc } from "./projection";

const baseState: DocState = {
	revision: 0,
	lastSavedAt: null,
	error: null,
	doc: { type: "doc", content: [] },
};

describe("projectDoc", () => {
	it("formats saving state and disables save", () => {
		const view = projectDoc(baseState, "saving");

		expect(view.statusLabel).toBe("Saving…");
		expect(view.canSaveNow).toBe(false);
	});

	it("exposes error state", () => {
		const view = projectDoc({ ...baseState, error: "boom" }, "error");

		expect(view.showError).toBe(true);
		expect(view.errorText).toBe("boom");
	});
});
