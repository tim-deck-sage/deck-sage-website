import type {
  CandidateGenerationInput,
  CandidateGenerationResult,
  CardDataProvider,
  CardLookupResult,
  CardSearchFilters,
  CardSearchQuery,
  CardSearchResult,
} from './cardDataProvider';
import {
  createEmptyCandidateGenerationResult,
  createEmptyCardSearchResult,
  normalizeCandidateGenerationInput,
  normalizeSearchQuery,
} from './cardDataProvider';
import {
  getCommanderLegalCardsForColors,
  getScryfallCardIndex,
  isCommanderLegal,
  isColorIdentityCompatible,
  type ScryfallCardRecord,
} from './scryfallCardIndex';
import {
  normalizeCardName,
  buildDeckExclusionSet,
  isCardExcludedByDeck,
  dedupeScryfallCardsByOracleIdentity,
} from './scryfallNormalization';
import type {
  DeckColor,
  RecommendationCategory,
  RecommendationPoolCard,
  RecommendationRole,
  RecommendationTag,
} from '../../types/deckUpgrade';

function lower(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function pushUnique<T>(target: T[], value: T | null | undefined): void {
  if (!value) return;
  if (!target.includes(value)) target.push(value);
}

function buildSearchBlob(card: ScryfallCardRecord): string {
  return [
    card.name,
    card.typeLine,
    card.oracleText,
    card.manaCost,
    card.setName,
    card.rarity,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferTags(card: ScryfallCardRecord): RecommendationTag[] {
  const text = buildSearchBlob(card);
  const tags: RecommendationTag[] = [];

  if (includesAny(text, ['goblin', 'elf', 'zombie', 'vampire', 'dragon', 'tribal'])) {
    pushUnique(tags, 'tribal');
  }

  if (
    includesAny(text, [
      'create a token',
      'create two',
      'create three',
      'token',
      'tokens',
      'whenever another creature enters',
      'whenever a creature enters',
    ])
  ) {
    pushUnique(tags, 'tokens');
  }

  if (
    includesAny(text, [
      'sacrifice',
      'dies',
      'graveyard',
      'whenever another',
    ])
  ) {
    pushUnique(tags, 'aristocrats');
  }

  if (
    includesAny(text, [
      'untap',
      'add {',
      'add one mana',
      'costs {1} less',
      'search your library for a basic land',
      'draw a card',
      'exile the top',
    ])
  ) {
    pushUnique(tags, 'combo');
  }

  if (
    includesAny(text, [
      'draw',
      'destroy target',
      'deals 13 damage to each creature',
      'counter target',
    ])
  ) {
    pushUnique(tags, 'control');
  }

  if (
    includesAny(text, [
      'combat',
      'attacks',
      'attack',
      '+1/+0',
      '+1/+1',
      'has haste',
    ])
  ) {
    pushUnique(tags, 'midrange');
  }

  if (includesAny(text, ['cast a creature spell', 'creature enters the battlefield'])) {
    pushUnique(tags, 'stompy');
  }

  if (includesAny(text, ['instant', 'sorcery', 'flashback'])) {
    pushUnique(tags, 'spellslinger');
  }

  return tags;
}

function inferRoles(card: ScryfallCardRecord): RecommendationRole[] {
  const text = buildSearchBlob(card);
  const typeLine = lower(card.typeLine);
  const roles: RecommendationRole[] = [];

  if (
    includesAny(text, [
      'add {',
      'add one mana',
      'search your library for a basic land',
      'costs {1} less',
    ])
  ) {
    pushUnique(roles, 'ramp');
  }

  if (typeLine.includes('artifact') && includesAny(text, ['add {', 'add one mana'])) {
    pushUnique(roles, 'manaRock');
  }

  if (includesAny(text, ['search your library for a basic land'])) {
    pushUnique(roles, 'landRamp');
  }

  if (includesAny(text, ['draw', 'draw two cards', 'exile the top three cards'])) {
    pushUnique(roles, 'draw');
  }

  if (
    includesAny(text, [
      'destroy target',
      'deals 3 damage to target creature',
      'shuffle it into their library',
    ])
  ) {
    pushUnique(roles, 'singleRemoval');
  }

  if (
    includesAny(text, [
      'deals 13 damage to each creature',
      'destroy each',
      'each creature',
      'all creatures',
      'overload',
    ])
  ) {
    pushUnique(roles, 'boardWipe');
  }

  if (includesAny(text, ['hexproof', 'shroud', 'indestructible', 'protection'])) {
    pushUnique(roles, 'protection');
  }

  if (includesAny(text, ['haste', 'equipped creature has haste'])) {
    pushUnique(roles, 'haste');
  }

  if (
    includesAny(text, [
      'create a 1/1',
      'create a token',
      'create two',
      'create three',
    ])
  ) {
    pushUnique(roles, 'tokenMaker');
  }

  if (
    includesAny(text, [
      'whenever a creature enters',
      'whenever another creature enters',
      'deals 1 damage to each opponent',
      'deals 2 damage to each opponent',
      'shares a creature type',
      'goblins you control get',
    ])
  ) {
    pushUnique(roles, 'tokenPayoff');
  }

  if (includesAny(text, ['sacrifice a creature', 'sacrifice a goblin'])) {
    pushUnique(roles, 'sacOutlet');
  }

  if (includesAny(text, ['whenever another goblin you control dies', 'whenever a creature dies'])) {
    pushUnique(roles, 'deathPayoff');
  }

  if (
    includesAny(text, [
      'shares a creature type',
      'other goblin creatures you control get',
      'goblin spells you cast cost',
      'tribal',
    ])
  ) {
    pushUnique(roles, 'tribalPayoff');
  }

  if (
    includesAny(text, [
      'untap equipped creature',
      'sacrifice a goblin: add',
      'choose both',
      'reveal the top six cards',
    ])
  ) {
    pushUnique(roles, 'combo');
  }

  if (
    includesAny(text, [
      'deals 1 damage to each opponent',
      'deals 2 damage to each opponent',
      'attack',
      'attacks',
    ])
  ) {
    pushUnique(roles, 'finisher');
  }

  if (
    roles.length === 0 ||
    includesAny(text, ['goblin', 'token', 'tribal', 'whenever', 'equipped'])
  ) {
    pushUnique(roles, 'synergy');
  }

  return roles;
}

function inferCategory(roles: RecommendationRole[]): RecommendationCategory {
  if (roles.includes('ramp') || roles.includes('manaRock') || roles.includes('landRamp')) {
    return 'Ramp';
  }

  if (roles.includes('draw')) {
    return 'Draw';
  }

  if (roles.includes('singleRemoval') || roles.includes('boardWipe')) {
    return 'Removal';
  }

  if (roles.includes('protection') || roles.includes('haste')) {
    return 'Protection';
  }

  if (roles.includes('finisher')) {
    return 'Finisher';
  }

  return 'Synergy';
}

function buildReason(card: ScryfallCardRecord, roles: RecommendationRole[]): string {
  const typeLine = card.typeLine ?? 'card';
  const primaryRole = roles[0];

  switch (primaryRole) {
    case 'ramp':
    case 'manaRock':
    case 'landRamp':
      return 'Provides mana development and helps accelerate proactive Commander game plans.';
    case 'draw':
      return 'Improves card flow and helps the deck maintain pressure over longer games.';
    case 'singleRemoval':
      return 'Adds flexible spot interaction that helps answer problematic permanents.';
    case 'boardWipe':
      return 'Gives access to broader reset power when the board gets out of control.';
    case 'protection':
      return 'Helps protect high-value creatures and preserve the deck’s main plan.';
    case 'haste':
      return 'Adds speed so key creatures can impact the board immediately.';
    case 'tokenMaker':
      return 'Supports wide-board strategies by increasing creature volume.';
    case 'tokenPayoff':
      return 'Rewards token production by turning creature volume into real pressure.';
    case 'tribalPayoff':
      return 'Strengthens tribal synergies and improves payoff density.';
    case 'sacOutlet':
      return 'Adds sacrifice utility that can support value lines and combo play.';
    case 'deathPayoff':
      return 'Converts creature deaths into extra value and pressure.';
    case 'combo':
      return 'Supports high-synergy lines and improves combo ceiling in decks built to exploit it.';
    case 'finisher':
      return 'Acts as a payoff piece that can help close games once the deck is established.';
    default:
      return `A useful ${typeLine.toLowerCase()} that can strengthen the deck’s overall synergy package.`;
  }
}

function scoreBasePriority(
  card: ScryfallCardRecord,
  roles: RecommendationRole[],
  tags: RecommendationTag[],
): number {
  let score = 60;

  if (roles.includes('ramp')) score += 10;
  if (roles.includes('draw')) score += 10;
  if (roles.includes('protection')) score += 9;
  if (roles.includes('singleRemoval')) score += 8;
  if (roles.includes('boardWipe')) score += 8;
  if (roles.includes('finisher')) score += 8;
  if (roles.includes('combo')) score += 7;
  if (roles.includes('tribalPayoff')) score += 7;
  if (roles.includes('tokenPayoff')) score += 6;
  if (roles.includes('sacOutlet')) score += 5;
  if (roles.includes('deathPayoff')) score += 5;

  if (tags.includes('tribal')) score += 4;
  if (tags.includes('tokens')) score += 4;
  if (tags.includes('aristocrats')) score += 3;
  if (tags.includes('combo')) score += 3;

  if ((card.cmc ?? 0) <= 2) score += 4;
  if ((card.cmc ?? 0) >= 6) score -= 3;

  return Math.max(1, Math.min(100, score));
}

function toRecommendationPoolCard(card: ScryfallCardRecord): RecommendationPoolCard {
  const roles = inferRoles(card);
  const tags = inferTags(card);
  const category = inferCategory(roles);
  const reason = buildReason(card, roles);
  const priority = scoreBasePriority(card, roles, tags);

  return {
    cardName: card.name,
    category,
    tags,
    roles,
    reason,
    priority,
    colors: card.colorIdentity,
    imageUrl: card.imageUrl,
    scryfallId: card.id,
    oracleId: card.oracleId,
  };
}

function matchesText(card: ScryfallCardRecord, query: CardSearchQuery): boolean {
  const exactName = lower(query.exactName);
  const normalizedName = lower(query.normalizedName);
  const freeText = lower(query.text);

  if (exactName) {
    return lower(card.name) === exactName;
  }

  if (normalizedName) {
    return normalizeCardName(card.name) === normalizedName;
  }

  if (freeText) {
    return buildSearchBlob(card).includes(freeText);
  }

  return true;
}

function matchesFilters(card: ScryfallCardRecord, filters?: CardSearchFilters): boolean {
  if (!filters) return true;

  if (filters.legalInCommander === true && !isCommanderLegal(card)) {
    return false;
  }

  if (
    Array.isArray(filters.commanderColors) &&
    filters.commanderColors.length > 0 &&
    !isColorIdentityCompatible(card.colorIdentity, filters.commanderColors)
  ) {
    return false;
  }

  if (typeof filters.minCmc === 'number' && (card.cmc ?? 0) < filters.minCmc) {
    return false;
  }

  if (typeof filters.maxCmc === 'number' && (card.cmc ?? 0) > filters.maxCmc) {
    return false;
  }

  if (
    Array.isArray(filters.excludeCardNames) &&
    filters.excludeCardNames.length > 0
  ) {
    const excluded = new Set(filters.excludeCardNames.map((name) => normalizeCardName(name)));
    if (excluded.has(normalizeCardName(card.name))) {
      return false;
    }
  }

  const typeBlob = lower(card.typeLine);
  if (
    Array.isArray(filters.typeIncludes) &&
    filters.typeIncludes.length > 0 &&
    !filters.typeIncludes.some((needle) => typeBlob.includes(lower(needle)))
  ) {
    return false;
  }

  const textBlob = buildSearchBlob(card);
  if (
    Array.isArray(filters.textIncludes) &&
    filters.textIncludes.length > 0 &&
    !filters.textIncludes.some((needle) => textBlob.includes(lower(needle)))
  ) {
    return false;
  }

  if (
    Array.isArray(filters.requiredTags) &&
    filters.requiredTags.length > 0
  ) {
    const tags = inferTags(card).map(lower);
    if (!filters.requiredTags.some((tag) => tags.includes(lower(tag)))) {
      return false;
    }
  }

  if (
    Array.isArray(filters.requiredRoles) &&
    filters.requiredRoles.length > 0
  ) {
    const roles = inferRoles(card).map(lower);
    if (!filters.requiredRoles.some((role) => roles.includes(lower(role)))) {
      return false;
    }
  }

  if (
    Array.isArray(filters.categories) &&
    filters.categories.length > 0
  ) {
    const category = inferCategory(inferRoles(card));
    if (!filters.categories.includes(category)) {
      return false;
    }
  }

  return true;
}

export class MockIndexCardDataProvider implements CardDataProvider {
  readonly source = 'mock-index' as const;

  async searchCards(query: CardSearchQuery): Promise<CardSearchResult> {
    const normalizedQuery = normalizeSearchQuery(query);
    const allCards = getScryfallCardIndex();

    const matched = allCards.filter(
      (card) => matchesText(card, normalizedQuery) && matchesFilters(card, normalizedQuery.filters),
    );

    const limit = normalizedQuery.filters?.limit;
    const cards = typeof limit === 'number' ? matched.slice(0, limit) : matched;

    if (cards.length === 0) {
      return createEmptyCardSearchResult(this.source);
    }

    return {
      cards,
      total: matched.length,
      source: this.source,
    };
  }

  async getCardByExactName(name: string): Promise<CardLookupResult> {
    const normalized = normalizeCardName(name);
    const card =
      getScryfallCardIndex().find(
        (entry) => normalizeCardName(entry.name) === normalized,
      ) ?? null;

    return {
      card,
      source: this.source,
    };
  }

  async getCommanderLegalCardsForColors(
    commanderColors: DeckColor[],
  ): Promise<CardSearchResult> {
    const cards = getCommanderLegalCardsForColors(commanderColors);
    return {
      cards,
      total: cards.length,
      source: this.source,
    };
  }

  async getRecommendationCandidates(
    input: CandidateGenerationInput,
  ): Promise<CandidateGenerationResult> {
    const normalizedInput = normalizeCandidateGenerationInput(input);
    const legalCards = getCommanderLegalCardsForColors(normalizedInput.commanderColors);
    const dedupedCards = dedupeScryfallCardsByOracleIdentity(legalCards);
    const deckExclusionSet = buildDeckExclusionSet(normalizedInput.deckCardNames);

    const filtered = dedupedCards
      .filter((card) => !isCardExcludedByDeck(card, deckExclusionSet))
      .filter((card) => {
        if (!normalizedInput.preferredRoles?.length && !normalizedInput.preferredTags?.length) {
          return true;
        }

        const roles = inferRoles(card).map(lower);
        const tags = inferTags(card).map(lower);

        const roleMatch =
          normalizedInput.preferredRoles?.some((role) => roles.includes(lower(role))) ?? false;

        const tagMatch =
          normalizedInput.preferredTags?.some((tag) => tags.includes(lower(tag))) ?? false;

        return roleMatch || tagMatch;
      })
      .filter((card) => {
        if (!normalizedInput.categories?.length) return true;
        const category = inferCategory(inferRoles(card));
        return normalizedInput.categories.includes(category);
      });

    const candidateCards = filtered
      .map(toRecommendationPoolCard)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const limited =
      typeof normalizedInput.limit === 'number'
        ? candidateCards.slice(0, normalizedInput.limit)
        : candidateCards;

    if (limited.length === 0) {
      return createEmptyCandidateGenerationResult(this.source);
    }

    return {
      candidates: limited,
      source: this.source,
      totalConsidered: dedupedCards.length,
      totalReturned: limited.length,
    };
  }
}

let sharedMockIndexCardDataProvider: MockIndexCardDataProvider | null = null;

export function getMockIndexCardDataProvider(): MockIndexCardDataProvider {
  if (!sharedMockIndexCardDataProvider) {
    sharedMockIndexCardDataProvider = new MockIndexCardDataProvider();
  }

  return sharedMockIndexCardDataProvider;
}
