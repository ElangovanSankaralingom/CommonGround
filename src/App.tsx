import { useEffect, useCallback } from 'react';
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

function App() {
  const session = useGameStore((state) => state.session);
  const highContrastMode = useGameStore((state) => state.highContrastMode);
  const advancePhase = useGameStore((state) => state.advancePhase);
  const exportTelemetry = useGameStore((state) => state.exportTelemetry);
  const returnToTitle = useGameStore((state) => state.returnToTitle);

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
          onExportData={() => exportTelemetry()}
          onNewGame={() => returnToTitle()}
          onDetailedStats={() => {
            // Advance to export phase for detailed stats
            advancePhase();
          }}
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
            // Store survey responses in telemetry, then advance
            console.log('Post-game survey responses:', responses);
            advancePhase();
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
