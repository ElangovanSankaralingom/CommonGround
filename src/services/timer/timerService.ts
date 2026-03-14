export class TimerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private remainingSeconds: number;
  private durationSeconds: number;
  private onTick: (remaining: number) => void;
  private onComplete: () => void;
  private running: boolean = false;

  constructor(
    durationSeconds: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ) {
    this.durationSeconds = durationSeconds;
    this.remainingSeconds = durationSeconds;
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  start(): void {
    if (this.running) return;

    this.remainingSeconds = this.durationSeconds;
    this.running = true;

    this.onTick(this.remainingSeconds);

    this.intervalId = setInterval(() => {
      this.remainingSeconds -= 1;
      this.onTick(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  pause(): void {
    if (!this.running || this.intervalId === null) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.running = false;
  }

  resume(): void {
    if (this.running) return;
    if (this.remainingSeconds <= 0) return;

    this.running = true;

    this.intervalId = setInterval(() => {
      this.remainingSeconds -= 1;
      this.onTick(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  isRunning(): boolean {
    return this.running;
  }
}
