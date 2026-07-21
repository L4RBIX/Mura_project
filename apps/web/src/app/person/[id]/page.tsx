import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonView } from "@/components/person/person-view";
import { getPerson, people } from "@/data";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return people.map((person) => ({ id: person.id }));
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getPerson(id)?.name ?? "Person" };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) notFound();
  return <PersonView person={person} />;
}
