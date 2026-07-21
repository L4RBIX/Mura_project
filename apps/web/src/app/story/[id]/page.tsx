import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryView } from "@/components/story/story-view";
import { getStory, stories } from "@/data";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return stories.map((story) => ({ id: story.id }));
}

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getStory(id)?.title ?? "Memory" };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const story = getStory(id);
  if (!story) notFound();
  return <StoryView story={story} />;
}
