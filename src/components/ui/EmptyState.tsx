import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-body text-ink">{message}</p>
      <Button variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
