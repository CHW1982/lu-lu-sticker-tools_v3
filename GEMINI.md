# Lu Lu Sticker Tools v3 - Project Instructions

## 🎯 Project Vision
A professional, client-side LINE sticker generation and processing tool. It leverages Gemini's multi-modal capabilities to generate high-quality, character-consistent sticker sheets and provides a "Valley Finding" algorithm for intelligent slicing.

## 🛠 Tech Stack
- **Frontend**: React 19 (utilizing React Compiler), Tailwind CSS
- **Build Tool**: Vite 6
- **AI Integration**: `@google/genai` (Gemini 1.5 Pro/Flash)
- **Image Processing**: Canvas API (Client-side), JSZip for packaging.

## 📜 Development Guidelines

### 0. Security Mandate (TOP PRIORITY)
- **STRICTLY PROHIBITED**: Do not upload API Keys or personal data to GitHub or Vercel. 
- **Client-Side Storage**: In this project, API keys are stored in `localStorage` with an auto-expiry mechanism. Ensure this logic is never bypassed.

### 1. React 19 Patterns
- Use functional components and hooks. 
- Leverage React 19's improved performance; avoid unnecessary `useMemo` unless profiling shows a bottleneck.
- Component state should be kept as local as possible.

### 2. Gemini Service (`services/geminiService.ts`)
- All AI logic (prompt engineering, image generation calls) must reside here.
- Prompt templates for different styles (Q-style, Pixel, etc.) are managed within this service.
- **Safety**: Ensure API keys are never logged. Use the expiration logic in `App.tsx` for storage.

### 3. Slicing Algorithm (`utils/imageProcessor.ts`)
- **Valley Finding**: This is a critical custom algorithm. It detects transparency "valleys" between stickers to prevent cutting through graphics or text. 
- When modifying this, test with various grid sizes (8, 16, 24).
- **Sticker Auditor**: Enforce LINE's requirement for even-numbered dimensions and the 10px safe margin.

### 4. Styling
- Use the custom `lulu` color palette defined in `tailwind.config.ts`.
- Maintain the "Cute & Professional" aesthetic: rounded corners (`rounded-xl`), soft shadows, and high contrast for toolbars.

## 🚀 Roadmap
1. **SVG Text Overlays**: Allow users to add custom text to stickers after generation but before slicing.
2. **Character LoRA Support**: If moving to a backend-based worker, integrate stable diffusion LoRA for perfect character consistency.
3. **PWA Support**: Enable offline access for the editor components.

---
Refer to `README.md` for deployment and setup instructions.
