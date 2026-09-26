import bgConfig from '../../config/background.json' with { type: 'json' };

const BACKGROUND = bgConfig.default || bgConfig;

const CONFIG = {
  skyColors: ['#0a0a1a', '#151538'],
  starCount: (w, h) => Math.floor(w * h / 2500),
  particleCount: (w, h) => Math.floor(w * h / 8000),
  particleColors: ['0, 240, 255', '180, 0, 255', '255, 0, 170', '255, 255, 255']
};

let starsCanvas, starsCtx;
let bgCanvas, bgCtx;
let canvasW, canvasH;
let stars = [];
let particles = [];
let backgroundLayers = [];
let imagesLoaded = false;

function createCanvases() {
  const names = ['stars-canvas', 'parallax-bg'];
  [starsCanvas, bgCanvas] = names.map(name => {
    const c = document.createElement('canvas');
    c.id = name;
    c.className = name;
    c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;';
    if (name === 'parallax-bg') {
      c.style.imageRendering = 'pixelated';
    }
    document.getElementById('app').prepend(c);
    return c;
  });

  starsCtx = starsCanvas.getContext('2d');
  bgCtx = bgCanvas.getContext('2d');
}

function resize() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  starsCanvas.width = canvasW;
  starsCanvas.height = canvasH;
  bgCanvas.width = canvasW;
  bgCanvas.height = canvasH;
  generateStars();
  generateParticles();
  updateBackgroundInstances();
}

function preloadBackgroundImages() {
  const paths = new Set();
  for (const layer of BACKGROUND.layers) {
    if (layer.image) {
      paths.add(layer.image);
    }
  }

  if (paths.size === 0) {
    imagesLoaded = true;
    return;
  }

  let loaded = 0;
  for (const path of paths) {
    const img = new Image();
    img.onload = () => {
      loaded++;
      if (loaded === paths.size) {
        imagesLoaded = true;
      }
    };
    img.onerror = () => {
      loaded++;
      if (loaded === paths.size) {
        imagesLoaded = true;
      }
    };
    img.src = path;
  }
}

function initBackgroundLayers() {
  backgroundLayers = BACKGROUND.layers.map((layer) => ({
    _imagePath: layer.image,
    width: layer.width,
    height: layer.height,
    offsetFromBottom: layer.offsetFromBottom,
    animated: layer.animated,
    speed: layer.speed,
    direction: layer.direction,
    image: null,
    instances: []
  }));

  let loaded = 0;
  const totalImages = backgroundLayers.filter(l => l._imagePath).length;

  if (totalImages === 0) {
    buildInstances();
    return;
  }

  for (const layer of backgroundLayers) {
    if (layer._imagePath) {
      const img = new Image();
      img.onload = () => {
        layer.image = img;
        loaded++;
        if (loaded === totalImages) {
          buildInstances();
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === totalImages) {
          buildInstances();
        }
      };
      img.src = layer._imagePath;
    }
  }
}

function buildInstances() {
  for (const layer of backgroundLayers) {
    if (!layer.image) continue;

    if (layer.animated) {
      const numCopies = Math.ceil(canvasW / layer.width) + 2;
      layer.instances = [];
      for (let i = 0; i < numCopies; i++) {
        layer.instances.push({ x: i * layer.width });
      }
    } else {
      layer.instances = [{ x: 0 }];
    }
  }
}

function updateBackgroundInstances() {
  for (const layer of backgroundLayers) {
    if (!layer.image || !layer.animated) continue;

    const numCopies = Math.ceil(canvasW / layer.width) + 2;
    if (layer.instances.length < numCopies) {
      for (let i = layer.instances.length; i < numCopies; i++) {
        layer.instances.push({ x: i * layer.width });
      }
    }

    const rightmost = Math.max(...layer.instances.map(inst => inst.x));
    for (const inst of layer.instances) {
      if (inst.x + layer.width < rightmost - canvasW * 0.5) {
        inst.x = rightmost + layer.width;
      }
    }
  }
}

