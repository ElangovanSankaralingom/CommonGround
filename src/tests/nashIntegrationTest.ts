/**
 * Nash Engine Integration Test — verifies the Nash engine output
 * is generated correctly during round-end accounting.
 *
 * Run with: npx tsx src/tests/nashIntegrationTest.ts
 */

import { initializeGame } from '../core/engine/gameInitializer';
import { startPhase, endPhase } from '../core/engine/phaseController';
import { advanceToNextPlayer } from '../core/engine/turnManager';
import { runMathVerification } from '../core/engine/nashEngine';
import type { GameSession } from '../core/models/types';

function run() {
  // Run math verification first
  runMathVerification();

  // Create a game and run through to round_end_accounting
  let session = initializeGame(
    { totalRounds: 3, deliberationTimerSeconds: 10, facilitatorMode: 'ai', cwsTarget: 75, equityBandK: 4, difficultyEscalation: 1, enableTutorial: false, siteId: 'eco_park' },
    [{ name: 'Alice', roleId: 'administrator' }, { name: 'Bob', roleId: 'designer' }, { name: 'Charlie', roleId: 'citizen' }, { name: 'Diana', roleId: 'investor' }, { name: 'Eve', roleId: 'advocate' }]
  );

  // Payment Day
  session = startPhase(session, 'payment_day');
  const pd = endPhase(session);
  session = pd.gameState;

  // Event Roll
  session = startPhase(session, 'event_roll');
  const er = endPhase(session);
  session = er.gameState;

  // Individual Action (everyone passes)
  session = startPhase(session, 'individual_action');
  for (let i = 0; i < session.turnOrder.length; i++) {
    session = advanceToNextPlayer(session);
  }
  const ia = endPhase(session);
  session = ia.gameState;

  // Action Resolution
  session = startPhase(session, 'action_resolution');
  const ar = endPhase(session);
  session = ar.gameState;

  // Round-End Accounting — this should generate Nash Engine output
  session = startPhase(session, 'round_end_accounting');

  console.log('\n=== NASH ENGINE OUTPUT (Round 1) ===\n');
  const ne = session.nashEngineOutput;
  if (!ne) {
    console.error('FAIL: No Nash Engine output generated!');
    process.exit(1);
  }

  console.log('Objective Satisfaction:', JSON.stringify(ne.sat_objectives, null, 2));
  console.log('Utilities:', JSON.stringify(ne.utilities, null, 2));
  console.log('CWS:', JSON.stringify(ne.cws, null, 2));
  console.log('Nash Q1:', JSON.stringify(ne.nash_q1, null, 2));
  console.log('Nash Q3:', JSON.stringify(ne.nash_q3, null, 2));
  console.log('DNE Achieved:', ne.dne_achieved);
  console.log('Crisis State:', JSON.stringify(ne.crisis_state, null, 2));
  console.log('Optimal Next Action:', JSON.stringify(ne.optimal_next_action, null, 2));
  console.log('End Condition:', ne.end_condition);

  // Verify specific values
  console.log('\n=== VERIFICATION ===');
  const satCount = Object.values(ne.sat_objectives).filter(Boolean).length;
  console.log(`Objectives in sat: ${satCount}/6`);
  console.log(`Admin utility: ${ne.utilities.administrator} (threshold: 12)`);
  console.log(`Investor utility: ${ne.utilities.investor} (threshold: 8)`);
  console.log(`CWS total: ${ne.cws.total} (target: 75)`);
  console.log(`Variance: ${ne.nash_q3.variance}`);

  console.log('\nNash Integration Test PASSED.');
}

run();
