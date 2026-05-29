import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type GestureMode = 'gather' | 'burst';

export type GestureState = {
  mode: GestureMode;
  label: string;
  confidence: number;
  openConfidence: number;
};

type GestureCallback = (state: GestureState) => void;

const fingerTips = [8, 12, 16, 20];
const fingerPips = [6, 10, 14, 18];
const fingerMcps = [5, 9, 13, 17];

export class GestureController {
  private video: HTMLVideoElement;
  private status: HTMLElement;
  private onGesture: GestureCallback;
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  private fistScore = 0;
  private openScore = 0;
  private currentMode: GestureMode = 'gather';

  constructor(video: HTMLVideoElement, status: HTMLElement, onGesture: GestureCallback) {
    this.video = video;
    this.status = status;
    this.onGesture = onGesture;
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.status.textContent = '浏览器不支持摄像头';
      return;
    }

    this.status.textContent = '正在加载手势模型';
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm',
    );

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.48,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });

    this.video.srcObject = stream;
    await this.video.play();
    this.status.textContent = '握拳发散，张掌聚拢';
    requestAnimationFrame(this.detect);
  }

  private detect = () => {
    if (!this.landmarker) {
      requestAnimationFrame(this.detect);
      return;
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const result = this.landmarker.detectForVideo(this.video, performance.now());
      const landmarks = result.landmarks[0];

      if (!landmarks) {
        this.fistScore *= 0.7;
        this.openScore = this.openScore * 0.7 + 0.3;
        this.emit('gather', '未检测到手', 1 - this.fistScore, this.openScore);
      } else {
        const scores = getHandScores(landmarks);
        this.fistScore = this.fistScore * 0.62 + scores.fist * 0.38;
        this.openScore = this.openScore * 0.62 + scores.open * 0.38;

        const burstThreshold = this.currentMode === 'burst' ? 0.5 : 0.58;
        const gatherThreshold = this.currentMode === 'burst' ? 0.42 : 0.5;

        if (this.fistScore > burstThreshold && this.fistScore > this.openScore * 0.9) {
          this.emit('burst', '发散破碎', this.fistScore, this.openScore);
        } else if (this.openScore > gatherThreshold || this.fistScore < 0.36) {
          this.emit('gather', '聚拢成形', 1 - this.fistScore, this.openScore);
        }
      }
    }

    requestAnimationFrame(this.detect);
  };

  private emit(mode: GestureMode, label: string, confidence: number, openConfidence: number) {
    this.currentMode = mode;
    this.onGesture({ mode, label, confidence, openConfidence });
  }
}

function getHandScores(landmarks: NormalizedLandmark[]): { fist: number; open: number } {
  let curled = 0;
  let extended = 0;

  for (let i = 0; i < fingerTips.length; i += 1) {
    const tip = landmarks[fingerTips[i]];
    const pip = landmarks[fingerPips[i]];
    const mcp = landmarks[fingerMcps[i]];
    const extension = distance(tip, mcp);
    const base = distance(pip, mcp);

    if (tip.y > pip.y + 0.016 || extension < base * 1.05) curled += 1;
    if (tip.y < pip.y - 0.026 && extension > base * 1.1) extended += 1;
  }

  const thumbTip = landmarks[4];
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  const palmWidth = Math.max(0.001, distance(indexMcp, pinkyMcp));
  const thumbSpread = distance(thumbTip, wrist) / palmWidth;
  const thumbFolded = distance(thumbTip, indexMcp) < palmWidth * 0.9;

  const fist = Math.min(1, (curled + (thumbFolded ? 1 : 0)) / 5);
  const open = Math.min(1, (extended + (thumbSpread > 1.15 ? 1 : 0)) / 5);
  return { fist, open };
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}
