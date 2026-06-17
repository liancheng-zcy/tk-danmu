import { OrderedConcurrentQueue } from './message-queue';

function defer<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

describe('OrderedConcurrentQueue', () => {
  it('在并发执行时仍按 sequence 顺序输出', async () => {
    const order: string[] = [];
    const first = defer<void>();
    const second = defer<void>();

    const queue = new OrderedConcurrentQueue<string>({
      maxConcurrent: 2,
      maxPending: 10,
      onResult(result) {
        order.push(result);
      }
    });

    queue.enqueue({
      sequence: 0,
      timeoutMs: 5_000,
      run: async () => {
        await first.promise;
        return 'first';
      },
      onDrop: () => 'first-dropped'
    });
    queue.enqueue({
      sequence: 1,
      timeoutMs: 5_000,
      run: async () => {
        await second.promise;
        return 'second';
      },
      onDrop: () => 'second-dropped'
    });

    second.resolve();
    await Promise.resolve();
    expect(order).toEqual([]);

    first.resolve();
    await queue.onIdle();
    expect(order).toEqual(['first', 'second']);
  });

  it('超出上限时将最旧未开始任务降级输出', async () => {
    const order: string[] = [];
    const first = defer<void>();

    const queue = new OrderedConcurrentQueue<string>({
      maxConcurrent: 1,
      maxPending: 1,
      onResult(result) {
        order.push(result);
      }
    });

    queue.enqueue({
      sequence: 0,
      timeoutMs: 5_000,
      run: async () => {
        await first.promise;
        return 'running';
      },
      onDrop: () => 'running-dropped'
    });
    queue.enqueue({
      sequence: 1,
      timeoutMs: 5_000,
      run: async () => 'oldest-pending',
      onDrop: () => 'oldest-pending-dropped'
    });
    queue.enqueue({
      sequence: 2,
      timeoutMs: 5_000,
      run: async () => 'newest-pending',
      onDrop: () => 'newest-pending-dropped'
    });

    first.resolve();
    await queue.onIdle();
    expect(order).toEqual([
      'running',
      'oldest-pending-dropped',
      'newest-pending'
    ]);
  });

  it('同时运行中的任务数不会超过上限', async () => {
    const blockers = [
      defer<void>(),
      defer<void>(),
      defer<void>(),
      defer<void>(),
      defer<void>(),
      defer<void>()
    ];
    let runningCount = 0;
    let maxSeen = 0;

    const queue = new OrderedConcurrentQueue<string>({
      maxConcurrent: 4,
      maxPending: 10,
      onResult: () => undefined
    });

    blockers.forEach((blocker, index) => {
      queue.enqueue({
        sequence: index,
        timeoutMs: 5_000,
        run: async () => {
          runningCount += 1;
          maxSeen = Math.max(maxSeen, runningCount);
          await blocker.promise;
          runningCount -= 1;
          return `task-${index}`;
        },
        onDrop: () => `dropped-${index}`
      });
    });

    await Promise.resolve();
    expect(maxSeen).toBe(4);

    blockers.forEach((blocker) => blocker.resolve());
    await queue.onIdle();
    expect(maxSeen).toBe(4);
  });
});
