import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncedSaver } from '../debouncedSaver';

describe('createDebouncedSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces consecutive schedule calls and saves only the last value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createDebouncedSaver<string>(save, 500);

    saver.schedule('first');
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule('second');
    await vi.advanceTimersByTimeAsync(300);
    expect(save).not.toHaveBeenCalled();

    saver.schedule('third');
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('third');
    expect(saver.getPending()).toBeNull();
  });

  it('flush saves immediately and prevents duplicate timer execution', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createDebouncedSaver<string>(save, 500);

    saver.schedule('latest');
    expect(saver.getPending()).toBe('latest');

    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('latest');
    expect(saver.getPending()).toBeNull();

    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel clears pending value and prevents save on timer or flush', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createDebouncedSaver<string>(save, 500);

    saver.schedule('doomed');
    expect(saver.getPending()).toBe('doomed');

    saver.cancel();
    expect(saver.getPending()).toBeNull();

    await vi.advanceTimersByTimeAsync(1000);
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('flush does nothing when there is no pending value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createDebouncedSaver<string>(save, 500);

    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });
});
