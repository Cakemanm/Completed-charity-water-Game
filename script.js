
// Difficulty modes 
const DIFFICULTIES = {
  easy: {
    label: 'easy',
    time: 40,
    winScore: 40,
    spawnMs: 1100,
    badChance: 0.20,
    lives: 3,
    desc: '40s · win at 40 pts · gentler drops'
  },
  normal: {
    label: 'normal',
    time: 30,
    winScore: 50,
    spawnMs: 1000,
    badChance: 0.30,
    lives: 3,
    desc: '30s · win at 50 pts · balanced pace'
  },
  hard: {
    label: 'hard',
    time: 22,
    winScore: 65,
    spawnMs: 750,
    badChance: 0.42,
    lives: 2,
    desc: '22s · win at 65 pts · fast & unforgiving'
  }
};

let currentDifficulty = 'normal';

// Milestones
const MILESTONES = [
  { score: 10, message: '💧 Nice! First 10 drops!' },
  { score: 25, message: '🚰 Halfway there!' },
  { score: 40, message: '🌊 Almost at the well!' },
  { score: 60, message: '🏆 Clean water hero pace!' }
];
let milestonesShown = new Set();

// Game state
let score = 0;
let timeLeft = 30;
let lives = 3;
let gameRunning = false;
let timerInterval = null;
let dropInterval = null;

// Elements
const arena        = document.getElementById('game-container');
const overlay       = document.getElementById('overlay');
const overlayBtn    = document.getElementById('overlay-btn');
const oTitle        = document.getElementById('overlay-title');
const oBody         = document.getElementById('overlay-body');
const scoreEl       = document.getElementById('score-val');
const timeEl        = document.getElementById('time-val');
const livesEl       = document.getElementById('lives-val');
const resetBtn      = document.getElementById('reset-btn');
const diffButtons   = document.querySelectorAll('.diff-btn');
const diffDesc      = document.getElementById('difficulty-desc');
const diffPicker    = document.getElementById('difficulty-picker');
const milestoneToast = document.getElementById('milestone-toast');

// Difficulty picker
diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentDifficulty = btn.dataset.diff;
    diffButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    diffDesc.textContent = DIFFICULTIES[currentDifficulty].desc;
    timeEl.textContent = DIFFICULTIES[currentDifficulty].time;
  });
});

// Sound effects
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', delay = 0, gainVal = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainVal;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + delay;
    osc.start(start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.stop(start + duration);
  } catch (e) { /* audio not available, fail silently */ }
}

function sfxCollect()  { playTone(880, 0.12, 'triangle'); }
function sfxMiss()     { playTone(160, 0.28, 'sawtooth', 0, 0.12); }
function sfxClick()    { playTone(500, 0.08, 'square', 0, 0.08); }
function sfxMilestone(){ playTone(660, 0.14, 'sine'); playTone(990, 0.16, 'sine', 0.12); }
function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.18, 'triangle', i * 0.12));
}
function sfxLose() {
  [400, 320, 240].forEach((f, i) => playTone(f, 0.22, 'sawtooth', i * 0.14, 0.1));
}

// Start
function startGame() {
  if (gameRunning) return;
  const cfg = DIFFICULTIES[currentDifficulty];
  score = 0;
  timeLeft = cfg.time;
  lives = cfg.lives;
  milestonesShown = new Set();
  updateHUD();
  overlay.classList.add('hidden');
  gameRunning = true;
  dropInterval  = setInterval(spawnDrop, cfg.spawnMs);
  timerInterval = setInterval(tick, 1000);
}

// Reset
function resetGame() {
  stopGame();
  document.querySelectorAll('.drop').forEach(d => d.remove());
  const cfg = DIFFICULTIES[currentDifficulty];
  score = 0; timeLeft = cfg.time; lives = cfg.lives;
  updateHUD();
  oTitle.textContent = '💧 Water Drop';
  oBody.innerHTML = 'Tap the <strong class="blue">blue drops</strong> to score points.<br>' +
    '<span class="orange">Orange drops</span> are dirty — tap them and lose a life!';
  overlayBtn.textContent = 'Start Game';
  diffPicker.style.display = 'flex';
  overlay.classList.remove('hidden');
}

