// ==========================================
// MUNDO ONLINE - Motor 3D MMORPG Ultra-Realista
// ==========================================

let scene, camera, renderer, player, playerMeshGroup;
let targetPosition = null;
let targetEnemy = null;
let torches = [];
let droppedItems = [];

// Partes visuales dinámicas del jugador
let playerVisualParts = {
  helmet: null,
  armor: null,
  boots: null,
  weapon: null,
  shield: null,
  wings: null
};

// Equipamiento real activado
let equippedItems = {
  helmet: null,
  armor: null,
  boots: null,
  weapon: null,
  shield: null,
  wings: null
};

let inventory = [
  { id: 'sword_1', name: 'Espada Dragon', slot: 'weapon', color: 0xdddddd },
  { id: 'shield_1', name: 'Escudo Legendario', slot: 'shield', color: 0xaa8800 }
];

let playerStats = {
  name: "DarkKnight",
  level: 1,
  points: 0,
  str: 25,
  agi: 20,
  vit: 25,
  ene: 10,
  hp: 175,
  maxHp: 175,
  mp: 60,
  maxMp: 60,
  exp: 0,
  maxExp: 100,
  zen: 0,
  gems: 0,
  attackRange: 2.8,
  attackSpeed: 600
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Spider", hp: 70, exp: 45, zen: 30, atk: 8, range: 2.2, speed: 1200 },
  { type: 'dragon', name: "Budge Dragon", hp: 130, exp: 85, zen: 60, atk: 15, range: 2.5, speed: 1000 },
  { type: 'lich', name: "Lich", hp: 200, exp: 150, zen: 110, atk: 24, range: 4.5, speed: 1400 }
];

const DROP_TABLE = [
  { id: 'helm_dk', name: 'Casco Dragon', slot: 'helmet', color: 0x153866 },
  { id: 'armor_dk', name: 'Pechera Dragon', slot: 'armor', color: 0x153866 },
  { id: 'boots_dk', name: 'Botas Dragon', slot: 'boots', color: 0x153866 },
  { id: 'wings_dk', name: 'Alas de Ángel', slot: 'wings', color: 0xffffff },
  { id: 'sword_dk', name: 'Espada Legendaria', slot: 'weapon', color: 0x00ccff },
  { id: 'shield_dk', name: 'Escudo Escarlata', slot: 'shield', color: 0xaa0000 }
];

// Generadores de Texturas Procedurales
function generateNoiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c221a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const val = Math.floor(Math.random() * 60);
    ctx.fillStyle = `rgb(${20 + val}, ${30 + val}, ${20 + val})`;
    ctx.fillRect(x, y, 2, 2);
  }
  return new THREE.CanvasTexture(canvas);
}

function generateMetalBumpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const val = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return new THREE.CanvasTexture(canvas);
}

const bumpTexture = generateMetalBumpTexture();
const terrainTexture = generateNoiseTexture();

function init() {
  if (renderer) return;

  // 1. Escena Realista
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020205);
  scene.fog = new THREE.FogExp2(0x020205, 0.015);

  // 2. Cámara Ortográfica Isométrica
  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  // 3. Renderizador con Sombras y Mapeo Tonal Avanzado
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  // 4. Luces Ambientales y Sol
  const ambientLight = new THREE.AmbientLight(0x334466, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
  dirLight.position.set(25, 40, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 150;
  const dArea = 40;
  dirLight.shadow.camera.left = -dArea;
  dirLight.shadow.camera.right = dArea;
  dirLight.shadow.camera.top = dArea;
  dirLight.shadow.camera.bottom = -dArea;
  scene.add(dirLight);

  // 5. Terreno
  createTerrain();

  // 6. Personaje Principal
  player = new THREE.Group();
  playerMeshGroup = createBasePlayerMesh();
  player.add(playerMeshGroup);

  const playerLight = new THREE.PointLight(0x00aaff, 1.2, 10);
  playerLight.position.set(0, 2.5, 0);
  player.add(playerLight);

  player.position.set(0, 0, 0);
  scene.add(player);

  // Equipar armas iniciales del inventario
  equipItem(inventory[0]);
  equipItem(inventory[1]);

  // 7. Generación de Monstruos
  spawnEnemies(8);

  // Eventos
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  recalculateStats();
  updateHUD();
  animate(performance.now());
}

// ----------------------------------------------------
// MODELADO DE PERSONAJE BASE Y EQUIPAMIENTO DINÁMICO
// ----------------------------------------------------

function createBasePlayerMesh() {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.6 });
  const underClothesMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8 });

  // Torso desnudo/ropa base
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.2, 12), underClothesMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Cabeza Base
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), skinMat);
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);

  // Brazos y Piernas Base
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.75), skinMat);
  armL.position.set(-0.55, 1.1, 0);
  armL.castShadow = true;
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.55;
  group.add(armR);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.9), underClothesMat);
  legL.position.set(-0.22, 0.45, 0);
  legL.castShadow = true;
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.22;
  group.add(legR);

  return group;
}

