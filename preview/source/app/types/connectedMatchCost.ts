export type ConnectedMatchCostRateAssumption = {
  rate_value: number;
  unit: string;
  cost_model_version: string;
  description: string | null;
};

export type ConnectedMatchCostRollup = {
  session_id: string;
  game_date: string;
  game_month: string;
  participant_count: number;
  duration_seconds: number;
  total_events: number;
  rpc_action_count: number;
  total_writes: number;
  realtime_writes: number;
  heartbeat_count: number;
  reconnect_count: number;
  writes_per_minute: number;
  estimated_operational_cost_usd: number;
  event_breakdown: Record<string, number>;
  cost_model_version: string;
  computed_at: string;
};

export type ConnectedMatchCostDailyTotal = {
  game_date: string;
  games: number;
  estimated_operational_cost_usd: number;
  total_writes: number;
  writes_per_minute: number;
};

export type ConnectedMatchCostMonthlyTotal = {
  game_month: string;
  games: number;
  estimated_operational_cost_usd: number;
  total_writes: number;
  writes_per_minute: number;
};

export type ConnectedMatchCostAdminSummary = {
  label: 'Estimated Operational Cost' | string;
  disclaimer: string;
  cost_model_version: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  latest_completed_game: Partial<ConnectedMatchCostRollup>;
  highest_cost_game: Partial<ConnectedMatchCostRollup>;
  average_estimated_operational_cost_per_completed_game: number;
  total_estimated_beta_operational_cost: number;
  estimated_monthly_connected_match_cost: number;
  games_today: number;
  games_this_month: number;
  completed_games: number;
  average_players_per_game: number;
  average_duration_seconds: number;
  average_writes_per_game: number;
  writes_per_minute: number;
  realtime_relevant_writes: number;
  average_realtime_writes_per_game: number;
  heartbeats_per_game: number;
  heartbeat_count: number;
  reconnect_count: number;
  rpc_action_count: number;
  event_breakdown: Record<string, number>;
  daily_totals: ConnectedMatchCostDailyTotal[];
  monthly_totals: ConnectedMatchCostMonthlyTotal[];
  assumptions: Record<string, ConnectedMatchCostRateAssumption>;
};
