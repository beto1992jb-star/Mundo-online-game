// ==========================================
// MUNDO ONLINE - Motor 3D estilo MU Online (Mejorado)
// ==========================================

let scene, camera, renderer, player, playerMeshGroup, playerSword;
let targetPosition = null;
let targetEnemy = null;
let torches = [];

let playerStats = {
  name: "DarkKnight",
  level: 1,
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  exp: 0,
  maxExp: 100,
  zen: 0,
  gems: 0,
  attackRange: 3.2,
  damage: 30,
  attackSpeed: 600
};

let lastAttackTime = 0;
let isAttacking = false;
let enemies = [];

const ENEMY_TYPES = [
  { type: 'spider', name: "Spider", hp: 60, exp: 40, zen: 25 },
  { type: 'dragon', name: "Budge Dragon", hp: 100, exp: 70, zen: 50 },
  { type: 'lich', name: "Lich", hp: 150, exp: 120, zen: 90 }
];

function init() {
  if (renderer) return;

  // 1. Escena gótica
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);
  scene.fog = new THREE.FogExp2(0x05040a, 0.018);

  // 2. Cámara Isométrica Estilo MU
  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  // 3. Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // 4. Luces
  const ambientLight = new THREE.AmbientLight(0x403550, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffdfa0, 0.8);
  dirLight.position.set(20, 30, 10);
  scene.add(dirLight);

  // 5. Escenario (Piso de piedra con antorchas)
  createTerrain();

  // 6. Crear Jugador (Guerrero Dark Knight)
  player = new THREE.Group();
  playerMeshGroup = createDarkKnightMesh();
  player.add(playerMeshGroup);
  
  const playerLight = new THREE.PointLight(0x00aaff, 1.2, 10);
  playerLight.position.set(0, 3, 0);
  player.add(playerLight);

  player.position.set(0, 0, 0);
  scene.add(player);

  // 7. Generar Enemigos
  spawnEnemies(8);

  // Eventos
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  updateHUD();
  animate(performance.now());
}

// ----------------------------------------------------
// FABRICA DE MODELOS LOW-POLY DETALLADOS
// ----------------------------------------------------

function createDarkKnightMesh() {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshPhongMaterial({ color: 0x113366, shininess: 90 });
  const goldMat = new THREE.MeshPhongMaterial({ color: 0xffb700, shininess: 100 });
  const skinMat = new THREE.MeshPhongMaterial({ color: 0xd2b48c });
  const capeMat = new THREE.MeshPhongMaterial({ color: 0x880000, side: THREE.DoubleSide });

  // Torso / Cota de Malla
  const torso = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 6), armorMat);
  torso.rotation.x = Math.PI;
  torso.position.y = 1.3;
  group.add(torso);

  // Pechera Dorada
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.5), goldMat);
  chest.position.set(0, 1.45, 0.1);
  group.add(chest);

  // Cabeza y Casco
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), skinMat);
  head.position.y = 2.2;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 6), armorMat);
  helmet.position.set(0, 2.4, 0);
  group.add(helmet);

  // Hombreras
  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), goldMat);
  shoulderL.position.set(-0.7, 1.7, 0);
  group.add(shoulderL);

  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.7;
  group.add(shoulderR);

  // Brazos
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), armorMat);
  armL.position.set(-0.65, 1.2, 0);
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.65;
  group.add(armR);

  // Piernas
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.0), armorMat);
  legL.position.set(-0.3, 0.5, 0);
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.3;
  group.add(legR);

  // Capa
  const capeGeo = new THREE.PlaneGeometry(1.0, 1.6);
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.position.set(0, 1.2, -0.35);
  cape.rotation.x = 0.15;
  group.add(cape);

  // Espada
  playerSword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.05), new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 100 }));
  blade.position.y = 0.8;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.1), goldMat);
  hilt.position.y = 0.1;
  playerSword.add(blade, hilt);
  playerSword.position.set(0.65, 1.0, 0.3);
  playerSword.rotation.x = Math.PI / 3;
  group.add(playerSword);

  return group;
}

function createSpiderMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color: 0xa31313, shininess: 40 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  // Cuerpo y Abdomen
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat);
  body.position.y = 0.5;
  group.add(body);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), mat);
  abdomen.position.set(0, 0.7, -0.9);
  group.add(abdomen);

  // Ojos
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), eyeMat);
  eyeL.position.set(-0.2, 0.65, 0.45);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeL, eyeR);

  // Patas (8)
  for (let i = 0; i < 8; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), mat);
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    
    leg.position.set(side * 0.6, 0.3, 0.3 - row * 0.3);
    leg.rotation.z = side * (Math.PI / 4);
    leg.rotation.x = (row - 1.5) * 0.2;
    group.add(leg);
  }

  return group;
}

function createDragonMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color: 0x8800aa, shininess: 60 });
  const wingMat = new THREE.MeshPhongMaterial({ color: 0x550066, side: THREE.DoubleSide });

  // Cuerpo
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 6), mat);
  body.rotation.x = Math.PI / 2.5;
  body.position.y = 0.9;
  group.add(body);

  // Cabeza con cuernos
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), mat);
  head.position.set(0, 1.5, 0.7);
  group.rotation.x = 0.1;
  group.add(head);

  // Alas
  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), wingMat);
  wingL.position.set(-0.8, 1.2, -0.2);
  wingL.rotation.y = Math.PI / 4;
  const wingR = wingL.clone();
  wingR.position.x = 0.8;
  wingR.rotation.y = -Math.PI / 4;
  group.add(wingL, wingR);

  return group;
}

