import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store';

type ExportFormat = 'json' | 'csv';

interface ExportCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  estimateKB: number;
}

export default function ExportScreen() {
  const { session, exportTelemetry } = useGameStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  const categories: ExportCategory[] = useMemo(() => {
    if (!session) return [];

    const telemetrySize = Math.round(JSON.stringify(session.telemetry).length / 1024);
    const sessionSize = Math.round(JSON.stringify(session).length / 1024);
    const playersSize = Math.round(JSON.stringify(session.players).length / 1024);
    const boardSize = Math.round(JSON.stringify(session.board).length / 1024);
    const logsSize = Math.round(
      (JSON.stringify(session.roundLog).length + JSON.stringify(session.gameLog).length) / 1024
    );

    return [
      {
        id: 'session',
        label: 'Game Session',
        description: 'Complete game configuration, state, and metadata',
        icon: '\u{1F3AE}',
        estimateKB: sessionSize,
      },
      {
        id: 'players',
        label: 'Player Data',
        description: 'All player stats, resources, hands, goals, and utility history',
        icon: '\u{1F465}',
        estimateKB: playersSize,
      },
      {
        id: 'board',
        label: 'Board State',
        description: 'Zone conditions, resources, trigger tiles, and adjacency data',
        icon: '\u{1F5FA}',
        estimateKB: boardSize,
      },
      {
        id: 'telemetry',
        label: 'Telemetry Events',
        description: `${session.telemetry.length} timestamped events capturing every game action`,
        icon: '\u{1F4CA}',
        estimateKB: telemetrySize,
      },
      {
        id: 'logs',
        label: 'Season & Game Logs',
        description: 'Structured log entries for each season and game-level events',
        icon: '\u{1F4DD}',
        estimateKB: logsSize,
      },
    ];
  }, [session]);

  const totalSize = useMemo(
    () => categories.reduce((sum, c) => sum + c.estimateKB, 0),
    [categories]
  );

  const handleExportJSON = useCallback(() => {
    if (!session) return;

    setExporting(true);
    setExportProgress(0);

    // Simulate progress for user feedback
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 15;
      });
    }, 100);

    // Build the full export
    const exportData = {
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      format: 'commonground-full',
      session,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commonground-${session.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      clearInterval(interval);
      setExportProgress(100);
      setExporting(false);
      setExportComplete(true);
    }, 800);
  }, [session]);

  const handleExportCSV = useCallback(() => {
    if (!session) return;

    setExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    // Use the telemetry exporter
    exportTelemetry();

    setTimeout(() => {
      clearInterval(interval);
      setExportProgress(100);
      setExporting(false);
      setExportComplete(true);
    }, 1200);
  }, [session, exportTelemetry]);

  if (!session) {
    return (
      <div className="w-full min-h-screen bg-stone-900 flex items-center justify-center">
        <p className="text-stone-500">No game data to export</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-amber-300">Export Game Data</h1>
          <p className="text-stone-400 mt-1">
            Download your complete game session data for analysis
          </p>
        </div>

        {/* Format Selection */}
        <div className="flex gap-4 justify-center">
          <button
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              selectedFormat === 'json'
                ? 'bg-amber-400 text-stone-900 shadow-lg shadow-amber-400/20'
                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
            }`}
            onClick={() => setSelectedFormat('json')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6h6M6 9h4M6 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Export JSON
          </button>
          <button
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              selectedFormat === 'csv'
                ? 'bg-amber-400 text-stone-900 shadow-lg shadow-amber-400/20'
                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
            }`}
            onClick={() => setSelectedFormat('csv')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 6h14M2 10h14M2 14h14M6 2v14M12 2v14" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
            </svg>
            Export CSV Bundle
          </button>
        </div>

        {/* Data Preview */}
        <div className="bg-stone-700/50 rounded-2xl border border-stone-600/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-600/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
              Data Contents
            </h2>
            <span className="text-xs text-stone-500">
              Est. total size: {totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} MB` : `${totalSize} KB`}
            </span>
          </div>

          <div className="divide-y divide-stone-600/20">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-stone-600/10 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="text-2xl flex-shrink-0">{cat.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-stone-200 text-sm font-semibold">{cat.label}</p>
                  <p className="text-stone-500 text-xs mt-0.5">{cat.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-stone-400 text-xs font-mono">
                    ~{cat.estimateKB > 1024 ? `${(cat.estimateKB / 1024).toFixed(1)} MB` : `${cat.estimateKB} KB`}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Format description */}
        <div className="bg-stone-700/30 rounded-xl p-5 border border-stone-600/20">
          {selectedFormat === 'json' ? (
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-2">JSON Export</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                A single JSON file containing the complete game state, player data, board state,
                telemetry events, and all logs. Ideal for programmatic analysis, data science workflows,
                or loading into a future game session.
              </p>
              <p className="text-stone-600 text-xs mt-2">
                File: commonground-{session.id.slice(0, 8)}-{new Date().toISOString().slice(0, 10)}.json
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-2">CSV Bundle Export</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                Multiple CSV files for easy import into spreadsheet applications, R, or Python.
                Includes separate files for telemetry events, player stats per season, zone conditions,
                trade logs, and survey responses.
              </p>
              <p className="text-stone-600 text-xs mt-2">
                Downloads as individual CSV files via the browser
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {(exporting || exportComplete) && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">
                {exportComplete ? 'Export complete' : 'Exporting...'}
              </span>
              <span className="text-stone-500">{exportProgress}%</span>
            </div>
            <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: exportComplete ? '#10B981' : '#F59E0B',
                }}
                animate={{ width: `${exportProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {exportComplete && (
              <motion.p
                className="text-emerald-400 text-sm text-center font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Download started successfully
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Export button */}
        <div className="text-center pb-8">
          <motion.button
            className={`px-12 py-4 rounded-xl text-lg font-bold shadow-lg transition-all ${
              exporting
                ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                : 'bg-amber-400 text-stone-900 hover:bg-amber-300'
            }`}
            style={
              !exporting
                ? { boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }
                : undefined
            }
            whileHover={!exporting ? { scale: 1.03 } : {}}
            whileTap={!exporting ? { scale: 0.97 } : {}}
            disabled={exporting}
            onClick={() => {
              setExportComplete(false);
              if (selectedFormat === 'json') {
                handleExportJSON();
              } else {
                handleExportCSV();
              }
            }}
          >
            {exporting ? 'Exporting...' : `Download ${selectedFormat.toUpperCase()}`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
