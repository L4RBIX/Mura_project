"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePanZoom } from "@/hooks/use-pan-zoom";
import { useMuraI18n } from "@/lib/i18n";
import { computeFamilyGraph } from "./layout";
import { OrganicEdge } from "./organic-edge";
import { PersonCard } from "./person-card";
import { PersonSheet } from "./person-sheet";

interface TreeCanvasProps {
  centerId: string;
  onCenterChange: (id: string) => void;
}

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function TreeCanvas({ centerId, onCenterChange }: TreeCanvasProps) {
  const { relationLabel, getPerson, t } = useMuraI18n();
  const { containerRef, x, y, scale, recenter, handlers } = usePanZoom();
  const [expandedAncestors, setExpandedAncestors] = useState<Set<string>>(new Set());
  const [expandedDescendants, setExpandedDescendants] = useState<Set<string>>(new Set());
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);

  // Every time the focused person changes, the graph rebuilds around them —
  // fold any open branches back in and glide the viewport home.
  useEffect(() => {
    setExpandedAncestors(new Set());
    setExpandedDescendants(new Set());
    recenter(0, 0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const { nodes, edges } = useMemo(() => {
    const graph = computeFamilyGraph(centerId, expandedAncestors, expandedDescendants);
    return {
      ...graph,
      nodes: graph.nodes.map((node) => ({
        ...node,
        person: getPerson(node.id) ?? node.person,
      })),
    };
  },
    [centerId, expandedAncestors, expandedDescendants, getPerson],
  );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none select-none overflow-hidden [-webkit-tap-highlight-color:transparent]"
        onDoubleClick={() => recenter(0, 0, 1)}
        {...handlers}
      >
        <motion.div
          className="absolute left-0 top-0"
          style={{ x, y, scale, transformOrigin: "0 0" }}
        >
          <svg className="absolute overflow-visible" width={1} height={1} aria-hidden>
            <AnimatePresence>
              {edges.map((edge) => (
                <OrganicEdge key={`${centerId}:${edge.id}`} edge={edge} />
              ))}
            </AnimatePresence>
          </svg>

          <AnimatePresence>
            {nodes.map((node) => (
              <PersonCard
                key={`${centerId}:${node.id}`}
                node={node}
                relationLabel={
                  node.role === "center"
                    ? node.person.relation
                    : relationLabel(centerId, node.id)
                }
                onOpen={setOpenPersonId}
                onToggleAncestors={(id) => setExpandedAncestors((prev) => toggle(prev, id))}
                onToggleDescendants={(id) => setExpandedDescendants((prev) => toggle(prev, id))}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => recenter(0, 0, 1)}
        aria-label={t("centerTree")}
        className="absolute bottom-5 right-5 z-10 flex size-12 items-center justify-center rounded-full bg-raised text-ink shadow-card transition-transform duration-200 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
      >
        <LocateFixed className="size-5" strokeWidth={1.8} />
      </button>

      <PersonSheet
        personId={openPersonId}
        centerId={centerId}
        onClose={() => setOpenPersonId(null)}
        onCenter={onCenterChange}
      />
    </div>
  );
}
