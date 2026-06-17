interface OrderedTask<T> {
  sequence: number;
  timeoutMs: number;
  run: (signal: AbortSignal) => Promise<T>;
  onDrop: () => T;
}

interface OrderedConcurrentQueueOptions<T> {
  maxConcurrent: number;
  maxPending: number;
  onResult: (result: T) => void;
}

export class OrderedConcurrentQueue<T> {
  private readonly maxConcurrent: number;

  private readonly maxPending: number;

  private readonly onResult: (result: T) => void;

  private readonly pending: Array<OrderedTask<T>> = [];

  private readonly completed = new Map<number, T>();

  private runningCount = 0;

  private nextSequence = 0;

  private idleWaiters: Array<() => void> = [];

  constructor(options: OrderedConcurrentQueueOptions<T>) {
    this.maxConcurrent = options.maxConcurrent;
    this.maxPending = options.maxPending;
    this.onResult = options.onResult;
  }

  enqueue(task: OrderedTask<T>) {
    if (this.pending.length >= this.maxPending) {
      const dropped = this.pending.shift();
      if (dropped) {
        this.completed.set(dropped.sequence, dropped.onDrop());
        this.flushReadyResults();
      }
    }

    this.pending.push(task);
    this.pump();
  }

  async onIdle(): Promise<void> {
    if (this.runningCount === 0 && this.pending.length === 0 && this.completed.size === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  private pump() {
    while (this.runningCount < this.maxConcurrent && this.pending.length > 0) {
      const task = this.pending.shift();
      if (!task) {
        break;
      }

      this.runningCount += 1;
      void this.runTask(task);
    }
  }

  private async runTask(task: OrderedTask<T>) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, task.timeoutMs);

    try {
      const result = await task.run(controller.signal);
      this.completed.set(task.sequence, result);
    } finally {
      clearTimeout(timeoutId);
      this.runningCount -= 1;
      this.flushReadyResults();
      this.pump();
      this.resolveIdleWaitersIfNeeded();
    }
  }

  private flushReadyResults() {
    while (this.completed.has(this.nextSequence)) {
      const result = this.completed.get(this.nextSequence);
      this.completed.delete(this.nextSequence);

      if (result !== undefined) {
        this.onResult(result);
      }

      this.nextSequence += 1;
    }
  }

  private resolveIdleWaitersIfNeeded() {
    if (this.runningCount > 0 || this.pending.length > 0 || this.completed.size > 0) {
      return;
    }

    const waiters = [...this.idleWaiters];
    this.idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
