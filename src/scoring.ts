export type TeamKey = "a" | "b";

export interface SetResult {
  a: number;
  b: number;
  tiebreak?: { a: number; b: number };
}

export interface MatchState {
  games: { a: number; b: number };
  tiebreak: { a: number; b: number } | null;
  sets: SetResult[];
}

const SETS_TO_WIN_MATCH = 2;

export function createMatch(): MatchState {
  return { games: { a: 0, b: 0 }, tiebreak: null, sets: [] };
}

export function otherTeam(team: TeamKey): TeamKey {
  return team === "a" ? "b" : "a";
}

export function setsWon(sets: SetResult[], team: TeamKey): number {
  return sets.filter((s) => s[team] > s[otherTeam(team)]).length;
}

export function matchWinner(sets: SetResult[]): TeamKey | null {
  if (setsWon(sets, "a") >= SETS_TO_WIN_MATCH) return "a";
  if (setsWon(sets, "b") >= SETS_TO_WIN_MATCH) return "b";
  return null;
}

/** Award one game/point to `team` and apply padel set & tiebreak rules. */
export function scorePoint(state: MatchState, team: TeamKey): MatchState {
  if (matchWinner(state.sets)) return state;

  const other = otherTeam(team);

  if (state.tiebreak) {
    const tb = { ...state.tiebreak, [team]: state.tiebreak[team] + 1 };
    if (tb[team] >= 7 && tb[team] - tb[other] >= 2) {
      const set: SetResult = {
        a: team === "a" ? 7 : 6,
        b: team === "b" ? 7 : 6,
        tiebreak: tb,
      };
      return { games: { a: 0, b: 0 }, tiebreak: null, sets: [...state.sets, set] };
    }
    return { ...state, tiebreak: tb };
  }

  const games = { ...state.games, [team]: state.games[team] + 1 };

  if (games[team] >= 6 && games[team] - games[other] >= 2) {
    const set: SetResult = { a: games.a, b: games.b };
    return { games: { a: 0, b: 0 }, tiebreak: null, sets: [...state.sets, set] };
  }

  if (games.a === 6 && games.b === 6) {
    return { games, tiebreak: { a: 0, b: 0 }, sets: state.sets };
  }

  return { ...state, games };
}
