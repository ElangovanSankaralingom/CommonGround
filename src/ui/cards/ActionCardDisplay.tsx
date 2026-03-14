import React from 'react';
import type { ActionCard, ResourceType } from '../../core/models/types';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  budget: 'B',
  influence: 'I',
  volunteer: 'V',
  material: 'M',
  knowledge: 'K',
};

const SERIES_LABELS: Record<string, string> = {
  starter: 'S',
  middle: 'M',
  closer: 'C',
  any: '*',
};

const SERIES_TOOLTIPS: Record<string, string> = {
  starter: 'Starter',
  middle: 'Middle',
  closer: 'Closer',
  any: 'Any Position',
};

interface ActionCardDisplayProps {
  card: ActionCard;
  roleColor: string;
  isSelected?: boolean;
  compact?: boolean;
}

const ActionCardDisplay: React.FC<ActionCardDisplayProps> = ({
  card,
  roleColor,
  isSelected = false,
  compact = false,
}) => {
  const costEntries = Object.entries(card.cost).filter(
    ([, amount]) => amount !== undefined && amount > 0
  ) as [ResourceType, number][];

  return (
    <div
      className={`
        relative flex flex-col overflow-hidden rounded-xl
        bg-gradient-to-b from-amber-50 to-stone-100
        shadow-md select-none
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        width: compact ? 150 : 180,
        height: compact ? 210 : 250,
        borderLeft: `5px solid ${roleColor}`,
        ...(isSelected ? { ringColor: roleColor } : {}),
      }}
    >
      {/* Header */}
      <div
        className="px-2 py-1.5 text-white"
        style={{ backgroundColor: roleColor }}
      >
        <h3
          className="font-bold leading-tight truncate"
          style={{ fontSize: compact ? 11 : 13 }}
          title={card.name}
        >
          {card.name}
        </h3>
      </div>

      {/* Base Value Badge */}
      <div
        className="absolute top-1 right-1 flex items-center justify-center rounded-full
                   bg-white font-bold shadow-sm border border-stone-300"
        style={{
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          fontSize: compact ? 12 : 14,
          color: roleColor,
        }}
      >
        {card.baseValue}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-2 py-1.5 gap-1 overflow-hidden">
        {/* Cost Icons */}
        {costEntries.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {costEntries.map(([resource, amount]) => (
              <span
                key={resource}
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5
                           text-white font-semibold"
                style={{
                  backgroundColor: RESOURCE_COLORS[resource],
                  fontSize: 10,
                }}
                title={`${resource}: ${amount}`}
              >
                <span
                  className="inline-block rounded-full bg-white/30"
                  style={{ width: 6, height: 6 }}
                />
                {amount}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p
          className="text-stone-700 leading-snug flex-1 overflow-hidden"
          style={{ fontSize: compact ? 9 : 10 }}
        >
          {card.description}
        </p>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-stone-200 text-stone-600 px-1.5 py-0.5
                           font-medium"
                style={{ fontSize: 8 }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Ability Check Indicator */}
        {card.abilityCheck && (
          <div
            className="flex items-center gap-1 text-amber-700 bg-amber-100/80 rounded
                       px-1 py-0.5"
            style={{ fontSize: 9 }}
          >
            <span className="font-bold">Check:</span>
            <span className="capitalize">{card.abilityCheck.ability}</span>
            <span>DC {card.abilityCheck.threshold}</span>
          </div>
        )}

        {/* Flavor Text */}
        {card.flavorText && (
          <p
            className="italic text-stone-400 leading-snug border-t border-stone-200 pt-1"
            style={{ fontSize: compact ? 8 : 9 }}
          >
            {card.flavorText}
          </p>
        )}
      </div>

      {/* Footer: Series Position */}
      <div className="flex items-center justify-between px-2 py-1 bg-stone-200/60">
        <span
          className="inline-flex items-center justify-center rounded-sm
                     bg-stone-400 text-white font-bold"
          style={{
            width: 18,
            height: 18,
            fontSize: 10,
          }}
          title={SERIES_TOOLTIPS[card.seriesPosition]}
        >
          {SERIES_LABELS[card.seriesPosition]}
        </span>
        <div className="flex gap-0.5">
          {costEntries.map(([resource]) => (
            <span
              key={resource}
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: RESOURCE_COLORS[resource],
              }}
              title={resource}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionCardDisplay;
export { RESOURCE_COLORS, RESOURCE_LABELS, SERIES_LABELS, SERIES_TOOLTIPS };
