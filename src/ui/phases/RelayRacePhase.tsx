import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import {
  type FeatureTile,
  calculateEffectiveness,
  calculatePoints,
  RESOURCE_ABILITY_MAP,
} from '../../core/content/featureTiles';
import {
  type TaskCard,
  type Series,
  type TaskCategory,
  type TaskContribution,
  createSeries,
  placeTaskCard,
  calculateChainBonus,
  calculateContributionPoints,
  getAvailableResources,
  lockResources,
  canPlayerAct,
  calculateTransformationLevel,
} from '../../core/engine/seriesEngine';
import { sounds } from '../../utils/sounds';

// ─── Design Tokens ──────────────────────────────────────────────
const T = {
  primary: '#aed456', secondary: '#f4bb92', tertiary: '#e9c349',
  surface: '#16130c', container: '#221f18', containerHigh: '#2d2a22',
  onSurface: '#e9e2d5', onSurfaceVariant: '#c6c8b8', outlineVariant: '#45483c',
  fontHeadline: 'Epilogue, sans-serif', fontBody: 'Manrope, sans-serif', fontNumber: 'Georgia, serif',
  woodBevel: 'inset 0 2px rgba(244,187,146,0.2), 0 4px rgba(22,19,12,0.8)',
};
const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#e9c349', knowledge: '#5d8ac4', volunteer: '#aed456', material: '#f4bb92', influence: '#a088c4',
};
const TASK_COLORS: Record<TaskCategory, string> = {
  assess: '#5d8ac4', plan: '#a088c4', design: '#aed456', build: '#f4bb92', maintain: '#e9c349',
};
const TASK_ICONS: Record<TaskCategory, string> = {
  assess: '\u{1F50D}', plan: '\u{1F4CB}', design: '\u{1F3A8}', build: '\u{1F3D7}\uFE0F', maintain: '\u{1F527}',
};
const RESOURCE_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];
const TASK_TYPES: TaskCategory[] = ['assess', 'plan', 'design', 'build', 'maintain'];

const SUGGESTED_TASKS: Record<TaskCategory, string[]> = {
  assess: ['Condition survey', 'Water quality test', 'Structural inspection', 'Community needs assessment', 'Ecological baseline'],
  plan: ['Restoration plan', 'Budget allocation', 'Community engagement plan', 'Environmental clearance', 'Maintenance schedule'],
  design: ['Infrastructure redesign', 'Facility architecture', 'Planting layout', 'Lighting design', 'Accessibility design'],
  build: ['Pipe repair', 'Structure construction', 'Plant installation', 'Path resurfacing', 'Equipment installation'],
  maintain: ['Monthly inspection', 'Weekly testing', 'Seasonal maintenance', 'Annual safety audit', 'Committee operations'],
};

// ─── Result types ───────────────────────────────────────────────
interface SeriesResult {
  seriesValue: number;
  threshold: number;
  outcome: 'full_success' | 'partial_success' | 'narrow_success' | 'failure';
  tasks: { playerId: string; resourceType: string; tokens: number; points: number; passQuality: number }[];
  chainBonus: number;
  transformationLevel: 'partial' | 'good' | 'full';
}

interface SeriesBuilderPhaseProps {
  session: GameSession;
  players: Player[];
  challenge: ChallengeCard;
  visionBoard: { tiles: FeatureTile[]; threshold: number; objectivesCovered: string[] };
  onPhaseComplete: (result: SeriesResult) => void;
  onPlayCard: (cardId: string, targetZoneId?: string) => void;
  onPassTurn: () => void;
  onUseAbility: () => void;
}

