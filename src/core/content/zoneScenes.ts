/**
 * zoneScenes.ts -- Zone Investigation Scene Configuration
 *
 * Dark atmospheric investigation scenes for each park zone.
 * Each zone has 12 objects (7 relevant + 5 irrelevant) with
 * complete Madurai-specific clue/consequence text.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoneObject {
  idx: number;
  name: string;
  relevant: boolean;
  x: number;
  y: number;
  rot: number;
  icon: string;
  title: string;
  body: string;
  resourceHint?: string;
  meaning?: string;
  consequence?: 'timer' | 'distracted' | 'awareness' | 'wasted' | 'bureau';
  timerLoss?: number;
}

export interface ZoneConfig {
  id: string;
  title: string;
  engineZoneId: string;
  atmosphereBg: string;
  islandGrass: string;
  islandSide: string;
  islandStyle: string;
  hasWater: boolean;
  features: string[];
  vegetation: string[];
  objects: ZoneObject[];
}

// Legacy aliases for backward compatibility
export type SceneObject = ZoneObject;
export interface ZoneScene {
  zoneId: string;
  engineZoneId: string;
  name: string;
  description: string;
  skyColor: string;
  groundColor: string;
  waterColor?: string;
  objects: SceneObject[];
  ambientAnimations: string[];
}

// ---------------------------------------------------------------------------
// Z1 -- Main Entrance & Parking (vendor encroachment)
// ---------------------------------------------------------------------------

const z1: ZoneConfig = {
  id: 'z1',
  title: 'Main Entrance & Parking',
  engineZoneId: 'main_entrance',
  atmosphereBg: '#3D322A',
  islandGrass: '#C8B070',
  islandSide: '#8B7355',
  islandStyle: 'paved',
  hasWater: false,
  features: ['gate_arch', 'parking_lot', 'ticket_window'],
  vegetation: ['potted_bougainvillea', 'neem_tree'],
  objects: [
    { idx: 0, name: 'Wheelchair Ramp Crack', relevant: true, x: 15, y: 60, rot: -3, icon: 'ramp',
      title: 'Cracked Wheelchair Ramp',
      body: 'The ramp poured in 2018 by Madurai Corporation Ward 74 funds has a 12-cm crack running its full length. Rainwater seeps in and the rebar is exposed. The accessibility audit filed by the District Disability Rehabilitation Centre in Jan 2023 flagged this — no action was taken. Without ramp access the park excludes 4,200 registered wheelchair users in Madurai district.',
      resourceHint: 'Knowledge',
      meaning: 'Accessibility infrastructure that fails is worse than none — it signals false inclusion. Repair cost is under Rs 45,000 but requires Corporation work-order approval.' },
    { idx: 1, name: 'Vendor License Board', relevant: true, x: 35, y: 30, rot: 2, icon: 'license',
      title: 'Vendor License Display Board',
      body: 'A board near the gate lists 6 licensed vendor slots. But you count 14 stalls physically present. The 8 unlicensed vendors pay no rent and block the entrance pathway, forcing visitors onto the road. Revenue leakage: approx Rs 2.4 lakh/year. The licensed vendors filed a complaint with the Madurai Corporation Commissioner in March 2022 — still pending.',
      resourceHint: 'Budget',
      meaning: 'Encroachment is not just a nuisance — it is a governance failure that costs revenue and creates safety hazards. Enforcement requires political will, not money.' },
    { idx: 2, name: 'Footfall Counter', relevant: true, x: 55, y: 45, rot: 0, icon: 'counter',
      title: 'Broken Digital Footfall Counter',
      body: 'Installed in 2020 under Smart City Madurai Phase II at Rs 1.8 lakh. The display has been blank since Aug 2021. Without footfall data the park cannot justify budget requests — the Corporation assumes low usage. Actual weekend footfall (manual count by NSS volunteers, Oct 2023) exceeds 1,800 visitors.',
      resourceHint: 'Knowledge',
      meaning: 'Data infrastructure that fails silently is dangerous — decisions get made on assumptions. Fixing this counter costs Rs 12,000 but unlocks evidence for budget proposals.' },
    { idx: 3, name: 'Parking Bollard', relevant: true, x: 75, y: 65, rot: 5, icon: 'bollard',
      title: 'Missing Parking Bollards',
      body: 'Of 24 original bollards separating the parking area from the pedestrian path, only 9 remain. Two-wheelers now park directly on the walking path. An elderly visitor fractured her hip in Nov 2023 after tripping over a parked scooter. The incident was reported to Tallakulam police station but no FIR was filed.',
      resourceHint: 'Material',
      meaning: 'Missing street furniture creates liability. Replacement cost: Rs 1,200 per bollard. The real barrier is not cost but the absence of an asset register that tracks what is missing.' },
    { idx: 4, name: 'Faded Signage', relevant: true, x: 20, y: 35, rot: -1, icon: 'sign',
      title: 'Illegible Entry Signage',
      body: 'The main sign — "Periyar Nagar Eco-Park, Est. 2005, Madurai Corporation" — is sun-bleached to near invisibility. Visitors on Bypas Road cannot identify the park entrance. Google Maps still shows the pre-2019 gate location 200m south. First-time visitors report driving past the park an average of 1.3 times before finding the gate.',
      resourceHint: 'Volunteer',
      meaning: 'Wayfinding failure suppresses footfall, which suppresses revenue, which suppresses maintenance budgets. A virtuous cycle starts with a visible sign.' },
    { idx: 5, name: 'CCTV Junction Box', relevant: true, x: 88, y: 25, rot: 0, icon: 'cctv',
      title: 'Dead CCTV Junction Box',
      body: 'Eight CCTV cameras were installed in 2021 under TN Safe City Project at Rs 6.2 lakh. The junction box near the gate shows all 8 feeds offline — the annual maintenance contract with Bharat Electronics expired in March 2023 and was not renewed. Without surveillance the park reports 3x the petty theft rate of nearby Tamukkam Grounds.',
      resourceHint: 'Knowledge',
      meaning: 'Security infrastructure without maintenance contracts is a sunk cost. The cameras exist but produce zero safety value. AMC renewal costs Rs 48,000/year.' },
    { idx: 6, name: 'Drainage Grate', relevant: true, x: 45, y: 80, rot: 8, icon: 'grate',
      title: 'Blocked Entrance Drainage Grate',
      body: 'The main drainage grate at the entrance is 70% blocked with compacted waste — plastic bags, coconut shells, and construction debris. During the Oct 2023 northeast monsoon, water pooled 15cm deep at the gate for 3 days, turning away an estimated 600 visitors. The blockage feeds contaminated runoff toward the Boating Pond via the underground channel.',
      resourceHint: 'Material',
      meaning: 'Entrance drainage connects to the entire park water system. This single grate, if cleared, would reduce flood pooling at the gate and cut nutrient inflow to Z3 by an estimated 20%.' },
    { idx: 7, name: 'Flower Seller Cart', relevant: false, x: 62, y: 20, rot: -4, icon: 'cart',
      title: 'Flower Seller Cart',
      body: 'A jasmine and kanakambaram seller has been here for 15 years. She pays no rent but is well-loved by visitors. Her cart is tidy and does not block the path.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Not every informal presence is encroachment. Distinguishing between harmful and benign informality requires judgement, not blanket enforcement.' },
    { idx: 8, name: 'Painted Mural', relevant: false, x: 30, y: 70, rot: 0, icon: 'mural',
      title: 'Welcome Mural',
      body: 'A cheerful mural painted by Madurai School of Art students in 2022. It depicts Meenakshi Amman Temple and Vaigai River. Attractive but irrelevant to the encroachment crisis.',
      consequence: 'distracted',
      meaning: 'Aesthetic assets can distract from structural failures. The mural is charming — and completely unrelated to why the entrance is dysfunctional.' },
    { idx: 9, name: 'Suggestion Box', relevant: false, x: 82, y: 50, rot: 2, icon: 'box',
      title: 'Locked Suggestion Box',
      body: 'A metal suggestion box labelled "Your Feedback Matters." The lock is rusted shut and has not been opened in at least two years. No one processes the feedback.',
      consequence: 'bureau',
      meaning: 'Participation theatre — the box exists to signal responsiveness but delivers none. Real feedback requires channels that are actually monitored.' },
    { idx: 10, name: 'Water Cooler', relevant: false, x: 48, y: 55, rot: 0, icon: 'cooler',
      title: 'Empty Water Cooler',
      body: 'A stainless steel water cooler donated by Rotary Club Madurai Central in 2019. It has been dry for months — the water connection was cut when unpaid bills accumulated to Rs 8,400.',
      consequence: 'wasted',
      meaning: 'Donated assets without operational budgets become monuments to good intentions. The cooler is a distraction from the entrance-level problems you need to investigate.' },
    { idx: 11, name: 'Old Flagpole', relevant: false, x: 10, y: 15, rot: -2, icon: 'flag',
      title: 'Bare Flagpole',
      body: 'A flagpole with no flag. The rope is frayed and the base is chipped. It looks neglected but has no bearing on the vendor encroachment or access problems.',
      consequence: 'awareness',
      meaning: 'Neglect signals accumulate — each one primes you to see more neglect. Use that awareness to focus on structural issues, not cosmetic ones.' },
  ],
};

// ---------------------------------------------------------------------------
// Z2 -- Fountain Plaza (dead fountain)
// ---------------------------------------------------------------------------

const z2: ZoneConfig = {
  id: 'z2',
  title: 'Fountain Plaza',
  engineZoneId: 'fountain_plaza',
  atmosphereBg: '#2E2E36',
  islandGrass: '#A0A0A0',
  islandSide: '#6B6B6B',
  islandStyle: 'stone',
  hasWater: false,
  features: ['fountain_basin', 'stone_benches', 'plaza_tiles'],
  vegetation: ['moss_patches', 'dead_hedge'],
  objects: [
    { idx: 0, name: 'Burnt Pump Motor', relevant: true, x: 50, y: 50, rot: 0, icon: 'pump',
      title: 'Burnt Fountain Pump Motor',
      body: 'The 3HP submersible pump that drove the fountain burned out in June 2022 after a voltage surge. Replacement cost: Rs 38,000. Three purchase orders were raised and all three were returned by the Madurai Corporation accounts section for "insufficient documentation." The fountain has been dry for 22 months.',
      resourceHint: 'Material',
      meaning: 'Procurement bureaucracy can kill a simple repair. The cost is trivial relative to the park budget — the bottleneck is paperwork, not money.' },
    { idx: 1, name: 'SPV Correspondence File', relevant: true, x: 25, y: 35, rot: -5, icon: 'folder',
      title: 'Special Purpose Vehicle Correspondence',
      body: 'A water-stained file folder tucked behind the fountain basin contains letters between the Park Administrator and the Smart City SPV office. The SPV approved Rs 4.5 lakh for fountain restoration in Dec 2021 but required a "utilisation certificate" for the previous Rs 2.1 lakh LED lighting grant first. That certificate was never filed. The fountain money lapsed.',
      resourceHint: 'Budget',
      meaning: 'Cascading compliance failures: one missing document blocked a completely unrelated fund. This is systemic — fixing the fountain requires clearing the paperwork backlog first.' },
    { idx: 2, name: 'Voltage Regulator', relevant: true, x: 72, y: 60, rot: 3, icon: 'regulator',
      title: 'Missing Voltage Regulator',
      body: 'The electrical panel shows an empty slot where a voltage regulator should be. Without it, power surges from the TNEB Madurai South substation (documented 14 times in 2022 alone) go directly to the pump. The burnt motor is a symptom — the absent regulator is the cause.',
      resourceHint: 'Knowledge',
      meaning: 'Replacing the pump without installing a voltage regulator guarantees another burnout. Root cause analysis prevents repeat failures.' },
    { idx: 3, name: 'Water Quality Report', relevant: true, x: 40, y: 25, rot: -2, icon: 'report',
      title: 'Fountain Basin Water Quality Report',
      body: 'A laminated report from Tamil Nadu Pollution Control Board dated Feb 2023 shows the stagnant basin water has coliform bacteria 8x the safe limit. Children were observed wading in the basin as recently as last week. The report was addressed to the Park Superintendent — it has been read (coffee ring on page 2) but no action taken.',
      resourceHint: 'Knowledge',
      meaning: 'Known hazards without response create liability. The report exists, the risk is documented, but institutional inertia has prevented action.' },
    { idx: 4, name: 'Cracked Basin Tile', relevant: true, x: 60, y: 75, rot: 6, icon: 'tile',
      title: 'Cracked Fountain Basin Tiles',
      body: 'Italian ceramic tiles installed during the 2005 inauguration are now 40% cracked or missing. Water leaks through the cracks into the soil below, creating subsidence risk for the adjacent walkway. A structural engineer from Thiagarajar College estimated repair at Rs 1.2 lakh in 2022 — quote expired, no new one obtained.',
      resourceHint: 'Material',
      meaning: 'Deferred maintenance compounds: cracked tiles cause water loss, water loss causes subsidence, subsidence threatens the walkway. Each delay multiplies the repair cost.' },
    { idx: 5, name: 'Community Petition', relevant: true, x: 15, y: 55, rot: -1, icon: 'petition',
      title: 'Signed Community Petition',
      body: 'A petition with 342 signatures collected by the Fountain Plaza Residents Welfare Association in Aug 2023, requesting fountain restoration. It was submitted to the Ward Councillor, the Corporation Commissioner, and the District Collector. No acknowledgment received from any office.',
      resourceHint: 'Volunteer',
      meaning: '342 signatures represent organised community demand — a latent political resource. The petition failed because it targeted the wrong decision point. The SPV, not the Corporation, holds the restoration budget.' },
    { idx: 6, name: 'Drainage Channel', relevant: true, x: 85, y: 40, rot: 4, icon: 'channel',
      title: 'Overflow Drainage Channel',
      body: 'The fountain overflow channel that once carried excess water to the Boating Pond is dry and clogged with debris. When the fountain operated, this channel maintained the Z3 pond water level during summer. Its failure means the pond relies entirely on monsoon recharge — making it vulnerable to the algae boom-bust cycle.',
      resourceHint: 'Knowledge',
      meaning: 'The fountain is hydraulically connected to the Boating Pond. Restoring it would provide a secondary water source for Z3, reducing algae concentration during dry months.' },
    { idx: 7, name: 'Decorative Lamp', relevant: false, x: 33, y: 15, rot: 0, icon: 'lamp',
      title: 'Decorative Plaza Lamp',
      body: 'A brass-finish lamp post with a flickering LED bulb. Cosmetically worn but still functional. It illuminates the plaza at night but has no connection to the fountain failure.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Lighting maintenance is important but not during a fountain investigation. Prioritise infrastructure over ambience.' },
    { idx: 8, name: 'Pigeon Droppings', relevant: false, x: 68, y: 18, rot: 0, icon: 'droppings',
      title: 'Pigeon Colony Evidence',
      body: 'Heavy pigeon droppings coat the fountain rim. Unsightly and unsanitary, but the pigeons arrived after the fountain died — they are a symptom of disuse, not a cause of failure.',
      consequence: 'distracted',
      meaning: 'Symptoms often look like causes. The pigeons colonised because the fountain stopped — removing them without restoring water flow solves nothing.' },
    { idx: 9, name: 'Brass Plaque', relevant: false, x: 48, y: 85, rot: 1, icon: 'plaque',
      title: 'Inauguration Brass Plaque',
      body: '"Inaugurated by Hon. Mayor Thiru. K. Shanmugam, 14 Jan 2005." The plaque is polished — someone still maintains it even though the fountain itself is dead.',
      consequence: 'bureau',
      meaning: 'Symbolic maintenance (polishing plaques) while substantive infrastructure rots is a common pattern in bureaucratic systems.' },
    { idx: 10, name: 'Broken Bench', relevant: false, x: 80, y: 80, rot: -3, icon: 'bench',
      title: 'Broken Stone Bench',
      body: 'A stone bench with one leg cracked. It still supports weight but wobbles. A minor furniture issue unrelated to the fountain crisis.',
      consequence: 'wasted',
      meaning: 'Park furniture problems are real but should not compete for attention during a systems investigation.' },
    { idx: 11, name: 'Event Banner', relevant: false, x: 12, y: 80, rot: 2, icon: 'banner',
      title: 'Torn Event Banner',
      body: 'A faded banner advertising "Pongal Vizha 2023 — Fountain Plaza." The event happened despite the dead fountain. Visitors complained on social media.',
      consequence: 'awareness',
      meaning: 'Events held in broken venues generate negative publicity. This banner is a reminder that inaction has reputational costs — but it is not a clue.' },
  ],
};

// ---------------------------------------------------------------------------
// Z3 -- Boating Pond (algae bloom) -- ported from original
// ---------------------------------------------------------------------------

const z3: ZoneConfig = {
  id: 'z3',
  title: 'Boating Pond',
  engineZoneId: 'boating_pond',
  atmosphereBg: '#1E2E1E',
  islandGrass: '#4A6B3A',
  islandSide: '#2E3E1E',
  islandStyle: 'muddy',
  hasWater: true,
  features: ['pond_surface', 'wooden_bridge', 'reed_bank'],
  vegetation: ['algae_mat', 'cattails', 'water_hyacinth'],
  objects: [
    { idx: 0, name: 'Cracked Storm-Water Pipe', relevant: true, x: 7, y: 54, rot: -12, icon: 'pipe',
      title: 'Cracked Storm-Water Pipe',
      body: 'This pipe has been leaking since at least 2019. Municipal records show a repair request was filed but never actioned. Untreated runoff carrying lawn fertiliser and road grit flows directly into the pond, feeding the algae bloom. The groundwater table has shifted, spreading contamination toward the Herbal Garden.',
      resourceHint: 'Knowledge',
      meaning: 'Drainage has been blocked for years. The algae bloom is not a sudden event — it is the cumulative result of deferred maintenance. Any solution must address this pipe before surface treatments will hold.' },
    { idx: 1, name: 'Abandoned Toy Sailboat', relevant: true, x: 71, y: 60, rot: 15, icon: 'boat',
      title: 'Abandoned Toy Sailboat',
      body: 'A faded red toy sailboat bobs against the reeds. Families used to spend weekends here. Now the pond is too polluted for children to play near the water. Local parent groups have been vocal about the decline on social media — they represent an untapped volunteer base if the pond can be made safe again.',
      resourceHint: 'Volunteer',
      meaning: 'The families who left are a latent capability. Restoring the pond could mobilise community volunteers, but only if trust is rebuilt through visible, sustained improvement — not a one-off cleanup.' },
    { idx: 2, name: 'Faded Municipal Sign', relevant: true, x: 79, y: 26, rot: 3, icon: 'sign',
      title: 'Faded Municipal Beautification Sign',
      body: 'The sign reads: "Boating Pond Beautification Project — Phase 1 Target: March 2022." Phase 1 never started. The project was scoped as all-or-nothing: full dredging plus new landscaping. When the full Rs 12 lakh budget could not be secured from Madurai Corporation, the entire plan was shelved. No intermediate milestones were defined.',
      resourceHint: 'Budget',
      meaning: 'This is a textbook case for graduated outcomes. An all-or-nothing approach guaranteed failure when resources fell short. A phased plan — pipe repair first, then bio-filtration, then dredging — could deliver incremental improvements even under budget constraints.' },
    { idx: 3, name: 'Hidden Maintenance Closet', relevant: true, x: 88, y: 50, rot: 0, icon: 'closet',
      title: 'Maintenance Closet Behind the Bushes',
      body: 'Behind overgrown hedges you find a padlocked closet. Inside: PVC pipe sections, sealant, a pump motor, and coiled mesh — supplies ordered for the abandoned beautification project. They have been sitting here unused for over three years. Everything is still serviceable.',
      resourceHint: 'Material',
      meaning: 'You gain +1 Material resource. These forgotten supplies can be repurposed immediately, reducing the cost of the pipe repair phase. Resources are often closer than they appear — the bottleneck is coordination, not scarcity.' },
    { idx: 4, name: 'Underground Pipe Junction', relevant: true, x: 15, y: 74, rot: 0, icon: 'grate',
      title: 'Pipe Junction -- Shared Drainage Line',
      body: 'A cast-iron grate covers a junction where the pond overflow channel meets the main drainage line. This same line feeds into the Herbal Garden irrigation network. Any contaminants in this pond — algae, fertiliser residue, heavy metals — will cascade downstream within two to three rainfall cycles.',
      resourceHint: 'Knowledge',
      meaning: 'The Boating Pond is hydraulically connected to the Herbal Garden (Z6). Neglecting the pond does not just affect this zone — it creates a cascade failure. Fixing the pipe junction first would protect both zones simultaneously.' },
    { idx: 5, name: 'Water Sample Vial', relevant: true, x: 46, y: 69, rot: 0, icon: 'flask',
      title: 'Water Quality Sample',
      body: 'You collect a sample of the murky green water. Even without a lab, the colour and viscosity tell a story: cyanobacteria concentration is visibly extreme. A faded test-strip left by a Thiagarajar College research team reads "4x safe recreational limit." The problem requires drainage repair to stop nutrient inflow AND bio-filtration to process existing contamination.',
      resourceHint: 'Knowledge',
      meaning: 'A single solution will not work. Drainage repair alone will not clear the existing algae. Bio-filtration alone will be overwhelmed by continued nutrient inflow. The combination of both is the minimum viable intervention.' },
    { idx: 6, name: 'Original Drainage Blueprint', relevant: true, x: 17, y: 23, rot: -2, icon: 'board',
      title: 'Original Drainage Design -- 1987',
      body: 'A weathered board pinned under the bridge shows the original 1987 drainage blueprint. The system was designed for a 200-visitor-per-day park with minimal hard surfaces. Current peak footfall exceeds 1,200 visitors and impervious paving has tripled runoff volume. The drains were never upsized.',
      resourceHint: 'Knowledge',
      meaning: 'The original drainage infrastructure was underbuilt relative to current load. Surface-level fixes will fail because the root capacity mismatch remains. Durable solutions require drainage upsizing.' },
    { idx: 7, name: 'Ornamental Lamp Post', relevant: false, x: 92, y: 36, rot: 0, icon: 'lamp',
      title: 'Ornamental Lamp Post',
      body: 'A Victorian-style lamp post. The light still works but the decorative ironwork is rusted. Structurally sound and poses no safety risk.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Cosmetic issues feel urgent because they are visible, but they rarely drive systemic problems. Distinguish between infrastructure failures and aesthetic wear.' },
    { idx: 8, name: 'Abandoned Ticket Booth', relevant: false, x: 65, y: 21, rot: 0, icon: 'booth',
      title: 'Abandoned Ticket Booth',
      body: 'The old boating ticket booth is shuttered and cobwebbed. A laminated price list from 2018 still hangs in the window. A reminder of better days but holds no clue about the current crisis.',
      consequence: 'distracted',
      meaning: 'Commercial infrastructure tells you about economic history but rarely about ecological or engineering failures. Focus on systems that are actively failing.' },
    { idx: 9, name: 'Spray-Painted Graffiti', relevant: false, x: 38, y: 26, rot: 5, icon: 'graffiti',
      title: 'Graffiti Tags on Retaining Wall',
      body: 'Colourful graffiti covers the retaining wall. Most is generic tagging, but one message reads: "FIX THE WATER." Someone in the community already knows where the real problem is.',
      consequence: 'awareness',
      meaning: 'Graffiti is a symptom of neglect, not a cause. But community expressions — even informal ones — can orient your investigation.' },
    { idx: 10, name: 'Broken Park Bench', relevant: false, x: 58, y: 50, rot: -5, icon: 'bench',
      title: 'Broken Park Bench',
      body: 'Two slats are missing and the armrest is cracked. Someone left a soggy newspaper on the seat. Uncomfortable but not dangerous, and unconnected to water quality.',
      consequence: 'wasted',
      meaning: 'Every click is an action, and actions are finite. Before clicking, ask: could this object explain WHY the problem exists or HOW it spreads?' },
    { idx: 11, name: 'Park Rules Signboard', relevant: false, x: 10, y: 29, rot: -1, icon: 'rules',
      title: 'Official Park Rules Signboard',
      body: 'A sign lists 14 park rules including "No swimming" and "No fishing." Rule 11: "All complaints must be submitted in writing to the Municipal Parks Office (allow 6-8 weeks for response)." The sign is perfectly maintained — unlike the pond.',
      consequence: 'bureau',
      meaning: 'Policy documents tell you what is officially allowed, not what is actually happening. Reading rules before examining infrastructure is like checking the dress code while the building is on fire.' },
  ],
};

// ---------------------------------------------------------------------------
// Z4 -- Children's Playground (safety failure)
// ---------------------------------------------------------------------------

const z4: ZoneConfig = {
  id: 'z4',
  title: "Children's Playground",
  engineZoneId: 'playground',
  atmosphereBg: '#3A2E20',
  islandGrass: '#B89858',
  islandSide: '#7A6030',
  islandStyle: 'earth',
  hasWater: false,
  features: ['swing_set', 'slide', 'seesaw', 'sand_pit'],
  vegetation: ['dried_grass', 'banyan_sapling'],
  objects: [
    { idx: 0, name: 'Rusted Swing Chains', relevant: true, x: 30, y: 40, rot: -2, icon: 'chain',
      title: 'Rusted Swing Chains',
      body: 'The swing chains show 60% surface corrosion and visible metal fatigue. One link is stretched to twice normal width. A child weighing over 25 kg could snap it. The swings were installed in 2012 by the Madurai Corporation Parks Division — the galvanised coating was rated for 8 years. No replacement has been scheduled despite a safety audit by Anna University civil engineering students in Sept 2023 that rated these chains "critical risk."',
      resourceHint: 'Knowledge',
      meaning: 'Safety infrastructure past its rated lifespan is a liability bomb. The audit exists, the risk is documented, but no one owns the follow-through.' },
    { idx: 1, name: 'Slide Crack', relevant: true, x: 55, y: 35, rot: 5, icon: 'crack',
      title: 'Hairline Crack in Slide Surface',
      body: 'A 45-cm crack runs along the fibreglass slide surface. The sharp edge has already torn two children\'s clothing (parent complaints logged with park office, July and Oct 2023). The slide was manufactured by Funworld Equipments, Coimbatore — warranty expired 2017. Replacement slide costs Rs 65,000; a fibreglass patch costs Rs 4,500.',
      resourceHint: 'Material',
      meaning: 'A Rs 4,500 patch could eliminate the immediate danger while the full replacement is budgeted. Graduated responses save both money and time.' },
    { idx: 2, name: 'Missing Rubber Mat', relevant: true, x: 40, y: 70, rot: 0, icon: 'mat',
      title: 'Missing Safety Rubber Mat',
      body: 'The fall zone under the climbing frame has bare compacted earth where 12mm rubber safety mats should be. The mats were stolen in March 2022. Replacement was quoted at Rs 1.8 lakh by the original supplier (PlaySafe India, Chennai). A local Madurai supplier quoted Rs 1.1 lakh but the purchase order requires three quotes — the third supplier never responded.',
      resourceHint: 'Budget',
      meaning: 'Three-quote procurement rules designed to prevent corruption are preventing a safety-critical purchase. The process is working as designed but failing in practice.' },
    { idx: 3, name: 'Seesaw Pivot Bolt', relevant: true, x: 70, y: 55, rot: 8, icon: 'bolt',
      title: 'Worn Seesaw Pivot Bolt',
      body: 'The central pivot bolt on the seesaw is worn to half its original diameter. The seesaw wobbles laterally — a pinch hazard for small fingers. The bolt is a standard M16 hex bolt available at any Madurai hardware shop for Rs 85. No one has replaced it because playground maintenance has no petty cash allocation.',
      resourceHint: 'Material',
      meaning: 'An Rs 85 bolt stands between a child and a crushing injury. The absence of petty cash for minor repairs creates outsized safety risks.' },
    { idx: 4, name: 'Incident Register', relevant: true, x: 20, y: 25, rot: -3, icon: 'register',
      title: 'Playground Incident Register',
      body: 'A hardbound register in the park office shows 23 reported injuries in the playground between Jan 2022 and Dec 2023. Seven required hospital visits. The register was started after a directive from the Madurai District Collector but no one reviews it. Patterns are clear: 80% of injuries involve the swing or slide — the two items flagged in the safety audit.',
      resourceHint: 'Knowledge',
      meaning: 'Data collection without analysis is record-keeping theatre. The patterns are obvious to anyone who reads the register — the problem is that no one does.' },
    { idx: 5, name: 'Faded Age Limit Sign', relevant: true, x: 85, y: 30, rot: 1, icon: 'sign',
      title: 'Faded Age Restriction Sign',
      body: 'A sign reading "For Children 3-12 Years Only" is barely visible. Teenagers regularly use the equipment, exceeding its weight rating. The sign was last repainted in 2016. More critically, there is no attendant — the playground attendant post has been vacant since the previous occupant retired in 2020.',
      resourceHint: 'Volunteer',
      meaning: 'Signage without enforcement is decoration. A volunteer attendant roster from nearby schools could fill the supervision gap at zero cost.' },
    { idx: 6, name: 'Locked First Aid Box', relevant: true, x: 10, y: 50, rot: 0, icon: 'firstaid',
      title: 'Locked First Aid Box -- Empty',
      body: 'A wall-mounted first aid box is padlocked. The key is "with the supervisor" who is not present. When finally opened (by a parent with a screwdriver, as noted in the incident register), it contained only empty wrappers and an expired antiseptic bottle from 2021.',
      resourceHint: 'Material',
      meaning: 'Emergency resources that are locked, empty, or expired create a false sense of safety. Restocking costs Rs 2,200. The real fix is a refill schedule.' },
    { idx: 7, name: 'Colourful Merry-Go-Round', relevant: false, x: 48, y: 20, rot: 0, icon: 'merrygoround',
      title: 'Manual Merry-Go-Round',
      body: 'A hand-pushed merry-go-round. The paint is chipped but the bearings are smooth and the structure is sound. It is the only piece of equipment in good working order.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Functional equipment does not need investigation time. Focus on what is broken, not what works.' },
    { idx: 8, name: 'Drinking Water Tap', relevant: false, x: 75, y: 80, rot: 0, icon: 'tap',
      title: 'Dripping Water Tap',
      body: 'A tap drips slowly into a muddy puddle. Wasteful, but the water supply is clean and the tap functions. Not related to the equipment safety crisis.',
      consequence: 'distracted',
      meaning: 'Water waste is a maintenance issue, not a safety emergency. Triage means accepting that some problems wait while critical ones are addressed.' },
    { idx: 9, name: 'Sand Pit Edge', relevant: false, x: 60, y: 85, rot: 3, icon: 'sandpit',
      title: 'Sand Pit Border Stones',
      body: 'The concrete border stones around the sand pit have shifted slightly. The sand itself is clean — replaced quarterly by the gardening contractor. Low priority.',
      consequence: 'wasted',
      meaning: 'Minor displacement of border stones is aesthetic, not dangerous. Your investigation action is better spent on the equipment failures.' },
    { idx: 10, name: 'Balloon Seller Hook', relevant: false, x: 25, y: 80, rot: -1, icon: 'hook',
      title: 'Balloon Seller Wall Hook',
      body: 'A metal hook where the balloon seller ties his stock. The seller is a familiar and welcome presence. The hook is firmly mounted.',
      consequence: 'awareness',
      meaning: 'Informal commercial activity in play areas is common. This hook signals that the playground is still used despite its dangers — which makes the safety failures more urgent, not less.' },
    { idx: 11, name: 'Faded Hopscotch', relevant: false, x: 90, y: 65, rot: 0, icon: 'hopscotch',
      title: 'Painted Hopscotch Grid',
      body: 'A hopscotch grid painted on the concrete pad. The paint is fading but the surface is even. Children still use it. No safety concern.',
      consequence: 'bureau',
      meaning: 'Floor markings and painted games are the lowest-risk category of playground infrastructure. Investigating them during a safety audit wastes precious time.' },
  ],
};

// ---------------------------------------------------------------------------
// Z6 -- Herbal Garden (irrigation failure)
// ---------------------------------------------------------------------------

const z6: ZoneConfig = {
  id: 'z6',
  title: 'Herbal Garden',
  engineZoneId: 'herbal_garden',
  atmosphereBg: '#1A2E1A',
  islandGrass: '#2E5E1E',
  islandSide: '#1A3A0E',
  islandStyle: 'loam',
  hasWater: false,
  features: ['raised_beds', 'compost_bin', 'tool_shed'],
  vegetation: ['tulsi', 'neem', 'aloe_vera', 'ashwagandha'],
  objects: [
    { idx: 0, name: 'Dry Irrigation Pipe', relevant: true, x: 35, y: 50, rot: -4, icon: 'pipe',
      title: 'Bone-Dry Drip Irrigation Pipe',
      body: 'The drip irrigation system installed in 2020 under the MGNREGA convergence scheme (Rs 3.2 lakh) is completely dry. The main valve near the borewell was shut off 8 months ago when the TNEB power connection was disconnected for non-payment of Rs 14,600. Eight months of zero irrigation in Madurai summer has killed 40% of the medicinal plants.',
      resourceHint: 'Knowledge',
      meaning: 'A Rs 14,600 electricity bill destroyed Rs 3.2 lakh of infrastructure investment. The cascade: unpaid bill -> power cut -> no irrigation -> plant death -> garden abandonment.' },
    { idx: 1, name: 'Volunteer Attendance Log', relevant: true, x: 55, y: 30, rot: 2, icon: 'log',
      title: 'Volunteer Attendance Log',
      body: 'A register shows 18 regular volunteers from the Siddha Practitioners Association, Madurai Chapter, maintained the garden weekly until April 2023. Entries stop abruptly. A note in the margin: "No water, no point coming." The volunteers did not leave because of disinterest — they left because the infrastructure failed them.',
      resourceHint: 'Volunteer',
      meaning: 'Volunteer attrition is usually a symptom of infrastructure failure, not motivational decline. Restore the water and the volunteers will likely return.' },
    { idx: 2, name: 'Medicinal Plant Label', relevant: true, x: 20, y: 40, rot: -1, icon: 'label',
      title: 'Withered Ashwagandha with Label',
      body: 'A ceramic label reads "Ashwagandha (Withania somnifera) — Donated by CSIR-CIMAP Lucknow, 2020." The plant is desiccated. This was one of 45 rare medicinal cultivars sourced from national research institutes. Replacing them would require fresh MoUs and a 2-year growing cycle. The loss is not just monetary — it is botanical heritage.',
      resourceHint: 'Knowledge',
      meaning: 'Some losses are irreversible within normal timeframes. The ashwagandha can be regrown, but the 2-year delay means the garden loses its educational value in the interim.' },
    { idx: 3, name: 'Borewell Motor', relevant: true, x: 75, y: 60, rot: 0, icon: 'motor',
      title: 'Disconnected Borewell Motor',
      body: 'The 5HP borewell motor sits idle. The TNEB meter box is sealed with a "disconnected" sticker dated Aug 2023. The motor itself is functional — tested manually by the gardening contractor. The sole barrier is the Rs 14,600 outstanding bill plus a Rs 5,000 reconnection fee. Total: Rs 19,600 to restore water to the entire garden.',
      resourceHint: 'Budget',
      meaning: 'Rs 19,600 stands between a dead garden and a living one. This is possibly the highest-impact, lowest-cost intervention in the entire park.' },
    { idx: 4, name: 'Compost Bin Report', relevant: true, x: 45, y: 75, rot: 3, icon: 'compost',
      title: 'Compost Quality Report',
      body: 'A soil test report from Tamil Nadu Agricultural University, Madurai campus, dated May 2023, shows the compost bin is producing high-quality vermicompost. NPK values are excellent. The garden has a free fertiliser source that is going unused because there is no water to sustain the plants that would benefit from it.',
      resourceHint: 'Material',
      meaning: 'The compost is a hidden resource — free, high-quality, and immediately available. But without irrigation it is worthless. Resources without enabling infrastructure are stranded assets.' },
    { idx: 5, name: 'Cascade Warning', relevant: true, x: 10, y: 55, rot: -6, icon: 'warning',
      title: 'Pipe Junction Warning Tag',
      body: 'A red tag on a pipe reads: "CAUTION — Shared line with Boating Pond overflow. Do not open valve during algae season." The Herbal Garden receives overflow water from Z3. When the pond is contaminated, the garden gets contaminated water. When the pond is empty (summer), the garden gets nothing. The dependency is a design flaw from 1987.',
      resourceHint: 'Knowledge',
      meaning: 'Z6 depends on Z3 water quality. Fixing the Herbal Garden without fixing the Boating Pond is futile — contaminated overflow will poison the soil. The zones must be addressed together.' },
    { idx: 6, name: 'Grant Rejection Letter', relevant: true, x: 65, y: 20, rot: 1, icon: 'letter',
      title: 'NABARD Grant Rejection Letter',
      body: 'A letter from NABARD (National Bank for Agriculture and Rural Development) dated Nov 2022 rejects a Rs 8 lakh watershed development grant application because "the applicant entity (Madurai Corporation) is classified as urban, not rural." The garden falls 200 meters inside the Corporation boundary. A panchayat application would have qualified.',
      resourceHint: 'Budget',
      meaning: 'Jurisdictional mismatches block funding. The garden is functionally rural but administratively urban. Creative solutions — like partnering with the adjacent panchayat — could unlock rural development funds.' },
    { idx: 7, name: 'Terracotta Pot', relevant: false, x: 80, y: 40, rot: 0, icon: 'pot',
      title: 'Decorative Terracotta Pot',
      body: 'A large terracotta pot with a dead plant. The pot itself is handcrafted and attractive. It tells you nothing about why the irrigation failed.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Decorative elements draw the eye but rarely contain systemic clues. Save your investigation time for infrastructure objects.' },
    { idx: 8, name: 'Herb Identification Chart', relevant: false, x: 30, y: 15, rot: 0, icon: 'chart',
      title: 'Laminated Herb Chart',
      body: 'A colourful chart showing 30 medicinal herbs with Tamil and Sanskrit names. Educational and well-made. Produced by the District Ayush Department. Irrelevant to the irrigation crisis.',
      consequence: 'distracted',
      meaning: 'Educational signage supports the garden mission but does not explain its failure. Stay focused on water and power infrastructure.' },
    { idx: 9, name: 'Garden Gate Lock', relevant: false, x: 5, y: 35, rot: 0, icon: 'lock',
      title: 'Padlocked Garden Gate',
      body: 'The gate is padlocked during off-hours. The lock is new — replaced after a break-in in June 2023 when Rs 3,000 worth of aloe vera was stolen. Security is adequate now.',
      consequence: 'wasted',
      meaning: 'Security is handled. Investigating the lock consumes an action you could have spent on the irrigation system.' },
    { idx: 10, name: 'Butterfly Mural', relevant: false, x: 50, y: 10, rot: 2, icon: 'mural',
      title: 'Painted Butterfly Mural',
      body: 'A mural showing butterflies and bees among flowers. Painted by NSS volunteers from Lady Doak College, Madurai. Cheerful but uninformative about water supply failures.',
      consequence: 'awareness',
      meaning: 'Community art reflects hope for what the garden could be. That hope is a motivational resource — but right now you need engineering clues, not inspiration.' },
    { idx: 11, name: 'Visitor Register', relevant: false, x: 88, y: 80, rot: -1, icon: 'register',
      title: 'Visitor Feedback Register',
      body: 'A register with visitor comments. Most recent entries: "Very sad to see garden dying" (Oct 2023), "Please bring water back" (Sept 2023). Heartfelt but you already know the problem.',
      consequence: 'bureau',
      meaning: 'Feedback registers confirm what you can see with your eyes. They add emotional weight but not analytical insight during an investigation.' },
  ],
};

// ---------------------------------------------------------------------------
// Z13 -- PPP Development Zone (stalled partnership)
// ---------------------------------------------------------------------------

const z13: ZoneConfig = {
  id: 'z13',
  title: 'PPP Development Zone',
  engineZoneId: 'ppp_zone',
  atmosphereBg: '#2A2A30',
  islandGrass: '#909090',
  islandSide: '#5A5A5A',
  islandStyle: 'concrete',
  hasWater: false,
  features: ['construction_fence', 'foundation_slab', 'site_office'],
  vegetation: ['weeds', 'wild_grass'],
  objects: [
    { idx: 0, name: 'RTI Document', relevant: true, x: 25, y: 35, rot: -3, icon: 'document',
      title: 'RTI Response -- PPP Contract Details',
      body: 'An RTI (Right to Information) response obtained by a local activist reveals the PPP contract terms: M/s GreenVista Infra Pvt Ltd, Chennai, was awarded a 15-year Build-Operate-Transfer concession in 2021 for Rs 2.8 crore. The contract requires the Corporation to provide "encumbrance-free land" — but 0.4 acres of the designated plot is occupied by an informal settlement of 12 families who were not consulted.',
      resourceHint: 'Knowledge',
      meaning: 'The PPP stalled because a precondition (clear land) was promised but not delivered. The 12 families have occupation rights under Tamil Nadu Urban Land Act. Forced eviction would trigger legal challenges and political backlash.' },
    { idx: 1, name: 'Soil Test Report', relevant: true, x: 50, y: 50, rot: 2, icon: 'report',
      title: 'Soil Contamination Report',
      body: 'A geotechnical report by M/s Arun Soil Labs, Madurai, dated March 2023, shows lead contamination at 3x permissible limits in the top 30cm of soil on the PPP plot. The contamination traces to an illegal paint waste dump operated by a now-closed workshop between 2008-2015. Remediation cost: Rs 6-8 lakh. Neither the Corporation nor GreenVista wants to pay.',
      resourceHint: 'Knowledge',
      meaning: 'Hidden environmental liabilities kill PPP deals. The contamination was not in the original site survey (2020) because it tested only at 1-meter depth. Surface testing was skipped to save Rs 15,000.' },
    { idx: 2, name: 'Stalled Foundation', relevant: true, x: 70, y: 65, rot: 5, icon: 'foundation',
      title: 'Abandoned Foundation Slab',
      body: 'A concrete foundation slab — 20m x 15m — was poured in Jan 2022 and has sat exposed since. Rebar is rusting. GreenVista spent Rs 18 lakh on this slab before halting work when the land encumbrance and soil contamination issues surfaced. They are now claiming Rs 22 lakh in "idle asset costs" from the Corporation.',
      resourceHint: 'Budget',
      meaning: 'Sunk costs create perverse incentives. GreenVista wants compensation; the Corporation wants the project to proceed without paying remediation. The stalemate benefits neither party.' },
    { idx: 3, name: 'MoU Draft', relevant: true, x: 35, y: 20, rot: -1, icon: 'mou',
      title: 'Unsigned Revised MoU',
      body: 'A draft revised MoU proposes splitting remediation costs 60:40 (Corporation:GreenVista) and relocating the 12 families to Corporation housing in Vilangudi, 3 km away. The families were not consulted on the relocation. The draft has been "under legal review" at the Corporation Law Department since August 2023.',
      resourceHint: 'Knowledge',
      meaning: 'Top-down relocation without community consent will face legal and political resistance. The MoU needs a stakeholder consultation clause before it can move forward.' },
    { idx: 4, name: 'Community Board Minutes', relevant: true, x: 60, y: 30, rot: 0, icon: 'minutes',
      title: 'Ward Committee Meeting Minutes',
      body: 'Minutes from Ward 74 Committee meeting, Sept 2023: residents demanded transparency on the PPP deal. The Ward Councillor promised a "public consultation within 30 days." It has been 5 months. The minutes also record a suggestion to convert the PPP zone into a community market — an alternative use that would require no relocation.',
      resourceHint: 'Volunteer',
      meaning: 'The community has proposed an alternative land use. A community market could generate revenue without displacing families, though it would require renegotiating or cancelling the GreenVista contract.' },
    { idx: 5, name: 'Revenue Projection', relevant: true, x: 15, y: 60, rot: -4, icon: 'spreadsheet',
      title: 'Revenue Projection Spreadsheet',
      body: 'A printed spreadsheet from GreenVista shows projected annual revenue of Rs 45 lakh from the planned "Eco-Experience Centre" (zip-line, tree-walk, cafe). But the projections assume 800 daily visitors — the entire park currently averages 650. The model has no sensitivity analysis and assumes zero seasonal variation in Madurai\'s 42C summers.',
      resourceHint: 'Budget',
      meaning: 'Optimistic revenue projections are a red flag in PPP deals. The visitor assumption is unrealistic without improvements to the rest of the park. The PPP depends on park-wide revival — it cannot succeed in isolation.' },
    { idx: 6, name: 'Legal Notice', relevant: true, x: 82, y: 45, rot: 3, icon: 'legal',
      title: 'Legal Notice from Residents',
      body: 'A legal notice from Advocate P. Murugan, Madurai High Court Bar, on behalf of the 12 families, dated Oct 2023, citing Tamil Nadu Urban Land (Ceiling and Regulation) Act and demanding "status quo" on the plot. The notice was served on the Corporation Commissioner and copied to the District Collector. GreenVista was not served — a procedural gap the families\' lawyer may not have noticed.',
      resourceHint: 'Knowledge',
      meaning: 'Legal proceedings are underway. Any construction activity now risks contempt of court. The PPP cannot proceed until the legal notice is addressed — which requires either negotiated settlement or court resolution.' },
    { idx: 7, name: 'Hard Hat', relevant: false, x: 40, y: 80, rot: 10, icon: 'hardhat',
      title: 'Abandoned Hard Hat',
      body: 'A yellow hard hat with the GreenVista logo, dusty and sun-bleached. Left behind when construction halted. A symbol of stalled progress but not a clue.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Construction debris tells you work stopped — which you already knew. Focus on documents that explain WHY it stopped.' },
    { idx: 8, name: 'Cement Bags', relevant: false, x: 78, y: 75, rot: -2, icon: 'cement',
      title: 'Hardened Cement Bags',
      body: 'A stack of 20 cement bags, now solid from moisture exposure. Rs 8,000 worth of material wasted. The bags were left uncovered when workers departed.',
      consequence: 'distracted',
      meaning: 'Wasted materials are a cost concern but do not explain the partnership failure. Documents and contracts hold the answers, not construction supplies.' },
    { idx: 9, name: 'Site Office Door', relevant: false, x: 55, y: 15, rot: 0, icon: 'door',
      title: 'Locked Site Office',
      body: 'The GreenVista site office is padlocked. A notice on the door reads "Site operations temporarily suspended." No date, no contact number.',
      consequence: 'bureau',
      meaning: 'Corporate opacity is frustrating but expected. The real information is in the documents scattered around the site, not behind the locked door.' },
    { idx: 10, name: 'Tyre Tracks', relevant: false, x: 20, y: 75, rot: 15, icon: 'tracks',
      title: 'Heavy Vehicle Tyre Tracks',
      body: 'Deep tyre tracks from construction vehicles have rutted the ground. The ruts collect rainwater and breed mosquitoes. An environmental nuisance but not a root cause.',
      consequence: 'wasted',
      meaning: 'Physical traces of construction activity do not explain contractual or legal failures. Investigate the paperwork, not the mud.' },
    { idx: 11, name: 'Campaign Poster', relevant: false, x: 90, y: 25, rot: -5, icon: 'poster',
      title: 'Political Campaign Poster',
      body: 'A poster from the 2024 local body elections promising "World-Class Eco-Park for Madurai." The candidate won. The park remains unchanged.',
      consequence: 'awareness',
      meaning: 'Political promises without implementation plans are background noise. But the poster tells you the park is politically salient — which means reform proposals have potential leverage.' },
  ],
};

// ---------------------------------------------------------------------------
// Z5 -- Walking Track (broken infrastructure + safety)
// ---------------------------------------------------------------------------

const z5: ZoneConfig = {
  id: 'z5',
  title: 'Walking Track',
  engineZoneId: 'walking_track',
  atmosphereBg: '#2E2A20',
  islandGrass: '#8B7D5E',
  islandSide: '#6B5D3E',
  islandStyle: 'gravel',
  hasWater: false,
  features: ['track_loop', 'distance_markers', 'rest_shelter'],
  vegetation: ['dried_shrubs', 'banyan_roots'],
  objects: [
    { idx: 0, name: 'Eroded Track Surface', relevant: true, x: 30, y: 55, rot: -2, icon: 'erosion',
      title: 'Severely Eroded Track Section',
      body: 'A 40-meter stretch of the walking track has lost its gravel surface, exposing tree roots and loose stones. Three ankle injuries reported in 2023. The original laterite surface was laid in 2010 and never resurfaced.',
      resourceHint: 'Knowledge',
      meaning: 'Track resurfacing was due in 2018 but never budgeted. Deferred maintenance on walking surfaces creates injury liability.' },
    { idx: 1, name: 'Broken Railing', relevant: true, x: 55, y: 35, rot: 5, icon: 'railing',
      title: 'Collapsed Safety Railing',
      body: 'The railing along the elevated section near the pond has collapsed over a 6-meter span. A 2-meter drop to the pond bank is unprotected. The railing was GI pipe — corroded at the base welds after monsoon exposure.',
      resourceHint: 'Material',
      meaning: 'An unprotected drop adjacent to a walking track used by elderly morning walkers is a critical safety gap. GI pipe replacement costs Rs 850 per running meter.' },
    { idx: 2, name: 'Distance Marker', relevant: true, x: 15, y: 40, rot: 0, icon: 'marker',
      title: 'Vandalised Distance Markers',
      body: 'Of 8 original distance markers (placed every 200m on the 1.6 km loop), only 3 remain. The rest were broken for scrap value. Without markers, walkers cannot track distance — reducing the track\'s value for cardiac rehabilitation patients referred by Meenakshi Mission Hospital.',
      resourceHint: 'Volunteer',
      meaning: 'Replacing markers with painted ground markings (vandal-proof) costs under Rs 5,000 and could be done by volunteers in one morning.' },
    { idx: 3, name: 'Fallen Tree Branch', relevant: true, x: 70, y: 50, rot: 12, icon: 'branch',
      title: 'Overhanging Dead Branch',
      body: 'A large dead branch from a 30-year-old tamarind tree hangs directly over the track. The tree was flagged for pruning in the 2022 tree audit by the Madurai Corporation Horticulture wing. Pruning requires a JCB and crew — cost Rs 8,000. The branch weighs an estimated 120 kg.',
      resourceHint: 'Material',
      meaning: 'A falling 120 kg branch on a busy morning walking track is a catastrophic risk. The Rs 8,000 pruning cost is trivial relative to the liability.' },
    { idx: 4, name: 'Blocked Drain', relevant: true, x: 40, y: 70, rot: -3, icon: 'drain',
      title: 'Track-Side Drain Blocked',
      body: 'The track-side drain is choked with leaf litter and plastic waste. During rains, water flows across the track surface instead of into the drain, accelerating erosion. The drain connects to the main park drainage network feeding Z3.',
      resourceHint: 'Knowledge',
      meaning: 'Track drainage connects to the park-wide water system. Clearing this drain reduces track erosion AND cuts nutrient flow to the algae-affected Boating Pond.' },
    { idx: 5, name: 'Lighting Gap', relevant: true, x: 85, y: 30, rot: 0, icon: 'light',
      title: 'Unlit Track Section (180m)',
      body: 'A 180-meter section between the track bend and the herbal garden has no functioning lights. Three solar bollard lights were installed in 2021 but all have failed — batteries not replaced. Evening walkers (5:30-7 PM, Oct-Feb) avoid this section. Two women reported harassment incidents in the dark zone in 2023.',
      resourceHint: 'Budget',
      meaning: 'Darkness creates safety and gender-access barriers. Solar battery replacement: Rs 1,200 each. This is a safety, equity, and usage issue combined.' },
    { idx: 6, name: 'Bench with Plaque', relevant: true, x: 60, y: 20, rot: 1, icon: 'bench',
      title: 'Memorial Bench -- Donor Opportunity',
      body: 'A bench donated by "The Rotary Club of Madurai West, In Memory of Shri V. Ramanathan, 2015." It is well-maintained by the family. There are 6 empty bench pads along the track — each could be a Rs 15,000 donor bench opportunity, funding track improvements.',
      resourceHint: 'Budget',
      meaning: 'Donor bench programs generate small but recurring revenue while building community ownership. Six pads at Rs 15,000 each = Rs 90,000 for track resurfacing.' },
    { idx: 7, name: 'Yoga Mat Area', relevant: false, x: 25, y: 20, rot: 0, icon: 'yoga',
      title: 'Morning Yoga Gathering Spot',
      body: 'A flat clearing where 15-20 people do yoga each morning. The ground is compacted and clean. The group is self-organised and asks nothing from the park.',
      consequence: 'timer', timerLoss: 3,
      meaning: 'Self-organised community use is a positive signal, not a problem to investigate.' },
    { idx: 8, name: 'Bird Feeder', relevant: false, x: 80, y: 65, rot: -2, icon: 'feeder',
      title: 'Homemade Bird Feeder',
      body: 'A coconut shell bird feeder hung by a regular walker. It attracts mynas and bulbuls. Charming but irrelevant to track infrastructure.',
      consequence: 'distracted',
      meaning: 'Community-installed amenities show people care. But caring and investigating are different activities.' },
    { idx: 9, name: 'Milestone Stone', relevant: false, x: 48, y: 85, rot: 0, icon: 'stone',
      title: 'Old Boundary Stone',
      body: 'A boundary stone marking the original park perimeter from 1998. Historical interest only.',
      consequence: 'wasted',
      meaning: 'Historical markers provide context but not actionable clues about current infrastructure failures.' },
    { idx: 10, name: 'Shoe Rack', relevant: false, x: 10, y: 70, rot: 3, icon: 'rack',
      title: 'Informal Shoe Rack',
      body: 'Walkers leave their good shoes here and walk barefoot on the track (a common practice). A wooden plank serves as a communal shoe rack.',
      consequence: 'awareness',
      meaning: 'Barefoot walking on an eroded track with exposed roots is risky — this observation reinforces the urgency of resurfacing, but the rack itself is not a clue.' },
    { idx: 11, name: 'Notice Board', relevant: false, x: 92, y: 45, rot: -1, icon: 'noticeboard',
      title: 'Community Notice Board',
      body: 'A wooden notice board with flyers for local events, tuition classes, and a missing cat poster. No park-related information posted.',
      consequence: 'bureau',
      meaning: 'Community notice boards co-opted for non-park purposes indicate absent park management communication. Interesting but not an investigation clue.' },
  ],
};

// ---------------------------------------------------------------------------
// Placeholder zones (Z7-Z12, Z14) -- empty objects, atmosphere only
// ---------------------------------------------------------------------------

const placeholders: ZoneConfig[] = [
  { id: 'z7', title: 'Open Lawn', engineZoneId: 'open_lawn',
    atmosphereBg: '#1E2E20', islandGrass: '#5A8A4A', islandSide: '#3A5A2A',
    islandStyle: 'grass', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z8', title: 'Exercise Zone', engineZoneId: 'exercise_zone',
    atmosphereBg: '#2A2A2E', islandGrass: '#A0907A', islandSide: '#706050',
    islandStyle: 'rubber', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z9', title: 'Sculpture Garden', engineZoneId: 'sculpture_garden',
    atmosphereBg: '#2E2030', islandGrass: '#B0A080', islandSide: '#807060',
    islandStyle: 'stone', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z10', title: 'Vendor Hub', engineZoneId: 'vendor_hub',
    atmosphereBg: '#302820', islandGrass: '#C0A878', islandSide: '#907850',
    islandStyle: 'paved', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z11', title: 'Restroom Block', engineZoneId: 'restroom_block',
    atmosphereBg: '#2A2A2A', islandGrass: '#B0B0B0', islandSide: '#808080',
    islandStyle: 'concrete', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z12', title: 'Fiber Optic Lane', engineZoneId: 'fiber_optic_lane',
    atmosphereBg: '#1A1A2A', islandGrass: '#8888A0', islandSide: '#606070',
    islandStyle: 'paved', hasWater: false, features: [], vegetation: [], objects: [] },
  { id: 'z14', title: 'Maintenance Depot', engineZoneId: 'maintenance_depot',
    atmosphereBg: '#222222', islandGrass: '#707070', islandSide: '#505050',
    islandStyle: 'concrete', hasWater: false, features: [], vegetation: [], objects: [] },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const allZones = [z1, z2, z3, z4, z5, z6, z13, ...placeholders];

export const ZONE_CONFIGS: Record<string, ZoneConfig> = {};
for (const z of allZones) {
  ZONE_CONFIGS[z.id] = z;
}

// Engine ID -> zone ID reverse map
const engineToZone: Record<string, string> = {};
for (const z of allZones) {
  engineToZone[z.engineZoneId] = z.id;
}

/** Get zone config by zone id (e.g. 'z3'). Returns a minimal fallback if unknown. */
export function getZoneConfig(zoneId: string): ZoneConfig {
  const normalized = zoneId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cfg = ZONE_CONFIGS[normalized];
  if (cfg) return cfg;
  return {
    id: zoneId, title: `Zone ${zoneId}`, engineZoneId: zoneId,
    atmosphereBg: '#222222', islandGrass: '#808080', islandSide: '#606060',
    islandStyle: 'default', hasWater: false, features: [], vegetation: [], objects: [],
  };
}

