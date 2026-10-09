export type SageVoiceArchetype =
  | 'aristocrats'
  | 'tokenSwarm'
  | 'graveyardRecursion'
  | 'blink'
  | 'control'
  | 'voltron'
  | 'combo'
  | 'ramp'
  | 'midrange'
  | 'spellVelocity'
  | 'balanced';

export type SageVoiceSignal =
  | 'cardAdvantage'
  | 'consistency'
  | 'synergy'
  | 'engineDensity'
  | 'interaction'
  | 'resilience'
  | 'finishPotential'
  | 'manaQuality'
  | 'speed'
  | 'comboPressure'
  | 'tablePressure'
  | 'boardPressure'
  | 'resourceAdvantage'
  | 'graveyardDependence'
  | 'commanderDependence'
  | 'fastStarts'
  | 'controlPressure'
  | 'lowInteraction'
  | 'weakRecovery'
  | 'slowDevelopment'
  | 'commanderReliance'
  | 'limitedFinishers'
  | 'inconsistentDraw';

export interface SageVoiceEntry {
  id: string;
  text: string;
}

export type SageVoiceSignalMap = Partial<
  Record<SageVoiceSignal | SageVoiceArchetype | 'universal', SageVoiceEntry[]>
>;

export interface SageVoiceLibrary {
  observations: {
    general: SageVoiceEntry[];
    archetypes: Partial<Record<SageVoiceArchetype, SageVoiceEntry[]>>;
  };
  strengths: SageVoiceSignalMap;
  concerns: SageVoiceSignalMap;
  tableWarnings: SageVoiceSignalMap;
  deckIdentities: Partial<Record<SageVoiceArchetype, SageVoiceEntry[]>>;
}

