export type QueueState = "idle" | "running" | "paused" | "stopped" | "complete";

export class PausableQueue<T, R> {
  state: QueueState = "idle";
  readonly completed: R[] = [];
  private nextIndex = 0;
  private controllers = new Set<AbortController>();

  constructor(
    private readonly items: T[],
    private readonly concurrency: number,
    private readonly worker: (item: T, signal: AbortSignal) => Promise<R>,
    private readonly onResult?: (result: R, completed: number) => void,
  ) {}

  async start(): Promise<R[]> {
    if (this.state === "running" || this.state === "complete")
      return this.completed;
    this.state = "running";
    const workers = Array.from(
      { length: Math.min(this.concurrency, this.items.length) },
      () => this.runWorker(),
    );
    await Promise.all(workers);
    if (!this.isStopped() && this.nextIndex >= this.items.length)
      this.state = "complete";
    return this.completed;
  }

  pause(): void {
    if (this.state === "running") this.state = "paused";
  }

  resume(): Promise<R[]> {
    if (this.state !== "paused") return Promise.resolve(this.completed);
    return this.start();
  }

  stop(): void {
    this.state = "stopped";
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }

  private async runWorker(): Promise<void> {
    while (this.nextIndex < this.items.length && this.state === "running") {
      const index = this.nextIndex++;
      const controller = new AbortController();
      this.controllers.add(controller);
      try {
        const result = await this.worker(
          this.items[index] as T,
          controller.signal,
        );
        this.completed.push(result);
        this.onResult?.(result, this.completed.length);
      } catch (error) {
        if (!(
          this.isStopped() &&
          error instanceof DOMException &&
          error.name === "AbortError"
        )) {
          throw error;
        }
      } finally {
        this.controllers.delete(controller);
      }
    }
  }

  private isStopped(): boolean {
    return this.state === "stopped";
  }
}
