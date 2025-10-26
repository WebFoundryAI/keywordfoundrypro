import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Target,
  HelpCircle,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  X,
} from 'lucide-react';

export interface OpportunityFilter {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
}

export interface OpportunityPreset {
  id: 'low-kd' | 'paa-present' | 'no-shopping' | 'featured-snippet' | 'weak-serp';
  label: string;
  description: string;
  icon: React.ReactNode;
  filterFn: (row: any) => boolean;
}

interface QuickOpportunitiesProps {
  data: any[];
  onFilterChange?: (filteredData: any[], activePresets: string[]) => void;
  kdThreshold?: number;
  daThreshold?: number;
}

export function QuickOpportunities({
  data,
  onFilterChange,
  kdThreshold = 30,
  daThreshold = 40,
}: QuickOpportunitiesProps) {
  const [activePresets, setActivePresets] = useState<Set<string>>(new Set());

  const presets: OpportunityPreset[] = [
    {
      id: 'low-kd',
      label: 'Low KD',
      description: `Keyword Difficulty ≤ ${kdThreshold} - easier to rank for`,
      icon: <Target className="h-4 w-4" />,
      filterFn: (row) =>
        row.keyword_difficulty !== undefined &&
        row.keyword_difficulty <= kdThreshold,
    },
    {
      id: 'paa-present',
      label: 'PAA Present',
      description: 'Has People Also Ask box - opportunity for featured content',
      icon: <HelpCircle className="h-4 w-4" />,
      filterFn: (row) =>
        row.serp_features &&
        (row.serp_features.includes('paa') ||
          row.serp_features.includes('people_also_ask')),
    },
    {
      id: 'no-shopping',
      label: 'No Shopping',
      description: 'No shopping results - better for content play',
      icon: <ShoppingBag className="h-4 w-4" />,
      filterFn: (row) =>
        !row.serp_features ||
        (!row.serp_features.includes('shopping') &&
          !row.serp_features.includes('product_listings')),
    },
    {
      id: 'featured-snippet',
      label: 'Featured Snippet',
      description: 'Has featured snippet - position zero opportunity',
      icon: <Sparkles className="h-4 w-4" />,
      filterFn: (row) =>
        row.serp_features &&
        (row.serp_features.includes('featured_snippet') ||
          row.serp_features.includes('answer_box')),
    },
    {
      id: 'weak-serp',
      label: 'Weak SERP',
      description: `Average DA < ${daThreshold} - less authoritative competition`,
      icon: <TrendingDown className="h-4 w-4" />,
      filterFn: (row) => {
        // If we have domain authority data
        if (row.average_da !== undefined) {
          return row.average_da < daThreshold;
        }
        // Fallback: check if mostly forum/UGC content
        if (row.serp_features) {
          const hasForums =
            row.serp_features.includes('forum') ||
            row.serp_features.includes('ugc');
          const noNews = !row.serp_features.includes('news');
          return hasForums && noNews;
        }
        return false;
      },
    },
  ];

  const togglePreset = (presetId: string) => {
    const newActivePresets = new Set(activePresets);

    if (newActivePresets.has(presetId)) {
      newActivePresets.delete(presetId);
    } else {
      newActivePresets.add(presetId);
    }

    setActivePresets(newActivePresets);
    applyFilters(newActivePresets);
  };

  const clearAll = () => {
    setActivePresets(new Set());
    onFilterChange?.(data, []);
  };

  const applyFilters = (activePresetIds: Set<string>) => {
    if (activePresetIds.size === 0) {
      onFilterChange?.(data, []);
      return;
    }

    // Get active preset filter functions
    const activeFilters = presets.filter((p) => activePresetIds.has(p.id));

    // Apply all active filters (AND logic)
    const filtered = data.filter((row) =>
      activeFilters.every((preset) => preset.filterFn(row))
    );

    onFilterChange?.(filtered, Array.from(activePresetIds));
  };

  const activeCount = activePresets.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Quick Opportunities
        </h3>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isActive = activePresets.has(preset.id);

            return (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={isActive ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => togglePreset(preset.id)}
                  >
                    <span className="mr-1.5">{preset.icon}</span>
                    {preset.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{preset.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {activeCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {activeCount} filter{activeCount > 1 ? 's' : ''} active
        </div>
      )}
    </div>
  );
}
