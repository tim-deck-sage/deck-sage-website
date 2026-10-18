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
- Below 60% list completeness, Sage abstains from synergy and cut claims. Between that threshold and a complete list, it can offer additions but never invents a cut.

## Saved playstyle emphasis

Each deck stores one validated value in the existing workspace state JSON: `balanced`, `aggressive`, `patient`, or `unpredictable`. Existing and malformed records normalize to `balanced`; no database schema, grant, or policy change is required. The same field travels through the existing `ds_shared_save` RPC, so it follows an approved username workspace across browsers while remaining isolated from every other username.

- **Balanced — Let Sage Decide** uses the strongest demonstrated plan and gap repair without a style bonus.
- **Aggressive — Take the Fight to Them** favors supported early pressure, haste/evasion, and closing power.
- **Patient — Control the Battlefield** favors efficient interaction, protection, recovery, and repeatable resources. Expensive cards are not treated as inherently patient.
- **Unpredictable — Surprise the Table** favors verified instant-speed and modal/flexible play. Random or obscure cards do not receive a bonus merely for being unusual.

Style only changes ranking weight. It cannot override legality, color identity, structural colored sources, enabler requirements, self-conflict rejection, essential role preservation, or low-evidence abstention. Every recommendation and hypothetical swap is an independently evaluated alternative, not a safe bundle to apply all at once.

The in-worker cache is capped and keyed by the complete normalized deck input, command-zone cards, selected style, algorithm version (`2026-10-18.1`), and catalog snapshot. Cached results contain no username or account data; identical public card inputs may safely share the same deterministic result, while any list/style/version/snapshot change is a miss.

## Catalog-backed before/after checks

| Fixture | Published behavior | Behavior after this pass | Constraint repaired |
| --- | --- | --- | --- |
| Krenko, Mob Boss; 24 Goblins, eight token producers, 37 Mountains, no stable ramp | `Professional Face-Breaker`, `Skirk Prospector`, `Sol Ring` | `Sol Ring`, `Arcane Signet`, `Fellwar Stone` | The diagnosed reliable-ramp gap is no longer “repaired” first by combat- or sacrifice-dependent burst mana. Commander support is a separate lane led by `Thousand-Year Elixir`, `Goblin Warchief`, and `Lightning Greaves`. |
| Marwyn, the Nurturer; only four Elves among 62 creatures | Elf scaling and mana-conversion pieces could rank from the `Elf` label alone | Generic stable ramp and independent finishers remain; `Priest of Titania`, `Circle of Dreams Druid`, `Staff of Domination`, `Umbral Mantle`, and related pieces abstain | Elf count and power support are now required. The dense 25-Elf control fixture still receives `Priest of Titania`, `Wirewood Symbiote`, and optional mana-conversion support. |
| Black-green graveyard deck; 26 mill/recursion enablers | Global self-exile was only penalized and could still clear a ranking | `Scavenger Grounds`, `Soul-Guide Lantern`, `Scavenging Ooze` | `Rest in Peace` and `Relic of Progenitus` are rejected because they erase resources the deck needs. |
| Mono-red creature-token deck | Generic symmetric wipes were eligible | `Vandalblast` is the only reviewed reset surviving the fixture | `Blasphemous Act`, `Farewell`, `Worldslayer`, `Furnace Dragon`, and other symmetric self-wipes are rejected. |
| Four-color partner deck with zero explicit white sources | Any identity-legal white answer could rank | `Beast Within`, `Feed the Swarm`, `Abrade` | White-pip suggestions abstain until the structural source problem is repaired. |
| Kenrith, the Returned King; two different complete five-color lists | A flexible commander's identity could dominate the same generic output | Token density selects token payoffs; graveyard density selects `Syr Konrad, the Grim` / `Living Death` | The full 99 now supplies the evidence, even when commander identity is unchanged. |

## October 18 typal and land-ramp correction

- Creature-class subtypes are no longer discarded. Every subtype present after the creature type-line separator is eligible, including Wizard, Soldier, Warrior, and Knight. A type is selected only when density plus actual commander/deck rules support distinguish it; unsupported and tied Human/Wizard piles abstain. Mixed-species Wizards and Human Wizards with Wizard-specific support correctly select Wizard, while Human-specific support can select Human.
- Recommendation relationships now require the named type in rules text. A generic word such as “other” cannot fabricate a Wizard explanation. Catalog-backed Wizard fixtures surface `Azami, Lady of Scrolls` with the actual supporting Wizard cards named in the explanation.
- Land-search parsing keeps search and battlefield placement in the same bounded Oracle-text effect. It recognizes singular and multiple basics, “one … the other,” Forest and basic-land-type searches, and `it`/`that card`/`them` placement. Net-positive sacrifice effects such as `Harrow` count; replacements such as `Crop Rotation`, hand-only tutors such as `Land Tax`, ordinary extra land drops, opponent-only searches, and unrelated later battlefield clauses do not.
- Current catalog records for `Rampant Growth`, `Cultivate`, `Kodama's Reach`, `Nature's Lore`, `Three Visits`, `Farseek`, `Harrow`, `Roiling Regrowth`, `Knight of the White Orchid`, `Land Tax`, and `Crop Rotation` are exercised directly. Catch-up ramp is weighted conditionally rather than as fully reliable.

The browser regression records exact outputs, generated reasons, hypothetical swap outcomes, and a cold-worker timing sample in `tests/regression/commander-upgrades-report.json` (test artifact, ignored by Git). The committed assertions cover determinism, desktop/mobile rendering, repeated navigation, add cancellation without mutation, and no external writes.

## Deliberate limits

This remains a bounded text-and-density analyzer, not a Magic rules engine or game simulator. It cannot establish metagame value, sequencing skill, exact opening-hand odds, hidden combo lines, or personal budget/taste. When the rules text or deck evidence cannot support a safe cut, the UI says so and asks for manual review.

Longer-term work stays outside this release: richer rules-graph extraction, explicit combo-line proofs, probabilistic mana/opening-hand simulation, matchup or metagame modeling, price-aware optimization, and learned preference ranking. Those require separate data, UX, and validation decisions rather than silent expansion of this deterministic pass.
