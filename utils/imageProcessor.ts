import { GridOption } from "../types";
import JSZip from "jszip";

export const processFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Create an image to check dimensions and convert format
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit max dimension to avoid huge payloads (e.g. 1536px) which can cause latency or errors
        const maxDim = 1536; 
        let width = img.width;
        let height = img.height;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            // Fallback to original if canvas fails, though unlikely
            resolve(result);
            return;
        }
        
        // Fill white background to handle transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to JPEG to ensure compatibility with Gemini API (AVIF/HEIC not always supported)
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
         // If it's not a loadable image, just return the base64 and hope the API handles it or throws a clear error
         resolve(result);
      };
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to resize image for Main/Tab icons with Aspect Ratio Preservation (Contain)
export const resizeImage = (base64Str: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if(ctx) {
        // High quality resize
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas (transparent)
        ctx.clearRect(0, 0, width, height);

        // Calculate scale to FIT within the box (Contain)
        const scale = Math.min(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        
        // Center the image
        const x = (width - w) / 2;
        const y = (height - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const splitImage = (
  imageSrc: string,
  gridSize: GridOption,
  removeBackground: boolean = false
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 1. Setup grid calculations based on new LINE standards
      let rows = 4;
      let cols = 4;

      if (gridSize === GridOption.Grid8) {
        // 8 Stickers: 4 Columns x 2 Rows
        rows = 2;
        cols = 4;
      } else if (gridSize === GridOption.Grid24) {
        // 24 Stickers: 4 Columns x 6 Rows
        rows = 6;
        cols = 4;
      } else {
        // 16 Stickers: 4 Columns x 4 Rows
        rows = 4;
        cols = 4;
      }

      const tileWidth = Math.floor(img.width / cols);
      const tileHeight = Math.floor(img.height / rows);

      // LINE Sticker Max Dimensions
      const LINE_MAX_W = 370;
      const LINE_MAX_H = 320;

      const slices: string[] = [];

      // Temporary canvas for processing the raw cut
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      
      if (!tempCtx) {
          reject(new Error("Could not create canvas context"));
          return;
      }

      tempCanvas.width = tileWidth;
      tempCanvas.height = tileHeight;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          
          // --- Step A: Extract Raw Tile ---
          tempCtx.clearRect(0, 0, tileWidth, tileHeight);
          tempCtx.drawImage(
            img,
            c * tileWidth, r * tileHeight, tileWidth, tileHeight, // Source
            0, 0, tileWidth, tileHeight // Destination
          );

          // --- Step B: Remove Background (Optional) ---
          // Uses Green Screen Chroma Key (#00FF00)
          if (removeBackground) {
            const imageData = tempCtx.getImageData(0, 0, tileWidth, tileHeight);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const red = data[i];
              const green = data[i + 1];
              const blue = data[i + 2];

              // Chroma Key Logic for Green Screen
              // 1. Green must be dominant
              // 2. Green must be significantly brighter than Red and Blue
              if (green > 100 && green > red * 1.4 && green > blue * 1.4) {
                 data[i + 3] = 0; // Set alpha to 0 (transparent)
              }
            }
            tempCtx.putImageData(imageData, 0, 0);
          }

          // --- Step C: Resize to LINE Specs (370x320 max) ---
          // Calculate scale to fit within the box while preserving aspect ratio
          const scale = Math.min(
             LINE_MAX_W / tileWidth, 
             LINE_MAX_H / tileHeight
          );
          
          const finalW = Math.round(tileWidth * scale);
          const finalH = Math.round(tileHeight * scale);

          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = finalW;
          finalCanvas.height = finalH;
          const finalCtx = finalCanvas.getContext("2d");

          if (finalCtx) {
              // High quality scaling
              finalCtx.imageSmoothingEnabled = true;
              finalCtx.imageSmoothingQuality = 'high';
              
              finalCtx.drawImage(
                  tempCanvas, 
                  0, 0, tileWidth, tileHeight,
                  0, 0, finalW, finalH
              );
              
              slices.push(finalCanvas.toDataURL("image/png"));
          }
        }
      }
      resolve(slices);
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadAllImages = async (
    slices: string[], 
    prefix: string, 
    mainIndex: number = 0, 
    tabIndex: number = 0
) => {
    const zip = new JSZip();

    // 1. Add numbered stickers with STRICT LINE FILENAMES (01.png, 02.png...)
    slices.forEach((slice, index) => {
        // LINE requires strict "01.png", "02.png" format for batch upload
        const num = (index + 1).toString().padStart(2, '0');
        const base64Data = slice.split(',')[1];
        if (base64Data) {
            zip.file(`${num}.png`, base64Data, { base64: true });
        }
    });

    // 2. Add Main Image (240x240)
    if (slices[mainIndex]) {
        // Resize with Aspect Ratio Contain logic (handled in updated resizeImage)
        const mainResized = await resizeImage(slices[mainIndex], 240, 240);
        const mainData = mainResized.split(',')[1];
        if (mainData) zip.file('main.png', mainData, { base64: true });
    }

    // 3. Add Tab Image (96x74)
    if (slices[tabIndex]) {
        // Resize with Aspect Ratio Contain logic
        const tabResized = await resizeImage(slices[tabIndex], 96, 74);
        const tabData = tabResized.split(',')[1];
        if (tabData) zip.file('tab.png', tabData, { base64: true });
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        // The ZIP filename itself can be anything, but the contents must be specific
        link.download = `${prefix}_line_pack.zip`;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
        console.error("Failed to zip images:", err);
        alert("Failed to generate zip file.");
    }
};