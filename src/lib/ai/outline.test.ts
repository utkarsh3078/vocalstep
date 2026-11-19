import { describe, expect, it } from "vitest";

import { checkOutline, rawOutlineSchema } from "./outline";

const context = { sectionCount: 3, totalWords: 1300, topic: "How rain forms" };

describe("checkOutline", () => {
  it("cleans headings and sets word targets that add up to the total", () => {
    const result = checkOutline(
      {
        verdict: "ok",
        reason: "none",
        title: "## Where Rain Comes From",
        sections: [
          { heading: "1. Opening", goal: "Hook the listener." },
          { heading: "Section 2: The water cycle", goal: "Explain   evaporation." },
          { heading: "**Closing**", goal: "Wrap up." },
        ],
      },
      context,
    );

    expect(result).toEqual({
      kind: "ok",
      title: "Where Rain Comes From",
      sections: [
        { heading: "Opening", goal: "Hook the listener.", words: 434 },
        { heading: "The water cycle", goal: "Explain evaporation.", words: 433 },
        { heading: "Closing", goal: "Wrap up.", words: 433 },
      ],
    });
  });

  it("keeps at most the sections asked for, and shares the words over fewer", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ heading: `Part ${i}`, goal: "" }));
    const tooMany = checkOutline({ verdict: "ok", reason: "none", title: "T", sections: many }, context);
    expect(tooMany.kind === "ok" && tooMany.sections).toHaveLength(3);

    const two = checkOutline(
      { verdict: "ok", reason: "none", title: "T", sections: many.slice(0, 2) },
      context,
    );
    expect(two.kind === "ok" && two.sections.map((s) => s.words)).toEqual([650, 650]);
  });

  it("falls back to the topic for an empty title", () => {
    const result = checkOutline(
      { verdict: "ok", reason: "none", title: "  ", sections: [{ heading: "A", goal: "" }] },
      context,
    );
    expect(result.kind === "ok" && result.title).toBe("How rain forms");
  });

  it("passes on a refusal and its reason", () => {
    expect(checkOutline({ verdict: "rejected", reason: "politics", title: "", sections: [] }, context))
      .toEqual({ kind: "refused", reason: "politics" });
    expect(checkOutline({ verdict: "rejected", reason: "none", title: "", sections: [] }, context))
      .toEqual({ kind: "refused", reason: "not_a_topic" });
  });

  it("calls an outline with no usable sections invalid", () => {
    expect(
      checkOutline({ verdict: "ok", reason: "none", title: "T", sections: [{ heading: " ## ", goal: "" }] }, context),
    ).toEqual({ kind: "invalid" });
  });
});

describe("rawOutlineSchema", () => {
  it("reads a reply, tolerating an unknown reason", () => {
    const parsed = rawOutlineSchema.parse({ verdict: "ok", reason: "weird", title: "T", sections: [] });
    expect(parsed.reason).toBe("none");
  });

  it("rejects a reply without a verdict", () => {
    expect(rawOutlineSchema.safeParse({ title: "T" }).success).toBe(false);
  });
});
