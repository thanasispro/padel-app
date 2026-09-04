import { useEffect, useState } from "react";
import {
  createMatch,
  matchWinner,
  pointLabel,
  scorePoint,
  setsWon,
  type MatchState,
  type ScoringMode,
  type SetResult,
  type TeamKey,
} from "./scoring";
import { getLastPlayers, loadMatches, saveMatch, type SavedMatch } from "./history";
import "./App.css";

type Screen =
  | "setup"
  | "teams"
  | "match"
  | "end"
  | "newMatchOptions"
  | "history";

const THEME_STORAGE_KEY = "padel-theme";

function clockLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function computeRecord(playerName: string, matches: SavedMatch[]): string {
  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    const onA = m.teamAPlayers?.includes(playerName) ?? false;
    const onB = m.teamBPlayers?.includes(playerName) ?? false;
    if (!onA && !onB) continue;
    const won = (onA && m.winner === "a") || (onB && m.winner === "b");
    if (won) wins++;
    else losses++;
  }
  return `${wins}-${losses}`;
}

function SetGrid({
  sets,
  nameA,
  nameB,
  winner,
}: {
  sets: SetResult[];
  nameA: string;
  nameB: string;
  winner?: TeamKey;
}) {
  return (
    <div className="set-grid">
      <span className={winner === "b" ? "set-grid-name dim" : "set-grid-name"}>
        {nameA}
      </span>
      {sets.map((s, i) => (
        <span key={`a-${i}`} className="set-grid-score">
          {s.a}
          {s.tiebreak && s.a < s.b ? <sup>{s.tiebreak.a}</sup> : null}
        </span>
      ))}
      <span className={winner === "a" ? "set-grid-name dim" : "set-grid-name"}>
        {nameB}
      </span>
      {sets.map((s, i) => (
        <span key={`b-${i}`} className="set-grid-score">
          {s.b}
          {s.tiebreak && s.b < s.a ? <sup>{s.tiebreak.b}</sup> : null}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [names, setNames] = useState<string[]>(
    () => getLastPlayers() ?? ["", "", "", ""],
  );
  const [teamA, setTeamA] = useState<[number, number]>([0, 1]);
  const [teamB, setTeamB] = useState<[number, number]>([2, 3]);
  const [mode, setMode] = useState<ScoringMode>("set");
  const [advantage, setAdvantage] = useState(true);
  const [raceToSix, setRaceToSix] = useState(false);
  const [match, setMatch] = useState<MatchState>(createMatch());
  const [history, setHistory] = useState<MatchState[]>([]);
  const [finishedMatch, setFinishedMatch] = useState<SavedMatch | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (screen !== "match") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [screen]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const trimmedNames = names.map((n) => n.trim());
  const allNamesLongEnough = trimmedNames.every((n) => n.length > 3);
  const allNamesUnique =
    new Set(trimmedNames.map((n) => n.toLowerCase())).size ===
    trimmedNames.length;
  const allNamesValid = allNamesLongEnough && allNamesUnique;

  const nameError = (i: number): string | null => {
    const trimmed = trimmedNames[i];
    if (trimmed.length === 0) return null;
    if (trimmed.length <= 3) return "Needs at least 4 letters";
    const isDuplicate = trimmedNames.some(
      (n, j) => j !== i && n.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) return "Already used";
    return null;
  };

  const startTeams = () => {
    setScreen("teams");
  };

  const startMatch = () => {
    setMatch(createMatch({ mode, advantage, raceToSix }));
    setHistory([]);
    setStartedAt(Date.now());
    setScreen("match");
  };

  const addPoint = (team: TeamKey) => {
    setHistory((h) => [...h, match]);
    const updated = scorePoint(match, team);
    setMatch(updated);

    const winner = matchWinner(updated.sets);
    if (winner) {
      const teamAPlayers: [string, string] = [names[teamA[0]], names[teamA[1]]];
      const teamBPlayers: [string, string] = [names[teamB[0]], names[teamB[1]]];
      const result: SavedMatch = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        teamAPlayers,
        teamBPlayers,
        teamA: teamAPlayers.join(" / "),
        teamB: teamBPlayers.join(" / "),
        winner,
        setsA: setsWon(updated.sets, "a"),
        setsB: setsWon(updated.sets, "b"),
        sets: updated.sets,
      };
      saveMatch(result);
      setFinishedMatch(result);
      setScreen("end");
    }
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setMatch(prev);
      return h.slice(0, -1);
    });
  };

  const lastScorer = (): TeamKey | null => {
    const prev = history[history.length - 1];
    if (!prev) return null;
    const gained = (t: TeamKey) =>
      (match.points?.[t] ?? 0) - (prev.points?.[t] ?? 0) > 0 ||
      (match.tiebreak?.[t] ?? 0) - (prev.tiebreak?.[t] ?? 0) > 0 ||
      match.games[t] - prev.games[t] > 0 ||
      match.sets.length > prev.sets.length;
    return gained("a") ? "a" : gained("b") ? "b" : null;
  };

  const openNewMatchOptions = () => {
    setScreen("newMatchOptions");
  };

  const cancelNewMatch = () => {
    setScreen("match");
  };

  const resetMatchState = () => {
    setMatch(createMatch({ mode, advantage, raceToSix }));
    setHistory([]);
    setFinishedMatch(null);
  };

  const keepSameTeams = () => {
    resetMatchState();
    setStartedAt(Date.now());
    setScreen("match");
  };

  const shuffleTeamAssignment = () => {
    const indices = [0, 1, 2, 3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setTeamA([indices[0], indices[1]]);
    setTeamB([indices[2], indices[3]]);
  };

  const shuffleTeams = () => {
    shuffleTeamAssignment();
    resetMatchState();
    setScreen("teams");
  };

  const newPlayers = () => {
    resetMatchState();
    setScreen("setup");
  };

  const teamName = (team: TeamKey) => {
    const idx = team === "a" ? teamA : teamB;
    return `${names[idx[0]]} / ${names[idx[1]]}`;
  };

  const savedMatches = loadMatches();
  const recentFirst = savedMatches.slice().reverse();
  const latestMatch = recentFirst[0] ?? null;
  const rematchSource =
    recentFirst.find((m) => m.teamAPlayers && m.teamBPlayers) ?? null;
  const recordPlayerName = rematchSource?.teamAPlayers[0] ?? null;
  const record = recordPlayerName
    ? computeRecord(recordPlayerName, savedMatches)
    : null;

  const groupedHistory: [string, SavedMatch[]][] = [];
  for (const m of recentFirst) {
    const label = dayLabel(m.date);
    const lastGroup = groupedHistory[groupedHistory.length - 1];
    if (lastGroup && lastGroup[0] === label) {
      lastGroup[1].push(m);
    } else {
      groupedHistory.push([label, [m]]);
    }
  }

  const rematchLastTeams = () => {
    if (!rematchSource) return;
    setNames([...rematchSource.teamAPlayers, ...rematchSource.teamBPlayers]);
    setTeamA([0, 1]);
    setTeamB([2, 3]);
    resetMatchState();
    setScreen("teams");
  };

  const headerClockMs =
    screen === "match" && startedAt
      ? now - startedAt
      : screen === "end" && startedAt && finishedMatch
        ? new Date(finishedMatch.date).getTime() - startedAt
        : null;

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-left">
          <div className="title">Match Point</div>
          {headerClockMs !== null && (
            <div className="clock">{clockLabel(headerClockMs)}</div>
          )}
        </div>
        <div className="header-right">
          {screen === "match" && (
            <button
              type="button"
              className="icon-btn"
              onClick={openNewMatchOptions}
              aria-label="New match"
            >
              ↺
            </button>
          )}
          {screen !== "history" && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setScreen("history")}
              aria-label="History"
            >
              🕓
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="app-body">
        {screen === "setup" && (
          <div className="card">
            <h2>Players</h2>
            <p className="hint">
              Each name needs more than 3 letters and must be unique.
            </p>
            <div className="teams-row">
              <div className="team-col">
                <h3>Team A</h3>
                {teamA.map((i) => (
                  <div key={i} className="name-field">
                    <div className="name-rail rail-a" />
                    <div className="name-field-input">
                      <input
                        className={
                          nameError(i) ? "name-input invalid" : "name-input"
                        }
                        placeholder={`Player ${i + 1}`}
                        value={names[i]}
                        onChange={(e) => setName(i, e.target.value)}
                      />
                      {nameError(i) && (
                        <span className="field-help">{nameError(i)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="team-col">
                <h3>Team B</h3>
                {teamB.map((i) => (
                  <div key={i} className="name-field">
                    <div className="name-rail rail-b" />
                    <div className="name-field-input">
                      <input
                        className={
                          nameError(i) ? "name-input invalid" : "name-input"
                        }
                        placeholder={`Player ${i + 1}`}
                        value={names[i]}
                        onChange={(e) => setName(i, e.target.value)}
                      />
                      {nameError(i) && (
                        <span className="field-help">{nameError(i)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="primary"
              disabled={!allNamesValid}
              onClick={startTeams}
            >
              Continue
            </button>
            <button
              className="secondary"
              disabled={!allNamesValid}
              onClick={shuffleTeamAssignment}
            >
              Shuffle Teams
            </button>
          </div>
        )}

        {screen === "teams" && (
          <div className="card">
            <h2>Teams</h2>
            <div className="teams-row">
              <div className="team-col">
                <h3>Team A</h3>
                {teamA.map((i) => (
                  <div key={i} className="player-chip">
                    {names[i]}
                  </div>
                ))}
              </div>
              <div className="team-col">
                <h3>Team B</h3>
                {teamB.map((i) => (
                  <div key={i} className="player-chip">
                    {names[i]}
                  </div>
                ))}
              </div>
            </div>
            <div className="button-row">
              <button className="secondary" onClick={() => setScreen("setup")}>
                Back
              </button>
              <button className="primary" onClick={startMatch}>
                Start Match
              </button>
            </div>
          </div>
        )}

        {screen === "match" && (
          <div className="card match-card">
            <div className="match-screen">
              <div className="scoreboard">
                <div className="team-score team-a">
                  <div className="team-label">{teamName("a")}</div>
                  <div className="games">
                    {match.tiebreak
                      ? match.tiebreak.a
                      : match.mode === "point" && match.points
                        ? pointLabel(match.points.a, match.points.b)
                        : match.games.a}
                  </div>
                  {match.tiebreak && <div className="tb-tag">tiebreak</div>}
                  {!match.tiebreak && match.mode === "point" && (
                    <div className="tb-tag">games {match.games.a}</div>
                  )}
                </div>
                <div className="sets-summary">
                  {setsWon(match.sets, "a")} - {setsWon(match.sets, "b")}
                </div>
                <div className="team-score team-b">
                  <div className="team-label">{teamName("b")}</div>
                  <div className="games">
                    {match.tiebreak
                      ? match.tiebreak.b
                      : match.mode === "point" && match.points
                        ? pointLabel(match.points.b, match.points.a)
                        : match.games.b}
                  </div>
                  {match.tiebreak && <div className="tb-tag">tiebreak</div>}
                  {!match.tiebreak && match.mode === "point" && (
                    <div className="tb-tag">games {match.games.b}</div>
                  )}
                </div>
              </div>

              {match.sets.length > 0 && (
                <div className="set-history">
                  <h3>Sets</h3>
                  <SetGrid
                    sets={match.sets}
                    nameA={teamName("a")}
                    nameB={teamName("b")}
                  />
                </div>
              )}

              <div className="spacer" />

              <div className="undo-strip">
                <span>
                  {history.length === 0 ? (
                    "No points yet this game"
                  ) : (
                    <>
                      Last point: <strong>{teamName(lastScorer() ?? "a")}</strong>
                    </>
                  )}
                </span>
                <button
                  className="undo-btn"
                  onClick={undo}
                  disabled={history.length === 0}
                >
                  Undo
                </button>
              </div>

              <div className="point-buttons">
                <button
                  className="point-btn team-a"
                  onClick={() => addPoint("a")}
                >
                  <span className="plus">+1</span>
                  <span className="who">{teamName("a")}</span>
                </button>
                <button
                  className="point-btn team-b"
                  onClick={() => addPoint("b")}
                >
                  <span className="plus">+1</span>
                  <span className="who">{teamName("b")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "end" && finishedMatch && (
          <div className="card">
            <div className="winner-banner">
              🏆{" "}
              {finishedMatch.winner === "a"
                ? finishedMatch.teamA
                : finishedMatch.teamB}{" "}
              wins {finishedMatch.setsA}-{finishedMatch.setsB}!
            </div>

            <div className="set-history">
              <h3>Sets</h3>
              <SetGrid
                sets={finishedMatch.sets}
                nameA={finishedMatch.teamA}
                nameB={finishedMatch.teamB}
                winner={finishedMatch.winner}
              />
            </div>

            <div className="button-row">
              <button className="primary" onClick={keepSameTeams}>
                Rematch, Same Teams
              </button>
            </div>
            <div className="button-row">
              <button className="secondary" onClick={shuffleTeams}>
                Shuffle
              </button>
              <button className="secondary" onClick={newPlayers}>
                New Players
              </button>
            </div>
          </div>
        )}

        {screen === "newMatchOptions" && (
          <div className="card">
            <h2>New Match</h2>
            <p className="hint">How do you want to set up teams?</p>
            <button className="primary" onClick={keepSameTeams}>
              Keep Same Teams
            </button>
            <button className="secondary" onClick={shuffleTeams}>
              Shuffle Teams
            </button>
            <button className="secondary" onClick={newPlayers}>
              New Players
            </button>
            <button className="secondary" onClick={cancelNewMatch}>
              Cancel
            </button>
          </div>
        )}

        {screen === "history" && (
          <div className="card">
            <h2>History</h2>
            {savedMatches.length === 0 ? (
              <p className="hint">No matches saved yet.</p>
            ) : (
              <>
                <div className="history-summary">
                  <div className="summary-tile">
                    <div className="summary-value">{savedMatches.length}</div>
                    <div className="summary-label">matches</div>
                  </div>
                  {record && recordPlayerName && (
                    <div className="summary-tile">
                      <div className="summary-value">{record}</div>
                      <div className="summary-label">
                        {recordPlayerName}&apos;s record
                      </div>
                    </div>
                  )}
                </div>

                {groupedHistory.map(([label, dayMatches]) => (
                  <div key={label} className="history-day">
                    <div className="history-day-label">{label}</div>
                    {dayMatches.map((m) => (
                      <div
                        key={m.id}
                        className={
                          m.id === latestMatch?.id && label === "Today"
                            ? "history-card recent"
                            : "history-card"
                        }
                      >
                        <div className="history-row winner">
                          <span>{m.winner === "a" ? m.teamA : m.teamB}</span>
                          <span className="mono">
                            {m.setsA}-{m.setsB}
                          </span>
                        </div>
                        <div className="history-row loser">
                          <span>{m.winner === "a" ? m.teamB : m.teamA}</span>
                          <span className="mono small">
                            {m.sets.map((s) => `${s.a}-${s.b}`).join(" · ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
            <button
              className="primary"
              onClick={rematchLastTeams}
              disabled={!rematchSource}
            >
              Rematch Last Teams
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <>
          <div
            className="sheet-scrim"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="sheet">
            <div className="grip" />
            <h2>Match Rules</h2>

            <div className="setting-group">
              <h3>Scoring</h3>
              <div className="mode-toggle">
                <button
                  type="button"
                  className="toggle-btn"
                  aria-pressed={mode === "set"}
                  onClick={() => setMode("set")}
                >
                  Set Mode
                </button>
                <button
                  type="button"
                  className="toggle-btn"
                  aria-pressed={mode === "point"}
                  onClick={() => setMode("point")}
                >
                  Point Mode
                </button>
              </div>
              {mode === "point" && (
                <div className="mode-toggle">
                  <button
                    type="button"
                    className="toggle-btn"
                    aria-pressed={advantage}
                    onClick={() => setAdvantage(true)}
                  >
                    Advantage
                  </button>
                  <button
                    type="button"
                    className="toggle-btn"
                    aria-pressed={!advantage}
                    onClick={() => setAdvantage(false)}
                  >
                    Golden Point
                  </button>
                </div>
              )}
            </div>

            <div className="setting-group">
              <h3>Set Rule</h3>
              <div className="mode-toggle">
                <button
                  type="button"
                  className="toggle-btn"
                  aria-pressed={!raceToSix}
                  onClick={() => setRaceToSix(false)}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className="toggle-btn"
                  aria-pressed={raceToSix}
                  onClick={() => setRaceToSix(true)}
                >
                  First to 6
                </button>
              </div>
            </div>

            <div className="sheet-note">Changes apply to the next match.</div>

            <button className="primary" onClick={() => setSettingsOpen(false)}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
