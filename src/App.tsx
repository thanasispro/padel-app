import { useState } from "react";
import {
  createMatch,
  matchWinner,
  pointLabel,
  scorePoint,
  setsWon,
  type MatchState,
  type ScoringMode,
  type TeamKey,
} from "./scoring";
import { getLastPlayers, saveMatch, type SavedMatch } from "./history";
import "./App.css";

type Screen =
  | "setup"
  | "teams"
  | "match"
  | "end"
  | "newMatchOptions"
  | "settings";

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
  const [preNewMatchScreen, setPreNewMatchScreen] = useState<"match" | "end">(
    "match",
  );

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const trimmedNames = names.map((n) => n.trim());
  const allNamesLongEnough = trimmedNames.every((n) => n.length > 3);
  const allNamesUnique =
    new Set(trimmedNames.map((n) => n.toLowerCase())).size ===
    trimmedNames.length;
  const allNamesValid = allNamesLongEnough && allNamesUnique;

  const startTeams = () => {
    setScreen("teams");
  };

  const startMatch = () => {
    setMatch(createMatch({ mode, advantage, raceToSix }));
    setHistory([]);
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

  const openNewMatchOptions = () => {
    setPreNewMatchScreen(screen === "end" ? "end" : "match");
    setScreen("newMatchOptions");
  };

  const cancelNewMatch = () => {
    setScreen(preNewMatchScreen);
  };

  const resetMatchState = () => {
    setMatch(createMatch({ mode, advantage, raceToSix }));
    setHistory([]);
    setFinishedMatch(null);
  };

  const keepSameTeams = () => {
    resetMatchState();
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

  return (
    <div className="app">
      <h1>Match Point</h1>

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
                <input
                  key={i}
                  className="name-input"
                  placeholder={`Player ${i + 1}`}
                  value={names[i]}
                  onChange={(e) => setName(i, e.target.value)}
                />
              ))}
            </div>
            <div className="team-col">
              <h3>Team B</h3>
              {teamB.map((i) => (
                <input
                  key={i}
                  className="name-input"
                  placeholder={`Player ${i + 1}`}
                  value={names[i]}
                  onChange={(e) => setName(i, e.target.value)}
                />
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

      {screen === "settings" && (
        <div className="card">
          <h2>Settings</h2>

          <h3>Scoring</h3>
          <div className="mode-toggle">
            <button
              type="button"
              className={mode === "set" ? "toggle-btn active" : "toggle-btn"}
              onClick={() => setMode("set")}
            >
              Set Mode
            </button>
            <button
              type="button"
              className={
                mode === "point" ? "toggle-btn active" : "toggle-btn"
              }
              onClick={() => setMode("point")}
            >
              Point Mode
            </button>
          </div>
          {mode === "point" && (
            <div className="mode-toggle">
              <button
                type="button"
                className={advantage ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setAdvantage(true)}
              >
                Advantage
              </button>
              <button
                type="button"
                className={!advantage ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setAdvantage(false)}
              >
                Golden Point
              </button>
            </div>
          )}

          <h3>Set Rule</h3>
          <div className="mode-toggle">
            <button
              type="button"
              className={!raceToSix ? "toggle-btn active" : "toggle-btn"}
              onClick={() => setRaceToSix(false)}
            >
              Standard
            </button>
            <button
              type="button"
              className={raceToSix ? "toggle-btn active" : "toggle-btn"}
              onClick={() => setRaceToSix(true)}
            >
              First to 6
            </button>
          </div>

          <button className="primary" onClick={() => setScreen("teams")}>
            Back
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
          <button className="secondary" onClick={() => setScreen("settings")}>
            Settings
          </button>
        </div>
      )}

      {screen === "match" && (
        <div className="card">
          <div className="scoreboard">
            <div className="team-score">
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
            <div className="team-score">
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

          <div className="point-buttons">
            <button className="point-btn" onClick={() => addPoint("a")}>
              +1 {teamName("a")}
            </button>
            <button className="point-btn" onClick={() => addPoint("b")}>
              +1 {teamName("b")}
            </button>
          </div>

          {match.sets.length > 0 && (
            <div className="set-history">
              <h3>Sets</h3>
              <ul>
                {match.sets.map((s, i) => (
                  <li key={i}>
                    Set {i + 1}: {s.a}-{s.b}
                    {s.tiebreak ? ` (tiebreak ${s.tiebreak.a}-${s.tiebreak.b})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="button-row">
            <button
              className="secondary"
              onClick={undo}
              disabled={history.length === 0}
            >
              Undo
            </button>
            <button className="secondary" onClick={openNewMatchOptions}>
              New Match
            </button>
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
            <ul>
              {finishedMatch.sets.map((s, i) => (
                <li key={i}>
                  Set {i + 1}: {s.a}-{s.b}
                  {s.tiebreak ? ` (tiebreak ${s.tiebreak.a}-${s.tiebreak.b})` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="button-row">
            <button className="primary" onClick={openNewMatchOptions}>
              New Match
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
          {preNewMatchScreen === "match" && (
            <button className="secondary" onClick={cancelNewMatch}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
