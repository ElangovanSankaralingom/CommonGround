import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import {
  type FeatureTile, type PlacemakingLayer,
  calculateEffectiveness, RESOURCE_ABILITY_MAP, STARTING_TOKENS,
  detectLayers, calculateLayerCoverage, generateLayeredVision,
  LAYER_COLORS, LAYER_ICONS, LAYER_LABELS, LAYER_SUBTITLES,
} from '../../core/content/featureTiles';
import {
  type TaskCard, type Series, type TaskCategory, type TaskContribution,
  createSeries, placeTask, calculateChainBonus, calculateContributionPoints,
  getAvailableResources, canPlayerAct, getCombinationMultiplier,
} from '../../core/engine/seriesEngine';
import { getPlayerCapabilities, activateCapability, type Capability } from '../../core/engine/capabilityEngine';
import { drawReactionCard, tickReactionEffects, type ReactionCard, type ReactionEffect } from '../../core/engine/reactionCards';
import { sounds } from '../../utils/sounds';
import { generateTaskCards, getCrossPerspectiveBenefits, type TaskCard as GenTaskCard, type GeneratedCards } from '../../core/content/taskCardGenerator';

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

  // Expandable task cards
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // 4-stage task creation flow: filling → collaboration → summary → (lock)
  type TaskStage = 'filling' | 'collaboration' | 'summary';
  const [taskStage, setTaskStage] = useState<TaskStage>('filling');
  const [collabPlayerIdx, setCollabPlayerIdx] = useState(0);
  const [joinedContributions, setJoinedContributions] = useState<TaskContribution[]>([]);
  const [collabJoinerContrib, setCollabJoinerContrib] = useState<Record<ResourceType, number>>({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
  const [collabDecisions, setCollabDecisions] = useState<Record<string, 'joined' | 'skipped'>>({});
  const [resourceRequests, setResourceRequests] = useState<{ targetId: string; resource: ResourceType; amount: number }[]>([]);
  const [showRequestBuilder, setShowRequestBuilder] = useState(false);
  const [reqResource, setReqResource] = useState<ResourceType>('budget');
  const [reqAmount, setReqAmount] = useState(1);
  const [reqTargetIdx, setReqTargetIdx] = useState(0);

  // Card-based task creation (state only — generation happens after zoneId is declared)
  const [selectedActionCard, setSelectedActionCard] = useState<GenTaskCard | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<GenTaskCard[]>([]);
  const [selectedWho, setSelectedWho] = useState<GenTaskCard | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<GenTaskCard | null>(null);
  const [localInsight, setLocalInsight] = useState('');
  const [localInsightSaved, setLocalInsightSaved] = useState(false);
  const [selectedBenefits, setSelectedBenefits] = useState<{ role: string; text: string }[]>([]);
  const [showCustomCross, setShowCustomCross] = useState(false);
  const [customCrossText, setCustomCrossText] = useState('');

  // Round tracking + multi-series
  const [currentRound, setCurrentRound] = useState(1);
  const [tasksThisRound, setTasksThisRound] = useState(0);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [activeSeriesIdx, setActiveSeriesIdx] = useState(0);
  const MAX_ROUNDS = 4;

  // Initialize allSeries from activeSeries
  useEffect(() => {
    if (allSeries.length === 0) setAllSeries([activeSeries]);
  }, []);

  const hiddenThreshold = useMemo(() => {
    // Scale threshold by feature count collaboration expectation
    const featureCount = visionBoard.tiles.length;
    const collabExpectation = featureCount >= 6 ? 2.8 : featureCount >= 5 ? 2.5 : featureCount >= 4 ? 2.2 : 2.0;
    const base = visionBoard.threshold;
    const adjusted = Math.round(base * collabExpectation);
    console.log(`THRESHOLD_ADJUSTED: base=${base} × collabExpectation=${collabExpectation} (${featureCount} features) = ${adjusted}`);
    return adjusted;
  }, [visionBoard.threshold, visionBoard.tiles.length]);
  const currentPlayer = sorted[currentPlayerIdx];
  const zoneId = useMemo(() => {
    const map: Record<string, string> = { boating_pond: 'z3', main_entrance: 'z1', fountain_plaza: 'z2', herbal_garden: 'z4', walking_track: 'z5', playground: 'z6', ppp_zone: 'z13' };
    return map[challenge?.affectedZoneIds?.[0] || 'boating_pond'] || 'z3';
  }, [challenge]);

  // ─── Chain info (recalculates whenever series tasks change) ───
  const chainResult = useMemo(() => {
    const seq = activeSeries.tasks.filter(t => t.taskType !== 'innovate').map(t => t.taskType.toLowerCase());
    return calculateChainBonus(seq);
  }, [activeSeries.tasks.length, activeSeries]);

  const chainInfo = useMemo(() => {
    const { chainLength, bonus } = chainResult;
    const SEQUENCE = ['assess', 'plan', 'design', 'build', 'maintain'];
    if (chainLength === 0) return 'No chain yet';
    const found = SEQUENCE.slice(0, chainLength);
    if (chainLength >= 5) return '\u2728 Full Chain! (+18)';
    const display = found.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' \u2192 ');
    return `\u{1F517} ${display}${bonus > 0 ? ` (+${bonus})` : ''}`;
  }, [chainResult]);

  // ─── Card-based task generation ───
  const generatedCards = useMemo((): GeneratedCards | null => {
    if (!selectedType || selectedType === 'innovate' || !currentPlayer) return null;
    const featureNames = visionBoard.tiles.map(t => t.name);
    const zn = challenge?.affectedZoneIds?.[0]?.replace(/_/g, ' ') || 'the zone';
    const cluesFound: string[] = [];
    console.log('CARD_GENERATION_INPUT:', { zoneId, zoneName: zn, selectedFeatures: featureNames, cluesFound, taskType: selectedType, playerRole: currentPlayer.roleId });
    return generateTaskCards(zoneId, zn, featureNames, selectedType, currentPlayer.roleId, cluesFound);
  }, [selectedType, currentPlayer, visionBoard.tiles, zoneId, challenge]);

  const autoDescription = useMemo(() => {
    const parts: string[] = [];
    if (selectedActionCard) parts.push(selectedActionCard.text);
    if (selectedMethods.length > 0) parts.push(selectedMethods.map(m => m.text).join('. '));
    if (selectedWho) parts.push(selectedWho.text);
    if (selectedOutcome) parts.push('Outcome: ' + selectedOutcome.text);
    if (localInsightSaved && localInsight.trim()) parts.push('Local insight: ' + localInsight.trim());
    return parts.join('. ');
  }, [selectedActionCard, selectedMethods, selectedWho, selectedOutcome, localInsightSaved, localInsight]);

  // Auto-generated cross-perspective from benefit selections
  const autoCrossPerspective = useMemo(() => {
    const parts = selectedBenefits.map(b => `${b.text} for the ${b.role}`);
    if (customCrossText.trim()) parts.push(customCrossText.trim());
    return parts.join('. ');
  }, [selectedBenefits, customCrossText]);

  useEffect(() => {
    if (selectedActionCard) { setTaskTitle(selectedActionCard.text); setTaskDesc(autoDescription); }
  }, [selectedActionCard, autoDescription]);

  useEffect(() => {
    if (autoCrossPerspective) setCrossPerspective(autoCrossPerspective);
  }, [autoCrossPerspective]);

  useEffect(() => {
    setSelectedActionCard(null); setSelectedMethods([]); setSelectedWho(null); setSelectedOutcome(null);
    setLocalInsight(''); setLocalInsightSaved(false); setSelectedBenefits([]); setCustomCrossText(''); setShowCustomCross(false);
  }, [selectedType]);

  // Specificity check for local insight
  const insightSpecificity = useMemo(() => {
    if (!localInsight.trim()) return { isSpecific: false, indicators: [] as string[] };
    const text = localInsight;
    const indicators: string[] = [];
    if (/\d+/.test(text)) indicators.push('number');
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) { if (words[i] && /^[A-Z]/.test(words[i]) && words[i].length > 1) { indicators.push('proper_noun'); break; } }
    if (['house', 'street', 'road', 'gate', 'corner', 'near', 'opposite', 'behind', 'junction', 'block', 'ward', 'lane', 'nagar', 'colony'].some(w => text.toLowerCase().includes(w))) indicators.push('location');
    if (['mr', 'mrs', 'ms', 'uncle', 'aunty', 'teacher', 'gardener', 'watchman', 'vendor', 'officer', 'engineer'].some(w => text.toLowerCase().includes(w))) indicators.push('person');
    return { isSpecific: indicators.length >= 2, indicators };
  }, [localInsight]);

  // Cross-perspective benefits for other roles
  const crossBenefits = useMemo(() => {
    if (!currentPlayer) return {};
    return getCrossPerspectiveBenefits(currentPlayer.roleId);
  }, [currentPlayer]);

  // ─── Layer coverage for series ───
  const layerCoverage = useMemo(() => {
    const tasks = activeSeries.tasks.map(t => ({ title: t.title, description: t.description }));
    return calculateLayerCoverage(tasks);
  }, [activeSeries.tasks.length, activeSeries]);

  // ─── Layered vision statement ───
  const layeredVision = useMemo(() => {
    const zoneName = challenge?.affectedZoneIds?.[0]?.replace(/_/g, ' ') || 'the zone';
    // Convert FeatureTile[] to VisionFeatureTile-like for generation
    return generateLayeredVision(visionBoard.tiles.map(t => ({
      ...t, resourceCost: { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 },
      objectivesServed: { safety: 0, greenery: 0, access: 0, culture: 0, revenue: 0, community: 0 },
      compatibleZones: [], hybridsWith: [], layer: 'foundation' as PlacemakingLayer,
    })), zoneName);
  }, [visionBoard.tiles, challenge]);

  // ─── Live layer detection for task form ───
  const formLayerDetection = useMemo(() => {
    return detectLayers(taskTitle, taskDesc);
  }, [taskTitle, taskDesc]);

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
    // Deep copy to ensure React detects the change in nested arrays
    setActiveSeries({
      ...activeSeries,
      tasks: [...activeSeries.tasks],
      chainSequence: [...activeSeries.chainSequence],
      supporters: [...activeSeries.supporters],
    });

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

    // Track round completion
    const newTaskCount = tasksThisRound + 1;
    setTasksThisRound(newTaskCount);
    const activePlayers = sorted.filter(p => canPlayerAct(p, lockedByPlayer[p.id] || { budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 })).length;

    if (newTaskCount >= Math.min(sorted.length, activePlayers) && newTaskCount >= 2) {
      // Round complete — show summary
      console.log(`ROUND_COMPLETE: round=${currentRound} tasks=${newTaskCount} seriesTotal=${activeSeries.runningTotal}`);
      if (currentRound >= MAX_ROUNDS) {
        setStage('results'); // Auto-end after max rounds
      } else {
        setShowRoundSummary(true);
      }
      return;
    }

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

  // ─── Round Summary Handlers ───
  const continueBuilding = useCallback(() => {
    sounds.playButtonClick();
    setShowRoundSummary(false);
    setCurrentRound(prev => prev + 1);
    setTasksThisRound(0);
    setCurrentPlayerIdx(0);
    console.log('CONTINUE_BUILDING: starting round', currentRound + 1);
  }, [currentRound]);

  const startNewSeries = useCallback(() => {
    sounds.playButtonClick();
    const newSeries = createSeries(`Series ${String.fromCharCode(65 + allSeries.length)}`);
    setAllSeries(prev => [...prev, newSeries]);
    setActiveSeries(newSeries);
    setActiveSeriesIdx(allSeries.length);
    setShowRoundSummary(false);
    setCurrentRound(prev => prev + 1);
    setTasksThisRound(0);
    setCurrentPlayerIdx(0);
    console.log('SERIES_CREATED:', newSeries.name);
  }, [allSeries]);

  const [finishVoteOpen, setFinishVoteOpen] = useState(false);
  const [finishVotes, setFinishVotes] = useState<Record<string, boolean>>({});

  const proposeFinish = useCallback(() => {
    sounds.playButtonClick();
    setFinishVoteOpen(true);
    setFinishVotes({});
  }, []);

  const castFinishVote = useCallback((playerId: string, vote: boolean) => {
    setFinishVotes(prev => {
      const next = { ...prev, [playerId]: vote };
      const yesCount = Object.values(next).filter(Boolean).length;
      if (yesCount >= 3) {
        console.log('FINISH_VOTE_PASSED: moving to results');
        setTimeout(() => { setFinishVoteOpen(false); setShowRoundSummary(false); setStage('results'); }, 500);
      } else if (Object.keys(next).length >= sorted.length) {
        console.log('FINISH_VOTE_FAILED: not enough votes');
        setTimeout(() => setFinishVoteOpen(false), 1500);
      }
      return next;
    });
  }, [sorted]);

  // ─── 4-Stage Task Flow ───
  const otherPlayers = useMemo(() => sorted.filter(p => p.id !== currentPlayer?.id), [sorted, currentPlayer]);

  // Stage 1 → Stage 2: "This is My Move" opens collaboration
  const submitMyMove = useCallback(() => {
    sounds.playButtonClick();
    setTaskStage('collaboration');
    setCollabPlayerIdx(0);
    setJoinedContributions([]);
    setCollabDecisions({});
    setCollabJoinerContrib({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
    console.log('THIS_IS_MY_MOVE:', taskTitle, 'requests:', resourceRequests.length);
  }, [taskTitle, resourceRequests]);

  // Stage 2: player joins during carousel
  const collabJoinerJoin = useCallback(() => {
    const joiner = otherPlayers[collabPlayerIdx];
    if (!joiner) return;
    sounds.playButtonClick();
    const newContribs: TaskContribution[] = [];
    RES_TYPES.forEach(r => {
      if (collabJoinerContrib[r] > 0) {
        const avail = (resourcePools[joiner.id]?.[r] || 0) - (lockedByPlayer[joiner.id]?.[r] || 0);
        const actual = Math.min(collabJoinerContrib[r], avail);
        if (actual > 0) {
          const { effectiveness, basePoints } = calculateContributionPoints(joiner, r, actual);
          newContribs.push({ playerId: joiner.id, playerName: joiner.name, playerRole: joiner.roleId, resourceType: r, tokensCommitted: actual, effectiveness, basePoints, justification: '' });
        }
      }
    });
    setJoinedContributions(prev => [...prev, ...newContribs]);
    setCollabDecisions(prev => ({ ...prev, [joiner.id]: 'joined' }));
    console.log(`COLLAB_JOIN: ${joiner.name} joins with`, newContribs.map(c => `${c.tokensCommitted} ${c.resourceType}`).join(', '));
    if (collabPlayerIdx < otherPlayers.length - 1) {
      setCollabPlayerIdx(prev => prev + 1);
      setCollabJoinerContrib({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
    } else {
      setTaskStage('summary');
    }
  }, [otherPlayers, collabPlayerIdx, collabJoinerContrib, resourcePools, lockedByPlayer]);

  const collabJoinerSkip = useCallback(() => {
    const joiner = otherPlayers[collabPlayerIdx];
    if (!joiner) return;
    sounds.playButtonClick();
    setCollabDecisions(prev => ({ ...prev, [joiner.id]: 'skipped' }));
    console.log(`COLLAB_SKIP: ${joiner.name} passed`);
    if (collabPlayerIdx < otherPlayers.length - 1) {
      setCollabPlayerIdx(prev => prev + 1);
      setCollabJoinerContrib({ budget: 0, knowledge: 0, volunteer: 0, material: 0, influence: 0 });
    } else {
      setTaskStage('summary');
    }
  }, [otherPlayers, collabPlayerIdx]);

  // Stage 3 → Stage 4: Lock from summary
  const lockFromSummary = useCallback(() => {
    commitTask(joinedContributions);
    setJoinedContributions([]);
    setResourceRequests([]);
    setTaskStage('filling');
    setShowRequestBuilder(false);
  }, [commitTask, joinedContributions]);

  // Cancel: discard everything
  const cancelTask = useCallback(() => {
    setTaskStage('filling');
    setJoinedContributions([]);
    setCollabDecisions({});
    setResourceRequests([]);
    setShowCreator(false);
    setShowRequestBuilder(false);
  }, []);

  // Skip collaboration — place solo directly
  const placeSolo = useCallback(() => {
    sounds.playButtonClick();
    console.log('SOLO_TASK:', taskTitle, 'by', currentPlayer?.name);
    commitTask();
  }, [commitTask, taskTitle, currentPlayer]);

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
      {/* ─── TOP: Vision Banner + Chain ─── */}
      <div style={{ borderBottom: `1px solid ${T.outlineVariant}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 12 }}>
          <h2 style={{ fontFamily: T.fontHeadline, color: T.primary, fontSize: 16, margin: 0, fontWeight: 700 }}>Phase 4: Build the Path</h2>
          <span style={{ fontFamily: T.fontBody, fontSize: 10, color: T.onSurfaceVariant, background: T.containerHigh, borderRadius: 4, padding: '2px 8px' }}>Round {currentRound}/{MAX_ROUNDS}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              background: T.containerHigh, borderRadius: 6, padding: '4px 10px', fontSize: 11,
              color: chainResult.chainLength >= 5 ? T.tertiary : T.onSurfaceVariant,
              textShadow: chainResult.chainLength >= 5 ? `0 0 8px ${T.tertiary}` : 'none',
              fontWeight: chainResult.bonus > 0 ? 700 : 400,
            }}>
              {chainInfo}
            </div>
            {activeEffects.map((eff, i) => (
              <div key={i} style={{ background: eff.type === 'cost_increase' || eff.type === 'resource_freeze' ? 'rgba(200,60,60,0.2)' : 'rgba(174,212,86,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: eff.type === 'cost_increase' || eff.type === 'resource_freeze' ? '#e87' : T.primary }}>
                {eff.cardTitle} ({eff.turnsRemaining}t)
              </div>
            ))}
          </div>
        </div>
        {/* Layered vision statement + three-layer display */}
        <div style={{ padding: '8px 20px', background: '#1e1b14', borderLeft: `4px solid ${T.primary}`, marginLeft: 16, marginRight: 16, marginBottom: 8, borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 3 }}>INTEGRATED VISION</div>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurface, fontWeight: 500, lineHeight: '16px', marginBottom: 8 }}>
            {layeredVision.statement}
          </div>
          {/* Three-layer boxes */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['foundation', 'activation', 'sustainability'] as PlacemakingLayer[]).map((layer, i) => {
              const features = visionBoard.tiles.filter((_, idx) => {
                // Approximate: check feature name against layer keywords
                const d = detectLayers(visionBoard.tiles[idx]?.name || '', visionBoard.tiles[idx]?.description || '');
                return d[layer];
              });
              const hasFeatures = layeredVision.layers[layer].length > 0 || features.length > 0;
              return (
                <React.Fragment key={layer}>
                  {i > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <span style={{ fontSize: 8, color: T.outlineVariant }}>{i === 1 ? 'enables' : 'sustained by'}</span>
                      <span style={{ fontSize: 10, color: T.outlineVariant }}>{'\u2192'}</span>
                    </div>
                  )}
                  <div style={{
                    flex: 1, background: `${LAYER_COLORS[layer]}10`, border: `1px solid ${LAYER_COLORS[layer]}20`,
                    borderRadius: 6, padding: '6px 8px', opacity: hasFeatures ? 1 : 0.3, minWidth: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 10 }}>{LAYER_ICONS[layer]}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: LAYER_COLORS[layer], textTransform: 'uppercase' as const }}>{LAYER_LABELS[layer]}</span>
                    </div>
                    {hasFeatures ? (
                      <div style={{ fontSize: 9, color: T.onSurfaceVariant, lineHeight: '12px' }}>
                        {layeredVision.layers[layer].slice(0, 2).join(', ') || features.map(f => f.name).slice(0, 2).join(', ')}
                      </div>
                    ) : (
                      <div style={{ fontSize: 8, color: T.onSurfaceVariant }}>{'\u26A0'} Not addressed</div>
                    )}
                    <div style={{ fontSize: 7, color: T.onSurfaceVariant, opacity: 0.5, fontStyle: 'italic', marginTop: 2 }}>{LAYER_SUBTITLES[layer]}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MIDDLE ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ─── LEFT: Series Timeline ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden' }}>
          {/* Series tabs (when multiple series) */}
          {allSeries.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {allSeries.map((s, i) => (
                <button key={s.id} onClick={() => { setActiveSeries(s); setActiveSeriesIdx(i); }}
                  style={{
                    padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: i === activeSeriesIdx ? T.containerHigh : 'transparent',
                    borderBottom: i === activeSeriesIdx ? `2px solid ${T.primary}` : `2px solid transparent`,
                    fontFamily: T.fontBody, fontSize: 10, fontWeight: i === activeSeriesIdx ? 700 : 400,
                    color: i === activeSeriesIdx ? T.primary : T.onSurfaceVariant,
                  }}>
                  {s.name} ({s.tasks.length} tasks · {s.runningTotal.toFixed(1)} pts)
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{ fontFamily: T.fontHeadline, fontSize: 15, color: T.onSurface, fontWeight: 700 }}>{activeSeries.name}</span>
            <span style={{ fontSize: 12, color: T.onSurfaceVariant }}>{activeSeries.tasks.length} tasks</span>
            <span style={{ fontFamily: T.fontNumber, fontSize: 18, color: T.tertiary, fontWeight: 'bold' }}>{activeSeries.runningTotal.toFixed(1)} pts</span>
          </div>
          {/* Layer coverage bars */}
          {activeSeries.tasks.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {(['foundation', 'activation', 'sustainability'] as PlacemakingLayer[]).map(layer => {
                const cov = layerCoverage[layer];
                const warn = cov.percent < 30 && activeSeries.tasks.length >= 2;
                return (
                  <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <span style={{ fontSize: 9 }}>{LAYER_ICONS[layer]}</span>
                    <div style={{ flex: 1, height: 4, background: T.surface, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${cov.percent}%`, height: '100%', background: LAYER_COLORS[layer], borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 8, color: LAYER_COLORS[layer] }}>{cov.percent}%</span>
                    {warn && <span style={{ fontSize: 8 }}>{'\u26A0'}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline scroll */}
          <div ref={timelineRef} style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 10, flex: 1, alignItems: 'flex-start' }}>
            {activeSeries.tasks.map((t, i) => {
              const isExpanded = expandedTaskId === t.id;
              return (
                <motion.div
                  key={t.id}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1, width: isExpanded ? 280 : 140 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                  style={{ minWidth: isExpanded ? 280 : 130, maxWidth: isExpanded ? 300 : 140, background: isExpanded ? '#1e1b14' : T.container, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: isExpanded ? '0 6px 20px rgba(22,19,12,0.6)' : T.woodBevel, cursor: 'pointer', transition: 'box-shadow 0.3s' }}
                >
                  <div style={{ height: 5, background: TASK_COLORS[t.taskType] || T.onSurface }} />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase' as const, color: TASK_COLORS[t.taskType] || T.onSurface, letterSpacing: 0.8, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{TASK_ICONS[t.taskType] || ''} {t.taskType}</span>
                      {isExpanded && <span style={{ fontSize: 12, color: T.onSurfaceVariant, cursor: 'pointer' }}>{'\u00D7'}</span>}
                    </div>
                    <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 11, color: T.onSurface, marginBottom: 6, lineHeight: '14px', overflow: isExpanded ? 'visible' : 'hidden', textOverflow: isExpanded ? 'unset' : 'ellipsis', whiteSpace: isExpanded ? 'normal' as const : 'nowrap' as const }}>{t.title}</div>

                    {/* Expanded: full details */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 6, marginBottom: 6 }}>
                        {t.description && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 }}>How will this be done?</div>
                            <div style={{ fontSize: 10, color: T.onSurface, lineHeight: '14px' }}>{t.description}</div>
                          </div>
                        )}
                        {t.crossPerspectives.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 }}>How does this help others?</div>
                            <div style={{ fontSize: 10, color: T.primary, fontStyle: 'italic', lineHeight: '14px' }}>{t.crossPerspectives.map(cp => cp.text).join(' | ')}</div>
                          </div>
                        )}
                        {t.successCriteria && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 }}>Success criteria</div>
                            <div style={{ fontSize: 10, color: T.onSurface, lineHeight: '14px' }}>{t.successCriteria}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contributors */}
                    {t.contributions.map((c, ci) => (
                      <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: (ROLE_COLORS as Record<string, string>)[c.playerRole] || '#666', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{c.playerName[0]}</div>
                        {isExpanded ? (
                          <span style={{ fontSize: 9, color: T.onSurfaceVariant }}>{c.playerName} ({c.playerRole}) {c.resourceType.slice(0, 3).toUpperCase()} {'\u00D7'}{c.tokensCommitted} ({c.effectiveness}%) = {c.basePoints.toFixed(1)} pts</span>
                        ) : (
                          <>
                            <span style={{ fontSize: 9, color: T.onSurfaceVariant }}>{'\u00D7'}{c.tokensCommitted}</span>
                            <span style={{ fontSize: 9, color: RESOURCE_COLORS[c.resourceType] || T.onSurfaceVariant }}>{c.basePoints.toFixed(1)}pts</span>
                          </>
                        )}
                      </div>
                    ))}
                    {t.uniqueRoles > 1 && (
                      <div style={{ fontSize: 9, color: T.primary, marginTop: 4, background: 'rgba(174,212,86,0.1)', borderRadius: 4, padding: '2px 4px' }}>
                        {'\u00D7'}{t.combinationMultiplier.toFixed(1)} ({t.uniqueRoles} roles)
                      </div>
                    )}

                    {/* Expanded: points breakdown */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${T.outlineVariant}`, paddingTop: 4, marginTop: 6, fontSize: 9, color: T.onSurfaceVariant }}>
                        <div>Base: {t.baseTotal.toFixed(1)} {'\u00D7'} {t.combinationMultiplier.toFixed(1)} = {(t.baseTotal * t.combinationMultiplier).toFixed(1)}</div>
                        {t.crossPerspectiveBonus > 0 && <div>+ Cross-perspective: +{t.crossPerspectiveBonus.toFixed(1)}</div>}
                        {t.capabilityBonus > 0 && <div>+ Capabilities: +{t.capabilityBonus.toFixed(1)}</div>}
                        {t.dependencyBonus > 0 && <div>+ Dependencies: +{t.dependencyBonus.toFixed(1)}</div>}
                        {t.innovationMultiplier > 1 && <div>{'\u00D7'} Innovation: {'\u00D7'}{t.innovationMultiplier}</div>}
                      </div>
                    )}

                    {/* Layer badges on expanded card */}
                    {isExpanded && (() => {
                      const taskLayers = detectLayers(t.title, t.description);
                      return (
                        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                          {(['foundation', 'activation', 'sustainability'] as PlacemakingLayer[]).map(l => (
                            <div key={l} style={{
                              display: 'flex', alignItems: 'center', gap: 2, padding: '1px 5px', borderRadius: 8,
                              background: taskLayers[l] ? `${LAYER_COLORS[l]}15` : 'transparent',
                              opacity: taskLayers[l] ? 1 : 0.2,
                            }}>
                              <span style={{ fontSize: 7 }}>{LAYER_ICONS[l]}</span>
                              <span style={{ fontSize: 7, color: taskLayers[l] ? LAYER_COLORS[l] : T.outlineVariant }}>{LAYER_LABELS[l]}</span>
                              {taskLayers[l] ? <span style={{ fontSize: 7, color: LAYER_COLORS[l] }}>{'\u2713'}</span> : <span style={{ fontSize: 7, color: T.outlineVariant }}>{'\u2717'}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div style={{ fontFamily: T.fontNumber, fontSize: 13, fontWeight: 'bold', color: TASK_COLORS[t.taskType] || T.onSurface, marginTop: 6, textAlign: 'right' as const }}>
                      {t.finalTotal.toFixed(1)}
                    </div>
                  </div>
                </motion.div>
              );
            })}

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

              {/* ═══ CARD-BASED TASK CREATION (for non-INNOVATE types) ═══ */}
              {selectedType && selectedType !== 'innovate' && generatedCards ? (
                <div>
                  {/* ROW 1: ACTION — What do you do? */}
                  <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>What do you do?</div>
                  {generatedCards.actionCards.map(card => {
                    const isSel = selectedActionCard?.id === card.id;
                    return (
                      <div key={card.id} onClick={() => setSelectedActionCard(isSel ? null : card)}
                        style={{
                          background: isSel ? `${T.primary}08` : T.container, border: isSel ? `2px solid ${T.primary}` : `1px solid ${T.outlineVariant}20`,
                          borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative',
                        }}>
                        <div style={{ fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.onSurface, paddingRight: card.featureRef ? 80 : 0 }}>{card.text}</div>
                        {card.featureRef && (
                          <span style={{ position: 'absolute', top: 8, right: 8, background: `${T.primary}15`, border: `1px solid ${T.primary}30`, borderRadius: 10, padding: '1px 7px', fontSize: 8, color: T.primary }}>{card.featureRef}</span>
                        )}
                        {isSel && <span style={{ position: 'absolute', right: 10, bottom: 8, color: T.primary, fontSize: 14 }}>{'\u2713'}</span>}
                      </div>
                    );
                  })}

                  {/* ROW 2: METHOD — How will it be done? */}
                  {selectedActionCard && generatedCards.methodCards[selectedActionCard.id] && (
                    <div style={{ marginTop: 10, opacity: 1, transition: 'opacity 0.3s' }}>
                      <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>How will it be done?</div>
                      {generatedCards.methodCards[selectedActionCard.id].map(card => {
                        const isSel = selectedMethods.some(m => m.id === card.id);
                        const isClue = !!card.clueRef;
                        return (
                          <div key={card.id} onClick={() => {
                            setSelectedMethods(prev => isSel ? prev.filter(m => m.id !== card.id) : prev.length >= 2 ? prev : [...prev, card]);
                          }}
                            style={{
                              background: isClue ? `${T.tertiary}05` : '#1e1b14',
                              border: isSel ? `2px solid ${T.tertiary}` : isClue ? `1px solid ${T.tertiary}30` : `1px solid ${T.outlineVariant}15`,
                              borderRadius: 6, padding: '8px 12px', marginBottom: 5, cursor: 'pointer', position: 'relative',
                            }}>
                            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface }}>{card.text}</div>
                            {isClue && <span style={{ fontSize: 8, color: T.tertiary, fontWeight: 600 }}>CLUE CONNECTED</span>}
                            {isSel && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: T.tertiary, fontSize: 12 }}>{'\u2713'}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ROW 3: WHO — Who is involved? */}
                  {selectedMethods.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Who is involved?</div>
                      {generatedCards.whoCards.map(card => {
                        const isSel = selectedWho?.id === card.id;
                        return (
                          <div key={card.id} onClick={() => setSelectedWho(isSel ? null : card)}
                            style={{
                              background: '#1e1b14', border: isSel ? `2px solid ${T.primary}` : `1px solid ${T.outlineVariant}15`,
                              borderRadius: 6, padding: '7px 12px', marginBottom: 5, cursor: 'pointer', position: 'relative',
                            }}>
                            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface }}>{card.text}</div>
                            {isSel && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: T.primary, fontSize: 12 }}>{'\u2713'}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ROW 4: OUTCOME — What does it accomplish? */}
                  {selectedWho && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>What does it accomplish?</div>
                      {generatedCards.outcomeCards.map(card => {
                        const isSel = selectedOutcome?.id === card.id;
                        return (
                          <div key={card.id} onClick={() => setSelectedOutcome(isSel ? null : card)}
                            style={{
                              background: '#1e1b14', border: isSel ? `2px solid ${T.primary}` : `1px solid ${T.outlineVariant}15`,
                              borderRadius: 6, padding: '7px 12px', marginBottom: 5, cursor: 'pointer', position: 'relative',
                            }}>
                            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface }}>{card.text}</div>
                            {isSel && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: T.primary, fontSize: 12 }}>{'\u2713'}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Assembled preview */}
                  {selectedOutcome && (
                    <div style={{ marginTop: 10, background: T.surface, border: `1px solid ${T.outlineVariant}15`, borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'uppercase' as const, marginBottom: 4, letterSpacing: 0.5 }}>Your task:</div>
                      <div style={{ fontFamily: T.fontBody, fontSize: 11, color: `${T.onSurface}CC`, lineHeight: '15px' }}>{autoDescription}</div>
                    </div>
                  )}

                  {/* Layer detection pills */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, marginBottom: 4 }}>
                    {(['foundation', 'activation', 'sustainability'] as PlacemakingLayer[]).map(layer => {
                      const active = formLayerDetection[layer];
                      return (
                        <div key={layer} style={{
                          display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10,
                          background: active ? `${LAYER_COLORS[layer]}15` : 'transparent',
                          opacity: active ? 1 : 0.25, transition: 'all 0.3s',
                          border: `1px solid ${active ? LAYER_COLORS[layer] + '30' : 'transparent'}`,
                        }}>
                          <span style={{ fontSize: 9 }}>{LAYER_ICONS[layer]}</span>
                          <span style={{ fontSize: 8, color: active ? LAYER_COLORS[layer] : T.onSurfaceVariant, fontWeight: 600 }}>{LAYER_LABELS[layer]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ═══ LOCAL INSIGHT SPEECH BUBBLE ═══ */}
                  {selectedOutcome && !localInsightSaved && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: ROLE_COLORS[currentPlayer?.roleId || ''] || '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {currentPlayer?.name[0] || '?'}
                      </div>
                      <div style={{ flex: 1, background: T.containerHigh, borderRadius: 8, padding: 10, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -6, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: `6px solid ${T.containerHigh}` }} />
                        <div style={{ fontSize: 11, color: T.tertiary, fontStyle: 'italic', marginBottom: 6 }}>You know something about this place that no card captures.</div>
                        <div style={{ position: 'relative' }}>
                          <textarea value={localInsight} onChange={e => setLocalInsight(e.target.value)}
                            placeholder="A specific person, place, shortcut, or local knowledge that makes this plan better..."
                            style={{ width: '100%', minHeight: 50, maxHeight: 80, padding: '8px 10px', background: T.containerHigh, border: `1px dashed ${T.tertiary}30`, borderRadius: 6, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                          {insightSpecificity.isSpecific && localInsight.trim() && (
                            <span style={{ position: 'absolute', top: -8, right: 4, background: `${T.tertiary}15`, border: `1px solid ${T.tertiary}30`, borderRadius: 10, padding: '1px 7px', fontSize: 8, color: T.tertiary, fontWeight: 700 }}>LOCAL KNOWLEDGE {'\u2726'}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button onClick={() => { setLocalInsightSaved(true); setLocalInsight(''); }} style={{ background: 'transparent', border: 'none', color: T.onSurfaceVariant, fontSize: 10, cursor: 'pointer', fontFamily: T.fontBody, padding: '4px 8px' }}>Skip — no insight</button>
                          <button onClick={() => { if (localInsight.trim()) setLocalInsightSaved(true); }} style={{ background: `${T.tertiary}15`, border: `1px solid ${T.tertiary}30`, color: T.tertiary, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBody, padding: '4px 10px', borderRadius: 4 }}>Add Insight {'\u2713'}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══ CROSS-PERSPECTIVE MATCHING GAME ═══ */}
                  {(localInsightSaved || !selectedOutcome) ? null : null}
                  {localInsightSaved && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>How does this help others?</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                        {Object.entries(crossBenefits).map(([role, benefits]) => {
                          const roleColor = (ROLE_COLORS as Record<string, string>)[role] || T.onSurfaceVariant;
                          const selected = selectedBenefits.find(b => b.role === role);
                          return (
                            <div key={role} style={{ width: 'calc(50% - 3px)', background: '#1e1b14', border: `1px solid ${roleColor}20`, borderRadius: 8, padding: 10 }}>
                              <div style={{ fontFamily: T.fontBody, fontSize: 10, fontWeight: 700, color: roleColor, marginBottom: 6, textTransform: 'capitalize' as const }}>{role}</div>
                              {benefits.slice(0, 2).map((b, bi) => {
                                const isSel = selected?.text === b;
                                return (
                                  <div key={bi} onClick={() => {
                                    setSelectedBenefits(prev => {
                                      const without = prev.filter(p => p.role !== role);
                                      return isSel ? without : [...without, { role, text: b }];
                                    });
                                  }}
                                    style={{
                                      background: isSel ? `${roleColor}0D` : T.container, border: isSel ? `1px solid ${roleColor}` : `1px solid ${T.outlineVariant}15`,
                                      borderRadius: 4, padding: '5px 8px', marginBottom: 3, cursor: 'pointer', position: 'relative',
                                      fontSize: 10, color: isSel ? T.onSurface : T.onSurfaceVariant, transition: 'border-color 0.15s',
                                    }}>
                                    {b}
                                    {isSel && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: roleColor, fontSize: 10 }}>{'\u2713'}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      {/* Custom connection */}
                      {!showCustomCross ? (
                        <div onClick={() => setShowCustomCross(true)} style={{ marginTop: 6, fontSize: 10, color: `${T.onSurfaceVariant}80`, cursor: 'pointer', fontFamily: T.fontBody }}>
                          See a connection no card shows?
                        </div>
                      ) : (
                        <input value={customCrossText} onChange={e => setCustomCrossText(e.target.value)} placeholder="Describe a connection no benefit card covers..."
                          style={{ marginTop: 6, width: '100%', padding: '6px 10px', background: T.containerHigh, border: `1px dashed ${T.outlineVariant}30`, borderRadius: 4, color: T.onSurface, fontSize: 10, fontFamily: T.fontBody, boxSizing: 'border-box' as const }} />
                      )}
                    </div>
                  )}
                </div>
              ) : selectedType === 'innovate' ? (
                /* ═══ INNOVATE — free-text mode ═══ */
                <div>
                  <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.tertiary, marginBottom: 8 }}>INNOVATION MODE — No standard cards. Share your unique idea.</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Title</div>
                    <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Your innovation..."
                      style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 12, fontFamily: T.fontBody, boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Description</div>
                    <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value.slice(0, 300))} placeholder="Describe your creative solution..."
                      style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, resize: 'none' as const, height: 60, boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>How does this help others?</div>
                    <textarea value={crossPerspective} onChange={e => setCrossPerspective(e.target.value)} placeholder="Cross-role perspective..."
                      style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, resize: 'none' as const, height: 36, boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 3, textTransform: 'uppercase' as const }}>Success Criteria</div>
                    <input value={taskCriteria} onChange={e => setTaskCriteria(e.target.value)} placeholder="How do we know it worked?"
                      style={{ width: '100%', padding: '6px 8px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, color: T.onSurface, fontSize: 11, fontFamily: T.fontBody, boxSizing: 'border-box' as const }} />
                  </div>
                </div>
              ) : null}

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

              {/* ═══ STAGE 1: Form buttons (filling) ═══ */}
              {taskStage === 'filling' && (
                <>
                  {/* Resource requests display */}
                  {resourceRequests.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {resourceRequests.map((rr, i) => {
                        const target = sorted.find(p => p.id === rr.targetId);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, fontSize: 9, color: T.tertiary }}>
                            <span>{'\u{1F4CB}'}</span>
                            <span>Requesting: {rr.amount} {rr.resource} from {target?.name}</span>
                            <button onClick={() => setResourceRequests(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#e55', fontSize: 10, cursor: 'pointer', padding: 0 }}>{'\u00D7'}</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Request Resources button */}
                  {!showRequestBuilder && (
                    <button onClick={() => setShowRequestBuilder(true)} style={{
                      width: '100%', padding: '6px 0', marginBottom: 6, background: 'transparent',
                      border: `1px solid rgba(233,195,73,0.4)`, borderRadius: 6, color: T.tertiary,
                      fontFamily: T.fontBody, fontSize: 11, cursor: 'pointer',
                    }}>
                      {'\u{1F91D}'} Request Resources from Others
                    </button>
                  )}
                  {showRequestBuilder && (
                    <div style={{ background: T.containerHigh, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: T.tertiary, marginBottom: 4, fontWeight: 600 }}>Request resources:</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' as const }}>
                        <select value={reqAmount} onChange={e => setReqAmount(Number(e.target.value))} style={{ background: T.container, color: T.onSurface, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, padding: '2px 4px', fontSize: 10 }}>
                          {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select value={reqResource} onChange={e => setReqResource(e.target.value as ResourceType)} style={{ background: T.container, color: T.onSurface, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, padding: '2px 4px', fontSize: 10 }}>
                          {RES_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <span style={{ fontSize: 9, color: T.onSurfaceVariant }}>from</span>
                        <select value={reqTargetIdx} onChange={e => setReqTargetIdx(Number(e.target.value))} style={{ background: T.container, color: T.onSurface, border: `1px solid ${T.outlineVariant}`, borderRadius: 4, padding: '2px 4px', fontSize: 10 }}>
                          {otherPlayers.map((p, i) => <option key={p.id} value={i}>{p.name} ({p.roleId})</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => {
                          const target = otherPlayers[reqTargetIdx];
                          if (target) {
                            setResourceRequests(prev => [...prev, { targetId: target.id, resource: reqResource, amount: reqAmount }]);
                          }
                        }} style={{ flex: 1, padding: '4px 0', background: T.tertiary, color: T.surface, border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Add Request</button>
                        <button onClick={() => setShowRequestBuilder(false)} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.outlineVariant}`, color: T.onSurfaceVariant, borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Done</button>
                      </div>
                    </div>
                  )}

                  {/* "This is My Move" button */}
                  <button
                    onClick={submitMyMove}
                    disabled={!selectedType || !taskTitle.trim()}
                    style={{
                      width: '100%', padding: '12px 0', background: (!selectedType || !taskTitle.trim()) ? T.outlineVariant : T.primary,
                      color: T.surface, border: 'none', borderRadius: 4, fontFamily: T.fontBody, fontSize: 14, fontWeight: 700,
                      cursor: (!selectedType || !taskTitle.trim()) ? 'default' : 'pointer',
                      boxShadow: T.woodBevel, marginBottom: 4, opacity: (!selectedType || !taskTitle.trim()) ? 0.4 : 1,
                    }}
                  >
                    This is My Move {'\u2713'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={cancelTask} style={{ background: 'none', border: 'none', color: T.onSurfaceVariant, fontSize: 10, cursor: 'pointer', fontFamily: T.fontBody, padding: 0 }}>Cancel</button>
                    <button onClick={placeSolo} disabled={!selectedType || !taskTitle.trim() || liveTotal === 0}
                      style={{ background: 'none', border: 'none', color: `${T.onSurfaceVariant}80`, fontSize: 10, cursor: 'pointer', fontFamily: T.fontBody, padding: 0, textDecoration: 'underline' }}>
                      Skip collaboration {'\u2014'} place solo
                    </button>
                  </div>
                  {liveTotal === 0 && selectedType && taskTitle.trim() && (
                    <div style={{ fontSize: 9, color: T.onSurfaceVariant, marginTop: 6, fontStyle: 'italic' }}>
                      You have no resources left {'\u2014'} but your idea and coordination still count. Other players can contribute.
                    </div>
                  )}
                </>
              )}

              {/* ═══ STAGE 2: Collaboration carousel ═══ */}
              {taskStage === 'collaboration' && (() => {
                const joiner = otherPlayers[collabPlayerIdx];
                if (!joiner) return null;
                const request = resourceRequests.find(rr => rr.targetId === joiner.id);
                return (
                  <div style={{ background: T.surface, borderRadius: 8, padding: 10, border: `1px solid ${T.tertiary}30` }}>
                    {/* Task proposal banner */}
                    <div style={{ background: `rgba(174,212,86,0.08)`, borderLeft: `4px solid ${T.primary}`, borderRadius: 4, padding: 8, marginBottom: 8 }}>
                      <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.primary, fontWeight: 700 }}>{'\u{1F4CB}'} TASK PROPOSAL</div>
                      <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurface, marginTop: 2 }}>{currentPlayer?.name} proposes: <strong>{taskTitle}</strong></div>
                      {taskDesc && <div style={{ fontFamily: T.fontBody, fontSize: 9, color: T.onSurfaceVariant, marginTop: 2 }}>{taskDesc}</div>}
                      <div style={{ fontFamily: T.fontNumber, fontSize: 9, color: T.tertiary, marginTop: 3 }}>
                        Commits: {RES_TYPES.filter(r => myContributions[r] > 0).map(r => `${r.slice(0, 3).toUpperCase()} {'\u00D7'}${myContributions[r]}`).join(' + ')} = {liveTotal.toFixed(1)} pts
                      </div>
                      {resourceRequests.length > 0 && (
                        <div style={{ marginTop: 4, padding: '4px 0', borderTop: `1px solid ${T.tertiary}20` }}>
                          <div style={{ fontSize: 9, color: T.tertiary, fontWeight: 700 }}>{'\u26A1'} RESOURCE REQUESTS:</div>
                          {resourceRequests.map((rr, i) => {
                            const t = sorted.find(p => p.id === rr.targetId);
                            return <div key={i} style={{ fontSize: 9, color: T.tertiary }}>{'\u2022'} {rr.amount} {rr.resource} from {t?.name}</div>;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Live score */}
                    <div style={{ background: T.container, borderRadius: 6, padding: 6, marginBottom: 8, textAlign: 'center' }}>
                      <div style={{ fontFamily: T.fontNumber, fontSize: 16, fontWeight: 700, color: T.onSurface }}>{collabPreview.combined} pts</div>
                      <div style={{
                        fontFamily: T.fontHeadline, fontSize: collabPreview.uniqueRoles >= 3 ? 14 : 12,
                        fontWeight: 700, color: collabPreview.uniqueRoles >= 2 ? T.tertiary : T.onSurfaceVariant,
                      }}>
                        {collabPreview.uniqueRoles} role{collabPreview.uniqueRoles !== 1 ? 's' : ''} {'\u00D7'}{collabPreview.mult}
                      </div>
                      {collabPreview.uniqueRoles < 5 && (
                        <div style={{ fontSize: 9, color: T.tertiary }}>+1 role = {'\u00D7'}{getCombinationMultiplier(collabPreview.uniqueRoles + 1).toFixed(1)}</div>
                      )}
                    </div>

                    {/* Current joiner */}
                    <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.tertiary, textAlign: 'center', marginBottom: 6 }}>
                      {'\u{1F504}'} PASS DEVICE TO:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[joiner.roleId], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{joiner.name[0]}</div>
                      <div>
                        <div style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, color: T.onSurface }}>{joiner.name}</div>
                        <div style={{ fontSize: 9, color: T.onSurfaceVariant, textTransform: 'capitalize' }}>{joiner.roleId}</div>
                      </div>
                    </div>

                    {/* Request banner */}
                    {request && (
                      <div style={{ background: `rgba(233,195,73,0.1)`, border: `1px solid rgba(233,195,73,0.3)`, borderRadius: 4, padding: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: T.tertiary, fontWeight: 700 }}>{'\u26A1'} {currentPlayer?.name} is asking YOU for: {request.amount} {request.resource}</div>
                        <div style={{ fontSize: 9, color: T.onSurfaceVariant, marginTop: 2 }}>
                          Your {request.resource}: {(resourcePools[joiner.id]?.[request.resource] || 0) - (lockedByPlayer[joiner.id]?.[request.resource] || 0)} available
                        </div>
                        <button onClick={() => {
                          setCollabJoinerContrib(prev => ({ ...prev, [request.resource]: Math.min(request.amount, (resourcePools[joiner.id]?.[request.resource] || 0) - (lockedByPlayer[joiner.id]?.[request.resource] || 0)) }));
                        }} style={{ marginTop: 4, padding: '4px 12px', background: T.primary, color: T.surface, border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                          Accept Request
                        </button>
                      </div>
                    )}

                    {/* Stepper */}
                    <div style={{ fontSize: 9, color: T.onSurfaceVariant, marginBottom: 4 }}>Your resources:</div>
                    {RES_TYPES.map(r => {
                      const avail = (resourcePools[joiner.id]?.[r] || 0) - (lockedByPlayer[joiner.id]?.[r] || 0);
                      if (avail <= 0) return null;
                      const ak = RESOURCE_ABILITY_MAP[r] as string;
                      const eff = calculateEffectiveness((joiner.abilities as unknown as Record<string, number>)[ak] ?? 0);
                      const val = collabJoinerContrib[r];
                      return (
                        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: RESOURCE_COLORS[r] }} />
                          <span style={{ fontSize: 9, color: T.onSurfaceVariant, width: 44, textTransform: 'capitalize' }}>{r} ({avail})</span>
                          <span style={{ fontSize: 8, color: T.outlineVariant, width: 24 }}>{eff}%</span>
                          <button onClick={() => setCollabJoinerContrib(prev => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))} style={{ width: 18, height: 18, background: T.container, border: `1px solid ${T.outlineVariant}`, borderRadius: 3, color: T.onSurface, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{'\u2212'}</button>
                          <span style={{ fontFamily: T.fontNumber, fontSize: 11, color: T.onSurface, width: 14, textAlign: 'center' }}>{val}</span>
                          <button onClick={() => setCollabJoinerContrib(prev => ({ ...prev, [r]: Math.min(avail, prev[r] + 1) }))} style={{ width: 18, height: 18, background: T.container, border: `1px solid ${T.outlineVariant}`, borderRadius: 3, color: T.onSurface, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                          {val > 0 && <span style={{ fontSize: 8, color: T.primary }}>{(val * (eff / 100) * 5).toFixed(1)}</span>}
                        </div>
                      );
                    })}

                    {/* Join/Skip */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={collabJoinerJoin} disabled={Object.values(collabJoinerContrib).every(v => v === 0)}
                        style={{ flex: 1, padding: '8px 0', background: Object.values(collabJoinerContrib).some(v => v > 0) ? T.primary : T.outlineVariant, color: T.surface, border: 'none', borderRadius: 6, fontFamily: T.fontBody, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: Object.values(collabJoinerContrib).some(v => v > 0) ? 1 : 0.4 }}>
                        Join
                      </button>
                      <button onClick={collabJoinerSkip}
                        style={{ flex: 1, padding: '8px 0', background: 'transparent', color: T.onSurfaceVariant, border: `1px solid ${T.onSurfaceVariant}`, borderRadius: 6, fontFamily: T.fontBody, fontSize: 11, cursor: 'pointer' }}>Skip</button>
                    </div>
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 6 }}>
                      {otherPlayers.map((_, i) => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < collabPlayerIdx ? T.primary : i === collabPlayerIdx ? T.tertiary : T.outlineVariant }} />
                      ))}
                    </div>
                    <button onClick={() => setTaskStage('summary')} style={{ width: '100%', padding: '3px 0', marginTop: 4, background: 'transparent', color: T.outlineVariant, border: 'none', fontSize: 9, cursor: 'pointer' }}>End collaboration early</button>
                  </div>
                );
              })()}

              {/* ═══ STAGE 3: Summary — proposer locks ═══ */}
              {taskStage === 'summary' && (
                <div style={{ background: T.surface, borderRadius: 8, padding: 10, border: `1px solid ${T.primary}30` }}>
                  <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.tertiary, textAlign: 'center', marginBottom: 6 }}>
                    {'\u{1F504}'} PASS DEVICE BACK TO: {currentPlayer?.name}
                  </div>
                  <div style={{ fontFamily: T.fontHeadline, fontSize: 12, color: T.onSurface, marginBottom: 8 }}>Task Summary</div>

                  {/* Contributors */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: ROLE_COLORS[currentPlayer?.roleId || ''] || '#666', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{currentPlayer?.name[0]}</div>
                      <span style={{ fontSize: 10, color: T.onSurface }}>{currentPlayer?.name}: {liveTotal.toFixed(1)} pts</span>
                    </div>
                    {otherPlayers.map(p => {
                      const d = collabDecisions[p.id];
                      const pC = joinedContributions.filter(c => c.playerId === p.id);
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: ROLE_COLORS[p.roleId], fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{p.name[0]}</div>
                          <span style={{ fontSize: 10, color: d === 'joined' ? T.onSurface : T.outlineVariant }}>
                            {p.name}: {d === 'joined' ? `${pC.reduce((s, c) => s + c.basePoints, 0).toFixed(1)} pts` : 'Skipped'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Score */}
                  <div style={{ background: T.container, borderRadius: 6, padding: 8, marginBottom: 8, textAlign: 'center' }}>
                    <div style={{ fontFamily: T.fontNumber, fontSize: 22, fontWeight: 700, color: T.primary }}>{collabPreview.combined} pts</div>
                    <div style={{ fontSize: 11, color: T.tertiary }}>{collabPreview.uniqueRoles} role{collabPreview.uniqueRoles !== 1 ? 's' : ''} {'\u00D7'}{collabPreview.mult}</div>
                  </div>

                  {/* Request results */}
                  {resourceRequests.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {resourceRequests.map((rr, i) => {
                        const t = sorted.find(p => p.id === rr.targetId);
                        const d = collabDecisions[rr.targetId];
                        const accepted = d === 'joined' && joinedContributions.some(c => c.playerId === rr.targetId && c.resourceType === rr.resource);
                        return (
                          <div key={i} style={{ fontSize: 9, color: accepted ? T.primary : T.onSurfaceVariant }}>
                            {accepted ? '\u2713' : '\u2717'} {rr.amount} {rr.resource} from {t?.name} {'\u2014'} {accepted ? 'Accepted' : 'Declined'}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Lock button */}
                  <button onClick={lockFromSummary} style={{
                    width: '100%', padding: '12px 0', background: T.primary, color: T.surface,
                    border: 'none', borderRadius: 4, fontFamily: T.fontBody, fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', boxShadow: T.woodBevel, marginBottom: 4,
                  }}>
                    Lock &amp; Place Task {'\u2014'} {collabPreview.combined} pts
                  </button>
                  <div style={{ fontSize: 8, color: T.outlineVariant, textAlign: 'center', marginBottom: 6 }}>
                    Resources will be permanently locked for all contributors
                  </div>
                  <button onClick={cancelTask} style={{ width: '100%', padding: '4px 0', background: 'transparent', color: T.onSurfaceVariant, border: 'none', fontSize: 10, cursor: 'pointer', fontFamily: T.fontBody }}>
                    Cancel {'\u2014'} Discard Everything
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

      {/* ─── ROUND SUMMARY OVERLAY ─── */}
      <AnimatePresence>
        {showRoundSummary && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(22,19,12,0.95)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ background: T.container, borderRadius: 12, padding: 28, maxWidth: 520, width: '90%', boxShadow: T.woodBevel, border: `1px solid ${T.outlineVariant}15` }}>
              <div style={{ fontFamily: T.fontHeadline, fontSize: 22, color: T.tertiary, textAlign: 'center', marginBottom: 16 }}>
                Round {currentRound} Complete
              </div>

              {/* Series stats */}
              <div style={{ background: T.containerHigh, borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: T.fontBody, fontWeight: 700, fontSize: 14, color: T.onSurface }}>{activeSeries.name}</span>
                  <span style={{ fontFamily: T.fontNumber, fontSize: 18, fontWeight: 700, color: T.tertiary }}>{activeSeries.runningTotal.toFixed(1)} pts</span>
                </div>
                <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>{activeSeries.tasks.length} tasks · {chainInfo}</div>
                {/* Layer coverage */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {(['foundation', 'activation', 'sustainability'] as PlacemakingLayer[]).map(layer => {
                    const cov = layerCoverage[layer];
                    return (
                      <div key={layer} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9 }}>{LAYER_ICONS[layer]}</span>
                        <div style={{ flex: 1, height: 4, background: T.surface, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${cov.percent}%`, height: '100%', background: LAYER_COLORS[layer], borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 8, color: LAYER_COLORS[layer] }}>{cov.percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threshold status */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {thresholdCrossed ? (
                  <div style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.tertiary }}>{'\u2728'} The zone is beginning to transform! ({transformLevel}%)</div>
                ) : (
                  <>
                    <div style={{ height: 8, background: T.surface, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (activeSeries.runningTotal / hiddenThreshold) * 100)}%`, background: T.primary, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurfaceVariant }}>The vision is forming but not yet complete. More work is needed.</div>
                  </>
                )}
              </div>

              {/* Resource remaining */}
              <div style={{ fontSize: 10, color: T.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
                Resources remaining: {sorted.reduce((s, p) => s + RES_TYPES.reduce((ss, r) => ss + Math.max(0, (resourcePools[p.id]?.[r] || 0) - (lockedByPlayer[p.id]?.[r] || 0)), 0), 0)} / {sorted.length * 12} tokens
              </div>

              {/* Finish vote */}
              {finishVoteOpen && (
                <div style={{ background: T.surface, borderRadius: 8, padding: 12, marginBottom: 12, border: `1px solid ${T.outlineVariant}` }}>
                  <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurface, marginBottom: 8 }}>Finish Phase 4? Best series becomes the plan.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                    {sorted.map(p => {
                      const v = finishVotes[p.id];
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, color: T.onSurfaceVariant }}>{p.name}:</span>
                          {v === undefined ? (
                            <>
                              <button onClick={() => castFinishVote(p.id, true)} style={{ padding: '2px 8px', background: T.primary, color: T.surface, border: 'none', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}>Yes</button>
                              <button onClick={() => castFinishVote(p.id, false)} style={{ padding: '2px 8px', background: T.outlineVariant, color: T.onSurface, border: 'none', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}>No</button>
                            </>
                          ) : (
                            <span style={{ fontSize: 9, color: v ? T.primary : '#e55' }}>{v ? 'Yes' : 'No'}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={continueBuilding} style={{
                  padding: '10px 20px', background: T.primary, color: T.surface, border: 'none', borderRadius: 8,
                  fontFamily: T.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Continue Building {activeSeries.name}</button>
                {allSeries.length < 4 && (
                  <button onClick={startNewSeries} style={{
                    padding: '8px 16px', background: 'transparent', color: T.tertiary, border: `1px solid ${T.tertiary}40`,
                    borderRadius: 8, fontFamily: T.fontBody, fontSize: 12, cursor: 'pointer',
                  }}>Start New Series</button>
                )}
                <button onClick={proposeFinish} style={{
                  padding: '6px 16px', background: 'transparent', color: T.onSurfaceVariant, border: `1px solid ${T.outlineVariant}`,
                  borderRadius: 8, fontFamily: T.fontBody, fontSize: 11, cursor: 'pointer',
                }}>Finish Phase</button>
              </div>
            </div>
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
