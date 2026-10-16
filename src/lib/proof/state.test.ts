import { describe, it, expect } from "vitest";

import {
  deriveProofState,
  replayStateHistory,
  summarizeStates,
  type EvidenceLike,
} from "@/lib/proof/state";

let n = 0;
const ev = (over: Partial<EvidenceLike> = {}): EvidenceLike => ({
  id: `e${++n}`,
  signal: "supports",
  evidence_type: "interview",
  source_person: `person-${n}`,
  occurred_on: `2026-03-${String(10 + (n % 15)).padStart(2, "0")}`,
  created_at: `2026-03-01T00:00:${String(n % 60).padStart(2, "0")}Z`,
  ...over,
});

describe("deriveProofState", () => {
  it("no evidence is untested — never a fake score", () => {
    const r = deriveProofState([]);
    expect(r.state).toBe("untested");
    expect(r.reason.code).toBe("no_evidence");
  });

  it("neutral-only notes are a weak signal, not support", () => {
    const r = deriveProofState([ev({ signal: "neutral" }), ev({ signal: "neutral" })]);
    expect(r.state).toBe("weak");
    expect(r.reason.code).toBe("only_neutral");
  });

  it("fewer independent supporters than the threshold stays weak, and says how far", () => {
    const r = deriveProofState([ev(), ev()], 3);
    expect(r.state).toBe("weak");
    expect(r.reason).toEqual({ code: "few_supporters", params: { n: 2, t: 3 } });
  });

  it("reaches supported at the threshold of independent supporters", () => {
    const r = deriveProofState([ev(), ev(), ev()], 3);
    expect(r.state).toBe("supported");
    expect(r.reason.params).toEqual({ n: 3, t: 3 });
  });

  it("the same person repeated is ONE independent source (asking a friend five times proves little)", () => {
    const friend = { source_person: "Riya " };
    const r = deriveProofState(
      [ev(friend), ev({ source_person: "riya" }), ev(friend), ev(friend)],
      3,
    );
    expect(r.supporters).toBe(1);
    expect(r.state).toBe("weak");
  });

  it("items with no named source count as independent", () => {
    const r = deriveProofState(
      [1, 2, 3].map(() => ev({ source_person: null })),
      3,
    );
    expect(r.state).toBe("supported");
  });

  it("supporting AND contradicting evidence with no clear winner is mixed", () => {
    const r = deriveProofState(
      [ev(), ev(), ev(), ev({ signal: "contradicts" }), ev({ signal: "contradicts" })],
      3,
    );
    expect(r.state).toBe("mixed");
    expect(r.reason.code).toBe("conflicting");
  });

  it("enough independent contradictions that clearly outweigh support is contradicted", () => {
    const r = deriveProofState(
      [
        ev({ signal: "contradicts" }),
        ev({ signal: "contradicts" }),
        ev({ signal: "contradicts" }),
        ev(),
      ],
      3,
    );
    expect(r.state).toBe("contradicted");
  });

  it("a lone contradiction is a weak negative signal, not a verdict", () => {
    const r = deriveProofState([ev({ signal: "contradicts" })], 3);
    expect(r.state).toBe("weak");
    expect(r.reason.code).toBe("weak_negative");
  });

  it("money outweighs impressions: a payment is stronger evidence than an observation", () => {
    const paid = deriveProofState([ev({ evidence_type: "payment" })]);
    const watched = deriveProofState([ev({ evidence_type: "observation" })]);
    expect(paid.supportWeight).toBeGreaterThan(watched.supportWeight);
  });

  it("respects a custom success threshold", () => {
    expect(deriveProofState([ev(), ev()], 2).state).toBe("supported");
    expect(deriveProofState([ev(), ev()], 5).state).toBe("weak");
  });
});

describe("replayStateHistory — why did the state change?", () => {
  it("records each real transition, in date order, with its reason", () => {
    const e1 = ev({ occurred_on: "2026-03-01" });
    const e2 = ev({ occurred_on: "2026-03-02" });
    const e3 = ev({ occurred_on: "2026-03-03" });
    const e4 = ev({ occurred_on: "2026-03-04", signal: "contradicts" });
    // Passed out of order on purpose.
    const history = replayStateHistory([e3, e1, e4, e2], 3);
    expect(history.map((h) => `${h.from}→${h.to}`)).toEqual(["untested→weak", "weak→supported"]);
    expect(history[1].evidenceId).toBe(e3.id);
    // e4 (one contradiction against three supporters) does not change the state → no transition.
  });

  it("captures a supported → mixed regression when contradictions arrive", () => {
    const supporters = [1, 2, 3].map((i) => ev({ occurred_on: `2026-03-0${i}` }));
    const against = [4, 5].map((i) =>
      ev({ occurred_on: `2026-03-0${i}`, signal: "contradicts", evidence_type: "payment" }),
    );
    const history = replayStateHistory([...supporters, ...against], 3);
    const last = history[history.length - 1];
    expect(last.from).toBe("supported");
    expect(last.to).toBe("mixed");
  });
});

describe("summarizeStates", () => {
  it("counts every state, including zeros", () => {
    expect(summarizeStates(["supported", "untested", "untested"])).toEqual({
      untested: 2,
      weak: 0,
      mixed: 0,
      supported: 1,
      contradicted: 0,
    });
  });
});
