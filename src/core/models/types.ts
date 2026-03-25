// Game Session
export interface GameSession {
  id: string;
  createdAt: string;
  siteName: string;
  config: GameConfig;
  currentRound: number;
  totalRounds: number;
  currentPhase: GamePhase;
  currentPlayerTurnIndex: number;
  turnOrder: string[];
  players: Record<string, Player>;
  board: Board;
  decks: DeckState;
  cwsTracker: CWSTracker;
  eventDieResult: EventDieResult | null;
  eventRollResult: EventRollResult | null;
  activeChallenge: ChallengeCard[] | null;
  activeSeries: SeriesInProgress | null;
  activeCombination: CombinationInProgress | null;
  activeCoalitions: CoalitionCombination[];
  tradeOffers: TradeOffer[];
  promises: Promise[];
  roundLog: RoundLogEntry[];
  gameLog: GameLogEntry[];
  telemetry: TelemetryLog;
  status: 'setup' | 'playing' | 'deliberation' | 'resolution' | 'scoring' | 'ended';
  endResult: EndGameResult | null;
  rngSeed: number;
  gameLevel: number;
  gameGraph: GameGraph;
  // Tracks which zones were targeted/invested in this round (for common pool decay)
  zonesInvestedThisRound: Set<string> | string[];
  // Tracks whether a full coalition has ever been resolved
  fullCoalitionAchieved: boolean;
  // Once-per-game Call Deliberation tracking per player
  callDeliberationUsed: Record<string, boolean>;
  // Nash Engine output (updated after every round_end_accounting)
  nashEngineOutput: any | null;
  // Büchi history: tracks rounds each objective has been out of sat per role
  buchiHistory: Record<string, Record<string, number>>;
}

export interface GameConfig {
  totalRounds: number;
  deliberationTimerSeconds: number;
  facilitatorMode: 'human' | 'ai';
  cwsTarget: number;
  equityBandK: number;
  difficultyEscalation: number;
  enableTutorial: boolean;
  siteId: string;
}

// Player
export interface Player {
  id: string;
  name: string;
  roleId: RoleId;
  level: number;
  collaborationPoints: number;
  abilities: AbilityScores;
  proficiencyBonus: number;
  proficientSkills: SkillId[];
  hand: ActionCard[];
  drawPile: ActionCard[];
  discardPile: ActionCard[];
  resources: ResourcePool;
  goals: PlayerGoals;
  utilityScore: number;
  utilityHistory: number[];
  focusZoneId: string;
  crisisState: boolean;
  uniqueAbilityUsesRemaining: number;
  statusEffects: StatusEffect[];
  // Revenue tokens placed on zones (investor mechanic)
  revenueTokens: string[];
  // Whether this player resolved a challenge last round (for designer bonus)
  resolvedChallengeLastRound: boolean;
  // Community trust modifier from broken promises
  communityTrustPenalty: number;
  communityTrustPenaltyRoundsLeft: number;
  // Cards played this round in individual action phase
  cardsPlayedThisRound: number;
  // Whether player passed individual action
  passedIndividualAction: boolean;
}

export interface AbilityScores {
  authority: number;
  resourcefulness: number;
  communityTrust: number;
  technicalKnowledge: number;
  politicalLeverage: number;
  adaptability: number;
}
export type AbilityId = keyof AbilityScores;

export interface ResourcePool {
  budget: number;
  influence: number;
  volunteer: number;
  material: number;
  knowledge: number;
}
export type ResourceType = keyof ResourcePool;

export interface PlayerGoals {
  character: GoalTier;
  survival: GoalTier;
  mission: GoalTier;
}

export interface GoalTier {
  description: string;
  subGoals: SubGoal[];
  totalWeight: number;
}

export interface SubGoal {
  id: string;
  description: string;
  weight: number;
  condition: GoalCondition;
  satisfied: boolean;
}

export interface GoalCondition {
  type: 'zone_condition' | 'resource_threshold' | 'challenges_resolved' |
        'trades_completed' | 'zones_improved' | 'cp_earned' | 'custom';
  params: Record<string, any>;
}

