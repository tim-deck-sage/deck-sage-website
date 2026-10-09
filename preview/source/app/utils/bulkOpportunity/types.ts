// app/app/utils/bulkOpportunity/types.ts

import type { BulkCard } from '../../types/bulk';

export type { BulkCard };

export interface AnalyzedBulkCard extends BulkCard {
  colors: string[];
  colorIdentity: string[];
  types: string[];
  subtypes: string[];
  typeLine: string;
  oracleText: string;
  tags: CardTag[];
}

export type CardTag =
  | 'ramp'
  | 'draw'
  | 'interaction'
  | 'removal'
  | 'token-maker'
  | 'token-payoff'
  | 'sac-outlet'
  | 'death-trigger'
  | 'artifact'
  | 'artifact-payoff'
  | 'spell'
  | 'spell-payoff'
  | 'counter'
  | 'proliferate'
  | 'graveyard'
  | 'recursion'
  | 'treasure'
  | 'lifegain'
  | 'lifegain-payoff'
  | 'blink'
  | 'etb'
  | 'lord'
  | 'tribal'
  | 'landfall'
  | 'finisher';

export interface CommanderCandidate {
  card: AnalyzedBulkCard;
  score: number;
  supportedArchetypes: ArchetypeType[];
}

export type ArchetypeType =
  | 'tokens'
  | 'aristocrats'
  | 'artifacts'
  | 'spellslinger'
  | 'counters'
  | 'graveyard'
  | 'treasure'
  | 'tribal'
  | 'landfall'
  | 'lifegain'
  | 'blink';

export interface ArchetypeSignal {
  archetype: ArchetypeType;
  strength: number;
  supportingCards: AnalyzedBulkCard[];
}

export interface RoleCoverage {
  ramp: number;
  draw: number;
  interaction: number;
  removal: number;
  payoffs: number;
  enablers: number;
}

export interface SynergyPackage {
  type:
    | 'tokens'
    | 'aristocrats'
    | 'artifacts'
    | 'spellslinger'
    | 'graveyard'
    | 'tribal';
  strength: number;
  pieces: AnalyzedBulkCard[];
}

export interface DeckOpportunity {
  commander: CommanderCandidate;
  confidenceScore: number;
  deckCompletionPercent: number;
  archetypes: ArchetypeType[];
  summary: string;
  supportingCards: AnalyzedBulkCard[];
  missingKeyPieces: string[];
  roleCoverage: RoleCoverage;
  synergyPackages: SynergyPackage[];
}