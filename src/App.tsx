import { useState } from "react";
import {
  createMatch,
  matchWinner,
  scorePoint,
  setsWon,
  type MatchState,
  type TeamKey,
} from "./scoring";
import { saveMatch, type SavedMatch } from "./history";
import "./App.css";

type Screen = "setup" | "teams" | "match" | "end";

function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [names, setNames] = useState(["", "", "", ""]);
  const [teamA, setTeamA] = useState<[number, number]>([0, 1]);
  const [teamB, setTeamB] = useState<[number, number]>([2, 3]);
  const [match, setMatch] = useState<MatchState>(createMatch());
  const [history, setHistory] = useState<MatchState[]>([]);
  const [finishedMatch, setFinishedMatch] = useState<SavedMatch | null>(null);

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const allNamesFilled = names.every((n) => n.trim().length > 0);

  const startTeams = () => {
    setTeamA([0, 1]);
    setTeamB([2, 3]);
    setScreen("teams");
  };

  const swapPlayers = (aIndexInTeam: 0 | 1, bIndexInTeam: 0 | 1) => {
    const aPlayer = teamA[aIndexInTeam];
    const bPlayer = teamB[bIndexInTeam];
    const newA: [number, number] = [...teamA] as [number, number];
    const newB: [number, number] = [...teamB] as [number, number];
    newA[aIndexInTeam] = bPlayer;
    newB[bIndexInTeam] = aPlayer;
    setTeamA(newA);
    setTeamB(newB);
  };

  const startMatch = () => {
    setMatch(createMatch());
    setHistory([]);
    setScreen("match");
  };

  const addPoint = (team: TeamKey) => {
    setHistory((h) => [...h, match]);
    const updated = scorePoint(match, team);
    setMatch(updated);

    const winner = matchWinner(updated.sets);
    if (winner) {
      const result: SavedMatch = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        teamA: teamName("a"),
        teamB: teamName("b"),
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

  const newMatch = () => {
    setMatch(createMatch());
    setHistory([]);
    setFinishedMatch(null);
    setScreen("setup");
    setNames(["", "", "", ""]);
  };

  const teamName = (team: TeamKey) => {
    const idx = team === "a" ? teamA : teamB;
    return `${names[idx[0]]} / ${names[idx[1]]}`;
  };

  return (
    <div className="app">
      <h1>Padel Match</h1>

      {screen === "setup" && (
        <div className="card">
          <h2>Players</h2>
          {names.map((name, i) => (
            <input
              key={i}
              className="name-input"
              placeholder={`Player ${i + 1}`}
              value={name}
              onChange={(e) => setName(i, e.target.value)}
            />
          ))}
          <button
            className="primary"
            disabled={!allNamesFilled}
            onClick={startTeams}
          >
            Continue
          </button>
        </div>
      )}

      {screen === "teams" && (
        <div className="card">
          <h2>Teams</h2>
          <p className="hint">Tap a player to swap them with their opposite number on the other team.</p>
          <div className="teams-row">
            <div className="team-col">
              <h3>Team A</h3>
              {([0, 1] as const).map((slot) => (
                <button
                  key={slot}
                  className="player-chip"
                  onClick={() => swapPlayers(slot, slot)}
                >
                  {names[teamA[slot]]}
                </button>
              ))}
            </div>
            <div className="team-col">
              <h3>Team B</h3>
              {([0, 1] as const).map((slot) => (
                <button
                  key={slot}
                  className="player-chip"
                  onClick={() => swapPlayers(slot, slot)}
                >
                  {names[teamB[slot]]}
                </button>
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
        <div className="card">
          <div className="scoreboard">
            <div className="team-score">
              <div className="team-label">{teamName("a")}</div>
              <div className="games">
                {match.tiebreak ? match.tiebreak.a : match.games.a}
              </div>
              {match.tiebreak && <div className="tb-tag">tiebreak</div>}
            </div>
            <div className="sets-summary">
              {setsWon(match.sets, "a")} - {setsWon(match.sets, "b")}
            </div>
            <div className="team-score">
              <div className="team-label">{teamName("b")}</div>
              <div className="games">
                {match.tiebreak ? match.tiebreak.b : match.games.b}
              </div>
              {match.tiebreak && <div className="tb-tag">tiebreak</div>}
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
            <button className="secondary" onClick={newMatch}>
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
            <button className="primary" onClick={newMatch}>
              New Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
