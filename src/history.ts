import type { SetResult, TeamKey } from "./scoring";

export interface SavedMatch {
  id: string;
  date: string;
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
