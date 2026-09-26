const canvas = document.getElementById('video-canvas');
const context = canvas.getContext('2d');

const frameCount = 299;
const currentFrame = index => (
  `frames/frame_${index.toString().padStart(6, '0')}.jpg`
);

const images = [];

// Set canvas dimensions based on the first image to maintain aspect ratio
const img = new Image();
img.src = currentFrame(1);
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
};

// Preload images
for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = currentFrame(i);
    images.push(img);
}

window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFraction = scrollTop / maxScrollTop;
    
    // Calculate frame index based on scroll fraction
    const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
    );
    
    // Request animation frame for smooth drawing
    requestAnimationFrame(() => {
        if (images[frameIndex] && images[frameIndex].complete) {
            context.drawImage(images[frameIndex], 0, 0);
        }
    });
});
