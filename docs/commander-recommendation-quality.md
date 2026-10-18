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

The in-worker cache is capped and keyed by the complete normalized deck input (including faces, mana costs, layout, and metadata status), command-zone cards, selected style, contextual role targets, algorithm version (`2026-10-18.4`), and catalog snapshot. Cached results contain no username or account data; identical public card inputs may safely share the same deterministic result, while any list/style/target/version/snapshot change is a miss.

Ramp classification has one browser-safe source in `preview/public/ramp-classification.js`. The balance analyzer imports it into the main application bundle, while the recommendation worker loads the same deployed file before profiling a deck. Net-positive land searches and repeatable mana are separated from catch-up/conditional acceleration, one-shot burst mana, land-to-hand fixing, and land replacements. Worker role coverage, candidate ranking, weighted ramp totals, swap explanations, and Suggested Cuts protection all consume that shared result. The worker exposes its weighted ramp profile in recommendation results so cross-engine parity can be checked against the same complete legal deck, and algorithm-version cache invalidation refreshes previously divergent results.

## Suggested Cuts review

Suggested Cuts is a separate whole-deck review, not a by-product of whichever addition happens to rank first. It returns at most three independently assessed alternatives and can return none. It never removes a card, presents no delete action, and does not imply that all shown cards should leave together.

Selection has two stages:

1. **Protection gates.** Lands and land-backed modal cards, commanders, incomplete or multi-face records, X/alternate-cost cards, explicit finishers, supported primary/secondary-plan pieces, bridge cards, known local combo packages, plausible cheat/reanimation payloads, colored sources, and cards that hold an essential role or engine above its current protected floor are not ranked as routine cuts. The current local package guards include demonstrated Krenko/Thornbite and Marwyn mana lines, Basalt Monolith + Rings of Brighthearth, and Thassa's Oracle + Demonic Consultation/Tainted Pact. This is not a claim that every unindexed combo is safe.
2. **Positive-evidence ranking.** Eligible cards need an unsupported payoff with the current enabler count, an explicit conflict with an established plan, a saved mana base that cannot cast their colored cost, or a demonstrably less reliable surplus role. Curve pressure may strengthen one of those findings but never creates a cut by itself. Popularity, price, EDHREC rank, a missing creature type, or the absence of a recognized keyword creates no cut pressure.

Every result names the current evidence, recomputes the hypothetical one-card removal, reports relevant role-count changes, and includes a “Keep it if…” tradeoff. A full deck with no sufficiently strong evidence receives a plain abstention. Incomplete shells, unresolved command-zone identity, and lists with too much unknown metadata also abstain. The four saved playstyles can reorder equally supported alternatives but cannot remove a strong finding or override a protection gate.

### Optional strong-card slots

The second tier, **Strong cards you could make room with**, is deliberately separate from poor-fit cuts. A card can appear there only after a one-card removal simulation leaves its single contributed role meaningfully above the adaptive target supplied by the balance analyzer: at least two qualifying pieces of headroom when funding a diagnosed weakness, or three for a generic flex slot when no weakness exists. The result explains why the card is good, the exact before/after coverage, what is lost, and the real weakness and grounded upgrade candidate the slot could address. With no weakness, the copy explicitly calls the result general flexibility rather than inventing a deficit.

Hard gates exclude lands and source contributors, multi-face or alternate-cost cards, explicit win routes, known combo packages, high-cost cheat/reanimation payloads, multi-role bridges, typal bodies, and cards whose removal crosses engine-density, mana, role, or metadata safety floors. Supported single-engine cards can appear only when the engine remains demonstrably deep after removal. A card is placed in at most one tier, playstyle affects ranking only after safety checks, all results remain independent alternatives, and the site offers no automatic removal action.

The parity fixture uses one complete legal Kenrith list with an interaction weakness and a large advantage surplus. `Phyrexian Arena` is an optional slot because qualifying advantage remains 12 to 11 against a contextual target of 8, and its slot points to the same interaction recommendation shown below. `Black Market Connections` remains protected because it spans both advantage and ramp. Tight versions of the same list, typal redundancy, balanced lists without safe headroom, and partial lists abstain.

Research was checked against the [official Commander format and color-identity rules](https://magic.wizards.com/en/formats/commander), the [September 25, 2026 Comprehensive Rules](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt), [Scryfall's multi-face/API field model](https://github.com/scryfall/api-types/blob/main/src/objects/Card/CardFields.ts), [Commander Spellbook's combo representation guidance](https://commanderspellbook.com/about/), and [EDHREC's deck-construction overview](https://edhrec.com/articles/how-to-build-a-commander-deck). Commander Spellbook is not queried at runtime and no new external dependency was introduced. Numerical mana-source research was treated as conditional evidence rather than transplanted as a universal quota; the site keeps its existing contextual source checks and makes no win-rate or draw-probability claim.

Catalog-backed tests cover `Archmage Emeritus` in supported and unsupported shells, `Rest in Peace` against a graveyard plan, `Puresteel Paladin` with one Equipment, and `Beastmaster Ascension` without an attacking creature base. Safe-keep counterexamples cover `Generous Gift`, `Ondu Inversion`, `Treasure Cruise`, `Exsanguinate`, `Draco`, `Basalt Monolith` + `Rings of Brighthearth`, `Thassa's Oracle` + `Demonic Consultation`, `Persistent Petitioners`, `Evolution Sage`, `Pitiless Plunderer`, and `Gods Willing`. The fixtures also exercise a 98-card partner library, partial-list abstention, castability strain, style persistence, cache invalidation, and the same flexible commander with materially different lists.

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
