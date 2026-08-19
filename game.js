let scene, camera, renderer, player, playerMeshGroup, gltfLoader;
let targetPosition = null;
let targetEnemy = null;
let torches = [];
let particles = [];
let droppedItems = [];
let npcs = [];

let playerStats = {
  name: "DarkKnight",
  level: 1,
  points: 0,
  str: 25,
  agi: 20,
  vit: 25,
  ene: 10,
  hp: 120,
  maxHp: 120,
  mp: 50,
  maxMp: 50,
  exp: 0,
  maxExp: 100,
  zen: 500,
  gems: 0,
  attackRange: 3.0,
  attackSpeed: 400
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Giant Spider", hp: 70, exp: 45, zen: 50, model: 'models/spider.gltf' },
  { type: 'dragon', name: "Budge Dragon", hp: 130, exp: 90, zen: 120, model: 'models/dragon.gltf' },
  { type: 'lich', name: "Lich", hp: 200, exp: 160, zen: 250, model: 'models/lich.gltf' }
];

function init() {
  if (renderer) return;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
  } catch (e) {
    console.error("Error al inicializar WebGL:", e);
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050403);
  scene.fog = new THREE.FogExp2(0x0a0806, 0.03);

  const aspect = window.innerWidth / window.innerHeight;
  const d = 15;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(20, 22, 20);
  camera.lookAt(0, 0, 0);

  // Iluminación isométrica de MU
  const ambientLight = new THREE.AmbientLight(0x4a3b2c, 0.9);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffcc88, 1.8);
  dirLight.position.set(20, 30, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);

  gltfLoader = new THREE.GLTFLoader();

  createLorenciaMap();
  spawnNPCs();

  player = new THREE.Group();
  playerMeshGroup = new THREE.Group();
  player.add(playerMeshGroup);

  // Cargar Modelo del Personaje
  gltfLoader.load(
    'models/player.gltf',
    (gltf) => {
      const model = gltf.scene;
      applyMuGlowStyle(model, 0x0022ff);
      playerMeshGroup.add(model);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.8, roughness: 0.2, emissive: 0x001144 })
      );
      fallback.position.y = 1;
      playerMeshGroup.add(fallback);
    }
  );

  player.position.set(0, 0, 0);
  scene.add(player);

  spawnEnemies(8);

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  recalculateStats();
  updateHUD();
  animate(performance.now());
}

// Aplica el destello de armadura +11 / Item Excelente de MU
function applyMuGlowStyle(model, emissiveHex = 0x001133) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.roughness = 0.2;
        child.material.metalness = 0.8;
        child.material.emissive = new THREE.Color(emissiveHex);
        child.material.emissiveIntensity = 0.5;
      }
    }
  });
}

function createLorenciaMap() {
  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x110d08, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Antorchas de la ciudad
  const torchPositions = [[-10, -10], [10, -10], [-10, 10], [10, 10]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.2, 3),
      new THREE.MeshStandardMaterial({ color: 0x221100 })
    );
    pole.position.y = 1.5;

    const fireLight = new THREE.PointLight(0xff6600, 3.0, 12);
    fireLight.position.y = 3.0;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);
    torches.push(fireLight);
  });
}

function spawnNPCs() {
  const barmaid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x004433 })
  );
  barmaid.position.set(4, 0.9, -4);
  barmaid.userData = { isNPC: true, name: "Lumen the Barmaid" };
  scene.add(barmaid);
  npcs.push(barmaid);
}

function spawnEnemy(x, z) {
  const enemyData = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  const enemyGroup = new THREE.Group();

  gltfLoader.load(
    enemyData.model,
    (gltf) => {
      const model = gltf.scene;
      applyMuGlowStyle(model, 0x330000);
      enemyGroup.add(model);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(
        new THREE.SphereGeometry(0.8),
        new THREE.MeshStandardMaterial({ color: 0xaa0000, metalness: 0.5 })
      );
      fallback.position.y = 0.8;
      enemyGroup.add(fallback);
    }
  );

  enemyGroup.position.set(x, 0, z);
  enemyGroup.userData = {
    id: Math.random(),
    name: enemyData.name,
    hp: enemyData.hp,
    maxHp: enemyData.hp,
    expReward: enemyData.exp,
    zenReward: enemyData.zen
  };

  scene.add(enemyGroup);
  enemies.push(enemyGroup);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    if (Math.abs(x) > 8 || Math.abs(z) > 8) {
      spawnEnemy(x, z);
    }
  }
}

