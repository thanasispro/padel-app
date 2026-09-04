import { describe, expect, it } from "vitest";
import {
  createMatch,
  matchWinner,
  pointLabel,
  scorePoint,
  setsWon,
  type MatchState,
  type TeamKey,
} from "./scoring";

function play(
  mode: "set" | "point",
  advantage: boolean,
  sequence: TeamKey[],
): MatchState {
  return sequence.reduce((m, team) => scorePoint(m, team), createMatch({ mode, advantage }));
}

function playWith(
  options: Parameters<typeof createMatch>[0],
  sequence: TeamKey[],
): MatchState {
  return sequence.reduce((m, team) => scorePoint(m, team), createMatch(options));
}

describe("pointLabel", () => {
  it("maps 0-3 points to love/15/30/40", () => {
    expect(pointLabel(0, 0)).toBe("0");
    expect(pointLabel(1, 0)).toBe("15");
    expect(pointLabel(2, 0)).toBe("30");
    expect(pointLabel(3, 0)).toBe("40");
  });

  it("shows 40-40 as deuce for both sides", () => {
    expect(pointLabel(3, 3)).toBe("40");
    expect(pointLabel(4, 4)).toBe("40");
  });

  it("shows Ad for the leader past deuce, 40 for the trailer", () => {
    expect(pointLabel(4, 3)).toBe("Ad");
    expect(pointLabel(3, 4)).toBe("40");
  });
});

describe("scorePoint - set mode", () => {
  it("treats each point as a full game won", () => {
    const m = play("set", true, ["a"]);
    expect(m.games).toEqual({ a: 1, b: 0 });
    expect(m.points).toBeNull();
  });

  it("closes a set at 6 games with a 2-game lead", () => {
    const m = play("set", true, ["a", "a", "a", "a", "a", "a"]);
    expect(m.sets).toEqual([{ a: 6, b: 0 }]);
    expect(m.games).toEqual({ a: 0, b: 0 });
  });

  it("wins the match after two sets", () => {
    const seq: TeamKey[] = [
      ...Array(6).fill("a"),
      ...Array(6).fill("a"),
    ] as TeamKey[];
    const m = play("set", true, seq);
    expect(matchWinner(m.sets)).toBe("a");
    expect(setsWon(m.sets, "a")).toBe(2);
  });

  it("stops scoring once the match is won", () => {
    const seq: TeamKey[] = [
      ...Array(6).fill("a"),
      ...Array(6).fill("a"),
      "b",
    ] as TeamKey[];
    const m = play("set", true, seq);
    expect(m.games).toEqual({ a: 0, b: 0 });
    expect(setsWon(m.sets, "b")).toBe(0);
  });

  it("goes to a tiebreak at 6-6 and awards the set to the first to 7 with a 2-point lead", () => {
    const gamesTo6All: TeamKey[] = [
      "a", "b", "a", "b", "a", "b", "a", "b", "a", "b", "a", "b",
    ];
    let m = play("set", true, gamesTo6All);
    expect(m.games).toEqual({ a: 6, b: 6 });
    expect(m.tiebreak).toEqual({ a: 0, b: 0 });

    m = ["a", "a", "a", "a", "a", "a", "a"].reduce(
      (state, team) => scorePoint(state, team as TeamKey),
      m,
    );
    expect(m.sets).toEqual([{ a: 7, b: 6, tiebreak: { a: 7, b: 0 } }]);
    expect(m.tiebreak).toBeNull();
  });
});

describe("scorePoint - set mode, race-to-six rule", () => {
  it("wins the set at 6 games even without a 2-game lead, no tiebreak", () => {
    // a: 6, b: 5 - a straight race means this ends the set immediately
    const seq: TeamKey[] = [
      "a", "b", "a", "b", "a", "b", "a", "b", "a", "b", "a",
    ];
    const m = playWith({ mode: "set", raceToSix: true }, seq);
    expect(m.sets).toEqual([{ a: 6, b: 5 }]);
    expect(m.games).toEqual({ a: 0, b: 0 });
    expect(m.tiebreak).toBeNull();
  });

  it("does not require a 2-game lead to close the set", () => {
    // a: 6, b: 4 - a clean win, well short of the standard-rule tiebreak threshold
    const seq: TeamKey[] = ["a", "a", "a", "a", "b", "b", "b", "b", "a", "a"];
    const m = playWith({ mode: "set", raceToSix: true }, seq);
    expect(m.sets).toEqual([{ a: 6, b: 4 }]);
  });
});

describe("scorePoint - point mode, advantage rule", () => {
  it("wins a game outright at 40-love without touching deuce", () => {
    const m = play("point", true, ["a", "a", "a", "a"]);
    expect(m.games).toEqual({ a: 1, b: 0 });
    expect(m.points).toEqual({ a: 0, b: 0 });
  });

  it("requires a 2-point lead from deuce (advantage -> game)", () => {
    // 40-40, a takes advantage, a wins the game
    const m = play("point", true, ["a", "a", "a", "b", "b", "b", "a", "a"]);
    expect(m.games).toEqual({ a: 1, b: 0 });
  });

  it("returns to deuce if the trailing team wins back the advantage point", () => {
    // 40-40, a takes advantage, b levels back to deuce
    const m = play("point", true, ["a", "a", "a", "b", "b", "b", "a", "b"]);
    expect(m.games).toEqual({ a: 0, b: 0 });
    expect(pointLabel(m.points!.a, m.points!.b)).toBe("40");
    expect(pointLabel(m.points!.b, m.points!.a)).toBe("40");
  });
});

describe("scorePoint - point mode, golden point rule", () => {
  it("still wins outright at 40-love (no deuce involved)", () => {
    const m = play("point", false, ["a", "a", "a", "a"]);
    expect(m.games).toEqual({ a: 1, b: 0 });
  });

  it("decides the game on the very next point once at deuce (sudden death)", () => {
    // 40-40, next point (to b) wins the game immediately, no advantage needed
    const m = play("point", false, ["a", "a", "a", "b", "b", "b", "b"]);
    expect(m.games).toEqual({ a: 0, b: 1 });
  });
});

describe("matchWinner / setsWon", () => {
  it("has no winner with fewer than 2 sets won", () => {
    expect(matchWinner([{ a: 6, b: 0 }])).toBeNull();
  });

  it("declares a winner once a team has taken 2 sets", () => {
    const sets = [
      { a: 6, b: 0 },
      { a: 6, b: 2 },
    ];
    expect(matchWinner(sets)).toBe("a");
    expect(setsWon(sets, "a")).toBe(2);
    expect(setsWon(sets, "b")).toBe(0);
  });
});
