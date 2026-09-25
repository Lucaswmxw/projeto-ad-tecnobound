/**
 * VOIDBOUND: DERELICT
 * Entities, Player, Enemies, Bosses, Projectiles, Pickups & Particle System
 */

// --- BASE ENTITY ---
class Entity {
  constructor(x, y, radius, faction) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.faction = faction;
    this.maxHp = 10;
    this.hp = 10;
    this.speed = 100;
    this.dead = false;
    this.invulnTimer = 0;
    this.color = '#ffffff';
    this.flashTimer = 0;
  }

  takeDamage(amount, source) {
    if (this.invulnTimer > 0 || this.dead) return false;
    this.hp -= amount;
    this.flashTimer = 0.15;
    if (window.soundEngine) {
      if (this.faction === CONSTANTS.FACTIONS.ROBOT) {
        window.soundEngine.playHit('robot');
      } else if (this.faction === CONSTANTS.FACTIONS.ALIEN) {
        window.soundEngine.playHit('alien');
      }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.onDeath(source);
    }
    return true;
  }

  onDeath(source) {
    // Override in subclasses
  }

  update(dt, room) {
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Movement integration
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Collide with room walls
    const T = CONSTANTS.WALL_THICKNESS;
    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;

    if (this.x - this.radius < T) {
      this.x = T + this.radius;
      this.vx = 0;
    } else if (this.x + this.radius > W - T) {
      this.x = W - T - this.radius;
      this.vx = 0;
    }

    if (this.y - this.radius < T) {
      this.y = T + this.radius;
      this.vy = 0;
    } else if (this.y + this.radius > H - T) {
      this.y = H - T - this.radius;
      this.vy = 0;
    }

    // Obstacle collisions
    if (room && room.obstacles) {
      for (let obs of room.obstacles) {
        this.resolveObstacleCollision(obs);
      }
    }
  }

  resolveObstacleCollision(obs) {
    // Circle vs AABB collision
    const closestX = Math.max(obs.x, Math.min(this.x, obs.x + obs.w));
    const closestY = Math.max(obs.y, Math.min(this.y, obs.y + obs.h));
    const distX = this.x - closestX;
    const distY = this.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < this.radius * this.radius && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const overlap = this.radius - dist;
      this.x += (distX / dist) * overlap;
      this.y += (distY / dist) * overlap;
    }
  }
}

