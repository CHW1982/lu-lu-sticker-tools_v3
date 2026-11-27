import { Project } from '../types';

export interface ApplySliceUpdateResult {
  projects: Project[];
  updatedProject: Project | null;
}

/**
 * Purely update a specific project by ID using an updater function.
 * Returns the original projects array and `updatedProject: null` if the project was deleted.
 */
export function applyProjectUpdate(
  projects: Project[],
  projectId: string,
  updater: (project: Project) => Project,
  now: number = Date.now()
): ApplySliceUpdateResult {
  const target = projects.find((p) => p.id === projectId);
  if (!target) {
    return { projects, updatedProject: null };
  }

  const updatedProject: Project = {
    ...updater(target),
    updatedAt: now,
  };

  return {
    projects: [updatedProject, ...projects.filter((p) => p.id !== projectId)],
    updatedProject,
  };
}

/**
 * Purely update a single slice of a specific project by ID, clearing any failed mark for that slot.
 * Returns the original projects array and `updatedProject: null` if the project
 * was deleted or the index is out of bounds.
 */
export function applySliceUpdate(
  projects: Project[],
  projectId: string,
  index: number,
  image: string,
  now: number = Date.now()
): ApplySliceUpdateResult {
  const target = projects.find((p) => p.id === projectId);
  if (!target || index < 0 || index >= target.slices.length) {
    return { projects, updatedProject: null };
  }

  return applyProjectUpdate(
    projects,
    projectId,
    (current) => {
      const newSlices = [...current.slices];
      newSlices[index] = image;
      const remainingFailed = current.failedSlots?.filter((i) => i !== index);
      return {
        ...current,
        slices: newSlices,
        failedSlots: remainingFailed && remainingFailed.length > 0 ? remainingFailed : undefined,
      };
    },
    now
  );
}

/**
 * Purely record failed slot indices for a specific project by ID (deduplicated, sorted ascending).
 */
export function applySlotsFailure(
  projects: Project[],
  projectId: string,
  indices: number[],
  now: number = Date.now()
): ApplySliceUpdateResult {
  const target = projects.find((p) => p.id === projectId);
  if (!target) {
    return { projects, updatedProject: null };
  }

  const validIndices = indices.filter((i) => i >= 0 && i < target.slices.length);
  if (validIndices.length === 0) {
    return { projects, updatedProject: null };
  }

  return applyProjectUpdate(
    projects,
    projectId,
    (current) => {
      const merged = Array.from(new Set([...(current.failedSlots ?? []), ...validIndices])).sort(
        (a, b) => a - b
      );
      return {
        ...current,
        failedSlots: merged,
      };
    },
    now
  );
}
