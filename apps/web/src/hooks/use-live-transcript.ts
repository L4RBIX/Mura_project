"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export interface LiveSentence {
  readonly id: string;
  readonly text: string;
  /** False only for the phrase still being spoken. */
  readonly complete: boolean;
  /** Approximate active-recording time reported by browser speech recognition. */
  readonly startSec: number;
  /** Approximate active-recording time reported by browser speech recognition. */
  readonly endSec: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const MIN_SENTENCE_DURATION_SEC = 0.001;
const ESTIMATED_SECONDS_PER_WORD = 0.32;
const MIN_ESTIMATED_PHRASE_SEC = 0.25;
const FINALIZATION_TIMEOUT_MS = 1_000;

interface PendingFinalization {
  promise: Promise<LiveSentence[]>;
  resolve: (sentences: LiveSentence[]) => void;
  timeoutId: number;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function estimatedPhraseDuration(text: string) {
  return Math.max(
    MIN_ESTIMATED_PHRASE_SEC,
    wordCount(text) * ESTIMATED_SECONDS_PER_WORD,
  );
}

/** Uses the browser speech recognizer. It never fabricates transcript text. */
export function useLiveTranscript(locale: Locale, listening: boolean) {
  const [finalSentences, setFinalSentences] = useState<LiveSentence[]>([]);
  const [interimSentence, setInterimSentence] = useState<LiveSentence | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognitionEpoch, setRecognitionEpoch] = useState(0);
  const finalSentencesRef = useRef<LiveSentence[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(listening);
  const wasListeningRef = useRef(listening);
  const restartTimerRef = useRef<number | null>(null);
  const finalizationRef = useRef<PendingFinalization | null>(null);
  const discardingSessionRef = useRef(false);
  const recognitionGenerationRef = useRef(0);
  const skipNextStopRef = useRef(false);
  const activeElapsedSecRef = useRef(0);
  const activeStartedAtMsRef = useRef<number | null>(null);
  const lastFinalEndSecRef = useRef(0);
  const interimStartSecRef = useRef<number | null>(null);
  const interimIdRef = useRef<string | null>(null);
  const nextFinalIdRef = useRef(1);
  const nextInterimIdRef = useRef(1);

  const getActiveElapsedSec = useCallback(() => {
    const activeStartedAtMs = activeStartedAtMsRef.current;
    if (activeStartedAtMs === null) return activeElapsedSecRef.current;
    return (
      activeElapsedSecRef.current +
      Math.max(0, performance.now() - activeStartedAtMs) / 1000
    );
  }, []);

  const scheduleRecognitionStart = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
    }
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!listeningRef.current || finalizationRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch {
        // One deferred start is enough; a later user action can start a new session.
      }
    }, 250);
  }, []);

  const settleFinalization = useCallback(() => {
    const pending = finalizationRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    finalizationRef.current = null;
    setInterimSentence(null);
    interimStartSecRef.current = null;
    interimIdRef.current = null;
    pending.resolve(
      finalSentencesRef.current.map((sentence) => ({ ...sentence })),
    );
    if (listeningRef.current && !discardingSessionRef.current) {
      scheduleRecognitionStart();
    }
  }, [scheduleRecognitionStart]);

  const finalizeFinalSentences = useCallback((): Promise<LiveSentence[]> => {
    const pending = finalizationRef.current;
    if (pending) return pending.promise;

    const recognition = recognitionRef.current;
    if (!recognition) {
      return Promise.resolve(
        finalSentencesRef.current.map((sentence) => ({ ...sentence })),
      );
    }

    let resolveFinalization: (sentences: LiveSentence[]) => void = () => {};
    const promise = new Promise<LiveSentence[]>((resolve) => {
      resolveFinalization = resolve;
    });
    const timeoutId = window.setTimeout(() => {
      try {
        recognition.abort();
      } finally {
        settleFinalization();
      }
    }, FINALIZATION_TIMEOUT_MS);
    finalizationRef.current = {
      promise,
      resolve: resolveFinalization,
      timeoutId,
    };
    try {
      recognition.stop();
    } catch {
      queueMicrotask(settleFinalization);
    }
    return promise;
  }, [settleFinalization]);

  useEffect(() => {
    listeningRef.current = listening;
    const now = performance.now();
    if (listening) {
      if (activeStartedAtMsRef.current === null) {
        activeStartedAtMsRef.current = now;
      }
    } else if (activeStartedAtMsRef.current !== null) {
      activeElapsedSecRef.current += Math.max(
        0,
        now - activeStartedAtMsRef.current,
      ) / 1000;
      activeStartedAtMsRef.current = null;
    }
  }, [listening]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Recognition));
    if (!Recognition) return;

    const recognition = new Recognition();
    const generation = recognitionGenerationRef.current;
    const languageOptions = locale === "kk" ? ["kk-KZ", "kk"] : ["ru-RU", "ru"];
    let languageIndex = 0;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = languageOptions[languageIndex];
    discardingSessionRef.current = false;
    recognition.onresult = (event) => {
      if (
        discardingSessionRef.current ||
        generation !== recognitionGenerationRef.current
      ) {
        return;
      }
      const finalizing = finalizationRef.current !== null;
      if (!listeningRef.current && !finalizing) return;

      const completed: string[] = [];
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript.trim();
        if (!text) continue;
        if (result.isFinal) completed.push(text);
        else interim = `${interim} ${text}`.trim();
      }

      const observedEndSec = getActiveElapsedSec();
      if (completed.length > 0) {
        const weights = completed.map((text) => Math.max(1, wordCount(text)));
        const totalWeight = weights.reduce((total, weight) => total + weight, 0);
        const estimatedDuration = completed.reduce(
          (total, text) => total + estimatedPhraseDuration(text),
          0,
        );
        const earliestStartSec = lastFinalEndSecRef.current;
        const observedStartSec =
          interimStartSecRef.current ?? observedEndSec - estimatedDuration;
        const batchStartSec = Math.max(
          earliestStartSec,
          Math.min(observedStartSec, observedEndSec),
        );
        const batchEndSec = Math.max(
          observedEndSec,
          batchStartSec + MIN_SENTENCE_DURATION_SEC * completed.length,
        );
        const distributableDuration = Math.max(
          0,
          batchEndSec -
            batchStartSec -
            MIN_SENTENCE_DURATION_SEC * completed.length,
        );
        let cursorSec = batchStartSec;
        const additions = completed.map((text, index): LiveSentence => {
          const durationSec =
            MIN_SENTENCE_DURATION_SEC +
            distributableDuration * (weights[index] / totalWeight);
          const endSec =
            index === completed.length - 1
              ? batchEndSec
              : cursorSec + durationSec;
          const sentence: LiveSentence = {
            id: `final_${String(nextFinalIdRef.current).padStart(3, "0")}`,
            text,
            complete: true,
            startSec: cursorSec,
            endSec,
          };
          nextFinalIdRef.current += 1;
          cursorSec = endSec;
          return sentence;
        });
        const nextFinalSentences = [...finalSentencesRef.current, ...additions];
        finalSentencesRef.current = nextFinalSentences;
        setFinalSentences(nextFinalSentences);
        lastFinalEndSecRef.current = batchEndSec;
        interimStartSecRef.current = null;
        interimIdRef.current = null;
      }

      if (interim && listeningRef.current && !finalizing) {
        if (interimStartSecRef.current === null) {
          interimStartSecRef.current = Math.max(
            lastFinalEndSecRef.current,
            observedEndSec - estimatedPhraseDuration(interim),
          );
        }
        if (interimIdRef.current === null) {
          interimIdRef.current = `interim_${String(
            nextInterimIdRef.current,
          ).padStart(3, "0")}`;
          nextInterimIdRef.current += 1;
        }
        setInterimSentence({
          id: interimIdRef.current,
          text: interim,
          complete: false,
          startSec: interimStartSecRef.current,
          endSec: Math.max(
            observedEndSec,
            interimStartSecRef.current + MIN_SENTENCE_DURATION_SEC,
          ),
        });
      } else if (!finalizing) {
        setInterimSentence(null);
        interimStartSecRef.current = null;
        interimIdRef.current = null;
      }
      setError(null);
    };
    recognition.onerror = (event) => {
      if (generation !== recognitionGenerationRef.current) return;
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "language-not-supported" && languageIndex < languageOptions.length - 1) {
        languageIndex += 1;
        recognition.lang = languageOptions[languageIndex];
        setError(null);
        return;
      }
      setError(event.error);
    };
    recognition.onend = () => {
      if (generation !== recognitionGenerationRef.current) return;
      if (finalizationRef.current) {
        settleFinalization();
        return;
      }
      if (!listeningRef.current) return;
      scheduleRecognitionStart();
    };
    recognitionRef.current = recognition;
    if (listeningRef.current) {
      skipNextStopRef.current = false;
      try {
        recognition.start();
      } catch {
        // A previous browser session may still be closing.
      }
    }

    return () => {
      if (generation === recognitionGenerationRef.current) {
        recognitionGenerationRef.current += 1;
      }
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      const pending = finalizationRef.current;
      if (pending) {
        window.clearTimeout(pending.timeoutId);
        finalizationRef.current = null;
        pending.resolve(
          finalSentencesRef.current.map((sentence) => ({ ...sentence })),
        );
      }
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [
    getActiveElapsedSec,
    locale,
    recognitionEpoch,
    scheduleRecognitionStart,
    settleFinalization,
  ]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    const wasListening = wasListeningRef.current;
    wasListeningRef.current = listening;
    if (!listening && skipNextStopRef.current) {
      skipNextStopRef.current = false;
      setInterimSentence(null);
      interimStartSecRef.current = null;
      interimIdRef.current = null;
      return;
    }
    if (listening) {
      skipNextStopRef.current = false;
      if (finalizationRef.current) return;
      try {
        recognition.start();
      } catch {
        // start() throws when a session is already active; that session is usable.
      }
    } else if (wasListening) {
      void finalizeFinalSentences();
    } else {
      setInterimSentence(null);
      interimStartSecRef.current = null;
      interimIdRef.current = null;
    }
  }, [finalizeFinalSentences, listening]);

  const reset = useCallback(() => {
    const pending = finalizationRef.current;
    if (pending) {
      window.clearTimeout(pending.timeoutId);
      finalizationRef.current = null;
      pending.resolve(
        finalSentencesRef.current.map((sentence) => ({ ...sentence })),
      );
    }
    finalSentencesRef.current = [];
    setFinalSentences([]);
    setInterimSentence(null);
    setError(null);
    activeElapsedSecRef.current = 0;
    activeStartedAtMsRef.current = listeningRef.current
      ? performance.now()
      : null;
    lastFinalEndSecRef.current = 0;
    interimStartSecRef.current = null;
    interimIdRef.current = null;
    nextFinalIdRef.current = 1;
    nextInterimIdRef.current = 1;
  }, []);

  const discardAndReset = useCallback(() => {
    discardingSessionRef.current = true;
    recognitionGenerationRef.current += 1;
    skipNextStopRef.current = true;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    reset();
    setRecognitionEpoch((value) => value + 1);
  }, [reset]);

  const getFinalSentences = useCallback(
    () => finalSentencesRef.current.map((sentence) => ({ ...sentence })),
    [],
  );

  const sentences: LiveSentence[] = [
    ...finalSentences,
    ...(interimSentence ? [interimSentence] : []),
  ];

  return {
    sentences,
    getFinalSentences,
    finalizeFinalSentences,
    discardAndReset,
    reset,
    supported,
    error,
  };
}