export type RoleId = 'administrator' | 'designer' | 'citizen' | 'investor' | 'advocate';

export type SkillId = 'negotiation' | 'budgeting' | 'designThinking' | 'publicSpeaking' |
               'regulatoryNavigation' | 'environmentalAssessment' | 'coalitionBuilding' |
               'crisisManagement';

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  abilityModifiers: Partial<Record<AbilityId, number>>;
  resourceModifiers: Partial<Record<ResourceType, number>>;
  duration: number;
  source: string;
}

// Board & Zones
export interface Board {
  siteId: string;
  siteName: string;
  zones: Record<string, Zone>;
  adjacency: Record<string, string[]>;
  triggerTiles: Record<string, TriggerTile>;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  gridPosition: { q: number; r: number };
  condition: ZoneCondition;
  conditionHistory: { round: number; condition: ZoneCondition }[];
  resources: ResourcePool;
  activeProblems: string[];
  progressMarkers: number;
  problemMarkers: number;
  playerStandees: string[];
  revealedTrigger: TriggerTile | null;
  isLocked: boolean;
  zoneType: ZoneType;
  specialProperties: Record<string, any>;
  primaryResourceType: ResourceType;
  // Fix 1: Common Pool Zone fields
  poolType: 'common' | 'owned';
  commonPoolConfig?: CommonPoolConfig;
  investedThisRound: boolean;
}

export interface CommonPoolConfig {
  resourceType: ResourceType;
  tokenName: string;
  generatedBy: RoleId[];
  consumedBy: RoleId[];
  autoIncomePerRound: number;
  decayPerRoundIfNeglected: number;
}

export type ZoneCondition = 'good' | 'fair' | 'poor' | 'critical' | 'locked';
export type ZoneType = 'recreation' | 'infrastructure' | 'commercial' | 'ecological' |
                'cultural' | 'administrative' | 'development' | 'utility';

export interface TriggerTile {
  id: string;
  zoneId: string;
  type: 'trap' | 'secret_door' | 'cascading_effect';
  revealed: boolean;
  title: string;
  description: string;
  effects: TriggerEffect[];
}

export interface TriggerEffect {
  type: 'add_problem' | 'add_resources' | 'modify_zone' | 'grant_tokens' |
        'cascade_positive' | 'cascade_negative' | 'unlock_grant' | 'waste_resources';
  targetZoneId?: string;
  params: Record<string, any>;
}

// Cards
export interface ActionCard {
  id: string;
  roleId: RoleId;
  name: string;
  description: string;
  flavorText: string;
  baseValue: number;
  cost: Partial<ResourcePool>;
  abilityCheck: { ability: AbilityId; threshold: number; skill?: SkillId } | null;
  effects: CardEffect[];
  seriesPosition: 'any' | 'starter' | 'middle' | 'closer';
  tags: string[];
  artworkId: string;
}

export interface CardEffect {
  type: 'add_resources' | 'remove_resources' | 'modify_zone_condition' |
        'add_progress_marker' | 'remove_problem_marker' | 'grant_cp' |
        'grant_tokens_to_other' | 'modify_ability_temp' | 'force_agenda' |
        'block_action' | 'reveal_zone_info' | 'generate_volunteers' |
        'create_revenue_token' | 'apply_status_effect' | 'draw_cards';
  target: 'self' | 'other_player' | 'zone' | 'all_players' | 'all_zones';
  params: Record<string, any>;
}

// Fix 2: Challenge Card with front/back system
export interface ChallengeCard {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  affectedZoneIds: string[];
  difficulty: number;
  requirements: ChallengeRequirement;
  failureConsequences: ChallengeConsequence[];
  successRewards: ChallengeReward[];
  escalationPerRound: number;
  roundsActive: number;
  category: ChallengeCategory;
  artworkId: string;
  // Fix 2: Public face (visible to all players)
  publicFace: ChallengePublicFace;
  // Fix 2: Hidden back (only facilitator sees)
  hiddenBack: ChallengeHiddenBack;
}

