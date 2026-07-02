import React from 'react';
import { Adjustments, Layer } from '../types';
import { Sliders, Wand2, Maximize, Palette, Sun, Contrast, Droplets } from 'lucide-react';

interface AdjustmentsPanelProps {
  selectedLayer: Layer | null;
  onUpdateAdjustments: (adjustments: Adjustments) => void;
  onUpdateLayerProperties: (props: Partial<Layer>) => void;
}

export default function AdjustmentsPanel({
  selectedLayer,
  onUpdateAdjustments,
  onUpdateLayerProperties,
}: AdjustmentsPanelProps) {
  if (!selectedLayer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6B7280] bg-white">
        <Sliders className="w-8 h-8 text-[#9CA3AF] mb-2 animate-pulse" />
        <span className="text-xs font-semibold">調整するレイヤーを選択してください</span>
      </div>
    );
  }

  const { adjustments, locked } = selectedLayer;

  const handleAdjChange = (key: keyof Adjustments, value: number) => {
    if (locked) return;
    onUpdateAdjustments({
      ...adjustments,
      [key]: value,
    });
  };

  const handlePropChange = (key: keyof Layer, value: any) => {
    if (locked) return;
    onUpdateLayerProperties({
      [key]: value,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto select-none min-h-0">
      {/* Top Title */}
      <div className="p-3.5 border-b border-[#E5E7EB] flex items-center gap-2 justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-4 h-4 text-black" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] truncate max-w-[160px]">
            {selectedLayer.name}
          </span>
        </div>
        {locked ? (
          <span className="text-[9px] bg-[#F3F4F6] text-black px-1.5 py-0.5 rounded border border-[#E5E7EB] font-semibold">
            ロック中
          </span>
        ) : (
          <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded font-semibold">
            編集可能
          </span>
        )}
      </div>

      <div className={`p-4 space-y-5 overflow-y-auto ${locked ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* SECTION 1: Base Color Adjustments */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-black" />
            <span>基本色調整 (Color Adjustments)</span>
          </h4>

          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-black" /> 明るさ (Brightness)</span>
              <span className="font-mono text-[11px] font-bold text-black">{adjustments.brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.brightness}
              onChange={(e) => handleAdjChange('brightness', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span className="flex items-center gap-1"><Contrast className="w-3 h-3 text-black" /> コントラスト</span>
              <span className="font-mono text-[11px] font-bold text-black">{adjustments.contrast}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.contrast}
              onChange={(e) => handleAdjChange('contrast', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-black" /> 彩度 (Saturation)</span>
              <span className="font-mono text-[11px] font-bold text-black">{adjustments.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments.saturation}
              onChange={(e) => handleAdjChange('saturation', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 2: Transform Settings */}
        <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
          <h4 className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5 text-black" />
            <span>位置と変形 (Transform)</span>
          </h4>

          {/* Scale */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>スケール (Scale)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={selectedLayer.scale * 100}
              onChange={(e) => handlePropChange('scale', Number(e.target.value) / 100)}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Offset X */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>横位置 (X Offset)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.offsetX}px</span>
            </div>
            <input
              type="range"
              min="-120"
              max="120"
              value={selectedLayer.offsetX}
              onChange={(e) => handlePropChange('offsetX', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Offset Y */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>縦位置 (Y Offset)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.offsetY}px</span>
            </div>
            <input
              type="range"
              min="-120"
              max="120"
              value={selectedLayer.offsetY}
              onChange={(e) => handlePropChange('offsetY', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 3: Filters & FX */}
        <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
          <h4 className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-black" />
            <span>フィルター効果 (Layer Filters)</span>
          </h4>

          {/* Blur */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>ガウスぼかし (Blur)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={selectedLayer.blur}
              onChange={(e) => handlePropChange('blur', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Grayscale */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>モノクローム (Grayscale)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.grayscale}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLayer.grayscale}
              onChange={(e) => handlePropChange('grayscale', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Sepia */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>セピア調 (Sepia)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.sepia}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLayer.sepia}
              onChange={(e) => handlePropChange('sepia', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Hue Rotate */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>色相回転 (Hue Rotate)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.hueRotate}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedLayer.hueRotate}
              onChange={(e) => handlePropChange('hueRotate', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 4: Shadow & Glow (Drop FX) */}
        <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
          <h4 className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-black" />
            <span>シャドウ & グロウ (Shadow & Glow)</span>
          </h4>

          {/* Glow Blur */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>発光 (Glow Blur)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.glowBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={selectedLayer.glowBlur}
              onChange={(e) => handlePropChange('glowBlur', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {selectedLayer.glowBlur > 0 && (
            <div className="flex items-center justify-between text-xs text-[#6B7280] bg-[#F9FAFB] p-2 rounded border border-[#E5E7EB]">
              <span>発光カラー (Glow Color)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedLayer.glowColor}
                  onChange={(e) => handlePropChange('glowColor', e.target.value)}
                  className="w-5 h-5 rounded border border-[#E5E7EB] bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-black font-bold uppercase">{selectedLayer.glowColor}</span>
              </div>
            </div>
          )}

          {/* Shadow Blur */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>ドロップシャドウ (Shadow Blur)</span>
              <span className="font-mono text-[11px] font-bold text-black">{selectedLayer.shadowBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={selectedLayer.shadowBlur}
              onChange={(e) => handlePropChange('shadowBlur', Number(e.target.value))}
              className="w-full accent-black h-1 bg-[#E5E7EB] rounded appearance-none cursor-pointer"
            />
          </div>

          {selectedLayer.shadowBlur > 0 && (
            <div className="space-y-2 bg-[#F9FAFB] p-2 rounded border border-[#E5E7EB]">
              <div className="flex items-center justify-between text-xs text-[#6B7280]">
                <span>影の色 (Shadow Color)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedLayer.shadowColor.startsWith('rgba') ? '#000000' : selectedLayer.shadowColor}
                    onChange={(e) => handlePropChange('shadowColor', e.target.value)}
                    className="w-5 h-5 rounded border border-[#E5E7EB] bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-black font-bold uppercase">{selectedLayer.shadowColor}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-[#6B7280] pt-1.5 border-t border-[#E5E7EB]">
                <span>影オフセット X</span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={selectedLayer.shadowOffsetX}
                  onChange={(e) => handlePropChange('shadowOffsetX', Number(e.target.value))}
                  className="w-24 accent-black h-1 bg-[#E5E7EB] rounded"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-[#6B7280]">
                <span>影オフセット Y</span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={selectedLayer.shadowOffsetY}
                  onChange={(e) => handlePropChange('shadowOffsetY', Number(e.target.value))}
                  className="w-24 accent-black h-1 bg-[#E5E7EB] rounded"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
