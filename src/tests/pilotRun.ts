/**
 * COMMONGROUND PILOT RUN — Simulates a complete 3-round game with 5 players.
 * Tests the entire game loop end-to-end through the engine layer (no UI).
 *
 * Run with: npx tsx src/tests/pilotRun.ts
 */

import { initializeGame } from '../core/engine/gameInitializer';
import { startPhase, endPhase, processPhaseAction, isPhaseComplete, resolveCoalitions } from '../core/engine/phaseController';
import { calculateTurnOrder, getCurrentPlayer, advanceToNextPlayer, haveAllPlayersActed } from '../core/engine/turnManager';
import type { GameSession, GamePhase, Player, ResourcePool, RoleId } from '../core/models/types';
import { PROFESSION_INCOME, EVENT_TABLE } from '../core/models/constants';

let errors = 0;
let warnings = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    errors++;
  }
}

function log(msg: string) {
  console.log(msg);
}

function logPlayerResources(session: GameSession) {
  for (const p of Object.values(session.players)) {
    const r = p.resources;
    const total = r.budget + r.influence + r.volunteer + r.material + r.knowledge;
    log(`    ${p.roleId.padEnd(14)} B:${r.budget} I:${r.influence} V:${r.volunteer} M:${r.material} K:${r.knowledge} (total:${total}) utility:${p.utilityScore}`);
  }
}

