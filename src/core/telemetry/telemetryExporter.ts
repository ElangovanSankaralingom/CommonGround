import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { GameSession, TelemetryEvent, Player, RoleId } from '../models/types';
import { WELFARE_WEIGHTS } from '../models/constants';

export class TelemetryExporter {
  /**
   * Export complete game state as a JSON file download.
   */
  exportJSON(gameState: GameSession): void {
    const json = JSON.stringify(gameState, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `commonground_session_${gameState.id}.json`);
  }

  /**
   * Generate session summary CSV content.
   * Columns: session_id, site_name, created_at, total_rounds, rounds_played,
   *          final_cws, target_cws, result, player_count, duration_estimate
   */
  generateSessionSummaryCSV(gameState: GameSession): string {
    const row = {
      session_id: gameState.id,
      site_name: gameState.siteName,
      created_at: gameState.createdAt,
      total_rounds: gameState.totalRounds,
      rounds_played: gameState.currentRound,
      final_cws: gameState.cwsTracker.currentScore,
      target_cws: gameState.cwsTracker.targetScore,
      result: gameState.endResult?.type || 'in_progress',
      player_count: Object.keys(gameState.players).length,
      facilitator_mode: gameState.config.facilitatorMode,
      deliberation_timer_seconds: gameState.config.deliberationTimerSeconds,
      difficulty_escalation: gameState.config.difficultyEscalation,
      gini_coefficient: gameState.endResult?.giniCoefficient ?? '',
      nash_equilibrium_approx: gameState.endResult?.nashEquilibriumApprox ?? '',
      pareto_optimal: gameState.endResult?.paretoOptimal ?? '',
    };

    return Papa.unparse([row]);
  }

  /**
   * Generate player summary CSV content.
   * One row per player with final stats.
   */
  generatePlayerSummaryCSV(gameState: GameSession): string {
    const rows = Object.values(gameState.players).map((player: Player) => {
      const endResult = gameState.endResult?.playerResults.find(
        (r) => r.playerId === player.id
      );

      return {
        session_id: gameState.id,
        player_id: player.id,
        player_name: player.name,
        role_id: player.roleId,
        welfare_weight: WELFARE_WEIGHTS[player.roleId] || 1.0,
        final_level: player.level,
        final_cp: player.collaborationPoints,
        final_utility: player.utilityScore,
        final_budget: player.resources.budget,
        final_influence: player.resources.influence,
        final_volunteer: player.resources.volunteer,
        final_material: player.resources.material,
        final_knowledge: player.resources.knowledge,
        survival_goal_met: endResult?.survivalGoalMet ?? !player.crisisState,
        character_goal_progress: endResult?.characterGoalProgress ?? calculateGoalProgress(player, 'character'),
        mission_goal_progress: endResult?.missionGoalProgress ?? calculateGoalProgress(player, 'mission'),
        focus_zone: player.focusZoneId,
        crisis_state: player.crisisState,
        unique_ability_uses_remaining: player.uniqueAbilityUsesRemaining,
      };
    });

    return Papa.unparse(rows);
  }

  /**
   * Generate round scores CSV content.
   * One row per round with CWS breakdown.
   */
  generateRoundScoresCSV(gameState: GameSession): string {
    const rows = gameState.cwsTracker.history.map((entry) => {
      const breakdown = entry.breakdown;
      const row: Record<string, any> = {
        session_id: gameState.id,
        round: entry.round,
        cws_score: entry.score,
        equity_bonus: breakdown.equityBonus,
        collaboration_bonus: breakdown.collaborationBonus,
        total_round_contribution: breakdown.totalRoundContribution,
      };

      // Add per-player weighted utilities
      for (const wu of breakdown.weightedUtilities) {
        const player = gameState.players[wu.playerId];
        const roleName = player?.roleId || wu.playerId;
        row[`${roleName}_utility`] = wu.utility;
        row[`${roleName}_weighted`] = wu.weighted;
      }

      return row;
    });

    return Papa.unparse(rows);
  }

  /**
   * Generate actions CSV from telemetry events.
   * Filters for card_played, series_*, combination_*, unique_ability_used, player_passed.
   */
  generateActionsCSV(events: TelemetryEvent[]): string {
    const actionTypes: Set<string> = new Set([
      'card_played', 'card_discarded', 'card_drawn',
      'series_started', 'series_contributed', 'series_completed', 'series_failed',
      'combination_started', 'combination_contributed', 'combination_completed', 'combination_failed',
      'unique_ability_used', 'player_passed',
      'standee_moved',
    ]);

    const rows = events
      .filter((e) => actionTypes.has(e.eventType))
      .map((e) => ({
        event_id: e.id,
        session_id: e.sessionId,
        timestamp: e.timestamp,
        round: e.round,
        phase: e.phase,
        event_type: e.eventType,
        actor_id: e.actorId,
        actor_role: e.actorRole,
        card_id: e.data.cardId || '',
        card_name: e.data.cardName || '',
        target_zone: e.data.targetZoneId || e.data.to || '',
        details: JSON.stringify(e.data),
      }));

    return Papa.unparse(rows);
  }

