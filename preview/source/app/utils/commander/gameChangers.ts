// app/app/utils/commander/gameChangers.ts

export type GameChangerCategory =
  | 'fastMana'
  | 'tutor'
  | 'cardAdvantage'
  | 'comboEngine'
  | 'stax'
  | 'extraTurn'
  | 'landDenial'
  | 'finisher'
  | 'utility';

export interface GameChangerCard {
  name: string;
  category: GameChangerCategory;
}

export const GAME_CHANGERS_VERSION = '2026-02';

export const GAME_CHANGERS: GameChangerCard[] = [
  // FAST MANA
  { name: 'Mana Crypt', category: 'fastMana' },
  { name: 'Mana Vault', category: 'fastMana' },
  { name: 'Grim Monolith', category: 'fastMana' },
  { name: 'Mox Diamond', category: 'fastMana' },
  { name: 'Chrome Mox', category: 'fastMana' },
  { name: 'Jeweled Lotus', category: 'fastMana' },

  // TUTORS
  { name: 'Demonic Tutor', category: 'tutor' },
  { name: 'Vampiric Tutor', category: 'tutor' },
  { name: 'Imperial Seal', category: 'tutor' },
  { name: 'Mystical Tutor', category: 'tutor' },
  { name: 'Enlightened Tutor', category: 'tutor' },
  { name: 'Worldly Tutor', category: 'tutor' },
  { name: 'Gamble', category: 'tutor' },

  // CARD ADVANTAGE / VALUE ENGINES
  { name: 'Rhystic Study', category: 'cardAdvantage' },
  { name: 'Necropotence', category: 'cardAdvantage' },
  { name: 'Ad Nauseam', category: 'cardAdvantage' },
  { name: 'Sylvan Library', category: 'cardAdvantage' },
  { name: 'The One Ring', category: 'cardAdvantage' },

  // COMBO ENGINES
  { name: 'Underworld Breach', category: 'comboEngine' },
  { name: 'Dockside Extortionist', category: 'comboEngine' },
  { name: 'Food Chain', category: 'comboEngine' },
  { name: 'Isochron Scepter', category: 'comboEngine' },

  // STAX / LOCK PIECES
  { name: 'Winter Orb', category: 'stax' },
  { name: 'Static Orb', category: 'stax' },
  { name: 'Stasis', category: 'stax' },
  { name: 'Drannith Magistrate', category: 'stax' },
  { name: 'Opposition Agent', category: 'stax' },
  { name: 'Notion Thief', category: 'stax' },

  // EXTRA TURNS
  { name: 'Time Walk', category: 'extraTurn' },
  { name: 'Time Warp', category: 'extraTurn' },
  { name: 'Temporal Manipulation', category: 'extraTurn' },
  { name: 'Capture of Jingzhou', category: 'extraTurn' },
  { name: 'Expropriate', category: 'extraTurn' },

  // LAND DENIAL
  { name: 'Armageddon', category: 'landDenial' },
  { name: 'Ravages of War', category: 'landDenial' },
  { name: 'Jokulhaups', category: 'landDenial' },
  { name: 'Cataclysm', category: 'landDenial' },

  // FINISHERS / HIGH IMPACT
  { name: 'Thassa\'s Oracle', category: 'finisher' },
  { name: 'Craterhoof Behemoth', category: 'finisher' },
  { name: 'Torment of Hailfire', category: 'finisher' },
  { name: 'Exsanguinate', category: 'finisher' },

  // UTILITY / DISRUPTION
  { name: 'Force of Will', category: 'utility' },
  { name: 'Force of Negation', category: 'utility' },
  { name: 'Fierce Guardianship', category: 'utility' },
  { name: 'Deflecting Swat', category: 'utility' },
  { name: 'Pact of Negation', category: 'utility' },
];

export function isGameChanger(cardName: string): boolean {
  const normalized = cardName.trim().toLowerCase();
  return GAME_CHANGERS.some(
    (c) => c.name.toLowerCase() === normalized,
  );
}

export function getGameChanger(cardName: string): GameChangerCard | null {
  const normalized = cardName.trim().toLowerCase();
  return (
    GAME_CHANGERS.find(
      (c) => c.name.toLowerCase() === normalized,
    ) || null
  );
}

export function getAllGameChangerNames(): string[] {
  return GAME_CHANGERS.map((c) => c.name);
}