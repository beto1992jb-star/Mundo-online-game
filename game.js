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
  attackRange: 3.5,
  attackSpeed: 500
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Giant Spider", hp: 60, exp: 40, zen: 25 },
  { type: 'dragon', name: "Budge Dragon", hp: 110, exp: 75, zen: 55 },
  { type: 'lich', name: "Lich", hp: 170, exp: 130, zen: 95 }
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
    showWebGLError();
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);
  scene.fog = new THREE.FogExp2(0x05040a, 0.015);

  const aspect = window.innerWidth / window.innerHeight;
  const d = 18;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(20, 22, 20);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0x554466, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.1);
  dirLight.position.set(25, 35, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);

  createLorenciaTerrain();

  player = new THREE.Group();
  playerMeshGroup = createDarkKnightModel();
  player.add(playerMeshGroup);
  
  const auraLight = new THREE.PointLight(0x00aaff, 1.5, 10);
  auraLight.position.set(0, 2, 0);
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

function showWebGLError() {
  const errorContainer = document.createElement('div');
  errorContainer.style.position = 'fixed';
  errorContainer.style.top = '0';
  errorContainer.style.left = '0';
  errorContainer.style.width = '100vw';
  errorContainer.style.height = '100vh';
  errorContainer.style.backgroundColor = '#0c0d12';
  errorContainer.style.color = '#ff5555';
  errorContainer.style.display = 'flex';
  errorContainer.style.flexDirection = 'column';
  errorContainer.style.justifyContent = 'center';
  errorContainer.style.alignItems = 'center';
  errorContainer.style.zIndex = '99999';
  errorContainer.style.fontFamily = 'Arial, sans-serif';
  errorContainer.style.textAlign = 'center';
  errorContainer.style.padding = '20px';

  errorContainer.innerHTML = `
    <h1 style="color: #ffd700; margin-bottom: 10px;">⚠️ WebGL No Disponible</h1>
    <p style="color: #e0e0e0; max-width: 600px; line-height: 1.5;">
      Tu navegador o tarjeta gráfica no tienen habilitada la aceleración 3D por hardware (WebGL).
    </p>
  `;

  document.body.appendChild(errorContainer);
}

// TEXTURA PROCEDURAL PARA EL PISO DE LORENCIA
function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1a17';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#0d0c0a';
  ctx.lineWidth = 4;

  for (let i = 0; i < 512; i += 64) {
    for (let j = 0; j < 512; j += 64) {
      ctx.strokeRect(i, j, 64, 64);
      ctx.fillStyle = Math.random() > 0.5 ? '#23201c' : '#191714';
      ctx.fillRect(i + 2, j + 2, 60, 60);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

function createLorenciaTerrain() {
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const stoneTex = createStoneTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const torchPositions = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.25, 3.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x221100, metalness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.75;
    
    const fireLight = new THREE.PointLight(0xff7700, 2.0, 16);
    fireLight.position.y = 3.6;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);

    torches.push(fireLight);
  });
}

