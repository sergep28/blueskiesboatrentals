import { useRef, useEffect, useState, useCallback } from 'react';

interface DiagramMarkerProps {
  src: string;        // diagram image URL (in /public)
  label: string;
  onChange: (dataUrl: string | null) => void;  // composited image+marks, or null if untouched
}

// Shows a boat diagram and lets the renter draw red marks on it to flag damage.
// Exports the diagram + marks composited into a single PNG dataURL.
export default function DiagramMarker({ src, label, onChange }: DiagramMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [marked, setMarked] = useState(false);

  // Draw the diagram as the canvas background (also used to reset on clear).
  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const h = rect.width * (img.naturalHeight / img.naturalWidth);
    canvas.width = rect.width * ratio;
    canvas.height = h * ratio;
    canvas.style.height = `${h}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, h);
    ctx.drawImage(img, 0, 0, rect.width, h);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#dc2626';
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; drawBackground(); };
    img.src = src;
    window.addEventListener('resize', drawBackground);
    return () => window.removeEventListener('resize', drawBackground);
  }, [src, drawBackground]);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const p = pos(e);
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setMarked(true);
    onChange(canvasRef.current?.toDataURL('image/png') ?? null);
  };

  const clear = () => {
    drawBackground();
    setMarked(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {marked && <button type="button" onClick={clear} className="text-xs text-slate-400 underline">Clear</button>}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full border border-slate-200 rounded-lg touch-none bg-white"
      />
      <p className="text-[11px] text-slate-400 mt-1">Draw on the diagram to circle any damage.</p>
    </div>
  );
}
