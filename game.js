let scene, camera, renderer, player, playerMeshGroup, gltfLoader;
let targetPosition = null;
let targetEnemy = null;
let torches = [];
let particles = [];

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
  zen: 0,
  gems: 0,
  attackRange: 3.0,
  attackSpeed: 400
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Giant Spider", hp: 70, exp: 45, zen: 35, model: 'models/spider.gltf' },
  { type: 'dragon', name: "Budge Dragon", hp: 130, exp: 90, zen: 70, model: 'models/dragon.gltf' },
  { type: 'lich', name: "Lich", hp: 200, exp: 160, zen: 120, model: 'models/lich.gltf' }
];

function init() {
  if (renderer) return;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
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
  scene.background = new THREE.Color(0x010103);
  scene.fog = new THREE.FogExp2(0x010103, 0.022);

  const aspect = window.innerWidth / window.innerHeight;
  const d = 15;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(20, 22, 20);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffddaa, 1.5);
  dirLight.position.set(15, 25, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  gltfLoader = new THREE.GLTFLoader();

  createLorenciaMap();

  player = new THREE.Group();
  playerMeshGroup = new THREE.Group();
  player.add(playerMeshGroup);

  // Cargar modelo 3D del Jugador (.gltf)
  gltfLoader.load(
    'models/player.gltf',
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(1, 1, 1); // Ajusta la escala según tu archivo exportado
      playerMeshGroup.add(model);
    },
    undefined,
    (error) => {
      console.warn("No se encontró 'models/player.gltf'. Cargando modelo temporal.");
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 1),
        new THREE.MeshStandardMaterial({ color: 0x00aaff })
      );
      fallback.position.y = 1;
      playerMeshGroup.add(fallback);
    }
  );

  const auraLight = new THREE.PointLight(0x00aaff, 2.5, 10);
  auraLight.position.set(0, 1.5, 0);
  player.add(auraLight);

  player.position.set(0, 0, 0);
  scene.add(player);

  spawnEnemies(10);

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  recalculateStats();
  updateHUD();
  animate(performance.now());
}

function createLorenciaMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0d0a';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#050403';
  ctx.lineWidth = 8;

  for (let i = 0; i < 512; i += 64) {
    for (let j = 0; j < 512; j += 64) {
      ctx.strokeRect(i, j, 64, 64);
      ctx.fillStyle = (i + j) % 128 === 0 ? '#181410' : '#120f0c';
      ctx.fillRect(i + 4, j + 4, 56, 56);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);

  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const torchPositions = [[-12, -12], [12, -12], [-12, 12], [12, 12]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.18, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x0a0502 })
    );
    pole.position.y = 1.5;

    const fireLight = new THREE.PointLight(0xff5500, 3.0, 15);
    fireLight.position.y = 3.2;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);
    torches.push(fireLight);
  });
}

function spawnEnemy(x, z) {
  const enemyData = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  const enemyGroup = new THREE.Group();

  gltfLoader.load(
    enemyData.model,
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(1, 1, 1);
      enemyGroup.add(model);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(
        new THREE.SphereGeometry(0.8),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
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
    const x = (Math.random() - 0.5) * 55;
    const z = (Math.random() - 0.5) * 55;
    if (Math.abs(x) > 5 || Math.abs(z) > 5) {
      spawnEnemy(x, z);
    }
  }
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

    if (enemies.includes(clickedObj)) {
      targetEnemy = clickedObj;
      targetPosition = null;
      return;
    }

    if (clickedObj !== player && !enemies.includes(clickedObj)) {
      targetPosition = intersects[i].point;
      targetPosition.y = 0;
      targetEnemy = null;
      break;
    }
  }
}

function createSlashEffect(position) {
  const pGeo = new THREE.BufferGeometry();
  const count = 20;
  const posArray = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 2.5;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.25, color: 0x00ffff, blending: THREE.AdditiveBlending, transparent: true });
  const pSystem = new THREE.Points(pGeo, pMat);
  pSystem.position.copy(position);
  pSystem.position.y += 1.0;

  scene.add(pSystem);
  particles.push({ mesh: pSystem, life: 1.0 });
}

function animate(time) {
  requestAnimationFrame(animate);
  time = time || performance.now();

  torches.forEach(t => {
    t.intensity = 2.5 + Math.sin(time * 0.015 + Math.random() * 0.2) * 0.6;
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= 0.07;
    particles[i].mesh.scale.multiplyScalar(1.05);
    if (particles[i].life <= 0) {
      scene.remove(particles[i].mesh);
      particles.splice(i, 1);
    }
  }

  if (targetPosition) {
    const distance = player.position.distanceTo(targetPosition);
    if (distance > 0.2) {
      const direction = new THREE.Vector3().subVectors(targetPosition, player.position).normalize();
      const moveSpeed = 0.18 + (playerStats.agi * 0.001);
      player.position.addScaledVector(direction, moveSpeed);
      
      const angle = Math.atan2(direction.x, direction.z);
      playerMeshGroup.rotation.y = angle;

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

  if (isAttacking) {
    playerMeshGroup.rotation.y += 0.45;
    if (playerMeshGroup.rotation.y > Math.PI * 2) {
      isAttacking = false;
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function attackEnemy(enemy) {
  isAttacking = true;
  const baseDamage = 22 + Math.floor(playerStats.str * 1.3);
  const actualDamage = baseDamage + Math.floor(Math.random() * 18);
  enemy.userData.hp -= actualDamage;

  showDamageText(actualDamage, enemy.position);
  createSlashEffect(enemy.position);

  if (enemy.userData.hp <= 0) {
    gainExperience(enemy.userData.expReward);
    playerStats.zen += enemy.userData.zenReward;

    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;

    updateHUD();

    setTimeout(() => {
      const x = (Math.random() - 0.5) * 55;
      const z = (Math.random() - 0.5) * 55;
      spawnEnemy(x, z);
    }, 1800);
  }
}

function showDamageText(damage, position) {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.innerText = `-${damage}`;

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

    showDamageText("LEVEL UP!", player.position);
  }

  updateHUD();
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
