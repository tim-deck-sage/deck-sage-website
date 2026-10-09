import {
  CommanderSignals,
  DeckForUpgrade,
  PartialComboSignal,
} from '../../types/deckUpgrade';
import {
  evaluateAllCombosAgainstDeck,
  type ComboMatchResult,
} from '../data/comboRecipeIndex';
import { hasCard } from './deckUpgradeHelpers';

function colorsAreCompatible(
  candidateColors: string[],
  commanderColors: string[],
): boolean {
  if (candidateColors.length === 0) return true;
  if (candidateColors.every((c) => c === 'C')) return true;
  if (commanderColors.length === 1 && commanderColors[0] === 'C') {
    return candidateColors.every((c) => c === 'C');
  }

  return candidateColors.every((c) => commanderColors.includes(c));
}

function uniqueSignals(signals: PartialComboSignal[]): PartialComboSignal[] {
  return signals.filter((signal, index, arr) => {
    return (
      index ===
      arr.findIndex(
        (other) => other.cardName.toLowerCase() === signal.cardName.toLowerCase(),
      )
    );
  });
}

function extractDeckCardNames(deck: DeckForUpgrade): string[] {
  const names: string[] = [];

  const possibleArrays = [
    (deck as { cards?: unknown[] }).cards,
    (deck as { mainboard?: unknown[] }).mainboard,
    (deck as { deckCards?: unknown[] }).deckCards,
  ];

  for (const arr of possibleArrays) {
    if (!Array.isArray(arr)) continue;

    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;

      const maybeName =
        (item as { cardName?: string; name?: string }).cardName ??
        (item as { cardName?: string; name?: string }).name;

      if (typeof maybeName === 'string' && maybeName.trim()) {
        names.push(maybeName.trim());
      }
    }
  }

  return Array.from(new Set(names));
}

function buildSignalFromComboMatch(match: ComboMatchResult): PartialComboSignal[] {
  const signals: PartialComboSignal[] = [];

  for (const missingPiece of match.missingPieces) {
    const isPayoff =
      missingPiece.role === 'payoff' || match.tags.includes('token-payoff');

    const isProtectionLike =
      missingPiece.cardName === 'Lightning Greaves' ||
      missingPiece.cardName === 'Swiftfoot Boots';

    const category: PartialComboSignal['category'] = isProtectionLike
      ? 'Protection'
      : isPayoff
      ? 'Finisher'
      : 'Synergy';

    const roles: PartialComboSignal['roles'] = (() => {
      switch (missingPiece.role) {
        case 'payoff':
          return ['finisher', 'tokenPayoff'];
        case 'outlet':
          return ['synergy', 'combo', 'sacOutlet'];
        case 'engine':
          return ['synergy', 'combo'];
        case 'enabler':
          return ['synergy', 'combo'];
        case 'commander':
          return ['synergy', 'combo'];
        case 'support':
          return ['synergy'];
        default:
          return ['synergy'];
      }
    })();

    const tags: PartialComboSignal['tags'] = Array.from(
      new Set(
        [
          ...(match.tags.includes('tribal') ? ['tribal'] : []),
          ...(match.tags.includes('infinite-tokens') ? ['tokens'] : []),
          ...(match.tags.includes('sacrifice') ? ['combo'] : []),
          ...(match.tags.includes('commander-synergy') ? ['combo'] : []),
          'combo',
        ] as PartialComboSignal['tags'],
      ),
    );

    const triggerLines: string[] = [
      'partial combo detected',
      `${match.comboTitle.toLowerCase()} is close to complete`,
    ];

    if (match.matchedCount >= 2) {
      triggerLines.push('multiple combo pieces already present');
    }

    if (match.tags.includes('infinite-damage')) {
      triggerLines.push('damage combo shell detected');
    }

    if (match.tags.includes('infinite-tokens')) {
      triggerLines.push('token combo shell detected');
    }

    const priorityBase = 880;
    const completionBonus = Math.round(match.completionRatio * 120);
    const roleBonus =
      missingPiece.role === 'engine'
        ? 30
        : missingPiece.role === 'outlet'
        ? 24
        : missingPiece.role === 'payoff'
        ? 18
        : 10;

    signals.push({
      cardName: missingPiece.cardName,
      category,
      reason: `Your loaded deck is already close to the combo line "${match.comboTitle}". ${missingPiece.cardName} would help complete or tighten that line.`,
      priority: priorityBase + completionBonus + roleBonus,
      roles,
      tags,
      triggeredBy: triggerLines,
      colors: isProtectionLike ? ['C'] : ['C', 'R'],
    });
  }

  return signals;
}

