import { Button, type ButtonProps, cn } from '@enonic/ui';

export type ProgressButtonProps = { progress?: number } & ButtonProps;

/**
 * A button that fills with its own progress while the work it started runs, and refuses a second
 * press until that finishes.
 */
export function ProgressButton({ progress, className, ...props }: ProgressButtonProps) {
  if (progress == null) {
    return <Button className={className} {...props} />;
  }

  return (
    <Button {...props} disabled aria-busy className={cn('relative', className)}>
      <span
        className="bg-success-rev absolute inset-y-0 left-0 animate-pulse transition-[width] duration-300 ease-out"
        style={{ width: `${clampProgress(progress)}%` }}
        aria-hidden
      />
    </Button>
  );
}

// *
// * Helpers
// *

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}
