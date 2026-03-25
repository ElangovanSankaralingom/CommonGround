import React from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

interface CluePosition {
  id: string;
  x: number;
  y: number;
  found: boolean;
  type: 'consequence' | 'capability' | 'outcome' | 'resource' | 'connection';
}

interface Props {
  zoneId: string;
  cluePositions: CluePosition[];
  foundClues: string[];
  activePlayerId: string | null;
  onClueClick: (clueId: string) => void;
}

// ── Color palette ───────────────────────────────────────────────────────────

const C = {
  earth: '#2C1810',
  sage: '#5C7A5C',
  water: '#2E86AB',
  sand: '#D4A574',
  gold: '#F4D03F',
  terracotta: '#C75B39',
} as const;

const CLUE_TYPE_COLORS: Record<string, string> = {
  consequence: '#E74C3C',
  capability: '#3498DB',
  outcome: '#F4D03F',
  resource: '#27AE60',
  connection: '#9B59B6',
};

// ── Zone background colors ──────────────────────────────────────────────────

const ZONE_BG: Record<string, string> = {
  main_entrance: '#F5ECD7',
  fountain_plaza: '#E8E0D0',
  boating_pond: '#D6E8F0',
  playground: '#F0E8D0',
  walking_track: '#E0EADB',
  herbal_garden: '#D8E8D0',
  open_lawn: '#DCECD0',
  exercise_zone: '#E8DDD0',
  sculpture_garden: '#EDE0E8',
  vendor_hub: '#F5E6D0',
  restroom_block: '#E0DDD8',
  fiber_optic_lane: '#D8D8E8',
  ppp_zone: '#E8E0D0',
  maintenance_depot: '#DDD8D0',
};

// ── Pulsing animation keyframes (injected once) ─────────────────────────────

const PULSE_KEYFRAMES = `
@keyframes zone-clue-pulse {
  0%   { r: 18; opacity: 0.5; }
  50%  { r: 24; opacity: 0.3; }
  100% { r: 18; opacity: 0.5; }
}
`;

// ── Individual zone illustration renderers ──────────────────────────────────

function MainEntrance() {
  return (
    <g>
      {/* Ground / pathway */}
      <rect x={0} y={380} width={800} height={120} fill={C.sand} opacity={0.4} />
      {/* Parking lines */}
      {[100, 160, 220, 280, 340].map((x) => (
        <rect key={x} x={x} y={420} width={50} height={80} fill="none" stroke={C.earth} strokeWidth={2} />
      ))}
      {/* Gate arch */}
      <rect x={500} y={150} width={20} height={230} fill={C.earth} />
      <rect x={680} y={150} width={20} height={230} fill={C.earth} />
      <path d="M500,150 Q600,60 700,150" fill="none" stroke={C.earth} strokeWidth={6} />
      {/* Pathway from gate */}
      <rect x={540} y={380} width={140} height={20} fill={C.sand} rx={4} />
      <rect x={570} y={340} width={80} height={50} fill={C.sand} opacity={0.7} rx={4} />
      {/* Ticket booth */}
      <rect x={60} y={200} width={100} height={120} fill={C.terracotta} rx={6} />
      <rect x={75} y={220} width={70} height={40} fill={C.gold} opacity={0.5} rx={3} />
      <rect x={95} y={320} width={30} height={60} fill={C.earth} opacity={0.6} />
    </g>
  );
}

function FountainPlaza() {
  return (
    <g>
      {/* Plaza tiles */}
      {Array.from({ length: 8 }).map((_, i) =>
        Array.from({ length: 5 }).map((_, j) => (
          <rect
            key={`${i}-${j}`}
            x={100 + i * 80}
            y={100 + j * 70}
            width={75}
            height={65}
            fill={C.sand}
            opacity={(i + j) % 2 === 0 ? 0.3 : 0.15}
            stroke={C.earth}
            strokeWidth={0.5}
          />
        ))
      )}
      {/* Large circular fountain */}
      <circle cx={400} cy={250} r={120} fill={C.water} opacity={0.3} stroke={C.earth} strokeWidth={4} />
      <circle cx={400} cy={250} r={80} fill={C.water} opacity={0.5} />
      {/* Crack lines */}
      <path d="M340,200 L380,260 L350,300" fill="none" stroke={C.earth} strokeWidth={2} />
      <path d="M430,180 L450,250 L420,290" fill="none" stroke={C.earth} strokeWidth={2} />
      {/* Benches */}
      <rect x={100} y={200} width={60} height={15} fill={C.earth} rx={3} />
      <rect x={640} y={280} width={60} height={15} fill={C.earth} rx={3} />
    </g>
  );
}

