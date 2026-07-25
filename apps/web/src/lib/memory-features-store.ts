"use client";

import {
  MEMORY_FEATURES_CHANGED_EVENT,
  type FavoriteMemoryReference,
  type MemoryFeaturesApi,
  type MemoryPhotoAsset,
  type MemoryPhotoMetadata,
} from "@/lib/memory-features-api";

const PHOTO_METADATA_KEY = "mura-memory-photos-v1";
const FAVORITES_KEY = "mura-favorite-memories-v1";
const PHOTO_DB_NAME = "mura-memory-photos-v1";
const PHOTO_STORE_NAME = "photos";
const MAX_PHOTOS_PER_MEMORY = 24;
const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024;

type UnknownObject = Record<string, unknown>;

function emitChange() {
  window.dispatchEvent(new Event(MEMORY_FEATURES_CHANGED_EVENT));
}

function isObject(value: unknown): value is UnknownObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function normalizePhotoMetadata(
  value: unknown,
): MemoryPhotoMetadata | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const memoryId = text(value.memoryId);
  const fileName = text(value.fileName);
  const mimeType = text(value.mimeType);
  const createdAt = text(value.createdAt);
  if (!id || !memoryId || !fileName || !mimeType || !createdAt) return null;
  return {
    id,
    memoryId,
    fileName,
    mimeType,
    createdAt,
    size: nonNegativeNumber(value.size),
    order: nonNegativeNumber(value.order),
  };
}

export function normalizeFavoriteReference(
  value: unknown,
): FavoriteMemoryReference | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const memoryId = text(value.memoryId);
  const ownerPersonId = text(value.ownerPersonId);
  const createdAt = text(value.createdAt);
  return id && memoryId && ownerPersonId && createdAt
    ? { id, memoryId, ownerPersonId, createdAt }
    : null;
}

function readPhotoMetadata(): MemoryPhotoMetadata[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(PHOTO_METADATA_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed
          .map(normalizePhotoMetadata)
          .filter((photo): photo is MemoryPhotoMetadata => photo !== null)
      : [];
  } catch {
    return [];
  }
}

function writePhotoMetadata(photos: readonly MemoryPhotoMetadata[]) {
  window.localStorage.setItem(PHOTO_METADATA_KEY, JSON.stringify(photos));
}

function readFavorites(): FavoriteMemoryReference[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(FAVORITES_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeFavoriteReference)
          .filter(
            (reference): reference is FavoriteMemoryReference =>
              reference !== null,
          )
      : [];
  } catch {
    return [];
  }
}

