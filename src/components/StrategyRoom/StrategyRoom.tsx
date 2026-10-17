import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getInitialState, playRound } from "../../game/engine";
import { payoffMatrix, findNashEquilibria } from "../../game/logic";

export type Move = "share" | "solo";

export interface GameParams {
  soloValue: number;
  poolingBonus: number;
  privacyRisk: number;
  freeRideBonus: number;
  suckerCost: number;
  rounds: number;
}

export interface RoundHistory {
  round: number;
  playerMove: Move;
  opponentMove: Move;
  playerScore: number;
  opponentScore: number;
  playerCumulative: number;
  opponentCumulative: number;
  trustMeter: number;
}

export interface GameState {
  params: GameParams;
  history: RoundHistory[];
  playerCumulative: number;
  opponentCumulative: number;
  trustMeter: number;
  seed: number;
  opponentId: string;
}

type Phase = "intro" | "playing" | "debrief" | "replay";

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  card: { backgroundColor: '#fff', border: '3px solid #08060d', boxShadow: '6px 6px 0px #ff1493', borderRadius: '8px', padding: '24px', marginBottom: '24px' },
  buttonCobalt: { backgroundColor: '#0047ab', color: '#fff', border: '3px solid #08060d', boxShadow: '4px 4px 0px #08060d', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' },
  buttonPink: { backgroundColor: '#ff1493', color: '#fff', border: '3px solid #08060d', boxShadow: '4px 4px 0px #08060d', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' },
  matrixCell: { border: '2px solid #08060d', padding: '12px', textAlign: 'center' as const, fontWeight: 'bold' },
  badge: { border: '1px solid #000', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase' as const }
};

export default function StrategyRoom() {
  const [params, setParams] = useState<GameParams | null>(null);
  const [experimentData, setExperimentData] = useState<any>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [opponentChoice, setOpponentChoice] = useState<string>("titForTat");
  const [replayStep, setReplayStep] = useState<number>(0);

  useEffect(() => {
    fetch("/config/game.json").then((r) => r.json()).then(setParams);
    fetch("/results/experiment.json").then((r) => r.json()).then(setExperimentData);
  }, []);

  if (!params) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Game Data...</div>;

  const startGame = (seed = Math.floor(Math.random() * 10000), opp = opponentChoice) => {
    setState(getInitialState(params, opp, seed));
    setPhase("playing");
    setReplayStep(0);
  };

  const handleMove = (move: Move) => {
    if (!state) return;
    const newState = playRound(state, move);
    setState(newState);
    if (newState.history.length >= params.rounds) setPhase("debrief");
  };

  const matrix = payoffMatrix(params);
  const nash = findNashEquilibria(params);
  const isNash = (p1: Move, p2: Move) => nash.some((n) => n[0] === p1 && n[1] === p2);

  const renderMatrix = (currentRound?: RoundHistory) => (
    <div style={{ ...styles.card, boxShadow: '6px 6px 0px #0047ab', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '12px', color: '#6b6375', textTransform: 'uppercase', fontWeight: 'bold' }}>Modeled assumption</div>
      <h3 style={{ marginTop: 0 }}>Payoff Matrix</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '4px' }}>
        <div></div><div style={styles.matrixCell}>They Share</div><div style={styles.matrixCell}>They Solo</div>
        
        <div style={{ ...styles.matrixCell, display: 'flex', alignItems: 'center' }}>You Share</div>
        <div style={{ ...styles.matrixCell, backgroundColor: currentRound?.playerMove==='share' && currentRound?.opponentMove==='share' ? '#e0e7ff' : '#fff' }}>
          {matrix.share_share[0]}, {matrix.share_share[1]}
          {isNash("share", "share") && <span style={{...styles.badge, backgroundColor: '#ffed4a', marginLeft: '6px'}}>NASH</span>}
        </div>
        <div style={{ ...styles.matrixCell, backgroundColor: currentRound?.playerMove==='share' && currentRound?.opponentMove==='solo' ? '#e0e7ff' : '#fff' }}>
          {matrix.share_solo[0]}, {matrix.share_solo[1]}
        </div>

        <div style={{ ...styles.matrixCell, display: 'flex', alignItems: 'center' }}>You Solo</div>
        <div style={{ ...styles.matrixCell, backgroundColor: currentRound?.playerMove==='solo' && currentRound?.opponentMove==='share' ? '#e0e7ff' : '#fff' }}>
          {matrix.solo_share[0]}, {matrix.solo_share[1]}
        </div>
        <div style={{ ...styles.matrixCell, backgroundColor: currentRound?.playerMove==='solo' && currentRound?.opponentMove==='solo' ? '#e0e7ff' : '#fff' }}>
          {matrix.solo_solo[0]}, {matrix.solo_solo[1]}
          {isNash("solo", "solo") && <span style={{...styles.badge, backgroundColor: '#ffed4a', marginLeft: '6px'}}>NASH</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '42px', fontWeight: '800', borderBottom: '4px solid #08060d', paddingBottom: '10px' }}>Strategy Room</h1>

      {phase === "intro" && (
        <div style={styles.card}>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>You run a regional bank. Sharing fraud intelligence catches more criminals, but if you share and a rival doesn't, you bleed data for nothing.</p>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Opponent Profile</label>
          <select style={{ width: '100%', padding: '10px', border: '2px solid #000', marginBottom: '20px' }} value={opponentChoice} onChange={(e) => setOpponentChoice(e.target.value)}>
            <option value="titForTat">Bank A (Unknown Strategy)</option>
            <option value="grimTrigger">Bank B (Unknown Strategy)</option>
            <option value="alwaysSolo">Bank C (Unknown Strategy)</option>
          </select>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={styles.buttonCobalt} onClick={() => startGame()}>Start Game</button>
            <button style={{ ...styles.buttonCobalt, backgroundColor: '#fff', color: '#000' }} onClick={() => startGame(12345, "titForTat")}>Demo Mode</button>
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "replay" || phase === "debrief") && state && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Round {phase === "replay" ? replayStep : state.history.length + 1} / {params.rounds}</h2>
              <div style={{ display: 'flex', gap: '10px', fontWeight: 'bold' }}>
                <span style={{ backgroundColor: '#0047ab', color: '#fff', padding: '4px 12px', borderRadius: '12px' }}>You: {state.playerCumulative}</span>
                <span style={{ backgroundColor: '#ff1493', color: '#fff', padding: '4px 12px', borderRadius: '12px' }}>Them: {state.opponentCumulative}</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}><span>Distrust</span><span>Trust Meter</span><span>Alliance</span></div>
              <div style={{ width: '100%', backgroundColor: '#e5e4e7', height: '20px', border: '2px solid #000', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#0047ab', height: '100%', width: `${state.trustMeter}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {phase === "playing" && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button style={{ ...styles.buttonCobalt, flex: 1 }} onClick={() => handleMove("share")}>Share Data</button>
                <button style={{ ...styles.buttonPink, flex: 1 }} onClick={() => handleMove("solo")}>Go Solo</button>
              </div>
            )}

            {phase === "debrief" && (
              <div style={{ ...styles.card, backgroundColor: '#fffbe6' }}>
                <h3 style={{ marginTop: 0 }}>Game Over</h3>
                <p>Opponent Strategy Revealed: <strong>{state.opponentId}</strong></p>
                <p style={{ fontStyle: 'italic', fontSize: '14px', marginTop: '12px' }}>Lesson: Trust is hard to build and easy to destroy, but mutual sharing remains the mathematically superior long-term play.</p>
                <button style={{ ...styles.buttonCobalt, marginTop: '12px' }} onClick={() => setPhase("replay")}>View Replay</button>
                <button style={{ ...styles.buttonPink, marginTop: '12px', marginLeft: '12px' }} onClick={() => setPhase("intro")}>Play Again</button>
              </div>
            )}

            {phase === "replay" && (
              <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button disabled={replayStep === 0} onClick={() => setReplayStep(s => s - 1)} style={{ cursor: 'pointer' }}>Prev</button>
                <strong>Viewing Round {replayStep}</strong>
                <button disabled={replayStep === state.history.length} onClick={() => setReplayStep(s => s + 1)} style={{ cursor: 'pointer' }}>Next</button>
              </div>
            )}

            {renderMatrix(state.history[phase === "replay" ? Math.max(0, replayStep - 1) : state.history.length - 1])}
          </div>

          <div>
            <div style={{ height: '300px', ...styles.card }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={state.history}>
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="playerCumulative" stroke="#0047ab" strokeWidth={3} name="Your Score" />
                  <Line type="monotone" dataKey="opponentCumulative" stroke="#ff1493" strokeWidth={3} name="Their Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {experimentData && (
              <div style={{ ...styles.card, boxShadow: '6px 6px 0px #08060d' }}>
                
                {/* THIS IS THE NEW PERFECTLY SPACED FLEXBOX HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e4e7', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Machine Learning Evidence</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {experimentData.is_sample && (
                      <span style={{ ...styles.badge, backgroundColor: '#ff1493', color: '#fff' }}>
                        Sample Data
                      </span>
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#ff1493', textTransform: 'uppercase' }}>
                      Measured in<br/>Experiment Lab
                    </span>
                  </div>
                </div>

                <p style={{ margin: '8px 0' }}>Solo Recall: {(experimentData.pooling.results[0].solo.recall * 100).toFixed(1)}%</p>
                <p style={{ margin: '8px 0' }}>Pooled Recall: {(experimentData.pooling.results[0].pooled.recall * 100).toFixed(1)}%</p>
                <p style={{ fontWeight: 'bold', marginTop: '16px', color: '#0047ab', fontSize: '18px' }}>Pooling Gain: +${experimentData.pooling.results[0].gain_usd.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}