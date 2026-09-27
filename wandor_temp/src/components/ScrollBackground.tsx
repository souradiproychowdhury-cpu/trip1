import React, { useEffect, useRef } from 'react';

export const ScrollBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCount = 299;
  const currentFrame = (index: number) =>
    `/frames/frame_${index.toString().padStart(6, '0')}.jpg`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const images: HTMLImageElement[] = [];

    // Preload first image
    const img = new Image();
    img.src = currentFrame(1);
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
    };

    // Preload rest
    for (let i = 1; i <= frameCount; i++) {
      const imgObj = new Image();
      imgObj.src = currentFrame(i);
      images.push(imgObj);
    }

    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
      
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
      );

      requestAnimationFrame(() => {
        if (images[frameIndex] && images[frameIndex].complete) {
          context.drawImage(images[frameIndex], 0, 0);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '100vw',
        maxHeight: '100vh',
        objectFit: 'cover',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};
