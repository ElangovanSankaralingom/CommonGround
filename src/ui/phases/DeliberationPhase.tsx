import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameSession, Player, ResourceType, RoleId, ChallengeCard,
} from '../../core/models/types';
import {
  ROLE_COLORS, RESOURCE_COLORS, BUCHI_OBJECTIVES,
} from '../../core/models/constants';
import {
  FeatureTile, getFeatureTilesForZone, RESOURCE_ABILITY_MAP,
} from '../../core/content/featureTiles';
import { PhaseNavigation } from '../effects/PhaseNavigation';
import { sounds } from '../../utils/sounds';

interface VisionBoardResult {
  tiles: FeatureTile[];
  objectivesCovered: string[];
  collaborativeVisionScore: number;
  passHistory: { playerId: string; tileId: string; passQuality: number; passed: boolean }[];
  threshold: number;
}
interface BallPassingPhaseProps {
  session: GameSession;
  players: Player[];
  challenge: ChallengeCard | null;
  onPhaseComplete: (result: VisionBoardResult) => void;
  deliberationTimeRemaining: number;
}
type Stage = 'intro' | 'ispy' | 'vision' | 'locked';

const OBJ_ICONS: Record<string, string> = {
  safety: '🛡️', greenery: '🌿', access: '♿', culture: '🎭', revenue: '💰', community: '👥',
};
const OBJ_COLORS: Record<string, string> = {
  safety: '#EF4444', greenery: '#22C55E', access: '#3B82F6', culture: '#A855F7', revenue: '#EAB308', community: '#F97316',
};
const ISPY_TIME = 15;

function playerPos(idx: number, total: number, r: number) {
  const a = (idx * (360 / total) - 90) * (Math.PI / 180);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}
function getDiffMult(r: number) { return r <= 2 ? 1.2 : r === 3 ? 1.5 : r === 4 ? 1.8 : 2.0; }
function calcInclusivity(tile: FeatureTile, pid: string, players: Player[]): number {
  let n = 0;
  for (const p of players) {
    if (p.id === pid) continue;
    if ((BUCHI_OBJECTIVES[p.roleId] || []).some(o => tile.objectivesServed.includes(o))) n++;
  }
  return n >= 2 ? 1 : n === 1 ? 0.5 : 0;
}
function calcResEfficiency(tile: FeatureTile, players: Player[]): number {
  const types = Object.keys(tile.cost) as ResourceType[];
  if (!types.length) return 1;
  let m = 0;
  for (const rt of types) {
    const ak = RESOURCE_ABILITY_MAP[rt] as keyof Player['abilities'];
    let mx = 0;
    for (const p of players) { const s = (p.abilities as any)[ak] ?? 0; if (s > mx) mx = s; }
    if (mx >= 12) m++;
  }
  const r = m / types.length;
  return r >= 0.9 ? 1 : r >= 0.5 ? 0.5 : 0;
}
function calcVCS(board: FeatureTile[], tile: FeatureTile): number {
  const o = new Set<string>();
  for (const t of board) t.objectivesServed.forEach(x => o.add(x));
  tile.objectivesServed.forEach(x => o.add(x));
  return o.size >= 3 ? 1 : o.size === 2 ? 0.5 : 0;
}
function tileCostSum(tiles: FeatureTile[]): number {
  let s = 0;
  for (const t of tiles) for (const v of Object.values(t.cost)) s += (v as number) || 0;
  return s;
}

