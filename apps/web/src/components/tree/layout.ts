import { getPerson } from "@/data";
import { childrenOf, parentsOf, siblingsOf, spouseOf } from "@/data/family";
import type { Person } from "@/lib/types";

export const CARD_WIDTH = 176;
export const CARD_HEIGHT = 108;
const COLUMN_WIDTH = 256;
const ROW = 136;
const PAIR_GAP = 200;

export type NodeRole =
  | "center"
  | "spouse"
  | "sibling"
  | "parent"
  | "grandparent"
  | "child"
  | "grandchild";

export interface FamilyGraphNode {
  id: string;
  person: Person;
  x: number;
  y: number;
  role: NodeRole;
  canExpandAncestors?: boolean;
  ancestorsExpanded?: boolean;
  canExpandDescendants?: boolean;
  descendantsExpanded?: boolean;
}

export interface FamilyGraphEdge {
  id: string;
  d: string;
  kind: "lineage" | "marriage";
  /** When this edge should start drawing, so outer branches grow last. */
  delay: number;
}

export interface FamilyGraph {
  nodes: FamilyGraphNode[];
  edges: FamilyGraphEdge[];
}

/** Spreads ids evenly across `rowGap`, centered on y = 0. */
function stackColumn(ids: string[], rowGap: number): Record<string, number> {
  const n = ids.length;
  const y: Record<string, number> = {};
  ids.forEach((id, i) => {
    y[id] = -((n - 1) / 2) * rowGap + i * rowGap;
  });
  return y;
}

/** Same spread, shifted so `anchorId` lands exactly on y = 0. */
function stackCentered(
  ids: string[],
  anchorId: string,
  rowGap: number,
): Record<string, number> {
  const raw = stackColumn(ids, rowGap);
  const offset = raw[anchorId] ?? 0;
  const y: Record<string, number> = {};
  for (const id of ids) y[id] = raw[id] - offset;
  return y;
}

const rightEdge = (x: number) => x + CARD_WIDTH / 2;
const leftEdge = (x: number) => x - CARD_WIDTH / 2;

interface Anchor {
  id: string;
  x: number;
  y: number;
}

/** An organic root-like curve between two card edges. */
function lineageEdge(from: Anchor, to: Anchor): FamilyGraphEdge {
  const fromX = rightEdge(from.x);
  const fromY = from.y;
  const toX = leftEdge(to.x);
  const toY = to.y;
  const pull = Math.max(Math.abs(toX - fromX) * 0.55, 64);
  const outer = Math.abs(from.x) > Math.abs(to.x) ? from : to;
  return {
    id: `${from.id}-${to.id}`,
    kind: "lineage",
    d: `M ${fromX} ${fromY} C ${fromX + pull} ${fromY}, ${toX - pull} ${toY}, ${toX} ${toY}`,
    delay: distanceDelay(outer.x, outer.y),
  };
}

/** A short, near-straight bond between two side-by-side cards. */
function marriageEdge(centerX: number, spouseX: number): FamilyGraphEdge {
  const fromX = rightEdge(centerX);
  const toX = leftEdge(spouseX);
  const midY = -10;
  return {
    id: "marriage",
    kind: "marriage",
    d: `M ${fromX} 0 Q ${(fromX + toX) / 2} ${midY}, ${toX} 0`,
    delay: 0.18,
  };
}

/**
 * Builds the whole visible graph for a person-centric family tree: the
 * center stays pinned to (0, 0), parents/grandparents grow left, children/
 * grandchildren grow right, spouse sits beside, siblings stack around the
 * center. Grandparents and grandchildren only appear once their connecting
 * parent/child has been expanded.
 */
