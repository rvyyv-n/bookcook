import { isNative } from './isNative';

/** Whether this browser can record audio (MediaRecorder and a microphone API). */
export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Whether a voice note can record while dictation listens (the story in Tell it). On Android the
 * recogniser and the recording fight over the mic and one of them hears silence, so the app doesn't.
 */
export function canRecordWhileListening(): boolean {
  return canRecord() && !isNative();
}

export interface Recording {
  /** Stop and get the recording. */
  stop(): Promise<Blob>;
  /** Stop and throw it away. */
  cancel(): void;
}

/** A small voice file: Opus in WebM where it's supported (Chrome, Firefox), the browser's default otherwise (MP4 on Safari). */
function pickType(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
}

/** Start recording from the microphone. Rejects if the mic is blocked or missing. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = pickType();
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          resolve(new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' }));
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = release;
      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },
  };
}
