import type { Locale } from "@/lib/i18n";
import type { Story } from "@/lib/types";

export interface SavedMemoryPerson {
  name: string;
  relationship: string;
}

export interface SavedMemory {
  id: string;
  createdAt: string;
  locale: Locale;
  title: string;
  summary: string;
  transcript: string;
  people: SavedMemoryPerson[];
  durationSec: number;
  source: "mura_core" | "deepseek_fallback" | "audio_only";
}

const STORAGE_KEY = "mura-saved-memories-v1";
const DB_NAME = "mura-audio-archive-v1";
const STORE_NAME = "recordings";

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAudio(id: string, audio: Blob) {
  const database = await openAudioDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(audio, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getMemoryAudio(id: string): Promise<Blob | null> {
  const database = await openAudioDatabase();
  const audio = await new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return audio;
}

export function getSavedMemories(): SavedMemory[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedMemory =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.createdAt === "string",
    );
  } catch {
    return [];
  }
}

export function getSavedMemory(id: string): SavedMemory | null {
  return getSavedMemories().find((memory) => memory.id === id) ?? null;
}

export async function saveMemory(memory: SavedMemory, audio: Blob) {
  await saveAudio(memory.id, audio);
  const memories = getSavedMemories().filter((item) => item.id !== memory.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([memory, ...memories].slice(0, 50)));
}

export function savedMemoryToStory(memory: SavedMemory): Story {
  const date = new Date(memory.createdAt);
  return {
    id: memory.id,
    title: memory.title,
    era: date.toLocaleDateString(memory.locale === "kk" ? "kk-KZ" : "ru-RU"),
    recordedLabel: date.toLocaleTimeString(memory.locale === "kk" ? "kk-KZ" : "ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    durationSec: memory.durationSec,
    excerpt: memory.summary || memory.transcript,
    paragraphs: memory.transcript ? [memory.transcript] : [],
    mentions: [],
    isNew: true,
  };
}
