export type StrategyVoicePool =
  | 'identityOpenings'
  | 'pilotWarnings'
  | 'tableWisdom'
  | 'finishingAdvice';

export type StrategyArchetypeVoiceKey =
  | 'tokens'
  | 'sacrifice'
  | 'blink'
  | 'spellslinger'
  | 'control'
  | 'graveyard'
  | 'tribal'
  | 'voltron'
  | 'combo'
  | 'midrange';

export type StrategyArchetypeVoice = {
  observations: string[];
  warnings: string[];
  finishingAdvice: string[];
};

export type StrategyVoiceComposition = {
  identityOpening?: string;
  archetypeObservation?: string;
  tableWisdom?: string;
  pilotWarning?: string;
  finishingAdvice?: string;
};

export const strategyVoiceLibrary = {
  identityOpenings: [
    'You are piloting a deck that rewards patience before pressure.',
    'Your first edge is knowing when the table is looking at the wrong threat.',
    'You do not need to look scary early for this deck to become dangerous later.',
    'Your best games will come from making opponents answer the pieces that matter least.',
    'You are playing for the turn where one quiet setup card becomes a real problem.',
    'Your deck asks you to manage attention as carefully as mana.',
    'You will win more games by choosing the right turn than by choosing the loudest play.',
    'Your opening turns should make the table underestimate what the next turn can become.',
    'You are not just counting damage. You are counting windows.',
    'Your strongest line is usually the one that leaves opponents with the fewest clean answers.',
    'You should treat every early play as a question: does this make the next threat harder to answer?',
    'Your deck gets better when you stop trying to prove strength too early.',
    'You are looking for the moment when the table has spent its answers in the wrong place.',
    'Your plan works best when opponents have to guess which card matters most.',
    'You should let the board develop just enough that your payoff lands with weight.',
    'You are piloting a deck that can turn small decisions into large pressure.',
    'Your best turns will often start one turn before opponents realize they are in danger.',
    'You want the table to react late, not early.',
    'You should think less about showing power and more about preserving leverage.',
    'Your deck rewards players who can pass with restraint and commit with purpose.',
    'You are trying to build a position that makes every answer feel inefficient.',
    'Your strongest resource may be the uncertainty opponents feel about your next turn.',
    'You should make the table solve the wrong problem before you present the real one.',
    'Your deck is at its best when each play asks opponents a harder question.',
  ],

  pilotWarnings: [
    'Do not spend your best payoff just to make a fair turn look better.',
    'Do not give the table a clean answer window unless the payoff is worth it.',
    'If you are ahead, avoid turning one removal spell into a full reset.',
    'If your hand is thin, stop playing like you can rebuild for free.',
    'Do not trade your engine for damage that does not change the game.',
    'If opponents are holding open mana, ask what they are inviting you to walk into.',
    'Do not protect a replaceable creature while your real engine sits exposed.',
    'If one opponent is clearly afraid of your next turn, make them spend the answer first.',
    'Do not confuse a busy turn with a winning turn.',
    'If your commander is central, casting it into obvious removal is usually a gift to the table.',
    'Do not make the table respect you before you are ready to punish that attention.',
    'If a wipe is likely, decide whether your board can profit before you add more to it.',
    'Do not use interaction just because you can. Use it when it protects your clock or breaks theirs.',
    'If a card only improves a position you already control, consider holding it.',
    'Do not chase every synergy piece if the table is giving you a simpler win.',
    'If your best line needs two turns, keep enough resources to survive the first one.',
    'Do not let one opponent dictate your whole turn unless they are the only player who can stop you.',
    'If a threat does not change your clock, it may not deserve your answer.',
    'Do not tap out for comfort when patience would force opponents to move first.',
    'If you can win next turn, stop making plays that only look impressive.',
    'Do not expose your backup plan before the first plan has drawn real interaction.',
    'If the table is fighting itself, avoid becoming the obvious common enemy too early.',
    'Do not mistake card quantity for safety. The wrong cards still leave you vulnerable.',
    'If you are about to become the threat, make sure the turn actually pays you for it.',
  ],

  tableWisdom: [
    'The table usually answers what looks dangerous, not what actually matters.',
    'Players spend removal more freely when they think they are preventing momentum.',
    'The safest threat is often the one that looks like setup until it is too late.',
    'A quiet board can still represent a loud next turn.',
    'The best time to commit is often after another player has forced the table to spend answers.',
    'Opponents are easier to pressure when they disagree about what must be removed.',
    'The player with open mana is often more important than the player with the largest board.',
    'A board wipe changes less when your important cards are not all on the battlefield.',
    'If everyone is waiting, the first player to blink usually gives you information.',
    'A small engine left alone for two turns can be more dangerous than one large creature.',
    'The table will often let support pieces live longer than finishers.',
    'Threat assessment gets harder when your pressure comes from several small sources.',
    'Most opponents notice damage before they notice inevitability.',
    'The best political position is being useful without being comfortable to ignore.',
    'If two opponents can stop you, make one of them spend resources on the other first.',
    'A turn cycle is a resource. Do not waste one without learning what answers are available.',
    'The table gives away fear through hesitation, open mana, and sudden interest in your board.',
    'If your position looks harmless, ask whether you can keep it that way for one more turn.',
    'The card that wins later is often safer than the card that impresses now.',
    'When opponents are counting combat, triggered pressure can slip past their math.',
    'The best decks make ordinary removal feel badly timed.',
    'A player who has already spent their answer is easier to pressure than a player pretending they have one.',
    'If everyone is saving removal for the same threat, your secondary line may be the real path.',
    'The table rarely catches up cleanly once pressure and resources start moving together.',
  ],

  finishingAdvice: [
    'Count lethal before you make a value play.',
    'When the table is low on answers, stop improving your position and start ending the game.',
    'If your payoff survives a full turn cycle, assume you have permission to press harder.',
    'Do not pass a winning turn because a smaller play feels safer.',
    'When you can force two opponents to answer the same turn, make them have it.',
    'If combat is messy, look for the line that wins without asking blockers for permission.',
    'When your engine is active, every extra turn you give the table is a risk.',
    'If you can turn a board wipe into damage or resources, make opponents regret clearing the board.',
    'The winning turn often starts by removing the one card that lets an opponent survive.',
    'If you are one piece away, protect the search, draw, or setup that finds it.',
    'Do not split pressure evenly when one opponent can stop your win.',
    'If the table has spent its answers, move from patience to punishment.',
    'When your clock is real, force opponents to answer now instead of later.',
    'If a line wins through interaction, take that line over the flashier one.',
    'Do not let fear of a perfect answer stop you from taking a strong finish.',
    'When you have the table cornered, make them prove they can escape.',
    'If the game has gone long, assume opponents are closer to answers and shorten the clock.',
    'A clean finish is better than another turn of looking dominant.',
    'If your strongest play makes you the target, make sure it also makes you hard to stop.',
    'When a payoff turns every small piece into pressure, stop waiting for a bigger board.',
    'If your hand contains protection and a finisher, your job is timing, not hesitation.',
    'Do not leave lethal hidden in plain sight just because the board looks complicated.',
    'When the last answer is gone, the next turn should belong to you.',
    'If your deck can win from a narrow opening, do not widen it for opponents first.',
  ],

  archetypes: {
    tokens: {
      observations: [
        'Token decks rarely look dangerous one creature at a time. The danger comes when every small body starts counting twice.',
        'Your tokens are not just attackers. They are pressure, blockers, sacrifice fuel, and proof that the table is running out of time.',
        'The table may ignore your first few creatures. Let them. The mistake is theirs if those bodies turn into a real army.',
        'This deck gets stronger when opponents use single-target answers on problems that are already multiplying.',
        'Your best turns usually happen after you have already made the battlefield awkward for everyone else.',
        'A token board asks opponents a simple question: can they answer everything at once?',
        'Do not measure this deck by the size of one creature. Measure it by how many things your next payoff will count.',
        'The first wave of tokens sets the table. The second wave usually starts changing the game.',
        'You are building pressure that does not need to be elegant. It only needs to become too wide to manage.',
        'Small creatures become serious threats when the table cannot tell which payoff matters most.',
        'The deck becomes dangerous when blocking, attacking, and sacrificing all start using the same resources.',
        'Tokens give you permission to trade freely. If your deck rebuilds faster than theirs, the exchange favors you.',
      ],
      warnings: [
        'The trap is attacking just because you have creatures. Ask whether those bodies are more valuable as pressure, protection, or fuel.',
        'Do not turn every token sideways if one crackback can undo three turns of work.',
        'Many token pilots lose by committing the payoff before the army is ready.',
        'Be careful not to look like the archenemy before you can survive being treated like one.',
        'A wide board attracts sweepers. Keep one rebuild card or follow-up play hidden if you can.',
        'Do not spend your best anthem effect just to make a harmless attack look impressive.',
        'The table will forgive three tokens. It will not forgive fifteen. Know when that line is about to be crossed.',
        'If opponents are holding up mana, do not assume your big token turn is safe.',
        'Avoid trading away your board for chip damage when your next card rewards having creatures.',
        'The mistake is thinking tokens are free. They are your deck\'s currency, so spend them with purpose.',
        'Do not let one evasive opponent race you while you admire your own battlefield.',
        'If your commander makes tokens, protect the turn after it arrives, not just the turn you cast it.',
      ],
      finishingAdvice: [
        'Before making more tokens, count whether the ones you already have can end the game.',
        'If the table has no sweeper, stop pretending this is a value turn.',
        'Your closing turn should make blocking miserable and removal insufficient.',
        'When one anthem or payoff turns bodies into lethal pressure, that is the moment to stop waiting.',
        'A token deck often wins by forcing opponents to answer math they can no longer solve.',
        'If opponents are tapped low, make the board ask a question they cannot answer before their next turn.',
        'Do not overbuild a winning board. Commander games are full of players who gave the table one more draw step.',
        'If a wipe is coming, see whether you can turn your creatures into damage, cards, or sacrifice value first.',
        'The best finish is often not the biggest attack. It is the attack that leaves no good blocks.',
        'When your army is wide enough, every payoff becomes a threat and every opponent becomes nervous.',
        'Force the table to respect the board before they find the card that resets it.',
        'Once your tokens represent lethal, make opponents prove they have the answer.',
      ],
    },
    sacrifice: {
      observations: [
        'This deck is comfortable losing creatures because death is part of the plan.',
        'Opponents may think they are removing your resources. Often, they are helping you spend them.',
        'Your battlefield is less fragile than it looks. A creature that dies for value has already done its job.',
        'Sacrifice decks win by turning small losses into decisions the table cannot keep answering.',
        'You are not trying to keep every creature alive. You are trying to make every death matter.',
        'The deck gets dangerous when sacrifice outlets, fodder, and payoffs are all present at the same time.',
        'Your creatures are resources with expiration dates. The trick is choosing when they expire.',
        'The table often misreads this kind of board because the strongest card is not always the largest permanent.',
        'A sacrifice outlet changes combat, removal, and board wipes. Once you have one, opponents have to play differently.',
        'This deck can make ordinary creatures feel like loaded dice.',
        'The graveyard is not always an ending here. Sometimes it is just the next room.',
        'Your strongest turns usually come from making opponents pay for actions they thought were safe.',
      ],
      warnings: [
        'The trap is sacrificing pieces just because you can. Wait until the death changes something.',
        'Do not spend your outlet before your payoff is ready unless survival demands it.',
        'Many sacrifice decks lose when they run out of fodder and keep pretending the engine is still online.',
        'Be careful not to trade your best engine for a small burst of value.',
        'If your hand is thin, stop feeding the machine unless it is moving you toward a real finish.',
        'Do not let opponents remove your sacrifice outlet for free if you can use it in response.',
        'The mistake is protecting the wrong piece. Usually the outlet or payoff matters more than the creature being sacrificed.',
        'Do not assume a board wipe is bad. Ask what your creatures do on the way out.',
        'Avoid looking harmless when your death triggers are already close to lethal.',
        'If the table lets your payoff survive, make them regret that before they untap.',
        'Do not sacrifice your blockers too early if one opponent can punish the open door.',
        'The engine needs all three parts: fodder, outlet, and reward. Know which one you are missing.',
      ],
      finishingAdvice: [
        'When your death triggers start adding up, stop measuring the game only by combat damage.',
        'If a sacrifice loop is close, play quietly until the table is forced to notice too late.',
        'A board wipe can become your closing argument if every creature leaves something behind.',
        'Once the engine is assembled, make opponents answer the piece that actually stops the bleeding.',
        'Do not wait for a perfect loop if ordinary sacrifices already put the table under lethal pressure.',
        'Your finish may look small at first. Then the triggers stack, and the room changes temperature.',
        'If opponents are low on removal, protect the payoff and start converting creatures into inevitability.',
        'The cleanest win is often one turn of sacrifices that opponents thought they could survive.',
        'Count your death triggers before combat. You may not need to attack at all.',
        'When the table is out of answers, every creature becomes a match near dry grass.',
        'If your outlet is safe and your payoff is active, force the table to respond now, not later.',
        'The strongest sacrifice turns leave opponents unsure whether killing your creatures helps or hurts them.',
      ],
    },
    blink: {
      observations: [
        'Blink decks do not need every creature to be powerful. They need the right creatures to matter more than once.',
        'The strength here comes from repetition. One good enter-the-battlefield trigger becomes a problem when the table has to watch it happen again.',
        'Your battlefield may look modest, but every blink effect threatens to turn a fair creature into another card, another answer, or another headache.',
        'This deck rewards patience because the best cards are often better the second or third time they happen.',
        'Opponents may spend removal on the creature, but the real pressure is the engine that keeps reusing it.',
        'A blink deck asks a quiet question: how many times can one permanent be allowed to matter?',
        'You are not always building a huge board. Sometimes you are building a loop of small advantages that becomes impossible to keep up with.',
        'The table often underestimates blink because the danger arrives in pieces instead of all at once.',
        'Your best turns usually come from turning a defensive trick into a value engine.',
        'Every creature with a useful trigger becomes more suspicious once blink mana is available.',
        'Blink gives you a strange kind of resilience. Removal has to answer not just what is on the field, but what might return better than before.',
        'The deck becomes dangerous when your opponents can no longer tell which creature they are supposed to remove.',
      ],
      warnings: [
        'The trap is blinking the first useful creature you see instead of saving the effect for the creature that changes the turn.',
        'Do not spend blink protection casually. Sometimes one saved commander or engine piece is worth more than three cute triggers.',
        'Many blink pilots lose tempo by doing clever things that do not actually move the game forward.',
        'Be careful not to build a hand full of blink effects with nothing worth blinking.',
        'The table may ignore you until the value becomes obvious. Do not help them notice too early.',
        'If your best creature is already drawing removal, hold up protection before asking it to carry the whole game.',
        'Do not confuse repeated value with inevitability. At some point, the deck still has to close.',
        'The mistake is spending your whole turn reusing a creature when the table is about to punish you for not advancing.',
        'If opponents are holding instant-speed removal, ask whether your blink effect is bait, protection, or the actual plan.',
        'Avoid blinking just for style. The clean play is usually better than the flashy one.',
        'Do not let the table untap forever while you enjoy small advantages.',
        'If one creature is doing everything, expect the table to eventually notice. Have a second plan ready.',
      ],
      finishingAdvice: [
        'When your value engine is online, start asking which repeated trigger actually ends the game.',
        'A blink deck often closes by making the same problem appear too many times to answer.',
        'If opponents are low on removal, protect the creature that turns every blink into pressure.',
        'Do not keep looping value if the same mana could set up a winning turn.',
        'The best finish is often not sudden. It is the turn where the table realizes they are too far behind to matter.',
        'If your blink pieces can protect each other, force opponents to answer the engine before they get another full turn.',
        'Once every blink creates cards, damage, tokens, or removal, the table is no longer playing a normal game.',
        'Count your repeated triggers before passing. Sometimes the win is already hiding inside the next loop.',
        'When opponents are out of answers, stop using blink as insurance and start using it as a weapon.',
        'If one permanent has carried the game this far, make the final turn about making it matter one more time.',
        'A good blink finish leaves opponents feeling like they answered the same card three times and still lost to it.',
        'Once the engine survives a turn cycle, make the table prove they can still keep up.',
      ],
    },
    spellslinger: {
      observations: [
        'Spellslinger decks do not always announce danger on the battlefield. The real threat often lives in the cards waiting to be cast.',
        'Your board may look quiet, but every untapped land can make opponents wonder what is about to happen.',
        'This deck rewards timing more than volume. The right spell at the right moment is worth more than a pile of harmless casts.',
        'The stack is where this deck does its best work.',
        'Opponents often misjudge spellslinger decks because they count creatures instead of counting possibilities.',
        'Your strongest turns usually begin before anyone realizes they are in danger.',
        'Every cheap spell becomes more important when it also triggers damage, cards, tokens, or storm-like pressure.',
        'This deck can play patiently until one turn suddenly turns into three turns\' worth of action.',
        'You are not trying to look threatening every turn. You are trying to make one turn matter too much to stop.',
        'A spellslinger deck can win from a quiet board because the battlefield is not where all of its power sits.',
        'The danger comes when setup pieces turn ordinary spells into extra cards, extra damage, or extra bodies.',
        'The table has to respect your open mana even when nothing obvious is happening.',
      ],
      warnings: [
        'The trap is casting spells just because you can. Save the important ones for the turn they actually change.',
        'Do not empty your hand to look busy if your deck needs a critical mass later.',
        'Many spellslinger pilots lose by spending protection before the payoff arrives.',
        'Be careful not to fire removal at the first target when a better threat is clearly coming.',
        'If your payoff is fragile, do not cast it into open mana unless you are ready to protect it.',
        'The mistake is treating every cantrip as free. Cards are cheap, but timing is not.',
        'Do not advertise the big turn before you can survive the table\'s response.',
        'If opponents are representing interaction, ask whether you are forcing the issue or walking into it.',
        'Avoid using your best spell to solve a small problem unless that small problem will stop you from winning.',
        'Do not let a quiet battlefield make you careless. Other players may be holding answers too.',
        'The deck can stall if you spend too many spells without a payoff watching.',
        'If your hand is full of action, decide which turn you are building toward before you start casting.',
      ],
      finishingAdvice: [
        'Before the big turn, count mana, cards, and triggers. Spellslinger wins reward arithmetic.',
        'If the payoff survives, stop playing politely and make every spell count.',
        'The closing turn should feel planned, not improvised.',
        'When opponents are tapped low, that may be the window your deck has been waiting for.',
        'Do not pass with a winning chain in hand unless you believe the table can stop it.',
        'Once your spells are producing more than one kind of advantage, the game can end faster than combat suggests.',
        'If one spell starts the chain, know what the second and third spells are before you cast it.',
        'A good spellslinger finish leaves opponents answering the wrong spell until it is too late.',
        'When the table is low on interaction, turn patience into pressure.',
        'If your engine is active, every cheap spell becomes a possible closing piece.',
        'The best finish often begins with something harmless and ends with opponents rereading your board.',
        'When your hand, mana, and payoff line up, do not give the table another draw step for free.',
      ],
    },
    control: {
      observations: [
        'Control decks are not trying to do everything. They are trying to decide which things are allowed to happen.',
        'Your greatest resource is often information, not mana.',
        'This deck wins by making better decisions for longer than everyone else.',
        'The battlefield may look quiet, but a control player is often managing threats that have not even appeared yet.',
        'Control rewards patience because every answer becomes stronger when used on the correct problem.',
        'You do not need to stop everything. You only need to stop what matters.',
        'The deck becomes dangerous when opponents can no longer tell which threats will actually resolve.',
        'Control is not about saying no. It is about choosing the right moment to say it.',
        'Many opponents will defeat themselves if given enough opportunities to make mistakes.',
        'This deck gains strength whenever other players spend resources fighting each other.',
        'The strongest control turns often look uneventful from across the table.',
        'A well-managed game can be worth more than a powerful board state.',
      ],
      warnings: [
        'The trap is spending premium answers on problems that are merely annoying.',
        'Do not try to answer everything. No control deck has that many resources.',
        'Many control pilots lose because they fear taking a small amount of damage.',
        'Be careful not to trade an important answer for a temporary inconvenience.',
        'If two opponents are fighting each other, let them continue whenever possible.',
        'The mistake is using removal before you know what the real threat is.',
        'Do not become so reactive that you forget to advance your own victory plan.',
        'Every answer spent now is an answer unavailable later. Spend them intentionally.',
        'The table will often reveal which threat matters most if you wait long enough.',
        'Avoid countering something simply because you can.',
        'If opponents are exhausting resources, allow the game to work for you.',
        'Control wins with discipline. Do not abandon it because the board becomes noisy.',
      ],
      finishingAdvice: [
        'Once the table is low on resources, it is time to stop managing the game and start ending it.',
        'A control deck finishes strongest when opponents no longer have enough tools to fight back.',
        'If you have spent the game answering threats, make sure your own threat arrives at the right moment.',
        'Do not give exhausted opponents extra draw steps unless there is a compelling reason.',
        'The best control victories often feel inevitable several turns before they happen.',
        'When the table runs out of pressure, become the pressure.',
        'A game under control is only valuable if it eventually ends.',
        'If opponents are top-decking, force them to solve a problem immediately.',
        'The strongest finish is often a simple threat protected by superior resources.',
        'Once the shields are down, stop holding back.',
        'Control players lose games by staying defensive after the window to win has already opened.',
        'When opponents are reduced to hoping for help from the top of their decks, press the advantage.',
      ],
    },
    graveyard: {
      observations: [
        'Most decks treat the graveyard like a loss. This deck treats it like a second hand.',
        'Opponents often celebrate the first time your creatures die. They are usually less enthusiastic the second time they return.',
        'The graveyard is not where your resources disappear. It is where they wait.',
        'This deck becomes dangerous when opponents stop counting what is in play and start worrying about what is buried.',
        'Many of your strongest cards are at their best after they have already been used once.',
        'The table may think it has answered a threat. Graveyard decks specialize in reopening old conversations.',
        'Your resources are spread across multiple zones, which makes you harder to exhaust than you first appear.',
        'The deck rewards patience because not every card needs to stay on the battlefield to remain relevant.',
        'A stocked graveyard often represents more power than an empty hand.',
        'The strongest turns usually happen when opponents forget to respect what is already in the yard.',
        'This deck rarely runs out of things to do. It simply changes where it looks for them.',
        'The graveyard is less a destination and more a staging area for future problems.',
      ],
      warnings: [
        'The trap is filling the graveyard without a clear plan for using it.',
        'Do not assume every card belongs in the yard immediately. Some resources are worth protecting.',
        'Many graveyard pilots spend too much effort setting up and not enough effort cashing in.',
        'Be careful not to overcommit into obvious graveyard hate.',
        'If an opponent is representing graveyard interaction, plan for it before you need the yard.',
        'The mistake is assuming recursion alone wins games. Eventually, something must end the game.',
        'Do not spend your best reanimation target just because it is available.',
        'A full graveyard is impressive. A useful graveyard is better.',
        'Do not ignore your battlefield while admiring your recursion options.',
        'The deck performs best when the graveyard supports the plan instead of becoming the entire plan.',
        'If opponents are saving exile effects, make them use those answers before the card that truly matters appears.',
        'Avoid rebuilding the same board repeatedly if a different line can win the game.',
      ],
      finishingAdvice: [
        'When the graveyard is stocked, start asking which card actually ends the game if it returns.',
        'The best graveyard finish often feels like opponents are losing to cards they already answered.',
        'If recursion is online, force the table to answer the same category of threat repeatedly.',
        'Do not keep rebuilding for value when rebuilding for lethal is available.',
        'Once opponents are running low on exile effects, your best threats become much harder to contain.',
        'A graveyard deck wins when opponents run out of meaningful answers before you run out of meaningful threats.',
        'The strongest closing turns usually involve returning exactly the card the table hoped never to see again.',
        'If multiple threats can return, make opponents guess wrong.',
        'Your graveyard represents future pressure. Make sure that pressure arrives before the table finds relief.',
        'The cleanest finish is often one where the battlefield changes faster than opponents can adjust.',
        'If the recursion engine survives, make every answer feel temporary.',
        'When the table starts worrying about what might come back, you are usually close to taking control.',
      ],
    },
    tribal: {
      observations: [
        'Tribal decks are strongest when ordinary creatures stop being ordinary because they share the same banner.',
        'The table may count your creatures one at a time. Your deck counts them as a team.',
        'Your best cards usually make every future creature more dangerous than it looks.',
        'This deck gains power from belonging. Each creature matters more because of what it stands beside.',
        'Opponents often underestimate tribal decks until one lord, anthem, or payoff changes the entire battlefield.',
        'The first creature may look harmless. The fifth usually tells a very different story.',
        'Tribal decks win when small synergies begin stacking faster than opponents can answer them.',
        'Your deck is not just playing creatures. It is assembling a shared identity into pressure.',
        'The danger comes when every draw step can add another body and another layer of synergy.',
        'A good tribal board makes combat math uncomfortable before it makes combat lethal.',
        'This deck rewards sequencing because the order of your creatures can change how threatening the board becomes.',
        'The table usually notices tribal pressure one turn after it should have started worrying.',
      ],
      warnings: [
        'The trap is playing every creature just because it shares the type. Ask whether it improves the board now or later.',
        'Do not commit your best tribal payoff before opponents have spent removal elsewhere.',
        'Many tribal pilots lose by overextending into the sweeper everyone can see coming.',
        'Be careful not to mistake a full board for a winning board.',
        'If your payoff creature matters more than the army, protect the payoff first.',
        'Do not attack just because the team looks impressive. Bad combat can undo good synergy.',
        'The mistake is assuming the tribe alone is enough. You still need cards, mana, and a way to finish.',
        'Avoid keeping hands that have creature type synergy but no real development.',
        'If opponents are holding up removal, decide whether your lord is bait or the card you must defend.',
        'Do not let one evasive opponent race you while you build a beautiful battlefield.',
        'A tribal deck can look scarier than it really is. Be aware when you are attracting more attention than your board can survive.',
        'The table will often attack the shared payoff, not the random creature. Plan around that.',
      ],
      finishingAdvice: [
        'When the tribe is wide enough, count damage before adding another creature.',
        'If one payoff turns the whole team lethal, that is the card the turn should revolve around.',
        'Do not give the table another draw step if your board already forces bad blocks.',
        'The cleanest tribal finish often comes from making every creature matter at the same time.',
        'Once the team is assembled, make opponents answer the whole army, not one threat.',
        'If opponents are low on sweepers, press before they find one.',
        'A tribal deck finishes well when synergy becomes math the table can no longer solve.',
        'When your creatures are improving each other, every new body becomes a closing piece.',
        'Do not overbuild a tribe that is already ready to win.',
        'If combat is messy for opponents, make it happen before they untap into answers.',
        'The winning turn is often the one where the tribe stops looking charming and starts looking unavoidable.',
        'Once your shared payoffs are online, force opponents to prove they can survive the entire table of creatures.',
      ],
    },
    voltron: {
      observations: [
        'Voltron decks ask the table one direct question: can they answer your commander before it answers them?',
        'Your commander is not just a threat. It is the plan, the clock, and often the warning sign.',
        'This deck wins by making one creature matter more than everything else on the battlefield.',
        'Opponents may ignore small setup pieces, but they rarely ignore a commander that can remove players.',
        'Voltron rewards timing because the difference between a lethal commander and a dead one is often one open mana.',
        'Your battlefield may look narrow, but a single protected threat can make the whole table play differently.',
        'This deck does not need to beat everyone at once. It needs to choose the right opponent at the right time.',
        'The strongest Voltron turns happen when protection, pressure, and target choice line up.',
        'Every equipment, aura, or counter changes the table\'s math around your commander.',
        'A Voltron deck can make opponents hold removal longer than they want because every answer has to matter.',
        'Your commander creates pressure even before it attacks if opponents know what happens when it survives.',
        'This deck is at its best when one creature forces three opponents to make uncomfortable decisions.',
      ],
      warnings: [
        'The trap is casting your commander into open removal just because you have the mana.',
        'Do not load every resource onto one creature unless you can protect the investment.',
        'Many Voltron pilots lose by choosing the wrong first target.',
        'Be careful not to make yourself the archenemy before you are ready to survive the table.',
        'If your protection is missing, ask whether this is truly the turn to commit.',
        'Do not ignore blockers, crackback damage, or sacrifice effects just because your commander looks huge.',
        'The mistake is assuming damage alone wins if the table still has clean answers.',
        'Avoid spending protection on a small inconvenience when it may need to save the commander later.',
        'If one opponent clearly has interaction, do not pretend they are not part of the combat math.',
        'Do not over-equip into a board wipe if rebuilding will leave you empty-handed.',
        'A commander can be both powerful and fragile. Respect both truths.',
        'The table will remember who you attack first. Choose that message carefully.',
      ],
      finishingAdvice: [
        'Before attacking, count commander damage and ask who actually needs to be removed first.',
        'If your commander is protected and lethal is close, stop waiting for a prettier line.',
        'The best Voltron finish often comes from forcing one opponent out before the table can fully organize.',
        'When shields are up, make the attack that changes the game.',
        'Do not split pressure politely if one clean hit can remove the player with answers.',
        'If opponents are tapped low, that is the turn your commander should become a problem they cannot postpone.',
        'A lethal commander should not spend too many turns asking permission.',
        'Once your protection and damage line up, make opponents prove they have the exact answer.',
        'If the table is afraid of your commander, use that fear before they draw out of it.',
        'The closing attack should be decisive, protected, and aimed at the player most likely to stop you.',
        'Voltron wins by recognizing when one creature is enough.',
        'When your commander can end someone, stop playing like the game is still in setup.',
      ],
    },
    combo: {
      observations: [
        'Combo decks spend much of the game looking harmless right up until they stop being harmless at all.',
        'The battlefield is often a distraction. The real story is how close your pieces are to finding each other.',
        'Your deck does not need to dominate every turn. It only needs one turn to matter enough.',
        'Opponents often worry about visible threats. Combo decks win by caring about invisible ones.',
        'The strongest combo players are patient enough to wait for the right window and disciplined enough to recognize it.',
        'This deck rewards preparation because the winning turn usually begins several turns earlier.',
        'A combo piece on the battlefield is not always a threat. Sometimes it is bait, information, or a test.',
        'The table may know what your deck can do. That does not mean they know when it will do it.',
        'Your resources are measured less by creatures and more by possibilities.',
        'Combo decks create pressure simply by existing. Opponents must always wonder how close you are.',
        'The danger here is not steady momentum. It is sudden acceleration.',
        'A good combo deck spends most of the game building certainty while opponents are still estimating risk.',
      ],
      warnings: [
        'The trap is revealing the combo before you are ready to protect it.',
        'Do not show opponents the winning line if you cannot immediately threaten to complete it.',
        'Many combo pilots lose because they become excited one turn too early.',
        'Be careful not to spend tutors, draw, or protection on convenience when they may be needed for the finish.',
        'If opponents are representing interaction, assume they have a reason.',
        'The mistake is treating every combo piece as equally important. Some pieces win games, others simply help.',
        'Do not force the combo into a table that is clearly prepared for it.',
        'A visible combo is often weaker than a hidden one.',
        'Avoid chasing a perfect line if a simpler line already wins.',
        'If protection is missing, patience is often stronger than ambition.',
        'Do not confuse being close to a combo with being ready to execute it.',
        'The table cannot stop a line it does not understand. Keep it that way when possible.',
      ],
      finishingAdvice: [
        'When the pieces are assembled, stop worrying about value and start worrying about execution.',
        'A combo deck wins by recognizing the window before it closes.',
        'If protection and combo pieces are both ready, force opponents to have the answer now.',
        'Do not give the table extra turns to discover interaction.',
        'The strongest combo finishes often look inevitable only after they have already happened.',
        'Once the line is available, make opponents prove they can stop it.',
        'If multiple winning lines exist, choose the one that asks opponents the hardest question.',
        'A combo deck rarely needs permission. It needs timing.',
        'When the table is tapped low, treat that information like a resource.',
        'The closing turn should feel decisive, not hopeful.',
        'If your opponents are arguing about which piece matters, you are probably in a good position.',
        'The best combo wins leave the table realizing the danger one step too late.',
      ],
    },
    midrange: {
      observations: [
        'Midrange decks win by making solid decisions longer than everyone else.',
        'You are not usually the fastest deck or the most explosive. Your strength comes from flexibility.',
        'This deck is comfortable adapting because it rarely depends on one specific path to victory.',
        'Midrange rewards players who understand which role they should play in each game.',
        'Some games ask you to be aggressive. Others ask you to be patient. This deck can do both.',
        'The danger here comes from consistency. Opponents often run out of answers before you run out of threats.',
        'Your cards tend to be individually useful, which makes every draw step relevant.',
        'This deck thrives in messy games where adaptability matters more than specialization.',
        'Midrange rarely wins with surprises. It wins with pressure applied at the right time.',
        'The battlefield often becomes favorable simply because your cards keep doing reasonable things for longer.',
        'You do not need every card to be extraordinary. You need enough cards to remain meaningful.',
        'A good midrange deck quietly turns stability into advantage.',
      ],
      warnings: [
        'The trap is trying to be the aggressor and the control player at the same time.',
        'Do not rush into a role before understanding what the table is doing.',
        'Many midrange pilots lose because they commit threats into situations that reward patience.',
        'Be careful not to spend premium cards on problems that ordinary cards could solve.',
        'The mistake is assuming flexibility means indecision.',
        'Do not trade resources evenly if your deck is already winning the long game.',
        'If one opponent is clearly ahead, stop pretending every threat deserves equal attention.',
        'Avoid holding strong cards forever waiting for a perfect moment.',
        'The deck performs best when every card is asked to do a specific job.',
        'Do not become so reactive that you stop advancing your own position.',
        'Midrange wins through efficient decisions. Waste as little as possible.',
        'If the table is stumbling, press the advantage before it recovers.',
      ],
      finishingAdvice: [
        'When your position is stronger than the table\'s, start turning that advantage into a victory.',
        'A midrange deck often wins because it recognizes when the game has already shifted in its favor.',
        'Do not spend late turns proving you are ahead. Spend them ending the game.',
        'If opponents are running out of resources, force them to answer another threat immediately.',
        'The best finish is often a series of good decisions that finally become impossible to recover from.',
        'When the table is exhausted, become relentless.',
        'Do not overextend a winning board looking for a prettier victory.',
        'A stable advantage is only valuable if it eventually becomes lethal.',
        'If multiple threats are active, make opponents choose the wrong one.',
        'The closing turns should feel inevitable because of everything that came before them.',
        'When your deck has more resources, ask questions opponents can no longer answer.',
        'A midrange finish is rarely dramatic. It is simply the moment opponents realize they are out of time.',
      ],
    },
  } satisfies Record<StrategyArchetypeVoiceKey, StrategyArchetypeVoice>,
};

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getVoiceEntry(pool: readonly string[], seed?: string, salt = ''): string {
  if (pool.length === 0) return '';

  if (!seed) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return pool[hashSeed(`${seed}:${salt}`) % pool.length];
}

