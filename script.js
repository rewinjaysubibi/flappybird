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

let bird;
let pipes;
let score;
let best = Number(localStorage.getItem("flappyBest")) || 0;
let lastPipeTime = 0;
let gameOver = false;
let started = false;
let animationId = null;

bestEl.textContent = String(best);

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
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#6fd0ff");
  sky.addColorStop(0.7, "#b6ebff");
  sky.addColorStop(1, "#d9f7ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(75, 80, 28, 0, Math.PI * 2);
  ctx.arc(98, 78, 22, 0, Math.PI * 2);
  ctx.arc(52, 84, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#d4b064";
  ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, GROUND_HEIGHT);
  ctx.fillStyle = "#8bcf54";
  ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, 18);
}

function drawPipes() {
  pipes.forEach((pipe) => {
    const bottomY = pipe.topHeight + PIPE_GAP;

    ctx.fillStyle = "#43b85a";
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, HEIGHT - GROUND_HEIGHT - bottomY);

    ctx.fillStyle = "#2e8e44";
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 18, PIPE_WIDTH + 8, 18);
    ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 18);
  });
}

function drawBird() {
  const tilt = Math.max(-0.6, Math.min(0.6, bird.velocity / 10));
  ctx.save();
  ctx.translate(bird.x, bird.y);
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

function draw() {
  drawBackground();
  drawPipes();
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
