"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FavoriteMemoryCard } from "@/components/favorites/favorite-memory-card";
import { ScreenHeader } from "@/components/layout/screen-header";
import { MEMORY_FEATURES_CHANGED_EVENT } from "@/lib/memory-features-api";
import { memoryFeaturesApi } from "@/lib/memory-features-store";
import { useMuraI18n } from "@/lib/i18n";
import {
  getSavedMemory,
  savedMemoryToStory,
} from "@/lib/memory-store";
import type { Person, Story } from "@/lib/types";

interface FavoriteViewModel {
  story: Story;
  narratorName: string;
  mentioned: Person[];
  photoCount: number;
}

export function FavoritesView() {
  const {
    getPerson,
    getStory,
    narrator,
    people,
    t,
  } = useMuraI18n();
  const [memories, setMemories] = useState<FavoriteViewModel[]>([]);
  const [query, setQuery] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [photoFilter, setPhotoFilter] = useState<"all" | "photos">("all");
  const [loaded, setLoaded] = useState(false);

  const resolveFavorites = useCallback(async () => {
    const references = memoryFeaturesApi.listFavorites(narrator.id);
    const resolved = await Promise.all(
      references.map(async (reference): Promise<FavoriteViewModel | null> => {
        const localMemory = getSavedMemory(reference.memoryId);
        const story = localMemory
          ? savedMemoryToStory(localMemory)
          : getStory(reference.memoryId);
        if (!story) return null;
        const mentioned = localMemory
          ? people.filter((person) => {
              const names = new Set(
                [person.name, person.nativeName].map((name) =>
                  name.trim().toLocaleLowerCase(),
                ),
              );
              return localMemory.people.some((entry) =>
                names.has(entry.name.trim().toLocaleLowerCase()),
              );
            })
          : story.mentions
              .map((id) => getPerson(id))
              .filter((person): person is Person => person !== undefined);
        const photos = await memoryFeaturesApi.listPhotos(story.id);
        const storyNarrator = getPerson(story.narratorId);
        return {
          story,
          narratorName:
            localMemory?.narratorName || storyNarrator?.name || narrator.name,
          mentioned,
          photoCount: photos.length,
        };
      }),
    );
    setMemories(
      resolved.filter(
        (memory): memory is FavoriteViewModel => memory !== null,
      ),
    );
    setLoaded(true);
  }, [getPerson, getStory, narrator.id, narrator.name, people]);

  useEffect(() => {
    void resolveFavorites();
    const handleChange = () => void resolveFavorites();
    window.addEventListener(MEMORY_FEATURES_CHANGED_EVENT, handleChange);
    return () =>
      window.removeEventListener(MEMORY_FEATURES_CHANGED_EVENT, handleChange);
  }, [resolveFavorites]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return memories.filter((memory) => {
      if (photoFilter === "photos" && memory.photoCount === 0) return false;
      if (
        personFilter !== "all" &&
        !memory.mentioned.some((person) => person.id === personFilter)
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        memory.story.title,
        memory.story.excerpt,
        memory.narratorName,
        ...memory.mentioned.flatMap((person) => [
          person.name,
          person.nativeName,
        ]),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [memories, personFilter, photoFilter, query]);

  const remove = (memoryId: string) => {
    memoryFeaturesApi.removeFavorite(narrator.id, memoryId);
  };

  return (
    <div className="pb-20">
      <ScreenHeader title={t("favoriteMemories")} fallbackHref="/home" />
      <motion.div
        className="px-6 pt-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]">
          {t("favoriteMemories")}
        </h1>

        <div className="relative mt-7">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchFavorites")}
            className="h-12 w-full rounded-full bg-raised pl-11 pr-4 text-[14px] shadow-soft outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/10"
          />
        </div>

        <div className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterButton
            active={photoFilter === "all"}
            onClick={() => setPhotoFilter("all")}
          >
            {t("allMemories")}
          </FilterButton>
          <FilterButton
            active={photoFilter === "photos"}
            onClick={() => setPhotoFilter("photos")}
          >
            {t("withPhotos")}
          </FilterButton>
          <select
            value={personFilter}
            onChange={(event) => setPersonFilter(event.target.value)}
            aria-label={t("filterByPerson")}
            className="h-10 shrink-0 appearance-none rounded-full bg-sand px-4 text-[12px] font-semibold outline-none"
          >
            <option value="all">{t("allPeople")}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        {loaded && filtered.length > 0 && (
          <div className="mt-7 space-y-5">
            {filtered.map((memory) => (
              <FavoriteMemoryCard
                key={memory.story.id}
                story={memory.story}
                narratorName={memory.narratorName}
                mentionedNames={memory.mentioned.map((person) => person.name)}
                onRemove={() => remove(memory.story.id)}
              />
            ))}
          </div>
        )}

        {loaded && filtered.length === 0 && (
          <p className="mt-14 text-center text-[15px] leading-relaxed text-muted">
            {memories.length === 0
              ? t("noFavoriteMemories")
              : t("noFavoriteResults")}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-10 shrink-0 rounded-full bg-ink px-4 text-[12px] font-semibold text-raised"
          : "h-10 shrink-0 rounded-full bg-raised px-4 text-[12px] font-semibold text-muted shadow-soft"
      }
    >
      {children}
    </button>
  );
}
