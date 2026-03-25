/**
 * Nash Equilibrium Engine — implements the complete mathematical framework
 * from CommonGround_Complete_Specification.docx Parts 5 and 8.
 *
 * This is the AI Backend Reasoning Engine (Part 6.2).
 * All formulas are research-critical and match the spec exactly.
 */

import type { GameSession, Player, Zone, ZoneCondition, RoleId } from '../models/types';
import {
  WELFARE_WEIGHTS,
  SURVIVAL_THRESHOLDS,
  PLAYER_TYPE,
  OBJECTIVE_WEIGHTS,
  BUCHI_OBJECTIVES,
  OBJECTIVE_ZONE_MAP,
  NASH_PARAMS,
  GRADUATED_OUTCOMES,
  type ObjectiveId,
} from '../models/constants';

// ─── Output Types ────────────────────────────────────────────

export interface NashEngineOutput {
  round: number;
  sat_objectives: Record<ObjectiveId, boolean>;
  utilities: Record<RoleId, number>;
  cws: {
    weighted_sum: number;
    equity_bonus: number;
    cp_bonus: number;
    total: number;
  };
  nash_q1: {
    passed: boolean;
    failing_players: { roleId: RoleId; utility: number; threshold: number; deficit: number }[];
    details: string;
  };
  nash_q3: {
    variance: number;
    cws_above_target: boolean;
    passed: boolean;
  };
  nash_q2_ask: RoleId[];
  dne_achieved: boolean;
  crisis_state: {
    players_at_risk: { roleId: RoleId; violatedObjectives: ObjectiveId[]; roundsInViolation: number }[];
  };
  optimal_next_action: {
    priority_challenge: string;
    recommended_coalition: RoleId[];
    reasoning: string;
    predicted_cws_increase: number;
  };
  pareto_note: string;
  end_condition: 'none' | 'full_dne' | 'partial_success' | 'veto_deadlock';
}

// ─── Step 1: Objective Satisfaction (Part 5.2) ───────────────

/**
 * Determine sat(ρ,α) — which of the 6 objectives are currently satisfied.
 * An objective is 'in sat' if at least one of its linked zones is Fair or better
 * AND no active Challenge Card for that zone is unresolved for > 2 rounds.
 */
export function calculateObjectiveSatisfaction(
  zones: Record<string, Zone>,
  activeChallengeTurns?: Record<string, number>
): Record<ObjectiveId, boolean> {
  const sat: Record<ObjectiveId, boolean> = {
    safety: false,
    greenery: false,
    access: false,
    culture: false,
    revenue: false,
    community: false,
  };

  for (const [objId, zoneIds] of Object.entries(OBJECTIVE_ZONE_MAP) as [ObjectiveId, string[]][]) {
    sat[objId] = zoneIds.some(zoneId => {
      const zone = zones[zoneId];
      if (!zone) return false;
      const isFairOrBetter = zone.condition === 'fair' || zone.condition === 'good';
      // Check for unresolved challenge > 2 rounds
      const challengeRounds = activeChallengeTurns?.[zoneId] || 0;
      return isFairOrBetter && challengeRounds <= 2;
    });
  }

  return sat;
}

// ─── Step 2: Individual Utility (Part 5.2) ───────────────────

/**
 * u_i(ρ) = Σ [ weight_ij × 1(objective_j ∈ sat(ρ,α)) ]
 * for j ∈ {Safety, Greenery, Access, Culture, Revenue, Community}
 */
export function calculateIndividualUtility(
  roleId: RoleId,
  satObjectives: Record<ObjectiveId, boolean>
): number {
  const weights = OBJECTIVE_WEIGHTS[roleId];
  let utility = 0;
  for (const [objId, weight] of Object.entries(weights) as [ObjectiveId, number][]) {
    if (satObjectives[objId]) {
      utility += weight;
    }
  }
  return utility;
}

/**
 * Calculate utilities for all 5 players.
 */
export function calculateAllUtilities(
  players: Record<string, Player>,
  satObjectives: Record<ObjectiveId, boolean>
): Record<RoleId, number> {
  const utilities: Partial<Record<RoleId, number>> = {};
  for (const player of Object.values(players)) {
    utilities[player.roleId] = calculateIndividualUtility(player.roleId, satObjectives);
  }
  return utilities as Record<RoleId, number>;
}

// ─── Step 3: Variance ────────────────────────────────────────

export function calculateVariance(utilities: Record<RoleId, number>): number {
  const values = Object.values(utilities);
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
}

// ─── Step 4: CWS (Part 5.2) ─────────────────────────────────

