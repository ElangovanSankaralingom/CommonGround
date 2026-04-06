/**
 * autoPlay.ts — Automated play simulation system.
 * Fills the telemetry store directly with simulated data, then exports JSON.
 * Does NOT interact with the game UI.
 */
import { useTelemetryStore } from '../core/telemetry/telemetryStore';

// ─── Game Data Constants ───────────────────────────────────────

const ZONE_SEQUENCES: Record<string, string[]> = {
  setA: ['z5', 'z3', 'z6'], setB: ['z4', 'z2', 'z1'],
  setC: ['z7', 'z8', 'z13'], setD: ['z9', 'z10', 'z11'],
  setE: ['z12', 'z14', 'z5'],
};

const ZONE_NAMES: Record<string, string> = {
  z1: 'Main Entrance', z2: 'Fountain Plaza', z3: 'Boating Pond',
  z4: 'Herbal Garden', z5: 'Walking Track', z6: 'Playground',
  z7: 'Open Lawn', z8: 'Nursery Area', z9: 'Staff Quarters',
  z10: 'Peripheral Walk', z11: 'South Pond', z12: 'Compost Area',
  z13: 'PPP Zone', z14: 'Water Tank',
};

const ZONE_DIFFICULTIES: Record<string, number> = {
  z1: 4, z2: 3, z3: 3, z4: 2, z5: 2, z6: 3, z7: 2,
  z8: 3, z9: 2, z10: 3, z11: 3, z12: 2, z13: 4, z14: 3,
};

const ROLES = ['administrator', 'designer', 'citizen', 'advocate', 'investor'];
const ROLE_NAMES = ['City Administrator', 'Urban Designer', 'Community Organizer', 'Environmental Advocate', 'Private Investor'];

const EFFECTIVENESS: Record<string, Record<string, number>> = {
  administrator: { budget: 0.70, knowledge: 0.40, volunteer: 0.20, material: 0.35, influence: 0.60 },
  designer: { budget: 0.30, knowledge: 0.80, volunteer: 0.35, material: 0.45, influence: 0.20 },
  citizen: { budget: 0.25, knowledge: 0.40, volunteer: 0.70, material: 0.30, influence: 0.55 },
  advocate: { budget: 0.30, knowledge: 0.45, volunteer: 0.40, material: 0.25, influence: 0.75 },
  investor: { budget: 0.55, knowledge: 0.25, volunteer: 0.30, material: 0.65, influence: 0.35 },
};

const MULTIPLIER_TABLE: Record<number, number> = { 1: 1.0, 2: 1.3, 3: 1.6, 4: 2.0, 5: 2.5 };
const CHAIN_BONUSES = [0, 3, 7, 12, 18];
const TASK_TYPES = ['assess', 'plan', 'design', 'build', 'maintain'];

const STUDENT_INSIGHTS = [
  'The community would benefit from better facilities in this area',
  'More seating and shade would help visitors',
  'Regular maintenance should be scheduled monthly',
  'Local residents have complained about this issue',
  'The area needs better lighting for evening visitors',
];

const STAKEHOLDER_INSIGHTS = [
  'Mrs. Padma at house 42 has maintained this area alone for 3 years — she can train 10 volunteers from her self-help group',
  'The tea stall owner Murugan near the south gate has the PWD manhole key since 2019 — just ask him',
  'Soil here is black cotton clay — standard RCC foundations will crack in first monsoon, needs 600mm gravel pad minimum',
  'TNPCB assistant director Mr. Raman uses the walking track every Saturday morning at 6am — approach him informally before filing RTI',
  'Evening idli vendor Lakshmi would pay Rs 100/month rent for a proper stall — 6 vendors = Rs 7200/year recurring maintenance fund',
  'Ward 42 councillor office has a Rs 2.5 lakh discretionary fund — submit before March 15 or it lapses',
  'The PWD junior engineer Mr. Selvam approves pipe repairs under Rs 50000 without tendering — direct approach works',
  'Three retired PWD engineers live on 4th Street — they volunteer for quality inspection if asked through the temple committee',
  'Boating pond depth is only 2.1m at center after silting — original design was 3.5m — dredging costs Rs 4.2 lakh per 1000 sqm',
  'The Corporation nursery behind Zone 8 has 3000 native saplings ready — they are FREE for park projects if you submit Form 17B',
];

