import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Undo2, Trash2 } from 'lucide-react';

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newBase64: string) => void;
    imageBase64: string;
    mimeType: string;
}

const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#FFFFFF'];
const sizes = [2, 5, 10];

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, onSave, imageBase64, mimeType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState(colors[0]);
    const [brushSize, setBrushSize] = useState(sizes[1]);
    const history = useRef<ImageData[]>([]);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

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
            // Redraw history if any
            if (history.current.length > 0) {
                ctx.putImageData(history.current[history.current.length - 1], 0, 0);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            const image = imageRef.current;
            if (image) {
                image.onload = () => {
                    resizeCanvas();
                    history.current = []; // Clear history on new image
                };
                if (image.src !== `data:${mimeType};base64,${imageBase64}`) {
                     image.src = `data:${mimeType};base64,${imageBase64}`;
                } else {
                    resizeCanvas();
                    history.current = [];
                }
            }
            window.addEventListener('resize', resizeCanvas);
        } else {
            window.removeEventListener('resize', resizeCanvas);
        }
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isOpen, imageBase64, mimeType, resizeCanvas]);
    
    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas || !contextRef.current) return;
        history.current.push(contextRef.current.getImageData(0, 0, canvas.width, canvas.height));
    };

    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
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
        if (history.current.length > 0) {
            const lastState = history.current.pop();
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (canvas && ctx && lastState) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.putImageData(lastState, 0, 0);
            }
        }
    };
    
    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            saveToHistory();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.naturalWidth;
        tempCanvas.height = image.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.drawImage(image, 0, 0);
        tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, image.naturalWidth, image.naturalHeight);
        
        // Output as JPEG for compression, even if original was PNG
        const newBase64 = tempCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        onSave(newBase64);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
            <div className="bg-neutral-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-3 border-b border-gray-700 flex justify-between items-center flex-shrink-0 text-white">
                    <h2 className="text-lg font-semibold">Mark up Image</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSave} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 transition-colors">Save</button>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700"><X className="h-5 w-5" /></button>
                    </div>
                </header>
                <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="p-4 border-b md:border-b-0 md:border-r border-gray-700 flex-shrink-0 md:flex-col md:w-20 flex items-center justify-center gap-4">
                        <div className="flex md:flex-col gap-2">
                            {colors.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label={`Select color ${c}`} />
                            ))}
                        </div>
                        <div className="w-px md:w-full h-full md:h-px bg-gray-700" />
                        <div className="flex md:flex-col gap-3 items-center">
                            {sizes.map(s => (
                                <button key={s} onClick={() => setBrushSize(s)} className={`rounded-full bg-gray-500 transition-all ${brushSize === s ? 'ring-2 ring-offset-2 ring-offset-neutral-800 ring-white' : ''}`} style={{ width: s * 2.5, height: s * 2.5 }} aria-label={`Select brush size ${s}`} />
                            ))}
                        </div>
                         <div className="w-px md:w-full h-full md:h-px bg-gray-700" />
                         <div className="flex md:flex-col gap-2">
                            <button onClick={handleUndo} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-white" aria-label="Undo"><Undo2 /></button>
                            <button onClick={handleClear} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-white" aria-label="Clear all"><Trash2 /></button>
                        </div>
                    </div>
                    <div className="flex-1 p-2 bg-black flex items-center justify-center relative overflow-hidden">
                        <img ref={imageRef} src={`data:${mimeType};base64,${imageBase64}`} alt="Image to edit" className="max-w-full max-h-full object-contain pointer-events-none" />
                        <canvas
                            ref={canvasRef}
                            className="absolute"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ImageEditorModal;