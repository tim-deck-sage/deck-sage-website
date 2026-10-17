# Commander recommendation quality pass

This pass audits the deterministic recommendation release at `1fd09879f76f18080da541a164b9867f68970ac0`. It uses the local October 8, 2026 Scryfall catalog snapshot and makes no runtime AI or paid-service calls.

## Quality criteria

- A candidate must be Commander-legal, inside the command-zone color identity, absent from the deck by Oracle identity/name/faces, and backed by complete rules metadata.
- The deck—not a commander label alone—must contain enough enablers for conditional payoffs. Examples include actual Elf density, instant/sorcery density, token production, expendable creatures, graveyard fuel, and non-Human bodies.
- Stable, repeatable ramp is distinct from cost reduction, conditional Treasure, and sacrifice-based burst mana.
- Draw-and-discard selection is not counted as sustained card advantage.
- Structural colored-source checks may abstain or warn; they do not claim a draw probability or simulate games.
- Self-conflicts are hard failures when material: global graveyard exile in a graveyard deck and symmetric board destruction in a creature-token deck are not offered as routine repairs.
- A complete list receives a hypothetical one-for-one swap only after recomputing land count, explicit color sources, role coverage, and enabler preservation. An unfinished list receives an addition, never a fabricated cut.
- Combo pieces remain optional, require their enabling density, and keep an explicit table-conversation caveat. No bracket is inferred.

## Catalog-backed before/after checks

| Fixture | Published behavior | Behavior after this pass | Constraint repaired |
| --- | --- | --- | --- |
| Krenko, Mob Boss; 24 Goblins, eight token producers, 37 Mountains, no stable ramp | `Professional Face-Breaker`, `Skirk Prospector`, `Sol Ring` | `Sol Ring`, `Arcane Signet`, `Fellwar Stone` | The diagnosed reliable-ramp gap is no longer “repaired” first by combat- or sacrifice-dependent burst mana. Commander support is a separate lane led by `Thousand-Year Elixir`, `Goblin Warchief`, and `Lightning Greaves`. |
| Marwyn, the Nurturer; only four Elves among 62 creatures | Elf scaling and mana-conversion pieces could rank from the `Elf` label alone | Generic stable ramp and independent finishers remain; `Priest of Titania`, `Circle of Dreams Druid`, `Staff of Domination`, `Umbral Mantle`, and related pieces abstain | Elf count and power support are now required. The dense 25-Elf control fixture still receives `Priest of Titania`, `Wirewood Symbiote`, and optional mana-conversion support. |
| Black-green graveyard deck; 26 mill/recursion enablers | Global self-exile was only penalized and could still clear a ranking | `Scavenger Grounds`, `Soul-Guide Lantern`, `Scavenging Ooze` | `Rest in Peace` and `Relic of Progenitus` are rejected because they erase resources the deck needs. |
| Mono-red creature-token deck | Generic symmetric wipes were eligible | `Vandalblast` is the only reviewed reset surviving the fixture | `Blasphemous Act`, `Farewell`, `Worldslayer`, `Furnace Dragon`, and other symmetric self-wipes are rejected. |
| Four-color partner deck with zero explicit white sources | Any identity-legal white answer could rank | `Beast Within`, `Feed the Swarm`, `Abrade` | White-pip suggestions abstain until the structural source problem is repaired. |

The browser regression records exact outputs, generated reasons, hypothetical swap outcomes, and a cold-worker timing sample in `tests/regression/commander-upgrades-report.json` (test artifact, ignored by Git). The committed assertions cover determinism, desktop/mobile rendering, repeated navigation, add cancellation without mutation, and no external writes.

## Deliberate limits

This remains a bounded text-and-density analyzer, not a Magic rules engine or game simulator. It cannot establish metagame value, sequencing skill, exact opening-hand odds, hidden combo lines, or personal budget/taste. When the rules text or deck evidence cannot support a safe cut, the UI says so and asks for manual review.
