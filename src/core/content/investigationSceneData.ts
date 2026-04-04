/**
 * investigationSceneData.ts -- Investigation Scene Data for 14 Zones
 *
 * DATA ONLY file. Each zone has 8 objects: 5 relevant clues + 3 irrelevant traps.
 * One clue per zone is marked as the root cause.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface InvestigationClue {
  id: string;
  zoneId: string;
  name: string;
  description: string;
  detailedInfo: string;
  category: 'infrastructure' | 'ecological' | 'institutional' | 'safety' | 'community' | 'planning';
  isRootCause: boolean;
  isRelevant: boolean;
  resourceBonus?: { type: string; amount: number };
}

export interface ZoneInvestigation {
  zoneId: string;
  zoneName: string;
  sceneDescription: string;
  objects: InvestigationClue[];
}

// ---------------------------------------------------------------------------
// Zone Investigation Data
// ---------------------------------------------------------------------------

const ZONE_INVESTIGATIONS: ZoneInvestigation[] = [
  // =========================================================================
  // Z1 — Main Entrance (social/encroachment)
  // =========================================================================
  {
    zoneId: 'z1',
    zoneName: 'Main Entrance',
    sceneDescription:
      'The park entrance is barely visible behind a wall of vendor pushcarts. The accessible pathway is completely blocked.',
    objects: [
      {
        id: 'z1_vendor_map',
        zoneId: 'z1',
        name: 'Vendor Occupation Survey',
        description: 'Corp survey showing 14 vendors blocking 3m path',
        detailedInfo:
          'A 2022 Madurai Corporation survey documents 14 registered and unregistered vendors occupying the entire 3-metre entrance pathway. The survey notes that pushcarts extend 2.4m into the designated pedestrian zone, leaving only 0.6m clearance — well below the 1.8m accessibility standard. Peak congestion occurs between 4:30 PM and 7:30 PM when evening snack vendors set up alongside permanent stalls.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z1_councillor_letter',
        zoneId: 'z1',
        name: 'Faded Permission Letter',
        description: '2016 letter granting temporary vendor permission',
        detailedInfo:
          'A faded letter dated 14-Mar-2016 from the Ward 42 Councillor grants "temporary permission for 6 months" to 8 vendors displaced from Periyar Bus Stand renovation. The letter was never revoked, and the original 8 vendors grew to 14 through informal subletting. This single administrative oversight created the permanent encroachment that now defines the entrance.',
        category: 'institutional',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z1_fire_report',
        zoneId: 'z1',
        name: 'Fire Safety Sticker',
        description: 'Fire dept failed inspection',
        detailedInfo:
          'A red "FAILED" sticker from the Madurai Fire & Rescue Services dated September 2023 documents that the entrance pathway does not meet emergency vehicle access requirements. The minimum 3.5m fire tender clearance is reduced to 0.6m by vendor encroachment. The report flags LPG cylinders stored by 3 food vendors as an additional fire hazard within 5m of the gate.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z1_visitor_data',
        zoneId: 'z1',
        name: 'Footfall Counter Display',
        description: 'Shows 34% visitor decline',
        detailedInfo:
          'An electronic footfall counter installed under a Smart City pilot records monthly visitor data. Entry counts dropped from 8,400 in January 2021 to 5,544 in January 2024 — a 34% decline. Weekend family visits dropped 52%, while solo morning walkers (who use the side gate) remained stable. Residents cite "too crowded and dirty at the main gate" in exit surveys.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z1_alt_market',
        zoneId: 'z1',
        name: 'Rolled Blueprint Behind Counter',
        description: 'Alt vendor market plan Rs 8L approved then shelved',
        detailedInfo:
          'A rolled-up blueprint from the Town Planning department shows a designated vendor market zone 40m south of the main gate with 16 covered stalls, drainage, and electricity. The Rs 8 lakh budget was approved in the 2020-21 annual plan but reallocated to COVID relief works. The plan includes a phased vendor relocation schedule that was never executed.',
        category: 'planning',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z1_trap1',
        zoneId: 'z1',
        name: 'Decorative Arch Photo',
        description: 'Old inauguration photo',
        detailedInfo:
          'A framed photograph shows the original decorative entrance arch during its 2014 inauguration by the District Collector. The arch features Tamil and English signage with ornamental kolam patterns. While nostalgic, this photo provides no actionable information about the current encroachment problem.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z1_trap2',
        zoneId: 'z1',
        name: 'Old Ticket Counter',
        description: 'Unused Rs 5 entry counter',
        detailedInfo:
          'A dusty ticket counter window with a faded "Entry: Rs 5" sign sits behind stacked vendor goods. The counter was abandoned in 2017 when the entry fee was removed following public complaints. It has no bearing on the vendor encroachment issue and is simply an artifact of an older revenue model.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z1_trap3',
        zoneId: 'z1',
        name: 'Garden Award Trophy',
        description: '2015 Best Garden award',
        detailedInfo:
          'A dusty trophy from the Tamil Nadu Horticulture Department reads "Best Maintained Urban Garden — Madurai District, 2015." While it indicates the park was once well-regarded, it offers no insight into the entrance blockage or its causes. The award predates the vendor encroachment problem.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z2 — Fountain Plaza (institutional/SPV dispute)
  // =========================================================================
  {
    zoneId: 'z2',
    zoneName: 'Fountain Plaza',
    sceneDescription:
      'The dry fountain basin is cracked. Empty tea stalls. Exposed wiring from pump house.',
    objects: [
      {
        id: 'z2_motor_report',
        zoneId: 'z2',
        name: 'Electrical Engineer Report',
        description: 'Motor burned from voltage fluctuations',
        detailedInfo:
          'A report by the TANGEDCO-approved electrical engineer dated July 2023 confirms both fountain pump motors burned out due to sustained voltage fluctuations between 160V and 280V. The Sellur sub-station feeding the park has documented 47 voltage events in 6 months. Replacement motors cost Rs 1.8L each but will fail again without a dedicated voltage stabilizer unit costing Rs 65K.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z2_spv_contract',
        zoneId: 'z2',
        name: 'SPV Contract Copy',
        description: 'Clause 7.3/8.1 showing shared responsibility',
        detailedInfo:
          'The Smart City SPV (Special Purpose Vehicle) contract for fountain installation contains Clause 7.3 assigning electrical infrastructure to Madurai Corporation, while Clause 8.1 assigns fountain equipment maintenance to the SPV. This split responsibility means neither party owns the voltage stabilizer problem. The SPV claims it is an electrical issue; the Corporation says it is fountain equipment.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z2_vendor_log',
        zoneId: 'z2',
        name: 'Vendor Relocation Notice',
        description: '6 vendors relocated',
        detailedInfo:
          'A Corporation notice dated April 2023 documents the relocation of 6 evening food vendors from the Fountain Plaza to the main entrance area. The vendors operated tea, bajji, and juice stalls that served fountain visitors. With the fountain non-functional, their customer base vanished, and they were moved without any plan for their return once the fountain is repaired.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z2_footfall',
        zoneId: 'z2',
        name: 'Evening Visitor Log',
        description: 'Watchman counts: 200→45 per evening',
        detailedInfo:
          'The night watchman Mr. Karuppan has maintained a handwritten evening headcount since 2020. His logs show Fountain Plaza visitors dropped from an average of 200 per evening (when the fountain and light show operated) to just 45 after the fountain failed. The plaza was the primary evening gathering point for families from Sellur and Teppakulam areas.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z2_warranty',
        zoneId: 'z2',
        name: 'Extended Warranty Certificate',
        description: 'Valid until 2025 but excludes power damage',
        detailedInfo:
          'The fountain equipment warranty certificate from M/s AquaJet Systems, Chennai, extends coverage until December 2025. However, Section 4.2 of the warranty terms explicitly excludes "damage caused by power supply irregularities, voltage fluctuations, or inadequate electrical infrastructure." This exclusion effectively voids the warranty for the exact failure mode that occurred.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z2_trap1',
        zoneId: 'z2',
        name: 'Fountain Design Blueprint',
        description: 'Original Italian design',
        detailedInfo:
          'An elaborate blueprint shows the original musical fountain design inspired by Italian water features, with 24 nozzle positions and RGB LED lighting arrays. While visually impressive, this design document provides no information about why the fountain failed or how to fix it. It is a relic of the initial Smart City proposal.',
        category: 'planning',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z2_trap2',
        zoneId: 'z2',
        name: 'Light Show Schedule Board',
        description: 'Discontinued show schedule',
        detailedInfo:
          'A laminated board shows the discontinued fountain light show schedule: 7:00 PM, 7:30 PM, and 8:00 PM shows on weekdays, with an additional 8:30 PM show on weekends. The schedule attracted large crowds during its operational months but has been irrelevant since the fountain stopped working in mid-2023.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z2_trap3',
        zoneId: 'z2',
        name: 'Inauguration Photo',
        description: 'CM inauguration 2018',
        detailedInfo:
          'A large framed photograph shows the Chief Minister inaugurating the musical fountain in March 2018, surrounded by local officials and media. The photo commemorates a political event and provides no diagnostic or actionable information about the current fountain failure.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z3 — Boating Pond (ecological/algae)
  // =========================================================================
  {
    zoneId: 'z3',
    zoneName: 'Boating Pond',
    sceneDescription:
      'Thick green algae covers the pond. Faint smell of stagnant water. Boating jetty padlocked.',
    objects: [
      {
        id: 'z3_drainage_pipe',
        zoneId: 'z3',
        name: 'Blocked Drainage Pipe',
        description: '450mm RCC blocked since 2019',
        detailedInfo:
          'A 450mm RCC drainage outlet pipe on the pond\'s eastern bank has been completely blocked with silt and debris since monsoon 2019. Without outflow, the pond became stagnant, triggering algae bloom within 3 months. The blockage also prevents fresh water circulation from the Z14 pump house supply line. Clearing requires a mechanized jetting unit costing Rs 18K for a single-day operation.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
        resourceBonus: { type: 'knowledge', amount: 1 },
      },
      {
        id: 'z3_water_quality',
        zoneId: 'z3',
        name: 'Water Sample Kit',
        description: 'DO 2.1, BOD 12.4, coliform present',
        detailedInfo:
          'A water testing kit left by a Thiagarajar College environmental studies team shows alarming results: Dissolved Oxygen at 2.1 mg/L (healthy ponds need 5+), Biochemical Oxygen Demand at 12.4 mg/L (indicating heavy organic pollution), and fecal coliform presence confirmed. The pond water is classified as Class E — unsuitable for any recreational contact under TNPCB standards.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
        resourceBonus: { type: 'knowledge', amount: 1 },
      },
      {
        id: 'z3_pwd_map',
        zoneId: 'z3',
        name: 'PWD Drainage Map',
        description: 'Shows 3 branch connections to Z2/Z6/Z11',
        detailedInfo:
          'A Public Works Department drainage map reveals that the Z3 Boating Pond outlet connects to three downstream branch lines serving the Fountain Plaza (Z2), Playground (Z6), and South Pond (Z11). When Z3 drainage was blocked, stormwater backed up into these zones. The map shows the interconnected nature of the park\'s water infrastructure — fixing Z3 drainage partially alleviates problems in three other zones.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
        resourceBonus: { type: 'material', amount: 1 },
      },
      {
        id: 'z3_budget_doc',
        zoneId: 'z3',
        name: 'Budget Reallocation Order',
        description: 'Rs 3.5L redirected to beautification',
        detailedInfo:
          'A Corporation budget order from 2021-22 shows Rs 3.5 lakh originally earmarked for "Boating Pond desilting and drainage restoration" was reallocated to "Main Road median beautification — Goripalayam Junction." The reallocation was approved by the Zone Chairman without consulting the park supervisor. This diversion of maintenance funds directly prolonged the pond\'s degradation.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z3_cascade_junction',
        zoneId: 'z3',
        name: 'Underground Pipe Junction',
        description: 'Junction connecting Z3/Z4/Z6',
        detailedInfo:
          'A concealed underground pipe junction beneath the boating pond\'s western bank connects water lines from Z3 (Boating Pond), Z4 (Herbal Garden), and Z6 (Playground). The junction box cover is rusted shut but markings indicate a 3-way valve system that could control water flow distribution. Repairing this junction would restore irrigation supply to the Herbal Garden and drainage flow to the Playground area.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
        resourceBonus: { type: 'influence', amount: 1 },
      },
      {
        id: 'z3_trap1',
        zoneId: 'z3',
        name: 'Boating Rate Card',
        description: 'Old pricing info',
        detailedInfo:
          'A weathered signboard lists boating rates: Rs 30 for a 2-seater pedal boat, Rs 50 for a 4-seater, and Rs 100 for a motorized ride (30 minutes each). The rate card is from 2018 when the boating service was last operational. It provides no useful information about the pond\'s ecological collapse.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z3_trap2',
        zoneId: 'z3',
        name: 'Bird Watching Checklist',
        description: '24 species list',
        detailedInfo:
          'A laminated bird watching checklist prepared by the Madurai Nature Society lists 24 species historically spotted around the pond, including spot-billed ducks, egrets, and kingfishers. The checklist is a recreational guide and does not address the drainage, water quality, or algae issues affecting the pond.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z3_trap3',
        zoneId: 'z3',
        name: 'Pond Depth Marker',
        description: '1.2m vs 1.8m design depth',
        detailedInfo:
          'A depth marker post near the jetty shows the current water level at 1.2m against a design depth marking of 1.8m. While it confirms the pond has lost 33% of its volume to silt accumulation, this is a symptom rather than a cause. The marker itself provides no actionable path toward solving the core drainage problem.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z4 — Herbal Garden (ecological/water)
  // =========================================================================
  {
    zoneId: 'z4',
    zoneName: 'Herbal Garden',
    sceneDescription:
      'Wilted plants. Elderly woman carries bucket from distant tanker point.',
    objects: [
      {
        id: 'z4_pipe_break',
        zoneId: 'z4',
        name: 'Broken Irrigation Junction',
        description: 'Rs 12K repair neglected 4 years',
        detailedInfo:
          'The main irrigation junction serving the Herbal Garden has a cracked PVC coupling that has been leaking since 2020. The repair requires a Rs 12,000 replacement part and half a day of plumber work, but four annual maintenance requests were filed and none actioned. The broken junction means the garden receives zero piped water, forcing the elderly volunteer Mrs. Lakshmi to carry 15-litre buckets from a tanker point 200 metres away.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
        resourceBonus: { type: 'material', amount: 2 },
      },
      {
        id: 'z4_volunteer_log',
        zoneId: 'z4',
        name: 'Volunteer Attendance Register',
        description: 'Dropped from 12 to 1-2 daily',
        detailedInfo:
          'A handwritten volunteer register maintained since 2019 shows daily attendance dropping from 12 regular volunteers (mostly retired teachers and homemakers from Teppakulam) to just 1-2 by late 2023. Volunteers cite "no water, plants dying anyway" and "too much physical effort carrying water" as reasons. Mrs. Lakshmi (age 67) and occasionally Mr. Pandian (age 71) are the only remaining regulars.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z4_species_list',
        zoneId: 'z4',
        name: 'Plant Species Inventory Board',
        description: '23 of 45 species dead',
        detailedInfo:
          'A botanical inventory board lists 45 original medicinal plant species including tulsi, ashwagandha, neem, and senna. Red markers indicate 23 species confirmed dead, with another 8 classified as "critical — may not survive next summer." The surviving species are drought-resistant varieties like aloe vera and curry leaf. The garden has lost 51% of its biodiversity in 4 years of water deprivation.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z4_tanker_cost',
        zoneId: 'z4',
        name: 'Water Carrying Route Map',
        description: '200m each way, pipe repair cost-benefit 20:1',
        detailedInfo:
          'A hand-drawn map shows the 200-metre route from the nearest tanker point to the Herbal Garden, requiring volunteers to make 8-10 round trips daily carrying 15L buckets. At Rs 5 per litre of tanker water, the garden consumes roughly Rs 600/day in water costs alone. Repairing the Rs 12,000 pipe junction would eliminate Rs 2.4 lakh in annual tanker and labor costs — a 20:1 cost-benefit ratio.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z4_university',
        zoneId: 'z4',
        name: 'University Partnership Letter',
        description: 'Ag University offers 4 interns, needs MOU',
        detailedInfo:
          'A letter from the Tamil Nadu Agricultural University (TNAU) Madurai campus offers to deploy 4 B.Sc. Horticulture interns for 6-month rotations to restore and maintain the Herbal Garden. The university requires only a formal MOU with Madurai Corporation and basic water supply assurance. The letter has been pending with the Commissioner\'s office since February 2023 without response.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z4_trap1',
        zoneId: 'z4',
        name: 'Herb Recipe Book',
        description: 'Traditional recipes booklet',
        detailedInfo:
          'A small booklet titled "Grandmother\'s Herbal Remedies from Madurai" lists 30 traditional preparations using plants from the garden — including tulsi kashayam, neem paste, and turmeric milk. While culturally interesting, it provides no information about the water supply failure or garden management breakdown.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z4_trap2',
        zoneId: 'z4',
        name: 'Empty Soil Test Kit',
        description: 'Used 3 years ago',
        detailedInfo:
          'An empty soil testing kit from the TNAU Soil Testing Laboratory shows it was last used in 2021. The results card inside indicates the soil was healthy — adequate nitrogen, phosphorus, and organic matter. The soil is not the problem; the water supply is. This kit is a distraction from the real infrastructure failure.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z4_trap3',
        zoneId: 'z4',
        name: 'Bird Identification Chart',
        description: '18 species chart',
        detailedInfo:
          'A colorful chart mounted near the garden entrance identifies 18 bird species commonly seen in the area, including sunbirds, bulbuls, and tailorbirds. The chart was placed by the Madurai Birders Club as part of a nature awareness initiative. It is unrelated to the irrigation and maintenance failures affecting the garden.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z5 — Walking Track (infrastructure/decay)
  // =========================================================================
  {
    zoneId: 'z5',
    zoneName: 'Walking Track',
    sceneDescription:
      'Cracked concrete path. Tree roots push slabs upward. Dark lamp posts.',
    objects: [
      {
        id: 'z5_slab_map',
        zoneId: 'z5',
        name: 'Damaged Slab Location Map',
        description: '12 cracked slabs mapped with root species',
        detailedInfo:
          'A hand-annotated map marks 12 cracked or displaced concrete slabs along the 800m walking track. Each damage point is labeled with the tree species causing root uplift — mostly rain trees (Samanea saman) and neem (Azadirachta indica) planted too close to the path edge. The worst section near the banyan grove has a 4cm vertical displacement creating a serious trip hazard for elderly morning walkers.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z5_root_barrier',
        zoneId: 'z5',
        name: 'Root Barrier Budget Document',
        description: 'Rs 54K budget approved then reallocated',
        detailedInfo:
          'A Corporation budget document from 2021-22 shows Rs 54,000 approved for "HDPE root barrier installation — Walking Track, 12 locations." The work order was issued to M/s Greenscape Solutions, Madurai, but the funds were reallocated mid-year to "emergency road pothole filling — Ward 42." Without root barriers, the tree roots continued to destroy slabs, making the track progressively more dangerous.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z5_light_audit',
        zoneId: 'z5',
        name: 'Solar Light Failure Report',
        description: '8 of 14 failed, breakdowns listed',
        detailedInfo:
          'An audit by the park supervisor lists 14 solar-powered LED lamp posts along the walking track. Eight have failed: 3 have dead batteries (average lifespan exceeded), 2 have damaged solar panels (bird droppings and dust), 2 have broken LED modules, and 1 was vandalized. The dark sections between lamp posts 5-9 are completely unlit after 6:30 PM, effectively closing the track for evening use.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z5_injury_report',
        zoneId: 'z5',
        name: 'Accident Register',
        description: '72-year-old hip fracture Oct 2023',
        detailedInfo:
          'The park accident register records that Mrs. Meenakshi Ammal, age 72, sustained a hip fracture on 14-Oct-2023 after tripping on a displaced slab near the banyan grove section. She was taken to Meenakshi Mission Hospital. Her family filed a complaint with the Corporation, which was classified as "user negligence" despite the documented hazard. Two other minor fall injuries were recorded in the same quarter.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z5_walker_survey',
        zoneId: 'z5',
        name: 'Walker Usage Count Board',
        description: '400→250 morning, 200→80 evening',
        detailedInfo:
          'A usage tracking board maintained by the morning walkers\' association shows daily counts declining from 400 to 250 for the 5-7 AM slot, and from 200 to just 80 for the 5-7 PM evening slot. Evening decline is steepest due to failed lighting. Senior citizens from Anna Nagar and KK Nagar colonies who formed the core walking group have shifted to the Vaigai riverfront path.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z5_trap1',
        zoneId: 'z5',
        name: 'Outdoor Gym Equipment Manual',
        description: 'Gym instruction booklet',
        detailedInfo:
          'An instruction manual for the outdoor gym equipment installed near the track entrance covers proper usage of the chest press, leg press, and elliptical machines. The manual is from the original 2017 installation. It has no connection to the walking track\'s structural decay or lighting failure issues.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z5_trap2',
        zoneId: 'z5',
        name: 'Tree Census Report',
        description: '847 trees inventory',
        detailedInfo:
          'A comprehensive tree census conducted by the Forestry Department in 2020 catalogues 847 trees across the entire park, with species, girth, and health ratings. While thorough, this park-wide inventory does not address the specific root barrier problem affecting the walking track or provide actionable maintenance data for the track infrastructure.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z5_trap3',
        zoneId: 'z5',
        name: 'Marathon Route Proposal',
        description: 'Running club 5K proposal',
        detailedInfo:
          'A proposal from the Madurai Runners Club suggests using the park walking track as part of a 5K route for a weekend fun run event. The proposal includes route maps, water station placements, and a Rs 200 registration fee structure. It is aspirational and unrelated to the current infrastructure decay of the track.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z6 — Playground (infrastructure/safety)
  // =========================================================================
  {
    zoneId: 'z6',
    zoneName: 'Playground',
    sceneDescription:
      'Rusted swings creak. Slide glints in sun. Rubber peeled away revealing concrete. No children.',
    objects: [
      {
        id: 'z6_safety_audit',
        zoneId: 'z6',
        name: 'Equipment Safety Rating Card',
        description: 'All equipment rated CRITICAL/HAZARDOUS',
        detailedInfo:
          'A safety audit conducted by a BIS-certified inspector rates all 7 playground equipment items. The swings are rated CRITICAL (chain corrosion at 60%), the slide HAZARDOUS (metal surface reaches 65°C in summer, handrails loose), the see-saw CRITICAL (pivot bolt sheared), and the climbing frame HAZARDOUS (3 rungs missing). No equipment meets IS 16396:2016 safety standards for public playground equipment.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z6_surface_test',
        zoneId: 'z6',
        name: 'Impact Surface Test Results',
        description: '4 of 7 zones FAIL, HIC 2400',
        detailedInfo:
          'Impact attenuation testing of the playground surface reveals 4 of 7 fall zones FAIL with Head Injury Criterion (HIC) readings up to 2400 — far exceeding the 1000 maximum allowed under safety standards. The original EPDM rubber surfacing has degraded to bare concrete in high-traffic areas. A child falling from the swing at full arc onto exposed concrete faces serious head injury risk. This surface failure is the most immediately dangerous condition in the entire park.',
        category: 'safety',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z6_injury_log',
        zoneId: 'z6',
        name: 'Child Injury Incident File',
        description: '14 injuries, Corp classified as user negligence',
        detailedInfo:
          'An incident file documents 14 child injuries between January 2022 and December 2023: 8 abrasions from exposed concrete, 3 falls from equipment with missing components, 2 burns from hot metal surfaces, and 1 laceration from a rusted edge. All incidents were classified by the Corporation as "user negligence / parental supervision failure." No corrective action was taken for any incident.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z6_shade_report',
        zoneId: 'z6',
        name: 'Shade Structure Collapse Report',
        description: 'Insurance rejected, slide reaches 65C',
        detailedInfo:
          'The playground shade structure collapsed during Cyclone Mandous in December 2022. An insurance claim of Rs 2.1L was rejected because the policy excluded "weather events above wind speed 80 kmph." Without shade, the metal slide surface temperature reaches 65°C during April-May afternoons — sufficient to cause contact burns on bare skin. Children cannot safely use equipment between 10 AM and 4 PM for 6 months of the year.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z6_parent_survey',
        zoneId: 'z6',
        name: 'Parent Feedback Board',
        description: '85% won\'t return until ALL equipment replaced',
        detailedInfo:
          'A feedback board with 60 response cards from parents shows 85% stating they "will not bring children back until ALL equipment is replaced, not just repaired." Parents specifically cite exposed concrete surfaces, rusted metal edges, and the lack of shade as non-negotiable concerns. Several cards mention shifting to private play areas at Brookefields Mall and Fun City despite the Rs 200+ entry fees.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z6_trap1',
        zoneId: 'z6',
        name: 'Playground Design Magazine',
        description: 'International magazine',
        detailedInfo:
          'A copy of "Playground International" magazine features modern playground designs from Copenhagen and Singapore with natural materials and inclusive access features. While inspirational, it has no relevance to the immediate safety hazards or maintenance failures at this playground. It appears to have been left behind by a visiting landscape architect.',
        category: 'planning',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z6_trap2',
        zoneId: 'z6',
        name: 'Birthday Party Booking Log',
        description: 'Revenue history',
        detailedInfo:
          'A booking register shows the playground area was rented for birthday parties at Rs 500/hour, generating Rs 18,000 in revenue during 2021. Bookings dropped to zero by mid-2022 as equipment degraded. While it shows revenue loss, it does not provide diagnostic information about the safety failures or their causes.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z6_trap3',
        zoneId: 'z6',
        name: 'Sand Pit Measurement Record',
        description: 'Sand pit is functional',
        detailedInfo:
          'A measurement record confirms the sand pit area has 15cm depth of clean river sand, last replenished in August 2023. The sand pit is one of the few functional play areas remaining. While it demonstrates that some maintenance does occur, it provides no insight into the equipment and surface safety failures that are the core problem.',
        category: 'safety',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z7 — Open Lawn (social/conflict)
  // =========================================================================
  {
    zoneId: 'z7',
    zoneName: 'Open Lawn',
    sceneDescription:
      'Vast green lawn with worn patches. Yoga mats at one end. Cricket stumps at another. Torn birthday banner.',
    objects: [
      {
        id: 'z7_usage_map',
        zoneId: 'z7',
        name: 'Time-Based Usage Chart',
        description: 'Conflicts at transition times 7am and 6pm',
        detailedInfo:
          'A time-based usage chart compiled from 30 days of observation shows the lawn is used by morning yoga groups (5:30-7:00 AM), cricket players (7:00-9:00 AM and 4:00-6:00 PM), evening walkers (6:00-7:30 PM), and weekend event bookings. Conflicts peak at 7:00 AM (yoga vs cricket) and 6:00 PM (cricket vs walkers). The lack of designated zones or time-slot management creates daily confrontations between user groups.',
        category: 'community',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z7_complaint_log',
        zoneId: 'z7',
        name: 'Ward Councillor Complaint File',
        description: '23 complaints Q4 2023',
        detailedInfo:
          'The Ward 42 Councillor\'s office received 23 formal complaints about the Open Lawn in Q4 2023 alone. Complaints include: cricket balls hitting yoga practitioners (7 complaints), birthday party sound systems disturbing walkers (5), unauthorized commercial photography shoots blocking access (4), and general overcrowding disputes (7). The Councillor forwarded all complaints to the Corporation without resolution.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z7_bollard_quote',
        zoneId: 'z7',
        name: 'Bollard Installation Estimate',
        description: 'Rs 1.6L zoning system approved but unfunded',
        detailedInfo:
          'A detailed estimate from M/s Urban Solutions, Madurai, proposes a bollard-and-rope zoning system dividing the 1.5-acre lawn into 4 designated areas: yoga/meditation (quiet zone), active sports, children\'s play, and open events. The Rs 1.6 lakh estimate includes 40 removable bollards, ground anchors, and signage. It was approved by the Parks Committee in March 2023 but remains unfunded in the current budget.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z7_bench_count',
        zoneId: 'z7',
        name: 'Seating Audit Report',
        description: '12 benches for 1.5 acres, needs 60+',
        detailedInfo:
          'A seating audit counts only 12 functional benches around the 1.5-acre lawn perimeter, with 5 more broken or missing slats. National urban park guidelines recommend a minimum of 40 benches per acre for active-use areas, meaning the lawn needs at least 60 benches. The severe seating shortage forces visitors onto the grass, contributing to worn patches and territorial disputes between groups.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z7_permit_draft',
        zoneId: 'z7',
        name: 'Event Permit Draft System',
        description: 'Rs 500-1000 permit system never implemented',
        detailedInfo:
          'A draft notification proposes a permit system for lawn events: Rs 500 for birthday parties (2-hour slot), Rs 1,000 for commercial photography, and free slots for registered community groups (yoga, walking clubs). The system would generate an estimated Rs 3.6L annual revenue while managing usage conflicts. The draft was prepared in 2022 but never presented to the Council for approval.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z7_trap1',
        zoneId: 'z7',
        name: 'Grass Seed Catalogue',
        description: 'Grass seed catalogue',
        detailedInfo:
          'A glossy catalogue from a Coimbatore-based turf supplier lists 8 varieties of lawn grass suitable for Tamil Nadu climate, including Bermuda, Zoysia, and Buffalo grass. While relevant to lawn maintenance, it does not address the social conflict and space management issues that are the primary problem with this zone.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z7_trap2',
        zoneId: 'z7',
        name: 'CCTV Camera Specification',
        description: 'CCTV camera spec sheet',
        detailedInfo:
          'A specification sheet for a 4-camera CCTV system with night vision and 30-day recording storage. The system was proposed for general park security but was never installed. While surveillance might deter some antisocial behavior, it does not solve the fundamental space allocation and scheduling conflict driving the lawn disputes.',
        category: 'safety',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z7_trap3',
        zoneId: 'z7',
        name: 'Sprinkler Timer Settings',
        description: 'Sprinkler timer card',
        detailedInfo:
          'A laminated card showing the sprinkler system timer settings: Zone A 5:00 AM (15 min), Zone B 5:15 AM (15 min), Zone C 5:30 AM (15 min). The sprinkler system is operational and maintains the lawn\'s green condition. It is unrelated to the user conflict and space management problems that plague this zone.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z8 — Nursery Area (ecological/neglect)
  // =========================================================================
  {
    zoneId: 'z8',
    zoneName: 'Nursery Area',
    sceneDescription:
      'Empty plant trays under torn shade. Broken mist nozzle. One corner has healthy plants.',
    objects: [
      {
        id: 'z8_production_data',
        zoneId: 'z8',
        name: 'Annual Production Records',
        description: 'Tracking gardener retirement: 5200→800 saplings',
        detailedInfo:
          'Annual nursery production records show a steep decline: 5,200 saplings in 2019, 3,800 in 2020, 2,100 in 2021, 1,400 in 2022, and just 800 in 2023. The decline tracks directly with the retirement of experienced gardeners — Mr. Murugan (retired 2020, 30 years experience), Mrs. Kanchana (retired 2021, 22 years), and Mr. Selvam (retired 2022, 28 years). No replacements were hired due to a Corporation-wide hiring freeze.',
        category: 'institutional',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z8_irrigation_report',
        zoneId: 'z8',
        name: 'Mist System Diagnosis',
        description: '18/24 nozzles clogged, Rs 28K repair',
        detailedInfo:
          'A diagnosis report on the nursery mist irrigation system shows 18 of 24 spray nozzles are clogged with calcium deposits from hard Vaigai river water. The system has not been serviced since the last experienced gardener retired. Complete descaling and nozzle replacement is estimated at Rs 28,000. The 6 functional nozzles serve only the northeast corner — explaining why that section still has healthy plants.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z8_shade_damage',
        zoneId: 'z8',
        name: 'Shade Net Inspection Tags',
        description: '3 sections torn, Rs 15K replacement',
        detailedInfo:
          'Inspection tags on the nursery shade structure indicate 3 of 8 shade net sections are torn, allowing direct sunlight onto seedling trays. The tears occurred during monsoon winds in November 2022. Replacement with UV-stabilized 50% shade net material costs Rs 15,000 including labor. The exposed sections show 90% seedling mortality compared to 15% under intact shade — demonstrating the direct impact.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z8_cost_comparison',
        zoneId: 'z8',
        name: 'Sapling Purchase vs Production Cost Sheet',
        description: 'Rs 8 vs Rs 25 per sapling',
        detailedInfo:
          'A cost comparison sheet prepared by the park supervisor shows in-house nursery production cost at Rs 8 per sapling (including soil, seed, water, and labor) versus Rs 25 per sapling purchased from external nurseries in Theni and Dindigul. With the park requiring approximately 3,000 saplings annually for replacements and beautification, the nursery\'s collapse costs an additional Rs 51,000 per year in procurement.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z8_gardener_offer',
        zoneId: 'z8',
        name: 'Retired Gardener Letter',
        description: 'Mr. Selvam offers training, needs Rs 100/day transport',
        detailedInfo:
          'A handwritten letter from Mr. Selvam (retired head gardener, 28 years experience) offers to return as a volunteer trainer 3 days per week to train new staff or community volunteers in nursery management, propagation techniques, and mist system maintenance. He requests only Rs 100/day for bus fare from his home in Thirunagar. The letter has been with the park supervisor since April 2023 with no response from the Corporation.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z8_trap1',
        zoneId: 'z8',
        name: 'Rare Orchid Certificate',
        description: 'Rare orchid certificate',
        detailedInfo:
          'A certificate from the Orchid Society of India recognizes 3 rare Dendrobium varieties cultivated in the nursery during its peak years. The orchids are no longer alive. While it highlights the nursery\'s former prestige, the certificate provides no actionable information about restoring current operations.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z8_trap2',
        zoneId: 'z8',
        name: 'Fertilizer Stock List',
        description: 'Fertilizer inventory',
        detailedInfo:
          'A stock register lists fertilizer inventory: 40kg DAP, 25kg urea, 15kg potash, and 50kg vermicompost. The supplies are adequate for current needs. Fertilizer availability is not a constraint — the nursery\'s decline is driven by the loss of skilled gardeners and irrigation system failure, not input shortage.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z8_trap3',
        zoneId: 'z8',
        name: 'Open Day Photo Album',
        description: 'Nursery open day photos',
        detailedInfo:
          'A photo album from the 2019 "Nursery Open Day" shows schoolchildren learning about plant propagation, families buying saplings at Rs 10 each, and a vibrant nursery full of healthy plants. The event generated goodwill and Rs 4,200 in sapling sales. It is a nostalgic record but offers no pathway to solving the current operational collapse.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z9 — Staff Quarters (institutional/underutilization)
  // =========================================================================
  {
    zoneId: 'z9',
    zoneName: 'Staff Quarters',
    sceneDescription:
      'Small building, one lit window, three dark. Bicycle. Padlocks. TV glow from occupied room.',
    objects: [
      {
        id: 'z9_asset_register',
        zoneId: 'z9',
        name: 'Building Asset Register',
        description: '4 rooms functional, 3 locked since 2019',
        detailedInfo:
          'The Corporation\'s building asset register lists 4 rooms in the staff quarters, all structurally sound with functional electrical and plumbing connections. Room 1 is occupied by the night watchman Mr. Rajan. Rooms 2, 3, and 4 have been padlocked since the last gardener staff were transferred in 2019. The rooms total 45 sq.m. of usable space sitting idle in a park that desperately needs community facilities.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z9_policy_doc',
        zoneId: 'z9',
        name: 'Corporation Asset Use Policy',
        description: 'Reg 14.3 requires 8-month process',
        detailedInfo:
          'Corporation Regulation 14.3 governs the "Repurposing of Designated Staff Accommodation for Alternative Public Use." The process requires: (1) vacancy declaration by HR (2 months), (2) structural assessment by Engineering (1 month), (3) alternative use proposal from Parks Department (1 month), (4) public consultation (1 month), (5) Council approval (3 months). This 8-month bureaucratic process has prevented any repurposing despite 4+ years of vacancy.',
        category: 'institutional',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z9_community_petition',
        zoneId: 'z9',
        name: 'Community Petition with Signatures',
        description: '47 signatures for reading room etc',
        detailedInfo:
          'A petition with 47 signatures from residents of Sellur, Teppakulam, and KK Nagar requests the Corporation to convert the vacant staff quarters rooms into community facilities. Suggested uses include: a reading room for students (18 signatures), a senior citizen rest area (12), a first-aid station (9), and a park information center (8). The petition was submitted to the Ward Councillor in July 2023.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z9_watchman_record',
        zoneId: 'z9',
        name: 'Service Record File',
        description: 'Mr. Rajan fears job loss',
        detailedInfo:
          'Mr. Rajan\'s service record shows 18 years as park watchman, currently drawing Rs 15,000/month. A personal note clipped to the file reveals his anxiety that "if they open the rooms for public use, they might transfer me or say watchman is not needed." His cooperation is essential for any repurposing plan. He lives in Room 1 with his wife and could serve as facility caretaker if reassured about his role.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z9_ngo_interest',
        zoneId: 'z9',
        name: 'NGO Expression of Interest',
        description: 'Padasalai Foundation offers reading room',
        detailedInfo:
          'The Padasalai Foundation, a Madurai-based education NGO, has submitted a formal Expression of Interest to operate a free community reading room in one of the vacant staff quarters rooms. They offer to provide 500 books in Tamil and English, one part-time librarian (Rs 8,000/month from their funds), and furniture. They require only a 2-year MOU and the Corporation\'s approval to use the space.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z9_trap1',
        zoneId: 'z9',
        name: 'Old Guard Duty Roster',
        description: 'Historical duty roster',
        detailedInfo:
          'A yellowed duty roster from 2017 lists 4 watchmen covering 3 shifts across the park. Only Mr. Rajan remains; the other 3 positions were abolished in staffing cuts. While it shows how security coverage declined, it does not address the underutilization of the building space itself.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z9_trap2',
        zoneId: 'z9',
        name: 'Building Floor Plan',
        description: 'Architectural floor plan',
        detailedInfo:
          'An original architectural floor plan of the staff quarters shows room dimensions, doorways, and utility connections. While useful for renovation planning, the floor plan does not reveal why the rooms remain unused or how to navigate the bureaucratic obstacles preventing their repurposing.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z9_trap3',
        zoneId: 'z9',
        name: 'Monthly Electricity Bill',
        description: 'Electricity bill',
        detailedInfo:
          'The monthly TANGEDCO electricity bill for the staff quarters shows Rs 420/month consumption — only Mr. Rajan\'s room drawing power. The locked rooms show zero consumption. While it confirms the rooms are unused, this is already obvious from the padlocks. The bill provides no insight into the policy barriers or community demand.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z10 — Peripheral Walk (social/boundary)
  // =========================================================================
  {
    zoneId: 'z10',
    zoneName: 'Peripheral Walk',
    sceneDescription:
      'Narrow path between overgrown bushes and extended residential walls. Dog sleeping on path.',
    objects: [
      {
        id: 'z10_encroachment_map',
        zoneId: 'z10',
        name: 'Boundary Survey Map',
        description: '8 properties encroach 0.5-1.5m',
        detailedInfo:
          'A licensed surveyor\'s map from 2022 documents 8 residential properties along the park\'s southern and western boundaries that have extended compound walls 0.5 to 1.5 metres into park land. The encroachments reduce the peripheral walking path from its designed 3m width to as little as 0.8m in the worst section near Plot No. 47, Sellur 3rd Street. Total encroached area is approximately 180 sq.m. of public park land.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z10_dog_incidents',
        zoneId: 'z10',
        name: 'Animal Bite Incident Reports',
        description: '3 bites in 2023',
        detailedInfo:
          'Three dog bite incidents were reported along the peripheral walk in 2023: a morning jogger bitten in March, an elderly walker in June, and a child in September. The narrow, overgrown path creates blind corners where stray dogs rest undisturbed. All three victims required anti-rabies treatment at Government Rajaji Hospital. The Corporation\'s Animal Birth Control team has not covered this section.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z10_notices',
        zoneId: 'z10',
        name: 'Encroachment Notice Copies',
        description: '8 notices sent, zero responses',
        detailedInfo:
          'Carbon copies of 8 encroachment notices issued by the Corporation Revenue Department between 2020 and 2023 show a consistent pattern: notices sent by registered post, delivery confirmed, but zero responses received and zero follow-up actions taken. The notices cite Section 285 of the Tamil Nadu District Municipalities Act but include no penalty timeline or enforcement mechanism.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z10_resident_claim',
        zoneId: 'z10',
        name: 'Resident Counter-Petition',
        description: 'Pre-2015 property claims',
        detailedInfo:
          'A counter-petition signed by 5 of the 8 encroaching property owners claims their compound walls were built before 2015 and predate the current park boundary survey. They argue the 2022 survey used incorrect reference points and demand a joint survey with Revenue Department presence. Two residents have engaged advocate Mr. Chandrasekaran, who has filed stay petitions in the Madurai Bench of the High Court.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z10_vegetation_report',
        zoneId: 'z10',
        name: 'Overgrowth Assessment',
        description: 'Path drops to 0.8m effective width',
        detailedInfo:
          'A vegetation assessment notes that Prosopis juliflora (invasive mesquite) and Lantana camara have overgrown from both sides of the peripheral path, reducing effective walking width to 0.8m at 6 points. The overgrowth creates visual barriers that obscure sightlines, contributing to safety concerns. Clearing requires 2 days of labor (Rs 4,000) but regrows within 3 months without regular maintenance scheduling.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z10_trap1',
        zoneId: 'z10',
        name: 'Jogging Club Registration',
        description: 'Jogging club form',
        detailedInfo:
          'A registration form for the "Madurai Morning Joggers Club" lists 35 members who used the peripheral path for their 1.2 km circuit. The club has since relocated to the Vaigai riverfront due to safety concerns. While it documents user loss, the registration form provides no information about the encroachment or maintenance failures.',
        category: 'community',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z10_trap2',
        zoneId: 'z10',
        name: 'Boundary Wall Paint Quote',
        description: 'Wall painting quote',
        detailedInfo:
          'A quotation from a local painter offers to paint the boundary wall with murals depicting Madurai\'s heritage for Rs 45,000. While aesthetically appealing, painting walls that are themselves encroachments would legitimize the illegal boundary extensions. This cosmetic solution completely misses the core encroachment problem.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z10_trap3',
        zoneId: 'z10',
        name: 'CCTV Proposal',
        description: 'CCTV installation proposal',
        detailedInfo:
          'A security company proposal offers installation of 6 CCTV cameras along the peripheral walk for Rs 1.8 lakh with annual maintenance of Rs 24,000. While cameras might improve perceived safety, they do not address the physical narrowing of the path from encroachment and overgrowth, which is the fundamental problem making the path unusable.',
        category: 'safety',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z11 — South Pond (ecological/sewage)
  // =========================================================================
  {
    zoneId: 'z11',
    zoneName: 'South Pond',
    sceneDescription:
      'Small pond, murky brown water. Sewage smell. Damp staining on northern bank.',
    objects: [
      {
        id: 'z11_sewer_damage',
        zoneId: 'z11',
        name: 'Sewer Pipe Damage Report',
        description: '600mm pipe cracked by construction',
        detailedInfo:
          'A PWD inspection report identifies a 2.4-metre crack in the 600mm RCC sewer main running along the northern boundary of the South Pond. The crack was caused by heavy vehicle movement during the construction of a residential apartment complex on adjacent Plot No. 52 in 2021. Raw sewage seeps through the crack into the pond at an estimated rate of 800 litres per day, causing the brown discoloration and foul odor.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z11_coliform_data',
        zoneId: 'z11',
        name: 'TNPCB Water Quality Report',
        description: '15x safe coliform limit',
        detailedInfo:
          'A Tamil Nadu Pollution Control Board (TNPCB) water quality analysis from October 2023 shows fecal coliform levels at 15,000 MPN/100mL — fifteen times the 1,000 MPN/100mL safe limit for non-contact recreational water. BOD is 18.6 mg/L (healthy limit: 3), and the water is classified as grossly polluted. TNPCB has issued a notice to both PWD and Corporation but no remediation has begun.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z11_recharge_study',
        zoneId: 'z11',
        name: 'Groundwater Recharge Assessment',
        description: 'Pond feeds 200 household aquifer',
        detailedInfo:
          'A hydrogeological study by Anna University, Madurai campus, identifies the South Pond as a significant groundwater recharge point feeding the shallow aquifer used by approximately 200 households in Sellur for bore well water. Contaminated recharge from the sewage-polluted pond means these households are drawing water with elevated coliform and nitrate levels, creating a public health risk beyond the park boundary.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z11_health_data',
        zoneId: 'z11',
        name: 'Health Department Disease Register',
        description: '2 children hospitalized',
        detailedInfo:
          'The Sellur Primary Health Centre disease register records 2 children from households within 200m of the South Pond hospitalized for acute gastroenteritis in August 2023. Both families use bore well water. While direct causation requires further epidemiological study, the Health Inspector\'s report notes "proximity to contaminated water body" as a contributing factor and recommends immediate sewage leak repair.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z11_repair_estimate',
        zoneId: 'z11',
        name: 'Inter-Department Correspondence',
        description: 'PWD vs Corp blame game',
        detailedInfo:
          'A chain of 7 letters between PWD and Madurai Corporation spanning 14 months reveals a jurisdictional blame game. PWD claims the sewer main is a Corporation asset; the Corporation says the damage was caused by PWD-permitted construction activity. Neither department has accepted repair responsibility. The estimated repair cost is Rs 2.8 lakh — trivial compared to the health consequences of inaction.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z11_trap1',
        zoneId: 'z11',
        name: 'Historical Fish Species List',
        description: 'Historical fish list',
        detailedInfo:
          'A biodiversity inventory from 2018 lists 6 freshwater fish species that once inhabited the South Pond, including catla, rohu, and tilapia introduced for mosquito control. All fish populations have collapsed due to the sewage contamination. While it documents biodiversity loss, the list provides no information about the sewage source or repair pathway.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z11_trap2',
        zoneId: 'z11',
        name: 'Lotus Planting Proposal',
        description: 'Lotus planting plan',
        detailedInfo:
          'A beautification proposal suggests planting lotus and water lilies in the South Pond to "improve aesthetics and water quality through phytoremediation." While plants can help with mild contamination, planting lotus in raw-sewage-contaminated water with 15x coliform limits would be futile. The proposal addresses symptoms, not the cracked sewer pipe causing the problem.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z11_trap3',
        zoneId: 'z11',
        name: 'Rainfall Data Chart',
        description: 'Annual rainfall data',
        detailedInfo:
          'A chart shows Madurai annual rainfall data from 2018-2023, with normal monsoon patterns and no significant drought or flooding events. The data confirms the pond\'s problems are not weather-related — water levels are maintained by rainwater and the leaking sewer line. This climate data provides no insight into the contamination source.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z12 — Compost Area (ecological/waste)
  // =========================================================================
  {
    zoneId: 'z12',
    zoneName: 'Compost Area',
    sceneDescription:
      'Rotting garden waste, strong smell. Flies buzzing. Abandoned wheelbarrow.',
    objects: [
      {
        id: 'z12_turning_log',
        zoneId: 'z12',
        name: 'Compost Turning Schedule',
        description: 'Last turned March 2022, worker transferred',
        detailedInfo:
          'A wall-mounted turning schedule shows regular weekly entries until March 2022, then nothing. The assigned worker, Mr. Arumugam, was transferred to the Periyar Bus Stand maintenance crew without replacement. Without regular turning, the aerobic composting process collapsed into anaerobic decomposition, producing methane and hydrogen sulfide (the rotten smell). The compost heap has been essentially rotting in place for over 2 years.',
        category: 'ecological',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z12_fertilizer_cost',
        zoneId: 'z12',
        name: 'Chemical Fertilizer Purchase Orders',
        description: 'Rs 1.8L annual spend replaceable by compost',
        detailedInfo:
          'Purchase orders from 2022-23 show the park spent Rs 1.8 lakh on chemical fertilizers (DAP, urea, potash) bought from authorized dealers. A functional compost unit processing the park\'s 2.5 tonnes/month of garden waste could produce 60% of the park\'s fertilizer needs, saving approximately Rs 1.08 lakh annually. The irony is that garden waste is piling up while chemical fertilizer is being purchased.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z12_ngo_proposal',
        zoneId: 'z12',
        name: 'NGO Partnership Proposal',
        description: 'Organic Farmers Collective offers management',
        detailedInfo:
          'The Madurai Organic Farmers Collective has proposed a zero-cost partnership to manage the compost area. They offer to provide trained workers (2 days/week), compost turning equipment, and process expertise. In return, they request 40% of the finished compost for their members\' farms. The proposal was submitted in September 2023 to the Corporation\'s Social Welfare wing but has not been forwarded to the Parks Department.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z12_odour_log',
        zoneId: 'z12',
        name: 'Odour Complaint Register',
        description: '15 complaints, walkers avoid area',
        detailedInfo:
          'A complaint register at the park office contains 15 odour complaints from visitors and nearby residents since June 2022. Walkers report avoiding the entire southwestern section of the park due to the smell, which intensifies during afternoon heat. Three complaints specifically mention children feeling nauseous. The open decomposition also attracts rats, which have been spotted in the adjacent Z8 Nursery area.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z12_waste_volume',
        zoneId: 'z12',
        name: 'Garden Waste Generation Log',
        description: '2.5 tonnes/month, 4T capacity',
        detailedInfo:
          'A garden waste log maintained by the park supervisor records approximately 2.5 tonnes of green waste generated monthly from pruning, leaf collection, and grass cutting across the park\'s 7 acres. The compost area has a designed capacity of 4 tonnes in various stages of decomposition. Currently, waste is simply dumped without any composting process, creating a growing pile that has exceeded the area\'s capacity.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z12_trap1',
        zoneId: 'z12',
        name: 'Vermicomposting Guide',
        description: 'Vermicomposting instruction booklet',
        detailedInfo:
          'An instructional booklet on vermicomposting techniques covers bin construction, worm species selection (Eisenia fetida), moisture management, and harvesting methods. While vermicomposting is a valid technique, the booklet is generic and does not address the immediate problem of an abandoned, unmanned compost operation producing toxic odours.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z12_trap2',
        zoneId: 'z12',
        name: 'Biogas Plant Brochure',
        description: 'Biogas plant promotional material',
        detailedInfo:
          'A promotional brochure from M/s GreenEnergy Solutions, Chennai, proposes a Rs 8 lakh biogas plant that could process garden waste into cooking gas and slurry fertilizer. While technically viable for large-scale operations, the park\'s 2.5 tonnes/month is below the minimum 5-tonne threshold for economic biogas production. This is an over-engineered solution for the scale of the problem.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z12_trap3',
        zoneId: 'z12',
        name: 'Carbon Credit Calculator',
        description: 'Carbon credit estimation tool',
        detailedInfo:
          'A printed carbon credit calculator estimates the park could earn 12 carbon credits annually from proper composting operations under the Gold Standard methodology. At current market rates, this translates to approximately Rs 24,000/year. While interesting, carbon credit calculation is irrelevant to the immediate problem of restoring basic composting operations and eliminating the odour nuisance.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z13 — PPP Zone (institutional/legal)
  // =========================================================================
  {
    zoneId: 'z13',
    zoneName: 'PPP Zone',
    sceneDescription:
      'Walled enclosure with half-built walls. Debris. Stagnant water in foundation. Rusted gate.',
    objects: [
      {
        id: 'z13_contract',
        zoneId: 'z13',
        name: 'PPP Contract Document',
        description: 'No penalty/exit clause, Rs 40L advance',
        detailedInfo:
          'The Public-Private Partnership contract with M/s Sunrise Recreation Pvt. Ltd. for construction of a swimming pool and gym facility reveals critical drafting failures: no penalty clause for delayed construction, no performance guarantee, no exit/termination mechanism, and a Rs 40 lakh advance payment already disbursed. The developer completed foundation work, then halted construction citing "market conditions" in 2020. The Corporation has no contractual lever to recover the advance or reclaim the land.',
        category: 'institutional',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z13_rti_response',
        zoneId: 'z13',
        name: 'RTI Response Documents',
        description: 'Advance spent, recovery needs legal',
        detailedInfo:
          'RTI responses obtained by activist Mr. Karunanidhi reveal that the Rs 40 lakh advance was spent: Rs 22 lakh on foundation and walls, Rs 12 lakh on "site preparation and consultancy" (no bills attached), and Rs 6 lakh on "administrative expenses." Recovery requires filing a civil suit, estimated to take 3-5 years in Madurai District Court. The Corporation\'s legal cell has not initiated proceedings despite 3 years of project abandonment.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z13_health_report',
        zoneId: 'z13',
        name: 'Health Department Inspection',
        description: '2 dengue cases from standing water',
        detailedInfo:
          'A Health Department inspection following a dengue outbreak in Sellur traced 2 confirmed cases to the PPP Zone construction site. Stagnant water in the unfinished foundation trench, accumulated over monsoon seasons, was found positive for Aedes aegypti larvae. The Health Inspector issued a notice to the Corporation demanding immediate draining and larvicide treatment. The site was treated once but refilled in the next rain.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z13_community_petition',
        zoneId: 'z13',
        name: 'Community Reclamation Petition',
        description: '127 signatures for public use',
        detailedInfo:
          'A community petition with 127 signatures demands the Corporation "terminate the failed PPP contract and reclaim the land for public use." The petition was organized by the Sellur Residents Welfare Association and submitted to the District Collector, Corporation Commissioner, and Ward Councillor simultaneously. Signatories include teachers, shopkeepers, autorickshaw drivers, and retired government employees from the surrounding neighborhoods.',
        category: 'community',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z13_soil_test',
        zoneId: 'z13',
        name: 'Soil Contamination Report',
        description: 'Rs 1.2L remediation needed',
        detailedInfo:
          'A soil test by the Tamil Nadu Agricultural University reveals elevated levels of cement alkalinity, construction chemical residues, and hydrocarbon contamination from diesel stored on site. The pH of topsoil in the PPP Zone is 9.2 (healthy range: 6.5-7.5), making it unsuitable for planting without remediation. Soil treatment with gypsum and organic matter is estimated at Rs 1.2 lakh to restore the area for park use.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z13_trap1',
        zoneId: 'z13',
        name: 'Developer Company Brochure',
        description: 'Sunrise Recreation company brochure',
        detailedInfo:
          'A glossy brochure from M/s Sunrise Recreation Pvt. Ltd. showcases their completed projects: 2 swimming pools in Chennai and 1 gym facility in Trichy. The brochure projects a professional image that clearly influenced the Corporation\'s decision to award the contract. However, it provides no information useful to resolving the current abandoned site problem.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z13_trap2',
        zoneId: 'z13',
        name: 'Swimming Pool Design Drawing',
        description: 'Pool architectural drawing',
        detailedInfo:
          'Architectural drawings show an Olympic-standard 25m swimming pool with a children\'s wading area, changing rooms, and a 40-seat gallery. The design is impressive on paper but irrelevant to the current reality of an abandoned construction site. The drawings represent a future that will never materialize under the current failed PPP arrangement.',
        category: 'planning',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z13_trap3',
        zoneId: 'z13',
        name: 'Construction Progress Photos',
        description: 'Site progress photographs',
        detailedInfo:
          'A set of 12 photographs documents construction progress from March to August 2020: excavation, foundation pouring, wall construction up to 1.5m height, and then... nothing. The photos end abruptly in August 2020. While they confirm the timeline of abandonment, they provide no information about the contractual failures or remediation pathways.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },

  // =========================================================================
  // Z14 — Water Tank & Pump House (infrastructure/failure)
  // =========================================================================
  {
    zoneId: 'z14',
    zoneName: 'Water Tank & Pump House',
    sceneDescription:
      'Concrete building, humming pump. Water stains. Tarpaulin on leaking roof. High voltage signs.',
    objects: [
      {
        id: 'z14_pump_status',
        zoneId: 'z14',
        name: 'Pump Motor Status Board',
        description: '2 of 3 failed, survivor overloaded',
        detailedInfo:
          'A whiteboard inside the pump house lists 3 pump motors: Motor A (5HP, FAILED — bearing seizure, Dec 2022), Motor B (5HP, FAILED — winding burn, May 2023), and Motor C (3HP, OPERATIONAL — running at 140% rated load). Motor C was designed as a backup for low-demand periods but is now the sole water source for the entire 7-acre park. At current overload, its remaining lifespan is estimated at 6-12 months before catastrophic failure.',
        category: 'infrastructure',
        isRootCause: true,
        isRelevant: true,
      },
      {
        id: 'z14_valve_map',
        zoneId: 'z14',
        name: 'Distribution Valve Network Map',
        description: '3 junction failures cut Z4/Z8/Z11',
        detailedInfo:
          'A schematic map of the park\'s water distribution network shows the pump house supplying water through 3 main distribution lines. Junction Valve J1 (to Z4 Herbal Garden) is seized shut, Junction Valve J2 (to Z8 Nursery) has a broken handle, and Junction Valve J3 (to Z11 South Pond) is leaking. These 3 failures effectively cut off water supply to 3 major zones, creating cascade failures across the park.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
        resourceBonus: { type: 'knowledge', amount: 1 },
      },
      {
        id: 'z14_tanker_cost',
        zoneId: 'z14',
        name: 'Tanker Water Expense Register',
        description: 'Rs 45K/month, repair pays for itself in 8 months',
        detailedInfo:
          'An expense register documents monthly tanker water purchases averaging Rs 45,000 since the pump failures began. Two tanker loads per day at Rs 750 each serve the main garden areas, walking track plantings, and the fountain plaza. Repairing both failed pump motors costs an estimated Rs 3.6 lakh — meaning the investment pays for itself in just 8 months of eliminated tanker expenses. The register totals Rs 4.95 lakh spent on tanker water in 11 months.',
        category: 'institutional',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z14_electrical_audit',
        zoneId: 'z14',
        name: 'Electrical Safety Audit Report',
        description: '4 critical violations',
        detailedInfo:
          'An electrical safety audit by a licensed contractor identifies 4 critical violations in the pump house: (1) exposed live wiring near the main panel, (2) no earth leakage circuit breaker on the 3-phase supply, (3) water leaking from the roof onto the electrical distribution board, and (4) the sole remaining motor running without overload protection. The auditor has stamped "IMMEDIATE SHUTDOWN RECOMMENDED" — but shutdown means zero water supply to the park.',
        category: 'safety',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z14_roof_assessment',
        zoneId: 'z14',
        name: 'Roof Condition Assessment',
        description: 'Leaks onto electrical panel',
        detailedInfo:
          'A structural assessment of the pump house roof identifies 3 major cracks in the RCC slab allowing rainwater ingress directly above the main electrical panel. A temporary tarpaulin cover has been placed but shifts during storms. The assessment recommends waterproofing treatment at Rs 45,000 as an urgent safety measure. During monsoon, water drips onto live 440V connections, creating electrocution risk for the pump operator.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: true,
      },
      {
        id: 'z14_trap1',
        zoneId: 'z14',
        name: 'Original Pump Specification Sheet',
        description: 'Original pump specs',
        detailedInfo:
          'The original specification sheet for the 3 Kirloskar pump motors lists technical details: rated voltage 415V, RPM 1440, impeller diameter 150mm, and maximum head 25m. While useful for ordering replacement parts, the specification sheet does not reveal why the motors failed or address the systemic maintenance and safety issues in the pump house.',
        category: 'infrastructure',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z14_trap2',
        zoneId: 'z14',
        name: 'Water Potability Certificate',
        description: 'Water quality certificate',
        detailedInfo:
          'A potability certificate from the Corporation Water Supply Division certifies the borewell source water as safe for non-drinking purposes (gardening, cleaning). The certificate was issued in 2021 and confirms the water quality is acceptable. It does not address the pump failures, distribution network breakdowns, or safety hazards that are the real problems at this zone.',
        category: 'ecological',
        isRootCause: false,
        isRelevant: false,
      },
      {
        id: 'z14_trap3',
        zoneId: 'z14',
        name: 'Solar Pump Proposal',
        description: 'Solar pump system proposal',
        detailedInfo:
          'A proposal from a solar energy company offers a 10HP solar pump system for Rs 12 lakh with 25-year panel warranty. While solar pumping is a long-term solution, the immediate crisis requires repairing the existing motors (Rs 3.6L) and fixing the roof leak and electrical hazards. The solar proposal is a future upgrade, not a response to the current emergency.',
        category: 'planning',
        isRootCause: false,
        isRelevant: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Exports & Helper Functions
// ---------------------------------------------------------------------------

export default ZONE_INVESTIGATIONS;

export function getZoneInvestigationData(zoneId: string): ZoneInvestigation | undefined {
  return ZONE_INVESTIGATIONS.find(z => z.zoneId === zoneId);
}

export function getRelevantCluesForZone(zoneId: string): InvestigationClue[] {
  const zone = getZoneInvestigationData(zoneId);
  return zone ? zone.objects.filter(o => o.isRelevant) : [];
}

export function getTrapsForZone(zoneId: string): InvestigationClue[] {
  const zone = getZoneInvestigationData(zoneId);
  return zone ? zone.objects.filter(o => !o.isRelevant) : [];
}

export function getRootCause(zoneId: string): InvestigationClue | undefined {
  const zone = getZoneInvestigationData(zoneId);
  return zone?.objects.find(o => o.isRootCause);
}