// CABALLERO NEGRO DETALLADO (DARK KNIGHT)
function createDarkKnightModel() {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a2b4c, metalness: 0.8, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xda100, metalness: 0.9, roughness: 0.1 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  // Pechera estilizada
  const chestGeo = new THREE.ConeGeometry(0.7, 1.4, 6);
  const chest = new THREE.Mesh(chestGeo, armorMat);
  chest.rotation.x = Math.PI;
  chest.position.y = 1.4;
  group.add(chest);

  // Hombreras con pinchos
  const shoulderGeo = new THREE.ConeGeometry(0.4, 0.8, 5);
  const shoulderL = new THREE.Mesh(shoulderGeo, goldMat);
  shoulderL.position.set(-0.8, 1.8, 0);
  shoulderL.rotation.z = Math.PI / 3;

  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.8;
  shoulderR.rotation.z = -Math.PI / 3;
  group.add(shoulderL, shoulderR);

  // Casco con visera brillante
  const helmetGeo = new THREE.DodecahedronGeometry(0.4);
  const helmet = new THREE.Mesh(helmetGeo, armorMat);
  helmet.position.y = 2.3;

  const visorGeo = new THREE.BoxGeometry(0.35, 0.08, 0.2);
  const visor = new THREE.Mesh(visorGeo, glowMat);
  visor.position.set(0, 2.3, 0.3);

  group.add(helmet, visor);

  // Alas de Dragón estilo MU (Satan Wings)
  playerWings = new THREE.Group();
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.2, 1.5);
  wingShape.lineTo(2.2, 1.0);
  wingShape.lineTo(1.5, 0.2);
  wingShape.lineTo(2.0, -0.8);
  wingShape.lineTo(0.8, -0.3);
  wingShape.lineTo(0, 0);

  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide });

  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.2, 1.6, -0.3);
  wingL.rotation.y = Math.PI / 4;

  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.2, 1.6, -0.3);
  wingR.scale.x = -1;
  wingR.rotation.y = -Math.PI / 4;

  playerWings.add(wingL, wingR);
  group.add(playerWings);

  // Espada Legendaria
  playerSword = new THREE.Group();
  const bladeGeo = new THREE.ConeGeometry(0.12, 2.2, 4);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1, emissive: 0x0044aa });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 1.1;

  const hiltGeo = new THREE.BoxGeometry(0.6, 0.1, 0.15);
  const hilt = new THREE.Mesh(hiltGeo, goldMat);
  hilt.position.y = 0.1;

  playerSword.add(blade, hilt);
  playerSword.position.set(0.7, 1.2, 0.2);
  playerSword.rotation.x = Math.PI / 3;
  group.add(playerSword);

  return group;
}

// MONSTRUO: ARAÑA
function createSpiderModel() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xaa1100, roughness: 0.4 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  const bodyGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.6;
  group.add(body);

  const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.2, 0.7, 0.6);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeL, eyeR);

  return group;
}

// MONSTRUO: BUDGE DRAGON
function createDragonModel() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8800bb, roughness: 0.3 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x440066, side: THREE.DoubleSide });

  const bodyGeo = new THREE.ConeGeometry(0.8, 2.2, 5);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.rotation.x = Math.PI / 2.2;
  body.position.y = 1.1;
  group.add(body);

  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), wingMat);
  wingL.position.set(-1.0, 1.5, 0);
  wingL.rotation.y = Math.PI / 3;
  const wingR = wingL.clone();
  wingR.position.x = 1.0;
  wingR.rotation.y = -Math.PI / 3;
  group.add(wingL, wingR);

  return group;
}

// MONSTRUO: LICH
function createLichModel() {
  const group = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x053315, roughness: 0.6 });
  const staffOrbMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  const robeGeo = new THREE.CylinderGeometry(0.2, 0.9, 2.4, 7);
  const robe = new THREE.Mesh(robeGeo, robeMat);
  robe.position.y = 1.2;
  group.add(robe);

  const orbGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const orb = new THREE.Mesh(orbGeo, staffOrbMat);
  orb.position.set(-0.7, 2.7, 0.3);
  group.add(orb);

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
    const x = (Math.random() - 0.5) * 70;
    const z = (Math.random() - 0.5) * 70;
    if (Math.abs(x) > 8 || Math.abs(z) > 8) {
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
  const count = 12;
  const posArray = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 2.0;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.15, color: 0x00ffff });
  const pSystem = new THREE.Points(pGeo, pMat);
  pSystem.position.copy(position);
  pSystem.position.y += 1.2;

  scene.add(pSystem);
  particles.push({ mesh: pSystem, life: 1.0 });
}

