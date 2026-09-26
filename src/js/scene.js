import sceneConfig from '../../config/scene.json' with { type: 'json' };

const CONFIG = sceneConfig.default || sceneConfig;

let sceneCanvas, sceneCtx;
let canvasW, canvasH;
let characters = [];
let chains = [];
let lastInteraction = new Map(); // instanceId -> Set of { otherInstanceId, timestamp }
let currentDt = 16.67;
let lastSpawnTime = Date.now();
let nextSpawnDelay = 0;
let animFrameId = null;
let lastFrameTime = 0;
let consecutiveLeft = 0;
let consecutiveRight = 0;
let spriteImages = new Map();
let imagesLoaded = false;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function createCanvas() {
  sceneCanvas = document.createElement('canvas');
  sceneCanvas.id = 'scene-canvas';
  sceneCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  document.getElementById('app').prepend(sceneCanvas);

  sceneCtx = sceneCanvas.getContext('2d');
}

function resize() {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  sceneCanvas.width = canvasW;
  sceneCanvas.height = canvasH;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTrackY(index) {
  const track = CONFIG.tracks[index];
  return canvasH - track.yOffsetFromBottom;
}

function preloadSprites() {
  const paths = new Set();
  for (const char of CONFIG.characters) {
    if (char.spriteSheet) {
      paths.add(char.spriteSheet);
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
    spriteImages.set(path, img);
  }
}

function spawnCharacter() {
  const charConfig = getRandomItem(CONFIG.characters);
  const trackIndex = Math.floor(Math.random() * CONFIG.tracks.length);
  const roadY = getTrackY(trackIndex);

  let fromLeft;
  if (consecutiveLeft >= 2) {
    fromLeft = false;
    consecutiveLeft = 0;
    consecutiveRight++;
  } else if (consecutiveRight >= 2) {
    fromLeft = true;
    consecutiveRight = 0;
    consecutiveLeft++;
  } else {
    fromLeft = Math.random() > 0.5;
    if (fromLeft) {
      consecutiveLeft++;
      consecutiveRight = 0;
    } else {
      consecutiveRight++;
      consecutiveLeft = 0;
    }
  }

  characters.push({
    id: charConfig.id,
    instanceId: Math.random().toString(36).substr(2, 9),
    emoji: charConfig.emoji,
    messageBGColor: charConfig.messageBGColor,
    moveSpeed: charConfig.moveSpeed,
    size: charConfig.size,
    messages: charConfig.messages,
    replyTo: charConfig.replyTo,
    x: fromLeft ? -charConfig.size : canvasW + charConfig.size,
    y: roadY,
    direction: fromLeft ? 1 : -1,
    lastFrameX: fromLeft ? -charConfig.size : canvasW + charConfig.size,
    trackIndex: trackIndex,
    image: charConfig.spriteSheet ? spriteImages.get(charConfig.spriteSheet) : null,
    frameWidth: charConfig.frameWidth || charConfig.size,
    frameHeight: charConfig.frameHeight || charConfig.size,
    framesX: charConfig.framesX || 1,
    fps: charConfig.fps || 0,
    currentFrame: 0,
    frameTimer: 0
  });
}

function canInteract(instanceIdA, instanceIdB) {
  const now = Date.now();
  const cooldown = CONFIG.replyCooldownMs;

  const setA = lastInteraction.get(instanceIdA);
  if (setA) {
    for (const entry of setA) {
      if (entry.otherInstanceId === instanceIdB && (now - entry.timestamp) < cooldown) {
        return false;
      }
    }
  }

  const setB = lastInteraction.get(instanceIdB);
  if (setB) {
    for (const entry of setB) {
      if (entry.otherInstanceId === instanceIdA && (now - entry.timestamp) < cooldown) {
        return false;
      }
    }
  }

  return true;
}

function markInteracted(instanceIdA, instanceIdB) {
  const now = Date.now();

  if (!lastInteraction.has(instanceIdA)) {
    lastInteraction.set(instanceIdA, []);
  }
  lastInteraction.get(instanceIdA).push({ otherInstanceId: instanceIdB, timestamp: now });

  if (!lastInteraction.has(instanceIdB)) {
    lastInteraction.set(instanceIdB, []);
  }
  lastInteraction.get(instanceIdB).push({ otherInstanceId: instanceIdA, timestamp: now });
}

function spawnChainAt(x, y, messageNPCs) {
  const allMessages = [];
  const gap = CONFIG.chainConfig.messageGap;
  const padding = CONFIG.messageConfig.bubblePadding;
  const fontSize = CONFIG.messageConfig.fontSize;

  for (let i = 0; i < messageNPCs.length; i++) {
    const npc = messageNPCs[i];
    if (npc.messages.length > 0) {
      allMessages.push({
        text: getRandomItem(npc.messages),
        color: npc.messageBGColor,
        spawnDelay: 0,
        relativeY: i * (fontSize + padding * 2 + gap),
        speakerX: npc.x,
        driftDirection: npc.direction,
        driftSpeedPxPerSec: npc.moveSpeed * (1000 / 16.67) // convert config speed from px/frame to px/sec
      });
    }
  }

  if (allMessages.length === 0) return;

  chains.push({
    x,
    y: y + CONFIG.chainConfig.messageYOffset,
    createdAt: Date.now(),
    messages: allMessages
  });
}

function checkCrossings() {
  const window = CONFIG.interactionWindow;

  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i];
      const b = characters[j];

      if (!canInteract(a.instanceId, b.instanceId)) continue;

      const xDistance = Math.abs(a.x - b.x);
      const yDistance = Math.abs(a.y - b.y);

      if (xDistance > window * 2 || yDistance > canvasH * 0.15) continue;

      const crossingX = (a.x + b.x) / 2;

      // Calculate head position for each character (feet Y - size)
      const headY_a = a.y - a.size;
      const headY_b = b.y - b.size;

      spawnChainAt(crossingX, Math.min(headY_a, headY_b), [a, b]);

      markInteracted(a.instanceId, b.instanceId);
    }
  }
}

