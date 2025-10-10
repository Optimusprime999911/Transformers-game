/* Full game script (with Home button handler implemented)
   - shop/upgrades/autobot selection
   - animated gameplay
   - mobile controls (touch + mouse)
   - pause/resume and returnToHome (clean cleanup)
*/

/***** STORAGE KEYS & DEFAULTS *****/
const STORAGE = {
  credits: "tf_credits",
  maxHP: "tf_maxHP",
  missileDamage: "tf_missileDamage",
  missileCap: "tf_missileCapacity",
  ownedAutobots: "tf_ownedAutobots",
  selectedAutobot: "tf_selectedAutobot"
};

const DEFAULTS = {
  credits: 0,
  maxHP: 100,
  missileDamage: 5,
  missileCap: 10,
  ownedAutobots: ["jazz"],
  selectedAutobot: "jazz"
};

/***** AUTOBOT SHOP ITEMS *****/
const AUTOBOTS = [
  { id: "jazz",  name: "Jazz",     img: "images/jazz.png",    cost: 0,    hpBonus: 0 },
  { id: "optimus", name: "Optimus", img: "images/optimus.png", cost: 300, hpBonus: 30 },
  { id: "ratchet", name: "Ratchet", img: "images/ratchet.png", cost: 150, hpBonus: 15 }
];

/***** ENEMY & BOSS IMAGES *****/
const ENEMY_IMAGES = [
  "images/frenzy.png",
  "images/starscream.png",
  "images/megatron.png",
  "images/soundwave.png",
  "images/barricade.png"
];

