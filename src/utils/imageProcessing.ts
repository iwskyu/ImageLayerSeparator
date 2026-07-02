import { Adjustments, Layer } from '../types';

/**
 * Loads an image from a source URL and returns an HTMLImageElement and its original dimensions
 */
export function loadImage(src: string): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image. If loading a sample, please check your network connection.'));
    };
    img.src = src;
  });
}

/**
 * Creates a cutout of the background by erasing the foreground from the original image.
 * Uses canvas globalCompositeOperation = 'destination-out'.
 */
export function createBackgroundCutout(
  originalImg: HTMLImageElement,
  foregroundImg: HTMLImageElement,
  width: number,
  height: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Step 1: Draw the original image
  ctx.drawImage(originalImg, 0, 0, width, height);

  // Step 2: Use destination-out to erase the foreground pixels
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(foregroundImg, 0, 0, width, height);

  // Return as Data URL
  return canvas.toDataURL('image/png');
}

/**
 * Advanced content-aware fill (Inpaint) algorithm for canvas images.
 * Fills designated holes by diffusing colors and textures from neighboring solid pixels.
 */
export function inpaintTransparentHoles(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  holeMask?: Uint8Array
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(sourceImg, 0, 0, width, height);
  
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  // Create a mask of transparent pixels
  const isHole = holeMask || new Uint8Array(width * height);
  if (!holeMask) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        isHole[i / 4] = 1;
      }
    }
  }

  // Iterative color propagation (Fast Heat-Diffusion Simulation)
  const maxPasses = 16;
  let passesDone = 0;
  let remainingHoles = true;

  while (passesDone < maxPasses && remainingHoles) {
    remainingHoles = false;
    const tempData = new Uint8ClampedArray(data);
    
    // Sweep pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        if (isHole[y * width + x] === 1 && data[idx + 3] === 0) {
          remainingHoles = true;
          
          // Gather neighbors with color values
          let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
          
          const neighbors = [
            idx - 4, idx + 4,              // left, right
            idx - width * 4, idx + width * 4, // top, bottom
            idx - width * 4 - 4, idx - width * 4 + 4,
            idx + width * 4 - 4, idx + width * 4 + 4
          ];

          for (const nIdx of neighbors) {
            if (tempData[nIdx + 3] > 0) {
              rSum += tempData[nIdx];
              gSum += tempData[nIdx + 1];
              bSum += tempData[nIdx + 2];
              aSum += tempData[nIdx + 3];
              count++;
            }
          }

          if (count > 0) {
            data[idx] = Math.round(rSum / count);
            data[idx + 1] = Math.round(gSum / count);
            data[idx + 2] = Math.round(bSum / count);
            data[idx + 3] = Math.round(aSum / count); // soft edge transition
          }
        }
      }
    }
    passesDone++;
  }

  // Coarse-grained Spiral/Distance Search for remaining deep center holes
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (isHole[y * width + x] === 1 && data[idx + 3] === 0) {
        let found = false;
        let radius = 2;
        const maxSearch = Math.max(width, height) / 3;

        while (!found && radius < maxSearch) {
          const steps = 12;
          for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const nx = Math.round(x + Math.cos(angle) * radius);
            const ny = Math.round(y + Math.sin(angle) * radius);
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              if (data[nIdx + 3] > 0) {
                data[idx] = data[nIdx];
                data[idx + 1] = data[nIdx + 1];
                data[idx + 2] = data[nIdx + 2];
                data[idx + 3] = 255;
                found = true;
                break;
              }
            }
          }
          radius += 4;
        }
      }
    }
  }

  // Blending pass: Apply a highly localized box blur ONLY inside the inpainted border area
  // to avoid texture boundaries looking jagged
  const tempData = new Uint8ClampedArray(data);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = (y * width + x) * 4;
      // If this pixel was originally a hole boundary, blur it slightly
      if (isHole[y * width + x] === 1) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const kIdx = ((y + ky) * width + (x + kx)) * 4;
            rSum += tempData[kIdx];
            gSum += tempData[kIdx + 1];
            bSum += tempData[kIdx + 2];
            count++;
          }
        }
        data[idx] = Math.round(rSum / count);
        data[idx + 1] = Math.round(gSum / count);
        data[idx + 2] = Math.round(bSum / count);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Extracts a custom brushed region from a layer as a separate part, and inpaints the remainder of the layer
 */