export function computeFamilyGraph(
  centerId: string,
  expandedAncestors: ReadonlySet<string>,
  expandedDescendants: ReadonlySet<string>,
): FamilyGraph {
  const center = getPerson(centerId);
  if (!center) return { nodes: [], edges: [] };

  const nodes: FamilyGraphNode[] = [];
  const edges: FamilyGraphEdge[] = [];

  // Column 0 — center, siblings stacked around it (center pinned to y = 0).
  const siblings = siblingsOf(centerId);
  const col0Ids = [...siblings.map((s) => s.id), centerId].sort(
    (a, b) => getPerson(a)!.born - getPerson(b)!.born,
  );
  const col0Y = stackCentered(col0Ids, centerId, ROW);
  for (const id of col0Ids) {
    nodes.push({
      id,
      person: getPerson(id)!,
      x: 0,
      y: col0Y[id],
      role: id === centerId ? "center" : "sibling",
    });
  }

  const spouse = spouseOf(centerId);
  if (spouse) {
    nodes.push({ id: spouse.id, person: spouse, x: PAIR_GAP, y: 0, role: "spouse" });
    edges.push(marriageEdge(0, PAIR_GAP));
  }

  // Columns -1 / -2 — parents, then grandparents of any expanded parent.
  const parents = parentsOf(centerId);
  if (parents.length > 0) {
    const parentIds = parents.map((p) => p.id);
    const parentY = stackColumn(parentIds, ROW);

    for (const parent of parents) {
      nodes.push({
        id: parent.id,
        person: parent,
        x: -COLUMN_WIDTH,
        y: parentY[parent.id],
        role: "parent",
        canExpandAncestors: parentsOf(parent.id).length > 0,
        ancestorsExpanded: expandedAncestors.has(parent.id),
      });
      for (const id of col0Ids) {
        edges.push(
          lineageEdge(
            { id: parent.id, x: -COLUMN_WIDTH, y: parentY[parent.id] },
            { id, x: 0, y: col0Y[id] },
          ),
        );
      }
    }

    const grandparents: { person: Person; viaId: string; viaY: number }[] = [];
    for (const parent of parents) {
      if (!expandedAncestors.has(parent.id)) continue;
      for (const gp of parentsOf(parent.id)) {
        grandparents.push({ person: gp, viaId: parent.id, viaY: parentY[parent.id] });
      }
    }
    if (grandparents.length > 0) {
      const gpY = stackColumn(grandparents.map((g) => g.person.id), ROW);
      for (const gp of grandparents) {
        nodes.push({
          id: gp.person.id,
          person: gp.person,
          x: -2 * COLUMN_WIDTH,
          y: gpY[gp.person.id],
          role: "grandparent",
        });
        edges.push(
          lineageEdge(
            { id: gp.person.id, x: -2 * COLUMN_WIDTH, y: gpY[gp.person.id] },
            { id: gp.viaId, x: -COLUMN_WIDTH, y: gp.viaY },
          ),
        );
      }
    }
  }

  // Columns +1 / +2 — children, then grandchildren of any expanded child.
  const childrenX = (spouse ? PAIR_GAP : 0) + COLUMN_WIDTH;
  const children = childrenOf(centerId);
  if (children.length > 0) {
    const childIds = children.map((c) => c.id);
    const childY = stackColumn(childIds, ROW);

    for (const child of children) {
      nodes.push({
        id: child.id,
        person: child,
        x: childrenX,
        y: childY[child.id],
        role: "child",
        canExpandDescendants: childrenOf(child.id).length > 0,
        descendantsExpanded: expandedDescendants.has(child.id),
      });
      edges.push(
        lineageEdge(
          { id: centerId, x: 0, y: 0 },
          { id: child.id, x: childrenX, y: childY[child.id] },
        ),
      );
    }

    const grandchildren: { person: Person; viaId: string; viaY: number }[] = [];
    for (const child of children) {
      if (!expandedDescendants.has(child.id)) continue;
      for (const gc of childrenOf(child.id)) {
        grandchildren.push({ person: gc, viaId: child.id, viaY: childY[child.id] });
      }
    }
    if (grandchildren.length > 0) {
      const gcY = stackColumn(grandchildren.map((g) => g.person.id), ROW);
      for (const gc of grandchildren) {
        nodes.push({
          id: gc.person.id,
          person: gc.person,
          x: childrenX + COLUMN_WIDTH,
          y: gcY[gc.person.id],
          role: "grandchild",
        });
        edges.push(
          lineageEdge(
            { id: gc.viaId, x: childrenX, y: gc.viaY },
            { id: gc.person.id, x: childrenX + COLUMN_WIDTH, y: gcY[gc.person.id] },
          ),
        );
      }
    }
  }

  return { nodes, edges };
}

/** Stagger delay based on distance from the center, so the tree grows outward. */
export function distanceDelay(x: number, y: number): number {
  const columns = Math.abs(x) / COLUMN_WIDTH;
  const rows = Math.abs(y) / ROW;
  return 0.1 + columns * 0.12 + rows * 0.03;
}