function animate(time) {
  requestAnimationFrame(animate);
  time = time || performance.now();

  torches.forEach(t => {
    t.intensity = 1.6 + Math.sin(time * 0.01 + Math.random() * 0.2) * 0.4;
  });

  if (playerWings) {
    playerWings.children[0].rotation.y = (Math.PI / 4) + Math.sin(time * 0.006) * 0.15;
    playerWings.children[1].rotation.y = -(Math.PI / 4) - Math.sin(time * 0.006) * 0.15;
  }

  // Animación de partículas de golpe
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= 0.05;
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
      const moveSpeed = 0.20 + (playerStats.agi * 0.001);
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
      player.position.addScaledVector(dirToEnemy, 0.20);
      updateCamera();
    } else {
      if (time - lastAttackTime > Math.max(220, playerStats.attackSpeed - playerStats.agi * 3)) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  enemies.forEach((enemy, idx) => {
    enemy.rotation.y += 0.015;
    enemy.position.y = Math.sin(time * 0.004 + idx) * 0.12;
  });

  if (isAttacking) {
    playerSword.rotation.x += 0.35;
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
  const baseDamage = 25 + Math.floor(playerStats.str * 1.3);
  const actualDamage = baseDamage + Math.floor(Math.random() * 18) - 5;
  enemy.userData.hp -= actualDamage;

  showDamageText(actualDamage, enemy.position);
  createSlashEffect(enemy.position);

  enemy.traverse((child) => {
    if (child.isMesh && child.material.color) {
      const originalColor = child.material.color.getHex();
      child.material.color.setHex(0xffffff);
      setTimeout(() => child.material.color.setHex(originalColor), 120);
    }
  });

  if (enemy.userData.hp <= 0) {
    gainExperience(enemy.userData.expReward);
    playerStats.zen += enemy.userData.zenReward;

    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;

    updateHUD();

    setTimeout(() => {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      spawnEnemy(x, z);
    }, 2000);
  }
}

function showDamageText(damage, position) {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.innerText = `-${damage}`;

  const vector = position.clone();
  vector.y += 2.2;
  vector.project(camera);

  const x = (vector.x * .5 + .5) * window.innerWidth;
  const y = (-(vector.y * .5) + .5) * window.innerHeight;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;

  document.body.appendChild(div);

  setTimeout(() => {
    if (div.parentNode) div.parentNode.removeChild(div);
  }, 750);
}

function gainExperience(amount) {
  playerStats.exp += amount;

  if (playerStats.exp >= playerStats.maxExp) {
    playerStats.level++;
    playerStats.points += 5;
    playerStats.exp -= playerStats.maxExp;
    playerStats.maxExp = Math.floor(playerStats.maxExp * 1.5);

    recalculateStats();
    playerStats.hp = playerStats.maxHp;
    playerStats.mp = playerStats.maxMp;

    showDamageText("LEVEL UP!", player.position);
  }

  updateHUD();
}

function updateHUD() {
  const levelEl = document.getElementById('player-level');
  if (levelEl) levelEl.innerText = playerStats.level;

  const zenEl = document.getElementById('player-zen');
  if (zenEl) zenEl.innerText = playerStats.zen;

  const gemsEl = document.getElementById('player-gems');
  if (gemsEl) gemsEl.innerText = playerStats.gems;

  const hpOrb = document.getElementById('hp-orb');
  if (hpOrb) {
    const hpPercent = Math.max(0, (playerStats.hp / playerStats.maxHp) * 100);
    hpOrb.style.height = `${hpPercent}%`;
    document.getElementById('hp-text').innerText = `${playerStats.hp}/${playerStats.maxHp}`;
  }

  const mpOrb = document.getElementById('mp-orb');
  if (mpOrb) {
    const mpPercent = Math.max(0, (playerStats.mp / playerStats.maxMp) * 100);
    mpOrb.style.height = `${mpPercent}%`;
    document.getElementById('mp-text').innerText = `${playerStats.mp}/${playerStats.maxMp}`;
  }

  const expFill = document.getElementById('exp-fill');
  if (expFill) {
    const expPercent = Math.min(100, (playerStats.exp / playerStats.maxExp) * 100);
    expFill.style.width = `${expPercent}%`;
  }

  const statPts = document.getElementById('stat-points');
  if (statPts) {
    statPts.innerText = playerStats.points;
    document.getElementById('stat-str').innerText = playerStats.str;
    document.getElementById('stat-agi').innerText = playerStats.agi;
    document.getElementById('stat-vit').innerText = playerStats.vit;
    document.getElementById('stat-ene').innerText = playerStats.ene;
  }
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
  const d = 18;
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