export function extractPartAndInpaint(
  sourceImg: HTMLImageElement,
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number
): { partUrl: string; baseInpaintedUrl: string } {
  // Canvas 1: The extracted item/weapon part
  const partCanvas = document.createElement('canvas');
  partCanvas.width = width;
  partCanvas.height = height;
  const partCtx = partCanvas.getContext('2d');

  // Canvas 2: The base layer with those pixels removed (to be inpainted)
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext('2d');

  if (!partCtx || !baseCtx) {
    throw new Error('Failed to create canvas context');
  }

  // Draw original image on both
  partCtx.drawImage(sourceImg, 0, 0, width, height);
  baseCtx.drawImage(sourceImg, 0, 0, width, height);

  // Read original image pixel data to identify non-transparent areas
  const originalImgData = baseCtx.getImageData(0, 0, width, height);
  const originalData = originalImgData.data;

  // Read mask canvas to identify brush strokes
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) {
    throw new Error('Failed to get mask canvas context');
  }
  const maskImgData = maskCtx.getImageData(0, 0, width, height);
  const maskData = maskImgData.data;

  // Build the hole mask ONLY for pixels that were originally visible AND are now masked
  const holeMask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const isOriginallySolid = originalData[idx + 3] > 10;
    const isMasked = maskData[idx + 3] > 10;
    if (isOriginallySolid && isMasked) {
      holeMask[i] = 1;
    }
  }

  // Clip Part: keep only where mask is drawn (source-in)
  partCtx.save();
  partCtx.globalCompositeOperation = 'destination-in';
  partCtx.drawImage(maskCanvas, 0, 0, width, height);
  partCtx.restore();

  // Erase Base: erase where mask is drawn (destination-out)
  baseCtx.save();
  baseCtx.globalCompositeOperation = 'destination-out';
  baseCtx.drawImage(maskCanvas, 0, 0, width, height);
  baseCtx.restore();

  // Inpaint the empty hole in the base layer with precise region constraint
  const baseInpaintedUrl = inpaintTransparentHoles(baseCanvas, width, height, holeMask);

  return {
    partUrl: partCanvas.toDataURL('image/png'),
    baseInpaintedUrl,
  };
}

/**
 * Intelligently analyzes a composite background image and segments it into:
 * 1. Sky (Upper bright or blue/orange pixels)
 * 2. Trees / Midground (Mid elevation, darker forest greens/browns)
 * 3. Grass / Ground (Lower green/yellow/ground colors)
 * While automatically running the inpainting algorithm on each respective layer below!
 */
export function autoSegmentBackground(
  backgroundImg: HTMLImageElement,
  width: number,
  height: number
): { skyUrl: string; treesUrl: string; grassUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas error');

  ctx.drawImage(backgroundImg, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Create empty arrays for individual components
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = width; skyCanvas.height = height;
  const skyCtx = skyCanvas.getContext('2d')!;
  const skyData = skyCtx.createImageData(width, height);

  const treesCanvas = document.createElement('canvas');
  treesCanvas.width = width; treesCanvas.height = height;
  const treesCtx = treesCanvas.getContext('2d')!;
  const treesData = treesCtx.createImageData(width, height);

  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = width; grassCanvas.height = height;
  const grassCtx = grassCanvas.getContext('2d')!;
  const grassData = grassCtx.createImageData(width, height);

  // Classify each pixel based on color (HSL) and vertical layout/altitude
  for (let y = 0; y < height; y++) {
    const altitudeRatio = y / height; // 0 (top) to 1 (bottom)
    
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a === 0) continue;

      // Color analysis
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      let h = 0;
      if (delta > 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
      }
      const l = (max + min) / 2 / 255;
      const s = delta === 0 ? 0 : delta / 255 / (1 - Math.abs(2 * l - 1));

      // CLASSIFIER LOGIC
      // 1. Sky classification: Upper half with high luminance, or blue colors (H: 170-260) or warm sky colors (S, L bounds)
      const isBlueSky = (h >= 170 && h <= 270 && s > 0.1);
      const isWarmSunsetSky = (h >= 10 && h <= 55 && l > 0.45 && altitudeRatio < 0.5);
      const isUpperBrightSky = (altitudeRatio < 0.35 && l > 0.6);

      if (isBlueSky || isWarmSunsetSky || isUpperBrightSky) {
        // Assign to Sky
        skyData.data[idx] = r;
        skyData.data[idx + 1] = g;
        skyData.data[idx + 2] = b;
        skyData.data[idx + 3] = a;
      } 
      // 2. Grass / Ground classification: Lower elevation (altitudeRatio > 0.55), or green/yellow-green hues (H: 35-150)
      else if (altitudeRatio > 0.65 || (h >= 35 && h <= 150 && altitudeRatio > 0.4)) {
        grassData.data[idx] = r;
        grassData.data[idx + 1] = g;
        grassData.data[idx + 2] = b;
        grassData.data[idx + 3] = a;
      }
      // 3. Middle trees / buildings / scenery elements
      else {
        treesData.data[idx] = r;
        treesData.data[idx + 1] = g;
        treesData.data[idx + 2] = b;
        treesData.data[idx + 3] = a;
      }
    }
  }

  // Put data into respective canvases
  skyCtx.putImageData(skyData, 0, 0);
  treesCtx.putImageData(treesData, 0, 0);
  grassCtx.putImageData(grassData, 0, 0);

  // Perform professional inpainting on layers to patch holes where elements were separated
  const grassUrl = inpaintTransparentHoles(grassCanvas, width, height);
  const treesUrl = inpaintTransparentHoles(treesCanvas, width, height);
  const skyUrl = inpaintTransparentHoles(skyCanvas, width, height);

  return {
    skyUrl,
    treesUrl,
    grassUrl,
  };
}

