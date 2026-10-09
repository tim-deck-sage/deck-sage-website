import type {
  CandidateCardFeatures,
  CandidatePoolBucket,
  CommanderCandidateProfile,
  NormalizedCandidateCard,
  ScoredCandidateCard,
} from './types';

const INDIRECT_RELATIONSHIPS: Record<string, string[]> = {
  instant_sorcery_demand: ['cantrip', 'countermagic', 'efficient_spell', 'spell_cast_support', 'spell_copy', 'spell_cost_reduction', 'spell_reuse', 'spell_token_engine'],
  noncreature_spell_demand: ['cantrip', 'countermagic', 'efficient_spell', 'spell_cast_support', 'spell_copy', 'spell_cost_reduction', 'spell_reuse', 'spell_token_engine'],
  cast_copy_demand: ['spell_cast_support', 'spell_copy', 'spell_reuse', 'spell_token_engine'],
  spell_token_demand: ['cantrip', 'countermagic', 'efficient_spell', 'spell_cast_support', 'spell_copy', 'spell_cost_reduction', 'spell_reuse', 'spell_token_engine'],
  aura_demand: ['creature_aura', 'beneficial_aura', 'removal_aura', 'aura_cast_value', 'aura_tutor', 'aura_recursion', 'aura_resilience', 'voltron_scaling'],
  attachment_demand: ['creature_aura', 'beneficial_aura', 'aura_resilience', 'voltron_scaling', 'equipment_support'],
  aura_tutor_demand: ['creature_aura', 'beneficial_aura', 'removal_aura', 'aura_tutor', 'aura_cast_value', 'aura_recursion', 'aura_resilience', 'voltron_scaling'],
  blink_demand: ['blink', 'repeatable_blink', 'etb_value', 'blink_target', 'trigger_enhancer'],
  etb_demand: ['blink', 'repeatable_blink', 'etb_value', 'blink_target', 'trigger_enhancer'],
  repeated_value_demand: ['repeatable_blink', 'etb_value', 'trigger_enhancer'],
  creature_entry: ['tokens', 'creature_entry', 'tribal_lord'],
  minus_counters: ['minus_counters', 'proliferate'],
  plus_counters: ['plus_counters', 'proliferate', 'power_matters'],
  proliferate: ['minus_counters', 'generic_counters', 'proliferate'],
  generic_counters: ['generic_counters', 'proliferate'],
  tap_ability: ['untap', 'activation_support', 'haste'],
  power_matters: ['counters', 'power_matters', 'untap', 'mana_sink'],
  mana_engine: ['untap', 'mana_sink', 'power_matters'],
  tokens: ['token_payoff', 'sacrifice', 'damage_conversion', 'expendable_body', 'spell_token_engine'],
  sacrifice: ['sacrifice', 'creature_death', 'damage_conversion', 'tokens', 'recursion', 'expendable_body'],
  creature_death: ['creature_death', 'damage_conversion', 'tokens', 'recursion', 'expendable_body'],
  expendable_body_demand: ['tokens', 'recursion', 'expendable_body', 'creature_death'],
  graveyard_engine: ['recursion', 'creature_death', 'expendable_body'],
  draw_conversion: ['creature_death', 'sacrifice', 'recursion'],
  combat: [],
};

const DIRECT_RELATIONSHIP_FEATURES = new Set([
  'instant_sorcery_demand', 'noncreature_spell_demand', 'cast_copy_demand', 'spell_token_demand',
  'aura_demand', 'attachment_demand', 'aura_tutor_demand',
  'blink_demand', 'etb_demand', 'repeated_value_demand',
]);

