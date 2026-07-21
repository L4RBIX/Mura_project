"use client";

import { useCallback, useEffect, useState } from "react";

const TICK_MS = 100;

/** Simulated audio playback: play/pause, elapsed time, and seeking. */
export function useMockPlayback(durationSec: number) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setElapsed((e) => Math.min(e + TICK_MS / 1000, durationSec)),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [playing, durationSec]);

  useEffect(() => {
    if (playing && elapsed >= durationSec) setPlaying(false);
  }, [playing, elapsed, durationSec]);

  const toggle = useCallback(() => {
    setPlaying((was) => {
      if (!was) setElapsed((e) => (e >= durationSec ? 0 : e));
      return !was;
    });
  }, [durationSec]);

  const seek = useCallback(
    (fraction: number) =>
      setElapsed(Math.min(Math.max(fraction, 0), 1) * durationSec),
    [durationSec],
  );

  return {
    playing,
    elapsed,
    progress: durationSec > 0 ? elapsed / durationSec : 0,
    toggle,
    seek,
  };
}