function generateStars() {
  stars = [];
  const count = CONFIG.starCount(canvasW, canvasH);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH * 0.6,
      size: Math.random() < 0.3 ? 1.5 : 1,
      baseAlpha: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.005 + Math.random() * 0.02,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
}

function generateParticles() {
  particles = [];
  const count = CONFIG.particleCount(canvasW, canvasH);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      size: Math.random() < 0.3 ? 2 : 1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      baseAlpha: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      color: CONFIG.particleColors[Math.floor(Math.random() * CONFIG.particleColors.length)]
    });
  }
}

function drawStars(ctx, time) {
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }
}

function drawParticles(ctx, time) {
  for (const p of particles) {
    const alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.01 + p.phase));
    ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx + (Math.random() - 0.5) * 0.3;
    p.y += p.vy + (Math.random() - 0.5) * 0.2;
    if (p.x < 0) p.x = canvasW;
    if (p.x > canvasW) p.x = 0;
    if (p.y < 0) p.y = canvasH;
    if (p.y > canvasH) p.y = 0;
  }
}

function drawSky(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
  CONFIG.skyColors.forEach((color, i) => {
    gradient.addColorStop(i / (CONFIG.skyColors.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function updateBackgroundLayers(dt) {
  for (const layer of backgroundLayers) {
    if (!layer.image || !layer.animated) continue;

    const speedPxPerSec = layer.speed || 20;
    const moveAmount = speedPxPerSec * (dt / 1000) * (layer.direction || -1);

    for (const inst of layer.instances) {
      inst.x += moveAmount;
    }

    const leftmost = Math.min(...layer.instances.map(inst => inst.x));
    if (leftmost + layer.width < 0) {
      const rightmost = Math.max(...layer.instances.map(inst => inst.x));
      for (const inst of layer.instances) {
        if (inst.x + layer.width < 0) {
          inst.x = rightmost + layer.width;
        }
      }
    }

    const rightmost = Math.max(...layer.instances.map(inst => inst.x));
    if (rightmost > canvasW) {
      const leftmost2 = Math.min(...layer.instances.map(inst => inst.x));
      for (const inst of layer.instances) {
        if (inst.x > canvasW + layer.width) {
          inst.x = leftmost2 - layer.width;
        }
      }
    }
  }
}

function drawBackgroundLayers(ctx, dt) {
  updateBackgroundLayers(dt);

  // Always draw procedural fallback first (sky only)
  drawSky(ctx);

  // Then draw custom image layers on top
  for (const layer of backgroundLayers) {
    if (!layer.image) continue;

    const yOffset = layer.offsetFromBottom < 1 ? canvasH * layer.offsetFromBottom : layer.offsetFromBottom;
    const y = canvasH - yOffset - layer.height;

    if (layer.animated) {
      // Animated layers: tile/wrap from left edge
      for (const inst of layer.instances) {
        ctx.drawImage(
          layer.image,
          Math.floor(inst.x),
          Math.floor(y),
          layer.width,
          layer.height
        );
      }
    } else {
      // Static layers: center horizontally
      const centerX = (canvasW - layer.width) / 2;
      ctx.drawImage(
        layer.image,
        Math.floor(centerX),
        Math.floor(y),
        layer.width,
        layer.height
      );
    }
  }
}

function animate(time) {
  starsCtx.clearRect(0, 0, canvasW, canvasH);
  drawStars(starsCtx, time);

  const dt = time - (animate.lastTime || time);
  animate.lastTime = time;

  bgCtx.clearRect(0, 0, canvasW, canvasH);
  drawBackgroundLayers(bgCtx, dt);
  drawParticles(bgCtx, time);

  updateParticles();

  requestAnimationFrame(animate);
}

function start() {
  createCanvases();
  resize();
  window.addEventListener('resize', resize);

  preloadBackgroundImages();

  const initScene = () => {
    initBackgroundLayers();
    animate.lastTime = 0;
    requestAnimationFrame(animate);
  };

  if (imagesLoaded) {
    initScene();
  } else {
    const checkReady = () => {
      if (imagesLoaded) {
        initScene();
      } else {
        requestAnimationFrame(checkReady);
      }
    };
    requestAnimationFrame(checkReady);
  }
}

start();
