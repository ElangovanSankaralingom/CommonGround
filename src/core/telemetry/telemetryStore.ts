import { create } from 'zustand';

// ─── Interfaces ──────────────────────────────────────────────

interface SessionMeta {
  sessionId: string;
  sessionNumber: number;
  challengeSetId: string;
  isPilot: boolean;
  pilotZoneId?: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
}

interface PlayerProfile {
  playerId: string;
  name: string;
  roleId: string;
  effectiveness: Record<string, number>;
  roleName?: string;
  abilityScore?: number;
  archetype?: string;
  tokenAllocation?: Record<string, number>;
  objectiveWeights?: Record<string, number>;
  demographics?: Record<string, any>;
}

interface Phase1Data {
  challengeCardId?: string;
  challengeTitle?: string;
  readDurationSeconds?: number;
}

interface Phase2Click {
  objectId: string;
  objectName: string;
  playerId: string;
  playerRole: string;
  timestamp: string;
  timeFromStartSeconds: number;
  isRelevant: boolean;
  isRootCause: boolean;
  category: string;
}

interface Phase2Data {
  totalTimeSeconds?: number;
  clickLog: Phase2Click[];
  coverageMap?: {
    totalObjects: number;
    objectsClicked: number;
    relevantFound: number;
    trapsClicked: number;
    rootCauseFound: boolean;
    coveragePercent: number;
  };
  discoveredClueIds: string[];
}

interface Phase3IndividualPick {
  playerId: string;
  role: string;
  pickedFeatureIds: string[];
  pickedFeatureNames: string[];
  timeSpentSeconds?: number;
}

interface Phase3VoteEntry {
  featureId: string;
  featureName: string;
  featureSet: string;
  layer: string;
  totalStars: number;
  voterIds: string[];
  rank: number;
  priority: 'primary' | 'secondary' | 'tertiary';
}

interface Phase3Data {
  individualPicks: Phase3IndividualPick[];
  negotiation?: { totalTimeSeconds: number; featuresAdded: number; featuresRemoved: number };
  voting?: { voteDistribution: Phase3VoteEntry[] };
  confirmedFeatures: string[];
  collaborativeScore?: { total: number; objectiveDiversity: number; stakeholderBalance: number; layerBalance: number; rootCauseAlignment: boolean };
  goalResult?: string;
  hintUsed: boolean;
  overrideUsed: boolean;
}

interface TaskTelemetry {
  taskId: string;
  taskIndex: number;
  taskType: string;
  placedBy: { playerId: string; role: string; name: string };
  contributions: { playerId: string; role: string; tokens: number; effectiveness: number; basePoints: number }[];
  combinationMultiplier: number;
  roleCount: number;
  baseTotal: number;
  taskTotal: number;
  runningTotal: number;
  chainPosition?: string;
  title: string;
  description: string;
  crossPerspective: string;
  layer: string;
  cardSelections?: Record<string, any>;
  textMetrics?: Record<string, any>;
  taskStartTime?: string;
  taskEndTime?: string;
  taskDurationSeconds?: number;
}

interface SeriesTelemetry {
  seriesId: string;
  tasks: TaskTelemetry[];
  seriesTotalPoints: number;
  chainBonusTotal: number;
  thresholdCrossed: boolean;
  transformationPercent: number;
  taskCount: number;
  averageMultiplier: number;
  innovateTaskCount: number;
  localInsightCount: number;
}

interface Phase4Data {
  totalTimeSeconds?: number;
  series: SeriesTelemetry[];
  threshold?: { baseCost: number; placemakingMultiplier: number; difficultyModifier: number; finalThreshold: number };
  reactionCardsDrawn: string[];
  optimumSeriesId?: string;
}

interface Phase5Data {
  q1_passed: boolean;
  q2_passed: boolean;
  q3_passed: boolean;
  sharedVisionScore?: number;
  utilityPerPlayer: { playerId: string; role: string; utility: number }[];
  transformationPercent: number;
  overallPass: boolean;
}

interface RoundData {
  roundNumber: number;
  zoneId: string;
  zoneName: string;
  difficulty: number;
  challengeType: string;
  roundStartTime: string;
  roundEndTime?: string;
  roundDurationSeconds?: number;
  phase1?: Phase1Data;
  phase2?: Phase2Data;
  phase3?: Phase3Data;
  phase4?: Phase4Data;
  phase5?: Phase5Data;
}

