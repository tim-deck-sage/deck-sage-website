import type {
  RecommendationPoolCard,
  RecommendationCategory,
  RecommendationRole,
  RecommendationTag,
  DeckColor,
} from '../../types/deckUpgrade';
import type { ScryfallCardRecord } from './scryfallCardIndex';
import { getActiveCardDataProvider } from './cardDataProviderRegistry';
import { expandProviderThemes } from './providerThemeExpansion';
import {
  normalizeCandidateGenerationInput,
  normalizeSearchQuery,
  normalizeStringArray,
} from './cardDataProvider';

export interface ProviderCandidateSearchInput {
  commanderColors: DeckColor[];
  deckCardNames: string[];
  preferredTags?: string[];
  preferredRoles?: string[];
  categories?: RecommendationCategory[];
  limit?: number;
}

export interface ProviderCandidateSearchResult {
  candidates: RecommendationPoolCard[];
  source: string;
  totalConsidered: number;
  totalReturned: number;
}

type CandidateOrigin = 'primary' | 'fallback';

interface WeightedCandidate {
  candidate: RecommendationPoolCard;
  score: number;
  origin: CandidateOrigin;
}

interface DeckShellProfile {
  shellKeywords: string[];
  shellQueries: string[];
  shellThemes: string[];
}

interface CandidateAlignmentProfile {
  tagMatches: number;
  roleMatches: number;
  categoryFit: number;
  roleShapeScore: number;
  generalSynergyScore: number;
  shellAlignmentScore: number;
  broadUtilityScore: number;
  fillerPenalty: number;
  specificityPenalty: number;
  hasExplicitPreferenceAlignment: boolean;
  hasMeaningfulShellAlignment: boolean;
  hasMeaningfulCategoryAlignment: boolean;
  hasMeaningfulAlignment: boolean;
}

