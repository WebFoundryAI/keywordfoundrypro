import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {(actionLabel || actionHref) && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          asChild={!!actionHref}
        >
          {actionHref ? (
            <a href={actionHref} target="_blank" rel="noopener noreferrer">
              {actionLabel}
            </a>
          ) : (
            actionLabel
          )}
        </Button>
      )}
    </div>
  );
};