function BoatingPond() {
  return (
    <g>
      {/* Large oval pond */}
      <ellipse cx={400} cy={260} rx={300} ry={160} fill={C.water} opacity={0.4} stroke={C.water} strokeWidth={3} />
      {/* Wavy water lines */}
      {[200, 240, 280, 320].map((y) => (
        <path
          key={y}
          d={`M150,${y} Q250,${y - 15} 350,${y} Q450,${y + 15} 550,${y} Q650,${y - 10} 700,${y}`}
          fill="none"
          stroke={C.water}
          strokeWidth={1.5}
          opacity={0.5}
        />
      ))}
      {/* Algae patches */}
      <circle cx={300} cy={220} r={25} fill={C.sage} opacity={0.6} />
      <circle cx={480} cy={300} r={20} fill={C.sage} opacity={0.5} />
      <circle cx={350} cy={310} r={15} fill={C.sage} opacity={0.4} />
      {/* Small dock */}
      <rect x={650} y={180} width={80} height={15} fill={C.earth} />
      <rect x={660} y={195} width={10} height={40} fill={C.earth} />
      <rect x={710} y={195} width={10} height={40} fill={C.earth} />
      {/* Broken fence */}
      {[100, 140, 180, 260, 300].map((x) => (
        <rect key={x} x={x} y={400} width={5} height={30} fill={C.earth} opacity={0.7} />
      ))}
      <line x1={100} y1={410} x2={180} y2={410} stroke={C.earth} strokeWidth={2} />
      {/* Gap in fence = broken section */}
      <line x1={260} y1={410} x2={305} y2={410} stroke={C.earth} strokeWidth={2} />
    </g>
  );
}

function Playground() {
  return (
    <g>
      {/* Safety fence outline */}
      <rect x={50} y={60} width={700} height={380} fill="none" stroke={C.earth} strokeWidth={2} strokeDasharray="8,4" />
      {/* Swing set */}
      <line x1={150} y1={100} x2={150} y2={280} stroke={C.earth} strokeWidth={4} />
      <line x1={300} y1={100} x2={300} y2={280} stroke={C.earth} strokeWidth={4} />
      <line x1={140} y1={100} x2={310} y2={100} stroke={C.earth} strokeWidth={5} />
      {/* Swing chains */}
      <line x1={200} y1={100} x2={190} y2={230} stroke={C.earth} strokeWidth={1.5} />
      <line x1={200} y1={100} x2={210} y2={230} stroke={C.earth} strokeWidth={1.5} />
      <rect x={185} y={230} width={30} height={8} fill={C.terracotta} rx={2} />
      <line x1={250} y1={100} x2={240} y2={220} stroke={C.earth} strokeWidth={1.5} />
      <line x1={250} y1={100} x2={260} y2={220} stroke={C.earth} strokeWidth={1.5} />
      <rect x={235} y={220} width={30} height={8} fill={C.terracotta} rx={2} />
      {/* Slide */}
      <line x1={500} y1={120} x2={500} y2={300} stroke={C.earth} strokeWidth={4} />
      <path d="M500,120 L620,280" stroke={C.gold} strokeWidth={6} fill="none" />
      <rect x={490} y={110} width={20} height={15} fill={C.earth} rx={2} />
      {/* Sandbox */}
      <rect x={400} y={340} width={200} height={80} fill={C.sand} stroke={C.earth} strokeWidth={2} rx={4} />
      {/* Sand texture dots */}
      {[420, 460, 500, 540, 570].map((x) => (
        <circle key={x} cx={x} cy={380} r={3} fill={C.earth} opacity={0.2} />
      ))}
    </g>
  );
}

