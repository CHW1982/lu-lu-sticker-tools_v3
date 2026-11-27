import { describe, it, expect, vi } from 'vitest';
import { runWithConcurrency, SettledResult } from '../concurrency';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('runWithConcurrency', () => {
  it('never exceeds the concurrency limit and reaches it when tasks > limit', async () => {
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(15);
      active--;
      return i;
    });

    await runWithConcurrency(tasks, 2);

    expect(maxActive).toBe(2);
  });

  it('executes all tasks and reports each index and success value via onSettled', async () => {
    const settled = new Map<number, SettledResult<string>>();

    const tasks = [0, 1, 2, 3, 4].map((i) => async () => {
      await delay((5 - i) * 3);
      return `res-${i}`;
    });

    await runWithConcurrency(tasks, 2, {
      onSettled: (index, result) => {
        settled.set(index, result);
      },
    });

    expect(settled.size).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(settled.get(i)).toEqual({ ok: true, value: `res-${i}` });
    }
  });

  it('stops launching unstarted tasks when shouldStop returns true while letting in-flight tasks finish', async () => {
    const started: number[] = [];
    const finished: number[] = [];
    const settled = new Map<number, SettledResult<string>>();

    let releaseTask1!: () => void;
    const task1Gate = new Promise<void>((resolve) => {
      releaseTask1 = resolve;
    });

    const tasks = [
      async () => {
        started.push(0);
        await delay(5);
        throw new Error('FATAL_QUOTA');
      },
      async () => {
        started.push(1);
        await task1Gate;
        finished.push(1);
        return 'ok-1';
      },
      async () => {
        started.push(2);
        return 'ok-2';
      },
      async () => {
        started.push(3);
        return 'ok-3';
      },
    ];

    const runPromise = runWithConcurrency(tasks, 2, {
      shouldStop: (err) => err instanceof Error && err.message === 'FATAL_QUOTA',
      onSettled: (index, result) => {
        settled.set(index, result);
      },
    });

    // Wait enough for task 0 to reject while task 1 is still in-flight
    await delay(20);
    expect(started).toEqual([0, 1]);
    expect(finished).toEqual([]);

    releaseTask1();
    await runPromise;

    expect(started).toEqual([0, 1]);
    expect(finished).toEqual([1]);
    expect(settled.get(0)?.ok).toBe(false);
    expect(settled.get(1)).toEqual({ ok: true, value: 'ok-1' });
    expect(settled.has(2)).toBe(false);
    expect(settled.has(3)).toBe(false);
  });

  it('continues executing remaining tasks when shouldStop returns false', async () => {
    const settled = new Map<number, SettledResult<number>>();
    const boom = new Error('SAFETY_BLOCKED');

    const tasks = [
      async () => 10,
      async () => {
        throw boom;
      },
      async () => 30,
      async () => 40,
    ];

    await runWithConcurrency(tasks, 2, {
      shouldStop: () => false,
      onSettled: (index, result) => {
        settled.set(index, result);
      },
    });

    expect(settled.get(0)).toEqual({ ok: true, value: 10 });
    expect(settled.get(1)).toEqual({ ok: false, error: boom });
    expect(settled.get(2)).toEqual({ ok: true, value: 30 });
    expect(settled.get(3)).toEqual({ ok: true, value: 40 });
  });

  it('handles empty task lists and clamps limit <= 0 to 1', async () => {
    const onSettled = vi.fn();
    await runWithConcurrency([], 2, { onSettled });
    expect(onSettled).not.toHaveBeenCalled();

    let active = 0;
    let maxActive = 0;
    const tasks = [0, 1, 2].map((i) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(5);
      active--;
      return i;
    });

    await runWithConcurrency(tasks, 0, { onSettled });
    expect(maxActive).toBe(1);
    expect(onSettled).toHaveBeenCalledTimes(3);
  });
});
