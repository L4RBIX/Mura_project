import { toneBg } from "@/lib/tones";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InitialsAvatarProps {
  person: Person;
  size?: number;
  className?: string;
}

/** Photo placeholder: the person’s Kazakh initial on their accent tone. */
export function InitialsAvatar({
  person,
  size = 40,
  className,
}: InitialsAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-ink/75",
        toneBg[person.tone],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {person.nativeName[0]}
    </span>
  );
}
