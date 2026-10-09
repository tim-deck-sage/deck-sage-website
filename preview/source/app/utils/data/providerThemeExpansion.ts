import type {
  RecommendationCategory,
} from '../../types/deckUpgrade';

export interface ExpandedThemeProfile {
  detectedThemes: string[];
  themeKeywords: string[];
  themeTextQueries: string[];
}

function normalizeValues(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function addAll(target: Set<string>, values: string[]) {
  for (const value of values) {
    const cleaned = value.trim().toLowerCase();
    if (cleaned) {
      target.add(cleaned);
    }
  }
}

function detectThemes(
  preferredTags: string[],
  preferredRoles: string[],
  categories: RecommendationCategory[] | undefined,
): string[] {
  const themes = new Set<string>();
  const tags = new Set(preferredTags);
  const roles = new Set(preferredRoles);
  const categorySet = new Set(categories ?? []);

  if (
    tags.has('tribal') ||
    roles.has('tribalpayoff')
  ) {
    themes.add('tribal');
  }

  if (
    tags.has('tokens') ||
    roles.has('tokenmaker') ||
    roles.has('tokenpayoff')
  ) {
    themes.add('tokens');
    themes.add('go-wide');
  }

  if (
    tags.has('sacrifice') ||
    roles.has('sacoutlet')
  ) {
    themes.add('sacrifice');
  }

  if (
    tags.has('aristocrats') ||
    roles.has('deathpayoff')
  ) {
    themes.add('aristocrats');
    themes.add('death-triggers');
  }

  if (
    tags.has('combo') ||
    roles.has('combo')
  ) {
    themes.add('combo');
  }

  if (
    tags.has('aggro') ||
    roles.has('haste') ||
    categorySet.has('Finisher')
  ) {
    themes.add('aggro');
    themes.add('combat');
  }

  if (
    tags.has('midrange') ||
    categorySet.has('Draw') ||
    categorySet.has('Protection')
  ) {
    themes.add('midrange');
    themes.add('value');
  }

  if (
    categorySet.has('Removal') ||
    categorySet.has('Protection')
  ) {
    themes.add('control');
    themes.add('interaction');
  }

  if (
    categorySet.has('Ramp') ||
    roles.has('ramp') ||
    roles.has('manarock') ||
    roles.has('landramp')
  ) {
    themes.add('mana');
  }

  return Array.from(themes);
}

function buildThemeKeywordMap(): Record<string, string[]> {
  return {
    tribal: [
      'tribal',
      'creature type',
      'lord',
      'goblin',
      'warrior',
      'zombie',
      'elf',
      'soldier',
    ],
    tokens: [
      'token',
      'creature token',
      'create',
      'populate',
      'double token',
    ],
    'go-wide': [
      'go wide',
      'go-wide',
      'whenever creatures you control',
      'for each creature',
      'anthem',
    ],
    sacrifice: [
      'sacrifice',
      'sacrifice a creature',
      'sacrifice another creature',
      'sac outlet',
    ],
    aristocrats: [
      'dies',
      'death',
      'graveyard',
      'drain',
      'whenever another creature dies',
    ],
    'death-triggers': [
      'dies',
      'death trigger',
      'when this creature dies',
      'whenever another creature dies',
    ],
    combo: [
      'combo',
      'untap',
      'copy',
      'infinite',
      'mana engine',
      'loop',
    ],
    aggro: [
      'combat',
      'attacking',
      'attack',
      'extra combat',
      'combat damage',
    ],
    combat: [
      'combat',
      'attacking',
      'declare attackers',
      'creatures you control attack',
    ],
    midrange: [
      'value',
      'advantage',
      'card advantage',
      'incremental',
    ],
    value: [
      'draw',
      'value',
      'whenever you cast',
      'enters the battlefield',
      'etb',
    ],
    control: [
      'destroy',
      'exile',
      'counter',
      'board wipe',
      'sweep',
      'interaction',
    ],
    interaction: [
      'destroy target',
      'exile target',
      'counter target',
      'remove',
    ],
    mana: [
      'mana',
      'add {',
      'treasure',
      'ramp',
      'land',
      'search your library for a land',
    ],
  };
}

function buildThemeQueryMap(): Record<string, string[]> {
  return {
    tribal: [
      'tribal creature type lord payoff',
      'goblin tribal payoff',
    ],
    tokens: [
      'create creature token payoff',
      'token maker token payoff',
    ],
    'go-wide': [
      'wide board creature payoff',
      'many creatures attack payoff',
    ],
    sacrifice: [
      'sacrifice creature payoff',
      'free sacrifice outlet',
    ],
    aristocrats: [
      'creature dies opponent loses life',
      'death trigger creature payoff',
    ],
    'death-triggers': [
      'whenever another creature dies payoff',
      'dies trigger payoff',
    ],
    combo: [
      'untap combo piece',
      'mana combo engine',
    ],
    aggro: [
      'combat finisher haste',
      'attack step payoff',
    ],
    combat: [
      'creatures attack payoff',
      'combat damage payoff',
    ],
    midrange: [
      'value engine creature',
      'incremental card advantage',
    ],
    value: [
      'enters the battlefield value',
      'repeatable draw engine',
    ],
    control: [
      'board wipe interaction protection',
      'removal draw control',
    ],
    interaction: [
      'cheap removal interaction',
      'exile destroy target',
    ],
    mana: [
      'mana rock ramp',
      'land ramp commander',
    ],
  };
}

export function expandProviderThemes(input: {
  preferredTags?: string[];
  preferredRoles?: string[];
  categories?: RecommendationCategory[];
}): ExpandedThemeProfile {
  const preferredTags = normalizeValues(input.preferredTags);
  const preferredRoles = normalizeValues(input.preferredRoles);
  const categories = input.categories;

  const detectedThemes = detectThemes(preferredTags, preferredRoles, categories);

  const keywordMap = buildThemeKeywordMap();
  const queryMap = buildThemeQueryMap();

  const keywordSet = new Set<string>();
  const querySet = new Set<string>();

  addAll(keywordSet, preferredTags);
  addAll(keywordSet, preferredRoles);

  for (const theme of detectedThemes) {
    addAll(keywordSet, keywordMap[theme] ?? []);
    addAll(querySet, queryMap[theme] ?? []);
  }

  for (const category of categories ?? []) {
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory === 'ramp') {
      addAll(keywordSet, ['ramp', 'mana', 'treasure', 'land']);
      addAll(querySet, ['mana rock ramp', 'land ramp commander']);
    }

    if (normalizedCategory === 'draw') {
      addAll(keywordSet, ['draw', 'card advantage', 'value']);
      addAll(querySet, ['repeatable draw engine', 'card advantage permanent']);
    }

    if (normalizedCategory === 'removal') {
      addAll(keywordSet, ['destroy', 'exile', 'interaction']);
      addAll(querySet, ['cheap removal interaction', 'destroy target exile target']);
    }

    if (normalizedCategory === 'protection') {
      addAll(keywordSet, ['hexproof', 'indestructible', 'ward', 'protection']);
      addAll(querySet, ['protect key creature', 'commander protection piece']);
    }

    if (normalizedCategory === 'finisher') {
      addAll(keywordSet, ['finisher', 'damage', 'double', 'close game']);
      addAll(querySet, ['game ending finisher', 'damage payoff finisher']);
    }

    if (normalizedCategory === 'synergy') {
      addAll(keywordSet, ['synergy', 'whenever', 'engine', 'payoff']);
      addAll(querySet, ['synergy engine payoff', 'commander synergy permanent']);
    }
  }

  return {
    detectedThemes,
    themeKeywords: Array.from(keywordSet),
    themeTextQueries: Array.from(querySet),
  };
}