function buildRecipeDrivenSignals(
  deck: DeckForUpgrade,
): PartialComboSignal[] {
  const deckCardNames = extractDeckCardNames(deck);
  const comboMatches = evaluateAllCombosAgainstDeck(deckCardNames);

  return comboMatches
    .filter((match) => match.isNearCombo && match.missingPieces.length > 0)
    .flatMap(buildSignalFromComboMatch);
}

function buildKrenkoSignals(deck: DeckForUpgrade): PartialComboSignal[] {
  const signals: PartialComboSignal[] = [];

  const hasStaff = hasCard(deck, 'Thornbite Staff');
  const hasProspector = hasCard(deck, 'Skirk Prospector');
  const hasBombardment = hasCard(deck, 'Goblin Bombardment');
  const hasImpactTremors = hasCard(deck, 'Impact Tremors');
  const hasPurphoros = hasCard(deck, 'Purphoros, God of the Forge');
  const hasSword = hasCard(deck, 'Sword of the Paruns');
  const hasGreaves = hasCard(deck, 'Lightning Greaves');
  const hasBoots = hasCard(deck, 'Swiftfoot Boots');

  if (hasStaff && !hasProspector) {
    signals.push({
      cardName: 'Skirk Prospector',
      category: 'Synergy',
      reason:
        'Your current list already has part of a strong Krenko combo shell. Skirk Prospector helps convert token volume into mana and supports Thornbite Staff lines.',
      priority: 995,
      roles: ['synergy', 'combo', 'sacOutlet', 'ramp'],
      tags: ['tribal', 'tokens', 'combo'],
      triggeredBy: ['partial combo detected', 'krenko combo shell missing mana-sac outlet'],
      colors: ['R'],
    });
  }

  if (hasProspector && !hasStaff) {
    signals.push({
      cardName: 'Thornbite Staff',
      category: 'Synergy',
      reason:
        'Your current list already contains pieces that make Thornbite Staff a high-priority combo completion card for Krenko.',
      priority: 996,
      roles: ['synergy', 'combo'],
      tags: ['tribal', 'tokens', 'combo'],
      triggeredBy: ['partial combo detected', 'tap-untap combo support missing'],
      colors: ['C'],
    });
  }

  if ((hasProspector || hasBombardment) && !hasPurphoros && !hasImpactTremors) {
    signals.push({
      cardName: 'Impact Tremors',
      category: 'Finisher',
      reason:
        'Your current shell is already good at making creatures. Impact Tremors gives that board development a cleaner way to end games.',
      priority: 980,
      roles: ['finisher', 'tokenPayoff'],
      tags: ['tribal', 'tokens'],
      triggeredBy: ['board-volume payoff missing', 'current shell supports creature-flood plan'],
      colors: ['R'],
    });
  }

  if (!hasGreaves && !hasBoots) {
    signals.push({
      cardName: 'Lightning Greaves',
      category: 'Protection',
      reason:
        'Krenko decks are dramatically better when the commander can activate immediately and survive removal. A haste-protection piece is a premium upgrade here.',
      priority: 975,
      roles: ['protection', 'haste'],
      tags: ['tribal', 'tokens', 'combo'],
      triggeredBy: ['commander protection gap', 'haste support gap'],
      colors: ['C'],
    });
  }

  if (!hasSword && hasProspector) {
    signals.push({
      cardName: 'Sword of the Paruns',
      category: 'Synergy',
      reason:
        'Your deck already shows signs of a combo-oriented Krenko shell. Sword of the Paruns is worth considering when the deck is already leaning into mana-generation lines.',
      priority: 930,
      roles: ['combo', 'synergy'],
      tags: ['tribal', 'tokens', 'combo'],
      triggeredBy: ['near-combo support detected'],
      colors: ['C'],
    });
  }

  return signals;
}

