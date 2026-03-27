const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");

const BASE_WIDTH = 420;
const BASE_HEIGHT = 640;
let WIDTH = BASE_WIDTH;
let HEIGHT = BASE_HEIGHT;
let GROUND_HEIGHT = 92;

const GRAVITY = 0.42;
const JUMP_FORCE = -7.4;
let PIPE_WIDTH = 68;
let PIPE_GAP = 168;
let PIPE_SPEED = 2.6;
const PIPE_INTERVAL = 1450;

const birdSprite = new Image();
let birdSpriteReady = false;
let birdSpriteProcessed = null;
birdSprite.src = "bird.jpg";
birdSprite.addEventListener("load", () => {
  const offscreen = document.createElement("canvas");
  offscreen.width = birdSprite.width;
  offscreen.height = birdSprite.height;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(birdSprite, 0, 0);

  // Make near-white JPG background transparent.
  const frame = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 235 && g > 235 && b > 235) {
      data[i + 3] = 0;
    }
  }
  offCtx.putImageData(frame, 0, 0);
  birdSpriteProcessed = offscreen;
  birdSpriteReady = true;
});

let bird;
let pipes;
let score;
let best = Number(localStorage.getItem("flappyBest")) || 0;
let lastPipeTime = 0;
let gameOver = false;
let started = false;
let animationId = null;
let nightTransition = 0;
let worldTime = 0;
let rainTransition = 0;
let lightningFlash = 0;
let nextLightningAt = 0;

bestEl.textContent = String(best);

function isDarkTheme() {
  return Math.floor(score / 10) >= 1;
}

function resizeGame() {
  const wrap = canvas.parentElement;
  const width = Math.floor(wrap.clientWidth);
  const height = Math.floor(wrap.clientHeight);
  if (!width || !height) {
    return;
  }

  WIDTH = width;
  HEIGHT = height;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const scale = WIDTH / BASE_WIDTH;
  GROUND_HEIGHT = Math.round(92 * scale);
  PIPE_WIDTH = Math.round(68 * scale);
  PIPE_GAP = Math.round(168 * scale);
  PIPE_SPEED = 2.6 * scale;
}

function resetGame() {
  bird = {
    x: WIDTH * 0.23,
    y: HEIGHT / 2,
    radius: Math.max(13, Math.round(16 * (WIDTH / BASE_WIDTH))),
    velocity: 0
  };
  pipes = [];
  score = 0;
  lastPipeTime = 0;
  gameOver = false;
  scoreEl.textContent = "0";
}

function showOverlay(title, subtitle, buttonLabel) {
  overlay.innerHTML = `
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <button id="startBtn" type="button">${buttonLabel}</button>
  `;
  overlay.classList.remove("hidden");
  document.getElementById("startBtn").addEventListener("click", startGame);
}

function spawnPipe() {
  const margin = 70;
  const maxTop = HEIGHT - GROUND_HEIGHT - PIPE_GAP - margin;
  const topHeight = margin + Math.random() * (maxTop - margin);

  pipes.push({
    x: WIDTH + 20,
    topHeight,
    scored: false
  });
}

function flap() {
  if (!started || gameOver) {
    return;
  }
  bird.velocity = JUMP_FORCE;
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return (dx * dx) + (dy * dy) < cr * cr;
}

function update(delta) {
  worldTime = delta * 0.001;
  bird.velocity += GRAVITY;
  bird.y += bird.velocity;

  if (bird.y + bird.radius >= HEIGHT - GROUND_HEIGHT) {
    bird.y = HEIGHT - GROUND_HEIGHT - bird.radius;
    gameOver = true;
  }
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }

  if (delta - lastPipeTime > PIPE_INTERVAL) {
    spawnPipe();
    lastPipeTime = delta;
  }

  for (let i = pipes.length - 1; i >= 0; i -= 1) {
    const pipe = pipes[i];
    pipe.x -= PIPE_SPEED;

    const bottomY = pipe.topHeight + PIPE_GAP;
    const hitTop = circleRectCollision(
      bird.x,
      bird.y,
      bird.radius,
      pipe.x,
      0,
      PIPE_WIDTH,
      pipe.topHeight
    );
    const hitBottom = circleRectCollision(
      bird.x,
      bird.y,
      bird.radius,
      pipe.x,
      bottomY,
      PIPE_WIDTH,
      HEIGHT - GROUND_HEIGHT - bottomY
    );
    if (hitTop || hitBottom) {
      gameOver = true;
    }

    if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.scored = true;
      score += 1;
      scoreEl.textContent = String(score);
    }

    if (pipe.x + PIPE_WIDTH < -30) {
      pipes.splice(i, 1);
    }
  }

  const targetNight = score >= 10 ? 1 : 0;
  nightTransition += (targetNight - nightTransition) * 0.04;

  const targetRain = score >= 30 ? 1 : 0;
  rainTransition += (targetRain - rainTransition) * 0.04;

  if (score >= 40) {
    if (!nextLightningAt) {
      nextLightningAt = worldTime + 1.4 + Math.random() * 2.2;
    }
    if (worldTime >= nextLightningAt) {
      lightningFlash = 1;
      nextLightningAt = worldTime + 1.2 + Math.random() * 2.8;
    }
  } else {
    nextLightningAt = 0;
  }
  lightningFlash *= 0.9;
}

