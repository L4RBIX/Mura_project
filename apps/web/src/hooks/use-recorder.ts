"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "paused";

function supportedMimeType() {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

/** Real microphone recorder with pause/resume and a final uploadable audio Blob. */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const stopTracks = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setLevel(0);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = supportedMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128_000,
      });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      audioContextRef.current = audioContext;
      updateLevel();
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(500);
      streamRef.current = stream;
      recorderRef.current = recorder;
      setStatus("recording");
    } catch {
      setError("microphone_unavailable");
      setStatus("idle");
    }
  }, []);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.pause();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "paused") {
      recorder.resume();
      setStatus("recording");
    }
  }, []);

  const finish = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopTracks();
        recorderRef.current = null;
        setStatus("idle");
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }, [stopTracks]);

  const snapshot = useCallback((): Blob | null => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || chunksRef.current.length === 0) {
      return null;
    }
    return new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
  }, []);

  const restart = useCallback(async () => {
    const recorder = recorderRef.current;
    setStatus("idle");
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    stopTracks();
    recorderRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    await start();
  }, [start, stopTracks]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stopTracks();
    },
    [stopTracks],
  );

  return {
    status,
    seconds,
    level,
    error,
    start,
    pause,
    resume,
    restart,
    finish,
    snapshot,
  };
}
