import type { SnapshotFrom } from "xstate";
import { setup } from "xstate";

export type DocFsmEvent =
	| { type: "DOC_CHANGED" }
	| { type: "DOC_INVALID" }
	| { type: "SAVE_STARTED" }
	| { type: "SAVE_ABORTED" }
	| { type: "SAVE_REJECTED" }
	| { type: "SAVE_SUCCEEDED" }
	| { type: "SAVE_FAILED" };

/**
 * Pure workflow state machine for editor lifecycle visualization.
 */
export const docMachine = setup({
	types: {
		events: {} as DocFsmEvent,
	},
}).createMachine({
	id: "doc",
	initial: "idle",
	states: {
		idle: {
			on: {
				DOC_CHANGED: "dirty",
				DOC_INVALID: "error",
				SAVE_STARTED: "saving",
				SAVE_REJECTED: "error",
			},
		},
		dirty: {
			on: {
				DOC_CHANGED: "dirty",
				DOC_INVALID: "error",
				SAVE_STARTED: "saving",
				SAVE_REJECTED: "error",
			},
		},
		saving: {
			on: {
				DOC_CHANGED: "dirty",
				DOC_INVALID: "error",
				SAVE_SUCCEEDED: "saved",
				SAVE_FAILED: "error",
				SAVE_REJECTED: "error",
				SAVE_ABORTED: "dirty",
			},
		},
		saved: {
			on: {
				DOC_CHANGED: "dirty",
				DOC_INVALID: "error",
				SAVE_STARTED: "saving",
				SAVE_REJECTED: "error",
			},
		},
		error: {
			on: {
				DOC_CHANGED: "dirty",
				DOC_INVALID: "error",
				SAVE_STARTED: "saving",
				SAVE_REJECTED: "error",
			},
		},
	},
});

export type DocFsmState = SnapshotFrom<typeof docMachine>["value"];