const ACTION_TEXTS = ['Survey and document current conditions', 'Create implementation timeline and budget allocation', 'Design technical specifications and layout drawings', 'Execute construction and installation works', 'Establish ongoing monitoring and maintenance system'];
const METHOD_TEXTS = ['Systematic inspection with photographic documentation', 'Reference investigation findings and PWD records', 'Community volunteer ground verification drive', 'Joint committee walkthrough assessment', 'GIS mapping and condition survey'];
const WHO_TEXTS = ['PWD junior engineer + ward sanitary inspector', 'Community volunteers + SHG coordinators', 'Corporation parks superintendent', 'TSEDA student interns + faculty advisor', 'Local NGO field workers + residents association'];
const OUTCOME_TEXTS = ['Detailed condition report with measurements and GPS coordinates', 'Approved implementation plan with confirmed budget line', 'Technical design validated by structural consultant', 'Physical construction completed to CPWD standards', 'Monitoring dashboard operational with monthly reporting'];

const FEATURE_POOL = ['Drainage System Repair', 'Community Seating Area', 'Native Plant Restoration', 'Solar Path Lighting', 'Waste Collection System', 'Community Governance Committee', 'Walking Path Restoration', 'Rainwater Harvesting', 'Public Art Installations'];

// ─── Participant Categories ────────────────────────────────────

type ParticipantMix = 'all_students' | 'mixed' | 'all_stakeholders';

function getParticipantCategories(mix: ParticipantMix): string[] {
  if (mix === 'all_students') return ['architecture_student', 'architecture_student', 'architecture_student', 'architecture_student', 'architecture_student'];
  if (mix === 'mixed') {
    const cats = ['architecture_student', 'architecture_student', 'architecture_student', 'actual_stakeholder', 'actual_stakeholder'];
    for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; }
    return cats;
  }
  return ['actual_stakeholder', 'actual_stakeholder', 'community_member', 'government_official', 'actual_stakeholder'];
}

// ─── Simulation Core ───────────────────────────────────────────

type BotType = 'random' | 'realistic' | 'strategic';

interface SimConfig {
  sessionNumber: number;
  challengeSetId: string;
  speed: 'fast' | 'normal';
  playerNames: string[];
  participantMix: ParticipantMix;
}

interface SimPlayer {
  playerId: string;
  name: string;
  role: string;
  effectiveness: Record<string, number>;
}

