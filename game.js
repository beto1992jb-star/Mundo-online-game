let scene, camera, renderer, player, playerMeshGroup, gltfLoader;
let targetPosition = null, targetEnemy = null;
let enemies = [], droppedItems = [];
let isHelperActive = false;
let helperInterval = null;

// CONFIGURACIÓN DE LAS 7 CLASES (SEASON 6)
const CLASSES = {
  DK: { name: "Dark Knight", str: 28, agi: 20, vit: 25, ene: 10, cmd: 0, pointsPerLvl: 5, color: 0x0055ff },
  DW: { name: "Dark Wizard", str: 18, agi: 18, vit: 15, ene: 30, cmd: 0, pointsPerLvl: 5, color: 0xffaa00 },
  FE: { name: "Fairy Elf", str: 22, agi: 25, vit: 20, ene: 15, cmd: 0, pointsPerLvl: 5, color: 0x00ff66 },
  MG: { name: "Magic Gladiator", str: 26, agi: 26, vit: 26, ene: 26, cmd: 0, pointsPerLvl: 7, color: 0xaa00ff },
  DL: { name: "Dark Lord", str: 26, agi: 20, vit: 20, ene: 15, cmd: 25, pointsPerLvl: 7, color: 0xffd700 },
  SU: { name: "Summoner", str: 21, agi: 21, vit: 18, ene: 23, cmd: 0, pointsPerLvl: 5, color: 0xff00aa },
  RF: { name: "Rage Fighter", str: 32, agi: 27, vit: 25, ene: 10, cmd: 0, pointsPerLvl: 7, color: 0xcc0000 }
};

// MAPAS Y ZONAS
const MAPS = {
  lorencia: { color: 0x110d08, fog: 0x0a0806 },
  noria: { color: 0x081c08, fog: 0x040e04 },
  devias: { color: 0xddeeff, fog: 0x99bbdd },
  atlans: { color: 0x002244, fog: 0x001122 },
  losttower: { color: 0x221100, fog: 0x110800 },
  tarkan: { color: 0x332211, fog: 0x1a1108 },
  icarus: { color: 0x112233, fog: 0x08111a },
  kanturu: { color: 0x222222, fog: 0x111111 },
  karutan: { color: 0x2b1d0c, fog: 0x140e05 }
};

let playerStats = {
  classKey: 'DK',
  level: 1,
  masterLevel: 0,
  masterPoints: 0,
  points: 0,
  str: 28, agi: 20, vit: 25, ene: 10, cmd: 0,
  hp: 110, maxHp: 110,
  mp: 40, maxMp: 40,
  exp: 0, maxExp: 100,
  zen: 1000000
};

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(MAPS.lorencia.color);
  scene.fog = new THREE.FogExp2(MAPS.lorencia.fog, 0.03);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-15 * aspect, 15 * aspect, 15, -15, 1, 1000);
  camera.position.set(20, 22, 20);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const dirLight = new THREE.DirectionalLight(0xffcc88, 1.5);
  dirLight.position.set(20, 30, 15);
  scene.add(ambientLight, dirLight);

  createMapFloor(MAPS.lorencia.color);

  player = new THREE.Group();
  playerMeshGroup = new THREE.Group();
  player.add(playerMeshGroup);

  createPlayerMesh(CLASSES.DK.color);
  scene.add(player);

  spawnEnemies(6);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointerdown', onPointerDown);

  recalculateStats();
  updateHUD();
  animate();
}

function createPlayerMesh(colorHex) {
  playerMeshGroup.clear();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.7, roughness: 0.3 })
  );
  mesh.position.y = 1;
  playerMeshGroup.add(mesh);
}

function createMapFloor(colorHex) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: colorHex })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}

function changeClass(key) {
  const c = CLASSES[key];
  playerStats.classKey = key;
  playerStats.str = c.str;
  playerStats.agi = c.agi;
  playerStats.vit = c.vit;
  playerStats.ene = c.ene;
  playerStats.cmd = c.cmd;
  
  document.getElementById('player-class-name').innerText = c.name;
  document.getElementById('cmd-row').style.display = (key === 'DL') ? 'flex' : 'none';
  createPlayerMesh(c.color);
  recalculateStats();
  updateHUD();
}

function changeMap(mapKey) {
  const m = MAPS[mapKey];
  scene.background.setHex(m.color);
  scene.fog.color.setHex(m.fog);
}

// BOT OFICIAL: MU HELPER
function toggleMuHelper() {
  isHelperActive = !isHelperActive;
  const btn = document.getElementById('helper-btn');
  if (isHelperActive) {
    btn.innerText = "🤖 MU Helper: ON";
    btn.style.color = "#00ff00";
    helperInterval = setInterval(runMuHelper, 800);
  } else {
    btn.innerText = "🤖 MU Helper: OFF";
    btn.style.color = "#ffd700";
    clearInterval(helperInterval);
  }
}

