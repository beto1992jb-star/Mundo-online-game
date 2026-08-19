let scene, camera, renderer, player, playerMeshGroup, playerSword, playerWings;
let targetPosition = null;
let targetEnemy = null;
let torches = [];

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
  attackSpeed: 550
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Spider", hp: 60, exp: 40, zen: 25 },
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
    document.body.appendChild(renderer.domElement);
  } catch (e) {
    console.error("Error al inicializar WebGL:", e);
    showWebGLError();
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040308);
  scene.fog = new THREE.FogExp2(0x040308, 0.018);

  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0x403550, 0.9);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffdfa0, 0.9);
  dirLight.position.set(20, 30, 10);
  scene.add(dirLight);

  createTerrain();

  player = new THREE.Group();
  playerMeshGroup = createDarkKnightMesh();
  player.add(playerMeshGroup);
  
  const playerLight = new THREE.PointLight(0x00aaff, 1.2, 12);
  playerLight.position.set(0, 3, 0);
  player.add(playerLight);

  player.position.set(0, 0, 0);
  scene.add(player);

  spawnEnemies(8);

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

function createDarkKnightMesh() {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({ color: 0x153866, metalness: 0.8, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb700, metalness: 0.9, roughness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.3, 10), armorMat);
  torso.position.y = 1.3;
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.55), goldMat);
  chest.position.set(0, 1.45, 0.05);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), skinMat);
  head.position.y = 2.15;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 8), armorMat);
  helmet.position.set(0, 2.35, 0);
  group.add(helmet);

  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), goldMat);
  shoulderL.position.set(-0.72, 1.7, 0);
  group.add(shoulderL);

  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.72;
  group.add(shoulderR);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.8), armorMat);
  armL.position.set(-0.65, 1.15, 0);
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.65;
  group.add(armR);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 1.0), armorMat);
  legL.position.set(-0.28, 0.5, 0);
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.28;
  group.add(legR);

  playerWings = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444, side: THREE.DoubleSide });
  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), wingMat);
  wingL.position.set(-0.8, 1.7, -0.35);
  wingL.rotation.y = Math.PI / 5;
  
  const wingR = wingL.clone();
  wingR.position.x = 0.8;
  wingR.rotation.y = -Math.PI / 5;
  
  playerWings.add(wingL, wingR);
  group.add(playerWings);

  playerSword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.04), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 }));
  blade.position.y = 0.9;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.12), goldMat);
  hilt.position.y = 0.1;
  playerSword.add(blade, hilt);
  playerSword.position.set(0.65, 1.0, 0.3);
  playerSword.rotation.x = Math.PI / 3;
  group.add(playerSword);

  return group;
}

function createSpiderMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), mat);
  body.position.y = 0.55;
  group.add(body);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), mat);
  abdomen.position.set(0, 0.75, -1.0);
  group.add(abdomen);

  for (let i = 0; i < 8; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3), mat);
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    leg.position.set(side * 0.65, 0.35, 0.3 - row * 0.32);
    leg.rotation.z = side * (Math.PI / 3.8);
    group.add(leg);
  }

  return group;
}

function createDragonMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x770099, roughness: 0.3 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x440066, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.0, 8), mat);
  body.rotation.x = Math.PI / 2.3;
  body.position.y = 1.0;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.8), mat);
  head.position.set(0, 1.6, 0.8);
  group.add(head);

  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), wingMat);
  wingL.position.set(-0.9, 1.4, -0.1);
  wingL.rotation.y = Math.PI / 3.5;
  const wingR = wingL.clone();
  wingR.position.x = 0.9;
  wingR.rotation.y = -Math.PI / 3.5;
  group.add(wingL, wingR);

  return group;
}

function createLichMesh() {
  const group = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x0a4a25, roughness: 0.7 });
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2 });
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.85, 2.1, 10), robeMat);
  robe.position.y = 1.05;
  group.add(robe);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), skullMat);
  skull.position.y = 2.2;
  group.add(skull);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6), robeMat);
  staff.position.set(-0.65, 1.3, 0.2);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), orbMat);
  orb.position.set(-0.65, 2.6, 0.2);
  group.add(staff, orb);

  return group;
}

function createTerrain() {
  const floorGeo = new THREE.PlaneGeometry(90, 90);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x161a16, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(90, 45, 0x000000, 0x223322);
  grid.position.y = 0.02;
  scene.add(grid);

  const torchPositions = [[-18, -18], [18, -18], [-18, 18], [18, 18]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2), new THREE.MeshStandardMaterial({ color: 0x331100 }));
    pole.position.y = 1.6;
    
    const fireLight = new THREE.PointLight(0xffaa00, 1.6, 14);
    fireLight.position.y = 3.3;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);

    torches.push(fireLight);
  });
}

function spawnEnemy(x, z) {
  const enemyData = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  let mesh;

  if (enemyData.type === 'spider') mesh = createSpiderMesh();
  else if (enemyData.type === 'dragon') mesh = createDragonMesh();
  else mesh = createLichMesh();

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
    const x = (Math.random() - 0.5) * 65;
    const z = (Math.random() - 0.5) * 65;
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

function animate(time) {
  requestAnimationFrame(animate);
  time = time || performance.now();

  torches.forEach(t => {
    t.intensity = 1.3 + Math.sin(time * 0.01 + Math.random() * 0.2) * 0.3;
  });

  if (playerWings) {
    playerWings.children[0].rotation.y = (Math.PI / 5) + Math.sin(time * 0.005) * 0.1;
    playerWings.children[1].rotation.y = -(Math.PI / 5) - Math.sin(time * 0.005) * 0.1;
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
      if (time - lastAttackTime > Math.max(250, playerStats.attackSpeed - playerStats.agi * 3)) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  enemies.forEach((enemy, idx) => {
    enemy.rotation.y += 0.01;
    enemy.position.y = Math.sin(time * 0.003 + idx) * 0.1;
  });

  if (isAttacking) {
    playerSword.rotation.x += 0.25;
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
  const actualDamage = baseDamage + Math.floor(Math.random() * 15) - 5;
  enemy.userData.hp -= actualDamage;

  showDamageText(actualDamage, enemy.position);

  enemy.traverse((child) => {
    if (child.isMesh) {
      const originalColor = child.material.color.getHex();
      child.material.color.setHex(0xff0000);
      setTimeout(() => child.material.color.setHex(originalColor), 100);
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
      const x = (Math.random() - 0.5) * 65;
      const z = (Math.random() - 0.5) * 65;
      spawnEnemy(x, z);
    }, 2500);
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
  }, 800);
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
  const d = 20;
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
