import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoleId, RoleDefinition, AbilityScores, SkillId } from '../../core/models/types';
import { QUESTION_BANK, computeCharacterSheet, ROLE_DEFAULT_ABILITIES, ROLE_TOTALS, type CharacterCreationResult, type BehavioralProfile } from '../../core/engine/characterQuestionnaire';
import { OBJECTIVE_WEIGHTS, BUCHI_OBJECTIVES, SURVIVAL_THRESHOLDS, PLAYER_TYPE, WELFARE_WEIGHTS, SKILL_ABILITY_MAP, type ObjectiveId } from '../../core/models/constants';

interface CharacterQuestionnaireProps {
  playerName: string;
  playerIndex: number;
  totalPlayers: number;
  role: RoleDefinition;
  onComplete: (result: CharacterCreationResult) => void;
}

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  authority: 'Authority', resourcefulness: 'Resourcefulness', communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge', politicalLeverage: 'Political Leverage', adaptability: 'Adaptability',
};

const SKILL_LABELS: Record<SkillId, string> = {
  negotiation: 'Negotiation', budgeting: 'Budgeting', designThinking: 'Design Thinking',
  publicSpeaking: 'Public Speaking', regulatoryNavigation: 'Regulatory Navigation',
  environmentalAssessment: 'Environmental Assessment', coalitionBuilding: 'Coalition Building', crisisManagement: 'Crisis Management',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access', culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const RESOURCE_ICONS: Record<string, string> = {
  budget: '\u{1F4B0}', influence: '\u{1F451}', volunteer: '\u{1F465}', material: '\u{1F9F1}', knowledge: '\u{1F4DA}',
};

const PROFILE_ICONS: Record<string, string> = {
  leader: '\u{1F451}', mediator: '\u{1F91D}', specialist: '\u{1F3AF}', innovator: '\u{1F4A1}',
  high: '\u{1F525}', low: '\u{1F6E1}\u{FE0F}', moderate: '\u{2696}\u{FE0F}', strategic: '\u{265F}\u{FE0F}',
  sfixed_lean: '\u{1F3DB}\u{FE0F}', environment_lean: '\u{1F33F}', balanced: '\u{2696}\u{FE0F}',
};

type Phase = 'questions' | 'computing' | 'reveal' | 'confirmed';

