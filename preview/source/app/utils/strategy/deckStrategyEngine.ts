import { Deck, Card } from '../../context/DeckContext';
import { analyzeDeck, DeckAnalysisResult } from '../commander/deckAnalysisCore';
import {
  composeIdentityCoaching,
  getRandomFinishingAdvice,
  getRandomPilotWarning,
  getRandomTableWisdom,
  StrategyArchetypeVoiceKey,
} from './strategyVoiceLibrary';

export type PlayPattern = {
  trigger: string;
  action: string;
};

export type ComboLine = {
  pieces: string[];
  description: string;
  kind: 'infinite' | 'burst' | 'engine';
  priority: 'high' | 'medium';
};

export type DeckStrategy = {
  identity: string;
  primaryPlan: string;
  earlyGame: string[];
  midGame: string[];
  lateGame: string[];
  mistakes: string[];
  keyCards: string[];
  playPatterns: PlayPattern[];
  combos: ComboLine[];
  liveAdvice: string[];
};

type EnrichedCard = Card & {
  oracleText?: string;
  typeLine?: string;
  manaCost?: string;
  cmc?: number;
};

type StrategySignals = {
  totalCards: number;
  metadataMissingCards: number;
  creatures: number;
  noncreatures: number;
  lowCurveCards: number;
  tokenCards: number;
  anthemCards: number;
  sacOutletCards: number;
  deathPayoffCards: number;
  directDamageCards: number;
  cardDrawCards: number;
  rampCards: number;
  removalCards: number;
  protectionCards: number;
  recursionCards: number;
  commanderDependent: boolean;
  likelyTribal: boolean;
  analysis: DeckAnalysisResult;
};

export function generateDeckStrategy(deck: Deck): DeckStrategy {
  const enrichedCards = buildStrategyCards(deck);
  const signals = analyzeSignals(deck, enrichedCards);

  return buildStrategy(deck, enrichedCards, signals);
}

/* ------------------ LOCAL CARD SNAPSHOT ------------------ */

function buildStrategyCards(deck: Deck): EnrichedCard[] {
  return [
    ...(deck.commanderCard ? [deck.commanderCard] : []),
    ...deck.cards,
  ].filter((card) => card.name?.trim());
}

/* ------------------ SIGNAL DETECTION ------------------ */

