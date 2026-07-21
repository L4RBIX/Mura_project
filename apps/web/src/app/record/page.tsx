import type { Metadata } from "next";
import { RecordView } from "@/components/record/record-view";

export const metadata: Metadata = { title: "New memory" };

export default function RecordPage() {
  return <RecordView />;
}
