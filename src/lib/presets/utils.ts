export function serializeFilters(filters: any): any {
  return {
    minVolume: filters.minVolume || undefined,
    maxVolume: filters.maxVolume || undefined,
    minDifficulty: filters.minDifficulty || undefined,
    maxDifficulty: filters.maxDifficulty || undefined,
    intent: filters.intent || undefined,
    minCpc: filters.minCpc || undefined,
    maxCpc: filters.maxCpc || undefined,
  };
}
