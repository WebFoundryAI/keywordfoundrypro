import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, Sparkles } from 'lucide-react';
import { getSampleProjectMetadata } from '@/lib/sampleProject/seed';

interface SampleProjectBannerProps {
  onStartRealResearch?: () => void;
}

export function SampleProjectBanner({
  onStartRealResearch,
}: SampleProjectBannerProps) {
  const metadata = getSampleProjectMetadata();

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        {metadata.name}
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        <p className="mb-3">{metadata.description}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-sm">
            <Info className="h-3 w-3" />
            <span>
              This is demo data with {metadata.keywordCount} sample keywords.
              No API costs incurred.
            </span>
          </div>
          {onStartRealResearch && (
            <Button
              size="sm"
              onClick={onStartRealResearch}
              className="ml-auto"
            >
              Run Real Research
            </Button>
          )}
        </div>
        <p className="text-xs mt-2 opacity-75">
          Note: Export is disabled for the demo project. Create your own
          project to export results.
        </p>
      </AlertDescription>
    </Alert>
  );
}