function runMuHelper() {
  if (enemies.length > 0) {
    targetEnemy = enemies[0];
    attackEnemy(targetEnemy);
  }
}

function combineChaos() {
  if (playerStats.zen >= 1000000) {
    playerStats.zen -= 1000000;
    const success = Math.random() <= 0.6;
    if (success) {
      showDamageText("¡Éxito! Alas S3 Creadas", player.position, "#00ff00");
    } else {
      showDamageText("Combinación Fallida", player.position, "#ff0000");
    }
    updateHUD();
  } else {
    showDamageText("Zen Insuficiente", player.position, "#ff0000");
  }
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const enemy = new THREE.Mesh(
      new THREE.SphereGeometry(0.8),
      new THREE.MeshStandardMaterial({ color: 0xaa0000 })
    );
    enemy.position.set((Math.random() - 0.5) * 40, 0.8, (Math.random() - 0.5) * 40);
    enemy.userData = { hp: 100, maxHp: 100, exp: 50, zen: 500 };
    scene.add(enemy);
    enemies.push(enemy);
  }
}

function attackEnemy(enemy) {
  const damage = 20 + Math.floor(playerStats.str * 1.5);
  enemy.userData.hp -= damage;
  showDamageText(`-${damage}`, enemy.position, "#ff2222");

  if (enemy.userData.hp <= 0) {
    gainExp(enemy.userData.exp);
    playerStats.zen += enemy.userData.zen;
    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;
    setTimeout(() => spawnEnemies(1), 3000);
  }
}

function gainExp(amount) {
  playerStats.exp += amount;
  if (playerStats.exp >= playerStats.maxExp) {
    playerStats.level++;
    playerStats.points += CLASSES[playerStats.classKey].pointsPerLvl;
    if (playerStats.level > 400) {
      playerStats.masterLevel++;
      playerStats.masterPoints++;
    }
    playerStats.exp = 0;
    playerStats.maxExp = Math.floor(playerStats.maxExp * 1.3);
    showDamageText("LEVEL UP!", player.position, "#ffd700");
  }
  recalculateStats();
  updateHUD();
}

function addStat(type) {
  if (playerStats.points <= 0) return;
  playerStats[type] += 5;
  playerStats.points -= 5;
  recalculateStats();
  updateHUD();
}

function addMasterPoint(branch) {
  if (playerStats.masterPoints > 0) {
    playerStats.masterPoints--;
    showDamageText(`Master ${branch.toUpperCase()} +1`, player.position, "#00e5ff");
    updateHUD();
  }
}

function recalculateStats() {
  playerStats.maxHp = 100 + (playerStats.vit * 3);
  playerStats.maxMp = 40 + (playerStats.ene * 2);
  playerStats.hp = Math.min(playerStats.hp, playerStats.maxHp);
  playerStats.mp = Math.min(playerStats.mp, playerStats.maxMp);
}

function updateHUD() {
  document.getElementById('player-level').innerText = playerStats.level;
  document.getElementById('player-zen').innerText = playerStats.zen;
  document.getElementById('stat-points').innerText = playerStats.points;
  document.getElementById('stat-str').innerText = playerStats.str;
  document.getElementById('stat-agi').innerText = playerStats.agi;
  document.getElementById('stat-vit').innerText = playerStats.vit;
  document.getElementById('stat-ene').innerText = playerStats.ene;
  if (document.getElementById('stat-cmd')) document.getElementById('stat-cmd').innerText = playerStats.cmd;
  if (document.getElementById('master-points')) document.getElementById('master-points').innerText = playerStats.masterPoints;

  document.getElementById('hp-orb').style.height = `${(playerStats.hp / playerStats.maxHp) * 100}%`;
  document.getElementById('hp-text').innerText = `${playerStats.hp}/${playerStats.maxHp}`;
  document.getElementById('mp-orb').style.height = `${(playerStats.mp / playerStats.maxMp) * 100}%`;
  document.getElementById('mp-text').innerText = `${playerStats.mp}/${playerStats.maxMp}`;
  document.getElementById('exp-fill').style.width = `${Math.min(100, (playerStats.exp / playerStats.maxExp) * 100)}%`;
}

function showDamageText(text, pos, color = "#ff2222") {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.style.color = color;
  div.innerText = text;

  const vector = pos.clone();
  vector.y += 2;
  vector.project(camera);

  div.style.left = `${(vector.x * .5 + .5) * window.innerWidth}px`;
  div.style.top = `${(-(vector.y * .5) + .5) * window.innerHeight}px`;
  document.body.appendChild(div);

  setTimeout(() => div.remove(), 600);
}

function onPointerDown(e) {
  if (e.target.tagName !== 'CANVAS') return;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(enemies);

  if (intersects.length > 0) {
    attackEnemy(intersects[0].object);
  }
}

function toggleWindow(id) {
  const win = document.getElementById(id);
  win.style.display = (win.style.display === 'block') ? 'none' : 'block';
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -15 * aspect;
  camera.right = 15 * aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

window.onload = init;
