export type {
  DeckCard,
  BasicLandCounts,
  DeckForUpgrade,
  UpgradeCategory,
  UpgradeExplanation,
  UpgradeRecommendation,
  DeckUpgradeResult,
  DeckStatus,
  Archetype,
  DeckColor,
  StructuralNeeds,
  RolePressure,
  CommanderSignals,
  DeckSignals,
  DeckPlanProfile,
  DeckMismatch,
  RecommendationPoolCard,
  SuggestedCutResult,
  PartialComboSignal,
  CandidateScore,
  CutScore,
  CardRole,
} from '../types/deckUpgrade';

export { NO_SPECIFIC_CUT_FOUND } from '../types/deckUpgrade';

export { getDeckUpgradeRecommendations } from './services/deckUpgradeEngine';

export type DeckUpgradeRecommendationsFn = (
  deck: import('../types/deckUpgrade').DeckForUpgrade,
) => Promise<import('../types/deckUpgrade').DeckUpgradeResult>;