interface DebriefResponse {
  playerId: string;
  roleId: string;
  responses: Record<string, any>;
  timestamp: string;
}

interface SessionAggregates {
  perRound: { roundNumber: number; soloMax: number; collaborativeTotal: number; surplus: number }[];
  roundComparison: Record<string, { avgMultiplier: number; avgSpecificity: number; avgWordCount: number; avgCrossPersp: number }>;
  collaborationPoints: { playerId: string; name: string; role: string; total: number; breakdown: Record<string, number> }[];
}

interface TelemetryState {
  sessionMeta: SessionMeta | null;
  playerProfiles: PlayerProfile[];
  rounds: RoundData[];
  debrief: DebriefResponse[];
  sessionAggregates: SessionAggregates | null;
  initSession: (sessionNumber: number, challengeSetId: string, isPilot: boolean, pilotZoneId?: string) => void;
  setPlayerProfiles: (profiles: PlayerProfile[]) => void;
  initRound: (roundNumber: number, zoneId: string, zoneName: string, difficulty: number, challengeType: string) => void;
  recordPhase1: (data: Partial<Phase1Data>) => void;
  recordPhase2Click: (click: Phase2Click) => void;
  finalizePhase2: (data: Partial<Phase2Data>) => void;
  recordPhase3IndividualPick: (pick: Phase3IndividualPick) => void;
  recordPhase3Voting: (votes: Phase3VoteEntry[]) => void;
  finalizePhase3: (data: Partial<Phase3Data>) => void;
  recordPhase4Task: (seriesIdx: number, task: TaskTelemetry) => void;
  recordPhase4ReactionCard: (cardId: string) => void;
  finalizePhase4: (data: Partial<Phase4Data>) => void;
  recordPhase5: (data: Phase5Data) => void;
  finalizeRound: () => void;
  recordDebrief: (response: DebriefResponse) => void;
  calculateAggregates: () => void;
  exportSession: () => string;
  exportSessionCSV: () => string;
}