function analyzeSignals(deck: Deck, cards: EnrichedCard[]): StrategySignals {
  const analysis = analyzeDeck(
    cards.map((card) => ({
      name: card.name,
      oracleText: card.oracleText,
    })),
  );

  let creatures = 0;
  let lowCurveCards = 0;
  let tokenCards = 0;
  let anthemCards = 0;
  let sacOutletCards = 0;
  let deathPayoffCards = 0;
  let directDamageCards = 0;
  let cardDrawCards = 0;
  let rampCards = 0;
  let removalCards = 0;
  let protectionCards = 0;
  let recursionCards = 0;

  const commanderName = deck.commander.toLowerCase();

  cards.forEach((card) => {
    const text = normalize(card.oracleText);
    const type = normalize(card.typeLine);
    const name = normalize(card.name);
    const searchableText = `${name} ${type} ${text}`;

    if (type.includes('creature')) creatures++;
    if ((card.cmc ?? 99) <= 2) lowCurveCards++;

    if (hasAll(searchableText, ['create', 'token']) || searchableText.includes('creates a token')) {
      tokenCards++;
    }

    if (
      text.includes('creatures you control get') ||
      text.includes('other creatures you control get') ||
      searchableText.includes('other goblins get') ||
      searchableText.includes('other zombies get') ||
      searchableText.includes('other elves get') ||
      searchableText.includes('other soldiers get')
    ) {
      anthemCards++;
    }

    if (
      text.includes('sacrifice another') ||
      text.includes('sacrifice a ') ||
      text.includes('sacrifice one') ||
      text.includes('sacrifice:') ||
      text.includes('sacrifice another creature')
    ) {
      sacOutletCards++;
    }

    if (
      text.includes('whenever') &&
      (
        text.includes('dies') ||
        text.includes('is put into a graveyard') ||
        text.includes('leaves the battlefield')
      )
    ) {
      deathPayoffCards++;
    }

    if (
      text.includes('deals damage to each opponent') ||
      text.includes('deals 1 damage') ||
      text.includes('deals damage to any target') ||
      text.includes('each opponent loses') ||
      searchableText.includes('impact tremors') ||
      name.includes('impact tremors')
    ) {
      directDamageCards++;
    }

    if (
      text.includes('draw a card') ||
      text.includes('draw two cards') ||
      text.includes('whenever you draw') ||
      text.includes('draw cards')
    ) {
      cardDrawCards++;
    }

    if (
      text.includes('add {') ||
      text.includes('search your library for a basic land') ||
      text.includes('search your library for up to') ||
      text.includes('treasure token')
    ) {
      rampCards++;
    }

    if (
      text.includes('destroy target') ||
      text.includes('exile target') ||
      text.includes('deals damage to target creature') ||
      text.includes('return target creature') ||
      text.includes('counter target')
    ) {
      removalCards++;
    }

    if (
      text.includes('hexproof') ||
      text.includes('indestructible') ||
      text.includes('ward') ||
      text.includes('equip') ||
      text.includes("can't be the target") ||
      text.includes('regenerate')
    ) {
      protectionCards++;
    }

    if (
      text.includes('return target') ||
      text.includes('return a creature card') ||
      text.includes('from your graveyard to') ||
      text.includes('reanimate')
    ) {
      recursionCards++;
    }

    if (
      commanderName.includes('krenko') &&
      (
        name.includes('goblin') ||
        text.includes('goblin') ||
        type.includes('goblin')
      )
    ) {
      // tribal weighting intentionally handled later
    }
  });

  const totalCards = cards.length;
  const metadataMissingCards = cards.filter((card) => !card.oracleText || !card.typeLine).length;
  const noncreatures = Math.max(0, totalCards - creatures);

  const likelyTribal =
    cards.filter((c) => {
      const type = normalize(c.typeLine);
      const text = normalize(c.oracleText);
      return (
        type.includes('goblin') ||
        type.includes('zombie') ||
        type.includes('elf') ||
        type.includes('soldier') ||
        text.includes('goblin') ||
        text.includes('zombie') ||
        text.includes('elf') ||
        text.includes('soldier') ||
        normalize(c.name).includes('goblin') ||
        normalize(c.name).includes('zombie') ||
        normalize(c.name).includes('elf') ||
        normalize(c.name).includes('soldier')
      );
    }).length >= 8;

  const commanderDependent =
    deck.commander.toLowerCase().includes('krenko') ||
    Math.max(tokenCards, analysis.inferred.tokenMakerCount) >= 6 ||
    Math.max(sacOutletCards, analysis.inferred.sacOutletCount) >= 4;

  return {
    totalCards,
    metadataMissingCards,
    creatures,
    noncreatures,
    lowCurveCards,
    tokenCards: Math.max(tokenCards, analysis.inferred.tokenMakerCount),
    anthemCards,
    sacOutletCards: Math.max(sacOutletCards, analysis.inferred.sacOutletCount),
    deathPayoffCards: Math.max(deathPayoffCards, analysis.inferred.deathTriggerCount),
    directDamageCards: Math.max(directDamageCards, analysis.inferred.damageOutletCount),
    cardDrawCards: Math.max(cardDrawCards, analysis.inferred.drawCount),
    rampCards: Math.max(rampCards, analysis.inferred.fastManaCount),
    removalCards: Math.max(removalCards, analysis.inferred.removalCount),
    protectionCards: Math.max(protectionCards, analysis.inferred.protectionCount),
    recursionCards: Math.max(recursionCards, analysis.inferred.recursionCount),
    commanderDependent,
    likelyTribal,
    analysis,
  };
}

/* ------------------ STRATEGY BUILD ------------------ */

