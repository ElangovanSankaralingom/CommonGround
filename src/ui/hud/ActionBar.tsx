import { motion } from 'framer-motion';
import { useCallback, useEffect } from 'react';
import type { GamePhase } from '../../core/models/types';

interface ActionBarProps {
  currentPhase: GamePhase;
  canPlayCard: boolean;
  canStartSeries: boolean;
  canContribute: boolean;
  canTrade: boolean;
  canMove: boolean;
  canUseAbility: boolean;
  roleColor: string;
  onAction: (action: string) => void;
}

interface ActionButton {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  getEnabled: (props: ActionBarProps) => boolean;
}

const ACTION_BUTTONS: ActionButton[] = [
  {
    id: 'play_card',
    label: 'Play Card',
    icon: '🃏',
    shortcut: '1',
    getEnabled: (p) => p.canPlayCard,
  },
  {
    id: 'start_series',
    label: 'Start Series',
    icon: '⛓',
    shortcut: '2',
    getEnabled: (p) => p.canStartSeries,
  },
  {
    id: 'contribute',
    label: 'Contribute',
    icon: '🤝',
    shortcut: '3',
    getEnabled: (p) => p.canContribute,
  },
  {
    id: 'trade',
    label: 'Trade',
    icon: '🔄',
    shortcut: '4',
    getEnabled: (p) => p.canTrade,
  },
  {
    id: 'move',
    label: 'Move',
    icon: '👣',
    shortcut: '5',
    getEnabled: (p) => p.canMove,
  },
  {
    id: 'unique_ability',
    label: 'Unique Ability',
    icon: '✨',
    shortcut: '6',
    getEnabled: (p) => p.canUseAbility,
  },
  {
    id: 'pass',
    label: 'Pass',
    icon: '⏭',
    shortcut: '7',
    getEnabled: () => true,
  },
];

export function ActionBar(props: ActionBarProps) {
  const { roleColor, onAction, currentPhase } = props;
  const isActionPhase = currentPhase === 'individual_action';

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActionPhase) return;
      const index = parseInt(e.key) - 1;
      if (index >= 0 && index < ACTION_BUTTONS.length) {
        const button = ACTION_BUTTONS[index];
        if (button.getEnabled(props)) {
          onAction(button.id);
        }
      }
    },
    [isActionPhase, onAction, props]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex items-center justify-center gap-1.5 w-full bg-stone-900/95 backdrop-blur-sm border-t border-stone-700/50 px-4 py-3 rounded-t-lg shadow-2xl">
      {ACTION_BUTTONS.map((button) => {
        const enabled = isActionPhase && button.getEnabled(props);

        return (
          <motion.button
            key={button.id}
            onClick={() => enabled && onAction(button.id)}
            disabled={!enabled}
            className={`relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-w-[80px] ${
              enabled
                ? 'cursor-pointer text-white hover:brightness-110 active:scale-95'
                : 'cursor-not-allowed text-stone-600 bg-stone-800/50'
            }`}
            style={
              enabled
                ? {
                    backgroundColor: `${roleColor}22`,
                    border: `1px solid ${roleColor}66`,
                  }
                : {
                    border: '1px solid #44403C44',
                  }
            }
            whileHover={enabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={enabled ? { scale: 0.95 } : {}}
            animate={
              enabled
                ? {
                    boxShadow: [
                      `0 0 0px ${roleColor}00`,
                      `0 2px 12px ${roleColor}44`,
                    ],
                  }
                : {}
            }
            transition={{ duration: 0.3 }}
          >
            {/* Active glow */}
            {enabled && (
              <motion.div
                className="absolute inset-0 rounded-lg opacity-20"
                style={{ backgroundColor: roleColor }}
                animate={{ opacity: [0.1, 0.25, 0.1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Icon */}
            <span className="text-lg leading-none relative z-10">{button.icon}</span>

            {/* Label */}
            <span className="text-[11px] leading-none relative z-10 whitespace-nowrap">
              {button.label}
            </span>

            {/* Keyboard shortcut badge */}
            <span
              className={`absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold z-20 ${
                enabled
                  ? 'bg-stone-700 text-stone-300 border border-stone-600'
                  : 'bg-stone-800 text-stone-600 border border-stone-700'
              }`}
            >
              {button.shortcut}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
