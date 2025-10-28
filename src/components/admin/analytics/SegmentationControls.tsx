import { useState } from 'react';
import type { SegmentFilter } from '@/lib/analytics/types';

interface SegmentationControlsProps {
  filter: SegmentFilter;
  onFilterChange: (filter: SegmentFilter) => void;
}

export function SegmentationControls({
  filter,
  onFilterChange,
}: SegmentationControlsProps) {
  const [localFilter, setLocalFilter] = useState<SegmentFilter>(filter);

  function handleApply() {
    onFilterChange(localFilter);
  }

  function handleReset() {
    setLocalFilter({});
    onFilterChange({});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plan
          </label>
          <select
            value={localFilter.plan || ''}
            onChange={(e) =>
              setLocalFilter({ ...localFilter, plan: e.target.value || undefined })
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={localFilter.startDate || ''}
            onChange={(e) =>
              setLocalFilter({
                ...localFilter,
                startDate: e.target.value || undefined,
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={localFilter.endDate || ''}
            onChange={(e) =>
              setLocalFilter({
                ...localFilter,
                endDate: e.target.value || undefined,
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Active filters display */}
      {(filter.plan || filter.startDate || filter.endDate) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filter.plan && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              Plan: {filter.plan}
            </span>
          )}
          {filter.startDate && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              From: {filter.startDate}
            </span>
          )}
          {filter.endDate && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              To: {filter.endDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
