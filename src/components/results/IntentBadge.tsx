import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { SearchIntent } from '@/lib/intent/types';
import { getIntentLabel, getIntentColor } from '@/lib/intent/classify';

interface IntentBadgeProps {
  intent: SearchIntent;
  editable?: boolean;
  onIntentChange?: (newIntent: SearchIntent) => void;
  showConfidence?: boolean;
  confidence?: number;
}

const ALL_INTENTS: SearchIntent[] = [
  'informational',
  'navigational',
  'commercial',
  'transactional',
];

export function IntentBadge({
  intent,
  editable = false,
  onIntentChange,
  showConfidence = false,
  confidence,
}: IntentBadgeProps) {
  const [currentIntent, setCurrentIntent] = useState<SearchIntent>(intent);

  const handleIntentChange = (newIntent: SearchIntent) => {
    setCurrentIntent(newIntent);
    onIntentChange?.(newIntent);
  };

  const label = getIntentLabel(currentIntent);
  const colorClass = getIntentColor(currentIntent);

  if (!editable) {
    return (
      <Badge variant="secondary" className={colorClass}>
        {label}
        {showConfidence && confidence && (
          <span className="ml-1 opacity-75">
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          variant="secondary"
          className={`${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
        >
          {label}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Intent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_INTENTS.map((intentOption) => (
          <DropdownMenuItem
            key={intentOption}
            onClick={() => handleIntentChange(intentOption)}
            className="flex items-center justify-between"
          >
            <span>{getIntentLabel(intentOption)}</span>
            {currentIntent === intentOption && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