export type ChallengeCategory = 'crisis' | 'opportunity' | 'tension' |
  'maintenance' | 'ecological' | 'social' | 'infrastructure' | 'commercial' | 'safety' | 'political';

export interface ChallengePublicFace {
  zoneName: string;
  zoneId: string;
  difficultyRating: 1 | 2 | 3 | 4 | 5;
  problemDescription: string;
  flavorText: string;
  resourcesRequired: { type: ResourceType; amount: number; displayName: string }[];
  category: 'crisis' | 'opportunity' | 'tension';
  categoryColor: string;
  layerIcon: string;
}

export interface ChallengeHiddenBack {
  resolutionCriteria: string;
  outcomes: {
    full: { description: string; cwsBonus: number; zoneEffect: string };
    partial: { description: string; cwsBonus: number; zoneEffect: string };
    fail: { description: string; cwsPenalty: number; zoneEffect: string };
  };
  dmNotes: string;
  researchTag: string;
}

export interface ChallengeRequirement {
  minSeriesLength: number;
  minUniqueRoles: number;
  resourceCost: Partial<ResourcePool>;
  abilityChecks: { ability: AbilityId; threshold: number; skill?: SkillId }[];
}

export interface ChallengeConsequence {
  type: 'cws_penalty' | 'zone_degrade' | 'resource_loss' | 'new_problem' |
        'lock_zone' | 'status_effect' | 'difficulty_increase';
  params: Record<string, any>;
}

export interface ChallengeReward {
  type: 'cws_bonus' | 'zone_improve' | 'resource_gain' | 'cp_bonus' |
        'remove_problem' | 'unlock_zone';
  params: Record<string, any>;
}

export interface EventCard {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  type: 'negative' | 'positive';
  effects: EventEffect[];
  artworkId: string;
}

export interface EventEffect {
  type: 'add_resources_to_zone' | 'remove_resources_from_zone' |
        'add_resources_to_player' | 'modify_zone_condition' |
        'add_problem_marker' | 'remove_problem_marker' |
        'modify_player_ability_temp' | 'modify_difficulty' |
        'double_cws_this_round' | 'block_zone' | 'grant_tokens' |
        'apply_status_effect';
  target: string;
  params: Record<string, any>;
}

export interface TradeCard {
  id: string;
  name: string;
  description: string;
  type: 'resource_swap' | 'coalition_pact' | 'mediation_request' | 'compromise';
  effects: TradeCardEffect[];
  artworkId: string;
}

export interface TradeCardEffect {
  type: 'enable_swap' | 'coalition_bonus' | 'facilitator_mediate' | 'auto_agree';
  params: Record<string, any>;
}

// Deck State
export interface DeckState {
  challengeDeck: ChallengeCard[];
  challengeDiscard: ChallengeCard[];
  eventDeck: EventCard[];
  eventDiscard: EventCard[];
  tradeDeck: TradeCard[];
}

// Scoring
export interface CWSTracker {
  currentScore: number;
  targetScore: number;
  history: { round: number; score: number; breakdown: CWSBreakdown }[];
}

export interface CWSBreakdown {
  weightedUtilities: { playerId: string; welfareWeight: number; utility: number; weighted: number }[];
  equityBonus: number;
  collaborationBonus: number;
  totalRoundContribution: number;
}

export interface EndGameResult {
  type: 'full_success' | 'partial_success' | 'failure';
  finalCWS: number;
  targetCWS: number;
  playerResults: {
    playerId: string;
    finalUtility: number;
    survivalGoalMet: boolean;
    characterGoalProgress: number;
    missionGoalProgress: number;
    level: number;
    totalCP: number;
  }[];
  nashEquilibriumApprox: boolean;
  paretoOptimal: boolean;
  giniCoefficient: number;
  utilityVariance: number;
}

// Telemetry
export interface TelemetryEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  round: number;
  phase: GamePhase;
  eventType: TelemetryEventType;
  actorId: string;
  actorRole: RoleId | 'system' | 'facilitator';
  data: Record<string, any>;
}

