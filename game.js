// Configuración básica del juego estilo MMORPG
let scene, camera, renderer, player;
let targetPosition = null;
let targetEnemy = null;

// Datos del jugador
let playerStats = {
  name: "Héroe",
  level: 1,
  exp: 0,
  maxExp: 100,
  gems: 0,
  attackRange: 2.5,
  damage: 25,
  attackSpeed: 800 // ms entre ataques
};

let lastAttackTime = 0;
let enemies = [];

function init() {
  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f15);

  // 2. Cámara Isométrica
  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);

  // 3. Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // 4. Luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // 5. Terreno del mapa
  const floorGeometry = new THREE.PlaneGeometry(60, 60);
  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x2e3b23 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(60, 60, 0x000000, 0x444444);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // 6. Personaje (Héroe)
  const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
  const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x00aaff });
  player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.y = 1;
  scene.add(player);

  // 7. Generar Monstruos Iniciales
  spawnEnemies(5);

  // Eventos de usuario
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('pointerdown', onPointerDown, false);

  updateHUD();
  animate();
}

// Función para crear enemigos en el mapa
function spawnEnemy(x, z) {
  const enemyGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const enemyMaterial = new THREE.MeshPhongMaterial({ color: 0xff3333 });
  const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
  
  enemy.position.set(x, 0.6, z);
  enemy.userData = {
    id: Math.random(),
    name: "Spider",
    hp: 50,
    maxHp: 50,
    expReward: 35
  };

  scene.add(enemy);
  enemies.push(enemy);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;
    if (Math.abs(x) > 5 || Math.abs(z) > 5) {
      spawnEnemy(x, z);
    }
  }
}

function onPointerDown(event) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  for (let i = 0; i < intersects.length; i++) {
    const clickedObj = intersects[i].object;

    // Clic en un enemigo
    if (enemies.includes(clickedObj)) {
      targetEnemy = clickedObj;
      targetPosition = null;
      return;
    }

    // Clic en el terreno para moverse
    if (clickedObj !== player && !enemies.includes(clickedObj)) {
      targetPosition = intersects[i].point;
      targetPosition.y = 1;
      targetEnemy = null;
      break;
    }
  }
}

function animate(time) {
  requestAnimationFrame(animate);

  // Movimiento al punto marcado
  if (targetPosition) {
    const distance = player.position.distanceTo(targetPosition);
    if (distance > 0.1) {
      const direction = new THREE.Vector3().subVectors(targetPosition, player.position).normalize();
      player.position.addScaledVector(direction, 0.15);
      updateCamera();
    } else {
      targetPosition = null;
    }
  }

  // Interacción y combate con enemigos
  if (targetEnemy) {
    const distanceToEnemy = player.position.distanceTo(targetEnemy.position);

    if (distanceToEnemy > playerStats.attackRange) {
      const direction = new THREE.Vector3().subVectors(targetEnemy.position, player.position).normalize();
      player.position.addScaledVector(direction, 0.15);
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
  enemy.userData.hp -= playerStats.damage;
  
  enemy.material.color.setHex(0xffffff);
  setTimeout(() => {
    if (enemy.material) enemy.material.color.setHex(0xff3333);
  }, 100);

  if (enemy.userData.hp <= 0) {
    gainExperience(enemy.userData.expReward);
    
    scene.remove(enemy);
    enemies = enemies.filter(e => e !== enemy);
    targetEnemy = null;

    setTimeout(() => {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      spawnEnemy(x, z);
    }, 3000);
  }
}

function gainExperience(amount) {
  playerStats.exp += amount;

  if (playerStats.exp >= playerStats.maxExp) {
    playerStats.level++;
    playerStats.exp -= playerStats.maxExp;
    playerStats.maxExp = Math.floor(playerStats.maxExp * 1.5);
    playerStats.damage += 10;
    alert(`¡HAS SUBIDO AL NIVEL ${playerStats.level}! Daño aumentado.`);
  }

  updateHUD();
}

function updateHUD() {
  const levelElem = document.getElementById('player-level');
  const gemsElem = document.getElementById('player-gems');
  const expElem = document.getElementById('player-exp');

  if (levelElem) levelElem.innerText = playerStats.level;
  if (gemsElem) gemsElem.innerText = playerStats.gems;
  if (expElem) expElem.innerText = `${playerStats.exp} / ${playerStats.maxExp}`;
}

function updateCamera() {
  camera.position.x = player.position.x + 20;
  camera.position.z = player.position.z + 20;
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

window.onload = init;