function stopGame() {
  gameRunning = false;
  clearInterval(timerInterval);
  clearInterval(dropInterval);
}

// Timer
function tick() {
  timeLeft--;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}

// End game
function endGame() {
  stopGame();
  document.querySelectorAll('.drop').forEach(d => d.remove());
  const cfg = DIFFICULTIES[currentDifficulty];
  const win = score >= cfg.winScore;
  oTitle.textContent = win ? '🏆 You did it!' : '⏱ Time\'s up!';
  oBody.innerHTML = `Final score: <strong style="color:#FFC907;font-size:28px">${score}</strong> on <strong>${cfg.label}</strong><br>
    ${score < 10  ? 'Keep trying!' :
      score < cfg.winScore  ? 'Great effort!' : '💧 Clean water hero!'}`;
  overlayBtn.textContent = 'Play Again';
  diffPicker.style.display = 'flex';
  overlay.classList.remove('hidden');
  if (win) { fireConfetti(); sfxWin(); } else { sfxLose(); }
}

overlayBtn.addEventListener('click', () => { sfxClick(); startGame(); });
resetBtn.addEventListener('click', () => { sfxClick(); resetGame(); });

// Drop spawning
function spawnDrop() {
  if (!gameRunning) return;

  const cfg   = DIFFICULTIES[currentDifficulty];
  const isBad = Math.random() < cfg.badChance;
  const size  = 44 + Math.random() * 24;       // 44–68 px
  const speed = 2.5 + Math.random() * 2;       // 2.5–4.5 s
  const x     = Math.random() * (arena.offsetWidth - size - 10) + 5;

  const drop = document.createElement('div');
  drop.className = `drop ${isBad ? 'drop-bad' : 'drop-good'}`;
  drop.style.width  = size + 'px';
  drop.style.height = size + 'px';
  drop.style.left   = x + 'px';
  drop.style.animationDuration = speed + 's';

  drop.addEventListener('click', (e) => onDropClick(e, drop, isBad, size));
  drop.addEventListener('animationend', () => drop.remove());

  arena.appendChild(drop);
}

function onDropClick(e, drop, isBad, size) {
  if (!gameRunning) return;
  e.stopPropagation();

  // DOM element removal + a pop/splash element added in its place
  spawnPop(drop, isBad, size);
  drop.remove();

  if (isBad) {
    sfxMiss();
    loseLife();
  } else {
    sfxCollect();
    score++;
    updateHUD();
    checkMilestone();
  }
}

// Adds a short-lived "pop" element to the DOM at the tapped drop's location, then removes it once its animation finishes.
function spawnPop(drop, isBad, size) {
  const pop = document.createElement('div');
  pop.className = 'drop-pop';
  pop.style.width  = size + 'px';
  pop.style.height = size + 'px';
  pop.style.left   = drop.style.left;
  pop.style.top    = drop.style.top || getComputedStyle(drop).top;
  pop.style.background = isBad ? 'var(--orange)' : 'var(--blue)';
  arena.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}

function loseLife() {
  lives = Math.max(0, lives - 1);
  updateHUD();
  if (lives === 0) endGame();
}

// Milestones
function checkMilestone() {
  for (const m of MILESTONES) {
    if (score === m.score && !milestonesShown.has(m.score)) {
      milestonesShown.add(m.score);
      showMilestoneToast(m.message);
      sfxMilestone();
    }
  }
}

let toastTimeout = null;
function showMilestoneToast(message) {
  milestoneToast.textContent = message;
  milestoneToast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => milestoneToast.classList.remove('show'), 1600);
}

// HUD
function updateHUD() {
  scoreEl.textContent = score;
  timeEl.textContent  = timeLeft;
  livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, DIFFICULTIES[currentDifficulty].lives - lives));
}

// win celebration
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

// Initial HUD sync with default difficulty
timeEl.textContent = DIFFICULTIES[currentDifficulty].time;
livesEl.textContent = '♥'.repeat(DIFFICULTIES[currentDifficulty].lives);