function normalizeNameForCompare(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLooseNameForCompare(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\/\/+/g, ' ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getComparableNameVariants(value: string): string[] {
  const raw = value?.trim() ?? '';

  if (!raw) return [];

  const variants = new Set<string>();

  const exact = normalizeNameForCompare(raw);
  const loose = normalizeLooseNameForCompare(raw);

  if (exact) variants.add(exact);
  if (loose) variants.add(loose);

  const faceSplit = raw.split('//').map((part) => part.trim()).filter(Boolean);
  for (const part of faceSplit) {
    const exactPart = normalizeNameForCompare(part);
    const loosePart = normalizeLooseNameForCompare(part);
    if (exactPart) variants.add(exactPart);
    if (loosePart) variants.add(loosePart);
  }

  const slashSplit = raw.split('/').map((part) => part.trim()).filter(Boolean);
  for (const part of slashSplit) {
    const exactPart = normalizeNameForCompare(part);
    const loosePart = normalizeLooseNameForCompare(part);
    if (exactPart) variants.add(exactPart);
    if (loosePart) variants.add(loosePart);
  }

  return Array.from(variants);
}

function dedupeCandidatesByName(
  candidates: RecommendationPoolCard[],
): RecommendationPoolCard[] {
  const seen = new Set<string>();
  const deduped: RecommendationPoolCard[] = [];

  for (const candidate of candidates) {
    const normalizedName = normalizeLooseNameForCompare(candidate.cardName);

    if (!normalizedName || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    deduped.push(candidate);
  }

  return deduped;
}

function excludeLoadedDeckCards(
  candidates: RecommendationPoolCard[],
  deckCardNames: string[],
): RecommendationPoolCard[] {
  const excluded = new Set<string>();

  for (const deckCardName of normalizeStringArray(deckCardNames)) {
    for (const variant of getComparableNameVariants(deckCardName)) {
      excluded.add(variant);
    }
  }

  return candidates.filter((candidate) => {
    const candidateVariants = getComparableNameVariants(candidate.cardName);

    if (candidateVariants.length === 0) {
      return false;
    }

    return !candidateVariants.some((variant) => excluded.has(variant));
  });
}

function applyLimit(
  candidates: RecommendationPoolCard[],
  limit: number | undefined,
): RecommendationPoolCard[] {
  if (!limit || limit <= 0) return candidates;
  return candidates.slice(0, limit);
}

function colorsAreCompatible(
  candidateColors: string[],
  commanderColors: string[],
): boolean {
  if (candidateColors.length === 0) return true;
  if (candidateColors.every((color) => color === 'C')) return true;
  if (commanderColors.length === 0) return true;
  if (commanderColors.length === 1 && commanderColors[0] === 'C') {
    return candidateColors.every((color) => color === 'C');
  }

  return candidateColors.every((color) => commanderColors.includes(color));
}

function deriveRolesFromCardRecord(card: ScryfallCardRecord): RecommendationRole[] {
  const roles = new Set<RecommendationRole>();
  const typeLine = card.typeLine ?? '';
  const text = card.oracleText ?? '';
  const normalizedType = typeLine.toLowerCase();
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes('add {') || normalizedText.includes('add one mana')) {
    roles.add('manaRock');
    roles.add('ramp');
  }

  if (
    normalizedText.includes('search your library for a land') ||
    normalizedText.includes('put a land card') ||
    normalizedText.includes('additional land')
  ) {
    roles.add('landRamp');
    roles.add('ramp');
  }

  if (
    normalizedText.includes('draw a card') ||
    normalizedText.includes('draw two cards') ||
    normalizedText.includes('whenever you draw')
  ) {
    roles.add('draw');
  }

  if (
    normalizedText.includes('destroy target') ||
    normalizedText.includes('exile target') ||
    normalizedText.includes('deals damage to target creature') ||
    normalizedText.includes('deals damage to any target')
  ) {
    roles.add('singleRemoval');
  }

  if (
    normalizedText.includes('destroy all') ||
    normalizedText.includes('exile all') ||
    normalizedText.includes('each creature') ||
    normalizedText.includes('all creatures get')
  ) {
    roles.add('boardWipe');
  }

  if (
    normalizedText.includes('hexproof') ||
    normalizedText.includes('indestructible') ||
    normalizedText.includes('ward') ||
    normalizedText.includes('protection from')
  ) {
    roles.add('protection');
  }

  if (normalizedText.includes('haste') || normalizedText.includes('gain haste')) {
    roles.add('haste');
  }

  if (
    normalizedText.includes('create') &&
    normalizedText.includes('token')
  ) {
    roles.add('tokenMaker');
  }

  if (
    normalizedText.includes('whenever a creature enters') ||
    normalizedText.includes('whenever another creature enters') ||
    normalizedText.includes('whenever one or more creatures')
  ) {
    roles.add('tokenPayoff');
  }

  if (
    normalizedText.includes('sacrifice a creature') ||
    normalizedText.includes('sacrifice another creature') ||
    normalizedText.includes('sacrifice a goblin')
  ) {
    roles.add('sacOutlet');
  }

  if (
    normalizedText.includes('dies') ||
    normalizedText.includes('whenever another creature dies')
  ) {
    roles.add('deathPayoff');
  }

  if (
    normalizedText.includes('untap') ||
    normalizedText.includes('copy') ||
    normalizedText.includes('infinite')
  ) {
    roles.add('combo');
  }

  if (
    normalizedText.includes('you win the game') ||
    normalizedText.includes('double the number of') ||
    normalizedText.includes('each opponent loses') ||
    normalizedText.includes('whenever a creature enters the battlefield under your control')
  ) {
    roles.add('finisher');
  }

  if (
    normalizedType.includes('artifact') ||
    normalizedType.includes('enchantment') ||
    normalizedType.includes('creature')
  ) {
    roles.add('synergy');
  }

  return Array.from(roles);
}

function deriveTagsFromCardRecord(card: ScryfallCardRecord): RecommendationTag[] {
  const tags = new Set<RecommendationTag>();
  const typeLine = (card.typeLine ?? '').toLowerCase();
  const text = (card.oracleText ?? '').toLowerCase();
  const name = card.name.toLowerCase();

  if (text.includes('token') || text.includes('populate')) {
    tags.add('tokens');
  }

  if (text.includes('sacrifice')) {
    tags.add('sacrifice');
  }

  if (text.includes('dies') || text.includes('graveyard')) {
    tags.add('aristocrats');
  }

  if (typeLine.includes('goblin') || name.includes('goblin')) {
    tags.add('tribal');
  }

  if (
    text.includes('combat') ||
    text.includes('attacking') ||
    text.includes('whenever creatures you control attack')
  ) {
    tags.add('aggro');
  }

  if (
    text.includes('draw') ||
    text.includes('value') ||
    text.includes('whenever you cast')
  ) {
    tags.add('midrange');
  }

  if (
    text.includes('untap') ||
    text.includes('copy') ||
    text.includes('infinite') ||
    text.includes('whenever you sacrifice')
  ) {
    tags.add('combo');
  }

  return Array.from(tags);
}

function deriveCategoryFromRoles(
  roles: RecommendationRole[],
): RecommendationCategory {
  if (roles.includes('ramp') || roles.includes('manaRock') || roles.includes('landRamp')) {
    return 'Ramp';
  }

  if (roles.includes('draw')) {
    return 'Draw';
  }

  if (roles.includes('singleRemoval') || roles.includes('boardWipe')) {
    return 'Removal';
  }

  if (roles.includes('protection')) {
    return 'Protection';
  }

  if (roles.includes('finisher')) {
    return 'Finisher';
  }

  return 'Synergy';
}

function buildFallbackReason(
  card: ScryfallCardRecord,
  roles: RecommendationRole[],
  tags: RecommendationTag[],
): string {
  if (roles.includes('manaRock') || roles.includes('landRamp') || roles.includes('ramp')) {
    return `${card.name} looks like a strong mana-development option for this shell.`;
  }

  if (roles.includes('draw')) {
    return `${card.name} looks like a useful card-advantage option for this shell.`;
  }

  if (roles.includes('singleRemoval') || roles.includes('boardWipe')) {
    return `${card.name} looks like a useful interaction piece for this shell.`;
  }

  if (roles.includes('protection')) {
    return `${card.name} looks like a solid protection piece for this shell.`;
  }

  if (roles.includes('finisher')) {
    return `${card.name} looks like a plausible closing piece for this shell.`;
  }

  if (tags.includes('combo')) {
    return `${card.name} may support combo-oriented lines in this shell.`;
  }

  if (tags.includes('tokens')) {
    return `${card.name} appears to support token-oriented play patterns.`;
  }

  return `${card.name} appears to be a generally relevant synergy option for this shell.`;
}

function mapCardRecordToRecommendationPoolCard(
  card: ScryfallCardRecord,
): RecommendationPoolCard | null {
  const cardName = card.name?.trim();

  if (!cardName) return null;

  const colors = Array.isArray(card.colorIdentity)
    ? (card.colorIdentity.filter(Boolean) as DeckColor[])
    : [];

  const roles = deriveRolesFromCardRecord(card);
  const tags = deriveTagsFromCardRecord(card);

  if (roles.length === 0 && tags.length === 0) {
    return null;
  }

  const category = deriveCategoryFromRoles(roles);

  return {
    cardName,
    category,
    reason: buildFallbackReason(card, roles, tags),
    priority: 40,
    colors,
    roles,
    tags,
    imageUrl: card.imageUrl,
    scryfallId: card.id,
  };
}

function getTagMatchCount(
  candidate: RecommendationPoolCard,
  preferredTags: string[],
): number {
  if (preferredTags.length === 0) return 0;

  const preferred = new Set(preferredTags.map((tag) => tag.toLowerCase()));
  return candidate.tags.filter((tag) => preferred.has(tag.toLowerCase())).length;
}

function getRoleMatchCount(
  candidate: RecommendationPoolCard,
  preferredRoles: string[],
): number {
  if (preferredRoles.length === 0) return 0;

  const preferred = new Set(preferredRoles.map((role) => role.toLowerCase()));
  return candidate.roles.filter((role) => preferred.has(role.toLowerCase())).length;
}

function getCategoryFitScore(
  candidate: RecommendationPoolCard,
  categories: RecommendationCategory[] | undefined,
): number {
  if (!categories || categories.length === 0) return 0;
  return categories.includes(candidate.category) ? 8 : -6;
}

function getColorFitScore(
  candidate: RecommendationPoolCard,
  commanderColors: string[],
): number {
  if (colorsAreCompatible(candidate.colors, commanderColors)) {
    if (candidate.colors.length === 0) return 4;
    if (candidate.colors.every((color) => commanderColors.includes(color))) {
      return 10;
    }
  }

  return -100;
}

function getRoleShapeScore(candidate: RecommendationPoolCard): number {
  let score = 0;

  if (candidate.roles.includes('ramp')) score += 5;
  if (candidate.roles.includes('draw')) score += 5;
  if (candidate.roles.includes('singleRemoval')) score += 4;
  if (candidate.roles.includes('boardWipe')) score += 3;
  if (candidate.roles.includes('protection')) score += 4;
  if (candidate.roles.includes('tokenMaker')) score += 5;
  if (candidate.roles.includes('tokenPayoff')) score += 5;
  if (candidate.roles.includes('tribalPayoff')) score += 5;
  if (candidate.roles.includes('sacOutlet')) score += 5;
  if (candidate.roles.includes('deathPayoff')) score += 4;
  if (candidate.roles.includes('haste')) score += 4;
  if (candidate.roles.includes('combo')) score += 5;
  if (candidate.roles.includes('finisher')) score += 6;

  return score;
}

function getGeneralSynergySignalScore(candidate: RecommendationPoolCard): number {
  let score = 0;

  if (candidate.roles.includes('synergy')) score += 3;
  if (candidate.roles.includes('tokenMaker')) score += 2;
  if (candidate.roles.includes('tokenPayoff')) score += 2;
  if (candidate.roles.includes('sacOutlet')) score += 2;
  if (candidate.roles.includes('deathPayoff')) score += 2;
  if (candidate.roles.includes('haste')) score += 2;
  if (candidate.tags.includes('tokens')) score += 2;
  if (candidate.tags.includes('sacrifice')) score += 2;
  if (candidate.tags.includes('aristocrats')) score += 2;
  if (candidate.tags.includes('tribal')) score += 2;
  if (candidate.tags.includes('combo')) score += 2;
  if (candidate.tags.includes('aggro')) score += 1;
  if (candidate.tags.includes('midrange')) score += 1;

  return score;
}

function buildDeckShellProfile(deckCardNames: string[]): DeckShellProfile {
  const normalizedNames = normalizeStringArray(deckCardNames).map((name) =>
    name.toLowerCase(),
  );

  const shellThemeSet = new Set<string>();
  const shellKeywordSet = new Set<string>();
  const shellQuerySet = new Set<string>();

  const joined = normalizedNames.join(' | ');

  const goblinCount = normalizedNames.filter((name) => name.includes('goblin')).length;
  const dragonCount = normalizedNames.filter((name) => name.includes('dragon')).length;
  const elfCount = normalizedNames.filter((name) => name.includes('elf')).length;
  const zombieCount = normalizedNames.filter((name) => name.includes('zombie')).length;
  const vampireCount = normalizedNames.filter((name) => name.includes('vampire')).length;

  if (goblinCount >= 3) {
    shellThemeSet.add('goblin-tribal');
    shellKeywordSet.add('goblin');
    shellKeywordSet.add('tribal');
    shellKeywordSet.add('lord');
    shellQuerySet.add('goblin tribal payoff');
    shellQuerySet.add('goblin token payoff');
  }

  if (dragonCount >= 3) {
    shellThemeSet.add('dragon-tribal');
    shellKeywordSet.add('dragon');
    shellKeywordSet.add('tribal');
    shellQuerySet.add('dragon tribal payoff');
  }

  if (elfCount >= 3) {
    shellThemeSet.add('elf-tribal');
    shellKeywordSet.add('elf');
    shellKeywordSet.add('tribal');
    shellQuerySet.add('elf tribal payoff');
  }

  if (zombieCount >= 3) {
    shellThemeSet.add('zombie-tribal');
    shellKeywordSet.add('zombie');
    shellKeywordSet.add('tribal');
    shellQuerySet.add('zombie tribal payoff');
  }

  if (vampireCount >= 3) {
    shellThemeSet.add('vampire-tribal');
    shellKeywordSet.add('vampire');
    shellKeywordSet.add('tribal');
    shellQuerySet.add('vampire tribal payoff');
  }

  if (
    joined.includes('krenko') ||
    joined.includes('dragon fodder') ||
    joined.includes("krenko's command") ||
    joined.includes('mogg war marshal') ||
    joined.includes('siege-gang commander')
  ) {
    shellThemeSet.add('tokens');
    shellThemeSet.add('go-wide');
    shellKeywordSet.add('token');
    shellKeywordSet.add('creature token');
    shellKeywordSet.add('go wide');
    shellQuerySet.add('token maker token payoff');
    shellQuerySet.add('wide board creature payoff');
  }

  if (
    joined.includes('goblin bombardment') ||
    joined.includes('ashnod') ||
    joined.includes('skirk prospector') ||
    joined.includes('thermopod') ||
    joined.includes('blasting station')
  ) {
    shellThemeSet.add('sacrifice');
    shellKeywordSet.add('sacrifice');
    shellKeywordSet.add('sac outlet');
    shellQuerySet.add('free sacrifice outlet');
    shellQuerySet.add('sacrifice creature payoff');
  }

  if (
    joined.includes('impact tremors') ||
    joined.includes('purphoros') ||
    joined.includes('boggart shenanigans')
  ) {
    shellThemeSet.add('aristocrats');
    shellThemeSet.add('death-triggers');
    shellKeywordSet.add('dies');
    shellKeywordSet.add('death');
    shellKeywordSet.add('drain');
    shellQuerySet.add('creature dies opponent loses life');
    shellQuerySet.add('death trigger payoff');
  }

  if (
    joined.includes('lightning greaves') ||
    joined.includes('swiftfoot boots') ||
    joined.includes('goblin chieftain') ||
    joined.includes('goblin warchief')
  ) {
    shellThemeSet.add('haste');
    shellThemeSet.add('aggro');
    shellKeywordSet.add('haste');
    shellKeywordSet.add('attack');
    shellQuerySet.add('combat finisher haste');
    shellQuerySet.add('attack step payoff');
  }

  if (
    joined.includes('thornbite staff') ||
    joined.includes('staff of domination') ||
    joined.includes('sword of the paruns') ||
    joined.includes('thousand-year elixir')
  ) {
    shellThemeSet.add('combo');
    shellKeywordSet.add('untap');
    shellKeywordSet.add('combo');
    shellKeywordSet.add('loop');
    shellQuerySet.add('untap combo piece');
    shellQuerySet.add('mana combo engine');
  }

  if (
    joined.includes('skullclamp') ||
    joined.includes('idol of oblivion') ||
    joined.includes('goblin ringleader')
  ) {
    shellThemeSet.add('value');
    shellThemeSet.add('draw');
    shellKeywordSet.add('draw');
    shellKeywordSet.add('card advantage');
    shellQuerySet.add('repeatable draw engine');
    shellQuerySet.add('card advantage permanent');
  }

  if (
    joined.includes('sol ring') ||
    joined.includes('ashnod') ||
    joined.includes('skirk prospector') ||
    joined.includes('thermopod')
  ) {
    shellThemeSet.add('mana');
    shellThemeSet.add('ramp');
    shellKeywordSet.add('mana');
    shellKeywordSet.add('ramp');
    shellKeywordSet.add('treasure');
    shellQuerySet.add('mana rock ramp');
    shellQuerySet.add('mana engine creature');
  }

  if (
    joined.includes('chaos warp') ||
    joined.includes('abrade') ||
    joined.includes('chain reaction') ||
    joined.includes('gempalm incinerator')
  ) {
    shellThemeSet.add('interaction');
    shellThemeSet.add('control');
    shellKeywordSet.add('destroy');
    shellKeywordSet.add('exile');
    shellKeywordSet.add('interaction');
    shellQuerySet.add('cheap removal interaction');
    shellQuerySet.add('destroy target exile target');
  }

  return {
    shellThemes: Array.from(shellThemeSet),
    shellKeywords: Array.from(shellKeywordSet),
    shellQueries: Array.from(shellQuerySet),
  };
}

function getDeckShellAlignmentScore(
  candidate: RecommendationPoolCard,
  shellProfile: DeckShellProfile,
): number {
  let score = 0;

  const shellThemes = new Set(shellProfile.shellThemes);

  if (shellThemes.has('tokens') && candidate.tags.includes('tokens')) score += 8;
  if (shellThemes.has('go-wide') && candidate.roles.includes('tokenPayoff')) score += 8;
  if (shellThemes.has('sacrifice') && candidate.tags.includes('sacrifice')) score += 8;
  if (shellThemes.has('aristocrats') && candidate.tags.includes('aristocrats')) score += 8;
  if (shellThemes.has('death-triggers') && candidate.roles.includes('deathPayoff')) score += 7;
  if (shellThemes.has('haste') && candidate.roles.includes('haste')) score += 7;
  if (shellThemes.has('combo') && candidate.tags.includes('combo')) score += 8;
  if (shellThemes.has('value') && candidate.roles.includes('draw')) score += 6;
  if (shellThemes.has('mana') && candidate.roles.includes('ramp')) score += 6;
  if (shellThemes.has('interaction') && candidate.category === 'Removal') score += 6;

  if (
    shellThemes.has('goblin-tribal') &&
    candidate.tags.includes('tribal')
  ) {
    score += 10;
  }

  if (
    shellThemes.has('dragon-tribal') &&
    candidate.tags.includes('tribal')
  ) {
    score += 10;
  }

  if (
    shellThemes.has('elf-tribal') &&
    candidate.tags.includes('tribal')
  ) {
    score += 10;
  }

  if (
    shellThemes.has('zombie-tribal') &&
    candidate.tags.includes('tribal')
  ) {
    score += 10;
  }

  if (
    shellThemes.has('vampire-tribal') &&
    candidate.tags.includes('tribal')
  ) {
    score += 10;
  }

  return score;
}

function getBroadUtilityScore(candidate: RecommendationPoolCard): number {
  let score = 0;

  if (candidate.roles.includes('ramp')) score += 3;
  if (candidate.roles.includes('manaRock')) score += 2;
  if (candidate.roles.includes('landRamp')) score += 2;
  if (candidate.roles.includes('draw')) score += 3;
  if (candidate.roles.includes('singleRemoval')) score += 3;
  if (candidate.roles.includes('boardWipe')) score += 2;
  if (candidate.roles.includes('protection')) score += 2;
  if (candidate.roles.includes('finisher')) score += 2;
  if (candidate.roles.includes('synergy')) score += 1;

  return score;
}

function getGenericFillerPenalty(
  candidate: RecommendationPoolCard,
  shellAlignmentScore: number,
  tagMatches: number,
  roleMatches: number,
  categoryFit: number,
): number {
  const hasTokensLikeSignal =
    candidate.tags.includes('tokens') ||
    candidate.roles.includes('tokenMaker') ||
    candidate.roles.includes('tokenPayoff');

  const hasSacrificeLikeSignal =
    candidate.tags.includes('sacrifice') ||
    candidate.tags.includes('aristocrats') ||
    candidate.roles.includes('sacOutlet') ||
    candidate.roles.includes('deathPayoff');

  const hasComboLikeSignal =
    candidate.tags.includes('combo') ||
    candidate.roles.includes('combo');

  const hasTribalLikeSignal =
    candidate.tags.includes('tribal') ||
    candidate.roles.includes('tribalPayoff');

  const hasShellStyleSignal =
    hasTokensLikeSignal ||
    hasSacrificeLikeSignal ||
    hasComboLikeSignal ||
    hasTribalLikeSignal ||
    candidate.roles.includes('haste');

  const broadUtilityScore = getBroadUtilityScore(candidate);

  let penalty = 0;

  if (shellAlignmentScore <= 0 && tagMatches === 0 && roleMatches === 0) {
    penalty += 10;
  }

  if (shellAlignmentScore <= 0 && !hasShellStyleSignal) {
    penalty += 6;
  }

  if (categoryFit <= 0 && candidate.category === 'Synergy') {
    penalty += 4;
  }

  if (
    broadUtilityScore >= 6 &&
    shellAlignmentScore <= 0 &&
    tagMatches === 0 &&
    roleMatches === 0
  ) {
    penalty += 6;
  }

  if (
    candidate.roles.includes('synergy') &&
    candidate.roles.length <= 2 &&
    candidate.tags.length === 0 &&
    shellAlignmentScore <= 0
  ) {
    penalty += 5;
  }

  if (
    candidate.category !== 'Removal' &&
    candidate.category !== 'Protection' &&
    broadUtilityScore >= 5 &&
    !hasShellStyleSignal &&
    shellAlignmentScore <= 0
  ) {
    penalty += 4;
  }

  return penalty;
}

function getFallbackSpecificityPenalty(
  candidate: RecommendationPoolCard,
  alignment: CandidateAlignmentProfile,
): number {
  let penalty = 0;

  if (alignment.hasMeaningfulAlignment) {
    return penalty;
  }

  penalty += 10;

  if (alignment.broadUtilityScore >= 5) {
    penalty += 4;
  }

  if (candidate.category === 'Synergy') {
    penalty += 3;
  }

  if (candidate.roles.includes('synergy') && candidate.tags.length === 0) {
    penalty += 3;
  }

  return penalty;
}

function buildCandidateAlignmentProfile(
  candidate: RecommendationPoolCard,
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  shellProfile: DeckShellProfile,
): CandidateAlignmentProfile {
  const tagMatches = getTagMatchCount(candidate, preferredTags);
  const roleMatches = getRoleMatchCount(candidate, preferredRoles);
  const categoryFit = getCategoryFitScore(candidate, categories);
  const roleShapeScore = getRoleShapeScore(candidate);
  const generalSynergyScore = getGeneralSynergySignalScore(candidate);
  const shellAlignmentScore = getDeckShellAlignmentScore(candidate, shellProfile);
  const broadUtilityScore = getBroadUtilityScore(candidate);

  const hasExplicitPreferenceAlignment = tagMatches > 0 || roleMatches > 0;
  const hasMeaningfulShellAlignment = shellAlignmentScore >= 7;
  const hasMeaningfulCategoryAlignment = categoryFit > 0 && roleShapeScore >= 5;

  const fillerPenalty = getGenericFillerPenalty(
    candidate,
    shellAlignmentScore,
    tagMatches,
    roleMatches,
    categoryFit,
  );

  const hasMeaningfulAlignment =
    hasExplicitPreferenceAlignment ||
    hasMeaningfulShellAlignment ||
    hasMeaningfulCategoryAlignment;

  const specificityPenalty = getFallbackSpecificityPenalty(candidate, {
    tagMatches,
    roleMatches,
    categoryFit,
    roleShapeScore,
    generalSynergyScore,
    shellAlignmentScore,
    broadUtilityScore,
    fillerPenalty,
    specificityPenalty: 0,
    hasExplicitPreferenceAlignment,
    hasMeaningfulShellAlignment,
    hasMeaningfulCategoryAlignment,
    hasMeaningfulAlignment,
  });

  return {
    tagMatches,
    roleMatches,
    categoryFit,
    roleShapeScore,
    generalSynergyScore,
    shellAlignmentScore,
    broadUtilityScore,
    fillerPenalty,
    specificityPenalty,
    hasExplicitPreferenceAlignment,
    hasMeaningfulShellAlignment,
    hasMeaningfulCategoryAlignment,
    hasMeaningfulAlignment,
  };
}

function getFallbackSurvivalScore(
  candidate: RecommendationPoolCard,
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  shellProfile: DeckShellProfile,
): number {
  const alignment = buildCandidateAlignmentProfile(
    candidate,
    preferredTags,
    preferredRoles,
    categories,
    shellProfile,
  );

  let score = 0;

  if (alignment.categoryFit > 0) score += 4;

  score += alignment.tagMatches * 4;
  score += alignment.roleMatches * 5;
  score += alignment.roleShapeScore;
  score += alignment.generalSynergyScore;
  score += alignment.shellAlignmentScore;
  score -= alignment.fillerPenalty;
  score -= alignment.specificityPenalty;

  return score;
}

function passesFallbackSurvivalThreshold(
  candidate: RecommendationPoolCard,
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  shellProfile: DeckShellProfile,
): boolean {
  const hasPreferenceSignals =
    preferredTags.length > 0 || preferredRoles.length > 0 || Boolean(categories?.length);

  const alignment = buildCandidateAlignmentProfile(
    candidate,
    preferredTags,
    preferredRoles,
    categories,
    shellProfile,
  );

  const survivalScore = getFallbackSurvivalScore(
    candidate,
    preferredTags,
    preferredRoles,
    categories,
    shellProfile,
  );

  if (!hasPreferenceSignals) {
    return alignment.hasMeaningfulAlignment
      ? survivalScore >= 10
      : survivalScore >= 16;
  }

  if (!alignment.hasMeaningfulAlignment) {
    return survivalScore >= 18;
  }

  return survivalScore >= 12;
}

function filterFallbackRecords(
  cards: ScryfallCardRecord[],
  commanderColors: string[],
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  shellProfile: DeckShellProfile,
): RecommendationPoolCard[] {
  return cards
    .map(mapCardRecordToRecommendationPoolCard)
    .filter((card): card is RecommendationPoolCard => Boolean(card))
    .filter((card) => colorsAreCompatible(card.colors, commanderColors))
    .filter((card) =>
      passesFallbackSurvivalThreshold(
        card,
        preferredTags,
        preferredRoles,
        categories,
        shellProfile,
      ),
    );
}

function getOriginScore(origin: CandidateOrigin): number {
  return origin === 'primary' ? 18 : 4;
}

function scoreSearchCandidate(
  candidate: RecommendationPoolCard,
  commanderColors: string[],
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  origin: CandidateOrigin,
  shellProfile: DeckShellProfile,
): number {
  const alignment = buildCandidateAlignmentProfile(
    candidate,
    preferredTags,
    preferredRoles,
    categories,
    shellProfile,
  );

  let score =
    candidate.priority +
    getOriginScore(origin) +
    getColorFitScore(candidate, commanderColors) +
    alignment.categoryFit +
    alignment.roleShapeScore +
    alignment.shellAlignmentScore +
    alignment.tagMatches * 14 +
    alignment.roleMatches * 16;

  if (origin === 'fallback') {
    score += alignment.generalSynergyScore;
    score -= alignment.fillerPenalty * 2;
    score -= alignment.specificityPenalty * 2;

    if (!alignment.hasMeaningfulAlignment) {
      score -= 12;
    }

    if (
      alignment.shellAlignmentScore <= 0 &&
      alignment.tagMatches === 0 &&
      alignment.roleMatches === 0
    ) {
      score -= 8;
    }
  } else {
    score += Math.floor(alignment.generalSynergyScore / 2);
  }

  return score;
}

function rankCandidates(
  candidates: RecommendationPoolCard[],
  commanderColors: string[],
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  origin: CandidateOrigin,
  shellProfile: DeckShellProfile,
): WeightedCandidate[] {
  return candidates
    .map((candidate) => ({
      candidate,
      origin,
      score: scoreSearchCandidate(
        candidate,
        commanderColors,
        preferredTags,
        preferredRoles,
        categories,
        origin,
        shellProfile,
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

function mergeWeightedCandidatePools(
  primaryCandidates: RecommendationPoolCard[],
  fallbackCandidates: RecommendationPoolCard[],
  commanderColors: string[],
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  shellProfile: DeckShellProfile,
): RecommendationPoolCard[] {
  const weighted = [
    ...rankCandidates(
      primaryCandidates,
      commanderColors,
      preferredTags,
      preferredRoles,
      categories,
      'primary',
      shellProfile,
    ),
    ...rankCandidates(
      fallbackCandidates,
      commanderColors,
      preferredTags,
      preferredRoles,
      categories,
      'fallback',
      shellProfile,
    ),
  ];

  const seen = new Set<string>();
  const merged: RecommendationPoolCard[] = [];

  for (const item of weighted.sort((a, b) => b.score - a.score)) {
    const key = normalizeLooseNameForCompare(item.candidate.cardName);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push({
      ...item.candidate,
      priority: Math.max(item.candidate.priority, item.score),
    });
  }

  return merged;
}

async function searchFallbackCards(
  commanderColors: string[],
  deckCardNames: string[],
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
  requestedLimit: number | undefined,
): Promise<RecommendationPoolCard[]> {
  const provider = getActiveCardDataProvider();
  const expandedThemes = expandProviderThemes({
    preferredTags,
    preferredRoles,
    categories,
  });

  const shellProfile = buildDeckShellProfile(deckCardNames);

  const fallbackQueries = [
    normalizeSearchQuery({
      filters: {
        commanderColors: commanderColors as DeckColor[],
        legalInCommander: true,
        categories,
        requiredTags: preferredTags,
        requiredRoles: preferredRoles,
        limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 3 : 150,
      },
    }),
    normalizeSearchQuery({
      filters: {
        commanderColors: commanderColors as DeckColor[],
        legalInCommander: true,
        categories,
        typeIncludes: ['Creature', 'Artifact', 'Enchantment'],
        limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 3 : 150,
      },
    }),
    normalizeSearchQuery({
      filters: {
        commanderColors: commanderColors as DeckColor[],
        legalInCommander: true,
        categories,
        textIncludes: [
          ...preferredTags,
          ...preferredRoles,
          'token',
          'draw',
          'destroy',
          'haste',
          'sacrifice',
          ...shellProfile.shellKeywords,
        ],
        limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 4 : 200,
      },
    }),
    ...expandedThemes.themeTextQueries.slice(0, 4).map((themeTextQuery) =>
      normalizeSearchQuery({
        text: themeTextQuery,
        filters: {
          commanderColors: commanderColors as DeckColor[],
          legalInCommander: true,
          categories,
          textIncludes: [
            ...expandedThemes.themeKeywords.slice(0, 20),
            ...shellProfile.shellKeywords,
          ],
          typeIncludes: ['Creature', 'Artifact', 'Enchantment'],
          limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 4 : 220,
        },
      }),
    ),
    ...shellProfile.shellQueries.slice(0, 4).map((shellQuery) =>
      normalizeSearchQuery({
        text: shellQuery,
        filters: {
          commanderColors: commanderColors as DeckColor[],
          legalInCommander: true,
          categories,
          textIncludes: shellProfile.shellKeywords,
          typeIncludes: ['Creature', 'Artifact', 'Enchantment'],
          limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 4 : 220,
        },
      }),
    ),
    normalizeSearchQuery({
      text: [
        ...expandedThemes.themeKeywords.slice(0, 8),
        ...shellProfile.shellKeywords.slice(0, 8),
      ].join(' '),
      filters: {
        commanderColors: commanderColors as DeckColor[],
        legalInCommander: true,
        categories,
        textIncludes: [
          ...expandedThemes.themeKeywords.slice(0, 20),
          ...shellProfile.shellKeywords,
        ],
        typeIncludes: ['Creature', 'Artifact', 'Enchantment'],
        limit: requestedLimit && requestedLimit > 0 ? requestedLimit * 4 : 220,
      },
    }),
  ];

  const allFallbackCards: RecommendationPoolCard[] = [];

  for (const query of fallbackQueries) {
    const result = await provider.searchCards(query);

    const mapped = filterFallbackRecords(
      result.cards,
      commanderColors,
      preferredTags,
      preferredRoles,
      categories,
      shellProfile,
    );

    allFallbackCards.push(...mapped);
  }

  return dedupeCandidatesByName(allFallbackCards);
}

export async function searchProviderRecommendationCandidates(
  input: ProviderCandidateSearchInput,
): Promise<ProviderCandidateSearchResult> {
  const provider = getActiveCardDataProvider();

  const normalizedInput = normalizeCandidateGenerationInput({
    commanderColors: input.commanderColors as any,
    deckCardNames: input.deckCardNames,
    preferredTags: input.preferredTags,
    preferredRoles: input.preferredRoles,
    categories: input.categories,
    limit: input.limit,
  });

  const providerResult = await provider.getRecommendationCandidates(normalizedInput);

  const normalizedPreferredTags = normalizeStringArray(normalizedInput.preferredTags);
  const normalizedPreferredRoles = normalizeStringArray(normalizedInput.preferredRoles);
  const shellProfile = buildDeckShellProfile(normalizedInput.deckCardNames);

  const primaryCandidates = dedupeCandidatesByName(providerResult.candidates);
  let fallbackCandidates: RecommendationPoolCard[] = [];

  const needsFallback =
    primaryCandidates.length < Math.max(25, Math.floor((normalizedInput.limit ?? 100) / 2));

  if (needsFallback) {
    fallbackCandidates = await searchFallbackCards(
      normalizedInput.commanderColors,
      normalizedInput.deckCardNames,
      normalizedPreferredTags,
      normalizedPreferredRoles,
      normalizedInput.categories,
      normalizedInput.limit,
    );
  }

  let candidates = mergeWeightedCandidatePools(
    primaryCandidates,
    fallbackCandidates,
    normalizedInput.commanderColors,
    normalizedPreferredTags,
    normalizedPreferredRoles,
    normalizedInput.categories,
    shellProfile,
  );

  candidates = excludeLoadedDeckCards(candidates, normalizedInput.deckCardNames);
  candidates = applyLimit(candidates, normalizedInput.limit);

  return {
    candidates,
    source: providerResult.source,
    totalConsidered: primaryCandidates.length + fallbackCandidates.length,
    totalReturned: candidates.length,
  };
}