  /**
   * Generate trades CSV from telemetry events.
   */
  generateTradesCSV(events: TelemetryEvent[]): string {
    const tradeTypes: Set<string> = new Set([
      'trade_proposed', 'trade_accepted', 'trade_rejected', 'trade_completed', 'trade_card_used',
    ]);

    const rows = events
      .filter((e) => tradeTypes.has(e.eventType))
      .map((e) => ({
        event_id: e.id,
        session_id: e.sessionId,
        timestamp: e.timestamp,
        round: e.round,
        phase: e.phase,
        event_type: e.eventType,
        proposer_id: e.data.proposerId || e.actorId,
        target_id: e.data.targetId || '',
        trade_id: e.data.tradeId || '',
        offering: JSON.stringify(e.data.offering || {}),
        requesting: JSON.stringify(e.data.requesting || {}),
      }));

    return Papa.unparse(rows);
  }

  /**
   * Generate challenges CSV from telemetry events.
   */
  generateChallengesCSV(events: TelemetryEvent[]): string {
    const challengeTypes: Set<string> = new Set([
      'challenge_drawn', 'challenge_resolved', 'challenge_failed', 'challenge_escalated',
    ]);

    const rows = events
      .filter((e) => challengeTypes.has(e.eventType))
      .map((e) => ({
        event_id: e.id,
        session_id: e.sessionId,
        timestamp: e.timestamp,
        round: e.round,
        event_type: e.eventType,
        challenge_id: e.data.challengeId || '',
        challenge_name: e.data.challengeName || '',
        difficulty: e.data.difficulty || '',
        affected_zones: JSON.stringify(e.data.affectedZoneIds || []),
        series_value: e.data.seriesValue || '',
        outcome: e.data.outcome || '',
        details: JSON.stringify(e.data),
      }));

    return Papa.unparse(rows);
  }

  /**
   * Generate zone conditions CSV from telemetry events.
   */
  generateZoneConditionsCSV(events: TelemetryEvent[]): string {
    const zoneTypes: Set<string> = new Set([
      'zone_condition_changed', 'resource_regenerated', 'resource_drained',
    ]);

    const rows = events
      .filter((e) => zoneTypes.has(e.eventType))
      .map((e) => ({
        event_id: e.id,
        session_id: e.sessionId,
        timestamp: e.timestamp,
        round: e.round,
        phase: e.phase,
        event_type: e.eventType,
        zone_id: e.data.zoneId || '',
        previous_condition: e.data.previousCondition || '',
        new_condition: e.data.newCondition || '',
        details: JSON.stringify(e.data),
      }));

    return Papa.unparse(rows);
  }

  /**
   * Generate equity prompts CSV from telemetry events.
   */
  generateEquityPromptsCSV(events: TelemetryEvent[]): string {
    const equityTypes: Set<string> = new Set([
      'equity_prompt_triggered', 'equity_prompt_responded',
    ]);

    const rows = events
      .filter((e) => equityTypes.has(e.eventType))
      .map((e) => ({
        event_id: e.id,
        session_id: e.sessionId,
        timestamp: e.timestamp,
        round: e.round,
        phase: e.phase,
        event_type: e.eventType,
        actor_id: e.actorId,
        actor_role: e.actorRole,
        prompt_text: e.data.promptText || '',
        response: e.data.response || '',
        utility_gap: e.data.utilityGap || '',
        details: JSON.stringify(e.data),
      }));

    return Papa.unparse(rows);
  }

  /**
   * Generate all events CSV (complete telemetry log).
   */
  generateEventsCSV(events: TelemetryEvent[]): string {
    const rows = events.map((e) => ({
      event_id: e.id,
      session_id: e.sessionId,
      timestamp: e.timestamp,
      round: e.round,
      phase: e.phase,
      event_type: e.eventType,
      actor_id: e.actorId,
      actor_role: e.actorRole,
      data: JSON.stringify(e.data),
    }));

    return Papa.unparse(rows);
  }

  /**
   * Download all CSV files for the game session.
   */
  downloadAllCSVs(gameState: GameSession): void {
    const prefix = `commonground_${gameState.id}`;
    const events = gameState.telemetry;

    const csvFiles: { name: string; content: string }[] = [
      { name: `${prefix}_session_summary.csv`, content: this.generateSessionSummaryCSV(gameState) },
      { name: `${prefix}_player_summary.csv`, content: this.generatePlayerSummaryCSV(gameState) },
      { name: `${prefix}_round_scores.csv`, content: this.generateRoundScoresCSV(gameState) },
      { name: `${prefix}_actions.csv`, content: this.generateActionsCSV(events) },
      { name: `${prefix}_trades.csv`, content: this.generateTradesCSV(events) },
      { name: `${prefix}_challenges.csv`, content: this.generateChallengesCSV(events) },
      { name: `${prefix}_zone_conditions.csv`, content: this.generateZoneConditionsCSV(events) },
      { name: `${prefix}_equity_prompts.csv`, content: this.generateEquityPromptsCSV(events) },
      { name: `${prefix}_events.csv`, content: this.generateEventsCSV(events) },
    ];

    for (const file of csvFiles) {
      const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, file.name);
    }
  }
}

// ─── Helper ───────────────────────────────────────────────────

function calculateGoalProgress(player: Player, tier: 'character' | 'mission'): number {
  const goalTier = player.goals[tier];
  const satisfiedWeight = goalTier.subGoals
    .filter((sg) => sg.satisfied)
    .reduce((sum, sg) => sum + sg.weight, 0);
  return goalTier.totalWeight > 0 ? satisfiedWeight / goalTier.totalWeight : 0;
}
