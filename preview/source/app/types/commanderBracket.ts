export enum CommanderBracket {
  Exhibition = 1,
  Core = 2,
  Upgraded = 3,
  Optimized = 4,
  cEDH = 5,
}

export type CommanderBracketId = 1 | 2 | 3 | 4 | 5;

export type BracketConfidence = 'low' | 'medium' | 'high';

export type OfficialSignalType =
  | 'gameChangerCount'
  | 'gameChangerLimitExceeded'
  | 'comboPresence'
  | 'comboDensity'
  | 'earlyWinTurn'
  | 'stableWinTurn'
  | 'extraTurns'
  | 'massLandDenial'
  | 'staxLock'
  | 'cEDHPattern';

export type InferredSignalType =
  | 'speed'
  | 'consistency'
  | 'synergy'
  | 'resilience'
  | 'interaction'
  | 'finishPotential'
  | 'manaQuality'
  | 'tutorDensity'
  | 'fastManaDensity'
  | 'commanderDependence'
  | 'archetypePressure';

export interface BracketInfo {
  id: CommanderBracket;
  label: string;
  shortLabel: string;
  description: string;
}

export interface BracketRangeExpectation {
  earliestExpectedWinTurn: number | null;
  stableExpectedWinTurn: number | null;
  notes?: string;
}

export interface OfficialBracketSignal {
  type: OfficialSignalType;
  label: string;
  passed: boolean;
  value?: number | string | boolean | string[];
  expected?: number | string | boolean;
  summary: string;
  impact: 'up' | 'down' | 'neutral';
  bracketPressure?: CommanderBracket[];
}

export interface InferredBracketSignal {
  type: InferredSignalType;
  label: string;
  summary: string;
  impact: 'up' | 'down' | 'neutral';
  bracketPressure?: CommanderBracket[];
  value?: number | string | boolean;
}

export interface BracketReasoning {
  official: string[];
  inferred: string[];
}

export interface BracketScoreBreakdown {
  officialPressure: number;
  inferredPressure: number;
  finalScore: number;
}

export interface CommanderBracketResult {
  bracket: CommanderBracket;
  bracketName: string;
  confidence: BracketConfidence;
  confidenceScore: number;
  reasoning: BracketReasoning;
  officialSignals: OfficialBracketSignal[];
  inferredSignals: InferredBracketSignal[];
  scoreBreakdown: BracketScoreBreakdown;
  estimatedEarliestWinTurn?: number | null;
  estimatedStableWinTurn?: number | null;
  gameChangerCount?: number;
  gameChangers?: string[];
  detectedCombos?: string[];
  warnings?: string[];
}

export const COMMANDER_BRACKET_INFO: Record<CommanderBracket, BracketInfo> = {
  [CommanderBracket.Exhibition]: {
    id: CommanderBracket.Exhibition,
    label: 'Exhibition',
    shortLabel: 'Bracket 1',
    description: 'Low-power, showcase-style Commander decks built for relaxed games.',
  },
  [CommanderBracket.Core]: {
    id: CommanderBracket.Core,
    label: 'Core',
    shortLabel: 'Bracket 2',
    description: 'Baseline Commander decks with modest optimization and fair pacing.',
  },
  [CommanderBracket.Upgraded]: {
    id: CommanderBracket.Upgraded,
    label: 'Upgraded',
    shortLabel: 'Bracket 3',
    description: 'Refined casual decks with stronger synergy, better speed, and sharper upgrades.',
  },
  [CommanderBracket.Optimized]: {
    id: CommanderBracket.Optimized,
    label: 'Optimized',
    shortLabel: 'Bracket 4',
    description: 'Highly tuned decks with strong consistency, pressure, and powerful lines.',
  },
  [CommanderBracket.cEDH]: {
    id: CommanderBracket.cEDH,
    label: 'cEDH',
    shortLabel: 'Bracket 5',
    description: 'Competitive EDH decks built to maximize speed, efficiency, and win conversion.',
  },
};

export const COMMANDER_BRACKET_ORDER: CommanderBracket[] = [
  CommanderBracket.Exhibition,
  CommanderBracket.Core,
  CommanderBracket.Upgraded,
  CommanderBracket.Optimized,
  CommanderBracket.cEDH,
];

export function getCommanderBracketInfo(
  bracket: CommanderBracket,
): BracketInfo {
  return COMMANDER_BRACKET_INFO[bracket];
}

export function getCommanderBracketName(
  bracket: CommanderBracket,
): string {
  return COMMANDER_BRACKET_INFO[bracket].label;
}

export function isCommanderBracket(value: unknown): value is CommanderBracket {
  return (
    value === CommanderBracket.Exhibition ||
    value === CommanderBracket.Core ||
    value === CommanderBracket.Upgraded ||
    value === CommanderBracket.Optimized ||
    value === CommanderBracket.cEDH
  );
}