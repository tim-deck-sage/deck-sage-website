import { DeckColor } from '../../types/deckUpgrade';

export type ScryfallCardRecord = {
  id: string;
  oracleId?: string;
  name: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  colorIdentity: DeckColor[];
  legalities?: {
    commander?: 'legal' | 'not_legal' | 'restricted' | 'banned';
  };
  imageUrl?: string;
  setName?: string;
  rarity?: string;
};

function buildNamedCardImageUrl(name: string): string {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    name,
  )}&format=image&version=normal`;
}

const RAW_SCRYFALL_CARD_INDEX: ScryfallCardRecord[] = [
  {
    id: 'sol-ring',
    oracleId: 'sol-ring',
    name: 'Sol Ring',
    manaCost: '{1}',
    cmc: 1,
    typeLine: 'Artifact',
    oracleText: '{T}: Add {C}{C}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'arcane-signet',
    oracleId: 'arcane-signet',
    name: 'Arcane Signet',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact',
    oracleText: '{T}: Add one mana of any color in your commander’s color identity.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'mind-stone',
    oracleId: 'mind-stone',
    name: 'Mind Stone',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact',
    oracleText: '{T}: Add {C}. {1}, {T}, Sacrifice Mind Stone: Draw a card.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'fellwar-stone',
    oracleId: 'fellwar-stone',
    name: 'Fellwar Stone',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact',
    oracleText: '{T}: Add one mana of any color that a land an opponent controls could produce.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'wayfarers-bauble',
    oracleId: 'wayfarers-bauble',
    name: 'Wayfarer’s Bauble',
    manaCost: '{1}',
    cmc: 1,
    typeLine: 'Artifact',
    oracleText:
      '{2}, {T}, Sacrifice Wayfarer’s Bauble: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'lightning-greaves',
    oracleId: 'lightning-greaves',
    name: 'Lightning Greaves',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact — Equipment',
    oracleText: 'Equipped creature has haste and shroud. Equip {0}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'swiftfoot-boots',
    oracleId: 'swiftfoot-boots',
    name: 'Swiftfoot Boots',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact — Equipment',
    oracleText: 'Equipped creature has hexproof and haste. Equip {1}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'skullclamp',
    oracleId: 'skullclamp',
    name: 'Skullclamp',
    manaCost: '{1}',
    cmc: 1,
    typeLine: 'Artifact — Equipment',
    oracleText:
      'Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'idol-of-oblivion',
    oracleId: 'idol-of-oblivion',
    name: 'Idol of Oblivion',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact',
    oracleText:
      '{T}: Draw a card. Activate only if you created a token this turn.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'thornbite-staff',
    oracleId: 'thornbite-staff',
    name: 'Thornbite Staff',
    manaCost: '{2}',
    cmc: 2,
    typeLine: 'Artifact — Equipment',
    oracleText:
      'Whenever a creature dies, untap equipped creature. Equipped creature has "{2}, {T}: This creature deals 1 damage to any target." Equip {4}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'sword-of-the-paruns',
    oracleId: 'sword-of-the-paruns',
    name: 'Sword of the Paruns',
    manaCost: '{4}',
    cmc: 4,
    typeLine: 'Artifact — Equipment',
    oracleText:
      'As long as equipped creature is tapped, creatures you control get +0/+1. As long as equipped creature is untapped, creatures you control get +1/+0. {3}: Untap equipped creature. Equip {3}.',
    colorIdentity: ['C'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'jeskas-will',
    oracleId: 'jeskas-will',
    name: 'Jeska’s Will',
    manaCost: '{2}{R}',
    cmc: 3,
    typeLine: 'Sorcery',
    oracleText:
      'Choose one. If you control your commander as you cast this spell, you may choose both. • Add {R} for each card in target opponent’s hand. • Exile the top three cards of your library. You may play them this turn.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'battle-hymn',
    oracleId: 'battle-hymn',
    name: 'Battle Hymn',
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Instant',
    oracleText: 'Add {R} for each creature you control.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'faithless-looting',
    oracleId: 'faithless-looting',
    name: 'Faithless Looting',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Sorcery',
    oracleText: 'Draw two cards, then discard two cards. Flashback {2}{R}.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'chaos-warp',
    oracleId: 'chaos-warp',
    name: 'Chaos Warp',
    manaCost: '{2}{R}',
    cmc: 3,
    typeLine: 'Instant',
    oracleText:
      'The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it’s a permanent card, they put it onto the battlefield.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'abrade',
    oracleId: 'abrade',
    name: 'Abrade',
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Instant',
    oracleText:
      'Choose one — Abrade deals 3 damage to target creature; or destroy target artifact.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'blasphemous-act',
    oracleId: 'blasphemous-act',
    name: 'Blasphemous Act',
    manaCost: '{8}{R}',
    cmc: 9,
    typeLine: 'Sorcery',
    oracleText:
      'This spell costs {1} less to cast for each creature on the battlefield. Blasphemous Act deals 13 damage to each creature.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'vandalblast',
    oracleId: 'vandalblast',
    name: 'Vandalblast',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Sorcery',
    oracleText:
      'Destroy target artifact you don’t control. Overload {4}{R}.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'impact-tremors',
    oracleId: 'impact-tremors',
    name: 'Impact Tremors',
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Enchantment',
    oracleText:
      'Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'shared-animosity',
    oracleId: 'shared-animosity',
    name: 'Shared Animosity',
    manaCost: '{2}{R}',
    cmc: 3,
    typeLine: 'Enchantment',
    oracleText:
      'Whenever a creature you control attacks, it gets +1/+0 until end of turn for each other attacking creature that shares a creature type with it.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'goblin-bombardment',
    oracleId: 'goblin-bombardment',
    name: 'Goblin Bombardment',
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Enchantment',
    oracleText:
      'Sacrifice a creature: Goblin Bombardment deals 1 damage to any target.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'purphoros-god-of-the-forge',
    oracleId: 'purphoros-god-of-the-forge',
    name: 'Purphoros, God of the Forge',
    manaCost: '{3}{R}',
    cmc: 4,
    typeLine: 'Legendary Enchantment Creature — God',
    oracleText:
      'Whenever another creature enters the battlefield under your control, Purphoros deals 2 damage to each opponent. {2}{R}: Creatures you control get +1/+0 until end of turn.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'goblin-chieftain',
    oracleId: 'goblin-chieftain',
    name: 'Goblin Chieftain',
    manaCost: '{1}{R}{R}',
    cmc: 3,
    typeLine: 'Creature — Goblin',
    power: '2',
    toughness: '2',
    oracleText: 'Other Goblin creatures you control get +1/+1 and have haste.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'goblin-warchief',
    oracleId: 'goblin-warchief',
    name: 'Goblin Warchief',
    manaCost: '{1}{R}{R}',
    cmc: 3,
    typeLine: 'Creature — Goblin Warrior',
    power: '2',
    toughness: '2',
    oracleText: 'Goblin spells you cast cost {1} less to cast. Goblins you control have haste.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'muxus-goblin-grandee',
    oracleId: 'muxus-goblin-grandee',
    name: 'Muxus, Goblin Grandee',
    manaCost: '{4}{R}{R}',
    cmc: 6,
    typeLine: 'Legendary Creature — Goblin Noble',
    power: '4',
    toughness: '4',
    oracleText:
      'When Muxus enters the battlefield, reveal the top six cards of your library. Put all Goblin creature cards with mana value 5 or less from among them onto the battlefield. Whenever Muxus attacks, it gets +1/+1 until end of turn for each other Goblin you control.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'skirk-prospector',
    oracleId: 'skirk-prospector',
    name: 'Skirk Prospector',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Creature — Goblin',
    power: '1',
    toughness: '1',
    oracleText: 'Sacrifice a Goblin: Add {R}.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'battle-cry-goblin',
    oracleId: 'battle-cry-goblin',
    name: 'Battle Cry Goblin',
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Creature — Goblin',
    power: '2',
    toughness: '2',
    oracleText:
      '{1}{R}: Create a 1/1 red Goblin creature token. {1}{R}: Goblins you control attack this combat if able. Whenever a Goblin you control attacks, Battle Cry Goblin gets +1/+0 until end of turn.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'boggart-shenanigans',
    oracleId: 'boggart-shenanigans',
    name: 'Boggart Shenanigans',
    manaCost: '{2}{R}',
    cmc: 3,
    typeLine: 'Tribal Enchantment — Goblin',
    oracleText:
      'Whenever another Goblin you control dies, you may have Boggart Shenanigans deal 1 damage to target player or planeswalker.',
    colorIdentity: ['R'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'beast-whisperer',
    oracleId: 'beast-whisperer',
    name: 'Beast Whisperer',
    manaCost: '{2}{G}{G}',
    cmc: 4,
    typeLine: 'Creature — Elf Druid',
    power: '2',
    toughness: '3',
    oracleText: 'Whenever you cast a creature spell, draw a card.',
    colorIdentity: ['G'],
    legalities: { commander: 'legal' },
  },
  {
    id: 'guardian-project',
    oracleId: 'guardian-project',
    name: 'Guardian Project',
    manaCost: '{3}{G}',
    cmc: 4,
    typeLine: 'Enchantment',
    oracleText:
      'Whenever a nontoken creature enters the battlefield under your control, if it doesn’t have the same name as another creature you control or a creature card in your graveyard, draw a card.',
    colorIdentity: ['G'],
    legalities: { commander: 'legal' },
  },
];

const SCRYFALL_CARD_INDEX: ScryfallCardRecord[] = RAW_SCRYFALL_CARD_INDEX.map((card) => ({
  ...card,
  imageUrl: card.imageUrl ?? buildNamedCardImageUrl(card.name),
}));

export function getScryfallCardIndex(): ScryfallCardRecord[] {
  return SCRYFALL_CARD_INDEX;
}

export function isCommanderLegal(card: ScryfallCardRecord): boolean {
  return card.legalities?.commander === 'legal';
}

export function isColorIdentityCompatible(
  cardColors: DeckColor[],
  commanderColors: DeckColor[],
): boolean {
  if (cardColors.length === 0) return true;
  if (cardColors.every((color) => color === 'C')) return true;

  if (commanderColors.length === 1 && commanderColors[0] === 'C') {
    return cardColors.every((color) => color === 'C');
  }

  return cardColors.every((color) => commanderColors.includes(color));
}

export function getCommanderLegalCards(): ScryfallCardRecord[] {
  return SCRYFALL_CARD_INDEX.filter(isCommanderLegal);
}

export function getCommanderLegalCardsForColors(
  commanderColors: DeckColor[],
): ScryfallCardRecord[] {
  return getCommanderLegalCards().filter((card) =>
    isColorIdentityCompatible(card.colorIdentity, commanderColors),
  );
}