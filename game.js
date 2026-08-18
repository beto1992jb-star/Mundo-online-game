// ==========================================
// MUNDO ONLINE - Motor 3D MMORPG Estable y Optimizado
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

function init() {
  if (renderer) return;

  // 1. Escena 3D
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0d12);
  scene.fog = new THREE.FogExp2(0x0c0d12, 0.015);

  // 2. Cámara Ortográfica Isométrica
  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  // 3. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // 4. Luces de Ambientación
  const ambientLight = new THREE.AmbientLight(0x445577, 0.9);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.5);
  dirLight.position.set(25, 40, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
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

  // Equipar ítems iniciales
  equipItem(inventory[0]);
  equipItem(inventory[1]);

  // 7. Generar Monstruos
  spawnEnemies(8);

  // Eventos
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  recalculateStats();
  updateHUD();
  animate(performance.now());
}

function createBasePlayerMesh() {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.5 });
  const underClothesMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.2, 12), underClothesMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), skinMat);
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);

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

function updatePlayerVisuals() {
  Object.keys(playerVisualParts).forEach(slot => {
    if (playerVisualParts[slot]) {
      playerMeshGroup.remove(playerVisualParts[slot]);
      playerVisualParts[slot] = null;
    }
  });

  const armorMat = new THREE.MeshStandardMaterial({ color: 0x153866, metalness: 0.85, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb700, metalness: 0.9, roughness: 0.2 });

  if (equippedItems.helmet) {
    const helmetGroup = new THREE.Group();
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.55, 10), armorMat);
    helm.position.set(0, 2.22, 0);
    helm.castShadow = true;
    helmetGroup.add(helm);
    playerVisualParts.helmet = helmetGroup;
    playerMeshGroup.add(helmetGroup);
  }

  if (equippedItems.armor) {
    const armorGroup = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.55), armorMat);
    chest.position.set(0, 1.35, 0);
    chest.castShadow = true;

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), goldMat);
    shoulderL.position.set(-0.62, 1.6, 0);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.62;

    armorGroup.add(chest, shoulderL, shoulderR);
    playerVisualParts.armor = armorGroup;
    playerMeshGroup.add(armorGroup);
  }

  if (equippedItems.boots) {
    const bootsGroup = new THREE.Group();
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.35), armorMat);
    bootL.position.set(-0.22, 0.18, 0.05);
    const bootR = bootL.clone();
    bootR.position.x = 0.22;

    bootsGroup.add(bootL, bootR);
    playerVisualParts.boots = bootsGroup;
    playerMeshGroup.add(bootsGroup);
  }

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

  if (equippedItems.wings) {
    const wingsGroup = new THREE.Group();
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0x444444, side: THREE.DoubleSide, roughness: 0.2
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

function createSpiderMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x330505, roughness: 0.4 });

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
  const mat = new THREE.MeshStandardMaterial({ color: 0x550066, roughness: 0.3, metalness: 0.2 });
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

  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), wingMat);
  wingL.position.set(-1.0, 1.5, -0.1);
  wingL.rotation.y = Math.PI / 3;
  const wingR = wingL.clone();
  wingR.position.x = 1.0;
  wingR.rotation.y = -Math.PI / 3;
  group.add(wingL, wingR);

  return group;
}

function createLichMesh() {
  const group = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x052b15, roughness: 0.8 });
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2 });
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.85, 2.2, 12), robeMat);
  robe.position.y = 1.1;
  robe.castShadow = true;
  group.add(robe);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), skullMat);
  skull.position.y = 2.25;
  group.add(skull);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7), robeMat);
  staff.position.set(-0.65, 1.35, 0.2);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), orbMat);
  orb.position.set(-0.65, 2.7, 0.2);
  group.add(staff, orb);

  return group;
}

