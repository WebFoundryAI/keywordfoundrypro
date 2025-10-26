/**
 * Comprehensive filters panel with sticky state per project
 * All fields in exact order as specified in requirements
 */

import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FilterState, usePersistedFilters, Intent } from '@/lib/hooks/usePersistedFilters';
import { Filter, X, Save, RotateCcw } from 'lucide-react';

interface FiltersPanelProps {
  projectId?: string;
  onApply?: (filters: FilterState) => void;
  className?: string;
}

const INTENT_OPTIONS: { value: Intent; label: string }[] = [
  { value: 'informational', label: 'Informational' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'navigational', label: 'Navigational' },
];

export const FiltersPanel: FC<FiltersPanelProps> = ({ projectId, onApply, className }) => {
  const {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    saveAsDefault,
    applyFilters,
    isDirty,
  } = usePersistedFilters(projectId);

  const handleApply = () => {
    applyFilters();
    onApply?.(filters);
  };

  const handleReset = () => {
    resetFilters();
    onApply?.(filters);
  };

  const toggleIntent = (intent: Intent) => {
    const current = filters.intents;
    const updated = current.includes(intent)
      ? current.filter((i) => i !== intent)
      : [...current, intent];
    updateFilter('intents', updated);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {isDirty && (
            <Badge variant="secondary" className="animate-pulse">
              Unsaved changes
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Include Terms */}
        <div className="space-y-2">
          <Label htmlFor="include-terms" className="font-semibold">
            Include Terms
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (comma or newline separated)
            </span>
          </Label>
          <Textarea
            id="include-terms"
            placeholder="e.g., seo tools, keyword research"
            value={filters.includeTerms}
            onChange={(e) => updateFilter('includeTerms', e.target.value)}
            className="min-h-[80px] font-mono text-sm"
          />
        </div>

        {/* 2. Exclude Terms */}
        <div className="space-y-2">
          <Label htmlFor="exclude-terms" className="font-semibold">
            Exclude Terms
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (comma or newline separated)
            </span>
          </Label>
          <Textarea
            id="exclude-terms"
            placeholder="e.g., free, cheap"
            value={filters.excludeTerms}
            onChange={(e) => updateFilter('excludeTerms', e.target.value)}
            className="min-h-[80px] font-mono text-sm"
          />
        </div>

        <Separator />

        {/* 3. Search Volume */}
        <div className="space-y-2">
          <Label className="font-semibold">Search Volume</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="volume-min" className="text-xs text-muted-foreground">
                Min
              </Label>
              <Input
                id="volume-min"
                type="number"
                placeholder="0"
                value={filters.searchVolumeMin ?? ''}
                onChange={(e) =>
                  updateFilter('searchVolumeMin', e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label htmlFor="volume-max" className="text-xs text-muted-foreground">
                Max
              </Label>
              <Input
                id="volume-max"
                type="number"
                placeholder="∞"
                value={filters.searchVolumeMax ?? ''}
                onChange={(e) =>
                  updateFilter('searchVolumeMax', e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
          </div>
        </div>

        {/* 4. Keyword Difficulty */}
        <div className="space-y-2">
          <Label className="font-semibold">Keyword Difficulty</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kd-min" className="text-xs text-muted-foreground">
                Min (0-100)
              </Label>
              <Input
                id="kd-min"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={filters.keywordDifficultyMin ?? ''}
                onChange={(e) =>
                  updateFilter(
                    'keywordDifficultyMin',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="kd-max" className="text-xs text-muted-foreground">
                Max (0-100)
              </Label>
              <Input
                id="kd-max"
                type="number"
                min="0"
                max="100"
                placeholder="100"
                value={filters.keywordDifficultyMax ?? ''}
                onChange={(e) =>
                  updateFilter(
                    'keywordDifficultyMax',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* 5. CPC */}
        <div className="space-y-2">
          <Label className="font-semibold">CPC ($)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpc-min" className="text-xs text-muted-foreground">
                Min
              </Label>
              <Input
                id="cpc-min"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filters.cpcMin ?? ''}
                onChange={(e) =>
                  updateFilter('cpcMin', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label htmlFor="cpc-max" className="text-xs text-muted-foreground">
                Max
              </Label>
              <Input
                id="cpc-max"
                type="number"
                step="0.01"
                placeholder="∞"
                value={filters.cpcMax ?? ''}
                onChange={(e) =>
                  updateFilter('cpcMax', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 6. Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="font-semibold">
            Country
            <span className="ml-2 text-xs font-normal text-yellow-600 dark:text-yellow-400">
              (affects API params & cache key)
            </span>
          </Label>
          <Select value={filters.country} onValueChange={(value) => updateFilter('country', value)}>
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="gb">United Kingdom</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="au">Australia</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
              <SelectItem value="es">Spain</SelectItem>
              <SelectItem value="it">Italy</SelectItem>
              <SelectItem value="nl">Netherlands</SelectItem>
              <SelectItem value="br">Brazil</SelectItem>
              <SelectItem value="mx">Mexico</SelectItem>
              <SelectItem value="in">India</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 7. Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="font-semibold">
            Language
            <span className="ml-2 text-xs font-normal text-yellow-600 dark:text-yellow-400">
              (affects API params & cache key)
            </span>
          </Label>
          <Select
            value={filters.language}
            onValueChange={(value) => updateFilter('language', value)}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="nl">Dutch</SelectItem>
              <SelectItem value="pl">Polish</SelectItem>
              <SelectItem value="ru">Russian</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* 8. SERP Features Count */}
        <div className="space-y-2">
          <Label className="font-semibold">SERP Features Count</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="serp-min" className="text-xs text-muted-foreground">
                Min
              </Label>
              <Input
                id="serp-min"
                type="number"
                min="0"
                placeholder="0"
                value={filters.serpFeaturesMin ?? ''}
                onChange={(e) =>
                  updateFilter('serpFeaturesMin', e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label htmlFor="serp-max" className="text-xs text-muted-foreground">
                Max
              </Label>
              <Input
                id="serp-max"
                type="number"
                min="0"
                placeholder="∞"
                value={filters.serpFeaturesMax ?? ''}
                onChange={(e) =>
                  updateFilter('serpFeaturesMax', e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
          </div>
        </div>

        {/* 9. Intent (Multi-select) */}
        <div className="space-y-2">
          <Label className="font-semibold">Search Intent</Label>
          <div className="flex flex-wrap gap-2">
            {INTENT_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={filters.intents.includes(option.value) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleIntent(option.value)}
              >
                {option.label}
                {filters.intents.includes(option.value) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* 10. Has People Also Ask */}
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="has-paa" className="font-semibold">
            Has "People Also Ask"
          </Label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {filters.hasPeopleAlsoAsk === null ? 'Any' : filters.hasPeopleAlsoAsk ? 'Yes' : 'No'}
            </span>
            <Switch
              id="has-paa"
              checked={filters.hasPeopleAlsoAsk === true}
              onCheckedChange={(checked) => {
                if (filters.hasPeopleAlsoAsk === null) {
                  updateFilter('hasPeopleAlsoAsk', true);
                } else if (filters.hasPeopleAlsoAsk === true) {
                  updateFilter('hasPeopleAlsoAsk', false);
                } else {
                  updateFilter('hasPeopleAlsoAsk', null);
                }
              }}
            />
          </div>
        </div>

        {/* 11. Has Shopping */}
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="has-shopping" className="font-semibold">
            Has Shopping Results
          </Label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {filters.hasShopping === null ? 'Any' : filters.hasShopping ? 'Yes' : 'No'}
            </span>
            <Switch
              id="has-shopping"
              checked={filters.hasShopping === true}
              onCheckedChange={(checked) => {
                if (filters.hasShopping === null) {
                  updateFilter('hasShopping', true);
                } else if (filters.hasShopping === true) {
                  updateFilter('hasShopping', false);
                } else {
                  updateFilter('hasShopping', null);
                }
              }}
            />
          </div>
        </div>

        {/* 12. Last Updated */}
        <div className="space-y-2">
          <Label htmlFor="last-updated" className="font-semibold">
            Last Updated
          </Label>
          <Select
            value={filters.lastUpdated}
            onValueChange={(value) => updateFilter('lastUpdated', value as FilterState['lastUpdated'])}
          >
            <SelectTrigger id="last-updated">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-6" />

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleApply}
            className="w-full"
            size="lg"
            disabled={!isDirty}
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Reset
            </Button>
            <Button
              onClick={saveAsDefault}
              variant="outline"
              size="sm"
            >
              <Save className="mr-2 h-3 w-3" />
              Save as Default
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
