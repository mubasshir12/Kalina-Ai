
import React, { useState, useEffect } from 'react';
import { Expand, Download, Trash2 } from 'lucide-react';

interface GeneratedImageProps {
    base64: string;
    onExpandClick: (url: string) => void;
    onDownloadClick: (base64: string) => void;
    onDeleteClick?: () => void;
    alt?: string;
    index?: number;
}

const GeneratedImage: React.FC<GeneratedImageProps> = ({ base64, onExpandClick, onDownloadClick, onDeleteClick, alt = "AI generated image", index = 0 }) => {
    const imageUrl = `data:image/png;base64,${base64}`;
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        // This effect runs once when the component mounts or when the image source changes,
        // triggering the animation. It doesn't reset on re-renders for the same image.
        const timer = setTimeout(() => {
            setHasAnimated(true);
        }, 100 + (index * 200)); // A small base delay plus a staggered delay.
        
        return () => clearTimeout(timer);
    }, [base64, index]);


    return (
      <div className={`relative group w-full h-full rounded-lg overflow-hidden image-reveal-container ${hasAnimated ? 'is-loaded' : ''}`}>
        <img 
            src={imageUrl} 
            alt={alt}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => onExpandClick(imageUrl)}
        />
        <div className={`absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${!hasAnimated ? 'pointer-events-none' : ''}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onExpandClick(imageUrl); }} 
            className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
            aria-label="View full image"
          >
            <Expand className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDownloadClick(base64); }} 
            className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
            aria-label="Download image"
          >
            <Download className="h-4 w-4" />
          </button>
          {onDeleteClick && (
            <button 
                onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} 
                className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
                aria-label="Delete image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
}

export default GeneratedImage;