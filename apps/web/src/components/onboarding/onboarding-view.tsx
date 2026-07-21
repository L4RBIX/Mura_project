"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMuraI18n } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

function reveal(delay: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: EASE },
  };
}

/** Soft pastel orbs drifting behind the title, in the reference’s spirit. */
function Orbs() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -right-20 top-10 size-[300px] rounded-full bg-clay opacity-70 blur-3xl"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-24 bottom-32 size-[260px] rounded-full bg-periwinkle opacity-60 blur-3xl"
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function OnboardingView() {
  const { t } = useMuraI18n();
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-8 pb-[max(env(safe-area-inset-bottom),28px)] pt-[env(safe-area-inset-top)]">
      <Orbs />

      <div className="relative flex flex-1 flex-col justify-center">
        <motion.p
          {...reveal(0.1)}
          className="text-[13px] font-semibold uppercase tracking-[0.3em] text-muted"
        >
          Мұра
        </motion.p>

        <h1
          aria-label="Mura"
          className="mt-3 text-[92px] font-bold leading-[0.95] tracking-[-0.045em]"
        >
          {"Mura".split("").map((letter, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + i * 0.06, duration: 0.7, ease: EASE }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>

        <motion.p
          {...reveal(0.55)}
          className="mt-6 text-[21px] font-medium leading-snug text-ink/75"
        >
          {t("tagline").split("\n").map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </motion.p>
      </div>

      <motion.div {...reveal(0.9)} className="relative flex flex-col gap-5">
        <p className="text-center text-[15px] text-muted">
          {t("memoryLives")}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/home">{t("begin")}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
