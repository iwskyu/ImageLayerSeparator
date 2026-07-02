import React from 'react';
import { Layer } from '../types';
import { Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Sliders } from 'lucide-react';

interface LayerManagerProps {
  layers: Layer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

export default function LayerManager({
  layers,
  selectedId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onOpacityChange,
}: LayerManagerProps) {
  if (!layers || layers.length === 0) return null;

  return (
    <div className="flex flex-col md:border-b border-[#E5E7EB] bg-white p-4 select-none shrink-0 md:max-h-[380px] flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <Sliders className="w-4 h-4 text-black" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
          レイヤー管理 (10 Layers)
        </span>
      </div>

      <div className="space-y-1.5 pr-1">
        {layers.map((layer) => {
          const isSelected = selectedId === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`group flex flex-col p-2 rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#F9FAFB] border-l-4 border-l-black border-y-[#E5E7EB] border-r-[#E5E7EB] shadow-sm'
                  : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
              id={`layer-row-${layer.id}`}
            >
              <div className="flex items-center gap-2.5">
                {/* Visibility Eye Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-[#E5E7EB] transition shrink-0 ${
                    layer.visible ? 'text-black' : 'text-[#9CA3AF]'
                  }`}
                  id={`layer-vis-${layer.id}`}
                >
                  {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                {/* Layer Thumbnail */}
                <div
                  className="w-8 h-8 rounded border border-[#E5E7EB] flex items-center justify-center overflow-hidden shrink-0 relative bg-[size:6px_6px]"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%)',
                    backgroundPosition: '50%',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {layer.src ? (
                    <img
                      src={layer.src}
                      alt={layer.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  )}
                </div>

                {/* Layer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] font-bold truncate block ${
                        isSelected ? 'text-black' : 'text-[#1A1A1A]'
                      }`}
                    >
                      {layer.name}
                    </span>
                    {layer.locked && <Lock className="w-2.5 h-2.5 text-[#1A1A1A] shrink-0" />}
                  </div>
                  <span className="text-[8px] font-mono text-[#6B7280] block mt-0.5 uppercase tracking-wider font-semibold">
                    opacity: {Math.round(layer.opacity * 100)}%
                  </span>
                </div>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  className={`p-1 rounded hover:bg-[#E5E7EB] transition shrink-0 ${
                    layer.locked ? 'text-black' : 'text-[#9CA3AF]'
                  }`}
                  id={`layer-lock-${layer.id}`}
                >
                  {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsed slide-out for opacity adjustment */}
              {isSelected && (
                <div
                  className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[9px] font-bold text-[#6B7280] w-12 shrink-0">不透明度:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(layer.opacity * 100)}
                    disabled={layer.locked}
                    onChange={(e) => onOpacityChange(layer.id, Number(e.target.value) / 100)}
                    className="flex-1 accent-black h-1 bg-[#E5E7EB] rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                  <span className="text-[9px] font-mono text-black font-bold w-8 text-right">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