function buildStrategy(
  deck: Deck,
  cards: EnrichedCard[],
  signals: StrategySignals
): DeckStrategy {
  const combos = detectStrategyCombos(cards, signals.analysis);
  const seed = getStrategyVoiceSeed(deck);

  return {
    identity: buildIdentity(deck, signals, seed),
    primaryPlan: buildPrimaryPlan(deck, signals, combos),
    earlyGame: buildEarlyGame(deck, signals, combos),
    midGame: buildMidGame(deck, signals, combos),
    lateGame: buildLateGame(deck, signals, combos, seed),
    mistakes: buildMistakes(deck, signals, combos, seed),
    keyCards: buildKeyCards(cards, signals),
    playPatterns: buildPlayPatterns(deck, cards, signals, combos),
    combos,
    liveAdvice: buildLiveAdvice(deck, signals, combos, seed),
  };
}

/* ------------------ COPY GENERATION ------------------ */

function buildIdentity(deck: Deck, signals: StrategySignals, seed: string): string {
  const voiceOpening = composeIdentityCoaching(getStrategyVoiceArchetype(deck, signals), seed);
  const details = (() => {
  if (deck.commander.toLowerCase().includes('krenko')) {
    if (signals.directDamageCards >= 2) {
      return `${deck.name} is a snowballing goblin swarm deck that can pressure through combat or punish the table with direct damage once your board gets wide.`;
    }

    if (signals.sacOutletCards >= 2) {
      return `${deck.name} is an aggressive goblin board-flood deck with a secondary sacrifice angle. Your board is not just for attacking — it can become mana, damage, or protection if piloted correctly.`;
    }

    return `${deck.name} is a go-wide goblin pressure deck built to snowball from a small board into a sudden overwhelming turn.`;
  }

  if (signals.tokenCards >= 6 && signals.anthemCards >= 2) {
    return `${deck.name} is a go-wide token deck that wants to turn steady board development into a sudden lethal swing.`;
  }

  if (signals.sacOutletCards >= 4 && signals.deathPayoffCards >= 2) {
    return `${deck.name} is a sacrifice-value deck that turns creature bodies into pressure, resources, and closing damage.`;
  }

  if (signals.creatures >= 20 && signals.lowCurveCards >= 12) {
    return `${deck.name} is a proactive creature deck that wins by developing faster than the table and converting tempo into pressure.`;
  }

  return `${deck.name} is a synergy-driven deck that wants to build toward its strongest board state, then convert that position into a clean finish.`;
  })();

  return `${voiceOpening} ${details}`;
}

function buildPrimaryPlan(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[]
): string {
  const hasHighCombo = combos.some((combo) => combo.priority === 'high');

  if (deck.commander.toLowerCase().includes('krenko')) {
    if (hasHighCombo) {
      return `Your best plan is to treat ${deck.commander} like an engine, not bait. Develop enough mana and support first, then land Krenko when you can activate him quickly or protect him. This build can still win through swarm pressure, but when a real combo line shows up, you should recognize it early and pivot from value to ending the game.`;
    }

    return `Your best plan is to treat ${deck.commander} like an engine, not bait. Develop enough mana and support first, then land Krenko when you can activate him quickly or protect him. Once he starts multiplying goblins, shift into whichever finish this build actually supports — combat, sacrifice value, direct damage, or a real combo line if you assemble one.`;
  }

  if (signals.tokenCards >= 6) {
    return `Build your board in layers. Start with setup pieces, then grow a wide board, then convert that board into damage only when the table is under real pressure.`;
  }

  if (signals.sacOutletCards >= 4) {
    return `Use your creatures as resources, not just attackers. This deck wins when you squeeze value out of bodies, deaths, and timing instead of just turning sideways every turn.`;
  }

  return `Play toward your strongest synergy cluster. Don’t rush into combat just because you can — this deck wants the right board state before it commits hard.`;
}

function buildEarlyGame(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[]
): string[] {
  const lines: string[] = [
    'Prioritize mana, cheap setup pieces, and cards that help your next turns become explosive.',
  ];

  if (signals.lowCurveCards >= 10) {
    lines.push('Use early turns to establish board presence without exposing your most important payoff pieces too soon.');
  }

  if (signals.tokenCards >= 4) {
    lines.push('If you can start creating bodies early without risking your main engine, do it — early board presence makes later turns much stronger.');
  }

  if (signals.commanderDependent) {
    lines.push(`Do not rush ${deck.commander} onto the table just because you can. Play it when you can get value fast or when opponents are less ready to answer it.`);
  }

  if (combos.some((combo) => combo.priority === 'high')) {
    lines.push('If one of your premium combo pieces shows up early, do not advertise the plan unless you can protect it or close soon after.');
  }

  return unique(lines);
}