/***** UTIL *****/
const load = (k, fallback) => {
  const v = localStorage.getItem(k);
  return v === null ? fallback : JSON.parse(v);
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/***** PERSISTENT STATE *****/
let credits = load(STORAGE.credits, DEFAULTS.credits);
let playerMaxHP = load(STORAGE.maxHP, DEFAULTS.maxHP);
let missileDamage = load(STORAGE.missileDamage, DEFAULTS.missileDamage);
let missileCapacity = load(STORAGE.missileCap, DEFAULTS.missileCap);
let ownedAutobots = load(STORAGE.ownedAutobots, DEFAULTS.ownedAutobots);
let selectedAutobot = load(STORAGE.selectedAutobot, DEFAULTS.selectedAutobot);

/***** DOM REFS (simplified) *****/
const home = document.getElementById("home");
const playBtn = document.getElementById("playBtn");
const creditsDisplay = document.getElementById("creditsDisplay");
const statHP = document.getElementById("statHP");
const statDamage = document.getElementById("statDamage");
const statCapacity = document.getElementById("statCapacity");
const costHP = document.getElementById("costHP");
const costDamage = document.getElementById("costDamage");
const costCapacity = document.getElementById("costCapacity");
const buyHP = document.getElementById("buyHP");
const buyDamage = document.getElementById("buyDamage");
const buyCapacity = document.getElementById("buyCapacity");
const resetBtn = document.getElementById("resetUpgrades");
const autobotsRow = document.getElementById("autobotsRow");

const gameScreen = document.getElementById("gameScreen");
const playArea = document.getElementById("playArea");
const playerEl = document.getElementById("player");
const scoreEl = document.getElementById("score");
const hpEl = document.getElementById("playerHP");
const ammoEl = document.getElementById("ammo");
const creditsMini = document.getElementById("creditsMini");
const bossHPEl = document.getElementById("bossHP");
const gameOverMsg = document.getElementById("gameOver");
const levelWinMsg = document.getElementById("levelWin");
const pauseBtn = document.getElementById("pauseBtn");
const homeBtn = document.getElementById("homeBtn");

// mobile control buttons
const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const btnShoot = document.getElementById("btn-shoot");

/***** RUNTIME STATE *****/
let playerHP, playerX;
let score = 0;
let enemies = [];     // normal enemies + boss missiles stored here (DOM nodes)
let missiles = [];    // player missiles
let boss = null;
let bossHP = 150;
let bossActive = false;
let bossShootInterval = null;
let bossMoveInterval = null;
let spawnIntervalId = null;
let enemySpeed = 4;
let spawnInterval = 1000;
let ammo = 0;
let ammoRegenTimer = null;
let gameRunning = false;
let paused = false;

/***** MOBILE CONTROL FLAGS *****/
let movingLeft = false;
let movingRight = false;

/***** SHOP PRICES *****/
const PRICE_HP = 50;
const PRICE_DAMAGE = 75;
const PRICE_CAPACITY = 50;

/***** INIT UI *****/
function updateShopUI(){
  creditsDisplay.innerText = credits;
  statHP.innerText = playerMaxHP;
  statDamage.innerText = missileDamage;
  statCapacity.innerText = missileCapacity;
  costHP.innerText = PRICE_HP;
  costDamage.innerText = PRICE_DAMAGE;
  costCapacity.innerText = PRICE_CAPACITY;
  renderAutobotCards();
}
updateShopUI();

/***** AUTOBOT SHOP RENDER & ACTIONS *****/
function renderAutobotCards(){
  autobotsRow.innerHTML = "";
  AUTOBOTS.forEach(bot => {
    const card = document.createElement("div");
    card.className = "autobotCard" + (ownedAutobots.includes(bot.id) ? " autobotOwned" : "");
    card.innerHTML = `
      <img src="${bot.img}" alt="${bot.name}">
      <div><strong>${bot.name}</strong></div>
      <div>HP +${bot.hpBonus}</div>
      <div>Cost: ${bot.cost} credits</div>
    `;
    const btn = document.createElement("button");
    if (ownedAutobots.includes(bot.id)) {
      btn.textContent = selectedAutobot === bot.id ? "Selected" : "Select";
      btn.addEventListener("click", () => {
        selectedAutobot = bot.id;
        save(STORAGE.selectedAutobot, selectedAutobot);
        applySelectedAutobot();
        renderAutobotCards();
      });
    } else {
      btn.textContent = "Buy";
      btn.addEventListener("click", () => {
        if (credits >= bot.cost) {
          credits -= bot.cost;
          ownedAutobots.push(bot.id);
          save(STORAGE.ownedAutobots, ownedAutobots);
          save(STORAGE.credits, credits);
          // apply purchased autobot
          selectedAutobot = bot.id;
          save(STORAGE.selectedAutobot, selectedAutobot);
          applySelectedAutobot();
          updateShopUI();
        } else {
          alert("Not enough credits to buy " + bot.name);
        }
        renderAutobotCards();
      });
    }
    card.appendChild(btn);
    autobotsRow.appendChild(card);
  });
}

/***** SHOP UPGRADE BUTTONS *****/
buyHP.addEventListener("click", () => {
  if (credits >= PRICE_HP) {
    credits -= PRICE_HP;
    playerMaxHP += 20;
    save(STORAGE.maxHP, playerMaxHP);
    save(STORAGE.credits, credits);
    updateShopUI();
  } else alert("Not enough credits");
});
buyDamage.addEventListener("click", () => {
  if (credits >= PRICE_DAMAGE) {
    credits -= PRICE_DAMAGE;
    missileDamage += 5;
    save(STORAGE.missileDamage, missileDamage);
    save(STORAGE.credits, credits);
    updateShopUI();
  } else alert("Not enough credits");
});
buyCapacity.addEventListener("click", () => {
  if (credits >= PRICE_CAPACITY) {
    credits -= PRICE_CAPACITY;
    missileCapacity += 5;
    save(STORAGE.missileCap, missileCapacity);
    save(STORAGE.credits, credits);
    updateShopUI();
  } else alert("Not enough credits");
});
resetBtn.addEventListener("click", () => {
  if (!confirm("Reset upgrades & purchases?")) return;
  credits = DEFAULTS.credits;
  playerMaxHP = DEFAULTS.maxHP;
  missileDamage = DEFAULTS.missileDamage;
  missileCapacity = DEFAULTS.missileCap;
  ownedAutobots = DEFAULTS.ownedAutobots.slice();
  selectedAutobot = DEFAULTS.selectedAutobot;
  save(STORAGE.credits, credits);
  save(STORAGE.maxHP, playerMaxHP);
  save(STORAGE.missileDamage, missileDamage);
  save(STORAGE.missileCap, missileCapacity);
  save(STORAGE.ownedAutobots, ownedAutobots);
  save(STORAGE.selectedAutobot, selectedAutobot);
  updateShopUI();
});

/***** APPLY SELECTED AUTOBOT (update player sprite & HP bonus) *****/
function applySelectedAutobot(){
  const bot = AUTOBOTS.find(b => b.id === selectedAutobot) || AUTOBOTS[0];
  playerEl.style.backgroundImage = `url("${bot.img}")`;
  renderAutobotCards();
}
applySelectedAutobot();

/***** NAVIGATION: PLAY BUTTON *****/
playBtn.addEventListener("click", () => {
  home.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startGame();
});

/***** START / STOP GAME *****/
function startGame(){
  // runtime init
  playerHP = playerMaxHP + (AUTOBOTS.find(b=>b.id===selectedAutobot)?.hpBonus || 0);
  playerX = 310;
  playerEl.style.left = playerX + "px";
  score = 0;
  enemies = [];
  missiles = [];
  boss = null;
  bossHP = 150;
  bossActive = false;
  enemySpeed = 4;
  spawnInterval = 1000;
  ammo = missileCapacity;
  gameRunning = true;
  paused = false;
  updateHUD();

  // cleanup play area
  playArea.querySelectorAll(".enemy, .missile, .explosion, .boss, .boss-missile").forEach(n=>n.remove());

  // spawn loop & ammo regen
  spawnIntervalId = setInterval(spawnEnemy, spawnInterval);
  ammoRegenTimer = setInterval(()=>{ if(!gameRunning||paused) return; if(ammo<missileCapacity){ ammo++; updateHUD(); } }, 700);

  // RAF loop
  requestAnimationFrame(gameLoop);
}

function endGame(win=false){
  gameRunning = false;
  // clear intervals
  clearInterval(spawnIntervalId);
  clearInterval(bossShootInterval);
  clearInterval(bossMoveInterval);
  clearInterval(ammoRegenTimer);
  bossShootInterval = bossMoveInterval = spawnIntervalId = ammoRegenTimer = null;

  // award credits
  if (win) {
    credits += Math.max(50, Math.floor(score/2) + 100);
    levelWinMsg.classList.remove("hidden");
  } else {
    credits += Math.floor(score/4);
    gameOverMsg.classList.remove("hidden");
  }
  save(STORAGE.credits, credits);
  updateShopUI();
  creditsMini.innerText = credits;

  // listen for 'R' to return home
  document.addEventListener("keydown", waitReturn);
}

function waitReturn(e){
  if (e.key === "r" || e.key === "R") {
    document.removeEventListener("keydown", waitReturn);
    // cleanup and return home
    gameOverMsg.classList.add("hidden");
    levelWinMsg.classList.add("hidden");
    gameScreen.classList.add("hidden");
    home.classList.remove("hidden");
  }
}

/***** RETURN TO HOME (clean) *****/
function returnToHome(){
  // Confirm if a run is active
  if (gameRunning && !confirm("Return to Home? Current run will end.")) return;

  // stop game and timers
  gameRunning = false;
  paused = false;

  clearInterval(spawnIntervalId); spawnIntervalId = null;
  clearInterval(bossShootInterval); bossShootInterval = null;
  clearInterval(bossMoveInterval); bossMoveInterval = null;
  clearInterval(ammoRegenTimer); ammoRegenTimer = null;

  // remove on-screen dynamic elements
  playArea.querySelectorAll(".enemy, .missile, .explosion, .boss, .boss-missile").forEach(n => n.remove());
  enemies = [];
  missiles = [];
  boss = null;
  bossActive = false;

  // hide messages
  gameOverMsg.classList.add("hidden");
  levelWinMsg.classList.add("hidden");

  // show home and update UI
  gameScreen.classList.add("hidden");
  home.classList.remove("hidden");
  updateShopUI();

  // make sure Pause button text restored
  if (pauseBtn) pauseBtn.textContent = "Pause";
}

// Home button handler
if (homeBtn) {
  homeBtn.addEventListener("click", () => returnToHome());
}

/***** HUD update *****/
function updateHUD(){
  scoreEl.innerText = "Score: " + score;
  hpEl.innerText = "HP: " + playerHP + "/" + (playerMaxHP + (AUTOBOTS.find(b=>b.id===selectedAutobot)?.hpBonus || 0));
  ammoEl.innerText = "Ammo: " + ammo + "/" + missileCapacity;
  creditsMini.innerText = credits;
  if (bossActive) {
    bossHPEl.classList.remove("hidden");
    bossHPEl.innerText = "Boss HP: " + bossHP;
  } else bossHPEl.classList.add("hidden");
}

/***** INPUTS (keyboard and mobile) *****/
// Keyboard input
document.addEventListener("keydown", (ev) => {
  if (!gameRunning || paused) return;
  if (ev.code === "ArrowLeft") {
    playerX = Math.max(0, playerX - 30);
    playerEl.style.transform = "translateY(0) rotate(-2deg)";
    setTimeout(()=> playerEl.style.transform = "", 90);
    playerEl.style.left = playerX + "px";
  } else if (ev.code === "ArrowRight") {
    playerX = Math.min(700 - 100, playerX + 30);
    playerEl.style.transform = "translateY(0) rotate(2deg)";
    setTimeout(()=> playerEl.style.transform = "", 90);
    playerEl.style.left = playerX + "px";
  } else if (ev.code === "Space") {
    if (ammo > 0) { firePlayerMissile(); ammo--; updateHUD(); }
  }
});

// Mobile / on-screen control handlers
function setupMobileControls(){
  if (!btnLeft || !btnRight || !btnShoot) return;

  // prevent default page scroll when touching buttons
  [btnLeft, btnRight, btnShoot].forEach(b => {
    b.addEventListener('touchstart', e => e.preventDefault(), { passive:false });
  });

  // Left button
  btnLeft.addEventListener("touchstart", startMoveLeft, { passive:false });
  btnLeft.addEventListener("touchend", stopMoveLeft);
  btnLeft.addEventListener("mousedown", startMoveLeft);
  btnLeft.addEventListener("mouseup", stopMoveLeft);
  btnLeft.addEventListener("mouseleave", stopMoveLeft);
  btnLeft.addEventListener("click", ev => { ev.preventDefault(); });

  // Right button
  btnRight.addEventListener("touchstart", startMoveRight, { passive:false });
  btnRight.addEventListener("touchend", stopMoveRight);
  btnRight.addEventListener("mousedown", startMoveRight);
  btnRight.addEventListener("mouseup", stopMoveRight);
  btnRight.addEventListener("mouseleave", stopMoveRight);
  btnRight.addEventListener("click", ev => { ev.preventDefault(); });

  // Shoot button
  btnShoot.addEventListener("touchstart", ev => { ev.preventDefault(); doShoot(); }, { passive:false });
  btnShoot.addEventListener("mousedown", ev => { ev.preventDefault(); doShoot(); });
  btnShoot.addEventListener("click", ev => { ev.preventDefault(); doShoot(); });
}

// Movement handlers for mobile buttons
function startMoveLeft(e){ movingLeft = true; movingRight = false; }
function stopMoveLeft(e){ movingLeft = false; }
function startMoveRight(e){ movingRight = true; movingLeft = false; }
function stopMoveRight(e){ movingRight = false; }
function doShoot(){ if (!gameRunning || paused) return; if (ammo > 0){ firePlayerMissile(); ammo--; updateHUD(); } }

// initialize mobile control listeners
setupMobileControls();

/***** SPAWN ENEMY *****/
function spawnEnemy(){
  if (!gameRunning || paused || bossActive) return;
  const e = document.createElement("div");
  e.classList.add("enemy");
  e.style.left = Math.floor(Math.random()*8) * 85 + "px";
  e.style.top = "-120px";
  const img = ENEMY_IMAGES[Math.floor(Math.random()*ENEMY_IMAGES.length)];
  e.style.backgroundImage = `url(${img})`;
  playArea.appendChild(e);
  enemies.push(e);
}

/***** PLAYER MISSILE *****/
function firePlayerMissile(){
  const m = document.createElement("div");
  m.classList.add("missile");
  const x = playerX + 36;
  m.style.left = x + "px";
  m.style.top = (820 - 120) + "px";
  playArea.appendChild(m);
  missiles.push(m);
}

/***** BOSS: spawn, random target movement, shooting *****/
function spawnBoss(){
  bossActive = true;
  bossHP = 150;
  boss = document.createElement("div");
  boss.classList.add("boss");
  const initialLeft = Math.round((700/2 - 85));
  boss.style.left = initialLeft + "px";
  boss.style.top = "10px";
  playArea.appendChild(boss);

  // Random target pick & smooth ease movement via RAF
  let bx = initialLeft;
  let targetX = bx;
  const maxLeft = 0;
  const maxRight = 700 - 170;

  function pickTarget(){
    targetX = Math.floor(Math.random() * (maxRight - maxLeft + 1)) + maxLeft;
  }
  pickTarget();

  bossMoveInterval = setInterval(()=> {
    if (!gameRunning || paused || !boss) return;
    pickTarget();
  }, 500 + Math.floor(Math.random()*900)); // 500..1400ms

  function bossMoveRAF(){
    if (!gameRunning || paused || !boss) return;
    bx += (targetX - bx) * 0.08;
    const jitter = Math.sin(Date.now()/300) * 0.6;
    const displayedX = Math.min(maxRight, Math.max(maxLeft, bx + jitter));
    boss.style.left = Math.round(displayedX) + "px";
    requestAnimationFrame(bossMoveRAF);
  }
  bossMoveRAF();

  // boss shoots periodically
  bossShootInterval = setInterval(()=> {
    if (!gameRunning || paused || !boss) return;
    spawnBossMissile();
  }, 900);

  updateHUD();
}

function spawnBossMissile(){
  if (!boss) return;
  const bm = document.createElement("div");
  bm.classList.add("boss-missile");
  const bx = parseInt(boss.style.left);
  bm.style.left = (bx + 70) + "px";
  bm.style.top = "160px";
  bm.dataset.bossMissile = "1";
  playArea.appendChild(bm);
  enemies.push(bm);
}

/***** GAME LOOP: movement, collisions, explosions *****/
function gameLoop(){
  if (!gameRunning) return;
  if (paused) { requestAnimationFrame(gameLoop); return; }

  // If mobile flags are active, move player continuously
  if (movingLeft) {
    playerX = Math.max(0, playerX - 8);
    playerEl.style.left = playerX + "px";
  } else if (movingRight) {
    playerX = Math.min(700 - 100, playerX + 8);
    playerEl.style.left = playerX + "px";
  }

  // move normal enemies & boss-missiles
  for (let i = enemies.length -1; i >= 0; i--){
    const el = enemies[i];
    if (!el) { enemies.splice(i,1); continue; }

    // boss missile
    if (el.dataset && el.dataset.bossMissile === "1") {
      const top = parseFloat(el.style.top || 0);
      el.style.top = (top + 9) + "px";
      const ex = parseFloat(el.style.left), ey = parseFloat(el.style.top);
      if (rectsOverlap(ex, ey, 28, 48, playerX, 820 - 120, 100, 100)) {
        playerHP -= 20;
        el.remove(); enemies.splice(i,1);
        updateHUD();
        if (playerHP <= 0) { playerHP = 0; updateHUD(); endGame(false); return; }
        continue;
      }
      if (ey > 900) { el.remove(); enemies.splice(i,1); continue; }
      continue;
    }

    // normal enemy
    if (el.classList && el.classList.contains("enemy")) {
      const top = parseFloat(el.style.top || -120);
      el.style.top = (top + enemySpeed) + "px";
      const ex = parseFloat(el.style.left), ey = parseFloat(el.style.top);
      if (rectsOverlap(ex, ey, 80, 80, playerX, 820 - 120, 100, 100)) {
        playerHP -= 20;
        spawnExplosion(ex + 10, ey + 10);
        el.remove(); enemies.splice(i,1);
        updateHUD();
        if (playerHP <= 0) { playerHP = 0; updateHUD(); endGame(false); return; }
        continue;
      }
      if (ey > 900) { el.remove(); enemies.splice(i,1); score++; updateHUD();
        // difficulty increase
        if (score % 20 === 0 && score < 100) {
          enemySpeed += 1;
          if (spawnInterval > 300) {
            spawnInterval = Math.max(300, spawnInterval - 100);
            clearInterval(spawnIntervalId);
            spawnIntervalId = setInterval(spawnEnemy, spawnInterval);
          }
        }
        if (score >= 100 && !bossActive) {
          clearInterval(spawnIntervalId);
          spawnBoss();
        }
        continue;
      }
    }
  }

  // move player missiles & detect hits (boss first)
  for (let mi = missiles.length -1; mi >= 0; mi--){
    const m = missiles[mi];
    const top = parseFloat(m.style.top || 0);
    m.style.top = (top - 14) + "px";

    if (parseFloat(m.style.top) < -80) { m.remove(); missiles.splice(mi,1); continue; }

    // boss collision
    if (bossActive && boss) {
      const bx = parseFloat(boss.style.left), by = parseFloat(boss.style.top);
      if (rectsOverlap(parseFloat(m.style.left), parseFloat(m.style.top), 28, 48, bx, by, 170, 170)) {
        bossHP -= missileDamage;
        spawnHitEffect(parseFloat(m.style.left), parseFloat(m.style.top));
        m.remove(); missiles.splice(mi,1);
        if (bossHP <= 0) {
          if (boss) boss.remove();
          boss = null; bossActive = false;
          clearInterval(bossShootInterval); bossShootInterval = null;
          clearInterval(bossMoveInterval); bossMoveInterval = null;
          for (let k = enemies.length -1; k >= 0; k--) {
            if (enemies[k] && enemies[k].dataset && enemies[k].dataset.bossMissile === "1") {
              enemies[k].remove(); enemies.splice(k,1);
            }
          }
          score += 50;
          credits += 200;
          save(STORAGE.credits, credits);
          updateHUD();
          endGame(true);
          return;
        } else { updateHUD(); continue; }
      }
    }

    // normal enemy collision
    for (let ei = enemies.length -1; ei >= 0; ei--) {
      const en = enemies[ei];
      if (!en || !en.classList) continue;
      if (!en.classList.contains("enemy")) continue;
      if (rectsOverlap(parseFloat(m.style.left), parseFloat(m.style.top), 28, 48,
                       parseFloat(en.style.left), parseFloat(en.style.top), 80, 80)) {
        spawnExplosion(parseFloat(en.style.left)+5, parseFloat(en.style.top)+5);
        m.remove(); missiles.splice(mi,1);
        en.remove(); enemies.splice(ei,1);
        score++;
        updateHUD();
        break;
      }
    }
  }

  updateHUD();
  requestAnimationFrame(gameLoop);
}

/***** Helper: small hit effect & explosion *****/
function spawnHitEffect(x,y){
  const ring = document.createElement("div");
  ring.className = "explosion";
  ring.style.left = (x - 10) + "px";
  ring.style.top = (y - 30) + "px";
  playArea.appendChild(ring);
  setTimeout(()=> ring.remove(), 520);
}
function spawnExplosion(x,y){
  const ex = document.createElement("div");
  ex.className = "explosion";
  ex.style.left = (x - 10) + "px";
  ex.style.top = (y - 10) + "px";
  playArea.appendChild(ex);
  setTimeout(()=> ex.remove(), 520);
}

/***** RECT OVERLAP HELPER *****/
function rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
  return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
}

