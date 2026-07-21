import type { Person, Story } from "@/lib/types";
import { people } from "./people";
import { stories } from "./stories";

export { people, stories };

export const narrator: Person = people.find((p) => p.isNarrator)!;

export function getPerson(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

export function getStory(id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}

/** Stories a person appears in. The narrator appears in all — she tells them. */
export function storiesForPerson(personId: string): Story[] {
  if (personId === narrator.id) return stories;
  return stories.filter((s) => s.mentions.includes(personId));
}

export function peopleInStory(story: Story): Person[] {
  return story.mentions
    .map((id) => getPerson(id))
    .filter((p): p is Person => p !== undefined);
}