// --- PLAYER ---
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 16, CONSTANTS.FACTIONS.PLAYER);
    this.maxHp = 6;
    this.hp = 6;
    this.maxShield = 2;
    this.shield = 2;
    this.shieldRegenTimer = 0;
    this.shieldRegenDelay = 7.0;

    this.baseSpeed = 220;
    this.speedMult = 1.0;
    this.angle = 0;

    // Oxygen system (for vacuum sectors)
    this.maxO2 = 100;
    this.o2 = 100;
    this.o2DepletionRate = 3.5; // % per sec in vacuum
    this.o2DamageTimer = 0;

    // Currency & Inventory
    this.scrap = 20;
    this.keys = 1;
    this.modulesInventory = []; // unequipped modules
    
    // Equipped Modular Loadout
    this.modules = {
      weapon: CONSTANTS.MODULES.find(m => m.id === 'weapon_blaster'),
      chassis: CONSTANTS.MODULES.find(m => m.id === 'chassis_nano'),
      engine: CONSTANTS.MODULES.find(m => m.id === 'engine_booster'),
      core: CONSTANTS.MODULES.find(m => m.id === 'core_overclock')
    };

    // Active Alien Mutations
    this.mutations = {
      causticBile: false,
      symbioticTentacle: false,
      predatorAdrenals: false,
      contagiousSpores: false,
      chitinShell: false,
      vampiricTendrils: false
    };
    this.tentacleTimer = 0;
    this.spasmTimer = 0;
    this.combatTimer = 0; // for predator adrenals hunger

    // Combat & Abilities
    this.shootTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 1.5;
    this.isDashing = false;
    this.dashDuration = 0.2;
    this.dashTimeRemaining = 0;
    this.dashDir = { x: 0, y: 0 };

    // Hacking EMP Tool
    this.hackCooldown = 5.0;
    this.hackTimer = 0;
    this.hackRange = 220;
    this.hackCooldownBonus = 0;

    // Companion drone state
    this.droneAngle = 0;
    this.droneShootTimer = 0;

    // Statistics for run end
    this.stats = {
      roomsCleared: 0,
      aliensKilled: 0,
      robotsKilled: 0,
      robotsHacked: 0,
      mutationsCount: 0,
      damageDealt: 0,
      startTime: Date.now()
    };
  }

  equipModule(module) {
    if (!module || !module.slot) return;
    const current = this.modules[module.slot];
    // Remove old module bonuses if any
    if (current && current.bonusShield) {
      this.maxShield -= current.bonusShield;
      this.shield = Math.min(this.shield, this.maxShield);
    }
    // Set new
    this.modules[module.slot] = module;
    if (module.bonusShield) {
      this.maxShield += module.bonusShield;
      this.shield = Math.min(this.shield + module.bonusShield, this.maxShield);
    }
    if (window.soundEngine) window.soundEngine.playPickup('module');
  }

  takeDamage(amount, source) {
    if (this.invulnTimer > 0 || this.isDashing || this.dead) return false;

    // Chitin Shell mutation: 25% chance to deflect completely
    if (this.mutations.chitinShell && Math.random() < 0.25) {
      if (window.gameInstance) {
        window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "DEFLETIDO!", "#39ff14"));
      }
      return false;
    }

    this.shieldRegenTimer = 0; // Reset shield regen

    // Damage shield first
    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) {
        this.hp += this.shield; // remaining damage to HP
        this.shield = 0;
      }

      // Check reactive chassis EMP explosion on shield break
      if (this.shield === 0 && this.modules.chassis && this.modules.chassis.empOnBreak) {
        this.triggerEmpShockwave();
      }
    } else {
      this.hp -= amount;
    }

    this.invulnTimer = 0.8;
    this.flashTimer = 0.2;
    if (window.soundEngine) window.soundEngine.playPlayerDamage();
    if (window.gameInstance) window.gameInstance.screenShake(8, 0.25);

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.onDeath(source);
    }
    return true;
  }

  triggerEmpShockwave() {
    if (window.soundEngine) window.soundEngine.playExplosion();
    if (window.gameInstance) {
      window.gameInstance.addParticle(new Shockwave(this.x, this.y, 160, '#00f0ff'));
      const room = window.gameInstance.dungeon.currentRoom;
      if (room) {
        room.enemies.forEach(e => {
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < 160) {
            e.takeDamage(20, this);
            const angle = Math.atan2(e.y - this.y, e.x - this.x);
            e.vx = Math.cos(angle) * 350;
            e.vy = Math.sin(angle) * 350;
          }
        });
      }
    }
  }

  onDeath() {
    if (window.gameInstance) {
      window.gameInstance.onPlayerDeath();
    }
  }

  update(dt, room, input) {
    if (this.dead) return;

    // Movement speed calculation
    let currentSpeed = (this.baseSpeed + (this.modules.engine ? (this.modules.engine.speedBonus || 0) : 0)) * this.speedMult;

    // Adrenaline mutation boost under 50% HP
    let fireRateMult = 1.0;
    let damageMult = 1.0;
    if (this.mutations.predatorAdrenals && this.hp <= this.maxHp * 0.5) {
      fireRateMult = 1.6;
      damageMult = 1.35;
    }

    // Handle Timers
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shootTimer > 0) this.shootTimer -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.hackTimer > 0) this.hackTimer -= dt;

    // Natural Shield Regeneration (Chassis Nanite)
    if (this.modules.chassis && this.modules.chassis.shieldRegenDelay) {
      this.shieldRegenTimer += dt;
      if (this.shieldRegenTimer >= this.modules.chassis.shieldRegenDelay) {
        if (this.shield < this.maxShield) {
          this.shield++;
          if (window.gameInstance) {
            window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "+ESCUDO", "#00f0ff"));
          }
        }
        this.shieldRegenTimer = 0;
      }
    }

    // Oxygen consumption in vacuum zones
    if (room && room.vacuumBreach) {
      const o2Efficiency = (this.modules.chassis && this.modules.chassis.o2Efficiency) ? this.modules.chassis.o2Efficiency : 1.0;
      this.o2 -= this.o2DepletionRate * o2Efficiency * dt;

      if (this.o2 <= 0) {
        this.o2 = 0;
        this.o2DamageTimer += dt;
        if (this.o2DamageTimer >= 1.5) {
          this.o2DamageTimer = 0;
          this.takeDamage(1, null);
          if (window.gameInstance) {
            window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "SEM OXIGÊNIO!", "#ff2a5f"));
          }
        }
      }
    } else {
      // Slow passive O2 recovery in safe atmospheric rooms
      if (this.o2 < this.maxO2) {
        this.o2 = Math.min(this.maxO2, this.o2 + 20 * dt);
      }
    }

    // Spores mutation twitch spasm
    if (this.mutations.contagiousSpores) {
      this.spasmTimer += dt;
      if (this.spasmTimer > 14) {
        this.spasmTimer = 0;
        const spasmAngle = Math.random() * Math.PI * 2;
        this.vx += Math.cos(spasmAngle) * 300;
        this.vy += Math.sin(spasmAngle) * 300;
        if (window.gameInstance) {
          window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "*Espasmo*", "#39ff14"));
        }
      }
    }

    // Symbiotic Tentacle automated attack
    if (this.mutations.symbioticTentacle && room && room.enemies) {
      this.tentacleTimer += dt;
      if (this.tentacleTimer >= 2.5) {
        this.tentacleTimer = 0;
        let closest = null;
        let minDist = 130;
        for (let enemy of room.enemies) {
          if (enemy.dead || enemy.faction === this.faction) continue;
          const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (d < minDist) {
            minDist = d;
            closest = enemy;
          }
        }
        if (closest) {
          closest.takeDamage(28, this);
          if (window.gameInstance) {
            window.gameInstance.addParticle(new TentacleWhip(this.x, this.y, closest.x, closest.y));
            window.gameInstance.addParticle(new FloatingText(closest.x, closest.y - 15, "CHICOTADA! 28", "#39ff14"));
          }
        }
      }
    }

    // Companion Drone Logic
    if (this.modules.core && this.modules.core.hasCompanionDrone) {
      this.droneAngle += dt * 2.5;
      this.droneShootTimer += dt;
      if (this.droneShootTimer >= 0.8 && room && room.enemies) {
        // Drone auto-fires at closest hostile
        let closest = null;
        let minDist = 300;
        for (let enemy of room.enemies) {
          if (enemy.dead || enemy.faction === this.faction) continue;
          const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (d < minDist) {
            minDist = d;
            closest = enemy;
          }
        }
        if (closest) {
          this.droneShootTimer = 0;
          const droneX = this.x + Math.cos(this.droneAngle) * 35;
          const droneY = this.y + Math.sin(this.droneAngle) * 35;
          const angle = Math.atan2(closest.y - droneY, closest.x - droneX);
          room.projectiles.push(new Projectile(
            droneX, droneY,
            Math.cos(angle) * 550, Math.sin(angle) * 550,
            CONSTANTS.FACTIONS.PLAYER, 8, 'plasma', '#00f0ff'
          ));
          if (window.soundEngine) window.soundEngine.playShoot('plasma');
        }
      }
    }

    // --- DASH HANDLING ---
    if (this.isDashing) {
      this.dashTimeRemaining -= dt;
      this.vx = this.dashDir.x * 550;
      this.vy = this.dashDir.y * 550;

      // Combustion engine trail
      if (this.modules.engine && this.modules.engine.fireTrail && window.gameInstance) {
        window.gameInstance.addParticle(new FireParticle(this.x, this.y));
      }

      if (this.dashTimeRemaining <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal WASD / Arrow movement
      let moveX = 0;
      let moveY = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }

      this.vx = moveX * currentSpeed;
      this.vy = moveY * currentSpeed;

      // Initiate Dash (Shift or Space if not aiming with keys)
      const dashCooldownMod = (this.modules.engine && this.modules.engine.dashCooldown) ? this.modules.engine.dashCooldown : 1.5;
      if ((input.keys['ShiftLeft'] || input.keys['ShiftRight'] || input.keys['Space']) && this.dashTimer <= 0) {
        if (moveX !== 0 || moveY !== 0) {
          this.isDashing = true;
          this.dashTimeRemaining = this.dashDuration;
          this.dashTimer = dashCooldownMod;
          this.dashDir = { x: moveX, y: moveY };
          if (window.soundEngine) window.soundEngine.playDash();

          // Engine Warp Stun
          if (this.modules.engine && this.modules.engine.dashStun && window.gameInstance) {
            window.gameInstance.addParticle(new Shockwave(this.x, this.y, 90, '#ffffff'));
            if (room && room.enemies) {
              room.enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < 90) {
                  e.stunTimer = 1.2;
                }
              });
            }
          }
        }
      }
    }

    // Aim Angle towards Mouse
    this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // --- SHOOTING ---
    const weapon = this.modules.weapon || CONSTANTS.MODULES[0];
    const effectiveFireRate = (weapon.fireRate || 4) * fireRateMult;
    const fireInterval = 1 / effectiveFireRate;

    if (input.mouseDown && this.shootTimer <= 0 && !this.isDashing) {
      this.shootTimer = fireInterval;
      this.shootWeapon(weapon, damageMult, room);
    }

    // --- HACKING ABILITY (Key 'E' or Right Click) ---
    const hackCooldownMod = (this.modules.core && this.modules.core.hackCooldownMult) ? this.modules.core.hackCooldownMult : 1.0;
    const totalHackCooldown = (this.hackCooldown + this.hackCooldownBonus) * hackCooldownMod;

    if ((input.keys['KeyE'] || input.rightMouseDown) && this.hackTimer <= 0) {
      this.triggerHackingTool(room, totalHackCooldown);
    }

    // Super update for physics & obstacles
    super.update(dt, room);

    // Pickups magnet & collection
    if (room && room.pickups) {
      const magnetMult = (this.modules.core && this.modules.core.pickupRadiusMult) ? this.modules.core.pickupRadiusMult : 1.0;
      const pickupRange = 35 * magnetMult;

      for (let i = room.pickups.length - 1; i >= 0; i--) {
        const p = room.pickups[i];
        const dist = Math.hypot(p.x - this.x, p.y - this.y);

        // Attract pickup if in magnet range
        if (dist < pickupRange * 3) {
          const angle = Math.atan2(this.y - p.y, this.x - p.x);
          p.x += Math.cos(angle) * 220 * dt;
          p.y += Math.sin(angle) * 220 * dt;
        }

        // Collect pickup
        if (dist < this.radius + p.radius) {
          this.collectPickup(p);
          room.pickups.splice(i, 1);
        }
      }
    }
  }

  shootWeapon(weapon, damageMult, room) {
    const baseDamage = (weapon.damage || 12) * damageMult;
    const speed = weapon.speed || 500;
    const count = weapon.pellets || 1;
    const spread = weapon.spread || 0.05;

    for (let i = 0; i < count; i++) {
      const offset = (Math.random() - 0.5) * spread;
      const shootAngle = this.angle + offset;
      const projVx = Math.cos(shootAngle) * speed;
      const projVy = Math.sin(shootAngle) * speed;

      const proj = new Projectile(
        this.x + Math.cos(this.angle) * 20,
        this.y + Math.sin(this.angle) * 20,
        projVx, projVy,
        CONSTANTS.FACTIONS.PLAYER,
        baseDamage,
        weapon.bulletType || 'plasma',
        weapon.bulletType === 'rail' ? '#bf55ec' : (weapon.bulletType === 'scatter' ? '#ffaa00' : '#00f0ff')
      );

      // Weapon modifications
      if (weapon.pierce) proj.pierce = weapon.pierce;
      if (weapon.homing) proj.homing = true;
      if (weapon.chainTargets) proj.chainTargets = weapon.chainTargets;

      // Alien Mutation: Caustic Bile leaves toxic pools on bullet impact/travel
      if (this.mutations.causticBile) {
        proj.leavesAcid = true;
      }

      room.projectiles.push(proj);
    }

    if (window.soundEngine) {
      window.soundEngine.playShoot(weapon.bulletType);
    }
  }

  triggerHackingTool(room, cooldown) {
    this.hackTimer = cooldown;
    if (window.soundEngine) window.soundEngine.playHack();

    let hackedTarget = null;
    let minDist = this.hackRange;

    if (room && room.enemies) {
      for (let enemy of room.enemies) {
        // Can only hack robot faction enemies that are not already hacked
        if (enemy.dead || enemy.isHacked || enemy.faction !== CONSTANTS.FACTIONS.ROBOT) continue;
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d < minDist) {
          minDist = d;
          hackedTarget = enemy;
        }
      }
    }

    if (hackedTarget) {
      const hackDuration = 8.0 * (this.modules.core && this.modules.core.hackDurationMult ? this.modules.core.hackDurationMult : 1.0);
      hackedTarget.applyHack(hackDuration);
      this.stats.robotsHacked++;
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(hackedTarget.x, hackedTarget.y, 60, '#00f0ff'));
        window.gameInstance.addParticle(new FloatingText(hackedTarget.x, hackedTarget.y - 25, "HACKEADO! ALIADO", "#00f0ff"));
      }
    } else {
      // EMP Pulse with no robot target: can stun or open nearby locked consoles
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, this.hackRange * 0.6, '#00f0ff'));
        window.gameInstance.addParticle(new FloatingText(this.x, this.y - 25, "EMP PULSE", "#00f0ff"));
      }
    }
  }

  collectPickup(p) {
    if (p.type === 'scrap') {
      this.scrap += p.amount;
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (window.gameInstance) window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount} SUCATA`, '#ffaa00'));
    } else if (p.type === 'hp') {
      const healAmount = this.mutations.vampiricTendrils ? Math.max(1, Math.floor(p.amount * 0.5)) : p.amount;
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (window.gameInstance) window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, `+${healAmount} HP`, '#39ff14'));
    } else if (p.type === 'shield') {
      this.shield = Math.min(this.maxShield, this.shield + p.amount);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (window.gameInstance) window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount} ESCUDO`, '#00f0ff'));
    } else if (p.type === 'o2') {
      this.o2 = Math.min(this.maxO2, this.o2 + p.amount);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (window.gameInstance) window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount}% O2`, '#00f0ff'));
    } else if (p.type === 'module_item') {
      this.modulesInventory.push(p.module);
      this.equipModule(p.module);
      if (window.gameInstance) window.gameInstance.addParticle(new FloatingText(this.x, this.y - 30, `MÓDULO: ${p.module.name}`, '#00f0ff'));
    }
  }
}

// --- PROJECTILE ---
class Projectile {
  constructor(x, y, vx, vy, faction, damage, type = 'plasma', color = '#00f0ff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.faction = faction;
    this.damage = damage;
    this.type = type;
    this.color = color;
    this.radius = type === 'scatter' ? 4 : (type === 'rail' ? 6 : (type === 'missile' ? 7 : 5));
    this.dead = false;
    this.lifeTime = 2.0;
    this.pierce = 1;
    this.homing = false;
    this.chainTargets = 0;
    this.leavesAcid = false;
  }

  update(dt, room) {
    this.lifeTime -= dt;
    if (this.lifeTime <= 0) {
      this.dead = true;
      return;
    }

    // Homing behavior
    if (this.homing && room && room.enemies) {
      let target = null;
      let minDist = 250;
      for (let enemy of room.enemies) {
        if (enemy.dead || enemy.faction === this.faction) continue;
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d < minDist) {
          minDist = d;
          target = enemy;
        }
      }
      if (target) {
        const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let diff = desiredAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const newAngle = currentAngle + diff * 6.0 * dt;
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wall collision
    const T = CONSTANTS.WALL_THICKNESS;
    if (this.x < T || this.x > CONSTANTS.ROOM_WIDTH - T || this.y < T || this.y > CONSTANTS.ROOM_HEIGHT - T) {
      this.onHitWall(room);
      return;
    }

    // Obstacle collision
    if (room && room.obstacles) {
      for (let obs of room.obstacles) {
        if (this.x >= obs.x && this.x <= obs.x + obs.w && this.y >= obs.y && this.y <= obs.y + obs.h) {
          if (obs.type === 'explosive_barrel') {
            obs.hp -= this.damage;
            if (obs.hp <= 0 && !obs.exploded) {
              obs.exploded = true;
              obs.hp = 0;
              this.detonateBarrel(obs, room);
            }
          }
          this.onHitWall(room);
          return;
        }
      }
    }

    // Entity collision
    if (room) {
      // Check player
      if (this.faction !== CONSTANTS.FACTIONS.PLAYER && window.gameInstance && window.gameInstance.player) {
        const player = window.gameInstance.player;
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
          player.takeDamage(this.damage, this);
          this.dead = true;
          return;
        }
      }

      // Check enemies
      if (room.enemies) {
        for (let enemy of room.enemies) {
          if (enemy.dead || enemy.faction === this.faction) continue;
          if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < enemy.radius + this.radius) {
            enemy.takeDamage(this.damage, this);
            if (window.gameInstance && window.gameInstance.player) {
              window.gameInstance.player.stats.damageDealt += this.damage;
            }

            // Spawn acid pool if caustic bile mutation is active
            if (this.leavesAcid && window.gameInstance) {
              room.hazards.push({
                x: this.x - 20,
                y: this.y - 20,
                w: 40,
                h: 40,
                type: 'acid_pool',
                duration: 5.0
              });
            }

            this.pierce--;
            if (this.pierce <= 0) {
              this.dead = true;
              break;
            }
          }
        }
      }
    }
  }

  onHitWall(room) {
    this.dead = true;
    if (this.leavesAcid && window.gameInstance && room) {
      room.hazards.push({
        x: this.x - 15,
        y: this.y - 15,
        w: 30,
        h: 30,
        type: 'acid_pool',
        duration: 4.0
      });
    }
  }

  detonateBarrel(barrel, room) {
    if (window.soundEngine) window.soundEngine.playExplosion();
    if (window.gameInstance) {
      window.gameInstance.screenShake(10, 0.3);
      window.gameInstance.addParticle(new Shockwave(barrel.x + barrel.w / 2, barrel.y + barrel.h / 2, 120, '#ff4400'));
      // Damage all entities in explosion radius
      const bx = barrel.x + barrel.w / 2;
      const by = barrel.y + barrel.h / 2;
      const radius = 120;

      if (room.enemies) {
        room.enemies.forEach(e => {
          if (Math.hypot(e.x - bx, e.y - by) < radius) {
            e.takeDamage(45, null);
          }
        });
      }
      const player = window.gameInstance.player;
      if (player && Math.hypot(player.x - bx, player.y - by) < radius) {
        player.takeDamage(2, null);
      }
    }
  }
}

// --- ENEMY BASE CLASS ---
class Enemy extends Entity {
  constructor(x, y, radius, faction) {
    super(x, y, radius, faction);
    this.isHacked = false;
    this.hackDuration = 0;
    this.target = null;
    this.attackTimer = 0;
    this.attackInterval = 1.5;
    this.stunTimer = 0;
    this.scoreValue = 100;
  }

  applyHack(duration) {
    this.isHacked = true;
    this.hackDuration = duration;
    this.faction = CONSTANTS.FACTIONS.PLAYER; // Now fights for player!
    this.color = '#00f0ff';
  }

  findTarget(room) {
    // Inter-faction targeting: target the closest entity of ANY opposing faction!
    let closest = null;
    let minDist = 9999;

    // Check Player if hostile
    if (this.faction !== CONSTANTS.FACTIONS.PLAYER && window.gameInstance && window.gameInstance.player) {
      const p = window.gameInstance.player;
      if (!p.dead) {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        minDist = d;
        closest = p;
      }
    }

    // Check other enemies in room
    if (room && room.enemies) {
      for (let other of room.enemies) {
        if (other === this || other.dead || other.faction === this.faction) continue;
        const d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < minDist) {
          minDist = d;
          closest = other;
        }
      }
    }

    return closest;
  }

  update(dt, room) {
    if (this.dead) return;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.vx = 0;
      this.vy = 0;
      super.update(dt, room);
      return;
    }

    // Handle Hack Duration
    if (this.isHacked) {
      this.hackDuration -= dt;
      if (this.hackDuration <= 0) {
        this.isHacked = false;
        this.faction = CONSTANTS.FACTIONS.ROBOT; // Revert back to original
        this.color = this.defaultColor || '#ffffff';
        if (window.gameInstance) {
          window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "HACK EXPIRADO", "#ffaa00"));
        }
      }
    }

    // Find and update target
    this.target = this.findTarget(room);

    this.attackTimer += dt;
    this.executeAI(dt, room);

    super.update(dt, room);
  }

  executeAI(dt, room) {
    // Override in specific enemy classes
  }

  onDeath(source) {
    if (window.gameInstance) {
      const p = window.gameInstance.player;
      if (p) {
        if (this.faction === CONSTANTS.FACTIONS.ALIEN) p.stats.aliensKilled++;
        if (this.faction === CONSTANTS.FACTIONS.ROBOT) p.stats.robotsKilled++;

        // Vampiric tendrils mutation
        if (p.mutations.vampiricTendrils) {
          p.vampireKillCounter++;
          if (p.vampireKillCounter >= p.vampireKillsNeeded) {
            p.vampireKillCounter = 0;
            p.hp = Math.min(p.maxHp, p.hp + 1);
            window.gameInstance.addParticle(new FloatingText(p.x, p.y - 20, "+1 HP (VAMPIRO)", "#39ff14"));
          }
        }

        // Spores mutation: explode into infectious spore cloud
        if (p.mutations.contagiousSpores) {
          window.gameInstance.addParticle(new Shockwave(this.x, this.y, 80, '#39ff14'));
          if (room && room.enemies) {
            room.enemies.forEach(e => {
              if (e !== this && !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 80) {
                e.takeDamage(12, p);
              }
            });
          }
        }
      }

      // Drop Loot!
      this.dropLoot(room);
    }
  }

  dropLoot(room) {
    if (!room) return;
    const roll = Math.random();

    // Scrap drop (currency)
    const scrapAmount = 1 + Math.floor(Math.random() * 3);
    room.pickups.push({
      x: this.x + (Math.random() - 0.5) * 20,
      y: this.y + (Math.random() - 0.5) * 20,
      radius: 8,
      type: 'scrap',
      amount: scrapAmount
    });

    // Health or Shield drop chance
    if (roll < 0.22) {
      room.pickups.push({
        x: this.x,
        y: this.y,
        radius: 10,
        type: Math.random() < 0.6 ? 'hp' : 'shield',
        amount: 1
      });
    }

    // Oxygen Tank drop in vacuum sectors
    if (room.vacuumBreach || (room.sector && room.sector.hasVacuum)) {
      if (Math.random() < 0.4) {
        room.pickups.push({
          x: this.x,
          y: this.y,
          radius: 10,
          type: 'o2',
          amount: 25
        });
      }
    }
  }
}

// --- SPECIFIC ENEMIES ---

// 1. Bio Swarmer (Fast alien insect)
class BioSwarmer extends Enemy {
  constructor(x, y) {
    super(x, y, 14, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 22;
    this.hp = 22;
    this.speed = 150;
    this.defaultColor = '#39ff14';
    this.color = this.defaultColor;
  }

  executeAI(dt, room) {
    if (!this.target) {
      this.vx *= 0.9;
      this.vy *= 0.9;
      return;
    }

    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Melee attack on contact
    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    if (dist < this.radius + this.target.radius + 4) {
      if (this.attackTimer >= 0.8) {
        this.attackTimer = 0;
        this.target.takeDamage(1, this);
      }
    }
  }
}

// 2. Bio Spitter (Ranged acid shooter)
class BioSpitter extends Enemy {
  constructor(x, y) {
    super(x, y, 18, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 35;
    this.hp = 35;
    this.speed = 90;
    this.defaultColor = '#7fff00';
    this.color = this.defaultColor;
    this.attackInterval = 2.0;
  }

  executeAI(dt, room) {
    if (!this.target) return;

    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    // Keep distance
    if (dist < 180) {
      this.vx = -Math.cos(angle) * this.speed;
      this.vy = -Math.sin(angle) * this.speed;
    } else if (dist > 300) {
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    // Shoot acid projectile
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const projSpeed = 340;
      room.projectiles.push(new Projectile(
        this.x, this.y,
        Math.cos(angle) * projSpeed, Math.sin(angle) * projSpeed,
        this.faction, 1, 'plasma', '#39ff14'
      ));
      if (window.soundEngine) window.soundEngine.playAlienSpit();
    }
  }
}

// 3. Bio Brood (Tanky spawner)
class BioBrood extends Enemy {
  constructor(x, y) {
    super(x, y, 24, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 65;
    this.hp = 65;
    this.speed = 60;
    this.defaultColor = '#228b22';
    this.color = this.defaultColor;
    this.attackInterval = 3.5;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Spawn tiny swarmer larvae periodically
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const larva = new BioSwarmer(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30);
      larva.hp = 12;
      larva.maxHp = 12;
      larva.radius = 10;
      room.enemies.push(larva);
      if (window.soundEngine) window.soundEngine.playAlienSpit();
    }
  }
}

// 4. Robo Drone (Recon pulse flyer) - HACKABLE
class RoboDrone extends Enemy {
  constructor(x, y) {
    super(x, y, 16, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 30;
    this.hp = 30;
    this.speed = 120;
    this.defaultColor = '#00f0ff';
    this.color = this.defaultColor;
    this.attackInterval = 1.4;
    this.strafeAngle = Math.random() * Math.PI * 2;
  }

  executeAI(dt, room) {
    if (!this.target) return;

    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    // Orbit/strafe around target
    this.strafeAngle += dt * 1.5;
    const targetX = this.target.x + Math.cos(this.strafeAngle) * 160;
    const targetY = this.target.y + Math.sin(this.strafeAngle) * 160;

    const moveAngle = Math.atan2(targetY - this.y, targetX - this.x);
    this.vx = Math.cos(moveAngle) * this.speed;
    this.vy = Math.sin(moveAngle) * this.speed;

    // Fire laser pulse
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      room.projectiles.push(new Projectile(
        this.x, this.y,
        Math.cos(angle) * 450, Math.sin(angle) * 450,
        this.faction, 1, 'plasma', this.isHacked ? '#00f0ff' : '#ff2a5f'
      ));
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// 5. Robo Sentry (Stationary / Heavy Turret) - HACKABLE
class RoboSentry extends Enemy {
  constructor(x, y) {
    super(x, y, 20, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 50;
    this.hp = 50;
    this.speed = 0; // Stationary
    this.defaultColor = '#4682b4';
    this.color = this.defaultColor;
    this.attackInterval = 2.2;
    this.turretAngle = 0;
  }

  executeAI(dt, room) {
    this.vx = 0;
    this.vy = 0;
    if (!this.target) return;

    this.turretAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    // Fires 3-way spread
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const spreads = [-0.25, 0, 0.25];
      spreads.forEach(s => {
        const a = this.turretAngle + s;
        room.projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(a) * 400, Math.sin(a) * 400,
          this.faction, 1, 'plasma', this.isHacked ? '#00f0ff' : '#ff2a5f'
        ));
      });
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// 6. Robo Roller (Fast explosive sphere) - HACKABLE
class RoboRoller extends Enemy {
  constructor(x, y) {
    super(x, y, 15, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 25;
    this.hp = 25;
    this.speed = 180;
    this.defaultColor = '#ff6347';
    this.color = this.defaultColor;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    if (dist < this.radius + this.target.radius + 6) {
      // Detonate self!
      this.dead = true;
      if (window.soundEngine) window.soundEngine.playExplosion();
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 90, '#ff4400'));
        this.target.takeDamage(2, this);
      }
    }
  }
}

// 7. Void Phantom (Cosmic phase entity)
class VoidPhantom extends Enemy {
  constructor(x, y) {
    super(x, y, 16, CONSTANTS.FACTIONS.VOID);
    this.maxHp = 40;
    this.hp = 40;
    this.speed = 100;
    this.defaultColor = '#bf55ec';
    this.color = this.defaultColor;
    this.attackInterval = 2.0;
    this.teleportTimer = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;

    this.teleportTimer += dt;
    if (this.teleportTimer > 4.5) {
      this.teleportTimer = 0;
      // Phase-teleport near target
      const offsetAngle = Math.random() * Math.PI * 2;
      this.x = Math.max(80, Math.min(CONSTANTS.ROOM_WIDTH - 80, this.target.x + Math.cos(offsetAngle) * 140));
      this.y = Math.max(80, Math.min(CONSTANTS.ROOM_HEIGHT - 80, this.target.y + Math.sin(offsetAngle) * 140));
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 60, '#bf55ec'));
      }
    }

    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      room.projectiles.push(new Projectile(
        this.x, this.y,
        Math.cos(angle) * 320, Math.sin(angle) * 320,
        this.faction, 1, 'plasma', '#bf55ec'
      ));
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// --- BOSSES ---

// BOSS 1: Gorgon-X / Bio-Core Primus
class BossGorgon extends Enemy {
  constructor(x, y) {
    super(x, y, 42, CONSTANTS.FACTIONS.ALIEN);
    this.isBoss = true;
    this.bossName = "GORGON-X: NÚCLEO BIÓTICO PRIMUS";
    this.maxHp = 380;
    this.hp = 380;
    this.speed = 70;
    this.defaultColor = '#39ff14';
    this.color = this.defaultColor;
    this.attackPhase = 0;
    this.phaseTimer = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    this.phaseTimer += dt;

    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Pattern 1: Radial Acid Volley every 2.8s
    if (this.phaseTimer >= 2.8) {
      this.phaseTimer = 0;
      this.attackPhase = (this.attackPhase + 1) % 3;

      if (this.attackPhase === 0) {
        // 8-way radial acid blast
        const bullets = 10;
        for (let i = 0; i < bullets; i++) {
          const a = (i / bullets) * Math.PI * 2;
          room.projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(a) * 280, Math.sin(a) * 280,
            this.faction, 1, 'plasma', '#39ff14'
          ));
        }
        if (window.soundEngine) window.soundEngine.playBossRoar();
      } else if (this.attackPhase === 1) {
        // Lunge forward
        this.vx = Math.cos(angle) * 380;
        this.vy = Math.sin(angle) * 380;
      } else {
        // Spawn 2 Swarmer minions
        if (room.enemies.length < 6) {
          room.enemies.push(new BioSwarmer(this.x + 40, this.y));
          room.enemies.push(new BioSwarmer(this.x - 40, this.y));
        }
      }
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.soundEngine) window.soundEngine.playBossRoar();
    if (window.gameInstance) {
      window.gameInstance.onBossDefeated();
    }
  }
}

// BOSS 2: Titan-Omega / Mech Overlord
class BossTitan extends Enemy {
  constructor(x, y) {
    super(x, y, 45, CONSTANTS.FACTIONS.ROBOT);
    this.isBoss = true;
    this.bossName = "TITAN-OMEGA: GUARDIÃO MECÂNICO";
    this.maxHp = 520;
    this.hp = 520;
    this.speed = 50;
    this.defaultColor = '#00f0ff';
    this.color = this.defaultColor;
    this.attackPhase = 0;
    this.phaseTimer = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    this.phaseTimer += dt;

    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.phaseTimer >= 2.5) {
      this.phaseTimer = 0;
      this.attackPhase = (this.attackPhase + 1) % 3;

      if (this.attackPhase === 0) {
        // Homing missile barrage
        for (let i = -1; i <= 1; i++) {
          const m = new Projectile(
            this.x, this.y,
            Math.cos(angle + i * 0.4) * 220, Math.sin(angle + i * 0.4) * 220,
            this.faction, 1, 'missile', '#ff2a5f'
          );
          m.homing = true;
          room.projectiles.push(m);
        }
        if (window.soundEngine) window.soundEngine.playShoot('missile');
      } else if (this.attackPhase === 1) {
        // 5-way concentrated laser spread
        for (let i = -2; i <= 2; i++) {
          room.projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(angle + i * 0.2) * 500, Math.sin(angle + i * 0.2) * 500,
            this.faction, 1, 'plasma', '#00f0ff'
          ));
        }
        if (window.soundEngine) window.soundEngine.playShoot('plasma');
      } else {
        // Shockwave Stomp
        if (window.gameInstance) {
          window.gameInstance.addParticle(new Shockwave(this.x, this.y, 180, '#00f0ff'));
          window.gameInstance.screenShake(8, 0.3);
        }
        if (window.soundEngine) window.soundEngine.playExplosion();
      }
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.soundEngine) window.soundEngine.playBossRoar();
    if (window.gameInstance) {
      window.gameInstance.onBossDefeated();
    }
  }
}

// BOSS 3: Entropia / Reator do Vácuo
class BossEntropia extends Enemy {
  constructor(x, y) {
    super(x, y, 48, CONSTANTS.FACTIONS.VOID);
    this.isBoss = true;
    this.bossName = "ENTROPIA: REATOR DE MATÉRIA ESCURA";
    this.maxHp = 680;
    this.hp = 680;
    this.speed = 40;
    this.defaultColor = '#bf55ec';
    this.color = this.defaultColor;
    this.phaseTimer = 0;
    this.spiralAngle = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    this.phaseTimer += dt;
    this.spiralAngle += dt * 4;

    // Fire continuous spiral of void orbs
    if (Math.random() < 0.35) {
      room.projectiles.push(new Projectile(
        this.x, this.y,
        Math.cos(this.spiralAngle) * 260, Math.sin(this.spiralAngle) * 260,
        this.faction, 1, 'plasma', '#bf55ec'
      ));
    }

    if (this.phaseTimer >= 3.2) {
      this.phaseTimer = 0;
      // Gravitational Vortex Pull
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 250, '#bf55ec'));
        const p = window.gameInstance.player;
        if (p) {
          const pullAngle = Math.atan2(this.y - p.y, this.x - p.x);
          p.vx += Math.cos(pullAngle) * 350;
          p.vy += Math.sin(pullAngle) * 350;
        }
      }
      if (window.soundEngine) window.soundEngine.playBossRoar();
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.gameInstance) {
      window.gameInstance.onFinalVictory();
    }
  }
}

// --- PARTICLE SYSTEMS & VISUAL FX ---

class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 25 * dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y, maxRadius, color = '#00f0ff') {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = 0.4;
    this.maxLife = 0.4;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    const progress = 1 - (this.life / this.maxLife);
    this.radius = 5 + progress * this.maxRadius;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class TentacleWhip {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.life = 0.25;
    this.maxLife = 0.25;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    const midX = (this.x1 + this.x2) / 2 + (Math.random() - 0.5) * 40;
    const midY = (this.y1 + this.y2) / 2 + (Math.random() - 0.5) * 40;
    ctx.quadraticCurveTo(midX, midY, this.x2, this.y2);
    ctx.stroke();
    ctx.restore();
  }
}

class FireParticle extends Particle {
  constructor(x, y) {
    super(x, y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, '#ff4400', 5, 0.4);
  }
}

// Global exports
window.Entity = Entity;
window.Player = Player;
window.Projectile = Projectile;
window.Enemy = Enemy;
window.BioSwarmer = BioSwarmer;
window.BioSpitter = BioSpitter;
window.BioBrood = BioBrood;
window.RoboDrone = RoboDrone;
window.RoboSentry = RoboSentry;
window.RoboRoller = RoboRoller;
window.VoidPhantom = VoidPhantom;
window.BossGorgon = BossGorgon;
window.BossTitan = BossTitan;
window.BossEntropia = BossEntropia;
window.Particle = Particle;
window.FloatingText = FloatingText;
window.Shockwave = Shockwave;
window.TentacleWhip = TentacleWhip;
window.FireParticle = FireParticle;
