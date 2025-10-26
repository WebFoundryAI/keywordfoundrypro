import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClusteringParams } from '@/lib/clustering/types';

interface ThresholdControlsProps {
  params: ClusteringParams;
  onChange: (params: ClusteringParams) => void;
  disabled?: boolean;
}

export function ThresholdControls({
  params,
  onChange,
  disabled = false,
}: ThresholdControlsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="overlap-threshold">SERP Overlap Threshold</Label>
          <span className="text-sm text-muted-foreground">{params.overlap_threshold}</span>
        </div>
        <Slider
          id="overlap-threshold"
          min={0}
          max={10}
          step={1}
          value={[params.overlap_threshold]}
          onValueChange={([value]) =>
            onChange({ ...params, overlap_threshold: value })
          }
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Minimum number of shared URLs (0-10) to group keywords together
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="distance-threshold">Semantic Distance Threshold</Label>
          <span className="text-sm text-muted-foreground">
            {params.distance_threshold.toFixed(2)}
          </span>
        </div>
        <Slider
          id="distance-threshold"
          min={0}
          max={1}
          step={0.05}
          value={[params.distance_threshold]}
          onValueChange={([value]) =>
            onChange({ ...params, distance_threshold: value })
          }
          disabled={disabled || params.semantic_provider === 'none'}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Maximum semantic distance (0-1, lower = more similar)
          {params.semantic_provider === 'none' && ' - Disabled when semantic provider is "none"'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="min-cluster-size">Minimum Cluster Size</Label>
        <Input
          id="min-cluster-size"
          type="number"
          min={1}
          max={100}
          value={params.min_cluster_size}
          onChange={(e) =>
            onChange({
              ...params,
              min_cluster_size: parseInt(e.target.value, 10) || 1,
            })
          }
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Minimum keywords required per cluster
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="semantic-provider">Semantic Provider</Label>
        <Select
          value={params.semantic_provider}
          onValueChange={(value: 'none' | 'openai') =>
            onChange({ ...params, semantic_provider: value })
          }
          disabled={disabled}
        >
          <SelectTrigger id="semantic-provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (SERP overlap only)</SelectItem>
            <SelectItem value="openai">OpenAI (embeddings)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Combine SERP overlap with semantic similarity (requires OPENAI_API_KEY)
        </p>
      </div>
    </div>
  );
}
