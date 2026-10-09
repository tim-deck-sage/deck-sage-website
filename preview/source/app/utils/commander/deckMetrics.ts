// app/app/utils/commander/deckMetrics.ts

import { TaggedCard, CardTag } from './cardTagger';

export interface DeckMetrics {
  speed: number; // 0–10
  consistency: number; // 0–10
  synergy: number; // 0–10
  resilience: number; // 0–10
  interaction: number; // 0–10
  finishPotential: number; // 0–10
  manaQuality: number; // 0–10
}

function count(cards: TaggedCard[], tag: CardTag): number {
  return cards.filter((card) => card.tags.includes(tag)).length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return part / whole;
}

export function calculateDeckMetrics(cards: TaggedCard[]): DeckMetrics {
  const total = cards.length || 1;

  const fastMana = count(cards, 'fastMana');
  const tutors = count(cards, 'tutor');
  const draw = count(cards, 'draw');
  const removal = count(cards, 'removal');
  const wipes = count(cards, 'wipe');
  const protection = count(cards, 'protection');
  const finishers = count(cards, 'finisher');
  const comboPieces = count(cards, 'comboPiece');
  const valueEngines = count(cards, 'valueEngine');
  const recursion = count(cards, 'recursion');

  const tokenMakers = count(cards, 'tokenMaker');
  const sacOutlets = count(cards, 'sacOutlet');
  const freeSacOutlets = count(cards, 'freeSacOutlet');
  const untappers = count(cards, 'untapper');
  const manaUntappers = count(cards, 'manaUntapper');
  const deathTriggers = count(cards, 'deathTrigger');
  const damageOutlets = count(cards, 'damageOutlet');
  const costReducers = count(cards, 'costReducer');
  const blink = count(cards, 'blink');
  const copyEffects = count(cards, 'copyEffect');
  const commanderEngines = count(cards, 'commanderEngine');
  const manaPositive = count(cards, 'manaPositive');
  const drawEngines = count(cards, 'drawEngine');

  const fastManaDensity = ratio(fastMana, total);
  const tutorDensity = ratio(tutors, total);
  const hasTokenSacEngine =
    tokenMakers >= 1 &&
    freeSacOutlets >= 1 &&
    (damageOutlets >= 1 || deathTriggers >= 1);

  const hasUntapEngine =
    (untappers + manaUntappers) >= 1 &&
    (tokenMakers >= 1 || commanderEngines >= 1);

  const hasManaLoopSupport =
    freeSacOutlets >= 1 &&
    manaPositive >= 1 &&
    (tokenMakers >= 1 || recursion >= 1);

  const hasRecursionLoop =
    recursion >= 1 &&
    freeSacOutlets >= 1 &&
    (manaPositive >= 1 || deathTriggers >= 1);

  const hasBlinkLoop =
    blink >= 1 &&
    manaPositive >= 1;

  const hasCopyEngine =
    copyEffects >= 1 &&
    (tokenMakers >= 1 || costReducers >= 1);

  const engineCount =
    (hasTokenSacEngine ? 1 : 0) +
    (hasUntapEngine ? 1 : 0) +
    (hasManaLoopSupport ? 1 : 0) +
    (hasRecursionLoop ? 1 : 0) +
    (hasBlinkLoop ? 1 : 0) +
    (hasCopyEngine ? 1 : 0);

  const synergySupportCount =
    tokenMakers +
    sacOutlets +
    freeSacOutlets +
    untappers +
    manaUntappers +
    deathTriggers +
    damageOutlets +
    recursion +
    valueEngines +
    commanderEngines;

  const supportPieces =
    draw +
    drawEngines +
    tutors +
    protection +
    recursion +
    valueEngines;

  // --- Speed ---
  // Conservative: real speed should come from fast mana + tutors + real engines,
  // not just raw combo tags.
  const speed =
    fastMana * 0.9 +
    tutors * 0.45 +
    manaPositive * 0.6 +
    engineCount * 1.1 +
    commanderEngines * 0.35 -
    (fastMana <= 2 ? 0.6 : 0);

  // --- Consistency ---
  // Reward card flow and redundancy more than isolated synergy.
  const consistency =
    tutors * 0.8 +
    draw * 0.45 +
    drawEngines * 0.8 +
    valueEngines * 0.45 +
    recursion * 0.35 +
    (supportPieces >= 10 ? 1 : 0) +
    (supportPieces >= 15 ? 1 : 0);

  // --- Synergy ---
  // Require connected support pieces and engines.
  const synergy =
    comboPieces * 0.25 +
    tokenMakers * 0.45 +
    freeSacOutlets * 0.65 +
    damageOutlets * 0.55 +
    untappers * 0.6 +
    manaUntappers * 0.45 +
    deathTriggers * 0.45 +
    recursion * 0.35 +
    commanderEngines * 0.8 +
    engineCount * 1.25 +
    (synergySupportCount >= 8 ? 1 : 0);

  // --- Resilience ---
  // Protection + recursion + card flow are the real backbone here.
  const resilience =
    protection * 0.9 +
    recursion * 0.7 +
    drawEngines * 0.45 +
    valueEngines * 0.35 +
    tutors * 0.15 +
    (protection >= 2 ? 1 : 0);

  // --- Interaction ---
  // Spot interaction matters most; wipes are important but fewer in number.
  const interaction =
    removal * 0.7 +
    wipes * 1.0 +
    protection * 0.2 +
    (removal >= 6 ? 1 : 0);

  // --- Finish Potential ---
  // Finishers alone are not enough; payoffs + engines matter more.
  const finishPotential =
    finishers * 0.8 +
    damageOutlets * 0.65 +
    comboPieces * 0.2 +
    engineCount * 1.0 +
    (hasTokenSacEngine ? 1 : 0) +
    (hasUntapEngine ? 1 : 0) +
    (damageOutlets >= 2 ? 1 : 0);

  // --- Mana Quality ---
  // We cannot fully judge land bases yet, so keep this narrow and conservative.
  const manaQuality =
    fastMana * 0.65 +
    manaPositive * 0.35 +
    tutors * 0.1 +
    (fastManaDensity >= 0.05 ? 1 : 0) +
    (fastManaDensity >= 0.08 ? 1 : 0) -
    (tutorDensity > 0.07 && fastManaDensity < 0.03 ? 0.5 : 0);

  return {
    speed: clamp(speed),
    consistency: clamp(consistency),
    synergy: clamp(synergy),
    resilience: clamp(resilience),
    interaction: clamp(interaction),
    finishPotential: clamp(finishPotential),
    manaQuality: clamp(manaQuality),
  };
}