function createLichMesh() {
  const group = new THREE.Group();
  const robeMat = new THREE.MeshPhongMaterial({ color: 0x0f5e31 });
  const skullMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
  const staffMat = new THREE.MeshPhongMaterial({ color: 0x553311 });
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

  // Túnica
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 2.0, 8), robeMat);
  robe.position.y = 1.0;
  group.add(robe);

  // Calavera
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), skullMat);
  skull.position.y = 2.1;
  group.add(skull);

  // Bastón Mágico
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5), staffMat);
  staff.position.set(-0.6, 1.2, 0.2);
  
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), orbMat);
  orb.position.set(-0.6, 2.5, 0.2);
  group.add(staff, orb);

  return group;
}

// ----------------------------------------------------
// MAPA Y AMBIENTACIÓN
// ----------------------------------------------------

function createTerrain() {
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a1e1a, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(80, 40, 0x000000, 0x223322);
  grid.position.y = 0.02;
  scene.add(grid);

  // Agregar Antorchas en los bordes
  const torchPositions = [
    [-15, -15], [15, -15], [-15, 15], [15, 15]
  ];

  torchPositions.forEach(pos => {
    const torch = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3), new THREE.MeshPhongMaterial({ color: 0x442200 }));
    pole.position.y = 1.5;
    
    const fireLight = new THREE.PointLight(0xffaa00, 1.5, 12);
    fireLight.position.y = 3.1;

    torch.add(pole, fireLight);
    torch.position.set(pos[0], 0, pos[1]);
    scene.add(torch);

    torches.push(fireLight);
  });
}

// ----------------------------------------------------
// LÓGICA DE ENEMIGOS Y JUEGO
// ----------------------------------------------------

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
    baseY: mesh.position.y
  };

  scene.add(mesh);
  enemies.push(mesh);
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

// ----------------------------------------------------
// BUCLE DE ANIMACIÓN Y RENDERIZADO
// ----------------------------------------------------

function animate(time) {
  requestAnimationFrame(animate);
  time = time || performance.now();

  // Parpadeo de antorchas
  torches.forEach(t => {
    t.intensity = 1.2 + Math.sin(time * 0.01 + Math.random() * 0.2) * 0.3;
  });

  // Movimiento Jugador
  if (targetPosition) {
    const distance = player.position.distanceTo(targetPosition);
    if (distance > 0.2) {
      const direction = new THREE.Vector3().subVectors(targetPosition, player.position).normalize();
      player.position.addScaledVector(direction, 0.18);
      
      // Orientar personaje al caminar
      const angle = Math.atan2(direction.x, direction.z);
      playerMeshGroup.rotation.y = angle;

      updateCamera();
    } else {
      targetPosition = null;
    }
  }

  // Combate y Persecución
  if (targetEnemy) {
    const distanceToEnemy = player.position.distanceTo(targetEnemy.position);

    // Orientar personaje hacia el enemigo
    const dirToEnemy = new THREE.Vector3().subVectors(targetEnemy.position, player.position).normalize();
    playerMeshGroup.rotation.y = Math.atan2(dirToEnemy.x, dirToEnemy.z);

    if (distanceToEnemy > playerStats.attackRange) {
      player.position.addScaledVector(dirToEnemy, 0.18);
      updateCamera();
    } else {
      if (time - lastAttackTime > playerStats.attackSpeed) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  // Animación de balanceo/movimiento de enemigos
  enemies.forEach((enemy, idx) => {
    enemy.rotation.y += 0.01;
    enemy.position.y = Math.sin(time * 0.003 + idx) * 0.1;
  });

  // Animación de ataque (swing de espada)
  if (isAttacking) {
    playerSword.rotation.x += 0.2;
    if (playerSword.rotation.x > Math.PI) {
      playerSword.rotation.x = Math.PI / 3;
      isAttacking = false;
    }
  }

  renderer.render(scene, camera);
}

function attackEnemy(enemy) {
  isAttacking = true;
  const actualDamage = playerStats.damage + Math.floor(Math.random() * 12) - 5;
  enemy.userData.hp -= actualDamage;

  showDamageText(actualDamage, enemy.position);

  // Parpadeo rojo del enemigo al recibir daño
  enemy.traverse((child) => {
    if (child.isMesh) {
      const originalColor = child.material.color.getHex();
      child.material.color.setHex(0xff0000);
      setTimeout(() => child.material.color.setHex(originalColor), 100);
    }
  });

  // Muerte del enemigo
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
    }, 2500);
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
  }, 800);
}

function gainExperience(amount) {
  playerStats.exp += amount;

  if (playerStats.exp >= playerStats.maxExp) {
    playerStats.level++;
    playerStats.exp -= playerStats.maxExp;
    playerStats.maxExp = Math.floor(playerStats.maxExp * 1.6);
    playerStats.damage += 12;
    playerStats.maxHp += 20;
    playerStats.hp = playerStats.maxHp;

    alert(`¡LEVEL UP! Ahora eres Nivel ${playerStats.level} en Mundo Online.`);
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
}

function updateCamera() {
  // Lerp suave de cámara
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