/** Map engine zone ID (e.g. 'boating_pond') to zone ID (e.g. 'z3'). */
export function getZoneIdFromEngineId(engineZoneId: string): string {
  return engineToZone[engineZoneId] ?? engineZoneId;
}

// ---------------------------------------------------------------------------
// Legacy compatibility — adapter for old getZoneScene / SceneObject API
// ---------------------------------------------------------------------------

function toZoneScene(cfg: ZoneConfig): ZoneScene {
  return {
    zoneId: cfg.id.toUpperCase(),
    engineZoneId: cfg.engineZoneId,
    name: cfg.title,
    description: '',
    skyColor: cfg.atmosphereBg,
    groundColor: cfg.islandGrass,
    waterColor: cfg.hasWater ? '#4A7B5C' : undefined,
    objects: cfg.objects.map(o => ({
      ...o,
      // Legacy fields consumers may rely on
      id: o.name.toLowerCase().replace(/\s+/g, '_'),
      revealTitle: o.title,
      revealText: o.body,
    } as any)),
    ambientAnimations: [],
  };
}

export const ZONE_SCENES: Record<string, ZoneScene> = {};
for (const z of allZones) {
  ZONE_SCENES[z.id.toUpperCase()] = toZoneScene(z);
}

/** Legacy: retrieve scene by old-style zone ID (e.g. 'Z3'). */
export function getZoneScene(zoneId: string): ZoneScene {
  const scene = ZONE_SCENES[zoneId] ?? ZONE_SCENES[zoneId.toUpperCase()];
  if (scene) return scene;
  return {
    zoneId,
    engineZoneId: zoneId.toLowerCase().replace(/\s+/g, '_'),
    name: `Zone ${zoneId}`,
    description: '',
    skyColor: '#E6F1FB',
    groundColor: '#C8C8C8',
    objects: [],
    ambientAnimations: [],
  };
}
