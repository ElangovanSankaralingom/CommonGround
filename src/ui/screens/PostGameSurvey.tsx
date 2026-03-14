import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import type { RoleId, SurveyResponse } from '../../core/models/types';

const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'City Administrator',
  designer: 'Urban Designer',
  citizen: 'Community Organizer',
  investor: 'Private Investor',
  advocate: 'Environmental Advocate',
};

const ROLE_ICONS: Record<RoleId, string> = {
  administrator: '\u{1F3DB}',
  designer: '\u{1F4D0}',
  citizen: '\u{1F91D}',
  investor: '\u{1F4B0}',
  advocate: '\u{1F33F}',
};

const ALL_ROLES: RoleId[] = ['administrator', 'designer', 'citizen', 'investor', 'advocate'];

const LIKERT_LABELS = [
  'Strongly Disagree',
  'Disagree',
  'Somewhat Disagree',
  'Neutral',
  'Somewhat Agree',
  'Agree',
  'Strongly Agree',
];

interface PlayerInfo {
  id: string;
  name: string;
  roleId: RoleId;
  finalUtility: number;
  level: number;
  totalCP: number;
}

interface PostGameSurveyProps {
  players: PlayerInfo[];
  onComplete: (responses: SurveyResponse[]) => void;
}

function LikertScale({
  value,
  onChange,
  label,
  description,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
      <h3 className="font-semibold text-stone-200 mb-1">{label}</h3>
      <p className="text-stone-500 text-sm mb-4">{description}</p>
      <div className="flex items-center justify-between">
        {LIKERT_LABELS.map((likertLabel, i) => (
          <button
            key={i}
            className={`flex flex-col items-center gap-1 transition-all ${
              value === i + 1 ? '' : 'opacity-50 hover:opacity-75'
            }`}
            onClick={() => onChange(i + 1)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                          transition-all ${
                            value === i + 1
                              ? 'bg-amber-400 text-stone-900 scale-110 shadow-lg shadow-amber-400/30'
                              : 'bg-stone-600 text-stone-300'
                          }`}
            >
              {i + 1}
            </div>
            <span className="text-[9px] text-stone-500 text-center w-14 leading-tight">
              {likertLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PostGameSurvey({ players, onComplete }: PostGameSurveyProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  // Per-player state
  const [powerRanking, setPowerRanking] = useState<RoleId[]>([...ALL_ROLES]);
  const [fairness, setFairness] = useState(4);
  const [collaborationSatisfaction, setCollaborationSatisfaction] = useState(4);
  const [willingnessToApply, setWillingnessToApply] = useState(4);
  const [reflectionText, setReflectionText] = useState('');

  const currentPlayer = players[currentPlayerIndex];

  const handleSubmit = useCallback(() => {
    const response: SurveyResponse = {
      playerId: currentPlayer.id,
      roleId: currentPlayer.roleId,
      type: 'post',
      powerRanking: [...powerRanking],
      likertResponses: {
        fairness,
        collaborationSatisfaction,
        willingnessToApply,
      },
      openText: reflectionText || undefined,
      timestamp: new Date().toISOString(),
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((i) => i + 1);
      setPowerRanking([...ALL_ROLES]);
      setFairness(4);
      setCollaborationSatisfaction(4);
      setWillingnessToApply(4);
      setReflectionText('');
    } else {
      onComplete(newResponses);
    }
  }, [
    currentPlayer,
    powerRanking,
    fairness,
    collaborationSatisfaction,
    willingnessToApply,
    reflectionText,
    responses,
    currentPlayerIndex,
    players.length,
    onComplete,
  ]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayerIndex}
            className="space-y-8"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-serif font-bold text-amber-300">Post-Game Survey</h1>
              <p className="text-stone-400 mt-1">
                Player {currentPlayerIndex + 1} of {players.length}
              </p>
            </div>

            {/* Player info with stats */}
            <div className="bg-stone-700/50 rounded-xl p-5 flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: ROLE_COLORS[currentPlayer.roleId] }}
              >
                {ROLE_ICONS[currentPlayer.roleId]}
              </div>
              <div className="flex-1">
                <p className="text-stone-200 font-bold text-lg">{currentPlayer.name}</p>
                <p className="text-sm" style={{ color: ROLE_COLORS[currentPlayer.roleId] }}>
                  {ROLE_NAMES[currentPlayer.roleId]}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-stone-500 text-xs">Utility</p>
                  <p className="text-amber-300 font-bold text-lg">{currentPlayer.finalUtility}</p>
                </div>
                <div className="text-center">
                  <p className="text-stone-500 text-xs">Level</p>
                  <p className="text-stone-200 font-bold text-lg">{currentPlayer.level}</p>
                </div>
                <div className="text-center">
                  <p className="text-stone-500 text-xs">CP</p>
                  <p className="text-stone-200 font-bold text-lg">{currentPlayer.totalCP}</p>
                </div>
              </div>
            </div>

            {/* Q1: Power Ranking */}
            <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
              <h3 className="font-semibold text-stone-200 mb-1">
                Q1: Rank all 5 roles by experienced power
              </h3>
              <p className="text-stone-500 text-sm mb-4">
                Based on your actual gameplay experience. Drag to reorder. Top = most powerful.
              </p>

              <Reorder.Group
                axis="y"
                values={powerRanking}
                onReorder={setPowerRanking}
                className="space-y-2"
              >
                {powerRanking.map((roleId, index) => (
                  <Reorder.Item
                    key={roleId}
                    value={roleId}
                    className="flex items-center gap-3 bg-stone-600/50 rounded-lg px-4 py-3 cursor-grab
                               active:cursor-grabbing border border-stone-500/20 hover:border-stone-400/30
                               transition-colors"
                  >
                    <span className="text-stone-500 text-sm font-bold w-6">{index + 1}.</span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: ROLE_COLORS[roleId] }}
                    >
                      {ROLE_ICONS[roleId]}
                    </div>
                    <span className="text-stone-200 text-sm font-medium">{ROLE_NAMES[roleId]}</span>
                    <div className="ml-auto text-stone-500">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 5h8M4 8h8M4 11h8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            {/* Q2: Fairness */}
            <LikertScale
              value={fairness}
              onChange={setFairness}
              label="Q2: The game felt fair to all players."
              description="Rate on a scale of 1-7"
            />

            {/* Q3: Collaboration Satisfaction */}
            <LikertScale
              value={collaborationSatisfaction}
              onChange={setCollaborationSatisfaction}
              label="Q3: I am satisfied with the level of collaboration during the game."
              description="Rate on a scale of 1-7"
            />

            {/* Q4: Willingness to Apply */}
            <LikertScale
              value={willingnessToApply}
              onChange={setWillingnessToApply}
              label="Q4: I would be willing to apply insights from this game to real-world placemaking."
              description="Rate on a scale of 1-7"
            />

            {/* Q5: Open Reflection */}
            <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
              <h3 className="font-semibold text-stone-200 mb-1">
                Q5: Open Reflection
              </h3>
              <p className="text-stone-500 text-sm mb-4">
                Share any thoughts, insights, or reflections about your gameplay experience.
              </p>
              <textarea
                className="w-full h-32 bg-stone-600/50 rounded-xl p-4 text-stone-200 text-sm
                           border border-stone-500/30 focus:border-amber-400/50 focus:outline-none
                           resize-none placeholder:text-stone-600"
                placeholder="What surprised you? What would you do differently? Did the game change how you think about stakeholder collaboration?"
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="text-center pb-8">
              <motion.button
                className="px-10 py-3 rounded-xl font-bold text-sm bg-amber-400 text-stone-900
                           hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
              >
                {currentPlayerIndex < players.length - 1 ? 'Submit & Next Player' : 'Submit All Responses'}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
