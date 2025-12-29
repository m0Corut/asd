
import React, { useState, useEffect, useRef } from 'react';
import { removeMarkFromImage, matchResolution, ProcessingModel } from './services/geminiService';
import { BatchItem, ItemStatus } from './types';

declare const JSZip: any;
declare const window: any;

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("Remove only watermarks, logos, or text overlays.");
  const [selectedModel, setSelectedModel] = useState<ProcessingModel>('gemini-2.5-flash-image');
  const [preserveQuality, setPreserveQuality] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (e) {
      setHasKey(false);
    }
  };

  const handleOpenKeyDialog = async () => {
    setAuthError(null);
    await window.aistudio.openSelectKey();
    setHasKey(true);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Checking Permissions...</p>
        </div>
      </div>
    );
  }

  if (hasKey === false || authError?.includes("403")) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
        
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative z-10 border border-white/20">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner ${authError ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <i className={`fas ${authError ? 'fa-triangle-exclamation' : 'fa-shield-halved'} text-4xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
            {authError ? 'Action Required' : 'Access Locked'}
          </h2>
          <p className="text-slate-500 mb-10 leading-relaxed text-lg">
            {authError || "Please select an API key to start using CleanUp AI. High-quality Pro models require a Paid API Key."}
          </p>
          <div className="space-y-5">
            <button 
              onClick={handleOpenKeyDialog}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <i className="fas fa-key"></i> {authError ? 'Change Key' : 'Select API Key'}
            </button>
            {authError?.includes("Pro model") && (
              <button 
                onClick={() => { setAuthError(null); setSelectedModel('gemini-2.5-flash-image'); }}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all"
              >
                Switch to Standard Engine (Free Tier)
              </button>
            )}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
              Setup Billing Information
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('files' in e.target && (e.target as any).files) files = Array.from((e.target as any).files);
    else if ('dataTransfer' in e && e.dataTransfer.files) files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    const newItems: BatchItem[] = await Promise.all(
      files.map(async (file) => {
        return new Promise<BatchItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const original = event.target?.result as string;
            const img = new Image();
            img.onload = () => resolve({
              id: Math.random().toString(36).substr(2, 9),
              file, original, edited: null, status: ItemStatus.PENDING,
              width: img.width, height: img.height
            });
            img.src = original;
          };
          reader.readAsDataURL(file);
        });
      })
    );
    setItems(prev => [...prev, ...newItems]);
  };

  const processBatch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const pendingItems = items.filter(i => i.status === ItemStatus.PENDING || i.status === ItemStatus.ERROR);

    for (const item of pendingItems) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ItemStatus.PROCESSING, error: undefined } : i));
      try {
        const rawEdited = await removeMarkFromImage(
          item.original, item.file.type, item.width, item.height, 
          prompt, selectedModel, preserveQuality
        );
        const finalEdited = await matchResolution(item.original, rawEdited, item.width, item.height);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ItemStatus.COMPLETED, edited: finalEdited } : i));
      } catch (err: any) {
        if (err.message.includes("403")) {
          setAuthError(err.message);
          setIsProcessing(false);
          return;
        }
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ItemStatus.ERROR, error: err.message } : i));
      }
    }
    setIsProcessing(false);
  };

  const downloadAll = async () => {
    const completedItems = items.filter(i => i.status === ItemStatus.COMPLETED && i.edited);
    if (completedItems.length === 0) return;
    const zip = new JSZip();
    completedItems.forEach(item => {
      zip.file(`cleaned_${item.file.name}`, item.edited!.split(',')[1], { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "cleaned_images.zip";
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b px-8 py-5 sticky top-0 z-30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-magic"></i>
          </div>
          <h1 className="text-xl font-black text-slate-800">CleanUp AI</h1>
        </div>
        <div className="flex gap-4">
          {items.length > 0 && <button onClick={() => setItems([])} className="text-slate-400 font-bold px-4">Clear</button>}
          <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all">Add Photos</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3">
          {items.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-[400px] border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-indigo-50/30 transition-all"
            >
              <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFiles} />
              <i className="fas fa-cloud-upload-alt text-4xl text-indigo-300 mb-4"></i>
              <p className="text-slate-500 font-bold">Drop images here to start</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFiles} />
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 group">
                  <div className="aspect-square relative">
                    <img src={item.edited || item.original} className="w-full h-full object-cover" alt="Preview" />
                    {item.status === ItemStatus.PROCESSING && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-2xl text-indigo-600"></i></div>}
                    {item.status === ItemStatus.COMPLETED && <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-lg shadow-lg"><i className="fas fa-check"></i></div>}
                    <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-3 left-3 bg-white/80 p-2 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash"></i></button>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">{item.width}x{item.height}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-engine text-indigo-500"></i> Engine</h3>
            
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button 
                onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedModel === 'gemini-2.5-flash-image' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-slate-800 text-sm">Flash (Standard)</span>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Free Tier OK</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Fast processing, 1K resolution. Best for quick edits.</p>
              </button>
              
              <button 
                onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedModel === 'gemini-3-pro-image-preview' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-slate-800 text-sm">Pro (Ultra)</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Paid Required</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Advanced 2K resolution. Superior detail reconstruction.</p>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Instructions</label>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 h-28 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-600">Preserve Detail</span>
                <input type="checkbox" checked={preserveQuality} onChange={e => setPreserveQuality(e.target.checked)} className="accent-indigo-600" />
              </div>

              <button 
                onClick={processBatch}
                disabled={isProcessing || items.filter(i => i.status !== 'COMPLETED').length === 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-95"
              >
                {isProcessing ? 'Processing...' : 'Run Cleaning'}
              </button>
              
              <button 
                onClick={downloadAll}
                disabled={items.filter(i => i.status === 'COMPLETED').length === 0}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl font-black hover:bg-slate-50 transition-all"
              >
                Download (.ZIP)
              </button>
            </div>
          </div>
          
          <button onClick={handleOpenKeyDialog} className="w-full py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">
            Manage API Key
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
