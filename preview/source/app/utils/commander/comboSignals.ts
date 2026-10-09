// app/app/utils/commander/comboSignals.ts

import { tagCards, TaggedCard, hasTag } from './cardTagger';

export interface ComboSignal {
  name: string;
  pieces: string[];
  type: 'two-card' | 'engine' | 'infinite';
  detected: boolean;
}

export interface ComboDetectionResult {
  combos: ComboSignal[];
  comboCount: number;
  hasInfiniteCombo: boolean;
}

type ComboInputCard =
  | string
  | {
      name: string;
      oracleText?: string;
    };

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeInputCards(cards: ComboInputCard[]): { name: string; oracleText?: string }[] {
  return cards
    .map((card) => {
      if (typeof card === 'string') {
        return {
          name: card,
          oracleText: '',
        };
      }

      if (card && typeof card.name === 'string') {
        return {
          name: card.name,
          oracleText: card.oracleText ?? '',
        };
      }

      return null;
    })
    .filter(Boolean) as { name: string; oracleText?: string }[];
}

const KNOWN_COMBOS: Omit<ComboSignal, 'detected'>[] = [
  {
    name: 'Thassa’s Oracle + Demonic Consultation',
    pieces: ['Thassa\'s Oracle', 'Demonic Consultation'],
    type: 'two-card',
  },
  {
    name: 'Thassa’s Oracle + Tainted Pact',
    pieces: ['Thassa\'s Oracle', 'Tainted Pact'],
    type: 'two-card',
  },
  {
    name: 'Kiki-Jiki + Zealous Conscripts',
    pieces: ['Kiki-Jiki, Mirror Breaker', 'Zealous Conscripts'],
    type: 'infinite',
  },
  {
    name: 'Heliod + Walking Ballista',
    pieces: ['Heliod, Sun-Crowned', 'Walking Ballista'],
    type: 'infinite',
  },
  {
    name: 'Isochron Scepter + Dramatic Reversal',
    pieces: ['Isochron Scepter', 'Dramatic Reversal'],
    type: 'engine',
  },
  {
    name: 'Underworld Breach Loop',
    pieces: ['Underworld Breach', 'Lion\'s Eye Diamond', 'Brain Freeze'],
    type: 'infinite',
  },
];

function detectKnownCombos(normalizedDeckSet: Set<string>): ComboSignal[] {
  return KNOWN_COMBOS.map((combo) => {
    const piecesFound = combo.pieces.every((piece) =>
      normalizedDeckSet.has(normalize(piece)),
    );

    return {
      ...combo,
      detected: piecesFound,
    };
  }).filter((combo) => combo.detected);
}

function pushSignal(
  list: ComboSignal[],
  seen: Set<string>,
  signal: Omit<ComboSignal, 'detected'>,
) {
  const key = `${signal.type}::${signal.name}`;
  if (seen.has(key)) return;
  seen.add(key);

  list.push({
    ...signal,
    detected: true,
  });
}

function getTaggedNames(cards: TaggedCard[], tagCheck: (card: TaggedCard) => boolean): string[] {
  return cards.filter(tagCheck).map((card) => card.name);
}

