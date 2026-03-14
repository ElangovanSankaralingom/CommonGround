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
}

interface PreGameSurveyProps {
  players: PlayerInfo[];
  onComplete: (responses: SurveyResponse[]) => void;
}

export default function PreGameSurvey({ players, onComplete }: PreGameSurveyProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  // Per-player state
  const [powerRanking, setPowerRanking] = useState<RoleId[]>([...ALL_ROLES]);
  const [collaborationDifficulty, setCollaborationDifficulty] = useState(4);
  const [goalLikelihood, setGoalLikelihood] = useState(4);

  const currentPlayer = players[currentPlayerIndex];

  const handleSubmit = useCallback(() => {
    const response: SurveyResponse = {
      playerId: currentPlayer.id,
      roleId: currentPlayer.roleId,
      type: 'pre',
      powerRanking: [...powerRanking],
      likertResponses: {
        collaborationDifficulty,
        goalLikelihood,
      },
      timestamp: new Date().toISOString(),
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((i) => i + 1);
      setPowerRanking([...ALL_ROLES]);
      setCollaborationDifficulty(4);
      setGoalLikelihood(4);
    } else {
      onComplete(newResponses);
    }
  }, [currentPlayer, powerRanking, collaborationDifficulty, goalLikelihood, responses, currentPlayerIndex, players.length, onComplete]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPlayerIndex}
          className="max-w-2xl w-full space-y-8"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-amber-300">Pre-Game Survey</h1>
            <p className="text-stone-400 mt-1">
              Player {currentPlayerIndex + 1} of {players.length}
            </p>
          </div>

          {/* Player info */}
          <div className="flex items-center justify-center gap-4 bg-stone-700/50 rounded-xl p-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: ROLE_COLORS[currentPlayer.roleId] }}
            >
              {ROLE_ICONS[currentPlayer.roleId]}
            </div>
            <div>
              <p className="text-stone-200 font-bold">{currentPlayer.name}</p>
              <p className="text-sm" style={{ color: ROLE_COLORS[currentPlayer.roleId] }}>
                {ROLE_NAMES[currentPlayer.roleId]}
              </p>
            </div>
          </div>

          {/* Q1: Power Ranking */}
          <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
            <h3 className="font-semibold text-stone-200 mb-1">
              Q1: Rank all 5 roles by perceived power
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              Drag to reorder. Top = most powerful, bottom = least powerful.
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

          {/* Q2: Collaboration Difficulty */}
          <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
            <h3 className="font-semibold text-stone-200 mb-1">
              Q2: How difficult do you expect collaboration to be?
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              Rate on a scale of 1-7
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {LIKERT_LABELS.map((label, i) => (
                  <button
                    key={i}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      collaborationDifficulty === i + 1 ? '' : 'opacity-50 hover:opacity-75'
                    }`}
                    onClick={() => setCollaborationDifficulty(i + 1)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                  transition-all ${
                                    collaborationDifficulty === i + 1
                                      ? 'bg-amber-400 text-stone-900 scale-110 shadow-lg shadow-amber-400/30'
                                      : 'bg-stone-600 text-stone-300'
                                  }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[9px] text-stone-500 text-center w-14 leading-tight">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Q3: Goal Achievement Likelihood */}
          <div className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30">
            <h3 className="font-semibold text-stone-200 mb-1">
              Q3: How likely do you think it is that you will achieve your goals?
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              Rate on a scale of 1-7
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {LIKERT_LABELS.map((label, i) => (
                  <button
                    key={i}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      goalLikelihood === i + 1 ? '' : 'opacity-50 hover:opacity-75'
                    }`}
                    onClick={() => setGoalLikelihood(i + 1)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                  transition-all ${
                                    goalLikelihood === i + 1
                                      ? 'bg-amber-400 text-stone-900 scale-110 shadow-lg shadow-amber-400/30'
                                      : 'bg-stone-600 text-stone-300'
                                  }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[9px] text-stone-500 text-center w-14 leading-tight">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
              {currentPlayerIndex < players.length - 1 ? 'Submit & Next Player' : 'Submit & Start Game'}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