function runPilotGame() {
  log('=== COMMONGROUND PILOT RUN ===\n');

  // ── 1. Create session ──────────────────────────────────────
  log('1. Creating game session...');
  let session: GameSession;
  try {
    session = initializeGame(
      {
        totalRounds: 3,
        deliberationTimerSeconds: 10,
        facilitatorMode: 'ai',
        cwsTarget: 50,
        equityBandK: 0.15,
        difficultyEscalation: 1,
        enableTutorial: false,
        siteId: 'eco_park',
      },
      [
        { name: 'Alice', roleId: 'administrator' },
        { name: 'Bob', roleId: 'designer' },
        { name: 'Charlie', roleId: 'citizen' },
        { name: 'Diana', roleId: 'investor' },
        { name: 'Eve', roleId: 'advocate' },
      ]
    );
  } catch (e: any) {
    console.error('FATAL: Failed to create game session:', e.message);
    process.exit(1);
  }

  assert(session.id.length > 0, 'Session ID exists');
  assert(Object.keys(session.players).length === 5, '5 players created');
  assert(Object.keys(session.board.zones).length >= 10, '10+ zones on board');
  assert(session.gameLevel === 1, 'Game starts at level 1');
  assert(session.currentRound === 1, 'Starts at round 1');
  log(`  Session: ${session.id}`);
  log(`  Players: ${Object.values(session.players).map(p => `${p.name}(${p.roleId})`).join(', ')}`);
  log(`  Zones: ${Object.keys(session.board.zones).length}`);
  log(`  CWS Target: ${session.cwsTracker.targetScore}`);
  log('');

  // ── 2. Verify initial player state ─────────────────────────
  log('2. Verifying initial player state...');
  for (const player of Object.values(session.players)) {
    assert(player.level === 1, `${player.roleId} starts at level 1`);
    assert(player.hand.length > 0, `${player.roleId} has cards in hand`);
    assert(player.drawPile.length > 0, `${player.roleId} has draw pile`);
    const totalRes = player.resources.budget + player.resources.influence + player.resources.volunteer + player.resources.material + player.resources.knowledge;
    assert(totalRes > 0, `${player.roleId} has resources (total: ${totalRes})`);
  }
  logPlayerResources(session);
  log('');

  // ── 3. Verify Common Pool Zones ────────────────────────────
  log('3. Verifying Common Pool Zones...');
  const commonPoolZones = Object.values(session.board.zones).filter(z => z.poolType === 'common');
  assert(commonPoolZones.length === 3, `3 common pool zones (found: ${commonPoolZones.length})`);
  for (const z of commonPoolZones) {
    assert(!!z.commonPoolConfig, `${z.id} has commonPoolConfig`);
    log(`  ${z.id}: tokenName=${z.commonPoolConfig?.tokenName}, autoIncome=${z.commonPoolConfig?.autoIncomePerRound}`);
  }
  log('');

  // ── 4. Simulate 3 rounds ───────────────────────────────────
  for (let round = 1; round <= 3; round++) {
    log(`\n${'='.repeat(60)}`);
    log(`ROUND ${round}`);
    log(`${'='.repeat(60)}`);

    // ── Phase 1: Payment Day ────────────────────────────────
    log('\n--- Phase 1: Payment Day ---');
    const prevResources: Record<string, number> = {};
    for (const p of Object.values(session.players)) {
      prevResources[p.id] = p.resources.budget + p.resources.influence + p.resources.volunteer + p.resources.material + p.resources.knowledge;
    }

    session = startPhase(session, 'payment_day');
    assert(session.currentPhase === 'payment_day', 'Phase is payment_day');

    // Verify income was applied
    let anyIncomeReceived = false;
    for (const p of Object.values(session.players)) {
      const newTotal = p.resources.budget + p.resources.influence + p.resources.volunteer + p.resources.material + p.resources.knowledge;
      if (newTotal > prevResources[p.id]) anyIncomeReceived = true;
    }
    assert(anyIncomeReceived, 'At least one player received income');
    log('  Resources after Payment Day:');
    logPlayerResources(session);

    // Verify common pool auto-income
    for (const z of Object.values(session.board.zones)) {
      if (z.poolType === 'common' && z.commonPoolConfig) {
        const rt = z.commonPoolConfig.resourceType;
        assert(z.resources[rt] >= 0, `${z.id} pool resource >= 0`);
      }
    }

    // Advance to event_roll
    const payResult = endPhase(session);
    session = payResult.gameState;
    assert(payResult.nextPhase === 'event_roll', `After payment_day → event_roll (got: ${payResult.nextPhase})`);

    // ── Phase 2: Event Roll ─────────────────────────────────
    log('\n--- Phase 2: Event Roll ---');
    session = startPhase(session, 'event_roll');

    assert(session.eventRollResult !== null, 'Event roll result exists');
    if (session.eventRollResult) {
      const er = session.eventRollResult;
      assert(er.dice[0] >= 1 && er.dice[0] <= 6, 'Die 1 in range');
      assert(er.dice[1] >= 1 && er.dice[1] <= 6, 'Die 2 in range');
      assert(er.total === er.dice[0] + er.dice[1], 'Dice sum correct');
      assert(er.total >= 2 && er.total <= 12, 'Total in 2-12 range');
      assert(!!er.eventEntry, 'Event entry found');
      assert(!!er.eventEntry.name, 'Event has a name');
      assert(['individual_only', 'deliberation_partial', 'deliberation_all'].includes(er.phaseTriggered), 'Valid phase trigger');
      log(`  Roll: ${er.dice[0]}+${er.dice[1]}=${er.total}`);
      log(`  Event: ${er.eventEntry.name}`);
      log(`  Phase triggered: ${er.phaseTriggered}`);
      log(`  Zone effect: ${er.eventEntry.zoneEffect}`);
      log(`  Player effect: ${er.eventEntry.playerEffect}`);
    }

    // Advance from event_roll
    const eventResult = endPhase(session);
    session = eventResult.gameState;
    const eventNextPhase = eventResult.nextPhase;
    log(`  Next phase: ${eventNextPhase}`);

    // ── Phase 3/4: Deliberation (if triggered) ──────────────
    if (eventNextPhase === 'deliberation') {
      log('\n--- Phase 3: Deliberation (triggered by event) ---');
      session = startPhase(session, 'deliberation');
      assert(session.currentPhase === 'deliberation', 'Phase is deliberation');

      // End deliberation immediately (AI mode)
      const delibResult = endPhase(session);
      session = delibResult.gameState;
      log(`  Deliberation ended. Next: ${delibResult.nextPhase}`);
      assert(delibResult.nextPhase === 'individual_action', 'After deliberation → individual_action');
    }

    // ── Phase 3: Individual Action ──────────────────────────
    log('\n--- Phase 3: Individual Action ---');
    session = startPhase(session, 'individual_action');
    assert(session.currentPhase === 'individual_action', 'Phase is individual_action');
    assert(session.turnOrder.length === 5, '5 players in turn order');

    // Each player passes (draws 2 cards) — simplest valid action
    for (let turnIdx = 0; turnIdx < session.turnOrder.length; turnIdx++) {
      const pid = session.turnOrder[turnIdx];
      const player = session.players[pid];
      assert(!!player, `Turn ${turnIdx}: player exists`);
      log(`  Turn ${turnIdx + 1}: ${player.roleId} (${player.name}) — passes`);

      // Simulate pass: draw cards
      const drawPile = [...player.drawPile];
      const hand = [...player.hand];
      const drawn: typeof hand = [];
      if (drawPile.length >= 2) {
        drawn.push(drawPile.shift()!);
        drawn.push(drawPile.shift()!);
      } else if (drawPile.length === 1) {
        drawn.push(drawPile.shift()!);
      }
      const updatedPlayers = { ...session.players };
      updatedPlayers[pid] = {
        ...player,
        hand: [...hand, ...drawn],
        drawPile,
        passedIndividualAction: true,
        cardsPlayedThisRound: 0,
      };
      session = { ...session, players: updatedPlayers };
      session = advanceToNextPlayer(session);
    }

    assert(haveAllPlayersActed(session), 'All players have acted');

    // Advance to action_resolution
    const iaResult = endPhase(session);
    session = iaResult.gameState;
    log(`  All acted. Next: ${iaResult.nextPhase}`);
    assert(iaResult.nextPhase === 'action_resolution', `After individual_action → action_resolution (got: ${iaResult.nextPhase})`);

    // ── Phase 5: Action Resolution ──────────────────────────
    log('\n--- Phase 5: Action Resolution ---');
    session = startPhase(session, 'action_resolution');
    assert(session.currentPhase === 'action_resolution', 'Phase is action_resolution');

    // No coalitions to resolve in this simple test
    const arResult = endPhase(session);
    session = arResult.gameState;
    assert(arResult.nextPhase === 'round_end_accounting', `After action_resolution → round_end_accounting (got: ${arResult.nextPhase})`);

    // ── Phase 6: Round-End Accounting ───────────────────────
    log('\n--- Phase 6: Round-End Accounting ---');
    const cwsBefore = session.cwsTracker.currentScore;
    session = startPhase(session, 'round_end_accounting');
    assert(session.currentPhase === 'round_end_accounting', 'Phase is round_end_accounting');
    const cwsAfter = session.cwsTracker.currentScore;
    log(`  CWS: ${cwsBefore} -> ${cwsAfter} (delta: ${cwsAfter - cwsBefore})`);
    assert(cwsAfter >= 0, 'CWS is non-negative');

    // Verify resources are non-negative
    for (const p of Object.values(session.players)) {
      for (const [key, val] of Object.entries(p.resources)) {
        assert(val >= 0, `${p.roleId}.${key} >= 0 (got: ${val})`);
      }
    }
    logPlayerResources(session);

    // Verify common pool decay
    for (const z of Object.values(session.board.zones)) {
      if (z.poolType === 'common') {
        assert(z.resources[z.commonPoolConfig!.resourceType] >= 0, `${z.id} pool resource non-negative after decay`);
      }
    }

    const reaResult = endPhase(session);
    session = reaResult.gameState;
    assert(reaResult.nextPhase === 'level_check', `After round_end_accounting → level_check (got: ${reaResult.nextPhase})`);

    // ── Phase 7: Level Check ────────────────────────────────
    log('\n--- Phase 7: Level Check ---');
    const levelBefore = session.gameLevel;
    session = startPhase(session, 'level_check');
    assert(session.currentPhase === 'level_check', 'Phase is level_check');
    log(`  Game level: ${levelBefore} -> ${session.gameLevel}`);

    const lcResult = endPhase(session);
    session = lcResult.gameState;
    assert(lcResult.nextPhase === 'round_end', `After level_check → round_end (got: ${lcResult.nextPhase})`);

    // ── Round End ───────────────────────────────────────────
    log('\n--- Round End ---');
    const reResult = endPhase(session);
    session = reResult.gameState;
    if (round < 3) {
      assert(reResult.nextPhase === 'payment_day', `Round ${round}: next round starts at payment_day`);
      log(`  Next round: ${session.currentRound}`);
    } else {
      assert(reResult.nextPhase === 'game_end', 'Final round → game_end');
    }
  }

  // ── 5. End game verification ───────────────────────────────
  log('\n' + '='.repeat(60));
  log('GAME ENDED');
  log('='.repeat(60));

  const finalCWS = session.cwsTracker.currentScore;
  log(`  Final CWS: ${finalCWS} / ${session.cwsTracker.targetScore}`);
  log(`  Game Level: ${session.gameLevel}`);
  log(`  Rounds Completed: ${session.currentRound}`);

  // Verify CWS history
  assert(session.cwsTracker.history.length >= 3, 'CWS has 3+ history entries');
  log(`  CWS History: ${session.cwsTracker.history.map(h => `R${h.round}:${h.score}`).join(' → ')}`);

  // Player final stats
  log('\n  Final Player Stats:');
  for (const p of Object.values(session.players)) {
    log(`    ${p.roleId}: Lv${p.level} CP:${p.collaborationPoints} Utility:${p.utilityScore}`);
  }

  // Game Graph verification
  assert(session.gameGraph.snapshots.length >= 3, 'Game graph has 3+ snapshots');
  assert(session.gameGraph.objectiveFunction.currentVO >= 0, 'VO is non-negative');
  log(`  Game Graph: ${session.gameGraph.snapshots.length} snapshots, VO=${session.gameGraph.objectiveFunction.currentVO.toFixed(1)}`);

  // Zone condition summary
  log('\n  Zone Conditions:');
  for (const z of Object.values(session.board.zones)) {
    log(`    ${z.id.padEnd(20)} ${z.condition.padEnd(10)} ${z.poolType === 'common' ? '(common pool)' : ''}`);
  }

  // ── 6. Summary ─────────────────────────────────────────────
  log('\n' + '='.repeat(60));
  log(`PILOT RUN COMPLETE`);
  log(`  Errors: ${errors}`);
  log(`  Warnings: ${warnings}`);
  log(`  Final CWS: ${finalCWS}`);
  log(`  Game Result: ${finalCWS >= session.cwsTracker.targetScore ? 'SUCCESS' : finalCWS >= session.cwsTracker.targetScore * 0.5 ? 'PARTIAL SUCCESS' : 'FAILURE'}`);
  log('='.repeat(60));

  if (errors > 0) {
    console.error(`\nPILOT RUN FAILED with ${errors} error(s).`);
    process.exit(1);
  } else {
    log('\nAll checks passed.');
  }
}

runPilotGame();
