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

    let currentFrameIndex = 0;
    const images: HTMLImageElement[] = [];

    // Helper to draw an image to canvas with 'cover' aspect ratio (fills screen on mobile & desktop)
    const drawCoverImage = (img: HTMLImageElement) => {
      if (!canvas || !context || !img || !img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      const scale = Math.max(cw / iw, ch / ih);
      const nw = iw * scale;
      const nh = ih * scale;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      context.clearRect(0, 0, cw, ch);
      context.drawImage(img, nx, ny, nw, nh);
    };

    // Responsive Canvas Resize
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (images[currentFrameIndex]) {
        drawCoverImage(images[currentFrameIndex]);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Preload first image and render immediately
    const firstImg = new Image();
    firstImg.src = currentFrame(1);
    firstImg.onload = () => {
      images[0] = firstImg;
      drawCoverImage(firstImg);
    };

    // Preload remaining frames progressively
    for (let i = 1; i <= frameCount; i++) {
      const imgObj = new Image();
      imgObj.src = currentFrame(i);
      imgObj.onload = () => {
        if (i - 1 === currentFrameIndex) {
          drawCoverImage(imgObj);
        }
      };
      images[i - 1] = imgObj;
    }

    // Scroll Handler (supports desktop wheel & mobile touch scrolling)
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const maxScrollTop = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;
      const scrollFraction = maxScrollTop > 0 ? Math.min(1, Math.max(0, scrollTop / maxScrollTop)) : 0;
      
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
      );

      currentFrameIndex = frameIndex;

      requestAnimationFrame(() => {
        if (images[frameIndex] && images[frameIndex].complete) {
          drawCoverImage(images[frameIndex]);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500"
      style={{
        zIndex: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none'
      }}
    />
  );
};
