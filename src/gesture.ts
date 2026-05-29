import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type GestureMode = 'gather' | 'burst';

export type GestureState = {
  mode: GestureMode;
  label: string;
  confidence: number;
};

type GestureCallback = (state: GestureState) => void;

const fingerTips = [8, 12, 16, 20];
const fingerPips = [6, 10, 14, 18];

export class GestureController {
  private video: HTMLVideoElement;
  private status: HTMLElement;
  private onGesture: GestureCallback;
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  private stableScore = 0;

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
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });

    this.video.srcObject = stream;
    await this.video.play();
    this.status.textContent = '张掌聚拢，握拳发散';
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
      const fistConfidence = landmarks ? getFistConfidence(landmarks) : 0;
      this.stableScore = this.stableScore * 0.78 + fistConfidence * 0.22;

      if (this.stableScore > 0.58) {
        this.onGesture({ mode: 'burst', label: '发散', confidence: this.stableScore });
      } else {
        this.onGesture({ mode: 'gather', label: landmarks ? '聚拢' : '未检测到手', confidence: 1 - this.stableScore });
      }
    }

    requestAnimationFrame(this.detect);
  };
}

function getFistConfidence(landmarks: NormalizedLandmark[]): number {
  let curled = 0;
  for (let i = 0; i < fingerTips.length; i += 1) {
    const tip = landmarks[fingerTips[i]];
    const pip = landmarks[fingerPips[i]];
    if (tip.y > pip.y + 0.02) {
      curled += 1;
    }
  }

  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  const palmWidth = Math.abs(indexMcp.x - pinkyMcp.x);
  const thumbFolded = Math.abs(thumbTip.x - indexMcp.x) < palmWidth * 1.15;
  const raw = (curled + (thumbFolded ? 1 : 0)) / 5;
  return Math.max(0, Math.min(1, raw));
}
