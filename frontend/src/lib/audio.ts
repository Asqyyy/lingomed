/**
 * Audio recording helpers using the MediaRecorder API.
 * Records WebM/Opus in the browser and returns a Blob on stop.
 */

export type RecorderState = "idle" | "recording" | "stopped" | "error";

let mediaRecorder: MediaRecorder | null = null;
let chunks: BlobPart[] = [];
let stream: MediaStream | null = null;

export async function startRecording(): Promise<void> {
  if (typeof window === "undefined" || !navigator.mediaDevices) {
    throw new Error("Microphone not available in this environment");
  }
  
  if (mediaRecorder?.state === "recording") {
    return;
  }

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start();
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error("No active recording"));
      return;
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      // cleanup
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      mediaRecorder = null;
      chunks = [];
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

export function isRecording(): boolean {
  return mediaRecorder?.state === "recording";
}

/**
 * Append MP3 chunks to a MediaSource buffer and play through <audio>.
 * Browser will play as soon as the first MP3 segment is appended.
 */
export class StreamingMp3Player {
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private audio: HTMLAudioElement;
  private queue: Uint8Array[] = [];
  private open = false;
  private mime = "audio/mpeg";

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
  }

  start() {
    if (typeof window === "undefined" || !("MediaSource" in window)) {
      console.warn("MediaSource not supported");
      return;
    }
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener("sourceopen", () => {
      try {
        this.sourceBuffer = this.mediaSource!.addSourceBuffer(this.mime);
        this.sourceBuffer.addEventListener("updateend", () => this.flush());
        this.open = true;
        this.flush();
      } catch (e) {
        console.error("SourceBuffer add failed", e);
      }
    });
  }

  append(chunk: ArrayBuffer | Uint8Array) {
    const data = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    this.queue.push(data);
    this.flush();
  }

  private flush() {
    if (!this.open || !this.sourceBuffer) return;
    if (this.sourceBuffer.updating) return;
    const next = this.queue.shift();
    if (!next) return;
    try {
      this.sourceBuffer.appendBuffer(next);
    } catch (e) {
      console.error("appendBuffer error", e);
    }
  }

  stop() {
    this.open = false;
    this.queue = [];
    if (this.mediaSource?.readyState === "open") {
      try {
        this.mediaSource.endOfStream();
      } catch {}
    }
  }
}
