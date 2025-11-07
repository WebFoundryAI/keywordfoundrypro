import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface UsageProgressBarProps {
  label: string;
  used: number;
  limit: number;
  percentage: number;
  className?: string;
}

const getUsageLevel = (percentage: number) => {
  if (percentage >= 90) return 'critical';
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'warning';
  return 'normal';
};

const getProgressColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'bg-destructive';
    case 'high':
      return 'bg-orange-500';
    case 'warning':
      return 'bg-yellow-500';
    default:
      return 'bg-primary';
  }
};

const getTextColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'text-destructive';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-foreground';
  }
};

const getIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return <AlertCircle className="w-4 h-4" />;
    case 'high':
      return <AlertTriangle className="w-4 h-4" />;
    case 'warning':
      return <Info className="w-4 h-4" />;
    default:
      return <CheckCircle2 className="w-4 h-4" />;
  }
};

const getMessage = (level: string, percentage: number) => {
  switch (level) {
    case 'critical':
      return `${Math.round(percentage)}% used - Limit almost reached!`;
    case 'high':
      return `${Math.round(percentage)}% used - Approaching limit`;
    case 'warning':
      return `${Math.round(percentage)}% used - Consider upgrading soon`;
    default:
      return `${Math.round(percentage)}% used`;
  }
};

const formatLimit = (limit: number) => {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
};

export const UsageProgressBar = ({ label, used, limit, percentage, className }: UsageProgressBarProps) => {
  const level = getUsageLevel(percentage);
  const progressColor = getProgressColor(level);
  const textColor = getTextColor(level);
  const icon = getIcon(level);
  const message = getMessage(level, percentage);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("transition-colors", textColor)}>
            {icon}
          </span>
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold transition-colors", textColor)}>
            {used.toLocaleString()} / {formatLimit(limit)}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={Math.min(percentage, 100)} 
          className={cn("h-3 transition-all", `[&>div]:${progressColor}`)}
        />
        <p className={cn("text-xs transition-colors", textColor)}>
          {message}
        </p>
      </div>

      {level !== 'normal' && (
        <div className={cn(
          "text-xs p-2 rounded-md border",
          level === 'critical' && "bg-destructive/10 border-destructive/20 text-destructive",
          level === 'high' && "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300",
          level === 'warning' && "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300"
        )}>
          {level === 'critical' && (
            <span>⚠️ You've used {Math.round(percentage)}% of your monthly limit. Upgrade now to avoid service interruption.</span>
          )}
          {level === 'high' && (
            <span>📊 You're approaching your monthly limit ({Math.round(percentage)}%). Consider upgrading to ensure uninterrupted service.</span>
          )}
          {level === 'warning' && (
            <span>💡 You've passed the halfway mark ({Math.round(percentage)}%). Monitor your usage or upgrade for more capacity.</span>
          )}
        </div>
      )}
    </div>
  );
};
