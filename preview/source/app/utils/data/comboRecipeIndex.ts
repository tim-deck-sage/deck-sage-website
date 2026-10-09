import { normalizeCardName } from './scryfallNormalization';

export type ComboZone =
  | 'battlefield'
  | 'hand'
  | 'library'
  | 'graveyard'
  | 'commandZone'
  | 'any';

export type ComboTemplateTag =
  | 'infinite-mana'
  | 'infinite-damage'
  | 'infinite-tokens'
  | 'infinite-untaps'
  | 'card-advantage'
  | 'tribal'
  | 'sacrifice'
  | 'death-triggers'
  | 'token-payoff'
  | 'commander-synergy';

export type ComboTemplatePieceRole =
  | 'engine'
  | 'enabler'
  | 'payoff'
  | 'outlet'
  | 'commander'
  | 'support';

export interface ComboTemplatePiece {
  cardName: string;
  role: ComboTemplatePieceRole;
  zone?: ComboZone;
  required?: boolean;
  alternatives?: string[];
  notes?: string;
}

export interface ComboTemplateResult {
  id: string;
  title: string;
  description: string;
  outcome: string;
  tags: ComboTemplateTag[];
  pieceCount: number;
  pieces: ComboTemplatePiece[];
  notes?: string;
}

export interface ComboMatchPiece extends ComboTemplatePiece {
  normalizedCardName: string;
  matched: boolean;
  matchedBy?: string;
  missing: boolean;
  alternativeMatches?: string[];
}

export interface ComboMatchResult {
  comboId: string;
  comboTitle: string;
  description: string;
  outcome: string;
  tags: ComboTemplateTag[];
  matchedCount: number;
  requiredCount: number;
  missingCount: number;
  completionRatio: number;
  isComplete: boolean;
  isNearCombo: boolean;
  missingPieces: ComboTemplatePiece[];
  matchedPieces: ComboMatchPiece[];
  recommendedNextCards: string[];
}

const COMBO_RECIPE_INDEX: ComboTemplateResult[] = [
  {
    id: 'krenko-thornbite-sac-outlet',
    title: 'Krenko + Thornbite Staff + Goblin Sac Outlet',
    description:
      'Krenko can repeatedly tap to create Goblins while Thornbite Staff untaps him whenever a creature dies. A Goblin sacrifice outlet converts tokens into the loop resource.',
    outcome: 'Infinite or near-infinite Goblin tokens and mana depending on the outlet.',
    tags: ['infinite-tokens', 'infinite-untaps', 'tribal', 'sacrifice', 'commander-synergy'],
    pieceCount: 3,
    pieces: [
      {
        cardName: 'Krenko, Mob Boss',
        role: 'commander',
        zone: 'commandZone',
        required: true,
        notes: 'Primary engine piece.',
      },
      {
        cardName: 'Thornbite Staff',
        role: 'engine',
        zone: 'battlefield',
        required: true,
        notes: 'Untaps Krenko when creatures die.',
      },
      {
        cardName: 'Skirk Prospector',
        role: 'outlet',
        zone: 'battlefield',
        required: true,
        alternatives: ['Thermopod', 'Ashnod’s Altar', 'Ashnod\'s Altar'],
        notes: 'Sacrifice outlet that converts Goblins into the loop resource.',
      },
    ],
    notes:
      'This template intentionally tracks the structural combo shell rather than every exact rules branch.',
  },
  {
    id: 'krenko-sword-of-the-paruns',
    title: 'Krenko + Sword of the Paruns',
    description:
      'Once Krenko produces enough creatures or mana support, Sword of the Paruns can repeatedly untap him for explosive token scaling.',
    outcome: 'Infinite or overwhelming token production with enough mana support.',
    tags: ['infinite-tokens', 'tribal', 'commander-synergy'],
    pieceCount: 2,
    pieces: [
      {
        cardName: 'Krenko, Mob Boss',
        role: 'commander',
        zone: 'commandZone',
        required: true,
      },
      {
        cardName: 'Sword of the Paruns',
        role: 'engine',
        zone: 'battlefield',
        required: true,
      },
    ],
    notes:
      'This is stored as a proximity template. Later steps can add exact mana-threshold logic.',
  },
  {
    id: 'impact-tremors-token-loop',
    title: 'Token Loop + Impact Tremors',
    description:
      'A repeatable token loop converts directly into table damage once Impact Tremors is active.',
    outcome: 'Infinite damage or lethal damage from repeated creature entries.',
    tags: ['infinite-damage', 'token-payoff', 'death-triggers'],
    pieceCount: 2,
    pieces: [
      {
        cardName: 'Impact Tremors',
        role: 'payoff',
        zone: 'battlefield',
        required: true,
      },
      {
        cardName: 'Thornbite Staff',
        role: 'engine',
        zone: 'battlefield',
        required: true,
        notes: 'Represents the current deck’s most common loop engine.',
      },
    ],
    notes:
      'This template is intentionally abstract and will be tightened in later phases with full loop detection.',
  },
  {
    id: 'purphoros-token-loop',
    title: 'Token Loop + Purphoros',
    description:
      'Any repeatable creature-entry loop becomes lethal when Purphoros is on the battlefield.',
    outcome: 'Infinite damage or immediate kill pressure from repeatable token entries.',
    tags: ['infinite-damage', 'token-payoff'],
    pieceCount: 2,
    pieces: [
      {
        cardName: 'Purphoros, God of the Forge',
        role: 'payoff',
        zone: 'battlefield',
        required: true,
      },
      {
        cardName: 'Thornbite Staff',
        role: 'engine',
        zone: 'battlefield',
        required: true,
      },
    ],
  },
  {
    id: 'goblin-bombardment-token-loop',
    title: 'Token Loop + Goblin Bombardment',
    description:
      'A repeatable creature loop with Goblin Bombardment converts creature volume into direct damage.',
    outcome: 'Infinite damage or deterministic finishing line.',
    tags: ['infinite-damage', 'sacrifice', 'death-triggers', 'token-payoff'],
    pieceCount: 2,
    pieces: [
      {
        cardName: 'Goblin Bombardment',
        role: 'outlet',
        zone: 'battlefield',
        required: true,
      },
      {
        cardName: 'Thornbite Staff',
        role: 'engine',
        zone: 'battlefield',
        required: true,
      },
    ],
  },
];

