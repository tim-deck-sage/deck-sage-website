// app/app/utils/commander/cardTagger.ts

export type CardTag =
  | 'fastMana'
  | 'tutor'
  | 'draw'
  | 'removal'
  | 'wipe'
  | 'protection'
  | 'extraTurn'
  | 'landDenial'
  | 'finisher'
  | 'comboPiece'
  | 'valueEngine'
  | 'recursion'
  | 'tokenMaker'
  | 'sacOutlet'
  | 'freeSacOutlet'
  | 'untapper'
  | 'manaUntapper'
  | 'deathTrigger'
  | 'damageOutlet'
  | 'costReducer'
  | 'castFromGraveyard'
  | 'castFromExile'
  | 'blink'
  | 'copyEffect'
  | 'commanderEngine'
  | 'manaPositive'
  | 'drawEngine';

export interface TaggedCard {
  name: string;
  tags: CardTag[];
}

const TAG_KEYWORDS: Record<CardTag, string[]> = {
  fastMana: [
    'add {',
    'add one mana',
    'add two mana',
    'add three mana',
    'add four mana',
    'mana of any color',
    'treasure token',
  ],
  tutor: [
    'search your library',
  ],
  draw: [
    'draw a card',
    'draw two cards',
    'draw three cards',
    'draw x cards',
    'whenever you draw a card',
  ],
  removal: [
    'destroy target',
    'exile target',
    'deals damage to target creature',
    'deals damage to any target',
    'target creature gets -',
  ],
  wipe: [
    'destroy all',
    'exile all',
    'each creature gets -',
    'all creatures get -',
  ],
  protection: [
    'hexproof',
    'indestructible',
    'protection from',
    'gains ward',
    'phases out',
  ],
  extraTurn: [
    'extra turn',
    'take an extra turn',
  ],
  landDenial: [
    'destroy all lands',
    'sacrifice all lands',
    'lands your opponents control',
  ],
  finisher: [
    'each opponent loses',
    'double damage',
    'combat damage to a player',
    'win the game',
  ],
  comboPiece: [
    'untap',
    'repeat this process',
    'whenever another creature dies',
    'whenever a creature dies',
    'whenever an artifact is put into a graveyard',
    'sacrifice a creature',
    'create x',
  ],
  valueEngine: [
    'whenever you',
    'whenever another',
    'at the beginning of',
    'whenever one or more',
  ],
  recursion: [
    'return from your graveyard',
    'from your graveyard to',
    'return target card from your graveyard',
    'return target creature card from your graveyard',
  ],
  tokenMaker: [
    'create a token',
    'create two',
    'create three',
    'create x',
    'create that many',
    'create a 1/1',
    'create a treasure token',
  ],
  sacOutlet: [
    'sacrifice a creature',
    'sacrifice another creature',
    'sacrifice an artifact',
    'sacrifice a goblin',
    'sacrifice another goblin',
  ],
  freeSacOutlet: [
    'sacrifice a creature:',
    'sacrifice another creature:',
    'sacrifice an artifact:',
    'sacrifice a goblin:',
    'sacrifice another goblin:',
    'sacrifice a creature,',
  ],
  untapper: [
    'untap equipped creature',
    'untap target creature',
    'untap this creature',
    'untap it',
    'untap all creatures',
  ],
  manaUntapper: [
    'untap target artifact',
    'untap all artifacts',
    'untap target permanent',
  ],
  deathTrigger: [
    'whenever a creature dies',
    'whenever another creature dies',
    'dies,',
    'is put into a graveyard from the battlefield',
  ],
  damageOutlet: [
    'deals 1 damage',
    'deals damage equal',
    'each opponent',
    'target opponent loses',
  ],
  costReducer: [
    'costs {1} less',
    'cost {1} less',
    'costs {2} less',
    'spells you cast cost',
    'goblin spells you cast cost',
    'artifact spells you cast cost',
  ],
  castFromGraveyard: [
    'cast from your graveyard',
    'play cards from your graveyard',
  ],
  castFromExile: [
    'cast from exile',
    'play cards from exile',
  ],
  blink: [
    'exile another target',
    'return it to the battlefield',
    'exile target creature you control',
  ],
  copyEffect: [
    'create a token that\'s a copy',
    'copy of target',
    'copy target instant',
    'copy target spell',
  ],
  commanderEngine: [
    'commander ninjutsu',
    'from the command zone',
  ],
  manaPositive: [
    'create a treasure token',
    'add three mana',
    'add four mana',
    'add x mana',
  ],
  drawEngine: [
    'whenever you cast',
    'whenever you draw',
    'whenever a creature enters',
    'whenever one or more creatures',
  ],
};

