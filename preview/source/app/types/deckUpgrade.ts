export type DeckCard = {
  name: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  imageUrl?: string;
  scryfallId?: string;
  oracleId?: string;
  setName?: string;
  rarity?: string;
  colorIdentity?: DeckColor[];
  quantity?: number;
};

export type BasicLandCounts = {
  Plains: number;
  Island: number;
  Swamp: number;
  Mountain: number;
  Forest: number;
  Wastes: number;
};

export type DeckForUpgrade = {
  name: string;
  commander?: string;
  commanderCard?: DeckCard;
  cards: DeckCard[];
  basicLands: BasicLandCounts;
};

export type UpgradePlayStyle =
  | 'aggressive'
  | 'balanced'
  | 'defensive'
  | 'combo'
  | 'budget';

export type UpgradeGoal =
  | 'stronger'
  | 'faster'
  | 'consistency'
  | 'survivability'
  | 'card_draw'
  | 'mana_ramp'
  | 'interaction'
  | 'combat'
  | 'combo'
  | 'budget'
  | 'raise_power'
  | 'stay_bracket';

export type UpgradeCategory =
  | 'Ramp'
  | 'Draw'
  | 'Removal'
  | 'Protection'
  | 'Finisher'
  | 'Synergy';

export type UpgradeExplanation = {
  triggeredBy: string[];
  deckWeaknesses: string[];
  archetypesDetected: Archetype[];
  candidateRoles: string[];
  cutWhy?: string;
};

export type UpgradeRecommendation = {
  cardName: string;
  reason: string;
  suggestedCut: string;
  category: UpgradeCategory;
  synergy?: string;
  suggestedCutReason?: string;
  priority?: number;
  score?: number;
  candidateScore?: number;
  scoringNotes?: string[];
  deckStatus?: DeckStatus;
  recommendationType?: 'add' | 'swap' | 'trim';
  explanation?: UpgradeExplanation;

  cardImageUrl?: string;
  cardScryfallId?: string;
  suggestedCutImageUrl?: string;
  suggestedCutScryfallId?: string;
  ownership?: RecommendedCardOwnership;
};

export type RecommendedCardOwnership = {
  userOwnsInDeck: boolean;
  userDeckNames: string[];
  userOwnsInBulk: boolean;
  friendBulkOwners: string[];
};

export type DeckUpgradeResult = {
  summary: string;
  recommendations: UpgradeRecommendation[];
  deckPlan?: DeckPlanProfile;
  mismatches?: DeckMismatch[];
};

export type DeckStatus = 'under' | 'exact' | 'over';

export type Archetype =
  | 'tribal'
  | 'tokens'
  | 'sacrifice'
  | 'artifacts'
  | 'spellslinger'
  | 'aristocrats'
  | 'graveyard'
  | 'counters'
  | 'blink'
  | 'control'
  | 'stompy'
  | 'aggro'
  | 'combo'
  | 'midrange';

export type DeckColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export type StructuralNeeds = {
  lands: boolean;
  ramp: boolean;
  draw: boolean;
  removal: boolean;
  protection: boolean;
  finishers: boolean;
  wipes: boolean;
  synergy: boolean;

  rampPieces: number;
  manaRockCount: number;
  landRampCount: number;
  treasureRampCount: number;
  drawPieces: number;
  singleRemovalCount: number;
  boardWipeCount: number;
  protectionCount: number;
  finisherCount: number;
  synergyCount: number;
  tokenMakerCount: number;
  tokenPayoffCount: number;
  tribalPayoffCount: number;
  sacOutletCount: number;
  hasteEnablerCount: number;
  comboPieceCount: number;
  utilityLandCount: number;
  totalLandCount: number;
  averageCmc: number;
};

export type RolePressure = {
  ramp: number;
  draw: number;
  removal: number;
  protection: number;
  finishers: number;
  synergy: number;
  tokenMakers: number;
  tokenPayoffs: number;
  tribalPayoffs: number;
  comboPieces: number;
  sacOutlets: number;
  deathPayoffs: number;
  hasteEnablers: number;
};