function normalizeNames(names: string[]): string[] {
  return Array.from(
    new Set(
      names
        .map((name) => normalizeCardName(name))
        .filter(Boolean),
    ),
  );
}

function getPieceCandidateNames(piece: ComboTemplatePiece): string[] {
  const names = [piece.cardName, ...(piece.alternatives ?? [])];
  return normalizeNames(names);
}

function matchPieceAgainstDeck(
  piece: ComboTemplatePiece,
  deckNameSet: Set<string>,
): ComboMatchPiece {
  const candidateNames = getPieceCandidateNames(piece);
  const matchedBy = candidateNames.find((name) => deckNameSet.has(name));

  return {
    ...piece,
    normalizedCardName: normalizeCardName(piece.cardName),
    matched: Boolean(matchedBy),
    matchedBy,
    missing: !matchedBy,
    alternativeMatches: candidateNames.filter((name) => deckNameSet.has(name)),
  };
}

export function getComboRecipeIndex(): ComboTemplateResult[] {
  return COMBO_RECIPE_INDEX;
}

export function buildNormalizedDeckNameSet(deckCardNames: string[]): Set<string> {
  return new Set(normalizeNames(deckCardNames));
}

export function evaluateComboAgainstDeck(
  combo: ComboTemplateResult,
  deckCardNames: string[],
): ComboMatchResult {
  const deckNameSet = buildNormalizedDeckNameSet(deckCardNames);
  const matchedPieces = combo.pieces.map((piece) => matchPieceAgainstDeck(piece, deckNameSet));
  const requiredPieces = matchedPieces.filter((piece) => piece.required !== false);
  const matchedRequiredPieces = requiredPieces.filter((piece) => piece.matched);
  const missingPieces = requiredPieces.filter((piece) => piece.missing);

  const requiredCount = requiredPieces.length;
  const matchedCount = matchedRequiredPieces.length;
  const missingCount = missingPieces.length;
  const completionRatio = requiredCount === 0 ? 0 : matchedCount / requiredCount;
  const isComplete = requiredCount > 0 && missingCount === 0;
  const isNearCombo = !isComplete && matchedCount > 0 && missingCount <= 2;

  return {
    comboId: combo.id,
    comboTitle: combo.title,
    description: combo.description,
    outcome: combo.outcome,
    tags: combo.tags,
    matchedCount,
    requiredCount,
    missingCount,
    completionRatio,
    isComplete,
    isNearCombo,
    missingPieces: missingPieces.map((piece) => ({
      cardName: piece.cardName,
      role: piece.role,
      zone: piece.zone,
      required: piece.required,
      alternatives: piece.alternatives,
      notes: piece.notes,
    })),
    matchedPieces,
    recommendedNextCards: missingPieces.map((piece) => piece.cardName),
  };
}

export function evaluateAllCombosAgainstDeck(deckCardNames: string[]): ComboMatchResult[] {
  return COMBO_RECIPE_INDEX
    .map((combo) => evaluateComboAgainstDeck(combo, deckCardNames))
    .sort((a, b) => {
      if (b.completionRatio !== a.completionRatio) {
        return b.completionRatio - a.completionRatio;
      }

      if (a.missingCount !== b.missingCount) {
        return a.missingCount - b.missingCount;
      }

      return a.comboTitle.localeCompare(b.comboTitle);
    });
}

export function getNearCombosForDeck(deckCardNames: string[]): ComboMatchResult[] {
  return evaluateAllCombosAgainstDeck(deckCardNames).filter(
    (result) => result.isNearCombo || result.isComplete,
  );
}

export function getMissingComboPiecesForDeck(deckCardNames: string[]): string[] {
  const nearCombos = getNearCombosForDeck(deckCardNames);
  const missingNames = nearCombos.flatMap((combo) => combo.recommendedNextCards);
  return Array.from(new Set(missingNames));
}

export function comboContainsCard(
  combo: ComboTemplateResult,
  cardName: string,
): boolean {
  const normalized = normalizeCardName(cardName);
  if (!normalized) return false;

  return combo.pieces.some((piece) =>
    getPieceCandidateNames(piece).includes(normalized),
  );
}

export function getCombosForCard(cardName: string): ComboTemplateResult[] {
  return COMBO_RECIPE_INDEX.filter((combo) => comboContainsCard(combo, cardName));
}