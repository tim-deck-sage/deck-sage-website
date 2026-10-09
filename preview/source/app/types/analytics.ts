export type AnalyticsPayload = Record<
  string,
  string | number | boolean | null
>;

export type AnalyticsEventRecord = {
  id: string;
  event: string;
  timestamp: string;
  payload?: AnalyticsPayload;
};