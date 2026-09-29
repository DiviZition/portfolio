import bgConfig from '../../config/background.json' with { type: 'json' };

const BACKGROUND = bgConfig.default || bgConfig;

const CONFIG = {
  skyColors: ['#0a0a1a', '#151538'],
  starCount: (w, h) => Math.floor(w * h / 2500),
  starColors: ['255, 255, 255', '173, 216, 230', '255, 182, 193', '186, 85, 211'],
  starColorWeights: [0.4, 0.65, 0.85, 1.0],
  shootingStarIntervalMin: 12000,
  shootingStarIntervalMax: 18000,
  shootingStarSpeedMin: 400,
  shootingStarSpeedMax: 800,
  shootingStarLength: 60,
};

let starsCanvas, starsCtx;
let bgCanvas, bgCtx;
let canvasW, canvasH;
let starsByColor = [[], [], [], []];
let backgroundLayers = [];
let imagesLoaded = false;
let shootingStars = [];
let lastShootingStarTime = 0;
let resizeTimer = null;

function createCanvases() {
  const names = ['stars-canvas', 'parallax-bg'];
  [starsCanvas, bgCanvas] = names.map(name => {
    const c = document.createElement('canvas');
    c.id = name;
    c.className = name;
    let zIndex = '-2';
    if (name === 'parallax-bg') zIndex = '-1';
    c.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex};`;
    if (name === 'parallax-bg') {
      c.style.imageRendering = 'pixelated';
    }
    document.getElementById('app').prepend(c);
    return c;
  });

  starsCtx = starsCanvas.getContext('2d');
  bgCtx = bgCanvas.getContext('2d');
}

function handleResize() {
  const prevCanvasW = canvasW;
  const prevCanvasH = canvasH;
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  starsCanvas.width = canvasW;
  starsCanvas.height = canvasH;
  bgCanvas.width = canvasW;
  bgCanvas.height = canvasH;

  // Scale instance positions proportionally so tiles stay at same screen locations
  for (const layer of backgroundLayers) {
    if (!layer.image || !layer.animated) continue;
    const ratio = prevCanvasW > 0 ? canvasW / prevCanvasW : 1;
    for (const inst of layer.instances) {
      inst.x *= ratio;
    }
  }

  generateStars();
  computeScales();
  updateBackgroundInstances();
}

function resize() {
  handleResize();
}

function debouncedResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleResize, 100);
}

function computeScales() {
  for (const layer of backgroundLayers) {
    if (!layer.image) continue;
    layer.scaleX = canvasW / layer.image.width;
    layer.scaleY = canvasH / layer.image.height;
  }
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
          computeScales();
          buildInstances();
        }
      };
      img.onerror = () => {
        layer.image = null;
        loaded++;
        if (loaded === totalImages) {
          computeScales();
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

    const tileW = layer.image.width * layer.scaleX;

    if (layer.animated) {
      const numCopies = Math.ceil(canvasW / tileW) + 2;
      layer.instances = [];
      for (let i = 0; i < numCopies; i++) {
        layer.instances.push({ x: i * tileW });
      }
    } else {
      layer.instances = [{ x: 0 }];
    }
  }
}

function updateBackgroundInstances() {
    for (const layer of backgroundLayers) {
        if (!layer.image || !layer.animated) continue;

        const tileW = layer.image.width * layer.scaleX;
        const neededCopies = Math.ceil(canvasW / tileW) + 2;

        // Remove overlapping instances from resize scaling artifacts
        layer.instances = layer.instances.filter((inst, i, arr) => {
            if (i === 0) return true;
            return Math.abs(inst.x - arr[i-1].x) > tileW * 0.5;
        });

        // Add missing instances on the right
        while (layer.instances.length < neededCopies) {
            const rightmost = Math.max(...layer.instances.map(inst => inst.x));
            layer.instances.push({ x: rightmost + tileW });
        }
    }
}

function generateStars() {
  starsByColor = [[], [], [], []];
  const count = CONFIG.starCount(canvasW, canvasH);
  for (let i = 0; i < count; i++) {
    let colorIdx = 0;
    const r = Math.random();
    for (let c = 0; c < CONFIG.starColorWeights.length; c++) {
      if (r < CONFIG.starColorWeights[c]) { colorIdx = c; break; }
    }
    const sizeOptions = [1, 1.5, 2, 3];
    const logMin = Math.log(0.001);
    const logMax = Math.log(0.008);
    const twinkleSpeed = Math.exp(logMin + Math.random() * (logMax - logMin));
    starsByColor[colorIdx].push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH * 0.6,
      size: sizeOptions[Math.floor(Math.random() * sizeOptions.length)],
      baseAlpha: 0.3 + Math.random() * 0.7,
      twinkleSpeed: twinkleSpeed,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
}

function drawStars(ctx, time) {
  for (let c = 0; c < starsByColor.length; c++) {
    const group = starsByColor[c];
    if (group.length === 0) continue;
    ctx.beginPath();
    for (const star of group) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle);
      ctx.fillStyle = `rgba(${CONFIG.starColors[c]}, ${alpha})`;
      ctx.rect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }
    ctx.fill();
  }
}

function spawnShootingStar(time) {
  const speed = CONFIG.shootingStarSpeedMin + Math.random() * (CONFIG.shootingStarSpeedMax - CONFIG.shootingStarSpeedMin);
  const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.6;
  shootingStars.push({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH * 0.3,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    maxLife: 800 + Math.random() * 400,
    color: Math.random() < 0.5 ? '255, 255, 255' : '173, 216, 230',
    length: CONFIG.shootingStarLength * (0.8 + Math.random() * 0.4)
  });
}

function updateShootingStars(dt) {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.x += star.vx * (dt / 1000);
    star.y += star.vy * (dt / 1000);
    star.age += dt;
    if (star.age > star.maxLife) {
      shootingStars.splice(i, 1);
    }
  }
}

function drawShootingStars(ctx) {
  for (const star of shootingStars) {
    const progress = star.age / star.maxLife;
    let alpha = 1;
    if (progress < 0.05) {
      alpha = progress / 0.05;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }

    const tailX = star.x - star.vx * (star.length / 1000);
    const tailY = star.y - star.vy * (star.length / 1000);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(${star.color}, 1)`;
    const lineWidth = [1, 1.5, 2][Math.floor(Math.random() * 3)];
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(star.x, star.y);
    ctx.stroke();
    ctx.restore();
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

    const tileW = layer.image.width * layer.scaleX;
    const speedPxPerSec = (layer.speed || 20) * layer.scaleX;
    const moveAmount = speedPxPerSec * (dt / 1000) * (layer.direction || -1);

    for (const inst of layer.instances) {
      inst.x += moveAmount;
    }

    let wrapped = false;

    // Left wrap: instances past the left edge go to the right, preserving their relative offset
    const leftmost = Math.min(...layer.instances.map(inst => inst.x));
    if (leftmost + tileW < 0) {
        const rightmost = Math.max(...layer.instances.map(inst => inst.x));
        for (const inst of layer.instances) {
            if (inst.x + tileW < 0) {
                const offset = inst.x - leftmost;
                inst.x = rightmost + tileW + offset;
                wrapped = true;
            }
        }
    }

    // Right wrap: only if nothing was left-wrapped in this frame
    if (!wrapped) {
      const rightmost = Math.max(...layer.instances.map(inst => inst.x));
      if (rightmost > canvasW) {
        const leftmost2 = Math.min(...layer.instances.map(inst => inst.x));
        for (const inst of layer.instances) {
          if (inst.x > canvasW + tileW) {
            inst.x = leftmost2 - tileW;
          }
        }
      }
    }
  }
}

