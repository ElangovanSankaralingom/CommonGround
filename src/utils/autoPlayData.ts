/**
 * autoPlayData.ts — Zone-specific content for automated play simulation.
 * Contains local insights and task action texts for all 14 zones.
 */

// ─── Zone-Specific Stakeholder Insights ────────────────────────
// These contain proper nouns, numbers, technical terms, and specific locations.

export const ZONE_STAKEHOLDER_INSIGHTS: Record<string, string[]> = {
  z1: [
    'The main gate security guard Raju has been tracking visitor counts manually since 2020 — daily average dropped from 1200 to 650 after the lighting failed',
    'Corporation file No. PWD/Parks/2022/147 has Rs 4.8 lakh sanctioned for entrance renovation but the contractor defaulted — refile under new tender',
    'The auto-rickshaw stand operators at the east gate collect informal parking fees — formalizing this through Corporation license generates Rs 15000/month',
  ],
  z2: [
    'The fountain pump motor burned out in August 2021 — replacement cost is only Rs 12000 but the indent was rejected because it was filed under wrong budget head (maintenance vs capital)',
    'Wedding photographers use the fountain area every Sunday morning — 8 to 10 groups paying Rs 500 to the groundskeeper informally — formalize this as Rs 2000/permit to Corporation',
    'The original Italian marble tiles were replaced with cheap ceramic in 2018 renovation — the leftover Italian tiles are stored in the Corporation godown on Alagar Kovil Road',
  ],
  z3: [
    'Boating pond depth is only 2.1m at center after silting — original design was 3.5m — dredging costs Rs 4.2 lakh per 1000 sqm',
    'Mrs. Lakshmi at house 14 near the south bank feeds the fish every morning at 6am — she knows every family within 500m and can mobilize 30 volunteers',
    'The PWD junior engineer Mr. Selvam approves pipe repairs under Rs 50000 without tendering — the drainage blockage near the inlet can be fixed this way',
  ],
  z4: [
    'Dr. Meenakshi from Siddha Medical College has catalogued 47 medicinal species that once grew here — she will donate saplings and provide interpretation signage text for free',
    'The garden soil pH is 8.2 due to construction debris dumping in 2019 — needs acidification with coffee grounds before any planting succeeds',
    'Three women from the Kamarajar Nagar SHG already sell herbal products at Sunday market — they would maintain medicinal beds in exchange for harvesting rights',
  ],
  z5: [
    'The rubberized track surface was installed in 2017 at Rs 850/sqm — it has cracked in 23 locations due to tree root intrusion — patching costs Rs 180/sqm',
    'Morning yoga group of 80 regulars led by Mr. Sundaram has maintained informal rules since 2015 — formalize their committee and they will self-manage the entire track zone',
    'TNPCB assistant director Mr. Raman uses the walking track every Saturday morning at 6am — approach him informally before filing RTI for noise compliance data',
  ],
  z6: [
    'The imported playground equipment from Kompan was installed in 2016 — warranty expired 2021 — replacement parts available from their Chennai distributor at 40% cost of new units',
    'Three children sustained minor injuries in December 2023 from rusty swing bolts — Corporation liability insurance claim No. INS/2024/031 is still pending',
    'Safety surfacing rubber tiles cost Rs 3500/sqm from Madurai Rubber Works on Villapuram Road — they offer 10% discount for orders above 200 sqm',
  ],
  z7: [
    'Ward 42 councillor office has a Rs 2.5 lakh discretionary fund — submit Form 17A before March 15 or the allocation lapses to general revenue',
    'The cricket players (weekend group of 15-20 youth) have agreed to shift to morning-only slots if permanent stumps and boundary markings are installed',
    'Birthday party setups leave behind 8-12 kg waste every weekend — the Nagai Nagar resident association president will enforce booking rules if given formal authority',
  ],
  z8: [
    'The Corporation nursery behind this zone has 3000 native saplings ready — they are FREE for park projects if you submit Form 17B to the Horticulture wing',
    'Head gardener Murugesan has 32 years experience and knows propagation schedules for every native species in the district — he retires in 8 months',
    'The nursery greenhouse plastic sheeting was replaced in 2022 but wrong UV grade was used — it will degrade within 18 months — replace with UV-stabilized 200 micron from Pondicherry supplier',
  ],
  z9: [
    'Only 2 of 6 staff quarters are occupied — the vacant ones have been used for unauthorized storage since 2020 — PWD building condition report rates them Grade C (repairable)',
    'The night watchman Kannan lives in Quarter 3 and patrols 8pm to 6am — he reports repeated trespassing from the east boundary wall breach near the transformer',
    'Staff quarter electrical wiring is original 1987 installation — TNEB inspection flagged 14 safety violations in February 2024 — rewiring estimate Rs 1.8 lakh for all 6 units',
  ],
  z10: [
    'The peripheral boundary wall has 7 breach points used as unauthorized entries — CCTV footage from Corporation camera CP-14 confirms 40-60 entries daily bypassing the main gate',
    'Street vendors along the east wall pay no Corporation tax — formalizing 12 vendor spots at Rs 200/month each generates Rs 28800/year for boundary maintenance',
    'The large banyan tree near the northeast corner is estimated 120+ years old — Tree Authority heritage listing would protect it and attract eco-tourism visitors',
  ],
  z11: [
    'South pond water quality test from January 2024 shows BOD 42mg/L — should be under 10 — the raw sewage inlet from Kamarajar Nagar colony 3rd cross street is the source',
    'Fish mortality event in March 2023 killed approximately 200 native species — TNPCB challan was issued but fine of Rs 10000 was waived after political intervention',
    'The pond bund wall has subsided 300mm on the south side — geotechnical report recommends sheet pile reinforcement — cost Rs 6.2 lakh for 45m stretch',
  ],
  z12: [
    'The existing compost yard processes only 200kg/day but park generates 500kg green waste — expanding to 3 additional windrow beds costs Rs 80000 and triples capacity',
    'Nearby apartment complexes Sree Lakshmi Residency and Park View Towers generate 150kg kitchen waste daily — they will pay Rs 500/month for composting service',
    'Vermicompost sells at Rs 8/kg in Madurai market — current production of 50kg/month can scale to 300kg/month generating Rs 2400/month revenue',
  ],
  z13: [
    'The PPP tender document No. Corp/PPP/2023/08 was cancelled after single bidder — minimum 3 bidders required — re-tender with reduced earnest money deposit from Rs 5 lakh to Rs 2 lakh',
    'Private operator Green Spaces Ltd operated successfully in Tirunelveli Corporation park — their Madurai branch manager Mr. Krishnamurthy is interested if lease terms are revised',
    'Revenue model from Coimbatore VOC Park PPP: Rs 12 lakh/year from operator covering maintenance + Rs 3 lakh from event bookings — similar model applicable here',
  ],
  z14: [
    'The overhead tank capacity is 50000 litres but supply is only 22000 litres/day due to TWAD Board pressure drop after Villapuram housing extension was connected to same main',
    'Tank structural inspection by PWD in 2023 found no cracks but recommended waterproofing of interior walls — cost Rs 1.2 lakh using crystalline waterproofing compound',
    'Rainwater harvesting potential from tank roof area (120 sqm) = 72000 litres/year if connected to recharge well — recharge well drilling costs Rs 35000',
  ],
};