export const SAGE_VOICE_LIBRARY: SageVoiceLibrary = {
  observations: {
    general: [
      {
        id: 'general-plan-readable',
        text: 'Sage sees a deck with a readable plan and enough structure to evaluate how it wants to win.',
      },
      {
        id: 'general-pressure-profile',
        text: 'Sage sees a deck whose pressure comes from execution quality more than isolated card strength.',
      },
    ],
    archetypes: {
      aristocrats: [
        {
          id: 'aristocrats-observation-01',
          text: 'Every creature in this deck serves a purpose, even after it leaves the battlefield.',
        },
        {
          id: 'aristocrats-observation-02',
          text: 'Sage sees a strategy that converts losses into advantages with remarkable efficiency.',
        },
        {
          id: 'aristocrats-observation-03',
          text: 'The graveyard is not the end of the story for this deck. It is often the beginning of the next chapter.',
        },
        {
          id: 'aristocrats-observation-04',
          text: 'This deck rarely cares whether its creatures survive. It cares what happens when they do not.',
        },
        {
          id: 'aristocrats-observation-05',
          text: 'Sage sees an engine built on steady resource conversion rather than explosive turns.',
        },
        {
          id: 'aristocrats-observation-06',
          text: 'Small creatures tend to accomplish far more than their size suggests.',
        },
        {
          id: 'aristocrats-observation-07',
          text: 'The battlefield functions like a machine, with every sacrifice feeding another part of the strategy.',
        },
        {
          id: 'aristocrats-observation-08',
          text: 'This deck gains value from events most opponents would consider setbacks.',
        },
        {
          id: 'aristocrats-observation-09',
          text: 'Sage sees a game plan designed to profit from inevitability rather than speed.',
        },
        {
          id: 'aristocrats-observation-10',
          text: 'The strategy becomes increasingly difficult to contain once multiple engines are operating together.',
        },
        {
          id: 'aristocrats-observation-11',
          text: 'Creatures are treated as resources first and threats second.',
        },
        {
          id: 'aristocrats-observation-12',
          text: "The deck's strongest turns often begin after creatures start leaving the battlefield.",
        },
        {
          id: 'aristocrats-observation-13',
          text: 'Sage sees a strategy that rewards patience and careful sequencing.',
        },
        {
          id: 'aristocrats-observation-14',
          text: "Many of this deck's most important decisions revolve around timing rather than raw power.",
        },
        {
          id: 'aristocrats-observation-15',
          text: 'Opponents may find that removing creatures solves fewer problems than expected.',
        },
        {
          id: 'aristocrats-observation-16',
          text: 'The deck is built to extract value from nearly every exchange.',
        },
        {
          id: 'aristocrats-observation-17',
          text: 'Sage sees a battlefield where every piece contributes to a larger machine.',
        },
        {
          id: 'aristocrats-observation-18',
          text: 'This strategy rarely relies on a single threat to win the game.',
        },
        {
          id: 'aristocrats-observation-19',
          text: 'Incremental advantages tend to accumulate quickly once the engine is established.',
        },
        {
          id: 'aristocrats-observation-20',
          text: 'The longer the game continues, the more opportunities this deck creates for itself.',
        },
      ],
      tokenSwarm: [
        {
          id: 'token-swarm-observation-01',
          text: 'Sage sees a strategy built to overwhelm the battlefield through numbers rather than single threats.',
        },
        {
          id: 'token-swarm-observation-02',
          text: 'This deck turns small creatures into a much larger problem over time.',
        },
        {
          id: 'token-swarm-observation-03',
          text: 'The battlefield can become crowded very quickly if this strategy is left alone.',
        },
        {
          id: 'token-swarm-observation-04',
          text: 'This deck wins through accumulation, pressure, and timing.',
        },
        {
          id: 'token-swarm-observation-05',
          text: 'One token may not matter. Twenty tokens usually do.',
        },
        {
          id: 'token-swarm-observation-06',
          text: 'Sage sees a deck that makes blocking decisions increasingly difficult for opponents.',
        },
        {
          id: 'token-swarm-observation-07',
          text: 'Small advantages multiply quickly once the token engine begins operating.',
        },
        {
          id: 'token-swarm-observation-08',
          text: 'This strategy can turn an empty battlefield into a threatening board state in very little time.',
        },
        {
          id: 'token-swarm-observation-09',
          text: "The deck's strength comes from making opponents answer many pieces at once.",
        },
        {
          id: 'token-swarm-observation-10',
          text: 'This deck does not need every creature to be powerful. It needs enough of them to survive.',
        },
        {
          id: 'token-swarm-observation-11',
          text: 'Sage sees a board presence strategy that becomes more dangerous with every creature created.',
        },
        {
          id: 'token-swarm-observation-12',
          text: 'The deck is designed to stretch removal thin across too many targets.',
        },
        {
          id: 'token-swarm-observation-13',
          text: 'Opponents may find that one removal spell rarely changes the larger problem.',
        },
        {
          id: 'token-swarm-observation-14',
          text: 'This strategy pressures the table by forcing constant battlefield math.',
        },
        {
          id: 'token-swarm-observation-15',
          text: 'The deck can shift from harmless to overwhelming faster than opponents expect.',
        },
        {
          id: 'token-swarm-observation-16',
          text: 'Token production gives this deck a way to rebuild after disruption.',
        },
        {
          id: 'token-swarm-observation-17',
          text: 'The strongest turns often happen when token makers and payoff effects overlap.',
        },
        {
          id: 'token-swarm-observation-18',
          text: 'Sage sees a strategy that rewards patience before suddenly widening the battlefield.',
        },
        {
          id: 'token-swarm-observation-19',
          text: "This deck's battlefield can become its win condition.",
        },
        {
          id: 'token-swarm-observation-20',
          text: 'The deck is built to make every creature count, even the smallest ones.',
        },
      ],
      graveyardRecursion: [
        {
          id: 'graveyard-recursion-observation-01',
          text: 'Sage sees a deck that treats the graveyard as a second hand.',
        },
        {
          id: 'graveyard-recursion-observation-02',
          text: 'This strategy is built to make death temporary and resources reusable.',
        },
        {
          id: 'graveyard-recursion-observation-03',
          text: 'The graveyard is not a weakness here. It is part of the engine.',
        },
        {
          id: 'graveyard-recursion-observation-04',
          text: 'This deck gains strength from cards other decks would consider spent.',
        },
        {
          id: 'graveyard-recursion-observation-05',
          text: 'Sage sees a strategy that turns discarded and destroyed cards into future options.',
        },
        {
          id: 'graveyard-recursion-observation-06',
          text: 'The deck is designed to keep playing after normal resources are exhausted.',
        },
        {
          id: 'graveyard-recursion-observation-07',
          text: 'Opponents may find that removing threats only delays them.',
        },
        {
          id: 'graveyard-recursion-observation-08',
          text: 'This strategy rewards careful graveyard setup and patient timing.',
        },
        {
          id: 'graveyard-recursion-observation-09',
          text: "The deck's strongest turns often begin with cards already in the graveyard.",
        },
        {
          id: 'graveyard-recursion-observation-10',
          text: 'Sage sees a plan that becomes more flexible as the graveyard fills.',
        },
        {
          id: 'graveyard-recursion-observation-11',
          text: 'This deck can turn attrition into an advantage.',
        },
        {
          id: 'graveyard-recursion-observation-12',
          text: 'The strategy often improves as the game grows longer.',
        },
        {
          id: 'graveyard-recursion-observation-13',
          text: 'The graveyard gives this deck access to lines that are not visible from hand alone.',
        },
        {
          id: 'graveyard-recursion-observation-14',
          text: 'This deck rarely treats a used card as truly gone.',
        },
        {
          id: 'graveyard-recursion-observation-15',
          text: 'Sage sees a resource loop that can make repeated answers necessary.',
        },
        {
          id: 'graveyard-recursion-observation-16',
          text: 'The strategy can grind through removal by reusing important pieces.',
        },
        {
          id: 'graveyard-recursion-observation-17',
          text: 'This deck often asks opponents to answer the same threat more than once.',
        },
        {
          id: 'graveyard-recursion-observation-18',
          text: 'The graveyard gives the deck reach, resilience, and hidden pressure.',
        },
        {
          id: 'graveyard-recursion-observation-19',
          text: 'This strategy can turn self-mill or discard into development.',
        },
        {
          id: 'graveyard-recursion-observation-20',
          text: "The deck's past turns often become fuel for its future turns.",
        },
      ],
      control: [
        {
          id: 'control-observation-01',
          text: 'Sage sees a deck built to decide which threats are allowed to matter.',
        },
        {
          id: 'control-observation-02',
          text: 'This strategy values timing, patience, and resource management.',
        },
        {
          id: 'control-observation-03',
          text: 'The deck is designed to survive first and win later.',
        },
        {
          id: 'control-observation-04',
          text: 'Control here is less about speed and more about denying opponents clean openings.',
        },
        {
          id: 'control-observation-05',
          text: 'Sage sees a plan that rewards careful threat assessment.',
        },
        {
          id: 'control-observation-06',
          text: 'This deck wants the game to slow down until its answers matter more than opposing threats.',
        },
        {
          id: 'control-observation-07',
          text: 'The strategy becomes stronger when opponents are forced to play on its terms.',
        },
        {
          id: 'control-observation-08',
          text: 'This deck does not need to be ahead early if it can stay alive.',
        },
        {
          id: 'control-observation-09',
          text: 'Sage sees a deck that aims to trade efficiently until the table runs out of pressure.',
        },
        {
          id: 'control-observation-10',
          text: 'The strongest turns may involve preventing something from happening at all.',
        },
        {
          id: 'control-observation-11',
          text: 'This strategy can make opponents spend extra resources to resolve meaningful plays.',
        },
        {
          id: 'control-observation-12',
          text: 'The deck is built to survive dangerous turns and punish overextension.',
        },
        {
          id: 'control-observation-13',
          text: 'Control decks win by making the game smaller for everyone else.',
        },
        {
          id: 'control-observation-14',
          text: 'Sage sees a strategy that converts patience into inevitability.',
        },
        {
          id: 'control-observation-15',
          text: "The deck's power comes from choosing the right moment to act.",
        },
        {
          id: 'control-observation-16',
          text: 'This strategy often looks quiet until it takes control of the pace.',
        },
        {
          id: 'control-observation-17',
          text: 'The deck prefers precision over spectacle.',
        },
        {
          id: 'control-observation-18',
          text: 'Opponents may find that their best threats never get comfortable.',
        },
        {
          id: 'control-observation-19',
          text: 'Sage sees a deck that measures strength in answers as much as threats.',
        },
        {
          id: 'control-observation-20',
          text: 'The longer this deck survives, the more difficult it becomes to force through a win.',
        },
      ],
      combo: [
        {
          id: 'combo-observation-01',
          text: 'Sage sees a deck built around finding the right pieces at the right time.',
        },
        {
          id: 'combo-observation-02',
          text: 'This strategy becomes dangerous when ordinary-looking cards begin working together.',
        },
        {
          id: 'combo-observation-03',
          text: "The deck's threat level is not always visible from the battlefield alone.",
        },
        {
          id: 'combo-observation-04',
          text: 'Sage sees a plan that can end games suddenly once key components align.',
        },
        {
          id: 'combo-observation-05',
          text: 'This deck rewards careful sequencing more than raw aggression.',
        },
        {
          id: 'combo-observation-06',
          text: 'The strategy is built around pressure hidden inside its card relationships.',
        },
        {
          id: 'combo-observation-07',
          text: 'Opponents may not recognize the danger until the final piece appears.',
        },
        {
          id: 'combo-observation-08',
          text: 'This deck can spend several turns looking quiet before ending the game quickly.',
        },
        {
          id: 'combo-observation-09',
          text: 'Sage sees a structure where support pieces may be just as dangerous as finishers.',
        },
        {
          id: 'combo-observation-10',
          text: "The deck's power comes from connection, timing, and redundancy.",
        },
        {
          id: 'combo-observation-11',
          text: 'This strategy often wins by turning a small opening into a decisive turn.',
        },
        {
          id: 'combo-observation-12',
          text: 'The board state may understate how close this deck is to winning.',
        },
        {
          id: 'combo-observation-13',
          text: 'Sage sees a deck that asks opponents to respect potential, not just presence.',
        },
        {
          id: 'combo-observation-14',
          text: 'The deck becomes much more dangerous when it can protect its setup turn.',
        },
        {
          id: 'combo-observation-15',
          text: 'This strategy is capable of shifting from development to victory with little warning.',
        },
        {
          id: 'combo-observation-16',
          text: 'The strongest cards may be the ones that make the rest of the deck function.',
        },
        {
          id: 'combo-observation-17',
          text: 'Sage sees a deck where the final threat is often assembled before it is revealed.',
        },
        {
          id: 'combo-observation-18',
          text: 'The strategy depends on recognizing when the window to win has opened.',
        },
        {
          id: 'combo-observation-19',
          text: 'This deck can punish opponents who spend answers on the wrong pieces.',
        },
        {
          id: 'combo-observation-20',
          text: 'The danger here is not always what is in play. It is what those cards enable.',
        },
      ],
      ramp: [
        {
          id: 'ramp-observation-01',
          text: 'Sage sees a deck built to skip the small game and reach its larger threats early.',
        },
        {
          id: 'ramp-observation-02',
          text: 'This strategy wants to turn mana advantage into battlefield dominance.',
        },
        {
          id: 'ramp-observation-03',
          text: 'The deck becomes dangerous when it starts casting spells ahead of schedule.',
        },
        {
          id: 'ramp-observation-04',
          text: 'Sage sees a plan that rewards early development and powerful top-end threats.',
        },
        {
          id: 'ramp-observation-05',
          text: 'This deck is built to make more mana than the table is prepared to answer.',
        },
        {
          id: 'ramp-observation-06',
          text: 'The early turns are about setup. The later turns are about impact.',
        },
        {
          id: 'ramp-observation-07',
          text: 'This strategy can make expensive spells arrive much earlier than expected.',
        },
        {
          id: 'ramp-observation-08',
          text: "The deck's threat level rises sharply once its mana engine is established.",
        },
        {
          id: 'ramp-observation-09',
          text: 'Sage sees a deck that uses acceleration as its real opening attack.',
        },
        {
          id: 'ramp-observation-10',
          text: 'The biggest threats may arrive before opponents are ready to respond.',
        },
        {
          id: 'ramp-observation-11',
          text: 'This deck often wins by making its late game arrive first.',
        },
        {
          id: 'ramp-observation-12',
          text: 'The strategy is designed to turn extra mana into overwhelming board presence.',
        },
        {
          id: 'ramp-observation-13',
          text: 'Sage sees a plan that becomes harder to stop once the mana gap opens.',
        },
        {
          id: 'ramp-observation-14',
          text: 'The deck is comfortable trading early tempo for a stronger midgame.',
        },
        {
          id: 'ramp-observation-15',
          text: 'Once this deck begins doubling its resources, the table has to react quickly.',
        },
        {
          id: 'ramp-observation-16',
          text: 'The strategy asks opponents to answer threats larger than the current turn should allow.',
        },
        {
          id: 'ramp-observation-17',
          text: "Mana development is the foundation of this deck's pressure.",
        },
        {
          id: 'ramp-observation-18',
          text: 'Sage sees a deck that turns lands and ramp into inevitability.',
        },
        {
          id: 'ramp-observation-19',
          text: "The deck's strongest turns often begin with a large mana advantage.",
        },
        {
          id: 'ramp-observation-20',
          text: 'This strategy does not need to be fast if it can become enormous.',
        },
      ],
      voltron: [
        {
          id: 'voltron-observation-01',
          text: 'Sage sees a deck built around turning one threat into a serious problem.',
        },
        {
          id: 'voltron-observation-02',
          text: 'This strategy concentrates power rather than spreading it across the battlefield.',
        },
        {
          id: 'voltron-observation-03',
          text: 'The commander or primary threat is the center of gravity for this deck.',
        },
        {
          id: 'voltron-observation-04',
          text: 'Sage sees a plan that rewards protection, timing, and pressure.',
        },
        {
          id: 'voltron-observation-05',
          text: 'This deck often asks one creature to carry the entire game plan.',
        },
        {
          id: 'voltron-observation-06',
          text: 'The strategy becomes dangerous when its main threat survives a full turn cycle.',
        },
        {
          id: 'voltron-observation-07',
          text: 'This deck can make combat damage feel urgent very quickly.',
        },
        {
          id: 'voltron-observation-08',
          text: 'Sage sees a deck where every protection spell can represent several more turns of pressure.',
        },
        {
          id: 'voltron-observation-09',
          text: 'The battlefield may look small, but the threat is highly focused.',
        },
        {
          id: 'voltron-observation-10',
          text: 'This strategy wins by making one creature too dangerous to ignore.',
        },
        {
          id: 'voltron-observation-11',
          text: "The deck's strongest turns often involve protecting a single decisive attacker.",
        },
        {
          id: 'voltron-observation-12',
          text: 'Sage sees a plan that turns commander damage into a clock.',
        },
        {
          id: 'voltron-observation-13',
          text: 'This deck does not need a wide board to pressure the table.',
        },
        {
          id: 'voltron-observation-14',
          text: 'The strategy asks opponents to have the right answer at the right time.',
        },
        {
          id: 'voltron-observation-15',
          text: 'A single creature can become the entire battlefield problem.',
        },
        {
          id: 'voltron-observation-16',
          text: 'Sage sees a deck that values evasion, protection, and explosive combat steps.',
        },
        {
          id: 'voltron-observation-17',
          text: 'The deck is built to punish opponents who leave the primary threat unchecked.',
        },
        {
          id: 'voltron-observation-18',
          text: 'This strategy can eliminate players faster than its board size suggests.',
        },
        {
          id: 'voltron-observation-19',
          text: 'Every equipment, aura, or combat boost increases the urgency.',
        },
        {
          id: 'voltron-observation-20',
          text: 'The danger is focused, visible, and difficult to ignore.',
        },
      ],
      blink: [
        {
          id: 'blink-observation-01',
          text: 'Sage sees a strategy built around getting more than one use from the same resource.',
        },
        {
          id: 'blink-observation-02',
          text: 'This deck treats enter-the-battlefield effects as opportunities rather than one-time events.',
        },
        {
          id: 'blink-observation-03',
          text: 'The strategy gains value by making good cards happen again.',
        },
        {
          id: 'blink-observation-04',
          text: 'Sage sees a battlefield where repetition becomes an advantage.',
        },
        {
          id: 'blink-observation-05',
          text: 'This deck is designed to turn ordinary creatures into recurring engines.',
        },
        {
          id: 'blink-observation-06',
          text: 'The strongest turns often begin with cards returning rather than arriving.',
        },
        {
          id: 'blink-observation-07',
          text: 'This strategy rewards patience and sequencing more than raw speed.',
        },
        {
          id: 'blink-observation-08',
          text: 'Sage sees a plan built around incremental value accumulation.',
        },
        {
          id: 'blink-observation-09',
          text: 'The deck rarely needs explosive turns when it can generate repeated advantages.',
        },
        {
          id: 'blink-observation-10',
          text: 'This strategy often asks opponents to answer the same effect multiple times.',
        },
        {
          id: 'blink-observation-11',
          text: 'The battlefield can become a loop of recurring value if left unchecked.',
        },
        {
          id: 'blink-observation-12',
          text: 'Sage sees a deck that prefers efficiency over spectacle.',
        },
        {
          id: 'blink-observation-13',
          text: 'Small advantages tend to multiply through repeated triggers.',
        },
        {
          id: 'blink-observation-14',
          text: 'This strategy becomes stronger as its engines remain active.',
        },
        {
          id: 'blink-observation-15',
          text: 'The deck gains value from timing as much as card quality.',
        },
        {
          id: 'blink-observation-16',
          text: 'Sage sees a game plan that turns every return into another opportunity.',
        },
        {
          id: 'blink-observation-17',
          text: 'The strategy rewards careful management of resources already on the battlefield.',
        },
        {
          id: 'blink-observation-18',
          text: 'Opponents may find themselves answering the same problems repeatedly.',
        },
        {
          id: 'blink-observation-19',
          text: 'This deck thrives when it can reuse its best effects.',
        },
        {
          id: 'blink-observation-20',
          text: 'The longer the game continues, the more opportunities this strategy creates.',
        },
      ],
      midrange: [
        {
          id: 'midrange-observation-01',
          text: 'Sage sees a deck built around flexibility rather than specialization.',
        },
        {
          id: 'midrange-observation-02',
          text: 'This strategy prefers strong individual cards supported by efficient play.',
        },
        {
          id: 'midrange-observation-03',
          text: 'The deck is comfortable adapting as the game changes.',
        },
        {
          id: 'midrange-observation-04',
          text: 'Sage sees a plan that rewards good decisions over narrow synergies.',
        },
        {
          id: 'midrange-observation-05',
          text: 'This strategy can pressure, defend, or pivot depending on the situation.',
        },
        {
          id: 'midrange-observation-06',
          text: 'The deck rarely relies on a single path to victory.',
        },
        {
          id: 'midrange-observation-07',
          text: 'Sage sees a balanced approach to Commander.',
        },
        {
          id: 'midrange-observation-08',
          text: 'The strategy gains strength from versatility.',
        },
        {
          id: 'midrange-observation-09',
          text: 'The deck is designed to perform well across many board states.',
        },
        {
          id: 'midrange-observation-10',
          text: 'This strategy values consistency over extremes.',
        },
        {
          id: 'midrange-observation-11',
          text: 'Sage sees a game plan that can adjust to the table.',
        },
        {
          id: 'midrange-observation-12',
          text: 'The deck often wins through repeated strong decisions.',
        },
        {
          id: 'midrange-observation-13',
          text: 'Resource management plays a major role in success.',
        },
        {
          id: 'midrange-observation-14',
          text: 'This strategy is rarely the fastest deck, but rarely the weakest.',
        },
        {
          id: 'midrange-observation-15',
          text: 'The deck can transition between offense and defense naturally.',
        },
        {
          id: 'midrange-observation-16',
          text: 'Sage sees a list built to remain relevant throughout the game.',
        },
        {
          id: 'midrange-observation-17',
          text: 'The strategy can succeed without drawing specific combinations.',
        },
        {
          id: 'midrange-observation-18',
          text: 'Flexibility gives the deck resilience.',
        },
        {
          id: 'midrange-observation-19',
          text: 'The game plan remains functional even after disruption.',
        },
        {
          id: 'midrange-observation-20',
          text: 'This strategy rewards thoughtful play and adaptability.',
        },
      ],
      spellVelocity: [
        {
          id: 'spell-velocity-observation-01',
          text: 'Sage sees a deck that gains momentum from every spell cast.',
        },
        {
          id: 'spell-velocity-observation-02',
          text: 'This strategy treats each spell as fuel for the next one.',
        },
        {
          id: 'spell-velocity-observation-03',
          text: 'The deck becomes more dangerous as turns become more active.',
        },
        {
          id: 'spell-velocity-observation-04',
          text: 'Sage sees a plan built around chaining actions together.',
        },
        {
          id: 'spell-velocity-observation-05',
          text: 'The strategy rewards careful sequencing and timing.',
        },
        {
          id: 'spell-velocity-observation-06',
          text: 'Every spell contributes to a larger engine.',
        },
        {
          id: 'spell-velocity-observation-07',
          text: 'The deck often wins by generating momentum faster than opponents can answer.',
        },
        {
          id: 'spell-velocity-observation-08',
          text: 'Sage sees a strategy where quantity becomes quality.',
        },
        {
          id: 'spell-velocity-observation-09',
          text: 'The game plan accelerates as resources begin flowing.',
        },
        {
          id: 'spell-velocity-observation-10',
          text: 'This deck thrives when it can keep casting.',
        },
        {
          id: 'spell-velocity-observation-11',
          text: "Momentum is one of the deck's primary weapons.",
        },
        {
          id: 'spell-velocity-observation-12',
          text: 'The strategy often looks harmless until several spells are cast in succession.',
        },
        {
          id: 'spell-velocity-observation-13',
          text: 'Sage sees a deck that converts activity into pressure.',
        },
        {
          id: 'spell-velocity-observation-14',
          text: 'The strongest turns involve several actions working together.',
        },
        {
          id: 'spell-velocity-observation-15',
          text: 'This strategy can scale quickly once it starts moving.',
        },
        {
          id: 'spell-velocity-observation-16',
          text: 'The deck is built around maintaining velocity.',
        },
        {
          id: 'spell-velocity-observation-17',
          text: 'Opponents may find it difficult to stop every piece of the chain.',
        },
        {
          id: 'spell-velocity-observation-18',
          text: 'The strategy rewards efficiency over brute force.',
        },
        {
          id: 'spell-velocity-observation-19',
          text: 'Every spell contributes to future opportunities.',
        },
        {
          id: 'spell-velocity-observation-20',
          text: 'The deck becomes strongest when it is allowed to keep moving.',
        },
      ],
      balanced: [
        {
          id: 'balanced-observation-01',
          text: 'Sage sees a deck that avoids extremes in favor of reliability.',
        },
        {
          id: 'balanced-observation-02',
          text: 'This strategy aims to remain functional in a wide range of situations.',
        },
        {
          id: 'balanced-observation-03',
          text: 'The deck values stability over specialization.',
        },
        {
          id: 'balanced-observation-04',
          text: 'Sage sees a plan designed to perform consistently.',
        },
        {
          id: 'balanced-observation-05',
          text: 'This strategy is comfortable adapting to the pace of the table.',
        },
        {
          id: 'balanced-observation-06',
          text: 'The deck rarely relies on one dramatic moment.',
        },
        {
          id: 'balanced-observation-07',
          text: "Consistency is one of this strategy's greatest strengths.",
        },
        {
          id: 'balanced-observation-08',
          text: 'Sage sees a list built to avoid obvious weaknesses.',
        },
        {
          id: 'balanced-observation-09',
          text: 'The deck can contribute meaningfully in many different games.',
        },
        {
          id: 'balanced-observation-10',
          text: 'This strategy favors dependable performance over explosive highs.',
        },
        {
          id: 'balanced-observation-11',
          text: 'The game plan remains steady across changing board states.',
        },
        {
          id: 'balanced-observation-12',
          text: 'Sage sees a balanced approach to Commander.',
        },
        {
          id: 'balanced-observation-13',
          text: 'The deck can shift priorities when needed.',
        },
        {
          id: 'balanced-observation-14',
          text: 'This strategy is built to remain useful throughout the game.',
        },
        {
          id: 'balanced-observation-15',
          text: 'The deck rewards sound fundamentals.',
        },
        {
          id: 'balanced-observation-16',
          text: 'Sage sees a plan that values flexibility and stability equally.',
        },
        {
          id: 'balanced-observation-17',
          text: 'The strategy can survive disruption without changing its identity.',
        },
        {
          id: 'balanced-observation-18',
          text: 'The deck is designed to avoid becoming overly dependent on one element.',
        },
        {
          id: 'balanced-observation-19',
          text: 'Reliable execution is more important than dramatic turns.',
        },
        {
          id: 'balanced-observation-20',
          text: 'The game plan succeeds through consistency and discipline.',
        },
      ],
    },
  },
  strengths: {
    aristocrats: [
      {
        id: 'aristocrats-strength-01',
        text: 'Every sacrifice advances multiple parts of the game plan.',
      },
      {
        id: 'aristocrats-strength-02',
        text: 'The deck is capable of generating value without entering combat.',
      },
      {
        id: 'aristocrats-strength-03',
        text: 'Removal often trades poorly against this strategy.',
      },
      {
        id: 'aristocrats-strength-04',
        text: 'Multiple engines allow the deck to maintain pressure throughout the game.',
      },
      {
        id: 'aristocrats-strength-05',
        text: 'The strategy can continue functioning even after losing key creatures.',
      },
      {
        id: 'aristocrats-strength-06',
        text: "Resource conversion is one of this deck's greatest strengths.",
      },
      {
        id: 'aristocrats-strength-07',
        text: 'The deck excels at turning disposable creatures into meaningful advantages.',
      },
      {
        id: 'aristocrats-strength-08',
        text: 'Opponents may struggle to completely shut down every value engine.',
      },
      {
        id: 'aristocrats-strength-09',
        text: 'The strategy rewards careful sequencing and resource management.',
      },
      {
        id: 'aristocrats-strength-10',
        text: 'Small battlefield advantages often become significant over time.',
      },
      {
        id: 'aristocrats-strength-11',
        text: 'The deck can pressure life totals while continuing to develop its board.',
      },
      {
        id: 'aristocrats-strength-12',
        text: 'Several overlapping engines improve overall consistency.',
      },
      {
        id: 'aristocrats-strength-13',
        text: 'The game plan remains effective across a wide variety of board states.',
      },
      {
        id: 'aristocrats-strength-14',
        text: 'The strategy creates value from actions opponents would normally welcome.',
      },
      {
        id: 'aristocrats-strength-15',
        text: 'Creature-based resources are used with exceptional efficiency.',
      },
      {
        id: 'aristocrats-strength-16',
        text: 'The deck is comfortable playing both long games and grindy games.',
      },
      {
        id: 'aristocrats-strength-17',
        text: 'Multiple sacrifice outlets increase flexibility during complex board states.',
      },
      {
        id: 'aristocrats-strength-18',
        text: 'The strategy rarely depends on a single path to victory.',
      },
      {
        id: 'aristocrats-strength-19',
        text: 'Strong synergy allows the deck to generate momentum from seemingly small plays.',
      },
      {
        id: 'aristocrats-strength-20',
        text: 'Value generation continues even when the battlefield becomes hostile.',
      },
    ],
    tokenSwarm: [
      {
        id: 'token-swarm-strength-01',
        text: 'The deck creates pressure without relying on a single creature.',
      },
      {
        id: 'token-swarm-strength-02',
        text: 'Multiple bodies make spot removal less effective.',
      },
      {
        id: 'token-swarm-strength-03',
        text: 'Token production gives the deck strong rebuilding potential.',
      },
      {
        id: 'token-swarm-strength-04',
        text: 'The strategy can threaten several opponents at once.',
      },
      {
        id: 'token-swarm-strength-05',
        text: 'Wide battlefields make combat math difficult for the table.',
      },
      {
        id: 'token-swarm-strength-06',
        text: 'The deck can convert small creatures into major damage with the right payoff.',
      },
      {
        id: 'token-swarm-strength-07',
        text: 'This strategy punishes opponents who ignore early development.',
      },
      {
        id: 'token-swarm-strength-08',
        text: 'The board can grow faster than opponents can comfortably answer.',
      },
      {
        id: 'token-swarm-strength-09',
        text: "Multiple token makers improve the deck's ability to recover.",
      },
      {
        id: 'token-swarm-strength-10',
        text: 'The strategy can turn anthem effects or sacrifice outlets into serious threats.',
      },
      {
        id: 'token-swarm-strength-11',
        text: 'The deck forces opponents to answer both the creatures and the cards that reward them.',
      },
      {
        id: 'token-swarm-strength-12',
        text: 'Repeated token production keeps pressure on the table.',
      },
      {
        id: 'token-swarm-strength-13',
        text: 'The strategy is resilient against one-for-one removal.',
      },
      {
        id: 'token-swarm-strength-14',
        text: 'The deck can create blockers while still building toward a win.',
      },
      {
        id: 'token-swarm-strength-15',
        text: 'Payoff cards become more dangerous as the battlefield widens.',
      },
      {
        id: 'token-swarm-strength-16',
        text: "The deck's threats are distributed across many small pieces.",
      },
      {
        id: 'token-swarm-strength-17',
        text: 'The strategy can scale well into longer games.',
      },
      {
        id: 'token-swarm-strength-18',
        text: 'Token density creates flexibility in both offense and defense.',
      },
      {
        id: 'token-swarm-strength-19',
        text: 'The deck is capable of rebuilding after board wipes if its engines survive.',
      },
      {
        id: 'token-swarm-strength-20',
        text: 'Once the board grows wide enough, even ordinary creatures become dangerous.',
      },
    ],
    graveyardRecursion: [
      {
        id: 'graveyard-recursion-strength-01',
        text: 'The deck can reuse important cards instead of relying on drawing replacements.',
      },
      {
        id: 'graveyard-recursion-strength-02',
        text: 'Recursion makes one-for-one removal less effective.',
      },
      {
        id: 'graveyard-recursion-strength-03',
        text: 'The strategy is comfortable playing long, resource-heavy games.',
      },
      {
        id: 'graveyard-recursion-strength-04',
        text: 'The graveyard gives the deck access to additional lines of play.',
      },
      {
        id: 'graveyard-recursion-strength-05',
        text: 'Reanimation effects can turn early setup into major tempo swings.',
      },
      {
        id: 'graveyard-recursion-strength-06',
        text: 'The deck can recover threats that opponents already spent resources to answer.',
      },
      {
        id: 'graveyard-recursion-strength-07',
        text: 'Self-mill and discard can become forms of card selection.',
      },
      {
        id: 'graveyard-recursion-strength-08',
        text: 'The strategy can rebuild after disruption better than many fair decks.',
      },
      {
        id: 'graveyard-recursion-strength-09',
        text: "Graveyard access improves the deck's ability to grind.",
      },
      {
        id: 'graveyard-recursion-strength-10',
        text: 'The deck can convert attrition into pressure.',
      },
      {
        id: 'graveyard-recursion-strength-11',
        text: 'Reusing creatures or spells gives the deck strong late-game reach.',
      },
      {
        id: 'graveyard-recursion-strength-12',
        text: 'The strategy rewards careful sequencing and planning ahead.',
      },
      {
        id: 'graveyard-recursion-strength-13',
        text: 'The deck can threaten value even when its hand is low.',
      },
      {
        id: 'graveyard-recursion-strength-14',
        text: 'Recursion gives the deck resilience against normal removal.',
      },
      {
        id: 'graveyard-recursion-strength-15',
        text: 'The graveyard expands the number of meaningful decisions available each turn.',
      },
      {
        id: 'graveyard-recursion-strength-16',
        text: 'The strategy can punish opponents who fail to exile key cards.',
      },
      {
        id: 'graveyard-recursion-strength-17',
        text: 'Repeated access to the same effects improves consistency.',
      },
      {
        id: 'graveyard-recursion-strength-18',
        text: 'The deck often gains value from cards moving between zones.',
      },
      {
        id: 'graveyard-recursion-strength-19',
        text: 'Graveyard engines can create inevitability if left unchecked.',
      },
      {
        id: 'graveyard-recursion-strength-20',
        text: 'The strategy can make opponents fight the same battle more than once.',
      },
    ],
    control: [
      {
        id: 'control-strength-01',
        text: 'The deck can disrupt opposing game plans before they become overwhelming.',
      },
      {
        id: 'control-strength-02',
        text: 'Strong answer density gives the deck flexibility across many matchups.',
      },
      {
        id: 'control-strength-03',
        text: 'The strategy rewards patient play and careful timing.',
      },
      {
        id: 'control-strength-04',
        text: 'The deck can punish opponents who overcommit to the battlefield.',
      },
      {
        id: 'control-strength-05',
        text: 'Interaction allows the deck to survive faster starts.',
      },
      {
        id: 'control-strength-06',
        text: 'The game plan becomes stronger as opponents run low on resources.',
      },
      {
        id: 'control-strength-07',
        text: 'The deck can protect its own win condition while disrupting others.',
      },
      {
        id: 'control-strength-08',
        text: 'Flexible answers help the deck adapt to changing board states.',
      },
      {
        id: 'control-strength-09',
        text: 'Control elements make it difficult for opponents to execute cleanly.',
      },
      {
        id: 'control-strength-10',
        text: 'The strategy can turn one well-timed answer into a major tempo swing.',
      },
      {
        id: 'control-strength-11',
        text: 'The deck is capable of slowing the game until its late-game plan matters.',
      },
      {
        id: 'control-strength-12',
        text: 'Opponents may struggle to resolve their most important plays.',
      },
      {
        id: 'control-strength-13',
        text: 'The deck can keep dangerous commanders from taking over the table.',
      },
      {
        id: 'control-strength-14',
        text: "Strong interaction improves the deck's ability to survive explosive turns.",
      },
      {
        id: 'control-strength-15',
        text: 'The strategy can force opponents into awkward sequencing.',
      },
      {
        id: 'control-strength-16',
        text: 'The deck is built to manage threats rather than race them.',
      },
      {
        id: 'control-strength-17',
        text: 'The game plan benefits from disciplined resource use.',
      },
      {
        id: 'control-strength-18',
        text: 'The deck can win by exhausting opposing options.',
      },
      {
        id: 'control-strength-19',
        text: 'Control pressure often comes from what opponents are afraid to cast.',
      },
      {
        id: 'control-strength-20',
        text: 'The strategy is strongest when it dictates the pace of the game.',
      },
    ],
    combo: [
      {
        id: 'combo-strength-01',
        text: 'The deck can threaten wins without needing a dominant battlefield.',
      },
      {
        id: 'combo-strength-02',
        text: 'Multiple connected pieces make the game plan difficult to read from board state alone.',
      },
      {
        id: 'combo-strength-03',
        text: 'The strategy can convert a single opening into a winning turn.',
      },
      {
        id: 'combo-strength-04',
        text: "Support pieces increase the reliability of the deck's strongest lines.",
      },
      {
        id: 'combo-strength-05',
        text: 'The deck can pressure opponents simply by representing a possible combo.',
      },
      {
        id: 'combo-strength-06',
        text: 'The game plan rewards precise sequencing and careful resource management.',
      },
      {
        id: 'combo-strength-07',
        text: 'The deck may force opponents to hold answers longer than they want to.',
      },
      {
        id: 'combo-strength-08',
        text: 'Combo pressure gives the strategy reach from otherwise neutral positions.',
      },
      {
        id: 'combo-strength-09',
        text: 'Redundant pieces improve the chance of assembling a decisive line.',
      },
      {
        id: 'combo-strength-10',
        text: 'The deck can win through angles that combat-focused decks cannot easily match.',
      },
      {
        id: 'combo-strength-11',
        text: 'The strategy can punish tables that tap out too freely.',
      },
      {
        id: 'combo-strength-12',
        text: "The deck's strongest turns can appear suddenly after quiet setup.",
      },
      {
        id: 'combo-strength-13',
        text: 'The game plan benefits from patience and timing.',
      },
      {
        id: 'combo-strength-14',
        text: 'The deck can turn card selection into direct pressure.',
      },
      {
        id: 'combo-strength-15',
        text: 'Opponents may struggle to identify which piece must be answered first.',
      },
      {
        id: 'combo-strength-16',
        text: 'The strategy can win even when the battlefield looks unfavorable.',
      },
      {
        id: 'combo-strength-17',
        text: "The deck's threat profile remains high as long as key resources are available.",
      },
      {
        id: 'combo-strength-18',
        text: 'The game plan becomes stronger when opponents are forced to guess.',
      },
      {
        id: 'combo-strength-19',
        text: 'Combo density can make every draw step feel dangerous.',
      },
      {
        id: 'combo-strength-20',
        text: 'The deck is capable of ending games before opponents fully stabilize.',
      },
    ],
    ramp: [
      {
        id: 'ramp-strength-01',
        text: 'The deck can cast impactful spells ahead of schedule.',
      },
      {
        id: 'ramp-strength-02',
        text: 'Strong mana development lets the strategy recover from early pressure.',
      },
      {
        id: 'ramp-strength-03',
        text: 'The deck can produce threats that outsize normal battlefield exchanges.',
      },
      {
        id: 'ramp-strength-04',
        text: 'Ramp gives the deck access to powerful turns before opponents are ready.',
      },
      {
        id: 'ramp-strength-05',
        text: 'The strategy can pressure the table with one major spell at a time.',
      },
      {
        id: 'ramp-strength-06',
        text: 'Mana advantage creates flexibility in both offense and defense.',
      },
      {
        id: 'ramp-strength-07',
        text: 'The deck can rebuild quickly if its resource engine survives.',
      },
      {
        id: 'ramp-strength-08',
        text: 'Big threats demand answers and can exhaust opposing removal.',
      },
      {
        id: 'ramp-strength-09',
        text: 'The game plan scales well into longer matches.',
      },
      {
        id: 'ramp-strength-10',
        text: 'The deck can turn extra mana into card advantage, board presence, or finishing power.',
      },
      {
        id: 'ramp-strength-11',
        text: 'The strategy rewards strong opening development.',
      },
      {
        id: 'ramp-strength-12',
        text: 'Expensive spells become realistic threats instead of late-game dreams.',
      },
      {
        id: 'ramp-strength-13',
        text: 'The deck can overpower opponents who stumble early.',
      },
      {
        id: 'ramp-strength-14',
        text: "Mana acceleration makes the deck's top end much more reliable.",
      },
      {
        id: 'ramp-strength-15',
        text: 'The strategy can force opponents to answer threats above their curve.',
      },
      {
        id: 'ramp-strength-16',
        text: 'Once ahead on mana, the deck can apply pressure every turn.',
      },
      {
        id: 'ramp-strength-17',
        text: "The deck's late game can arrive earlier than expected.",
      },
      {
        id: 'ramp-strength-18',
        text: 'Large threats give the strategy a clear way to close.',
      },
      {
        id: 'ramp-strength-19',
        text: 'The deck can dominate if opponents fail to disrupt its mana engine.',
      },
      {
        id: 'ramp-strength-20',
        text: 'Resource advantage gives the strategy a strong foundation.',
      },
    ],
    voltron: [
      {
        id: 'voltron-strength-01',
        text: 'The deck can apply serious pressure with very few creatures.',
      },
      {
        id: 'voltron-strength-02',
        text: 'Concentrated threat development makes the game plan clear and direct.',
      },
      {
        id: 'voltron-strength-03',
        text: 'Protection spells can make removal inefficient.',
      },
      {
        id: 'voltron-strength-04',
        text: 'Commander damage gives the deck a unique path to victory.',
      },
      {
        id: 'voltron-strength-05',
        text: 'The strategy can punish opponents who lack instant-speed answers.',
      },
      {
        id: 'voltron-strength-06',
        text: 'Evasion makes blocking difficult or irrelevant.',
      },
      {
        id: 'voltron-strength-07',
        text: 'The deck can force opponents to spend removal early.',
      },
      {
        id: 'voltron-strength-08',
        text: 'A single protected attacker can dominate combat.',
      },
      {
        id: 'voltron-strength-09',
        text: 'The strategy reduces the need to build a wide battlefield.',
      },
      {
        id: 'voltron-strength-10',
        text: 'Voltron pressure can shorten games quickly.',
      },
      {
        id: 'voltron-strength-11',
        text: 'Equipment and auras can turn ordinary attacks into lethal ones.',
      },
      {
        id: 'voltron-strength-12',
        text: 'The deck can threaten one opponent while holding resources for protection.',
      },
      {
        id: 'voltron-strength-13',
        text: 'The game plan rewards precise timing.',
      },
      {
        id: 'voltron-strength-14',
        text: 'The primary threat can scale quickly over several turns.',
      },
      {
        id: 'voltron-strength-15',
        text: 'The deck can make every combat step matter.',
      },
      {
        id: 'voltron-strength-16',
        text: 'Opponents must respect commander damage from the beginning.',
      },
      {
        id: 'voltron-strength-17',
        text: 'The strategy can win through defensive board states if evasion is available.',
      },
      {
        id: 'voltron-strength-18',
        text: 'Protection and recursion make the main threat harder to answer permanently.',
      },
      {
        id: 'voltron-strength-19',
        text: "The deck's pressure is easy to understand but difficult to ignore.",
      },
      {
        id: 'voltron-strength-20',
        text: 'Once established, the main threat can demand answers every turn.',
      },
    ],
    blink: [
      {
        id: 'blink-strength-01',
        text: 'The deck can generate repeated value from a limited number of cards.',
      },
      {
        id: 'blink-strength-02',
        text: 'Enter-the-battlefield effects become significantly stronger when reused.',
      },
      {
        id: 'blink-strength-03',
        text: 'The strategy can out-resource opponents over time.',
      },
      {
        id: 'blink-strength-04',
        text: 'Blink effects improve the efficiency of existing threats.',
      },
      {
        id: 'blink-strength-05',
        text: 'The deck rewards careful sequencing and timing.',
      },
      {
        id: 'blink-strength-06',
        text: 'The strategy can create value without committing many new resources.',
      },
      {
        id: 'blink-strength-07',
        text: 'Repeated triggers give the deck strong staying power.',
      },
      {
        id: 'blink-strength-08',
        text: 'Opponents may struggle to keep up with recurring advantages.',
      },
      {
        id: 'blink-strength-09',
        text: 'The deck can reuse utility creatures as needed.',
      },
      {
        id: 'blink-strength-10',
        text: 'Blink effects can protect important creatures from removal.',
      },
      {
        id: 'blink-strength-11',
        text: 'The strategy often gains more value from a creature than opponents expect.',
      },
      {
        id: 'blink-strength-12',
        text: 'Repeated access to key effects improves consistency.',
      },
      {
        id: 'blink-strength-13',
        text: 'The deck can turn small battlefield advantages into major ones.',
      },
      {
        id: 'blink-strength-14',
        text: 'The strategy scales well into longer games.',
      },
      {
        id: 'blink-strength-15',
        text: 'Blink engines create flexibility in changing board states.',
      },
      {
        id: 'blink-strength-16',
        text: 'The deck can generate pressure without relying entirely on combat.',
      },
      {
        id: 'blink-strength-17',
        text: 'Value generation improves every time an effect is repeated.',
      },
      {
        id: 'blink-strength-18',
        text: 'The strategy can recover from disruption by rebuilding value engines.',
      },
      {
        id: 'blink-strength-19',
        text: 'Opponents often need multiple answers for the same problem.',
      },
      {
        id: 'blink-strength-20',
        text: 'The deck is comfortable winning through sustained advantage.',
      },
    ],
    midrange: [
      {
        id: 'midrange-strength-01',
        text: 'The deck can respond to a wide variety of situations.',
      },
      {
        id: 'midrange-strength-02',
        text: 'Flexible card quality gives the strategy stability.',
      },
      {
        id: 'midrange-strength-03',
        text: 'The game plan remains effective across different matchups.',
      },
      {
        id: 'midrange-strength-04',
        text: 'The deck is rarely dependent on a single card.',
      },
      {
        id: 'midrange-strength-05',
        text: 'Strong standalone cards improve reliability.',
      },
      {
        id: 'midrange-strength-06',
        text: 'The strategy can shift roles as needed.',
      },
      {
        id: 'midrange-strength-07',
        text: 'Resource efficiency helps the deck survive changing board states.',
      },
      {
        id: 'midrange-strength-08',
        text: 'The deck can pressure opponents without overcommitting.',
      },
      {
        id: 'midrange-strength-09',
        text: 'Versatility improves long-game performance.',
      },
      {
        id: 'midrange-strength-10',
        text: 'The strategy has tools for many different problems.',
      },
      {
        id: 'midrange-strength-11',
        text: 'Consistency comes from redundancy rather than narrow combos.',
      },
      {
        id: 'midrange-strength-12',
        text: 'The deck can adapt to the pace of the table.',
      },
      {
        id: 'midrange-strength-13',
        text: 'Strong card quality reduces reliance on perfect draws.',
      },
      {
        id: 'midrange-strength-14',
        text: 'The strategy remains functional after disruption.',
      },
      {
        id: 'midrange-strength-15',
        text: 'Multiple paths to victory improve resilience.',
      },
      {
        id: 'midrange-strength-16',
        text: 'The deck can capitalize on mistakes from opponents.',
      },
      {
        id: 'midrange-strength-17',
        text: 'Flexibility often creates difficult decisions for the table.',
      },
      {
        id: 'midrange-strength-18',
        text: 'The strategy balances offense and defense effectively.',
      },
      {
        id: 'midrange-strength-19',
        text: 'Reliable card quality improves performance over time.',
      },
      {
        id: 'midrange-strength-20',
        text: 'The deck is comfortable playing a long game.',
      },
    ],
    spellVelocity: [
      {
        id: 'spell-velocity-strength-01',
        text: 'Multiple spells can generate pressure from unexpected angles.',
      },
      {
        id: 'spell-velocity-strength-02',
        text: 'The strategy rewards efficient resource use.',
      },
      {
        id: 'spell-velocity-strength-03',
        text: 'Momentum creates opportunities faster than opponents expect.',
      },
      {
        id: 'spell-velocity-strength-04',
        text: 'The deck can turn card flow into board impact.',
      },
      {
        id: 'spell-velocity-strength-05',
        text: 'Chained actions improve overall efficiency.',
      },
      {
        id: 'spell-velocity-strength-06',
        text: 'The strategy can pressure opponents without relying on combat alone.',
      },
      {
        id: 'spell-velocity-strength-07',
        text: 'Spell density improves consistency.',
      },
      {
        id: 'spell-velocity-strength-08',
        text: 'The deck can generate value from activity itself.',
      },
      {
        id: 'spell-velocity-strength-09',
        text: 'Resource conversion becomes stronger over time.',
      },
      {
        id: 'spell-velocity-strength-10',
        text: 'The strategy can produce explosive turns from modest beginnings.',
      },
      {
        id: 'spell-velocity-strength-11',
        text: 'The deck often rewards precise sequencing.',
      },
      {
        id: 'spell-velocity-strength-12',
        text: 'Multiple actions make interaction more difficult.',
      },
      {
        id: 'spell-velocity-strength-13',
        text: 'Velocity allows the deck to scale rapidly.',
      },
      {
        id: 'spell-velocity-strength-14',
        text: 'The strategy can recover quickly if card flow remains active.',
      },
      {
        id: 'spell-velocity-strength-15',
        text: 'Opponents may struggle to answer every spell.',
      },
      {
        id: 'spell-velocity-strength-16',
        text: 'The game plan benefits from flexibility and timing.',
      },
      {
        id: 'spell-velocity-strength-17',
        text: 'The deck can create pressure even from low-resource positions.',
      },
      {
        id: 'spell-velocity-strength-18',
        text: 'Momentum improves nearly every aspect of the strategy.',
      },
      {
        id: 'spell-velocity-strength-19',
        text: 'The deck becomes stronger when allowed to keep casting.',
      },
      {
        id: 'spell-velocity-strength-20',
        text: 'Activity itself becomes a win condition.',
      },
    ],
    balanced: [
      {
        id: 'balanced-strength-01',
        text: 'The deck can operate effectively across many different situations.',
      },
      {
        id: 'balanced-strength-02',
        text: 'Reliable performance reduces the impact of bad draws.',
      },
      {
        id: 'balanced-strength-03',
        text: 'The strategy remains functional when plans change.',
      },
      {
        id: 'balanced-strength-04',
        text: 'Flexibility improves long-term consistency.',
      },
      {
        id: 'balanced-strength-05',
        text: 'The deck avoids many of the weaknesses of specialized archetypes.',
      },
      {
        id: 'balanced-strength-06',
        text: 'Stable performance gives the strategy a dependable foundation.',
      },
      {
        id: 'balanced-strength-07',
        text: 'The deck can respond to changing game states.',
      },
      {
        id: 'balanced-strength-08',
        text: 'Adaptability helps maintain relevance throughout the game.',
      },
      {
        id: 'balanced-strength-09',
        text: 'The strategy is rarely completely shut down by one answer.',
      },
      {
        id: 'balanced-strength-10',
        text: 'Strong fundamentals improve overall reliability.',
      },
      {
        id: 'balanced-strength-11',
        text: 'The deck can pressure, defend, and recover as needed.',
      },
      {
        id: 'balanced-strength-12',
        text: 'Consistency gives the strategy a high floor.',
      },
      {
        id: 'balanced-strength-13',
        text: 'The game plan remains stable even under pressure.',
      },
      {
        id: 'balanced-strength-14',
        text: 'Opponents may struggle to exploit obvious weaknesses.',
      },
      {
        id: 'balanced-strength-15',
        text: 'The strategy rewards disciplined play.',
      },
      {
        id: 'balanced-strength-16',
        text: 'The deck is comfortable in both short and long games.',
      },
      {
        id: 'balanced-strength-17',
        text: 'Balanced resources create resilience.',
      },
      {
        id: 'balanced-strength-18',
        text: 'The strategy can remain effective without drawing perfect combinations.',
      },
      {
        id: 'balanced-strength-19',
        text: 'Flexibility improves decision quality.',
      },
      {
        id: 'balanced-strength-20',
        text: 'The deck is built to keep functioning.',
      },
    ],
    cardAdvantage: [
      {
        id: 'card-advantage-01',
        text: 'This deck rarely runs out of meaningful things to do.',
      },
      {
        id: 'card-advantage-02',
        text: 'The strategy is built to keep options flowing through the middle turns.',
      },
      {
        id: 'card-advantage-03',
        text: "Opponents may struggle to exhaust this deck's resources.",
      },
      {
        id: 'card-advantage-04',
        text: 'Card flow gives the deck room to recover from disruption.',
      },
      {
        id: 'card-advantage-05',
        text: 'The deck can continue developing even after spending early resources.',
      },
      {
        id: 'card-advantage-06',
        text: 'Sustained access to cards makes the primary plan more reliable.',
      },
      {
        id: 'card-advantage-07',
        text: 'The deck is built to avoid stalling once the first wave of plays is answered.',
      },
      {
        id: 'card-advantage-08',
        text: 'Resource flow gives this strategy staying power.',
      },
      {
        id: 'card-advantage-09',
        text: 'The deck can find new threats without relying only on its opening hand.',
      },
      {
        id: 'card-advantage-10',
        text: 'Long games become more favorable when this deck keeps seeing cards.',
      },
    ],
    consistency: [
      {
        id: 'consistency-01',
        text: 'This strategy rarely struggles to find the pieces it needs.',
      },
      {
        id: 'consistency-02',
        text: 'The deck has multiple paths toward the same game plan.',
      },
      {
        id: 'consistency-03',
        text: 'Most games should unfold with a familiar rhythm.',
      },
      {
        id: 'consistency-04',
        text: "Redundant pieces make the deck's plan more reliable.",
      },
      {
        id: 'consistency-05',
        text: 'The strategy is not overly dependent on one perfect draw.',
      },
      {
        id: 'consistency-06',
        text: 'The deck can usually keep moving even when the first plan is disrupted.',
      },
      {
        id: 'consistency-07',
        text: 'Multiple role-players help the deck avoid awkward starts.',
      },
      {
        id: 'consistency-08',
        text: 'The game plan appears repeatable rather than fragile.',
      },
      {
        id: 'consistency-09',
        text: 'The deck is built to do its thing in most games.',
      },
      {
        id: 'consistency-10',
        text: 'Consistency gives this deck a steady floor even when it does not draw perfectly.',
      },
    ],
    synergy: [
      {
        id: 'synergy-connected-plan',
        text: 'The deck shows connected card relationships instead of relying only on standalone power.',
      },
    ],
    finishPotential: [
      {
        id: 'finish-potential-01',
        text: 'Once this deck gets established, it rarely struggles to find a way to end the game.',
      },
      {
        id: 'finish-potential-02',
        text: 'The deck has more than one path to convert advantage into a win.',
      },
      {
        id: 'finish-potential-03',
        text: 'Opponents may not get many chances once this strategy reaches critical mass.',
      },
      {
        id: 'finish-potential-04',
        text: 'The endgame becomes dangerous when the deck has time to assemble its pieces.',
      },
      {
        id: 'finish-potential-05',
        text: 'This deck can turn a stable position into a winning position quickly.',
      },
      {
        id: 'finish-potential-06',
        text: 'The strategy has credible ways to close before opponents fully recover.',
      },
      {
        id: 'finish-potential-07',
        text: 'The deck is not just built to survive. It is built to finish.',
      },
      {
        id: 'finish-potential-08',
        text: 'Once ahead, this deck can make the game difficult to steal back.',
      },
      {
        id: 'finish-potential-09',
        text: 'The closing power becomes clearer as the board develops.',
      },
      {
        id: 'finish-potential-10',
        text: 'This deck can punish opponents who assume they have more time.',
      },
    ],
    interaction: [
      {
        id: 'interaction-01',
        text: 'The deck has tools to interfere with opposing plans.',
      },
      {
        id: 'interaction-02',
        text: 'This strategy is not forced to ignore what opponents are doing.',
      },
      {
        id: 'interaction-03',
        text: 'Interaction gives the deck a way to survive dangerous turns.',
      },
      {
        id: 'interaction-04',
        text: 'The deck can answer key threats before they take over.',
      },
      {
        id: 'interaction-05',
        text: 'Opponents may find it harder to execute cleanly against this list.',
      },
      {
        id: 'interaction-06',
        text: 'The strategy has ways to contest important moments.',
      },
      {
        id: 'interaction-07',
        text: 'This deck can choose when to fight instead of simply racing.',
      },
      {
        id: 'interaction-08',
        text: "Answer density improves the deck's ability to stay in the game.",
      },
      {
        id: 'interaction-09',
        text: 'The deck has meaningful ways to slow opponents down.',
      },
      {
        id: 'interaction-10',
        text: 'Interaction helps the deck avoid losing to a single unchecked threat.',
      },
    ],
    resilience: [
      {
        id: 'resilience-01',
        text: 'Removing one threat rarely ends the conversation.',
      },
      {
        id: 'resilience-02',
        text: 'The deck has tools to keep functioning after disruption.',
      },
      {
        id: 'resilience-03',
        text: 'This strategy can recover better than its battlefield may suggest.',
      },
      {
        id: 'resilience-04',
        text: 'The deck is not easily stopped by a single answer.',
      },
      {
        id: 'resilience-05',
        text: 'Redundant pieces help the strategy survive removal.',
      },
      {
        id: 'resilience-06',
        text: 'The game plan can continue even after opponents interrupt it.',
      },
      {
        id: 'resilience-07',
        text: 'The deck has enough structure to rebuild after setbacks.',
      },
      {
        id: 'resilience-08',
        text: 'This strategy is harder to contain than it first appears.',
      },
      {
        id: 'resilience-09',
        text: 'Recovery tools give the deck staying power.',
      },
      {
        id: 'resilience-10',
        text: 'The deck can absorb disruption without immediately losing its direction.',
      },
    ],
    engineDensity: [
      {
        id: 'engine-density-repeatable',
        text: 'Repeatable engines give the deck staying power across longer games.',
      },
    ],
  },
  concerns: {
    aristocrats: [
      {
        id: 'aristocrats-concern-01',
        text: 'The strategy may struggle when sacrifice outlets are unavailable.',
      },
      {
        id: 'aristocrats-concern-02',
        text: 'Graveyard disruption can significantly reduce overall efficiency.',
      },
      {
        id: 'aristocrats-concern-03',
        text: 'Losing multiple engine pieces at once may slow the deck considerably.',
      },
      {
        id: 'aristocrats-concern-04',
        text: 'The game plan can become less effective when forced to play from behind.',
      },
      {
        id: 'aristocrats-concern-05',
        text: 'Some wins require several moving parts to remain active simultaneously.',
      },
      {
        id: 'aristocrats-concern-06',
        text: 'The strategy may struggle against repeated exile effects.',
      },
      {
        id: 'aristocrats-concern-07',
        text: 'Resource generation can slow dramatically when creature production is interrupted.',
      },
      {
        id: 'aristocrats-concern-08',
        text: 'Certain board states may limit access to important sacrifice triggers.',
      },
      {
        id: 'aristocrats-concern-09',
        text: 'Recovering after severe graveyard disruption may take time.',
      },
      {
        id: 'aristocrats-concern-10',
        text: "The deck's strongest turns often depend on maintaining engine pieces over multiple turns.",
      },
    ],
    tokenSwarm: [
      {
        id: 'token-swarm-concern-01',
        text: 'The deck may struggle if token makers are removed early.',
      },
      {
        id: 'token-swarm-concern-02',
        text: "Board wipes can reset much of the deck's progress.",
      },
      {
        id: 'token-swarm-concern-03',
        text: 'The strategy may need payoff cards to turn a wide board into a win.',
      },
      {
        id: 'token-swarm-concern-04',
        text: 'Large blockers can slow the deck if evasion or anthem effects are missing.',
      },
      {
        id: 'token-swarm-concern-05',
        text: 'The deck may have trouble recovering if both tokens and engines are removed together.',
      },
      {
        id: 'token-swarm-concern-06',
        text: 'Fog effects and repeated sweepers can blunt the combat plan.',
      },
      {
        id: 'token-swarm-concern-07',
        text: 'The strategy can be vulnerable to cards that punish creature-heavy boards.',
      },
      {
        id: 'token-swarm-concern-08',
        text: 'Without card advantage, the deck may run out of pressure after repeated removal.',
      },
      {
        id: 'token-swarm-concern-09',
        text: 'The deck may struggle against opponents who control combat effectively.',
      },
      {
        id: 'token-swarm-concern-10',
        text: 'Token production alone may not be enough without a clear finishing plan.',
      },
    ],
    graveyardRecursion: [
      {
        id: 'graveyard-recursion-concern-01',
        text: "Graveyard hate can sharply reduce the deck's effectiveness.",
      },
      {
        id: 'graveyard-recursion-concern-02',
        text: 'The strategy may struggle if key recursion pieces are exiled.',
      },
      {
        id: 'graveyard-recursion-concern-03',
        text: 'Some lines require time to set up before they become powerful.',
      },
      {
        id: 'graveyard-recursion-concern-04',
        text: 'The deck may be vulnerable to fast opponents before its graveyard is developed.',
      },
      {
        id: 'graveyard-recursion-concern-05',
        text: 'Rest in Peace-style effects can cut off major parts of the game plan.',
      },
      {
        id: 'graveyard-recursion-concern-06',
        text: 'The strategy may need protection for its graveyard engines.',
      },
      {
        id: 'graveyard-recursion-concern-07',
        text: 'Losing access to the graveyard can leave the deck relying on slower backup plans.',
      },
      {
        id: 'graveyard-recursion-concern-08',
        text: 'The deck may struggle against repeated exile-based removal.',
      },
      {
        id: 'graveyard-recursion-concern-09',
        text: 'If the graveyard is emptied at the wrong time, recovery can be difficult.',
      },
      {
        id: 'graveyard-recursion-concern-10',
        text: 'The strategy can become predictable if opponents identify the recursion loop early.',
      },
    ],
    control: [
      {
        id: 'control-concern-01',
        text: 'The deck may struggle if too many threats appear at once.',
      },
      {
        id: 'control-concern-02',
        text: 'Falling behind early can make recovery difficult.',
      },
      {
        id: 'control-concern-03',
        text: 'The strategy may need careful timing to avoid wasting answers.',
      },
      {
        id: 'control-concern-04',
        text: 'Control decks can struggle when opponents attack from too many angles.',
      },
      {
        id: 'control-concern-05',
        text: 'The deck may have limited pressure if its win conditions are removed.',
      },
      {
        id: 'control-concern-06',
        text: 'Running out of cards can weaken the entire game plan.',
      },
      {
        id: 'control-concern-07',
        text: 'The strategy may struggle against threats that cannot be answered cleanly.',
      },
      {
        id: 'control-concern-08',
        text: 'Fast starts can pressure the deck before it stabilizes.',
      },
      {
        id: 'control-concern-09',
        text: 'The deck may become vulnerable if forced to tap out at the wrong time.',
      },
      {
        id: 'control-concern-10',
        text: 'Poor threat assessment can quickly turn strong answers into wasted resources.',
      },
    ],
    combo: [
      {
        id: 'combo-concern-01',
        text: 'The deck may struggle if key pieces are removed before the combo turn.',
      },
      {
        id: 'combo-concern-02',
        text: 'Heavy interaction can force the strategy to delay its strongest lines.',
      },
      {
        id: 'combo-concern-03',
        text: 'The game plan may become fragile if it relies on too few payoff cards.',
      },
      {
        id: 'combo-concern-04',
        text: 'Opponents with instant-speed answers can make the final turn difficult.',
      },
      {
        id: 'combo-concern-05',
        text: 'The deck may need protection before attempting to win.',
      },
      {
        id: 'combo-concern-06',
        text: 'Graveyard or artifact hate may disrupt certain combo paths.',
      },
      {
        id: 'combo-concern-07',
        text: 'The strategy can stumble if card selection is interrupted.',
      },
      {
        id: 'combo-concern-08',
        text: 'The deck may draw support pieces without finding the payoff.',
      },
      {
        id: 'combo-concern-09',
        text: 'Multiple opponents holding interaction can make timing difficult.',
      },
      {
        id: 'combo-concern-10',
        text: 'The strategy may be vulnerable if forced to win through combat instead.',
      },
    ],
    ramp: [
      {
        id: 'ramp-concern-01',
        text: 'The deck may struggle if early ramp is disrupted.',
      },
      {
        id: 'ramp-concern-02',
        text: 'Expensive threats can become awkward without enough mana development.',
      },
      {
        id: 'ramp-concern-03',
        text: 'Fast aggressive decks may pressure the strategy before it stabilizes.',
      },
      {
        id: 'ramp-concern-04',
        text: 'The deck may draw payoff cards before it has the mana to use them.',
      },
      {
        id: 'ramp-concern-05',
        text: 'Board wipes can be painful if the deck invests too much into one battlefield.',
      },
      {
        id: 'ramp-concern-06',
        text: 'The strategy may struggle against efficient removal if threats arrive one at a time.',
      },
      {
        id: 'ramp-concern-07',
        text: 'Running out of cards can limit what the deck does with its extra mana.',
      },
      {
        id: 'ramp-concern-08',
        text: 'The deck may need protection for its largest threats.',
      },
      {
        id: 'ramp-concern-09',
        text: 'Resource denial can slow the entire game plan.',
      },
      {
        id: 'ramp-concern-10',
        text: 'The strategy can become clunky if the ramp and payoff halves do not align.',
      },
    ],
    voltron: [
      {
        id: 'voltron-concern-01',
        text: 'The deck may struggle if its primary threat is repeatedly removed.',
      },
      {
        id: 'voltron-concern-02',
        text: 'Heavy sacrifice effects can bypass normal protection.',
      },
      {
        id: 'voltron-concern-03',
        text: 'The strategy can become fragile if too much depends on one creature.',
      },
      {
        id: 'voltron-concern-04',
        text: 'Board wipes can reset a heavily invested battlefield.',
      },
      {
        id: 'voltron-concern-05',
        text: 'The deck may struggle against effects that prevent attacking or remove abilities.',
      },
      {
        id: 'voltron-concern-06',
        text: 'Running out of protection can expose the main threat.',
      },
      {
        id: 'voltron-concern-07',
        text: 'The strategy may have trouble fighting multiple opponents at once.',
      },
      {
        id: 'voltron-concern-08',
        text: 'If the commander becomes too expensive to recast, pressure can collapse.',
      },
      {
        id: 'voltron-concern-09',
        text: 'The deck may struggle against go-wide strategies that race around one attacker.',
      },
      {
        id: 'voltron-concern-10',
        text: 'Without evasion, large blockers can slow the combat plan.',
      },
    ],
    blink: [
      {
        id: 'blink-concern-01',
        text: 'The strategy may struggle if blink engines are removed early.',
      },
      {
        id: 'blink-concern-02',
        text: 'Some value pieces are less impressive without support.',
      },
      {
        id: 'blink-concern-03',
        text: 'The deck can become slower if it loses access to recurring effects.',
      },
      {
        id: 'blink-concern-04',
        text: 'Heavy removal may interrupt important sequencing.',
      },
      {
        id: 'blink-concern-05',
        text: 'The strategy may need time before value engines become impactful.',
      },
      {
        id: 'blink-concern-06',
        text: 'Opponents with graveyard or exile effects may disrupt key plans.',
      },
      {
        id: 'blink-concern-07',
        text: 'The deck can struggle if it draws payoff without setup.',
      },
      {
        id: 'blink-concern-08',
        text: 'Certain engines require several pieces working together.',
      },
      {
        id: 'blink-concern-09',
        text: 'Resource generation may slow if key creatures are unavailable.',
      },
      {
        id: 'blink-concern-10',
        text: 'The strategy can lose momentum if repeated triggers are prevented.',
      },
    ],
    midrange: [
      {
        id: 'midrange-concern-01',
        text: 'The strategy may lack the explosive power of more specialized decks.',
      },
      {
        id: 'midrange-concern-02',
        text: 'Stronger synergy engines may outscale the deck over time.',
      },
      {
        id: 'midrange-concern-03',
        text: 'The game plan can become less focused than dedicated archetypes.',
      },
      {
        id: 'midrange-concern-04',
        text: 'The deck may struggle against highly optimized combo strategies.',
      },
      {
        id: 'midrange-concern-05',
        text: 'Flexibility can sometimes come at the cost of raw power.',
      },
      {
        id: 'midrange-concern-06',
        text: 'The strategy may need careful threat prioritization.',
      },
      {
        id: 'midrange-concern-07',
        text: 'Opponents with more extreme plans can create difficult matchups.',
      },
      {
        id: 'midrange-concern-08',
        text: 'The deck may struggle to close games quickly.',
      },
      {
        id: 'midrange-concern-09',
        text: 'Resource trades can become unfavorable if the game drags too long.',
      },
      {
        id: 'midrange-concern-10',
        text: 'The strategy relies heavily on making good decisions consistently.',
      },
    ],
    spellVelocity: [
      {
        id: 'spell-velocity-concern-01',
        text: 'The strategy may slow dramatically if card flow is interrupted.',
      },
      {
        id: 'spell-velocity-concern-02',
        text: 'Resource denial can break important chains.',
      },
      {
        id: 'spell-velocity-concern-03',
        text: 'The deck may struggle if forced into slower games.',
      },
      {
        id: 'spell-velocity-concern-04',
        text: 'Running out of spells can weaken the entire engine.',
      },
      {
        id: 'spell-velocity-concern-05',
        text: 'Some payoff cards are less effective without momentum.',
      },
      {
        id: 'spell-velocity-concern-06',
        text: 'The strategy can become vulnerable if sequencing is disrupted.',
      },
      {
        id: 'spell-velocity-concern-07',
        text: 'Heavy interaction may slow development significantly.',
      },
      {
        id: 'spell-velocity-concern-08',
        text: 'The deck may need time before velocity becomes meaningful.',
      },
      {
        id: 'spell-velocity-concern-09',
        text: 'Resource bottlenecks can interrupt key turns.',
      },
      {
        id: 'spell-velocity-concern-10',
        text: 'The strategy often depends on maintaining momentum.',
      },
    ],
    balanced: [
      {
        id: 'balanced-concern-01',
        text: 'The strategy may lack the explosive power of specialized decks.',
      },
      {
        id: 'balanced-concern-02',
        text: 'Balanced approaches sometimes sacrifice ceiling for consistency.',
      },
      {
        id: 'balanced-concern-03',
        text: 'The deck may struggle against highly focused game plans.',
      },
      {
        id: 'balanced-concern-04',
        text: 'Opponents with extreme strategies can create difficult matchups.',
      },
      {
        id: 'balanced-concern-05',
        text: 'The game plan may lack a single overwhelming strength.',
      },
      {
        id: 'balanced-concern-06',
        text: 'The deck may need longer games to fully leverage its flexibility.',
      },
      {
        id: 'balanced-concern-07',
        text: 'Some situations reward specialization more than balance.',
      },
      {
        id: 'balanced-concern-08',
        text: 'The strategy can have difficulty ending games quickly.',
      },
      {
        id: 'balanced-concern-09',
        text: 'Balanced resources do not always create decisive advantages.',
      },
      {
        id: 'balanced-concern-10',
        text: 'The deck relies on consistent execution rather than explosive turns.',
      },
    ],
    consistency: [
      {
        id: 'concern-find-pieces',
        text: 'The deck may struggle to find its key engines or payoff cards reliably.',
      },
    ],
    interaction: [
      {
        id: 'concern-low-interaction',
        text: 'The deck has limited ways to disrupt opposing game plans.',
      },
    ],
    resilience: [
      {
        id: 'concern-board-wipes',
        text: 'The deck may struggle to recover after repeated removal or board wipes.',
      },
    ],
    finishPotential: [
      {
        id: 'concern-convert-resources',
        text: 'The deck may generate resources without converting them into wins quickly enough.',
      },
    ],
  },
  tableWarnings: {
    aristocrats: [
      {
        id: 'aristocrats-table-warning-01',
        text: "Destroying creatures is often part of this deck's plan rather than a setback.",
      },
      {
        id: 'aristocrats-table-warning-02',
        text: 'Removing payoff pieces is frequently more effective than removing fodder creatures.',
      },
      {
        id: 'aristocrats-table-warning-03',
        text: 'The greatest threat is usually the engine, not the creature being sacrificed.',
      },
      {
        id: 'aristocrats-table-warning-04',
        text: 'Opponents should pay close attention to sacrifice outlets entering play.',
      },
      {
        id: 'aristocrats-table-warning-05',
        text: "Every creature that dies may advance this deck's position.",
      },
      {
        id: 'aristocrats-table-warning-06',
        text: 'The battlefield can change dramatically once multiple sacrifice effects are active.',
      },
      {
        id: 'aristocrats-table-warning-07',
        text: 'Allowing the engine to operate uninterrupted for several turns can become dangerous.',
      },
      {
        id: 'aristocrats-table-warning-08',
        text: 'Board wipes may create fewer problems for this deck than expected.',
      },
      {
        id: 'aristocrats-table-warning-09',
        text: 'The graveyard should be treated as an active resource zone.',
      },
      {
        id: 'aristocrats-table-warning-10',
        text: 'Small creatures can represent far more value than they initially appear to.',
      },
      {
        id: 'aristocrats-table-warning-11',
        text: 'The deck often wins through accumulation rather than sudden explosions.',
      },
      {
        id: 'aristocrats-table-warning-12',
        text: 'Opponents should identify payoff pieces early whenever possible.',
      },
      {
        id: 'aristocrats-table-warning-13',
        text: 'Ignoring support pieces can be more dangerous than ignoring attackers.',
      },
      {
        id: 'aristocrats-table-warning-14',
        text: 'The engine becomes increasingly difficult to dismantle once fully assembled.',
      },
      {
        id: 'aristocrats-table-warning-15',
        text: 'Resource denial is often more effective than creature removal.',
      },
      {
        id: 'aristocrats-table-warning-16',
        text: 'The deck tends to profit from long games.',
      },
      {
        id: 'aristocrats-table-warning-17',
        text: 'Repeated sacrifices can create pressure from unexpected angles.',
      },
      {
        id: 'aristocrats-table-warning-18',
        text: 'The battlefield rarely tells the full story against this strategy.',
      },
      {
        id: 'aristocrats-table-warning-19',
        text: 'Removing a single piece seldom stops the machine entirely.',
      },
      {
        id: 'aristocrats-table-warning-20',
        text: 'Every turn the engine remains active increases future pressure.',
      },
    ],
    tokenSwarm: [
      {
        id: 'token-swarm-table-warning-01',
        text: 'Opponents should not wait until the battlefield is already full.',
      },
      {
        id: 'token-swarm-table-warning-02',
        text: 'Removing the token maker is often better than removing the tokens.',
      },
      {
        id: 'token-swarm-table-warning-03',
        text: 'A small board can become lethal once payoff effects appear.',
      },
      {
        id: 'token-swarm-table-warning-04',
        text: 'The danger grows each turn the token engine remains active.',
      },
      {
        id: 'token-swarm-table-warning-05',
        text: 'Board wipes may be necessary before the deck reaches critical mass.',
      },
      {
        id: 'token-swarm-table-warning-06',
        text: 'Combat damage can arrive from more angles than opponents expect.',
      },
      {
        id: 'token-swarm-table-warning-07',
        text: 'The most dangerous card may be the one multiplying the board.',
      },
      {
        id: 'token-swarm-table-warning-08',
        text: 'Token decks punish tables that rely only on spot removal.',
      },
      {
        id: 'token-swarm-table-warning-09',
        text: 'Once the deck goes wide, every anthem or payoff becomes more threatening.',
      },
      {
        id: 'token-swarm-table-warning-10',
        text: 'Opponents should count future damage, not just current damage.',
      },
      {
        id: 'token-swarm-table-warning-11',
        text: 'The board may look manageable until one payoff turns it into a problem.',
      },
      {
        id: 'token-swarm-table-warning-12',
        text: 'Removing support pieces early can prevent a much larger battlefield later.',
      },
      {
        id: 'token-swarm-table-warning-13',
        text: 'The deck becomes harder to contain as the number of creatures increases.',
      },
      {
        id: 'token-swarm-table-warning-14',
        text: 'Waiting one extra turn can give this deck enough material to take over combat.',
      },
      {
        id: 'token-swarm-table-warning-15',
        text: 'The table should respect token production before it becomes overwhelming.',
      },
      {
        id: 'token-swarm-table-warning-16',
        text: "Every new creature increases the value of the deck's payoff cards.",
      },
      {
        id: 'token-swarm-table-warning-17',
        text: 'The deck can force opponents into unfavorable blocks quickly.',
      },
      {
        id: 'token-swarm-table-warning-18',
        text: 'A wide board makes single-target answers feel inefficient.',
      },
      {
        id: 'token-swarm-table-warning-19',
        text: 'The strategy can rebuild if opponents remove only the creatures and not the engine.',
      },
      {
        id: 'token-swarm-table-warning-20',
        text: 'The safest time to answer this deck is before the battlefield spreads.',
      },
    ],
    graveyardRecursion: [
      {
        id: 'graveyard-recursion-table-warning-01',
        text: 'Opponents should treat the graveyard as an active resource.',
      },
      {
        id: 'graveyard-recursion-table-warning-02',
        text: 'Exile effects are often more important than destruction effects.',
      },
      {
        id: 'graveyard-recursion-table-warning-03',
        text: 'Removing a creature may not be enough if the deck can bring it back.',
      },
      {
        id: 'graveyard-recursion-table-warning-04',
        text: 'The longer the graveyard grows, the more options this deck gains.',
      },
      {
        id: 'graveyard-recursion-table-warning-05',
        text: 'Graveyard hate should be used before the engine is fully established.',
      },
      {
        id: 'graveyard-recursion-table-warning-06',
        text: 'The most dangerous card may already be in the graveyard.',
      },
      {
        id: 'graveyard-recursion-table-warning-07',
        text: 'Opponents should watch for cards that turn self-mill into advantage.',
      },
      {
        id: 'graveyard-recursion-table-warning-08',
        text: 'Reanimation can create sudden swings from a quiet board state.',
      },
      {
        id: 'graveyard-recursion-table-warning-09',
        text: 'Destroying threats without exiling them may only postpone the problem.',
      },
      {
        id: 'graveyard-recursion-table-warning-10',
        text: 'The deck becomes harder to contain once recursion loops are active.',
      },
      {
        id: 'graveyard-recursion-table-warning-11',
        text: 'Graveyard access can make traditional removal feel inefficient.',
      },
      {
        id: 'graveyard-recursion-table-warning-12',
        text: 'Opponents should identify the recursion engine before focusing only on threats.',
      },
      {
        id: 'graveyard-recursion-table-warning-13',
        text: 'A small graveyard can become a toolbox very quickly.',
      },
      {
        id: 'graveyard-recursion-table-warning-14',
        text: 'The deck can rebuild from positions that look empty on the battlefield.',
      },
      {
        id: 'graveyard-recursion-table-warning-15',
        text: 'Exiling key pieces early can prevent larger problems later.',
      },
      {
        id: 'graveyard-recursion-table-warning-16',
        text: 'The table should not assume a card is gone because it was destroyed.',
      },
      {
        id: 'graveyard-recursion-table-warning-17',
        text: 'Recursion gives this deck more staying power than its battlefield may suggest.',
      },
      {
        id: 'graveyard-recursion-table-warning-18',
        text: "The graveyard can hide the deck's real threat level.",
      },
      {
        id: 'graveyard-recursion-table-warning-19',
        text: 'Opponents may need to answer both the creature and the method of return.',
      },
      {
        id: 'graveyard-recursion-table-warning-20',
        text: 'The safest answer is often the one that removes the card completely.',
      },
    ],
    control: [
      {
        id: 'control-table-warning-01',
        text: 'Opponents should not assume an empty battlefield means this deck is weak.',
      },
      {
        id: 'control-table-warning-02',
        text: 'The most important cards may be held in hand, not shown on board.',
      },
      {
        id: 'control-table-warning-03',
        text: 'Playing into open mana can be costly.',
      },
      {
        id: 'control-table-warning-04',
        text: 'The deck rewards opponents who sequence carefully and punishes those who rush.',
      },
      {
        id: 'control-table-warning-05',
        text: 'Overcommitting to the battlefield may invite a punishing answer.',
      },
      {
        id: 'control-table-warning-06',
        text: 'The table should pressure this deck before it stabilizes.',
      },
      {
        id: 'control-table-warning-07',
        text: 'Waiting too long allows the control player to build a stronger grip on the game.',
      },
      {
        id: 'control-table-warning-08',
        text: 'The safest threat may be the one that forces action without overextending.',
      },
      {
        id: 'control-table-warning-09',
        text: 'Opponents should make this deck spend answers before presenting their best threats.',
      },
      {
        id: 'control-table-warning-10',
        text: 'The longer the game continues, the more favorable it may become for this strategy.',
      },
      {
        id: 'control-table-warning-11',
        text: 'A single protected win condition can be enough once the table is exhausted.',
      },
      {
        id: 'control-table-warning-12',
        text: 'Opponents should track available mana carefully.',
      },
      {
        id: 'control-table-warning-13',
        text: 'The deck may be strongest when it appears to be doing very little.',
      },
      {
        id: 'control-table-warning-14',
        text: 'Forcing this deck to answer multiple threats at once can stretch its resources.',
      },
      {
        id: 'control-table-warning-15',
        text: 'The table should avoid letting this strategy choose every fight.',
      },
      {
        id: 'control-table-warning-16',
        text: 'Control decks become dangerous when they survive long enough to sculpt the perfect turn.',
      },
      {
        id: 'control-table-warning-17',
        text: 'Opponents should respect untapped mana and suspicious patience.',
      },
      {
        id: 'control-table-warning-18',
        text: 'The goal is to make this deck react before it is ready.',
      },
      {
        id: 'control-table-warning-19',
        text: 'Threats that generate value immediately are harder for this deck to manage cleanly.',
      },
      {
        id: 'control-table-warning-20',
        text: 'The longer this deck controls the pace, the harder it becomes to break through.',
      },
    ],
    combo: [
      {
        id: 'combo-table-warning-01',
        text: 'Opponents should not judge this deck only by its battlefield.',
      },
      {
        id: 'combo-table-warning-02',
        text: 'The quiet turns may be setup, not weakness.',
      },
      {
        id: 'combo-table-warning-03',
        text: 'Holding interaction for the correct piece is critical against this strategy.',
      },
      {
        id: 'combo-table-warning-04',
        text: 'Removing the wrong card may leave the actual win line untouched.',
      },
      {
        id: 'combo-table-warning-05',
        text: 'The deck can become lethal with very little warning.',
      },
      {
        id: 'combo-table-warning-06',
        text: 'Opponents should pay attention to enablers, not just obvious finishers.',
      },
      {
        id: 'combo-table-warning-07',
        text: 'A harmless-looking support piece may be the card that unlocks the game.',
      },
      {
        id: 'combo-table-warning-08',
        text: 'Tapping out against this deck can be risky.',
      },
      {
        id: 'combo-table-warning-09',
        text: 'The table should identify whether the deck is missing protection, payoff, or setup.',
      },
      {
        id: 'combo-table-warning-10',
        text: 'Combo decks punish opponents who wait one turn too long.',
      },
      {
        id: 'combo-table-warning-11',
        text: 'The most dangerous moment is often the turn before the deck appears threatening.',
      },
      {
        id: 'combo-table-warning-12',
        text: 'Opponents should force this deck to act before it is ready.',
      },
      {
        id: 'combo-table-warning-13',
        text: 'Disrupting card selection may be as important as disrupting the combo itself.',
      },
      {
        id: 'combo-table-warning-14',
        text: 'If this deck has cards in hand and mana available, the game may not be safe.',
      },
      {
        id: 'combo-table-warning-15',
        text: 'The battlefield can lie against combo strategies.',
      },
      {
        id: 'combo-table-warning-16',
        text: 'The table should make the combo player spend resources defensively.',
      },
      {
        id: 'combo-table-warning-17',
        text: 'Removing an enabler early may prevent a much larger problem later.',
      },
      {
        id: 'combo-table-warning-18',
        text: 'The safest answer is often the one used before the final piece appears.',
      },
      {
        id: 'combo-table-warning-19',
        text: 'Opponents should ask what the deck is representing, not only what it has shown.',
      },
      {
        id: 'combo-table-warning-20',
        text: 'Once the pieces align, the game may end before combat matters.',
      },
    ],
    ramp: [
      {
        id: 'ramp-table-warning-01',
        text: 'Opponents should not ignore early ramp pieces.',
      },
      {
        id: 'ramp-table-warning-02',
        text: 'The mana engine is often more important than the first big threat.',
      },
      {
        id: 'ramp-table-warning-03',
        text: 'Removing a large creature may not matter if the deck can cast another one next turn.',
      },
      {
        id: 'ramp-table-warning-04',
        text: 'The table should pressure this deck before it reaches its top end.',
      },
      {
        id: 'ramp-table-warning-05',
        text: 'Once the mana gap opens, catching up becomes difficult.',
      },
      {
        id: 'ramp-table-warning-06',
        text: 'The safest time to attack this strategy is before its resources multiply.',
      },
      {
        id: 'ramp-table-warning-07',
        text: 'Opponents should watch for turns where extra mana enables multiple major plays.',
      },
      {
        id: 'ramp-table-warning-08',
        text: 'A quiet ramp turn can be the setup for a devastating follow-up.',
      },
      {
        id: 'ramp-table-warning-09',
        text: 'The deck becomes harder to contain once it can cast two meaningful spells in one turn.',
      },
      {
        id: 'ramp-table-warning-10',
        text: 'Answering threats without disrupting mana may only delay the problem.',
      },
      {
        id: 'ramp-table-warning-11',
        text: 'Opponents should not let this deck reach its late game uncontested.',
      },
      {
        id: 'ramp-table-warning-12',
        text: 'The first few turns matter more than they appear.',
      },
      {
        id: 'ramp-table-warning-13',
        text: 'Mana acceleration is the warning sign.',
      },
      {
        id: 'ramp-table-warning-14',
        text: 'Large threats become much scarier when they arrive early.',
      },
      {
        id: 'ramp-table-warning-15',
        text: 'The table should make this deck spend resources before it becomes dominant.',
      },
      {
        id: 'ramp-table-warning-16',
        text: 'If the mana engine survives, the threats will keep coming.',
      },
      {
        id: 'ramp-table-warning-17',
        text: 'Opponents should respect any deck that can jump several turns ahead.',
      },
      {
        id: 'ramp-table-warning-18',
        text: 'The real danger is the resource gap.',
      },
      {
        id: 'ramp-table-warning-19',
        text: 'Once this deck begins making too much mana, normal answers may not be enough.',
      },
      {
        id: 'ramp-table-warning-20',
        text: 'The deck punishes tables that let it develop peacefully.',
      },
    ],
    voltron: [
      {
        id: 'voltron-table-warning-01',
        text: 'Opponents should answer the primary threat before protection is available.',
      },
      {
        id: 'voltron-table-warning-02',
        text: 'Letting the commander survive can become dangerous quickly.',
      },
      {
        id: 'voltron-table-warning-03',
        text: 'Commander damage adds up faster than normal life totals suggest.',
      },
      {
        id: 'voltron-table-warning-04',
        text: 'The table should track combat math carefully.',
      },
      {
        id: 'voltron-table-warning-05',
        text: 'Removing support pieces can be better than waiting for the final attack.',
      },
      {
        id: 'voltron-table-warning-06',
        text: 'Instant-speed interaction is especially important against this strategy.',
      },
      {
        id: 'voltron-table-warning-07',
        text: 'Opponents should not assume a small board means low pressure.',
      },
      {
        id: 'voltron-table-warning-08',
        text: 'A single protected creature may be enough to control combat.',
      },
      {
        id: 'voltron-table-warning-09',
        text: 'Evasion should be treated as a serious warning sign.',
      },
      {
        id: 'voltron-table-warning-10',
        text: 'The safest answer is often the one used before combat begins.',
      },
      {
        id: 'voltron-table-warning-11',
        text: 'Allowing this deck to untap with its main threat can be costly.',
      },
      {
        id: 'voltron-table-warning-12',
        text: 'The table may need to coordinate removal before protection shields are ready.',
      },
      {
        id: 'voltron-table-warning-13',
        text: 'Blocking is not always a reliable plan against this strategy.',
      },
      {
        id: 'voltron-table-warning-14',
        text: 'Combat tricks can turn safe-looking attacks into lethal ones.',
      },
      {
        id: 'voltron-table-warning-15',
        text: 'The deck becomes more dangerous each time the main threat gains another layer.',
      },
      {
        id: 'voltron-table-warning-16',
        text: 'Opponents should avoid spending removal into obvious protection if possible.',
      },
      {
        id: 'voltron-table-warning-17',
        text: 'The primary threat is not just attacking life totals. It is attacking time.',
      },
      {
        id: 'voltron-table-warning-18',
        text: 'Waiting too long can turn a manageable creature into a lethal clock.',
      },
      {
        id: 'voltron-table-warning-19',
        text: 'The table should respect every equipment, aura, and power boost.',
      },
      {
        id: 'voltron-table-warning-20',
        text: 'Once the threat is protected, removing it can become much harder than expected.',
      },
    ],
    blink: [
      {
        id: 'blink-table-warning-01',
        text: 'Opponents should not evaluate these creatures as one-time effects.',
      },
      {
        id: 'blink-table-warning-02',
        text: 'Every blink effect can represent another trigger.',
      },
      {
        id: 'blink-table-warning-03',
        text: 'Removing the creature may not solve the larger problem.',
      },
      {
        id: 'blink-table-warning-04',
        text: 'The value engine often matters more than the individual threat.',
      },
      {
        id: 'blink-table-warning-05',
        text: 'Repeated triggers can overwhelm opponents over time.',
      },
      {
        id: 'blink-table-warning-06',
        text: 'The safest answer may be the one that stops the blink engine itself.',
      },
      {
        id: 'blink-table-warning-07',
        text: 'Small creatures can generate surprising amounts of value.',
      },
      {
        id: 'blink-table-warning-08',
        text: 'The deck becomes more dangerous with every untap step.',
      },
      {
        id: 'blink-table-warning-09',
        text: 'Opponents should watch for effects that repeatedly reset creatures.',
      },
      {
        id: 'blink-table-warning-10',
        text: 'The battlefield may appear harmless until triggers begin repeating.',
      },
      {
        id: 'blink-table-warning-11',
        text: 'Blink effects can protect creatures from conventional removal.',
      },
      {
        id: 'blink-table-warning-12',
        text: 'This strategy rewards opponents who disrupt engines early.',
      },
      {
        id: 'blink-table-warning-13',
        text: 'The longer the engine survives, the harder it becomes to contain.',
      },
      {
        id: 'blink-table-warning-14',
        text: 'Removing support pieces may be more effective than removing threats.',
      },
      {
        id: 'blink-table-warning-15',
        text: 'Opponents should not underestimate recurring utility effects.',
      },
      {
        id: 'blink-table-warning-16',
        text: 'Every repeated trigger increases future pressure.',
      },
      {
        id: 'blink-table-warning-17',
        text: 'The strategy often wins through accumulation rather than explosions.',
      },
      {
        id: 'blink-table-warning-18',
        text: 'Value engines can become win conditions if ignored.',
      },
      {
        id: 'blink-table-warning-19',
        text: 'The deck becomes stronger every time its best creature triggers again.',
      },
      {
        id: 'blink-table-warning-20',
        text: 'The danger is rarely one trigger. It is the tenth.',
      },
    ],
    midrange: [
      {
        id: 'midrange-table-warning-01',
        text: 'Opponents should not expect this deck to follow a single script.',
      },
      {
        id: 'midrange-table-warning-02',
        text: 'Flexibility makes threat assessment more difficult.',
      },
      {
        id: 'midrange-table-warning-03',
        text: 'The strategy can change plans when pressured.',
      },
      {
        id: 'midrange-table-warning-04',
        text: 'Removing one threat may reveal another.',
      },
      {
        id: 'midrange-table-warning-05',
        text: 'The deck can punish opponents who prepare for only one angle.',
      },
      {
        id: 'midrange-table-warning-06',
        text: 'Resource efficiency gives the strategy staying power.',
      },
      {
        id: 'midrange-table-warning-07',
        text: 'The table should expect the deck to adapt.',
      },
      {
        id: 'midrange-table-warning-08',
        text: 'Strong card quality keeps pressure consistent.',
      },
      {
        id: 'midrange-table-warning-09',
        text: 'This strategy becomes dangerous when opponents underestimate its flexibility.',
      },
      {
        id: 'midrange-table-warning-10',
        text: 'The deck can pivot faster than many specialized strategies.',
      },
      {
        id: 'midrange-table-warning-11',
        text: 'Opponents should not assume they understand the win condition too early.',
      },
      {
        id: 'midrange-table-warning-12',
        text: 'The strategy rewards patience and good timing.',
      },
      {
        id: 'midrange-table-warning-13',
        text: 'A balanced board state often favors flexible decks.',
      },
      {
        id: 'midrange-table-warning-14',
        text: 'The deck can create opportunities from unexpected positions.',
      },
      {
        id: 'midrange-table-warning-15',
        text: 'Opponents may struggle to identify the highest-priority threat.',
      },
      {
        id: 'midrange-table-warning-16',
        text: 'The strategy often wins through cumulative advantages.',
      },
      {
        id: 'midrange-table-warning-17',
        text: 'Adaptability makes long games favorable.',
      },
      {
        id: 'midrange-table-warning-18',
        text: 'The deck can pressure weaknesses as they appear.',
      },
      {
        id: 'midrange-table-warning-19',
        text: 'No single answer is likely to solve every problem.',
      },
      {
        id: 'midrange-table-warning-20',
        text: 'The table should expect the unexpected adjustment.',
      },
    ],
    spellVelocity: [
      {
        id: 'spell-velocity-table-warning-01',
        text: 'Opponents should pay attention to how many spells are being cast, not just what they do.',
      },
      {
        id: 'spell-velocity-table-warning-02',
        text: 'The danger increases with every successful sequence.',
      },
      {
        id: 'spell-velocity-table-warning-03',
        text: 'Momentum is often the real threat.',
      },
      {
        id: 'spell-velocity-table-warning-04',
        text: 'Small spells can create large consequences.',
      },
      {
        id: 'spell-velocity-table-warning-05',
        text: 'The strategy becomes harder to stop once it starts chaining actions together.',
      },
      {
        id: 'spell-velocity-table-warning-06',
        text: 'Opponents should not underestimate resource engines.',
      },
      {
        id: 'spell-velocity-table-warning-07',
        text: 'Every extra spell may be worth more than it appears.',
      },
      {
        id: 'spell-velocity-table-warning-08',
        text: 'The deck rewards uninterrupted turns.',
      },
      {
        id: 'spell-velocity-table-warning-09',
        text: 'Breaking the chain is often more important than answering the payoff.',
      },
      {
        id: 'spell-velocity-table-warning-10',
        text: 'Activity can become pressure surprisingly quickly.',
      },
      {
        id: 'spell-velocity-table-warning-11',
        text: 'Opponents should watch for turns where resources suddenly multiply.',
      },
      {
        id: 'spell-velocity-table-warning-12',
        text: 'The strategy may appear harmless until momentum takes over.',
      },
      {
        id: 'spell-velocity-table-warning-13',
        text: 'One spell is rarely the problem. The sequence is.',
      },
      {
        id: 'spell-velocity-table-warning-14',
        text: 'The safest disruption often happens early.',
      },
      {
        id: 'spell-velocity-table-warning-15',
        text: 'The deck becomes stronger every time it keeps the chain alive.',
      },
      {
        id: 'spell-velocity-table-warning-16',
        text: 'Opponents should challenge card flow whenever possible.',
      },
      {
        id: 'spell-velocity-table-warning-17',
        text: 'Stopping velocity is often more important than stopping damage.',
      },
      {
        id: 'spell-velocity-table-warning-18',
        text: 'The strategy thrives on uninterrupted development.',
      },
      {
        id: 'spell-velocity-table-warning-19',
        text: 'The table should be wary of explosive follow-up turns.',
      },
      {
        id: 'spell-velocity-table-warning-20',
        text: 'Once momentum is established, recovery becomes harder.',
      },
    ],
    balanced: [
      {
        id: 'balanced-table-warning-01',
        text: 'Opponents should not mistake balance for weakness.',
      },
      {
        id: 'balanced-table-warning-02',
        text: 'Reliable decks often become more dangerous as games continue.',
      },
      {
        id: 'balanced-table-warning-03',
        text: 'The strategy may not dominate one area, but it rarely collapses in any area.',
      },
      {
        id: 'balanced-table-warning-04',
        text: 'Consistency can be a threat of its own.',
      },
      {
        id: 'balanced-table-warning-05',
        text: 'The deck rewards opponents who respect every part of the game plan.',
      },
      {
        id: 'balanced-table-warning-06',
        text: 'Balanced resources create hidden resilience.',
      },
      {
        id: 'balanced-table-warning-07',
        text: 'Opponents may underestimate how difficult this deck is to disrupt completely.',
      },
      {
        id: 'balanced-table-warning-08',
        text: 'The strategy adapts well to changing conditions.',
      },
      {
        id: 'balanced-table-warning-09',
        text: 'No single weakness is likely to decide the game.',
      },
      {
        id: 'balanced-table-warning-10',
        text: 'The deck can take advantage of mistakes across many areas.',
      },
      {
        id: 'balanced-table-warning-11',
        text: 'Reliable execution creates steady pressure.',
      },
      {
        id: 'balanced-table-warning-12',
        text: 'Opponents should expect the deck to remain relevant.',
      },
      {
        id: 'balanced-table-warning-13',
        text: 'The strategy can recover from setbacks better than expected.',
      },
      {
        id: 'balanced-table-warning-14',
        text: 'Stability often outlasts volatility.',
      },
      {
        id: 'balanced-table-warning-15',
        text: 'The deck becomes stronger when opponents focus on only one aspect of it.',
      },
      {
        id: 'balanced-table-warning-16',
        text: 'Consistency can quietly create inevitability.',
      },
      {
        id: 'balanced-table-warning-17',
        text: 'The table should not wait for an obvious warning sign.',
      },
      {
        id: 'balanced-table-warning-18',
        text: 'Balanced decks often win by avoiding mistakes.',
      },
      {
        id: 'balanced-table-warning-19',
        text: 'The strategy remains dangerous even without explosive turns.',
      },
      {
        id: 'balanced-table-warning-20',
        text: 'Dependability can be difficult to contain.',
      },
    ],
    universal: [
      {
        id: 'universal-table-warning-01',
        text: 'The greatest threat is not always the card currently on the battlefield.',
      },
      {
        id: 'universal-table-warning-02',
        text: 'This strategy becomes significantly more dangerous if left unanswered for multiple turns.',
      },
      {
        id: 'universal-table-warning-03',
        text: 'Early intervention is often easier than late recovery.',
      },
      {
        id: 'universal-table-warning-04',
        text: 'Opponents should focus on engines before they focus on payoffs.',
      },
      {
        id: 'universal-table-warning-05',
        text: 'Resource advantages tend to compound quickly once established.',
      },
      {
        id: 'universal-table-warning-06',
        text: 'Small advantages rarely stay small for long.',
      },
      {
        id: 'universal-table-warning-07',
        text: 'The deck rewards opponents who act early and punishes those who wait.',
      },
      {
        id: 'universal-table-warning-08',
        text: 'The battlefield may appear stable right before the deck reaches critical mass.',
      },
      {
        id: 'universal-table-warning-09',
        text: "Many of the deck's strongest turns begin one turn before opponents expect them.",
      },
      {
        id: 'universal-table-warning-10',
        text: 'Removing the symptom is often less effective than removing the cause.',
      },
      {
        id: 'universal-table-warning-11',
        text: 'The deck is capable of recovering from setbacks better than it first appears.',
      },
      {
        id: 'universal-table-warning-12',
        text: 'Multiple overlapping engines make threat assessment difficult.',
      },
      {
        id: 'universal-table-warning-13',
        text: 'The most important card is not always the most obvious one.',
      },
      {
        id: 'universal-table-warning-14',
        text: 'The strategy improves dramatically when given uninterrupted turns.',
      },
      {
        id: 'universal-table-warning-15',
        text: "Momentum is one of this deck's most dangerous resources.",
      },
      {
        id: 'universal-table-warning-16',
        text: 'Several harmless-looking pieces can become dangerous together.',
      },
      {
        id: 'universal-table-warning-17',
        text: 'Opponents may underestimate how quickly pressure can accumulate.',
      },
      {
        id: 'universal-table-warning-18',
        text: "The deck's position is often stronger than its battlefield suggests.",
      },
      {
        id: 'universal-table-warning-19',
        text: 'Once established, the strategy becomes progressively harder to contain.',
      },
      {
        id: 'universal-table-warning-20',
        text: 'Resource generation is often more dangerous than direct damage.',
      },
      {
        id: 'universal-table-warning-21',
        text: 'This deck prefers long games and is built to benefit from them.',
      },
      {
        id: 'universal-table-warning-22',
        text: 'Every extra turn of setup increases future pressure.',
      },
      {
        id: 'universal-table-warning-23',
        text: 'Opponents should watch for engines, not just finishers.',
      },
      {
        id: 'universal-table-warning-24',
        text: 'The strategy rewards efficient sequencing and patience.',
      },
      {
        id: 'universal-table-warning-25',
        text: 'Allowing the deck to dictate the pace of the game can be costly.',
      },
      {
        id: 'universal-table-warning-26',
        text: 'Several small interactions can combine into significant advantages.',
      },
      {
        id: 'universal-table-warning-27',
        text: 'The deck often wins through positioning rather than spectacle.',
      },
      {
        id: 'universal-table-warning-28',
        text: 'Disrupting support pieces may be more effective than removing threats.',
      },
      {
        id: 'universal-table-warning-29',
        text: 'The strongest play is not always the most visible play.',
      },
      {
        id: 'universal-table-warning-30',
        text: 'The danger here is not speed. It is inevitability.',
      },
    ],
    comboPressure: [
      {
        id: 'warning-infinite-combo',
        text: 'Infinite combo potential may require a clear pregame conversation.',
      },
    ],
    tablePressure: [
      {
        id: 'warning-fast-window',
        text: 'The deck can threaten wins early enough that slower pods may feel pressured.',
      },
    ],
  },
  deckIdentities: {
    aristocrats: [
      {
        id: 'identity-aristocrats',
        text: 'A sacrifice-driven engine that turns creatures leaving the battlefield into value and pressure.',
      },
    ],
    tokenSwarm: [
      {
        id: 'identity-token-swarm',
        text: 'A wide-board strategy that uses creature volume as its main source of pressure.',
      },
    ],
    graveyardRecursion: [
      {
        id: 'identity-graveyard',
        text: 'A recursion plan that reuses resources and keeps threats coming back.',
      },
    ],
    blink: [
      {
        id: 'identity-blink',
        text: 'A value plan that reuses enter-the-battlefield effects for repeated advantage.',
      },
    ],
    control: [
      {
        id: 'identity-control',
        text: 'A defensive strategy that uses interaction to slow opponents while setting up its own plan.',
      },
    ],
    combo: [
      {
        id: 'identity-combo',
        text: 'An engine deck that concentrates resources toward specific finishing lines.',
      },
    ],
    ramp: [
      {
        id: 'identity-ramp',
        text: 'An acceleration plan that tries to reach larger threats ahead of schedule.',
      },
    ],
    midrange: [
      {
        id: 'identity-midrange',
        text: 'A flexible value strategy built to trade resources and keep developing.',
      },
    ],
    balanced: [
      {
        id: 'identity-balanced',
        text: 'A balanced Commander deck with a mixed strategic profile.',
      },
    ],
  },
};
