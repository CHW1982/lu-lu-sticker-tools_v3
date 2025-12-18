export enum GridOption {
  Grid8 = 8,
  Grid16 = 16,
  Grid24 = 24,
}

export enum ModelOption {
  NanoBananaPro = 'gemini-3-pro-image-preview',
  Gemini3Pro = 'gemini-3-pro-image-preview-alt', // Maps to same underlying model but keeps UI distinct as requested
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
  
  // Customization
  customIntents?: StickerIntent[];
}