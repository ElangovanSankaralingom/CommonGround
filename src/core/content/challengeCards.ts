// challengeCards.ts — 14 realistic challenge cards based on Corporation Eco-Park, Madurai

export interface RealisticChallenge {
  id: string;
  name: string;
  zone: string;           // Z1-Z14
  zoneName: string;
  engineZoneId: string;   // maps to game engine zone ID
  threshold: number;
  difficultyDots: number; // 1-5
  description: string;    // FULL realistic description with real details
  category: 'ecological' | 'infrastructure' | 'social' | 'institutional';
  categoryColor: string;
  affectedObjectives: string[];
  realWorldSource: string;
}

const CATEGORY_COLORS = {
  ecological: '#3B6D11',
  infrastructure: '#BA7517',
  social: '#D85A30',
  institutional: '#534AB7',
} as const;

const challengeList: RealisticChallenge[] = [
  // CARD 1 — Z3 Boating Pond
  {
    id: 'ch-z3-algae',
    name: 'Algae Bloom Crisis',
    zone: 'Z3',
    zoneName: 'Boating Pond',
    engineZoneId: 'boating_pond',
    threshold: 23,
    difficultyDots: 3,
    description:
      'The 2-acre boating pond has developed severe algal bloom due to untreated municipal drainage entering from the Teppakulam side. Dissolved oxygen levels have dropped below 3 mg/L, killing an estimated 200 fish over two weeks. The Corporation had allocated Rs 3.5 lakh for aerator installation, but the funds were redirected mid-cycle to emergency pothole repair on Alagar Kovil Road. TNPCB issued a water quality notice in February 2024, and the Ward 42 councillor has demanded a remediation plan within 60 days.',
    category: 'ecological',
    categoryColor: CATEGORY_COLORS.ecological,
    affectedObjectives: ['water_quality', 'biodiversity', 'public_health'],
    realWorldSource: 'Site survey, March 2024',
  },
  // CARD 2 — Z4 Playground
  {
    id: 'ch-z4-playground',
    name: 'Playground Safety Failure',
    zone: 'Z4',
    zoneName: 'Playground',
    engineZoneId: 'playground',
    threshold: 18,
    difficultyDots: 3,
    description:
      'The children\'s playground near Goripalayam gate has multiple safety violations: rusted swing chains reduced to 60% tensile strength, a 15 cm crack running through the concrete slide base, and degraded rubber flooring exposing sharp aggregate beneath. Two injury reports were filed with the Corporation in October 2023. The equipment was last inspected in 2019, and the original supplier has since closed operations, voiding the maintenance agreement.',
    category: 'infrastructure',
    categoryColor: CATEGORY_COLORS.infrastructure,
    affectedObjectives: ['child_safety', 'public_trust', 'maintenance_standards'],
    realWorldSource: 'TSEDA architecture students field audit, November 2023',
  },
  // CARD 3 — Z1 Main Entrance
  {
    id: 'ch-z1-vendor',
    name: 'Vendor Encroachment at Gateway',
    zone: 'Z1',
    zoneName: 'Main Entrance',
    engineZoneId: 'main_entrance',
    threshold: 16,
    difficultyDots: 2,
    description:
      'Unauthorized vending stalls at the main entrance have grown from 3 licensed units to 14 informal setups, blocking the wheelchair-accessible ramp and reducing the entry corridor to 1.8 metres. The 14 families operating these stalls depend on park foot traffic for daily income averaging Rs 400-600 per family. Corporation Ward 42 records show eviction notices were issued twice in 2023 but not enforced due to political pressure from the local councillor ahead of urban local body elections.',
    category: 'social',
    categoryColor: CATEGORY_COLORS.social,
    affectedObjectives: ['accessibility', 'livelihood_protection', 'public_order'],
    realWorldSource: 'Corporation records, Ward 42 licensing register',
  },
  // CARD 4 — Z13 PPP Zone
  {
    id: 'ch-z13-ppp',
    name: 'Stalled Public-Private Partnership',
    zone: 'Z13',
    zoneName: 'PPP Zone',
    engineZoneId: 'ppp_zone',
    threshold: 28,
    difficultyDots: 4,
    description:
      'A Rs 2.3 crore animatronics theme park proposed under PPP model has stalled after the private partner received a Rs 40 lakh advance but halted construction citing unexpected soil remediation costs near the Vaigai River floodplain. The Corporation\'s legal cell and the private developer dispute liability for contaminated fill material discovered 1.2 metres below grade. The site has been fenced off for 14 months, blocking access to 0.6 acres of previously open parkland, while the Ward councillor faces public complaints about wasted funds.',
    category: 'institutional',
    categoryColor: CATEGORY_COLORS.institutional,
    affectedObjectives: ['fiscal_accountability', 'land_use', 'public_trust'],
    realWorldSource: 'RTI response, July 2023; Corporation council minutes',
  },
  // CARD 5 — Z2 Fountain Plaza
  {
    id: 'ch-z2-fountain',
    name: 'Dead Fountain and Gathering Space',
    zone: 'Z2',
    zoneName: 'Fountain Plaza',
    engineZoneId: 'fountain_plaza',
    threshold: 20,
    difficultyDots: 3,
    description:
      'The musical fountain installed under the Smart City Mission in 2018 at a cost of Rs 85 lakh has been non-operational since December 2022, when the main pump motor burnt out during a voltage surge. The Smart City SPV claims the Corporation is responsible for electrical infrastructure, while the Corporation argues the SPV\'s 5-year warranty should cover replacement. The stagnant basin has become a mosquito breeding site identified by the District Vector Control unit, and the surrounding plaza — once the park\'s primary social gathering space — now sees 40% less evening footfall.',
    category: 'institutional',
    categoryColor: CATEGORY_COLORS.institutional,
    affectedObjectives: ['public_health', 'civic_engagement', 'fiscal_accountability'],
    realWorldSource: 'Smart City SPV records; Corporation Health Wing mosquito survey',
  },
  // CARD 6 — Z5 Walking Track
  {
    id: 'ch-z5-track',
    name: 'Darkened Walking Track Hazard',
    zone: 'Z5',
    zoneName: 'Walking Track',
    engineZoneId: 'walking_track',
    threshold: 19,
    difficultyDots: 3,
    description:
      'The 1.2 km perimeter walking track has 11 of its 32 solar-powered LED path lights non-functional, creating unlit stretches of up to 90 metres along the southern boundary facing Tamukkam Grounds. Cracked concrete pavement at three points near the Goripalayam side has caused two reported trip injuries since August 2023. Evening usage by women walkers has dropped an estimated 35%, per a survey by the Corporation\'s women\'s grievance cell. PWD estimates Rs 4.8 lakh for resurfacing, but the work requires coordination with TANGEDCO for underground cable re-routing.',
    category: 'infrastructure',
    categoryColor: CATEGORY_COLORS.infrastructure,
    affectedObjectives: ['public_safety', 'gender_equity', 'maintenance_standards'],
    realWorldSource: 'Corporation women\'s grievance cell survey; PWD estimate, January 2024',
  },
  // CARD 7 — Z6 Herbal Garden
  {
    id: 'ch-z6-herbal',
    name: 'Herbal Garden Irrigation Collapse',
    zone: 'Z6',
    zoneName: 'Herbal Garden',
    engineZoneId: 'herbal_garden',
    threshold: 22,
    difficultyDots: 3,
    description:
      'The drip irrigation system serving the 0.4-acre herbal garden has been offline for five months after the PVC mainline cracked during excavation work for a new Vaigai River stormwater drain. Of the 120 medicinal species originally planted with guidance from the Siddha Medical College, 38 species — including rare varieties of Keezhanelli and Adathodai — have perished. The Horticulture Department quotes Rs 2.1 lakh for irrigation repair, but a turf war with PWD over who caused the damage has stalled the requisition since September 2023.',
    category: 'ecological',
    categoryColor: CATEGORY_COLORS.ecological,
    affectedObjectives: ['biodiversity', 'cultural_heritage', 'inter_agency_coordination'],
    realWorldSource: 'Horticulture Department loss inventory; PWD stormwater project records',
  },
  // CARD 8 — Z7 Open Lawn
  {
    id: 'ch-z7-lawn',
    name: 'Open Lawn User Conflict',
    zone: 'Z7',
    zoneName: 'Open Lawn',
    engineZoneId: 'open_lawn',
    threshold: 15,
    difficultyDots: 2,
    description:
      'The 1.5-acre central lawn — the park\'s largest open space — has become a flashpoint between morning yoga groups (approximately 80 regulars), weekend cricket players, and families seeking picnic space. Only 12 concrete benches serve the entire area, pushing elderly users onto the grass. The Ward 42 councillor received 23 written complaints in Q4 2023 about noise and litter from unpermitted birthday party setups. The Corporation considered installing movable bollards to zone usage by time slot, estimated at Rs 1.6 lakh, but no budget line was approved in the 2024-25 draft.',
    category: 'social',
    categoryColor: CATEGORY_COLORS.social,
    affectedObjectives: ['inclusive_access', 'conflict_resolution', 'civic_engagement'],
    realWorldSource: 'Ward 42 councillor petition register, Q4 2023',
  },
  // CARD 9 — Z8 Exercise Zone
  {
    id: 'ch-z8-exercise',
    name: 'Open-Air Gym Equipment Breakdown',
    zone: 'Z8',
    zoneName: 'Exercise Zone',
    engineZoneId: 'exercise_zone',
    threshold: 17,
    difficultyDots: 2,
    description:
      'Six of the 10 open-air gym stations installed in 2020 at Rs 6.2 lakh are now non-functional: the chest press has a sheared pivot bolt, the leg press seat is missing entirely, and four units have seized bearings from monsoon water ingress. A 62-year-old user sustained a shoulder injury in November 2023 and filed a complaint with the District Consumer Forum citing Corporation negligence. The original vendor, based near Teppakulam, quoted Rs 1.8 lakh for parts, but the Corporation\'s procurement cell rejected the single-source estimate, requiring a fresh tender process that could take 4-6 months.',
    category: 'infrastructure',
    categoryColor: CATEGORY_COLORS.infrastructure,
    affectedObjectives: ['public_safety', 'public_health', 'procurement_reform'],
    realWorldSource: 'District Consumer Forum complaint; Corporation procurement cell records',
  },
  // CARD 10 — Z9 Sculpture Garden
  {
    id: 'ch-z9-sculpture',
    name: 'Heritage vs. Development Standoff',
    zone: 'Z9',
    zoneName: 'Sculpture Garden',
    engineZoneId: 'sculpture_garden',
    threshold: 25,
    difficultyDots: 4,
    description:
      'The sculpture garden contains 8 stone installations dating to the original 1960s Eco-Park layout, three of which the State Archaeology Department has proposed for heritage listing. Simultaneously, the Smart City SPV has earmarked the zone for a Rs 1.4 crore augmented-reality heritage walk requiring ground-mounted sensors and cable trenching within 2 metres of the sculptures. The Archaeology Department issued a stop-work advisory in March 2024, while the SPV faces a March 2025 deadline to utilise central funds or forfeit the allocation. Local heritage activists near Alagar Kovil Road have organised two public meetings opposing the digital intervention.',
    category: 'institutional',
    categoryColor: CATEGORY_COLORS.institutional,
    affectedObjectives: ['cultural_heritage', 'fiscal_accountability', 'civic_engagement'],
    realWorldSource: 'State Archaeology Department advisory; Smart City SPV project timeline',
  },
  // CARD 11 — Z10 Vendor Hub
  {
    id: 'ch-z10-vendor',
    name: 'Food Court Sanitation Crisis',
    zone: 'Z10',
    zoneName: 'Vendor Hub',
    engineZoneId: 'vendor_hub',
    threshold: 21,
    difficultyDots: 3,
    description:
      'The designated vendor hub with 8 licensed food stalls generates an estimated 120 kg of mixed waste daily, but the waste segregation bins installed in 2021 have not been replaced since their lids broke. Three stalls were found operating without valid FSSAI licences during a surprise inspection in January 2024. Grey water from food preparation flows into an open drain connecting to the Vaigai River outfall channel 300 metres downstream. TNPCB has flagged the discharge point, and the Corporation\'s Health Wing issued notices, but enforcement requires coordination between the Licencing, Health, and Solid Waste Management departments.',
    category: 'social',
    categoryColor: CATEGORY_COLORS.social,
    affectedObjectives: ['public_health', 'waste_management', 'regulatory_compliance'],
    realWorldSource: 'FSSAI inspection report, January 2024; TNPCB discharge notice',
  },
  // CARD 12 — Z11 Restroom Block
  {
    id: 'ch-z11-restroom',
    name: 'Restroom Block Failure',
    zone: 'Z11',
    zoneName: 'Restroom Block',
    engineZoneId: 'restroom_block',
    threshold: 19,
    difficultyDots: 3,
    description:
      'The public restroom block constructed in 2017 at Rs 12 lakh has 4 of its 6 stalls out of service: two have burst flush cisterns, one has a collapsed false ceiling exposing electrical wiring, and one lacks a functional door latch. The single accessible stall for persons with disabilities has a ramp gradient of 1:8 instead of the mandated 1:12 under the Rights of Persons with Disabilities Act, 2016. The Corporation\'s engineering wing estimated Rs 3.2 lakh for full rehabilitation, but the file has been pending approval at the Zonal Office near Goripalayam since October 2023.',
    category: 'infrastructure',
    categoryColor: CATEGORY_COLORS.infrastructure,
    affectedObjectives: ['accessibility', 'public_health', 'regulatory_compliance'],
    realWorldSource: 'Corporation engineering wing estimate; disability rights audit, 2023',
  },
  // CARD 13 — Z12 Fiber-Optic Lane
  {
    id: 'ch-z12-fiber',
    name: 'Smart Infrastructure Maintenance Gap',
    zone: 'Z12',
    zoneName: 'Fiber-Optic Lane',
    engineZoneId: 'fiber_optic_lane',
    threshold: 24,
    difficultyDots: 4,
    description:
      'The Smart City SPV installed a 600-metre fiber-optic backbone through the park in 2019 at Rs 48 lakh, connecting 14 CCTV cameras, 6 environmental sensors, and a public Wi-Fi mesh. After the SPV\'s O&M contract expired in March 2023, the Corporation inherited the assets but lacks technical staff to maintain them. Nine cameras are offline, the air-quality sensor near Tamukkam Grounds reports erroneous PM2.5 readings, and the Wi-Fi access points have not received firmware updates in 18 months, creating cybersecurity vulnerabilities. Retendering the O&M contract is estimated at Rs 8.5 lakh per annum, with no dedicated budget line in the Corporation\'s IT allocation.',
    category: 'institutional',
    categoryColor: CATEGORY_COLORS.institutional,
    affectedObjectives: ['public_safety', 'digital_governance', 'fiscal_accountability'],
    realWorldSource: 'Smart City SPV asset transfer register; Corporation IT cell assessment',
  },
  // CARD 14 — Z14 Maintenance Depot
  {
    id: 'ch-z14-depot',
    name: 'Maintenance Depot Staffing Collapse',
    zone: 'Z14',
    zoneName: 'Maintenance Depot',
    engineZoneId: 'maintenance_depot',
    threshold: 26,
    difficultyDots: 4,
    description:
      'The park\'s maintenance depot, responsible for all groundskeeping and repair operations, is operating with 4 permanent staff against a sanctioned strength of 11. Three gardener posts have been vacant since 2021 due to a state-wide recruitment freeze, and 4 contract workers were let go when the outsourcing agency\'s contract lapsed in June 2023. Spare parts inventory for pumps, mowers, and electrical fittings has not been replenished since the Rs 1.9 lakh annual supply order was held up by an audit objection at the Corporation\'s finance wing near Teppakulam. Average response time for reported faults has increased from 2 days to 11 days.',
    category: 'institutional',
    categoryColor: CATEGORY_COLORS.institutional,
    affectedObjectives: ['operational_capacity', 'maintenance_standards', 'fiscal_accountability'],
    realWorldSource: 'Corporation HR sanctioned-strength register; audit objection memo, 2023',
  },
];

export const REALISTIC_CHALLENGES: Record<string, RealisticChallenge> = {};
for (const card of challengeList) {
  REALISTIC_CHALLENGES[card.engineZoneId] = card;
}

export function getRealisticChallenge(zoneId: string): RealisticChallenge | null {
  return REALISTIC_CHALLENGES[zoneId] ?? null;
}
