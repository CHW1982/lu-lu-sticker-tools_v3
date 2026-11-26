import { Project } from '../types';

export interface ApplySliceUpdateResult {
  projects: Project[];
  updatedProject: Project | null;
}

/**
 * Purely update a single slice of a specific project by ID.
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

  const newSlices = [...target.slices];
  newSlices[index] = image;

  const updatedProject: Project = {
    ...target,
    slices: newSlices,
    updatedAt: now,
  };

  return {
    projects: [updatedProject, ...projects.filter((p) => p.id !== projectId)],
    updatedProject,
  };
}
