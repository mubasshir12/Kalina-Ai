import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Save, Undo2, Trash2 } from 'lucide-react';

interface ImageEditorViewProps {
    onBack: () => void;
    onSave: (newBase64: string) => void;
    imageBase64: string;
    mimeType: string;
}

const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#FFFFFF'];
const sizes = [2, 5, 10];

const ImageEditorView: React.FC<ImageEditorViewProps> = ({ onBack, onSave, imageBase64, mimeType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState(colors[0]);
    const [brushSize, setBrushSize] = useState(sizes[1]);
    const history = useRef<ImageData[]>([]);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    
    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
    }, []);

    const drawInitialImage = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const ctx = contextRef.current;
        if (canvas && image && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            saveToHistory();
        }
    }, [saveToHistory]);
    
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || !image.complete || image.naturalWidth === 0) return;

        const container = canvas.parentElement;
        if (!container) return;

        const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
        const imageAspectRatio = image.naturalWidth / image.naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        let canvasWidth, canvasHeight;

        if (imageAspectRatio > containerAspectRatio) {
            canvasWidth = containerWidth;
            canvasHeight = containerWidth / imageAspectRatio;
        } else {
            canvasHeight = containerHeight;
            canvasWidth = containerHeight * imageAspectRatio;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            contextRef.current = ctx;
            if (history.current.length > 0) {
                 ctx.putImageData(history.current[history.current.length - 1], 0, 0);
            } else {
                drawInitialImage();
            }
        }
    }, [drawInitialImage]);

    useEffect(() => {
        imageRef.current = new Image();
        const image = imageRef.current;
        image.crossOrigin = "anonymous";

        image.onload = () => {
            history.current = [];
            resizeCanvas();
        };

        if (image.src !== `data:${mimeType};base64,${imageBase64}`) {
            image.src = `data:${mimeType};base64,${imageBase64}`;
        }

        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [imageBase64, mimeType, resizeCanvas]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = 'touches' in e ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = contextRef.current;
        if (!ctx) return;
        saveToHistory();
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !contextRef.current) return;
        const ctx = contextRef.current;
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing || !contextRef.current) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };
    
    const handleUndo = () => {
        if (history.current.length > 1) { // Keep the initial image state
            const lastState = history.current.pop();
            const previousState = history.current[history.current.length -1];
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
            }
        }
    };
    
    const handleClearAllDrawings = () => {
        if (history.current.length > 0) {
            saveToHistory();
            const firstState = history.current[0];
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx && firstState) {
                ctx.putImageData(firstState, 0, 0);
            }
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const newBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        onSave(newBase64);
    };
    
    return (
        <main className="relative z-10 flex flex-col p-4 md:p-6 h-full">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-gray-800/50 transition-colors mr-2 md:mr-4" aria-label="Back to chat">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Image Editor</h1>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleUndo} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-gray-800/50 transition-colors text-neutral-700 dark:text-gray-300" aria-label="Undo">
                        <Undo2 className="h-5 w-5" />
                    </button>
                    <button onClick={handleClearAllDrawings} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-gray-800/50 transition-colors text-neutral-700 dark:text-gray-300" aria-label="Clear all drawings">
                        <Trash2 className="h-5 w-5" />
                    </button>
                    <button onClick={handleSave} className="px-5 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="flex-shrink-0 border-b p-2 md:p-4 md:border-b-0 md:border-r border-white/20 dark:border-white/10 md:flex-col md:w-24">
                    <div className="flex items-center justify-start gap-4 text-white md:flex-col md:justify-center h-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                        <div className="flex flex-shrink-0 items-center md:flex-col gap-2">
                            {colors.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label={`Select color ${c}`} />
                            ))}
                        </div>
                        <div className="w-px md:w-full h-full md:h-px bg-white/20 flex-shrink-0" />
                        <div className="flex flex-shrink-0 items-center md:flex-col gap-3">
                            {sizes.map(s => (
                                <button key={s} onClick={() => setBrushSize(s)} className={`rounded-full bg-gray-400 transition-all ${brushSize === s ? 'ring-2 ring-offset-2 ring-offset-neutral-800 ring-white' : ''}`} style={{ width: s * 2.5, height: s * 2.5 }} aria-label={`Select brush size ${s}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-2 bg-black/20 flex items-center justify-center relative overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
            </div>
        </main>
    );
};

export default ImageEditorView;