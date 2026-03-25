import { motion } from 'framer-motion';

interface PhaseNavigationProps {
  onContinue: () => void;
  onBack?: () => void;
  continueLabel?: string;
  backLabel?: string;
  canContinue: boolean;
  showBack?: boolean;
  /** Optional skip button for testing/debug */
  onSkip?: () => void;
  skipLabel?: string;
}

/**
 * Universal bottom navigation bar rendered at the bottom of every gameplay phase.
 * Provides forward/backward navigation with clear labeling and disabled states.
 */
export function PhaseNavigation({
  onContinue,
  onBack,
  continueLabel = 'Continue \u2192',
  backLabel = '\u2190 Back',
  canContinue,
  showBack = false,
  onSkip,
  skipLabel = 'Skip \u2192',
}: PhaseNavigationProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: 'rgba(15,15,25,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Left: Back button */}
      {showBack && onBack ? (
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            color: '#9CA3AF',
            background: 'rgba(55,55,70,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
        >
          {backLabel}
        </motion.button>
      ) : (
        <div />
      )}

      {/* Center: Skip button (debug) */}
      {onSkip && (
        <motion.button
          onClick={onSkip}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            color: '#6B7280',
            background: 'rgba(55,55,70,0.4)',
            border: '1px dashed rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
        >
          {skipLabel}
        </motion.button>
      )}

      {/* Right: Continue button */}
      <motion.button
        onClick={() => {
          if (canContinue) {
            console.log('PHASE NAV: Continue clicked —', continueLabel);
            onContinue();
          }
        }}
        whileHover={canContinue ? { scale: 1.04 } : {}}
        whileTap={canContinue ? { scale: 0.97 } : {}}
        style={{
          padding: '12px 28px',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: canContinue ? '#1C1917' : '#6B7280',
          background: canContinue
            ? 'linear-gradient(135deg, #F59E0B, #F4D03F)'
            : 'rgba(55,55,70,0.5)',
          border: canContinue
            ? '1px solid rgba(245,158,11,0.5)'
            : '1px solid rgba(255,255,255,0.05)',
          cursor: canContinue ? 'pointer' : 'not-allowed',
          opacity: canContinue ? 1 : 0.5,
          boxShadow: canContinue ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
        }}
      >
        {continueLabel}
      </motion.button>
    </div>
  );
}
