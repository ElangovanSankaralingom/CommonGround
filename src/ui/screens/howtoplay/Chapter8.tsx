import { useState } from 'react';
import { motion } from 'framer-motion';

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

type SectionId = 'phases' | 'roles' | 'resources' | 'conditions' | 'series' | 'scoring';

const SECTIONS: { id: SectionId; title: string; icon: string }[] = [
  { id: 'phases', title: 'Season Phases', icon: '🔄' },
  { id: 'roles', title: 'Role Summary', icon: '👥' },
  { id: 'resources', title: 'Resources', icon: '💎' },
  { id: 'conditions', title: 'Zone Conditions', icon: '🗺️' },
  { id: 'series', title: 'Series Rules', icon: '🃏' },
  { id: 'scoring', title: 'SVS Scoring', icon: '📊' },
];

export default function Chapter8({ onBack }: ChapterProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('phases');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: '#1B3A5C' }}
        >
          Quick Reference
        </h3>
        <p className="text-sm" style={{ color: '#6B5744' }}>
          Everything you need at a glance. Bookmark this chapter for mid-game lookups.
        </p>
      </motion.div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeSection === sec.id ? '#1B3A5C' : 'rgba(139,111,71,0.08)',
              color: activeSection === sec.id ? '#F5E6D3' : '#4A3728',
            }}
          >
            {sec.icon} {sec.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {activeSection === 'phases' && (
          <div className="space-y-2">
            {[
              { phase: '1. Event', desc: 'Roll die. 1-2: negative event, 3-4: nothing, 5-6: positive event.', color: '#E74C3C' },
              { phase: '2. Challenge', desc: 'Draw a challenge card. It targets zones and escalates each season.', color: '#E67E22' },
              { phase: '3. Deliberation', desc: 'Discuss strategy, propose trades. Timer applies.', color: '#2E86AB' },
              { phase: '4. Action', desc: 'Take turns: play cards, form series/combinations, trade, use abilities, or pass.', color: '#8E44AD' },
              { phase: '5. Scoring', desc: 'Calculate utility, apply welfare weights, compute equity & collaboration bonus, update SVS.', color: '#27AE60' },
            ].map((p, i) => (
              <motion.div
                key={p.phase}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: p.color + '08' }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: p.color }} />
                <div>
                  <span className="text-sm font-bold" style={{ color: p.color }}>{p.phase}</span>
                  <p className="text-xs mt-0.5" style={{ color: '#4A3728' }}>{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'roles' && (
          <div className="space-y-2">
            {[
              { name: 'Administrator', icon: '\u{1F3DB}\uFE0F', color: '#C0392B', key: 'Authority & Budget', weakness: 'Low community trust', weight: '0.8x' },
              { name: 'Designer', icon: '\u{1F4D0}', color: '#2E86AB', key: 'Technical Knowledge & Adaptability', weakness: 'Low authority & budget', weight: '1.0x' },
              { name: 'Citizen', icon: '\u{1F3D8}\uFE0F', color: '#27AE60', key: 'Community Trust & Volunteers', weakness: 'Low authority & budget', weight: '1.5x' },
              { name: 'Investor', icon: '\u{1F4BC}', color: '#E67E22', key: 'Resourcefulness & Budget', weakness: 'Low community trust', weight: '0.9x' },
              { name: 'Advocate', icon: '\u{1F33F}', color: '#8E44AD', key: 'Balanced abilities, Influence', weakness: 'Low authority', weight: '1.3x' },
            ].map((r, i) => (
              <motion.div
                key={r.name}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: r.color + '20', background: r.color + '06' }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: r.color }}>{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: r.color + '15', color: r.color }}>{r.weight}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#4A3728' }}>
                    <span className="font-medium">Strength:</span> {r.key}
                  </p>
                  <p className="text-xs" style={{ color: '#8B6F47' }}>
                    <span className="font-medium">Weakness:</span> {r.weakness}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'resources' && (
          <div className="space-y-2">
            {[
              { name: 'Budget', icon: '\u{1F4B0}', color: '#F4D03F', desc: 'Fund projects, pay for cards, cover costs. Primary for Administrator & Investor.' },
              { name: 'Influence', icon: '\u{1F535}', color: '#3498DB', desc: 'Sway decisions, activate political abilities. Primary for Advocate.' },
              { name: 'Volunteer', icon: '\u{1F91D}', color: '#27AE60', desc: 'Community labor power. Primary for Citizen. Needed for maintenance and social projects.' },
              { name: 'Material', icon: '\u{1F9F1}', color: '#95A5A6', desc: 'Physical supplies for construction and repair. Primary for Designer.' },
              { name: 'Knowledge', icon: '\u{1F4DA}', color: '#8E44AD', desc: 'Technical expertise and research. Needed for assessments and design proposals.' },
            ].map((res, i) => (
              <motion.div
                key={res.name}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: res.color + '10' }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="text-xl mt-0.5">{res.icon}</span>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#4A3728' }}>{res.name}</span>
                  <p className="text-xs mt-0.5" style={{ color: '#6B5744' }}>{res.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'conditions' && (
          <div className="space-y-2">
            {[
              { name: 'Good', color: '#27AE60', desc: 'Zone is thriving. Generates resources each season. Players benefit from being here.' },
              { name: 'Fair', color: '#F1C40F', desc: 'Zone is functional but has issues. Stable but not generating bonuses.' },
              { name: 'Poor', color: '#E67E22', desc: 'Zone is struggling. Problems accumulate. Will degrade to Critical if neglected.' },
              { name: 'Critical', color: '#E74C3C', desc: 'Zone is in crisis. Active penalties. Drags down SVS. Urgent action needed.' },
              { name: 'Locked', color: '#95A5A6', desc: 'Zone is inaccessible until unlocked by resolving a specific challenge or trigger.' },
            ].map((cond, i) => (
              <motion.div
                key={cond.name}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: cond.color + '10' }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: cond.color }} />
                <div>
                  <span className="text-sm font-bold" style={{ color: cond.color }}>{cond.name}</span>
                  <p className="text-xs mt-0.5" style={{ color: '#4A3728' }}>{cond.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'series' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Building a Series</h5>
              <ul className="text-xs space-y-1.5" style={{ color: '#4A3728' }}>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#27AE60' }}>1.</span> First card must be Starter or Any position</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#3498DB' }}>2.</span> Middle cards must be Middle or Any position</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#C0392B' }}>3.</span> Last card must be Closer or Any position</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#8E44AD' }}>4.</span> Consecutive cards must share at least 1 tag</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: '#E67E22' }}>5.</span> Series length: 2-4 cards</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Combinations</h5>
              <ul className="text-xs space-y-1.5" style={{ color: '#4A3728' }}>
                <li className="flex gap-2">&#8226; Multiple players pool resource tokens</li>
                <li className="flex gap-2">&#8226; 3+ unique contributors = 1.5x multiplier</li>
                <li className="flex gap-2">&#8226; Total value applies toward challenge difficulty</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Ability Checks</h5>
              <ul className="text-xs space-y-1.5" style={{ color: '#4A3728' }}>
                <li className="flex gap-2">&#8226; Modifier = floor((ability score - 10) / 2)</li>
                <li className="flex gap-2">&#8226; Add proficiency bonus if you have the relevant skill</li>
                <li className="flex gap-2">&#8226; Roll + modifier + proficiency must meet or exceed threshold</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'scoring' && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg border-2" style={{ borderColor: '#1B3A5C30', background: '#1B3A5C08' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#1B3A5C' }}>SVS Formula</h5>
              <div className="font-mono text-xs p-2 rounded" style={{ background: '#4A3728', color: '#F5E6D3' }}>
                SVS = sum(weight_i * utility_i) + equityBonus + collaborationBonus
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Welfare Weights</h5>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { role: 'Citizen', w: '1.5x', color: '#27AE60' },
                  { role: 'Advocate', w: '1.3x', color: '#8E44AD' },
                  { role: 'Designer', w: '1.0x', color: '#2E86AB' },
                  { role: 'Investor', w: '0.9x', color: '#E67E22' },
                  { role: 'Admin', w: '0.8x', color: '#C0392B' },
                ].map((r) => (
                  <div key={r.role}>
                    <div className="font-bold" style={{ color: r.color }}>{r.w}</div>
                    <div style={{ color: '#6B5744' }}>{r.role}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
              <h5 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>End Conditions</h5>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="p-2 rounded" style={{ background: '#27AE6015' }}>
                  <div className="font-bold" style={{ color: '#27AE60' }}>Full Success</div>
                  <div style={{ color: '#6B5744' }}>SVS meets target</div>
                </div>
                <div className="p-2 rounded" style={{ background: '#E67E2215' }}>
                  <div className="font-bold" style={{ color: '#E67E22' }}>Partial</div>
                  <div style={{ color: '#6B5744' }}>50-99% of target</div>
                </div>
                <div className="p-2 rounded" style={{ background: '#E74C3C15' }}>
                  <div className="font-bold" style={{ color: '#E74C3C' }}>Failure</div>
                  <div style={{ color: '#6B5744' }}>Below 50%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <motion.div
        className="flex justify-between items-center pt-10 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ color: '#4A3728', border: '1px solid rgba(139,111,71,0.3)' }}
        >
          &larr; Winning &amp; Losing
        </button>
        <div className="text-center">
          <p className="text-xs mb-2 italic" style={{ color: '#8B6F47' }}>
            You're ready to play!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
