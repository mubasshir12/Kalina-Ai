import React from 'react';
import { X } from 'lucide-react';

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <h2 id="image-modal-title" className="sr-only">Enlarged image view</h2>
        <img src={imageUrl} alt="Enlarged view" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg" />
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full h-10 w-10 flex items-center justify-center hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close image view"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
);

export default ImageModal;