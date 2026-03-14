import type {
  Player,
  ResourcePool,
  ResourceType,
  TradeCard,
  TradeOffer,
} from '../models/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTrade(
  offer: TradeOffer,
  proposer: Player,
  target: Player
): ValidationResult {
  const errors: string[] = [];

  // Must offer at least 1 token
  const offeringTotal = sumResources(offer.offering);
  if (offeringTotal < 1) {
    errors.push('Must offer at least 1 token.');
  }

  // Must request at least 1 token
  const requestingTotal = sumResources(offer.requesting);
  if (requestingTotal < 1) {
    errors.push('Must request at least 1 token.');
  }

  // No deferred/credit trades: proposer must have what they offer
  for (const [res, amount] of Object.entries(offer.offering)) {
    if (amount && proposer.resources[res as ResourceType] < amount) {
      errors.push(
        `Proposer lacks ${res}: has ${proposer.resources[res as ResourceType]}, offering ${amount}.`
      );
    }
  }

  // Target must have what is being requested
  for (const [res, amount] of Object.entries(offer.requesting)) {
    if (amount && target.resources[res as ResourceType] < amount) {
      errors.push(
        `Target lacks ${res}: has ${target.resources[res as ResourceType]}, requested ${amount}.`
      );
    }
  }

  // Cannot trade with yourself
  if (offer.proposerId === offer.targetId) {
    errors.push('Cannot trade with yourself.');
  }

  return { valid: errors.length === 0, errors };
}

export function executeTrade(
  offer: TradeOffer,
  proposer: Player,
  target: Player
): { updatedProposer: Player; updatedTarget: Player } {
  const updatedProposer = { ...proposer, resources: { ...proposer.resources } };
  const updatedTarget = { ...target, resources: { ...target.resources } };

  // Proposer gives offering to target
  for (const [res, amount] of Object.entries(offer.offering)) {
    if (amount) {
      updatedProposer.resources[res as ResourceType] -= amount;
      updatedTarget.resources[res as ResourceType] += amount;
    }
  }

  // Target gives requesting to proposer
  for (const [res, amount] of Object.entries(offer.requesting)) {
    if (amount) {
      updatedTarget.resources[res as ResourceType] -= amount;
      updatedProposer.resources[res as ResourceType] += amount;
    }
  }

  return { updatedProposer, updatedTarget };
}

export function applyTradeCard(
  tradeCard: TradeCard,
  trade: TradeOffer
): TradeOffer {
  let modifiedTrade = { ...trade, offering: { ...trade.offering }, requesting: { ...trade.requesting } };

  for (const effect of tradeCard.effects) {
    switch (effect.type) {
      case 'enable_swap': {
        // Swap offering and requesting
        const tempOffer = { ...modifiedTrade.offering };
        modifiedTrade.offering = { ...modifiedTrade.requesting };
        modifiedTrade.requesting = tempOffer;
        break;
      }

      case 'coalition_bonus': {
        // Add bonus resources to both sides of the trade
        const bonusResource = effect.params.resource as ResourceType | undefined;
        const bonusAmount = (effect.params.amount as number) || 1;
        if (bonusResource) {
          modifiedTrade.offering[bonusResource] =
            (modifiedTrade.offering[bonusResource] || 0) + bonusAmount;
          modifiedTrade.requesting[bonusResource] =
            (modifiedTrade.requesting[bonusResource] || 0) + bonusAmount;
        }
        break;
      }

      case 'facilitator_mediate': {
        // Trade card attaches to the trade for facilitator awareness
        modifiedTrade.tradeCardId = tradeCard.id;
        break;
      }

      case 'auto_agree': {
        // Automatically accept the trade
        modifiedTrade.status = 'accepted';
        break;
      }
    }
  }

  return modifiedTrade;
}

function sumResources(resources: Partial<ResourcePool>): number {
  let total = 0;
  for (const amount of Object.values(resources)) {
    if (amount) total += amount;
  }
  return total;
}
