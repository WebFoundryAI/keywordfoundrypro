/**
 * Hook for managing filter state with localStorage persistence
 * Filters are scoped per project for isolation
 */

import { useState, useEffect, useCallback } from 'react';

export type SortOption = 'volume_desc' | 'kd_asc' | 'cpc_desc' | 'alpha' | 'cluster';
export type Intent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type LastUpdatedOption = '7' | '30' | '90' | 'all';

export interface FilterState {
  // Text filters
  includeTerms: string; // Comma or newline separated
  excludeTerms: string; // Comma or newline separated

  // Numeric ranges
  searchVolumeMin: number | null;
  searchVolumeMax: number | null;
  keywordDifficultyMin: number | null;
  keywordDifficultyMax: number | null;
  cpcMin: number | null;
  cpcMax: number | null;
  serpFeaturesMin: number | null;
  serpFeaturesMax: number | null;

  // Dropdowns
  country: string; // ISO code, affects API params
  language: string; // ISO code, affects API params
  lastUpdated: LastUpdatedOption;

  // Multi-select
  intents: Intent[];

  // Toggles
  hasPeopleAlsoAsk: boolean | null; // null = don't filter
  hasShopping: boolean | null; // null = don't filter

  // Sort
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: FilterState = {
  includeTerms: '',
  excludeTerms: '',
  searchVolumeMin: null,
  searchVolumeMax: null,
  keywordDifficultyMin: null,
  keywordDifficultyMax: null,
  cpcMin: null,
  cpcMax: null,
  serpFeaturesMin: null,
  serpFeaturesMax: null,
  country: 'us',
  language: 'en',
  lastUpdated: 'all',
  intents: [],
  hasPeopleAlsoAsk: null,
  hasShopping: null,
  sortBy: 'volume_desc',
};

const STORAGE_KEY_PREFIX = 'kfp:filters:';
const DEFAULT_STORAGE_KEY = 'kfp:filters:default';

/**
 * Get storage key for a specific project
 */
function getStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY_PREFIX}${projectId}` : DEFAULT_STORAGE_KEY;
}

/**
 * Load filters from localStorage
 */
function loadFilters(projectId?: string): FilterState {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;

  try {
    const key = getStorageKey(projectId);
    const stored = localStorage.getItem(key);
    if (!stored) return DEFAULT_FILTERS;

    const parsed = JSON.parse(stored);
    // Merge with defaults to handle new fields
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch (error) {
    console.error('[usePersistedFilters] Error loading filters:', error);
    return DEFAULT_FILTERS;
  }
}

/**
 * Save filters to localStorage
 */
function saveFilters(filters: FilterState, projectId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(projectId);
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (error) {
    console.error('[usePersistedFilters] Error saving filters:', error);
  }
}

/**
 * Hook for managing filter state with persistence
 */
export function usePersistedFilters(projectId?: string) {
  const [filters, setFilters] = useState<FilterState>(() => loadFilters(projectId));
  const [isDirty, setIsDirty] = useState(false);

  // Load filters when projectId changes
  useEffect(() => {
    const loaded = loadFilters(projectId);
    setFilters(loaded);
    setIsDirty(false);
  }, [projectId]);

  // Update a single filter field
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => {
        const updated = { ...prev, [key]: value };
        saveFilters(updated, projectId);
        return updated;
      });
      setIsDirty(true);
    },
    [projectId]
  );

  // Update multiple filters at once
  const updateFilters = useCallback(
    (updates: Partial<FilterState>) => {
      setFilters((prev) => {
        const updated = { ...prev, ...updates };
        saveFilters(updated, projectId);
        return updated;
      });
      setIsDirty(true);
    },
    [projectId]
  );

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    saveFilters(DEFAULT_FILTERS, projectId);
    setIsDirty(false);
  }, [projectId]);

  // Save current filters as default for this project
  const saveAsDefault = useCallback(() => {
    saveFilters(filters, projectId);
    setIsDirty(false);
  }, [filters, projectId]);

  // Apply filters (mark as clean)
  const applyFilters = useCallback(() => {
    saveFilters(filters, projectId);
    setIsDirty(false);
  }, [filters, projectId]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    saveAsDefault,
    applyFilters,
    isDirty,
  };
}
