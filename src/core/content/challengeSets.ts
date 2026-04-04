/**
 * challengeSets.ts — Predefined sets of 3-round challenge sequences.
 * Each set provides a curated progression through different zones.
 */

export interface ChallengeSet {
  id: string;
  name: string;
  description: string;
  rounds: { roundNumber: number; zoneId: string; difficultyOverride?: number }[];
}

const CHALLENGE_SETS: ChallengeSet[] = [
  {
    id: 'setA', name: 'Set A', description: 'Infrastructure focus: walking track, boating pond, playground',
    rounds: [
      { roundNumber: 1, zoneId: 'z5' },
      { roundNumber: 2, zoneId: 'z3' },
      { roundNumber: 3, zoneId: 'z6' },
    ],
  },
  {
    id: 'setB', name: 'Set B', description: 'Mixed: herbal garden, fountain plaza, main entrance',
    rounds: [
      { roundNumber: 1, zoneId: 'z4' },
      { roundNumber: 2, zoneId: 'z2' },
      { roundNumber: 3, zoneId: 'z1' },
    ],
  },
  {
    id: 'setC', name: 'Set C', description: 'Community challenges: open lawn, nursery, PPP zone',
    rounds: [
      { roundNumber: 1, zoneId: 'z7' },
      { roundNumber: 2, zoneId: 'z8' },
      { roundNumber: 3, zoneId: 'z13' },
    ],
  },
  {
    id: 'setD', name: 'Set D', description: 'Institutional: staff quarters, boundary, south pond',
    rounds: [
      { roundNumber: 1, zoneId: 'z9' },
      { roundNumber: 2, zoneId: 'z10' },
      { roundNumber: 3, zoneId: 'z11' },
    ],
  },
  {
    id: 'setE', name: 'Set E', description: 'Ecology & infrastructure: compost, water tank, walking track',
    rounds: [
      { roundNumber: 1, zoneId: 'z12' },
      { roundNumber: 2, zoneId: 'z14' },
      { roundNumber: 3, zoneId: 'z5', difficultyOverride: 3 },
    ],
  },
];

export default CHALLENGE_SETS;

export function getChallengeSet(setId: string): ChallengeSet | undefined {
  return CHALLENGE_SETS.find(s => s.id === setId);
}