function drawMessageBubble(ctx, msg, x, y, alpha, scale) {
  const padding = CONFIG.messageConfig.bubblePadding;
  const fontSize = CONFIG.messageConfig.fontSize;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;

  const textWidth = ctx.measureText(msg.text).width;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = fontSize + padding * 2;

  const w = bubbleWidth * scale;
  const h = bubbleHeight * scale;
  const rx = Math.min(w / 2, h / 4);

  ctx.fillStyle = msg.color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + rx, y - h / 2);
  ctx.lineTo(x + w / 2 - rx, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + rx);
  ctx.lineTo(x + w / 2, y + h / 2 - rx);
  ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - rx, y + h / 2);
  ctx.lineTo(x - w / 2 + rx, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - rx);
  ctx.lineTo(x - w / 2, y - h / 2 + rx);
  ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + rx, y - h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontSize * scale}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg.text, x, y);

  ctx.restore();
}

function drawCharacter(ctx, char) {
  if (char.image && char.framesX > 1) {
    const col = char.currentFrame % char.framesX;

    ctx.save();
    if (char.direction > 0) {
      ctx.translate(char.x, char.y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        char.image,
        col * char.frameWidth, 0, char.frameWidth, char.frameHeight,
        -char.size / 2, -char.size, char.size, char.size
      );
    } else {
      ctx.drawImage(
        char.image,
        col * char.frameWidth, 0, char.frameWidth, char.frameHeight,
        char.x - char.size / 2, char.y - char.size, char.size, char.size
      );
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = `${char.size}px 'Segoe UI Emoji', 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char.emoji, char.x, char.y);
    ctx.restore();
  }
}

function updateCharacters(dt) {
  const frameDelta = dt / 16.67;

  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];
    char.lastFrameX = char.x;
    char.x += char.moveSpeed * char.direction * frameDelta;

    if (char.fps > 0 && char.framesX > 1) {
      char.frameTimer += dt;
      const frameInterval = 1000 / char.fps;
      while (char.frameTimer >= frameInterval) {
        char.frameTimer -= frameInterval;
        char.currentFrame++;
      }
    }

    if ((char.direction > 0 && char.x > canvasW + char.size * 2) ||
        (char.direction < 0 && char.x < -char.size * 2)) {
      characters.splice(i, 1);
    }
  }
}

function render() {
  sceneCtx.clearRect(0, 0, canvasW, canvasH);

  const now = Date.now();
  const driftSpeed = CONFIG.chainConfig.chainDriftSpeedPxPerFrame;
  const fadeMs = CONFIG.chainConfig.messageFadeMs;
  const maxLifeMs = CONFIG.chainConfig.messageMaxLifeMs;

  // Pass 1: Draw NPCs sorted by track index (lower Y first = further back)
  const sortedChars = [...characters].sort((a, b) => a.trackIndex - b.trackIndex);
  for (const char of sortedChars) {
    drawCharacter(sceneCtx, char);
  }

  // Pass 2: Draw chain messages — chain manages its own message lifecycle
  for (let i = chains.length - 1; i >= 0; i--) {
    const chain = chains[i];
    const age = now - chain.createdAt;
    const driftDt = currentDt;

    // Update Y position
    chain.y -= driftSpeed * (driftDt / 16.67);

    // Remove dead chains
    if (chain.messages.length === 0) {
      chains.splice(i, 1);
      continue;
    }

    // Sort messages by relativeY for rendering (oldest/highest first, newest/lowest last)
    const sortedMessages = [...chain.messages].sort((a, b) => a.relativeY - b.relativeY);

    for (const msg of sortedMessages) {
      const msgAge = age - msg.spawnDelay;

      if (msgAge < 0) continue; // hasn't spawned yet

      let phase = 'visible';
      let progress = 0;
      let scale = 1;

      if (msgAge < fadeMs) {
        phase = 'appear';
        progress = msgAge / fadeMs;
        scale = easeOutCubic(progress);
      } else if (msgAge > maxLifeMs) {
        const fadeStart = maxLifeMs;
        phase = 'disappear';
        progress = Math.min((msgAge - fadeStart) / fadeMs, 1);
        scale = 1 - easeInCubic(progress);
      }

      if (phase === 'disappear' && progress >= 1) {
        continue; // message removed, will be cleaned up next frame
      }

      const alpha = phase === 'visible' ? 1 : (phase === 'appear' ? progress : 1 - progress);
      const renderY = chain.y + msg.relativeY;

      // Calculate drift from spawn position toward center side, capped at chain.x ± maxOffset
      const maxOffset = CONFIG.chainConfig.messageSideOffset;
      const targetX = chain.x + (msg.driftDirection * maxOffset);

      // Time-based drift: speed is px/sec, accumulate over elapsed time
      const totalDrift = msg.driftSpeedPxPerSec * (msgAge / 1000);
      
      let finalX;
      if (msg.driftDirection > 0) {
        // Drifting right: clamp at targetX, don't go past it
        finalX = Math.min(msg.speakerX + totalDrift, targetX);
      } else {
        // Drifting left: clamp at targetX, don't go below it
        finalX = Math.max(msg.speakerX - totalDrift, targetX);
      }

      drawMessageBubble(sceneCtx, msg, finalX, renderY, alpha, phase === 'visible' ? 1 : scale);
    }

    // Clean up expired messages
    chain.messages = chain.messages.filter(msg => {
      const msgAge = age - msg.spawnDelay;
      return msgAge <= maxLifeMs + fadeMs;
    });
  }
}

function animate(timestamp) {
  animFrameId = requestAnimationFrame(animate);

  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = Math.min(timestamp - lastFrameTime, 50);
  lastFrameTime = timestamp;
  currentDt = dt;

  nextSpawnDelay -= dt;
  if (nextSpawnDelay <= 0) {
    spawnCharacter();
    nextSpawnDelay = CONFIG.spawn.minIntervalMs + Math.random() * (CONFIG.spawn.maxIntervalMs - CONFIG.spawn.minIntervalMs);
  }

  updateCharacters(dt);
  checkCrossings();
  render();
}

function init() {
  createCanvas();
  resize();
  window.addEventListener('resize', resize);

  preloadSprites();

  const startScene = () => {
    spawnCharacter();
    nextSpawnDelay = CONFIG.spawn.minIntervalMs / 2;

    lastFrameTime = 0;
    animFrameId = requestAnimationFrame(animate);
  };

  if (imagesLoaded) {
    startScene();
  } else {
    const checkReady = () => {
      if (imagesLoaded) {
        startScene();
      } else {
        requestAnimationFrame(checkReady);
      }
    };
    requestAnimationFrame(checkReady);
  }

  // Cleanup on page unload to prevent leaks
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animFrameId);
    spriteImages.clear();
  });
}

init();
