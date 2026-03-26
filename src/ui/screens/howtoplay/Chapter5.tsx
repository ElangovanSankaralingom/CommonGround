import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ROLES,
  ALL_CHALLENGES,
  EVENT_CARDS,
  ADMINISTRATOR_CARDS,
  DESIGNER_CARDS,
  CITIZEN_CARDS,
} from '../../../core/content';
import { WELFARE_WEIGHTS } from '../../../core/models/constants';
import type { RoleId } from '../../../core/models/types';
import { getAbilityModifier } from '../../../core/models/types';

/* ─── Constants ─── */

const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_LABELS: Record<RoleId, string> = {
  administrator: 'Administrator',
  designer: 'Designer',
  citizen: 'Citizen',
  investor: 'Investor',
  advocate: 'Advocate',
};

const RESOURCE_COLORS: Record<string, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

const ABILITY_LABELS: Record<string, string> = {
  authority: 'AUT',
  resourcefulness: 'RES',
  communityTrust: 'CTR',
  technicalKnowledge: 'TKN',
  politicalLeverage: 'PLV',
  adaptability: 'ADP',
};

const PHASES = [
  { id: 'event', label: 'Event', num: 1 },
  { id: 'challenge', label: 'Challenge', num: 2 },
  { id: 'deliberation', label: 'Deliberation', num: 3 },
  { id: 'action', label: 'Action', num: 4 },
  { id: 'scoring', label: 'Scoring', num: 5 },
] as const;

type PhaseId = (typeof PHASES)[number]['id'];

/* ─── Game data lookups ─── */

// Playground Safety Hazard challenge
const DEMO_CHALLENGE = ALL_CHALLENGES.find((c) => c.id === 'ch_site_02')!;

// Cards for the interactive demo
const DEMO_DESIGNER_CARD = DESIGNER_CARDS.find((c) => c.id === 'des_01')!; // Design Proposal
const DEMO_ADMIN_CARD = ADMINISTRATOR_CARDS.find((c) => c.id === 'adm_06')!; // Permit Approval
const DEMO_CITIZEN_CARD = CITIZEN_CARDS.find((c) => c.id === 'cit_06')!; // Clean-Up Drive

// Sample events
const SAMPLE_NEGATIVE_EVENT = EVENT_CARDS.find((e) => e.type === 'negative')!;
const SAMPLE_POSITIVE_EVENT = EVENT_CARDS.find((e) => e.type === 'positive')!;

/* ─── Die Face Component ─── */

