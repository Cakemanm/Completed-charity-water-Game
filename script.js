
// ── Game state ──────────────────────────────────────
let score = 0;
let timeLeft = 30;
let lives = 3;
let gameRunning = false;
let timerInterval = null;
let dropInterval = null;

// ── Elements ─────────────────────────────────────────
const arena      = document.getElementById('game-container');
const overlay    = document.getElementById('overlay');
const overlayBtn = document.getElementById('overlay-btn');
const oTitle     = document.getElementById('overlay-title');
const oBody      = document.getElementById('overlay-body');
const scoreEl    = document.getElementById('score-val');
const timeEl     = document.getElementById('time-val');
const livesEl    = document.getElementById('lives-val');
const resetBtn   = document.getElementById('reset-btn');

// ── Start ─────────────────────────────────────────────
function startGame() {
  if (gameRunning) return;
  score = 0; timeLeft = 30; lives = 3;
  updateHUD();
  overlay.classList.add('hidden');
  gameRunning = true;
  dropInterval  = setInterval(spawnDrop, 1000);
  timerInterval = setInterval(tick, 1000);
}

// ── Reset ─────────────────────────────────────────────
function resetGame() {
  stopGame();
  document.querySelectorAll('.drop').forEach(d => d.remove());
  score = 0; timeLeft = 30; lives = 3;
  updateHUD();
  oTitle.textContent = '💧 Water Drop';
  oBody.innerHTML = 'Tap the <strong class="blue">blue drops</strong> to score points.<br>' +
    '<span class="orange">Orange drops</span> are dirty — tap them and lose a life!';
  overlayBtn.textContent = 'Start Game';
  overlay.classList.remove('hidden');
}

function stopGame() {
  gameRunning = false;
  clearInterval(timerInterval);
  clearInterval(dropInterval);
}

// ── Timer ─────────────────────────────────────────────
function tick() {
  timeLeft--;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}

// ── End game ──────────────────────────────────────────
function endGame() {
  stopGame();
  document.querySelectorAll('.drop').forEach(d => d.remove());
  const win = score >= 50;
  oTitle.textContent = win ? '🏆 You did it!' : '⏱ Time\'s up!';
  oBody.innerHTML = `Final score: <strong style="color:#FFC907;font-size:28px">${score}</strong><br>
    ${score < 10  ? 'Keep trying!' :
      score < 50  ? 'Great effort!' : '💧 Clean water hero!'}`;
  overlayBtn.textContent = 'Play Again';
  overlay.classList.remove('hidden');
  if (win) fireConfetti();
}

overlayBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// ── Drop spawning ─────────────────────────────────────
function spawnDrop() {
  if (!gameRunning) return;

  const isBad = Math.random() < 0.3;
  const size  = 44 + Math.random() * 24;       // 44–68 px
  const speed = 2.5 + Math.random() * 2;       // 2.5–4.5 s
  const x     = Math.random() * (arena.offsetWidth - size - 10) + 5;

  const drop = document.createElement('div');
  drop.className = `drop ${isBad ? 'drop-bad' : 'drop-good'}`;
  drop.style.width  = size + 'px';
  drop.style.height = size + 'px';
  drop.style.left   = x + 'px';
  drop.style.animationDuration = speed + 's';

  drop.addEventListener('click', (e) => onDropClick(e, drop, isBad));
  drop.addEventListener('animationend', () => drop.remove());

  arena.appendChild(drop);
}

function onDropClick(e, drop, isBad) {
  if (!gameRunning) return;
  e.stopPropagation();
  drop.remove();

  if (isBad) {
    loseLife();
  } else {
    score++;
    updateHUD();
  }
}

function loseLife() {
  lives = Math.max(0, lives - 1);
  updateHUD();
  if (lives === 0) endGame();
}

// ── HUD ───────────────────────────────────────────────
function updateHUD() {
  scoreEl.textContent = score;
  timeEl.textContent  = timeLeft;
  livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
}

// ── Confetti (win celebration) ────────────────────────
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let animId    = null;

function fireConfetti() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  const colors = ['#FFC907', '#2E9DF7', '#4FCB53', '#F16061', '#8BD1CB', '#FF902A'];
  for (let i = 0; i < 160; i++) {
    particles.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height * .3 - canvas.height * .2,
      w:     7 + Math.random() * 8,
      h:     5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx:    (Math.random() - .5) * 6,
      vy:    2 + Math.random() * 4,
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - .5) * .15,
      alpha: 1
    });
  }
  if (animId) cancelAnimationFrame(animId);
  drawConfetti();
}

function drawConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let alive = false;
  particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += .12;
    p.rot += p.rotV;
    if (p.y > canvas.height * .7) p.alpha -= .025;
    if (p.alpha > 0) alive = true;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });
  if (alive) animId = requestAnimationFrame(drawConfetti);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});
