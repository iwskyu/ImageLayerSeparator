import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Camera, Paintbrush } from 'lucide-react';

interface UploadZoneProps {
  onImageSelected: (src: string, mode: 'photo' | 'illustration') => void;
  processing: boolean;
}

const SAMPLE_ITEMS = [
  {
    id: 'photo-1',
    name: '女性ポートレート',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    desc: '髪の毛が細かく高精細な人物写真',
    type: 'photo' as const,
  },
  {
    id: 'ill-1',
    name: 'サイバーアニメ少女',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    desc: '色彩豊かなキャラクターイラスト',
    type: 'illustration' as const,
  },
  {
    id: 'ill-2',
    name: '黄昏のレトロ部屋',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    desc: '奥行きが美しい夕暮れのアニメ空間',
    type: 'illustration' as const,
  },
  {
    id: 'ill-3',
    name: 'ファンタジー・スカイ',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    desc: '幻想的な色彩の現代グラフィックアート',
    type: 'illustration' as const,
  },
];

export default function UploadZone({ onImageSelected, processing }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'photo' | 'illustration'>('illustration');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageSelected(reader.result, selectedMode);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageSelected(reader.result, selectedMode);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#F8F9FA] overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center">
        
        {/* Step 1: Selector Mode Tabs */}
        <div className="w-full mb-6">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-2 block text-center sm:text-left">
            処理モードを選択 (Segmentation Mode)
          </label>
          <div className="grid grid-cols-2 gap-3 bg-white p-1.5 rounded-xl border border-[#E5E7EB]">
            <button
              onClick={() => setSelectedMode('photo')}
              className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
                selectedMode === 'photo'
                  ? 'bg-[#F3F4F6] border border-[#E5E7EB] text-black shadow-sm'
                  : 'text-[#6B7280] hover:text-black border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedMode === 'photo' ? 'bg-black text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">写真モード</span>
                <span className="text-[9px] block text-[#6B7280] mt-0.5">ポートレート、風景写真の立体化</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode('illustration')}
              className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
                selectedMode === 'illustration'
                  ? 'bg-black text-white border border-black shadow-md'
                  : 'text-[#6B7280] hover:text-black border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg ${selectedMode === 'illustration' ? 'bg-white text-black' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                <Paintbrush className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">イラスト・絵画モード</span>
                <span className="text-[9px] block opacity-80 mt-0.5">アニメ、2Dイラスト、デジタルアートの立体化</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Upload Box */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={triggerFileInput}
          className={`w-full aspect-video min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 relative group ${
            isDragging
              ? 'border-black bg-black/5'
              : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] hover:border-black'
          }`}
          id="upload-container"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-col items-center text-center max-w-sm">
            <div className={`w-12 h-12 rounded flex items-center justify-center border transition-all duration-300 mb-4 ${
              selectedMode === 'illustration' ? 'bg-black text-white border-black' : 'bg-[#F3F4F6] text-black border-[#E5E7EB]'
            }`}>
              <UploadCloud className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1 uppercase tracking-wide">
              {selectedMode === 'illustration' ? 'イラストをアップロード' : '写真をアップロード'}
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              ドラッグ＆ドロップ、または<span className="text-black font-bold hover:underline mx-1">ファイルを選択</span>
            </p>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#F3F4F6] text-[10px] text-[#6B7280] border border-[#E5E7EB]">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG, JPEG, WebP (前後関係を自動識別して分解)</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 my-6">
          <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">or</span>
          <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
        </div>

        {/* Samples Picker */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3.5 justify-center sm:justify-start">
            <Sparkles className="w-3.5 h-3.5 text-black animate-pulse" />
            <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
              サンプル画像でテスト
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {SAMPLE_ITEMS.map((sample) => {
              const isIllustration = sample.type === 'illustration';
              return (
                <button
                  key={sample.id}
                  onClick={() => onImageSelected(sample.url, sample.type)}
                  disabled={processing}
                  className="group flex flex-col text-left rounded-lg border border-[#E5E7EB] bg-white overflow-hidden hover:border-black transition-all disabled:opacity-50 disabled:pointer-events-none hover:-translate-y-0.5"
                  id={`sample-btn-${sample.id}`}
                >
                  <div className="w-full aspect-[4/3] relative overflow-hidden bg-[#F3F4F6]">
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isIllustration ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {isIllustration ? 'イラスト' : '写真'}
                    </div>
                  </div>
                  <div className="p-2 border-t border-[#E5E7EB] min-h-[58px] flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-[#1A1A1A] block truncate group-hover:text-black leading-tight">
                      {sample.name}
                    </span>
                    <span className="text-[8px] text-[#6B7280] mt-0.5 block line-clamp-2 leading-tight font-medium">
                      {sample.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
