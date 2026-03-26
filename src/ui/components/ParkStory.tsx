import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ParkStoryProps {
  onComplete: () => void;
}

function GoodParkSVG() {
  return (
    <svg viewBox="0 0 1000 600" width="100%" height="100%">
      {/* Sky */}
      <rect x="0" y="0" width="1000" height="600" fill="#87CEEB" />
      {/* Ground */}
      <rect x="0" y="420" width="1000" height="180" fill="#4CAF50" />
      {/* Sun */}
      <circle cx="880" cy="80" r="50" fill="#FFC107" />
      {/* Pathways */}
      <path d="M100,500 Q300,460 500,500 Q700,540 900,490" stroke="#D4A574" strokeWidth="18" fill="none" strokeLinecap="round" />
      <path d="M400,500 Q450,440 500,420" stroke="#D4A574" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Pond */}
      <ellipse cx="750" cy="460" rx="90" ry="40" fill="#2196F3" />
      <path d="M680,455 Q710,448 740,455" stroke="#1976D2" strokeWidth="2" fill="none" />
      <path d="M750,465 Q780,458 810,465" stroke="#1976D2" strokeWidth="2" fill="none" />
      {/* Fountain */}
      <circle cx="750" cy="440" r="10" fill="#90CAF9" stroke="#1565C0" strokeWidth="1.5" />
      <line x1="750" y1="430" x2="750" y2="415" stroke="#64B5F6" strokeWidth="2" />
      <line x1="745" y1="432" x2="740" y2="418" stroke="#64B5F6" strokeWidth="1.5" />
      <line x1="755" y1="432" x2="760" y2="418" stroke="#64B5F6" strokeWidth="1.5" />
      {/* Trees */}
      <rect x="145" y="370" width="10" height="50" fill="#5D4037" />
      <circle cx="150" cy="350" r="30" fill="#2E7D32" />
      <rect x="275" y="360" width="10" height="60" fill="#5D4037" />
      <circle cx="280" cy="340" r="35" fill="#2E7D32" />
      <rect x="420" y="375" width="8" height="45" fill="#5D4037" />
      <circle cx="424" cy="355" r="28" fill="#2E7D32" />
      <rect x="580" y="365" width="10" height="55" fill="#5D4037" />
      <circle cx="585" cy="345" r="32" fill="#2E7D32" />
      <rect x="900" y="380" width="8" height="40" fill="#5D4037" />
      <circle cx="904" cy="360" r="25" fill="#2E7D32" />
      {/* Benches */}
      <rect x="200" y="475" width="40" height="8" rx="2" fill="#8B6F47" />
      <rect x="200" y="483" width="4" height="10" fill="#8B6F47" />
      <rect x="236" y="483" width="4" height="10" fill="#8B6F47" />
      <rect x="600" y="470" width="40" height="8" rx="2" fill="#8B6F47" />
      <rect x="600" y="478" width="4" height="10" fill="#8B6F47" />
      <rect x="636" y="478" width="4" height="10" fill="#8B6F47" />
      {/* Playground - Swing */}
      <rect x="340" y="440" width="50" height="4" fill="#F57F17" />
      <line x1="350" y1="444" x2="350" y2="490" stroke="#5D4037" strokeWidth="2" />
      <line x1="380" y1="444" x2="380" y2="490" stroke="#5D4037" strokeWidth="2" />
      <rect x="345" y="485" width="12" height="3" fill="#5D4037" />
      <rect x="375" y="485" width="12" height="3" fill="#5D4037" />
      {/* Playground - Slide */}
      <polygon points="460,490 480,455 485,490" fill="#E65100" />
      {/* People */}
      <circle cx="215" cy="462" r="5" fill="#424242" />
      <rect x="212" y="467" width="6" height="12" rx="2" fill="#424242" />
      <circle cx="365" cy="430" r="5" fill="#424242" />
      <rect x="362" y="435" width="6" height="12" rx="2" fill="#424242" />
      <circle cx="615" cy="458" r="5" fill="#424242" />
      <rect x="612" y="463" width="6" height="12" rx="2" fill="#424242" />
      <circle cx="500" cy="488" r="5" fill="#424242" />
      <rect x="497" y="493" width="6" height="12" rx="2" fill="#424242" />
    </svg>
  );
}

