const starsCanvas = document.getElementById('stars-canvas');
const starsCtx = starsCanvas.getContext('2d');
const bgCanvas = document.getElementById('parallax-bg');
const bgCtx = bgCanvas.getContext('2d');

const SCALING_FACTOR = 3;
let canvasW, canvasH;
let stars = [];
let particles = [];
let terrainSeeds = [42, 137, 256, 389];
let terrainFreqs = [0.003, 0.006, 0.012, 0.02];
let terrainAmps = [120, 80, 50, 30];
let terrainSpeeds = [0.02, 0.04, 0.07, 0.12];
let terrainBaseY = [0.45, 0.55, 0.65, 0.8];
let terrainColors = [
  ['#0d0d2b', '#1a1a3a'],
  ['#12122e', '#1e1e42'],
  ['#0f0f24', '#181838'],
  ['#0a0a1a', '#121230']
];
let treePositions = [];
let rockPositions = [];

function resize() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  
  starsCanvas.width = canvasW;
  starsCanvas.height = canvasH;
  bgCanvas.width = Math.floor(canvasW / SCALING_FACTOR);
  bgCanvas.height = Math.floor(canvasH / SCALING_FACTOR);
  
  generateStars();
  generateForegroundDetails();
}

function generateStars() {
  stars = [];
  const count = Math.floor((canvasW * canvasH) / 2500);
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

function generateForegroundDetails() {
  treePositions = [];
  rockPositions = [];
  const terrainWidth = bgCanvas.width;
  
  for (let x = 0; x < terrainWidth + 100; x += Math.floor(8 + Math.random() * 25)) {
    if (Math.random() < 0.4) {
      treePositions.push({
        x: x,
        height: 10 + Math.floor(Math.random() * 20),
        width: 3 + Math.floor(Math.random() * 4),
        type: Math.random() < 0.7 ? 'pine' : 'round'
      });
    } else {
      rockPositions.push({
        x: x,
        width: 3 + Math.floor(Math.random() * 6),
        height: 2 + Math.floor(Math.random() * 4)
      });
    }
  }
}

function noise(x, seed) {
  let y = 0;
  for (let i = 1; i <= 8; i++) {
    y += Math.sin((x + seed) * terrainFreqs[i - 1] * Math.PI * 2) / i;
  }
  return y;
}

function drawStars(time) {
  starsCtx.clearRect(0, 0, canvasW, canvasH);
  
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle);
    
    starsCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    starsCtx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }
}

function drawSky(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
  gradient.addColorStop(0, '#050510');
  gradient.addColorStop(0.3, '#0a0a20');
  gradient.addColorStop(0.7, '#0d0d28');
  gradient.addColorStop(1, '#101030');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function drawTerrainLayer(ctx, layerIndex, offset) {
  const width = canvasW;
  const height = canvasH;
  const seed = terrainSeeds[layerIndex];
  const baseY = height * terrainBaseY[layerIndex];
  const amp = terrainAmps[layerIndex];
  
  ctx.beginPath();
  ctx.moveTo(0, height);
  
  for (let x = -1; x <= width + 1; x += 2) {
    const noiseVal = noise(x + offset, seed);
    const y = baseY + noiseVal * amp;
    ctx.lineTo(x, y);
  }
  
  ctx.lineTo(width, height);
  ctx.closePath();
  
  const gradient = ctx.createLinearGradient(0, baseY - amp, 0, height);
  gradient.addColorStop(0, terrainColors[layerIndex][0]);
  gradient.addColorStop(1, terrainColors[layerIndex][1]);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawForegroundDetails(ctx, offset) {
  const terrainWidth = canvasW;
  const scaledOffset = offset % (terrainWidth + 200);
  
  for (const tree of treePositions) {
    const x = ((tree.x - scaledOffset) % (terrainWidth + 200) + terrainWidth + 200) % (terrainWidth + 200) - 100;
    
    if (x < -20 || x > terrainWidth + 20) continue;
    
    ctx.fillStyle = '#08081a';
    
    if (tree.type === 'pine') {
      for (let y = 0; y < tree.height; y += 2) {
        const w = tree.width * (1 - y / tree.height);
        ctx.fillRect(Math.floor(x - w / 2), Math.floor(canvasH - tree.height + y), Math.ceil(w), 2);
      }
    } else {
      ctx.beginPath();
      ctx.arc(Math.floor(x), Math.floor(canvasH - tree.height), tree.width, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (const rock of rockPositions) {
    const x = ((rock.x - scaledOffset) % (terrainWidth + 200) + terrainWidth + 200) % (terrainWidth + 200) - 100;
    
    if (x < -20 || x > terrainWidth + 20) continue;
    
    ctx.fillStyle = '#0c0c22';
    ctx.fillRect(Math.floor(x), Math.floor(canvasH - rock.height), Math.ceil(rock.width), Math.ceil(rock.height));
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

function generateParticles() {
  particles = [];
  const count = Math.floor((canvasW * canvasH) / 8000);
  const colors = ['0, 240, 255', '180, 0, 255', '255, 0, 170', '255, 255, 255'];
  
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      size: Math.random() < 0.3 ? 2 : 1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      baseAlpha: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function getScrollOffset() {
  const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
  return scrollFraction;
}

let lastTime = 0;
function animate(time) {
  const scrollOffset = getScrollOffset();
  
  starsCtx.clearRect(0, 0, canvasW, canvasH);
  drawStars(time);
  
  bgCtx.clearRect(0, 0, canvasW, canvasH);
  drawSky(bgCtx);
  
  for (let i = 0; i < terrainSpeeds.length; i++) {
    const offset = scrollOffset * terrainSpeeds[i] * canvasH * 2;
    drawTerrainLayer(bgCtx, i, offset);
  }
  
  drawForegroundDetails(bgCtx, scrollOffset * canvasH * 2);
  drawParticles(bgCtx, time);
  
  updateParticles();
  
  requestAnimationFrame(animate);
}

resize();
window.addEventListener('resize', () => {
  resize();
});

requestAnimationFrame(animate);
