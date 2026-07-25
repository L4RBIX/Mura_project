const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "audio/mp4": ".mp4",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/webm": ".webm",
};

export function audioExtensionForMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";", 1)[0]?.trim();
  return MIME_EXTENSIONS[normalized] ?? ".webm";
}

function safeFileStem(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/[.\s-]+$/gu, "")
    .slice(0, 80);
}

function timestampForFileName(createdAt: string): string {
  const parsed = new Date(createdAt);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toISOString().slice(0, 19).replace("T", "_").replaceAll(":", "-");
}

export function createAudioFileName(input: {
  createdAt: string;
  title: string;
  mimeType: string;
}): string {
  const stem = safeFileStem(input.title) || "Mura-audio";
  return `${stem}_${timestampForFileName(input.createdAt)}${audioExtensionForMimeType(input.mimeType)}`;
}
