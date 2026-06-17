import { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCrop({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 200; // Output size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The container size is let's say 250x250
    const containerSize = containerRef.current.getBoundingClientRect().width;
    const scale = size / containerSize;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw image
    const img = imageRef.current;
    const drawWidth = img.width * zoom * scale;
    const drawHeight = img.height * zoom * scale;
    
    // The image's center is at crop.x, crop.y relative to container center
    const centerX = size / 2;
    const centerY = size / 2;
    
    const drawX = centerX - drawWidth / 2 + crop.x * scale;
    const drawY = centerY - drawHeight / 2 + crop.y * scale;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(base64);
  };

  return (
    <div className="image-cropper-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div 
        ref={containerRef}
        style={{
          width: '250px',
          height: '250px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#333',
          borderRadius: '50%',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Crop preview"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px)) scale(${zoom})`,
            transformOrigin: 'center',
            maxWidth: 'none',
            pointerEvents: 'none'
          }}
          onLoad={(e) => {
            // Initial scale to fit the container
            const img = e.currentTarget;
            const size = 250;
            const minScale = Math.max(size / img.width, size / img.height);
            setZoom(minScale);
          }}
        />
      </div>

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>Zoom:</span>
        <input 
          type="range" 
          min="0.1" 
          max="3" 
          step="0.01" 
          value={zoom} 
          onChange={(e) => setZoom(parseFloat(e.target.value))} 
          style={{ flex: 1 }}
        />
      </div>

      <div className="modal-footer" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary" onClick={handleSave}>Apply Crop</button>
      </div>
    </div>
  );
}
