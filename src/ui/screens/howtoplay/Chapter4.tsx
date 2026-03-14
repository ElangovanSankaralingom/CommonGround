import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ADMINISTRATOR_CARDS,
  DESIGNER_CARDS,
  CITIZEN_CARDS,
  INVESTOR_CARDS,
  ADVOCATE_CARDS,
  ALL_CHALLENGES,
  EVENT_CARDS,
  TRADE_CARDS,
} from '../../../core/content';
import type {
  ActionCard,
  ChallengeCard,
  EventCard,
  TradeCard,
  RoleId,
} from '../../../core/models/types';

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

const RESOURCE_ICONS: Record<string, string> = {
  budget: '$',
  influence: 'I',
  volunteer: 'V',
  material: 'M',
  knowledge: 'K',
};

const SERIES_CONFIG: Record<string, { label: string; color: string; letter: string }> = {
  starter: { label: 'Starter', color: '#27AE60', letter: 'S' },
  middle: { label: 'Middle', color: '#E67E22', letter: 'M' },
  closer: { label: 'Closer', color: '#C0392B', letter: 'C' },
  any: { label: 'Any', color: '#7F8C8D', letter: '*' },
};

const CATEGORY_ICONS: Record<string, string> = {
  maintenance: '\u{1F527}',
  ecological: '\u{1F33F}',
  social: '\u{1F465}',
  infrastructure: '\u{1F3D7}',
  commercial: '\u{1F3EA}',
  safety: '\u{1F6E1}',
  political: '\u{1F3DB}',
};

const ABILITY_LABELS: Record<string, string> = {
  authority: 'AUT',
  resourcefulness: 'RES',
  communityTrust: 'CTR',
  technicalKnowledge: 'TKN',
  politicalLeverage: 'PLV',
  adaptability: 'ADP',
};

const ROLE_DECKS: { roleId: RoleId; cards: ActionCard[] }[] = [
  { roleId: 'administrator', cards: ADMINISTRATOR_CARDS },
  { roleId: 'designer', cards: DESIGNER_CARDS },
  { roleId: 'citizen', cards: CITIZEN_CARDS },
  { roleId: 'investor', cards: INVESTOR_CARDS },
  { roleId: 'advocate', cards: ADVOCATE_CARDS },
];

type TabId = 'action' | 'challenge' | 'event' | 'trade';

/* ─── Sub-components ─── */

function ResourceDots({ cost }: { cost: Partial<Record<string, number>> }) {
  const entries = Object.entries(cost).filter(([, v]) => v && v > 0);
  if (entries.length === 0) return <span style={{ color: '#8B6F47', fontSize: 12 }}>Free</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([resource, count]) =>
        Array.from({ length: count! }).map((_, i) => (
          <div
            key={`${resource}-${i}`}
            className="rounded-full"
            style={{
              width: 10,
              height: 10,
              background: RESOURCE_COLORS[resource] || '#999',
              border: '1px solid rgba(0,0,0,0.15)',
            }}
            title={`${resource} x${count}`}
          />
        ))
      )}
    </div>
  );
}

function SeriesBadge({ position }: { position: string }) {
  const config = SERIES_CONFIG[position] || SERIES_CONFIG.any;
  return (
    <div
      className="flex items-center justify-center rounded-full text-white text-xs font-bold"
      style={{ width: 22, height: 22, background: config.color }}
      title={config.label}
    >
      {config.letter}
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs"
      style={{ background: 'rgba(139,111,71,0.15)', color: '#6B5339' }}
    >
      {tag}
    </span>
  );
}

/* ─── Action Card Detail Modal ─── */

