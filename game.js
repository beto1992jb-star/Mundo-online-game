// ==========================================
// MUNDO ONLINE - Motor 3D estilo MU Online
// ==========================================

let scene, camera, renderer, player;
let targetPosition = null;
let targetEnemy = null;

// Stats del Jugador
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
  attackRange: 2.8,
  damage: 30,
  attackSpeed: 700 // ms entre ataques
};

let lastAttackTime = 0;
let enemies = [];

// Tipos de Monstruos estilo Lorencia / MU Online
const ENEMY_TYPES = [
  { name: "Spider", color: 0xcc2222, hp: 60, exp: 40, zen: 25, scale: 1.0 },
  { name: "Budge Dragon", color: 0xaa00aa, hp: 90, exp: 65, zen: 45, scale: 1.2 },
  { name: "Lich", color: 0x22aa55, hp: 130, exp: 100, zen: 80, scale: 1.4 }
];

function init() {
  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0812);
  scene.fog = new THREE.FogExp2(0x0a0812, 0.025);

  // 2. Cámara Isométrica Estilo MU
  const aspect = window.innerWidth / window.innerHeight;
  const d = 22;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(22, 24, 22);
  camera.lookAt(0, 0, 0);

  // 3. Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  // 4. Luces del mapa
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffd700, 0.9);
  dirLight.position.set(15, 25, 15);
  scene.add(dirLight);

  // Luz focal sobre el jugador
  const playerLight = new THREE.PointLight(0x00aaff, 1, 12);
  playerLight.position.set(0, 3, 0);
  scene.add(playerLight);

  // 5. Terreno (Piso de Lorencia)
  const floorGeometry = new THREE.PlaneGeometry(80, 80);
  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x1c2419 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(80, 40, 0x000000, 0x2a3525);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // 6. Personaje Principal (Dark Knight)
  const playerGroup = new THREE.Group();
  
  // Cuerpo del héroe
  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0088ff, shininess: 80 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 1;
  playerGroup.add(bodyMesh);

  // Hombreras de armadura
  const shoulderGeo = new THREE.BoxGeometry(1.4, 0.4, 0.6);
  const shoulderMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
  const shoulders = new THREE.Mesh(shoulderGeo, shoulderMat);
  shoulders.position.y = 1.7;
  playerGroup.add(shoulders);

  player = playerGroup;
  player.position.set(0, 0, 0);
  scene.add(player);

  player.add(playerLight);

  // 7. Generar Monstruos iniciales
  spawnEnemies(7);

  // Eventos de usuario
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  updateHUD();
  animate(performance.now());
}

function spawnEnemy(x, z) {
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  
  const enemyGeometry = new THREE.BoxGeometry(1.2 * type.scale, 1.2 * type.scale, 1.2 * type.scale);
  const enemyMaterial = new THREE.MeshPhongMaterial({ color: type.color });
  const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
  
  enemy.position.set(x, (1.2 * type.scale) / 2, z);
  enemy.userData = {
    id: Math.random(),
    name: type.name,
    hp: type.hp,
    maxHp: type.hp,
    expReward: type.exp,
    zenReward: type.zen
  };

  scene.add(enemy);
  enemies.push(enemy);
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

    // Clic en un enemigo
    if (enemies.includes(clickedObj)) {
      targetEnemy = clickedObj;
      targetPosition = null;
      return;
    }

    // Clic en el piso para mover al personaje
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

  // Movimiento
  if (targetPosition) {
    const distance = player.position.distanceTo(targetPosition);
    if (distance > 0.2) {
      const direction = new THREE.Vector3().subVectors(targetPosition, player.position).normalize();
      player.position.addScaledVector(direction, 0.16);
      updateCamera();
    } else {
      targetPosition = null;
    }
  }

  // Combate
  if (targetEnemy) {
    const distanceToEnemy = player.position.distanceTo(targetEnemy.position);

    if (distanceToEnemy > playerStats.attackRange) {
      const direction = new THREE.Vector3().subVectors(targetEnemy.position, player.position).normalize();
      player.position.addScaledVector(direction, 0.16);
      updateCamera();
    } else {
      if (time - lastAttackTime > playerStats.attackSpeed) {
        attackEnemy(targetEnemy);
        lastAttackTime = time;
      }
    }
  }

  renderer.render(scene, camera);
}

function attackEnemy(enemy) {
  const actualDamage = playerStats.damage + Math.floor(Math.random() * 10) - 5;
  enemy.userData.hp -= actualDamage;

  showDamageText(actualDamage, enemy.position);

  const origColor = enemy.material.color.getHex();
  enemy.material.color.setHex(0xffffff);
  setTimeout(() => {
    if (enemy.material) enemy.material.color.setHex(origColor);
  }, 90);

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
  vector.y += 1.5;
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
  camera.position.x = player.position.x + 22;
  camera.position.z = player.position.z + 22;
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const d = 22;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.top = d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