function WalkingTrack() {
  return (
    <g>
      {/* Curved path */}
      <path
        d="M50,400 Q200,350 300,300 Q400,250 450,200 Q500,150 600,180 Q700,210 780,160"
        fill="none"
        stroke={C.sand}
        strokeWidth={30}
        opacity={0.6}
      />
      {/* Broken sections (gaps) */}
      <rect x={280} y={270} width={50} height={40} fill={ZONE_BG.walking_track} />
      <rect x={560} y={160} width={40} height={35} fill={ZONE_BG.walking_track} />
      {/* Lamp posts */}
      {[150, 400, 650].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={100} width={6} height={120} fill={C.earth} />
          <circle cx={x} cy={95} r={12} fill={C.gold} opacity={0.5} />
        </g>
      ))}
      {/* Small trees */}
      {[80, 350, 550, 720].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={80} width={8} height={50} fill={C.earth} opacity={0.7} />
          <circle cx={x} cy={65} r={25} fill={C.sage} opacity={0.6} />
        </g>
      ))}
    </g>
  );
}

function HerbalGarden() {
  return (
    <g>
      {/* Rows of plant beds */}
      {[0, 1, 2, 3, 4].map((row) => (
        <g key={row}>
          <rect x={80} y={80 + row * 80} width={640} height={50} fill={C.sage} opacity={0.25} stroke={C.sage} strokeWidth={1} rx={4} />
          {/* Individual plants */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx={120 + i * 80} cy={105 + row * 80} r={12} fill={C.sage} opacity={0.5 + (i % 3) * 0.1} />
          ))}
        </g>
      ))}
      {/* Irrigation pipes */}
      <line x1={60} y1={60} x2={60} y2={460} stroke={C.water} strokeWidth={3} />
      {[80, 160, 240, 320, 400].map((y) => (
        <line key={y} x1={60} y1={y} x2={730} y2={y} stroke={C.water} strokeWidth={1.5} opacity={0.4} />
      ))}
      {/* Herb labels */}
      {['Basil', 'Mint', 'Sage', 'Thyme', 'Rosemary'].map((label, i) => (
        <text key={label} x={740} y={108 + i * 80} fontSize={11} fill={C.earth} opacity={0.7}>{label}</text>
      ))}
    </g>
  );
}