// Dropear items/Zen al suelo con efecto resplandeciente
function dropItem(position, zenAmount) {
  const itemGeo = new THREE.BoxGeometry(0.4, 0.2, 0.4);
  const itemMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, 
    emissive: 0xffaa00, 
    emissiveIntensity: 0.8 
  });
  const itemMesh = new THREE.Mesh(itemGeo, itemMat);
  itemMesh.position.set(position.x, 0.2, position.z);
  itemMesh.userData = { isDrop: true, zen: zenAmount };

  scene.add(itemMesh);
  droppedItems.push(itemMesh);
}

function onPointerDown(event) {
  if (!renderer || event.target !== renderer.domElement) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (let i = 0; i < intersects.length; i++) {
    let clickedObj = intersects[i].object;

    while (clickedObj.parent && clickedObj.parent !== scene) {
      clickedObj = clickedObj.parent;
    }

    // Interacción con Monstruo
    if (enemies.includes(clickedObj)) {
      targetEnemy = clickedObj;
      targetPosition = null;
      return;
    }

    // Interacción con NPC (Tienda)
    if (npcs.includes(clickedObj)) {
      toggleWindow('shop-window');
      return;
    }

    // Recoger Drop del suelo
    if (droppedItems.includes(clickedObj)) {
      playerStats.zen += clickedObj.userData.zen;
      scene.remove(clickedObj);
      droppedItems = droppedItems.filter(item => item !== clickedObj);
      updateHUD();
      showDamageText(`+${clickedObj.userData.zen} Zen`, player.position, "#ffee55");
      return;
    }

    // Mover Personaje
    if (clickedObj !== player && !enemies.includes(clickedObj)) {
      targetPosition = intersects[i].point;
      targetPosition.y = 0;
      targetEnemy = null;
      break;
    }
  }
}

function attackEnemy(enemy) {
  isAttacking = true;
  const baseDamage = 25 + Math.floor(playerStats.str * 1.4);
  const actualDamage = baseDamage + Math.floor(Math.random() * 15);
  enemy.userData.hp -= actualDamage;

  showDamageText(`-${actualDamage}`, enemy.position, "#ff2222");

  if (enemy.userData.hp <= 0) {
    gainExperience(enemy.userData.expReward);
    dropItem(enemy.position, enemy.userData.zenReward);

    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;

    updateHUD();

    setTimeout(() => {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      spawnEnemy(x, z);
    }, 2000);
  }
}

function showDamageText(text, position, color = "#ff2222") {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.style.color = color;
  div.innerText = text;

  const vector = position.clone();
  vector.y += 1.8;
  vector.project(camera);

  const x = (vector.x * .5 + .5) * window.innerWidth;
  const y = (-(vector.y * .5) + .5) * window.innerHeight;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;

  document.body.appendChild(div);

  setTimeout(() => {
    if (div.parentNode) div.parentNode.removeChild(div);
  }, 600);
}

function buyItem(item, price) {
  if (playerStats.zen >= price) {
    playerStats.zen -= price;
    if (item === 'apple') playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + 50);
    if (item === 'mana') playerStats.mp = Math.min(playerStats.maxMp, playerStats.mp + 50);
    updateHUD();
    showDamageText("Comprado", player.position, "#00ffcc");
  } else {
    showDamageText("Zen insuficiente", player.position, "#ff0000");
  }
}

function gainExperience(amount) {
  playerStats.exp += amount;
  if (playerStats.exp >= playerStats.maxExp) {
    playerStats.level++;
    playerStats.points += 5;
    playerStats.exp -= playerStats.maxExp;
    playerStats.maxExp = Math.floor(playerStats.maxExp * 1.4);

    recalculateStats();
    playerStats.hp = playerStats.maxHp;
    playerStats.mp = playerStats.maxMp;

    showDamageText("LEVEL UP!", player.position, "#ffd700");
  }
  updateHUD();
}