export function getRandomIdentityOpening(seed?: string): string {
  return getVoiceEntry(
    strategyVoiceLibrary.identityOpenings,
    seed,
    'identityOpening',
  );
}

export function getRandomPilotWarning(seed?: string): string {
  return getVoiceEntry(
    strategyVoiceLibrary.pilotWarnings,
    seed,
    'pilotWarning',
  );
}

export function getRandomTableWisdom(seed?: string): string {
  return getVoiceEntry(
    strategyVoiceLibrary.tableWisdom,
    seed,
    'tableWisdom',
  );
}

export function getRandomFinishingAdvice(seed?: string): string {
  return getVoiceEntry(
    strategyVoiceLibrary.finishingAdvice,
    seed,
    'finishingAdvice',
  );
}

export function getArchetypeObservation(
  archetype: StrategyArchetypeVoiceKey,
  seed?: string,
): string {
  return getVoiceEntry(
    strategyVoiceLibrary.archetypes[archetype].observations,
    seed,
    `${archetype}:observation`,
  );
}

export function getArchetypeWarning(
  archetype: StrategyArchetypeVoiceKey,
  seed?: string,
): string {
  return getVoiceEntry(
    strategyVoiceLibrary.archetypes[archetype].warnings,
    seed,
    `${archetype}:warning`,
  );
}

export function getArchetypeFinishingAdvice(
  archetype: StrategyArchetypeVoiceKey,
  seed?: string,
): string {
  return getVoiceEntry(
    strategyVoiceLibrary.archetypes[archetype].finishingAdvice,
    seed,
    `${archetype}:finishingAdvice`,
  );
}

export function composeStrategyVoiceParagraph(
  parts: StrategyVoiceComposition,
): string {
  return [
    parts.identityOpening,
    parts.archetypeObservation,
    parts.tableWisdom,
    parts.pilotWarning,
    parts.finishingAdvice,
  ]
    .filter(Boolean)
    .join(' ');
}

export function composeIdentityCoaching(
  archetype?: StrategyArchetypeVoiceKey,
  seed?: string,
): string {
  return composeStrategyVoiceParagraph({
    identityOpening: getRandomIdentityOpening(seed),
    archetypeObservation: archetype
      ? getArchetypeObservation(archetype, seed)
      : undefined,
    tableWisdom: getRandomTableWisdom(seed),
  });
}

export function composePilotCoaching(seed?: string): string {
  return composeStrategyVoiceParagraph({
    pilotWarning: getRandomPilotWarning(seed),
    finishingAdvice: getRandomFinishingAdvice(seed),
  });
}