function OpenLawn() {
  return (
    <g>
      {/* Large green area */}
      <rect x={40} y={40} width={720} height={420} fill={C.sage} opacity={0.2} rx={20} />
      {/* Grass texture */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={i}
          x1={80 + (i * 37) % 700}
          y1={80 + (i * 53) % 360}
          x2={85 + (i * 37) % 700}
          y2={70 + (i * 53) % 360}
          stroke={C.sage}
          strokeWidth={1.5}
          opacity={0.4}
        />
      ))}
      {/* Scattered benches */}
      <rect x={120} y={150} width={60} height={12} fill={C.earth} rx={3} />
      <rect x={500} y={320} width={60} height={12} fill={C.earth} rx={3} />
      <rect x={350} y={100} width={60} height={12} fill={C.earth} rx={3} />
      {/* Yoga mat shapes */}
      <rect x={250} y={250} width={80} height={35} fill="#9B59B6" opacity={0.3} rx={4} />
      <rect x={370} y={300} width={80} height={35} fill={C.terracotta} opacity={0.3} rx={4} />
      {/* Shade trees */}
      {[100, 650].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={200} width={12} height={80} fill={C.earth} opacity={0.6} />
          <circle cx={x} cy={180} r={45} fill={C.sage} opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

function ExerciseZone() {
  return (
    <g>
      {/* Rubber ground */}
      <rect x={40} y={320} width={720} height={140} fill={C.terracotta} opacity={0.15} rx={8} />
      {/* Pull-up bar */}
      <rect x={120} y={120} width={8} height={200} fill={C.earth} />
      <rect x={280} y={120} width={8} height={200} fill={C.earth} />
      <rect x={115} y={120} width={178} height={8} fill={C.earth} />
      {/* Parallel bars */}
      <rect x={420} y={200} width={6} height={120} fill={C.earth} />
      <rect x={520} y={200} width={6} height={120} fill={C.earth} />
      <rect x={415} y={200} width={116} height={6} fill={C.earth} />
      <rect x={440} y={200} width={6} height={120} fill={C.earth} />
      <rect x={500} y={200} width={6} height={120} fill={C.earth} />
      <rect x={435} y={200} width={76} height={6} fill={C.earth} />
      {/* Dumbbell shape */}
      <rect x={620} y={260} width={80} height={8} fill={C.earth} rx={2} />
      <rect x={610} y={250} width={20} height={28} fill={C.earth} rx={4} />
      <rect x={690} y={250} width={20} height={28} fill={C.earth} rx={4} />
      {/* Ground markings */}
      {[100, 250, 400, 550, 700].map((x) => (
        <circle key={x} cx={x} cy={400} r={20} fill={C.sand} opacity={0.3} />
      ))}
    </g>
  );
}

function SculptureGarden() {
  return (
    <g>
      {/* Winding paths */}
      <path d="M50,450 Q200,400 250,300 Q300,200 400,250 Q500,300 600,200 Q700,100 780,150" fill="none" stroke={C.sand} strokeWidth={20} opacity={0.4} />
      {/* Pedestal 1 - triangle sculpture */}
      <rect x={140} y={250} width={60} height={10} fill={C.earth} />
      <polygon points="170,140 140,250 200,250" fill={C.terracotta} opacity={0.6} />
      {/* Pedestal 2 - circle sculpture */}
      <rect x={330} y={300} width={60} height={10} fill={C.earth} />
      <circle cx={360} cy={240} r={40} fill={C.water} opacity={0.4} />
      {/* Pedestal 3 - stacked rectangles */}
      <rect x={530} y={200} width={60} height={10} fill={C.earth} />
      <rect x={540} y={140} width={40} height={60} fill={C.gold} opacity={0.5} />
      <rect x={545} y={110} width={30} height={35} fill={C.gold} opacity={0.35} />
      {/* Pedestal 4 - star shape */}
      <rect x={680} y={300} width={60} height={10} fill={C.earth} />
      <polygon points="710,220 720,270 760,280 725,305 735,350 710,320 685,350 695,305 660,280 700,270" fill={C.sage} opacity={0.5} />
    </g>
  );
}

function VendorHub() {
  return (
    <g>
      {/* Seating area */}
      <rect x={300} y={320} width={250} height={140} fill={C.sand} opacity={0.25} rx={8} />
      {/* Tables in seating area */}
      {[340, 420, 500].map((x) => (
        <g key={x}>
          <circle cx={x} cy={380} r={18} fill={C.earth} opacity={0.3} />
          <circle cx={x} cy={380} r={4} fill={C.earth} opacity={0.5} />
        </g>
      ))}
      {/* Food stall 1 */}
      <rect x={60} y={80} width={120} height={80} fill={C.terracotta} opacity={0.5} rx={4} />
      <rect x={70} y={70} width={100} height={15} fill={C.terracotta} opacity={0.7} rx={3} />
      {/* Food stall 2 */}
      <rect x={220} y={80} width={120} height={80} fill={C.gold} opacity={0.4} rx={4} />
      <rect x={230} y={70} width={100} height={15} fill={C.gold} opacity={0.6} rx={3} />
      {/* Food cart */}
      <rect x={600} y={100} width={100} height={70} fill={C.terracotta} opacity={0.4} rx={6} />
      <circle cx={610} cy={180} r={12} fill={C.earth} opacity={0.5} />
      <circle cx={690} cy={180} r={12} fill={C.earth} opacity={0.5} />
      {/* Stall 3 */}
      <rect x={450} y={80} width={100} height={80} fill={C.sage} opacity={0.4} rx={4} />
      <rect x={460} y={70} width={80} height={15} fill={C.sage} opacity={0.6} rx={3} />
    </g>
  );
}

function RestroomBlock() {
  return (
    <g>
      {/* Main building */}
      <rect x={200} y={100} width={400} height={280} fill={C.earth} opacity={0.15} stroke={C.earth} strokeWidth={3} rx={6} />
      {/* Roof */}
      <rect x={190} y={85} width={420} height={25} fill={C.earth} opacity={0.3} rx={4} />
      {/* Doors */}
      <rect x={260} y={200} width={60} height={100} fill={C.water} opacity={0.3} rx={4} />
      <circle cx={310} cy={250} r={4} fill={C.earth} />
      <rect x={480} y={200} width={60} height={100} fill={C.terracotta} opacity={0.3} rx={4} />
      <circle cx={490} cy={250} r={4} fill={C.earth} />
      {/* Pipe symbols */}
      <line x1={180} y1={150} x2={180} y2={400} stroke={C.water} strokeWidth={4} opacity={0.4} />
      <line x1={620} y1={150} x2={620} y2={400} stroke={C.water} strokeWidth={4} opacity={0.4} />
      <line x1={180} y1={400} x2={620} y2={400} stroke={C.water} strokeWidth={4} opacity={0.4} />
      {/* Pipe joints */}
      <circle cx={180} cy={400} r={6} fill={C.water} opacity={0.5} />
      <circle cx={620} cy={400} r={6} fill={C.water} opacity={0.5} />
      {/* Windows */}
      <rect x={350} y={130} width={100} height={40} fill={C.water} opacity={0.15} rx={3} />
    </g>
  );
}

function FiberOpticLane() {
  return (
    <g>
      {/* Path */}
      <rect x={100} y={200} width={600} height={100} fill={C.earth} opacity={0.1} rx={8} />
      {/* LED light dots - some on, some off */}
      {Array.from({ length: 15 }).map((_, i) => (
        <circle
          key={i}
          cx={120 + i * 42}
          cy={250}
          r={6}
          fill={i % 3 === 0 ? '#555' : C.gold}
          opacity={i % 3 === 0 ? 0.3 : 0.8}
        />
      ))}
      {/* Second row of lights */}
      {Array.from({ length: 12 }).map((_, i) => (
        <circle
          key={`b-${i}`}
          cx={140 + i * 48}
          cy={350}
          r={4}
          fill={i % 4 === 1 ? '#555' : C.water}
          opacity={i % 4 === 1 ? 0.2 : 0.6}
        />
      ))}
      {/* Digital display rectangles */}
      <rect x={150} y={60} width={140} height={80} fill={C.earth} opacity={0.15} stroke={C.water} strokeWidth={2} rx={6} />
      <rect x={170} y={75} width={100} height={20} fill={C.water} opacity={0.3} rx={2} />
      <rect x={170} y={105} width={60} height={12} fill={C.water} opacity={0.2} rx={2} />
      <rect x={500} y={60} width={140} height={80} fill={C.earth} opacity={0.15} stroke={C.water} strokeWidth={2} rx={6} />
      <rect x={520} y={75} width={100} height={20} fill={C.water} opacity={0.3} rx={2} />
      <rect x={520} y={105} width={60} height={12} fill={C.water} opacity={0.2} rx={2} />
      {/* Cable lines */}
      <line x1={100} y1={150} x2={700} y2={150} stroke={C.water} strokeWidth={1.5} opacity={0.3} />
      <line x1={100} y1={160} x2={700} y2={160} stroke={C.water} strokeWidth={1.5} opacity={0.2} />
    </g>
  );
}

function PppZone() {
  return (
    <g>
      {/* Foundation grid */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`v${i}`} x1={150 + i * 100} y1={300} x2={150 + i * 100} y2={460} stroke={C.earth} strokeWidth={2} opacity={0.3} />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={`h${i}`} x1={150} y1={300 + i * 55} x2={650} y2={300 + i * 55} stroke={C.earth} strokeWidth={2} opacity={0.3} />
      ))}
      {/* Construction barriers */}
      {[120, 350, 580].map((x) => (
        <g key={x}>
          <rect x={x} y={240} width={80} height={40} fill={C.gold} opacity={0.6} rx={3} />
          <line x1={x} y1={240} x2={x + 80} y2={280} stroke={C.terracotta} strokeWidth={3} />
          <line x1={x} y1={280} x2={x + 80} y2={240} stroke={C.terracotta} strokeWidth={3} />
        </g>
      ))}
      {/* Crane outline */}
      <rect x={600} y={40} width={10} height={260} fill={C.earth} opacity={0.6} />
      <rect x={500} y={40} width={120} height={8} fill={C.earth} opacity={0.6} />
      <line x1={610} y1={40} x2={500} y2={48} stroke={C.earth} strokeWidth={1.5} opacity={0.4} />
      <line x1={610} y1={40} x2={620} y2={48} stroke={C.earth} strokeWidth={1.5} opacity={0.4} />
      {/* Crane hook */}
      <line x1={520} y1={48} x2={520} y2={120} stroke={C.earth} strokeWidth={1.5} opacity={0.5} />
      <path d="M512,120 Q520,140 528,120" fill="none" stroke={C.earth} strokeWidth={2} opacity={0.5} />
    </g>
  );
}

