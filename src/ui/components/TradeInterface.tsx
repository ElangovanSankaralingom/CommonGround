import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import type { Player, ResourcePool, ResourceType, TradeOffer } from '../../core/models/types';

interface TradeInterfaceProps {
  proposer: Player;
  target: Player;
  onPropose: (offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => void;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  activeTrade?: TradeOffer;
}

const RESOURCE_KEYS: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '💰',
  influence: '🌟',
  volunteer: '🤝',
  material: '🔧',
  knowledge: '📚',
};

const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

export function TradeInterface({
  proposer,
  target,
  onPropose,
  onAccept,
  onReject,
  onCancel,
  activeTrade,
}: TradeInterfaceProps) {
  const [offering, setOffering] = useState<Partial<ResourcePool>>({});
  const [requesting, setRequesting] = useState<Partial<ResourcePool>>({});

  const isPending = activeTrade?.status === 'pending';
  const isProposerView = !activeTrade || activeTrade.proposerId === proposer.id;

  const adjustResource = useCallback(
    (
      side: 'offer' | 'request',
      resource: ResourceType,
      delta: number
    ) => {
      if (activeTrade) return; // Can't modify during active trade

      if (side === 'offer') {
        setOffering((prev) => {
          const current = prev[resource] ?? 0;
          const maxAvailable = proposer.resources[resource];
          const newVal = Math.max(0, Math.min(maxAvailable, current + delta));
          return { ...prev, [resource]: newVal };
        });
      } else {
        setRequesting((prev) => {
          const current = prev[resource] ?? 0;
          const maxAvailable = target.resources[resource];
          const newVal = Math.max(0, Math.min(maxAvailable, current + delta));
          return { ...prev, [resource]: newVal };
        });
      }
    },
    [activeTrade, proposer.resources, target.resources]
  );

  const handlePropose = () => {
    const hasOffer = Object.values(offering).some((v) => v && v > 0);
    const hasRequest = Object.values(requesting).some((v) => v && v > 0);
    if (hasOffer || hasRequest) {
      onPropose(offering, requesting);
    }
  };

  const displayOffering = activeTrade?.offering ?? offering;
  const displayRequesting = activeTrade?.requesting ?? requesting;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <motion.div
        className="relative z-10 bg-stone-900 border border-stone-700/50 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Trade Resources</h2>
          <button
            onClick={onCancel}
            className="text-stone-500 hover:text-stone-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Trade columns */}
        <div className="grid grid-cols-2 divide-x divide-stone-800">
          {/* Proposer column */}
          <TradeColumn
            player={proposer}
            label="Offering"
            resources={displayOffering}
            maxResources={proposer.resources}
            canAdjust={!activeTrade}
            onAdjust={(resource, delta) => adjustResource('offer', resource, delta)}
          />

          {/* Target column */}
          <TradeColumn
            player={target}
            label="Requesting"
            resources={displayRequesting}
            maxResources={target.resources}
            canAdjust={!activeTrade}
            onAdjust={(resource, delta) => adjustResource('request', resource, delta)}
          />
        </div>

        {/* Trade card effects */}
        {activeTrade?.tradeCardId && (
          <div className="px-6 py-2 bg-amber-900/20 border-t border-amber-800/30">
            <span className="text-amber-400 text-xs font-semibold">
              Trade Card Active: {activeTrade.tradeCardId}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-stone-800 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-400 bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            Cancel
          </button>

          {isPending && !isProposerView && (
            <>
              <button
                onClick={onReject}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-300 bg-red-900/30 border border-red-800/50 hover:bg-red-900/50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onAccept}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg"
              >
                Accept
              </button>
            </>
          )}

          {!activeTrade && (
            <button
              onClick={handlePropose}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-lg"
            >
              Propose Trade
            </button>
          )}

          {isPending && isProposerView && (
            <div className="text-stone-400 text-sm italic">Waiting for response...</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TradeColumn({
  player,
  label,
  resources,
  maxResources,
  canAdjust,
  onAdjust,
}: {
  player: Player;
  label: string;
  resources: Partial<ResourcePool>;
  maxResources: ResourcePool;
  canAdjust: boolean;
  onAdjust: (resource: ResourceType, delta: number) => void;
}) {
  const roleColor = ROLE_COLORS[player.roleId] || '#666';

  return (
    <div className="p-4">
      {/* Player info */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
          style={{ borderColor: roleColor, backgroundColor: `${roleColor}22` }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white text-sm font-semibold">{player.name}</div>
          <div className="text-stone-500 text-[10px] uppercase tracking-wider capitalize">
            {player.roleId}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </div>

      {/* Resource rows */}
      <div className="space-y-1.5">
        {RESOURCE_KEYS.map((key) => {
          const tradeAmount = resources[key] ?? 0;
          const available = maxResources[key];
          const color = RESOURCE_COLORS[key];
          const icon = RESOURCE_ICONS[key];

          return (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-stone-800/50"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{icon}</span>
                <span className="text-stone-300 text-xs capitalize">{key}</span>
                <span className="text-stone-600 text-[10px]">({available})</span>
              </div>

              <div className="flex items-center gap-1">
                {canAdjust && (
                  <button
                    onClick={() => onAdjust(key, -1)}
                    disabled={tradeAmount <= 0}
                    className="w-5 h-5 flex items-center justify-center rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                )}

                <AnimatePresence mode="wait">
                  <motion.span
                    key={tradeAmount}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-6 text-center text-sm font-bold tabular-nums"
                    style={{ color: tradeAmount > 0 ? color : '#78716C' }}
                  >
                    {tradeAmount}
                  </motion.span>
                </AnimatePresence>

                {canAdjust && (
                  <button
                    onClick={() => onAdjust(key, 1)}
                    disabled={tradeAmount >= available}
                    className="w-5 h-5 flex items-center justify-center rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