// ─── Zone-Specific Student Insights (generic, zone-aware) ──────

export const ZONE_STUDENT_INSIGHTS: Record<string, string[]> = {
  z1: [
    'The entrance area needs better maintenance and repair work',
    'More visitors would come if the entrance was improved',
    'Regular cleaning schedule would help keep the entrance presentable',
  ],
  z2: [
    'The fountain area could be a nice gathering space if repaired',
    'Better seating around the fountain plaza would attract families',
    'The plaza needs regular upkeep to maintain its appeal',
  ],
  z3: [
    'The pond area needs water quality improvement',
    'Boating activities would attract more visitors to the park',
    'Regular cleaning of the pond would improve the environment',
  ],
  z4: [
    'The herbal garden needs more plants and better irrigation',
    'Signage about medicinal plants would make this area educational',
    'Volunteer support would help maintain the garden better',
  ],
  z5: [
    'The walking track surface needs repair in several places',
    'Better lighting along the track would improve evening safety',
    'Adding benches along the track would help elderly walkers',
  ],
  z6: [
    'The playground equipment looks unsafe and needs replacement',
    'A safer surface under the swings would prevent injuries',
    'Parents want a cleaner and safer play area for children',
  ],
  z7: [
    'The open lawn could be better organized for different activities',
    'Some shade structures would make the lawn usable in summer',
    'A booking system might reduce conflicts between user groups',
  ],
  z8: [
    'The nursery area needs more staff to maintain production',
    'Better irrigation would help the nursery grow more plants',
    'The greenhouse structure needs repairs to function properly',
  ],
  z9: [
    'The staff quarters could be repurposed for community use',
    'Better security would help protect the park at night',
    'The buildings need basic maintenance and electrical work',
  ],
  z10: [
    'The peripheral walk needs boundary walls repaired',
    'Stray animal management would make the path safer',
    'Better fencing would prevent unauthorized entry',
  ],
  z11: [
    'The south pond water quality is poor and needs treatment',
    'Preventing sewage inflow would help restore the pond',
    'Native fish species should be reintroduced after cleanup',
  ],
  z12: [
    'The composting area could process more waste with expansion',
    'Better waste segregation would improve compost quality',
    'Community involvement would help sustain the composting operation',
  ],
  z13: [
    'The PPP zone needs a clear plan for public use',
    'Private partnership terms should protect public interest',
    'The abandoned construction debris needs to be cleared first',
  ],
  z14: [
    'The water supply system needs pump motor replacements',
    'Better water management would benefit all park zones',
    'Rainwater harvesting could supplement the existing supply',
  ],
};

