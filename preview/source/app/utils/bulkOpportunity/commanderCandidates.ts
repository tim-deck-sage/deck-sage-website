// app/app/utils/bulkOpportunity/commanderCandidates.ts

import {
  AnalyzedBulkCard,
  ArchetypeType,
  CardTag,
  CommanderCandidate,
} from './types';

const BUILD_AROUND_TEXT_PATTERNS = [
  'whenever another',
  'whenever you cast',
  'whenever you sacrifice',
  'whenever one or more',
  'at the beginning of your end step',
  'at the beginning of combat',
  'create a token',
  'create that many',
  'sacrifice another',
  'from your graveyard',
  'instant and sorcery',
  'artifact spells',
  'artifacts you control',
  '+1/+1 counters',
  'proliferate',
  'landfall',
  'whenever you gain life',
  'whenever a creature dies',
  'whenever another creature enters the battlefield',
  'whenever an artifact enters the battlefield',
];

const TRIBAL_SUBTYPES = [
  'Goblin',
  'Elf',
  'Zombie',
  'Dragon',
  'Vampire',
  'Wizard',
  'Human',
  'Soldier',
  'Knight',
  'Angel',
  'Demon',
  'Merfolk',
  'Sliver',
  'Phyrexian',
];

const KNOWN_COMMANDER_NAMES = [
  'krenko, mob boss',
  'atraxa, praetors’ voice',
  "atraxa, praetors' voice",
  'edgar markov',
  'avacyn, angel of hope',
  'giada, font of hope',
  'lathril, blade of the elves',
];

function normalizeText(value?: string): string {
  return (value || '').toLowerCase();
}

