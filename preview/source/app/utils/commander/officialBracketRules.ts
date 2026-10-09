import { CommanderBracket } from '../../types/commanderBracket';

export interface BracketRule {
  bracket: CommanderBracket;
  name: string;

  // Turn expectations
  earliestExpectedWinTurn: number | null;
  stableExpectedWinTurn: number | null;

  // Game Changer rules
  maxGameChangers: number | null;

  notes?: string;
}

export const OFFICIAL_BRACKET_RULES: Record<CommanderBracket, BracketRule> = {
  [CommanderBracket.Exhibition]: {
    bracket: CommanderBracket.Exhibition,
    name: 'Exhibition',
    earliestExpectedWinTurn: 9,
    stableExpectedWinTurn: 10,
    maxGameChangers: 0,
    notes: 'Very low power. No Game Changers. Slow, showcase-style gameplay.',
  },

  [CommanderBracket.Core]: {
    bracket: CommanderBracket.Core,
    name: 'Core',
    earliestExpectedWinTurn: 8,
    stableExpectedWinTurn: 9,
    maxGameChangers: 0,
    notes: 'Baseline Commander. No Game Changers. Fair pacing and interaction.',
  },

  [CommanderBracket.Upgraded]: {
    bracket: CommanderBracket.Upgraded,
    name: 'Upgraded',
    earliestExpectedWinTurn: 6,
    stableExpectedWinTurn: 7,
    maxGameChangers: 3,
    notes: 'Stronger synergy and optimization. Limited Game Changers allowed.',
  },

  [CommanderBracket.Optimized]: {
    bracket: CommanderBracket.Optimized,
    name: 'Optimized',
    earliestExpectedWinTurn: 4,
    stableExpectedWinTurn: 5,
    maxGameChangers: null, // unlimited
    notes: 'Highly tuned decks. Fast, consistent, and powerful.',
  },

  [CommanderBracket.cEDH]: {
    bracket: CommanderBracket.cEDH,
    name: 'cEDH',
    earliestExpectedWinTurn: null, // any
    stableExpectedWinTurn: 3,
    maxGameChangers: null, // unlimited
    notes: 'Competitive EDH. Maximum efficiency, speed, and combo focus.',
  },
};

export function getBracketRule(bracket: CommanderBracket): BracketRule {
  return OFFICIAL_BRACKET_RULES[bracket];
}