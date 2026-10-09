export type ConnectedMatchSessionStatus =
  | 'lobby'
  | 'active'
  | 'completed'
  | 'abandoned';

export type ConnectedMatchTerminalState =
  | 'active'
  | 'won'
  | 'lost'
  | 'left';

export type ConnectedMatchEliminationReason =
  | 'life_total'
  | 'poison'
  | 'commander_damage'
  | 'manual'
  | 'left'
  | 'unknown';

export type ConnectedMatchCounterKey =
  | 'poison'
  | 'commander_tax'
  | 'energy'
  | 'experience'
  | 'rad'
  | 'ticket';

export type ConnectedMatchToggleKey =
  | 'monarch'
  | 'citys_blessing'
  | 'ring_tempts_you';

export type ConnectedMatchAvatarRef = 'deck_sage_default' | string;

export type ConnectedMatchPlayerPayload = {
  display_name?: string | null;
  avatar_ref?: ConnectedMatchAvatarRef | null;
  commander_name?: string | null;
  commander_scryfall_id?: string | null;
  commander_image_url?: string | null;
  commander_art_crop_url?: string | null;
};

export type ConnectedMatchSession = {
  id: string;
  join_code: string;
  status: ConnectedMatchSessionStatus;
  host_user_id: string;
  starting_life: number;
  max_players: number;
  first_player_participant_id: string | null;
  winner_participant_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  updated_at: string;
};

export type ConnectedMatchParticipant = {
  id: string;
  session_id: string;
  user_id: string;
  seat_index: number;
  display_name: string;
  avatar_ref: ConnectedMatchAvatarRef;
  commander_name: string | null;
  commander_scryfall_id: string | null;
  commander_image_url: string | null;
  commander_art_crop_url: string | null;
  life: number;
  poison: number;
  commander_tax: number;
  energy: number;
  experience: number;
  rad: number;
  ticket: number;
  monarch: boolean;
  citys_blessing: boolean;
  ring_tempts_you: boolean;
  is_ready: boolean;
  ready_at: string | null;
  terminal_state: ConnectedMatchTerminalState;
  elimination_reason: ConnectedMatchEliminationReason | null;
  left_mid_game: boolean;
  last_seen_at: string;
  reconnect_until: string;
  created_at: string;
  updated_at: string;
};

export type ConnectedMatchCommanderDamage = {
  id: string;
  session_id: string;
  target_participant_id: string;
  source_participant_id: string;
  damage: number;
  created_at: string;
  updated_at: string;
};

export type ConnectedMatchMonthlyUsage = {
  usage_month: string;
  used_count: number;
  monthly_limit: number;
  remaining_count: number;
  entitlement_source: 'free' | 'sanctum' | 'fallback_free' | 'unknown' | string;
};

export type ConnectedMatchSnapshot = {
  session: ConnectedMatchSession;
  participants: ConnectedMatchParticipant[];
  commander_damage: ConnectedMatchCommanderDamage[];
};

export type ConnectedMatchCreateResult = {
  session: ConnectedMatchSession;
  participant: ConnectedMatchParticipant;
  monthly_usage: ConnectedMatchMonthlyUsage;
};

export type ConnectedMatchJoinResult = ConnectedMatchCreateResult & {
  reconnected: boolean;
};

export type ConnectedMatchLimitError = Error & {
  code: 'CONNECTED_MATCH_LIMIT_REACHED';
};
