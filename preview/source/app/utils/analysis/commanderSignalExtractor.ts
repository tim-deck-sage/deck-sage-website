import {
  Archetype,
  CommanderSignals,
  DeckCard,
  DeckColor,
} from '../../types/deckUpgrade';
import { getCombinedText, lower, normalizeName, uniqueStrings } from './deckUpgradeHelpers';

function inferColorsFromIdentity(card?: DeckCard): DeckColor[] {
  if (!card?.colorIdentity || card.colorIdentity.length === 0) return ['C'];

  const valid: DeckColor[] = [];
  for (const color of card.colorIdentity) {
    if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
      valid.push(color as DeckColor);
    }
  }

  return valid.length > 0 ? uniqueStrings(valid) as DeckColor[] : ['C'];
}

function inferColorsFromManaCost(manaCost?: string): DeckColor[] {
  const text = manaCost || '';
  const colors: DeckColor[] = [];

  if (text.includes('{W}')) colors.push('W');
  if (text.includes('{U}')) colors.push('U');
  if (text.includes('{B}')) colors.push('B');
  if (text.includes('{R}')) colors.push('R');
  if (text.includes('{G}')) colors.push('G');

  return colors.length > 0 ? uniqueStrings(colors) as DeckColor[] : ['C'];
}

export function inferCommanderColors(commander?: DeckCard): DeckColor[] {
  const fromIdentity = inferColorsFromIdentity(commander);
  if (!(fromIdentity.length === 1 && fromIdentity[0] === 'C')) {
    return fromIdentity;
  }

  return inferColorsFromManaCost(commander?.manaCost);
}

function detectTribeSignals(text: string, typeLine: string): string[] {
  const source = `${text} ${typeLine}`;
  const tribes = [
    'goblin',
    'elf',
    'zombie',
    'dragon',
    'vampire',
    'sliver',
    'soldier',
    'warrior',
    'knight',
    'human',
    'wizard',
    'shaman',
    'pirate',
    'angel',
    'demon',
    'spirit',
  ];

  return tribes.filter((tribe) => source.includes(tribe));
}

function inferArchetypesFromSignals(signalMap: {
  wantsTokens: boolean;
  wantsSacrifice: boolean;
  wantsDeathTriggers: boolean;
  wantsArtifacts: boolean;
  wantsSpells: boolean;
  wantsCounters: boolean;
  wantsGraveyard: boolean;
  wantsBlink: boolean;
  wantsCombat: boolean;
  wantsGoWide: boolean;
  wantsTallCreatures: boolean;
  wantsTapUntap: boolean;
  tribeSignals: string[];
  comboFocus: boolean;
}): Archetype[] {
  const archetypes: Archetype[] = [];

  if (signalMap.tribeSignals.length > 0) archetypes.push('tribal');
  if (signalMap.wantsTokens || signalMap.wantsGoWide) archetypes.push('tokens');
  if (signalMap.wantsArtifacts) archetypes.push('artifacts');
  if (signalMap.wantsSpells) archetypes.push('spellslinger');
  if (signalMap.wantsSacrifice || signalMap.wantsDeathTriggers) archetypes.push('aristocrats');
  if (signalMap.wantsGraveyard) archetypes.push('graveyard');
  if (signalMap.wantsCounters) archetypes.push('counters');
  if (signalMap.wantsBlink) archetypes.push('blink');
  if (signalMap.wantsCombat && !signalMap.wantsGoWide) archetypes.push('stompy');
  if (signalMap.comboFocus || signalMap.wantsTapUntap) archetypes.push('combo');

  if (archetypes.length === 0) {
    archetypes.push('midrange');
  } else if (!archetypes.includes('midrange')) {
    archetypes.push('midrange');
  }

  return uniqueStrings(archetypes) as Archetype[];
}

function inferPreferredRoles(signalMap: {
  wantsTokens: boolean;
  wantsSacrifice: boolean;
  wantsDeathTriggers: boolean;
  wantsArtifacts: boolean;
  wantsSpells: boolean;
  wantsCounters: boolean;
  wantsGraveyard: boolean;
  wantsBlink: boolean;
  wantsCombat: boolean;
  wantsGoWide: boolean;
  wantsTallCreatures: boolean;
  wantsTapUntap: boolean;
  tribeSignals: string[];
  comboFocus: boolean;
}): string[] {
  const roles: string[] = ['draw', 'ramp', 'protection'];

  if (signalMap.wantsTokens || signalMap.wantsGoWide) {
    roles.push('tokenMaker', 'tokenPayoff');
  }

  if (signalMap.tribeSignals.length > 0) {
    roles.push('tribalPayoff');
  }

  if (signalMap.wantsSacrifice) {
    roles.push('sacOutlet');
  }

  if (signalMap.wantsDeathTriggers) {
    roles.push('deathPayoff');
  }

  if (signalMap.wantsCombat || signalMap.wantsGoWide) {
    roles.push('finisher', 'haste');
  }

  if (signalMap.wantsTapUntap || signalMap.comboFocus) {
    roles.push('combo');
  }

  if (signalMap.wantsArtifacts) {
    roles.push('artifact');
  }

  if (signalMap.wantsSpells) {
    roles.push('spell');
  }

  if (signalMap.wantsBlink) {
    roles.push('valueEngine');
  }

  return uniqueStrings(roles);
}