export function scoreCandidateCard(
  card: NormalizedCandidateCard,
  features: CandidateCardFeatures,
  profile: CommanderCandidateProfile,
): ScoredCandidateCard {
  let directScore = 0;
  let indirectScore = 0;
  const reasons: string[] = [];
  const evidence = [...features.evidence];
  const sharedTypes = features.creatureTypes.filter((type) => profile.creatureTypes.includes(type));
  if (sharedTypes.length > 0) {
    directScore += 6 + Math.min(2, sharedTypes.length);
    reasons.push(`Shares commander creature type: ${sharedTypes.join(', ')}`);
    evidence.push('shared_creature_type');
  }

  const text = `${card.name} ${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();
  const referencedTypes = profile.creatureTypes.filter((type) => text.includes(type));
  if (referencedTypes.length > 0 && sharedTypes.length === 0) {
    directScore += 4;
    reasons.push(`References commander creature type: ${referencedTypes.join(', ')}`);
    evidence.push('commander_term_match');
  }

  const directMechanics = features.strategyFeatures.filter((feature) => profile.strategyFeatures.includes(feature));
  if (directMechanics.length > 0) {
    directScore += directMechanics.length * 3;
    reasons.push(`Matches commander mechanics: ${directMechanics.join(', ')}`);
    evidence.push('commander_mechanic_match');
  }

  const directSpellRelationships = new Set<string>();
  profile.strategyFeatures.filter((feature) => DIRECT_RELATIONSHIP_FEATURES.has(feature)).forEach((commanderFeature) => {
    const supported = INDIRECT_RELATIONSHIPS[commanderFeature] || [];
    features.strategyFeatures.forEach((feature) => {
      if (supported.includes(feature)) directSpellRelationships.add(feature);
    });
  });
  if (directSpellRelationships.size > 0) {
    directScore += Math.min(8, directSpellRelationships.size * 4);
    reasons.push(`Matches commander spell engine: ${Array.from(directSpellRelationships).sort().join(', ')}`);
    evidence.push('commander_mechanic_match');
  }

  const indirectMatches = new Set<string>();
  profile.strategyFeatures.forEach((commanderFeature) => {
    const supported = INDIRECT_RELATIONSHIPS[commanderFeature] || [];
    features.strategyFeatures.forEach((feature) => {
      if (
        feature === 'token_payoff' &&
        features.strategyFeatures.some((value) => value.startsWith('tribal_lord:')) &&
        !features.strategyFeatures.some((value) =>
          value.startsWith('tribal_lord:') && profile.creatureTypes.includes(value.slice('tribal_lord:'.length)),
        )
      ) return;
      if (
        supported.includes(feature) &&
        !directMechanics.includes(feature) &&
        !directSpellRelationships.has(feature)
      ) indirectMatches.add(feature);
    });
  });
  if (indirectMatches.size > 0) {
    indirectScore += Math.min(8, indirectMatches.size * 3);
    reasons.push(`Supports commander engine: ${Array.from(indirectMatches).sort().join(', ')}`);
    evidence.push('indirect_engine_support');
  }

  const structuralScore = features.structuralRoles.length * 2;
  if (features.structuralRoles.length > 0) {
    reasons.push(`Structural roles: ${features.structuralRoles.join(', ')}`);
    evidence.push('structural_role');
  }
  const commanderSpecific = directScore > 0 || indirectScore > 0;
  const genericOnly = !commanderSpecific && structuralScore > 0;
  const eligibleBuckets = new Set<CandidatePoolBucket>(features.structuralRoles);
  if (directScore >= 4) {
    eligibleBuckets.add('direct_synergy');
    eligibleBuckets.add('indirect_engine');
  }
  if (indirectScore >= 3) eligibleBuckets.add('indirect_engine');
  if (commanderSpecific && directScore < 4 && indirectScore < 3) {
    eligibleBuckets.add('uncertain');
    evidence.push('low_confidence_strategy');
  }
  const genericityPenalty = genericOnly ? 2 : 0;

  return {
    card,
    features,
    directScore,
    indirectScore,
    structuralScore,
    totalScore: directScore * 3 + indirectScore * 2 + structuralScore - genericityPenalty,
    commanderSpecific,
    genericOnly,
    eligibleBuckets: Array.from(eligibleBuckets).sort(),
    evidence: Array.from(new Set(evidence)),
    reasons,
  };
}
