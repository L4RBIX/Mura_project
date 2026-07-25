"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { MEMORY_FEATURES_CHANGED_EVENT } from "@/lib/memory-features-api";
import { memoryFeaturesApi } from "@/lib/memory-features-store";
import { useMuraI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FavoriteMemoryButton({
  memoryId,
  ownerPersonId,
  className,
}: {
  memoryId: string;
  ownerPersonId: string;
  className?: string;
}) {
  const { t } = useMuraI18n();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () =>
      setSaved(memoryFeaturesApi.isFavorite(ownerPersonId, memoryId));
    sync();
    window.addEventListener(MEMORY_FEATURES_CHANGED_EVENT, sync);
    return () =>
      window.removeEventListener(MEMORY_FEATURES_CHANGED_EVENT, sync);
  }, [memoryId, ownerPersonId]);

  const toggle = () => {
    if (saved) {
      memoryFeaturesApi.removeFavorite(ownerPersonId, memoryId);
    } else {
      memoryFeaturesApi.addFavorite(ownerPersonId, memoryId);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.96 }}
      animate={saved ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.36 }}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[13px] font-bold shadow-soft",
        saved ? "bg-clay" : "bg-raised",
        className,
      )}
      aria-pressed={saved}
    >
      <Heart
        className={cn("size-4", saved && "fill-current")}
        strokeWidth={1.8}
      />
      {saved ? t("favoriteSaved") : t("saveToMyMemories")}
    </motion.button>
  );
}