export type TelemetryEventType =
  | 'phase_start' | 'phase_end' | 'round_start' | 'round_end'
  | 'card_played' | 'card_discarded' | 'card_drawn'
  | 'series_started' | 'series_contributed' | 'series_completed' | 'series_failed'
  | 'combination_started' | 'combination_contributed' | 'combination_completed' | 'combination_failed'
  | 'unique_ability_used' | 'player_passed'
  | 'trade_proposed' | 'trade_accepted' | 'trade_rejected' | 'trade_completed'
  | 'trade_card_used'
  | 'standee_moved' | 'trigger_tile_revealed' | 'zone_condition_changed'
  | 'resource_regenerated' | 'resource_drained'
  | 'utility_calculated' | 'cws_updated' | 'cp_awarded' | 'level_up'
  | 'survival_goal_failed' | 'survival_goal_restored'
  | 'challenge_drawn' | 'challenge_resolved' | 'challenge_failed' | 'challenge_escalated'
  | 'event_die_rolled' | 'event_card_drawn' | 'event_applied'
  | 'equity_prompt_triggered' | 'equity_prompt_responded'
  | 'facilitator_adjudication' | 'facilitator_override'
  | 'game_started' | 'game_ended' | 'vote_called' | 'vote_result'
  // New telemetry events for fixes
  | 'payment_day_income' | 'payment_day_bonus' | 'payment_day_penalty'
  | 'common_pool_auto_income' | 'common_pool_decay'
  | 'event_roll_2d6' | 'event_table_result'
  | 'coalition_formed' | 'coalition_reveal' | 'coalition_success' | 'coalition_failure'
  | 'full_coalition_resolved'
  | 'promise_made' | 'promise_fulfilled' | 'promise_broken'
  | 'zone_auto_degradation'
  | 'revenue_token_collected'
  | 'game_level_up' | 'game_level_check'
  | 'game_graph_snapshot';

export type TelemetryLog = TelemetryEvent[];

// Game Phase — Fix 5: 7 phases
export type GamePhase =
  | 'setup_site_selection' | 'setup_role_assignment' | 'setup_character_creation'
  | 'setup_facilitator_briefing' | 'setup_standee_placement' | 'setup_ready'
  | 'payment_day'           // Phase 1: Profession income
  | 'event_roll'            // Phase 2: 2d6 roll + event resolution
  | 'individual_action'     // Phase 3: Solo series plays
  | 'deliberation'          // Phase 4: Negotiation (if triggered by event)
  | 'action_resolution'     // Phase 5: Coalition combinations resolve
  | 'round_end_accounting'  // Phase 6: Bookkeeping, decay, scoring
  | 'level_check'           // Phase 7: Check level advancement
  | 'round_end' | 'game_end' | 'debrief' | 'export';

// Event Die — Fix 3: 2d6 system
export interface EventDieResult {
  value: number;
  outcome: 'negative_event' | 'no_event' | 'positive_event';
}

export interface EventRollResult {
  dice: [number, number];
  total: number;
  eventEntry: EventTableEntry;
  affectedZones: string[];
  affectedPlayers: string[];
  phaseTriggered: 'deliberation_all' | 'deliberation_partial' | 'individual_only';
  deliberationPlayerCount: number;
}

export interface EventTableEntry {
  roll: number;
  name: string;
  zoneEffect: string;
  playerEffect: string;
  phaseTriggered: 'deliberation_all' | 'deliberation_partial' | 'individual_only';
  requiredPlayers: RoleId[] | 'all';
}

// Fix 4: Coalition system
export type ActionLevel = 'individual_series' | 'coalition_combination' | 'full_coalition';

export interface ActionDeclaration {
  level: ActionLevel;
  playerId: string;
  targetZoneId: string;
  cards: ActionCard[];
  resourcesContributed: Partial<ResourcePool>;
  coalitionPartners?: string[];
}

export interface CoalitionCombination {
  id: string;
  participants: {
    playerId: string;
    roleId: RoleId;
    cardsPlayed: ActionCard[];
    resourcesContributed: Partial<ResourcePool>;
    confirmed: boolean;
    cardsRevealed: boolean;
  }[];
  targetZoneId: string;
  combinationType: 'pair' | 'trio' | 'quad' | 'full';
  bonusOutcome: string;
  resolved: boolean;
  success: boolean;
}

