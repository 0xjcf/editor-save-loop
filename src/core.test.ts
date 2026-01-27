import { describe, expect, it } from "vitest";
import { initialDocState, reduceDoc } from "./core";
import type { DocSnapshot } from "./docSnapshot";

const doc: DocSnapshot = { type: "doc", content: [] };

describe("reduceDoc", () => {
	it("marks dirty on DOC_CHANGED", () => {
		const result = reduceDoc(initialDocState, { type: "DOC_CHANGED", doc });

		expect(result.state.doc).toEqual(doc);
		expect(result.state.error).toBeNull();
		expect(result.emit).toEqual({ type: "DOC_CHANGED" });
	});

	it("records invalid docs and clears snapshot", () => {
		const seededState = { ...initialDocState, doc };
		const result = reduceDoc(seededState, {
			type: "DOC_INVALID",
			message: "Invalid doc",
		});

		expect(result.state.doc).toBeNull();
		expect(result.state.error).toBe("Invalid doc");
		expect(result.emit).toEqual({ type: "DOC_INVALID" });
	});

	it("rejects save when size measurement fails", () => {
		const seededState = { ...initialDocState, doc };
		const result = reduceDoc(seededState, {
			type: "SAVE_REQUESTED",
			docPresent: true,
			sizeResult: { ok: false, error: "Unable to measure" },
		});

		expect(result.state.error).toBe("Unable to measure");
		expect(result.emit).toEqual({ type: "SAVE_REJECTED" });
	});

	it("rejects save when document is too large", () => {
		const seededState = { ...initialDocState, doc };
		const result = reduceDoc(seededState, {
			type: "SAVE_REQUESTED",
			docPresent: true,
			sizeResult: { ok: true, bytes: 50_001 },
		});

		expect(result.state.error).toBe("Document is too large to save.");
		expect(result.emit).toEqual({ type: "SAVE_REJECTED" });
	});

	it("starts save when size is within limits", () => {
		const seededState = { ...initialDocState, doc, error: "prior" };
		const result = reduceDoc(seededState, {
			type: "SAVE_REQUESTED",
			docPresent: true,
			sizeResult: { ok: true, bytes: 10 },
		});

		expect(result.state.error).toBeNull();
		expect(result.emit).toEqual({ type: "SAVE_STARTED" });
	});

	it("increments revision on save success", () => {
		const seededState = { ...initialDocState, revision: 2, doc };
		const result = reduceDoc(seededState, {
			type: "SAVE_COMPLETED",
			at: 123,
			result: { ok: true },
		});

		expect(result.state.revision).toBe(3);
		expect(result.state.lastSavedAt).toBe(123);
		expect(result.emit).toEqual({ type: "SAVE_SUCCEEDED" });
	});

	it("records error on save failure", () => {
		const seededState = { ...initialDocState, doc };
		const result = reduceDoc(seededState, {
			type: "SAVE_COMPLETED",
			at: 456,
			result: { ok: false, reason: "failed", error: "save failed" },
		});

		expect(result.state.error).toBe("save failed");
		expect(result.emit).toEqual({ type: "SAVE_FAILED" });
	});

	it("treats aborted save as a first-class fact", () => {
		const seededState = { ...initialDocState, doc, error: "old" };
		const result = reduceDoc(seededState, {
			type: "SAVE_COMPLETED",
			at: 789,
			result: { ok: false, reason: "aborted" },
		});

		expect(result.state.error).toBeNull();
		expect(result.emit).toEqual({ type: "SAVE_ABORTED" });
	});

	it("omits emit when save requested without a doc", () => {
		const result = reduceDoc(initialDocState, {
			type: "SAVE_REQUESTED",
			docPresent: false,
			sizeResult: { ok: false, error: "No doc" },
		});

		expect(result.emit).toBeUndefined();
	});
});
