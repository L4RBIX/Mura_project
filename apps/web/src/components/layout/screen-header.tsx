import { BackButton } from "./back-button";

interface ScreenHeaderProps {
  title?: string;
  fallbackHref?: string;
  /** Rendered on the right edge; a spacer keeps the title centered otherwise. */
  right?: React.ReactNode;
}

export function ScreenHeader({ title, fallbackHref, right }: ScreenHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pb-2 pt-[max(env(safe-area-inset-top),16px)]">
      <BackButton fallbackHref={fallbackHref} />
      {title ? (
        <span className="text-[15px] font-semibold text-muted">{title}</span>
      ) : null}
      {right ?? <span aria-hidden className="size-11" />}
    </header>
  );
}