function ISpyMini({ players, onComplete }: { players: Player[]; onComplete: () => void }) {
  const [playerIdx, setPlayerIdx] = useState(0);
  const [timer, setTimer] = useState(ISPY_TIME);
  const [found, setFound] = useState<number[]>([]);
  const diffs = useMemo(() => {
    const spots: { x: number; y: number }[] = [];
    for (let i = 0; i < 7; i++) spots.push({ x: 15 + (i % 4) * 22, y: 20 + Math.floor(i / 4) * 30 });
    return spots;
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTimer(t => {
      if (t <= 1) {
        if (playerIdx >= players.length - 1) { clearInterval(iv); onComplete(); return 0; }
        setPlayerIdx(i => i + 1); setFound([]); return ISPY_TIME;
      }
      return t - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [playerIdx, players.length, onComplete]);

  const p = players[playerIdx];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-gray-400">
        <span style={{ color: ROLE_COLORS[p.roleId] }} className="font-bold">{p.name}</span>
        {' — '}Find the differences! {timer}s
      </div>
      <div className="flex gap-6">
        {[0, 1].map(grid => (
          <div key={grid} className="relative w-[200px] h-[140px] bg-gray-800 rounded-lg border border-gray-700">
            {diffs.map((d, i) => (
              <div key={i} onClick={() => { if (grid === 1 && !found.includes(i)) setFound([...found, i]); }}
                className="absolute w-4 h-4 rounded-full cursor-pointer transition-all"
                style={{
                  left: `${d.x}%`, top: `${d.y}%`,
                  background: grid === 0 ? '#4B5563' : (found.includes(i) ? '#22C55E' : '#6366F1'),
                  opacity: grid === 0 ? 0.5 : 0.8,
                  boxShadow: found.includes(i) ? '0 0 8px #22C55E' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500">Player {playerIdx + 1}/{players.length} — Found {found.length}/7</div>
    </div>
  );
}

export default function BallPassingPhase({
  session, players, challenge, onPhaseComplete, deliberationTimeRemaining,
}: BallPassingPhaseProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [boardTiles, setBoardTiles] = useState<FeatureTile[]>([]);
  const [passHistory, setPassHistory] = useState<VisionBoardResult['passHistory']>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [selectedTile, setSelectedTile] = useState<FeatureTile | null>(null);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  type BallState = 'idle' | 'success' | 'drop' | 'goal_success' | 'goal_partial' | 'goal_fail';
  const [ballAnim, setBallAnim] = useState<BallState>('idle');
  const [message, setMessage] = useState('');
  const [consecutiveDrops, setConsecutiveDrops] = useState(0);
  const [showFinalize, setShowFinalize] = useState(false);
  const [finalizeAttempted, setFinalizeAttempted] = useState(false);
  const [extraCycle, setExtraCycle] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.utilityScore - b.utilityScore), [players]);
  const activePlayer = sortedPlayers[activePlayerIdx % sortedPlayers.length];

  const zoneId = challenge?.publicFace?.zoneId || session.config?.siteId || '_default';
  const availableTiles = useMemo(() => {
    const tiles = getFeatureTilesForZone(zoneId);
    const placedIds = new Set(boardTiles.map(t => t.id));
    return tiles.filter(t => !placedIds.has(t.id));
  }, [zoneId, boardTiles]);

  const uniqueObjsCovered = useMemo(() => {
    const s = new Set<string>();
    boardTiles.forEach(t => t.objectivesServed.forEach(o => s.add(o)));
    return [...s];
  }, [boardTiles]);

  const contributedPlayerCount = useMemo(() => {
    const s: Record<string, boolean> = {};
    passHistory.filter(h => h.passed).forEach(h => { s[h.playerId] = true; });
    return Object.keys(s).length;
  }, [passHistory]);

  // Intro timer
  useEffect(() => {
    if (stage === 'intro') {
      const t = setTimeout(() => setStage('ispy'), 1500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Position ball near active player
  useEffect(() => {
    if (stage === 'vision' && ballAnim === 'idle') {
      const pos = playerPos(activePlayerIdx % sortedPlayers.length, sortedPlayers.length, 180);
      setBallPos({ x: pos.x, y: pos.y + 35 });
    }
  }, [activePlayerIdx, stage, ballAnim, sortedPlayers.length]);

  // Check if finalize should show
  useEffect(() => {
    if (boardTiles.length >= 4 && !showFinalize) setShowFinalize(true);
  }, [boardTiles.length, showFinalize]);

  const handlePlaceTile = useCallback((tile: FeatureTile) => {
    sounds.playButtonClick();
    setSelectedTile(tile);
  }, []);

  const handlePassBall = useCallback((targetIdx: number) => {
    if (!selectedTile || targetIdx === activePlayerIdx % sortedPlayers.length) return;
    if (ballAnim !== 'idle') return;

    const tile = selectedTile;
    const is = calcInclusivity(tile, activePlayer.id, sortedPlayers);
    const res = calcResEfficiency(tile, sortedPlayers);
    const vcs = calcVCS(boardTiles, tile);
    const pq = (is + res + vcs) / 3;

    const startPos = playerPos(activePlayerIdx % sortedPlayers.length, sortedPlayers.length, 180);
    const targetPos = playerPos(targetIdx, sortedPlayers.length, 180);

    const entry = { playerId: activePlayer.id, tileId: tile.id, passQuality: Math.round(pq * 100) / 100, passed: pq >= 0.5 };
    setPassHistory(h => [...h, entry]);

    if (pq >= 0.5) {
      // Successful pass
      sounds.playBallPass();
      setBoardTiles(bt => [...bt, tile]);
      setSelectedTile(null);
      setBallAnim('success');
      setMessage(`+1 CP — Pass quality: ${(pq * 100).toFixed(0)}%`);
      if (consecutiveDrops > 0) sounds.playChainBonus();
      setConsecutiveDrops(0);

      // Animate ball arc
      const midX = (startPos.x + targetPos.x) / 2;
      const midY = (startPos.y + targetPos.y) / 2 - 40;
      const steps = [
        { x: startPos.x, y: startPos.y + 35 },
        { x: midX, y: midY },
        { x: targetPos.x, y: targetPos.y + 35 },
      ];
      let step = 0;
      const iv = setInterval(() => {
        step++;
        if (step < steps.length) setBallPos(steps[step]);
        else {
          clearInterval(iv);
          setBallAnim('idle');
          setActivePlayerIdx(targetIdx);
          setMessage('');
        }
      }, 270);
    } else {
      // Drop
      sounds.playBallDrop();
      setBallAnim('drop');
      const drops = consecutiveDrops + 1;
      setConsecutiveDrops(drops);
      const proposerRole = activePlayer.roleId.charAt(0).toUpperCase() + activePlayer.roleId.slice(1);
      let msg = `The proposal mainly serves ${proposerRole}`;
      if (drops >= 2) {
        const weakest = sortedPlayers[0];
        const weakObjs = BUCHI_OBJECTIVES[weakest.roleId] || [];
        msg += ` — Hint: address ${weakest.name}'s needs (${weakObjs.join(', ')})`;
      }
      setMessage(msg);
      setSelectedTile(null);

      const mX = (startPos.x + targetPos.x) / 2, mY = (startPos.y + targetPos.y) / 2 - 40;
      setBallPos({ x: mX, y: mY });
      setTimeout(() => setBallPos({ x: mX, y: 0 }), 600);
      setTimeout(() => setBallPos({ x: mX, y: 10 }), 900);
      setTimeout(() => {
        setBallAnim('idle');
        const p = playerPos(activePlayerIdx % sortedPlayers.length, sortedPlayers.length, 180);
        setBallPos({ x: p.x, y: p.y + 35 });
      }, 1200);
    }
  }, [selectedTile, activePlayerIdx, sortedPlayers, boardTiles, activePlayer, ballAnim, consecutiveDrops]);

  const handleFinalize = useCallback(() => {
    if (ballAnim !== 'idle') return;
    setFinalizeAttempted(true);

    const passQualities = passHistory.map(h => h.passQuality);
    const avgPQ = passQualities.length > 0 ? passQualities.reduce((a, b) => a + b, 0) / passQualities.length : 0;
    const objRatio = uniqueObjsCovered.length / 6;
    const contribRatio = contributedPlayerCount / sortedPlayers.length;
    const cvs = avgPQ + objRatio + contribRatio;

    const activePos = playerPos(activePlayerIdx % sortedPlayers.length, sortedPlayers.length, 180);

    if (cvs >= 0.7) {
      setBallAnim('goal_success'); sounds.playGoalScore(); setMessage('The group has a shared vision!');
      setBallPos({ x: activePos.x, y: activePos.y + 35 });
      setTimeout(() => setBallPos({ x: 0, y: 0 }), 400);
      setTimeout(() => {
        const d = challenge?.publicFace?.difficultyRating || 3;
        const th = tileCostSum(boardTiles) * getDiffMult(d);
        (window as any).__visionResult = {
          tiles: boardTiles, objectivesCovered: uniqueObjsCovered,
          collaborativeVisionScore: Math.round(cvs * 100) / 100, passHistory, threshold: Math.round(th),
        } as VisionBoardResult;
        setBallAnim('idle'); setStage('locked');
      }, 1500);
    } else if (cvs >= 0.5 && !extraCycle) {
      setBallAnim('goal_partial'); sounds.playGoalMiss(); setMessage('One more round of adjustments.');
      setBallPos({ x: 5, y: -5 });
      setTimeout(() => {
        setBallAnim('idle'); setExtraCycle(true); setFinalizeAttempted(false); setShowFinalize(false);
        const p = playerPos(activePlayerIdx % sortedPlayers.length, sortedPlayers.length, 180);
        setBallPos({ x: p.x, y: p.y + 35 }); setMessage('');
      }, 1500);
    } else {
      setBallAnim('goal_fail'); sounds.playGoalMiss(); setMessage('Vision too fragmented. Restarting...');
      setBallPos({ x: 30, y: -30 });
      setTimeout(() => {
        setBoardTiles([]); setPassHistory([]); setConsecutiveDrops(0);
        setFinalizeAttempted(false); setShowFinalize(false); setExtraCycle(false);
        setBallAnim('idle'); setActivePlayerIdx(0);
        const p = playerPos(0, sortedPlayers.length, 180);
        setBallPos({ x: p.x, y: p.y + 35 }); setMessage('');
      }, 2000);
    }
  }, [passHistory, uniqueObjsCovered, contributedPlayerCount, sortedPlayers, activePlayerIdx, boardTiles, challenge, ballAnim, extraCycle]);

  const handleComplete = useCallback(() => {
    sounds.playButtonClick();
    const result = (window as any).__visionResult as VisionBoardResult | undefined;
    if (result) {
      delete (window as any).__visionResult;
      onPhaseComplete(result);
    }
  }, [onPhaseComplete]);

  // INTRO
  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">Phase 3: Build Your Vision</h1>
          <p className="text-gray-400">Pass the ball to build a shared plan</p>
        </motion.div>
      </div>
    );
  }

  if (stage === 'ispy') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-bold text-amber-400 mb-4">Resource Discovery</h2>
        <ISpyMini players={sortedPlayers} onComplete={() => setStage('vision')} />
        <PhaseNavigation onContinue={() => setStage('vision')} canContinue continueLabel="Skip to Vision Board →" />
      </div>
    );
  }

  if (stage === 'locked') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-lg">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-amber-400 mb-4"
            style={{ textShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
            Vision Board Locked
          </h2>
          <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-amber-500/30"
            style={{ boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}>
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {boardTiles.map(t => (
                <div key={t.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <span className="mr-1">{t.icon}</span>{t.name}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-400 mb-2">Objectives Covered:</div>
            <div className="flex gap-2 justify-center">
              {uniqueObjsCovered.map(o => (
                <span key={o} className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background: OBJ_COLORS[o] + '22', color: OBJ_COLORS[o] }}>
                  {OBJ_ICONS[o]} {o}
                </span>
              ))}
            </div>
          </div>
          <PhaseNavigation onContinue={handleComplete} canContinue
            continueLabel="Continue to Phase 4: Build the Path →" />
        </motion.div>
      </div>
    );
  }

  const ballColor = ballAnim === 'drop' || ballAnim === 'goal_fail' ? '#EF4444'
    : ballAnim === 'success' || ballAnim === 'goal_success' ? '#22C55E' : '#F59E0B';

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <div className="w-64 bg-gray-900/90 border-r border-gray-800 p-3 overflow-y-auto"
        style={{ maxHeight: '100vh' }}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Available Features
        </h3>
        <div className="space-y-2">
          {availableTiles.map(tile => {
            const isSelected = selectedTile?.id === tile.id;
            return (
              <motion.div key={tile.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => handlePlaceTile(tile)}
                className="rounded-lg p-2 cursor-pointer transition-colors"
                style={{
                  background: isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(55,65,81,0.5)',
                  border: isSelected ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.06)',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tile.icon}</span>
                  <span className="text-sm font-semibold text-gray-200">{tile.name}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">{tile.description}</div>
                <div className="flex gap-1 mb-1">
                  {(Object.entries(tile.cost) as [ResourceType, number][]).map(([rt, amt]) => (
                    <div key={rt} className="flex items-center gap-0.5">
                      {Array.from({ length: amt }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: RESOURCE_COLORS[rt] || '#888' }} />
                      ))}
                      <span className="text-[9px] text-gray-500 ml-0.5">{rt[0].toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {tile.objectivesServed.map(o => (
                    <span key={o} className="text-[10px] px-1 rounded"
                      style={{ background: (OBJ_COLORS[o] || '#666') + '22', color: OBJ_COLORS[o] || '#aaa' }}>
                      {OBJ_ICONS[o] || '?'} {o}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
          {availableTiles.length === 0 && (
            <div className="text-xs text-gray-600 text-center py-4">All tiles placed</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-4 text-xs z-10">
          <span className="text-gray-400">
            Active: <span style={{ color: ROLE_COLORS[activePlayer.roleId] }} className="font-bold">
              {activePlayer.name}
            </span>
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Tiles: {boardTiles.length}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Objectives: {uniqueObjsCovered.length}/6</span>
        </div>

        <div className="relative" style={{ width: 460, height: 460 }}>
          <div className="absolute rounded-xl bg-gray-900/80 border border-gray-700 flex flex-wrap gap-1 p-3 items-start content-start overflow-y-auto"
            style={{ left: 80, top: 130, width: 300, height: 200 }}>
            {boardTiles.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                Drag tiles here
              </div>
            )}
            {boardTiles.map(t => (
              <div key={t.id} className="bg-gray-800 rounded px-2 py-1 text-xs flex items-center gap-1">
                <span>{t.icon}</span><span className="text-gray-300">{t.name}</span>
              </div>
            ))}
          </div>

          {sortedPlayers.map((p, i) => {
            const pos = playerPos(i, sortedPlayers.length, 180);
            const cx = 230 + pos.x;
            const cy = 230 + pos.y;
            const isActive = i === activePlayerIdx % sortedPlayers.length;
            const isTarget = selectedTile && !isActive;
            return (
              <motion.div key={p.id}
                onClick={() => { if (isTarget) handlePassBall(i); }}
                className="absolute flex flex-col items-center cursor-pointer"
                style={{ left: cx - 25, top: cy - 25 }}
                whileHover={isTarget ? { scale: 1.1 } : {}}
                animate={isActive ? { boxShadow: '0 0 16px rgba(245,158,11,0.4)' } : {}}>
                <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    border: `3px solid ${ROLE_COLORS[p.roleId]}`,
                    background: isActive ? 'rgba(245,158,11,0.15)' : 'rgba(30,30,40,0.9)',
                    color: ROLE_COLORS[p.roleId],
                    boxShadow: isTarget ? `0 0 12px ${ROLE_COLORS[p.roleId]}66` : 'none',
                  }}>
                  {p.name[0]}
                </div>
                <span className="text-[10px] mt-1 text-gray-400 font-medium text-center max-w-[70px] truncate">
                  {p.name}
                </span>
                {isActive && (
                  <span className="text-[9px] text-amber-400 font-bold">ACTIVE</span>
                )}
              </motion.div>
            );
          })}

          <motion.div ref={ballRef}
            animate={{
              left: 230 + ballPos.x - 15,
              top: 230 + ballPos.y - 15,
              scale: ballAnim === 'goal_success' ? [1, 1.5, 1] : 1,
            }}
            transition={{
              type: ballAnim === 'success' ? 'tween' : 'spring',
              duration: ballAnim === 'success' ? 0.8 : ballAnim === 'drop' ? 0.4 : 0.5,
              bounce: ballAnim === 'drop' ? 0.5 : 0,
            }}
            className="absolute w-[30px] h-[30px] rounded-full z-20"
            style={{
              background: `radial-gradient(circle at 40% 35%, ${ballColor}, ${ballColor}88)`,
              boxShadow: `0 0 16px ${ballColor}66`,
            }}
          />
        </div>

        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="text-sm font-semibold px-4 py-2 rounded-lg mt-2"
              style={{
                color: ballAnim === 'drop' || ballAnim === 'goal_fail' ? '#EF4444'
                  : ballAnim === 'goal_success' ? '#F59E0B' : '#22C55E',
                background: 'rgba(0,0,0,0.5)',
              }}>
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {selectedTile && ballAnim === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 bg-gray-900 rounded-lg p-2 border border-amber-500/30 flex items-center gap-2">
            <span>{selectedTile.icon}</span>
            <span className="text-sm text-gray-300">{selectedTile.name}</span>
            <span className="text-xs text-amber-400 ml-2">Click a player to pass</span>
          </motion.div>
        )}

        {showFinalize && !finalizeAttempted && ballAnim === 'idle' && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onClick={handleFinalize}
            className="mt-4 px-6 py-2 rounded-xl font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#1C1917',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Finalize Vision
          </motion.button>
        )}

        {ballAnim === 'idle' && !selectedTile && !showFinalize && (
          <div className="mt-4 text-xs text-gray-600 text-center">
            Select a feature tile from the left panel, then click a player to pass the ball
          </div>
        )}
      </div>

      <div className="w-52 bg-gray-900/90 border-l border-gray-800 p-3 overflow-y-auto"
        style={{ maxHeight: '100vh' }}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Objectives
        </h3>
        <div className="space-y-1 mb-4">
          {(['safety', 'greenery', 'access', 'culture', 'revenue', 'community'] as string[]).map(o => {
            const covered = uniqueObjsCovered.includes(o);
            return (
              <div key={o} className="flex items-center gap-1.5 text-xs">
                <span>{OBJ_ICONS[o]}</span>
                <span className={covered ? 'text-green-400 font-bold' : 'text-gray-500'}
                  style={{ textDecoration: covered ? 'none' : 'none' }}>
                  {o}
                </span>
                {covered && <span className="text-green-400 ml-auto">✓</span>}
              </div>
            );
          })}
        </div>

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Pass History
        </h3>
        <div className="space-y-1">
          {passHistory.map((h, i) => {
            const p = sortedPlayers.find(pl => pl.id === h.playerId);
            return (
              <div key={i} className="text-[10px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full"
                  style={{ background: h.passed ? '#22C55E' : '#EF4444' }} />
                <span style={{ color: p ? ROLE_COLORS[p.roleId] : '#888' }}>
                  {p?.name?.[0] || '?'}
                </span>
                <span className="text-gray-500 truncate flex-1">
                  {availableTiles.find(t => t.id === h.tileId)?.name || boardTiles.find(t => t.id === h.tileId)?.name || h.tileId}
                </span>
                <span className={h.passed ? 'text-green-400' : 'text-red-400'}>
                  {(h.passQuality * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
          {passHistory.length === 0 && (
            <div className="text-[10px] text-gray-600">No passes yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