/***** PAUSE / RESUME *****/
pauseBtn.addEventListener("click", () => {
  if (!gameRunning) return;
  togglePause();
});
function togglePause(){
  if (!paused) {
    paused = true;
    clearInterval(spawnIntervalId); spawnIntervalId = null;
    clearInterval(bossShootInterval); bossShootInterval = null;
    clearInterval(bossMoveInterval); bossMoveInterval = null;
    clearInterval(ammoRegenTimer); ammoRegenTimer = null;
    let overlay = document.getElementById("pauseOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "pauseOverlay";
      overlay.innerText = "PAUSED";
      playArea.appendChild(overlay);
    }
    overlay.classList.add("pause-visible");
    pauseBtn.textContent = "Resume";
  } else {
    paused = false;
    spawnIntervalId = setInterval(spawnEnemy, spawnInterval);
    if (bossActive && boss) {
      bossShootInterval = setInterval(()=>{ if(!gameRunning||paused||!boss) return; spawnBossMissile(); }, 900);
      bossMoveInterval = setInterval(()=>{ /* kept to indicate movement timer exists */ }, 1000);
    }
    ammoRegenTimer = setInterval(()=>{ if(!gameRunning||paused) return; if(ammo<missileCapacity){ ammo++; updateHUD(); } }, 700);
    const overlay = document.getElementById("pauseOverlay");
    if (overlay) { overlay.classList.remove("pause-visible"); overlay.remove(); }
    pauseBtn.textContent = "Pause";
    requestAnimationFrame(gameLoop);
  }
}

/***** CLEANUP & RESTART (window/unload) *****/
window.addEventListener("beforeunload", ()=> {
  save(STORAGE.credits, credits);
  save(STORAGE.maxHP, playerMaxHP);
  save(STORAGE.missileDamage, missileDamage);
  save(STORAGE.missileCap, missileCapacity);
  save(STORAGE.ownedAutobots, ownedAutobots);
  save(STORAGE.selectedAutobot, selectedAutobot);
});

/***** utility to apply selected autobot right away (if user changed in home) *****/
function applySelectedAutobot() {
  const bot = AUTOBOTS.find(b=>b.id===selectedAutobot) || AUTOBOTS[0];
  playerEl.style.backgroundImage = `url("${bot.img}")`;
}
applySelectedAutobot();

/***** Start UI values *****/
updateShopUI();