function MaintenanceDepot() {
  return (
    <g>
      {/* Shed/building */}
      <rect x={80} y={120} width={300} height={220} fill={C.earth} opacity={0.2} stroke={C.earth} strokeWidth={3} rx={4} />
      {/* Shed roof */}
      <polygon points="70,120 230,60 400,120" fill={C.earth} opacity={0.3} />
      {/* Shed door */}
      <rect x={180} y={220} width={80} height={120} fill={C.earth} opacity={0.15} stroke={C.earth} strokeWidth={2} rx={3} />
      <circle cx={250} cy={280} r={4} fill={C.earth} />
      {/* Tool shapes - wrench */}
      <rect x={480} y={100} width={8} height={60} fill={C.earth} opacity={0.5} rx={2} />
      <circle cx={484} cy={95} r={12} fill="none" stroke={C.earth} strokeWidth={3} opacity={0.5} />
      {/* Tool shapes - hammer */}
      <rect x={540} y={120} width={6} height={70} fill={C.earth} opacity={0.5} />
      <rect x={528} y={105} width={30} height={18} fill={C.earth} opacity={0.5} rx={3} />
      {/* Supply boxes */}
      <rect x={480} y={280} width={80} height={60} fill={C.sand} stroke={C.earth} strokeWidth={2} rx={3} />
      <rect x={580} y={300} width={70} height={50} fill={C.sand} stroke={C.earth} strokeWidth={2} rx={3} />
      <rect x={520} y={240} width={60} height={45} fill={C.sand} opacity={0.7} stroke={C.earth} strokeWidth={2} rx={3} />
      {/* Supply box markings */}
      <line x1={490} y1={310} x2={550} y2={310} stroke={C.earth} strokeWidth={1} opacity={0.3} />
      <line x1={590} y1={325} x2={640} y2={325} stroke={C.earth} strokeWidth={1} opacity={0.3} />
    </g>
  );
}