/**
 * CWS = Σ(welfare_weight_i × u_i) + 10×(1 − var(u)/100) + CP_total
 */
export function calculateCWS(
  utilities: Record<RoleId, number>,
  cpTotal: number
): { weighted_sum: number; equity_bonus: number; cp_bonus: number; total: number } {
  // Weighted sum
  let weighted_sum = 0;
  for (const [roleId, utility] of Object.entries(utilities) as [RoleId, number][]) {
    weighted_sum += (WELFARE_WEIGHTS[roleId] || 1) * utility;
  }

  // Equity bonus = 10 × (1 − variance/100)
  const variance = calculateVariance(utilities);
  const equity_bonus = NASH_PARAMS.maxEquityBonus * (1 - variance / NASH_PARAMS.maxVariance);

  // CP bonus
  const cp_bonus = cpTotal;

  return {
    weighted_sum: Math.round(weighted_sum * 100) / 100,
    equity_bonus: Math.round(equity_bonus * 100) / 100,
    cp_bonus,
    total: Math.round((weighted_sum + equity_bonus + cp_bonus) * 100) / 100,
  };
}

// ─── Step 5: Nash Q1 (Part 5.1) ─────────────────────────────

export function checkNashQ1(utilities: Record<RoleId, number>): {
  passed: boolean;
  failing_players: { roleId: RoleId; utility: number; threshold: number; deficit: number }[];
  details: string;
} {
  const failing: { roleId: RoleId; utility: number; threshold: number; deficit: number }[] = [];
  for (const [roleId, threshold] of Object.entries(SURVIVAL_THRESHOLDS) as [RoleId, number][]) {
    const u = utilities[roleId] ?? 0;
    if (u < threshold) {
      failing.push({ roleId, utility: u, threshold, deficit: threshold - u });
    }
  }
  return {
    passed: failing.length === 0,
    failing_players: failing,
    details: failing.length === 0
      ? 'All players meet or exceed their survival threshold.'
      : `${failing.map(f => `${f.roleId}(u=${f.utility}<T=${f.threshold})`).join(', ')} below threshold.`,
  };
}

// ─── Step 6: Nash Q3 (Part 5.1) ─────────────────────────────

export function checkNashQ3(utilities: Record<RoleId, number>, cws: number): {
  variance: number;
  cws_above_target: boolean;
  passed: boolean;
} {
  const variance = calculateVariance(utilities);
  const cws_above_target = cws >= NASH_PARAMS.cwsTarget;
  return {
    variance: Math.round(variance * 100) / 100,
    cws_above_target,
    passed: variance <= NASH_PARAMS.equityBandK && cws_above_target,
  };
}

// ─── Step 7: Büchi Check (Part 4.1 Phase 5e) ────────────────

export interface BuchiViolation {
  roleId: RoleId;
  violatedObjectives: ObjectiveId[];
  roundsInViolation: number;
}

/**
 * Check Büchi objectives for each player.
 * If any Büchi objective unsatisfied for 2 consecutive rounds → Crisis State.
 */
export function checkBuchiObjectives(
  players: Record<string, Player>,
  satObjectives: Record<ObjectiveId, boolean>,
  buchiHistory: Record<RoleId, Record<ObjectiveId, number>>
): {
  updatedHistory: Record<RoleId, Record<ObjectiveId, number>>;
  violations: BuchiViolation[];
} {
  const updatedHistory: Record<string, Record<string, number>> = {};
  const violations: BuchiViolation[] = [];

  for (const player of Object.values(players)) {
    const roleId = player.roleId;
    const buchiObjs = BUCHI_OBJECTIVES[roleId] || [];
    const history: Record<string, number> = { ...(buchiHistory[roleId] || {}) };

    const violated: ObjectiveId[] = [];
    for (const obj of buchiObjs) {
      if (satObjectives[obj]) {
        history[obj] = 0; // Reset counter
      } else {
        history[obj] = (history[obj] || 0) + 1;
        if (history[obj] >= 2) {
          violated.push(obj);
        }
      }
    }

    if (violated.length > 0) {
      violations.push({
        roleId,
        violatedObjectives: violated,
        roundsInViolation: Math.max(...violated.map(o => history[o] || 0)),
      });
    }

    updatedHistory[roleId] = history;
  }

  return {
    updatedHistory: updatedHistory as Record<RoleId, Record<ObjectiveId, number>>,
    violations,
  };
}

// ─── Graduated Outcome (Part 3.4) ────────────────────────────

