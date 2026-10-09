// app/app/utils/commander/deckAnalysisCore.ts

import { tagCards, TaggedCard } from './cardTagger';
import { detectCombos, ComboDetectionResult } from './comboSignals';
import { estimateTurnWindow, TurnWindowResult } from './turnWindowEstimator';
import { calculateDeckMetrics, DeckMetrics } from './deckMetrics';
import { isGameChanger } from './gameChangers';

export interface DeckAnalysisCardInput {
  name: string;
  oracleText?: string;
}

export interface DeckAnalysisResult {
  rawCards: DeckAnalysisCardInput[];
  taggedCards: TaggedCard[];

  // Core official-style signals
  gameChangerCount: number;
  gameChangers: string[];

  comboResult: ComboDetectionResult;
  turnWindow: TurnWindowResult;
  metrics: DeckMetrics;

  // Derived engine signals
  inferred: {
    fastManaCount: number;
    tutorCount: number;
    drawCount: number;
    removalCount: number;
    wipeCount: number;
    protectionCount: number;
    comboPieceCount: number;
    finisherCount: number;

    tokenMakerCount: number;
    sacOutletCount: number;
    freeSacOutletCount: number;
    untapperCount: number;
    manaUntapperCount: number;
    deathTriggerCount: number;
    damageOutletCount: number;
    recursionCount: number;
    blinkCount: number;
    copyEffectCount: number;
    costReducerCount: number;
    commanderEngineCount: number;
    manaPositiveCount: number;
    drawEngineCount: number;
    valueEngineCount: number;

    likelyEngineDensity: number;
    likelyComboDensity: number;
  };
}

function normalizeCards(cards: DeckAnalysisCardInput[]): DeckAnalysisCardInput[] {
  return cards
    .map((card) => ({
      name: typeof card?.name === 'string' ? card.name.trim() : '',
      oracleText: typeof card?.oracleText === 'string' ? card.oracleText : '',
    }))
    .filter((card) => card.name.length > 0);
}

function countTag(cards: TaggedCard[], tag: string): number {
  return cards.filter((card) => card.tags.includes(tag as any)).length;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function analyzeDeck(cards: DeckAnalysisCardInput[]): DeckAnalysisResult {
  const rawCards = normalizeCards(cards);

  // --- Tagging ---
  const taggedCards = tagCards(rawCards);

  // --- Game Changers ---
  const gameChangers = uniqueSorted(
    rawCards
      .map((card) => card.name)
      .filter((name) => isGameChanger(name)),
  );

  const gameChangerCount = gameChangers.length;

  // --- Combos ---
  // Important: pass full cards, not just names
  const comboResult = detectCombos(rawCards);

  // --- Turn Window ---
  const turnWindow = estimateTurnWindow(taggedCards);

  // --- Metrics ---
  const metrics = calculateDeckMetrics(taggedCards);

  // --- Derived Counts ---
  const fastManaCount = countTag(taggedCards, 'fastMana');
  const tutorCount = countTag(taggedCards, 'tutor');
  const drawCount = countTag(taggedCards, 'draw');
  const removalCount = countTag(taggedCards, 'removal');
  const wipeCount = countTag(taggedCards, 'wipe');
  const protectionCount = countTag(taggedCards, 'protection');
  const comboPieceCount = countTag(taggedCards, 'comboPiece');
  const finisherCount = countTag(taggedCards, 'finisher');

  const tokenMakerCount = countTag(taggedCards, 'tokenMaker');
  const sacOutletCount = countTag(taggedCards, 'sacOutlet');
  const freeSacOutletCount = countTag(taggedCards, 'freeSacOutlet');
  const untapperCount = countTag(taggedCards, 'untapper');
  const manaUntapperCount = countTag(taggedCards, 'manaUntapper');
  const deathTriggerCount = countTag(taggedCards, 'deathTrigger');
  const damageOutletCount = countTag(taggedCards, 'damageOutlet');
  const recursionCount = countTag(taggedCards, 'recursion');
  const blinkCount = countTag(taggedCards, 'blink');
  const copyEffectCount = countTag(taggedCards, 'copyEffect');
  const costReducerCount = countTag(taggedCards, 'costReducer');
  const commanderEngineCount = countTag(taggedCards, 'commanderEngine');
  const manaPositiveCount = countTag(taggedCards, 'manaPositive');
  const drawEngineCount = countTag(taggedCards, 'drawEngine');
  const valueEngineCount = countTag(taggedCards, 'valueEngine');

  const likelyEngineDensity =
    tokenMakerCount +
    sacOutletCount +
    freeSacOutletCount +
    untapperCount +
    manaUntapperCount +
    deathTriggerCount +
    damageOutletCount +
    recursionCount +
    blinkCount +
    copyEffectCount +
    costReducerCount +
    commanderEngineCount +
    manaPositiveCount +
    drawEngineCount;

  const likelyComboDensity =
    comboPieceCount +
    comboResult.comboCount * 2 +
    Math.max(0, freeSacOutletCount - 1) +
    Math.max(0, untapperCount + manaUntapperCount - 1) +
    Math.max(0, tokenMakerCount - 1);

  const inferred = {
    fastManaCount,
    tutorCount,
    drawCount,
    removalCount,
    wipeCount,
    protectionCount,
    comboPieceCount,
    finisherCount,

    tokenMakerCount,
    sacOutletCount,
    freeSacOutletCount,
    untapperCount,
    manaUntapperCount,
    deathTriggerCount,
    damageOutletCount,
    recursionCount,
    blinkCount,
    copyEffectCount,
    costReducerCount,
    commanderEngineCount,
    manaPositiveCount,
    drawEngineCount,
    valueEngineCount,

    likelyEngineDensity,
    likelyComboDensity,
  };

  return {
    rawCards,
    taggedCards,
    gameChangerCount,
    gameChangers,
    comboResult,
    turnWindow,
    metrics,
    inferred,
  };
}