// ── Zone renderer map ───────────────────────────────────────────────────────

const ZONE_RENDERERS: Record<string, () => React.ReactElement> = {
  main_entrance: MainEntrance,
  fountain_plaza: FountainPlaza,
  boating_pond: BoatingPond,
  playground: Playground,
  walking_track: WalkingTrack,
  herbal_garden: HerbalGarden,
  open_lawn: OpenLawn,
  exercise_zone: ExerciseZone,
  sculpture_garden: SculptureGarden,
  vendor_hub: VendorHub,
  restroom_block: RestroomBlock,
  fiber_optic_lane: FiberOpticLane,
  ppp_zone: PppZone,
  maintenance_depot: MaintenanceDepot,
};

// ── Predefined clue positions (5 per zone) ──────────────────────────────────

export const ZONE_CLUE_POSITIONS: Record<string, Array<{ id: string; x: number; y: number; type: string }>> = {
  main_entrance: [
    { id: 'me_c1', x: 110, y: 260, type: 'consequence' },
    { id: 'me_c2', x: 560, y: 180, type: 'capability' },
    { id: 'me_c3', x: 600, y: 360, type: 'outcome' },
    { id: 'me_c4', x: 250, y: 440, type: 'resource' },
    { id: 'me_c5', x: 700, y: 280, type: 'connection' },
  ],
  fountain_plaza: [
    { id: 'fp_c1', x: 400, y: 250, type: 'consequence' },
    { id: 'fp_c2', x: 200, y: 140, type: 'capability' },
    { id: 'fp_c3', x: 600, y: 350, type: 'outcome' },
    { id: 'fp_c4', x: 130, y: 200, type: 'resource' },
    { id: 'fp_c5', x: 670, y: 150, type: 'connection' },
  ],
  boating_pond: [
    { id: 'bp_c1', x: 300, y: 220, type: 'consequence' },
    { id: 'bp_c2', x: 660, y: 190, type: 'capability' },
    { id: 'bp_c3', x: 480, y: 310, type: 'outcome' },
    { id: 'bp_c4', x: 150, y: 400, type: 'resource' },
    { id: 'bp_c5', x: 550, y: 160, type: 'connection' },
  ],
  playground: [
    { id: 'pg_c1', x: 200, y: 230, type: 'consequence' },
    { id: 'pg_c2', x: 500, y: 150, type: 'capability' },
    { id: 'pg_c3', x: 500, y: 370, type: 'outcome' },
    { id: 'pg_c4', x: 130, y: 350, type: 'resource' },
    { id: 'pg_c5', x: 650, y: 280, type: 'connection' },
  ],
  walking_track: [
    { id: 'wt_c1', x: 150, y: 370, type: 'consequence' },
    { id: 'wt_c2', x: 310, y: 280, type: 'capability' },
    { id: 'wt_c3', x: 460, y: 190, type: 'outcome' },
    { id: 'wt_c4', x: 620, y: 180, type: 'resource' },
    { id: 'wt_c5', x: 400, y: 120, type: 'connection' },
  ],
  herbal_garden: [
    { id: 'hg_c1', x: 200, y: 105, type: 'consequence' },
    { id: 'hg_c2', x: 440, y: 185, type: 'capability' },
    { id: 'hg_c3', x: 600, y: 265, type: 'outcome' },
    { id: 'hg_c4', x: 280, y: 345, type: 'resource' },
    { id: 'hg_c5', x: 520, y: 425, type: 'connection' },
  ],
  open_lawn: [
    { id: 'ol_c1', x: 250, y: 250, type: 'consequence' },
    { id: 'ol_c2', x: 500, y: 150, type: 'capability' },
    { id: 'ol_c3', x: 150, y: 380, type: 'outcome' },
    { id: 'ol_c4', x: 600, y: 350, type: 'resource' },
    { id: 'ol_c5', x: 400, y: 100, type: 'connection' },
  ],
  exercise_zone: [
    { id: 'ez_c1', x: 200, y: 180, type: 'consequence' },
    { id: 'ez_c2', x: 470, y: 250, type: 'capability' },
    { id: 'ez_c3', x: 660, y: 260, type: 'outcome' },
    { id: 'ez_c4', x: 150, y: 400, type: 'resource' },
    { id: 'ez_c5', x: 550, y: 400, type: 'connection' },
  ],
  sculpture_garden: [
    { id: 'sg_c1', x: 170, y: 200, type: 'consequence' },
    { id: 'sg_c2', x: 360, y: 280, type: 'capability' },
    { id: 'sg_c3', x: 560, y: 170, type: 'outcome' },
    { id: 'sg_c4', x: 710, y: 300, type: 'resource' },
    { id: 'sg_c5', x: 400, y: 420, type: 'connection' },
  ],
  vendor_hub: [
    { id: 'vh_c1', x: 120, y: 120, type: 'consequence' },
    { id: 'vh_c2', x: 280, y: 120, type: 'capability' },
    { id: 'vh_c3', x: 650, y: 140, type: 'outcome' },
    { id: 'vh_c4', x: 420, y: 380, type: 'resource' },
    { id: 'vh_c5', x: 500, y: 110, type: 'connection' },
  ],
  restroom_block: [
    { id: 'rb_c1', x: 290, y: 250, type: 'consequence' },
    { id: 'rb_c2', x: 510, y: 250, type: 'capability' },
    { id: 'rb_c3', x: 400, y: 140, type: 'outcome' },
    { id: 'rb_c4', x: 180, y: 300, type: 'resource' },
    { id: 'rb_c5', x: 620, y: 300, type: 'connection' },
  ],
  fiber_optic_lane: [
    { id: 'fo_c1', x: 220, y: 100, type: 'consequence' },
    { id: 'fo_c2', x: 570, y: 100, type: 'capability' },
    { id: 'fo_c3', x: 350, y: 250, type: 'outcome' },
    { id: 'fo_c4', x: 550, y: 250, type: 'resource' },
    { id: 'fo_c5', x: 400, y: 350, type: 'connection' },
  ],
  ppp_zone: [
    { id: 'pz_c1', x: 160, y: 260, type: 'consequence' },
    { id: 'pz_c2', x: 390, y: 260, type: 'capability' },
    { id: 'pz_c3', x: 620, y: 260, type: 'outcome' },
    { id: 'pz_c4', x: 250, y: 380, type: 'resource' },
    { id: 'pz_c5', x: 520, y: 120, type: 'connection' },
  ],
  maintenance_depot: [
    { id: 'md_c1', x: 230, y: 200, type: 'consequence' },
    { id: 'md_c2', x: 484, y: 140, type: 'capability' },
    { id: 'md_c3', x: 543, y: 150, type: 'outcome' },
    { id: 'md_c4', x: 520, y: 310, type: 'resource' },
    { id: 'md_c5', x: 150, y: 350, type: 'connection' },
  ],
};