function drawBackground() {
  const darkTheme = nightTransition > 0.5;
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (darkTheme) {
    sky.addColorStop(0, "#0f1830");
    sky.addColorStop(0.68, "#1f2f54");
    sky.addColorStop(1, "#2a3b64");
  } else {
    sky.addColorStop(0, "#6fd0ff");
    sky.addColorStop(0.7, "#b6ebff");
    sky.addColorStop(1, "#d9f7ff");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Clouds are visible in day and fade out at night.
  ctx.save();
  ctx.globalAlpha = 1 - nightTransition;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(75, 80, 28, 0, Math.PI * 2);
  ctx.arc(98, 78, 22, 0, Math.PI * 2);
  ctx.arc(52, 84, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const sunMoonX = WIDTH - 70;
  const skyTop = Math.max(48, HEIGHT * 0.12);
  const sunY = skyTop + (nightTransition * 72);
  const moonY = skyTop + ((1 - nightTransition) * -72);

  // Sun fades/slides down while moon fades/slides into place.
  ctx.save();
  ctx.globalAlpha = 1 - nightTransition;
  ctx.fillStyle = "#ffd95d";
  ctx.beginPath();
  ctx.arc(sunMoonX, sunY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = nightTransition;
  ctx.fillStyle = "#edf3ff";
  ctx.beginPath();
  ctx.arc(sunMoonX, moonY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(205, 219, 246, 0.65)";
  ctx.beginPath();
  ctx.arc(sunMoonX + 7, moonY - 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (nightTransition > 0.05) {
    ctx.save();
    ctx.globalAlpha = nightTransition * 0.9;
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    for (let i = 0; i < 26; i += 1) {
      const x = 14 + ((i * 33) % (WIDTH - 28));
      const y = 18 + ((i * 57) % (HEIGHT * 0.52));
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }
}

function drawGround() {
  const darkTheme = isDarkTheme();
  ctx.fillStyle = darkTheme ? "#5c4e39" : "#d4b064";
  ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, GROUND_HEIGHT);
  ctx.fillStyle = darkTheme ? "#4f8d3d" : "#8bcf54";
  ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, 18);

  const grassTop = HEIGHT - GROUND_HEIGHT + 18;
  const bladeCount = Math.floor(WIDTH / 12);
  for (let i = 0; i < bladeCount; i += 1) {
    const x = i * 12 + 5;
    const sway = Math.sin(worldTime * 4 + i * 0.5) * 2.5;
    const h = 12 + ((i * 7) % 11);
    ctx.strokeStyle = darkTheme ? "#3e7531" : "#59a843";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, grassTop + 2);
    ctx.lineTo(x + sway, grassTop - h);
    ctx.stroke();

    if (i % 9 === 0) {
      const flowerX = x + sway;
      const flowerY = grassTop - h - 2;
      ctx.fillStyle = darkTheme ? "#ffb0cf" : "#ff8dc1";
      ctx.beginPath();
      ctx.arc(flowerX - 2, flowerY, 2, 0, Math.PI * 2);
      ctx.arc(flowerX + 2, flowerY, 2, 0, Math.PI * 2);
      ctx.arc(flowerX, flowerY - 2, 2, 0, Math.PI * 2);
      ctx.arc(flowerX, flowerY + 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd54a";
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPipes() {
  const darkTheme = isDarkTheme();
  pipes.forEach((pipe) => {
    const bottomY = pipe.topHeight + PIPE_GAP;
    const pipeBody = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    if (darkTheme) {
      pipeBody.addColorStop(0, "#1f5f33");
      pipeBody.addColorStop(0.52, "#2d8e4a");
      pipeBody.addColorStop(1, "#19512b");
    } else {
      pipeBody.addColorStop(0, "#2f944d");
      pipeBody.addColorStop(0.52, "#50c36d");
      pipeBody.addColorStop(1, "#287f41");
    }

    ctx.fillStyle = pipeBody;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, HEIGHT - GROUND_HEIGHT - bottomY);

    // Pipe rims/caps
    const rim = ctx.createLinearGradient(pipe.x - 6, 0, pipe.x + PIPE_WIDTH + 6, 0);
    rim.addColorStop(0, darkTheme ? "#1a4f2a" : "#2a8a43");
    rim.addColorStop(0.5, darkTheme ? "#2f8b49" : "#61ca7e");
    rim.addColorStop(1, darkTheme ? "#184828" : "#2a8a43");
    ctx.fillStyle = rim;
    ctx.fillRect(pipe.x - 6, pipe.topHeight - 20, PIPE_WIDTH + 12, 20);
    ctx.fillRect(pipe.x - 6, bottomY, PIPE_WIDTH + 12, 20);

    // Vertical seam
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(pipe.x + PIPE_WIDTH * 0.24, 0, 3, pipe.topHeight);
    ctx.fillRect(pipe.x + PIPE_WIDTH * 0.24, bottomY, 3, HEIGHT - GROUND_HEIGHT - bottomY);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(pipe.x + PIPE_WIDTH * 0.74, 0, 3, pipe.topHeight);
    ctx.fillRect(pipe.x + PIPE_WIDTH * 0.74, bottomY, 3, HEIGHT - GROUND_HEIGHT - bottomY);
  });
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);

  if (birdSpriteReady) {
    const spriteWidth = bird.radius * 2.8;
    const spriteHeight = bird.radius * 2.2;
    const upAmount = Math.max(0, Math.min(1, -bird.velocity / 8));
    const downAmount = Math.max(0, Math.min(1, bird.velocity / 10));
    const bob = Math.sin(worldTime * 16) * (0.8 + upAmount * 1.2);
    const offsetY = (downAmount * 3.4) - (upAmount * 2.6) + bob;
    const stretchX = 1 + (upAmount * 0.07) - (downAmount * 0.04);
    const stretchY = 1 - (upAmount * 0.09) + (downAmount * 0.08);
    ctx.translate(0, offsetY);
    ctx.scale(stretchX, stretchY);
    // Mirror sprite so bird faces right.
    ctx.scale(-1, 1);
    ctx.drawImage(
      birdSpriteProcessed || birdSprite,
      -spriteWidth / 2,
      -spriteHeight / 2,
      spriteWidth,
      spriteHeight
    );
    ctx.restore();
    return;
  }

  const tilt = Math.max(-0.6, Math.min(0.6, bird.velocity / 10));
  ctx.rotate(tilt);

  ctx.fillStyle = "#ffd24d";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f29a38";
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(24, 4);
  ctx.lineTo(11, 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(5, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1b1b1b";
  ctx.beginPath();
  ctx.arc(7, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRain() {
  if (rainTransition < 0.02) {
    return;
  }

  const rainAreaHeight = HEIGHT - GROUND_HEIGHT - 6;
  const streakCount = Math.floor(WIDTH / 7);
  ctx.save();
  ctx.globalAlpha = 0.18 + rainTransition * 0.45;
  ctx.strokeStyle = "#d8ecff";
  ctx.lineWidth = 1.3;
  for (let i = 0; i < streakCount; i += 1) {
    const x = (i * 9 + ((worldTime * 280 + i * 21) % WIDTH)) % WIDTH;
    const y = (worldTime * 320 + i * 37) % rainAreaHeight;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 11);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLightning() {
  if (score < 40) {
    return;
  }

  const boltSeed = Math.floor(worldTime * 10) % 3;
  if (lightningFlash > 0.06) {
    const startX = WIDTH * (0.2 + boltSeed * 0.25);
    const endY = HEIGHT * 0.48;
    let x = startX;
    let y = 0;

    ctx.save();
    ctx.globalAlpha = lightningFlash;
    ctx.strokeStyle = "#f5fbff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#dff2ff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < endY) {
      x += (Math.random() - 0.5) * 16;
      y += 18 + Math.random() * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sky flash
    ctx.fillStyle = "rgba(220, 238, 255, 0.35)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT - GROUND_HEIGHT);
    ctx.restore();
  }
}

function draw() {
  drawBackground();
  drawPipes();
  drawRain();
  drawLightning();
  drawGround();
  drawBird();
}

function loop(timestamp) {
  if (!started) {
    return;
  }

  update(timestamp);
  draw();

  if (gameOver) {
    started = false;
    if (score > best) {
      best = score;
      localStorage.setItem("flappyBest", String(best));
      bestEl.textContent = String(best);
    }
    showOverlay("Game Over", `Score: ${score} - Best: ${best}`, "Play Again");
    return;
  }

  animationId = requestAnimationFrame(loop);
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  overlay.classList.add("hidden");
  resetGame();
  started = true;
  draw();
  animationId = requestAnimationFrame(loop);
}

function handleInput(event) {
  if (event.code === "Space") {
    event.preventDefault();
    if (!started) {
      startGame();
      return;
    }
  }
  flap();
}

document.addEventListener("keydown", handleInput);
canvas.addEventListener("pointerdown", () => {
  if (!started) {
    startGame();
    return;
  }
  flap();
});
startBtn.addEventListener("click", startGame);

resizeGame();
window.addEventListener("resize", () => {
  resizeGame();
  if (!started) {
    resetGame();
  }
  draw();
});

resetGame();
draw();
