export interface Adjustments {
  brightness: number; // 0 - 200 (default 100)
  contrast: number;   // 0 - 200 (default 100)
  saturation: number; // 0 - 200 (default 100)
}

export interface Layer {
  id: string;           // 'particles' | 'highlights' | 'subject' | 'outline' | 'shadow' | 'atmosphere' | 'midground' | 'background' | 'sky' | 'original'
  name: string;
  src: string;          // Original URL or Object URL
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0 to 1
  adjustments: Adjustments;
  
  // Transform properties
  offsetX: number;      // -120 to 120 (px)
  offsetY: number;      // -120 to 120 (px)
  scale: number;        // 0.5 to 1.5
  
  // Effects & Filters
  blur: number;         // 0 to 40 (px)
  grayscale: number;    // 0 to 100 (%)
  sepia: number;        // 0 to 100 (%)
  hueRotate: number;    // 0 to 360 (deg)
  
  // Shadow & Glow effects
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  glowColor: string;
  glowBlur: number;
}

export interface AppState {
  originalImage: string | null;
  imageWidth: number;
  imageHeight: number;
  layers: Layer[];
  selectedLayerId: string;
  processing: boolean;
  progressKey: string;
  progressPercent: number;
  viewMode: 'stacked' | 'exploded' | 'side-by-side';
  explodedDepth: number; // 3D exploded separation depth (0 to 100)
  imageType: 'photo' | 'illustration';
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

export const createDefaultLayer = (id: string, name: string, src: string): Layer => ({
  id,
  name,
  src,
  visible: true,
  locked: false,
  opacity: 1.0,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  offsetX: 0,
  offsetY: 0,
  scale: 1.0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  glowColor: '#3b82f6',
  glowBlur: 0,
});
