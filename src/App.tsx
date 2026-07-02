import React, { useState } from 'react';
import { AppState, DEFAULT_ADJUSTMENTS, Layer, createDefaultLayer } from './types';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import InteractiveStage from './components/InteractiveStage';
import LayerManager from './components/LayerManager';
import AdjustmentsPanel from './components/AdjustmentsPanel';
import { 
  loadImage, 
  createBackgroundCutout, 
  createSubjectOutline, 
  createSubjectShadow, 
  createSubjectHighlights, 
  createAtmosphereFog, 
  createParticlesOverlay, 
  createSkyBackdrop, 
  createMidgroundVignette, 
  generateCompositeBlob,
  extractPartAndInpaint,
  autoSegmentBackground
} from './utils/imageProcessing';
import { removeBackground } from '@imgly/background-removal';
import { Loader2, Download, Layers, Sparkles, AlertCircle, Paintbrush, Camera, Sliders } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stage' | 'layers' | 'adjust'>('stage');
  const [state, setState] = useState<AppState>({
    originalImage: null,
    imageWidth: 0,
    imageHeight: 0,
    layers: [],
    selectedLayerId: '',
    processing: false,
    progressKey: '',
    progressPercent: 0,
    viewMode: 'stacked',
    explodedDepth: 60,
    imageType: 'illustration',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle image loading, AI segmentation and 10-layer decomposition
  const handleImageSelected = async (imageSrc: string, mode: 'photo' | 'illustration' = 'illustration') => {
    setState((prev) => ({
      ...prev,
      processing: true,
      imageType: mode,
      progressKey: 'AIセグメンテーションモデルをロード中...',
      progressPercent: 5,
    }));
    setErrorMsg(null);

    try {
      // Step 1: Load original image to get dimensions
      const { img: originalImg, width, height } = await loadImage(imageSrc);

      // Step 2: Run AI Background Removal in the browser
      setState((prev) => ({
        ...prev,
        progressKey: 'イラスト・画像の前後関係を解析中...',
        progressPercent: 15,
      }));

      const foregroundBlob = await removeBackground(imageSrc, {
        progress: (key: string, current: number, total: number) => {
          // Calculate percentage from download key/progress
          const percent = Math.min(Math.round((current / total) * 100), 99);
          
          let stepName = '前後レイヤーの輪郭を自動抽出中...';
          if (key.includes('fetch')) stepName = 'セグメンテーションモデルをダウンロード中 (初回のみ)...';
          else if (key.includes('onnx')) stepName = '境界線の高精度スキャンを実行中...';
          
          setState((prev) => ({
            ...prev,
            progressKey: stepName,
            progressPercent: Math.max(15, Math.round(15 + (percent * 0.75))),
          }));
        },
      });

      setState((prev) => ({
        ...prev,
        progressKey: '背景の透過くり抜き処理を適用中...',
        progressPercent: 91,
      }));

      // Convert extracted foreground blob into object URL
      const foregroundUrl = URL.createObjectURL(foregroundBlob);
      const foregroundImg = (await loadImage(foregroundUrl)).img;

      // Step 3: Create Background Cutout (using destination-out compositing)
      const backgroundCutoutUrl = createBackgroundCutout(originalImg, foregroundImg, width, height);
      const backgroundImg = (await loadImage(backgroundCutoutUrl)).img;

      setState((prev) => ({
        ...prev,
        progressKey: mode === 'illustration' ? 'イラスト用10レイヤーに立体分解中...' : '10レイヤーに詳細分解中...',
        progressPercent: 95,
      }));

      const isIll = mode === 'illustration';

      // Step 4: Generate remaining procedural layers using canvas engines
      const skyUrl = createSkyBackdrop(backgroundImg, width, height, isIll);
      const midgroundUrl = createMidgroundVignette(backgroundImg, width, height, isIll);
      const atmosphereUrl = createAtmosphereFog(width, height, isIll);
      const shadowUrl = createSubjectShadow(foregroundImg, width, height);
      const outlineUrl = createSubjectOutline(foregroundImg, width, height, isIll);
      const highlightsUrl = createSubjectHighlights(foregroundImg, width, height, isIll);
      const particlesUrl = createParticlesOverlay(width, height, isIll);

      // Step 5: Construct layers array (order: index 0 = front/particles, index 9 = back/original)
      const layersArray: Layer[] = [
        {
          ...createDefaultLayer('particles', isIll ? 'L10: 前面魔法の粒子' : 'L10: 前面パーティクル', particlesUrl),
          opacity: isIll ? 0.85 : 0.75,
        },
        {
          ...createDefaultLayer('highlights', isIll ? 'L9: 被写体ハイライト (アニメ光)' : 'L9: 被写体ハイライト', highlightsUrl),
          opacity: isIll ? 0.8 : 0.65,
        },
        {
          ...createDefaultLayer('subject', isIll ? 'L8: キャラクター本体 (人物)' : 'L8: 被写体本体 (人物)', foregroundUrl),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('outline', isIll ? 'L7: キャラクター輪郭 (線画発光)' : 'L7: 被写体アウトライン', outlineUrl),
          opacity: isIll ? 0.95 : 0.9,
          glowColor: isIll ? '#ec4899' : '#3b82f6',
          glowBlur: isIll ? 8 : 0,
        },
        {
          ...createDefaultLayer('shadow', isIll ? 'L6: 被写体シャドウ (影シルエ)' : 'L6: 被写体シャドウ', shadowUrl),
          opacity: isIll ? 0.45 : 0.55,
          blur: isIll ? 6 : 4,
          shadowOffsetX: isIll ? 8 : 6,
          shadowOffsetY: isIll ? 12 : 10,
        },
        {
          ...createDefaultLayer('atmosphere', isIll ? 'L5: 環境フォグ (大気光)' : 'L5: 環境フォグ (大気)', atmosphereUrl),
          opacity: isIll ? 0.55 : 0.45,
        },
        {
          ...createDefaultLayer('midground', isIll ? 'L4: 中景ビネット (近景要素)' : 'L4: 中景ビネット', midgroundUrl),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('background', isIll ? 'L3: 背景本体 (イラスト背景)' : 'L3: 背景本体', backgroundCutoutUrl),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('sky', isIll ? 'L2: 遠景バックドロップ (天空)' : 'L2: 遠景バックドロップ', skyUrl),
          opacity: 1.0,
          blur: isIll ? 8 : 12,
        },
        {
          ...createDefaultLayer('original', isIll ? 'L1: オリジナル原画 (元データ)' : 'L1: オリジナル画像 (元データ)', imageSrc),
          visible: false,
          opacity: 1.0,
        },
      ];

      setState((prev) => ({
        ...prev,
        originalImage: imageSrc,
        imageWidth: width,
        imageHeight: height,
        layers: layersArray,
        selectedLayerId: 'subject', // default selected layer is subject
        processing: false,
        progressPercent: 100,
        viewMode: 'stacked',
        imageType: mode,
      }));
      setActiveTab('stage');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || '10レイヤー分解処理に失敗しました。画像形式をご確認ください。'
      );
      setState((prev) => ({ ...prev, processing: false }));
    }
  };

  // Instant dynamic conversion without re-upload or re-scanning with AI
  const handleToggleImageType = async (targetMode: 'photo' | 'illustration') => {
    if (!state.originalImage || state.layers.length === 0) return;

    // Isolate foreground layer source url
    const subjectLayer = state.layers.find(l => l.id === 'subject');
    if (!subjectLayer || !subjectLayer.src) return;

    setState((prev) => ({
      ...prev,
      processing: true,
      progressKey: targetMode === 'illustration' ? 'イラスト用前後関係に再マッピング中...' : '写真用前後関係に再マッピング中...',
      progressPercent: 30,
    }));

    try {
      const { img: originalImg, width, height } = await loadImage(state.originalImage);
      const foregroundImg = (await loadImage(subjectLayer.src)).img;

      // Create Background Cutout (using destination-out compositing)
      const backgroundCutoutUrl = createBackgroundCutout(originalImg, foregroundImg, width, height);
      const backgroundImg = (await loadImage(backgroundCutoutUrl)).img;

      const isIll = targetMode === 'illustration';

      // Generate remaining procedural layers with the target mode configurations
      const skyUrl = createSkyBackdrop(backgroundImg, width, height, isIll);
      const midgroundUrl = createMidgroundVignette(backgroundImg, width, height, isIll);
      const atmosphereUrl = createAtmosphereFog(width, height, isIll);
      const shadowUrl = createSubjectShadow(foregroundImg, width, height);
      const outlineUrl = createSubjectOutline(foregroundImg, width, height, isIll);
      const highlightsUrl = createSubjectHighlights(foregroundImg, width, height, isIll);
      const particlesUrl = createParticlesOverlay(width, height, isIll);

      const layersArray: Layer[] = [
        {
          ...createDefaultLayer('particles', isIll ? 'L10: 前面魔法の粒子' : 'L10: 前面パーティクル', particlesUrl),
          opacity: isIll ? 0.85 : 0.75,
        },
        {
          ...createDefaultLayer('highlights', isIll ? 'L9: 被写体ハイライト (アニメ光)' : 'L9: 被写体ハイライト', highlightsUrl),
          opacity: isIll ? 0.8 : 0.65,
        },
        {
          ...createDefaultLayer('subject', isIll ? 'L8: キャラクター本体 (人物)' : 'L8: 被写体本体 (人物)', subjectLayer.src),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('outline', isIll ? 'L7: キャラクター輪郭 (線画発光)' : 'L7: 被写体アウトライン', outlineUrl),
          opacity: isIll ? 0.95 : 0.9,
          glowColor: isIll ? '#ec4899' : '#3b82f6',
          glowBlur: isIll ? 8 : 0,
        },
        {
          ...createDefaultLayer('shadow', isIll ? 'L6: 被写体シャドウ (影シルエ)' : 'L6: 被写体シャドウ', shadowUrl),
          opacity: isIll ? 0.45 : 0.55,
          blur: isIll ? 6 : 4,
          shadowOffsetX: isIll ? 8 : 6,
          shadowOffsetY: isIll ? 12 : 10,
        },
        {
          ...createDefaultLayer('atmosphere', isIll ? 'L5: 環境フォグ (大気光)' : 'L5: 環境フォグ (大気)', atmosphereUrl),
          opacity: isIll ? 0.55 : 0.45,
        },
        {
          ...createDefaultLayer('midground', isIll ? 'L4: 中景ビネット (近景要素)' : 'L4: 中景ビネット', midgroundUrl),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('background', isIll ? 'L3: 背景本体 (イラスト背景)' : 'L3: 背景本体', backgroundCutoutUrl),
          opacity: 1.0,
        },
        {
          ...createDefaultLayer('sky', isIll ? 'L2: 遠景バックドロップ (天空)' : 'L2: 遠景バックドロップ', skyUrl),
          opacity: 1.0,
          blur: isIll ? 8 : 12,
        },
        {
          ...createDefaultLayer('original', isIll ? 'L1: オリジナル原画 (元データ)' : 'L1: オリジナル画像 (元データ)', state.originalImage),
          visible: false,
          opacity: 1.0,
        },
      ];

      setState((prev) => ({
        ...prev,
        layers: layersArray,
        imageType: targetMode,
        processing: false,
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('モードの切り替えに失敗しました。');
      setState((prev) => ({ ...prev, processing: false }));
    }
  };

  const handleReset = () => {
    // Revoke object URLs to avoid memory leaks
    state.layers.forEach((layer) => {
      if (layer.src && layer.src.startsWith('blob:')) {
        URL.revokeObjectURL(layer.src);
      }
    });

    setState({
      originalImage: null,
      imageWidth: 0,
      imageHeight: 0,
      layers: [],
      selectedLayerId: '',
      processing: false,
      progressKey: '',
      progressPercent: 0,
      viewMode: 'stacked',
      explodedDepth: 60,
      imageType: 'illustration',
    });
    setActiveTab('stage');
    setErrorMsg(null);
  };

  const handleSelectLayer = (id: string) => {
    setState((prev) => ({ ...prev, selectedLayerId: id }));
  };

  const handleToggleVisibility = (id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      ),
    }));
  };

  const handleToggleLock = (id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) =>
        layer.id === id ? { ...layer, locked: !layer.locked } : layer
      ),
    }));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) =>
        layer.id === id && !layer.locked ? { ...layer, opacity } : layer
      ),
    }));
  };

  const handleUpdateAdjustments = (adjustments: any) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) =>
        layer.id === prev.selectedLayerId && !layer.locked
          ? { ...layer, adjustments }
          : layer
      ),
    }));
  };

  const handleUpdateLayerProperties = (id: string, props: Partial<Layer>) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) =>
        layer.id === id && !layer.locked ? { ...layer, ...props } : layer
      ),
    }));
  };

  const handleViewModeChange = (viewMode: 'stacked' | 'exploded' | 'side-by-side') => {
    setState((prev) => ({ ...prev, viewMode }));
  };

  const handleExplodedDepthChange = (explodedDepth: number) => {
    setState((prev) => ({ ...prev, explodedDepth }));
  };

  // Extract custom part with smart background inpainting
  const handleExtractCustomPart = async (
    layerId: string, 
    maskCanvas: HTMLCanvasElement, 
    partName: string
  ) => {
    const targetLayer = state.layers.find((l) => l.id === layerId);
    if (!targetLayer || !targetLayer.src) return;

    setState((prev) => ({
      ...prev,
      processing: true,
      progressKey: `パーツ「${partName}」を抽出し、背景を再合成・穴埋め中...`,
      progressPercent: 20,
    }));

    try {
      // 1. Load target layer image
      const { img: srcImg } = await loadImage(targetLayer.src);

      // 2. Run extraction and hole filling
      const { partUrl, baseInpaintedUrl } = extractPartAndInpaint(
        srcImg,
        maskCanvas,
        state.imageWidth,
        state.imageHeight
      );

      setState((prev) => ({
        ...prev,
        progressPercent: 70,
      }));

      // 3. Construct a brand new Layer object
      const newLayerId = `part-${Date.now()}`;
      const newPartLayer: Layer = {
        ...createDefaultLayer(newLayerId, `パーツ: ${partName}`, partUrl),
        opacity: 1.0,
      };

      // Find index of target layer to insert the new part right above it
      const targetIndex = state.layers.findIndex((l) => l.id === layerId);
      
      const updatedLayers = [...state.layers];
      // Update target layer with the inpainted base background (without the extracted object)
      updatedLayers[targetIndex] = {
        ...targetLayer,
        src: baseInpaintedUrl,
      };
      
      // Insert new layer above the target layer in order
      updatedLayers.splice(targetIndex, 0, newPartLayer);

      setState((prev) => ({
        ...prev,
        layers: updatedLayers,
        selectedLayerId: newLayerId, // Automatically select the newly extracted part
        processing: false,
        progressPercent: 100,
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'パーツの抽出・インペイント補完に失敗しました。');
      setState((prev) => ({ ...prev, processing: false }));
    }
  };

  // Automatically segment background into 3 inpainted layers (Sky, Trees, Grass)
  const handleAutoSegmentBackground = async () => {
    const bgLayer = state.layers.find((l) => l.id === 'background');
    if (!bgLayer || !bgLayer.src) {
      alert('背景本体レイヤーが見つかりません。');
      return;
    }

    setState((prev) => ({
      ...prev,
      processing: true,
      progressKey: '背景の「空・草・木」を精密分類し、10レイヤー体系を拡張中...',
      progressPercent: 25,
    }));

    try {
      const { img: bgImg } = await loadImage(bgLayer.src);
      
      setState((prev) => ({
        ...prev,
        progressPercent: 45,
      }));

      // Perform pixel classifier and multi-layer inpainting
      const { skyUrl, treesUrl, grassUrl } = autoSegmentBackground(
        bgImg,
        state.imageWidth,
        state.imageHeight
      );

      setState((prev) => ({
        ...prev,
        progressPercent: 80,
      }));

      const isIll = state.imageType === 'illustration';

      // Create new detailed sub-background layers
      const skyLayer: Layer = {
        ...createDefaultLayer('bg-sky', isIll ? 'L3-S: 遠景空 (青空/夕暮れ・自動補完)' : 'L3-S: 遠景空 (自動補完)', skyUrl),
        opacity: 1.0,
      };

      const treesLayer: Layer = {
        ...createDefaultLayer('bg-trees', isIll ? 'L3-T: 中景木々 (立ち木・自動補完)' : 'L3-T: 中景木々 (自動補完)', treesUrl),
        opacity: 1.0,
      };

      const grassLayer: Layer = {
        ...createDefaultLayer('bg-grass', isIll ? 'L3-G: 近景草地 (地面・自動補完)' : 'L3-G: 近景草地 (自動補完)', grassUrl),
        opacity: 1.0,
      };

      // Replace the old composite "background" layer with these three beautiful inpainted sublayers
      const updatedLayers: Layer[] = [];
      for (const layer of state.layers) {
        if (layer.id === 'background') {
          // Insert divided sublayers in top-to-bottom stack order: grass, then trees, then sky
          updatedLayers.push(grassLayer, treesLayer, skyLayer);
        } else {
          updatedLayers.push(layer);
        }
      }

      setState((prev) => ({
        ...prev,
        layers: updatedLayers,
        selectedLayerId: 'bg-grass', // select the ground/grass
        processing: false,
        progressPercent: 100,
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('背景の自動分解・インペイントに失敗しました。');
      setState((prev) => ({ ...prev, processing: false }));
    }
  };

  // Export handlers
  const handleExportLayer = (type: 'selected' | 'composite') => {
    if (!state.originalImage) return;

    if (type === 'selected') {
      const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId);
      if (selectedLayer && selectedLayer.src) {
        const link = document.createElement('a');
        link.download = `layer-${selectedLayer.id}.png`;
        link.href = selectedLayer.src;
        link.click();
      }
    } else if (type === 'composite') {
      setState((prev) => ({ ...prev, processing: true, progressKey: '高解像度で結合画像を書き出し中...' }));
      
      const { layers, imageWidth, imageHeight } = state;

      generateCompositeBlob(layers, imageWidth, imageHeight)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = 'layer-composite-export.png';
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          setState((prev) => ({ ...prev, processing: false }));
        })
        .catch((err) => {
          console.error(err);
          alert('画像の書き出しに失敗しました。');
          setState((prev) => ({ ...prev, processing: false }));
        });
    }
  };

  const activeLayer = state.layers.find(l => l.id === state.selectedLayerId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8F9FA] text-[#1A1A1A] overflow-hidden font-sans">
      <Header onReset={handleReset} hasImage={!!state.originalImage} processing={state.processing} />

      {/* Main Content Body */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {!state.originalImage ? (
          <UploadZone onImageSelected={handleImageSelected} processing={state.processing} />
        ) : (
          <>
            {/* Left Interactive Stage Panel */}
            <div className={`flex-1 flex flex-col min-h-0 relative ${activeTab === 'stage' ? 'flex' : 'hidden md:flex'}`}>
              {/* Dynamic Mode Switcher Bar right above Stage */}
              <div className="min-h-[2.5rem] py-1.5 bg-white/85 backdrop-blur-sm px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] shrink-0 z-20 text-xs gap-2">
                <div className="flex items-center gap-1.5 font-bold text-[#6B7280]">
                  <span>解析モード:</span>
                  {state.imageType === 'illustration' ? (
                    <span className="flex items-center gap-1 bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-bold">
                      <Paintbrush className="w-3 h-3" />
                      イラスト・絵画
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      <Camera className="w-3 h-3" />
                      写真・実写
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleImageType('photo')}
                    disabled={state.imageType === 'photo' || state.processing}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                      state.imageType === 'photo'
                        ? 'bg-[#F3F4F6] text-[#9CA3AF] border-transparent'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E5E7EB]'
                    }`}
                  >
                    写真に変換
                  </button>
                  <button
                    onClick={() => handleToggleImageType('illustration')}
                    disabled={state.imageType === 'illustration' || state.processing}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                      state.imageType === 'illustration'
                        ? 'bg-[#F3F4F6] text-[#9CA3AF] border-transparent'
                        : 'bg-black text-white hover:bg-neutral-800 border-black shadow-sm'
                    }`}
                  >
                    イラスト・絵画に変換 (おすすめ)
                  </button>
                </div>
              </div>

              <InteractiveStage
                appState={state}
                onViewModeChange={handleViewModeChange}
                onExplodedDepthChange={handleExplodedDepthChange}
                onSelectLayer={handleSelectLayer}
                onExtractCustomPart={handleExtractCustomPart}
                onAutoSegmentBackground={handleAutoSegmentBackground}
              />
            </div>

            {/* Right Control Panels Sidebar */}
            <aside className={`border-[#E5E7EB] bg-white flex flex-col select-none ${
              activeTab !== 'stage'
                ? 'flex flex-1 min-h-0'
                : 'hidden md:flex md:w-80 md:border-l md:shrink-0'
            }`}>
              {/* Layers List panel */}
              <div className={`flex-col min-h-0 ${activeTab === 'layers' ? 'flex flex-1' : 'hidden md:flex md:h-[380px] md:shrink-0'}`}>
                <LayerManager
                  layers={state.layers}
                  selectedId={state.selectedLayerId}
                  onSelect={handleSelectLayer}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onOpacityChange={handleOpacityChange}
                />
              </div>

              {/* Adjustments Panel */}
              <div className={`flex-col min-h-0 ${activeTab === 'adjust' ? 'flex flex-1' : 'hidden md:flex md:flex-1'}`}>
                <AdjustmentsPanel
                  selectedLayer={activeLayer}
                  onUpdateAdjustments={handleUpdateAdjustments}
                  onUpdateLayerProperties={(props) => handleUpdateLayerProperties(state.selectedLayerId, props)}
                />
              </div>

              {/* Export Panel (Bottom of sidebar) */}
              <div className={`p-4 border-t border-[#E5E7EB] bg-white space-y-3 shrink-0 ${activeTab === 'adjust' ? 'block' : 'hidden md:block'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Download className="w-4 h-4 text-black" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    画像の書き出し (Export)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportLayer('selected')}
                    disabled={!activeLayer || !activeLayer.visible}
                    className="flex flex-col items-center justify-center p-2 rounded bg-[#F3F4F6] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-xs font-bold text-[#1A1A1A] transition-all disabled:opacity-45 disabled:pointer-events-none"
                    id="export-fg-btn"
                  >
                    <Layers className="w-4 h-4 text-black mb-1" />
                    <span className="truncate max-w-full">選択レイヤー (PNG)</span>
                  </button>

                  <button
                    onClick={() => handleExportLayer('composite')}
                    className="flex flex-col items-center justify-center p-2 rounded bg-black hover:bg-neutral-800 text-xs font-bold text-white transition-all shadow-md"
                    id="export-composite-btn"
                  >
                    <Sparkles className="w-4 h-4 text-white mb-1" />
                    <span>結合画像 (PNG)</span>
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Global Full-Screen AI Processing Overlay */}
        {state.processing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6">
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                {/* Dual Pulsating Rings */}
                <div className="absolute inset-0 border-4 border-black/5 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-4 border-black/10 rounded-full"></div>
                <Loader2 className="w-8 h-8 text-black animate-spin relative z-10" />
              </div>

              <h3 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wide mb-2">
                レイヤーを分解中...
              </h3>
              <p className="text-xs text-[#6B7280] min-h-[16px] mb-6">
                {state.progressKey || 'AIモデルをロードしています'}
              </p>

              {/* Progress Bar */}
              <div className="w-64 h-1.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded overflow-hidden">
                <div
                  className="h-full bg-black rounded transition-all duration-300 ease-out"
                  style={{ width: `${state.progressPercent}%` }}
                ></div>
              </div>
              <span className="text-xs font-mono text-black mt-2.5 block font-bold">
                {state.progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Global Error Screen overlay */}
        {errorMsg && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 p-6">
            <div className="flex flex-col items-center text-center max-w-md bg-white border border-[#E5E7EB] p-8 rounded shadow-2xl">
              <div className="w-12 h-12 rounded bg-[#F3F4F6] text-black flex items-center justify-center border border-[#E5E7EB] mb-4">
                <AlertCircle className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">エラーが発生しました</h3>
              <p className="text-xs text-[#6B7280] mb-6 leading-relaxed">
                {errorMsg}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 rounded bg-black text-white hover:bg-neutral-800 text-xs font-bold transition"
                >
                  やり直す
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Bar */}
      {state.originalImage && (
        <div className="md:hidden h-16 border-t border-[#E5E7EB] bg-white flex items-center justify-around shrink-0 z-30">
          <button
            onClick={() => setActiveTab('stage')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              activeTab === 'stage' ? 'text-black font-bold' : 'text-[#6B7280]'
            }`}
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">キャンバス</span>
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              activeTab === 'layers' ? 'text-black font-bold' : 'text-[#6B7280]'
            }`}
          >
            <Layers className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">レイヤー</span>
          </button>
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              activeTab === 'adjust' ? 'text-black font-bold' : 'text-[#6B7280]'
            }`}
          >
            <Sliders className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">詳細調整</span>
          </button>
        </div>
      )}
    </div>
  );
}