function buildGenericCommanderSignals(commander?: DeckCard): CommanderSignals {
  const commanderName = normalizeName(commander?.name);
  const text = getCombinedText(commander || { name: '', oracleText: '', typeLine: '' });
  const typeLine = lower(commander?.typeLine);

  const tribeSignals = detectTribeSignals(text, typeLine);

  const wantsTokens =
    text.includes('create') && text.includes('token') ||
    text.includes('populate') ||
    text.includes('double the number');

  const wantsSacrifice =
    text.includes('sacrifice') ||
    text.includes('sacrifice another');

  const wantsDeathTriggers =
    text.includes('dies') ||
    text.includes('whenever another creature dies') ||
    text.includes('whenever a creature dies');

  const wantsArtifacts =
    text.includes('artifact') ||
    typeLine.includes('artifact');

  const wantsSpells =
    text.includes('instant') ||
    text.includes('sorcery') ||
    text.includes('whenever you cast');

  const wantsCounters =
    text.includes('+1/+1 counter') ||
    text.includes('proliferate') ||
    text.includes('counter on');

  const wantsGraveyard =
    text.includes('graveyard') ||
    text.includes('return target card from your graveyard') ||
    text.includes('reanimate');

  const wantsBlink =
    text.includes('exile another target') ||
    text.includes('return it to the battlefield') ||
    text.includes('blink');

  const wantsCombat =
    text.includes('attacking') ||
    text.includes('attack each combat') ||
    text.includes('combat damage') ||
    text.includes('whenever this creature attacks');

  const wantsGoWide =
    wantsTokens ||
    text.includes('creatures you control') ||
    text.includes('another creature enters') ||
    text.includes('each creature you control');

  const wantsTallCreatures =
    text.includes('power 4 or greater') ||
    text.includes('power 5 or greater') ||
    text.includes('big creature') ||
    text.includes('trample');

  const wantsTapUntap =
    text.includes('{t}:') ||
    text.includes('untap') ||
    text.includes('whenever this becomes tapped');

  const wantsCostReduction =
    text.includes('costs {1} less') ||
    text.includes('costs {2} less') ||
    text.includes('spells you cast cost less');

  const comboFocus =
    wantsTapUntap ||
    text.includes('untap') ||
    text.includes('copy') ||
    text.includes('double') ||
    text.includes('whenever you sacrifice') ||
    text.includes('whenever another creature enters');

  const commanderReliance: 'low' | 'medium' | 'high' =
    wantsTapUntap || text.includes('{t}:')
      ? 'high'
      : wantsCombat || wantsTokens || tribeSignals.length > 0
        ? 'medium'
        : 'low';

  const primaryArchetypes = inferArchetypesFromSignals({
    wantsTokens,
    wantsSacrifice,
    wantsDeathTriggers,
    wantsArtifacts,
    wantsSpells,
    wantsCounters,
    wantsGraveyard,
    wantsBlink,
    wantsCombat,
    wantsGoWide,
    wantsTallCreatures,
    wantsTapUntap,
    tribeSignals,
    comboFocus,
  });

  const secondaryArchetypes = primaryArchetypes.filter((a) => a !== primaryArchetypes[0]).slice(0, 2);

  const preferredCreatureType = tribeSignals[0];

  const preferredRoles = inferPreferredRoles({
    wantsTokens,
    wantsSacrifice,
    wantsDeathTriggers,
    wantsArtifacts,
    wantsSpells,
    wantsCounters,
    wantsGraveyard,
    wantsBlink,
    wantsCombat,
    wantsGoWide,
    wantsTallCreatures,
    wantsTapUntap,
    tribeSignals,
    comboFocus,
  });

  const notes: string[] = [];

  if (tribeSignals.length > 0) {
    notes.push(`commander shows tribal signals: ${tribeSignals.join(', ')}`);
  }
  if (wantsTokens) notes.push('commander appears to reward token generation');
  if (wantsSacrifice) notes.push('commander appears to reward sacrifice lines');
  if (wantsDeathTriggers) notes.push('commander appears to care about death triggers');
  if (wantsArtifacts) notes.push('commander appears to reward artifact density');
  if (wantsSpells) notes.push('commander appears to reward spell casting');
  if (wantsCounters) notes.push('commander appears to care about counters');
  if (wantsGraveyard) notes.push('commander appears to use graveyard value');
  if (wantsBlink) notes.push('commander appears to support blink/value loops');
  if (wantsCombat) notes.push('commander appears to reward combat pressure');
  if (wantsTapUntap) notes.push('commander appears to rely on tap/untap value');
  if (wantsCostReduction) notes.push('commander appears to reward cost reduction');
  if (comboFocus) notes.push('commander shows combo-oriented signals');

  return {
    commanderName,
    colors: inferCommanderColors(commander),
    primaryArchetypes: primaryArchetypes.slice(0, 3),
    secondaryArchetypes,
    tribeSignals,
    preferredCreatureType,
    wantsTokens,
    wantsSacrifice,
    wantsDeathTriggers,
    wantsArtifacts,
    wantsSpells,
    wantsCounters,
    wantsGraveyard,
    wantsBlink,
    wantsCombat,
    wantsGoWide,
    wantsTallCreatures,
    wantsTapUntap,
    wantsCostReduction,
    comboFocus,
    commanderReliance,
    preferredRoles,
    notes,
  };
}

