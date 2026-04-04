import React from 'react';

export interface RoundSummaryData {
  roundNumber: number;
  zoneName: string;
  difficulty: number;
  seriesName: string;
  seriesPoints: number;
  transformationPercent: number;
  chainStatus: string;
}

export interface NextRoundPreview {
  roundNumber: number;
  zoneName: string;
  difficulty: number;
  challengeType: string;
}

interface Props {
  roundSummary: RoundSummaryData;
  nextRound: NextRoundPreview | null;
  onStartNextRound: () => void;
  onFinishSession: () => void;
}

const T = {
  bg: '#1a1a2e',
  card: '#16213e',
  border: '#0f3460',
  gold: '#e9c349',
  text: '#e0e0e0',
  muted: '#8a8a9a',
  primary: { background: '#e9c349', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 16, fontWeight: 700 as const, cursor: 'pointer' },
  preview: { background: '#0f3460', borderRadius: 8, padding: 16, marginTop: 16 },
};

const txIcon = (p: number) => p >= 100 ? '🌳' : p >= 66 ? '🌿' : p >= 33 ? '🌱' : '⚠️';

const dots = (n: number) => '●'.repeat(n) + '○'.repeat(5 - n);

export default function RoundTransitionScreen({ roundSummary: s, nextRound, onStartNextRound, onFinishSession }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 36, maxWidth: 480, width: '90%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontSize: 24, color: T.gold, margin: '0 0 24px' }}>
          Round {s.roundNumber} Complete!
        </h1>

        <div style={{ color: T.text, fontSize: 15, lineHeight: 1.8, marginBottom: 8 }}>
          <div><span style={{ color: T.muted }}>Zone:</span> {s.zoneName}</div>
          <div><span style={{ color: T.muted }}>Difficulty:</span> <span style={{ letterSpacing: 2 }}>{dots(s.difficulty)}</span></div>
          <div><span style={{ color: T.muted }}>Series:</span> {s.seriesName} &mdash; {s.seriesPoints} pts</div>
          <div><span style={{ color: T.muted }}>Chain:</span> {s.chainStatus}</div>
        </div>

        <div style={{ fontSize: 36, margin: '12px 0 4px' }}>{txIcon(s.transformationPercent)}</div>
        <div style={{ color: T.gold, fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
          {s.transformationPercent}% Transformation
        </div>

        {nextRound ? (
          <div>
            <div style={T.preview}>
              <div style={{ color: T.gold, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Next: Round {nextRound.roundNumber}
              </div>
              <div style={{ color: T.text, fontSize: 14, lineHeight: 1.7 }}>
                <div>{nextRound.zoneName} &middot; Difficulty {dots(nextRound.difficulty)}</div>
                <div style={{ color: T.muted }}>{nextRound.challengeType}</div>
              </div>
            </div>
            <button onClick={onStartNextRound} style={{ ...T.primary, marginTop: 20 }}>
              Start Round {nextRound.roundNumber} &rarr;
            </button>
          </div>
        ) : (
          <button onClick={onFinishSession} style={{ ...T.primary, marginTop: 8 }}>
            View Session Results &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
