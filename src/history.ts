import type { SetResult, TeamKey } from "./scoring";

export interface SavedMatch {
  id: string;
  date: string;
  teamAPlayers: [string, string];
  teamBPlayers: [string, string];
  teamA: string;
  teamB: string;
  winner: TeamKey;
  setsA: number;
  setsB: number;
  sets: SetResult[];
}

const STORAGE_KEY = "padel-match-history";

export function loadMatches(): SavedMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedMatch[]) : [];
  } catch {
    return [];
  }
}

export function saveMatch(result: SavedMatch): void {
  const history = loadMatches();
  history.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/** Names of the four players in the most recently saved match, if any. */
export function getLastPlayers(): string[] | null {
  const history = loadMatches();
  for (let i = history.length - 1; i >= 0; i--) {
    const match = history[i];
    if (match.teamAPlayers && match.teamBPlayers) {
      return [...match.teamAPlayers, ...match.teamBPlayers];
    }
  }
  return null;
}