function DieFace({ value }: { value: number }) {
  const dotMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };
  const dots = dotMap[value] || dotMap[1];

  return (
    <div
      className="relative rounded-2xl shadow-lg"
      style={{
        width: 100,
        height: 100,
        background: '#FDF6EC',
        border: '3px solid #8B6F47',
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 14,
            height: 14,
            background: '#2C1810',
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Phase Timeline ─── */

function PhaseTimeline({ activePhase }: { activePhase: PhaseId }) {
  const activeIdx = PHASES.findIndex((p) => p.id === activePhase);

  return (
    <div className="sticky top-0 z-20 py-3 px-4" style={{ background: 'rgba(245,230,211,0.95)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center justify-center gap-0 max-w-lg mx-auto">
        {PHASES.map((phase, i) => {
          const isActive = phase.id === activePhase;
          const isPast = i < activeIdx;
          return (
            <div key={phase.id} className="flex items-center">
              <motion.div
                className="flex flex-col items-center"
                animate={{ scale: isActive ? 1.1 : 1 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: isActive ? '#8E44AD' : isPast ? '#8E44AD' : 'rgba(139,111,71,0.15)',
                    color: isActive || isPast ? '#FDF6EC' : '#8B6F47',
                    boxShadow: isActive ? '0 0 12px rgba(142,68,173,0.4)' : 'none',
                  }}
                >
                  {phase.num}
                </div>
                <span
                  className="text-xs mt-1 font-medium whitespace-nowrap transition-all duration-300"
                  style={{
                    color: isActive ? '#8E44AD' : isPast ? '#8E44AD' : '#8B6F47',
                    opacity: isActive ? 1 : 0.6,
                    fontSize: isActive ? 11 : 10,
                  }}
                >
                  {phase.label}
                </span>
              </motion.div>
              {i < PHASES.length - 1 && (
                <div
                  className="h-0.5 transition-all duration-300"
                  style={{
                    width: 24,
                    background: isPast ? '#8E44AD' : 'rgba(139,111,71,0.15)',
                    marginBottom: 16,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Phase 1: Event Roll ─── */

function Phase1Event({ onBecomeVisible }: { onBecomeVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [dieValue, setDieValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showEvent, setShowEvent] = useState(false);

  useEffect(() => {
    if (isInView) onBecomeVisible();
  }, [isInView, onBecomeVisible]);

  const rollDie = () => {
    setIsRolling(true);
    setShowEvent(false);
    setDieValue(null);

    let count = 0;
    const interval = setInterval(() => {
      setDieValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 12) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDieValue(finalValue);
        setIsRolling(false);
        if (finalValue <= 2 || finalValue >= 5) {
          setTimeout(() => setShowEvent(true), 500);
        }
      }
    }, 100);
  };

  const getOutcome = (val: number) => {
    if (val <= 2) return { text: 'Negative Event!', color: '#C0392B' };
    if (val <= 4) return { text: 'No Event', color: '#8B6F47' };
    return { text: 'Positive Event!', color: '#27AE60' };
  };

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8E44AD' }}>
          1
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
            Event Roll
          </h3>
          <p className="text-xs" style={{ color: '#8B6F47' }}>Something happens in the world around the park</p>
        </div>
      </div>

      <div className="rounded-xl p-6 text-center" style={{ background: '#FDF6EC', border: '1px solid rgba(139,111,71,0.15)' }}>
        <p className="text-sm mb-5" style={{ color: '#4A3728' }}>
          Each season begins with a die roll that determines whether an event affects the game.
        </p>

        <div className="flex justify-center mb-4">
          <motion.div
            animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 0.9, 1.1, 1] } : {}}
            transition={isRolling ? { duration: 0.3, repeat: 3 } : {}}
          >
            {dieValue ? <DieFace value={dieValue} /> : (
              <div
                className="rounded-2xl flex items-center justify-center text-3xl"
                style={{
                  width: 100,
                  height: 100,
                  background: '#FDF6EC',
                  border: '3px dashed #8B6F47',
                  color: '#8B6F47',
                }}
              >
                ?
              </div>
            )}
          </motion.div>
        </div>

        {dieValue && !isRolling && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <span
              className="inline-block px-4 py-2 rounded-lg text-lg font-bold"
              style={{
                color: getOutcome(dieValue).color,
                background: `${getOutcome(dieValue).color}11`,
              }}
            >
              Rolled {dieValue}: {getOutcome(dieValue).text}
            </span>
          </motion.div>
        )}

        <div className="flex justify-center gap-3 mb-5">
          {[
            { range: '1-2', label: 'Negative', color: '#C0392B' },
            { range: '3-4', label: 'No Event', color: '#8B6F47' },
            { range: '5-6', label: 'Positive', color: '#27AE60' },
          ].map((r) => (
            <div key={r.range} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
              <span style={{ color: r.color, fontWeight: 600 }}>{r.range}</span>
              <span style={{ color: '#8B6F47' }}>{r.label}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={rollDie}
            disabled={isRolling}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: '#8E44AD' }}
          >
            {dieValue && !isRolling ? 'Roll Again' : isRolling ? 'Rolling...' : 'Click to Roll'}
          </button>
        </div>

        <AnimatePresence>
          {showEvent && dieValue && !isRolling && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 p-4 rounded-xl text-left"
              style={{
                background: dieValue <= 2 ? 'rgba(192,57,43,0.05)' : 'rgba(39,174,96,0.05)',
                border: `2px solid ${dieValue <= 2 ? '#C0392B' : '#27AE60'}`,
              }}
            >
              {(() => {
                const evt = dieValue <= 2 ? SAMPLE_NEGATIVE_EVENT : SAMPLE_POSITIVE_EVENT;
                return (
                  <>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white mb-2"
                      style={{ background: dieValue <= 2 ? '#C0392B' : '#27AE60' }}
                    >
                      {evt.type.toUpperCase()} EVENT
                    </span>
                    <h5 className="text-sm font-bold mb-1" style={{ color: '#2C1810' }}>{evt.name}</h5>
                    <p className="text-xs" style={{ color: '#4A3728' }}>{evt.description}</p>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Phase 2: Challenge Presentation ─── */

function Phase2Challenge({ onBecomeVisible }: { onBecomeVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (isInView) onBecomeVisible();
  }, [isInView, onBecomeVisible]);

  const challenge = DEMO_CHALLENGE;

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8E44AD' }}>
          2
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
            Challenge Presentation
          </h3>
          <p className="text-xs" style={{ color: '#8B6F47' }}>A problem for the team to solve</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: '#FDF6EC', border: '1px solid rgba(139,111,71,0.15)' }}>
        <p className="text-sm mb-5 text-center" style={{ color: '#4A3728' }}>
          A challenge card is drawn, presenting a problem that must be resolved collaboratively.
        </p>

        <div className="flex justify-center mb-5">
          <div style={{ perspective: 1000 }}>
            <motion.div
              className="relative cursor-pointer"
              style={{ transformStyle: 'preserve-3d', width: 280, height: 360 }}
              animate={{ rotateY: isFlipped ? 0 : 180 }}
              transition={{ duration: 0.8, type: 'spring', damping: 20 }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Card Front (challenge details) */}
              <div
                className="absolute inset-0 rounded-xl p-5 flex flex-col"
                style={{
                  background: '#FDF6EC',
                  border: '3px solid #C0392B',
                  backfaceVisibility: 'hidden',
                }}
              >
                <span className="inline-block self-start px-2 py-0.5 rounded text-xs font-bold text-white mb-2" style={{ background: '#8B6F47' }}>
                  {challenge.category}
                </span>
                <h4 className="text-lg font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
                  {challenge.name}
                </h4>
                <p className="text-xs mb-3 flex-grow" style={{ color: '#4A3728' }}>{challenge.description}</p>

                {/* Annotated elements */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(192,57,43,0.06)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#C0392B' }}>
                      {challenge.difficulty}
                    </div>
                    <span className="text-xs" style={{ color: '#C0392B' }}>
                      {'<-'} Series value must beat this number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(46,134,171,0.06)' }}>
                    <div className="flex gap-0.5">
                      {Array.from({ length: challenge.requirements.minUniqueRoles }).map((_, i) => (
                        <div key={i} className="w-5 h-5 rounded-full" style={{ background: '#2E86AB', opacity: 0.6 + i * 0.2 }} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: '#2E86AB' }}>
                      {'<-'} Cards from {challenge.requirements.minUniqueRoles}+ different roles
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(244,208,63,0.08)' }}>
                    <div className="flex gap-0.5">
                      {Object.entries(challenge.requirements.resourceCost).map(([res, amt]) =>
                        Array.from({ length: amt as number }).map((_, i) => (
                          <div
                            key={`${res}-${i}`}
                            className="w-4 h-4 rounded-full"
                            style={{ background: RESOURCE_COLORS[res], border: '1px solid rgba(0,0,0,0.1)' }}
                          />
                        ))
                      )}
                    </div>
                    <span className="text-xs" style={{ color: '#8B6F47' }}>
                      {'<-'} Resources to spend
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Back */}
              <div
                className="absolute inset-0 rounded-xl flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #8B6F47 0%, #6B5339 100%)',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-4xl mb-3" style={{ opacity: 0.4, color: '#FDF6EC' }}>?</div>
                <div className="text-lg font-bold text-white/80" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Challenge
                </div>
                <div className="text-xs text-white/50 mt-1">Tap to reveal</div>
              </div>
            </motion.div>
          </div>
        </div>

        {!isFlipped && (
          <p className="text-xs text-center" style={{ color: '#8B6F47' }}>
            Click the card to flip it
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Phase 3: Deliberation ─── */

function Phase3Deliberation({ onBecomeVisible }: { onBecomeVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (isInView) onBecomeVisible();
  }, [isInView, onBecomeVisible]);

  const players: { roleId: RoleId; suggestion: string }[] = [
    {
      roleId: 'administrator',
      suggestion: `I can play ${DEMO_ADMIN_CARD.name} -- my ${ABILITY_LABELS[DEMO_ADMIN_CARD.abilityCheck!.ability]} of ${ROLES.administrator.startingAbilities[DEMO_ADMIN_CARD.abilityCheck!.ability as keyof typeof ROLES.administrator.startingAbilities]} easily passes the threshold of ${DEMO_ADMIN_CARD.abilityCheck!.threshold}.`,
    },
    {
      roleId: 'designer',
      suggestion: `Let me lead with ${DEMO_DESIGNER_CARD.name} -- it has a base value of ${DEMO_DESIGNER_CARD.baseValue}, the highest in my hand, and I can pass the ${ABILITY_LABELS[DEMO_DESIGNER_CARD.abilityCheck!.ability]} check.`,
    },
    {
      roleId: 'citizen',
      suggestion: `I'll contribute ${DEMO_CITIZEN_CARD.name} and cover the resource costs. My volunteers can make up for what we're short on materials.`,
    },
  ];

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8E44AD' }}>
          3
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
            Deliberation
          </h3>
          <p className="text-xs" style={{ color: '#8B6F47' }}>Players discuss and strategize</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: '#FDF6EC', border: '1px solid rgba(139,111,71,0.15)' }}>
        <p className="text-sm mb-5 text-center" style={{ color: '#4A3728' }}>
          Players discuss strategy, make trades, and form coalitions before committing actions.
        </p>

        <div className="space-y-4 mb-6">
          {players.map((p, i) => (
            <motion.div
              key={p.roleId}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: ROLE_COLORS[p.roleId] }}
              >
                {ROLE_LABELS[p.roleId].charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold" style={{ color: ROLE_COLORS[p.roleId] }}>
                  {ROLE_LABELS[p.roleId]}
                </span>
                <div
                  className="mt-1 p-3 rounded-lg rounded-tl-none text-xs"
                  style={{
                    background: `${ROLE_COLORS[p.roleId]}08`,
                    border: `1px solid ${ROLE_COLORS[p.roleId]}22`,
                    color: '#4A3728',
                  }}
                >
                  "{p.suggestion}"
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mock timer */}
        <div className="flex items-center justify-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
          <div className="text-2xl font-mono font-bold" style={{ color: '#8B6F47' }}>
            3:00
          </div>
          <span className="text-xs" style={{ color: '#8B6F47' }}>
            Deliberation Timer (set by facilitator)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Phase 4: Action Resolution (Interactive Demo) ─── */

function Phase4Action({ onBecomeVisible }: { onBecomeVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.2 });
  const [currentStep, setCurrentStep] = useState(0);
  const [showFailure, setShowFailure] = useState(false);

  useEffect(() => {
    if (isInView) onBecomeVisible();
  }, [isInView, onBecomeVisible]);

  const challenge = DEMO_CHALLENGE;
  const designerCard = DEMO_DESIGNER_CARD;
  const adminCard = DEMO_ADMIN_CARD;
  const citizenCard = DEMO_CITIZEN_CARD;

  // Ability scores from roles
  const designerTKN = ROLES.designer.startingAbilities.technicalKnowledge; // 16
  const adminAUT = ROLES.administrator.startingAbilities.authority; // 16

  const designerMod = getAbilityModifier(designerTKN); // (16-10)/2 = 3
  const adminMod = getAbilityModifier(adminAUT); // (16-10)/2 = 3

  const designerContrib = designerCard.baseValue + designerMod; // 4+3 = 7
  const adminContrib = adminCard.baseValue + adminMod; // 3+3 = 6
  const runningTotal = designerContrib + adminContrib; // 13
  const citizenContrib = citizenCard.baseValue; // 3
  const multiRoleBonus = 3; // 3 different roles
  const finalSeriesValue = designerContrib + adminContrib + citizenContrib + multiRoleBonus; // 19

  // Failure scenario
  const failDesignerContrib = 3;
  const failFinalValue = failDesignerContrib + 2; // 5

  const resetDemo = () => {
    setCurrentStep(0);
    setShowFailure(false);
  };

  const steps = [
    {
      title: 'The Challenge',
      content: (
        <div className="text-center">
          <div className="inline-block rounded-xl p-4 mb-3" style={{ background: 'rgba(192,57,43,0.05)', border: '2px solid #C0392B' }}>
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded mb-2 inline-block" style={{ background: '#8B6F47' }}>
              {challenge.category}
            </span>
            <h5 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
              {challenge.name}
            </h5>
            <p className="text-xs mt-1" style={{ color: '#4A3728' }}>{challenge.description}</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-xs block" style={{ color: '#8B6F47' }}>Difficulty</span>
                <span className="text-2xl font-bold" style={{ color: '#C0392B' }}>{challenge.difficulty}</span>
              </div>
              <div className="text-center">
                <span className="text-xs block" style={{ color: '#8B6F47' }}>Min Roles</span>
                <span className="text-2xl font-bold" style={{ color: '#2E86AB' }}>{challenge.requirements.minUniqueRoles}</span>
              </div>
              <div className="text-center">
                <span className="text-xs block" style={{ color: '#8B6F47' }}>Min Cards</span>
                <span className="text-2xl font-bold" style={{ color: '#E67E22' }}>{challenge.requirements.minSeriesLength}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: `Designer plays ${designerCard.name}`,
      content: (
        <div>
          <motion.div
            className="rounded-xl p-4 mb-4"
            style={{ background: `${ROLE_COLORS.designer}08`, border: `2px solid ${ROLE_COLORS.designer}` }}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: ROLE_COLORS.designer }}>D</div>
                <span className="text-sm font-bold" style={{ color: ROLE_COLORS.designer }}>{designerCard.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded text-white" style={{ background: '#27AE60' }}>Starter</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#4A3728' }}>{designerCard.description}</p>
          </motion.div>

          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(139,111,71,0.06)' }}>
            <div className="space-y-1" style={{ color: '#4A3728' }}>
              <div>
                Base value: <strong>{designerCard.baseValue}</strong>
              </div>
              <div>
                {ABILITY_LABELS[designerCard.abilityCheck!.ability]} modifier: getAbilityModifier({designerTKN}) = <strong>+{designerMod}</strong>
              </div>
              <div className="pt-1 border-t" style={{ borderColor: 'rgba(139,111,71,0.15)' }}>
                Contribution: {designerCard.baseValue} + {designerMod} = <strong className="text-lg">{designerContrib}</strong>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#27AE60' }}>
                Ability check: {ABILITY_LABELS[designerCard.abilityCheck!.ability]} {designerTKN} {'>'}= {designerCard.abilityCheck!.threshold} -- Pass
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: `Administrator plays ${adminCard.name}`,
      content: (
        <div>
          <motion.div
            className="rounded-xl p-4 mb-4"
            style={{ background: `${ROLE_COLORS.administrator}08`, border: `2px solid ${ROLE_COLORS.administrator}` }}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: ROLE_COLORS.administrator }}>A</div>
                <span className="text-sm font-bold" style={{ color: ROLE_COLORS.administrator }}>{adminCard.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded text-white" style={{ background: '#27AE60' }}>Starter</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#4A3728' }}>{adminCard.description}</p>
          </motion.div>

          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(139,111,71,0.06)' }}>
            <div className="space-y-1" style={{ color: '#4A3728' }}>
              <div>
                Base value: <strong>{adminCard.baseValue}</strong>
              </div>
              <div>
                {ABILITY_LABELS[adminCard.abilityCheck!.ability]} modifier: getAbilityModifier({adminAUT}) = <strong>+{adminMod}</strong>
              </div>
              <div>
                Ability check: {ABILITY_LABELS[adminCard.abilityCheck!.ability]} {adminAUT} {'>'}= {adminCard.abilityCheck!.threshold}
                <span style={{ color: '#27AE60' }}> -- Pass</span>
              </div>
              <div className="pt-1 border-t" style={{ borderColor: 'rgba(139,111,71,0.15)' }}>
                This card: {adminCard.baseValue} + {adminMod} = <strong>{adminContrib}</strong>
              </div>
              <div>
                Running total: {designerContrib} + {adminContrib} = <strong className="text-lg">{runningTotal}</strong>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: `Citizen plays ${citizenCard.name} & contributes resources`,
      content: (
        <div>
          <motion.div
            className="rounded-xl p-4 mb-4"
            style={{ background: `${ROLE_COLORS.citizen}08`, border: `2px solid ${ROLE_COLORS.citizen}` }}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: ROLE_COLORS.citizen }}>C</div>
                <span className="text-sm font-bold" style={{ color: ROLE_COLORS.citizen }}>{citizenCard.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded text-white" style={{ background: '#7F8C8D' }}>Any</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#4A3728' }}>{citizenCard.description}</p>
          </motion.div>

          {/* Resource tokens moving */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {Object.entries(challenge.requirements.resourceCost).map(([res, amt]) =>
              Array.from({ length: amt as number }).map((_, i) => (
                <motion.div
                  key={`${res}-${i}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: RESOURCE_COLORS[res], border: '2px solid rgba(255,255,255,0.4)' }}
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                >
                  {res.charAt(0).toUpperCase()}
                </motion.div>
              ))
            )}
          </div>

          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(139,111,71,0.06)' }}>
            <div className="space-y-1" style={{ color: '#4A3728' }}>
              <div>
                {citizenCard.name} base value: <strong>{citizenCard.baseValue}</strong> (no ability check required)
              </div>
              <div className="flex items-center gap-1" style={{ color: '#27AE60' }}>
                Resource cost met: {Object.entries(challenge.requirements.resourceCost).map(([r, a]) => `${a} ${r}`).join(', ')}
                {' -- Paid'}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resolution!',
      content: (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            {!showFailure ? (
              <>
                <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(39,174,96,0.08)', border: '2px solid #27AE60' }}>
                  <div className="text-sm mb-3 text-left" style={{ color: '#4A3728' }}>
                    <div className="mb-1">
                      {ROLE_LABELS.designer}'s contribution: <strong>{designerContrib}</strong>
                    </div>
                    <div className="mb-1">
                      {ROLE_LABELS.administrator}'s contribution: <strong>{adminContrib}</strong>
                    </div>
                    <div className="mb-1">
                      {ROLE_LABELS.citizen}'s contribution: <strong>{citizenContrib}</strong>
                    </div>
                    <div className="mb-1">
                      Multi-role bonus (3 roles): <strong>+{multiRoleBonus}</strong>
                    </div>
                    <div className="pt-2 border-t text-center" style={{ borderColor: 'rgba(39,174,96,0.2)' }}>
                      Total series value: {designerContrib} + {adminContrib} + {citizenContrib} + {multiRoleBonus} = <strong className="text-xl">{finalSeriesValue}</strong>
                    </div>
                    <div className="mt-1 text-center">
                      vs Difficulty: <strong>{challenge.difficulty}</strong>
                    </div>
                  </div>
                  <motion.div
                    className="text-2xl font-bold py-3"
                    style={{ color: '#27AE60' }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: 2, duration: 0.4 }}
                  >
                    {finalSeriesValue} {'>'} {challenge.difficulty} -- Challenge Resolved!
                  </motion.div>
                </div>
                <button
                  onClick={() => setShowFailure(true)}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-black/5"
                  style={{ color: '#C0392B', border: '1px solid #C0392B' }}
                >
                  See Failure Scenario
                </button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(192,57,43,0.08)', border: '2px solid #C0392B' }}>
                  <h5 className="text-sm font-bold mb-2" style={{ color: '#C0392B' }}>Failure Scenario</h5>
                  <div className="text-sm mb-3 text-left" style={{ color: '#4A3728' }}>
                    <p className="mb-2 text-xs">
                      What if only one player contributes a weaker card, with no multi-role bonus?
                    </p>
                    <div className="mb-1">
                      Single card contribution: <strong>{failDesignerContrib}</strong>
                    </div>
                    <div className="mb-1">
                      One more weak card: <strong>+2</strong>
                    </div>
                    <div className="pt-2 border-t text-center" style={{ borderColor: 'rgba(192,57,43,0.2)' }}>
                      Total series value: <strong className="text-xl">{failFinalValue}</strong>
                    </div>
                    <div className="mt-1 text-center">
                      vs Difficulty: <strong>{challenge.difficulty}</strong>
                    </div>
                  </div>
                  <motion.div
                    className="text-xl font-bold py-2"
                    style={{ color: '#C0392B' }}
                    animate={{ x: [-3, 3, -3, 3, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    {failFinalValue} {'<'} {challenge.difficulty} -- Challenge Failed!
                  </motion.div>
                  <div className="mt-2 text-xs text-left" style={{ color: '#C0392B' }}>
                    <p className="font-semibold mb-1">Consequences:</p>
                    <ul className="space-y-0.5">
                      {challenge.failureConsequences.map((fc, i) => (
                        <li key={i}>- {fc.type.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setShowFailure(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-black/5"
                  style={{ color: '#27AE60', border: '1px solid #27AE60' }}
                >
                  Back to Success Scenario
                </button>
              </>
            )}
          </motion.div>
        </div>
      ),
    },
  ];

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8E44AD' }}>
          4
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
            Action Resolution
          </h3>
          <p className="text-xs" style={{ color: '#8B6F47' }}>Interactive demo -- play through a scenario</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: '#FDF6EC', border: '1px solid rgba(139,111,71,0.15)' }}>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 32 : 12,
                background: i <= currentStep ? '#8E44AD' : 'rgba(139,111,71,0.2)',
              }}
            />
          ))}
        </div>

        {/* Step title */}
        <h4
          className="text-center text-lg font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif", color: '#8E44AD' }}
        >
          Step {currentStep + 1}: {steps[currentStep].title}
        </h4>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {steps[currentStep].content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: 'rgba(139,111,71,0.15)' }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30 transition-colors hover:bg-black/5"
            style={{ color: '#4A3728' }}
          >
            {'<-'} Previous
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#8E44AD' }}
            >
              Next Step {'->'}
            </button>
          ) : (
            <button
              onClick={resetDemo}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#8B6F47' }}
            >
              Replay Demo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Phase 5: Scoring ─── */

function Phase5Scoring({ onBecomeVisible }: { onBecomeVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [animateScoring, setAnimateScoring] = useState(false);

  useEffect(() => {
    if (isInView) {
      onBecomeVisible();
      const timer = setTimeout(() => setAnimateScoring(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isInView, onBecomeVisible]);

  // Demo scoring values
  const playerScores: { roleId: RoleId; utility: number; weight: number }[] = [
    { roleId: 'citizen', utility: 8, weight: WELFARE_WEIGHTS.citizen },
    { roleId: 'advocate', utility: 7, weight: WELFARE_WEIGHTS.advocate },
    { roleId: 'designer', utility: 6, weight: WELFARE_WEIGHTS.designer },
    { roleId: 'investor', utility: 9, weight: WELFARE_WEIGHTS.investor },
    { roleId: 'administrator', utility: 7, weight: WELFARE_WEIGHTS.administrator },
  ];

  const weightedTotal = playerScores.reduce((sum, p) => sum + p.utility * p.weight, 0);
  const equityBonus = 2;
  const collaborationBonus = 3;
  const cwsContribution = Math.round((weightedTotal + equityBonus + collaborationBonus) * 10) / 10;

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8E44AD' }}>
          5
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
            Scoring
          </h3>
          <p className="text-xs" style={{ color: '#8B6F47' }}>How the Shared Vision Score is calculated</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: '#FDF6EC', border: '1px solid rgba(139,111,71,0.15)' }}>
        {/* CWS bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: '#8B6F47' }}>Shared Vision Score</span>
            <span style={{ color: '#8E44AD' }} className="font-bold">
              {animateScoring ? Math.round(cwsContribution) : 0} / 100
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(139,111,71,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #8E44AD, #27AE60)' }}
              initial={{ width: '0%' }}
              animate={{ width: animateScoring ? `${Math.min(cwsContribution, 100)}%` : '0%' }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>

        {/* Player utilities */}
        <div className="mb-5">
          <h5 className="text-xs font-bold mb-3" style={{ color: '#8B6F47' }}>PLAYER UTILITIES (weighted)</h5>
          <div className="space-y-2">
            {playerScores.map((p, i) => (
              <motion.div
                key={p.roleId}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={animateScoring ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.15 + 0.5 }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: ROLE_COLORS[p.roleId] }}
                >
                  {ROLE_LABELS[p.roleId].charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span style={{ color: '#4A3728' }}>
                      {ROLE_LABELS[p.roleId]}
                      <span style={{ color: '#8B6F47' }}> (x{p.weight})</span>
                    </span>
                    <span className="font-bold" style={{ color: ROLE_COLORS[p.roleId] }}>
                      {p.utility} x {p.weight} = {(p.utility * p.weight).toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(139,111,71,0.1)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: ROLE_COLORS[p.roleId] }}
                      initial={{ width: '0%' }}
                      animate={animateScoring ? { width: `${(p.utility / 10) * 100}%` } : { width: '0%' }}
                      transition={{ duration: 1, delay: i * 0.15 + 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <motion.div
          className="p-4 rounded-lg"
          style={{ background: 'rgba(142,68,173,0.05)', border: '1px solid rgba(142,68,173,0.15)' }}
          initial={{ opacity: 0 }}
          animate={animateScoring ? { opacity: 1 } : {}}
          transition={{ delay: 1.5 }}
        >
          <h5 className="text-xs font-bold mb-2" style={{ color: '#8E44AD' }}>SVS BREAKDOWN</h5>
          <div className="space-y-1 text-sm" style={{ color: '#4A3728' }}>
            <div className="flex justify-between">
              <span>Weighted utilities</span>
              <span className="font-semibold">{weightedTotal.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Equity bonus</span>
              <span className="font-semibold" style={{ color: '#27AE60' }}>+{equityBonus}</span>
            </div>
            <div className="flex justify-between">
              <span>Collaboration bonus</span>
              <span className="font-semibold" style={{ color: '#27AE60' }}>+{collaborationBonus}</span>
            </div>
            <div className="flex justify-between pt-1 border-t font-bold" style={{ borderColor: 'rgba(142,68,173,0.15)' }}>
              <span>Season SVS contribution</span>
              <span style={{ color: '#8E44AD' }}>{cwsContribution}</span>
            </div>
          </div>
        </motion.div>

        {/* Welfare weight explanation */}
        <motion.div
          className="mt-4 p-3 rounded-lg text-xs"
          style={{ background: 'rgba(139,111,71,0.04)', color: '#6B5339' }}
          initial={{ opacity: 0 }}
          animate={animateScoring ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
        >
          <p className="font-semibold mb-1" style={{ color: '#8B6F47' }}>Why are roles weighted differently?</p>
          <p>
            The welfare weight system reflects power imbalances in real urban planning.
            The <strong style={{ color: ROLE_COLORS.citizen }}>Citizen</strong> is weighted highest at <strong>{WELFARE_WEIGHTS.citizen}x</strong> because
            their voice is hardest to hear in real life.
            The <strong style={{ color: ROLE_COLORS.administrator }}>Administrator</strong> is weighted lowest at <strong>{WELFARE_WEIGHTS.administrator}x</strong> because
            they already hold institutional power. This incentivizes collaboration that centers community needs.
          </p>
        </motion.div>

        {/* Replay button */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setAnimateScoring(false);
              setTimeout(() => setAnimateScoring(true), 100);
            }}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-black/5"
            style={{ color: '#8E44AD', border: '1px solid rgba(142,68,173,0.3)' }}
          >
            Replay Animation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Chapter 5 ─── */

interface Chapter5Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Chapter5({ onNext, onBack }: Chapter5Props) {
  const [activePhase, setActivePhase] = useState<PhaseId>('event');

  const handlePhaseVisible = useCallback((phase: PhaseId) => {
    setActivePhase(phase);
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* Phase timeline */}
      <PhaseTimeline activePhase={activePhase} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: '#8E44AD' }}
          >
            How a Season Works
          </h2>
          <p className="text-sm" style={{ color: '#6B5339' }}>
            Scroll through each phase. Interactive elements let you experience the game mechanics firsthand.
          </p>
        </motion.div>

        {/* Phase sections */}
        <Phase1Event onBecomeVisible={() => handlePhaseVisible('event')} />
        <Phase2Challenge onBecomeVisible={() => handlePhaseVisible('challenge')} />
        <Phase3Deliberation onBecomeVisible={() => handlePhaseVisible('deliberation')} />
        <Phase4Action onBecomeVisible={() => handlePhaseVisible('action')} />
        <Phase5Scoring onBecomeVisible={() => handlePhaseVisible('scoring')} />

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-6 border-t" style={{ borderColor: 'rgba(139,111,71,0.2)' }}>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: '#4A3728' }}
          >
            {'<-'} The Cards
          </button>
          <button
            onClick={onNext}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#8E44AD' }}
          >
            Series & Combinations {'->'}
          </button>
        </div>
      </div>
    </div>
  );
}
