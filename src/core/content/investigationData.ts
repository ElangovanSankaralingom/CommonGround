/**
 * investigationData.ts -- Zone Investigation Scene Data
 *
 * 7 investigation zones, each with 12 objects (7 relevant + 5 irrelevant).
 * Normalized positions (0-1), Madurai-specific clue texts, consequences.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvestigationObject {
  id: string;
  name: string;
  relevant: boolean;
  x: number;
  y: number;
  icon: string;
  title: string;
  body: string;
  resourceHint?: string;
  meaning?: string;
  consequence?: 'timer' | 'distracted' | 'awareness' | 'wasted' | 'bureaucratic';
  timerLoss?: number;
}

export interface InvestigationZone {
  id: string;
  title: string;
  engineZoneId: string;
  difficulty: number;
  backgroundGradient: string;
  hasWater: boolean;
  objects: InvestigationObject[];
}

// ---------------------------------------------------------------------------
// Z3 -- Boating Pond (algae bloom, blocked drainage)
// ---------------------------------------------------------------------------

const z3: InvestigationZone = {
  id: 'z3',
  title: 'Boating Pond',
  engineZoneId: 'boating_pond',
  difficulty: 4,
  backgroundGradient: '#2a3828',
  hasWater: true,
  objects: [
    // 7 relevant
    { id: 'z3_pipe', name: 'Cracked Pipe', relevant: true, x: 0.12, y: 0.58, icon: 'pipe',
      title: 'Blocked 450mm RCC Pipe',
      body: '450mm RCC pipe blocked since 2019 by Alagar Kovil Road debris. Root cause of all algae. The pipe feeds the pond from the PWD storm-water network, and its blockage has turned the pond into a stagnant nutrient trap.',
      resourceHint: 'Material',
      meaning: 'Infrastructure root causes are often invisible — buried underground and upstream. Clearing this single pipe would restore flow and break the algae cycle.' },
    { id: 'z3_boat', name: 'Toy Boat', relevant: true, x: 0.65, y: 0.68, icon: 'boat',
      title: 'Abandoned Toy Boat',
      body: '200+ visitors in 2021, under 30 by 2024. Three vendors closed. This boat belonged to the last boat rental operator who shut down in March 2023. The algae made boating impossible — green scum coats the hull.',
      resourceHint: 'Knowledge',
      meaning: 'Economic indicators tell a story: declining visitors mean declining revenue mean declining maintenance budgets. The boat is evidence of a downward spiral.' },
    { id: 'z3_sign', name: 'Municipal Sign', relevant: true, x: 0.72, y: 0.22, icon: 'sign',
      title: 'Diverted Budget Sign',
      body: 'Rs 3.5L file EC/BEAUTY/2022/312 redirected Sep 2022. The sign announces a "beautification project" that was supposed to include pond cleaning. The funds were reallocated to entrance landscaping instead.',
      resourceHint: 'Budget',
      meaning: 'Budget diversions are a governance pattern. Tracking file numbers reveals where money actually goes versus where it was promised.' },
    { id: 'z3_closet', name: 'Maintenance Closet', relevant: true, x: 0.88, y: 0.42, icon: 'closet',
      title: 'Abandoned Maintenance Closet',
      body: 'Behind bushes: 2HP pump, chemicals Rs 800, tools. Cancelled Phase 2 of the pond restoration. Everything needed to begin treatment is here — unused. The equipment was purchased in 2021 and has never been deployed.',
      resourceHint: 'Material',
      meaning: 'Resources exist but are not deployed. The gap between procurement and utilisation is where maintenance dies.' },
    { id: 'z3_junction', name: 'Pipe Junction', relevant: true, x: 0.18, y: 0.72, icon: 'grate',
      title: 'Z6 Irrigation Junction',
      body: 'Connects Z6 irrigation. Fix Z3 = Z6 restores. This junction feeds clean water from the pond to the Herbal Garden irrigation system. With the pond polluted, the pipe was shut off in 2020.',
      resourceHint: 'Knowledge',
      meaning: 'Systems are interconnected. Fixing the pond does not just help Z3 — it cascades to Z4 (Herbal Garden) and Z6 (Playground drainage).' },
    { id: 'z3_kit', name: 'Water Kit', relevant: true, x: 0.48, y: 0.52, icon: 'flask',
      title: 'TNPCB Water Testing Kit',
      body: 'TNPCB DO 2.1mg/L BOD 18 coliform 4x. No action. The Tamil Nadu Pollution Control Board tested this water in Jan 2024. Dissolved oxygen is critically low, biological oxygen demand is dangerously high, and coliform bacteria are 4x the safe limit.',
      resourceHint: 'Knowledge',
      meaning: 'Scientific evidence exists but is not acted upon. The data justifies emergency intervention — if anyone reads the report.' },
    { id: 'z3_map', name: 'Drainage Map', relevant: true, x: 0.28, y: 0.25, icon: 'map',
      title: 'PWD Drainage Network Map',
      body: 'PWD network to Teppakulam branches Z2/Z6/Z11. Rs 45K to clear. This faded map shows the entire underground drainage network. The Z3 blockage affects three downstream zones. Clearing costs Rs 45,000 — less than one month of lost vendor revenue.',
      resourceHint: 'Budget',
      meaning: 'Systems-level maps reveal cascading dependencies. One blockage point creates failures across the entire network.' },
    // 5 irrelevant
    { id: 'z3_lamp', name: 'Decorative Lamp', relevant: false, x: 0.92, y: 0.18, icon: 'lamp',
      title: 'Solar Pathway Lamp',
      body: 'Rs 12L lamps vs Rs 3.5L drainage. These decorative solar lamps were installed in 2022 at great expense while the drainage remained blocked. Pretty but irrelevant to the ecological crisis.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Cosmetic spending while infrastructure crumbles is a common pattern. The lamps cost 3.4x more than fixing the actual problem.' },
    { id: 'z3_booth', name: 'Ticket Booth', relevant: false, x: 0.55, y: 0.20, icon: 'booth',
      title: 'Closed Ticket Booth',
      body: 'Rs 4L/yr revenue killed by algae. The boating ticket booth closed in 2023. It once generated Rs 4 lakh annually — revenue that funded pond maintenance in a virtuous cycle now broken.',
      consequence: 'distracted',
      meaning: 'The booth is a consequence of the problem, not a clue to solving it. Do not confuse symptoms with causes.' },
    { id: 'z3_graffiti', name: 'Wall Graffiti', relevant: false, x: 0.38, y: 0.18, icon: 'mural',
      title: 'Protest Graffiti',
      body: 'Rs 28K paint returned 2 months later. Someone spray-painted "CLEAN OUR POND" on the boundary wall. The Corporation spent Rs 28,000 to repaint it. The graffiti returned within two months.',
      consequence: 'awareness',
      meaning: 'Community frustration is visible but painting over it — literally — does not address the root cause.' },
    { id: 'z3_bench', name: 'Broken Bench', relevant: false, x: 0.42, y: 0.38, icon: 'bench',
      title: 'Waterlogged Bench',
      body: 'Rs 8K one-day fix. A concrete bench near the pond edge, partially submerged during monsoon. Easy to repair but irrelevant to the algae crisis.',
      consequence: 'wasted',
      meaning: 'Small visible repairs create an illusion of progress. Fixing the bench changes nothing about water quality.' },
    { id: 'z3_rules', name: 'Rules Board', relevant: false, x: 0.08, y: 0.32, icon: 'rules',
      title: 'Park Rules Board',
      body: 'Rule 4: No Swimming. Rule 7: Maintain Cleanliness. The rules board is intact and legible — but the pond violates its own rules. Nobody swims because nobody would want to.',
      consequence: 'bureaucratic',
      meaning: 'Rules without enforcement or context are performative governance. The board exists to absolve responsibility, not to create order.' },
  ],
};

// ---------------------------------------------------------------------------
// Z1 -- Main Entrance (vendor encroachment)
// ---------------------------------------------------------------------------

const z1: InvestigationZone = {
  id: 'z1',
  title: 'Main Entrance',
  engineZoneId: 'main_entrance',
  difficulty: 3,
  backgroundGradient: '#3D322A',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z1_ramp', name: 'Wheelchair Ramp', relevant: true, x: 0.15, y: 0.60, icon: 'ramp',
      title: 'Cracked Wheelchair Ramp',
      body: 'The ramp poured in 2018 has a 12-cm crack running its full length. The accessibility audit filed by the District Disability Rehabilitation Centre in Jan 2023 flagged this — no action taken. Without ramp access the park excludes 4,200 registered wheelchair users in Madurai district.',
      resourceHint: 'Knowledge',
      meaning: 'Accessibility infrastructure that fails is worse than none — it signals false inclusion. Repair cost: Rs 45,000.' },
    { id: 'z1_license', name: 'Vendor Licenses', relevant: true, x: 0.35, y: 0.30, icon: 'license',
      title: 'Vendor License Display',
      body: '6 licensed slots, 14 vendors present. 8 unlicensed vendors pay no rent and block 60% of the pathway, forcing visitors onto the road. Revenue leakage: Rs 2.4 lakh/year. Ward 42 councillor has not responded to complaints since March 2022.',
      resourceHint: 'Budget',
      meaning: 'Encroachment is a governance failure that costs revenue and creates safety hazards. Enforcement requires political will, not money.' },
    { id: 'z1_footfall', name: 'Footfall Counter', relevant: true, x: 0.55, y: 0.45, icon: 'counter',
      title: 'Broken Footfall Counter',
      body: 'Installed 2020 under Smart City Phase II at Rs 1.8L. Display blank since Aug 2021. Without data, Corporation assumes low usage. Actual weekend footfall (manual count Oct 2023): 1,800 visitors. Fixing costs Rs 12,000 but unlocks evidence for budget proposals.',
      resourceHint: 'Knowledge',
      meaning: 'Data infrastructure that fails silently is dangerous — decisions get made on assumptions.' },
    { id: 'z1_altspace', name: 'Alt Space Plan', relevant: true, x: 0.75, y: 0.35, icon: 'map',
      title: 'Alternative Vendor Space Plan',
      body: 'A Rs 4.5L proposal to create a designated vendor zone 50m east of the entrance with proper stalls, drainage, and waste collection. Filed by the Urban Design department in 2022. Never reached the Council agenda.',
      resourceHint: 'Budget',
      meaning: 'Solutions exist on paper. The bottleneck is not ideas but the institutional pathway from proposal to execution.' },
    { id: 'z1_safety', name: 'Safety Audit', relevant: true, x: 0.20, y: 0.75, icon: 'report',
      title: 'Fire Safety Audit Report',
      body: 'Oct 2023 audit flagged fire risk: LPG cylinders at 3 food stalls within 2m of the park gate. No fire extinguisher within 50m. Wheelchair access eliminated by cart placement. The report was filed with TNFRS — no follow-up.',
      resourceHint: 'Knowledge',
      meaning: 'Safety risks compound — fire hazard plus blocked wheelchair exit is a disaster waiting to happen.' },
    { id: 'z1_revenue', name: 'Revenue Ledger', relevant: true, x: 0.88, y: 0.55, icon: 'folder',
      title: 'Lost Revenue Analysis',
      body: 'Rs 84K/yr lost from unlicensed vendors (no rent), blocked parking (lost ticketing), and reduced footfall. This exceeds the cost of building proper vendor infrastructure.',
      resourceHint: 'Budget',
      meaning: 'Informal encroachment is not free — it costs the park Rs 84,000 annually in direct revenue loss.' },
    { id: 'z1_petition', name: 'Resident Petition', relevant: true, x: 0.45, y: 0.82, icon: 'petition',
      title: '127-Signature Petition',
      body: '127 signatures collected by Periyar Nagar Residents Association demanding vendor regulation and wheelchair access restoration. Submitted to Ward Councillor, Corporation Commissioner, and District Collector. No acknowledgment.',
      resourceHint: 'Volunteer',
      meaning: '127 signatures represent organized community demand — a latent political resource that needs the right institutional target.' },
    // 5 irrelevant
    { id: 'z1_mural', name: 'Welcome Mural', relevant: false, x: 0.62, y: 0.20, icon: 'mural',
      title: 'School Art Mural',
      body: 'A cheerful mural painted by Madurai School of Art students in 2022. Depicts Meenakshi Amman Temple and Vaigai River. Attractive but irrelevant to vendor encroachment.',
      consequence: 'distracted',
      meaning: 'Aesthetic assets distract from structural failures. The mural is charming — and completely unrelated to why the entrance is dysfunctional.' },
    { id: 'z1_cooler', name: 'Water Cooler', relevant: false, x: 0.30, y: 0.50, icon: 'cooler',
      title: 'Empty Water Cooler',
      body: 'Donated by Rotary Club 2019, dry for months. Water connection cut when unpaid bills hit Rs 8,400.',
      consequence: 'wasted',
      meaning: 'Donated assets without operational budgets become monuments to good intentions.' },
    { id: 'z1_flag', name: 'Flagpole', relevant: false, x: 0.08, y: 0.15, icon: 'flag',
      title: 'Bare Flagpole',
      body: 'No flag, frayed rope, chipped base. Looks neglected but has no bearing on vendor encroachment or access problems.',
      consequence: 'awareness',
      meaning: 'Neglect signals accumulate — use that awareness to focus on structural issues, not cosmetic ones.' },
    { id: 'z1_box', name: 'Suggestion Box', relevant: false, x: 0.82, y: 0.70, icon: 'box',
      title: 'Locked Suggestion Box',
      body: 'Rusted shut, not opened in two years. No one processes the feedback. "Your Feedback Matters" label peeling.',
      consequence: 'bureaucratic',
      meaning: 'Participation theatre — the box exists to signal responsiveness but delivers none.' },
    { id: 'z1_lamp', name: 'Gate Lamp', relevant: false, x: 0.48, y: 0.12, icon: 'lamp',
      title: 'Ornamental Gate Lamp',
      body: 'A brass-finish lamp post, flickering LED. Functional but irrelevant to the entrance crisis.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Lighting maintenance matters but not during an encroachment investigation. Prioritise infrastructure over ambience.' },
  ],
};

// ---------------------------------------------------------------------------
// Z2 -- Fountain Plaza (dead fountain, SPV dispute)
// ---------------------------------------------------------------------------

const z2: InvestigationZone = {
  id: 'z2',
  title: 'Fountain Plaza',
  engineZoneId: 'fountain_plaza',
  difficulty: 4,
  backgroundGradient: '#2E2E36',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z2_motor', name: 'Burnt Motor', relevant: true, x: 0.50, y: 0.50, icon: 'pump',
      title: 'Burnt Fountain Pump Motor',
      body: 'Rs 1.8L 3HP submersible pump burned out June 2022 after voltage surge. Three purchase orders raised, all returned by Corporation accounts for "insufficient documentation." Fountain dry for 22 months.',
      resourceHint: 'Material',
      meaning: 'Procurement bureaucracy can kill a simple repair. The cost is trivial — the bottleneck is paperwork, not money.' },
    { id: 'z2_spv', name: 'SPV Letters', relevant: true, x: 0.25, y: 0.35, icon: 'folder',
      title: 'SPV Correspondence File',
      body: '12 letters since Jan 2023 between Park Administrator and Smart City SPV office. SPV approved Rs 4.5L for restoration Dec 2021 but required utilisation certificate for previous Rs 2.1L LED grant first. Certificate never filed. Money lapsed.',
      resourceHint: 'Budget',
      meaning: 'Cascading compliance failures: one missing document blocked a completely unrelated fund. Fixing the fountain requires clearing the paperwork backlog.' },
    { id: 'z2_survey', name: 'Gathering Survey', relevant: true, x: 0.72, y: 0.25, icon: 'report',
      title: 'Plaza Usage Survey',
      body: '150+ gatherings/year dropped 70% since fountain died Dec 2022. Wedding photographers, morning yoga groups, and school trips all stopped using the plaza. The fountain was the anchor.',
      resourceHint: 'Knowledge',
      meaning: 'A dead fountain does not just waste water infrastructure — it kills the social function of public space.' },
    { id: 'z2_panel', name: 'Electrical Panel', relevant: true, x: 0.78, y: 0.60, icon: 'regulator',
      title: 'Intact Electrical Panel',
      body: 'Panel is intact but missing voltage regulator. Without it, TNEB Madurai South substation surges (14 in 2022) go directly to the pump. The burnt motor is a symptom — the absent regulator is the cause.',
      resourceHint: 'Knowledge',
      meaning: 'Replacing the pump without installing a regulator guarantees another burnout. Root cause analysis prevents repeat failures.' },
    { id: 'z2_dengue', name: 'Dengue Report', relevant: true, x: 0.35, y: 0.70, icon: 'flask',
      title: 'Stagnant Water Dengue Alert',
      body: 'Oct 2023: Corporation health department flagged fountain basin as dengue breeding site. Aedes larvae found in stagnant water. Report addressed to Park Superintendent — coffee ring on page 2, no action.',
      resourceHint: 'Knowledge',
      meaning: 'Known health hazards without response create liability. The data justifies emergency draining at minimum.' },
    { id: 'z2_plaque', name: 'Smart City Plaque', relevant: true, x: 0.15, y: 0.55, icon: 'plaque',
      title: 'Smart City Project Plaque',
      body: 'Rs 8.2L Smart City investment. Warranty expired Sep 2021. The plaque celebrates the investment but the warranty lapsed 3 months before the pump failed. No AMC was purchased.',
      resourceHint: 'Budget',
      meaning: 'Capital investment without maintenance contracts is a time bomb. The plaque is a monument to a systemic failure.' },
    { id: 'z2_proposal', name: 'Community Proposal', relevant: true, x: 0.60, y: 0.82, icon: 'petition',
      title: 'Rejected Community Proposal',
      body: 'Rs 15K community-funded repair proposal from Fountain Plaza Residents Welfare Association. 342 signatures. Rejected because "private repairs to public infrastructure violate Corporation guidelines."',
      resourceHint: 'Volunteer',
      meaning: 'The community offered to pay and was told no. Bureaucratic rules can prevent solutions even when communities are willing to act.' },
    // 5 irrelevant
    { id: 'z2_lamp', name: 'Plaza Lamp', relevant: false, x: 0.90, y: 0.15, icon: 'lamp',
      title: 'Decorative Plaza Lamp',
      body: 'Brass-finish lamp, flickering LED. Cosmetically worn but functional. Illuminates the plaza at night but has no connection to the fountain failure.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Lighting maintenance is important but not during a fountain investigation.' },
    { id: 'z2_pigeon', name: 'Pigeon Droppings', relevant: false, x: 0.42, y: 0.18, icon: 'droppings',
      title: 'Pigeon Colony Evidence',
      body: 'Heavy droppings coat the fountain rim. Unsightly but the pigeons arrived after the fountain died — they are a symptom of disuse, not a cause.',
      consequence: 'distracted',
      meaning: 'Symptoms often look like causes. Removing pigeons without restoring water solves nothing.' },
    { id: 'z2_bench', name: 'Stone Bench', relevant: false, x: 0.55, y: 0.40, icon: 'bench',
      title: 'Cracked Stone Bench',
      body: 'Italian stone bench, cracked but usable. Rs 12K to replace. Not related to the fountain mechanical failure.',
      consequence: 'wasted',
      meaning: 'Peripheral repairs create an illusion of progress without addressing the core infrastructure failure.' },
    { id: 'z2_box', name: 'Donation Box', relevant: false, x: 0.30, y: 0.88, icon: 'box',
      title: 'Sealed Donation Box',
      body: 'A locked donation box "For Park Improvement." Has not been opened or audited in 18 months. Contents unknown.',
      consequence: 'bureaucratic',
      meaning: 'Unaudited collection instruments erode public trust. The box collects dust, not meaningful contributions.' },
    { id: 'z2_flag', name: 'Event Banner', relevant: false, x: 0.85, y: 0.75, icon: 'flag',
      title: 'Faded Event Banner',
      body: 'A banner for "Pongal Celebration 2023" still hanging 14 months later. Nobody took it down.',
      consequence: 'awareness',
      meaning: 'Stale event materials signal abandonment. But the banner is not why the fountain is broken.' },
  ],
};

// ---------------------------------------------------------------------------
// Z4 -- Herbal Garden (irrigation dry since Z3 blocked)
// ---------------------------------------------------------------------------

const z4: InvestigationZone = {
  id: 'z4',
  title: 'Herbal Garden',
  engineZoneId: 'herbal_garden',
  difficulty: 3,
  backgroundGradient: '#2a3320',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z4_pipe', name: 'Dry Pipe', relevant: true, x: 0.20, y: 0.55, icon: 'pipe',
      title: 'Dead Irrigation Pipe',
      body: 'Cascade from Z3: when the boating pond pipe blocked in 2019, the irrigation junction that feeds this garden was shut off. The garden has had no piped water for 5 years. Every drop is hand-carried.',
      resourceHint: 'Material',
      meaning: 'This is not a local failure — it is a cascade from Z3. Fixing the Boating Pond pipe automatically restores irrigation here.' },
    { id: 'z4_volunteer', name: 'Volunteer Log', relevant: true, x: 0.45, y: 0.30, icon: 'petition',
      title: 'Volunteer Attendance Log',
      body: '85% attendance from 15 volunteers carrying 200L daily by hand. The Herbal Garden Volunteers Association has maintained near-perfect attendance for 3 years, manually watering 42 species.',
      resourceHint: 'Volunteer',
      meaning: 'Community dedication is extraordinary but unsustainable. 15 people cannot substitute for infrastructure indefinitely.' },
    { id: 'z4_herbs', name: 'Herb Inventory', relevant: true, x: 0.70, y: 0.45, icon: 'flask',
      title: 'Medicinal Herb Inventory',
      body: '42 species valued at Rs 1.8L including rare Siddha medicinal plants. The garden was established in 2016 with AYUSH department support. Three species are found nowhere else in Madurai district.',
      resourceHint: 'Knowledge',
      meaning: 'This garden has irreplaceable biological value. Losing it to irrigation failure would destroy a decade of cultivation.' },
    { id: 'z4_borders', name: 'Dead Borders', relevant: true, x: 0.35, y: 0.72, icon: 'map',
      title: 'Shrinking Garden Borders',
      body: 'The garden has contracted inward by 40% over 3 years. Outer borders died first as volunteers prioritise the most valuable species in the center. Each season the living area shrinks.',
      resourceHint: 'Knowledge',
      meaning: 'Triage under resource scarcity: volunteers are making rational choices about what to save. But triage is not a long-term strategy.' },
    { id: 'z4_soil', name: 'Soil Test', relevant: true, x: 0.82, y: 0.25, icon: 'report',
      title: 'Soil Quality Report',
      body: 'Excellent pH 6.8, high organic matter. Tamil Nadu Agricultural University tested in 2023: the soil is ideal for medicinal herbs. The garden is dying from lack of water, not lack of soil quality.',
      resourceHint: 'Knowledge',
      meaning: 'The foundation is perfect — only the water supply is broken. This makes the fix high-leverage: restore water = restore everything.' },
    { id: 'z4_tanker', name: 'Tanker Route', relevant: true, x: 0.58, y: 0.65, icon: 'grate',
      title: 'Water Tanker Route Analysis',
      body: '200m tanker route, Rs 15K pipe saves 730 hrs/yr of volunteer time. A simple 200m pipe extension from the nearest working connection would eliminate manual watering entirely.',
      resourceHint: 'Budget',
      meaning: 'The cost-benefit is overwhelming: Rs 15,000 saves 730 person-hours per year. But the proposal sits unfiled.' },
    { id: 'z4_expansion', name: 'Expansion Plan', relevant: true, x: 0.12, y: 0.38, icon: 'folder',
      title: 'Garden Expansion Proposal',
      body: 'Rs 40K proposal to double the garden and add an educational pavilion. AYUSH department willing to co-fund. Blocked by the irrigation problem — cannot expand what you cannot water.',
      resourceHint: 'Budget',
      meaning: 'Growth is ready but gated by the same infrastructure failure. Fix the water, unlock the expansion.' },
    // 5 irrelevant
    { id: 'z4_sign', name: 'Garden Sign', relevant: false, x: 0.90, y: 0.60, icon: 'sign',
      title: 'Faded Garden Name Sign',
      body: 'The "Siddha Medicinal Garden" sign is sun-bleached. Important for wayfinding but irrelevant to the irrigation crisis.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Signage matters but is not why the garden is dying.' },
    { id: 'z4_bench', name: 'Meditation Bench', relevant: false, x: 0.55, y: 0.85, icon: 'bench',
      title: 'Stone Meditation Bench',
      body: 'A carved stone bench donated by the Yoga Association. Lovely but irrelevant to irrigation.',
      consequence: 'wasted',
      meaning: 'Amenity assets do not solve infrastructure failures.' },
    { id: 'z4_lamp', name: 'Solar Lamp', relevant: false, x: 0.30, y: 0.15, icon: 'lamp',
      title: 'Solar Pathway Lamp',
      body: 'Working solar lamp illuminating the garden path at night. Functional but not related to the water crisis.',
      consequence: 'distracted',
      meaning: 'Working infrastructure can distract from broken infrastructure. Do not investigate what is not broken.' },
    { id: 'z4_compost', name: 'Compost Bin', relevant: false, x: 0.75, y: 0.80, icon: 'box',
      title: 'Overflow Compost Bin',
      body: 'Compost bin overflowing. The volunteers produce compost but collection has been irregular since the Corporation reduced waste pickup.',
      consequence: 'awareness',
      meaning: 'Waste management issues exist but are peripheral to the irrigation failure.' },
    { id: 'z4_plaque', name: 'AYUSH Plaque', relevant: false, x: 0.42, y: 0.10, icon: 'plaque',
      title: 'AYUSH Department Plaque',
      body: 'Commemorates the 2016 garden establishment. Lists founding species. Historical but not actionable for the current crisis.',
      consequence: 'bureaucratic',
      meaning: 'Commemorative plaques celebrate past achievements while current failures go unaddressed.' },
  ],
};

// ---------------------------------------------------------------------------
// Z5 -- Walking Track (root damage, broken lighting)
// ---------------------------------------------------------------------------

const z5: InvestigationZone = {
  id: 'z5',
  title: 'Walking Track',
  engineZoneId: 'walking_track',
  difficulty: 3,
  backgroundGradient: '#2d2820',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z5_roots', name: 'Root Damage', relevant: true, x: 0.25, y: 0.50, icon: 'ramp',
      title: 'Tree Root Slab Damage',
      body: '12 concrete slabs lifted by banyan tree roots. No root barrier was installed during 2017 construction. The roots will continue to destroy slabs unless barriers are retrofitted. Three elderly visitors have fallen here in 2023.',
      resourceHint: 'Material',
      meaning: 'Preventable design failure: root barriers cost Rs 200/m during construction, Rs 2,000/m as a retrofit. Deferred design decisions multiply costs.' },
    { id: 'z5_lights', name: 'Dead Lights', relevant: true, x: 0.60, y: 0.25, icon: 'lamp',
      title: 'Non-Functional Track Lights',
      body: '8 of 12 lights dead. Evening usage dropped 65%. Morning walkers report feeling unsafe after 6pm. The wiring is intact but 8 LED fixtures failed and were never replaced. AMC expired Jan 2023.',
      resourceHint: 'Material',
      meaning: 'Lighting failures create safety gaps and suppress usage. The economic cost of lost visitors exceeds the replacement cost of 8 LED fixtures.' },
    { id: 'z5_survey', name: 'User Survey', relevant: true, x: 0.40, y: 0.70, icon: 'report',
      title: 'Track User Survey Results',
      body: '82% of 200 surveyed users rate the track surface as "uneven or dangerous." NSS volunteers conducted the survey in Sep 2023. The data has not been shared with the Corporation.',
      resourceHint: 'Knowledge',
      meaning: 'User data exists but is not reaching decision-makers. The gap between data collection and data utilisation is where evidence-based policy dies.' },
    { id: 'z5_growth', name: 'Overgrowth', relevant: true, x: 0.78, y: 0.55, icon: 'pipe',
      title: 'Vegetation Encroachment',
      body: 'Track width narrowed from 3m to 0.8m in sections. Unpruned vegetation has reclaimed 70% of the track width in the northern section. Two joggers cannot pass each other.',
      resourceHint: 'Volunteer',
      meaning: 'Maintenance is not a one-time fix. Without regular pruning schedules, vegetation will always reclaim paved surfaces.' },
    { id: 'z5_drain', name: 'Blocked Drain', relevant: true, x: 0.15, y: 0.35, icon: 'grate',
      title: 'Monsoon Drainage Blockage',
      body: 'Drain blocked causes 40% of the track to flood during monsoon (Oct-Dec). The drain connects to the Z3 network — another cascade failure from the main pipe blockage.',
      resourceHint: 'Material',
      meaning: 'Yet another downstream consequence of the Z3 pipe blockage. Systemic fixes have outsized returns.' },
    { id: 'z5_markers', name: 'Missing Markers', relevant: true, x: 0.88, y: 0.40, icon: 'sign',
      title: 'Removed Distance Markers',
      body: 'Distance markers removed in 2022 during "beautification" and never replaced. Walkers cannot track their exercise. The markers also served as emergency location references.',
      resourceHint: 'Volunteer',
      meaning: 'Removal of functional infrastructure during cosmetic upgrades is a recurring pattern. Beauty should not come at the cost of utility.' },
    { id: 'z5_benches', name: 'Rest Stops', relevant: true, x: 0.50, y: 0.82, icon: 'bench',
      title: 'Insufficient Rest Stops',
      body: 'Only 2 benches on the 800m track. Senior walkers (40% of users) need rest every 200m. The original design had 6 bench stations but 4 were cut during cost reduction.',
      resourceHint: 'Material',
      meaning: 'Inclusive design requires thinking about the least-able user. 2 benches over 800m excludes the people who need the track most.' },
    // 5 irrelevant
    { id: 'z5_mural', name: 'Tree Label', relevant: false, x: 0.35, y: 0.15, icon: 'plaque',
      title: 'Tree Species Label',
      body: 'A metal label identifying a Pongamia pinnata tree. Educational but irrelevant to the track safety issues.',
      consequence: 'awareness',
      meaning: 'Educational assets are valuable but do not fix broken infrastructure.' },
    { id: 'z5_bin', name: 'Waste Bin', relevant: false, x: 0.70, y: 0.75, icon: 'box',
      title: 'Overflowing Waste Bin',
      body: 'Waste bin overflowing with water bottles and food wrappers. Unpleasant but a waste management issue, not a track safety issue.',
      consequence: 'distracted',
      meaning: 'Waste is visible and emotional but peripheral to the structural problems you need to identify.' },
    { id: 'z5_speaker', name: 'PA Speaker', relevant: false, x: 0.10, y: 0.65, icon: 'regulator',
      title: 'Dead PA Speaker',
      body: 'Public address speaker mounted on a pole. Has not worked since 2021. Used to play morning ragas for walkers.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Amenity infrastructure loss is sad but not the investigation priority.' },
    { id: 'z5_flag', name: 'Event Flag', relevant: false, x: 0.92, y: 0.12, icon: 'flag',
      title: 'Marathon Event Flag',
      body: 'A flag from the 2022 Madurai Mini Marathon. The event used this track. Left behind and now faded.',
      consequence: 'wasted',
      meaning: 'Event artifacts are nostalgic but not clues.' },
    { id: 'z5_cart', name: 'Vendor Cart', relevant: false, x: 0.52, y: 0.20, icon: 'cart',
      title: 'Coconut Water Cart',
      body: 'An informal coconut water seller. Popular with morning walkers. Does not obstruct the track.',
      consequence: 'bureaucratic',
      meaning: 'Not every informal presence is a problem. This vendor serves a genuine need without causing harm.' },
  ],
};

// ---------------------------------------------------------------------------
// Z6 -- Playground (2015 equipment unmaintained)
// ---------------------------------------------------------------------------

const z6: InvestigationZone = {
  id: 'z6',
  title: 'Playground',
  engineZoneId: 'playground',
  difficulty: 4,
  backgroundGradient: '#2d2520',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z6_chains', name: 'Rusted Chains', relevant: true, x: 0.30, y: 0.45, icon: 'pipe',
      title: 'Swing Set Rusted Chains',
      body: '40% corrosion on load-bearing chains. Rs 35K replacement cost. The chains were last inspected in 2018. Corrosion has weakened the links to the point where a 30kg child could cause a failure.',
      resourceHint: 'Material',
      meaning: 'Safety-critical hardware has a maintenance schedule that cannot be skipped. Rs 35K is the cost of preventing a catastrophic injury.' },
    { id: 'z6_slide', name: 'Cracked Slide', relevant: true, x: 0.55, y: 0.35, icon: 'ramp',
      title: 'Slide Structural Crack',
      body: '15cm crack in the slide body. TSEDA flagged in Nov 2023 safety inspection. The crack runs along a stress point and could split under load. Despite the inspection report, no repair order has been raised.',
      resourceHint: 'Material',
      meaning: 'Documented safety violations without corrective action create institutional liability. The inspection report exists — the follow-up does not.' },
    { id: 'z6_concrete', name: 'Exposed Concrete', relevant: true, x: 0.75, y: 0.60, icon: 'grate',
      title: 'Missing Safety Surfacing',
      body: '60% of fall zones have exposed concrete. The original rubber safety tiles were installed in 2015 and degraded by 2019. No replacement was budgeted. Children fall onto bare concrete.',
      resourceHint: 'Material',
      meaning: 'Safety surfacing is not optional — it is the primary injury prevention measure in playgrounds. Exposed concrete in fall zones is negligence.' },
    { id: 'z6_injuries', name: 'Injury Reports', relevant: true, x: 0.20, y: 0.70, icon: 'report',
      title: 'Playground Injury Log',
      body: 'Fractured wrist (Aug 2023, age 8) + lacerated knee (Oct 2023, age 6). Both from falls onto exposed concrete. The parents reported to the park office. No incident report was filed with the Corporation.',
      resourceHint: 'Knowledge',
      meaning: 'Unreported injuries mask the severity of the safety crisis. Without data, the Corporation cannot justify emergency repairs.' },
    { id: 'z6_parent', name: 'Parent Petition', relevant: true, x: 0.45, y: 0.80, icon: 'petition',
      title: 'Parent Safety Petition',
      body: '42 signatures from parents, Dec 2023. Demands immediate closure until safety surfacing is restored. Submitted to Ward Councillor and TSEDA. Acknowledgment received from TSEDA only.',
      resourceHint: 'Volunteer',
      meaning: 'Parents are organizing around child safety. 42 signatures on a playground petition is significant — these are votes.' },
    { id: 'z6_schedule', name: 'Maintenance Log', relevant: true, x: 0.85, y: 0.30, icon: 'folder',
      title: 'Missed Maintenance Schedule',
      body: '16 scheduled maintenance visits missed since Mar 2020. The playground maintenance contract was not renewed after COVID lockdowns. No contractor has been appointed since.',
      resourceHint: 'Knowledge',
      meaning: 'COVID disrupted maintenance contracts that were never re-established. The gap is now 4 years and growing.' },
    { id: 'z6_altpark', name: 'Alt Park Data', relevant: true, x: 0.65, y: 0.15, icon: 'map',
      title: 'Tamukkam Park Comparison',
      body: 'Tamukkam Grounds playground (3km away) saw 40% usage increase since this playground deteriorated. Parents are driving further for safe play equipment. This park is losing its child demographic.',
      resourceHint: 'Knowledge',
      meaning: 'Competition data proves demand exists — families want playgrounds. They are choosing safer alternatives, not staying home.' },
    // 5 irrelevant
    { id: 'z6_mural', name: 'Playground Mural', relevant: false, x: 0.10, y: 0.25, icon: 'mural',
      title: 'Animal Mural Wall',
      body: 'A colorful mural of animals painted on the boundary wall. Cheerful and well-maintained by a local artist volunteer.',
      consequence: 'distracted',
      meaning: 'The mural makes the playground look inviting, which may actually be dangerous — it attracts children to unsafe equipment.' },
    { id: 'z6_sandbox', name: 'Sand Pit', relevant: false, x: 0.40, y: 0.55, icon: 'box',
      title: 'Neglected Sand Pit',
      body: 'Sand pit with hardened, compacted sand. Needs fresh sand but is otherwise safe — no height or impact risk.',
      consequence: 'wasted',
      meaning: 'The sand pit is a low-priority issue compared to fall zone safety and structural equipment failures.' },
    { id: 'z6_lamp', name: 'Play Area Light', relevant: false, x: 0.90, y: 0.50, icon: 'lamp',
      title: 'Working Flood Light',
      body: 'One of two flood lights still working. Illuminates the playground in the evening.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Working infrastructure does not need investigation. Focus on what is broken and dangerous.' },
    { id: 'z6_cooler', name: 'Water Tap', relevant: false, x: 0.15, y: 0.85, icon: 'cooler',
      title: 'Dripping Water Tap',
      body: 'A tap near the playground entrance drips constantly. Wastes water but is not a safety hazard.',
      consequence: 'awareness',
      meaning: 'Water waste is concerning but peripheral to the child safety emergency.' },
    { id: 'z6_sign', name: 'Age Limit Sign', relevant: false, x: 0.50, y: 0.10, icon: 'sign',
      title: 'Equipment Age Limit Sign',
      body: '"Suitable for ages 5-12." The sign is accurate but unenforceable. The real question is whether the equipment is suitable for anyone.',
      consequence: 'bureaucratic',
      meaning: 'Regulatory signage without enforcement is a liability shield, not a safety measure.' },
  ],
};

// ---------------------------------------------------------------------------
// Z13 -- PPP Zone (Rs 2.3 crore stalled project)
// ---------------------------------------------------------------------------

const z13: InvestigationZone = {
  id: 'z13',
  title: 'PPP Development Zone',
  engineZoneId: 'ppp_zone',
  difficulty: 5,
  backgroundGradient: '#282420',
  hasWater: false,
  objects: [
    // 7 relevant
    { id: 'z13_rti', name: 'RTI Documents', relevant: true, x: 0.25, y: 0.40, icon: 'folder',
      title: 'RTI Disclosure Documents',
      body: '3 RTI applications revealed Rs 40L advance payment to the private developer in 2021. No work has commenced. The developer claims "force majeure" due to COVID but the advance was disbursed 6 months after lockdowns ended.',
      resourceHint: 'Knowledge',
      meaning: 'RTI reveals what official channels hide. Rs 40L of public money was advanced for work that never started. Recovery requires legal action.' },
    { id: 'z13_soil', name: 'Soil Report', relevant: true, x: 0.55, y: 0.30, icon: 'flask',
      title: 'Contaminated Soil Report',
      body: 'Rs 15L remediation needed. Both Corporation and developer refuse to pay. Previous construction left heavy metal contamination. TNPCB flagged the site but the remediation responsibility is disputed.',
      resourceHint: 'Budget',
      meaning: 'Environmental liability is the hidden cost of PPP failures. Neither party wants to pay for cleanup, so the contamination persists.' },
    { id: 'z13_contract', name: 'PPP Contract', relevant: true, x: 0.75, y: 0.55, icon: 'report',
      title: 'PPP Contract Analysis',
      body: '30-year lease with force majeure clause. Developer invoked this to halt construction indefinitely while retaining the Rs 40L advance and exclusive site rights. The contract has no performance guarantees.',
      resourceHint: 'Knowledge',
      meaning: 'Poorly drafted contracts protect the private party. No performance guarantees means no mechanism to compel action or recover public funds.' },
    { id: 'z13_community', name: 'Community Plan', relevant: true, x: 0.40, y: 0.68, icon: 'map',
      title: 'Community Alternative Plan',
      body: '0.8 acres public green + 0.4 cultural center, Rs 18L total. The Periyar Nagar Residents Association drafted an alternative that would cost less than the stalled PPP and serve community needs directly.',
      resourceHint: 'Budget',
      meaning: 'Community alternatives often outperform PPP designs for public benefit. Rs 18L for a park and cultural center vs Rs 2.3 crore for a commercial complex.' },
    { id: 'z13_debris', name: 'Construction Debris', relevant: true, x: 0.15, y: 0.58, icon: 'grate',
      title: 'Abandoned Debris Field',
      body: '1.2 acres of construction debris, Rs 6L removal cost. The developer cleared the site partially in 2021, left debris, and never returned. The debris leaches into groundwater and blocks drainage.',
      resourceHint: 'Material',
      meaning: 'Abandoned construction sites are environmental hazards. The developer should pay for cleanup but has no contractual obligation to do so.' },
    { id: 'z13_revenue', name: 'Revenue Analysis', relevant: true, x: 0.82, y: 0.35, icon: 'counter',
      title: 'Revenue Impact Assessment',
      body: 'Rs 12L/yr Corporation revenue from the stalled site (parking, events) vs Rs 18L/yr permanent revenue loss if the 30-year lease continues. The PPP deal costs the Corporation more than doing nothing.',
      resourceHint: 'Budget',
      meaning: 'Opportunity cost analysis reveals the true price of inaction. The lease bleeds Rs 6L/yr in net lost revenue.' },
    { id: 'z13_minutes', name: 'Council Minutes', relevant: true, x: 0.60, y: 0.80, icon: 'petition',
      title: 'Council Meeting Minutes',
      body: 'Approved without community consultation in 2021. The minutes show the PPP was approved in a 15-minute agenda item with no public hearing. Three councillors noted objections but were overruled.',
      resourceHint: 'Knowledge',
      meaning: 'Procedural shortcuts in approving long-term contracts create lasting damage. 30-year decisions made in 15 minutes.' },
    // 5 irrelevant
    { id: 'z13_hoarding', name: 'Project Hoarding', relevant: false, x: 0.35, y: 0.15, icon: 'sign',
      title: 'Faded Project Hoarding',
      body: 'A large hoarding announces "Coming Soon: Madurai Smart Recreation Hub." The rendering shows a glass-and-steel complex. The hoarding is 3 years old and fading.',
      consequence: 'distracted',
      meaning: 'Promotional materials for stalled projects are propaganda, not evidence. The gap between the rendering and reality is the investigation.' },
    { id: 'z13_guard', name: 'Guard Post', relevant: false, x: 0.88, y: 0.70, icon: 'booth',
      title: 'Abandoned Guard Post',
      body: 'A security guard post at the site entrance. No guard has been posted since 2022. The door is padlocked.',
      consequence: 'wasted',
      meaning: 'Security infrastructure for an abandoned site is a sunk cost.' },
    { id: 'z13_lamp', name: 'Site Lamp', relevant: false, x: 0.10, y: 0.20, icon: 'lamp',
      title: 'Construction Site Lamp',
      body: 'A portable construction lamp, unpowered. Left behind by the contractor along with the debris.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Abandoned equipment is evidence of abandonment, not a clue to resolution.' },
    { id: 'z13_fence', name: 'Broken Fence', relevant: false, x: 0.70, y: 0.12, icon: 'rules',
      title: 'Damaged Perimeter Fence',
      body: 'Chain-link fence with multiple gaps. Local residents use the site as a shortcut. The fence was installed by the developer and is their responsibility to maintain.',
      consequence: 'bureaucratic',
      meaning: 'Boundary maintenance disputes are common in PPP zones. The fence is a symptom of the larger governance failure.' },
    { id: 'z13_weeds', name: 'Overgrown Weeds', relevant: false, x: 0.48, y: 0.48, icon: 'pipe',
      title: 'Invasive Weed Growth',
      body: 'Parthenium and Congress grass have colonized the abandoned site. Allergenic and unsightly but a natural consequence of abandonment, not a cause.',
      consequence: 'awareness',
      meaning: 'Nature reclaims abandoned spaces quickly. The weeds are a visual reminder of institutional failure, not a problem to solve independently.' },
  ],
};

// ---------------------------------------------------------------------------
// Zone Registry
// ---------------------------------------------------------------------------

export const ZONES_INVESTIGATION: Record<string, InvestigationZone> = {
  z1, z2, z3, z4, z5, z6, z13,
};

export function getInvestigationZone(zoneId: string): InvestigationZone {
  const zone = ZONES_INVESTIGATION[zoneId];
  if (!zone) {
    console.warn(`Investigation zone "${zoneId}" not found, falling back to z3`);
    return z3;
  }
  return zone;
}

/** Map engine zone IDs to investigation zone IDs */
const ENGINE_TO_INVESTIGATION: Record<string, string> = {
  boating_pond: 'z3',
  main_entrance: 'z1',
  fountain_plaza: 'z2',
  herbal_garden: 'z4',
  walking_track: 'z5',
  playground: 'z6',
  ppp_zone: 'z13',
};

export function getInvestigationZoneIdFromEngine(engineZoneId: string): string {
  return ENGINE_TO_INVESTIGATION[engineZoneId] || 'z3';
}
