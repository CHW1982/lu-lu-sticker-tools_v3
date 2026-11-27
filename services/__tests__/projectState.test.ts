import { describe, it, expect } from 'vitest';
import { applyProjectUpdate, applySliceUpdate, applySlotsFailure } from '../projectState';
import { GridOption, ModelOption, Project } from '../../types';

function makeProject(id: string, slices: string[], updatedAt = 1000): Project {
  return {
    id,
    characterId: null,
    settings: {
      prompt: `Prompt ${id}`,
      referenceImage: null,
      referenceImage2: null,
      gridSize: GridOption.Grid8,
      model: ModelOption.NanoBananaPro,
      removeBackground: true,
      stylePreset: 'Classic Chibi Vector',
      textStylePreset: 'Colorful Pop Rounded',
      vibePreset: 'Threads Trending Memes',
      relationshipMode: 'general',
    },
    original: `data:image/png;base64,ORIG_${id}`,
    slices,
    mainIndex: 0,
    tabIndex: 0,
    createdAt: 1000,
    updatedAt,
  };
}

describe('applySliceUpdate', () => {
  it('updates the slice for the active project without mutating the original array', () => {
    const p1 = makeProject('p1', ['s0', 's1', 's2'], 1000);
    const p2 = makeProject('p2', ['b0', 'b1'], 900);
    const initial = [p1, p2];

    const result = applySliceUpdate(initial, 'p1', 1, 's1-new', 2000);

    expect(result.updatedProject).not.toBeNull();
    expect(result.updatedProject?.slices).toEqual(['s0', 's1-new', 's2']);
    expect(result.updatedProject?.updatedAt).toBe(2000);
    expect(result.projects.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(p1.slices).toEqual(['s0', 's1', 's2']);
  });

  it('updates only the targeted background project and leaves the active project untouched', () => {
    const activeB = makeProject('proj-b', ['b0', 'b1'], 3000);
    const bgA = makeProject('proj-a', ['a0', 'a1', 'a2'], 2000);
    const initial = [activeB, bgA];

    const result = applySliceUpdate(initial, 'proj-a', 2, 'a2-regen', 5000);

    expect(result.updatedProject?.id).toBe('proj-a');
    expect(result.updatedProject?.slices).toEqual(['a0', 'a1', 'a2-regen']);
    expect(result.updatedProject?.updatedAt).toBe(5000);
    expect(result.projects.map((p) => p.id)).toEqual(['proj-a', 'proj-b']);

    const untouchedB = result.projects.find((p) => p.id === 'proj-b');
    expect(untouchedB).toBe(activeB);
    expect(untouchedB?.slices).toEqual(['b0', 'b1']);
  });

  it('returns null and leaves projects unchanged when target project was deleted', () => {
    const p1 = makeProject('p1', ['s0', 's1'], 1000);
    const initial = [p1];

    const result = applySliceUpdate(initial, 'deleted-id', 0, 'new-img', 3000);

    expect(result.updatedProject).toBeNull();
    expect(result.projects).toBe(initial);
    expect(result.projects[0].slices).toEqual(['s0', 's1']);
  });

  it('returns null when slice index is out of bounds', () => {
    const p1 = makeProject('p1', ['s0', 's1'], 1000);
    const initial = [p1];

    expect(applySliceUpdate(initial, 'p1', -1, 'x', 2000).updatedProject).toBeNull();
    expect(applySliceUpdate(initial, 'p1', 2, 'x', 2000).updatedProject).toBeNull();
  });

  it('clears the updated index from failedSlots and removes failedSlots when empty', () => {
    const p1: Project = { ...makeProject('p1', ['', '', 's2'], 1000), failedSlots: [0, 1] };

    const afterFirst = applySliceUpdate([p1], 'p1', 0, 's0-ok', 2000);
    expect(afterFirst.updatedProject?.failedSlots).toEqual([1]);

    const afterSecond = applySliceUpdate(afterFirst.projects, 'p1', 1, 's1-ok', 3000);
    expect(afterSecond.updatedProject?.failedSlots).toBeUndefined();
  });
});

describe('applySlotsFailure', () => {
  it('marks valid failed indices deduplicated and sorted', () => {
    const p1 = makeProject('p1', ['', '', ''], 1000);
    const first = applySlotsFailure([p1], 'p1', [2, 0, 2], 2000);
    expect(first.updatedProject?.failedSlots).toEqual([0, 2]);

    const second = applySlotsFailure(first.projects, 'p1', [1, 0], 3000);
    expect(second.updatedProject?.failedSlots).toEqual([0, 1, 2]);
  });

  it('ignores deleted projects and out-of-bounds indices', () => {
    const p1 = makeProject('p1', ['a', 'b'], 1000);
    expect(applySlotsFailure([p1], 'missing', [0], 2000).updatedProject).toBeNull();
    expect(applySlotsFailure([p1], 'p1', [-1, 2], 2000).updatedProject).toBeNull();
  });
});

describe('applyProjectUpdate', () => {
  it('updates targeted background project without mutating others and returns null when missing', () => {
    const p1 = makeProject('p1', ['a0', 'a1'], 1000);
    const p2 = makeProject('p2', ['b0', 'b1'], 2000);
    const initial = [p2, p1];

    const res = applyProjectUpdate(initial, 'p1', (p) => ({ ...p, original: 'stitched' }), 5000);
    expect(res.updatedProject?.original).toBe('stitched');
    expect(res.updatedProject?.updatedAt).toBe(5000);
    expect(res.projects.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(p1.original).toBe('data:image/png;base64,ORIG_p1');

    expect(applyProjectUpdate(initial, 'deleted', (p) => p, 5000).updatedProject).toBeNull();
  });
});
