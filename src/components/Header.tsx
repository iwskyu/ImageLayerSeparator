import React from 'react';
import { Layers, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  hasImage: boolean;
  processing: boolean;
}

export default function Header({ onReset, hasImage, processing }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 bg-black rounded text-white">
          <Layers className="w-4 h-4" />
          <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white shadow-sm">
            AI
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#1A1A1A] tracking-tight uppercase">Layer Separator</h1>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280]">Isolate and edit subject & background layers in the browser</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasImage && (
          <button
            onClick={onReset}
            disabled={processing}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition"
            id="reset-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6B7280] ${processing ? 'animate-spin' : ''}`} />
            <span>画像をリセット</span>
          </button>
        )}
      </div>
    </header>
  );
}