function buildGenericComboSignals(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
): PartialComboSignal[] {
  const signals: PartialComboSignal[] = [];

  const hasTokenShell =
    hasCard(deck, 'Impact Tremors') ||
    hasCard(deck, 'Purphoros, God of the Forge') ||
    hasCard(deck, 'Goblin Bombardment');

  const hasWideSupport =
    hasCard(deck, 'Skullclamp') ||
    hasCard(deck, 'Battle Hymn') ||
    hasCard(deck, 'Idol of Oblivion');

  const hasUntapShell =
    hasCard(deck, 'Thornbite Staff') ||
    hasCard(deck, 'Sword of the Paruns');

  const hasProtectionGap =
    !hasCard(deck, 'Lightning Greaves') &&
    !hasCard(deck, 'Swiftfoot Boots');

  if (
    commanderSignals.wantsTokens &&
    hasWideSupport &&
    !hasTokenShell
  ) {
    signals.push({
      cardName: 'Impact Tremors',
      category: 'Finisher',
      reason:
        'Your loaded deck already supports going wide, but it still looks light on direct token-conversion finishers.',
      priority: 900,
      roles: ['finisher', 'tokenPayoff'],
      tags: ['tokens', 'tribal'],
      triggeredBy: ['wide-board shell detected', 'missing board-volume payoff'],
      colors: ['R'],
    });
  }

  if (
    commanderSignals.comboFocus &&
    commanderSignals.commanderReliance === 'high' &&
    hasProtectionGap
  ) {
    signals.push({
      cardName: 'Lightning Greaves',
      category: 'Protection',
      reason:
        'This commander appears central to the shell’s ceiling. A haste-protection piece would help the deck get value faster and survive interaction.',
      priority: 890,
      roles: ['protection', 'haste'],
      tags: ['combo', 'tribal', 'tokens', 'midrange'],
      triggeredBy: ['commander-centric shell detected', 'protection gap'],
      colors: ['C'],
    });
  }

  if (
    commanderSignals.comboFocus &&
    commanderSignals.wantsTapUntap &&
    hasUntapShell === false
  ) {
    signals.push({
      cardName: 'Thornbite Staff',
      category: 'Synergy',
      reason:
        'The commander profile shows tap/untap combo potential, but the current shell is still missing one of the strongest untap enablers.',
      priority: 910,
      roles: ['synergy', 'combo'],
      tags: ['combo', 'tribal', 'tokens'],
      triggeredBy: ['tap-untap combo shell detected', 'missing untap support'],
      colors: ['C'],
    });
  }

  return signals;
}

export function detectPartialComboSignals(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
): PartialComboSignal[] {
  const commanderName = (commanderSignals.commanderName || '').toLowerCase();

  let signals: PartialComboSignal[] = [];

  signals = [...signals, ...buildRecipeDrivenSignals(deck)];

  if (commanderName.includes('krenko')) {
    signals = [...signals, ...buildKrenkoSignals(deck)];
  }

  signals = [...signals, ...buildGenericComboSignals(deck, commanderSignals)];

  return uniqueSignals(signals)
    .filter((signal) => colorsAreCompatible(signal.colors, commanderSignals.colors))
    .filter((signal) => !hasCard(deck, signal.cardName))
    .sort((a, b) => b.priority - a.priority);
}