function detectPatternCombos(taggedCards: TaggedCard[]): ComboSignal[] {
  const results: ComboSignal[] = [];
  const seen = new Set<string>();

  const tokenMakers = getTaggedNames(taggedCards, (card) => hasTag(card, 'tokenMaker'));
  const freeSacOutlets = getTaggedNames(taggedCards, (card) => hasTag(card, 'freeSacOutlet'));
  const untappers = getTaggedNames(
    taggedCards,
    (card) => hasTag(card, 'untapper') || hasTag(card, 'manaUntapper'),
  );
  const deathTriggers = getTaggedNames(taggedCards, (card) => hasTag(card, 'deathTrigger'));
  const damageOutlets = getTaggedNames(taggedCards, (card) => hasTag(card, 'damageOutlet'));
  const manaPositivePieces = getTaggedNames(taggedCards, (card) => hasTag(card, 'manaPositive'));
  const recursionPieces = getTaggedNames(
    taggedCards,
    (card) =>
      hasTag(card, 'recursion') ||
      hasTag(card, 'castFromGraveyard') ||
      hasTag(card, 'castFromExile'),
  );
  const blinkPieces = getTaggedNames(taggedCards, (card) => hasTag(card, 'blink'));
  const copyPieces = getTaggedNames(taggedCards, (card) => hasTag(card, 'copyEffect'));
  const costReducers = getTaggedNames(taggedCards, (card) => hasTag(card, 'costReducer'));
  const drawEngines = getTaggedNames(
    taggedCards,
    (card) => hasTag(card, 'drawEngine') || hasTag(card, 'draw'),
  );
  const commanders = getTaggedNames(taggedCards, (card) => hasTag(card, 'commanderEngine'));

  // Token engine + sac outlet + payoff
  if (tokenMakers.length && freeSacOutlets.length && (damageOutlets.length || deathTriggers.length)) {
    pushSignal(results, seen, {
      name: 'Token sacrifice payoff engine',
      pieces: [
        tokenMakers[0],
        freeSacOutlets[0],
        (damageOutlets[0] || deathTriggers[0])!,
      ],
      type: 'engine',
    });
  }

  // Token maker + untapper + sac outlet = potential infinite / loop engine
  if (tokenMakers.length && untappers.length && freeSacOutlets.length) {
    pushSignal(results, seen, {
      name: 'Untap token sacrifice loop',
      pieces: [tokenMakers[0], untappers[0], freeSacOutlets[0]],
      type: 'infinite',
    });
  }

  // Token maker + untapper + damage outlet
  if (tokenMakers.length && untappers.length && damageOutlets.length) {
    pushSignal(results, seen, {
      name: 'Untap token damage engine',
      pieces: [tokenMakers[0], untappers[0], damageOutlets[0]],
      type: 'engine',
    });
  }

  // Mana-positive sac loop
  if (tokenMakers.length && freeSacOutlets.length && manaPositivePieces.length) {
    pushSignal(results, seen, {
      name: 'Mana-positive token loop',
      pieces: [tokenMakers[0], freeSacOutlets[0], manaPositivePieces[0]],
      type: 'engine',
    });
  }

  // Recursion loop
  if (freeSacOutlets.length && recursionPieces.length && (manaPositivePieces.length || deathTriggers.length)) {
    pushSignal(results, seen, {
      name: 'Recursion sacrifice loop',
      pieces: [
        freeSacOutlets[0],
        recursionPieces[0],
        manaPositivePieces[0] || deathTriggers[0],
      ],
      type: 'engine',
    });
  }

  // Blink engine
  if (blinkPieces.length && manaPositivePieces.length) {
    pushSignal(results, seen, {
      name: 'Blink mana engine',
      pieces: [blinkPieces[0], manaPositivePieces[0]],
      type: 'engine',
    });
  }

  // Copy/token engine
  if (copyPieces.length && tokenMakers.length && (damageOutlets.length || deathTriggers.length)) {
    pushSignal(results, seen, {
      name: 'Copy token payoff engine',
      pieces: [
        copyPieces[0],
        tokenMakers[0],
        damageOutlets[0] || deathTriggers[0],
      ],
      type: 'engine',
    });
  }

  // Draw loop
  if (drawEngines.length && tokenMakers.length && freeSacOutlets.length) {
    pushSignal(results, seen, {
      name: 'Draw through token loop',
      pieces: [drawEngines[0], tokenMakers[0], freeSacOutlets[0]],
      type: 'engine',
    });
  }

  // Commander-specific engine
  if (commanders.length && untappers.length) {
    pushSignal(results, seen, {
      name: 'Commander untap engine',
      pieces: [commanders[0], untappers[0]],
      type: 'engine',
    });
  }

  // Commander + token engine + payoff
  if (commanders.length && tokenMakers.length && (damageOutlets.length || deathTriggers.length)) {
    pushSignal(results, seen, {
      name: 'Commander token payoff engine',
      pieces: [
        commanders[0],
        tokenMakers[0],
        damageOutlets[0] || deathTriggers[0],
      ],
      type: 'engine',
    });
  }

  // Cost reduction engine
  if (costReducers.length && copyPieces.length) {
    pushSignal(results, seen, {
      name: 'Cost reduction copy engine',
      pieces: [costReducers[0], copyPieces[0]],
      type: 'engine',
    });
  }

  return results;
}

export function detectCombos(deckCards: ComboInputCard[]): ComboDetectionResult {
  const normalizedCards = normalizeInputCards(deckCards);
  const normalizedDeckSet = new Set(normalizedCards.map((card) => normalize(card.name)));
  const taggedCards = tagCards(normalizedCards);

  const knownCombos = detectKnownCombos(normalizedDeckSet);
  const patternCombos = detectPatternCombos(taggedCards);

  const combined: ComboSignal[] = [];
  const seen = new Set<string>();

  for (const combo of [...knownCombos, ...patternCombos]) {
    const key = `${combo.type}::${combo.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(combo);
  }

  const hasInfiniteCombo = combined.some((combo) => combo.type === 'infinite');

  return {
    combos: combined,
    comboCount: combined.length,
    hasInfiniteCombo,
  };
}
