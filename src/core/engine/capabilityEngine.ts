// No imports needed — this is a standalone data + logic file

export interface Capability {
  id: string;
  name: string;
  role: string;
  icon: string;
  description: string;
  selfBonusPercent: number;
  otherBonusPercent: number;
  otherBonusByTargetRole?: Record<string, number>;
  flatBonus: number;
  specialEffect: string | null;
  usesPerRound: number;
}

export interface CapabilityActivation {
  bonusPercent: number;
  flatBonus: number;
  specialResult: string | null;
}

export const CAPABILITIES: Capability[] = [
  // Administrator
  { id: 'official_sanction', name: 'Official Sanction', role: 'administrator', icon: 'verified',
    description: 'Corporation stamps this task with official approval.', selfBonusPercent: 10, otherBonusPercent: 25, flatBonus: 0, specialEffect: null, usesPerRound: 1 },
  { id: 'budget_fasttrack', name: 'Budget Fast-Track', role: 'administrator', icon: 'speed',
    description: 'Expedite financial processes — remove budget freeze or reduce cost.', selfBonusPercent: 5, otherBonusPercent: 10, flatBonus: 0, specialEffect: 'remove_budget_freeze', usesPerRound: 1 },
  // Investor
  { id: 'market_connection', name: 'Market Connection', role: 'investor', icon: 'storefront',
    description: 'Link task to revenue stream — sustainability model.', selfBonusPercent: 10, otherBonusPercent: 20, flatBonus: 0, specialEffect: null, usesPerRound: 1 },
  { id: 'cost_negotiation', name: 'Cost Negotiation', role: 'investor', icon: 'savings',
    description: 'Negotiate contractor rates — reduce material cost by 1.', selfBonusPercent: 5, otherBonusPercent: 10, flatBonus: 0, specialEffect: 'reduce_material_cost', usesPerRound: 1 },
  // Designer
  { id: 'technical_specification', name: 'Technical Specification', role: 'designer', icon: 'architecture',
    description: 'Add BIS/IRC standards compliance — buildable spec.', selfBonusPercent: 10, otherBonusPercent: 25, flatBonus: 0, specialEffect: null, usesPerRound: 1 },
  { id: 'site_intelligence', name: 'Site Intelligence', role: 'designer', icon: 'explore',
    description: 'Reveal a hidden site condition.', selfBonusPercent: 5, otherBonusPercent: 10, flatBonus: 2, specialEffect: 'reveal_info', usesPerRound: 1 },
  // Citizen
  { id: 'community_endorsement', name: 'Community Endorsement', role: 'citizen', icon: 'thumb_up',
    description: 'Attach community backing — political legitimacy.', selfBonusPercent: 10, otherBonusPercent: 20,
    otherBonusByTargetRole: { administrator: 30, investor: 25, designer: 20, advocate: 20, citizen: 10 },
    flatBonus: 0, specialEffect: null, usesPerRound: 1 },
  { id: 'local_knowledge', name: 'Local Knowledge', role: 'citizen', icon: 'location_on',
    description: 'Reveal hyperlocal fact only a resident would know.', selfBonusPercent: 5, otherBonusPercent: 10, flatBonus: 2, specialEffect: 'reveal_info', usesPerRound: 1 },
  // Advocate
  { id: 'legal_leverage', name: 'Legal Leverage', role: 'advocate', icon: 'gavel',
    description: 'Attach legal/policy instrument — mandatory compliance.', selfBonusPercent: 10, otherBonusPercent: 20,
    otherBonusByTargetRole: { administrator: 30, investor: 20, designer: 20, citizen: 20, advocate: 10 },
    flatBonus: 0, specialEffect: null, usesPerRound: 1 },
  { id: 'institutional_bridge', name: 'Institutional Bridge', role: 'advocate', icon: 'connect_without_contact',
    description: 'Connect two non-coordinating institutions.', selfBonusPercent: 5, otherBonusPercent: 15, flatBonus: 3, specialEffect: 'bridge_institutions', usesPerRound: 1 },
];

export function getPlayerCapabilities(roleId: string): Capability[] {
  return CAPABILITIES.filter(c => c.role === roleId);
}

export function activateCapability(
  capabilityId: string,
  activatorRole: string,
  taskPlacerRole: string,
  usedOnSelf: boolean,
  capabilitiesUsedThisRound: string[],
  _description: string
): { activation: CapabilityActivation; alreadyUsed: boolean } {
  const cap = CAPABILITIES.find(c => c.id === capabilityId);
  if (!cap) {
    return { activation: { bonusPercent: 0, flatBonus: 0, specialResult: null }, alreadyUsed: false };
  }

  if (capabilitiesUsedThisRound.includes(capabilityId)) {
    return { activation: { bonusPercent: 0, flatBonus: 0, specialResult: null }, alreadyUsed: true };
  }

  let bonusPercent: number;
  if (usedOnSelf) {
    bonusPercent = cap.selfBonusPercent;
  } else if (cap.otherBonusByTargetRole && cap.otherBonusByTargetRole[taskPlacerRole] !== undefined) {
    bonusPercent = cap.otherBonusByTargetRole[taskPlacerRole];
  } else {
    bonusPercent = cap.otherBonusPercent;
  }

  if (usedOnSelf) {
    bonusPercent = Math.round(bonusPercent * 0.4);
  }

  const target = usedOnSelf ? 'self' : 'other';
  console.log(`CAPABILITY_ACTIVATED: ${cap.name} by ${activatorRole} on ${target} +${bonusPercent}%`);

  return {
    activation: {
      bonusPercent,
      flatBonus: cap.flatBonus,
      specialResult: cap.specialEffect,
    },
    alreadyUsed: false,
  };
}