// ─── Store ───────────────────────────────────────────────────

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  sessionMeta: null,
  playerProfiles: [],
  rounds: [],
  debrief: [],
  sessionAggregates: null,

  initSession: (sessionNumber, challengeSetId, isPilot, pilotZoneId) => {
    const meta: SessionMeta = {
      sessionId: `CG_${Date.now()}`,
      sessionNumber, challengeSetId, isPilot, pilotZoneId,
      startTime: new Date().toISOString(),
    };
    set({ sessionMeta: meta, playerProfiles: [], rounds: [], debrief: [], sessionAggregates: null });
    console.log('TELEMETRY_SESSION_INIT:', meta.sessionId, 'session:', sessionNumber, 'set:', challengeSetId, 'pilot:', isPilot);
  },

  setPlayerProfiles: (profiles) => {
    set({ playerProfiles: profiles });
    console.log('TELEMETRY_PLAYERS_SET:', profiles.length, 'players');
  },

  initRound: (roundNumber, zoneId, zoneName, difficulty, challengeType) => {
    const round: RoundData = {
      roundNumber, zoneId, zoneName, difficulty, challengeType,
      roundStartTime: new Date().toISOString(),
      phase2: { clickLog: [], discoveredClueIds: [] },
      phase3: { individualPicks: [], confirmedFeatures: [], hintUsed: false, overrideUsed: false },
      phase4: { series: [], reactionCardsDrawn: [] },
    };
    set(state => ({ rounds: [...state.rounds, round] }));
    console.log('TELEMETRY_ROUND_INIT:', roundNumber, zoneId, zoneName);
  },

  recordPhase1: (data) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current) current.phase1 = { ...current.phase1, ...data };
      return { rounds };
    });
    console.log('TELEMETRY_PHASE1:', data);
  },

  recordPhase2Click: (click) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase2) current.phase2.clickLog.push(click);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE2_CLICK:', click.objectName, click.isRelevant ? 'RELEVANT' : 'TRAP');
  },

  finalizePhase2: (data) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase2) Object.assign(current.phase2, data);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE2_FINAL:', data.coverageMap?.coveragePercent + '% coverage');
  },

  recordPhase3IndividualPick: (pick) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase3) current.phase3.individualPicks.push(pick);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE3_PICK:', pick.role, pick.pickedFeatureNames);
  },

  recordPhase3Voting: (votes) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase3) current.phase3.voting = { voteDistribution: votes };
      return { rounds };
    });
    console.log('TELEMETRY_PHASE3_VOTES:', votes.length, 'features voted');
  },

  finalizePhase3: (data) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase3) Object.assign(current.phase3, data);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE3_FINAL:', data.confirmedFeatures?.length, 'features confirmed');
  },

  recordPhase4Task: (seriesIdx, task) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase4) {
        while (current.phase4.series.length <= seriesIdx) {
          current.phase4.series.push({
            seriesId: `series_${current.phase4.series.length}`,
            tasks: [], seriesTotalPoints: 0, chainBonusTotal: 0,
            thresholdCrossed: false, transformationPercent: 0,
            taskCount: 0, averageMultiplier: 1, innovateTaskCount: 0, localInsightCount: 0,
          });
        }
        const series = current.phase4.series[seriesIdx];
        series.tasks.push(task);
        series.taskCount = series.tasks.length;
        series.seriesTotalPoints = series.tasks.reduce((s, t) => s + t.taskTotal, 0);
        series.averageMultiplier = series.tasks.reduce((s, t) => s + t.combinationMultiplier, 0) / series.taskCount;
        series.innovateTaskCount = series.tasks.filter(t => t.taskType === 'innovate').length;
        series.localInsightCount = series.tasks.filter(t => t.cardSelections?.localInsightProvided).length;
      }
      return { rounds };
    });
    console.log('TELEMETRY_PHASE4_TASK:', task.title, 'pts:', task.taskTotal, 'roles:', task.roleCount);
  },

  recordPhase4ReactionCard: (cardId) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase4) current.phase4.reactionCardsDrawn.push(cardId);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE4_REACTION:', cardId);
  },

  finalizePhase4: (data) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current?.phase4) Object.assign(current.phase4, data);
      return { rounds };
    });
    console.log('TELEMETRY_PHASE4_FINAL:', data.optimumSeriesId, 'threshold:', data.threshold?.finalThreshold);
  },

  recordPhase5: (data) => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current) current.phase5 = data;
      return { rounds };
    });
    console.log('TELEMETRY_PHASE5:', data.overallPass ? 'SHARED_BALANCE' : 'NOT_ACHIEVED', 'transform:', data.transformationPercent + '%');
  },

  finalizeRound: () => {
    set(state => {
      const rounds = [...state.rounds];
      const current = rounds[rounds.length - 1];
      if (current) {
        current.roundEndTime = new Date().toISOString();
        current.roundDurationSeconds = Math.round(
          (new Date(current.roundEndTime).getTime() - new Date(current.roundStartTime).getTime()) / 1000
        );
      }
      return { rounds };
    });
    const r = get().rounds[get().rounds.length - 1];
    console.log('TELEMETRY_ROUND_FINAL:', r?.roundNumber, r?.roundDurationSeconds + 's');
  },

  recordDebrief: (response) => {
    set(state => ({ debrief: [...state.debrief, response] }));
    console.log('TELEMETRY_DEBRIEF:', response.playerId, response.roleId);
  },

  calculateAggregates: () => {
    const { rounds, playerProfiles } = get();
    const perRound = rounds.map(r => {
      const bestSeries = r.phase4?.series.reduce(
        (best, s) => s.seriesTotalPoints > (best?.seriesTotalPoints || 0) ? s : best,
        r.phase4?.series[0]
      );
      const soloMax = playerProfiles.reduce((s, p) => {
        const bestEff = Math.max(...Object.values(p.effectiveness), 0);
        // bestEff is 0.0-1.0, solo contribution = maxTokens(~4) × bestEff × pointsPerToken(5) × soloMultiplier(1.0)
        return s + bestEff * 4 * 5;
      }, 0);
      return {
        roundNumber: r.roundNumber,
        soloMax: Math.round(soloMax * 10) / 10,
        collaborativeTotal: bestSeries?.seriesTotalPoints || 0,
        surplus: Math.round(((bestSeries?.seriesTotalPoints || 0) - soloMax) * 10) / 10,
      };
    });

    const roundComparison: Record<string, { avgMultiplier: number; avgSpecificity: number; avgWordCount: number; avgCrossPersp: number }> = {};
    for (const r of rounds) {
      const tasks = r.phase4?.series.flatMap(s => s.tasks) || [];
      const len = tasks.length;
      roundComparison[`round${r.roundNumber}`] = {
        avgMultiplier: len ? Math.round(tasks.reduce((s, t) => s + t.combinationMultiplier, 0) / len * 100) / 100 : 0,
        avgSpecificity: len ? Math.round(tasks.reduce((s, t) => s + (t.textMetrics?.specificityScore || 0), 0) / len * 10) / 10 : 0,
        avgWordCount: len ? Math.round(tasks.reduce((s, t) => s + (t.textMetrics?.totalWordCount || 0), 0) / len) : 0,
        avgCrossPersp: len ? Math.round(tasks.reduce((s, t) => s + (t.cardSelections?.crossPerspectiveCount || 0), 0) / len * 10) / 10 : 0,
      };
    }

    const collaborationPoints = playerProfiles.map(p => {
      let total = 50;
      const breakdown: Record<string, number> = { baseParticipation: 50 };
      for (const r of rounds) {
        const clueBonus = (r.phase2?.discoveredClueIds.length || 0) * 3;
        total += clueBonus;
        breakdown.investigationClues = (breakdown.investigationClues || 0) + clueBonus;

        if ((r.phase3?.collaborativeScore?.total || 0) > 60) {
          total += 10;
          breakdown.visionBalance = (breakdown.visionBalance || 0) + 10;
        }

        const allTasks = r.phase4?.series.flatMap(s => s.tasks) || [];
        const joined = allTasks.filter(
          t => t.placedBy.playerId !== p.playerId && t.contributions.some(c => c.playerId === p.playerId)
        ).length;
        total += joined * 5;
        breakdown.tasksJoined = (breakdown.tasksJoined || 0) + joined * 5;

        const cross = allTasks.filter(
          t => t.placedBy.playerId === p.playerId && (t.cardSelections?.crossPerspectiveCount || 0) > 0
        ).length;
        total += cross * 3;
        breakdown.crossPerspectives = (breakdown.crossPerspectives || 0) + cross * 3;

        if (r.phase4?.series.find(s => s.thresholdCrossed)) {
          total += 10;
          breakdown.groupThreshold = (breakdown.groupThreshold || 0) + 10;
        }
      }

      if (rounds.length >= 3) {
        const r1Tasks = rounds[0]?.phase4?.series.flatMap(s => s.tasks) || [];
        const r3Tasks = rounds[2]?.phase4?.series.flatMap(s => s.tasks) || [];
        const r1Avg = r1Tasks.length ? r1Tasks.reduce((s, t) => s + t.combinationMultiplier, 0) / r1Tasks.length : 0;
        const r3Avg = r3Tasks.length ? r3Tasks.reduce((s, t) => s + t.combinationMultiplier, 0) / r3Tasks.length : 0;
        if (r3Avg > r1Avg) { total += 20; breakdown.learningBonus = 20; }
      }

      return { playerId: p.playerId, name: p.name, role: p.roleId, total, breakdown };
    });

    set({ sessionAggregates: { perRound, roundComparison, collaborationPoints } });
    console.log('TELEMETRY_AGGREGATES:', { perRound, collaborationPoints: collaborationPoints.map(p => `${p.name}:${p.total}`) });
  },

  exportSession: () => {
    get().calculateAggregates();
    const state = get();
    if (state.sessionMeta) {
      state.sessionMeta.endTime = new Date().toISOString();
      state.sessionMeta.durationSeconds = Math.round(
        (new Date(state.sessionMeta.endTime).getTime() - new Date(state.sessionMeta.startTime).getTime()) / 1000
      );
    }
    const data = {
      sessionMeta: state.sessionMeta,
      playerProfiles: state.playerProfiles,
      rounds: state.rounds,
      debrief: state.debrief,
      sessionAggregates: state.sessionAggregates,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const json = JSON.stringify(data, null, 2);
    console.log('TELEMETRY_EXPORT:', json.length, 'bytes', state.rounds.length, 'rounds');
    return json;
  },

  exportSessionCSV: () => {
    get().calculateAggregates();
    const state = get();
    const meta = state.sessionMeta;
    const profiles = state.playerProfiles;
    const rounds = state.rounds;
    const agg = state.sessionAggregates;
    const esc = (s: string) => {
      if (!s) return '';
      const clean = s.replace(/\n/g, ' ').replace(/\r/g, '');
      return clean.includes(',') || clean.includes('"') ? '"' + clean.replace(/"/g, '""') + '"' : clean;
    };

    const header = [
      'session_id', 'session_number', 'challenge_set', 'is_pilot',
      'round', 'zone_id', 'zone_name', 'difficulty',
      'player_id', 'player_name', 'player_role', 'participant_category',
      'task_index', 'task_type', 'task_title', 'task_description',
      'proposer_role', 'role_count', 'combination_multiplier',
      'chain_bonus', 'task_total', 'running_total',
      'action_card_text', 'method_cards_text', 'who_card_text', 'outcome_card_text',
      'local_insight_provided', 'local_insight_text', 'local_insight_word_count', 'local_insight_specific',
      'cross_perspective_count', 'custom_cross_text',
      'clue_connected', 'is_innovate',
      'specificity_score', 'investigation_connection', 'stakeholder_awareness',
      'layer_integration', 'action_completeness', 'total_word_count',
      'phase2_clues_found', 'phase2_root_cause_found', 'phase2_coverage_percent',
      'phase3_feature_count', 'phase3_collaborative_score', 'phase3_goal_result',
      'phase5_q1_passed', 'phase5_q3_passed', 'phase5_overall_pass',
      'phase5_transformation_percent', 'phase5_utility',
      'collaborative_total', 'solo_sum', 'surplus',
    ];

    const rows: string[] = [header.join(',')];

    for (const round of rounds) {
      const tasks = round.phase4?.series?.[0]?.tasks || [];
      const roundAgg = agg?.perRound?.find(r => r.roundNumber === round.roundNumber);

      const makeRow = (task: any, profile: any) => {
        const cs = task?.cardSelections || {};
        const tm = task?.textMetrics || {};
        const p5u = round.phase5?.utilityPerPlayer?.find((u: any) => u.role === (profile?.roleId || profile?.role));
        return [
          meta?.sessionId || '', String(meta?.sessionNumber || ''), meta?.challengeSetId || '', String(meta?.isPilot || false),
          String(round.roundNumber), round.zoneId, round.zoneName, String(round.difficulty),
          profile?.playerId || '', esc(profile?.name || ''), profile?.roleId || profile?.role || '', '',
          String(task?.taskIndex || ''), task?.taskType || '', esc(task?.title || ''), esc(task?.description || ''),
          task?.placedBy?.role || '', String(task?.roleCount || ''), String(task?.combinationMultiplier || ''),
          String(task?.chainBonus || ''), String(task?.taskTotal || ''), String(task?.runningTotal || ''),
          esc(cs.actionCardText || ''), esc((cs.methodCardTexts || []).join('; ')), esc(cs.whoCardText || ''), esc(cs.outcomeCardText || ''),
          String(cs.localInsightProvided || false), esc(cs.localInsightText || ''), String(cs.localInsightWordCount || 0), String(cs.localInsightSpecific || false),
          String(cs.crossPerspectiveCount || 0), esc(cs.customCrossText || ''),
          String(cs.clueConnected || false), String(cs.isInnovate || false),
          String(tm.specificityScore || 0), String(tm.investigationConnectionScore || 0), String(tm.stakeholderAwarenessScore || 0),
          String(tm.layerIntegrationScore || 0), String(tm.actionCompletenessScore || 0), String(tm.totalWordCount || 0),
          String(round.phase2?.coverageMap?.relevantFound || 0), String(round.phase2?.coverageMap?.rootCauseFound || false), String(round.phase2?.coverageMap?.coveragePercent || 0),
          String(round.phase3?.confirmedFeatures?.length || 0), String(round.phase3?.collaborativeScore?.total || 0), round.phase3?.goalResult || '',
          String(round.phase5?.q1_passed || false), String(round.phase5?.q3_passed || false), String(round.phase5?.overallPass || false),
          String(round.phase5?.transformationPercent || 0), String(p5u?.utility || 0),
          String(roundAgg?.collaborativeTotal || 0), String(roundAgg?.soloMax || 0), String(roundAgg?.surplus || 0),
        ].join(',');
      };

      if (tasks.length > 0) {
        for (const task of tasks) {
          const profile = profiles.find(p => p.playerId === task.placedBy?.playerId) || profiles[0];
          rows.push(makeRow(task, profile));
        }
      } else {
        for (const profile of profiles) {
          rows.push(makeRow(null, profile));
        }
      }
    }

    console.log('TELEMETRY_CSV_EXPORT:', rows.length - 1, 'data rows');
    return rows.join('\n');
  },
}));