function ActionCardModal({
  card,
  onClose,
}: {
  card: ActionCard;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const roleColor = ROLE_COLORS[card.roleId];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        className="relative"
        style={{ perspective: 1000, maxWidth: 340, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <motion.div
          className="relative cursor-pointer"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', damping: 20 }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="rounded-xl p-5 shadow-2xl"
            style={{
              background: '#FDF6EC',
              border: `3px solid ${roleColor}`,
              backfaceVisibility: 'hidden',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: roleColor }}>
                  {ROLE_LABELS[card.roleId]}
                </div>
                <h3 className="text-lg font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
                  {card.name}
                </h3>
              </div>
              {/* Base value circle */}
              <div
                className="flex items-center justify-center rounded-full text-white font-bold text-lg"
                style={{ width: 40, height: 40, background: roleColor, flexShrink: 0 }}
              >
                {card.baseValue}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm mb-3" style={{ color: '#4A3728', lineHeight: 1.5 }}>
              {card.description}
            </p>

            {/* Cost */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold" style={{ color: '#8B6F47' }}>Cost:</span>
              <ResourceDots cost={card.cost} />
            </div>

            {/* Ability Check */}
            {card.abilityCheck && (
              <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,111,71,0.08)' }}>
                <span className="text-xs font-semibold" style={{ color: '#8B6F47' }}>Check:</span>
                <span className="text-xs font-bold" style={{ color: roleColor }}>
                  {ABILITY_LABELS[card.abilityCheck.ability]} {'>'}= {card.abilityCheck.threshold}
                </span>
                {card.abilityCheck.skill && (
                  <span className="text-xs" style={{ color: '#8B6F47' }}>({card.abilityCheck.skill})</span>
                )}
              </div>
            )}

            {/* Series position */}
            <div className="flex items-center gap-2 mb-3">
              <SeriesBadge position={card.seriesPosition} />
              <span className="text-xs" style={{ color: '#8B6F47' }}>
                {SERIES_CONFIG[card.seriesPosition]?.label || 'Any'} position
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {card.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>

            {/* Flavor text */}
            <p className="text-xs italic border-t pt-2" style={{ color: '#8B6F47', borderColor: 'rgba(139,111,71,0.2)' }}>
              "{card.flavorText}"
            </p>

            <p className="text-xs mt-3 text-center" style={{ color: '#aaa' }}>Tap to flip</p>
          </div>

          {/* Back */}
          <div
            className="rounded-xl p-5 shadow-2xl absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: roleColor,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-6xl mb-4" style={{ opacity: 0.3 }}>
              {ROLE_LABELS[card.roleId].charAt(0)}
            </div>
            <div className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              CommonGround
            </div>
            <div className="text-sm text-white/70 mt-1">
              {ROLE_LABELS[card.roleId]} Deck
            </div>
          </div>
        </motion.div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg z-10"
          style={{ background: '#4A3728' }}
        >
          x
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Action Cards Tab ─── */

function ActionCardsTab() {
  const [selectedDeck, setSelectedDeck] = useState<RoleId | null>(null);
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);

  const activeDeck = ROLE_DECKS.find((d) => d.roleId === selectedDeck);

  return (
    <div>
      <AnimatePresence>
        {selectedCard && (
          <ActionCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
        )}
      </AnimatePresence>

      {!selectedDeck ? (
        /* Deck selection view */
        <div>
          <p className="text-sm mb-5" style={{ color: '#6B5339' }}>
            Each role has a deck of 16 unique action cards. Click a deck to explore its cards.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {ROLE_DECKS.map((deck, i) => {
              const color = ROLE_COLORS[deck.roleId];
              return (
                <motion.button
                  key={deck.roleId}
                  className="relative flex flex-col items-center p-4 rounded-xl cursor-pointer"
                  style={{ background: 'rgba(253,246,236,0.8)' }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDeck(deck.roleId)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {/* Stacked card effect */}
                  <div className="relative w-16 h-20 mb-2">
                    {[2, 1, 0].map((offset) => (
                      <div
                        key={offset}
                        className="absolute rounded-lg"
                        style={{
                          width: '100%',
                          height: '100%',
                          background: color,
                          opacity: 1 - offset * 0.2,
                          top: offset * -3,
                          left: offset * 2,
                          border: '2px solid rgba(255,255,255,0.3)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    ))}
                    <div
                      className="absolute inset-0 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
                      style={{ background: color, border: '2px solid rgba(255,255,255,0.3)', zIndex: 1 }}
                    >
                      {deck.cards.length}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-center" style={{ color }}>
                    {ROLE_LABELS[deck.roleId]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card grid view */
        <div>
          <button
            onClick={() => setSelectedDeck(null)}
            className="flex items-center gap-1 text-sm font-medium mb-4 px-3 py-1.5 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: ROLE_COLORS[selectedDeck] }}
          >
            {'<-'} All Decks
          </button>
          <h4
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: ROLE_COLORS[selectedDeck] }}
          >
            {ROLE_LABELS[selectedDeck]} Cards
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeDeck?.cards.map((card, i) => (
              <motion.button
                key={card.id}
                className="text-left rounded-lg p-3 transition-shadow hover:shadow-lg"
                style={{
                  background: '#FDF6EC',
                  border: `2px solid ${ROLE_COLORS[selectedDeck]}`,
                }}
                onClick={() => setSelectedCard(card)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -3 }}
              >
                <div className="flex items-start justify-between mb-1">
                  <SeriesBadge position={card.seriesPosition} />
                  <div
                    className="flex items-center justify-center rounded-full text-white font-bold text-xs"
                    style={{ width: 24, height: 24, background: ROLE_COLORS[selectedDeck] }}
                  >
                    {card.baseValue}
                  </div>
                </div>
                <h5 className="text-sm font-semibold leading-tight mt-1" style={{ color: '#2C1810' }}>
                  {card.name}
                </h5>
                <div className="mt-1">
                  <ResourceDots cost={card.cost} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Challenge Cards Tab ─── */

function ChallengeCardsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const challenges = useMemo(() => ALL_CHALLENGES.slice(0, 10), []);

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: '#6B5339' }}>
        Challenges are the problems your team must solve. Click any challenge for full details.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {challenges.map((ch, i) => {
          const isExpanded = expandedId === ch.id;
          return (
            <motion.div
              key={ch.id}
              className="rounded-xl overflow-hidden cursor-pointer"
              style={{
                background: '#FDF6EC',
                border: '2px solid rgba(139,111,71,0.2)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setExpandedId(isExpanded ? null : ch.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[ch.category] || '\u{1F4CC}'}</span>
                    <div>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white mb-1"
                        style={{ background: '#8B6F47' }}
                      >
                        {ch.category}
                      </span>
                      <h5 className="text-sm font-bold" style={{ color: '#2C1810', fontFamily: "'Playfair Display', serif" }}>
                        {ch.name}
                      </h5>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-lg text-white font-bold text-xl"
                    style={{ width: 40, height: 40, background: '#C0392B' }}
                  >
                    {ch.difficulty}
                  </div>
                </div>
                <p className="text-xs mt-2" style={{ color: '#6B5339' }}>
                  Zones: {ch.affectedZoneIds.join(', ')}
                </p>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(139,111,71,0.15)' }}>
                      <p className="text-sm mt-3 mb-3" style={{ color: '#4A3728' }}>{ch.description}</p>

                      {/* Requirements */}
                      <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(139,111,71,0.06)' }}>
                        <h6 className="text-xs font-bold mb-2" style={{ color: '#8B6F47' }}>REQUIREMENTS</h6>
                        <div className="space-y-1 text-xs" style={{ color: '#4A3728' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ color: '#8B6F47' }}>Min series:</span>
                            <span className="font-semibold">{ch.requirements.minSeriesLength} cards</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: '#8B6F47' }}>Min roles:</span>
                            <span className="font-semibold">{ch.requirements.minUniqueRoles} unique</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: '#8B6F47' }}>Resources:</span>
                            <div className="flex gap-1">
                              {Object.entries(ch.requirements.resourceCost).map(([res, amt]) => (
                                <span key={res} className="flex items-center gap-0.5">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                    style={{ background: RESOURCE_COLORS[res] }}
                                  />
                                  <span className="font-semibold">{amt}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          {ch.requirements.abilityChecks.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#8B6F47' }}>Checks:</span>
                              {ch.requirements.abilityChecks.map((ac, j) => (
                                <span key={j} className="font-semibold">
                                  {ABILITY_LABELS[ac.ability]} {'>'} {ac.threshold}
                                  {ac.skill && ` (${ac.skill})`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Failure */}
                      <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(192,57,43,0.06)' }}>
                        <h6 className="text-xs font-bold mb-1" style={{ color: '#C0392B' }}>FAILURE</h6>
                        <ul className="text-xs space-y-0.5" style={{ color: '#C0392B' }}>
                          {ch.failureConsequences.map((fc, j) => (
                            <li key={j}>{fc.type.replace(/_/g, ' ')} - {JSON.stringify(fc.params)}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Success */}
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(39,174,96,0.06)' }}>
                        <h6 className="text-xs font-bold mb-1" style={{ color: '#27AE60' }}>SUCCESS</h6>
                        <ul className="text-xs space-y-0.5" style={{ color: '#27AE60' }}>
                          {ch.successRewards.map((sr, j) => (
                            <li key={j}>{sr.type.replace(/_/g, ' ')} - {JSON.stringify(sr.params)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Event Cards Tab ─── */

function EventCardsTab() {
  const [selectedEvent, setSelectedEvent] = useState<EventCard | null>(null);
  const negativeEvents = useMemo(() => EVENT_CARDS.filter((e) => e.type === 'negative'), []);
  const positiveEvents = useMemo(() => EVENT_CARDS.filter((e) => e.type === 'positive'), []);

  return (
    <div>
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              className="rounded-xl p-5 shadow-2xl max-w-sm w-full"
              style={{
                background: '#FDF6EC',
                border: `3px solid ${selectedEvent.type === 'negative' ? '#C0392B' : '#27AE60'}`,
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="px-2 py-1 rounded text-xs font-bold text-white uppercase"
                  style={{ background: selectedEvent.type === 'negative' ? '#C0392B' : '#27AE60' }}
                >
                  {selectedEvent.type}
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-lg"
                  style={{ color: '#8B6F47' }}
                >
                  x
                </button>
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
                {selectedEvent.name}
              </h4>
              <p className="text-sm mb-3" style={{ color: '#4A3728' }}>{selectedEvent.description}</p>
              <p className="text-xs italic" style={{ color: '#8B6F47' }}>"{selectedEvent.flavorText}"</p>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(139,111,71,0.2)' }}>
                <h6 className="text-xs font-bold mb-1" style={{ color: '#8B6F47' }}>EFFECTS</h6>
                <ul className="text-xs space-y-1" style={{ color: '#4A3728' }}>
                  {selectedEvent.effects.map((eff, j) => (
                    <li key={j}>
                      {eff.type.replace(/_/g, ' ')} ({eff.target})
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-sm mb-4" style={{ color: '#6B5339' }}>
        Events are triggered by the die roll at the start of each round. They can help or hinder your progress.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Negative column */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#C0392B' }}>
            <span className="w-3 h-3 rounded-full" style={{ background: '#C0392B' }} />
            Negative Events ({negativeEvents.length})
          </h4>
          <div className="space-y-2">
            {negativeEvents.map((evt, i) => (
              <motion.button
                key={evt.id}
                className="w-full text-left rounded-lg p-3"
                style={{
                  background: 'rgba(192,57,43,0.04)',
                  border: '1px solid rgba(192,57,43,0.2)',
                }}
                onClick={() => setSelectedEvent(evt)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 4 }}
              >
                <h5 className="text-sm font-semibold" style={{ color: '#C0392B' }}>{evt.name}</h5>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B5339' }}>{evt.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Positive column */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#27AE60' }}>
            <span className="w-3 h-3 rounded-full" style={{ background: '#27AE60' }} />
            Positive Events ({positiveEvents.length})
          </h4>
          <div className="space-y-2">
            {positiveEvents.map((evt, i) => (
              <motion.button
                key={evt.id}
                className="w-full text-left rounded-lg p-3"
                style={{
                  background: 'rgba(39,174,96,0.04)',
                  border: '1px solid rgba(39,174,96,0.2)',
                }}
                onClick={() => setSelectedEvent(evt)}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 4 }}
              >
                <h5 className="text-sm font-semibold" style={{ color: '#27AE60' }}>{evt.name}</h5>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B5339' }}>{evt.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Trade Cards Tab ─── */

function TradeCardsTab() {
  const [selectedTrade, setSelectedTrade] = useState<TradeCard | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    resource_swap: 'Resource Swap',
    coalition_pact: 'Coalition Pact',
    mediation_request: 'Mediation Request',
    compromise: 'Compromise',
  };

  const TYPE_COLORS: Record<string, string> = {
    resource_swap: '#E67E22',
    coalition_pact: '#2E86AB',
    mediation_request: '#8E44AD',
    compromise: '#27AE60',
  };

  const grouped = useMemo(() => {
    const groups: Record<string, TradeCard[]> = {};
    TRADE_CARDS.forEach((tc) => {
      if (!groups[tc.type]) groups[tc.type] = [];
      groups[tc.type].push(tc);
    });
    return groups;
  }, []);

  // Find the first resource_swap card for animated example
  const swapExample = TRADE_CARDS.find((t) => t.type === 'resource_swap');
  const swapParams = swapExample?.effects[0]?.params;

  return (
    <div>
      <AnimatePresence>
        {selectedTrade && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedTrade(null)}
          >
            <motion.div
              className="rounded-xl p-5 shadow-2xl max-w-sm w-full"
              style={{
                background: '#FDF6EC',
                border: `3px solid ${TYPE_COLORS[selectedTrade.type] || '#8B6F47'}`,
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="px-2 py-1 rounded text-xs font-bold text-white"
                  style={{ background: TYPE_COLORS[selectedTrade.type] || '#8B6F47' }}
                >
                  {TYPE_LABELS[selectedTrade.type] || selectedTrade.type}
                </span>
                <button onClick={() => setSelectedTrade(null)} style={{ color: '#8B6F47' }}>x</button>
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#2C1810' }}>
                {selectedTrade.name}
              </h4>
              <p className="text-sm" style={{ color: '#4A3728' }}>{selectedTrade.description}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-sm mb-4" style={{ color: '#6B5339' }}>
        Trade cards facilitate resource exchange and coalition building between players.
      </p>

      {/* Animated Resource Swap example */}
      {swapParams && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(230,126,34,0.06)', border: '1px solid rgba(230,126,34,0.2)' }}>
          <h5 className="text-sm font-bold mb-3" style={{ color: '#E67E22' }}>
            Resource Swap Example
          </h5>
          <div className="flex items-center justify-center gap-4">
            {/* Give stack */}
            <div className="flex flex-col items-center">
              <div className="flex flex-col gap-1 mb-1">
                {Array.from({ length: swapParams.ratio?.give || 1 }).map((_, i) => (
                  <motion.div
                    key={`give-${i}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: RESOURCE_COLORS[swapParams.give as string] || '#999' }}
                    animate={{ x: [0, 20, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  >
                    {RESOURCE_ICONS[swapParams.give as string] || '?'}
                  </motion.div>
                ))}
              </div>
              <span className="text-xs" style={{ color: '#8B6F47' }}>{swapParams.give}</span>
            </div>

            {/* Swap arrow */}
            <motion.div
              className="text-2xl font-bold"
              style={{ color: '#E67E22' }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 0, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {'<->'}
            </motion.div>

            {/* Receive stack */}
            <div className="flex flex-col items-center">
              <div className="flex flex-col gap-1 mb-1">
                {Array.from({ length: swapParams.ratio?.receive || 1 }).map((_, i) => (
                  <motion.div
                    key={`receive-${i}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: RESOURCE_COLORS[swapParams.receive as string] || '#999' }}
                    animate={{ x: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  >
                    {RESOURCE_ICONS[swapParams.receive as string] || '?'}
                  </motion.div>
                ))}
              </div>
              <span className="text-xs" style={{ color: '#8B6F47' }}>{swapParams.receive}</span>
            </div>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: '#8B6F47' }}>
            {swapExample?.name}: {swapParams.ratio?.give}:{swapParams.ratio?.receive} ratio, max {swapParams.maxGive} given
          </p>
        </div>
      )}

      {/* Grouped trade cards */}
      {Object.entries(grouped).map(([type, cards]) => (
        <div key={type} className="mb-5">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: TYPE_COLORS[type] || '#8B6F47' }}>
            <span className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[type] || '#8B6F47' }} />
            {TYPE_LABELS[type] || type} ({cards.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cards.map((tc, i) => (
              <motion.button
                key={tc.id}
                className="text-left rounded-lg p-3"
                style={{
                  background: '#FDF6EC',
                  border: `1px solid ${TYPE_COLORS[type]}33`,
                }}
                onClick={() => setSelectedTrade(tc)}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold" style={{ color: '#2C1810' }}>{tc.name}</h5>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold text-white"
                    style={{ background: TYPE_COLORS[type] || '#8B6F47', fontSize: 10 }}
                  >
                    {TYPE_LABELS[type]?.split(' ')[0]}
                  </span>
                </div>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: '#6B5339' }}>{tc.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Chapter 4 ─── */

const TABS: { id: TabId; label: string }[] = [
  { id: 'action', label: 'Action Cards' },
  { id: 'challenge', label: 'Challenge Cards' },
  { id: 'event', label: 'Event Cards' },
  { id: 'trade', label: 'Trade Cards' },
];

interface Chapter4Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Chapter4({ onNext, onBack }: Chapter4Props) {
  const [activeTab, setActiveTab] = useState<TabId>('action');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: '#E67E22' }}
        >
          The Cards
        </h2>
        <p className="text-sm" style={{ color: '#6B5339' }}>
          Explore every card type in the game. Click cards to see full details.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: 'rgba(139,111,71,0.08)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? '#E67E22' : 'transparent',
              color: activeTab === tab.id ? '#FDF6EC' : '#8B6F47',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'action' && <ActionCardsTab />}
          {activeTab === 'challenge' && <ChallengeCardsTab />}
          {activeTab === 'event' && <EventCardsTab />}
          {activeTab === 'trade' && <TradeCardsTab />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-10 pt-6 border-t" style={{ borderColor: 'rgba(139,111,71,0.2)' }}>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
          style={{ color: '#4A3728' }}
        >
          {'<-'} The Board
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#E67E22' }}
        >
          How a Round Works {'->'}
        </button>
      </div>
    </div>
  );
}