// ── Clue icon for found state ───────────────────────────────────────────────

function FoundClueIcon({ x, y, type }: { x: number; y: number; type: string }) {
  const color = CLUE_TYPE_COLORS[type] || '#888';
  return (
    <g>
      <circle cx={x} cy={y} r={14} fill={color} opacity={0.8} />
      {/* Checkmark */}
      <path
        d={`M${x - 6},${y} L${x - 2},${y + 5} L${x + 7},${y - 5}`}
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ZoneIllustration({
  zoneId,
  cluePositions,
  foundClues,
  activePlayerId,
  onClueClick,
}: Props) {
  const ZoneRenderer = ZONE_RENDERERS[zoneId];
  const bgColor = ZONE_BG[zoneId] || '#EEE';

  return (
    <svg
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      style={{ display: 'block', maxWidth: '100%', borderRadius: 8 }}
    >
      <style>{PULSE_KEYFRAMES}</style>

      {/* Background */}
      <rect x={0} y={0} width={800} height={500} fill={bgColor} rx={8} />

      {/* Zone-specific illustration */}
      {ZoneRenderer ? <ZoneRenderer /> : (
        <text x={400} y={250} textAnchor="middle" fill={C.earth} fontSize={18}>
          Zone: {zoneId}
        </text>
      )}

      {/* Clue hotspots */}
      {cluePositions.map((clue) => {
        const isFound = foundClues.includes(clue.id) || clue.found;
        const clueColor = CLUE_TYPE_COLORS[clue.type] || '#888';

        if (isFound) {
          return <FoundClueIcon key={clue.id} x={clue.x} y={clue.y} type={clue.type} />;
        }

        return (
          <g
            key={clue.id}
            style={{ cursor: activePlayerId ? 'pointer' : 'default' }}
            onClick={() => activePlayerId && onClueClick(clue.id)}
          >
            {/* Pulsing outer ring - only when there is an active player */}
            {activePlayerId && (
              <circle
                cx={clue.x}
                cy={clue.y}
                r={20}
                fill={clueColor}
                opacity={0.3}
                style={{ animation: 'zone-clue-pulse 2s ease-in-out infinite' }}
              />
            )}
            {/* Inner circle */}
            <circle
              cx={clue.x}
              cy={clue.y}
              r={12}
              fill={clueColor}
              opacity={activePlayerId ? 0.45 : 0.25}
            />
            {/* Question mark hint */}
            <text
              x={clue.x}
              y={clue.y + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight="bold"
              fill="#fff"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            >
              ?
            </text>
          </g>
        );
      })}
    </svg>
  );
}