function buildMidGame(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[]
): string[] {
  const lines: string[] = [
    'This is the stage where your deck should start looking dangerous. Shift from setup into pressure.',
  ];

  if (signals.tokenCards >= 5) {
    lines.push('Once your board is wide enough, start thinking one turn ahead: are you setting up a lethal attack, a damage burst, or a value chain?');
  }

  if (signals.sacOutletCards >= 2) {
    lines.push('If your sacrifice tools are online, stop thinking only in combat math. Your creatures may be worth more as fuel than as attackers.');
  }

  if (signals.directDamageCards >= 2) {
    lines.push('If a damage payoff sticks, you do not always need to swing into blockers. Sometimes the cleanest win is making the board itself hurt everybody.');
  }

  if (combos.length > 0) {
    lines.push('Midgame is where your combo pieces start changing card priority. If you already have one piece down, begin valuing the missing partner more highly than generic value plays.');
  }

  return unique(lines);
}

function buildLateGame(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[],
  seed: string
): string[] {
  const lines: string[] = [
    getRandomFinishingAdvice(seed),
    'When you see a real closing line, commit with confidence. This is not the stage for half-measures.',
  ];

  if (signals.tokenCards >= 6 && signals.anthemCards >= 1) {
    lines.push('A wide board plus even one strong payoff can end the game immediately. Count damage carefully before passing the turn.');
  }

  if (signals.directDamageCards >= 2) {
    lines.push('If combat becomes messy, look for ways to close through direct damage or triggered pressure instead of forcing bad attacks.');
  }

  if (signals.sacOutletCards >= 2 && signals.deathPayoffCards >= 1) {
    lines.push('If the table tries to wipe you, ask whether your board can still punish them on the way out.');
  }

  if (combos.length > 0) {
    lines.push('Do not miss the table-kill window. If your combo line is assembled or one draw away, stop playing fair and start playing to finish.');
  }

  return unique(lines);
}

function buildMistakes(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[],
  seed: string
): string[] {
  const lines: string[] = [
    getRandomPilotWarning(seed),
    'Do not overextend into obvious board wipes unless you are sure the table cannot punish you.',
  ];

  if (signals.commanderDependent) {
    lines.push(`Do not treat ${deck.commander} like a throwaway play. If the deck leans on the commander, timing matters.`);
  }

  if (signals.directDamageCards >= 2) {
    lines.push('Do not tunnel too hard on combat if your deck can close without attacking.');
  }

  if (signals.sacOutletCards >= 2) {
    lines.push('Do not cash in creatures too early unless the sacrifice creates real pressure, protection, or a swing in tempo.');
  }

  if (signals.cardDrawCards <= 2) {
    lines.push('Because this build may not refill quickly, avoid dumping your whole hand unless it creates immediate advantage.');
  }

  if (signals.metadataMissingCards > 0) {
    lines.push('Some cards are missing full rules text, so treat this strategy as a current best read from the card names and metadata already saved in the deck.');
  }

  if (combos.some((combo) => combo.priority === 'high')) {
    lines.push('Do not casually run out premium combo pieces into open interaction if you are not ready to cash them in for real value or a win.');
  }

  return unique(lines);
}

