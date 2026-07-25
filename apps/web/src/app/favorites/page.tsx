import type { Metadata } from "next";
import { FavoritesView } from "@/components/favorites/favorites-view";

export const metadata: Metadata = {
  title: "Favorite Memories",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
