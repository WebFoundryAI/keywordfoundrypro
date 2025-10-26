/**
 * Search intent classification types
 */
export type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'commercial'
  | 'transactional';

export interface IntentSignals {
  intent: SearchIntent;
  confidence: number; // 0-1
  signals: string[]; // Why this intent was chosen
}

export interface IntentOverride {
  keywordId: string;
  originalIntent: SearchIntent;
  overrideIntent: SearchIntent;
  overriddenAt: string;
  overriddenBy: string;
}
