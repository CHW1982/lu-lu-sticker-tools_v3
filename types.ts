export enum GridOption {
  Grid8 = 8,
  Grid16 = 16,
  Grid24 = 24,
}

export enum ModelOption {
  NanoBananaPro = 'gemini-3-pro-image-preview',
  FlashImage = 'gemini-2.5-flash-image',
}

export interface GeneratedImage {
  original: string; // Base64
  slices: string[]; // Array of Base64
}

export interface StickerIntent {
  text: string;        // The text to render on image (e.g. "早安")
  description: string; // The context/mood prompt (e.g. "Greeting, energetic")
  visual: string;      // The action/visual description
}

export interface GenerationSettings {
  prompt: string; // Character Subject
  referenceImage: string | null; // Base64 (Main Character)
  referenceImage2: string | null; // Base64 (Sidekick)
  gridSize: GridOption;
  model: ModelOption;
  removeBackground: boolean;
  
  // New Preset Options
  stylePreset: string;
  textStylePreset: string;
  vibePreset: string;
  relationshipMode: 'general' | 'couple' | 'office' | 'friends';
  
  // Customization
  customIntents?: StickerIntent[];

  // Character persistence
  characterSheet?: string | null;
  characterId?: string | null;
  generationMode?: 'perSlot' | 'sheet';
}

export interface Character {
  id: string;
  name: string;
  prompt: string;
  stylePreset: string;
  textStylePreset: string;
  referenceImage: string | null;
  referenceImage2: string | null;
  characterSheet: string | null;
  createdAt: number;
}

export interface Project {
  id: string;
  characterId: string | null;
  settings: GenerationSettings;
  original: string;
  slices: string[];
  failedSlots?: number[];
  mainIndex: number;
  tabIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface ValidationIssue {
  type: 'margin' | 'chroma_residue' | 'dimension' | 'filesize' | 'opaque_background';
  severity: 'error' | 'warning';
  message: string;
  autoFixable: boolean;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}