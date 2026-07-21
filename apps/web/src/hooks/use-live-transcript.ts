"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export interface LiveSentence {
  text: string;
  /** False only for the phrase still being spoken. */
  complete: boolean;
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

/** Uses the browser speech recognizer. It never fabricates transcript text. */
export function useLiveTranscript(locale: Locale, listening: boolean) {
  const [finalPhrases, setFinalPhrases] = useState<string[]>([]);
  const [interimPhrase, setInterimPhrase] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(listening);
  const restartTimerRef = useRef<number | null>(null);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Recognition));
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale === "kk" ? "kk-KZ" : "ru-RU";
    recognition.onresult = (event) => {
      const completed: string[] = [];
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript.trim();
        if (!text) continue;
        if (result.isFinal) completed.push(text);
        else interim = `${interim} ${text}`.trim();
      }
      if (completed.length > 0) {
        setFinalPhrases((current) => [...current, ...completed]);
      }
      setInterimPhrase(interim);
      setError(null);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error);
    };
    recognition.onend = () => {
      if (!listeningRef.current) return;
      restartTimerRef.current = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // The browser may still be closing the previous recognition session.
        }
      }, 250);
    };
    recognitionRef.current = recognition;
    if (listeningRef.current) {
      try {
        recognition.start();
      } catch {
        // A previous browser session may still be closing.
      }
    }

    return () => {
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      try {
        recognition.start();
      } catch {
        // start() throws when a session is already active; that session is usable.
      }
    } else {
      recognition.stop();
      setInterimPhrase("");
    }
  }, [listening]);

  const reset = useCallback(() => {
    setFinalPhrases([]);
    setInterimPhrase("");
    setError(null);
  }, []);

  const sentences: LiveSentence[] = [
    ...finalPhrases.map((text) => ({ text, complete: true })),
    ...(interimPhrase ? [{ text: interimPhrase, complete: false }] : []),
  ];

  return { sentences, reset, supported, error };
}
