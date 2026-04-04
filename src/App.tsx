import { useEffect, useCallback, useState } from 'react';
import { useGameStore } from './store';
import {
  TitleScreen,
  SetupScreen,
  GameScreen,
  DebriefScreen,
  PreGameSurvey,
  PostGameSurvey,
  ExportScreen,
} from './ui/screens';
import SessionDashboard, { type SessionStartConfig } from './ui/screens/SessionDashboard';

// localStorage play count tracking
const PLAY_COUNT_KEY = 'cg_play_counts';
function incrementPlayCount(sessionId: string): void {
  try {
    const counts = JSON.parse(localStorage.getItem(PLAY_COUNT_KEY) || '{}');
    counts[sessionId] = (counts[sessionId] || 0) + 1;
    localStorage.setItem(PLAY_COUNT_KEY, JSON.stringify(counts));
  } catch { /* ignore */ }
}

function App() {
  const session = useGameStore((state) => state.session);
  const highContrastMode = useGameStore((state) => state.highContrastMode);
  const advancePhase = useGameStore((state) => state.advancePhase);
  const exportTelemetry = useGameStore((state) => state.exportTelemetry);
  const returnToTitle = useGameStore((state) => state.returnToTitle);

  // Top-level app state: 'session_selector' → 'gameplay' → 'session_complete'
  const [appScreen, setAppScreen] = useState<'session_selector' | 'gameplay' | 'session_complete'>('gameplay');
  const [sessionConfig, setSessionConfig] = useState<SessionStartConfig | null>(null);

  const handleSessionStart = useCallback((config: SessionStartConfig) => {
    setSessionConfig(config);
    incrementPlayCount(config.challengeSetId);
    console.log('SESSION_START:', 'Session', config.sessionNumber, 'Play #', config.playNumber, 'Set:', config.challengeSetId);
    setAppScreen('gameplay');
  }, []);

  const handleReturnToSelector = useCallback(() => {
    returnToTitle();
    setAppScreen('session_selector');
    setSessionConfig(null);
  }, [returnToTitle]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Could toggle a pause/settings overlay in the future
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Session selector screen
  if (appScreen === 'session_selector') {
    return (
      <div className={`min-h-screen ${highContrastMode ? 'high-contrast' : ''}`}>
        <SessionDashboard onStartSession={handleSessionStart} />
      </div>
    );
  }

  const renderScreen = () => {
    if (!session) {
      return <TitleScreen />;
    }

    const phase = session.currentPhase;

    // Setup phases
    if (phase.startsWith('setup_')) {
      return <SetupScreen />;
    }

    // Debrief phase
    if (phase === 'debrief') {
      return (
        <DebriefScreen
          onExportData={() => {
            // Export session data as JSON
            try {
              const data = {
                sessionId: 'CG_' + Date.now(),
                timestamp: new Date().toISOString(),
                sessionConfig,
                session: { currentRound: session.currentRound, totalRounds: session.totalRounds },
                players: Object.values(session.players).map(p => ({ name: p.name, roleId: p.roleId, utilityScore: p.utilityScore, collaborationPoints: p.collaborationPoints })),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'commonground_session_' + new Date().toISOString().split('T')[0] + '.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('SESSION_DATA_EXPORTED');
            } catch (e) { console.error('EXPORT_ERROR:', e); }
          }}
          onNewGame={handleReturnToSelector}
          onDetailedStats={() => advancePhase()}
        />
      );
    }

    // Game end -> export
    if (phase === 'game_end') {
      // Build player info for post-game survey
      const players = Object.values(session.players).map((p) => ({
        id: p.id,
        name: p.name,
        roleId: p.roleId,
        finalUtility: p.utilityScore,
        level: p.level,
        totalCP: p.collaborationPoints,
      }));

      return (
        <PostGameSurvey
          players={players}
          onComplete={(responses) => {
            console.log('Post-game survey responses:', responses);
            // Auto-download session data as JSON
            try {
              const data = {
                sessionId: 'CG_' + Date.now(),
                timestamp: new Date().toISOString(),
                sessionConfig,
                surveyResponses: responses,
                players: players.map(p => ({ id: p.id, name: p.name, roleId: p.roleId, finalUtility: p.finalUtility, level: p.level, totalCP: p.totalCP })),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              const now = new Date();
              a.href = url;
              a.download = `CG_session_${now.toISOString().split('T')[0]}_${now.toTimeString().slice(0, 5).replace(':', '')}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('SESSION_DATA_EXPORTED:', a.download);
            } catch (e) { console.error('EXPORT_ERROR:', e); }
            // Increment play count for completed session
            if (sessionConfig?.challengeSetId) {
              try {
                const key = 'commonground_play_counts';
                const counts = JSON.parse(localStorage.getItem(key) || '{}');
                const sid = sessionConfig.challengeSetId === 'pilot' ? 'pilot' : `session${sessionConfig.sessionNumber}`;
                counts[sid] = (counts[sid] || 0) + 1;
                localStorage.setItem(key, JSON.stringify(counts));
                console.log('PLAY_COUNT_INCREMENTED:', sid);
              } catch { /* ignore */ }
            }
            // Reset and return to home screen
            returnToTitle();
            setAppScreen('gameplay');
            setSessionConfig(null);
            console.log('SESSION_COMPLETE: returned to home screen');
          }}
        />
      );
    }

    // Export phase
    if (phase === 'export') {
      return <ExportScreen />;
    }

    // All gameplay phases (phase_1_event, phase_2_challenge, phase_3_deliberation, phase_4_action, phase_5_scoring, round_end)
    return <GameScreen />;
  };

  return (
    <div className={`min-h-screen ${highContrastMode ? 'high-contrast' : ''}`}>
      {renderScreen()}
    </div>
  );
}

export default App;