function normalizeName(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function hasType(card: AnalyzedBulkCard, type: string): boolean {
  return card.types.some((entry) => entry.toLowerCase() === type.toLowerCase());
}

function hasSubtype(card: AnalyzedBulkCard, subtype: string): boolean {
  return card.subtypes.some(
    (entry) => entry.toLowerCase() === subtype.toLowerCase(),
  );
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function isLegendaryCreature(card: AnalyzedBulkCard): boolean {
  const typeLine = normalizeText(card.typeLine);

  return (
    (hasType(card, 'Legendary') && hasType(card, 'Creature')) ||
    (typeLine.includes('legendary') && typeLine.includes('creature'))
  );
}

function isKnownCommanderFallback(card: AnalyzedBulkCard): boolean {
  return KNOWN_COMMANDER_NAMES.includes(normalizeName(card.name));
}

function hasUsableCommanderMetadata(card: AnalyzedBulkCard): boolean {
  if (isKnownCommanderFallback(card)) return true;

  return (
    typeof card.typeLine === 'string' &&
    card.typeLine.trim().length > 0 &&
    typeof card.oracleText === 'string' &&
    card.oracleText.trim().length > 0
  );
}

function inferSupportedArchetypes(card: AnalyzedBulkCard): ArchetypeType[] {
  const tags = new Set<CardTag>(card.tags);
  const archetypes = new Set<ArchetypeType>();

  if (tags.has('token-maker') || tags.has('token-payoff')) {
    archetypes.add('tokens');
  }

  if (tags.has('sac-outlet') || tags.has('death-trigger')) {
    archetypes.add('aristocrats');
  }

  if (tags.has('artifact') || tags.has('artifact-payoff')) {
    archetypes.add('artifacts');
  }

  if (tags.has('spell') || tags.has('spell-payoff')) {
    archetypes.add('spellslinger');
  }

  if (tags.has('counter') || tags.has('proliferate')) {
    archetypes.add('counters');
  }

  if (tags.has('graveyard') || tags.has('recursion')) {
    archetypes.add('graveyard');
  }

  if (tags.has('treasure')) {
    archetypes.add('treasure');
  }

  if (tags.has('tribal') || tags.has('lord')) {
    archetypes.add('tribal');
  }

  if (tags.has('landfall')) {
    archetypes.add('landfall');
  }

  if (tags.has('lifegain') || tags.has('lifegain-payoff')) {
    archetypes.add('lifegain');
  }

  if (tags.has('blink') || tags.has('etb')) {
    archetypes.add('blink');
  }

  if (TRIBAL_SUBTYPES.some((subtype) => hasSubtype(card, subtype))) {
    archetypes.add('tribal');
  }

  const oracle = normalizeText(card.oracleText);
  const typeLine = normalizeText(card.typeLine);
  const name = normalizeText(card.name);
  const fullText = `${name} ${typeLine} ${oracle}`;

  if (fullText.includes('artifact')) {
    archetypes.add('artifacts');
  }
  if (fullText.includes('instant') || fullText.includes('sorcery')) {
    archetypes.add('spellslinger');
  }
  if (fullText.includes('+1/+1 counter') || fullText.includes('proliferate')) {
    archetypes.add('counters');
  }
  if (fullText.includes('graveyard')) {
    archetypes.add('graveyard');
  }
  if (fullText.includes('treasure')) {
    archetypes.add('treasure');
  }
  if (fullText.includes('landfall') || fullText.includes('land enters')) {
    archetypes.add('landfall');
  }
  if (fullText.includes('gain life')) {
    archetypes.add('lifegain');
  }
  if (fullText.includes('exile') && fullText.includes('return')) {
    archetypes.add('blink');
  }
  if (fullText.includes('dies') || fullText.includes('sacrifice')) {
    archetypes.add('aristocrats');
  }
  if (fullText.includes('token')) {
    archetypes.add('tokens');
  }
  if (
    fullText.includes('goblin') ||
    fullText.includes('elf') ||
    fullText.includes('zombie') ||
    fullText.includes('dragon') ||
    fullText.includes('vampire') ||
    fullText.includes('angel')
  ) {
    archetypes.add('tribal');
  }

  if (normalizeName(card.name) === 'krenko, mob boss') {
    archetypes.add('tokens');
    archetypes.add('tribal');
    archetypes.add('aristocrats');
  }

  return Array.from(archetypes);
}

function scoreCommander(card: AnalyzedBulkCard): number {
  if (!isLegendaryCreature(card) && !isKnownCommanderFallback(card)) {
    return 0;
  }

  const oracle = normalizeText(card.oracleText);
  let score = 18;

  if (isKnownCommanderFallback(card)) {
    score += 35;
  }

  const archetypes = inferSupportedArchetypes(card);
  const archetypeCount = archetypes.length;

  score += archetypeCount * 10;

  if (includesAny(oracle, BUILD_AROUND_TEXT_PATTERNS)) score += 18;
  if (oracle.includes('whenever')) score += 6;
  if (oracle.includes('for each')) score += 5;
  if (oracle.includes('you control')) score += 4;
  if (oracle.includes('other ') || oracle.includes('another ')) score += 4;

  if (card.tags.includes('token-payoff')) score += 12;
  if (card.tags.includes('spell-payoff')) score += 12;
  if (card.tags.includes('artifact-payoff')) score += 12;
  if (card.tags.includes('lifegain-payoff')) score += 10;
  if (card.tags.includes('death-trigger')) score += 10;
  if (card.tags.includes('lord')) score += 10;
  if (card.tags.includes('finisher')) score += 6;
  if (card.tags.includes('landfall')) score += 8;
  if (card.tags.includes('proliferate')) score += 8;
  if (card.tags.includes('blink')) score += 8;
  if (card.tags.includes('tribal')) score += 8;

  if (TRIBAL_SUBTYPES.some((subtype) => hasSubtype(card, subtype))) {
    score += 8;
  }

  if (archetypeCount === 0) {
    score -= 8;
  }

  if (
    oracle &&
    !oracle.includes('whenever') &&
    !oracle.includes('at the beginning') &&
    !oracle.includes('for each') &&
    !oracle.includes('create') &&
    !oracle.includes('cast') &&
    !oracle.includes('sacrifice') &&
    !oracle.includes('enter') &&
    !oracle.includes('you control')
  ) {
    score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

export function findCommanderCandidates(
  cards: AnalyzedBulkCard[],
): CommanderCandidate[] {
  const raw: CommanderCandidate[] = cards
    .filter(
      (card) =>
        (isLegendaryCreature(card) || isKnownCommanderFallback(card)) &&
        hasUsableCommanderMetadata(card),
    )
    .map((card) => ({
      card,
      score: scoreCommander(card),
      supportedArchetypes: inferSupportedArchetypes(card),
    }))
    .filter(
      (candidate) =>
        candidate.score >= 35 && candidate.supportedArchetypes.length > 0,
    );

  const bestByName = new Map<string, CommanderCandidate>();

  for (const candidate of raw) {
    const key = normalizeName(candidate.card.name);
    const existing = bestByName.get(key);

    if (!existing || candidate.score > existing.score) {
      bestByName.set(key, candidate);
    }
  }

  return Array.from(bestByName.values()).sort((a, b) => b.score - a.score);
}