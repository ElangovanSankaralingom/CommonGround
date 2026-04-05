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
import { useTelemetryStore } from './core/telemetry/telemetryStore';

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
    // Telemetry: init session
    useTelemetryStore.getState().initSession(config.sessionNumber, config.challengeSetId, config.isPilot || false, config.pilotZoneId);
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
            // Record debrief in telemetry
            responses.forEach((resp: any) => {
              useTelemetryStore.getState().recordDebrief({
                playerId: resp.playerId || 'unknown',
                roleId: resp.roleId || 'unknown',
                responses: resp,
                timestamp: new Date().toISOString(),
              });
            });
            // Export full telemetry as JSON and auto-download
            try {
              const telemetryJson = useTelemetryStore.getState().exportSession();
              const blob = new Blob([telemetryJson], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              const meta = useTelemetryStore.getState().sessionMeta;
              const dateStr = new Date().toISOString().split('T')[0];
              const timeStr = new Date().toISOString().split('T')[1]?.split('.')[0]?.replace(/:/g, '') || '';
              const prefix = meta?.isPilot ? 'CG_pilot' : `CG_session${meta?.sessionNumber || 0}`;
              a.href = url;
              a.download = `${prefix}_${dateStr}_${timeStr}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('TELEMETRY_EXPORTED:', a.download);
              // Also download CSV with delay
              setTimeout(() => {
                try {
                  const csv = useTelemetryStore.getState().exportSessionCSV();
                  const csvBlob = new Blob([csv], { type: 'text/csv' });
                  const csvUrl = URL.createObjectURL(csvBlob);
                  const csvLink = document.createElement('a');
                  csvLink.href = csvUrl;
                  csvLink.download = `${prefix}_${dateStr}_${timeStr}.csv`;
                  document.body.appendChild(csvLink);
                  csvLink.click();
                  document.body.removeChild(csvLink);
                  URL.revokeObjectURL(csvUrl);
                  console.log('TELEMETRY_CSV_EXPORTED:', csvLink.download);
                } catch (ce) { console.error('CSV_EXPORT_ERROR:', ce); }
              }, 1000);
            } catch (e) { console.error('EXPORT_ERROR:', e); }
            // Record played players for first-time tracking
            try {
              const key = 'cg_played_before';
              const played: string[] = JSON.parse(localStorage.getItem(key) || '[]');
              players.forEach(p => { const n = p.name.toLowerCase().trim(); if (n && !played.includes(n)) played.push(n); });
              localStorage.setItem(key, JSON.stringify(played));
            } catch { /* ignore */ }
            // Increment play count
            if (sessionConfig?.challengeSetId) {
              try {
                const key = 'commonground_play_counts';
                const counts = JSON.parse(localStorage.getItem(key) || '{}');
                const sid = sessionConfig.challengeSetId === 'pilot' ? 'pilot' : `session${sessionConfig.sessionNumber}`;
                counts[sid] = (counts[sid] || 0) + 1;
                localStorage.setItem(key, JSON.stringify(counts));
              } catch { /* ignore */ }
            }
            // Reset telemetry and return to home screen
            useTelemetryStore.setState({ sessionMeta: null, playerProfiles: [], rounds: [], debrief: [], sessionAggregates: null });
            console.log('TELEMETRY_RESET: Ready for new session');
            returnToTitle();
            setAppScreen('gameplay');
            setSessionConfig(null);
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
