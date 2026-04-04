/**
 * challengeCardData.ts — Challenge card data for all 14 zones.
 * Each card provides the narrative context for investigation and planning phases.
 */

export interface ChallengeCardInfo {
  id: string;
  zoneId: string;
  zoneName: string;
  title: string;
  difficulty: number;
  challengeType: 'infrastructure' | 'ecological' | 'institutional' | 'social';
  story: string;
  source: string;
  challengeQuestion: string;
}

const CHALLENGE_CARD_DATA: ChallengeCardInfo[] = [
  { id: 'z1_challenge', zoneId: 'z1', zoneName: 'Main Entrance', title: 'Main Entrance Encroachment Crisis', difficulty: 4, challengeType: 'social',
    story: 'The main entrance \u2014 designed as a welcoming gateway with accessible pathways \u2014 has been completely taken over by 14 unauthorized vendors. Pushcarts block the 3-metre entrance path, forcing wheelchair users and elderly visitors to enter through the service gate 150 metres away. The vendors have been there for 8+ years and claim verbal permission from a previous Ward councillor. Two eviction attempts failed after political intervention. The vendors earn Rs 500-2000 daily and have no alternative location. Fire safety access is completely blocked. A Corporation survey found that 34% of potential visitors turn away at the entrance due to crowding.',
    source: 'Source: Corporation anti-encroachment wing survey 2023 + fire department inspection report',
    challengeQuestion: 'Can you restore accessible entry while protecting vendor livelihoods \u2014 without simply displacing the problem?' },
  { id: 'z2_challenge', zoneId: 'z2', zoneName: 'Fountain Plaza', title: 'Fountain Plaza SPV Dispute', difficulty: 3, challengeType: 'institutional',
    story: 'The central fountain \u2014 the park\u2019s visual centrepiece \u2014 has been dry for 14 months. The pump motor burned out in January 2023. The fountain was installed by an SPV contractor under a 5-year maintenance agreement. The SPV claims the motor failure was due to Corporation negligence (irregular power supply). The Corporation claims the SPV used substandard equipment. Neither party will pay for the Rs 1.8 lakh replacement. Meanwhile, the plaza that once drew 200 evening visitors for the light-and-water show sits empty.',
    source: 'Source: Corporation-SPV correspondence file + vendor relocation applications',
    challengeQuestion: 'Can you resolve the institutional deadlock and restore the fountain plaza as the park\u2019s gathering heart?' },
  { id: 'z3_challenge', zoneId: 'z3', zoneName: 'Boating Pond', title: 'Boating Pond Algae Crisis', difficulty: 3, challengeType: 'ecological',
    story: 'The boating pond that 800 families visited daily now sits empty. The 450mm RCC drainage pipe connecting to Teppakulam has been blocked since 2019 when construction debris entered the system. Stagnant water has dropped dissolved oxygen to 2.1 mg/L \u2014 below the 4.0 threshold for aquatic life. Algae covers 60% of the surface. The Rs 3.5 lakh allocated for clearing was redirected to Alagar Kovil Road median beautification. Daily visitors dropped from 800 to 350.',
    source: 'Source: TNPCB water quality report Q2 2023 + Ward 42 councillor petition register',
    challengeQuestion: 'Can you restore the boating pond so that families return, the water supports life, and the community has a reason to gather here again?' },
  { id: 'z4_challenge', zoneId: 'z4', zoneName: 'Herbal Garden', title: 'Herbal Garden Water Crisis', difficulty: 2, challengeType: 'ecological',
    story: 'The herbal garden \u2014 once home to 45 medicinal plant species maintained by 12 retired teacher volunteers \u2014 is dying. The irrigation pipe connected to the Z3 junction broke in 2020 and was never repaired. Volunteers now carry water manually from the Z14 tanker point 200 metres away. 8 of 12 volunteers quit due to the physical burden. 23 of 45 plant species have died.',
    source: 'Source: Eco-Park volunteer coordinator personal log + Parks Division asset register',
    challengeQuestion: 'Can you restore the herbal garden\u2019s water supply and volunteer network so that all 45 species thrive again?' },
  { id: 'z5_challenge', zoneId: 'z5', zoneName: 'Walking Track', title: 'Walking Track Decay', difficulty: 2, challengeType: 'infrastructure',
    story: 'The 800-metre perimeter walking track \u2014 once the park\u2019s most popular feature with 400+ daily walkers \u2014 has become an obstacle course. 12 concrete slabs are cracked from tree root invasion. 8 of 14 solar lamp posts are dead, making evening walks unsafe. A 72-year-old regular fractured her hip last monsoon after tripping on a raised slab edge.',
    source: 'Source: Corporation Parks Division maintenance log, 2022-2023',
    challengeQuestion: 'Can you restore the walking track so that 400 daily walkers return safely, including elderly residents who currently risk the main road?' },
  { id: 'z6_challenge', zoneId: 'z6', zoneName: 'Playground', title: 'Playground Safety Emergency', difficulty: 3, challengeType: 'infrastructure',
    story: 'The children\u2019s playground has not been maintained since 2020. Three swing sets have rusted chains \u2014 one snapped last month while a 6-year-old was swinging. The rubber safety surface has degraded to exposed concrete in 4 of 7 fall zones. Parents have stopped bringing children. 14 injury reports were filed in 18 months, but the Corporation classified them as user negligence to avoid liability.',
    source: 'Source: Corporation legal department incident reports 2022-2023',
    challengeQuestion: 'Can you make this playground safe enough that parents trust it with their children again?' },
  { id: 'z7_challenge', zoneId: 'z7', zoneName: 'Open Lawn', title: 'Open Lawn User Conflict', difficulty: 2, challengeType: 'social',
    story: 'The 1.5-acre central lawn has become a flashpoint between morning yoga groups (80 regulars), weekend cricket players, and families seeking picnic space. Only 12 concrete benches serve the entire area. The Ward 42 councillor received 23 written complaints in Q4 2023 about noise and litter from unpermitted birthday party setups.',
    source: 'Source: Ward 42 councillor petition register, Q4 2023',
    challengeQuestion: 'Can you design a space-sharing system that lets yoga groups, cricket players, families, and elderly walkers coexist peacefully?' },
  { id: 'z8_challenge', zoneId: 'z8', zoneName: 'Nursery Area', title: 'Nursery Area Neglect', difficulty: 3, challengeType: 'ecological',
    story: 'The park nursery once propagated 5,000 saplings annually for distribution across Madurai\u2019s public spaces. Since the head gardener retired in 2021 and was not replaced, production has dropped to 800 saplings. The mist irrigation system is broken. Meanwhile, the Corporation spends Rs 4.2 lakh annually purchasing saplings from private nurseries at 3 times the cost.',
    source: 'Source: Corporation horticulture department annual report 2023-24',
    challengeQuestion: 'Can you restore the nursery to full production and save the Corporation Rs 4.2 lakh annually while training the next generation of gardeners?' },
  { id: 'z9_challenge', zoneId: 'z9', zoneName: 'Staff Quarters', title: 'Staff Quarters Underutilization', difficulty: 2, challengeType: 'institutional',
    story: 'The park staff quarters \u2014 4 rooms originally for round-the-clock security \u2014 house only 1 part-time watchman working 6pm-6am. 3 rooms are locked and deteriorating. Community groups have requested using the empty rooms as a reading room, tool library, and volunteer centre. The Corporation\u2019s asset policy requires formal proposals for change of use, but no department has initiated the process.',
    source: 'Source: Corporation asset register + community petition to Parks Commissioner',
    challengeQuestion: 'Can you activate these underused spaces for community benefit while securing the watchman\u2019s livelihood?' },
  { id: 'z10_challenge', zoneId: 'z10', zoneName: 'Peripheral Walk', title: 'Peripheral Walk Boundary Conflict', difficulty: 3, challengeType: 'social',
    story: 'The 1.2 km peripheral path along the park boundary has become contested space. Residential buildings have extended walls into the 3-metre park buffer, reducing the path to 1.5 metres in 6 locations. Evening joggers share the narrow space with stray dogs. 3 dog bite incidents were reported in 2023. The Corporation sent encroachment notices to 8 households but none responded.',
    source: 'Source: Corporation survey department boundary verification report 2023',
    challengeQuestion: 'Can you restore the full walking path width while resolving the boundary dispute and managing stray animals safely?' },
  { id: 'z11_challenge', zoneId: 'z11', zoneName: 'South Pond', title: 'South Pond Sewage Infiltration', difficulty: 3, challengeType: 'ecological',
    story: 'The smaller south pond \u2014 originally a rainwater retention basin \u2014 has been receiving untreated sewage from a cracked 600mm municipal sewer line since 2021. Coliform bacteria levels are 15 times the safe limit. The pond\u2019s groundwater recharge role means contaminated water seeps into the shallow aquifer serving 200 households. Two children were hospitalized with waterborne illness in monsoon 2023.',
    source: 'Source: TNPCB emergency inspection report + District Health department register',
    challengeQuestion: 'Can you stop the sewage infiltration, restore the pond\u2019s recharge function, and protect the health of 200 nearby households?' },
  { id: 'z12_challenge', zoneId: 'z12', zoneName: 'Compost Area', title: 'Compost Area Waste Mismanagement', difficulty: 2, challengeType: 'ecological',
    story: 'The designated composting area receives garden waste from all 14 zones but has not produced usable compost in 2 years. Unturned piles produce methane and foul odour reaching the walking track 50 metres away. The Corporation spends Rs 1.8 lakh annually on chemical fertilizer that compost would replace. A local organic farming NGO has offered to manage the operation in exchange for 30% of the output, but the proposal has sat unprocessed for 9 months.',
    source: 'Source: Parks Division expenditure statement + NGO formal proposal dated March 2023',
    challengeQuestion: 'Can you transform the waste problem into a resource \u2014 producing free compost while eliminating the odour?' },
  { id: 'z13_challenge', zoneId: 'z13', zoneName: 'PPP Zone', title: 'PPP Zone Legal Deadlock', difficulty: 4, challengeType: 'institutional',
    story: 'A 0.8-acre section was leased to a private developer under a Public-Private Partnership in 2018 for a commercial recreational facility. The developer paid Rs 40 lakh advance, constructed foundation walls, then abandoned the project in 2020 citing COVID losses. The PPP contract has no clear exit clause. The Corporation cannot reclaim land without returning the Rs 40 lakh \u2014 already spent. The debris has become a mosquito breeding ground with 2 dengue cases traced to this zone.',
    source: 'Source: RTI response documents + Corporation legal department file note',
    challengeQuestion: 'Can you resolve the legal deadlock, reclaim the land for public use, and address the health hazard?' },
  { id: 'z14_challenge', zoneId: 'z14', zoneName: 'Water Tank & Pump House', title: 'Water Infrastructure Failure', difficulty: 3, challengeType: 'infrastructure',
    story: 'The central water tank and pump house \u2014 built to supply irrigation to all 14 zones \u2014 operates at 30% capacity. 2 of 3 pump motors have failed. The surviving motor runs 4 hours daily instead of 12. Zones Z4, Z8, and Z11 receive no water due to valve failures. The tanker truck costs Rs 2,500 per trip \u2014 Rs 45,000 monthly. A 2022 electrical audit flagged 4 critical safety violations but repairs estimated at Rs 3.2 lakh were deferred.',
    source: 'Source: Corporation electrical safety audit 2022 + Parks Division monthly expenditure register',
    challengeQuestion: 'Can you restore the water infrastructure so that all 14 zones receive adequate irrigation and the Rs 45,000 monthly tanker cost is eliminated?' },
];

export default CHALLENGE_CARD_DATA;

export function getChallengeCardForZone(zoneId: string): ChallengeCardInfo | undefined {
  return CHALLENGE_CARD_DATA.find(c => c.zoneId === zoneId);
}
