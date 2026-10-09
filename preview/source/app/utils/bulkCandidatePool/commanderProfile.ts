import { normalizeCardName } from '../data/scryfallNormalization';
import type { DiscoveredCommander } from '../bulkCommanderDiscovery/types';
import type { CommanderCandidateProfile } from './types';

const NON_TRIBAL_SUBTYPES = new Set(['human', 'druid', 'warrior', 'advisor', 'noble', 'wizard', 'cleric']);

function creatureTypes(typeLine: string): string[] {
  const creaturePart = typeLine.split(/[—-]/).slice(1).join(' ');
  return Array.from(new Set(
    creaturePart.toLowerCase().split(/\s+/).filter((value) => value && !NON_TRIBAL_SUBTYPES.has(value)),
  )).sort();
}

function has(text: string, ...needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

export function buildCommanderProfile(commander: DiscoveredCommander): CommanderCandidateProfile {
  const text = commander.oracleText.toLowerCase();
  const strategyFeatures: string[] = [];
  const parsedCreatureTypes = creatureTypes(commander.typeLine);
  const expressedCreatureTypes = parsedCreatureTypes.filter((type) => {
    const plural = type.endsWith('f') ? `${type.slice(0, -1)}ves` : `${type}s`;
    return new RegExp(`\\b(?:${type}|${plural})\\b`).test(text);
  });
  const instantSorceryDemand = /(?:cast|copy) (?:an? |your |the next )?(?:instant|sorcery)|instant or sorcery spell/.test(text);
  const noncreatureSpellDemand = /(?:cast|copy) (?:a |your )?noncreature spell/.test(text);
  const auraDemand = /\baura (?:enters|spell)\b|\bcast [^.]*\baura\b/.test(text);
  const auraTutorDemand = /search your library for an aura|put [^.]*aura[^.]*onto the battlefield attached/.test(text);
  const blinkDemand = /exile [^.]*\b(?:permanent|creature|artifact|enchantment|cards?)s? you control[^.]*return [^.]*to the battlefield/.test(text);
  if (instantSorceryDemand) strategyFeatures.push('instant_sorcery_demand');
  if (noncreatureSpellDemand) strategyFeatures.push('noncreature_spell_demand');
  if (auraDemand) strategyFeatures.push('aura_demand', 'attachment_demand');
  if (auraTutorDemand) strategyFeatures.push('aura_tutor_demand');
  if (blinkDemand) strategyFeatures.push('blink_demand', 'etb_demand', 'repeated_value_demand');
  if (/cast or copy [^.]*spell|copy [^.]*instant or sorcery spell/.test(text)) {
    strategyFeatures.push('cast_copy_demand');
  }
  if (has(text, 'create a token', 'create x ', 'creature token', 'amass ')) strategyFeatures.push('tokens');
  if ((instantSorceryDemand || noncreatureSpellDemand) && has(text, 'create', 'token')) {
    strategyFeatures.push('spell_token_demand');
  }
  if (has(text, 'enters the battlefield', 'enters under your control')) strategyFeatures.push('creature_entry');
  if (text.includes('-1/-1 counter')) strategyFeatures.push('minus_counters');
  if (text.includes('+1/+1 counter')) strategyFeatures.push('plus_counters');
  if (text.includes('proliferate')) strategyFeatures.push('proliferate');
  if (text.includes('counter') && !has(text, '-1/-1 counter', '+1/+1 counter', 'proliferate')) {
    strategyFeatures.push('generic_counters');
  }
  if (has(text, '{t}:', 'tap an untapped')) strategyFeatures.push('tap_ability');
  if (has(text, 'equal to its power', 'equal to the greatest power', 'where x is its power')) strategyFeatures.push('power_matters');
  if (has(text, 'add {', 'add x mana', 'add an amount of')) strategyFeatures.push('mana_engine');
  if (text.includes('sacrifice')) strategyFeatures.push('sacrifice', 'expendable_body_demand');
  if (has(text, 'creature dies', 'creature you control dies', 'another creature dies')) {
    strategyFeatures.push('creature_death', 'expendable_body_demand');
  }
  if (/pay \d+ life|pay x life/.test(text)) strategyFeatures.push('life_payment');
  if (text.includes('draw a card') && has(text, 'sacrifice', 'discard', 'pay ')) {
    strategyFeatures.push('draw_conversion');
  }
  if (has(text, 'graveyard', 'discard a card')) strategyFeatures.push('graveyard_engine');
  if (
    has(text, 'deals damage', 'damage to each opponent') ||
    (has(text, 'creature dies', 'creature enters', 'sacrifice') && has(text, 'opponent loses', 'each opponent loses'))
  ) strategyFeatures.push('damage_conversion');
  if (has(text, 'attack', 'combat damage')) strategyFeatures.push('combat');

  return {
    functionalId: commander.oracleId
      ? `oracle:${commander.oracleId.toLowerCase()}`
      : `name:${normalizeCardName(commander.name)}`,
    colorIdentity: [...commander.colorIdentity].sort(),
    creatureTypes: expressedCreatureTypes,
    strategyFeatures: Array.from(new Set(strategyFeatures)).sort(),
  };
}