function drawBackgroundLayers(ctx, dt) {
  updateBackgroundLayers(dt);

  // Draw custom image layers on top
  for (const layer of backgroundLayers) {
    if (!layer.image) continue;

    const tileW = layer.image.width * layer.scaleX;
    const tileH = layer.image.height * layer.scaleY;
    const yOffset = layer.offsetFromBottom < 1 ? canvasH * layer.offsetFromBottom : layer.offsetFromBottom;
    const y = canvasH - yOffset - tileH;

    if (layer.animated) {
      // Animated layers: tile/wrap from left edge
      for (const inst of layer.instances) {
        ctx.drawImage(
          layer.image,
          0, 0, layer.image.width, layer.image.height,
          Math.floor(inst.x), Math.floor(y), Math.floor(tileW), Math.floor(tileH)
        );
      }
    } else {
      // Static layers: center horizontally
      const centerX = (canvasW - tileW) / 2;
      ctx.drawImage(
        layer.image,
        0, 0, layer.image.width, layer.image.height,
        Math.floor(centerX), Math.floor(y), Math.floor(tileW), Math.floor(tileH)
      );
    }
  }
}

function animate(time) {
  starsCtx.clearRect(0, 0, canvasW, canvasH);
  drawSky(starsCtx);
  drawStars(starsCtx, time);

  const shootingStarInterval = CONFIG.shootingStarIntervalMin + Math.random() * (CONFIG.shootingStarIntervalMax - CONFIG.shootingStarIntervalMin);
  if (time - lastShootingStarTime > shootingStarInterval) {
    spawnShootingStar(time);
    lastShootingStarTime = time;
  }

  updateShootingStars(time - (animate.lastTime || time));
  drawShootingStars(starsCtx);

  const rawDt = time - (animate.lastTime || time);
  const dt = Math.min(rawDt, 50);
  animate.lastTime = time;

  bgCtx.clearRect(0, 0, canvasW, canvasH);
  drawBackgroundLayers(bgCtx, dt);

  requestAnimationFrame(animate);
}

function start() {
  createCanvases();
  resizeTimer = null;
  const prevCanvasW = canvasW;
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  starsCanvas.width = canvasW;
  starsCanvas.height = canvasH;
  bgCanvas.width = canvasW;
  bgCanvas.height = canvasH;

  generateStars();

  window.addEventListener('resize', debouncedResize);

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
