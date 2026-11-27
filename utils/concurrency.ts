export type SettledResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export interface ConcurrencyOptions<T> {
  shouldStop?: (err: unknown) => boolean;
  onSettled?: (index: number, result: SettledResult<T>) => void;
}

/**
 * Run async tasks with a maximum concurrency limit.
 * Stops launching new unstarted tasks once `shouldStop(err)` returns true,
 * while allowing already in-flight tasks to finish.
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  opts?: ConcurrencyOptions<T>
): Promise<void> {
  if (tasks.length === 0) return;

  const effectiveLimit = Math.max(1, Math.floor(limit));
  const workerCount = Math.min(effectiveLimit, tasks.length);

  let nextIndex = 0;
  let stopped = false;

  const worker = async () => {
    while (!stopped && nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        const value = await tasks[index]();
        opts?.onSettled?.(index, { ok: true, value });
      } catch (error) {
        if (opts?.shouldStop?.(error)) {
          stopped = true;
        }
        opts?.onSettled?.(index, { ok: false, error });
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
