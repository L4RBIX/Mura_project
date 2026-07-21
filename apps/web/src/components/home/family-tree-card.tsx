"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMuraI18n } from "@/lib/i18n";
import { getSavedMemories } from "@/lib/memory-store";

/** Quiet doorway from the home screen into the tree. */
export function FamilyTreeCard() {
  const { people, t } = useMuraI18n();
  const [memoryCount, setMemoryCount] = useState(0);
  useEffect(() => setMemoryCount(getSavedMemories().length), []);
  return (
    <Link
      href="/tree"
      className="flex items-center gap-4 rounded-[24px] bg-raised p-4 shadow-soft transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
    >
      <span aria-hidden className="relative size-11 shrink-0">
        <span className="absolute left-0 top-0 size-5 rounded-full bg-clay" />
        <span className="absolute bottom-0 left-3 size-4 rounded-full bg-periwinkle" />
        <span className="absolute right-0 top-2 size-3 rounded-full bg-ink/80" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{t("familyTree")}</span>
        <span className="block text-[13px] text-muted">
          {people.length} {t("people")} · {memoryCount} {t("memories")}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" strokeWidth={2} />
    </Link>
  );
}