// ─── Zone-Specific Task Action Texts ───────────────────────────
// Each zone has 5 action texts mapped to task types: assess, plan, design, build, maintain

export const ZONE_TASK_ACTIONS: Record<string, Record<string, string>> = {
  z1: {
    assess: 'Survey entrance encroachment extent, vendor count, and accessibility barriers',
    plan: 'Create vendor relocation plan with alternative market area and transition timeline',
    design: 'Design accessible gateway with vendor kiosks, ramp access, and fire safety clearance',
    build: 'Construct new entrance layout with designated vendor bays and wheelchair-accessible path',
    maintain: 'Establish weekly vendor zone inspection and monthly accessibility compliance audit',
  },
  z2: {
    assess: 'Inspect fountain pump system, electrical supply, and plaza surface condition',
    plan: 'Create fountain restoration plan with SPV contract resolution and budget reallocation',
    design: 'Design fountain repair specifications with energy-efficient pump and LED light system',
    build: 'Replace pump motor, repair plumbing, and resurface plaza gathering area',
    maintain: 'Establish daily fountain operation schedule and quarterly mechanical inspection',
  },
  z3: {
    assess: 'Survey boating pond siltation levels and inlet drainage blockage condition',
    plan: 'Create dredging and inlet repair implementation timeline with PWD coordination',
    design: 'Design pond restoration specifications including depth profile and water circulation system',
    build: 'Execute pond dredging, inlet repair, and bank stabilization works',
    maintain: 'Establish monthly water quality monitoring and quarterly silt measurement protocol',
  },
  z4: {
    assess: 'Document surviving medicinal species, soil condition, and irrigation pipeline damage',
    plan: 'Create herbal garden restoration plan with volunteer recruitment and species recovery list',
    design: 'Design irrigation network repair and medicinal bed layout with interpretive signage',
    build: 'Repair irrigation junction, prepare soil beds, and plant 45 medicinal species',
    maintain: 'Establish volunteer gardening schedule and seasonal planting calendar with Siddha College',
  },
  z5: {
    assess: 'Map all 12 cracked slabs, 8 failed solar lamps, and root intrusion points on walking track',
    plan: 'Create phased repair plan addressing root barriers, slab replacement, and solar lamp restoration',
    design: 'Design root barrier system and modular solar lighting with motion sensors',
    build: 'Install root barriers, replace damaged concrete slabs, and restore solar lamp posts',
    maintain: 'Establish weekly track inspection by yoga group committee and monthly lamp maintenance',
  },
  z6: {
    assess: 'Inspect all playground equipment, test fall zone surfaces, and document safety hazards',
    plan: 'Create equipment replacement priority list and safety surfacing installation schedule',
    design: 'Design age-appropriate play zones with certified impact-absorbing surface specifications',
    build: 'Replace rusted equipment, install safety surfacing, and add protective fencing',
    maintain: 'Establish weekly equipment inspection checklist and quarterly safety certification audit',
  },
  z7: {
    assess: 'Survey current usage patterns, identify peak conflict times, and count user groups',
    plan: 'Create time-based zoning plan with stakeholder agreement and activity scheduling',
    design: 'Design activity zones with movable boundary markers, shade structures, and seating clusters',
    build: 'Install zone markers, construct shade pavilions, and add 24 new bench seats',
    maintain: 'Establish community space-sharing committee with monthly conflict resolution meetings',
  },
  z8: {
    assess: 'Audit nursery production records, greenhouse condition, and irrigation system status',
    plan: 'Create nursery revival plan with new gardener recruitment and production targets',
    design: 'Design modernized propagation facility with mist irrigation and UV-grade greenhouse cover',
    build: 'Repair greenhouse, install mist system, and establish 3 new propagation beds',
    maintain: 'Establish apprentice gardener program and monthly sapling production tracking system',
  },
  z9: {
    assess: 'Inspect all 6 staff quarters for structural condition, electrical safety, and occupancy status',
    plan: 'Create repurposing proposal for vacant quarters as community facility with Corporation approval',
    design: 'Design community reading room, tool library, and volunteer center in vacant quarters',
    build: 'Renovate 3 vacant quarters with rewiring, plumbing, and accessibility modifications',
    maintain: 'Establish facility management committee with quarterly condition assessment',
  },
  z10: {
    assess: 'Map all 7 boundary breach points, measure path width reduction, and document encroachments',
    plan: 'Create boundary restoration plan with legal notices to encroaching properties and path widening',
    design: 'Design boundary wall repair and path widening with anti-encroachment bollards and lighting',
    build: 'Repair boundary wall, widen path to 3m, install bollards and CCTV at breach points',
    maintain: 'Establish monthly boundary patrol and stray animal management with Corporation veterinary unit',
  },
  z11: {
    assess: 'Collect water samples at 6 points, trace sewage inlet source, and measure bund wall subsidence',
    plan: 'Create sewage diversion plan with municipal sewer repair timeline and pond remediation schedule',
    design: 'Design sewage inlet closure, pond bioremediation system, and bund wall reinforcement',
    build: 'Block sewage inlet, repair 600mm sewer pipe, and install aeration system for pond recovery',
    maintain: 'Establish weekly water quality testing and quarterly groundwater monitoring with TNPCB oversight',
  },
  z12: {
    assess: 'Measure daily green waste input, existing compost output, and methane emission levels',
    plan: 'Create expanded composting operation plan with NGO partnership and apartment waste collection',
    design: 'Design 3 additional windrow beds with leachate collection and vermicompost production unit',
    build: 'Construct windrow beds, install turning equipment, and set up vermicompost facility',
    maintain: 'Establish weekly turning schedule with trained community operators and monthly output tracking',
  },
  z13: {
    assess: 'Review PPP contract terms, assess legal options, and survey debris and health hazard extent',
    plan: 'Create PPP resolution strategy with legal exit pathway and re-tender documentation',
    design: 'Design public recreational facility plan for post-PPP land reclamation',
    build: 'Clear construction debris, remediate mosquito breeding grounds, and prepare site for public use',
    maintain: 'Establish transparent PPP monitoring committee with quarterly public reporting',
  },
  z14: {
    assess: 'Inspect all 3 pump motors, test water pressure at all zone outlets, and audit electrical safety',
    plan: 'Create pump house restoration plan with motor replacement schedule and TWAD Board coordination',
    design: 'Design pump upgrade with variable frequency drives and rainwater harvesting integration',
    build: 'Replace 2 failed motors, repair valves for Z4/Z8/Z11 supply, and install rainwater recharge well',
    maintain: 'Establish daily pump operation log and monthly pressure testing at all 14 zone outlets',
  },
};

// ─── Specificity Score Calculator ──────────────────────────────

const TECHNICAL_TERMS = new Set([
  'rcc', 'pvc', 'bod', 'tnpcb', 'pwd', 'twad', 'tneb', 'gis', 'hic',
  'sqm', 'mg/l', 'mpn', 'cpwd', 'rpd', 'rti', 'spv', 'ppp', 'shg',
  'ngr', 'cctv', 'led', 'uv', 'ph', 'ngo', 'rs',
]);

export function calculateSpecificityScore(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const words = text.split(/\s+/);

  // Count numbers (Rs 4.2, 2.1m, 200kg, etc.)
  const numberCount = (text.match(/\d+[\d.,]*/g) || []).length;

  // Count proper nouns (capitalized words not at sentence start)
  let properNounCount = 0;
  for (let i = 1; i < words.length; i++) {
    if (/^[A-Z][a-z]/.test(words[i]) && !words[i - 1].endsWith('.')) {
      properNounCount++;
    }
  }

  // Count technical terms
  let techCount = 0;
  for (const term of TECHNICAL_TERMS) {
    if (lower.includes(term)) techCount++;
  }

  return Math.min(numberCount, 4) + Math.min(properNounCount, 3) + Math.min(techCount, 3);
}
