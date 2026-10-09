// app/app/utils/commander/turnWindowEstimator.ts

import { TaggedCard, CardTag } from './cardTagger';

export interface TurnWindowResult {
  earliestWinTurn: number | null;
  stableWinTurn: number | null;
}

function count(cards: TaggedCard[], tag: CardTag): number {
  return cards.filter((card) => card.tags.includes(tag)).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function estimateTurnWindow(cards: TaggedCard[]): TurnWindowResult {
  const fastMana = count(cards, 'fastMana');
  const tutors = count(cards, 'tutor');
  const draw = count(cards, 'draw');
  const finishers = count(cards, 'finisher');
  const comboPieces = count(cards, 'comboPiece');

  const tokenMakers = count(cards, 'tokenMaker');
  const freeSacOutlets = count(cards, 'freeSacOutlet');
  const untappers = count(cards, 'untapper');
  const manaUntappers = count(cards, 'manaUntapper');
  const deathTriggers = count(cards, 'deathTrigger');
  const damageOutlets = count(cards, 'damageOutlet');
  const recursion = count(cards, 'recursion');
  const blink = count(cards, 'blink');
  const copyEffects = count(cards, 'copyEffect');
  const costReducers = count(cards, 'costReducer');
  const commanderEngines = count(cards, 'commanderEngine');
  const manaPositive = count(cards, 'manaPositive');
  const drawEngines = count(cards, 'drawEngine');
  const valueEngines = count(cards, 'valueEngine');

  const totalCards = cards.length || 100;

  // Start conservative.
  // This should bias normal Commander decks toward bracket-appropriate turn ranges.
  let earliest = 10;
  let stable = 11;

  // --- Ramp pressure ---
  if (fastMana >= 8) {
    earliest -= 2;
    stable -= 1;
  } else if (fastMana >= 5) {
    earliest -= 1;
  }

  // --- Consistency pressure ---
  // Tutors matter, but not as much as older heuristics assumed.
  if (tutors >= 5) {
    earliest -= 1;
    stable -= 1;
  } else if (tutors >= 3) {
    stable -= 1;
  }

  // --- Card flow ---
  if (draw >= 10) {
    stable -= 1;
  }

  if (drawEngines >= 2) {
    stable -= 1;
  }

  if (valueEngines >= 4) {
    stable -= 1;
  }

  // --- Real engine support ---
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

  const hasCopyLoop =
    copyEffects >= 1 &&
    (tokenMakers >= 1 || costReducers >= 1);

  const engineCount =
    (hasTokenSacEngine ? 1 : 0) +
    (hasUntapEngine ? 1 : 0) +
    (hasManaLoopSupport ? 1 : 0) +
    (hasRecursionLoop ? 1 : 0) +
    (hasBlinkLoop ? 1 : 0) +
    (hasCopyLoop ? 1 : 0);

  // Engines should matter more than raw combo-piece counts.
  if (engineCount >= 3) {
    earliest -= 2;
    stable -= 2;
  } else if (engineCount >= 2) {
    earliest -= 1;
    stable -= 2;
  } else if (engineCount >= 1) {
    stable -= 1;
  }

  // Raw combo pieces help only when density is real.
  if (comboPieces >= 10) {
    stable -= 1;
  } else if (comboPieces <= 2) {
    earliest += 1;
  }

  // --- Closing speed ---
  if (finishers >= 3) {
    earliest -= 1;
  }

  if (damageOutlets >= 2 && tokenMakers >= 1) {
    stable -= 1;
  }

  // --- Commander-centric pressure ---
  // Commander engines can make goldfish turns faster,
  // but should not overstate stable turn windows by themselves.
  if (commanderEngines >= 1 && untappers >= 1) {
    earliest -= 1;
  }

  // --- Anti-overrating guardrails ---
  // If the deck has pieces but not enough support, push stable turn later.
  const weakSupport =
    comboPieces >= 4 &&
    engineCount === 0 &&
    tutors <= 2 &&
    fastMana <= 3;

  if (weakSupport) {
    stable += 1;
  }

  // If deck is very synergy-driven but low-consistency, do not rate it as cEDH-fast.
  if (
    commanderEngines >= 1 &&
    fastMana <= 4 &&
    tutors <= 2 &&
    engineCount <= 1
  ) {
    stable += 1;
  }

  // Lower-density / slower decks should drift toward Core ranges.
  if (totalCards >= 90 && fastMana <= 2 && tutors === 0) {
    earliest += 1;
    stable += 1;
  }

  // Keep stable at or after earliest.
  if (stable < earliest) {
    stable = earliest;
  }

  earliest = clamp(earliest, 3, 12);
  stable = clamp(stable, earliest, 13);

  return {
    earliestWinTurn: earliest,
    stableWinTurn: stable,
  };
}
