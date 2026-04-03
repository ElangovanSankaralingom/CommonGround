import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import { type FeatureTile, calculateEffectiveness, RESOURCE_ABILITY_MAP, STARTING_TOKENS } from '../../core/content/featureTiles';
import {
  type TaskCard, type Series, type TaskCategory, type TaskContribution,
  createSeries, placeTask, calculateChainBonus, calculateContributionPoints,
  getAvailableResources, canPlayerAct, getCombinationMultiplier,
} from '../../core/engine/seriesEngine';
import { getPlayerCapabilities, activateCapability, type Capability } from '../../core/engine/capabilityEngine';
import { drawReactionCard, tickReactionEffects, type ReactionCard, type ReactionEffect } from '../../core/engine/reactionCards';
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
const RES_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];
const TASK_COLORS: Record<string, string> = {
  assess: '#5d8ac4', plan: '#a088c4', design: '#aed456', build: '#f4bb92', maintain: '#e9c349', innovate: '#e9e2d5',
};
const TASK_ICONS: Record<string, string> = {
  assess: '\u{1F50D}', plan: '\u{1F4CB}', design: '\u{1F3A8}', build: '\u{1F3D7}\uFE0F', maintain: '\u{1F527}', innovate: '\u{1F4A1}',
};
const TASK_TYPES: TaskCategory[] = ['assess', 'plan', 'design', 'build', 'maintain', 'innovate'];
const SUGGESTED_TASKS: Record<string, string[]> = {
  assess: ['Condition survey', 'Water quality test', 'Community needs assessment', 'Ecological baseline', 'Structural inspection'],
  plan: ['Restoration plan', 'Budget allocation', 'Community engagement plan', 'Environmental clearance', 'Maintenance schedule'],
  design: ['Infrastructure redesign', 'Facility architecture', 'Planting layout', 'Lighting design', 'Accessibility design'],
  build: ['Pipe repair', 'Structure construction', 'Plant installation', 'Path resurfacing', 'Equipment install'],
  maintain: ['Monthly inspection', 'Weekly testing', 'Seasonal maintenance', 'Annual safety audit', 'Committee operations'],
  innovate: ['Creative solution', 'Cross-sector partnership', 'Technology pilot', 'Community innovation', 'Policy experiment'],
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
type Stage = 'building' | 'results';

export default function SeriesBuilderPhase({
  session, players, challenge, visionBoard, onPhaseComplete, onPlayCard, onPassTurn, onUseAbility,
}: SeriesBuilderPhaseProps) {
  const sorted = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const [stage, setStage] = useState<Stage>('building');
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [activeSeries, setActiveSeries] = useState<Series>(() => createSeries('Series A'));
  const [resourcePools, setResourcePools] = useState<Record<string, Record<ResourceType, number>>>(() => {
    const m: Record<string, Record<ResourceType, number>> = {};
    players.forEach(p => {
      // Use STARTING_TOKENS as the guaranteed source for role-based token allocation (12 per player)
      // Fall back to player.resources if STARTING_TOKENS doesn't have this role
      const roleTokens = STARTING_TOKENS[p.roleId as keyof typeof STARTING_TOKENS];
      const tokens = roleTokens
        ? { ...roleTokens }
        : { budget: p.resources.budget || 2, knowledge: p.resources.knowledge || 2, volunteer: p.resources.volunteer || 2, material: p.resources.material || 2, influence: p.resources.influence || 2 };
      m[p.id] = tokens;
      console.log(`PHASE4_INIT: ${p.name} (${p.roleId}) resources: B:${tokens.budget} K:${tokens.knowledge} V:${tokens.volunteer} M:${tokens.material} I:${tokens.influence} total:${Object.values(tokens).reduce((s, v) => s + v, 0)}`);
    });
    return m;
  });
  const [lockedByPlayer, setLockedByPlayer] = useState<Record<string, Record<ResourceType, number>>>(() => {
    const m: Record<string, Record<ResourceType, number>> = {};
    players.forEach(p => { m[p.id] = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }; });
    return m;
  });
  const [thresholdCrossed, setThresholdCrossed] = useState(false);
  const [transformLevel, setTransformLevel] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedType, setSelectedType] = useState<TaskCategory | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCriteria, setTaskCriteria] = useState('');
  const [crossPerspective, setCrossPerspective] = useState('');
  const [myContributions, setMyContributions] = useState<Record<ResourceType, number>>({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
  const [activeEffects, setActiveEffects] = useState<ReactionEffect[]>([]);
  const [drawnCards, setDrawnCards] = useState<string[]>([]);
  const [currentReaction, setCurrentReaction] = useState<ReactionCard | null>(null);
  const [capabilitiesUsed, setCapabilitiesUsed] = useState<Record<string, string[]>>({});
  const [transformText, setTransformText] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);

  // Collaboration window state
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabTimer, setCollabTimer] = useState(30);
  const [joinedContributions, setJoinedContributions] = useState<TaskContribution[]>([]);
  const collabTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hiddenThreshold = visionBoard.threshold;
  const currentPlayer = sorted[currentPlayerIdx];
  const zoneId = useMemo(() => {
    const map: Record<string, string> = { boating_pond: 'z3', main_entrance: 'z1', fountain_plaza: 'z2', herbal_garden: 'z4', walking_track: 'z5', playground: 'z6', ppp_zone: 'z13' };
    return map[challenge?.affectedZoneIds?.[0] || 'boating_pond'] || 'z3';
  }, [challenge]);

  // ─── Chain info ───
  const chainInfo = useMemo(() => {
    const seq = activeSeries.chainSequence;
    if (seq.length < 2) return 'No chain yet';
    const result = calculateChainBonus(seq);
    const last = seq[seq.length - 1];
    return `\u{1F517} ${seq.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' \u2192 ')} (+${result.bonus})`;
  }, [activeSeries.chainSequence]);

  // ─── Available for current player ───
  const availableForCurrent = useMemo(() => {
    const pool = resourcePools[currentPlayer?.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    const locked = lockedByPlayer[currentPlayer?.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    const avail: Record<ResourceType, number> = { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
    RES_TYPES.forEach(r => { avail[r] = Math.max(0, (pool[r] || 0) - (locked[r] || 0)); });
    console.log(`RESOURCE_READ: ${currentPlayer?.name} pool=[${RES_TYPES.map(r => `${r[0].toUpperCase()}:${pool[r]}`).join(' ')}] locked=[${RES_TYPES.map(r => `${r[0].toUpperCase()}:${locked[r]}`).join(' ')}] avail=[${RES_TYPES.map(r => `${r[0].toUpperCase()}:${avail[r]}`).join(' ')}]`);
    return avail;
  }, [resourcePools, lockedByPlayer, currentPlayer]);

  // ─── Live contribution total ───
  const liveTotal = useMemo(() => {
    if (!currentPlayer) return 0;
    let total = 0;
    RES_TYPES.forEach(r => {
      if (myContributions[r] > 0) {
        const { basePoints } = calculateContributionPoints(currentPlayer, r, myContributions[r]);
        total += basePoints;
      }
    });
    return Math.round(total * 10) / 10;
  }, [myContributions, currentPlayer]);

  // ─── Commit Task ───
  const commitTask = useCallback((extraContributions?: TaskContribution[]) => {
    console.log('LOCK_CLICKED', { type: selectedType, title: taskTitle, contributions: myContributions, total: liveTotal });
    if (!selectedType || !taskTitle.trim()) { console.log('LOCK_VALIDATION_FAIL: type or title missing'); return; }
    sounds.playButtonClick();

    const contributions: TaskContribution[] = [];
    RES_TYPES.forEach(r => {
      if (myContributions[r] > 0) {
        const { effectiveness, basePoints } = calculateContributionPoints(currentPlayer, r, myContributions[r]);
        contributions.push({
          playerId: currentPlayer.id, playerName: currentPlayer.name, playerRole: currentPlayer.roleId,
          resourceType: r, tokensCommitted: myContributions[r], effectiveness, basePoints, justification: '',
        });
      }
    });
    // Add joined players' contributions from collaboration window
    if (extraContributions) contributions.push(...extraContributions);
    if (contributions.length === 0) { console.log('LOCK_VALIDATION_FAIL: no resources committed'); return; }

    const task: TaskCard = {
      id: `task_${Date.now()}`, seriesId: activeSeries.id, turnNumber: activeSeries.tasks.length + 1,
      taskType: selectedType, title: taskTitle.trim(), description: taskDesc.trim(),
      successCriteria: taskCriteria.trim(),
      placedBy: { playerId: currentPlayer.id, playerName: currentPlayer.name, role: currentPlayer.roleId },
      contributions,
      crossPerspectives: crossPerspective.trim() ? [{ playerId: currentPlayer.id, role: currentPlayer.roleId, text: crossPerspective.trim() }] : [],
      capabilities: [], dependencies: [], investigationCluesReferenced: [],
      uniqueRoles: 0, combinationMultiplier: 1, innovationMultiplier: 1,
      capabilityBonus: 0, crossPerspectiveBonus: 0, dependencyBonus: 0,
      chainContribution: null, baseTotal: 0, finalTotal: 0,
      locked: false, isConditional: false, condition: null, conditionMet: false,
    };

    const pools = { ...resourcePools };
    Object.keys(pools).forEach(k => { pools[k] = { ...pools[k] }; });
    const result = placeTask(activeSeries, task, hiddenThreshold, pools);
    if (!result.success) { console.log('TASK_FAILED:', result.error); return; }

    setResourcePools(pools);
    const newLocked = { ...lockedByPlayer };
    contributions.forEach(c => {
      newLocked[c.playerId] = { ...newLocked[c.playerId] };
      newLocked[c.playerId][c.resourceType] = (newLocked[c.playerId][c.resourceType] || 0) + c.tokensCommitted;
      const remaining = (pools[c.playerId]?.[c.resourceType] || 0);
      console.log(`RESOURCE_LOCK: ${c.playerName} ${c.resourceType} -${c.tokensCommitted} remaining:${remaining}`);
    });
    setLockedByPlayer(newLocked);
    setActiveSeries({ ...activeSeries });

    if (result.thresholdCrossed && !thresholdCrossed) {
      setThresholdCrossed(true);
      setTransformLevel(result.transformationLevel);
      setTransformText(result.transformationLevel >= 66 ? 'Full restoration underway!' : 'Something is changing...');
      setTimeout(() => setTransformText(''), 4000);
    } else if (result.transformationLevel > transformLevel) {
      setTransformLevel(result.transformationLevel);
    }

    if (activeSeries.tasks.length % 3 === 0) {
      const card = drawReactionCard(zoneId, drawnCards);
      if (card) {
        setCurrentReaction(card);
        setDrawnCards(prev => [...prev, card.id]);
        if (card.effect.duration !== 'instant') {
          setActiveEffects(prev => [...prev, { ...card.effect, turnsRemaining: card.effect.duration === 'next_task' ? 1 : card.effect.duration === 'next_2_tasks' ? 2 : 99 }]);
        }
        setTimeout(() => setCurrentReaction(null), 4000);
      }
    }
    setActiveEffects(prev => tickReactionEffects(prev));

    setSelectedType(null); setTaskTitle(''); setTaskDesc(''); setTaskCriteria(''); setCrossPerspective('');
    setMyContributions({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
    setShowCreator(false);

    let nextIdx = (currentPlayerIdx + 1) % sorted.length;
    let attempts = 0;
    while (!canPlayerAct(sorted[nextIdx], lockedByPlayer[sorted[nextIdx].id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }) && attempts < sorted.length) {
      nextIdx = (nextIdx + 1) % sorted.length; attempts++;
    }
    if (attempts >= sorted.length) { setStage('results'); } else { setCurrentPlayerIdx(nextIdx); }
  }, [selectedType, taskTitle, taskDesc, taskCriteria, crossPerspective, myContributions, liveTotal, currentPlayer, activeSeries, hiddenThreshold, resourcePools, lockedByPlayer, thresholdCrossed, transformLevel, currentPlayerIdx, sorted, zoneId, drawnCards]);

  // ─── Complete Series ───
  const completeSeries = useCallback(() => {
    sounds.playButtonClick();
    const sv = activeSeries.runningTotal;
    const thr = hiddenThreshold;
    const outcome = sv >= thr * 2 ? 'full_success' : sv >= thr * 1.5 ? 'partial_success' : sv >= thr ? 'narrow_success' : 'failure';
    const tfLevel = sv >= thr * 2 ? 'full' as const : sv >= thr * 1.5 ? 'good' as const : 'partial' as const;
    console.log('SERIES_COMPLETE: sv=', sv, 'thr=', thr, 'outcome=', outcome, 'tf=', tfLevel);
    onPhaseComplete({
      seriesValue: sv, threshold: thr, outcome,
      tasks: activeSeries.tasks.map(t => ({
        playerId: t.placedBy.playerId, resourceType: t.contributions[0]?.resourceType || 'budget',
        tokens: t.contributions.reduce((s, c) => s + c.tokensCommitted, 0),
        points: t.finalTotal, passQuality: 0.7,
      })),
      chainBonus: activeSeries.chainBonus, transformationLevel: tfLevel,
    });
  }, [activeSeries, hiddenThreshold, onPhaseComplete]);

  // ─── Stepper helper ───
  const adjustContribution = useCallback((r: ResourceType, delta: number) => {
    setMyContributions(prev => {
      const next = { ...prev };
      const newVal = Math.max(0, Math.min(availableForCurrent[r], prev[r] + delta));
      next[r] = newVal;
      return next;
    });
  }, [availableForCurrent]);

  // ─── Pass Turn ───
  const passTurn = useCallback(() => {
    sounds.playButtonClick();
    let nextIdx = (currentPlayerIdx + 1) % sorted.length;
    let attempts = 0;
    while (!canPlayerAct(sorted[nextIdx], lockedByPlayer[sorted[nextIdx].id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 }) && attempts < sorted.length) {
      nextIdx = (nextIdx + 1) % sorted.length; attempts++;
    }
    if (attempts >= sorted.length) { setStage('results'); } else { setCurrentPlayerIdx(nextIdx); }
    setShowCreator(false);
  }, [currentPlayerIdx, sorted, lockedByPlayer]);

  // ─── Collaboration Window ───
  const openCollaboration = useCallback(() => {
    sounds.playButtonClick();
    setCollabOpen(true);
    setCollabTimer(30);
    setJoinedContributions([]);
    collabTimerRef.current = setInterval(() => {
      setCollabTimer(prev => {
        if (prev <= 1) {
          if (collabTimerRef.current) clearInterval(collabTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    console.log('COLLAB_WINDOW_OPEN:', taskTitle);
  }, [taskTitle]);

  const joinTask = useCallback((joiner: Player, resource: ResourceType, tokens: number) => {
    if (tokens <= 0) return;
    const avail = (resourcePools[joiner.id]?.[resource] || 0) - (lockedByPlayer[joiner.id]?.[resource] || 0);
    const actual = Math.min(tokens, avail);
    if (actual <= 0) return;
    const { effectiveness, basePoints } = calculateContributionPoints(joiner, resource, actual);
    setJoinedContributions(prev => {
      // Remove previous contribution from this player for this resource
      const filtered = prev.filter(c => !(c.playerId === joiner.id && c.resourceType === resource));
      return [...filtered, {
        playerId: joiner.id, playerName: joiner.name, playerRole: joiner.roleId,
        resourceType: resource, tokensCommitted: actual, effectiveness, basePoints, justification: '',
      }];
    });
    console.log(`COLLAB_JOIN: ${joiner.name} adds ${actual} ${resource} (${effectiveness}% = ${basePoints.toFixed(1)} pts)`);
  }, [resourcePools, lockedByPlayer]);

  const lockCollabTask = useCallback(() => {
    if (collabTimerRef.current) clearInterval(collabTimerRef.current);
    setCollabOpen(false);
    commitTask(joinedContributions);
    setJoinedContributions([]);
  }, [commitTask, joinedContributions]);

  // Auto-lock when timer expires
  React.useEffect(() => {
    if (collabOpen && collabTimer <= 0) {
      lockCollabTask();
    }
  }, [collabOpen, collabTimer, lockCollabTask]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => { if (collabTimerRef.current) clearInterval(collabTimerRef.current); };
  }, []);

  // Collaboration score preview
  const collabPreview = useMemo(() => {
    const allContribs = [
      ...RES_TYPES.filter(r => myContributions[r] > 0).map(r => {
        const { effectiveness, basePoints } = calculateContributionPoints(currentPlayer, r, myContributions[r]);
        return { role: currentPlayer?.roleId || '', basePoints };
      }),
      ...joinedContributions.map(c => ({ role: c.playerRole, basePoints: c.basePoints })),
    ];
    const uniqueRoles = new Set(allContribs.map(c => c.role)).size;
    const baseSum = allContribs.reduce((s, c) => s + c.basePoints, 0);
    const mult = getCombinationMultiplier(uniqueRoles);
    return { uniqueRoles, baseSum, mult, combined: Math.round(baseSum * mult * 10) / 10 };
  }, [myContributions, joinedContributions, currentPlayer]);

  // ═════════════════════════════════════════════════════════════════
  // RESULTS STAGE
  // ═════════════════════════════════════════════════════════════════
  if (stage === 'results') {
    const sv = activeSeries.runningTotal;
    const thr = hiddenThreshold;
    const pct = thr > 0 ? Math.round((sv / thr) * 100) : 0;
    const tfLabel = sv >= thr * 2 ? 'Full' : sv >= thr * 1.5 ? 'Good' : sv >= thr ? 'Partial' : 'Insufficient';
    return (
      <div style={{ width: '100%', height: '100vh', background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontBody, color: T.onSurface }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: T.container, borderRadius: 16, padding: 40, maxWidth: 640, width: '90%', boxShadow: T.woodBevel }}>
          <h1 style={{ fontFamily: T.fontHeadline, color: T.primary, fontSize: 28, margin: '0 0 8px', textAlign: 'center' }}>Series Complete</h1>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontFamily: T.fontNumber, fontSize: 48, color: T.tertiary, fontWeight: 'bold' }}>{sv.toFixed(1)}</span>
            <span style={{ fontSize: 16, color: T.onSurfaceVariant, marginLeft: 8 }}>/ {thr} threshold ({pct}%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ background: T.containerHigh, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.onSurfaceVariant, textTransform: 'uppercase' as const }}>Chain Bonus</div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 20, color: T.tertiary }}>{activeSeries.chainBonus}</div>
            </div>
            <div style={{ background: T.containerHigh, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.onSurfaceVariant, textTransform: 'uppercase' as const }}>Transformation</div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 20, color: T.primary }}>{tfLabel}</div>
            </div>
            <div style={{ background: T.containerHigh, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.onSurfaceVariant, textTransform: 'uppercase' as const }}>Tasks</div>
              <div style={{ fontFamily: T.fontNumber, fontSize: 20, color: T.onSurface }}>{activeSeries.tasks.length}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: T.onSurfaceVariant, marginBottom: 8, fontWeight: 600 }}>Task Breakdown</div>
            {activeSeries.tasks.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.outlineVariant}` }}>
                <span style={{ fontSize: 16 }}>{TASK_ICONS[t.taskType] || ''}</span>
                <span style={{ flex: 1, fontSize: 12, color: T.onSurface }}>{t.title}</span>
                <span style={{ fontSize: 11, color: T.onSurfaceVariant }}>{t.placedBy.playerName}</span>
                <span style={{ fontFamily: T.fontNumber, fontSize: 13, color: TASK_COLORS[t.taskType] || T.onSurface, fontWeight: 'bold' }}>{t.finalTotal.toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: T.onSurfaceVariant, marginBottom: 8, fontWeight: 600 }}>Resource Utilization</div>
            {sorted.map(p => {
              const locked = lockedByPlayer[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
              const totalLocked = RES_TYPES.reduce((s, r) => s + locked[r], 0);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: ROLE_COLORS[p.roleId] || '#666', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{p.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 12, color: T.onSurface }}>{p.name}</span>
                  {RES_TYPES.map(r => (
                    <span key={r} style={{ fontSize: 10, color: locked[r] > 0 ? RESOURCE_COLORS[r] : T.outlineVariant }}>{locked[r]}</span>
                  ))}
                  <span style={{ fontSize: 11, color: T.onSurfaceVariant, fontWeight: 'bold' }}>={totalLocked}</span>
                </div>
              );
            })}
          </div>

          <button
            onClick={completeSeries}
            style={{ width: '100%', padding: '12px 24px', background: T.primary, color: T.surface, border: 'none', borderRadius: 8, fontFamily: T.fontHeadline, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            Continue to Scoring &rarr;
          </button>
        </motion.div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // BUILDING STAGE
  // ═════════════════════════════════════════════════════════════════
  const progressPct = hiddenThreshold > 0 ? Math.min(100, (activeSeries.runningTotal / hiddenThreshold) * 100) : 0;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: T.surface, fontFamily: T.fontBody, color: T.onSurface, overflow: 'hidden' }}>
      {/* ─── TOP HEADER ─── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 16, borderBottom: `1px solid ${T.outlineVariant}`, flexShrink: 0 }}>
        <h2 style={{ fontFamily: T.fontHeadline, color: T.primary, fontSize: 18, margin: 0, fontWeight: 700 }}>Phase 4: Build the Path</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {visionBoard.tiles.slice(0, 4).map((tile, i) => (
            <div key={i} style={{ background: T.containerHigh, borderRadius: 4, padding: '2px 8px', fontSize: 10, color: T.onSurfaceVariant }}>{tile.name}</div>
          ))}
          {visionBoard.tiles.length > 4 && <div style={{ fontSize: 10, color: T.onSurfaceVariant }}>+{visionBoard.tiles.length - 4}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: T.containerHigh, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.tertiary }}>
            {chainInfo}
          </div>
          {activeEffects.map((eff, i) => (
            <div key={i} style={{ background: eff.type === 'cost_increase' || eff.type === 'resource_freeze' ? 'rgba(200,60,60,0.2)' : 'rgba(174,212,86,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: eff.type === 'cost_increase' || eff.type === 'resource_freeze' ? '#e87' : T.primary }}>
              {eff.cardTitle} ({eff.turnsRemaining}t)
            </div>
          ))}
        </div>
      </div>

      {/* ─── MIDDLE ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ─── LEFT: Series Timeline ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
            <span style={{ fontFamily: T.fontHeadline, fontSize: 15, color: T.onSurface, fontWeight: 700 }}>{activeSeries.name}</span>
            <span style={{ fontSize: 12, color: T.onSurfaceVariant }}>{activeSeries.tasks.length} tasks</span>
            <span style={{ fontFamily: T.fontNumber, fontSize: 18, color: T.tertiary, fontWeight: 'bold' }}>{activeSeries.runningTotal.toFixed(1)} pts</span>
          </div>

          {/* Timeline scroll */}
          <div ref={timelineRef} style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 10, flex: 1, alignItems: 'flex-start' }}>
            {activeSeries.tasks.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ minWidth: 130, maxWidth: 140, background: T.container, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: T.woodBevel }}
              >
                <div style={{ height: 5, background: TASK_COLORS[t.taskType] || T.onSurface }} />
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase' as const, color: TASK_COLORS[t.taskType] || T.onSurface, letterSpacing: 0.8, marginBottom: 2 }}>
                    {TASK_ICONS[t.taskType] || ''} {t.taskType}
                  </div>
                  <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 11, color: T.onSurface, marginBottom: 6, lineHeight: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{t.title}</div>
                  {t.contributions.map((c, ci) => (
                    <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: (ROLE_COLORS as Record<string, string>)[c.playerRole] || '#666', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{c.playerName[0]}</div>
                      <span style={{ fontSize: 9, color: T.onSurfaceVariant }}>&times;{c.tokensCommitted}</span>
                      <span style={{ fontSize: 9, color: RESOURCE_COLORS[c.resourceType] || T.onSurfaceVariant }}>{c.basePoints.toFixed(1)}pts</span>
                    </div>
                  ))}
                  {t.uniqueRoles > 1 && (
                    <div style={{ fontSize: 9, color: T.primary, marginTop: 4, background: 'rgba(174,212,86,0.1)', borderRadius: 4, padding: '2px 4px' }}>
                      &times;{t.combinationMultiplier.toFixed(1)} ({t.uniqueRoles} roles)
                    </div>
                  )}
                  <div style={{ fontFamily: T.fontNumber, fontSize: 13, fontWeight: 'bold', color: TASK_COLORS[t.taskType] || T.onSurface, marginTop: 6, textAlign: 'right' as const }}>
                    {t.finalTotal.toFixed(1)}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add Task Card */}
            <div
              onClick={() => { if (currentPlayer) { sounds.playButtonClick(); setShowCreator(true); } }}
              style={{
                minWidth: 130, minHeight: 180, border: `2px dashed ${T.outlineVariant}`, borderRadius: 8, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', cursor: currentPlayer ? 'pointer' : 'default', flexShrink: 0,
                opacity: currentPlayer ? 0.8 : 0.3, transition: 'opacity 0.2s',
              }}
            >
              <div style={{ fontSize: 28, color: T.outlineVariant }}>+</div>
              <div style={{ fontSize: 11, color: T.outlineVariant }}>Add Task</div>
            </div>
          </div>

          {/* ─── Progress Bar ─── */}
          <div style={{ position: 'relative' as const, marginTop: 12 }}>
            {transformText && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', fontFamily: T.fontHeadline, fontSize: 14, color: T.tertiary, marginBottom: 6, textShadow: '0 0 12px rgba(233,195,73,0.5)' }}>
                {transformText}
              </motion.div>
            )}
            <div style={{ width: '100%', height: 14, background: T.container, borderRadius: 7, overflow: 'hidden', position: 'relative' as const }}>
              {/* Task-type segments */}
              {(() => {
                const total = activeSeries.runningTotal || 1;
                let offset = 0;
                const segs = activeSeries.tasks.map(t => {
                  const w = (t.finalTotal / total) * progressPct;
                  const seg = { left: offset, width: w, color: TASK_COLORS[t.taskType] || T.onSurface };
                  offset += w;
                  return seg;
                });
                if (activeSeries.chainBonus > 0) {
                  const w = (activeSeries.chainBonus / total) * progressPct;
                  segs.push({ left: offset, width: w, color: T.tertiary });
                }
                return segs.map((s, i) => (
                  <div key={i} style={{ position: 'absolute' as const, left: `${s.left}%`, width: `${s.width}%`, height: '100%', background: s.color, transition: 'width 0.5s, left 0.5s' }} />
                ));
              })()}
              <div style={{ position: 'absolute' as const, width: '100%', textAlign: 'center', lineHeight: '14px', fontSize: 10, fontFamily: T.fontNumber, color: T.surface, fontWeight: 'bold', zIndex: 1 }}>
                {activeSeries.runningTotal.toFixed(1)} pts
              </div>
            </div>
          </div>

          {/* Finish button */}
          {activeSeries.tasks.length >= 2 && (
            <div style={{ marginTop: 10, textAlign: 'right' as const }}>
              <button
                onClick={() => { sounds.playButtonClick(); setStage('results'); }}
                style={{ padding: '6px 18px', background: 'transparent', border: `1px solid ${T.tertiary}`, color: T.tertiary, borderRadius: 6, fontSize: 12, fontFamily: T.fontBody, cursor: 'pointer' }}
              >
                Finish Series &rarr;
              </button>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Task Creator Panel ─── */}
        <AnimatePresence>
          {showCreator && (
            <motion.div
              initial={{ x: 280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 280, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ width: 280, background: T.container, borderLeft: `1px solid ${T.outlineVariant}`, padding: 14, overflowY: 'auto' as const, flexShrink: 0 }}
            >
              <div style={{ fontSize: 13, fontFamily: T.fontHeadline, color: T.primary, marginBottom: 10, fontWeight: 700 }}>New Task</div>

              {/* Type grid 2x3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                {TASK_TYPES.map(tp => {
                  const isSelected = selectedType === tp;
                  const lastType = activeSeries.chainSequence[activeSeries.chainSequence.length - 1];
                  const seqIdx = ['assess', 'plan', 'design', 'build', 'maintain'].indexOf(tp);
                  const lastIdx = ['assess', 'plan', 'design', 'build', 'maintain'].indexOf(lastType);
                  const isChainNext = seqIdx === lastIdx + 1;
                  return (
                    <button
                      key={tp}
                      onClick={() => { sounds.playButtonClick(); setSelectedType(tp); }}
                      style={{
                        background: isSelected ? TASK_COLORS[tp] : T.containerHigh,
                        color: isSelected ? T.surface : TASK_COLORS[tp],
                        border: isChainNext && !isSelected ? `1px solid ${TASK_COLORS[tp]}` : '1px solid transparent',
                        borderRadius: 6, padding: '6px 4px', fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontFamily: T.fontBody,
                      }}
                    >
                      <span>{TASK_ICONS[tp]}</span>
                      <span style={{ textTransform: 'capitalize' as const }}>{tp}</span>
                      {isChainNext && <span style={{ fontSize: 8, marginLeft: 'auto' }}>{'\u{1F517}'}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Title</div>
                <input
                  value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title..."
                  style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 12, fontFamily: T.fontBody, boxSizing: 'border-box' as const }}
                />
                {selectedType && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 4 }}>
                    {(SUGGESTED_TASKS[selectedType] || []).slice(0, 3).map(s => (
                      <button key={s} onClick={() => setTaskTitle(s)} style={{ background: T.containerHigh, border: 'none', borderRadius: 10, padding: '2px 8px', fontSize: 9, color: T.onSurfaceVariant, cursor: 'pointer' }}>{s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Description</div>
                <textarea
                  value={taskDesc} onChange={e => setTaskDesc(e.target.value.slice(0, 300))} placeholder="What does this task accomplish?"
                  style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, resize: 'none' as const, height: 48, boxSizing: 'border-box' as const }}
                />
                <div style={{ fontSize: 9, color: T.outlineVariant, textAlign: 'right' as const }}>{taskDesc.length}/300</div>
              </div>

              {/* Cross-perspective */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>How does this help others?</div>
                <textarea
                  value={crossPerspective} onChange={e => setCrossPerspective(e.target.value)} placeholder="Cross-role perspective..."
                  style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, resize: 'none' as const, height: 36, boxSizing: 'border-box' as const }}
                />
              </div>

              {/* Success criteria */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Success Criteria</div>
                <input
                  value={taskCriteria} onChange={e => setTaskCriteria(e.target.value)} placeholder="How do we know it worked?"
                  style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, boxSizing: 'border-box' as const }}
                />
              </div>

              {/* Resource steppers */}
              <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' as const }}>Commit Resources</div>
              {RES_TYPES.map(r => {
                const avail = availableForCurrent[r];
                const abilityKey = RESOURCE_ABILITY_MAP[r];
                const abilityScore = (currentPlayer.abilities as unknown as Record<string, number>)[abilityKey] ?? 0;
                const eff = calculateEffectiveness(abilityScore);
                const pts = myContributions[r] > 0 ? calculateContributionPoints(currentPlayer, r, myContributions[r]).basePoints : 0;
                return (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: RESOURCE_COLORS[r] }} />
                    <span style={{ fontSize: 10, color: RESOURCE_COLORS[r], width: 58, textTransform: 'capitalize' as const }}>{r} <span style={{ color: T.outlineVariant }}>({avail})</span></span>
                    <span style={{ fontSize: 8, color: T.outlineVariant, width: 30, textAlign: 'right' as const }}>{eff}%</span>
                    <button onClick={() => adjustContribution(r, -1)} style={{ width: 20, height: 20, background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: '18px' }}>-</button>
                    <span style={{ fontFamily: T.fontNumber, fontSize: 13, color: T.onSurface, width: 16, textAlign: 'center' as const }}>{myContributions[r]}</span>
                    <button onClick={() => adjustContribution(r, 1)} style={{ width: 20, height: 20, background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: '18px' }}>+</button>
                    <span style={{ fontSize: 10, fontFamily: T.fontNumber, color: RESOURCE_COLORS[r], width: 36, textAlign: 'right' as const }}>{pts > 0 ? `${pts.toFixed(1)}` : '-'}</span>
                  </div>
                );
              })}
              <div style={{ textAlign: 'right' as const, fontFamily: T.fontNumber, fontSize: 14, color: T.primary, fontWeight: 'bold', margin: '6px 0 12px' }}>
                Total: {liveTotal.toFixed(1)} pts
              </div>

              {/* Action buttons */}
              {!collabOpen ? (
                <>
                  <button
                    onClick={openCollaboration}
                    disabled={!selectedType || !taskTitle.trim() || liveTotal === 0}
                    style={{
                      width: '100%', padding: '10px 0',
                      background: (!selectedType || !taskTitle.trim() || liveTotal === 0) ? T.outlineVariant : T.primary,
                      color: T.surface, border: 'none', borderRadius: 6, fontFamily: T.fontHeadline, fontSize: 13, fontWeight: 700,
                      cursor: (!selectedType || !taskTitle.trim() || liveTotal === 0) ? 'default' : 'pointer', marginBottom: 4,
                    }}
                  >
                    Open for Collaboration (30s)
                  </button>
                  <button
                    onClick={() => commitTask()}
                    disabled={!selectedType || !taskTitle.trim() || liveTotal === 0}
                    style={{
                      width: '100%', padding: '7px 0',
                      background: 'transparent', color: T.onSurfaceVariant,
                      border: `1px solid ${T.onSurfaceVariant}`, borderRadius: 6,
                      fontFamily: T.fontBody, fontSize: 11, cursor: (!selectedType || !taskTitle.trim() || liveTotal === 0) ? 'default' : 'pointer',
                      marginBottom: 4, opacity: (!selectedType || !taskTitle.trim() || liveTotal === 0) ? 0.3 : 1,
                    }}
                  >
                    Lock Solo ({'\u00D7'}1.0)
                  </button>
                  <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.outlineVariant, textAlign: 'center', marginBottom: 6 }}>
                    Solo tasks get no combination bonus
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { sounds.playButtonClick(); setShowCreator(false); }} style={{ flex: 1, padding: '6px 0', background: 'transparent', border: `1px solid ${T.outlineVariant}`, color: T.onSurfaceVariant, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: T.fontBody }}>Cancel</button>
                    <button onClick={passTurn} style={{ flex: 1, padding: '6px 0', background: 'transparent', border: `1px solid ${T.secondary}`, color: T.secondary, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: T.fontBody }}>Pass Turn</button>
                  </div>
                </>
              ) : (
                /* ─── Collaboration Window ─── */
                <div style={{ background: T.surface, borderRadius: 8, padding: 10, border: `1px solid ${T.tertiary}30` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontFamily: T.fontHeadline, fontSize: 12, color: T.tertiary }}>
                      Collaboration Window
                    </div>
                    <div style={{ fontFamily: T.fontNumber, fontSize: 22, fontWeight: 700, color: collabTimer <= 5 ? '#e55' : T.tertiary }}>
                      {collabTimer}s
                    </div>
                  </div>

                  {/* Live score preview */}
                  <div style={{
                    background: T.container, borderRadius: 6, padding: 8, marginBottom: 8,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: T.fontNumber, fontSize: 18, fontWeight: 700, color: T.onSurface }}>
                      {collabPreview.combined} pts
                    </div>
                    <div style={{
                      fontFamily: T.fontHeadline, fontSize: collabPreview.uniqueRoles >= 4 ? 16 : collabPreview.uniqueRoles >= 3 ? 14 : 12,
                      fontWeight: 700, marginTop: 2,
                      color: collabPreview.uniqueRoles >= 4 ? T.primary : collabPreview.uniqueRoles >= 3 ? T.primary : collabPreview.uniqueRoles >= 2 ? T.tertiary : T.onSurfaceVariant,
                      textShadow: collabPreview.uniqueRoles >= 4 ? `0 0 8px ${T.primary}40` : 'none',
                    }}>
                      {collabPreview.uniqueRoles} role{collabPreview.uniqueRoles !== 1 ? 's' : ''} {'\u00D7'}{collabPreview.mult}
                    </div>
                  </div>

                  {/* Other players join sections */}
                  <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant, marginBottom: 6 }}>
                    Pass device to other players to join:
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {sorted.filter(p => p.id !== currentPlayer?.id).map(p => {
                      const pJoined = joinedContributions.filter(c => c.playerId === p.id);
                      const hasJoined = pJoined.length > 0;
                      return (
                        <div key={p.id} style={{
                          background: hasJoined ? `${T.primary}10` : T.container, borderRadius: 6, padding: 8, marginBottom: 4,
                          border: hasJoined ? `1px solid ${T.primary}30` : `1px solid transparent`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', background: ROLE_COLORS[p.roleId],
                              fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}>{p.name[0]}</div>
                            <span style={{ fontFamily: T.fontBody, fontSize: 11, fontWeight: 700, color: T.onSurface }}>{p.name}</span>
                            <span style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant }}>{p.roleId}</span>
                            {hasJoined && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.primary }}>{'\u2713'} Joined</span>}
                          </div>
                          {!hasJoined && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {RES_TYPES.map(r => {
                                const avail = (resourcePools[p.id]?.[r] || 0) - (lockedByPlayer[p.id]?.[r] || 0);
                                if (avail <= 0) return null;
                                return (
                                  <button key={r} onClick={() => joinTask(p, r, 1)}
                                    style={{
                                      padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                                      background: RESOURCE_COLORS[r] + '20', color: RESOURCE_COLORS[r],
                                      fontFamily: T.fontBody, fontSize: 9, fontWeight: 600,
                                    }}
                                  >
                                    +1 {r.slice(0, 3).toUpperCase()} ({avail})
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {hasJoined && (
                            <div style={{ fontFamily: T.fontNumber, fontSize: 9, color: T.primary }}>
                              {pJoined.map(c => `${c.resourceType.slice(0, 3).toUpperCase()}:${c.tokensCommitted}`).join(' ')} = {pJoined.reduce((s, c) => s + c.basePoints, 0).toFixed(1)} pts
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lock Now button */}
                  <button
                    onClick={lockCollabTask}
                    style={{
                      width: '100%', padding: '8px 0', marginTop: 8,
                      background: T.primary, color: T.surface, border: 'none', borderRadius: 6,
                      fontFamily: T.fontHeadline, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Lock Task ({collabPreview.uniqueRoles} contributor{collabPreview.uniqueRoles !== 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── BOTTOM: Player Panel ─── */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px', borderTop: `1px solid ${T.outlineVariant}`, flexShrink: 0, overflowX: 'auto' as const }}>
        {sorted.map((p, idx) => {
          const isCurrentTurn = idx === currentPlayerIdx;
          const pool = resourcePools[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
          const locked = lockedByPlayer[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 };
          const exhausted = !canPlayerAct(p, locked);
          const caps = getPlayerCapabilities(p.roleId);
          const usedCaps = capabilitiesUsed[p.id] || [];
          return (
            <div
              key={p.id}
              style={{
                flex: '1 0 0', minWidth: 140, background: T.container, borderRadius: 8, padding: '8px 10px',
                border: isCurrentTurn ? `2px solid ${T.primary}` : `1px solid ${T.outlineVariant}`,
                opacity: exhausted ? 0.4 : 1, boxShadow: isCurrentTurn ? '0 0 12px rgba(174,212,86,0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[p.roleId] || '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{p.name[0]}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.onSurface }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'capitalize' as const }}>{p.roleId}</div>
                </div>
              </div>

              {/* Resource dots */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                {RES_TYPES.map(r => {
                  const total = pool[r] || 0;
                  const used = locked[r] || 0;
                  const avail = Math.max(0, total - used);
                  const dots: React.ReactNode[] = [];
                  for (let i = 0; i < avail; i++) dots.push(<div key={`a${r}${i}`} style={{ width: 6, height: 6, borderRadius: '50%', background: RESOURCE_COLORS[r] }} />);
                  for (let i = 0; i < used; i++) dots.push(<div key={`l${r}${i}`} style={{ width: 6, height: 6, borderRadius: '50%', border: `1px solid ${RESOURCE_COLORS[r]}`, boxSizing: 'border-box' as const }} />);
                  return <React.Fragment key={r}>{dots}</React.Fragment>;
                })}
              </div>

              {/* Capabilities */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {caps.map(cap => {
                  const used = usedCaps.includes(cap.id);
                  return (
                    <div key={cap.id} title={cap.name} style={{ fontSize: 12, opacity: used ? 0.3 : 1, filter: used ? 'grayscale(1)' : 'none' }}>
                      {cap.icon === 'verified' ? '\u2713' : cap.icon === 'speed' ? '\u26A1' : cap.icon === 'storefront' ? '\u{1F3EA}' : cap.icon === 'savings' ? '\u{1F4B0}' : cap.icon === 'architecture' ? '\u{1F4D0}' : cap.icon === 'explore' ? '\u{1F9ED}' : cap.icon === 'thumb_up' ? '\u{1F44D}' : cap.icon === 'groups' ? '\u{1F465}' : cap.icon === 'newspaper' ? '\u{1F4F0}' : cap.icon === 'megaphone' ? '\u{1F4E3}' : '\u2B50'}
                    </div>
                  );
                })}
              </div>

              {/* Status */}
              {isCurrentTurn && !exhausted && (
                <div style={{ fontSize: 9, color: T.primary, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>YOUR TURN</div>
              )}
              {exhausted && (
                <div style={{ fontSize: 9, color: T.outlineVariant, fontWeight: 700, textTransform: 'uppercase' as const }}>Exhausted</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Reaction Card Popup ─── */}
      <AnimatePresence>
        {currentReaction && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            style={{
              position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100,
              background: currentReaction.isPositive ? 'rgba(174,212,86,0.95)' : 'rgba(200,80,80,0.95)',
              color: T.surface, borderRadius: 16, padding: '24px 32px', textAlign: 'center' as const, maxWidth: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{currentReaction.icon}</div>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{currentReaction.title}</div>
            <div style={{ fontSize: 13, lineHeight: '18px', marginBottom: 8 }}>{currentReaction.description}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{currentReaction.effect.type.replace(/_/g, ' ')} &middot; {currentReaction.effect.duration.replace(/_/g, ' ')}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulseGold { 0%,100% { box-shadow: 0 0 0 rgba(233,195,73,0); } 50% { box-shadow: 0 0 20px rgba(233,195,73,0.4); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
