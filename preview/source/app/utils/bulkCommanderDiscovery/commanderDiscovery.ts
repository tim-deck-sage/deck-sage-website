import type { BulkCard } from '../../types/bulk';
import { adaptBulkCards } from '../bulkOpportunity/bulkCardAdapter';
import type {
  CommanderDiscoveryDiagnostic,
  CommanderDiscoveryResult,
  CommanderMetadataIssue,
  CommanderPrintingSummary,
  DiscoveredCommander,
  UnsupportedCommanderMechanic,
} from './types';

const PAIRED_OR_SPECIAL_PATTERNS: {
  mechanic: UnsupportedCommanderMechanic;
  pattern: RegExp;
}[] = [
  { mechanic: 'partner_with', pattern: /(?:^|\n)partner with\b/i },
  { mechanic: 'friends_forever', pattern: /(?:^|\n)friends forever\b/i },
  { mechanic: 'choose_a_background', pattern: /(?:^|\n)choose a background\b/i },
  { mechanic: 'doctors_companion', pattern: /(?:^|\n)doctor['’]s companion\b/i },
  { mechanic: 'partner', pattern: /(?:^|\n)partner(?:\s|$|\()/i },
  {
    mechanic: 'multiple_commanders',
    pattern: /(?:have|has) two commanders\b/i,
  },
];

function normalizeName(value?: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, ' ');
}

function normalizeId(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function safeQuantity(value: unknown): number {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0
    ? Math.max(1, Math.floor(quantity))
    : 1;
}

function isLegendaryCreature(typeLine: string): boolean {
  const normalized = typeLine.toLowerCase();
  return normalized.includes('legendary') && normalized.includes('creature');
}

function hasExplicitStandalonePermission(name: string, oracleText: string): boolean {
  const normalizedName = normalizeName(name);
  const normalizedText = oracleText
    .replace(/[‘’`]/g, "'")
    .split(/\n|\.(?:\s|$)/)
    .map((sentence) => normalizeName(sentence).replace(/[.!]+$/, ''))
    .filter(Boolean);

  if (!normalizedName) return false;

  return normalizedText.some(
    (sentence) =>
      sentence === `${normalizedName} can be your commander` ||
      sentence === 'this card can be your commander',
  );
}

function getUnsupportedMechanics(
  typeLine: string,
  oracleText: string,
  keywords?: string[],
): UnsupportedCommanderMechanic[] {
  const mechanics = new Set<UnsupportedCommanderMechanic>();
  const combined = `${oracleText}\n${(keywords || []).join('\n')}`;

  PAIRED_OR_SPECIAL_PATTERNS.forEach(({ mechanic, pattern }) => {
    if (pattern.test(combined)) mechanics.add(mechanic);
  });

  if (/\bbackground\b/i.test(typeLine)) {
    mechanics.add('background');
  }

  return Array.from(mechanics);
}

function getMetadataIssues(card: BulkCard): CommanderMetadataIssue[] {
  const issues: CommanderMetadataIssue[] = [];
  if (!card.typeLine?.trim()) issues.push('missing_type_line');
  if (!card.oracleText?.trim()) issues.push('missing_oracle_text');
  if (!card.colorIdentity || card.colorIdentity.length === 0) {
    issues.push('missing_color_identity');
  }
  if (!card.oracleId?.trim()) issues.push('missing_oracle_id');
  if (!(card.imageUrl || card.imageUri)?.trim()) issues.push('missing_artwork');
  return issues;
}

export function getVisibleCommanderMetadataIssues(
  issues: CommanderMetadataIssue[],
): CommanderMetadataIssue[] {
  return issues.filter(
    (issue) => issue !== 'missing_oracle_text' && issue !== 'missing_artwork',
  );
}

function getDiscoveryKey(card: BulkCard): string {
  const oracleId = normalizeId(card.oracleId);
  return oracleId ? `oracle:${oracleId}` : `name:${normalizeName(card.name)}`;
}

function getPrinting(card: BulkCard): CommanderPrintingSummary {
  return {
    scryfallId: card.scryfallId,
    setName: card.setName,
    cardVariant: card.cardVariant,
    imageUrl: card.imageUrl || card.imageUri,
    quantity: safeQuantity(card.quantity),
  };
}

function metadataScore(card: BulkCard): number {
  return (
    (card.oracleId ? 8 : 0) +
    (card.typeLine ? 6 : 0) +
    (card.oracleText ? 5 : 0) +
    (card.colorIdentity?.length ? 4 : 0) +
    (card.imageUrl || card.imageUri ? 3 : 0) +
    (card.scryfallId ? 2 : 0)
  );
}

function mergeRepresentativeMetadata(cards: BulkCard[]): BulkCard {
  const ranked = [...cards].sort(
    (left, right) => metadataScore(right) - metadataScore(left),
  );
  const representative = ranked[0];
  const firstString = (select: (card: BulkCard) => string | undefined) =>
    ranked.map(select).find((value) => value?.trim());
  const firstArray = (select: (card: BulkCard) => string[] | undefined) =>
    ranked.map(select).find((value) => value && value.length > 0);

  return {
    ...representative,
    oracleId: firstString((card) => card.oracleId),
    scryfallId: firstString((card) => card.scryfallId),
    typeLine: firstString((card) => card.typeLine),
    oracleText: firstString((card) => card.oracleText),
    colorIdentity: firstArray((card) => card.colorIdentity),
    colors: firstArray((card) => card.colors),
    imageUrl: firstString((card) => card.imageUrl),
    imageUri: firstString((card) => card.imageUri),
    keywords: firstArray((card) => card.keywords),
  };
}

function classifyCard(card: BulkCard): {
  supported: boolean;
  unsupportedOnly: boolean;
  insufficient: boolean;
  mechanics: UnsupportedCommanderMechanic[];
  issues: CommanderMetadataIssue[];
  reason: string;
} {
  const typeLine = card.typeLine?.trim() || '';
  const oracleText = card.oracleText?.trim() || '';
  const mechanics = getUnsupportedMechanics(typeLine, oracleText, card.keywords);
  const issues = getMetadataIssues(card);
  const legendaryCreature = isLegendaryCreature(typeLine);
  const explicitStandalone = hasExplicitStandalonePermission(card.name, oracleText);
  const isBackground = mechanics.includes('background');

  if (legendaryCreature || explicitStandalone) {
    return {
      supported: true,
      unsupportedOnly: false,
      insufficient: false,
      mechanics,
      issues,
      reason: legendaryCreature
        ? 'Legendary creature'
        : 'Explicit standalone commander permission',
    };
  }

  if (isBackground || mechanics.length > 0) {
    return {
      supported: false,
      unsupportedOnly: true,
      insufficient: false,
      mechanics,
      issues,
      reason: 'This card requires an unsupported paired commander configuration.',
    };
  }

  if (!typeLine && !oracleText) {
    return {
      supported: false,
      unsupportedOnly: false,
      insufficient: true,
      mechanics,
      issues,
      reason: 'Type line and oracle text are unavailable.',
    };
  }

  if (!typeLine) {
    return {
      supported: false,
      unsupportedOnly: false,
      insufficient: true,
      mechanics,
      issues,
      reason: 'Type line is unavailable and commander permission was not verified.',
    };
  }

  return {
    supported: false,
    unsupportedOnly: false,
    insufficient: false,
    mechanics,
    issues,
    reason: 'Card is not a supported standalone commander.',
  };
}

export function discoverOwnedStandaloneCommanders(
  bulkCards: BulkCard[],
): CommanderDiscoveryResult {
  const adaptedCards = adaptBulkCards(bulkCards);
  const grouped = new Map<string, BulkCard[]>();

  adaptedCards.forEach((card) => {
    const key = getDiscoveryKey(card);
    const cards = grouped.get(key) || [];
    cards.push(card);
    grouped.set(key, cards);
  });

  const commanders: DiscoveredCommander[] = [];
  const diagnostics: CommanderDiscoveryDiagnostic[] = [];

  grouped.forEach((cards, key) => {
    const representative = mergeRepresentativeMetadata(cards);
    const classification = classifyCard(representative);
    const normalizedName = normalizeName(representative.name);
    const quantity = cards.reduce(
      (sum, card) => sum + safeQuantity(card.quantity),
      0,
    );

    if (classification.supported) {
      commanders.push({
        id: key,
        status: 'confirmed_standalone',
        name: representative.name,
        normalizedName,
        oracleId: representative.oracleId,
        scryfallId: representative.scryfallId,
        typeLine: representative.typeLine || '',
        oracleText: representative.oracleText || '',
        colorIdentity: representative.colorIdentity || [],
        imageUrl: representative.imageUrl || representative.imageUri,
        quantity,
        printings: cards.map(getPrinting),
        metadataIssues: classification.issues,
        unsupportedMechanics: classification.mechanics,
      });
      return;
    }

    diagnostics.push({
      id: key,
      status: classification.unsupportedOnly
        ? 'unsupported_configuration'
        : classification.insufficient
          ? 'insufficient_metadata'
          : 'not_eligible',
      name: representative.name,
      normalizedName,
      oracleId: representative.oracleId,
      scryfallId: representative.scryfallId,
      reason: classification.reason,
      metadataIssues: classification.issues,
      unsupportedMechanics: classification.mechanics,
    });
  });

  commanders.sort((left, right) => left.name.localeCompare(right.name));
  diagnostics.sort((left, right) => left.name.localeCompare(right.name));

  return {
    commanders,
    diagnostics,
    insufficientMetadataCount: diagnostics.filter(
      (item) => item.status === 'insufficient_metadata',
    ).length,
    unsupportedConfigurationCount: diagnostics.filter(
      (item) => item.status === 'unsupported_configuration',
    ).length,
  };
}