function buildKeyCards(cards: EnrichedCard[], signals: StrategySignals): string[] {
  const scored = cards.map((card) => {
    const text = normalize(card.oracleText);
    const type = normalize(card.typeLine);
    let score = 0;

    if (type.includes('legendary creature')) score += 4;
    if (hasAll(text, ['create', 'token'])) score += 3;
    if (text.includes('sacrifice')) score += 3;
    if (text.includes('deals damage')) score += 3;
    if (text.includes('draw a card')) score += 2;
    if (text.includes('hexproof') || text.includes('indestructible')) score += 2;
    if (signals.likelyTribal && (type.includes('goblin') || text.includes('goblin'))) score += 2;
    if (signals.likelyTribal && (type.includes('zombie') || text.includes('zombie'))) score += 2;
    if (signals.likelyTribal && (type.includes('elf') || text.includes('elf'))) score += 2;

    return { name: card.name, score };
  });

  return unique(
    scored
      .sort((a, b) => b.score - a.score)
      .filter((c) => c.score > 0)
      .slice(0, 6)
      .map((c) => c.name)
  );
}

/* ------------------ COMBO DETECTION ------------------ */

function detectStrategyCombos(cards: EnrichedCard[], analysis: DeckAnalysisResult): ComboLine[] {
  const names = cards.map((c) => c.name.toLowerCase());
  const has = (name: string) => names.includes(name.toLowerCase());

  const combos: ComboLine[] = [];

  analysis.comboResult.combos.forEach((combo) => {
    combos.push({
      pieces: combo.pieces,
      kind: combo.type === 'infinite' ? 'infinite' : combo.type === 'engine' ? 'engine' : 'burst',
      priority: combo.type === 'infinite' ? 'high' : 'medium',
      description:
        combo.type === 'infinite'
          ? `${combo.name} is detected as an infinite combo line. If these pieces appear together, shift from value play toward protecting and executing the finish.`
          : `${combo.name} is detected as a meaningful synergy engine. Treat these pieces as a coordinated plan rather than isolated value cards.`,
    });
  });

  if (has('Krenko, Mob Boss') && has('Thornbite Staff') && has('Skirk Prospector')) {
    combos.push({
      pieces: ['Krenko, Mob Boss', 'Thornbite Staff', 'Skirk Prospector'],
      kind: 'infinite',
      priority: 'high',
      description:
        'Equip Thornbite Staff to Krenko. Tap Krenko to create goblins. Sacrifice a goblin with Skirk Prospector to untap Krenko. Repeat to generate explosive or effectively infinite goblins and mana once the loop sustains itself.',
    });
  }

  if (has('Krenko, Mob Boss') && has('Thornbite Staff') && has('Goblin Bombardment')) {
    combos.push({
      pieces: ['Krenko, Mob Boss', 'Thornbite Staff', 'Goblin Bombardment'],
      kind: 'infinite',
      priority: 'high',
      description:
        'Equip Thornbite Staff to Krenko. Activate Krenko to make goblins, then sacrifice a goblin to Goblin Bombardment. Thornbite Staff untaps Krenko whenever a creature dies, letting you repeat the line for massive or infinite damage if you can keep making at least one goblin each time.',
    });
  }

  if (has('Krenko, Mob Boss') && has('Impact Tremors')) {
    combos.push({
      pieces: ['Krenko, Mob Boss', 'Impact Tremors'],
      kind: 'burst',
      priority: 'medium',
      description:
        'This is not infinite by itself, but it is a real kill line. Every Krenko activation turns your token burst into table-wide damage, so one big turn can end the game without attacking.',
    });
  }

  if (has('Krenko, Mob Boss') && has('Purphoros, God of the Forge')) {
    combos.push({
      pieces: ['Krenko, Mob Boss', 'Purphoros, God of the Forge'],
      kind: 'burst',
      priority: 'high',
      description:
        'Each goblin entering deals 2 damage to each opponent through Purphoros. If Krenko survives one strong activation, the game can end immediately.',
    });
  }

  if (has('Goblin Bombardment') && has('Impact Tremors')) {
    combos.push({
      pieces: ['Goblin Bombardment', 'Impact Tremors'],
      kind: 'engine',
      priority: 'medium',
      description:
        'This is a pressure package rather than a hard infinite combo. Creatures entering punish the table through Impact Tremors, and creatures you no longer need can be thrown through Goblin Bombardment to finish players off.',
    });
  }

  return uniqueCombos(combos).sort((a, b) => comboRank(b) - comboRank(a));
}