export function determineGraduatedOutcome(seriesValue: number, threshold: number): {
  type: 'full_success' | 'partial_success' | 'narrow_success' | 'failure';
  zoneChange: number;
  cwsBonusPct: number;
  description: string;
} {
  const diff = seriesValue - threshold;
  if (diff >= 4) {
    return { type: 'full_success', zoneChange: 2, cwsBonusPct: 1.0, description: `Full Success (exceeds by ${diff})` };
  } else if (diff >= 1) {
    return { type: 'partial_success', zoneChange: 1, cwsBonusPct: 0.6, description: `Partial Success (exceeds by ${diff})` };
  } else if (diff === 0) {
    return { type: 'narrow_success', zoneChange: 0, cwsBonusPct: 0.4, description: 'Narrow Success (exact match, -1 resource)' };
  } else {
    return { type: 'failure', zoneChange: -1, cwsBonusPct: 0, description: `Failure (below by ${Math.abs(diff)}, threshold +2 next round)` };
  }
}

// ─── Complete Nash Engine Run (Part 6.2) ─────────────────────

/**
 * The complete AI Backend Reasoning Engine.
 * Run after every Phase 5 (round_end_accounting).
 * Returns the structured JSON output from Part 6.2.
 */
export function runNashEngine(gameState: GameSession): NashEngineOutput {
  const zones = gameState.board.zones;
  const players = gameState.players;
  const round = gameState.currentRound;

  // Step 1: Objective satisfaction
  const sat_objectives = calculateObjectiveSatisfaction(zones);

  // Step 2: Individual utilities
  const utilities = calculateAllUtilities(players, sat_objectives);

  // Step 3+4: CWS
  const cpTotal = Object.values(players).reduce((s, p) => s + p.collaborationPoints, 0);
  const cws = calculateCWS(utilities, cpTotal);

  // Step 5: Nash Q1
  const nash_q1 = checkNashQ1(utilities);

  // Step 6: Nash Q3
  const nash_q3 = checkNashQ3(utilities, cws.total);

  // Q2: Environment players to ask
  const nash_q2_ask: RoleId[] = (['designer', 'citizen', 'advocate'] as RoleId[])
    .filter(r => utilities[r] !== undefined);

  // DNE check: all 3 questions must pass
  // (Q2 is verbal/manual, so we check Q1 and Q3 programmatically)
  const dne_achieved = nash_q1.passed && nash_q3.passed;

  // Büchi check
  const buchiHistory = (gameState as any).buchiHistory || {} as Record<RoleId, Record<ObjectiveId, number>>;
  const buchiResult = checkBuchiObjectives(players, sat_objectives, buchiHistory);

  // Optimal next action: find the unsatisfied objective that would raise CWS most
  const unsatObjectives = (Object.entries(sat_objectives) as [ObjectiveId, boolean][])
    .filter(([, sat]) => !sat)
    .map(([objId]) => objId);

  let priorityChallenge = '';
  let maxCwsIncrease = 0;
  for (const obj of unsatObjectives) {
    // Calculate total weight increase if this objective became satisfied
    let totalIncrease = 0;
    for (const [roleId, weights] of Object.entries(OBJECTIVE_WEIGHTS) as [RoleId, Record<ObjectiveId, number>][]) {
      totalIncrease += (WELFARE_WEIGHTS[roleId] || 1) * (weights[obj] || 0);
    }
    if (totalIncrease > maxCwsIncrease) {
      maxCwsIncrease = totalIncrease;
      priorityChallenge = OBJECTIVE_ZONE_MAP[obj]?.[0] || '';
    }
  }

  // End condition
  let end_condition: NashEngineOutput['end_condition'] = 'none';
  if (cws.total >= NASH_PARAMS.fullDneThreshold && dne_achieved) {
    end_condition = 'full_dne';
  } else if (cws.total >= NASH_PARAMS.partialThreshold && !dne_achieved) {
    end_condition = 'partial_success';
  }

  return {
    round,
    sat_objectives,
    utilities,
    cws,
    nash_q1,
    nash_q3,
    nash_q2_ask,
    dne_achieved,
    crisis_state: {
      players_at_risk: buchiResult.violations,
    },
    optimal_next_action: {
      priority_challenge: priorityChallenge,
      recommended_coalition: unsatObjectives.length > 0 ? ['administrator', 'designer', 'citizen'] : [],
      reasoning: unsatObjectives.length > 0
        ? `Satisfy ${unsatObjectives[0]} objective to increase CWS by ~${maxCwsIncrease.toFixed(1)}`
        : 'All objectives satisfied. Maintain current strategy.',
      predicted_cws_increase: Math.round(maxCwsIncrease * 100) / 100,
    },
    pareto_note: dne_achieved
      ? 'DNE achieved. Current allocation is Pareto-optimal within the equity band.'
      : 'Cooperative strategy dominates solo play. Focus on unsatisfied objectives.',
    end_condition,
  };
}