export interface CombinationEntry {
  roles: RoleId[];
  requiredTags: string[][];
  bonusDescription: string;
  bonusEffects: {
    type: string;
    target?: string;
    params: Record<string, any>;
  }[];
}

// Fix 4: Promise tracking
export interface Promise {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  promisedResource: { type: ResourceType; amount: number };
  promisedRound: number;
  fulfilled: boolean;
  broken: boolean;
}

// Series/Combination in progress
export interface SeriesInProgress {
  cards: { card: ActionCard; playerId: string }[];
  targetChallengeId: string;
  currentValue: number;
  coalitionPactActive: boolean;
}

export interface CombinationInProgress {
  contributions: { playerId: string; resources: Partial<ResourcePool> }[];
  targetChallengeId: string;
  totalTokens: number;
}

// Trade
export interface TradeOffer {
  id: string;
  proposerId: string;
  targetId: string;
  offering: Partial<ResourcePool>;
  requesting: Partial<ResourcePool>;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  tradeCardId?: string;
}

// Log entries
export interface RoundLogEntry {
  round: number;
  playerId: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface GameLogEntry extends RoundLogEntry {}

// Role Definition (for content)
export interface RoleDefinition {
  id: RoleId;
  name: string;
  subtitle: string;
  description: string;
  realWorldAnalogue: string;
  color: string;
  icon: string;
  startingAbilities: AbilityScores;
  startingResources: ResourcePool;
  proficientSkills: SkillId[];
  uniqueAbility: { name: string; description: string };
  goals: PlayerGoals;
  welfareWeight: number;
}

// Level progression
export interface LevelEntry {
  level: number;
  cpRequired: number;
  proficiencyBonus: number;
  newSkill: boolean;
  abilityBonus: boolean;
  handSize: number;
  uniqueAbilityUses: number;
}

// Fix 5: Game level thresholds
export interface GameLevelThreshold {
  from: number;
  to: number | 'end';
  condition: string;
  check: (gameState: GameSession) => boolean;
  changes: string[];
}

// Survey
export interface SurveyResponse {
  playerId: string;
  roleId: RoleId;
  type: 'pre' | 'post';
  powerRanking: RoleId[];
  likertResponses: Record<string, number>;
  openText?: string;
  timestamp: string;
}

// Fix 6: Game Graph
export interface GameGraph {
  vertices: GameVertex[];
  edges: GameEdge[];
  objectiveFunction: ObjectiveFunction;
  snapshots: GraphSnapshot[];
}

export interface GameVertex {
  id: string;
  zoneId: string;
  round: number;
  configuration: {
    welfareScore: number;
    activeLayer: number;
    activeCrisis: string | null;
    resourcesInvested: number;
    condition: ZoneCondition;
    isCommonPool: boolean;
  };
}

export interface GameEdge {
  id: string;
  fromVertexId: string;
  toVertexId: string;
  edgeType: 'negotiation' | 'crisis_propagation' | 'resource_dependency' | 'stakeholder_shared';
  sharedStakeholder: RoleId | null;
  weight: number;
  description: string;
  wasActivated: boolean;
  activatedInRound: number | null;
}

export interface ObjectiveFunction {
  formula: string;
  currentVO: number;
  maxPossibleVO: number;
  zoneContributions: {
    zoneId: string;
    weight: number;
    welfareScore: number;
    contribution: number;
  }[];
  thresholdVO: number;
}

export interface GraphSnapshot {
  round: number;
  vertices: GameVertex[];
  edges: GameEdge[];
  vo: number;
  timestamp: string;
}

// Fix 5: Profession income
export interface ProfessionIncome {
  base: ResourcePool;
  bonusCondition: string;
  bonusAmount: Partial<ResourcePool>;
  penaltyCondition?: string;
  penaltyAmount?: Partial<ResourcePool>;
}

// Helper function
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
