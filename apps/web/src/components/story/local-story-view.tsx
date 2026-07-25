"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { FavoriteMemoryButton } from "@/components/story/favorite-memory-button";
import { MemoryPhotoGallery } from "@/components/story/memory-photo-gallery";
import { TranscriptReader } from "@/components/story/transcript-reader";
import { formatDuration } from "@/lib/format";
import {
  useMuraI18n,
  type TranslationKey,
} from "@/lib/i18n";
import {
  getMemoryAudio,
  getSavedMemory,
  updateSavedMemory,
  type SavedMemory,
} from "@/lib/memory-store";
import {
  selectPrimaryStory,
} from "@/lib/mura-integration";
import type {
  PersonCategory,
  PersonRole,
  RelationshipType,
  ReviewKind,
} from "@/lib/mura-api-types";

const categoryKeys: Record<PersonCategory, TranslationKey> = {
  family_member: "categoryFamilyMember",
  friend: "categoryFriend",
  other: "categoryOther",
  unknown: "categoryUnknown",
};

const relationshipKeys: Record<RelationshipType, TranslationKey> = {
  parent_child: "relationshipParentChild",
  spouse: "relationshipSpouse",
  sibling: "relationshipSibling",
  other: "relationshipOther",
};

const roleKeys: Record<PersonRole, TranslationKey> = {
  parent: "roleParent",
  child: "roleChild",
  spouse: "roleSpouse",
  sibling: "roleSibling",
  older_sibling: "roleOlderSibling",
  younger_sibling: "roleYoungerSibling",
  unknown: "roleUnknown",
};

const reviewKeys: Record<ReviewKind, TranslationKey> = {
  ambiguity: "reviewAmbiguity",
  conflict: "reviewConflict",
  missing_evidence: "reviewMissingEvidence",
  other: "reviewOther",
};

function Badge({
  children,
  tone = "sand",
}: {
  children: React.ReactNode;
  tone?: "sand" | "clay";
}) {
  return (
    <span
      className={
        tone === "clay"
          ? "rounded-full bg-clay px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
          : "rounded-full bg-sand px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
      }
    >
      {children}
    </span>
  );
}

function EvidenceLinks({
  ids,
  label,
  onSelect,
}: {
  ids: readonly string[];
  label: string;
  onSelect: (segmentId: string) => void;
}) {
  if (!ids.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="rounded-full bg-raised px-2.5 py-1 text-[11px] font-semibold text-ink/75 shadow-soft transition-transform active:scale-95"
        >
          {id}
        </button>
      ))}
    </div>
  );
}