function createTerrain() {
  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2218, roughness: 0.9, metalness: 0.1 });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(120, 60, 0x000000, 0x223322);
  grid.position.y = 0.02;
  scene.add(grid);

  const torchPositions = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5), new THREE.MeshStandardMaterial({ color: 0x221100 }));
    pole.position.y = 1.75;

    const fireLight = new THREE.PointLight(0xffaa22, 2.0, 16);
    fireLight.position.y = 3.6;

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
    zenReward: enemyData.zen,
    atk: enemyData.atk,
    range: enemyData.range,
    attackSpeed: enemyData.speed,
    lastAttack: 0
  };

  scene.add(mesh);
  enemies.push(mesh);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 75;
    const z = (Math.random() - 0.5) * 75;
    if (Math.abs(x) > 10 || Math.abs(z) > 10) {
      spawnEnemy(x, z);
    }
  }
}

function dropItemAt(position) {
  const itemData = DROP_TABLE[Math.floor(Math.random() * DROP_TABLE.length)];

  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: itemData.color, emissive: 0x333333, metalness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
  mesh.position.y = 0.5;

  const light = new THREE.PointLight(0xffff00, 1.5, 4);
  light.position.y = 0.8;

  group.add(mesh, light);
  group.position.copy(position);
  group.userData = { item: itemData };

  scene.add(group);
  droppedItems.push(group);
}

function checkItemPickup() {
  droppedItems.forEach((dropGroup, idx) => {
    if (player.position.distanceTo(dropGroup.position) < 1.8) {
      inventory.push(dropGroup.userData.item);
      showDamageText(`+ ${dropGroup.userData.item.name}`, player.position, "#00ffcc");

      scene.remove(dropGroup);
      droppedItems.splice(idx, 1);
      updateInventoryUI();
    }
  });
}

function addStat(type) {
  if (playerStats.points <= 0) return;

  if (type === 'str') playerStats.str += 1;
  if (type === 'agi') playerStats.agi += 1;
  if (type === 'vit') playerStats.vit += 1;
  if (type === 'ene') playerStats.ene += 1;

  playerStats.points -= 1;
  recalculateStats();
  updateHUD();
}

function recalculateStats() {
  playerStats.maxHp = 100 + (playerStats.vit * 3);
  playerStats.maxMp = 40 + (playerStats.ene * 2);
  playerStats.hp = Math.min(playerStats.hp, playerStats.maxHp);
  playerStats.mp = Math.min(playerStats.mp, playerStats.maxMp);
}

function equipItem(item) {
  if (!item || !item.slot) return;
  
  if (equippedItems[item.slot]) {
    inventory.push(equippedItems[item.slot]);
  }
  
  equippedItems[item.slot] = item;
  inventory = inventory.filter(i => i !== item);

  updatePlayerVisuals();
  updateInventoryUI();
}

function unequipSlot(slot) {
  if (equippedItems[slot]) {
    inventory.push(equippedItems[slot]);
    equippedItems[slot] = null;
    updatePlayerVisuals();
    updateInventoryUI();
  }
}

function updateInventoryUI() {
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';

  inventory.forEach(item => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.innerText = item.name;
    el.onclick = () => equipItem(item);
    grid.appendChild(el);
  });

  Object.keys(equippedItems).forEach(slot => {
    const slotEl = document.getElementById(`slot-${slot}`);
    if (slotEl) {
      if (equippedItems[slot]) {
        slotEl.innerText = equippedItems[slot].name;
        slotEl.classList.add('equipped');
      } else {
        slotEl.innerText = `Sin ${slot.toUpperCase()}`;
        slotEl.classList.remove('equipped');
      }
    }
  });
}

function onPointerDown(event) {
  if (event.target !== renderer.domElement) return;

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
    t.intensity = 1.8 + Math.sin(time * 0.01 + Math.random() * 0.2) * 0.4;
  });

  droppedItems.forEach(d => {
    d.rotation.y += 0.02;
  });

  checkItemPickup();

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

  enemies.forEach((enemy) => {
    const distToPlayer = enemy.position.distanceTo(player.position);

    if (distToPlayer < 14) {
      const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
      enemy.rotation.y = Math.atan2(dir.x, dir.z);

      if (distToPlayer > enemy.userData.range) {
        enemy.position.addScaledVector(dir, 0.07);
      } else {
        if (time - enemy.userData.lastAttack > enemy.userData.attackSpeed) {
          enemy.userData.lastAttack = time;
          monsterAttackPlayer(enemy);
        }
      }
    } else {
      enemy.rotation.y += 0.005;
    }
  });

  if (isAttacking && playerVisualParts.weapon) {
    playerVisualParts.weapon.rotation.x += 0.3;
    if (playerVisualParts.weapon.rotation.x > Math.PI) {
      playerVisualParts.weapon.rotation.x = Math.PI / 3;
      isAttacking = false;
    }
  }

  renderer.render(scene, camera);
}