export type CommanderSignals = {
  commanderName: string;
  colors: DeckColor[];

  primaryArchetypes: Archetype[];
  secondaryArchetypes: Archetype[];

  tribeSignals: string[];
  preferredCreatureType?: string;

  wantsTokens: boolean;
  wantsSacrifice: boolean;
  wantsDeathTriggers: boolean;
  wantsArtifacts: boolean;
  wantsSpells: boolean;
  wantsCounters: boolean;
  wantsGraveyard: boolean;
  wantsBlink: boolean;
  wantsCombat: boolean;
  wantsGoWide: boolean;
  wantsTallCreatures: boolean;
  wantsTapUntap: boolean;
  wantsCostReduction: boolean;

  comboFocus: boolean;
  commanderReliance: 'low' | 'medium' | 'high';

  preferredRoles: string[];
  notes: string[];
};

export type DeckSignals = {
  archetypes: Archetype[];
  colors: DeckColor[];

  totalCards: number;
  totalLandCount: number;
  nonLandCount: number;
  averageCmc: number;

  creatureCount: number;
  artifactCount: number;
  enchantmentCount: number;
  instantSorceryCount: number;

  rampCount: number;
  manaRockCount: number;
  landRampCount: number;
  treasureRampCount: number;
  drawCount: number;
  singleRemovalCount: number;
  boardWipeCount: number;
  protectionCount: number;
  finisherCount: number;
  synergyCount: number;

  tokenMakerCount: number;
  tokenPayoffCount: number;
  tribalPayoffCount: number;
  sacOutletCount: number;
  deathPayoffCount: number;
  hasteEnablerCount: number;
  comboPieceCount: number;

  onPlanCount: number;
  offPlanCount: number;
  commanderSupportCount: number;

  rolePressure: RolePressure;
  structuralNeeds: StructuralNeeds;
};

export type DeckPlanProfile = {
  commanderName: string;
  colors: DeckColor[];

  primaryPlan: string;
  secondaryPlan?: string;

  archetypes: Archetype[];
  preferredCreatureType?: string;

  shellConfidence: number;
  synergyScore: number;

  commanderReliance: 'low' | 'medium' | 'high';
  comboFocus: boolean;

  supportedRoles: string[];
  weakRoles: string[];
  overloadedRoles: string[];

  structuralNeeds: StructuralNeeds;
  summaryNotes: string[];
};

export type DeckMismatch = {
  id: string;
  label: string;
  reason: string;
  severity: number;
  relatedRoles: string[];
  affectedPlan?: string;
};

export type RecommendationPoolCard = {
  cardName: string;
  category: UpgradeCategory;
  tags: Archetype[];
  roles: string[];
  reason: string;
  priority: number;
  colors: DeckColor[];
  imageUrl?: string;
  scryfallId?: string;
  oracleId?: string;
};

export type SuggestedCutResult = {
  name: string;
  reason: string;
  card?: DeckCard;
};

export type PartialComboSignal = {
  cardName: string;
  category: UpgradeCategory;
  reason: string;
  priority: number;
  roles: string[];
  tags: Archetype[];
  triggeredBy: string[];
  colors: DeckColor[];
  imageUrl?: string;
  scryfallId?: string;
  oracleId?: string;
};

export type CandidateScore = {
  candidate: RecommendationPoolCard;
  score: number;
  playStyleScore?: number;
  goalScore?: number;
  reasonBoosts: string[];
};

export type CutScore = {
  card: DeckCard;
  score: number;
  reasons: string[];
};

export type CardRole =
  | 'ramp'
  | 'manaRock'
  | 'landRamp'
  | 'draw'
  | 'singleRemoval'
  | 'boardWipe'
  | 'protection'
  | 'finisher'
  | 'tokenMaker'
  | 'tokenPayoff'
  | 'tribalPayoff'
  | 'sacOutlet'
  | 'deathPayoff'
  | 'haste'
  | 'combo'
  | 'synergy'
  | 'creature'
  | 'artifact'
  | 'spell'
  | 'enchantment';

export type RecommendationCategory = UpgradeCategory;
export type RecommendationRole = CardRole;
export type RecommendationTag = Archetype;

export const NO_SPECIFIC_CUT_FOUND = 'No specific cut found';
