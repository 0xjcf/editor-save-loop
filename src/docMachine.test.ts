import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { docMachine } from "./docMachine";

describe("docMachine", () => {
	it("moves through dirty -> saving -> saved", () => {
		const actor = createActor(docMachine);
		actor.start();

		expect(actor.getSnapshot().value).toBe("idle");

		actor.send({ type: "DOC_CHANGED" });
		expect(actor.getSnapshot().value).toBe("dirty");

		actor.send({ type: "SAVE_STARTED" });
		expect(actor.getSnapshot().value).toBe("saving");

		actor.send({ type: "SAVE_SUCCEEDED" });
		expect(actor.getSnapshot().value).toBe("saved");
	});

	it("transitions to error on failure", () => {
		const actor = createActor(docMachine);
		actor.start();

		actor.send({ type: "SAVE_STARTED" });
		actor.send({ type: "SAVE_FAILED" });

		expect(actor.getSnapshot().value).toBe("error");
	});
});
