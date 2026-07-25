import type { Locale } from "@/lib/i18n";
import {
  isMuraExtractionRequest,
  isMuraExtractionResult,
  type MuraExtractionRequest,
  type MuraExtractionResult,
} from "@/lib/mura-api-types";
import { selectPrimaryStory } from "@/lib/mura-integration";
import type { Story } from "@/lib/types";

export interface SavedMemoryPerson {
  name: string;
  relationship: string;
}

export type SavedMemoryStatus = "audio_only" | "extracting" | "completed" | "failed";
export type SavedMemorySource = "mura_model" | "audio_only";

export interface SavedMemory {
  id: string;
  recordingId: string;
  createdAt: string;
  locale: Locale;
  title: string;
  summary: string;
  transcript: string;
  people: SavedMemoryPerson[];
  durationSec: number;
  source: SavedMemorySource;
  status: SavedMemoryStatus;
  extractionRequest?: MuraExtractionRequest;
  extraction?: MuraExtractionResult;
  extractionError?: {
    code: string;
    message: string;
  };
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
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSavedMemory)
      .filter((memory): memory is SavedMemory => memory !== null);
  } catch {
    return [];
  }
}

export function getSavedMemory(id: string): SavedMemory | null {
  return getSavedMemories().find((memory) => memory.id === id) ?? null;
}

function writeMemory(memory: SavedMemory) {
  const memories = getSavedMemories().filter((item) => item.id !== memory.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([memory, ...memories].slice(0, 50)));
}

export async function saveMemory(memory: SavedMemory, audio?: Blob) {
  if (audio) await saveAudio(memory.id, audio);
  writeMemory(memory);
}

export function updateSavedMemory(memory: SavedMemory) {
  writeMemory(memory);
}

export function completeSavedMemory(
  memory: SavedMemory,
  extraction: MuraExtractionResult,
): SavedMemory {
  const primaryStory = selectPrimaryStory(extraction);
  return {
    ...memory,
    recordingId: extraction.recording_id,
    title: primaryStory?.title.trim() || memory.title,
    summary: primaryStory?.summary.trim() || memory.transcript,
    people: extraction.people.map((person) => ({
      name: person.name,
      relationship: person.relation_to_speaker ?? "",
    })),
    source: "mura_model",
    status: "completed",
    extraction,
    extractionError: undefined,
  };
}

export function failSavedMemory(
  memory: SavedMemory,
  error: { code: string; message: string },
): SavedMemory {
  return {
    ...memory,
    source: "mura_model",
    status: "failed",
    extractionError: {
      code: error.code,
      message: error.message,
    },
  };
}

export function normalizeSavedMemory(value: unknown): SavedMemory | null {
  if (!isObject(value)) return null;
  const id = stringValue(value.id);
  const createdAt = stringValue(value.createdAt);
  const title = stringValue(value.title);
  if (!id || !createdAt || !title) return null;

  const locale: Locale = value.locale === "kk" ? "kk" : "ru";
  const transcript = stringValue(value.transcript);
  const extraction = isMuraExtractionResult(value.extraction) ? value.extraction : undefined;
  const extractionRequest = isMuraExtractionRequest(value.extractionRequest)
    ? value.extractionRequest
    : undefined;
  const legacySource = value.source;
  const source: SavedMemorySource =
    legacySource === "audio_only" ? "audio_only" : "mura_model";
  const status = savedMemoryStatus(value.status) ??
    (source === "audio_only" ? "audio_only" : "completed");
  const storedPeople = Array.isArray(value.people)
    ? value.people.map(normalizePerson).filter((person): person is SavedMemoryPerson => person !== null)
    : [];
  const people = storedPeople.length
    ? storedPeople
    : (extraction?.people ?? []).map((person) => ({
        name: person.name,
        relationship: person.relation_to_speaker ?? "",
      }));

  return {
    id,
    recordingId: stringValue(value.recordingId) || extraction?.recording_id || id,
    createdAt,
    locale,
    title,
    summary: stringValue(value.summary) || transcript,
    transcript,
    people,
    durationSec: finiteNumber(value.durationSec),
    source,
    status,
    extractionRequest,
    extraction,
    extractionError: normalizeExtractionError(value.extractionError),
  };
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function savedMemoryStatus(value: unknown): SavedMemoryStatus | null {
  return value === "audio_only" ||
    value === "extracting" ||
    value === "completed" ||
    value === "failed"
    ? value
    : null;
}

function normalizePerson(value: unknown): SavedMemoryPerson | null {
  if (!isObject(value)) return null;
  const name = stringValue(value.name).trim();
  if (!name) return null;
  return {
    name,
    relationship: stringValue(value.relationship).trim(),
  };
}

function normalizeExtractionError(
  value: unknown,
): SavedMemory["extractionError"] {
  if (!isObject(value)) return undefined;
  const code = stringValue(value.code).trim();
  const message = stringValue(value.message).trim();
  return code && message ? { code, message } : undefined;
}