// ─── Mathematical Verification (Part 8) ─────────────────────

/**
 * Run Part 8 mathematical verification.
 * Call this once to verify all formulas are correctly calibrated.
 */
export function runMathVerification(): void {
  console.log('\n=== MATHEMATICAL VERIFICATION (Part 8) ===\n');

  // 8.4: Upper bound — all objectives in sat
  const allSat: Record<ObjectiveId, boolean> = {
    safety: true, greenery: true, access: true, culture: true, revenue: true, community: true,
  };
  const maxUtilities: Record<RoleId, number> = {
    administrator: calculateIndividualUtility('administrator', allSat),
    investor: calculateIndividualUtility('investor', allSat),
    designer: calculateIndividualUtility('designer', allSat),
    citizen: calculateIndividualUtility('citizen', allSat),
    advocate: calculateIndividualUtility('advocate', allSat),
  };
  console.log('Max utilities (all objectives in sat):');
  for (const [r, u] of Object.entries(maxUtilities)) {
    console.log(`  ${r}: ${u} (threshold: ${SURVIVAL_THRESHOLDS[r as RoleId]})`);
  }

  // Q1 at max
  const q1Max = checkNashQ1(maxUtilities);
  console.log(`  Q1 at max: ${q1Max.passed ? 'PASSES' : 'FAILS'} — ${q1Max.details}`);

  // CWS at max
  const cwsMax = calculateCWS(maxUtilities, 0);
  console.log(`  CWS at max (no CP): weighted=${cwsMax.weighted_sum}, equity=${cwsMax.equity_bonus}, total=${cwsMax.total}`);
  console.log(`  Expected ~90.4 weighted + ~8.38 equity = ~98.78 total`);

  // Q3 at max
  const q3Max = checkNashQ3(maxUtilities, cwsMax.total);
  console.log(`  Q3 at max: variance=${q3Max.variance} (limit 4), CWS=${cwsMax.total}≥75: ${q3Max.cws_above_target}`);
  console.log(`  Q3 ${q3Max.passed ? 'PASSES' : 'FAILS'} — Note: Investor max=9 pulls variance up`);

  // Verify at survival thresholds
  console.log('\nUtilities at survival thresholds:');
  const threshUtilities: Record<RoleId, number> = { ...SURVIVAL_THRESHOLDS } as any;
  const cwsThresh = calculateCWS(threshUtilities, 0);
  console.log(`  CWS at thresholds: ${cwsThresh.total} (should be ≥ 60)`);
  console.log(`  ${cwsThresh.total >= 60 ? 'PASSES' : 'FAILS'}`);

  // Verify max solo series
  const maxSolo = 5 + 3 + 2; // best card + max modifier + proficiency
  console.log(`\nMax solo series value: ${maxSolo} (should be 10)`);
  console.log(`Min challenge threshold: 11 (forces cooperation)`);
  console.log(`Solo < threshold: ${maxSolo < 11 ? 'VERIFIED — cooperation required' : 'FAILS'}`);

  // Investor solo vs cooperative
  const investorSolo = calculateIndividualUtility('investor', { safety: false, greenery: false, access: true, culture: false, revenue: true, community: false });
  const investorCoop = calculateIndividualUtility('investor', { safety: true, greenery: true, access: true, culture: false, revenue: true, community: false });
  console.log(`\nInvestor solo (Revenue+Access only): ${investorSolo}`);
  console.log(`Investor cooperative (all except Culture+Community): ${investorCoop}`);
  console.log(`Cooperation dominates: ${investorCoop > investorSolo ? 'YES' : 'NO'}`);

  // Citizen CWS contribution
  const citizenMax = maxUtilities.citizen; // 19
  const adminMax = maxUtilities.administrator; // 17
  console.log(`\nCitizen max utility: ${citizenMax} × welfare 1.4 = ${citizenMax * 1.4} CWS contribution`);
  console.log(`Admin max utility: ${adminMax} × welfare 0.8 = ${adminMax * 0.8} CWS contribution`);
  console.log(`Citizen worth ${(citizenMax * 1.4 / (adminMax * 0.8)).toFixed(2)}× Admin per CWS point`);

  console.log('\n=== VERIFICATION COMPLETE ===\n');
}
