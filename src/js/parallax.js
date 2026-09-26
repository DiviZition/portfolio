const CONFIG = {
  skyColors: ['#0a0a1a', '#151538'],
  terrainLayers: [
    { baseY: 0.72, amp: 60, colors: ['#3a2878', '#2a1860'], speed: 0.01, seed: 42 },
    { baseY: 0.78, amp: 45, colors: ['#4a3090', '#382070'], speed: 0.02, seed: 137 },
    { baseY: 0.84, amp: 30, colors: ['#5a38a0', '#482888'], speed: 0.03, seed: 256 },
    { baseY: 0.90, amp: 15, colors: ['#6a40b0', '#583098'], speed: 0.04, seed: 389 }
  ],
  starCount: (w, h) => Math.floor(w * h / 2500),
  particleCount: (w, h) => Math.floor(w * h / 8000),
  particleColors: ['0, 240, 255', '180, 0, 255', '255, 0, 170', '255, 255, 255']
};

let starsCanvas, starsCtx;
let bgCanvas, bgCtx;
let canvasW, canvasH;
let stars = [];
let particles = [];
let foregroundDetails = [];

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
  generateForegroundDetails();
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

function generateForegroundDetails() {
  foregroundDetails = [];
  const count = Math.floor(canvasW / 15);
  for (let i = 0; i < count; i++) {
    const type = Math.random();
    if (type < 0.4) {
      foregroundDetails.push({
        x: Math.random() * canvasW,
        height: 8 + Math.random() * 15,
        width: 2 + Math.random() * 3,
        type: 'tree'
      });
    } else if (type < 0.7) {
      foregroundDetails.push({
        x: Math.random() * canvasW,
        height: 3 + Math.random() * 5,
        width: 4 + Math.random() * 6,
        type: 'rock'
      });
    } else {
      foregroundDetails.push({
        x: Math.random() * canvasW,
        height: 6 + Math.random() * 10,
        width: 2 + Math.random() * 2,
        type: 'cactus'
      });
    }
  }
}

function drawForegroundDetails(ctx) {
  const baseY = canvasH * 0.92;

  for (const detail of foregroundDetails) {
    const x = detail.x;
    const y = baseY;

    ctx.fillStyle = '#1a1040';

    if (detail.type === 'tree') {
      for (let dH = 0; dH < detail.height; dH += 2) {
        const wd = detail.width * (1 - dH / detail.height);
        ctx.fillRect(Math.floor(x - wd / 2), Math.floor(y - dH), Math.ceil(wd), 2);
      }
    } else if (detail.type === 'rock') {
      ctx.beginPath();
      ctx.ellipse(Math.floor(x), Math.floor(y - detail.height / 2), Math.floor(detail.width / 2), Math.floor(detail.height / 2), 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(Math.floor(x - detail.width / 2), Math.floor(y - detail.height), Math.ceil(detail.width), Math.ceil(detail.height));
      if (detail.height > 10) {
        const armY = Math.floor(y - detail.height * 0.6);
        ctx.fillRect(Math.floor(x + detail.width / 2), Math.floor(armY), 4, 2);
        ctx.fillRect(Math.floor(x + detail.width / 2 + 3), Math.floor(armY - 4), 2, 4);
      }
    }
  }
}

function noise(x, seed) {
  let y = 0;
  for (let i = 1; i <= 6; i++) {
    const freq = 0.004 * Math.pow(2, i - 1);
    y += Math.sin((x + seed) * freq) / Math.pow(2, i - 1);
  }
  return y;
}

function drawSky(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
  CONFIG.skyColors.forEach((color, i) => {
    gradient.addColorStop(i / (CONFIG.skyColors.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function drawStars(ctx, time) {
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }
}

function drawTerrain(ctx) {
  const height = canvasH;
  
  for (let i = 0; i < CONFIG.terrainLayers.length; i++) {
    const layer = CONFIG.terrainLayers[i];
    const baseY = height * layer.baseY;
    ctx.fillStyle = layer.colors[0];
    ctx.fillRect(0, baseY, canvasW, height - baseY);
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

function animate(time) {
  starsCtx.clearRect(0, 0, canvasW, canvasH);
  drawStars(starsCtx, time);

  bgCtx.clearRect(0, 0, canvasW, canvasH);
  drawSky(bgCtx);
  drawTerrain(bgCtx);
  drawForegroundDetails(bgCtx);
  drawParticles(bgCtx, time);

  updateParticles();

  requestAnimationFrame(animate);
}

createCanvases();
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(animate);
