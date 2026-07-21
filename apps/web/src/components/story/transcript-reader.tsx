"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Highlight } from "@/components/ui/highlight";
import { useMuraI18n } from "@/lib/i18n";
import { parseMentions } from "@/lib/transcript";

/**
 * The notebook page: large calm type, with every family member’s name under
 * a highlighter mark that opens their person card.
 */
export function TranscriptReader({ paragraphs }: { paragraphs: string[] }) {
  const { getPerson, people } = useMuraI18n();
  return (
    <div className="space-y-6">
      {paragraphs.map((paragraph, i) => (
        <p
          key={i}
          className="text-[20px] leading-[1.7] tracking-[-0.01em] text-ink/90"
        >
          {parseMentions(paragraph, people).map((segment, j) =>
            segment.personId ? (
              <Link
                key={j}
                href={`/person/${segment.personId}`}
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
              >
                <Highlight tone={getPerson(segment.personId)!.tone}>
                  {segment.text}
                </Highlight>
              </Link>
            ) : (
              <Fragment key={j}>{segment.text}</Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
