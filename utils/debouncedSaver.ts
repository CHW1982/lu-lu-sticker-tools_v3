export interface DebouncedSaver<T> {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
  getPending: () => T | null;
}

/**
 * Create a debounced async saver that supports immediate flushing on navigation/unmount
 * and targeted cancellation (e.g. when the pending item is deleted).
 */
export function createDebouncedSaver<T>(
  save: (value: T) => Promise<void>,
  delayMs: number
): DebouncedSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let hasPending = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (!hasPending) return;
    const valueToSave = pending as T;
    pending = null;
    hasPending = false;
    await save(valueToSave);
  };

  const schedule = (value: T): void => {
    pending = value;
    hasPending = true;
    clearTimer();
    timer = setTimeout(() => {
      void flush();
    }, delayMs);
  };

  const cancel = (): void => {
    clearTimer();
    pending = null;
    hasPending = false;
  };

  const getPending = (): T | null => (hasPending ? pending : null);

  return { schedule, flush, cancel, getPending };
}
