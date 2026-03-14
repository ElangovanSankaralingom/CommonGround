import type {
  ActionCard,
  Player,
  SeriesInProgress,
} from '../models/types';
import { getAbilityModifier } from '../models/types';
import { TAG_ABILITY_MAP } from '../models/constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function hasCommonTag(card1: ActionCard, card2: ActionCard): boolean {
  return card1.tags.some((tag) => card2.tags.includes(tag));
}

export function validateSeriesFormation(
  cards: { card: ActionCard; playerId: string }[],
  players: Record<string, Player>
): ValidationResult {
  const errors: string[] = [];

  // Must have 2-4 cards
  if (cards.length < 2 || cards.length > 4) {
    errors.push(`Series must contain 2-4 cards, got ${cards.length}.`);
  }

  if (cards.length >= 2) {
    // Tag chaining: consecutive cards must share at least one common tag
    for (let i = 0; i < cards.length - 1; i++) {
      if (!hasCommonTag(cards[i].card, cards[i + 1].card)) {
        errors.push(
          `Cards at positions ${i} and ${i + 1} share no common tags.`
        );
      }
    }

    // Position rules
    const firstCard = cards[0].card;
    if (firstCard.seriesPosition !== 'starter' && firstCard.seriesPosition !== 'any') {
      errors.push(
        `First card "${firstCard.name}" must be a starter or any, got "${firstCard.seriesPosition}".`
      );
    }

    const lastCard = cards[cards.length - 1].card;
    if (lastCard.seriesPosition !== 'closer' && lastCard.seriesPosition !== 'any') {
      errors.push(
        `Last card "${lastCard.name}" must be a closer or any, got "${lastCard.seriesPosition}".`
      );
    }

    for (let i = 1; i < cards.length - 1; i++) {
      const midCard = cards[i].card;
      if (midCard.seriesPosition !== 'middle' && midCard.seriesPosition !== 'any') {
        errors.push(
          `Middle card "${midCard.name}" at position ${i} must be a middle or any, got "${midCard.seriesPosition}".`
        );
      }
    }
  }

  // Role uniqueness: each player can only contribute once per series
  const playerIds = cards.map((c) => c.playerId);
  const uniquePlayerIds = new Set(playerIds);
  if (uniquePlayerIds.size !== playerIds.length) {
    errors.push('Each player may only contribute one card to a series.');
  }

  // Verify all players exist
  for (const entry of cards) {
    if (!players[entry.playerId]) {
      errors.push(`Player "${entry.playerId}" not found.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function getRelevantAbilityForCard(card: ActionCard): string | null {
  if (card.tags.length === 0) return null;
  const primaryTag = card.tags[0];
  return TAG_ABILITY_MAP[primaryTag] || null;
}

export function calculateSeriesValue(
  series: SeriesInProgress,
  players: Record<string, Player>
): number {
  let total = 0;

  for (const entry of series.cards) {
    const player = players[entry.playerId];
    let cardValue = entry.card.baseValue;

    const relevantAbility = getRelevantAbilityForCard(entry.card);
    if (relevantAbility && player) {
      const abilityScore =
        player.abilities[relevantAbility as keyof typeof player.abilities];
      cardValue += getAbilityModifier(abilityScore);
    }

    total += cardValue;
  }

  // Coalition pact bonus
  if (series.coalitionPactActive) {
    total += 2;
  }

  // Unique roles bonus: 3+ unique roles grants +3
  const uniqueRoles = new Set(
    series.cards.map((c) => {
      const player = players[c.playerId];
      return player ? player.roleId : null;
    })
  );
  if (uniqueRoles.size >= 3) {
    total += 3;
  }

  return total;
}

export function canAddCardToSeries(
  series: SeriesInProgress,
  card: ActionCard,
  player: Player
): boolean {
  // Max 4 cards
  if (series.cards.length >= 4) return false;

  // Player must not already be in the series
  if (series.cards.some((c) => c.playerId === player.id)) return false;

  // Tag chaining with the last card in the series
  if (series.cards.length > 0) {
    const lastCard = series.cards[series.cards.length - 1].card;
    if (!hasCommonTag(lastCard, card)) return false;
  }

  // Position check: if series is empty, card must be starter/any
  if (series.cards.length === 0) {
    if (card.seriesPosition !== 'starter' && card.seriesPosition !== 'any') {
      return false;
    }
  } else {
    // Adding to middle position (the card being added is not yet the last card
    // until series is finalized, so we treat it as a middle card unless it would close)
    if (card.seriesPosition !== 'middle' && card.seriesPosition !== 'any' && card.seriesPosition !== 'closer') {
      return false;
    }
  }

  return true;
}