export function CharacterQuestionnaire({ playerName, playerIndex, totalPlayers, role, onComplete }: CharacterQuestionnaireProps) {
  const [phase, setPhase] = useState<Phase>('questions');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answerId: string }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterCreationResult | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  const question = QUESTION_BANK[currentQ];

  const handleAnswer = useCallback((answerId: string) => {
    setSelectedAnswer(answerId);
    // Auto-advance after 0.8s
    setTimeout(() => {
      const newAnswers = [...answers, { questionId: question.id, answerId }];
      setAnswers(newAnswers);
      setSelectedAnswer(null);

      if (currentQ < QUESTION_BANK.length - 1) {
        setCurrentQ(q => q + 1);
      } else {
        // All questions answered — compute character
        setPhase('computing');
        const computed = computeCharacterSheet(role.id, newAnswers);
        setResult(computed);
        // Show computing animation for 2s, then reveal
        setTimeout(() => {
          setPhase('reveal');
          // Stagger reveal steps
          let step = 0;
          const revealInterval = setInterval(() => {
            step++;
            setRevealStep(step);
            if (step >= 6) clearInterval(revealInterval);
          }, 500);
        }, 2000);
      }
    }, 800);
  }, [currentQ, question, answers, role.id]);

  // ── QUESTION PHASE ─────────────────────────────────────────
  if (phase === 'questions') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-3xl mx-auto">
        {/* Progress */}
        <div className="w-full flex items-center justify-between mb-8">
          <span className="text-stone-500 text-sm">{playerName} &middot; {role.name}</span>
          <span className="text-stone-400 text-sm font-mono">{currentQ + 1} of {QUESTION_BANK.length}</span>
        </div>
        <div className="w-full h-1.5 bg-stone-700 rounded-full mb-8 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: role.color }} animate={{ width: `${((currentQ + 1) / QUESTION_BANK.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }} className="w-full space-y-6">
            <h2 className="text-xl font-serif text-stone-100 leading-relaxed">{question.text}</h2>
            {question.context && (
              <p className="text-stone-500 text-sm italic">{question.context}</p>
            )}

            {/* 2×2 answer grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.answers.map((ans) => {
                const isSelected = selectedAnswer === ans.id;
                return (
                  <motion.button
                    key={ans.id}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'shadow-lg'
                        : 'bg-stone-700/30 border-stone-600/30 hover:bg-stone-700/50 hover:border-stone-500/50'
                    }`}
                    style={isSelected ? { borderColor: role.color, backgroundColor: `${role.color}15`, boxShadow: `0 0 20px ${role.color}33` } : undefined}
                    whileHover={!selectedAnswer ? { scale: 1.01 } : {}}
                    whileTap={!selectedAnswer ? { scale: 0.99 } : {}}
                    onClick={() => !selectedAnswer && handleAnswer(ans.id)}
                    disabled={!!selectedAnswer}
                  >
                    <p className={`text-sm leading-relaxed ${isSelected ? 'text-stone-100' : 'text-stone-300'}`}>
                      {ans.text}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── COMPUTING PHASE ────────────────────────────────────────
  if (phase === 'computing') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-20 h-20 mx-auto rounded-full border-4 border-t-transparent"
            style={{ borderColor: `${role.color}66`, borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <h2 className="text-2xl font-serif text-stone-200">Computing your character...</h2>
          <p className="text-stone-500 text-sm">Analyzing {QUESTION_BANK.length} responses for {role.name}</p>
        </motion.div>
      </div>
    );
  }

  // ── REVEAL + CONFIRM PHASE ─────────────────────────────────
  if (!result) return null;
  const { finalAbilities, abilityDeltas, finalObjectiveWeights, objectiveWeightDeltas, selectedProficiencies, behavioralProfile, totalScoreVerification } = result;
  const roleDefaults = ROLE_DEFAULT_ABILITIES[role.id];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold" style={{ color: role.color }}>{playerName}'s Character Sheet</h2>
          <p className="text-stone-500 text-sm">{role.name} &middot; Total Score: {totalScoreVerification.actual}/{totalScoreVerification.roleTarget}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${PLAYER_TYPE[role.id] === 'S-FIXED' ? 'bg-red-900/30 text-red-400 border border-red-700/50' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50'}`}>
            {PLAYER_TYPE[role.id]}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-900/30 text-amber-400 border border-amber-700/50">
            w={WELFARE_WEIGHTS[role.id]}x
          </span>
        </div>
      </div>

      <div className="bg-stone-700/30 rounded-2xl border overflow-hidden" style={{ borderColor: `${role.color}33` }}>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Column 1: Ability Scores */}
          <AnimatePresence>
            {revealStep >= 1 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Ability Scores</h3>
                {(Object.entries(finalAbilities) as [keyof AbilityScores, number][]).map(([key, value], i) => {
                  const delta = abilityDeltas[key];
                  const mod = Math.floor((value - 10) / 2);
                  return (
                    <motion.div key={key} className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <span className="text-stone-300 text-xs w-28 truncate">{ABILITY_LABELS[key]}</span>
                      <div className="flex-1 h-2 bg-stone-600 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: role.color }} initial={{ width: 0 }} animate={{ width: `${(value / 20) * 100}%` }} transition={{ delay: i * 0.08 + 0.2, duration: 0.4 }} />
                      </div>
                      <span className="text-stone-200 font-bold text-xs w-5 text-right">{value}</span>
                      <span className="text-stone-500 text-[10px] w-8">({mod >= 0 ? '+' : ''}{mod})</span>
                      {delta !== 0 && <span className={`text-[10px] w-6 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{delta > 0 ? `+${delta}` : delta}</span>}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Column 2: Objective Weights + Proficiencies */}
          <div className="space-y-4">
            <AnimatePresence>
              {revealStep >= 2 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Objective Weights</h3>
                  {(Object.entries(finalObjectiveWeights) as [ObjectiveId, number][]).map(([key, value], i) => {
                    const delta = objectiveWeightDeltas[key];
                    const isBuchi = BUCHI_OBJECTIVES[role.id]?.includes(key);
                    return (
                      <motion.div key={key} className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                        <span className="text-stone-300 text-xs w-20">{OBJECTIVE_LABELS[key]}</span>
                        <div className="flex-1 h-3 bg-stone-600 rounded-full overflow-hidden flex items-center">
                          <motion.div
                            className={`h-full rounded-full ${value < 0 ? 'bg-red-500' : ''}`}
                            style={value >= 0 ? { backgroundColor: role.color } : undefined}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, (value / 6) * 100)}%` }}
                            transition={{ delay: i * 0.06 + 0.2 }}
                          />
                        </div>
                        <span className={`font-bold text-xs w-5 text-right ${value < 0 ? 'text-red-400' : 'text-stone-200'}`}>{value}</span>
                        {delta !== 0 && <span className={`text-[10px] ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{delta > 0 ? `+${delta}` : delta}</span>}
                        {isBuchi && <span className="text-[9px] text-blue-400 bg-blue-900/30 px-1 rounded">B</span>}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {revealStep >= 3 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Proficient Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProficiencies.map((skillId, i) => (
                      <motion.span key={skillId} className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${role.color}22`, color: role.color, border: `1px solid ${role.color}44` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15, type: 'spring' }}>
                        {SKILL_LABELS[skillId]}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Column 3: Goals + Resources + Badges */}
          <div className="space-y-4">
            <AnimatePresence>
              {revealStep >= 4 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Survival</h3>
                  <div className="bg-stone-600/30 rounded-lg px-3 py-2">
                    <span className="text-amber-300 text-xs font-bold">Threshold: u_i {'\u2265'} {SURVIVAL_THRESHOLDS[role.id]}</span>
                  </div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-3">Unique Ability</h3>
                  <div className="rounded-lg px-3 py-2 border" style={{ backgroundColor: `${role.color}11`, borderColor: `${role.color}33` }}>
                    <p className="font-semibold text-sm" style={{ color: role.color }}>{role.uniqueAbility.name}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{role.uniqueAbility.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {revealStep >= 5 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Starting Resources</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(role.startingResources) as [string, number][]).filter(([, v]) => v > 0).map(([key, value], i) => (
                      <motion.div key={key} className="flex items-center gap-1 bg-stone-600/30 rounded-lg px-2 py-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <span className="text-sm">{RESOURCE_ICONS[key]}</span>
                        <span className="text-stone-300 text-xs capitalize">{key}</span>
                        <span className="text-stone-200 font-bold text-xs">{value}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {revealStep >= 6 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Behavioral Profile</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-900/30 text-indigo-300 border border-indigo-700/50">
                      {PROFILE_ICONS[behavioralProfile.coalitionStyle]} {behavioralProfile.coalitionStyle}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-900/30 text-amber-300 border border-amber-700/50">
                      {PROFILE_ICONS[behavioralProfile.riskTolerance]} risk: {behavioralProfile.riskTolerance}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-900/30 text-purple-300 border border-purple-700/50">
                      {PROFILE_ICONS[behavioralProfile.sfixedVsEnvironment]} {behavioralProfile.sfixedVsEnvironment.replace('_', ' ')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Confirm button */}
        {revealStep >= 6 && phase !== 'confirmed' && (
          <motion.div className="p-6 pt-2 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <button
              className="px-10 py-3 rounded-xl text-sm font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: role.color, color: '#1a1a2e' }}
              onClick={() => {
                console.log('Character confirmed for', playerName, role.id);
                setPhase('confirmed');
                // Brief success animation, then call onComplete
                setTimeout(() => {
                  onComplete(result);
                }, 1200);
              }}
            >
              Confirm Character
            </button>
          </motion.div>
        )}

        {/* Confirmed state */}
        {phase === 'confirmed' && (
          <motion.div
            className="p-6 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: `${role.color}22`, border: `3px solid ${role.color}` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <span className="text-2xl" style={{ color: role.color }}>{'\u2713'}</span>
            </motion.div>
            <p className="text-lg font-serif font-bold" style={{ color: role.color }}>Character Confirmed!</p>
            <p className="text-stone-500 text-sm mt-1">
              {playerIndex < totalPlayers - 1
                ? `Preparing for next player...`
                : `All characters created!`
              }
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
