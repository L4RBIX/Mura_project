"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Camera, Grip, ImagePlus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  type MemoryPhotoView,
  useMemoryPhotos,
} from "@/hooks/use-memory-photos";
import { useMuraI18n } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

export function MemoryPhotoGallery({ memoryId }: { memoryId: string }) {
  const { t } = useMuraI18n();
  const {
    photos,
    loading,
    mutating,
    error,
    addFiles,
    removePhoto,
    reorder,
  } = useMemoryPhotos(memoryId);
  const [selected, setSelected] = useState<MemoryPhotoView | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  const receiveFiles = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addFiles(files);
  };

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
          {t("photos")}
        </h2>
        {photos.length > 1 && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Grip className="size-3.5" />
            {t("dragToReorder")}
          </span>
        )}
      </div>

      {!loading && photos.length > 0 && (
        <Reorder.Group
          axis="x"
          values={photos}
          onReorder={reorder}
          className="-mx-6 mt-4 flex gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, index) => (
            <Reorder.Item
              key={photo.id}
              value={photo}
              whileDrag={{ scale: 1.025, zIndex: 10 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative aspect-[4/5] w-[196px] shrink-0 cursor-grab overflow-hidden rounded-[26px] bg-raised shadow-card active:cursor-grabbing"
            >
              <motion.button
                type="button"
                layoutId={`memory-photo-${photo.id}`}
                onClick={() => setSelected(photo)}
                className="absolute inset-0"
                aria-label={t("openPhoto", { number: index + 1 })}
              >
                <Image
                  src={photo.url}
                  alt={photo.fileName}
                  fill
                  unoptimized
                  sizes="196px"
                  className="object-cover"
                />
              </motion.button>
              <button
                type="button"
                disabled={mutating}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  void removePhoto(photo.id);
                }}
                className="absolute right-2.5 top-2.5 z-10 flex size-9 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft backdrop-blur-md transition-transform active:scale-90 disabled:opacity-50"
                aria-label={t("deletePhoto")}
              >
                <Trash2 className="size-4" strokeWidth={1.8} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {!loading && photos.length === 0 && (
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          {t("photosEmpty")}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={mutating}
          onClick={() => uploadInputRef.current?.click()}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-raised px-4 text-[13px] font-bold shadow-soft transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          <ImagePlus className="size-4" strokeWidth={1.8} />
          {t("uploadPhotos")}
        </button>
        <button
          type="button"
          disabled={mutating}
          onClick={() => cameraInputRef.current?.click()}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-sand px-4 text-[13px] font-bold transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          <Camera className="size-4" strokeWidth={1.8} />
          {t("takePhoto")}
        </button>
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={receiveFiles}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={receiveFiles}
        />
      </div>
      {error && (
        <p className="mt-3 text-[13px] leading-relaxed text-red-700">
          {t("photoStorageError")}
        </p>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            key="photo-lightbox"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/92 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={selected.fileName}
            onClick={() => setSelected(null)}
          >
            <motion.div
              layoutId={`memory-photo-${selected.id}`}
              className="relative h-full max-h-[88svh] w-full max-w-[920px] overflow-hidden rounded-[30px] bg-ink"
              transition={{ duration: 0.46, ease: EASE }}
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={selected.url}
                alt={selected.fileName}
                fill
                unoptimized
                sizes="100vw"
                className="object-contain"
                priority
              />
            </motion.div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-5 top-[max(env(safe-area-inset-top),20px)] flex size-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card backdrop-blur-md transition-transform active:scale-90"
              aria-label={t("closePhoto")}
            >
              <X className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