function DegradedParkSVG() {
  return (
    <svg viewBox="0 0 1000 600" width="100%" height="100%">
      {/* Sky - overcast */}
      <rect x="0" y="0" width="1000" height="600" fill="#B0BEC5" />
      {/* Ground - brown */}
      <rect x="0" y="420" width="1000" height="180" fill="#8D6E63" />
      {/* No sun */}
      {/* Pathways - broken */}
      <path d="M100,500 Q300,460 500,500 Q700,540 900,490" stroke="#D4A574" strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray="20 15" />
      <path d="M400,500 Q450,440 500,420" stroke="#D4A574" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="12 10" />
      {/* Pond - murky */}
      <ellipse cx="750" cy="460" rx="90" ry="40" fill="#558B2F" />
      <circle cx="730" cy="450" r="4" fill="#33691E" />
      <circle cx="770" cy="465" r="3" fill="#33691E" />
      <circle cx="755" cy="445" r="3.5" fill="#33691E" />
      {/* Fountain - cracked, no spray */}
      <circle cx="750" cy="440" r="10" fill="#78909C" stroke="#546E7A" strokeWidth="1.5" />
      <line x1="743" y1="436" x2="757" y2="444" stroke="#37474F" strokeWidth="1" />
      {/* Trees - grey/brown */}
      <rect x="145" y="370" width="10" height="50" fill="#4E342E" />
      <circle cx="150" cy="355" r="25" fill="#795548" />
      <rect x="275" y="360" width="10" height="60" fill="#4E342E" />
      <circle cx="280" cy="345" r="28" fill="#795548" />
      <rect x="420" y="375" width="8" height="45" fill="#4E342E" />
      <circle cx="424" cy="360" r="22" fill="#6D4C41" />
      <rect x="580" y="365" width="10" height="55" fill="#4E342E" />
      <circle cx="585" cy="350" r="26" fill="#795548" />
      <rect x="900" y="380" width="8" height="40" fill="#4E342E" />
      <circle cx="904" cy="365" r="18" fill="#6D4C41" />
      {/* Benches - one tilted */}
      <rect x="200" y="475" width="40" height="8" rx="2" fill="#6D4C41" />
      <rect x="200" y="483" width="4" height="10" fill="#6D4C41" />
      <rect x="236" y="483" width="4" height="10" fill="#6D4C41" />
      <g transform="rotate(12, 620, 474)">
        <rect x="600" y="470" width="40" height="8" rx="2" fill="#6D4C41" />
        <rect x="600" y="478" width="4" height="10" fill="#6D4C41" />
        <rect x="636" y="478" width="4" height="10" fill="#6D4C41" />
      </g>
      {/* Playground - tilted/rusty swing */}
      <rect x="340" y="440" width="50" height="4" fill="#BF360C" />
      <line x1="350" y1="444" x2="345" y2="490" stroke="#4E342E" strokeWidth="2" />
      <line x1="380" y1="444" x2="385" y2="490" stroke="#4E342E" strokeWidth="2" />
      {/* Slide - same but rusty */}
      <polygon points="460,490 480,455 485,490" fill="#BF360C" opacity="0.7" />
      {/* No people */}
      {/* Garbage scattered */}
      <circle cx="180" cy="495" r="4" fill="#37474F" />
      <circle cx="320" cy="510" r="3.5" fill="#37474F" />
      <circle cx="470" cy="480" r="3" fill="#37474F" />
      <circle cx="550" cy="505" r="4" fill="#37474F" />
      <circle cx="680" cy="490" r="3.5" fill="#37474F" />
      <circle cx="850" cy="500" r="3" fill="#37474F" />
    </svg>
  );
}

const TEXTS: { time: number; text: string }[] = [
  { time: 2, text: 'This is Corporation Eco-Park. 5.5 acres in the heart of Madurai.' },
  { time: 10, text: 'Over the years, neglect took hold. Different stakeholders blamed each other.' },
  { time: 20, text: "Today, 5 stakeholders will try something different. Instead of arguing, they'll play." },
];

export function ParkStory({ onComplete }: ParkStoryProps) {
  const [elapsed, setElapsed] = useState(0);
  const [activeText, setActiveText] = useState('');
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const s = (Date.now() - start) / 1000;
      setElapsed(s);
      // Update text
      let current = '';
      for (const t of TEXTS) {
        if (s >= t.time) current = t.text;
      }
      setActiveText(current);
      if (s >= 22) setShowButton(true);
    }, 100);
    return () => clearInterval(tick);
  }, []);

  // Good layer: opacity 1 from 0-8s, cross-fade 1->0 from 8-18s, then 0
  const goodOpacity = elapsed < 8 ? 1 : elapsed > 18 ? 0 : 1 - (elapsed - 8) / 10;
  // Degraded layer: inverse
  const degradedOpacity = elapsed < 8 ? 0 : elapsed > 18 ? 1 : (elapsed - 8) / 10;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 1000, margin: '0 auto', aspectRatio: '1000/600', background: '#000' }}>
      {/* Good state layer */}
      <div style={{ position: 'absolute', inset: 0, opacity: goodOpacity, transition: 'opacity 0.1s linear' }}>
        <GoodParkSVG />
      </div>
      {/* Degraded state layer */}
      <div style={{ position: 'absolute', inset: 0, opacity: degradedOpacity, transition: 'opacity 0.1s linear' }}>
        <DegradedParkSVG />
      </div>
      {/* Text overlay */}
      <motion.div
        key={activeText}
        initial={{ opacity: 0 }}
        animate={{ opacity: activeText ? 1 : 0 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)',
          color: '#fff',
          padding: '14px 28px',
          borderRadius: 10,
          fontSize: '1.1rem',
          maxWidth: '85%',
          textAlign: 'center',
          lineHeight: 1.5,
          pointerEvents: 'none',
        }}
      >
        {activeText}
      </motion.div>
      {/* Begin button */}
      {showButton && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          onClick={onComplete}
          style={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            padding: '14px 36px',
            borderRadius: 8,
            fontSize: '1.2rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          Begin Your Story &rarr;
        </motion.button>
      )}
    </div>
  );
}
