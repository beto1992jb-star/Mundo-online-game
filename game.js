let scene, camera, renderer, player, playerMeshGroup, playerSword, playerWings;
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
  attackRange: 3.2,
  attackSpeed: 450
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Giant Spider", hp: 60, exp: 40, zen: 30 },
  { type: 'dragon', name: "Budge Dragon", hp: 120, exp: 80, zen: 60 },
  { type: 'lich', name: "Lich", hp: 180, exp: 140, zen: 100 }
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
  scene.background = new THREE.Color(0x020204);
  scene.fog = new THREE.FogExp2(0x020204, 0.018);

  const aspect = window.innerWidth / window.innerHeight;
  const d = 16;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0x443355, 1.3);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(20, 30, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);

  createLorenciaTerrain();

  player = new THREE.Group();
  playerMeshGroup = createDarkKnightModel();
  player.add(playerMeshGroup);
  
  const auraLight = new THREE.PointLight(0x00ccff, 2.0, 8);
  auraLight.position.set(0, 2, 0);
  player.add(auraLight);

  player.position.set(0, 0, 0);
  scene.add(player);

  spawnEnemies(12);

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  recalculateStats();
  updateHUD();
  animate(performance.now());
}

// TEXTURA Y PISO DE LORENCIA ESTILO MU
function createLorenciaTerrain() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#14110e';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#080705';
  ctx.lineWidth = 6;

  for (let i = 0; i < 256; i += 32) {
    for (let j = 0; j < 256; j += 32) {
      ctx.strokeRect(i, j, 32, 32);
      if ((i + j) % 64 === 0) {
        ctx.fillStyle = '#1a1612';
        ctx.fillRect(i + 3, j + 3, 26, 26);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);

  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Antorchas
  const torchPositions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.2, 3, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x110b05 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.5;

    const fireLight = new THREE.PointLight(0xff6600, 2.5, 14);
    fireLight.position.y = 3.2;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);
    torches.push(fireLight);
  });
}

// DARK KNIGHT CON EFECTOS BRILLANTES (EXCELENT + BRILLO)
function createDarkKnightModel() {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({ 
    color: 0x0a2244, 
    metalness: 0.85, 
    roughness: 0.15,
    emissive: 0x001133
  });

  const goldMat = new THREE.MeshStandardMaterial({ 
    color: 0xffaa00, 
    metalness: 0.9, 
    roughness: 0.1 
  });

  // Pecho
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 1.2, 6), armorMat);
  chest.position.y = 1.3;
  group.add(chest);

  // Hombreras puntiagudas
  const shoulderL = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 5), goldMat);
  shoulderL.position.set(-0.75, 1.7, 0);
  shoulderL.rotation.z = Math.PI / 2.8;

  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.75;
  shoulderR.rotation.z = -Math.PI / 2.8;
  group.add(shoulderL, shoulderR);

  // Casco Dragon Helmet
  const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), armorMat);
  helmet.position.y = 2.1;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.15), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
  visor.position.set(0, 2.1, 0.25);
  group.add(helmet, visor);

  // Alas de Dragón Estilo MU (Dragon Wings)
  playerWings = new THREE.Group();
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.5, 1.8);
  wingShape.lineTo(2.5, 1.2);
  wingShape.lineTo(1.8, 0.2);
  wingShape.lineTo(2.2, -0.6);
  wingShape.lineTo(0, 0);

  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xff1100, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.1, 1.5, -0.2);
  wingL.rotation.y = Math.PI / 3.5;

  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.1, 1.5, -0.2);
  wingR.scale.x = -1;
  wingR.rotation.y = -Math.PI / 3.5;

  playerWings.add(wingL, wingR);
  group.add(playerWings);

  // Espada (Knight Blade / Archangel Sword)
  playerSword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05, emissive: 0x0066ff }));
  blade.position.y = 1.0;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.12), goldMat);
  hilt.position.y = 0.0;
  playerSword.add(blade, hilt);
  playerSword.position.set(0.65, 1.1, 0.1);
  playerSword.rotation.x = Math.PI / 3;
  group.add(playerSword);

  return group;
}

// MONSTRUOS
function createSpiderModel() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: 0xaa1100, roughness: 0.5 }));
  body.position.y = 0.5;
  group.add(body);
  return group;
}

function createDragonModel() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.0, 5), new THREE.MeshStandardMaterial({ color: 0x7700aa }));
  body.rotation.x = Math.PI / 2.3;
  body.position.y = 1.0;
  group.add(body);
  return group;
}

function createLichModel() {
  const group = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.8, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x004422 }));
  robe.position.y = 1.1;
  group.add(robe);
  return group;
}

function spawnEnemy(x, z) {
  const enemyData = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  let mesh;

  if (enemyData.type === 'spider') mesh = createSpiderModel();
  else if (enemyData.type === 'dragon') mesh = createDragonModel();
  else mesh = createLichModel();

  mesh.position.set(x, 0, z);
  mesh.userData = {
    id: Math.random(),
    name: enemyData.name,
    hp: enemyData.hp,
    maxHp: enemyData.hp,
    expReward: enemyData.exp,
    zenReward: enemyData.zen
  };

  scene.add(mesh);
  enemies.push(mesh);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    if (Math.abs(x) > 6 || Math.abs(z) > 6) {
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
  const count = 16;
  const posArray = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 2.2;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.2, color: 0x00ffff });
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
    t.intensity = 2.0 + Math.sin(time * 0.012 + Math.random() * 0.1) * 0.5;
  });

  if (playerWings) {
    playerWings.children[0].rotation.y = (Math.PI / 3.5) + Math.sin(time * 0.007) * 0.12;
    playerWings.children[1].rotation.y = -(Math.PI / 3.5) - Math.sin(time * 0.007) * 0.12;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= 0.06;
    particles[i].mesh.scale.multiplyScalar(1.04);
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
      if (time - lastAttackTime > Math.max(200, playerStats.attackSpeed - playerStats.agi * 2.5)) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  enemies.forEach((enemy, idx) => {
    enemy.rotation.y += 0.01;
    enemy.position.y = Math.sin(time * 0.005 + idx) * 0.08;
  });

  if (isAttacking) {
    playerSword.rotation.x += 0.4;
    if (playerSword.rotation.x > Math.PI) {
      playerSword.rotation.x = Math.PI / 3;
      isAttacking = false;
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function attackEnemy(enemy) {
  isAttacking = true;
  const baseDamage = 20 + Math.floor(playerStats.str * 1.2);
  const actualDamage = baseDamage + Math.floor(Math.random() * 15);
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
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      spawnEnemy(x, z);
    }, 2000);
  }
}

function showDamageText(damage, position) {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.innerText = `-${damage}`;

  const vector = position.clone();
  vector.y += 2.0;
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
    camera.position.x = player.position.x + 22;
    camera.position.z = player.position.z + 22;
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
  const d = 16;
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