function writeFavorites(references: readonly FavoriteMemoryReference[]) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(references));
}

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putPhotoBlobs(entries: readonly [string, Blob][]) {
  if (!entries.length) return;
  const database = await openPhotoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    entries.forEach(([id, blob]) => store.put(blob, id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function getPhotoBlob(id: string): Promise<Blob | null> {
  const database = await openPhotoDatabase();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readonly");
    const request = transaction.objectStore(PHOTO_STORE_NAME).get(id);
    request.onsuccess = () =>
      resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return blob;
}

async function removePhotoBlob(id: string) {
  const database = await openPhotoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

function orderedMetadataForMemory(memoryId: string): MemoryPhotoMetadata[] {
  return readPhotoMetadata()
    .filter((photo) => photo.memoryId === memoryId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

async function listPhotos(memoryId: string): Promise<MemoryPhotoAsset[]> {
  const metadata = orderedMetadataForMemory(memoryId);
  const assets = await Promise.all(
    metadata.map(async (photo) => {
      const blob = await getPhotoBlob(photo.id);
      return blob ? { ...photo, blob } : null;
    }),
  );
  return assets.filter((asset): asset is MemoryPhotoAsset => asset !== null);
}

async function addPhotos(
  memoryId: string,
  files: readonly File[],
): Promise<MemoryPhotoAsset[]> {
  const current = orderedMetadataForMemory(memoryId);
  const capacity = Math.max(0, MAX_PHOTOS_PER_MEMORY - current.length);
  const accepted = files
    .filter(
      (file) =>
        file.type.startsWith("image/") &&
        file.size > 0 &&
        file.size <= MAX_PHOTO_SIZE_BYTES,
    )
    .slice(0, capacity);
  if (!accepted.length) return listPhotos(memoryId);

  const createdAt = new Date().toISOString();
  const additions = accepted.map((file, index): MemoryPhotoMetadata => ({
    id: `photo_${crypto.randomUUID()}`,
    memoryId,
    fileName: file.name || `memory-photo-${current.length + index + 1}`,
    mimeType: file.type,
    size: file.size,
    createdAt,
    order: current.length + index,
  }));
  await putPhotoBlobs(additions.map((photo, index) => [photo.id, accepted[index]]));
  const otherMemories = readPhotoMetadata().filter(
    (photo) => photo.memoryId !== memoryId,
  );
  writePhotoMetadata([...otherMemories, ...current, ...additions]);
  emitChange();
  return listPhotos(memoryId);
}

async function deletePhoto(memoryId: string, photoId: string) {
  const allPhotos = readPhotoMetadata();
  const target = allPhotos.find(
    (photo) => photo.memoryId === memoryId && photo.id === photoId,
  );
  if (!target) return;
  await removePhotoBlob(photoId);
  const remainingForMemory = allPhotos
    .filter((photo) => photo.memoryId === memoryId && photo.id !== photoId)
    .sort((left, right) => left.order - right.order)
    .map((photo, order) => ({ ...photo, order }));
  writePhotoMetadata([
    ...allPhotos.filter((photo) => photo.memoryId !== memoryId),
    ...remainingForMemory,
  ]);
  emitChange();
}

async function reorderPhotos(
  memoryId: string,
  orderedPhotoIds: readonly string[],
) {
  const allPhotos = readPhotoMetadata();
  const current = allPhotos.filter((photo) => photo.memoryId === memoryId);
  const byId = new Map(current.map((photo) => [photo.id, photo]));
  const seen = new Set<string>();
  const requested = orderedPhotoIds
    .map((id) => byId.get(id))
    .filter((photo): photo is MemoryPhotoMetadata => {
      if (!photo || seen.has(photo.id)) return false;
      seen.add(photo.id);
      return true;
    });
  const ordered = [
    ...requested,
    ...current
      .filter((photo) => !seen.has(photo.id))
      .sort((left, right) => left.order - right.order),
  ].map((photo, order) => ({ ...photo, order }));
  writePhotoMetadata([
    ...allPhotos.filter((photo) => photo.memoryId !== memoryId),
    ...ordered,
  ]);
  emitChange();
}

function listFavorites(ownerPersonId: string): FavoriteMemoryReference[] {
  return readFavorites()
    .filter((reference) => reference.ownerPersonId === ownerPersonId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function isFavorite(ownerPersonId: string, memoryId: string): boolean {
  return readFavorites().some(
    (reference) =>
      reference.ownerPersonId === ownerPersonId &&
      reference.memoryId === memoryId,
  );
}

function addFavorite(
  ownerPersonId: string,
  memoryId: string,
): FavoriteMemoryReference {
  const references = readFavorites();
  const existing = references.find(
    (reference) =>
      reference.ownerPersonId === ownerPersonId &&
      reference.memoryId === memoryId,
  );
  if (existing) return existing;
  const reference: FavoriteMemoryReference = {
    id: `favorite_${crypto.randomUUID()}`,
    memoryId,
    ownerPersonId,
    createdAt: new Date().toISOString(),
  };
  writeFavorites([reference, ...references]);
  emitChange();
  return reference;
}

function removeFavorite(ownerPersonId: string, memoryId: string) {
  const next = readFavorites().filter(
    (reference) =>
      reference.ownerPersonId !== ownerPersonId ||
      reference.memoryId !== memoryId,
  );
  writeFavorites(next);
  emitChange();
}

/**
 * Local mock backend used by the prototype. The interface mirrors a future
 * remote memory-features service while preserving the app's offline behavior.
 */
export const memoryFeaturesApi: MemoryFeaturesApi = {
  listPhotos,
  addPhotos,
  deletePhoto,
  reorderPhotos,
  listFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
};