// ─── Component ──────────────────────────────────────────────────
export default function SeriesBuilderPhase({
  session, players, challenge, visionBoard, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility,
}: SeriesBuilderPhaseProps) {
  type Stage = 'building' | 'transformation' | 'summary';
  const [stage, setStage] = useState<Stage>('building');
  const sorted = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [activeSeries, setActiveSeries] = useState<Series>(() => createSeries('Series A'));
  const [lockedByPlayer, setLockedByPlayer] = useState<Record<string, Record<ResourceType, number>>>(() => {
    const m: Record<string, Record<ResourceType, number>> = {};
    players.forEach(p => { m[p.id] = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }; });
    return m;
  });
  const [thresholdCrossed, setThresholdCrossed] = useState(false);
  const [transformLevel, setTransformLevel] = useState(0);

  // Task creation form
  const [selectedType, setSelectedType] = useState<TaskCategory | null>(null);
  const [taskName, setTaskName] = useState('');
  const [myContributions, setMyContributions] = useState<Record<ResourceType, number>>(
    { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 },
  );
  const [showCreator, setShowCreator] = useState(false);

  const hiddenThreshold = visionBoard.threshold;
  const currentPlayer = sorted[currentPlayerIdx % sorted.length];

  // Chain hint: would extending the chain give bonus?
  const chainHint = useCallback((cat: TaskCategory): number | null => {
    const hypothetical = [...activeSeries.tasks];
    const fakeTask: TaskCard = {
      id: 'hint', seriesId: activeSeries.id, turnNumber: 0, placedBy: '',
      taskName: '', taskType: cat, contributions: [], totalPoints: 0, chainPosition: 0, locked: false,
    };
    hypothetical.push(fakeTask);
    const result = calculateChainBonus(hypothetical);
    const currentBonus = activeSeries.chainBonus;
    return result.bonus > currentBonus ? result.bonus - currentBonus : null;
  }, [activeSeries]);

  const totalTokensCommitted = useMemo(
    () => RESOURCE_TYPES.reduce((s, r) => s + myContributions[r], 0), [myContributions],
  );

  const resetForm = () => {
    setSelectedType(null);
    setTaskName('');
    setMyContributions({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
    setShowCreator(false);
  };

  const advancePlayer = () => {
    const next = (currentPlayerIdx + 1) % sorted.length;
    setCurrentPlayerIdx(next);
    resetForm();
  };

  // ── commitTask ──────────────────────────────────────────────
  const commitTask = () => {
    if (!selectedType || !taskName || totalTokensCommitted === 0 || !currentPlayer) return;
    sounds.playButtonClick();

    const contributions: TaskContribution[] = [];
    for (const r of RESOURCE_TYPES) {
      if (myContributions[r] > 0) {
        const c = calculateContributionPoints(currentPlayer, r, myContributions[r]);
        contributions.push(c);
      }
    }

    const totalPoints = contributions.reduce((s, c) => s + c.effectivePoints, 0);
    const taskCard: TaskCard = {
      id: `task_${Date.now()}`,
      seriesId: activeSeries.id,
      turnNumber: activeSeries.tasks.length + 1,
      placedBy: currentPlayer.id,
      taskName,
      taskType: selectedType,
      contributions,
      totalPoints,
      chainPosition: activeSeries.tasks.length,
      locked: true,
    };

    const updatedSeries = { ...activeSeries, tasks: [...activeSeries.tasks] };
    const result = placeTaskCard(updatedSeries, taskCard, hiddenThreshold);
    setActiveSeries(updatedSeries);

    // Lock resources
    const newLocked = lockResources(lockedByPlayer[currentPlayer.id], contributions);
    setLockedByPlayer(prev => ({ ...prev, [currentPlayer.id]: newLocked }));

    if (result.thresholdCrossed && !thresholdCrossed) {
      setThresholdCrossed(true);
      setTransformLevel(result.transformationLevel);
      setStage('transformation');
    } else {
      advancePlayer();
    }
  };

  // ── passTurn ────────────────────────────────────────────────
  const passTurn = () => {
    sounds.playButtonClick();
    advancePlayer();
  };

  // ── completeSeries ──────────────────────────────────────────
  const completeSeries = () => {
    sounds.playButtonClick();
    const sv = activeSeries.runningTotal;
    const thr = hiddenThreshold;
    const outcome = sv >= thr * 2 ? 'full_success'
      : sv >= thr * 1.5 ? 'partial_success'
      : sv >= thr ? 'narrow_success' : 'failure';
    const tfLevel = sv >= thr * 2 ? 'full' : sv >= thr * 1.5 ? 'good' : 'partial';
    onPhaseComplete({
      seriesValue: sv,
      threshold: thr,
      outcome,
      tasks: activeSeries.tasks.map(t => ({
        playerId: t.placedBy,
        resourceType: t.contributions[0]?.resourceType || 'budget',
        tokens: t.contributions.reduce((s, c) => s + c.tokensCommitted, 0),
        points: t.totalPoints,
        passQuality: 0.7,
      })),
      chainBonus: activeSeries.chainBonus,
      transformationLevel: tfLevel,
    });
  };

  // ── Transformation auto-advance ─────────────────────────────
  useEffect(() => {
    if (stage === 'transformation') {
      const timer = setTimeout(() => { setStage('building'); advancePlayer(); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const available = currentPlayer ? getAvailableResources(currentPlayer, lockedByPlayer[currentPlayer.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }) : {} as Record<ResourceType, number>;
  const progressFrac = hiddenThreshold > 0 ? Math.min(activeSeries.runningTotal / (hiddenThreshold * 2), 1) : 0;

  // ════════════════════════════════════════════════════════════
  // RENDER: Transformation
  // ════════════════════════════════════════════════════════════
  if (stage === 'transformation') {
    const lvl = transformLevel >= 100 ? 'full' : transformLevel >= 66 ? 'good' : 'partial';
    const color = lvl === 'full' ? T.primary : lvl === 'good' ? T.tertiary : T.onSurfaceVariant;
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => { setStage('building'); advancePlayer(); }}
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24,
          background: T.surface, fontFamily: T.fontBody, cursor: 'pointer',
        }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{ fontSize: 48, fontFamily: T.fontHeadline, fontWeight: 700, color, textTransform: 'uppercase' }}
        >
          {lvl === 'full' ? 'FULL TRANSFORMATION' : lvl === 'good' ? 'GOOD TRANSFORMATION' : 'PARTIAL TRANSFORMATION'}
        </motion.div>
        <div style={{ color: T.onSurfaceVariant, fontSize: 14, maxWidth: 400, textAlign: 'center' }}>
          {lvl === 'full' ? 'All vision features resolve! The park is fully transformed.' :
           lvl === 'good' ? 'Strong progress -- most features take shape.' :
           'Some features begin to emerge. Keep building!'}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {visionBoard.tiles.map((tile, i) => (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3 }}
              style={{
                width: 100, padding: 12, textAlign: 'center', borderRadius: 8,
                background: T.containerHigh, border: `1px solid ${T.primary}44`,
              }}
            >
              <div style={{ fontSize: 28 }}>{tile.icon}</div>
              <div style={{ fontSize: 10, color: T.primary, fontWeight: 600, marginTop: 4 }}>{tile.name}</div>
            </motion.div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.outlineVariant, marginTop: 12 }}>Click to continue building</div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Summary
  // ════════════════════════════════════════════════════════════
  if (stage === 'summary') {
    const sv = activeSeries.runningTotal;
    const thr = hiddenThreshold;
    const outcomeLabel = sv >= thr * 2 ? 'FULL SUCCESS' : sv >= thr * 1.5 ? 'PARTIAL SUCCESS' : sv >= thr ? 'NARROW SUCCESS' : 'FAILURE';
    const outcomeColor = sv >= thr * 2 ? T.primary : sv >= thr * 1.5 ? T.tertiary : sv >= thr ? T.secondary : '#e05555';
    const tfLabel = sv >= thr * 2 ? 'Full' : sv >= thr * 1.5 ? 'Good' : 'Partial';
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: 32, gap: 20, background: T.surface, fontFamily: T.fontBody,
          overflowY: 'auto',
        }}
      >
        <div style={{ fontFamily: T.fontHeadline, fontSize: 24, fontWeight: 700, color: T.onSurface }}>
          Series Summary
        </div>
        {/* Series total */}
        <div style={{
          display: 'flex', gap: 32, alignItems: 'center', padding: 16, borderRadius: 8,
          background: T.container, border: `1px solid ${T.outlineVariant}`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>Series Value</div>
            <div style={{ fontFamily: T.fontNumber, fontSize: 32, fontWeight: 700, color: T.tertiary }}>{sv.toFixed(1)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>Chain Bonus</div>
            <div style={{ fontFamily: T.fontNumber, fontSize: 20, fontWeight: 700, color: T.primary }}>+{activeSeries.chainBonus}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>Transformation</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: outcomeColor }}>{tfLabel}</div>
          </div>
        </div>
        {/* Outcome */}
        <div style={{ fontSize: 20, fontWeight: 700, color: outcomeColor, fontFamily: T.fontHeadline }}>
          {outcomeLabel}
        </div>
        {/* Task list */}
        <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activeSeries.tasks.map((task, i) => {
            const p = sorted.find(x => x.id === task.placedBy);
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 6, background: T.containerHigh,
                borderLeft: `4px solid ${TASK_COLORS[task.taskType]}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{TASK_ICONS[task.taskType]}</span>
                  <span style={{ fontSize: 12, color: T.onSurface, fontWeight: 600 }}>{task.taskName}</span>
                  <span style={{ fontSize: 10, color: T.onSurfaceVariant }}>{p?.name ?? '??'}</span>
                </div>
                <span style={{ fontFamily: T.fontNumber, fontSize: 14, fontWeight: 700, color: TASK_COLORS[task.taskType] }}>
                  {task.totalPoints.toFixed(1)} pts
                </span>
              </div>
            );
          })}
        </div>
        {/* Vision features */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {visionBoard.tiles.map(tile => (
            <div key={tile.id} style={{
              padding: '6px 12px', borderRadius: 6, background: T.container,
              border: `1px solid ${T.outlineVariant}`, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 16 }}>{tile.icon}</span>
              <span style={{ fontSize: 11, color: T.onSurfaceVariant }}>{tile.name}</span>
            </div>
          ))}
        </div>
        {/* Continue button */}
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={completeSeries}
          style={{
            marginTop: 12, padding: '12px 32px', borderRadius: 8, border: 'none',
            background: T.primary, color: T.surface, fontSize: 15, fontWeight: 700,
            fontFamily: T.fontHeadline, cursor: 'pointer', boxShadow: T.woodBevel,
          }}
        >
          Continue to Scoring
        </motion.button>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Building (main stage)
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: T.surface, fontFamily: T.fontBody, color: T.onSurface, overflow: 'hidden',
    }}>
      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div style={{
        padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.container, borderBottom: `1px solid ${T.outlineVariant}`,
      }}>
        <div style={{ fontSize: 12, color: T.onSurfaceVariant, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          Vision: {visionBoard.tiles.map(t => t.icon + ' ' + t.name).join('  |  ')}
        </div>
        <div style={{ fontSize: 11, color: T.tertiary, fontWeight: 600, marginLeft: 12, whiteSpace: 'nowrap' }}>
          Turn {currentPlayerIdx + 1} / {sorted.length} &middot; Tasks: {activeSeries.tasks.length}
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        {/* LEFT: Series Timeline (70%) */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', padding: 12, overflow: 'hidden' }}>
          {/* Series header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: T.fontHeadline, fontSize: 16, fontWeight: 700, color: T.onSurface }}>
              {activeSeries.name}
            </span>
            <span style={{ fontSize: 11, color: T.onSurfaceVariant }}>
              {activeSeries.tasks.length} task{activeSeries.tasks.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: T.fontNumber, fontSize: 18, fontWeight: 700, color: T.tertiary }}>
              {activeSeries.runningTotal.toFixed(1)} pts
            </span>
            {activeSeries.chainLength >= 2 && (
              <span style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>
                Chain x{activeSeries.chainLength} (+{activeSeries.chainBonus})
              </span>
            )}
          </div>

          {/* Task cards row */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, minHeight: 170,
            alignItems: 'flex-start',
          }}>
            {activeSeries.tasks.map((task, i) => {
              const p = sorted.find(x => x.id === task.placedBy);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 130, minWidth: 130, minHeight: 160, borderRadius: 8,
                    background: T.containerHigh, border: `1px solid ${T.outlineVariant}`,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
                  }}
                >
                  {/* Top strip */}
                  <div style={{ height: 5, background: TASK_COLORS[task.taskType] }} />
                  {/* Icon + type */}
                  <div style={{ padding: '6px 8px 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14 }}>{TASK_ICONS[task.taskType]}</span>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', color: TASK_COLORS[task.taskType], fontWeight: 700 }}>
                      {task.taskType}
                    </span>
                  </div>
                  {/* Task name */}
                  <div style={{ padding: '0 8px', fontSize: 11, fontWeight: 700, color: T.onSurface, fontFamily: T.fontBody }}>
                    {task.taskName}
                  </div>
                  {/* Contributions */}
                  <div style={{ padding: '4px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {task.contributions.map((c, ci) => (
                      <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: T.onSurfaceVariant }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: '50%', display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 8, fontWeight: 700,
                          background: ROLE_COLORS[p?.roleId ?? 'citizen'] + '44', color: ROLE_COLORS[p?.roleId ?? 'citizen'],
                        }}>
                          {(c.playerName || '?')[0]}
                        </span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: RESOURCE_COLORS[c.resourceType] }} />
                        <span>&times;{c.tokensCommitted}</span>
                        <span style={{ color: T.onSurfaceVariant }}>=</span>
                        <span style={{ fontWeight: 600 }}>{c.effectivePoints.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Total */}
                  <div style={{
                    padding: '4px 8px 6px', fontSize: 12, fontWeight: 700,
                    color: TASK_COLORS[task.taskType], fontFamily: T.fontNumber,
                  }}>
                    {task.totalPoints.toFixed(1)} pts
                  </div>
                  {/* Chain link */}
                  {i > 0 && activeSeries.chainLength > 1 && i >= activeSeries.tasks.length - activeSeries.chainLength && (
                    <div style={{
                      position: 'absolute', top: 5, right: 4, fontSize: 10, color: T.tertiary,
                    }}>
                      {'\u{1F517}'}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* + Add Task card */}
            <motion.div
              whileHover={!showCreator ? { scale: 1.03 } : {}}
              onClick={() => { if (!showCreator) { sounds.playButtonClick(); setShowCreator(true); } }}
              style={{
                width: 130, minWidth: 130, minHeight: 160, borderRadius: 8,
                border: `2px dashed ${showCreator ? T.primary : T.outlineVariant}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: showCreator ? 'default' : 'pointer', color: showCreator ? T.primary : T.outlineVariant,
                fontSize: 13, fontWeight: 600, textAlign: 'center', padding: 8,
                background: showCreator ? T.primary + '11' : 'transparent',
              }}
            >
              + Add Task
            </motion.div>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%', height: 12, borderRadius: 6, background: T.container,
            overflow: 'hidden', marginTop: 4, position: 'relative',
          }}>
            {/* Segments colored by task type */}
            <div style={{ display: 'flex', height: '100%' }}>
              {activeSeries.tasks.map((task, i) => {
                const frac = hiddenThreshold > 0 ? (task.totalPoints / (hiddenThreshold * 2)) * 100 : 0;
                return (
                  <div key={task.id} style={{
                    width: `${frac}%`, height: '100%', background: TASK_COLORS[task.taskType],
                    opacity: 0.85,
                  }} />
                );
              })}
              {activeSeries.chainBonus > 0 && (
                <div style={{
                  width: `${(activeSeries.chainBonus / (hiddenThreshold * 2)) * 100}%`,
                  height: '100%', background: `linear-gradient(90deg, ${T.tertiary}, ${T.tertiary}aa)`,
                  animation: 'pulseGold 2s infinite',
                }} />
              )}
            </div>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: T.onSurface, textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}>
              {activeSeries.runningTotal.toFixed(1)} pts
              {activeSeries.chainBonus > 0 ? ` (incl. +${activeSeries.chainBonus} chain)` : ''}
            </div>
          </div>

          {/* Transformation text */}
          {thresholdCrossed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: 12, color: T.primary, fontWeight: 600, marginTop: 4, textAlign: 'center' }}
            >
              Threshold reached! Series is transforming the park.
            </motion.div>
          )}
        </div>

        {/* RIGHT: Task Creator Panel (30%) */}
        <div style={{
          flex: 3, display: 'flex', flexDirection: 'column', padding: 12, gap: 10,
          borderLeft: `1px solid ${T.outlineVariant}`, overflowY: 'auto',
        }}>
          <AnimatePresence>
            {showCreator ? (
              <motion.div
                key="creator"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {/* Step A: Task type buttons */}
                <div style={{ fontSize: 10, color: T.onSurfaceVariant, fontWeight: 600, textTransform: 'uppercase' }}>
                  Step 1: Task Type
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {TASK_TYPES.map(cat => {
                    const hint = chainHint(cat);
                    const selected = selectedType === cat;
                    return (
                      <motion.button
                        key={cat}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { sounds.playButtonClick(); setSelectedType(cat); setTaskName(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                          borderRadius: 6, border: `1px solid ${selected ? TASK_COLORS[cat] : T.outlineVariant}`,
                          background: selected ? TASK_COLORS[cat] + '22' : T.container,
                          cursor: 'pointer', color: T.onSurface, fontSize: 12, fontWeight: selected ? 700 : 400,
                          fontFamily: T.fontBody,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{TASK_ICONS[cat]}</span>
                        <span style={{ textTransform: 'capitalize', flex: 1, textAlign: 'left' }}>{cat}</span>
                        {hint !== null && (
                          <span style={{ fontSize: 9, color: T.tertiary, fontWeight: 700 }}>+{hint} chain</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Step B: Task name */}
                {selectedType && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, fontWeight: 600, textTransform: 'uppercase' }}>
                      Step 2: Task Name
                    </div>
                    <input
                      value={taskName}
                      onChange={e => setTaskName(e.target.value)}
                      placeholder="Enter task name..."
                      style={{
                        padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                        background: T.container, color: T.onSurface, fontSize: 12, fontFamily: T.fontBody,
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {SUGGESTED_TASKS[selectedType].map(s => (
                        <button
                          key={s}
                          onClick={() => setTaskName(s)}
                          style={{
                            padding: '2px 8px', borderRadius: 4, border: `1px solid ${T.outlineVariant}`,
                            background: taskName === s ? TASK_COLORS[selectedType] + '33' : T.container,
                            color: T.onSurfaceVariant, fontSize: 10, cursor: 'pointer', fontFamily: T.fontBody,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step C: Resource steppers */}
                {selectedType && taskName && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, fontWeight: 600, textTransform: 'uppercase' }}>
                      Step 3: Commit Resources
                    </div>
                    {RESOURCE_TYPES.map(r => {
                      const avail = available[r] ?? 0;
                      if (avail <= 0 && myContributions[r] <= 0) return null;
                      const abilityKey = RESOURCE_ABILITY_MAP[r];
                      const abilityScore = (currentPlayer.abilities as unknown as Record<string, number>)[abilityKey] ?? 0;
                      const eff = calculateEffectiveness(abilityScore);
                      const pts = calculatePoints(myContributions[r], eff);
                      return (
                        <div key={r} style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', background: RESOURCE_COLORS[r], flexShrink: 0,
                          }} />
                          <span style={{ width: 60, color: T.onSurfaceVariant, textTransform: 'capitalize', fontSize: 10 }}>
                            {r}
                          </span>
                          <span style={{ fontSize: 9, color: T.onSurfaceVariant, width: 20, textAlign: 'right' }}>
                            {avail}
                          </span>
                          <span style={{ fontSize: 9, color: T.outlineVariant, width: 28, textAlign: 'right' }}>
                            {eff}%
                          </span>
                          <button
                            onClick={() => setMyContributions(prev => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))}
                            disabled={myContributions[r] <= 0}
                            style={{
                              width: 20, height: 20, borderRadius: 4, border: `1px solid ${T.outlineVariant}`,
                              background: T.container, color: T.onSurface, cursor: 'pointer',
                              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: myContributions[r] <= 0 ? 0.3 : 1,
                            }}
                          >
                            -
                          </button>
                          <span style={{ width: 16, textAlign: 'center', fontWeight: 700, fontFamily: T.fontNumber, color: T.onSurface }}>
                            {myContributions[r]}
                          </span>
                          <button
                            onClick={() => setMyContributions(prev => ({ ...prev, [r]: Math.min(avail, prev[r] + 1) }))}
                            disabled={myContributions[r] >= avail}
                            style={{
                              width: 20, height: 20, borderRadius: 4, border: `1px solid ${T.outlineVariant}`,
                              background: T.container, color: T.onSurface, cursor: 'pointer',
                              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: myContributions[r] >= avail ? 0.3 : 1,
                            }}
                          >
                            +
                          </button>
                          <span style={{ fontSize: 10, color: RESOURCE_COLORS[r], fontWeight: 600, fontFamily: T.fontNumber }}>
                            = {pts.toFixed(1)} pts
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Step D: Commit button */}
                <motion.button
                  whileHover={selectedType && taskName && totalTokensCommitted > 0 ? { scale: 1.03 } : {}}
                  whileTap={selectedType && taskName && totalTokensCommitted > 0 ? { scale: 0.96 } : {}}
                  onClick={commitTask}
                  disabled={!selectedType || !taskName || totalTokensCommitted === 0}
                  style={{
                    padding: '10px 16px', borderRadius: 8, border: 'none',
                    background: selectedType && taskName && totalTokensCommitted > 0 ? T.primary : T.outlineVariant,
                    color: selectedType && taskName && totalTokensCommitted > 0 ? T.surface : T.onSurfaceVariant,
                    fontSize: 13, fontWeight: 700, cursor: selectedType && taskName && totalTokensCommitted > 0 ? 'pointer' : 'not-allowed',
                    fontFamily: T.fontHeadline, boxShadow: T.woodBevel, opacity: selectedType && taskName && totalTokensCommitted > 0 ? 1 : 0.4,
                  }}
                >
                  Lock Resources & Place Task
                </motion.button>

                {/* Pass Turn */}
                <button
                  onClick={passTurn}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                    background: 'transparent', color: T.onSurfaceVariant, fontSize: 12, cursor: 'pointer',
                    fontFamily: T.fontBody,
                  }}
                >
                  Pass Turn
                </button>

                {/* Finalize if threshold crossed */}
                {thresholdCrossed && (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={() => { sounds.playButtonClick(); setStage('summary'); }}
                    style={{
                      padding: '10px 16px', borderRadius: 8, border: `2px solid ${T.primary}`,
                      background: T.primary + '22', color: T.primary, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: T.fontHeadline,
                    }}
                  >
                    Finalize Series
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, color: T.onSurfaceVariant, fontSize: 12, textAlign: 'center', padding: 16,
              }}>
                <div style={{ fontSize: 28 }}>{'\u{1F3D7}\uFE0F'}</div>
                <div>Click <strong>+ Add Task</strong> to begin building</div>
                <div style={{ fontSize: 11, color: T.outlineVariant }}>
                  Current turn: <span style={{ color: ROLE_COLORS[currentPlayer?.roleId ?? 'citizen'], fontWeight: 700 }}>
                    {currentPlayer?.name ?? '...'}
                  </span>
                </div>
                {/* Pass Turn available here too */}
                <button
                  onClick={passTurn}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                    background: 'transparent', color: T.onSurfaceVariant, fontSize: 11, cursor: 'pointer',
                    fontFamily: T.fontBody, marginTop: 8,
                  }}
                >
                  Pass Turn
                </button>
                {thresholdCrossed && (
                  <button
                    onClick={() => { sounds.playButtonClick(); setStage('summary'); }}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: `2px solid ${T.primary}`,
                      background: T.primary + '22', color: T.primary, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: T.fontBody, marginTop: 4,
                    }}
                  >
                    Finalize Series
                  </button>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── BOTTOM: Player resource panel ─────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 12px', borderTop: `1px solid ${T.outlineVariant}`,
        overflowX: 'auto', background: T.container,
      }}>
        {sorted.map((p, i) => {
          const isCurrent = i === currentPlayerIdx % sorted.length;
          const playerLocked = lockedByPlayer[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
          const exhausted = !canPlayerAct(p, playerLocked);
          return (
            <div key={p.id} style={{
              minWidth: 110, padding: '6px 10px', borderRadius: 8,
              background: isCurrent ? T.containerHigh : T.container,
              border: isCurrent ? `2px solid ${T.primary}` : `1px solid ${T.outlineVariant}`,
              opacity: exhausted ? 0.4 : 1, textAlign: 'center',
              animation: isCurrent ? 'pulseGold 2s infinite' : 'none',
            }}>
              {/* Avatar + name + role */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: ROLE_COLORS[p.roleId],
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {isCurrent && '\u26BD '}{p.name}
              </div>
              <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'capitalize', marginBottom: 4 }}>
                {p.roleId}
              </div>
              {/* Resource dots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {RESOURCE_TYPES.map(r => {
                  const total = p.resources[r] || 0;
                  const locked = playerLocked[r] || 0;
                  const free = Math.max(0, total - locked);
                  if (total === 0) return null;
                  return (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: RESOURCE_COLORS[r], flexShrink: 0 }} />
                      <div style={{ display: 'flex', gap: 1, flex: 1 }}>
                        {Array.from({ length: total }, (_, di) => (
                          <span key={di} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: di < free ? RESOURCE_COLORS[r] : 'transparent',
                            border: `1px solid ${RESOURCE_COLORS[r]}`,
                          }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CSS Keyframes ─────────────────────────────────────── */}
      <style>{`
        @keyframes pulseGold { 0%,100% { box-shadow: 0 0 0 rgba(233,195,73,0); } 50% { box-shadow: 0 0 20px rgba(233,195,73,0.4); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
