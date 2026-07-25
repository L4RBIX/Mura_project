"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MEMORY_FEATURES_CHANGED_EVENT,
  type MemoryPhotoAsset,
  type MemoryPhotoMetadata,
} from "@/lib/memory-features-api";
import { memoryFeaturesApi } from "@/lib/memory-features-store";

export interface MemoryPhotoView extends MemoryPhotoMetadata {
  url: string;
}

export function useMemoryPhotos(memoryId: string) {
  const [photos, setPhotos] = useState<MemoryPhotoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState(false);
  const urlsRef = useRef<string[]>([]);

  const replaceAssets = useCallback((assets: readonly MemoryPhotoAsset[]) => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = assets.map(({ blob, ...metadata }) => ({
      ...metadata,
      url: URL.createObjectURL(blob),
    }));
    urlsRef.current = next.map((photo) => photo.url);
    setPhotos(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const assets = await memoryFeaturesApi.listPhotos(memoryId);
      replaceAssets(assets);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [memoryId, replaceAssets]);

  useEffect(() => {
    void refresh();
    const handleChange = () => void refresh();
    window.addEventListener(MEMORY_FEATURES_CHANGED_EVENT, handleChange);
    return () => {
      window.removeEventListener(MEMORY_FEATURES_CHANGED_EVENT, handleChange);
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [refresh]);

  const addFiles = async (files: readonly File[]) => {
    if (!files.length || mutating) return;
    setMutating(true);
    try {
      const assets = await memoryFeaturesApi.addPhotos(memoryId, files);
      replaceAssets(assets);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setMutating(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    if (mutating) return;
    setMutating(true);
    try {
      await memoryFeaturesApi.deletePhoto(memoryId, photoId);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setMutating(false);
    }
  };

  const reorder = (ordered: readonly MemoryPhotoView[]) => {
    setPhotos([...ordered]);
    void memoryFeaturesApi.reorderPhotos(
      memoryId,
      ordered.map((photo) => photo.id),
    );
  };

  return {
    photos,
    loading,
    mutating,
    error,
    addFiles,
    removePhoto,
    reorder,
  };
}
