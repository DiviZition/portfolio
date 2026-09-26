import sceneConfig from '../../config/scene.json' with { type: 'json' };

const CONFIG = sceneConfig.default || sceneConfig;

const TRACKS = [0.90, 0.92, 0.94, 0.96];

let sceneCanvas, sceneCtx;
let canvasW, canvasH;
let characters = [];
let chains = [];
let lastInteraction = new Map(); // instanceId -> Set of { otherInstanceId, timestamp }
let currentDt = 16.67;
let lastSpawnTime = Date.now();
let spawnTimer = null;
let animFrameId = null;
let lastFrameTime = 0;
let consecutiveLeft = 0;
let consecutiveRight = 0;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function createCanvas() {
  sceneCanvas = document.createElement('canvas');
  sceneCanvas.id = 'scene-canvas';
  sceneCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
  document.body.appendChild(sceneCanvas);

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
  return canvasH * TRACKS[index];
}

function spawnCharacter() {
  const charConfig = getRandomItem(CONFIG.characters);
  const trackIndex = Math.floor(Math.random() * TRACKS.length);
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
    speed: charConfig.speed,
    size: charConfig.size,
    messages: charConfig.messages,
    replyTo: charConfig.replyTo,
    x: fromLeft ? -charConfig.size : canvasW + charConfig.size,
    y: roadY,
    direction: fromLeft ? 1 : -1,
    lastFrameX: fromLeft ? -charConfig.size : canvasW + charConfig.size,
    trackIndex: trackIndex
  });
}

function scheduleNextSpawn() {
  const now = Date.now();
  const timeSinceLastSpawn = now - lastSpawnTime;
  const minInterval = CONFIG.spawn.minIntervalMs;

  if (timeSinceLastSpawn < minInterval) {
    setTimeout(() => scheduleNextSpawn(), minInterval - timeSinceLastSpawn);
    return;
  }

  const interval = minInterval + Math.random() * (CONFIG.spawn.maxIntervalMs - minInterval);
  spawnTimer = setTimeout(() => {
    lastSpawnTime = Date.now();
    spawnCharacter();
    scheduleNextSpawn();
  }, interval);
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
        speed: npc.speed
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
      const crossingY = (a.y + b.y) / 2;

      spawnChainAt(crossingX, crossingY, [a, b]);

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
  ctx.save();
  ctx.font = `${char.size}px 'Segoe UI Emoji', 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.emoji, char.x, char.y);
  ctx.restore();
}

function updateCharacters(dt) {
  const frameDelta = dt / 16.67;

  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];
    char.lastFrameX = char.x;
    char.x += char.speed * char.direction * frameDelta;

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
      const driftPerFrame = msg.speed;
      const framesElapsed = msgAge / currentDt;
      const totalDrift = driftPerFrame * framesElapsed;
      
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

  updateCharacters(dt);
  checkCrossings();
  render();
}

function init() {
  createCanvas();
  resize();
  window.addEventListener('resize', resize);

  spawnCharacter();
  scheduleNextSpawn();

  lastFrameTime = 0;
  animFrameId = requestAnimationFrame(animate);

  // Cleanup on page unload to prevent leaks
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animFrameId);
    clearTimeout(spawnTimer);
  });
}

init();
