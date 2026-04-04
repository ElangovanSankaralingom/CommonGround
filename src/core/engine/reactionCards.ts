export interface ReactionEffect {
  type: 'bonus_tokens' | 'cost_increase' | 'points_bonus' | 'multiplier' | 'resource_freeze' | 'efficiency_boost';
  target: string | null;
  value: number;
  duration: 'instant' | 'next_task' | 'next_2_tasks' | 'rest_of_phase';
  turnsRemaining: number;
  cardTitle: string;
}

export interface ReactionCard {
  id: string;
  zoneId: string;
  title: string;
  description: string;
  effect: ReactionEffect;
  icon: string;
  isPositive: boolean;
}

const ALL_CARDS: ReactionCard[] = [
  // Z1 Main Entrance
  { id: 'z1_card_1', zoneId: 'z1', title: 'Vendor Cooperation', description: 'Local vendors agree to keep area clean for mutual benefit', icon: '🤝', isPositive: true, effect: { type: 'points_bonus', target: null, value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Vendor Cooperation' } },
  { id: 'z1_card_2', zoneId: 'z1', title: 'Fire Dept Inspection', description: 'Surprise fire safety inspection requires immediate compliance spending', icon: '🚒', isPositive: false, effect: { type: 'cost_increase', target: 'budget', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Fire Dept Inspection' } },
  { id: 'z1_card_3', zoneId: 'z1', title: 'Media Attention', description: 'News crew covers your entrance renovation, boosting public influence', icon: '📺', isPositive: true, effect: { type: 'efficiency_boost', target: 'influence', value: 15, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Media Attention' } },
  { id: 'z1_card_4', zoneId: 'z1', title: 'Councillor Opposition', description: 'Local councillor blocks your influence channels temporarily', icon: '🚫', isPositive: false, effect: { type: 'resource_freeze', target: 'influence', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Councillor Opposition' } },
  { id: 'z1_card_5', zoneId: 'z1', title: 'School Volunteer Day', description: 'Nearby school sends enthusiastic student volunteers', icon: '🎒', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'School Volunteer Day' } },
  { id: 'z1_card_6', zoneId: 'z1', title: 'Heritage NGO Grant', description: 'Heritage conservation NGO provides emergency funding', icon: '🏛️', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Heritage NGO Grant' } },
  { id: 'z1_card_7', zoneId: 'z1', title: 'Rain Damage', description: 'Unexpected rain damages materials stored at entrance', icon: '🌧️', isPositive: false, effect: { type: 'cost_increase', target: 'material', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Rain Damage' } },
  { id: 'z1_card_8', zoneId: 'z1', title: 'Tourism Board Interest', description: 'Tourism board notices your work, amplifying design efforts', icon: '🗺️', isPositive: true, effect: { type: 'multiplier', target: 'design', value: 1.5, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Tourism Board Interest' } },

  // Z2 Fountain Plaza
  { id: 'z2_card_1', zoneId: 'z2', title: 'SPV Cooperation', description: 'Special Purpose Vehicle entity streamlines your budget processes', icon: '🏢', isPositive: true, effect: { type: 'efficiency_boost', target: 'budget', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'SPV Cooperation' } },
  { id: 'z2_card_2', zoneId: 'z2', title: 'Warranty Extension', description: 'Fountain equipment warranty extended, saving future costs', icon: '📋', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Warranty Extension' } },
  { id: 'z2_card_3', zoneId: 'z2', title: 'Electrical Failure', description: 'Pump electrical system fails, freezing material access', icon: '⚡', isPositive: false, effect: { type: 'resource_freeze', target: 'material', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Electrical Failure' } },
  { id: 'z2_card_4', zoneId: 'z2', title: 'Cultural Event Success', description: 'Fountain plaza cultural event wins community support', icon: '🎭', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Cultural Event Success' } },
  { id: 'z2_card_5', zoneId: 'z2', title: 'Pump Supplier Discount', description: 'Supplier offers discounted replacement parts', icon: '🔧', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 1, duration: 'instant', turnsRemaining: 0, cardTitle: 'Pump Supplier Discount' } },
  { id: 'z2_card_6', zoneId: 'z2', title: 'Monsoon Flooding', description: 'Unexpected flooding requires extra volunteer cleanup effort', icon: '🌊', isPositive: false, effect: { type: 'cost_increase', target: 'volunteer', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Monsoon Flooding' } },
  { id: 'z2_card_7', zoneId: 'z2', title: 'Architecture Student Help', description: 'Architecture students provide design knowledge for the plaza', icon: '📐', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 15, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Architecture Student Help' } },
  { id: 'z2_card_8', zoneId: 'z2', title: 'Festival Season Revenue', description: 'Festival season brings extra revenue to the plaza budget', icon: '🎉', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Festival Season Revenue' } },

  // Z3 Boating Pond
  { id: 'z3_card_1', zoneId: 'z3', title: 'Ward Councillor Visit', description: 'Ward councillor visits and lends political support', icon: '🏛️', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Ward Councillor Visit' } },
  { id: 'z3_card_2', zoneId: 'z3', title: 'Monsoon Warning', description: 'Monsoon alert doubles the value of pond maintenance work', icon: '⛈️', isPositive: true, effect: { type: 'multiplier', target: 'maintain', value: 2.0, duration: 'rest_of_phase', turnsRemaining: 99, cardTitle: 'Monsoon Warning' } },
  { id: 'z3_card_3', zoneId: 'z3', title: 'Contractor Overquote', description: 'Contractor inflates material costs for next task', icon: '💸', isPositive: false, effect: { type: 'cost_increase', target: 'material', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Contractor Overquote' } },
  { id: 'z3_card_4', zoneId: 'z3', title: 'Newspaper Coverage', description: 'Local newspaper highlights your boating pond restoration', icon: '📰', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Newspaper Coverage' } },
  { id: 'z3_card_5', zoneId: 'z3', title: 'PWD Equipment Loan', description: 'Public Works Department loans heavy equipment for free', icon: '🔧', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'PWD Equipment Loan' } },
  { id: 'z3_card_6', zoneId: 'z3', title: 'Budget Freeze', description: 'Administrative hold freezes budget allocation temporarily', icon: '❄️', isPositive: false, effect: { type: 'resource_freeze', target: 'budget', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Budget Freeze' } },
  { id: 'z3_card_7', zoneId: 'z3', title: 'TSEDA Student Volunteers', description: 'Engineering students bring technical knowledge to the project', icon: '👩‍🎓', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'TSEDA Student Volunteers' } },
  { id: 'z3_card_8', zoneId: 'z3', title: 'Community Cleanup Drive', description: 'Residents organize a massive pond cleanup volunteering effort', icon: '🧹', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Community Cleanup Drive' } },

  // Z4 Herbal Garden
  { id: 'z4_card_1', zoneId: 'z4', title: 'Academic Partnership', description: 'University botany dept partners for research and knowledge sharing', icon: '🎓', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 25, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Academic Partnership' } },
  { id: 'z4_card_2', zoneId: 'z4', title: 'Monsoon Early', description: 'Early monsoon slows construction work significantly', icon: '🌧️', isPositive: false, effect: { type: 'multiplier', target: 'build', value: 0.7, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Monsoon Early' } },
  { id: 'z4_card_3', zoneId: 'z4', title: 'Seed Donation', description: 'Botanical society donates rare medicinal plant seeds', icon: '🌱', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Seed Donation' } },
  { id: 'z4_card_4', zoneId: 'z4', title: 'Volunteer Burnout', description: 'Regular volunteers need a break, freezing volunteer pool', icon: '😓', isPositive: false, effect: { type: 'resource_freeze', target: 'volunteer', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Volunteer Burnout' } },
  { id: 'z4_card_5', zoneId: 'z4', title: 'AYUSH Department Grant', description: 'Ministry of AYUSH provides funding for herbal garden', icon: '💊', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'AYUSH Department Grant' } },
  { id: 'z4_card_6', zoneId: 'z4', title: 'Soil Test Excellence', description: 'Soil tests show excellent conditions, boosting confidence', icon: '🧪', isPositive: true, effect: { type: 'points_bonus', target: null, value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Soil Test Excellence' } },
  { id: 'z4_card_7', zoneId: 'z4', title: 'Pipeline Leak', description: 'Irrigation pipeline leak increases material costs', icon: '💧', isPositive: false, effect: { type: 'cost_increase', target: 'material', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Pipeline Leak' } },
  { id: 'z4_card_8', zoneId: 'z4', title: 'School Adoption Program', description: 'Local school adopts the garden, sending regular volunteers', icon: '🏫', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'School Adoption Program' } },

  // Z5 Walking Track
  { id: 'z5_card_1', zoneId: 'z5', title: 'Running Club Sponsorship', description: 'Local running club sponsors track improvements', icon: '🏃', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Running Club Sponsorship' } },
  { id: 'z5_card_2', zoneId: 'z5', title: 'Root Damage Discovery', description: 'Tree roots have damaged track base, requiring extra materials', icon: '🌳', isPositive: false, effect: { type: 'cost_increase', target: 'material', value: 2, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Root Damage Discovery' } },
  { id: 'z5_card_3', zoneId: 'z5', title: 'Safety Certification', description: 'Track passes safety certification with flying colors', icon: '✅', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Safety Certification' } },
  { id: 'z5_card_4', zoneId: 'z5', title: 'Lighting Theft', description: 'Track lighting stolen overnight, freezing material use', icon: '🔦', isPositive: false, effect: { type: 'resource_freeze', target: 'material', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Lighting Theft' } },
  { id: 'z5_card_5', zoneId: 'z5', title: 'Morning Walker Association', description: 'Morning walkers volunteer to maintain track daily', icon: '🚶', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Morning Walker Association' } },
  { id: 'z5_card_6', zoneId: 'z5', title: 'Accessibility Grant', description: 'Disability rights org funds accessible track features', icon: '♿', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 1, duration: 'instant', turnsRemaining: 0, cardTitle: 'Accessibility Grant' } },
  { id: 'z5_card_7', zoneId: 'z5', title: 'Contractor Delay', description: 'Contractor delays slow down building progress', icon: '⏳', isPositive: false, effect: { type: 'multiplier', target: 'build', value: 0.8, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Contractor Delay' } },
  { id: 'z5_card_8', zoneId: 'z5', title: 'Park Run Event', description: 'Weekly park run event brings enthusiastic volunteer support', icon: '🎽', isPositive: true, effect: { type: 'efficiency_boost', target: 'volunteer', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Park Run Event' } },

  // Z6 Playground
  { id: 'z6_card_1', zoneId: 'z6', title: 'Child Safety Inspection Pass', description: 'Playground passes rigorous child safety inspection', icon: '🛡️', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Child Safety Inspection Pass' } },
  { id: 'z6_card_2', zoneId: 'z6', title: 'NGO Equipment Donation', description: 'Child welfare NGO donates playground equipment', icon: '🎁', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'NGO Equipment Donation' } },
  { id: 'z6_card_3', zoneId: 'z6', title: 'Equipment Recall', description: 'Safety recall on installed equipment increases budget costs', icon: '⚠️', isPositive: false, effect: { type: 'cost_increase', target: 'budget', value: 2, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Equipment Recall' } },
  { id: 'z6_card_4', zoneId: 'z6', title: 'Parent Volunteer Surge', description: 'Parents from nearby colony volunteer in large numbers', icon: '👨‍👩‍👧', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Parent Volunteer Surge' } },
  { id: 'z6_card_5', zoneId: 'z6', title: 'Insurance Requirement', description: 'New insurance mandate freezes budget temporarily', icon: '📄', isPositive: false, effect: { type: 'resource_freeze', target: 'budget', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Insurance Requirement' } },
  { id: 'z6_card_6', zoneId: 'z6', title: 'Rotary Club Funding', description: 'Rotary Club provides generous funding for playground', icon: '🎡', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Rotary Club Funding' } },
  { id: 'z6_card_7', zoneId: 'z6', title: 'Summer Heat Advisory', description: 'Extreme heat reduces volunteer availability', icon: '☀️', isPositive: false, effect: { type: 'cost_increase', target: 'volunteer', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Summer Heat Advisory' } },
  { id: 'z6_card_8', zoneId: 'z6', title: 'School Partnership', description: 'Local school integrates playground visits into curriculum', icon: '📚', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 15, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'School Partnership' } },

  // Z7 Open Lawn
  { id: 'z7_card_1', zoneId: 'z7', title: 'Yoga Group Cooperation', description: 'Three yoga groups agree to share space by rotating schedules', icon: '🧘', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Yoga Group Cooperation' } },
  { id: 'z7_card_2', zoneId: 'z7', title: 'CSR Bench Sponsorship', description: 'IT company offers Rs 50,000 for bench installation with branding', icon: '💼', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'CSR Bench Sponsorship' } },
  { id: 'z7_card_3', zoneId: 'z7', title: 'Weekend Event Success', description: 'Permitted cultural evening runs smoothly with 80 attendees', icon: '🎶', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Weekend Event Success' } },
  { id: 'z7_card_4', zoneId: 'z7', title: 'Cricket Ball Injury', description: 'Cricket ball hits yoga practitioner. Conflict escalates. Councillor demands solution', icon: '🏏', isPositive: false, effect: { type: 'resource_freeze', target: 'volunteer', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Cricket Ball Injury' } },
  { id: 'z7_card_5', zoneId: 'z7', title: 'Birthday Party Litter', description: 'Unpermitted party leaves plastic waste across lawn', icon: '🎂', isPositive: false, effect: { type: 'cost_increase', target: 'volunteer', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Birthday Party Litter' } },
  { id: 'z7_card_6', zoneId: 'z7', title: 'Bench Donation Drive', description: 'Residents crowdfund Rs 24,000 for 8 new benches', icon: '🪑', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Bench Donation Drive' } },
  { id: 'z7_card_7', zoneId: 'z7', title: 'Digital Booking System', description: 'Tech volunteer creates WhatsApp booking for lawn slots', icon: '📱', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 15, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Digital Booking System' } },
  { id: 'z7_card_8', zoneId: 'z7', title: 'Walker Maintenance Team', description: '10 walkers volunteer for weekly lawn care in exchange for reserved time', icon: '🚶', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Walker Maintenance Team' } },

  // Z8 Nursery Area
  { id: 'z8_card_1', zoneId: 'z8', title: 'Retired Gardener Returns', description: 'Mr. Selvam starts coming 3 mornings a week. Seedling survival improves', icon: '👨‍🌾', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 30, duration: 'rest_of_phase', turnsRemaining: 99, cardTitle: 'Retired Gardener Returns' } },
  { id: 'z8_card_2', zoneId: 'z8', title: 'Shade Net Donation', description: 'Agricultural supplier donates 200 sqm of shade netting', icon: '🏗️', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Shade Net Donation' } },
  { id: 'z8_card_3', zoneId: 'z8', title: 'School Nursery Visit', description: '40 students plant seedlings. Media covers the event', icon: '🏫', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'School Nursery Visit' } },
  { id: 'z8_card_4', zoneId: 'z8', title: 'Mist Parts Available', description: 'Closed nursery sells irrigation parts at 50% discount', icon: '💧', isPositive: true, effect: { type: 'efficiency_boost', target: 'budget', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Mist Parts Available' } },
  { id: 'z8_card_5', zoneId: 'z8', title: 'Fungal Outbreak', description: 'Overwatering causes root rot in 30% of seedlings', icon: '🍄', isPositive: false, effect: { type: 'cost_increase', target: 'knowledge', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Fungal Outbreak' } },
  { id: 'z8_card_6', zoneId: 'z8', title: 'Hiring Freeze', description: 'Government hiring freeze means head gardener position cannot be filled', icon: '❄️', isPositive: false, effect: { type: 'resource_freeze', target: 'budget', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Hiring Freeze' } },
  { id: 'z8_card_7', zoneId: 'z8', title: 'Corporation Sapling Order', description: 'Corporation orders 500 saplings for city beautification drive', icon: '🌱', isPositive: true, effect: { type: 'multiplier', target: 'build', value: 1.5, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Corporation Sapling Order' } },
  { id: 'z8_card_8', zoneId: 'z8', title: 'Horticulture Interns', description: '4 diploma students join as 3-month interns', icon: '🎓', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Horticulture Interns' } },

  // Z9 Staff Quarters
  { id: 'z9_card_1', zoneId: 'z9', title: 'Commissioner Signals Support', description: 'Parks Commissioner informally endorses the community proposal', icon: '👔', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Commissioner Signals Support' } },
  { id: 'z9_card_2', zoneId: 'z9', title: 'NGO Ready to Operate', description: 'Padasalai Foundation delivers 200 books and a volunteer librarian', icon: '📚', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'NGO Ready to Operate' } },
  { id: 'z9_card_3', zoneId: 'z9', title: 'Watchman Reassured', description: 'Mr. Rajan told his job is secure. His opposition fades', icon: '😊', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Watchman Reassured' } },
  { id: 'z9_card_4', zoneId: 'z9', title: 'Asset Committee Meets', description: 'Quarterly committee meeting scheduled. Proposal can be tabled', icon: '📋', isPositive: true, effect: { type: 'multiplier', target: 'plan', value: 2.0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Asset Committee Meets' } },
  { id: 'z9_card_5', zoneId: 'z9', title: 'Policy Bureaucracy', description: 'Additional forms and revised building certificate needed', icon: '📄', isPositive: false, effect: { type: 'cost_increase', target: 'knowledge', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Policy Bureaucracy' } },
  { id: 'z9_card_6', zoneId: 'z9', title: 'Electrical Inspection Required', description: 'Opening rooms requires fresh electrical safety certification', icon: '⚡', isPositive: false, effect: { type: 'resource_freeze', target: 'material', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Electrical Inspection Required' } },
  { id: 'z9_card_7', zoneId: 'z9', title: 'Community Furniture Drive', description: 'Residents donate bookshelves, chairs, and table for reading room', icon: '🪑', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Community Furniture Drive' } },
  { id: 'z9_card_8', zoneId: 'z9', title: 'Tool Library Precedent', description: 'Neighbouring ward successfully runs community tool library. Corporation has a precedent', icon: '🔧', isPositive: true, effect: { type: 'efficiency_boost', target: 'influence', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Tool Library Precedent' } },

  // Z10 Peripheral Walk
  { id: 'z10_card_1', zoneId: 'z10', title: 'GPS Resurvey Agreed', description: 'Revenue Department agrees to conduct formal GPS resurvey', icon: '📡', isPositive: true, effect: { type: 'bonus_tokens', target: 'knowledge', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'GPS Resurvey Agreed' } },
  { id: 'z10_card_2', zoneId: 'z10', title: 'Animal Welfare CNR Program', description: 'District animal welfare launches catch-neuter-release for park area', icon: '🐕', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Animal Welfare CNR Program' } },
  { id: 'z10_card_3', zoneId: 'z10', title: 'Residents Pull Back', description: '2 of 8 encroaching households voluntarily remove extensions', icon: '🏠', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Residents Pull Back' } },
  { id: 'z10_card_4', zoneId: 'z10', title: 'Trimming Crew Arrives', description: 'Corporation sends 4-person crew for vegetation clearance', icon: '✂️', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Trimming Crew Arrives' } },
  { id: 'z10_card_5', zoneId: 'z10', title: 'Legal Challenge Filed', description: 'Encroaching households file adverse possession petition', icon: '⚖️', isPositive: false, effect: { type: 'resource_freeze', target: 'influence', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Legal Challenge Filed' } },
  { id: 'z10_card_6', zoneId: 'z10', title: 'Another Dog Bite', description: 'Dog bite makes news. Fear of the peripheral walk increases', icon: '🐕‍🦺', isPositive: false, effect: { type: 'cost_increase', target: 'volunteer', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Another Dog Bite' } },
  { id: 'z10_card_7', zoneId: 'z10', title: 'Joggers Association', description: '20 joggers form association for weekly maintenance and dog monitoring', icon: '🏃', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Joggers Association' } },
  { id: 'z10_card_8', zoneId: 'z10', title: 'Living Fence Design', description: 'Architect proposes bamboo living fence replacing conflict boundary', icon: '🎋', isPositive: true, effect: { type: 'multiplier', target: 'design', value: 1.5, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Living Fence Design' } },

  // Z11 South Pond
  { id: 'z11_card_1', zoneId: 'z11', title: 'PWD Accepts Responsibility', description: 'PWD agrees to fund sewer pipe repair from their maintenance budget', icon: '🏗️', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'PWD Accepts Responsibility' } },
  { id: 'z11_card_2', zoneId: 'z11', title: 'Health Dept Well Testing', description: 'District Health launches well testing for 200 households', icon: '🏥', isPositive: true, effect: { type: 'bonus_tokens', target: 'knowledge', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Health Dept Well Testing' } },
  { id: 'z11_card_3', zoneId: 'z11', title: 'TNPCB Enforcement Order', description: 'TNPCB issues mandatory 90-day cleanup order', icon: '📜', isPositive: true, effect: { type: 'multiplier', target: 'maintain', value: 2.0, duration: 'rest_of_phase', turnsRemaining: 99, cardTitle: 'TNPCB Enforcement Order' } },
  { id: 'z11_card_4', zoneId: 'z11', title: 'Community Health Scare', description: '3 more households report illness. Volunteer participation drops from fear', icon: '😷', isPositive: false, effect: { type: 'resource_freeze', target: 'volunteer', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Community Health Scare' } },
  { id: 'z11_card_5', zoneId: 'z11', title: 'Contractor Payment Standoff', description: 'Pipe contractor demands advance. Corporation requires post-completion payment', icon: '💰', isPositive: false, effect: { type: 'cost_increase', target: 'budget', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Contractor Payment Standoff' } },
  { id: 'z11_card_6', zoneId: 'z11', title: 'University Bioremediation', description: 'Environmental science dept offers free bioremediation design', icon: '🔬', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 25, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'University Bioremediation' } },
  { id: 'z11_card_7', zoneId: 'z11', title: 'Z3 Cascade Benefit', description: 'Z3 drainage work improves downstream water flow to Z11', icon: '🌊', isPositive: true, effect: { type: 'points_bonus', target: null, value: 4, duration: 'instant', turnsRemaining: 0, cardTitle: 'Z3 Cascade Benefit' } },
  { id: 'z11_card_8', zoneId: 'z11', title: 'Resident Petition Success', description: '200-household petition reaches District Collector', icon: '✍️', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Resident Petition Success' } },

  // Z12 Compost Area
  { id: 'z12_card_1', zoneId: 'z12', title: 'NGO Partnership Approved', description: 'Organic farming NGO partnership approved. Professional management begins', icon: '🌿', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'NGO Partnership Approved' } },
  { id: 'z12_card_2', zoneId: 'z12', title: 'Compost Demand Surge', description: 'Local organic farmers willing to buy compost at Rs 8/kg', icon: '🌾', isPositive: true, effect: { type: 'points_bonus', target: null, value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Compost Demand Surge' } },
  { id: 'z12_card_3', zoneId: 'z12', title: 'Equipment Donation', description: 'Construction company donates front-loader for compost turning', icon: '🚜', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Equipment Donation' } },
  { id: 'z12_card_4', zoneId: 'z12', title: 'Odour Deadline', description: 'Health dept imposes deadline to resolve compost smell complaints', icon: '⏰', isPositive: true, effect: { type: 'multiplier', target: 'maintain', value: 1.5, duration: 'rest_of_phase', turnsRemaining: 99, cardTitle: 'Odour Deadline' } },
  { id: 'z12_card_5', zoneId: 'z12', title: 'Leachate Problem', description: 'Monsoon rain washes compost leachate onto nearby pathway', icon: '🌧️', isPositive: false, effect: { type: 'cost_increase', target: 'material', value: 1, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Leachate Problem' } },
  { id: 'z12_card_6', zoneId: 'z12', title: 'Worker Transfer Again', description: 'Newly assigned compost worker transferred after 2 months', icon: '🔄', isPositive: false, effect: { type: 'resource_freeze', target: 'volunteer', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Worker Transfer Again' } },
  { id: 'z12_card_7', zoneId: 'z12', title: 'Vermicompost Training', description: 'Expert conducts free 1-day vermicomposting workshop for 8 volunteers', icon: '🪱', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Vermicompost Training' } },
  { id: 'z12_card_8', zoneId: 'z12', title: 'Zero Waste Recognition', description: 'Waste management NGO recognizes park composting initiative at state level', icon: '🏆', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Zero Waste Recognition' } },

  // Z13 PPP Zone
  { id: 'z13_card_1', zoneId: 'z13', title: 'RTI Response Favorable', description: 'RTI query returns favorable data boosting public influence', icon: '📜', isPositive: true, effect: { type: 'efficiency_boost', target: 'influence', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'RTI Response Favorable' } },
  { id: 'z13_card_2', zoneId: 'z13', title: 'Court Hearing Delay', description: 'Legal proceedings stall, freezing influence channels', icon: '⚖️', isPositive: false, effect: { type: 'resource_freeze', target: 'influence', value: 0, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Court Hearing Delay' } },
  { id: 'z13_card_3', zoneId: 'z13', title: 'Land Value Increase', description: 'Surrounding land value rises due to your improvements', icon: '📈', isPositive: true, effect: { type: 'points_bonus', target: null, value: 4, duration: 'instant', turnsRemaining: 0, cardTitle: 'Land Value Increase' } },
  { id: 'z13_card_4', zoneId: 'z13', title: 'Community Protest', description: 'Local protest against PPP model increases influence costs', icon: '📢', isPositive: false, effect: { type: 'cost_increase', target: 'influence', value: 2, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Community Protest' } },
  { id: 'z13_card_5', zoneId: 'z13', title: 'Developer Cooperation', description: 'Private developer contributes materials to the project', icon: '🏗️', isPositive: true, effect: { type: 'bonus_tokens', target: 'material', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Developer Cooperation' } },
  { id: 'z13_card_6', zoneId: 'z13', title: 'Alternative Funding Source', description: 'New funding channel discovered through PPP network', icon: '💰', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Alternative Funding Source' } },
  { id: 'z13_card_7', zoneId: 'z13', title: 'Environmental Clearance Block', description: 'Environmental board blocks progress pending review', icon: '🌿', isPositive: false, effect: { type: 'resource_freeze', target: 'knowledge', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Environmental Clearance Block' } },
  { id: 'z13_card_8', zoneId: 'z13', title: 'Media Investigation', description: 'Investigative journalism highlights PPP transparency positively', icon: '🔍', isPositive: true, effect: { type: 'efficiency_boost', target: 'knowledge', value: 20, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Media Investigation' } },

  // Z14 Water Tank & Pump House
  { id: 'z14_card_1', zoneId: 'z14', title: 'Motor Repair Workshop', description: 'Mattuthavani workshop offers to repair both failed motors for half the replacement cost', icon: '🔧', isPositive: true, effect: { type: 'efficiency_boost', target: 'budget', value: 25, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Motor Repair Workshop' } },
  { id: 'z14_card_2', zoneId: 'z14', title: 'Safety Emergency Grant', description: 'Corporation releases Rs 50,000 emergency grant after audit findings', icon: '💰', isPositive: true, effect: { type: 'bonus_tokens', target: 'budget', value: 3, duration: 'instant', turnsRemaining: 0, cardTitle: 'Safety Emergency Grant' } },
  { id: 'z14_card_3', zoneId: 'z14', title: 'Tanker Cost Scrutiny', description: 'Auditor flags Rs 5.4L annual tanker cost. Management asks why pump house is not fixed', icon: '📊', isPositive: true, effect: { type: 'bonus_tokens', target: 'influence', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Tanker Cost Scrutiny' } },
  { id: 'z14_card_4', zoneId: 'z14', title: 'Plumber Union Support', description: 'Local plumber union offers discounted valve repairs across the network', icon: '🔩', isPositive: true, effect: { type: 'bonus_tokens', target: 'volunteer', value: 2, duration: 'instant', turnsRemaining: 0, cardTitle: 'Plumber Union Support' } },
  { id: 'z14_card_5', zoneId: 'z14', title: 'Monsoon Electrical Emergency', description: 'Roof leak causes another short circuit. Surviving motor shuts down 48 hours', icon: '⚡', isPositive: false, effect: { type: 'resource_freeze', target: 'material', value: 0, duration: 'next_task', turnsRemaining: 1, cardTitle: 'Monsoon Electrical Emergency' } },
  { id: 'z14_card_6', zoneId: 'z14', title: 'Third Motor Warning', description: 'Engineer warns surviving motor will fail within 3 months at current overload', icon: '⚠️', isPositive: false, effect: { type: 'multiplier', target: 'build', value: 2.0, duration: 'rest_of_phase', turnsRemaining: 99, cardTitle: 'Third Motor Warning' } },
  { id: 'z14_card_7', zoneId: 'z14', title: 'Solar Pump Subsidy', description: 'Tamil Nadu Energy Agency offers 60% subsidy for solar pump installations', icon: '☀️', isPositive: true, effect: { type: 'efficiency_boost', target: 'budget', value: 30, duration: 'next_2_tasks', turnsRemaining: 2, cardTitle: 'Solar Pump Subsidy' } },
  { id: 'z14_card_8', zoneId: 'z14', title: 'Cascade Collaboration', description: 'Fixing Z14 restores water to Z4, Z8, Z11. Cross-zone teams pledge support', icon: '🌊', isPositive: true, effect: { type: 'points_bonus', target: null, value: 5, duration: 'instant', turnsRemaining: 0, cardTitle: 'Cascade Collaboration' } },
];

export function getZoneDeck(zoneId: string): ReactionCard[] {
  const deck = ALL_CARDS.filter(c => c.zoneId === zoneId);
  if (deck.length === 0) {
    console.log(`REACTION_DECK: Zone ${zoneId} not found, returning z3 default deck`);
    return ALL_CARDS.filter(c => c.zoneId === 'z3');
  }
  return deck;
}

export function drawReactionCard(zoneId: string, alreadyDrawn: string[]): ReactionCard | null {
  const deck = getZoneDeck(zoneId);
  const available = deck.filter(c => !alreadyDrawn.includes(c.id));
  if (available.length === 0) {
    console.log(`REACTION_CARD: No cards remaining for zone ${zoneId}`);
    return null;
  }
  const card = available[Math.floor(Math.random() * available.length)];
  console.log(`REACTION_CARD: ${card.title} — ${card.description}`);
  return card;
}

export function applyReactionEffect(
  effect: ReactionEffect,
  resourcePools: Record<string, Record<string, number>>,
  targetPlayerId: string | null
): string {
  const pid = targetPlayerId ?? 'shared';
  console.log(`REACTION_APPLIED: ${effect.type} ${effect.target} ${effect.value}`);

  if (effect.type === 'bonus_tokens' && effect.target) {
    if (resourcePools[pid]) {
      resourcePools[pid][effect.target] = (resourcePools[pid][effect.target] ?? 0) + effect.value;
    }
    return `+${effect.value} ${effect.target} tokens added`;
  }

  if (effect.type === 'points_bonus') {
    if (resourcePools[pid]) {
      resourcePools[pid]['points'] = (resourcePools[pid]['points'] ?? 0) + effect.value;
    }
    return `+${effect.value} bonus points awarded`;
  }

  if (effect.type === 'cost_increase') {
    return `${effect.target} costs increased by ${effect.value} for ${effect.duration}`;
  }
  if (effect.type === 'multiplier') {
    return `${effect.target} tasks multiplied by x${effect.value} for ${effect.duration}`;
  }
  if (effect.type === 'resource_freeze') {
    return `${effect.target} frozen for ${effect.duration}`;
  }
  if (effect.type === 'efficiency_boost') {
    return `${effect.target} efficiency boosted by ${effect.value}% for ${effect.duration}`;
  }
  return `Effect ${effect.type} active`;
}

export function tickReactionEffects(activeEffects: ReactionEffect[]): ReactionEffect[] {
  return activeEffects
    .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter(e => {
      if (e.turnsRemaining <= 0) {
        console.log(`REACTION_EXPIRED: ${e.cardTitle} (${e.type}) has ended`);
        return false;
      }
      return true;
    });
}
