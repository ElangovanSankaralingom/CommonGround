import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Chapter1 = lazy(() => import('./howtoplay/Chapter1'));
const Chapter2 = lazy(() => import('./howtoplay/Chapter2'));
const Chapter3 = lazy(() => import('./howtoplay/Chapter3'));
const Chapter4 = lazy(() => import('./howtoplay/Chapter4'));
const Chapter5 = lazy(() => import('./howtoplay/Chapter5'));
const Chapter6 = lazy(() => import('./howtoplay/Chapter6'));
const Chapter7 = lazy(() => import('./howtoplay/Chapter7'));
const Chapter8 = lazy(() => import('./howtoplay/Chapter8'));

const CHAPTERS = [
  { id: 1, title: 'What is CommonGround?', accent: '#C75B39' },
  { id: 2, title: 'The Five Roles', accent: '#2E86AB' },
  { id: 3, title: 'The Board', accent: '#7BA05B' },
  { id: 4, title: 'The Cards', accent: '#E67E22' },
  { id: 5, title: 'How a Round Works', accent: '#8E44AD' },
  { id: 6, title: 'Series & Combinations', accent: '#F4D03F' },
  { id: 7, title: 'Winning & Losing', accent: '#27AE60' },
  { id: 8, title: 'Quick Reference', accent: '#1B3A5C' },
];

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = back, 1 = forward
  const [showSidebar, setShowSidebar] = useState(false);

  const goNext = useCallback(() => {
    if (currentChapter < CHAPTERS.length - 1) {
      setDirection(1);
      setCurrentChapter(c => c + 1);
    }
  }, [currentChapter]);

  const goBack = useCallback(() => {
    if (currentChapter > 0) {
      setDirection(-1);
      setCurrentChapter(c => c - 1);
    }
  }, [currentChapter]);

  const goToChapter = useCallback((idx: number) => {
    setDirection(idx > currentChapter ? 1 : -1);
    setCurrentChapter(idx);
    setShowSidebar(false);
  }, [currentChapter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goBack, onClose]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const renderChapter = () => {
    const components = [Chapter1, Chapter2, Chapter3, Chapter4, Chapter5, Chapter6, Chapter7, Chapter8];
    const Component = components[currentChapter];
    return <Component onNext={goNext} onBack={goBack} />;
  };

  const chapter = CHAPTERS[currentChapter];

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#F5E6D3' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b" style={{ borderColor: 'rgba(139, 111, 71, 0.2)', background: 'rgba(245, 230, 211, 0.95)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors text-sm"
            style={{ color: '#8B6F47' }}
          >
            ☰
          </button>
          <div>
            <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8B6F47' }}>
              Chapter {currentChapter + 1} of {CHAPTERS.length}
            </span>
            <h2 className="text-lg font-bold -mt-0.5" style={{ fontFamily: "'Playfair Display', serif", color: chapter.accent }}>
              {chapter.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: chapter.accent, color: '#F5E6D3' }}
          >
            {currentChapter === CHAPTERS.length - 1 ? 'Start Playing' : 'Skip to Game'}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#8B6F47' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 z-50 w-72 shadow-xl overflow-y-auto"
              style={{ background: '#F5E6D3' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            >
              <div className="p-4">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: '#1B3A5C' }}>
                  Chapters
                </h3>
                {CHAPTERS.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => goToChapter(idx)}
                    className="w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all text-sm"
                    style={{
                      background: idx === currentChapter ? ch.accent : 'transparent',
                      color: idx === currentChapter ? '#F5E6D3' : '#4A3728',
                      fontWeight: idx === currentChapter ? 600 : 400,
                    }}
                  >
                    <span className="opacity-50 mr-2">{idx + 1}.</span>
                    {ch.title}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chapter content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentChapter}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-lg" style={{ color: '#8B6F47' }}>Loading...</div>
              </div>
            }>
              {renderChapter()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(139, 111, 71, 0.2)', background: 'rgba(245, 230, 211, 0.95)' }}>
        <button
          onClick={goBack}
          disabled={currentChapter === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
          style={{ color: '#4A3728' }}
        >
          ← Back
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {CHAPTERS.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => goToChapter(idx)}
              className="transition-all rounded-full"
              style={{
                width: idx === currentChapter ? 24 : 8,
                height: 8,
                background: idx === currentChapter ? ch.accent : idx < currentChapter ? '#8B6F47' : 'rgba(139, 111, 71, 0.3)',
              }}
            />
          ))}
        </div>

        <button
          onClick={currentChapter === CHAPTERS.length - 1 ? onClose : goNext}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: chapter.accent, color: '#F5E6D3' }}
        >
          {currentChapter === CHAPTERS.length - 1 ? 'Start Playing →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