function addStat(type) {
  if (playerStats.points <= 0) return;
  if (type === 'str') playerStats.str += 5;
  if (type === 'agi') playerStats.agi += 5;
  if (type === 'vit') playerStats.vit += 5;
  if (type === 'ene') playerStats.ene += 5;

  playerStats.points -= 5;
  recalculateStats();
  updateHUD();
}

function recalculateStats() {
  playerStats.maxHp = 100 + (playerStats.vit * 3);
  playerStats.maxMp = 40 + (playerStats.ene * 2);
  playerStats.hp = Math.min(playerStats.hp, playerStats.maxHp);
  playerStats.mp = Math.min(playerStats.mp, playerStats.maxMp);
}

function animate(time) {
  requestAnimationFrame(animate);
  time = time || performance.now();

  // Rotación suave del drop de Zen/Items
  droppedItems.forEach(item => {
    item.rotation.y += 0.03;
  });

  torches.forEach(t => {
    t.intensity = 2.5 + Math.sin(time * 0.015) * 0.5;
  });

  if (targetPosition) {
    const distance = player.position.distanceTo(targetPosition);
    if (distance > 0.2) {
      const direction = new THREE.Vector3().subVectors(targetPosition, player.position).normalize();
      const moveSpeed = 0.18 + (playerStats.agi * 0.001);
      player.position.addScaledVector(direction, moveSpeed);
      playerMeshGroup.rotation.y = Math.atan2(direction.x, direction.z);
      updateCamera();
    } else {
      targetPosition = null;
    }
  }

  if (targetEnemy) {
    const distanceToEnemy = player.position.distanceTo(targetEnemy.position);
    const dirToEnemy = new THREE.Vector3().subVectors(targetEnemy.position, player.position).normalize();
    playerMeshGroup.rotation.y = Math.atan2(dirToEnemy.x, dirToEnemy.z);

    if (distanceToEnemy > playerStats.attackRange) {
      player.position.addScaledVector(dirToEnemy, 0.18);
      updateCamera();
    } else {
      if (time - lastAttackTime > Math.max(180, playerStats.attackSpeed - playerStats.agi * 2.5)) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function updateHUD() {
  document.getElementById('player-level').innerText = playerStats.level;
  document.getElementById('player-zen').innerText = playerStats.zen;
  document.getElementById('player-gems').innerText = playerStats.gems;

  const hpPercent = Math.max(0, (playerStats.hp / playerStats.maxHp) * 100);
  document.getElementById('hp-orb').style.height = `${hpPercent}%`;
  document.getElementById('hp-text').innerText = `${playerStats.hp}/${playerStats.maxHp}`;

  const mpPercent = Math.max(0, (playerStats.mp / playerStats.maxMp) * 100);
  document.getElementById('mp-orb').style.height = `${mpPercent}%`;
  document.getElementById('mp-text').innerText = `${playerStats.mp}/${playerStats.maxMp}`;

  const expPercent = Math.min(100, (playerStats.exp / playerStats.maxExp) * 100);
  document.getElementById('exp-fill').style.width = `${expPercent}%`;

  document.getElementById('stat-points').innerText = playerStats.points;
  document.getElementById('stat-str').innerText = playerStats.str;
  document.getElementById('stat-agi').innerText = playerStats.agi;
  document.getElementById('stat-vit').innerText = playerStats.vit;
  document.getElementById('stat-ene').innerText = playerStats.ene;
}

function updateCamera() {
  if (camera && player) {
    camera.position.x = player.position.x + 20;
    camera.position.z = player.position.z + 20;
  }
}

function toggleWindow(id) {
  const win = document.getElementById(id);
  win.style.display = (win.style.display === 'block') ? 'none' : 'block';
}

function rewardAd(event) {
  if (event) event.stopPropagation();
  playerStats.gems += 10;
  updateHUD();
}

function onWindowResize() {
  if (!renderer || !camera) return;
  const aspect = window.innerWidth / window.innerHeight;
  const d = 15;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