async function simulateSession(config: SimConfig, botType: BotType): Promise<void> {
  const store = useTelemetryStore.getState();
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const delay = config.speed === 'fast' ? 30 : 500;

  const zones = ZONE_SEQUENCES[config.challengeSetId] || ['z5', 'z3', 'z6'];
  const participantCategories = getParticipantCategories(config.participantMix);

  console.log('\u{1F916} SESSION', config.sessionNumber, '| type:', botType, '| mix:', config.participantMix, '| set:', config.challengeSetId);

  // ========== 1. INIT SESSION (also resets state) ==========
  store.initSession(config.sessionNumber, config.challengeSetId, false);
  await wait(delay);

  // ========== 2. PLAYER PROFILES ==========
  // PlayerProfile: { playerId, name, roleId, effectiveness }
  const players: SimPlayer[] = config.playerNames.map((name, i) => ({
    playerId: botType + '_' + config.participantMix + '_p' + i + '_s' + config.sessionNumber,
    name,
    role: ROLES[i],
    effectiveness: EFFECTIVENESS[ROLES[i]],
  }));

  store.setPlayerProfiles(players.map(p => ({
    playerId: p.playerId,
    name: p.name,
    roleId: p.role,
    effectiveness: p.effectiveness,
  })));
  console.log('  Players:', players.map((p, i) => p.name + '(' + p.role + '/' + participantCategories[i].replace('architecture_', '').replace('actual_', '') + ')').join(', '));
  await wait(delay);

  // ========== 3. PLAY 3 ROUNDS ==========
  for (let roundNum = 1; roundNum <= 3; roundNum++) {
    const zoneId = zones[roundNum - 1];
    const zoneName = ZONE_NAMES[zoneId] || 'Unknown';
    const difficulty = ZONE_DIFFICULTIES[zoneId] || 3;

    console.log('  Round', roundNum, ':', zoneName, '(difficulty', difficulty + ')');

    store.initRound(roundNum, zoneId, zoneName, difficulty, 'mixed');
    await wait(delay);

    // --- Phase 1 ---
    store.recordPhase1({
      challengeCardId: zoneId + '_challenge',
      challengeTitle: zoneName + ' Restoration Challenge',
      readDurationSeconds: 3 + Math.floor(Math.random() * 12),
    });
    await wait(delay);

    // --- Phase 2 ---
    const objects = [
      { id: zoneId + '_c1', name: 'Technical Report', isRelevant: true, isRootCause: true, category: 'infrastructure' },
      { id: zoneId + '_c2', name: 'Community Survey', isRelevant: true, isRootCause: false, category: 'community' },
      { id: zoneId + '_c3', name: 'Budget Document', isRelevant: true, isRootCause: false, category: 'institutional' },
      { id: zoneId + '_c4', name: 'Environmental Data', isRelevant: true, isRootCause: false, category: 'ecological' },
      { id: zoneId + '_c5', name: 'Maintenance Log', isRelevant: true, isRootCause: false, category: 'infrastructure' },
      { id: zoneId + '_t1', name: 'Old Photograph', isRelevant: false, isRootCause: false, category: 'historical' },
      { id: zoneId + '_t2', name: 'Decorative Item', isRelevant: false, isRootCause: false, category: 'decorative' },
      { id: zoneId + '_t3', name: 'Outdated Brochure', isRelevant: false, isRootCause: false, category: 'promotional' },
    ];

    const clickCount = botType === 'random' ? 3 + Math.floor(Math.random() * 4) : botType === 'strategic' ? 8 : 5 + Math.floor(Math.random() * 2);
    const shuffled = [...objects].sort(() => Math.random() - 0.5);
    const clicked = shuffled.slice(0, Math.min(clickCount, 8));

    for (const obj of clicked) {
      store.recordPhase2Click({
        objectId: obj.id, objectName: obj.name, playerId: 'group', playerRole: 'all',
        timestamp: new Date().toISOString(), timeFromStartSeconds: Math.floor(Math.random() * 60),
        isRelevant: obj.isRelevant, isRootCause: obj.isRootCause, category: obj.category,
      });
    }

    const relevant = clicked.filter(o => o.isRelevant);
    const traps = clicked.filter(o => !o.isRelevant);

    store.finalizePhase2({
      totalTimeSeconds: 25 + Math.floor(Math.random() * 45),
      coverageMap: {
        totalObjects: 8, objectsClicked: clicked.length, relevantFound: relevant.length,
        trapsClicked: traps.length, rootCauseFound: relevant.some(o => o.isRootCause),
        coveragePercent: Math.round((relevant.length / 5) * 100),
      },
      discoveredClueIds: relevant.map(o => o.id),
    });
    await wait(delay);

    // --- Phase 3: Individual Picks ---
    for (const player of players) {
      const picks = [...FEATURE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      // recordPhase3IndividualPick takes Phase3IndividualPick object
      store.recordPhase3IndividualPick({
        playerId: player.playerId,
        role: player.role,
        pickedFeatureIds: picks.map((_, i) => zoneId + '_f' + i),
        pickedFeatureNames: picks,
      });
    }

    const confirmedCount = botType === 'random' ? 2 : botType === 'strategic' ? 4 : 3 + Math.floor(Math.random() * 2);
    const confirmedNames = FEATURE_POOL.slice(0, confirmedCount);
    const confirmedIds = confirmedNames.map((_, i) => zoneId + '_f' + i);

    const collabScore = botType === 'random' ? 20 + Math.floor(Math.random() * 20) : botType === 'strategic' ? 80 + Math.floor(Math.random() * 15) : 50 + Math.floor(Math.random() * 30);

    store.finalizePhase3({
      confirmedFeatures: confirmedIds,
      collaborativeScore: {
        total: collabScore,
        objectiveDiversity: collabScore + Math.floor(Math.random() * 10) - 5,
        stakeholderBalance: collabScore + Math.floor(Math.random() * 15) - 8,
        layerBalance: collabScore + Math.floor(Math.random() * 12) - 6,
        rootCauseAlignment: botType !== 'random',
      },
      goalResult: botType === 'strategic' ? 'goal' : Math.random() > 0.35 ? 'goal' : 'nearMiss',
      hintUsed: botType === 'random' && Math.random() > 0.5,
      overrideUsed: false,
    });
    await wait(delay);

    // --- Phase 4: Series Building ---
    let runningTotal = 0;

    for (let ti = 0; ti < 5; ti++) {
      const proposer = players[ti];
      const isProposerStakeholder = participantCategories[ti] !== 'architecture_student';

      // Task type
      let taskType: string;
      if (botType === 'random') {
        taskType = TASK_TYPES[Math.floor(Math.random() * 5)];
      } else if (botType === 'strategic') {
        taskType = TASK_TYPES[ti];
      } else {
        const chainProb = 0.5 + (roundNum - 1) * 0.15;
        taskType = Math.random() < chainProb ? TASK_TYPES[ti] : TASK_TYPES[Math.floor(Math.random() * 5)];
      }

      // Collaboration — who joins
      let joinerCount: number;
      if (botType === 'random') {
        joinerCount = Math.random() > 0.5 ? 1 : 0;
      } else if (botType === 'strategic') {
        joinerCount = 4;
      } else {
        const base = 1 + Math.floor(Math.random() * 2);
        const roundBonus = Math.floor((roundNum - 1) * 0.7);
        const stakeholderBonus = isProposerStakeholder ? 1 : 0;
        joinerCount = Math.min(base + roundBonus + stakeholderBonus, 4);
      }

      const others = players.filter((_, idx) => idx !== ti);
      const joiners = others.sort(() => Math.random() - 0.5).slice(0, joinerCount);
      const allContrib = [proposer, ...joiners];
      const roleCount = allContrib.length;
      const mult = MULTIPLIER_TABLE[roleCount] || 1.0;

      // Resource allocation — contributions use { tokens: number } not array
      let baseTotal = 0;
      const contributions = allContrib.map(p => {
        const eff = Object.entries(p.effectiveness);
        const chosen = botType === 'random' ? eff[Math.floor(Math.random() * eff.length)] : eff.reduce((a, b) => b[1] > a[1] ? b : a);
        const tokens = botType === 'strategic' ? 3 : 1 + Math.floor(Math.random() * 2);
        const pts = tokens * chosen[1] * 5;
        baseTotal += pts;
        return { playerId: p.playerId, role: p.role, tokens, effectiveness: chosen[1], basePoints: Math.round(pts * 100) / 100 };
      });

      const isChain = taskType === TASK_TYPES[ti];
      const chainBonus = isChain ? CHAIN_BONUSES[ti] : 0;
      const multipliedTotal = Math.round(baseTotal * mult * 100) / 100;
      const taskTotal = Math.round((multipliedTotal + chainBonus) * 100) / 100;
      runningTotal = Math.round((runningTotal + taskTotal) * 100) / 100;

      // Local insight
      let insightProvided: boolean;
      let insightText: string | null;
      let insightSpecific: boolean;
      if (botType === 'random') {
        insightProvided = false; insightText = null; insightSpecific = false;
      } else if (botType === 'strategic') {
        insightProvided = true;
        insightText = STAKEHOLDER_INSIGHTS[ti % STAKEHOLDER_INSIGHTS.length];
        insightSpecific = true;
      } else if (isProposerStakeholder) {
        insightProvided = true;
        insightText = STAKEHOLDER_INSIGHTS[(ti + roundNum) % STAKEHOLDER_INSIGHTS.length];
        insightSpecific = true;
      } else {
        const insightProb = 0.3 + (roundNum - 1) * 0.15;
        insightProvided = Math.random() < insightProb;
        insightText = insightProvided ? STUDENT_INSIGHTS[ti % STUDENT_INSIGHTS.length] : null;
        insightSpecific = false;
      }

      // Cross-perspective
      let crossCount: number;
      if (botType === 'random') { crossCount = 0; }
      else if (botType === 'strategic') { crossCount = 4; }
      else {
        crossCount = Math.min(1 + Math.floor(Math.random() * 2) + Math.floor((roundNum - 1) * 0.5), 4);
        if (isProposerStakeholder) crossCount = Math.min(crossCount + 1, 4);
      }

      // Text metrics
      let specificityScore: number, wordCount: number;
      if (botType === 'random') {
        specificityScore = Math.floor(Math.random() * 2);
        wordCount = 5 + Math.floor(Math.random() * 8);
      } else if (botType === 'strategic') {
        specificityScore = 7 + Math.floor(Math.random() * 3);
        wordCount = 35 + Math.floor(Math.random() * 20);
      } else if (isProposerStakeholder) {
        specificityScore = 5 + Math.floor(Math.random() * 3) + Math.floor((roundNum - 1) * 0.5);
        wordCount = 25 + Math.floor(Math.random() * 15) + (roundNum - 1) * 3;
      } else {
        specificityScore = 2 + Math.floor(Math.random() * 3) + (roundNum - 1);
        wordCount = 12 + Math.floor(Math.random() * 12) + (roundNum - 1) * 5;
      }

      const crossRoles = allContrib.filter(p => p.playerId !== proposer.playerId).map(p => p.role).slice(0, crossCount);
      const benefitTexts = ['Provides budget justification', 'Delivers technical baseline', 'Addresses community priority', 'Provides compliance evidence', 'Validates revenue potential'];

      // recordPhase4Task takes (seriesIdx, task)
      store.recordPhase4Task(0, {
        taskId: botType + '_' + config.participantMix + '_r' + roundNum + '_t' + ti + '_s' + config.sessionNumber,
        taskIndex: ti,
        taskType,
        placedBy: { playerId: proposer.playerId, role: proposer.role, name: proposer.name },
        contributions,
        combinationMultiplier: mult,
        roleCount,
        baseTotal: Math.round(baseTotal * 100) / 100,
        taskTotal,
        runningTotal,
        chainPosition: String(ti + 1),
        title: ACTION_TEXTS[ti],
        description: ACTION_TEXTS[ti] + '. ' + METHOD_TEXTS[ti % METHOD_TEXTS.length] + '. ' + WHO_TEXTS[ti % WHO_TEXTS.length] + '. Outcome: ' + OUTCOME_TEXTS[ti],
        crossPerspective: crossRoles.map((r, ci) => benefitTexts[ci % benefitTexts.length] + ' for ' + r).join('. '),
        layer: ['foundation', 'activation', 'sustainability', 'foundation', 'sustainability'][ti],
        cardSelections: {
          actionCardId: 'a' + ti, actionCardText: ACTION_TEXTS[ti], actionFeatureRef: confirmedNames[0] || null,
          methodCardIds: ['m' + ti], methodCardTexts: [METHOD_TEXTS[ti % METHOD_TEXTS.length]],
          clueConnected: botType === 'random' ? false : botType === 'strategic' ? true : Math.random() > 0.4,
          clueRef: relevant.length > 0 ? relevant[0].id : null,
          whoCardId: 'w' + ti, whoCardText: WHO_TEXTS[ti % WHO_TEXTS.length],
          outcomeCardId: 'o' + ti, outcomeCardText: OUTCOME_TEXTS[ti],
          localInsightProvided: insightProvided, localInsightText: insightText,
          localInsightWordCount: insightText ? insightText.split(/\s+/).length : 0,
          localInsightSpecific: insightSpecific,
          localInsightIndicators: insightSpecific ? ['proper_noun', 'number', 'location'] : insightProvided ? ['generic'] : [],
          crossPerspectiveConnections: crossRoles.map((r, ci) => ({ targetRole: r, benefit: benefitTexts[ci % benefitTexts.length] })),
          crossPerspectiveCount: crossCount,
          customCrossProvided: false, customCrossText: null, isInnovate: false,
        },
        textMetrics: {
          specificityScore,
          investigationConnectionScore: botType === 'random' ? 0 : (botType === 'strategic' || Math.random() > 0.4) ? 1 : 0,
          stakeholderAwarenessScore: crossCount,
          layerIntegrationScore: botType === 'random' ? Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2),
          actionCompletenessScore: botType === 'random' ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 2),
          totalWordCount: wordCount,
        },
        taskStartTime: new Date(Date.now() - 60000).toISOString(),
        taskEndTime: new Date().toISOString(),
        taskDurationSeconds: 30 + Math.floor(Math.random() * 40),
      });
      await wait(delay / 3);
    }

    // Finalize Phase 4
    const thresholdValue = 35 + difficulty * 5 + Math.floor(Math.random() * 10);
    const thresholdCrossed = runningTotal >= thresholdValue;
    const transformPct = thresholdCrossed ? Math.min(Math.round((runningTotal / thresholdValue) * 50), 100) : Math.round((runningTotal / thresholdValue) * 25);

    store.finalizePhase4({
      totalTimeSeconds: 180 + Math.floor(Math.random() * 240),
      threshold: {
        baseCost: thresholdValue * 0.6,
        placemakingMultiplier: 0.83,
        difficultyModifier: difficulty * 0.25,
        finalThreshold: thresholdValue,
      },
    });
    await wait(delay);

    // --- Phase 5 ---
    const q1Rate = botType === 'random' ? 0.3 : botType === 'strategic' ? 0.95 : 0.75;
    const q2Rate = botType === 'random' ? 0.35 : botType === 'strategic' ? 0.98 : 0.8;
    const q3Rate = botType === 'random' ? 0.25 : botType === 'strategic' ? 0.95 : 0.7;
    const q1 = Math.random() < q1Rate, q2 = Math.random() < q2Rate, q3 = Math.random() < q3Rate;

    // Phase5Data: { q1_passed, q2_passed, q3_passed, sharedVisionScore, utilityPerPlayer, transformationPercent, overallPass }
    store.recordPhase5({
      q1_passed: q1,
      q2_passed: q2,
      q3_passed: q3,
      sharedVisionScore: collabScore,
      utilityPerPlayer: players.map(p => ({
        playerId: p.playerId,
        role: p.role,
        utility: 8 + Math.floor(Math.random() * 16),
      })),
      transformationPercent: transformPct,
      overallPass: q1 && q2 && q3,
    });
    await wait(delay);

    store.finalizeRound();
    runningTotal = 0;
    await wait(delay);
  }

  // ========== 4. DEBRIEF ==========
  // recordDebrief takes a single DebriefResponse per call
  const likertBase = botType === 'random' ? 2 : botType === 'strategic' ? 6 : 4;
  for (const player of players) {
    store.recordDebrief({
      playerId: player.playerId,
      roleId: player.role,
      responses: {
        q1_perspective: { questionText: 'Game helped understand other perspectives', likertValue: likertBase + Math.floor(Math.random() * 2) },
        q2_heard: { questionText: 'My role priorities were heard', likertValue: likertBase + Math.floor(Math.random() * 2) },
        q3_investigation: { questionText: 'Investigation informed planning', likertValue: likertBase + Math.floor(Math.random() * 2) },
        q4_realworld: { questionText: 'Would apply to real placemaking', likertValue: likertBase + Math.floor(Math.random() * 2) },
        q5_collaboration: { questionText: 'Collaboration felt genuine', likertValue: likertBase + Math.floor(Math.random() * 2) },
        q6_reflection: { questionText: 'Open reflection', openText: botType + '/' + config.participantMix + ' agent: Session ' + config.sessionNumber },
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ========== 5. EXPORT ==========
  const json = store.exportSession();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CG_' + botType + '_' + config.participantMix + '_s' + config.sessionNumber + '_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Verify
  const data = JSON.parse(json);
  const stakeholderCount = participantCategories.filter(c => c !== 'architecture_student').length;
  console.log('\u{1F916} EXPORTED:', a.download, '| stakeholders:', stakeholderCount + '/5');
  console.log('  profiles:', data.playerProfiles?.length, '| rounds:', data.rounds?.length);
  data.rounds?.forEach((r: any, i: number) => {
    const tasks = r.phase4?.series?.[0]?.tasks || [];
    const insights = tasks.filter((t: any) => t.cardSelections?.localInsightProvided).length;
    const specificInsights = tasks.filter((t: any) => t.cardSelections?.localInsightSpecific).length;
    console.log('  R' + (i + 1) + ': tasks:', tasks.length, '| insights:', insights + '/5', '| specific:', specificInsights + '/5', '| P5:', r.phase5?.overallPass ? 'PASS' : 'FAIL');
  });
}

// ─── Exported Convenience Functions ────────────────────────────

export async function autoPlay() {
  await simulateSession({ sessionNumber: 99, challengeSetId: 'setA', speed: 'fast', playerNames: ['Test_Admin', 'Test_Designer', 'Test_Citizen', 'Test_Advocate', 'Test_Investor'], participantMix: 'all_students' }, 'realistic');
}

export async function autoPlayRandom() {
  await simulateSession({ sessionNumber: 99, challengeSetId: 'setA', speed: 'fast', playerNames: ['Rand_Admin', 'Rand_Designer', 'Rand_Citizen', 'Rand_Advocate', 'Rand_Investor'], participantMix: 'all_students' }, 'random');
}

export async function autoPlayStrategic() {
  await simulateSession({ sessionNumber: 99, challengeSetId: 'setA', speed: 'fast', playerNames: ['Opt_Admin', 'Opt_Designer', 'Opt_Citizen', 'Opt_Advocate', 'Opt_Investor'], participantMix: 'all_students' }, 'strategic');
}

export async function autoPlayRealisticMixed() {
  await simulateSession({ sessionNumber: 99, challengeSetId: 'setA', speed: 'fast', playerNames: ['Mix_Admin', 'Mix_Designer', 'Mix_Citizen', 'Mix_Advocate', 'Mix_Investor'], participantMix: 'mixed' }, 'realistic');
}

export async function autoPlayRealisticStakeholders() {
  await simulateSession({ sessionNumber: 99, challengeSetId: 'setA', speed: 'fast', playerNames: ['Stk_Admin', 'Stk_Designer', 'Stk_Citizen', 'Stk_Advocate', 'Stk_Investor'], participantMix: 'all_stakeholders' }, 'realistic');
}

export async function autoPlayBatch(count: number, botType: BotType, startNum: number = 100, participantMix: ParticipantMix = 'all_students') {
  const sets = ['setA', 'setB', 'setC', 'setD', 'setE'];
  console.log('BATCH:', count, botType, participantMix, 'sessions from', startNum);
  for (let i = 0; i < count; i++) {
    const prefix = botType === 'random' ? 'R' : botType === 'realistic' ? 'H' : 'O';
    await simulateSession({
      sessionNumber: startNum + i,
      challengeSetId: sets[i % sets.length],
      speed: 'fast',
      playerNames: [prefix + '_Admin_' + i, prefix + '_Design_' + i, prefix + '_Citizen_' + i, prefix + '_Advoc_' + i, prefix + '_Invest_' + i],
      participantMix,
    }, botType);
    await new Promise<void>(r => setTimeout(r, 300));
  }
  console.log('BATCH COMPLETE:', count, botType, participantMix);
}

// Register on window for console access
if (typeof window !== 'undefined') {
  (window as any).autoPlay = autoPlay;
  (window as any).autoPlayRandom = autoPlayRandom;
  (window as any).autoPlayStrategic = autoPlayStrategic;
  (window as any).autoPlayRealisticMixed = autoPlayRealisticMixed;
  (window as any).autoPlayRealisticStakeholders = autoPlayRealisticStakeholders;
  (window as any).autoPlayBatch = autoPlayBatch;
}