/**
 * Creates an outline stroke around the subject
 */
export function createSubjectOutline(
  subjectImg: HTMLImageElement,
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  // We use multiple offsets to draw a thick stroke in solid color
  const borderSize = Math.max(isIllustration ? 5 : 3, Math.round(Math.min(width, height) * (isIllustration ? 0.009 : 0.006)));
  const offsets = [];
  for (let x = -borderSize; x <= borderSize; x += 2) {
    for (let y = -borderSize; y <= borderSize; y += 2) {
      if (x * x + y * y <= borderSize * borderSize) {
        offsets.push({ x, y });
      }
    }
  }

  // Draw subject in offsets
  offsets.forEach(({ x, y }) => {
    ctx.drawImage(subjectImg, x, y, width, height);
  });

  // Turn into solid cyan/blue for photos, or glowing magenta/gold for illustrations
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = isIllustration ? '#ec4899' : '#3b82f6'; // Pink-magenta glow for illustrations, cool blue for photos
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Remove the inside using the original subject
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(subjectImg, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Creates a dedicated black silhouette of the subject to be used for shadows
 */
export function createSubjectShadow(
  subjectImg: HTMLImageElement,
  width: number,
  height: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.drawImage(subjectImg, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Creates a high-luminance highlight layer of the subject
 */
export function createSubjectHighlights(
  subjectImg: HTMLImageElement,
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw original subject
  ctx.drawImage(subjectImg, 0, 0, width, height);
  
  // Extract high luminance pixels
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const threshold = isIllustration ? 145 : 130; // Illustration needs crisper highlights
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 0) {
        // Convert to luminance
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma < threshold) {
          data[i + 3] = 0; // Erase dark colors
        } else {
          // Amplify highlights
          data[i] = Math.min(255, r * (isIllustration ? 1.8 : 1.6));
          data[i + 1] = Math.min(255, g * (isIllustration ? 1.8 : 1.6));
          data[i + 2] = Math.min(255, b * (isIllustration ? 1.8 : 1.6));
          data[i + 3] = Math.round(a * 0.95);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn('Fallback due to cross-origin or canvas read error', e);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Creates an atmospheric fog/mist gradient layer
 */
export function createAtmosphereFog(
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw soft horizontal fog puffs
  const grad = ctx.createLinearGradient(0, height * 0.1, 0, height);
  if (isIllustration) {
    // Beautiful fantasy purple/indigo mist aura
    grad.addColorStop(0, 'rgba(139, 92, 246, 0)');
    grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
    grad.addColorStop(1, 'rgba(236, 72, 153, 0.25)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(235, 245, 255, 0.08)');
    grad.addColorStop(1, 'rgba(220, 240, 255, 0.25)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soft foggy circles in the lower midground
  ctx.fillStyle = isIllustration ? 'rgba(236, 72, 153, 0.06)' : 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 5; i++) {
    const cx = (0.2 + 0.6 * Math.random()) * width;
    const cy = height * 0.65 + Math.random() * height * 0.35;
    const r = Math.max(120, Math.random() * (width * 0.25));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Creates a floating bokeh particle/dust overlay or magical star sparkles for illustrations
 */
export function createParticlesOverlay(
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const count = isIllustration ? 28 : 35;
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * (isIllustration ? 9 : 7) + 3; // radius 3px to 12px
    
    if (isIllustration && Math.random() > 0.4) {
      // Draw 4-point star sparkles for illustration
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const alpha = Math.random() * 0.5 + 0.3;
      const hue = Math.random() > 0.5 ? '255, 235, 120' : '255, 130, 230'; // Gold or Pink star
      grad.addColorStop(0, `rgba(${hue}, ${alpha})`);
      grad.addColorStop(0.3, `rgba(${hue}, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      // Draw four-point star path
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + r);
      ctx.quadraticCurveTo(cx, cy, cx - r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - r);
      ctx.closePath();
      ctx.fill();
    } else {
      // Normal circular soft bokeh
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const alpha = Math.random() * 0.35 + 0.15;
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.4, `rgba(255, 254, 230, ${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Creates a highly-saturated, vibrant sky backdrop for illustrations or deep sky for photos
 */
export function createSkyBackdrop(
  backgroundImg: HTMLImageElement,
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  // Stretches and draws background
  ctx.drawImage(backgroundImg, -width * 0.15, -height * 0.15, width * 1.3, height * 1.3);
  
  // Overlay gradient for atmosphere depth
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (isIllustration) {
    // Vivid sunset/dusk anime horizon gradient (Deep Purple to Coral Orange)
    grad.addColorStop(0, 'rgba(24, 18, 54, 0.7)');
    grad.addColorStop(0.4, 'rgba(109, 40, 217, 0.4)');
    grad.addColorStop(0.8, 'rgba(244, 63, 94, 0.35)');
    grad.addColorStop(1, 'rgba(251, 146, 60, 0.5)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 15, 0.45)');
    grad.addColorStop(1, 'rgba(30, 20, 40, 0.2)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Creates a framed vignette and high-contrast version of background as midground
 */
export function createMidgroundVignette(
  backgroundImg: HTMLImageElement,
  width: number,
  height: number,
  isIllustration = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw the background image
  ctx.drawImage(backgroundImg, 0, 0, width, height);

  // Radial vignette shadow
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  if (isIllustration) {
    // Artistic dark indigo/violet framing
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(46, 16, 101, 0.12)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  }
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/png');
}

/**
 * Generates the CSS filter string for any layer based on its parameters
 */
export function getFilterString(layer: Layer): string {
  const filters: string[] = [];

  // Adjustments
  if (layer.adjustments.brightness !== 100) {
    filters.push(`brightness(${layer.adjustments.brightness}%)`);
  }
  if (layer.adjustments.contrast !== 100) {
    filters.push(`contrast(${layer.adjustments.contrast}%)`);
  }
  if (layer.adjustments.saturation !== 100) {
    filters.push(`saturate(${layer.adjustments.saturation}%)`);
  }

  // General Filters
  if (layer.blur > 0) {
    filters.push(`blur(${layer.blur}px)`);
  }
  if (layer.grayscale > 0) {
    filters.push(`grayscale(${layer.grayscale}%)`);
  }
  if (layer.sepia > 0) {
    filters.push(`sepia(${layer.sepia}%)`);
  }
  if (layer.hueRotate > 0) {
    filters.push(`hue-rotate(${layer.hueRotate}deg)`);
  }

  // Drop Shadow
  if (layer.shadowBlur > 0) {
    filters.push(`drop-shadow(${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor})`);
  }

  // Glow (bloom effect using drop-shadow)
  if (layer.glowBlur > 0) {
    filters.push(`drop-shadow(0 0 ${layer.glowBlur}px ${layer.glowColor})`);
  }

  return filters.join(' ') || 'none';
}

/**
 * Stitch all layers together to form a final high-res composite image
 */
export async function generateCompositeBlob(
  layers: Layer[],
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Draw layers from bottom (index layers.length - 1) to top (index 0)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || !layer.src || layer.id === 'original') continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    // Apply adjustments & filters
    const filterString = getFilterString(layer);
    if (filterString !== 'none') {
      ctx.filter = filterString;
    }

    // Load layer image
    const { img } = await loadImage(layer.src);

    // Apply translation & transform
    const scale = layer.scale;
    const dx = layer.offsetX;
    const dy = layer.offsetY;

    if (scale !== 1 || dx !== 0 || dy !== 0) {
      ctx.translate(width / 2 + dx, height / 2 + dy);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to export image'));
      }
    }, 'image/png');
  });
}
