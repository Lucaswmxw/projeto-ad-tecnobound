/**
 * VOIDBOUND: DERELICT
 * Main Game Controller, Renderer, Camera, Input & State Management
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.width = CONSTANTS.CANVAS_WIDTH;
    this.height = CONSTANTS.CANVAS_HEIGHT;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.currentSectorIndex = 0;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.dungeon = null;
    this.player = null;

    // Room transition state
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionDir = { dx: 0, dy: 0 };
    this.prevRoom = null;
    this.nextRoom = null;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Particles array
    this.particles = [];

    // Input state
    this.input = {
      keys: {},
      mouseX: this.width / 2,
      mouseY: this.height / 2,
      mouseDown: false,
      rightMouseDown: false
    };

    // Game state
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'LOADOUT', 'MUTAGEN_SELECT', 'GAME_OVER', 'VICTORY'
    this.lastTime = 0;

    // Active modal data
    this.activeMutation = null;

    // Stars background for Vacuum Sector
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 8 + 4,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    this.initInputs();
    this.initUI();
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Ensure sound context starts on first interaction
      if (window.soundEngine) window.soundEngine.ensureContext();

      // Shortcuts
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.toggleLoadout();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      this.input.mouseX = (e.clientX - rect.left) * scaleX;
      this.input.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (window.soundEngine) window.soundEngine.ensureContext();
      if (e.button === 0) {
        this.input.mouseDown = true;
      } else if (e.button === 2) {
        this.input.rightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.mouseDown = false;
      if (e.button === 2) this.input.rightMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  initUI() {
    // Start game button
    const btnStart = document.getElementById('btnStartGame');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.ensureContext();
        this.startNewRun();
      });
    }

    // Restart button on Game Over / Victory
    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.startNewRun();
      });
    }

    const btnRestartWin = document.getElementById('btnRestartWin');
    if (btnRestartWin) {
      btnRestartWin.addEventListener('click', () => {
        this.startNewRun();
      });
    }

    // Audio toggles
    const btnAudio = document.getElementById('btnToggleAudio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const active = window.soundEngine.toggleMusic();
        btnAudio.textContent = active ? '🔊 BGM: ON' : '🔇 BGM: OFF';
      });
    }

    const btnSfx = document.getElementById('btnToggleSfx');
    if (btnSfx) {
      btnSfx.addEventListener('click', () => {
        const active = window.soundEngine.toggleSfx();
        btnSfx.textContent = active ? '💥 SFX: ON' : '🔇 SFX: OFF';
      });
    }

    // Loadout button
    const btnLoadout = document.getElementById('btnOpenLoadout');
    if (btnLoadout) {
      btnLoadout.addEventListener('click', () => {
        this.toggleLoadout();
      });
    }

    const btnCloseLoadout = document.getElementById('btnCloseLoadout');
    if (btnCloseLoadout) {
      btnCloseLoadout.addEventListener('click', () => {
        this.toggleLoadout();
      });
    }

    // Resume button
    const btnResume = document.getElementById('btnResume');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.togglePause();
      });
    }
  }

  startNewRun() {
    this.currentSectorIndex = 0;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.player = new Player(this.width / 2, this.height / 2);
    this.loadSector(this.currentSectorIndex);

    // Hide modals
    document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hudOverlay').classList.remove('hidden');

    this.state = 'PLAYING';
    if (window.soundEngine) {
      window.soundEngine.setMusicTheme(this.sector.ambientMusic);
    }
  }

  loadSector(index) {
    this.currentSectorIndex = index;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.dungeon = new Dungeon(this.sector);
    this.particles = [];

    // Place player at center of start room
    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;

    // Reset oxygen to full upon entering a sector
    this.player.o2 = this.player.maxO2;

    if (window.soundEngine) {
      window.soundEngine.setMusicTheme(this.sector.ambientMusic);
    }

    this.updateSectorBanner();
  }

  updateSectorBanner() {
    const banner = document.getElementById('sectorBanner');
    if (banner) {
      banner.textContent = this.sector.name.toUpperCase();
      banner.style.color = this.sector.accentColor;
    }
  }

  screenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  addParticle(particle) {
    this.particles.push(particle);
  }

  // --- ROOM TRANSITIONS (Isaac-Style Sliding) ---
  checkDoorTransitions() {
    if (this.isTransitioning || !this.dungeon.currentRoom) return;

    const room = this.dungeon.currentRoom;
    // Cannot leave if doors are locked
    if (room.doorsLocked) return;

    const p = this.player;
    const W = this.width;
    const H = this.height;
    const T = CONSTANTS.WALL_THICKNESS;
    const D = CONSTANTS.DOOR_SIZE;

    // North Door
    if (room.doors.north && p.y - p.radius <= T + 2 && Math.abs(p.x - W / 2) < D / 2) {
      this.initiateTransition(0, -1, p.x, H - T - p.radius - 15);
    }
    // South Door
    else if (room.doors.south && p.y + p.radius >= H - T - 2 && Math.abs(p.x - W / 2) < D / 2) {
      this.initiateTransition(0, 1, p.x, T + p.radius + 15);
    }
    // East Door
    else if (room.doors.east && p.x + p.radius >= W - T - 2 && Math.abs(p.y - H / 2) < D / 2) {
      this.initiateTransition(1, 0, T + p.radius + 15, p.y);
    }
    // West Door
    else if (room.doors.west && p.x - p.radius <= T + 2 && Math.abs(p.y - H / 2) < D / 2) {
      this.initiateTransition(-1, 0, W - T - p.radius - 15, p.y);
    }
  }

  initiateTransition(dx, dy, targetX, targetY) {
    const cur = this.dungeon.currentRoom;
    const next = this.dungeon.getRoom(cur.gx + dx, cur.gy + dy);
    if (!next) return;

    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionDir = { dx, dy };
    this.prevRoom = cur;
    this.nextRoom = next;
    this.targetPlayerPos = { x: targetX, y: targetY };

    if (window.soundEngine) window.soundEngine.playDoorOpen();
  }

  updateTransition(dt) {
    this.transitionProgress += dt * 2.5; // ~0.4s slide duration
    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
      this.dungeon.currentRoom = this.nextRoom;
      this.dungeon.currentRoom.visited = true;

      // Reposition player
      this.player.x = this.targetPlayerPos.x;
      this.player.y = this.targetPlayerPos.y;
      this.player.vx = 0;
      this.player.vy = 0;

      // Spawn room enemies if not cleared
      if (!this.dungeon.currentRoom.cleared) {
        this.dungeon.currentRoom.spawnEnemies();
        if (this.dungeon.currentRoom.enemies.length > 0) {
          this.dungeon.currentRoom.doorsLocked = true;
        }
      }

      this.prevRoom = null;
      this.nextRoom = null;
    }
  }

  // --- INTERACTION LOGIC (Terminals, Pedestals, Airlocks) ---
  checkInteractions() {
    const room = this.dungeon.currentRoom;
    if (!room || this.isTransitioning) return;

    // Check Pedestals (Treasure Room)
    if (room.type === 'TREASURE' && !room.treasureClaimed) {
      const ped = room.obstacles.find(o => o.type === 'pedestal');
      if (ped && Math.hypot(this.player.x - (ped.x + ped.w / 2), this.player.y - (ped.y + ped.h / 2)) < 55) {
        // Grant random high tier module!
        const availableMods = CONSTANTS.MODULES.filter(m => m.id !== 'weapon_blaster');
        const chosen = availableMods[Math.floor(Math.random() * availableMods.length)];
        this.player.collectPickup({ type: 'module_item', module: chosen });
        room.treasureClaimed = true;
        ped.claimed = true;
      }
    }

    // Check Mutagen Pod (Mutation Room)
    if (room.type === 'MUTAGEN' && !room.mutagenClaimed) {
      const pod = room.obstacles.find(o => o.type === 'mutagen_pod');
      if (pod && Math.hypot(this.player.x - (pod.x + pod.w / 2), this.player.y - (pod.y + pod.h / 2)) < 60) {
        this.openMutagenModal();
      }
    }

    // Check Shop Items
    if (room.type === 'FABRICATOR') {
      room.obstacles.forEach(obs => {
        if (obs.type === 'shop_item' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            // Prompt buy
            this.handleShopBuy(obs);
          }
        } else if (obs.type === 'shop_heal' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            if (this.player.scrap >= 15 && this.player.hp < this.player.maxHp) {
              this.player.scrap -= 15;
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
              obs.bought = true;
              if (window.soundEngine) window.soundEngine.playPickup('scrap');
              this.addParticle(new FloatingText(obs.x + 35, obs.y - 15, "REPARO NANITE +2 HP", "#39ff14"));
            }
          }
        } else if (obs.type === 'shop_o2' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            if (this.player.scrap >= 10) {
              this.player.scrap -= 10;
              this.player.o2 = 100;
              obs.bought = true;
              if (window.soundEngine) window.soundEngine.playPickup('scrap');
              this.addParticle(new FloatingText(obs.x + 35, obs.y - 15, "OXIGÊNIO REABASTECIDO", "#00f0ff"));
            }
          }
        }
      });
    }

    // Check Sector Airlock Elevator in Boss Room
    if (room.type === 'BOSS' && room.airlockActive) {
      const airlockX = this.width / 2;
      const airlockY = this.height / 2;
      if (Math.hypot(this.player.x - airlockX, this.player.y - airlockY) < 45) {
        this.advanceToNextSector();
      }
    }
  }

  handleShopBuy(shopObs) {
    if (this.player.scrap >= 25) {
      this.player.scrap -= 25;
      shopObs.bought = true;
      const unowned = CONSTANTS.MODULES.filter(m => !Object.values(this.player.modules).includes(m));
      const mod = unowned.length > 0 ? unowned[Math.floor(Math.random() * unowned.length)] : CONSTANTS.MODULES[1];
      this.player.collectPickup({ type: 'module_item', module: mod });
    }
  }

  openMutagenModal() {
    const unacquiredMutations = CONSTANTS.MUTATIONS.filter(m => !this.player.mutations[m.id]);
    if (unacquiredMutations.length === 0) return;

    this.activeMutation = unacquiredMutations[Math.floor(Math.random() * unacquiredMutations.length)];
    const modal = document.getElementById('mutagenModal');
    const title = document.getElementById('mutagenTitle');
    const boonText = document.getElementById('mutagenBoon');
    const drawbackText = document.getElementById('mutagenDrawback');

    if (title) title.textContent = `${this.activeMutation.icon} ${this.activeMutation.name}`;
    if (boonText) boonText.textContent = this.activeMutation.boon;
    if (drawbackText) drawbackText.textContent = this.activeMutation.drawback;

    modal.classList.remove('hidden');
    this.state = 'MUTAGEN_SELECT';

    const btnAccept = document.getElementById('btnAcceptMutation');
    const btnReject = document.getElementById('btnRejectMutation');

    btnAccept.onclick = () => {
      this.activeMutation.apply(this.player);
      this.player.stats.mutationsCount++;
      const room = this.dungeon.currentRoom;
      if (room) {
        room.mutagenClaimed = true;
        const pod = room.obstacles.find(o => o.type === 'mutagen_pod');
        if (pod) pod.claimed = true;
      }
      modal.classList.add('hidden');
      this.state = 'PLAYING';
      this.addParticle(new Shockwave(this.player.x, this.player.y, 100, '#39ff14'));
      if (window.soundEngine) window.soundEngine.playPickup('mutation');
    };

    btnReject.onclick = () => {
      const room = this.dungeon.currentRoom;
      if (room) {
        room.mutagenClaimed = true;
      }
      modal.classList.add('hidden');
      this.state = 'PLAYING';
    };
  }

  toggleLoadout() {
    const modal = document.getElementById('loadoutModal');
    if (this.state === 'PLAYING') {
      this.state = 'LOADOUT';
      modal.classList.remove('hidden');
      this.renderLoadoutUI();
    } else if (this.state === 'LOADOUT') {
      this.state = 'PLAYING';
      modal.classList.add('hidden');
    }
  }

  renderLoadoutUI() {
    const slotsContainer = document.getElementById('equippedSlots');
    const inventoryContainer = document.getElementById('inventoryModules');
    if (!slotsContainer || !inventoryContainer) return;

    // Render Equipped Slots
    slotsContainer.innerHTML = '';
    const slots = [
      { key: 'weapon', label: 'ARMA' },
      { key: 'chassis', label: 'CHASSIS' },
      { key: 'engine', label: 'PROPULSOR' },
      { key: 'core', label: 'NÚCLEO' }
    ];

    slots.forEach(s => {
      const mod = this.player.modules[s.key];
      const slotEl = document.createElement('div');
      slotEl.className = 'slot-card';
      slotEl.innerHTML = `
        <div class="slot-badge">${s.label}</div>
        <div class="module-icon">${mod ? mod.icon : '⬛'}</div>
        <div class="module-title">${mod ? mod.name : 'Vazio'}</div>
        <div class="module-desc">${mod ? mod.description : 'Nenhum módulo acoplado.'}</div>
      `;
      slotsContainer.appendChild(slotEl);
    });

    // Render Inventory
    inventoryContainer.innerHTML = '';
    if (this.player.modulesInventory.length === 0) {
      inventoryContainer.innerHTML = '<p class="empty-note">Nenhum módulo sobressalente no armazenamento.</p>';
    } else {
      this.player.modulesInventory.forEach((mod, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'module-card';
        itemEl.innerHTML = `
          <div class="module-icon">${mod.icon}</div>
          <div class="module-title">${mod.name}</div>
          <div class="module-desc">${mod.description}</div>
          <button class="btn-action">Equipar</button>
        `;
        itemEl.querySelector('button').onclick = () => {
          this.player.equipModule(mod);
          this.renderLoadoutUI();
        };
        inventoryContainer.appendChild(itemEl);
      });
    }

    // Render Mutations
    const mutationsContainer = document.getElementById('activeMutationsList');
    if (mutationsContainer) {
      mutationsContainer.innerHTML = '';
      let hasMut = false;
      CONSTANTS.MUTATIONS.forEach(m => {
        if (this.player.mutations[m.id]) {
          hasMut = true;
          const card = document.createElement('div');
          card.className = 'mutation-badge-card';
          card.innerHTML = `
            <div>${m.icon} <strong>${m.name}</strong></div>
            <div class="boon">🟢 ${m.boon}</div>
            <div class="drawback">🔴 ${m.drawback}</div>
          `;
          mutationsContainer.appendChild(card);
        }
      });
      if (!hasMut) {
        mutationsContainer.innerHTML = '<p class="empty-note">Nenhuma contaminação biológica detectada.</p>';
      }
    }
  }

  togglePause() {
    const modal = document.getElementById('pauseModal');
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      modal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      modal.classList.add('hidden');
    }
  }

  onBossDefeated() {
    const room = this.dungeon.currentRoom;
    if (!room) return;
    room.bossDefeated = true;
    room.airlockActive = true;
    room.cleared = true;
    room.doorsLocked = false;
    this.addParticle(new Shockwave(this.width / 2, this.height / 2, 220, '#00f0ff'));
    this.addParticle(new FloatingText(this.width / 2, this.height / 2 - 40, "ELEVADOR DO SETOR ATIVADO!", "#00f0ff"));
  }

  advanceToNextSector() {
    const nextIndex = this.currentSectorIndex + 1;
    if (nextIndex < CONSTANTS.SECTORS.length) {
      this.loadSector(nextIndex);
    } else {
      this.onFinalVictory();
    }
  }

  onPlayerDeath() {
    this.state = 'GAME_OVER';
    const modal = document.getElementById('gameOverModal');
    if (modal) {
      const statsEl = document.getElementById('gameOverStats');
      if (statsEl && this.player) {
        const timeSec = Math.floor((Date.now() - this.player.stats.startTime) / 1000);
        statsEl.innerHTML = `
          <p><strong>Setor Alcançado:</strong> ${this.sector.name}</p>
          <p><strong>Salas Conquistadas:</strong> ${this.player.stats.roomsCleared}</p>
          <p><strong>Criaturas Eliminadas:</strong> ${this.player.stats.aliensKilled}</p>
          <p><strong>Autômatos Destruídos:</strong> ${this.player.stats.robotsKilled}</p>
          <p><strong>Robôs Hackeados:</strong> ${this.player.stats.robotsHacked}</p>
          <p><strong>Mutações Sofridas:</strong> ${this.player.stats.mutationsCount}</p>
          <p><strong>Tempo de Sobrevivência:</strong> ${timeSec} segundos</p>
        `;
      }
      modal.classList.remove('hidden');
    }
  }

  onFinalVictory() {
    this.state = 'VICTORY';
    const modal = document.getElementById('victoryModal');
    if (modal) {
      const statsEl = document.getElementById('victoryStats');
      if (statsEl && this.player) {
        const timeSec = Math.floor((Date.now() - this.player.stats.startTime) / 1000);
        statsEl.innerHTML = `
          <p><strong>Você expurgou o Reator de Matéria Escura e escapou da nave-mãe!</strong></p>
          <p><strong>Inimigos Totais Abatidos:</strong> ${this.player.stats.aliensKilled + this.player.stats.robotsKilled}</p>
          <p><strong>Robôs Aliados Hackeados:</strong> ${this.player.stats.robotsHacked}</p>
          <p><strong>Tempo Total da Run:</strong> ${timeSec} segundos</p>
        `;
      }
      modal.classList.remove('hidden');
    }
  }

  // --- GAME LOOP ---
  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.state === 'PLAYING') {
      this.update(dt);
    } else if (this.isTransitioning) {
      this.updateTransition(dt);
    }

    this.render();
    this.updateHUD();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }

    const room = this.dungeon.currentRoom;
    if (!room) return;

    // Update Player
    this.player.update(dt, room, this.input);

    // Update Projectiles
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
      const proj = room.projectiles[i];
      proj.update(dt, room);
      if (proj.dead) {
        room.projectiles.splice(i, 1);
      }
    }

    // Update Enemies
    let aliveCount = 0;
    for (let i = room.enemies.length - 1; i >= 0; i--) {
      const enemy = room.enemies[i];
      enemy.update(dt, room);
      if (enemy.dead) {
        room.enemies.splice(i, 1);
      } else {
        aliveCount++;
      }
    }

    // Check Room Cleared status
    if (aliveCount === 0 && !room.cleared) {
      room.cleared = true;
      room.doorsLocked = false;
      this.player.stats.roomsCleared++;
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      this.addParticle(new FloatingText(this.width / 2, 70, "SETOR SEGURO // PORTAS LIBERADAS", "#00f0ff"));
    }

    // Update Hazards (Acid pools, electrical arcs)
    for (let i = room.hazards.length - 1; i >= 0; i--) {
      const haz = room.hazards[i];
      if (haz.duration) {
        haz.duration -= dt;
        if (haz.duration <= 0) {
          room.hazards.splice(i, 1);
          continue;
        }
      }

      // Check player step on acid pool
      if (haz.type === 'acid_pool' && !this.player.modules.chassis?.acidImmunity) {
        if (this.player.x >= haz.x && this.player.x <= haz.x + haz.w &&
            this.player.y >= haz.y && this.player.y <= haz.y + haz.h) {
          this.player.takeDamage(1, null);
        }
      }

      // Check enemies step on hazard
      room.enemies.forEach(e => {
        if (e.x >= haz.x && e.x <= haz.x + haz.w && e.y >= haz.y && e.y <= haz.y + haz.h) {
          e.takeDamage(15 * dt, null);
        }
      });
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.update(dt);
      if (part.dead) {
        this.particles.splice(i, 1);
      }
    }

    // Interactions
    this.checkInteractions();

    // Check doors
    this.checkDoorTransitions();
  }

  // --- RENDERING ROUTINES ---
  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake transform
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, this.width, this.height);

    if (this.isTransitioning) {
      this.renderTransition(ctx);
    } else if (this.dungeon && this.dungeon.currentRoom) {
      this.renderRoom(ctx, this.dungeon.currentRoom, 0, 0);
      this.renderEntities(ctx, this.dungeon.currentRoom);
      this.renderParticles(ctx);
      this.renderVignetteAndLighting(ctx);
    }

    ctx.restore();
  }

  renderTransition(ctx) {
    const prog = this.transitionProgress;
    const dx = this.transitionDir.dx * this.width * prog;
    const dy = this.transitionDir.dy * this.height * prog;

    // Draw previous room sliding away
    this.renderRoom(ctx, this.prevRoom, -dx, -dy);
    // Draw next room sliding in
    this.renderRoom(ctx, this.nextRoom, -dx + this.transitionDir.dx * this.width, -dy + this.transitionDir.dy * this.height);

    // Draw player transitioning
    const px = this.player.x + (this.targetPlayerPos.x - this.player.x) * prog;
    const py = this.player.y + (this.targetPlayerPos.y - this.player.y) * prog;
    this.drawPlayerSprite(ctx, px, py);
  }

  renderRoom(ctx, room, offsetX = 0, offsetY = 0) {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    const W = this.width;
    const H = this.height;
    const T = CONSTANTS.WALL_THICKNESS;
    const D = CONSTANTS.DOOR_SIZE;

    // 1. Draw Sector Floor
    if (room.vacuumBreach || (room.sector && room.sector.hasVacuum)) {
      // Deep space void with stars
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, W, H);
      this.renderStarfield(ctx);
    } else {
      ctx.fillStyle = room.sector.floorColor;
      ctx.fillRect(0, 0, W, H);
    }

    // Floor Grid / Textures
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = T; x < W - T; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, T);
      ctx.lineTo(x, H - T);
      ctx.stroke();
    }
    for (let y = T; y < H - T; y += 40) {
      ctx.beginPath();
      ctx.moveTo(T, y);
      ctx.lineTo(W - T, y);
      ctx.stroke();
    }

    // Room Decorations (Pipes, bio growths)
    if (room.decorations) {
      room.decorations.forEach(dec => {
        ctx.save();
        ctx.translate(dec.x, dec.y);
        ctx.rotate(dec.rotation);
        if (room.sector.theme === 'organic') {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.12)';
          ctx.beginPath();
          ctx.ellipse(0, 0, dec.size, dec.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.strokeRect(-dec.size / 2, -dec.size / 2, dec.size, dec.size);
        }
        ctx.restore();
      });
    }

    // Hazards (Acid pools, grates)
    if (room.hazards) {
      room.hazards.forEach(haz => {
        if (haz.type === 'acid_pool') {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.45)';
          ctx.beginPath();
          ctx.ellipse(haz.x + haz.w / 2, haz.y + haz.h / 2, haz.w / 2, haz.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fillRect(haz.x, haz.y, haz.w, haz.h);
        }
      });
    }

    // 2. Draw Walls
    ctx.fillStyle = room.sector.wallColor;
    // North wall
    ctx.fillRect(0, 0, W, T);
    // South wall
    ctx.fillRect(0, H - T, W, T);
    // West wall
    ctx.fillRect(0, 0, T, H);
    // East wall
    ctx.fillRect(W - T, 0, T, H);

    // Wall Borders Accent
    ctx.strokeStyle = room.sector.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(T, T, W - 2 * T, H - 2 * T);

    // 3. Draw Doors
    const doorColor = room.doorsLocked ? '#ff2a5f' : room.sector.accentColor;

    // North Door
    if (room.doors.north) {
      ctx.fillStyle = room.sector.floorColor;
      ctx.fillRect(W / 2 - D / 2, 0, D, T);
      ctx.fillStyle = doorColor;
      ctx.fillRect(W / 2 - D / 2, T - 6, D, 6);
    }
    // South Door
    if (room.doors.south) {
      ctx.fillStyle = room.sector.floorColor;
      ctx.fillRect(W / 2 - D / 2, H - T, D, T);
      ctx.fillStyle = doorColor;
      ctx.fillRect(W / 2 - D / 2, H - T, D, 6);
    }
    // West Door
    if (room.doors.west) {
      ctx.fillStyle = room.sector.floorColor;
      ctx.fillRect(0, H / 2 - D / 2, T, D);
      ctx.fillStyle = doorColor;
      ctx.fillRect(T - 6, H / 2 - D / 2, 6, D);
    }
    // East Door
    if (room.doors.east) {
      ctx.fillStyle = room.sector.floorColor;
      ctx.fillRect(W - T, H / 2 - D / 2, T, D);
      ctx.fillStyle = doorColor;
      ctx.fillRect(W - T, H / 2 - D / 2, 6, D);
    }

    // 4. Draw Obstacles & Terminals
    if (room.obstacles) {
      room.obstacles.forEach(obs => {
        if (obs.type === 'crate') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        } else if (obs.type === 'pillar') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        } else if (obs.type === 'explosive_barrel') {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (obs.type === 'pedestal') {
          ctx.fillStyle = '#334155';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
          if (!obs.claimed) {
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📦', obs.x + obs.w / 2, obs.y + obs.h / 2 + 8);
          }
        } else if (obs.type === 'mutagen_pod') {
          ctx.fillStyle = '#064e3b';
          ctx.beginPath();
          ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#39ff14';
          ctx.lineWidth = 3;
          ctx.stroke();
          if (!obs.claimed) {
            ctx.font = '26px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🧬', obs.x + obs.w / 2, obs.y + obs.h / 2 + 9);
          }
        } else if (obs.type === 'terminal' || obs.type.startsWith('shop_')) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
          ctx.font = '11px "Courier New", monospace';
          ctx.fillStyle = '#00f0ff';
          ctx.textAlign = 'center';
          const label = obs.type === 'shop_heal' ? 'REPARO 15$' : (obs.type === 'shop_o2' ? 'O2 10$' : 'LOJA 25$');
          ctx.fillText(label, obs.x + obs.w / 2, obs.y + obs.h / 2 + 4);
        }
      });
    }

    // Airlock Elevator in Boss Room
    if (room.type === 'BOSS' && room.airlockActive) {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ELEVADOR', W / 2, H / 2 + 4);
    }

    ctx.restore();
  }

  renderStarfield(ctx) {
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(star => {
      ctx.globalAlpha = star.alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;
  }

  renderEntities(ctx, room) {
    // 1. Pickups
    if (room.pickups) {
      room.pickups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.type === 'scrap') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'hp') {
          ctx.fillStyle = '#ef4444';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❤️', 0, 5);
        } else if (p.type === 'shield') {
          ctx.fillStyle = '#00f0ff';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🛡️', 0, 5);
        } else if (p.type === 'o2') {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🫧', 0, 5);
        }
        ctx.restore();
      });
    }

    // 2. Projectiles
    if (room.projectiles) {
      room.projectiles.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 3. Enemies & Bosses
    if (room.enemies) {
      room.enemies.forEach(e => {
        this.drawEnemySprite(ctx, e);
      });
    }

    // 4. Companion Drone
    if (this.player.modules.core && this.player.modules.core.hasCompanionDrone) {
      const droneX = this.player.x + Math.cos(this.player.droneAngle) * 35;
      const droneY = this.player.y + Math.sin(this.player.droneAngle) * 35;
      ctx.save();
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(droneX, droneY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Player
    this.drawPlayerSprite(ctx, this.player.x, this.player.y);
  }

  drawPlayerSprite(ctx, x, y) {
    const p = this.player;
    ctx.save();
    ctx.translate(x, y);

    // Invulnerability blink
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 15) % 2 === 0) {
      ctx.restore();
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.rotate(p.angle);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Glowing Visor
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(4, -4, 8, 8);

    // Weapon Gun Barrel
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, 6, 12, 5);

    ctx.restore();
  }

  drawEnemySprite(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Hacked aura
    if (e.isHacked) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, e.radius * 0.8, e.radius * 0.9, e.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = e.flashTimer > 0 ? '#ffffff' : e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye / Core
    ctx.fillStyle = e.faction === CONSTANTS.FACTIONS.PLAYER ? '#00f0ff' : '#ff2a5f';
    ctx.beginPath();
    ctx.arc(4, 0, Math.max(3, e.radius * 0.3), 0, Math.PI * 2);
    ctx.fill();

    // Boss Name & HP Bar
    if (e.isBoss) {
      ctx.restore();
      this.drawBossHealthBar(ctx, e);
      return;
    }

    // Health pip bar above normal enemies
    if (e.hp < e.maxHp) {
      const barW = e.radius * 2;
      const barH = 4;
      ctx.fillStyle = '#334155';
      ctx.fillRect(-barW / 2, -e.radius - 10, barW, barH);
      ctx.fillStyle = e.isHacked ? '#00f0ff' : '#ff2a5f';
      ctx.fillRect(-barW / 2, -e.radius - 10, barW * (e.hp / e.maxHp), barH);
    }

    ctx.restore();
  }

  drawBossHealthBar(ctx, boss) {
    const W = 400;
    const H = 16;
    const x = this.width / 2 - W / 2;
    const y = 30;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 2, y - 2, W + 4, H + 4);
    ctx.fillStyle = '#ff2a5f';
    ctx.shadowColor = '#ff2a5f';
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, W * (boss.hp / boss.maxHp), H);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(boss.bossName, this.width / 2, y - 6);
    ctx.restore();
  }

  renderParticles(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  renderVignetteAndLighting(ctx) {
    // Dynamic Ambient Lighting / Flashlight around player
    const p = this.player;
    const radGrd = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, 380);
    radGrd.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
    radGrd.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
    radGrd.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

    ctx.fillStyle = radGrd;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  // --- HUD SYNC & MINIMAP ---
  updateHUD() {
    if (!this.player) return;

    // HP Hearts
    const hpContainer = document.getElementById('hpDisplay');
    if (hpContainer) {
      let hpStr = '';
      for (let i = 0; i < this.player.maxHp; i++) {
        hpStr += i < this.player.hp ? '❤️' : '🖤';
      }
      hpContainer.innerHTML = hpStr;
    }

    // Shield Pips
    const shieldContainer = document.getElementById('shieldDisplay');
    if (shieldContainer) {
      let sStr = '';
      for (let i = 0; i < this.player.maxShield; i++) {
        sStr += i < this.player.shield ? '🛡️' : '🔘';
      }
      shieldContainer.innerHTML = sStr;
    }

    // Oxygen Bar
    const o2Bar = document.getElementById('o2BarFill');
    const o2Text = document.getElementById('o2Value');
    const o2Widget = document.getElementById('o2Widget');
    if (o2Bar && o2Text) {
      const o2Pct = Math.round(this.player.o2);
      o2Bar.style.width = `${o2Pct}%`;
      o2Text.textContent = `${o2Pct}%`;

      if (this.dungeon && this.dungeon.currentRoom && this.dungeon.currentRoom.vacuumBreach) {
        o2Widget.classList.add('in-vacuum');
      } else {
        o2Widget.classList.remove('in-vacuum');
      }
    }

    // Hacking Tool Cooldown
    const hackBar = document.getElementById('hackBarFill');
    if (hackBar) {
      const pct = this.player.hackTimer > 0 ? (1 - this.player.hackTimer / this.player.hackCooldown) * 100 : 100;
      hackBar.style.width = `${pct}%`;
    }

    // Scrap Currency
    const scrapEl = document.getElementById('scrapValue');
    if (scrapEl) scrapEl.textContent = this.player.scrap;

    // Active Weapon Label
    const weaponEl = document.getElementById('activeWeaponName');
    if (weaponEl && this.player.modules.weapon) {
      weaponEl.textContent = `${this.player.modules.weapon.icon} ${this.player.modules.weapon.name}`;
    }

    // Minimap Render
    this.renderMinimap();
  }

  renderMinimap() {
    const miniCanvas = document.getElementById('minimapCanvas');
    if (!miniCanvas || !this.dungeon) return;
    const mCtx = miniCanvas.getContext('2d');
    mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    const size = 14;
    const gap = 3;
    const offsetX = 10;
    const offsetY = 10;

    this.dungeon.rooms.forEach(room => {
      if (!room.visited) return;

      const rx = offsetX + room.gx * (size + gap);
      const ry = offsetY + room.gy * (size + gap);

      // Current room highlight
      if (room === this.dungeon.currentRoom) {
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(rx - 1, ry - 1, size + 2, size + 2);
      }

      // Room type color
      if (room.type === 'START') mCtx.fillStyle = '#64748b';
      else if (room.type === 'BOSS') mCtx.fillStyle = '#ff2a5f';
      else if (room.type === 'TREASURE') mCtx.fillStyle = '#f59e0b';
      else if (room.type === 'MUTAGEN') mCtx.fillStyle = '#39ff14';
      else if (room.type === 'FABRICATOR') mCtx.fillStyle = '#00f0ff';
      else mCtx.fillStyle = '#334155';

      mCtx.fillRect(rx, ry, size, size);
    });
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
  window.gameInstance.start();
});
