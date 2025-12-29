
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonSliderProps {
  before: string;
  after: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const onMouseDown = () => setIsResizing(true);
  const onMouseUp = () => setIsResizing(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isResizing) handleMove(e.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (isResizing) handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsResizing(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-xl shadow-2xl cursor-col-resize select-none border border-gray-200"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {/* Before Image */}
      <img 
        src={before} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* After Image (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={after} 
          alt="After" 
          className="absolute inset-0 h-full object-cover"
          style={{ width: `${10000 / sliderPos}%` }}
        />
      </div>

      {/* Slider Bar */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none flex items-center justify-center"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-800 -ml-0.5">
          <i className="fas fa-arrows-left-right text-xs"></i>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
        Original
      </div>
      <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
        Cleaned
      </div>
    </div>
  );
};

export default ComparisonSlider;
