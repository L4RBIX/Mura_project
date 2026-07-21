"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useMuraI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CARD_HEIGHT, CARD_WIDTH, distanceDelay, type FamilyGraphNode } from "./layout";

interface PersonCardProps {
  node: FamilyGraphNode;
  relationLabel: string;
  onOpen: (id: string) => void;
  onToggleAncestors?: (id: string) => void;
  onToggleDescendants?: (id: string) => void;
}

export function PersonCard({
  node,
  relationLabel,
  onOpen,
  onToggleAncestors,
  onToggleDescendants,
}: PersonCardProps) {
  const { storiesForPerson, t } = useMuraI18n();
  const { person, role, x, y } = node;
  const isCenter = role === "center";
  const memoryCount = storiesForPerson(person.id).length;

  return (
    <motion.div
      layout
      className="absolute"
      style={{
        left: x - CARD_WIDTH / 2,
        top: y - CARD_HEIGHT / 2,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
        delay: distanceDelay(x, y),
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(person.id)}
        onPointerUp={(e) => e.stopPropagation()}
        className={cn(
          "flex size-full flex-col justify-between rounded-[26px] px-4 py-3.5 text-left shadow-soft transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40",
          isCenter ? "bg-ink text-raised" : "bg-raised text-ink",
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className="relative shrink-0">
            <InitialsAvatar person={person} size={40} />
            {memoryCount > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 size-[9px] animate-glow rounded-full bg-clay"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">
              {person.name}
            </span>
            <span
              className={cn(
                "block truncate text-[11.5px]",
                isCenter ? "text-raised/55" : "text-muted",
              )}
            >
              {relationLabel}
            </span>
          </span>
        </span>
        <span className={cn("text-[11px]", isCenter ? "text-raised/45" : "text-muted/80")}>
          {memoryCount === 0
            ? t("noMemoriesYet")
            : memoryCount === 1
              ? t("oneMemory")
              : t("memoriesCount", { count: memoryCount })}
        </span>
      </button>

      {node.canExpandAncestors && (
        <ExpandTab
          side="left"
          expanded={!!node.ancestorsExpanded}
          label={t(node.ancestorsExpanded ? "hideParents" : "showParents", { name: person.name })}
          onClick={() => onToggleAncestors?.(person.id)}
        />
      )}
      {node.canExpandDescendants && (
        <ExpandTab
          side="right"
          expanded={!!node.descendantsExpanded}
          label={t(node.descendantsExpanded ? "hideChildren" : "showChildren", { name: person.name })}
          onClick={() => onToggleDescendants?.(person.id)}
        />
      )}
    </motion.div>
  );
}

function ExpandTab({
  side,
  expanded,
  label,
  onClick,
}: {
  side: "left" | "right";
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={expanded}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerUp={(e) => e.stopPropagation()}
      className={cn(
        "absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-soft transition-[transform,background-color] duration-200 active:scale-90",
        side === "left" ? "-left-4" : "-right-4",
        expanded ? "bg-clay text-ink" : "bg-paper text-ink/70",
      )}
    >
      <Icon className="size-4" strokeWidth={2.25} />
    </button>
  );
}