function comboRank(combo: ComboLine): number {
  let score = 0;
  if (combo.priority === 'high') score += 10;
  if (combo.kind === 'infinite') score += 6;
  if (combo.kind === 'burst') score += 3;
  if (combo.kind === 'engine') score += 1;
  return score;
}

function uniqueCombos(combos: ComboLine[]): ComboLine[] {
  const seen = new Set<string>();

  return combos.filter((combo) => {
    const key = combo.pieces
      .map((piece) => piece.trim().toLowerCase())
      .sort()
      .join('__');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStrategyVoiceSeed(deck: Deck): string {
  return [
    deck.id,
    deck.name,
    deck.commander,
    deck.clientUpdatedAt || '',
  ].join(':');
}

function getStrategyVoiceArchetype(
  deck: Deck,
  signals: StrategySignals,
): StrategyArchetypeVoiceKey | undefined {
  const commanderName = deck.commander.toLowerCase();

  if (signals.analysis.comboResult.comboCount > 0) return 'combo';
  if (signals.sacOutletCards >= 4 || signals.deathPayoffCards >= 2) return 'sacrifice';
  if (signals.tokenCards >= 6) return 'tokens';
  if (signals.recursionCards >= 3) return 'graveyard';
  if (signals.analysis.inferred.blinkCount >= 2) return 'blink';
  if (signals.removalCards >= 6) return 'control';
  if (signals.likelyTribal || commanderName.includes('krenko')) return 'tribal';
  if (signals.creatures >= 20 && signals.lowCurveCards >= 12) return 'midrange';

  return undefined;
}

/* ------------------ PLAY PATTERNS ------------------ */

function buildPlayPatterns(
  deck: Deck,
  cards: EnrichedCard[],
  signals: StrategySignals,
  combos: ComboLine[]
): PlayPattern[] {
  const patterns: PlayPattern[] = [];
  const commanderName = deck.commander;

  const tokenCards = cards.filter((c) => hasAll(normalize(c.oracleText), ['create', 'token']));
  const sacCards = cards.filter((c) => normalize(c.oracleText).includes('sacrifice'));
  const damageCards = cards.filter((c) => {
    const text = normalize(c.oracleText);
    return (
      text.includes('deals damage') ||
      text.includes('each opponent loses') ||
      text.includes('each opponent')
    );
  });
  const protectionCards = cards.filter((c) => {
    const text = normalize(c.oracleText);
    return (
      text.includes('hexproof') ||
      text.includes('indestructible') ||
      text.includes('ward') ||
      text.includes('regenerate')
    );
  });
  const drawCards = cards.filter((c) => normalize(c.oracleText).includes('draw a card'));

  if (deck.commander.toLowerCase().includes('krenko')) {
    patterns.push({
      trigger: `If you can cast ${commanderName} and activate him quickly`,
      action:
        `That is usually your green light. ${commanderName} is strongest when opponents get the smallest possible window to remove him before he pays you back.`,
    });

    if (protectionCards.length > 0) {
      patterns.push({
        trigger: `If you draw ${protectionCards[0].name}`,
        action:
          `Try to pair it with ${commanderName} instead of spending it casually. Protecting your engine often matters more than squeezing out a small early advantage.`,
      });
    }

    if (damageCards.length > 0) {
      patterns.push({
        trigger: `If ${damageCards[0].name} hits the table`,
        action:
          `Shift your mindset immediately. You are no longer only attacking — every goblin you make can punish the whole table. This is where Krenko starts paying people back for trying to keep him down.`,
      });
    }

    if (sacCards.length > 0) {
      patterns.push({
        trigger: `If you draw ${sacCards[0].name}`,
        action:
          `Look for turns where extra goblins become more valuable as damage, mana, or protection than as attackers. Sometimes your combat deck wins without combat.`,
      });
    }

    if (tokenCards.length > 0) {
      patterns.push({
        trigger: `If you open with ${tokenCards[0].name}`,
        action:
          `Use it to start your board without exposing ${commanderName} too early. Early bodies make your later Krenko turns much more explosive.`,
      });
    }
  }

  tokenCards.slice(0, 2).forEach((card) => {
    patterns.push({
      trigger: `If you draw ${card.name}`,
      action:
        'Use it to build board presence before committing your highest-value payoff pieces. Bodies first, payoff second is often the cleaner line.',
    });
  });

  sacCards.slice(0, 2).forEach((card) => {
    patterns.push({
      trigger: `If ${card.name} is in play`,
      action:
        'Keep asking whether your creatures are worth more as attackers or as fuel. The right answer changes from turn to turn.',
    });
  });

  damageCards.slice(0, 2).forEach((card) => {
    patterns.push({
      trigger: `If you land ${card.name}`,
      action:
        'Start counting non-combat damage carefully. A board that looks fair can suddenly represent lethal without ever entering combat.',
    });
  });

  drawCards.slice(0, 1).forEach((card) => {
    patterns.push({
      trigger: `If you draw ${card.name} early`,
      action:
        'Use it to keep the engine moving instead of dumping your hand too fast. The player who keeps gas usually controls the pace of the game.',
    });
  });

  combos.slice(0, 3).forEach((combo) => {
    const anchor = combo.pieces[0];
    const partners = combo.pieces.slice(1);

    patterns.push({
      trigger: `If you already have ${anchor} and draw ${partners.join(' + ')}`,
      action:
        `You should start treating this like a real closing line, not just value. ${combo.description}`,
    });

    if (partners.length > 0) {
      patterns.push({
        trigger: `If you draw ${anchor} but not ${partners.join(' + ')}`,
        action:
          `Do not waste ${anchor} just for small value if the table is likely to answer it. In this deck, it may be worth holding or protecting because it pairs into one of your best finishes.`,
      });
    }
  });

  if (signals.removalCards >= 3) {
    patterns.push({
      trigger: 'If an opponent presents a threat before your engine is online',
      action:
        'Spend removal to protect your future turns, not just your current board. Sometimes the best aggressive play is clearing the piece that stops your next explosion.',
    });
  }

  return uniquePatterns(patterns).slice(0, 12);
}

/* ------------------ LIVE ADVICE ------------------ */

function buildLiveAdvice(
  deck: Deck,
  signals: StrategySignals,
  combos: ComboLine[],
  seed: string
): string[] {
  const advice: string[] = [
    getRandomTableWisdom(seed),
  ];

  if (signals.commanderDependent) {
    advice.push(
      `Right now, your best path is to play around ${deck.commander}. This deck becomes much stronger once your commander is active and generating value.`
    );
  }

  if (combos.length > 0) {
    const topCombo = combos[0];

    advice.push(
      `You have a real combo line in this deck: ${topCombo.pieces.join(' + ')}. If you start seeing pieces of this, shift from value play to setup for finish.`
    );

    combos.slice(0, 2).forEach((combo) => {
      const anchor = combo.pieces[0];
      const partner = combo.pieces.slice(1).join(' + ');

      advice.push(
        `If you already have ${anchor}, start looking for ${partner}. That pairing represents one of your strongest paths to winning the game.`
      );
    });
  }

  if (signals.protectionCards > 0) {
    advice.push(
      'You have protection tools in this deck. Save them for your highest-impact pieces instead of using them early for small gains.'
    );
  }

  if (signals.directDamageCards >= 2) {
    advice.push(
      'You do not always need to attack to win. Your deck can deal damage through triggers, so look for opportunities where the board itself becomes lethal.'
    );
  }

  if (signals.sacOutletCards >= 2) {
    advice.push(
      'Your creatures are not just attackers. In the right moment, they become damage, mana, or protection through sacrifice effects.'
    );
  }

  if (signals.cardDrawCards <= 2) {
    advice.push(
      'Your card draw is limited. Avoid overcommitting your hand unless it creates a strong board or puts you close to a win.'
    );
  }

  return unique(advice).slice(0, 6);
}

/* ------------------ HELPERS ------------------ */

function normalize(value?: string): string {
  return (value || '').toLowerCase();
}

function hasAll(text: string, parts: string[]): boolean {
  return parts.every((part) => text.includes(part));
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function uniquePatterns(items: PlayPattern[]): PlayPattern[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.trigger}__${item.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