function applyCommanderOverrides(base: CommanderSignals): CommanderSignals {
  const commanderName = base.commanderName;

  if (commanderName.includes('krenko')) {
    return {
      ...base,
      colors: ['R'],
      primaryArchetypes: ['tribal', 'tokens', 'combo'],
      secondaryArchetypes: ['aristocrats', 'midrange'],
      tribeSignals: uniqueStrings([...base.tribeSignals, 'goblin']),
      preferredCreatureType: 'goblin',
      wantsTokens: true,
      wantsSacrifice: true,
      wantsDeathTriggers: false,
      wantsArtifacts: base.wantsArtifacts,
      wantsSpells: false,
      wantsCounters: false,
      wantsGraveyard: false,
      wantsBlink: false,
      wantsCombat: true,
      wantsGoWide: true,
      wantsTallCreatures: false,
      wantsTapUntap: true,
      wantsCostReduction: true,
      comboFocus: true,
      commanderReliance: 'high',
      preferredRoles: uniqueStrings([
        'tokenMaker',
        'tokenPayoff',
        'tribalPayoff',
        'sacOutlet',
        'haste',
        'protection',
        'combo',
        'draw',
        'ramp',
        'finisher',
      ]),
      notes: uniqueStrings([
        ...base.notes,
        'override: Krenko wants goblin density, haste, protection, and token conversion payoffs',
      ]),
    };
  }

  if (commanderName.includes('rhys')) {
    return {
      ...base,
      colors: ['G', 'W'],
      primaryArchetypes: ['tokens', 'counters', 'combo'],
      secondaryArchetypes: ['tribal', 'midrange'],
      wantsTokens: true,
      wantsCombat: true,
      wantsGoWide: true,
      comboFocus: true,
      commanderReliance: 'medium',
      preferredRoles: uniqueStrings([
        ...base.preferredRoles,
        'tokenMaker',
        'tokenPayoff',
        'protection',
        'draw',
        'finisher',
      ]),
      notes: uniqueStrings([
        ...base.notes,
        'override: Rhys rewards token growth and board-doubling pressure',
      ]),
    };
  }

  if (commanderName.includes('ghired')) {
    return {
      ...base,
      colors: ['R', 'G', 'W'],
      primaryArchetypes: ['tokens', 'stompy', 'midrange'],
      secondaryArchetypes: ['combat', 'combo'].filter((x): x is Archetype => x !== 'combat'),
      wantsTokens: true,
      wantsCombat: true,
      wantsGoWide: true,
      wantsTallCreatures: true,
      comboFocus: false,
      commanderReliance: 'medium',
      preferredRoles: uniqueStrings([
        ...base.preferredRoles,
        'tokenMaker',
        'tokenPayoff',
        'finisher',
        'protection',
      ]),
      notes: uniqueStrings([
        ...base.notes,
        'override: Ghired rewards attack pressure with high-impact token bodies',
      ]),
    };
  }

  if (commanderName.includes('jetmir')) {
    return {
      ...base,
      colors: ['R', 'G', 'W'],
      primaryArchetypes: ['tokens', 'tribal', 'midrange'],
      secondaryArchetypes: ['combo'],
      wantsTokens: true,
      wantsCombat: true,
      wantsGoWide: true,
      comboFocus: false,
      commanderReliance: 'medium',
      preferredRoles: uniqueStrings([
        ...base.preferredRoles,
        'tokenMaker',
        'tokenPayoff',
        'finisher',
        'haste',
      ]),
      notes: uniqueStrings([
        ...base.notes,
        'override: Jetmir strongly rewards very wide combat-oriented boards',
      ]),
    };
  }

  if (commanderName.includes('ur-dragon')) {
    return {
      ...base,
      colors: ['W', 'U', 'B', 'R', 'G'],
      primaryArchetypes: ['tribal', 'stompy', 'midrange'],
      secondaryArchetypes: ['combo'],
      tribeSignals: uniqueStrings([...base.tribeSignals, 'dragon']),
      preferredCreatureType: 'dragon',
      wantsCombat: true,
      wantsTallCreatures: true,
      wantsCostReduction: true,
      comboFocus: false,
      commanderReliance: 'medium',
      preferredRoles: uniqueStrings([
        ...base.preferredRoles,
        'tribalPayoff',
        'ramp',
        'draw',
        'finisher',
        'protection',
      ]),
      notes: uniqueStrings([
        ...base.notes,
        'override: The Ur-Dragon rewards dragon density and big-mana sequencing',
      ]),
    };
  }

  return base;
}

export function extractCommanderSignals(commander?: DeckCard): CommanderSignals {
  const generic = buildGenericCommanderSignals(commander);
  return applyCommanderOverrides(generic);
}