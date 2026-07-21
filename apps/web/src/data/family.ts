import { getPerson, people } from "./index";
import type { Person } from "@/lib/types";

const byBornAscending = (a: Person, b: Person) => a.born - b.born;

export function parentsOf(personId: string): Person[] {
  const person = getPerson(personId);
  if (!person) return [];
  return person.parentIds.map((id) => getPerson(id)).filter((p): p is Person => !!p);
}

export function childrenOf(personId: string): Person[] {
  return people.filter((p) => p.parentIds.includes(personId)).sort(byBornAscending);
}

/** People who share at least one parent with this person. */
export function siblingsOf(personId: string): Person[] {
  const person = getPerson(personId);
  if (!person || person.parentIds.length === 0) return [];
  return people
    .filter((p) => p.id !== personId && p.parentIds.some((id) => person.parentIds.includes(id)))
    .sort(byBornAscending);
}

export function spouseOf(personId: string): Person | undefined {
  const person = getPerson(personId);
  return person?.spouseId ? getPerson(person.spouseId) : undefined;
}

const possessive = (gender: Person["gender"], m: string, f: string) =>
  gender === "m" ? m : f;

/**
 * How `target` relates to `center` — “Father”, “Granddaughter”, etc. Falls
 * back to the target’s narrator-perspective `relation` field when the pair
 * isn’t within the relations the tree renders (parent/child/spouse/sibling/
 * grandparent/grandchild), which is more than enough for this family.
 */
export function relationLabel(centerId: string, targetId: string): string {
  const center = getPerson(centerId);
  const target = getPerson(targetId);
  if (!center || !target) return "";

  if (target.parentIds.includes(centerId)) return possessive(target.gender, "Son", "Daughter");
  if (center.parentIds.includes(targetId)) return possessive(target.gender, "Father", "Mother");
  if (center.spouseId === targetId) return possessive(target.gender, "Husband", "Wife");
  if (
    center.parentIds.length > 0 &&
    center.parentIds.some((id) => target.parentIds.includes(id))
  ) {
    return possessive(target.gender, "Brother", "Sister");
  }

  const centerParents = parentsOf(centerId);
  if (centerParents.some((p) => p.parentIds.includes(targetId))) {
    return possessive(target.gender, "Grandfather", "Grandmother");
  }

  const targetParents = parentsOf(targetId);
  if (targetParents.some((p) => p.parentIds.includes(centerId))) {
    return possessive(target.gender, "Grandson", "Granddaughter");
  }

  return target.relation;
}
