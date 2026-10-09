// app/app/types/gameplay.ts

export type GameplayPlayerId = string;
export type GameplayGameId = string;

export type GameplayColorIdentity =
  | 'W'
  | 'U'
  | 'B'
  | 'R'
  | 'G'
  | 'C'
  | 'MULTI'
  | 'UNKNOWN';

export type GameplayPlayerTheme = {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  identity: GameplayColorIdentity;
};

export type GameplayCommander = {
  name: string;
  scryfallId?: string;
  imageUrl?: string;
  artCropUrl?: string;
  backgroundStyle?:
    | 'commander-art'
    | 'white'
    | 'blue'
    | 'black'
    | 'red'
    | 'green'
    | 'multicolor';
  colors?: string[];
  colorIdentity?: string[];
  typeLine?: string;
  oracleText?: string;
};

export type GameplayCounters = {
  life: number;
  poison: number;
  commanderTax: number;
  energy: number;
  experience: number;
  rad: number;
  ticket: number;
  monarch: boolean;
  citysBlessing: boolean;
  ringTemptsYou: boolean;
};

export type GameplayCommanderDamageEntry = {
  sourcePlayerId: GameplayPlayerId;
  sourcePlayerName: string;
  sourceCommanderName: string;
  damage: number;
};

export type GameplayPlayer = {
  id: GameplayPlayerId;
  name: string;
  commander: GameplayCommander;
  theme: GameplayPlayerTheme;
  counters: GameplayCounters;
  commanderDamageTaken: GameplayCommanderDamageEntry[];
  isEliminated: boolean;
  eliminatedReason?: GameplayEliminationReason;
};

export type GameplayEliminationReason =
  | 'life_total'
  | 'poison'
  | 'commander_damage'
  | 'manual'
  | 'unknown';

export type GameplayWinLossTrigger =
  | {
      type: 'none';
    }
  | {
      type: 'loss_warning';
      playerId: GameplayPlayerId;
      reason: GameplayEliminationReason;
      message: string;
    }
  | {
      type: 'winner';
      playerId: GameplayPlayerId;
      message: string;
    };

export type GameplayStatus =
  | 'setup'
  | 'active'
  | 'completed'
  | 'discarded';

export type GameplayGame = {
  id: GameplayGameId;
  status: GameplayStatus;
  format: 'commander';
  startingLife: 40;
  players: GameplayPlayer[];
  firstPlayerId?: GameplayPlayerId;
  winnerPlayerId?: GameplayPlayerId;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type GameplaySaveSlot = {
  activeGameId?: GameplayGameId;
  games: GameplayGame[];
};

export type GameplayCounterKey =
  | 'life'
  | 'poison'
  | 'commanderTax'
  | 'energy'
  | 'experience'
  | 'rad'
  | 'ticket';

export type GameplayToggleKey =
  | 'monarch'
  | 'citysBlessing'
  | 'ringTemptsYou';

export const GAMEPLAY_COMMANDER_STARTING_LIFE = 40;
export const GAMEPLAY_MIN_LIFE = -999;
export const GAMEPLAY_MAX_COUNTER = 999;
export const GAMEPLAY_DISPLAY_OVER_MAX = '1000+';

export const GAMEPLAY_POISON_LOSS_THRESHOLD = 10;
export const GAMEPLAY_COMMANDER_DAMAGE_LOSS_THRESHOLD = 21;

export const GAMEPLAY_MIN_PLAYERS = 2;
export const GAMEPLAY_MAX_PLAYERS = 6;

export function createDefaultGameplayCounters(): GameplayCounters {
  return {
    life: GAMEPLAY_COMMANDER_STARTING_LIFE,
    poison: 0,
    commanderTax: 0,
    energy: 0,
    experience: 0,
    rad: 0,
    ticket: 0,
    monarch: false,
    citysBlessing: false,
    ringTemptsYou: false,
  };
}