const NAME_BASED_TAGS: {
  match: (name: string) => boolean;
  tags: CardTag[];
}[] = [
  {
    match: (name) => name === 'krenko, mob boss',
    tags: ['tokenMaker', 'commanderEngine', 'comboPiece'],
  },
  {
    match: (name) => name === 'thornbite staff',
    tags: ['untapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'goblin bombardment',
    tags: ['sacOutlet', 'freeSacOutlet', 'damageOutlet', 'comboPiece'],
  },
  {
    match: (name) => name === 'skirk prospector',
    tags: ['sacOutlet', 'freeSacOutlet', 'fastMana', 'manaPositive', 'comboPiece'],
  },
  {
    match: (name) => name === 'ashnod\'s altar',
    tags: ['sacOutlet', 'freeSacOutlet', 'fastMana', 'manaPositive', 'comboPiece'],
  },
  {
    match: (name) => name === 'thermopod',
    tags: ['sacOutlet', 'freeSacOutlet', 'fastMana', 'manaPositive', 'comboPiece'],
  },
  {
    match: (name) => name === 'staff of domination',
    tags: ['untapper', 'manaUntapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'sword of the paruns',
    tags: ['untapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'thousand-year elixir',
    tags: ['untapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'impact tremors',
    tags: ['damageOutlet', 'finisher', 'comboPiece'],
  },
  {
    match: (name) => name === 'purphoros, god of the forge',
    tags: ['damageOutlet', 'finisher', 'comboPiece'],
  },
  {
    match: (name) => name === 'boggart shenanigans',
    tags: ['deathTrigger', 'damageOutlet', 'comboPiece'],
  },
  {
    match: (name) => name === 'goblin sharpshooter',
    tags: ['damageOutlet', 'untapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'underworld breach',
    tags: ['recursion', 'castFromGraveyard', 'comboPiece'],
  },
  {
    match: (name) => name === 'dockside extortionist',
    tags: ['fastMana', 'tokenMaker', 'manaPositive', 'comboPiece'],
  },
  {
    match: (name) => name === 'cloudstone curio',
    tags: ['comboPiece'],
  },
  {
    match: (name) => name === 'deadeye navigator',
    tags: ['blink', 'comboPiece'],
  },
  {
    match: (name) => name === 'temur sabertooth',
    tags: ['comboPiece'],
  },
  {
    match: (name) => name === 'isochron scepter',
    tags: ['comboPiece', 'valueEngine'],
  },
  {
    match: (name) => name === 'dramatic reversal',
    tags: ['manaUntapper', 'comboPiece'],
  },
  {
    match: (name) => name === 'food chain',
    tags: ['sacOutlet', 'manaPositive', 'comboPiece'],
  },
  {
    match: (name) => name === 'walking ballista',
    tags: ['damageOutlet', 'finisher', 'comboPiece'],
  },
  {
    match: (name) => name === 'heliod, sun-crowned',
    tags: ['valueEngine', 'comboPiece'],
  },
];

function addTag(tags: CardTag[], tag: CardTag) {
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
}

export function tagCard(
  name: string,
  oracleText: string = '',
): TaggedCard {
  const lowerText = oracleText.toLowerCase();
  const lowerName = name.trim().toLowerCase();

  const tags: CardTag[] = [];

  (Object.keys(TAG_KEYWORDS) as CardTag[]).forEach((tag) => {
    const keywords = TAG_KEYWORDS[tag];
    const match = keywords.some((kw) => lowerText.includes(kw));

    if (match) {
      addTag(tags, tag);
    }
  });

  for (const rule of NAME_BASED_TAGS) {
    if (rule.match(lowerName)) {
      rule.tags.forEach((tag) => addTag(tags, tag));
    }
  }

  if (
    lowerText.includes('create') &&
    lowerText.includes('token')
  ) {
    addTag(tags, 'tokenMaker');
  }

  if (
    lowerText.includes('sacrifice') &&
    lowerText.includes(':')
  ) {
    addTag(tags, 'freeSacOutlet');
    addTag(tags, 'sacOutlet');
  }

  if (
    lowerText.includes('whenever a creature dies') ||
    lowerText.includes('whenever another creature dies')
  ) {
    addTag(tags, 'deathTrigger');
  }

  if (
    lowerText.includes('untap') &&
    lowerText.includes('artifact')
  ) {
    addTag(tags, 'manaUntapper');
  }

  if (
    lowerText.includes('untap') &&
    !tags.includes('manaUntapper')
  ) {
    addTag(tags, 'untapper');
  }

  if (
    tags.includes('tokenMaker') &&
    (tags.includes('sacOutlet') || tags.includes('deathTrigger') || tags.includes('damageOutlet'))
  ) {
    addTag(tags, 'comboPiece');
  }

  if (
    tags.includes('untapper') ||
    tags.includes('manaUntapper') ||
    tags.includes('freeSacOutlet') ||
    tags.includes('manaPositive') ||
    tags.includes('damageOutlet')
  ) {
    addTag(tags, 'comboPiece');
  }

  return {
    name,
    tags,
  };
}

export function tagCards(
  cards: { name: string; oracleText?: string }[],
): TaggedCard[] {
  return cards.map((card) =>
    tagCard(card.name, card.oracleText || ''),
  );
}

export function hasTag(card: TaggedCard, tag: CardTag): boolean {
  return card.tags.includes(tag);
}

export function countTag(
  cards: TaggedCard[],
  tag: CardTag,
): number {
  return cards.filter((c) => c.tags.includes(tag)).length;
}

export function getCardsWithTag(
  cards: TaggedCard[],
  tag: CardTag,
): TaggedCard[] {
  return cards.filter((c) => c.tags.includes(tag));
}