// Actualización visual en tiempo real de ítems en el modelo 3D
function updatePlayerVisuals() {
  // Limpiar partes actuales
  Object.keys(playerVisualParts).forEach(slot => {
    if (playerVisualParts[slot]) {
      playerMeshGroup.remove(playerVisualParts[slot]);
      playerVisualParts[slot] = null;
    }
  });

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x153866, metalness: 0.85, roughness: 0.25, bumpMap: bumpTexture, bumpScale: 0.02
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffb700, metalness: 0.9, roughness: 0.2, bumpMap: bumpTexture, bumpScale: 0.03
  });

  // CASCO
  if (equippedItems.helmet) {
    const helmetGroup = new THREE.Group();
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.55, 10), armorMat);
    helm.position.set(0, 2.22, 0);
    helm.castShadow = true;
    helmetGroup.add(helm);
    playerVisualParts.helmet = helmetGroup;
    playerMeshGroup.add(helmetGroup);
  }

  // PECHERA
  if (equippedItems.armor) {
    const armorGroup = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.55), armorMat);
    chest.position.set(0, 1.35, 0);
    chest.castShadow = true;

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), goldMat);
    shoulderL.position.set(-0.62, 1.6, 0);
    shoulderL.castShadow = true;
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.62;

    armorGroup.add(chest, shoulderL, shoulderR);
    playerVisualParts.armor = armorGroup;
    playerMeshGroup.add(armorGroup);
  }

  // BOTAS
  if (equippedItems.boots) {
    const bootsGroup = new THREE.Group();
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.35), armorMat);
    bootL.position.set(-0.22, 0.18, 0.05);
    bootL.castShadow = true;
    const bootR = bootL.clone();
    bootR.position.x = 0.22;

    bootsGroup.add(bootL, bootR);
    playerVisualParts.boots = bootsGroup;
    playerMeshGroup.add(bootsGroup);
  }

  // ARMA (Espada)
  if (equippedItems.weapon) {
    const weaponGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: equippedItems.weapon.color || 0xffffff, metalness: 0.9, roughness: 0.1
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.03), bladeMat);
    blade.position.y = 0.85;
    blade.castShadow = true;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.1), goldMat);
    hilt.position.y = 0.08;

    weaponGroup.add(blade, hilt);
    weaponGroup.position.set(0.6, 0.9, 0.2);
    weaponGroup.rotation.x = Math.PI / 3;
    playerVisualParts.weapon = weaponGroup;
    playerMeshGroup.add(weaponGroup);
  }

  // ESCUDO
  if (equippedItems.shield) {
    const shieldGroup = new THREE.Group();
    const shieldMat = new THREE.MeshStandardMaterial({
      color: equippedItems.shield.color || 0xaa0000, metalness: 0.8, roughness: 0.3
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.7), shieldMat);
    shield.position.set(-0.6, 1.1, 0.1);
    shield.castShadow = true;

    shieldGroup.add(shield);
    playerVisualParts.shield = shieldGroup;
    playerMeshGroup.add(shieldGroup);
  }

  // ALAS
  if (equippedItems.wings) {
    const wingsGroup = new THREE.Group();
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0x666666, side: THREE.DoubleSide, roughness: 0.2
    });
    const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), wingMat);
    wingL.position.set(-0.85, 1.6, -0.35);
    wingL.rotation.y = Math.PI / 4;
    const wingR = wingL.clone();
    wingR.position.x = 0.85;
    wingR.rotation.y = -Math.PI / 4;

    wingsGroup.add(wingL, wingR);
    playerVisualParts.wings = wingsGroup;
    playerMeshGroup.add(wingsGroup);
  }
}

// ----------------------------------------------------
// MONSTRUOS ULTRA-DETALLADOS
// ----------------------------------------------------

function createSpiderMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x220505, roughness: 0.4, bumpMap: bumpTexture, bumpScale: 0.05 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), mat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 12), mat);
  abdomen.position.set(0, 0.75, -1.0);
  abdomen.castShadow = true;
  group.add(abdomen);

  for (let i = 0; i < 8; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 1.4), mat);
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    leg.position.set(side * 0.65, 0.35, 0.3 - row * 0.32);
    leg.rotation.z = side * (Math.PI / 3.5);
    leg.castShadow = true;
    group.add(leg);
  }
  return group;
}

function createDragonMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x440055, roughness: 0.3, metalness: 0.2, bumpMap: bumpTexture, bumpScale: 0.08 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x220033, side: THREE.DoubleSide, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 10), mat);
  body.rotation.x = Math.PI / 2.2;
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.85), mat);
  head.position.set(0, 1.7, 0.85);
  head.castShadow = true;
  group.add(head);

  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1
