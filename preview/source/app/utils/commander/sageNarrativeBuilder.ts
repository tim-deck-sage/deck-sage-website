import { CommanderBracketResult } from '../../types/commanderBracket';
import { DeckAnalysisResult } from './deckAnalysisCore';
import { SagePowerRatingResult } from './sagePowerRating';
import {
  SAGE_VOICE_LIBRARY,
  SageVoiceArchetype,
  SageVoiceEntry,
  SageVoiceSignal,
} from './sageVoiceLibrary';

export interface SageNarrativeIdentity {
  primary: string;
  secondary?: string;
}

export interface SageNarrativeContext {
  analysis: DeckAnalysisResult;
  sagePowerRating: SagePowerRatingResult;
  commanderBracket: CommanderBracketResult;
  identity: SageNarrativeIdentity;
}

export interface SageNarrativeOutput {
  whatSageSees: string;
  sagePowerExplanations: string[];
  whySageRatedThisDeck: string[];
  strengths: string[];
  tableWarning?: string;
  deckIdentityDescription: string;
  concerns: {
    official: string[];
    inferred: string[];
  };
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

interface VoiceSelectionState {
  usedText: Set<string>;
  debug: {
    section: string;
    poolName: string;
    selectedIndex: number;
    fallbackUsed: boolean;
  }[];
}

function createSelectionState(): VoiceSelectionState {
  return {
    usedText: new Set<string>(),
    debug: [],
  };
}

function pickUniqueText(
  entries: SageVoiceEntry[] | undefined,
  seed: string,
  salt: string,
  state: VoiceSelectionState,
  section: string,
  poolName: string,
): string | null {
  if (!entries || entries.length === 0) {
    state.debug.push({
      section,
      poolName,
      selectedIndex: -1,
      fallbackUsed: true,
    });
    return null;
  }

  const startIndex = hashString(`${seed}:${section}:${poolName}:${salt}`) % entries.length;

  for (let offset = 0; offset < entries.length; offset += 1) {
    const selectedIndex = (startIndex + offset) % entries.length;
    const selectedText = entries[selectedIndex].text;

    if (!state.usedText.has(selectedText)) {
      state.usedText.add(selectedText);
      state.debug.push({
        section,
        poolName,
        selectedIndex,
        fallbackUsed: offset > 0,
      });
      return selectedText;
    }
  }

  const fallbackText = entries[startIndex].text;
  state.debug.push({
    section,
    poolName,
    selectedIndex: startIndex,
    fallbackUsed: true,
  });
  return fallbackText;
}

function buildSeed(context: SageNarrativeContext): string {
  const { analysis, sagePowerRating, commanderBracket, identity } = context;
  const { metrics, inferred, comboResult } = analysis;

  return [
    identity.primary,
    identity.secondary ?? '',
    sagePowerRating.score,
    sagePowerRating.label,
    commanderBracket.bracket,
    metrics.speed,
    metrics.consistency,
    metrics.synergy,
    metrics.resilience,
    metrics.interaction,
    metrics.finishPotential,
    metrics.manaQuality,
    inferred.likelyEngineDensity,
    inferred.likelyComboDensity,
    comboResult.comboCount,
    comboResult.hasInfiniteCombo ? 'infinite' : 'finite',
  ].join('|');
}

function toArchetype(identity: string): SageVoiceArchetype {
  switch (identity) {
    case 'Aristocrats Engine':
    case 'Sacrifice Engine':
      return 'aristocrats';
    case 'Token Swarm':
      return 'tokenSwarm';
    case 'Graveyard Recursion':
      return 'graveyardRecursion';
    case 'Blink Value':
      return 'blink';
    case 'Control Strategy':
      return 'control';
    case 'Combo Engine':
      return 'combo';
    case 'Ramp & Big Threats':
      return 'ramp';
    case 'Midrange Value':
      return 'midrange';
    case 'Spell Velocity':
      return 'spellVelocity';
    default:
      return 'balanced';
  }
}

function pickSignalText(
  category: 'strengths' | 'concerns' | 'tableWarnings',
  signal: SageVoiceSignal,
  seed: string,
  state: VoiceSelectionState,
  section: string,
): string | null {
  return pickUniqueText(
    SAGE_VOICE_LIBRARY[category][signal],
    seed,
    signal,
    state,
    section,
    `${category}.${signal}`,
  );
}

function pickArchetypeText(
  category: 'strengths' | 'concerns' | 'tableWarnings',
  archetype: SageVoiceArchetype,
  seed: string,
  state: VoiceSelectionState,
  section: string,
  salt: string,
): string | null {
  return pickUniqueText(
    SAGE_VOICE_LIBRARY[category][archetype],
    seed,
    salt,
    state,
    section,
    `${category}.${archetype}`,
  );
}

function buildDeckIdentityDescription(
  context: SageNarrativeContext,
  seed: string,
  state: VoiceSelectionState,
): string {
  const archetype = toArchetype(context.identity.primary);
  const primary = pickUniqueText(
    SAGE_VOICE_LIBRARY.deckIdentities[archetype],
    seed,
    'identity-primary',
    state,
    'deckIdentityDescription',
    `deckIdentities.${archetype}`,
  );

  if (!primary) {
    return 'A balanced Commander deck with a mixed strategic profile.';
  }

  if (!context.identity.secondary) {
    return primary;
  }

  return `${primary} It also shows signs of ${context.identity.secondary.toLowerCase()}.`;
}

function buildWhatSageSees(
  context: SageNarrativeContext,
  seed: string,
  state: VoiceSelectionState,
  deckIdentityDescription: string,
): string {
  const archetype = toArchetype(context.identity.primary);
  const archetypeObservation = pickUniqueText(
    SAGE_VOICE_LIBRARY.observations.archetypes[archetype],
    seed,
    'observation-archetype',
    state,
    'whatSageSees',
    `observations.${archetype}`,
  );
  const generalObservation = pickUniqueText(
    SAGE_VOICE_LIBRARY.observations.general,
    seed,
    'observation-general',
    state,
    'whatSageSees',
    'observations.general',
  );

  if (archetypeObservation && generalObservation) {
    return `${archetypeObservation} ${generalObservation}`;
  }

  return archetypeObservation ?? generalObservation ?? deckIdentityDescription;
}

function buildWhySageRatedThisDeck(
  context: SageNarrativeContext,
  seed: string,
  state: VoiceSelectionState,
  section: 'sagePowerExplanation' | 'whyRated' | 'strengths',
): string[] {
  const { metrics, inferred } = context.analysis;
  const archetype = toArchetype(context.identity.primary);
  const reasons: string[] = [];
  const archetypeReason = pickArchetypeText(
    'strengths',
    archetype,
    seed,
    state,
    section,
    'strength-archetype',
  );

  if (archetypeReason) {
    reasons.push(archetypeReason);
  }

  if (metrics.consistency >= 7) {
    const text = pickSignalText('strengths', 'consistency', seed, state, section);
    if (text) reasons.push(text);
  }

  if (inferred.drawCount + inferred.drawEngineCount >= 8) {
    const text = pickSignalText('strengths', 'cardAdvantage', seed, state, section);
    if (text) reasons.push(text);
  }

  if (metrics.synergy >= 7) {
    const text = pickSignalText('strengths', 'synergy', seed, state, section);
    if (text) reasons.push(text);
  }

  if (metrics.finishPotential >= 7) {
    const text = pickSignalText('strengths', 'finishPotential', seed, state, section);
    if (text) reasons.push(text);
  }

  if (metrics.interaction >= 7) {
    const text = pickSignalText('strengths', 'interaction', seed, state, section);
    if (text) reasons.push(text);
  }

  if (metrics.resilience >= 7) {
    const text = pickSignalText('strengths', 'resilience', seed, state, section);
    if (text) reasons.push(text);
  }

  if (inferred.likelyEngineDensity >= 10) {
    const text = pickSignalText('strengths', 'engineDensity', seed, state, section);
    if (text) reasons.push(text);
  }

  if (reasons.length === 0) {
    const generalObservation = pickUniqueText(
      SAGE_VOICE_LIBRARY.observations.general,
      seed,
      'why-rated-general-fallback',
      state,
      section,
      'observations.general',
    );

    return [generalObservation ?? buildDeckIdentityDescription(context, seed, state)];
  }

  return reasons.slice(0, 5);
}

function buildTableWarning(
  context: SageNarrativeContext,
  seed: string,
  state: VoiceSelectionState,
  section: 'tableWarning' | 'concerns',
): string | undefined {
  const { comboResult, turnWindow } = context.analysis;
  const archetype = toArchetype(context.identity.primary);
  const archetypeWarning = pickArchetypeText(
    'tableWarnings',
    archetype,
    seed,
    state,
    section,
    'table-warning-archetype',
  );

  if (archetypeWarning) {
    return archetypeWarning;
  }

  if (comboResult.hasInfiniteCombo) {
    return pickSignalText('tableWarnings', 'comboPressure', seed, state, section) ?? undefined;
  }

  if (turnWindow.earliestWinTurn !== null && turnWindow.earliestWinTurn <= 4) {
    return pickSignalText('tableWarnings', 'tablePressure', seed, state, section) ?? undefined;
  }

  return pickUniqueText(
    SAGE_VOICE_LIBRARY.tableWarnings.universal,
    seed,
    'table-warning-universal',
    state,
    section,
    'tableWarnings.universal',
  ) ?? undefined;
}

function buildConcerns(
  context: SageNarrativeContext,
  seed: string,
  state: VoiceSelectionState,
): SageNarrativeOutput['concerns'] {
  const { metrics, gameChangerCount } = context.analysis;
  const archetype = toArchetype(context.identity.primary);
  const official: string[] = [];
  const inferred: string[] = [];
  const tableWarning = buildTableWarning(context, seed, state, 'concerns');
  const archetypeConcern = pickArchetypeText(
    'concerns',
    archetype,
    seed,
    state,
    'concerns',
    'concern-archetype',
  );

  if (gameChangerCount > 3) {
    official.push('The number of Game Changers may push this deck above some casual table expectations.');
  }

  if (tableWarning) {
    official.push(tableWarning);
  }

  if (
    archetypeConcern &&
    (metrics.consistency <= 5 ||
      metrics.resilience <= 5 ||
      metrics.finishPotential <= 5)
  ) {
    inferred.push(archetypeConcern);
  }

  if (metrics.consistency <= 3) {
    const text = pickSignalText('concerns', 'consistency', seed, state, 'concerns');
    if (text) inferred.push(text);
  }

  if (metrics.interaction <= 3) {
    const text = pickSignalText('concerns', 'interaction', seed, state, 'concerns');
    if (text) inferred.push(text);
  }

  if (metrics.resilience <= 3) {
    const text = pickSignalText('concerns', 'resilience', seed, state, 'concerns');
    if (text) inferred.push(text);
  }

  if (metrics.finishPotential <= 3) {
    const text = pickSignalText('concerns', 'finishPotential', seed, state, 'concerns');
    if (text) inferred.push(text);
  }

  return {
    official: Array.from(new Set(official)).slice(0, 4),
    inferred: Array.from(new Set(inferred)).slice(0, 5),
  };
}

export function buildSageNarrative(
  context: SageNarrativeContext,
): SageNarrativeOutput {
  const seed = buildSeed(context);
  const state = createSelectionState();
  const deckIdentityDescription = buildDeckIdentityDescription(context, seed, state);
  const tableWarning = buildTableWarning(context, seed, state, 'tableWarning');

  return {
    sagePowerExplanations: buildWhySageRatedThisDeck(
      context,
      seed,
      state,
      'sagePowerExplanation',
    ),
    whatSageSees: buildWhatSageSees(
      context,
      seed,
      state,
      deckIdentityDescription,
    ),
    whySageRatedThisDeck: buildWhySageRatedThisDeck(context, seed, state, 'whyRated'),
    strengths: buildWhySageRatedThisDeck(context, seed, state, 'strengths'),
    tableWarning,
    deckIdentityDescription,
    concerns: buildConcerns(context, seed, state),
  };
}
