import React, { useState, useEffect, useRef } from 'react';
import { AppState, Layer } from '../types';
import { getFilterString } from '../utils/imageProcessing';
import { Layers, Cuboid as Cube, LayoutGrid, Sparkles, Paintbrush, Trash2, Scissors, HelpCircle } from 'lucide-react';

interface InteractiveStageProps {
  appState: AppState;
  onViewModeChange: (mode: 'stacked' | 'exploded' | 'side-by-side') => void;
  onExplodedDepthChange: (depth: number) => void;
  onSelectLayer: (id: string) => void;
  onExtractCustomPart: (layerId: string, maskCanvas: HTMLCanvasElement, partName: string) => void;
  onAutoSegmentBackground: () => void;
}

export default function InteractiveStage({
  appState,
  onViewModeChange,
  onExplodedDepthChange,
  onSelectLayer,
  onExtractCustomPart,
  onAutoSegmentBackground,
}: InteractiveStageProps) {
  const {
    originalImage,
    layers,
    selectedLayerId,
    viewMode,
    explodedDepth,
    imageWidth,
    imageHeight,
    processing,
  } = appState;

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Brush drawing states
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [partNameInput, setPartNameInput] = useState('手持ちアイテム・剣');
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Resize handler to fit image proportionally within the screen stage
  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;

    const updateSize = () => {
      const parent = containerRef.current;
      if (!parent) return;

      const isMobile = window.innerWidth < 768;
      const paddingWidth = isMobile ? 24 : 48;
      const paddingHeight = isMobile ? 40 : 80;

      const parentWidth = parent.clientWidth - paddingWidth; // padding
      const parentHeight = parent.clientHeight - paddingHeight;

      const imageRatio = imageWidth / imageHeight;
      const parentRatio = parentWidth / parentHeight;

      let width = parentWidth;
      let height = parentHeight;

      if (imageRatio > parentRatio) {
        width = parentWidth;
        height = parentWidth / imageRatio;
      } else {
        height = parentHeight;
        width = parentHeight * imageRatio;
      }

      setContainerSize({ width, height });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageWidth, imageHeight, viewMode]);

  // Adjust mask canvas when container size changes
  useEffect(() => {
    if (maskCanvasRef.current && containerSize.width > 0) {
      const canvas = maskCanvasRef.current;
      canvas.width = containerSize.width;
      canvas.height = containerSize.height;
      clearMask();
    }
  }, [containerSize, isBrushActive]);

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const canvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }
    }
  };

  // Canvas drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isBrushActive || processing) return;
    isDrawingRef.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.beginPath(); // reset path
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !maskCanvasRef.current || !isBrushActive) return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get exact cursor position relative to canvas bounds
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)'; // Transparent vibrant red mask
    ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';

    // Quick single dot or path segment
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);

    setHasDrawn(true);
  };

  const handleExtractPartAction = () => {
    if (!maskCanvasRef.current || !hasDrawn || processing) return;
    
    // Create high-res mask matching original image dimensions
    const originalMaskCanvas = document.createElement('canvas');
    originalMaskCanvas.width = imageWidth;
    originalMaskCanvas.height = imageHeight;
    const origCtx = originalMaskCanvas.getContext('2d');
    if (origCtx) {
      origCtx.drawImage(maskCanvasRef.current, 0, 0, imageWidth, imageHeight);
    }

    onExtractCustomPart(selectedLayerId, originalMaskCanvas, partNameInput || '手元パーツ');
    clearMask();
  };

  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%)',
    backgroundPosition: '50%',
    backgroundSize: '16px 16px',
    backgroundColor: '#ffffff',
  };

  const hasLayers = layers && layers.length > 0;
  const activeLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex-1 flex flex-col bg-[#EEF0F2] relative overflow-hidden select-none min-h-0">
      {/* Stage Header / Toolbar */}
      <div className="min-h-[3.5rem] py-2 border-b border-[#E5E7EB] bg-white px-4 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 z-10 gap-3">
        <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-full border border-[#E5E7EB] overflow-x-auto max-w-full">
          <button
            onClick={() => {
              onViewModeChange('stacked');
              setIsBrushActive(false);
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${
              viewMode === 'stacked' && !isBrushActive
                ? 'bg-black text-white shadow-sm'
                : 'text-[#6B7280] hover:text-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>標準重ね合わせ</span>
          </button>
          <button
            onClick={() => {
              onViewModeChange('exploded');
              setIsBrushActive(false);
            }}
            disabled={!hasLayers}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${
              viewMode === 'exploded'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#6B7280] hover:text-black disabled:opacity-30 disabled:pointer-events-none'
            }`}
          >
            <Cube className="w-3.5 h-3.5" />
            <span>3D立体分離 (10 Layers)</span>
          </button>
          <button
            onClick={() => {
              onViewModeChange('side-by-side');
              setIsBrushActive(false);
            }}
            disabled={!hasLayers}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${
              viewMode === 'side-by-side'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#6B7280] hover:text-black disabled:opacity-30 disabled:pointer-events-none'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>並列プレビュー</span>
          </button>
        </div>

        {/* Dynamic Controls based on view mode and brush active */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
          {viewMode === 'stacked' && (
            <button
              onClick={() => setIsBrushActive(!isBrushActive)}
              disabled={!hasLayers || processing}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border w-full sm:w-auto ${
                isBrushActive
                  ? 'bg-red-500 border-red-500 text-white shadow-sm animate-pulse'
                  : 'bg-white border-[#E5E7EB] hover:border-black text-[#1A1A1A]'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>パーツ抽出ブラシ: {isBrushActive ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {viewMode === 'exploded' && (
            <div className="flex items-center justify-between sm:justify-start gap-3 bg-[#F3F4F6] px-3 py-1.5 rounded-full border border-[#E5E7EB] text-xs w-full sm:w-auto">
              <span className="font-semibold text-[#6B7280]">3D奥行き:</span>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={explodedDepth}
                  onChange={(e) => onExplodedDepthChange(Number(e.target.value))}
                  className="flex-1 sm:w-28 accent-black h-1 bg-[#E5E7EB] rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-mono text-black font-bold w-8 text-right shrink-0">{explodedDepth}px</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brush Sub-Toolbar Overlay for drawing on layers */}
      {isBrushActive && viewMode === 'stacked' && (
        <div className="bg-[#1A1A1A] text-white px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 z-20 shadow-xl border-b border-neutral-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF]">
                対象レイヤー:
              </span>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded border border-white/20 font-bold whitespace-nowrap">
                {activeLayer ? activeLayer.name : '未選択'}
              </span>
            </div>

            {/* Brush Size Slider */}
            <div className="flex items-center justify-between sm:justify-start gap-2 text-xs flex-1 sm:flex-initial">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF] shrink-0">サイズ:</span>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 sm:w-28 accent-white h-1 bg-white/20 rounded cursor-pointer"
                />
                <span className="font-mono text-white font-bold shrink-0">{brushSize}px</span>
              </div>
            </div>

            {/* Part name input */}
            <div className="flex items-center justify-between sm:justify-start gap-2 text-xs flex-1 sm:flex-initial">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF] shrink-0 font-bold">パーツ名:</span>
              <input
                type="text"
                value={partNameInput}
                onChange={(e) => setPartNameInput(e.target.value)}
                placeholder="例: 手持ちの剣"
                className="bg-white/10 text-white rounded border border-white/20 px-2.5 py-1 text-xs focus:outline-none focus:border-white flex-1 sm:w-40 font-semibold min-w-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end w-full lg:w-auto">
            <button
              onClick={clearMask}
              disabled={!hasDrawn}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-white/10 text-xs font-bold hover:bg-white/20 transition border border-white/10 disabled:opacity-40 flex-1 sm:flex-initial"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>リセット</span>
            </button>
            <button
              onClick={handleExtractPartAction}
              disabled={!hasDrawn}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-white text-black text-xs font-extrabold hover:bg-neutral-200 transition shadow disabled:opacity-40 flex-1 sm:flex-initial"
            >
              <Scissors className="w-3.5 h-3.5 text-black" />
              <span>パーツ抽出補完</span>
            </button>
          </div>
        </div>
      )}

      {/* Automatic Background Segmenter Suggestion Bar */}
      {viewMode === 'stacked' && layers.some(l => l.id === 'background') && (
        <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-2 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center md:justify-between text-xs font-medium z-10 shrink-0 gap-3">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <HelpCircle className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>背景の「空・草・木」をワンクリックで個別レイヤーに分割し、裏の空き穴を自動補完できます</span>
          </div>
          <button
            onClick={onAutoSegmentBackground}
            disabled={processing}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-black text-white hover:bg-neutral-800 text-[11px] font-bold transition shadow-sm w-full md:w-auto shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>自動背景分解 (空・木・草) を実行</span>
          </button>
        </div>
      )}

      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6 relative bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px] bg-[#EEF0F2] overflow-y-auto"
      >
        {originalImage && containerSize.width > 0 && (
          <div
            className={`relative flex items-center justify-center rounded-xl overflow-hidden border-8 border-white bg-white ${
              viewMode === 'side-by-side' ? 'w-full shadow-md' : 'shadow-2xl'
            }`}
            style={{
              width: viewMode === 'side-by-side' ? '100%' : `${containerSize.width}px`,
              height: viewMode === 'side-by-side' ? 'auto' : `${containerSize.height}px`,
              ...checkerboardStyle,
            }}
          >
            {/* VIEW MODE 1: Standard Composited Stack */}
            {viewMode === 'stacked' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Loop in reverse order: L1 (original) at bottom to L10 (particles) on top */}
                {[...layers].reverse().map((layer) => {
                  if (!layer.visible || !layer.src || layer.id === 'original') return null;

                  return (
                    <img
                      key={layer.id}
                      src={layer.src}
                      alt={layer.name}
                      onClick={() => !isBrushActive && onSelectLayer(layer.id)}
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-200 select-none ${
                        !isBrushActive ? 'cursor-pointer' : 'pointer-events-none'
                      } ${
                        selectedLayerId === layer.id && !isBrushActive ? 'ring-2 ring-black ring-inset z-10' : ''
                      }`}
                      style={{
                        opacity: layer.opacity,
                        filter: getFilterString(layer),
                        transform: `translate(${layer.offsetX}px, ${layer.offsetY}px) scale(${layer.scale})`,
                      }}
                      referrerPolicy="no-referrer"
                    />
                  );
                })}

                {/* Drawing Brush Mask Layer */}
                {isBrushActive && (
                  <canvas
                    ref={maskCanvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 z-30 cursor-crosshair touch-none"
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                )}
              </div>
            )}

            {/* VIEW MODE 2: 3D Holographic Exploded Stack */}
            {viewMode === 'exploded' && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  perspective: '1400px',
                  perspectiveOrigin: '50% 50%',
                }}
              >
                {/* 3D Transform Rotate Box */}
                <div
                  className="relative transition-all duration-300 ease-out"
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: 'rotateX(25deg) rotateY(-25deg) rotateZ(5deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Connection Guides (corner vector lines from frontmost to backmost) */}
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                      const styleMap: Record<string, string> = {
                        'top-left': 'top-0 left-0 origin-top-left',
                        'top-right': 'top-0 right-0 origin-top-right',
                        'bottom-left': 'bottom-0 left-0 origin-bottom-left',
                        'bottom-right': 'bottom-0 right-0 origin-bottom-right',
                      };
                      
                      const maxZ = ((layers.length - 1) - (layers.length - 1) / 2) * (explodedDepth * 0.4);
                      const minZ = (0 - (layers.length - 1) / 2) * (explodedDepth * 0.4);
                      const fullDepthSpan = maxZ - minZ;

                      return (
                        <div
                          key={corner}
                          className={`absolute ${styleMap[corner]} w-[1.5px] border-l-2 border-dashed border-black/15`}
                          style={{
                            height: `${fullDepthSpan}px`,
                            transform: `translateZ(${minZ}px) rotateX(-90deg)`,
                          }}
                        ></div>
                      );
                    })}
                  </div>

                  {/* Render all layers spaced out symmetrically along Z axis */}
                  {layers.map((layer, index) => {
                    if (!layer.src || layer.id === 'original') return null;

                    const layersCount = layers.length - 1;
                    const reverseIndex = layersCount - 1 - index;
                    const zOffset = (reverseIndex - (layersCount - 1) / 2) * (explodedDepth * 0.4);
                    
                    const isSelected = selectedLayerId === layer.id;

                    return (
                      <div
                        key={layer.id}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-300 ${
                          isSelected 
                            ? 'ring-4 ring-black rounded shadow-2xl z-20 scale-[1.02]' 
                            : 'border border-neutral-300 hover:border-black rounded shadow-md hover:shadow-lg'
                        }`}
                        style={{
                          transform: `translateZ(${zOffset}px) scale(${layer.scale}) translate(${layer.offsetX}px, ${layer.offsetY}px)`,
                          opacity: layer.visible ? layer.opacity : 0.08,
                          transformStyle: 'preserve-3d',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <img
                          src={layer.src}
                          alt={layer.name}
                          className="w-full h-full object-cover rounded"
                          style={{
                            filter: getFilterString(layer),
                          }}
                          referrerPolicy="no-referrer"
                        />

                        {/* Floating 3D Label Badge */}
                        <div 
                          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow border transition-all duration-200 ${
                            isSelected 
                              ? 'bg-black text-white border-black scale-105' 
                              : 'bg-white text-black border-[#E5E7EB]'
                          }`}
                          style={{ transform: 'translateZ(10px)' }}
                        >
                          {layer.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW MODE 3: Side-by-Side Scrolling Showcase of All Layers */}
            {viewMode === 'side-by-side' && (
              <div className="w-full bg-white p-5 border-t border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {layers.map((layer) => {
                  const isSelected = selectedLayerId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`flex flex-col p-2.5 rounded border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#F9FAFB] border-black border-2 shadow-md scale-[1.02]' 
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2 truncate">
                        <Sparkles className={`w-3 h-3 ${isSelected ? 'text-black' : 'text-[#9CA3AF]'}`} />
                        <span className="text-[10px] font-bold truncate block text-[#1A1A1A]">
                          {layer.name}
                        </span>
                      </div>
                      
                      {/* Checkerboard content panel */}
                      <div
                        className="relative aspect-video rounded border border-[#E5E7EB] overflow-hidden"
                        style={checkerboardStyle}
                      >
                        {layer.src && (
                          <img
                            src={layer.src}
                            alt={layer.name}
                            className="w-full h-full object-cover"
                            style={{
                              opacity: layer.visible ? layer.opacity : 0.15,
                              filter: getFilterString(layer),
                            }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[8px] font-mono text-[#6B7280] font-semibold uppercase">
                          opacity: {Math.round(layer.opacity * 100)}%
                        </span>
                        {layer.locked && (
                          <span className="text-[8px] text-black bg-[#F3F4F6] px-1 rounded border border-[#E5E7EB] font-bold">
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
