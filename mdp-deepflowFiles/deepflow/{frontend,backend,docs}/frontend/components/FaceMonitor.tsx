import { useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ── Constants ──────────────────────────────────────────────────────────
const EAR_THRESHOLD = 0.22;       // Eyes considered closed below this value
const CONSECUTIVE_FRAMES = 25;    // ~1 second of closure at 25fps triggers drowsy event

// MediaPipe landmark indices for left & right eyes
const LEFT_EYE_INDICES  = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

// ── Types ──────────────────────────────────────────────────────────────
interface FaceMonitorProps {
  onDrowsyState: (isDrowsy: boolean) => void;
  onEARUpdate?:  (ear: number) => void;
}

// ── Component ──────────────────────────────────────────────────────────
export const FaceMonitor = ({ onDrowsyState, onEARUpdate }: FaceMonitorProps) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const framesClosed = useRef(0);
  const isDrowsy    = useRef(false);

  /**
   * Eye Aspect Ratio (EAR) formula:
   *   EAR = (||p1-p5|| + ||p2-p4||) / (2 * ||p0-p3||)
   * where p0..p5 are the 6 landmark points around one eye.
   * EAR ≈ 0.3 when open, drops below 0.22 when closed.
   */
  const calculateEAR = useCallback((landmarks: any[], indices: number[]): number => {
    const p = indices.map(i => landmarks[i]);
    const vertical1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
    const vertical2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
    const horizontal = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }, []);

  useEffect(() => {
    let faceLandmarker: FaceLandmarker | null = null;
    let animationId: number;
    let stream: MediaStream | null = null;

    const init = async () => {
      // Load MediaPipe WASM runtime
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      // Request webcam
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      render();
    };

    const render = () => {
      if (!faceLandmarker || !videoRef.current) {
        animationId = requestAnimationFrame(render);
        return;
      }

      if (videoRef.current.readyState === 4) {
        const result = faceLandmarker.detectForVideo(videoRef.current, performance.now());

        if (result.faceLandmarks?.[0]) {
          const landmarks = result.faceLandmarks[0];
          const leftEAR  = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
          const avgEAR   = (leftEAR + rightEAR) / 2;

          onEARUpdate?.(avgEAR);

          if (avgEAR < EAR_THRESHOLD) {
            framesClosed.current++;
            if (framesClosed.current >= CONSECUTIVE_FRAMES && !isDrowsy.current) {
              isDrowsy.current = true;
              onDrowsyState(true);
            }
          } else {
            framesClosed.current = 0;
            if (isDrowsy.current) {
              isDrowsy.current = false;
              onDrowsyState(false);
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    init().catch(console.error);

    return () => {
      cancelAnimationFrame(animationId);
      faceLandmarker?.close();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [calculateEAR, onDrowsyState, onEARUpdate]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full rounded-lg border border-white/10"
    />
  );
};
