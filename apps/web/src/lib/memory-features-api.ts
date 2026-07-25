export interface MemoryPhotoMetadata {
  id: string;
  memoryId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  order: number;
}

export interface MemoryPhotoAsset extends MemoryPhotoMetadata {
  blob: Blob;
}

export interface FavoriteMemoryReference {
  id: string;
  memoryId: string;
  ownerPersonId: string;
  createdAt: string;
}

export interface MemoryFeaturesApi {
  listPhotos(memoryId: string): Promise<MemoryPhotoAsset[]>;
  addPhotos(memoryId: string, files: readonly File[]): Promise<MemoryPhotoAsset[]>;
  deletePhoto(memoryId: string, photoId: string): Promise<void>;
  reorderPhotos(memoryId: string, orderedPhotoIds: readonly string[]): Promise<void>;
  listFavorites(ownerPersonId: string): FavoriteMemoryReference[];
  isFavorite(ownerPersonId: string, memoryId: string): boolean;
  addFavorite(ownerPersonId: string, memoryId: string): FavoriteMemoryReference;
  removeFavorite(ownerPersonId: string, memoryId: string): void;
}

export const MEMORY_FEATURES_CHANGED_EVENT = "mura-memory-features-changed";