function monsterAttackPlayer(enemy) {
  const dmg = Math.max(1, enemy.userData.atk - Math.floor(playerStats.vit * 0.4));
  playerStats.hp = Math.max(0, playerStats.hp - dmg);

  showDamageText(`-${dmg}`, player.position, "#ff0000");
  updateHUD();

  if (playerStats.hp <= 0) {
    alert("¡Has sido derrotado! Reapareciendo...");
    playerStats.hp = playerStats.maxHp;
    player.position.set(0, 0, 0);
    targetEnemy = null;
    targetPosition = null;
    updateHUD();
  }
}

function attackEnemy(enemy) {
  isAttacking = true;
  const baseDamage = 18 + Math.floor(playerStats.str * 1.3);
  const actualDamage = baseDamage + Math.floor(Math.random() * 12) - 4;
  enemy.userData.hp -= actualDamage;

  showDamageText(`-${actualDamage}`, enemy.position, "#ffee00");

  enemy.traverse((child) => {
    if (child.isMesh && child.material) {
      const origColor = child.material.color.getHex();
      child.material.color.setHex(0xff0000);
      setTimeout(() => child.material.color.setHex(origColor), 100);
    }
  });

  if (enemy.userData.hp <= 0) {
    gainExperience(enemy.userData.expReward);
    playerStats.zen += enemy.userData.zenReward;

    if (Math.random() < 0.6) {
      dropItemAt(enemy.position);
    }

    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;

    updateHUD();

    setTimeout(() => {
      const x = (Math.random() - 0.5) * 75;
      const z = (Math.random() - 0.5) * 75;
      spawnEnemy(x, z);
    }, 3000);
  }
}

function showDamageText(text, position, color = "#ff3333") {
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.innerText = text;
  div.style.color = color;

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

    alert(`¡LEVEL UP! Nivel ${playerStats.level}. Tienes 5 puntos de atributos (Presiona C).`);
  }

  updateHUD();
}

function updateHUD() {
  document.getElementById('player-level').innerText = playerStats.level;
  document.getElementById('player-zen').innerText = playerStats.zen;
  document.getElementById('player-gems').innerText = playerStats.gems;

  const hpPercent = Math.max(0, (playerStats.hp / playerStats.maxHp) * 100);
  document.getElementById('hp-bar').style.width = `${hpPercent}%`;
  document.getElementById('hp-text').innerText = `${playerStats.hp} / ${playerStats.maxHp}`;

  const mpPercent = Math.max(0, (playerStats.mp / playerStats.maxMp) * 100);
  document.getElementById('mp-bar').style.width = `${mpPercent}%`;
  document.getElementById('mp-text').innerText = `${playerStats.mp} / ${playerStats.maxMp}`;

  const expPercent = Math.min(100, (playerStats.exp / playerStats.maxExp) * 100);
  document.getElementById('exp-bar').style.width = `${expPercent}%`;
  document.getElementById('exp-text').innerText = `${playerStats.exp} / ${playerStats.maxExp}`;

  document.getElementById('stat-points').innerText = playerStats.points;
  document.getElementById('stat-str').innerText = playerStats.str;
  document.getElementById('stat-agi').innerText = playerStats.agi;
  document.getElementById('stat-vit').innerText = playerStats.vit;
  document.getElementById('stat-ene').innerText = playerStats.ene;
}

function updateCamera() {
  camera.position.x = player.position.x + 22;
  camera.position.z = player.position.z + 22;
}

function onWindowResize() {
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
