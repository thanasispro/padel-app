export type TeamKey = "a" | "b";
export type ScoringMode = "set" | "point";

export interface SetResult {
  a: number;
  b: number;
  tiebreak?: { a: number; b: number };
}

export interface MatchState {
  mode: ScoringMode;
  /** Only relevant in point mode: true = classic advantage rule, false = golden point (sudden death at deuce). */
  advantage: boolean;
  /** true = a set is won by whoever reaches 6 games first, no win-by-2, no tiebreak. */
  raceToSix: boolean;
  /** Points within the current game. Null in set mode and during a tiebreak. */
  points: { a: number; b: number } | null;
  games: { a: number; b: number };
  tiebreak: { a: number; b: number } | null;
  sets: SetResult[];
}

const SETS_TO_WIN_MATCH = 2;
const GAMES_TO_WIN_SET = 6;
const POINTS_TO_WIN_GAME = 4;
const TIEBREAK_POINTS_TO_WIN = 7;

export function createMatch(
  options: {
    mode?: ScoringMode;
    advantage?: boolean;
    raceToSix?: boolean;
  } = {},
): MatchState {
  const mode = options.mode ?? "set";
  return {
    mode,
    advantage: options.advantage ?? true,
    raceToSix: options.raceToSix ?? false,
    points: mode === "point" ? { a: 0, b: 0 } : null,
    games: { a: 0, b: 0 },
    tiebreak: null,
    sets: [],
  };
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

/** Display label (0/15/30/40/Ad) for one team's point count within the current game. */
export function pointLabel(mine: number, theirs: number): string {
  if (mine >= 3 && theirs >= 3) {
    if (mine === theirs) return "40";
    return mine > theirs ? "Ad" : "40";
  }
  return ["0", "15", "30", "40"][Math.min(mine, 3)];
}

function applyGameWon(state: MatchState, team: TeamKey): MatchState {
  const other = otherTeam(team);
  const games = { ...state.games, [team]: state.games[team] + 1 };
  const points = state.mode === "point" ? { a: 0, b: 0 } : null;

  const setWon = state.raceToSix
    ? games[team] >= GAMES_TO_WIN_SET
    : games[team] >= GAMES_TO_WIN_SET && games[team] - games[other] >= 2;

  if (setWon) {
    const set: SetResult = { a: games.a, b: games.b };
    return {
      ...state,
      games: { a: 0, b: 0 },
      tiebreak: null,
      points,
      sets: [...state.sets, set],
    };
  }

  if (
    !state.raceToSix &&
    games.a === GAMES_TO_WIN_SET &&
    games.b === GAMES_TO_WIN_SET
  ) {
    return { ...state, games, tiebreak: { a: 0, b: 0 }, points: null };
  }

  return { ...state, games, points };
}

/** Award one point to `team` and apply tennis/padel point/game/set/tiebreak rules. */
export function scorePoint(state: MatchState, team: TeamKey): MatchState {
  if (matchWinner(state.sets)) return state;

  const other = otherTeam(team);

  if (state.tiebreak) {
    const tb = { ...state.tiebreak, [team]: state.tiebreak[team] + 1 };
    if (tb[team] >= TIEBREAK_POINTS_TO_WIN && tb[team] - tb[other] >= 2) {
      const set: SetResult = {
        a: team === "a" ? 7 : 6,
        b: team === "b" ? 7 : 6,
        tiebreak: tb,
      };
      return {
        ...state,
        games: { a: 0, b: 0 },
        tiebreak: null,
        points: state.mode === "point" ? { a: 0, b: 0 } : null,
        sets: [...state.sets, set],
      };
    }
    return { ...state, tiebreak: tb };
  }

  if (state.mode === "point") {
    const points = state.points ?? { a: 0, b: 0 };
    const newPoints = { ...points, [team]: points[team] + 1 };
    const diff = newPoints[team] - newPoints[other];
    const wonGame =
      newPoints[team] >= POINTS_TO_WIN_GAME &&
      (diff >= 2 || (!state.advantage && points[other] >= 3));

    if (!wonGame) {
      return { ...state, points: newPoints };
    }
    return applyGameWon(state, team);
  }

  return applyGameWon(state, team);
}
