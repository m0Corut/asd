
import { GoogleGenAI } from "@google/genai";

export type ProcessingModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export type SupportedAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

const getClosestAspectRatio = (width: number, height: number): SupportedAspectRatio => {
  const ratio = width / height;
  if (ratio > 1.5) return "16:9";
  if (ratio > 1.1) return "4:3";
  if (ratio < 0.6) return "9:16";
  if (ratio < 0.8) return "3:4";
  return "1:1";
};

export const removeMarkFromImage = async (
  base64Data: string,
  mimeType: string,
  width: number,
  height: number,
  instruction: string,
  model: ProcessingModel = 'gemini-2.5-flash-image',
  preserveQuality: boolean = true
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API key is not configured.");

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Data.split(',')[1] || base64Data;
  const aspectRatio = getClosestAspectRatio(width, height);

  const systemConstraints = `
    OBJECTIVE: High-fidelity removal of artificial overlays (watermarks, logos, text, stamps).
    CRITICAL RULE: DO NOT REMOVE, CHANGE, OR BLUR real physical objects (e.g. faucets, sinks, furniture).
    TARGET ONLY: The artificial elements described in the task.
    INPAINTING: Reconstruct the area perfectly using surrounding textures.
  `;

  // Model-specific settings
  const isPro = model === 'gemini-3-pro-image-preview';
  
  // imageSize is only supported by Gemini 3 Pro. 
  // Including it for Gemini 2.5 Flash causes a 400 error.
  const imageSize = isPro ? "2K" : "1K";
  
  const qualityInstruction = preserveQuality 
    ? `QUALITY: Maximize ${isPro ? '2K' : 'native'} resolution fidelity. Keep natural grain. No artificial smoothing.` 
    : "QUALITY: Clean blending.";

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio
      }
    };

    // CRITICAL FIX: Only add imageSize for Pro model per SDK rules
    if (isPro) {
      config.imageConfig.imageSize = "2K";
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: mimeType } },
          { text: `${systemConstraints}\n\nTask: ${instruction}\n\nTechnical Standard: ${qualityInstruction}` },
        ],
      },
      config: config
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("No output generated.");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("AI returned no image data.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message?.toLowerCase() || "";
    
    if (msg.includes("403") || msg.includes("permission")) {
      if (isPro) {
        throw new Error("403: Pro model requires a PAID API key. Try switching to 'Standard (Flash)' engine.");
      }
      throw new Error("403: Permission denied. Check your API key or usage limits.");
    }
    
    // Catch-all for the specific Gempix 2 recipe error seen in logs
    if (msg.includes("gempix") || msg.includes("image_size")) {
        throw new Error("Configuration Error: The selected model does not support the current quality settings. Try using 'Standard' mode.");
    }
    
    throw new Error(error.message || "Processing failed.");
  }
};

export const matchResolution = (
  originalUrl: string,
  processedUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png', 1.0));
      } else {
        resolve(processedUrl);
      }
    };
    img.src = processedUrl;
  });
};
