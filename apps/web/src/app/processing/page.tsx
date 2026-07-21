import type { Metadata } from "next";
import { Suspense } from "react";
import { ProcessingView } from "@/components/processing/processing-view";

export const metadata: Metadata = { title: "Understanding your story" };

export default function ProcessingPage() {
  return (
    <Suspense>
      <ProcessingView />
    </Suspense>
  );
}