export function LocalStoryView({ memoryId }: { memoryId: string }) {
  const { locale, narrator, t } = useMuraI18n();
  const router = useRouter();
  const [memory, setMemory] = useState<SavedMemory | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const current = getSavedMemory(memoryId);
    setMemory(current);
    if (!current) {
      setLoaded(true);
      return;
    }
    void getMemoryAudio(memoryId)
      .then((audio) => {
        if (!active || !audio) return;
        setAudioUrl(URL.createObjectURL(audio));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [memoryId]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    },
    [audioUrl],
  );

  const recordedAt = useMemo(() => {
    if (!memory) return "";
    return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(memory.createdAt));
  }, [locale, memory]);

  const extraction = memory?.extraction;
  const primaryStory = extraction ? selectPrimaryStory(extraction) : null;
  const additionalStories = extraction
    ? extraction.stories.filter((story) => story.story_id !== primaryStory?.story_id)
    : [];
  const personNames = useMemo(
    () => new Map(extraction?.people.map((person) => [person.person_id, person.name]) ?? []),
    [extraction],
  );
  const needsReview = Boolean(
    primaryStory?.needs_review ||
      extraction?.people.some((person) => person.needs_review) ||
      extraction?.relationships.some((relationship) => relationship.needs_review) ||
      extraction?.events.some((event) => event.needs_review) ||
      extraction?.review_items.length,
  );

  const focusEvidence = (segmentId: string) => {
    const element = document.getElementById(`transcript-${segmentId}`);
    if (!element) return;
    setHighlightedSegment(segmentId);
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(
      () => setHighlightedSegment(null),
      2200,
    );
  };

  const retryAnalysis = () => {
    if (!memory?.extractionRequest?.segments.length || retrying) return;
    setRetrying(true);
    const extracting: SavedMemory = {
      ...memory,
      status: "extracting",
      extractionError: undefined,
    };
    updateSavedMemory(extracting);
    setMemory(extracting);
    router.push(`/processing?memory=${encodeURIComponent(memory.id)}`);
  };

  if (!loaded) return null;
  if (!memory) {
    return (
      <div>
        <ScreenHeader title={t("memory")} fallbackHref="/home" />
        <p className="px-6 pt-16 text-center text-muted">{t("memoryNotFound")}</p>
      </div>
    );
  }

  const errorMessage = memory.extractionError
    ? localizedError(memory.extractionError.code, t)
    : "";

  return (
    <div className="pb-20">
      <ScreenHeader title={t("memory")} fallbackHref="/home" />
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-2"
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
          {recordedAt}
        </p>
        <h1 className="mt-2 text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">
          {memory.title}
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          {t("narratorLabel")}: {memory.narratorName || narrator.name}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-muted">
            {formatDuration(memory.durationSec)}
          </span>
          <Badge>{t("privateBadge")}</Badge>
          {needsReview && <Badge tone="clay">{t("needsReview")}</Badge>}
          {extraction?.languages.map((language) => (
            <Badge key={language}>{language}</Badge>
          ))}
        </div>

        <FavoriteMemoryButton
          memoryId={memory.id}
          ownerPersonId={narrator.id}
          className="mt-6"
        />

        {audioUrl && (
          <div className="mt-7 rounded-[28px] bg-raised p-5 shadow-card">
            <audio className="w-full" controls preload="metadata" src={audioUrl}>
              <track kind="captions" />
            </audio>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {t("audioFileLabel")}
                </p>
                <p className="truncate text-[12px] text-ink/75">
                  {memory.audioFileName}
                </p>
              </div>
              <a
                href={audioUrl}
                download={memory.audioFileName}
                className="flex shrink-0 items-center gap-2 rounded-full bg-sand px-4 py-2 text-[12px] font-bold transition-transform active:scale-95"
              >
                <Download className="size-3.5" />
                {t("downloadAudio")}
              </a>
            </div>
          </div>
        )}

        {memory.status === "audio_only" && (
          <section className="mt-7 rounded-[24px] bg-sand p-5">
            <p className="text-[15px] font-medium leading-relaxed">
              {t("audioOnlyNotice")}
            </p>
          </section>
        )}

        {memory.status === "extracting" && (
          <section className="mt-7 rounded-[24px] bg-sand p-5">
            <p className="text-[15px] font-medium">{t("analysisInProgress")}</p>
            <button
              type="button"
              disabled={retrying || !memory.extractionRequest?.segments.length}
              onClick={retryAnalysis}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-raised transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {retrying ? t("retryingAnalysis") : t("resumeAnalysis")}
            </button>
          </section>
        )}

        {memory.status === "failed" && (
          <section className="mt-7 rounded-[24px] bg-clay/70 p-5">
            <h2 className="text-[17px] font-bold">{t("analysisFailedTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed">{errorMessage}</p>
            {memory.extractionError && (
              <p className="mt-2 text-[11px] text-muted">
                {t("technicalCode")}: {memory.extractionError.code}
              </p>
            )}
            <button
              type="button"
              disabled={retrying || !memory.extractionRequest?.segments.length}
              onClick={retryAnalysis}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-raised transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {retrying ? t("retryingAnalysis") : t("retryAnalysis")}
            </button>
          </section>
        )}

        <section className="mt-10 rounded-[28px] bg-clay/55 p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("aiSummary")}
          </h2>
          <p className="mt-3 text-[18px] font-medium leading-relaxed">
            {memory.summary}
          </p>
          {primaryStory && (
            <EvidenceLinks
              ids={primaryStory.evidence_segment_ids}
              label={t("evidenceLabel")}
              onSelect={focusEvidence}
            />
          )}
        </section>

        <MemoryPhotoGallery memoryId={memory.id} />

        {extraction && extraction.people.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("peopleSection")}</SectionTitle>
            <div className="mt-4 space-y-3">
              {extraction.people.map((person) => (
                <div key={person.person_id} className="rounded-[24px] bg-raised p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[18px] font-bold">{person.name}</h3>
                      {person.relation_to_speaker && (
                        <p className="mt-1 text-[13px] text-muted">
                          {person.relation_to_speaker}
                        </p>
                      )}
                    </div>
                    {person.needs_review && <Badge tone="clay">{t("needsReview")}</Badge>}
                  </div>
                  <p className="mt-3 text-[13px] text-ink/75">
                    {t("categoryLabel")}: {t(categoryKeys[person.category])}
                  </p>
                  {person.aliases.length > 0 && (
                    <p className="mt-1 text-[13px] text-ink/75">
                      {t("aliasesLabel")}: {person.aliases.join(", ")}
                    </p>
                  )}
                  <EvidenceLinks
                    ids={person.evidence_segment_ids}
                    label={t("evidenceLabel")}
                    onSelect={focusEvidence}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {extraction && extraction.relationships.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("relationshipsSection")}</SectionTitle>
            <div className="mt-4 space-y-3">
              {extraction.relationships.map((relationship) => (
                <div
                  key={relationship.relationship_id}
                  className="rounded-[24px] bg-raised p-5 shadow-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-[16px] font-bold">
                      {personNames.get(relationship.person_a_id) ?? relationship.person_a_id}
                      {" ↔ "}
                      {personNames.get(relationship.person_b_id) ?? relationship.person_b_id}
                    </h3>
                    {relationship.needs_review && (
                      <Badge tone="clay">{t("needsReview")}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] text-ink/75">
                    {t(relationshipKeys[relationship.relationship_type])}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {personNames.get(relationship.person_a_id) ?? relationship.person_a_id}
                    {" · "}
                    {t(roleKeys[relationship.person_a_role])}
                    {" — "}
                    {personNames.get(relationship.person_b_id) ?? relationship.person_b_id}
                    {" · "}
                    {t(roleKeys[relationship.person_b_role])}
                  </p>
                  <EvidenceLinks
                    ids={relationship.evidence_segment_ids}
                    label={t("evidenceLabel")}
                    onSelect={focusEvidence}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {extraction && extraction.events.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("timeline")}</SectionTitle>
            <div className="mt-4 space-y-3">
              {extraction.events.map((event) => {
                const participants = event.participant_person_ids.map(
                  (id) => personNames.get(id) ?? id,
                );
                return (
                  <div key={event.event_id} className="rounded-[24px] bg-raised p-5 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-[18px] font-bold">{event.title}</h3>
                      {event.needs_review && <Badge tone="clay">{t("needsReview")}</Badge>}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink/80">
                      {event.description}
                    </p>
                    {event.date_text && (
                      <p className="mt-3 text-[13px] text-muted">
                        {t("dateLabel")}: {event.date_text}
                      </p>
                    )}
                    {event.location && (
                      <p className="mt-1 text-[13px] text-muted">
                        {t("locationLabel")}: {event.location}
                      </p>
                    )}
                    {participants.length > 0 && (
                      <p className="mt-1 text-[13px] text-muted">
                        {t("participantsLabel")}: {participants.join(", ")}
                      </p>
                    )}
                    <EvidenceLinks
                      ids={event.evidence_segment_ids}
                      label={t("evidenceLabel")}
                      onSelect={focusEvidence}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {additionalStories.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("otherStoriesSection")}</SectionTitle>
            <div className="mt-4 space-y-3">
              {additionalStories.map((story) => (
                <div key={story.story_id} className="rounded-[24px] bg-sand/75 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-[18px] font-bold">{story.title}</h3>
                    {story.needs_review && <Badge tone="clay">{t("needsReview")}</Badge>}
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed">{story.summary}</p>
                  <EvidenceLinks
                    ids={story.evidence_segment_ids}
                    label={t("evidenceLabel")}
                    onSelect={focusEvidence}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {extraction && extraction.review_items.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("reviewItemsSection")}</SectionTitle>
            <div className="mt-4 space-y-3">
              {extraction.review_items.map((item) => (
                <div key={item.review_id} className="rounded-[24px] bg-clay/50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t(reviewKeys[item.kind])}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed">{item.message}</p>
                  <EvidenceLinks
                    ids={item.segment_ids}
                    label={t("evidenceLabel")}
                    onSelect={focusEvidence}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <SectionTitle>{t("transcript")}</SectionTitle>
          <div className="mt-4">
            {memory.extractionRequest?.segments.length ? (
              <div className="space-y-4">
                {memory.extractionRequest.segments.map((segment) => (
                  <article
                    key={segment.segment_id}
                    id={`transcript-${segment.segment_id}`}
                    className={`scroll-mt-20 rounded-[22px] p-4 transition-all duration-500 ${
                      highlightedSegment === segment.segment_id
                        ? "bg-clay shadow-card ring-2 ring-ink/15"
                        : "bg-raised/70"
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                      {segment.segment_id}
                    </p>
                    <p className="mt-2 text-[18px] leading-relaxed text-ink/90">
                      {segment.text}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <TranscriptReader
                paragraphs={[memory.transcript || t("transcriptUnavailable")]}
              />
            )}
          </div>
        </section>

        {!extraction && memory.people.length > 0 && (
          <section className="mt-12">
            <SectionTitle>{t("inThisMemory")}</SectionTitle>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {memory.people.map((person, index) => (
                <span
                  key={`${person.name}-${index}`}
                  className="rounded-full bg-raised px-4 py-2 text-[14px] font-semibold shadow-soft"
                >
                  {person.name}
                  {person.relationship ? ` · ${person.relationship}` : ""}
                </span>
              ))}
            </div>
          </section>
        )}
      </motion.article>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
      {children}
    </h2>
  );
}

function localizedError(
  code: string,
  t: (key: TranslationKey) => string,
): string {
  const errorKeys: Record<string, TranslationKey> = {
    backend_not_configured: "errorBackendNotConfigured",
    backend_unreachable: "errorBackendUnreachable",
    proxy_unreachable: "errorBackendUnreachable",
    backend_timeout: "errorBackendTimeout",
    backend_unauthorized: "errorBackendUnauthorized",
    unauthorized: "errorBackendUnauthorized",
    invalid_model_response: "errorInvalidModelResponse",
    invalid_request: "errorInvalidRequest",
    provider_error: "errorProviderUnavailable",
    repair_failed: "errorRepairFailed",
    internal_error: "errorUnexpected",
    backend_error: "errorUnexpected",
    unexpected_error: "errorUnexpected",
  };
  return t(errorKeys[code] ?? "errorUnexpected");
}
