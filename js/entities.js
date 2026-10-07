/**
 * TecnoBound - Entities, Projectiles, Particles, AI Enemies, Bosses and Player
 */

// ==========================================
// 1. BASE ENTITY
// ==========================================
class Entity {
  constructor(x, y, radius, faction) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    // Collision radius is gameplay-only and must never be used for rendering.
    // Keeping it separate prevents the enemy hitbox from visually covering the sprite.
    this.hitRadius = Math.max(4, radius * 0.78);
    this.faction = faction;
    this.maxHp = 10;
    this.hp = 10;
    this.dead = false;
    this.invulnTimer = 0;
    this.flashTimer = 0;
    this.color = '#ffffff';
    this.contactDamage = 1;
    this.isHacked = false;
    // Damage/death guards prevent re-entrant damage callbacks from creating
    // recursive death/effect chains during the same frame.
    this.damageProcessing = false;
    this.deathProcessed = false;
  }

  takeDamage(amount, source) {
    // Never allow invalid or re-entrant damage to destabilize the game loop.
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (this.invulnTimer > 0 || this.dead || this.damageProcessing) return false;

    this.damageProcessing = true;
    try {
      this.hp = Number.isFinite(this.hp) ? this.hp : this.maxHp;
      this.hp -= amount;
      this.flashTimer = 0.15;

      // Audio must never be able to break gameplay. SoundEngine also throttles
      // hit SFX, which prevents a dense bullet stream from creating too many
      // Web Audio nodes in a single frame.
      try {
        if (window.soundEngine) {
          const hitType = this.faction === CONSTANTS.FACTIONS.ROBOT ? 'robot' : 'alien';
          window.soundEngine.playHit(hitType);
        }
      } catch (audioError) {
        // Audio is optional; gameplay must continue if Web Audio fails.
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;

        // onDeath must run exactly once, even if another effect tries to damage
        // this entity during the same call stack.
        if (!this.deathProcessed) {
          this.deathProcessed = true;
          try {
            this.onDeath(source);
          } catch (deathError) {
            // Do not let a cosmetic/drop/death-side-effect crash the game loop.
            console.error('TecnoBound: enemy death handler failed safely.', deathError);
          }
        }
      }
      return true;
    } finally {
      this.damageProcessing = false;
    }
  }

  onDeath(source) {}

  update(dt, room) {
    // Coordinate NaN safety
    if (isNaN(this.x) || isNaN(this.y)) {
      this.x = CONSTANTS.ROOM_WIDTH / 2;
      this.y = CONSTANTS.ROOM_HEIGHT / 2;
      this.vx = 0;
      this.vy = 0;
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Friction dampening
    this.vx *= 0.95;
    this.vy *= 0.95;

    // Room Wall Collisions
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

    // Room Obstacle Collisions
    if (room && room.obstacles) {
      for (let obs of room.obstacles) {
        this.resolveObstacle(obs);
      }
    }
  }

  resolveObstacle(obs) {
    if (!obs) return;
    const safetyMargin = 1.5;

    // Detect if entity center is inside the obstacle bounding box
    const insideX = this.x >= obs.x && this.x <= obs.x + obs.w;
    const insideY = this.y >= obs.y && this.y <= obs.y + obs.h;

    if (insideX && insideY) {
      // Entity center is trapped inside the obstacle!
      // Push the entity out towards the closest edge with a safe margin
      const distLeft = this.x - obs.x;
      const distRight = (obs.x + obs.w) - this.x;
      const distTop = this.y - obs.y;
      const distBottom = (obs.y + obs.h) - this.y;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      if (minDist === distLeft) {
        this.x = obs.x - this.radius - safetyMargin;
        if (this.vx > 0) this.vx = 0;
      } else if (minDist === distRight) {
        this.x = obs.x + obs.w + this.radius + safetyMargin;
        if (this.vx < 0) this.vx = 0;
      } else if (minDist === distTop) {
        this.y = obs.y - this.radius - safetyMargin;
        if (this.vy > 0) this.vy = 0;
      } else {
        this.y = obs.y + obs.h + this.radius + safetyMargin;
        if (this.vy < 0) this.vy = 0;
      }
      return;
    }

    // Entity center is outside: standard circle-AABB separation
    const closestX = Math.max(obs.x, Math.min(this.x, obs.x + obs.w));
    const closestY = Math.max(obs.y, Math.min(this.y, obs.y + obs.h));
    const distX = this.x - closestX;
    const distY = this.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < this.radius * this.radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = this.radius - dist + safetyMargin;
        const nx = distX / dist;
        const ny = distY / dist;
        this.x += nx * overlap;
        this.y += ny * overlap;

        // Dampen velocity pointing directly into the obstacle
        const dot = this.vx * nx + this.vy * ny;
        if (dot < 0) {
          this.vx -= dot * nx;
          this.vy -= dot * ny;
        }
      } else {
        // Fallback: nudge out towards nearest edge
        this.x += (Math.random() - 0.5) * 4;
        this.y += (Math.random() - 0.5) * 4;
      }
    }
  }
}

// ==========================================
// 2. PROJECTILE CLASS
// ==========================================
class Projectile {
  constructor(x, y, vx, vy, faction, damage, type = 'plasma', color = '#00f0ff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.faction = faction;
    this.damage = damage;
    this.type = type; // 'plasma', 'scatter', 'rail', 'missile', 'lightning'
    this.color = color;
    this.radius = type === 'voidblackhole' ? 7 : (type === 'missile' ? 6 : (type === 'rail' ? 4 : 5));
    this.life = type === 'voidblackhole' ? 4.0 : (type === 'rail' ? 1.0 : (type === 'scatter' ? 0.45 : 2.5));
    this.maxLife = this.life;
    this.dead = false;
    this.pierce = false;
    this.piercesLeft = 3;
    this.homing = false;
    this.chainTargets = 0;
    this.leavesAcid = false;
    this.owner = null;
    this.hitTargets = new Set(); // Prevent damaging the same target multiple times
    this.stuckTarget = null;
    this.tickTimer = 0;
  }

  update(dt, room) {
    if (this.dead) return;

    // VOIDBOUND: once attached, the projectile becomes a tiny orbiting singularity.
    if (this.type === 'voidblackhole' && this.stuckTarget) {
      if (this.stuckTarget.dead) {
        this.dead = true;
        return;
      }
      this.x = this.stuckTarget.x;
      this.y = this.stuckTarget.y;
      this.life -= dt;
      this.tickTimer += dt;
      if (this.tickTimer >= 0.28) {
        this.tickTimer = 0;
        this.stuckTarget.takeDamage(this.damage, this.owner);
        if (window.gameInstance) {
          window.gameInstance.addParticle(new Particle(this.x + (Math.random()-0.5)*12, this.y + (Math.random()-0.5)*12, 0, 0, '#d8d8e8', 2, 0.18));
        }
      }
      if (this.life <= 0) this.dead = true;
      return;
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    // Homing Steering
    if (this.homing && room) {
      let target = null;
      let minDist = 320;
      const candidates = [...(room.enemies || [])];
      if (window.gameInstance?.player) candidates.push(window.gameInstance.player);

      for (let cand of candidates) {
        if (cand.dead || !window.areHostile(this, cand)) continue;
        const d = Math.hypot(cand.x - this.x, cand.y - this.y);
        if (d < minDist) {
          minDist = d;
          target = cand;
        }
      }

      if (target) {
        const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const currentSpeed = Math.hypot(this.vx, this.vy) || 380;
        this.vx += Math.cos(targetAngle) * 900 * dt;
        this.vy += Math.sin(targetAngle) * 900 * dt;
        const newSpeed = Math.hypot(this.vx, this.vy);
        if (newSpeed > 0) {
          this.vx = (this.vx / newSpeed) * currentSpeed;
          this.vy = (this.vy / newSpeed) * currentSpeed;
        }
      }
    }

    // Keep the previous position so fast projectiles cannot tunnel through
    // the player/enemies between frames.
    const prevX = this.x;
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Room Wall Collision
    const T = CONSTANTS.WALL_THICKNESS;
    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;

    if (this.x < T || this.x > W - T || this.y < T || this.y > H - T) {
      this.dead = true;
      if (this.leavesAcid && room) {
        room.hazards.push({
          x: Math.max(T + 10, Math.min(W - T - 30, this.x - 14)),
          y: Math.max(T + 10, Math.min(H - T - 30, this.y - 14)),
          w: 28,
          h: 28,
          type: 'acid_pool',
          duration: 3.5
        });
      }
      return;
    }

    // Obstacle Collision
    if (room && room.obstacles) {
      for (let obs of room.obstacles) {
        if (obs.type === 'pillar' || obs.type === 'terminal' || obs.type === 'pedestal' || obs.type === 'mutagen_pod' || obs.type.startsWith('shop_')) {
          if (this.x >= obs.x && this.x <= obs.x + obs.w &&
              this.y >= obs.y && this.y <= obs.y + obs.h) {
            this.dead = true;
            return;
          }
        }
      }
    }

    // Entity Collision Detection. Use swept-circle tests so fast projectiles
    // cannot pass through a target between two frames. Enemy projectiles must
    // also test the player explicitly; previously this loop only considered
    // room.enemies, which made several hostile projectile types miss the player.
    const targets = [];
    const enemies = room?.enemies || [];
    for (let i = 0; i < enemies.length; i++) {
      const target = enemies[i];
      if (target) targets.push(target);
    }

    const player = window.gameInstance?.player;
    if (player && !player.dead) targets.push(player);

    const segmentPointDistanceSq = (ax, ay, bx, by, px, py) => {
      const abx = bx - ax;
      const aby = by - ay;
      const lenSq = abx * abx + aby * aby;
      if (lenSq <= 0.000001) {
        const dx = px - ax;
        const dy = py - ay;
        return dx * dx + dy * dy;
      }
      const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
      const cx = ax + abx * t;
      const cy = ay + aby * t;
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy;
    };

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target || target.dead || !window.areHostile(this, target)) continue;
      if (this.hitTargets.has(target)) continue;

      // Player projectiles use a swept AABB test because the player is a square,
      // not a circle. This also fixes fast hostile projectiles tunneling through
      // the corners/edges of the player between frames.
      let hit = false;
      if (target === player) {
        const half = Number.isFinite(player.halfSize) ? player.halfSize : (player.radius || 16);
        const minX = target.x - half - this.radius;
        const maxX = target.x + half + this.radius;
        const minY = target.y - half - this.radius;
        const maxY = target.y + half + this.radius;

        // Segment vs expanded player AABB using slab intersection.
        const dx = this.x - prevX;
        const dy = this.y - prevY;
        let tMin = 0;
        let tMax = 1;
        const axisCheck = (start, delta, min, max) => {
          if (Math.abs(delta) < 0.000001) return start >= min && start <= max;
          let t1 = (min - start) / delta;
          let t2 = (max - start) / delta;
          if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
          tMin = Math.max(tMin, t1);
          tMax = Math.min(tMax, t2);
          return tMin <= tMax;
        };

        hit = axisCheck(prevX, dx, minX, maxX) && axisCheck(prevY, dy, minY, maxY);
      } else {
        const hitRadius = this.radius + (target.hitRadius ?? target.radius ?? 0);
        const hitRadiusSq = hitRadius * hitRadius;
        const distanceSq = segmentPointDistanceSq(
          prevX, prevY, this.x, this.y, target.x, target.y
        );
        hit = distanceSq < hitRadiusSq;
      }

      if (hit) {
        // VÓRTICE absorption phase: player shots are swallowed by the rotating
        // aura and returned toward the player as hostile projectiles.
        if (target instanceof BossVortex && target.absorbing && this.faction === CONSTANTS.FACTIONS.PLAYER) {
          const playerTarget = window.gameInstance?.player;
          this.faction = CONSTANTS.FACTIONS.VOID;
          this.owner = target;
          this.color = '#050509';
          this.hitTargets.clear();
          if (playerTarget) {
            const a = Math.atan2(playerTarget.y - target.y, playerTarget.x - target.x);
            const speed = Math.max(300, Math.hypot(this.vx, this.vy) * 0.95);
            this.x = target.x + Math.cos(a) * (target.radius + 10);
            this.y = target.y + Math.sin(a) * (target.radius + 10);
            this.vx = Math.cos(a) * speed;
            this.vy = Math.sin(a) * speed;
          }
          this.life = 2.2;
          if (window.gameInstance) window.gameInstance.addParticle(new Shockwave(target.x, target.y, 30, '#11111a', 0.18));
          continue;
        }

        // VOIDBOUND projectile attaches instead of disappearing on impact.
        if (this.type === 'voidblackhole' && target !== window.gameInstance?.player) {
          this.hitTargets.add(target);
          this.stuckTarget = target;
          this.x = target.x;
          this.y = target.y;
          this.vx = 0;
          this.vy = 0;
          this.life = 4.0;
          this.tickTimer = 0;
          if (window.gameInstance) window.gameInstance.addParticle(new Shockwave(target.x, target.y, 22, '#d8d8e8', 0.2));
          break;
        }

        // Register before side effects to prevent recursive/re-entrant hits.
        this.hitTargets.add(target);
        const hit = target.takeDamage(this.damage, this.owner);

        // Projectiles belonging to hostile entities are consumed when they
        // physically hit the player, even if the player is temporarily
        // invulnerable. This prevents the same projectile from lingering on
        // the player's hitbox and producing repeated collision checks.
        const hitPlayer = target === player;
        if (hitPlayer) {
          this.dead = true;
          break;
        }

        if (!hit) {
          this.hitTargets.delete(target);
          continue;
        }

        if (this.type === 'missile') {
          try {
            if (window.soundEngine) window.soundEngine.playExplosion();
          } catch (e) {}
          const splashRadius = 48;
          const splashTarget = window.gameInstance?.player;
          if (splashTarget && splashTarget !== target && !splashTarget.dead && window.areHostile(this, splashTarget)) {
            if (Math.hypot(splashTarget.x - this.x, splashTarget.y - this.y) <= splashRadius) {
              splashTarget.takeDamage(Math.max(1, Math.round(this.damage * 0.75)), this.owner || this);
            }
          }
          if (window.gameInstance) {
            window.gameInstance.addParticle(new Shockwave(this.x, this.y, 75, '#ffaa00'));
            window.gameInstance.addParticle(new Shockwave(this.x, this.y, 38, '#ef4444', 0.2));
            window.gameInstance.screenShake(4, 0.15);
          }
        }

        // Tesla Chain Lightning Propagation
        if (this.chainTargets > 0 || this.type === 'lightning') {
          this.triggerChainLightning(target, room);
        }

        if (this.leavesAcid && room && Array.isArray(room.hazards)) {
          room.hazards.push({
            x: target.x - 15,
            y: target.y - 15,
            w: 30,
            h: 30,
            type: 'acid_pool',
            duration: 3.5
          });
        }

        // Piercing projectiles consume one pierce per unique target.
        if (this.pierce && this.piercesLeft > 1) {
          this.piercesLeft--;
        } else {
          this.dead = true;
          break;
        }
      }
    }
  }

  triggerChainLightning(primaryTarget, room) {
    if (!room || !primaryTarget) return;
    const maxChains = this.chainTargets > 0 ? this.chainTargets : 3;
    const chained = new Set([primaryTarget]);
    let currentSource = primaryTarget;
    const chainRange = 220;
    const chainDmg = Math.max(2, Math.round(this.damage * 0.75));

    for (let c = 0; c < maxChains; c++) {
      let nextTarget = null;
      let minDist = chainRange;

      const candidates = [...(room.enemies || [])];
      if (window.gameInstance?.player) candidates.push(window.gameInstance.player);

      for (let cand of candidates) {
        if (cand.dead || chained.has(cand) || !window.areHostile(this, cand)) continue;
        const d = Math.hypot(cand.x - currentSource.x, cand.y - currentSource.y);
        if (d < minDist) {
          minDist = d;
          nextTarget = cand;
        }
      }

      if (!nextTarget) break;

      // Register chained targets globally for this projectile as well as in
      // the local chain set, preventing duplicate damage/loops.
      if (this.hitTargets.has(nextTarget)) break;
      this.hitTargets.add(nextTarget);
      nextTarget.takeDamage(chainDmg, this.owner);
      chained.add(nextTarget);

      // Render lightning arc connection
      if (window.gameInstance) {
        window.gameInstance.addParticle(new LightningArc(
          currentSource.x, currentSource.y,
          nextTarget.x, nextTarget.y,
          '#00f0ff', 0.22
        ));
      }

      currentSource = nextTarget;
    }

    if (chained.size > 1 && window.soundEngine) {
      window.soundEngine.playShoot('lightning');
    }
  }
}

// ==========================================
// 3. PARTICLES & RETRO FX
// ==========================================
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
    this.vx *= 0.92;
    this.vy *= 0.92;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - this.size / 2), Math.round(this.y - this.size / 2), this.size, this.size);
    ctx.restore();
  }
}

class FireParticle extends Particle {
  constructor(x, y) {
    const vx = (Math.random() - 0.5) * 40;
    const vy = (Math.random() - 0.5) * 40;
    const color = Math.random() < 0.5 ? '#ffaa00' : '#ff2a5f';
    super(x, y, vx, vy, color, 4, 0.35);
  }

  update(dt) {
    super.update(dt);
    this.size = Math.max(1, 4 * (this.life / this.maxLife));
  }
}

class Shockwave {
  constructor(x, y, maxRadius, color = '#00f0ff', duration = 0.35) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = duration;
    this.maxLife = duration;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    const progress = 1 - (this.life / this.maxLife);
    this.radius = 4 + progress * (this.maxRadius - 4);
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffffff', duration = 0.85) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = duration;
    this.maxLife = duration;
    this.dead = false;
    this.vy = -35;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.y += this.vy * dt;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, Math.round(this.x), Math.round(this.y));
    ctx.restore();
  }
}

class LightningArc {
  constructor(x1, y1, x2, y2, color = '#00f0ff', duration = 0.22) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.life = duration;
    this.maxLife = duration;
    this.dead = false;

    // Precalculate jittered segment points once for speed
    this.points = [];
    const segments = 6;
    const perpAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const jitter = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 18;
      this.points.push({
        x: bx + Math.cos(perpAngle) * jitter,
        y: by + Math.sin(perpAngle) * jitter
      });
    }
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    this.points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
    ctx.restore();
  }
}

// ==========================================
// 4. ENEMY BASE CLASS & INTER-FACTION AI
// ==========================================
class Enemy extends Entity {
  constructor(x, y, radius, faction) {
    super(x, y, radius, faction);
    this.originalFaction = faction;
    this.isHacked = false;
    this.hackDuration = 0;
    this.attackTimer = Math.random() * 2;
    this.attackInterval = 2.0;
    this.target = null;
    this.speed = 100;
    this.isBoss = false;
    this.stunTimer = 0;
  }

  applyHack(duration) {
    if (this.isBoss) return; // Bosses are immune to EMP takeover
    this.isHacked = true;
    this.hackDuration = duration;
    this.faction = CONSTANTS.FACTIONS.PLAYER;
  }

  findTarget(room) {
    let closest = null;
    let minDist = 9999;

    const candidates = [...(room?.enemies || [])];
    if (window.gameInstance?.player) candidates.push(window.gameInstance.player);

    for (let other of candidates) {
      if (other === this || other.dead || !window.areHostile(this, other)) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = other;
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

    if (this.isHacked) {
      this.hackDuration -= dt;
      if (this.hackDuration <= 0) {
        this.isHacked = false;
        this.faction = this.originalFaction || CONSTANTS.FACTIONS.ROBOT;
        if (window.gameInstance) {
          window.gameInstance.addParticle(new FloatingText(this.x, this.y - 20, "HACK EXPIRADO", "#f59e0b"));
        }
      }
    }

    this.target = this.findTarget(room);
    this.attackTimer += dt;
    this.executeAI(dt, room);
    super.update(dt, room);
  }

  executeAI(dt, room) {}

  onDeath(source) {
    const game = window.gameInstance;
    // Resolve the current room once at the start of the death handler.
    // This must remain in scope for drops, mutation effects and boss cleanup.
    const room = game?.dungeon?.currentRoom;
    if (game) {
      // Death explosion particles
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        game.addParticle(new Particle(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, this.color, 3, 0.4));
      }

      const p = game.player;
      if (p) {
        if (this.faction === CONSTANTS.FACTIONS.ALIEN) p.stats.aliensKilled++;
        if (this.faction === CONSTANTS.FACTIONS.ROBOT) p.stats.robotsKilled++;

        // Vampiric Tendrils Mutation
        if (p.mutations.vampiricTendrils && p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          game.addParticle(new FloatingText(p.x, p.y - 25, "+1 HP VAMPIRO", "#ff2a5f"));
        }

        // Contagious Spores Mutation
        if (p.mutations.contagiousSpores) {
          if (room) {
            room.hazards.push({
              x: this.x - 22,
              y: this.y - 22,
              w: 44,
              h: 44,
              type: 'acid_pool',
              duration: 4.5
            });
            game.addParticle(new Shockwave(this.x, this.y, 50, '#22c55e'));
          }
        }

        // GOLDEN ENEMY EASTER EGG: guaranteed special reward.
        // This is after mutation effects so golden enemies still interact
        // correctly with the player's existing mutations.
        if (this.isGolden && !this.isBoss) {
          const goldenScrap = 10 + Math.floor(Math.random() * 11); // 10-20
          room.pickups.push({ x: this.x - 16, y: this.y, type: 'scrap', amount: goldenScrap, size: 8 });
          room.pickups.push({ x: this.x + 16, y: this.y - 4, type: 'o2', amount: 30, size: 8 });
          room.pickups.push({ x: this.x, y: this.y + 16, type: 'hp', amount: 1, size: 8 });
          game.addParticle(new FloatingText(this.x, this.y - 28, 'TESOURO DOURADO', '#facc15', 1.2));
          game.addParticle(new Shockwave(this.x, this.y, 46, '#facc15', 0.4));
          if (window.soundEngine) window.soundEngine.playPickup('golden');
          return;
        }

        // Drops
        if (!room) return;
        const dropRoll = Math.random();
        if (dropRoll < 0.5) {
          const scrapAmt = this.isBoss ? 50 : (Math.floor(Math.random() * 4) + 2);
          room.pickups.push({ x: this.x, y: this.y, type: 'scrap', amount: scrapAmt, size: 8 });
        } else if (dropRoll < 0.65) {
          room.pickups.push({ x: this.x, y: this.y, type: 'hp', amount: 1, size: 8 });
        } else if (dropRoll < 0.78) {
          room.pickups.push({ x: this.x, y: this.y, type: 'shield', amount: 1, size: 8 });
        } else if (dropRoll < 0.90 && game.sector.hasVacuum) {
          room.pickups.push({ x: this.x, y: this.y, type: 'o2', amount: 30, size: 8 });
        }
      }
    }
  }
}

// ==========================================
// 5. REGULAR ENEMY TYPES
// ==========================================

// Sector 1: Alien Bio-Swarmer
class BioSwarmer extends Enemy {
  constructor(x, y) {
    super(x, y, 14, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 14;
    this.hp = 14;
    this.speed = 150;
    this.color = '#39ff14';
    this.contactDamage = 1;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }
}

// Sector 1: Alien Bio-Spitter
class BioSpitter extends Enemy {
  constructor(x, y) {
    super(x, y, 18, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 22;
    this.hp = 22;
    this.speed = 75;
    this.color = '#22c55e';
    this.contactDamage = 1;
    this.attackInterval = 2.2;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    // Maintain distance
    if (dist > 230) {
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    } else if (dist < 140) {
      this.vx = -Math.cos(angle) * this.speed;
      this.vy = -Math.sin(angle) * this.speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const projSpeed = 280;
      const proj = new Projectile(
        this.x, this.y,
        Math.cos(angle) * projSpeed, Math.sin(angle) * projSpeed,
        this.faction, 1, 'plasma', '#39ff14'
      );
      proj.owner = this;
      room.projectiles.push(proj);
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// Sector 1: Alien Bio-Brood
class BioBrood extends Enemy {
  constructor(x, y) {
    super(x, y, 24, CONSTANTS.FACTIONS.ALIEN);
    this.maxHp = 45;
    this.hp = 45;
    this.speed = 45;
    this.color = '#15803d';
    this.contactDamage = 2;
    this.attackInterval = 4.0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval && room.enemies.length < 8) {
      this.attackTimer = 0;
      const swarmer = new BioSwarmer(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30);
      room.enemies.push(swarmer);
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 40, '#39ff14'));
      }
    }
  }
}

// Sector 2: Robo-Drone
class RoboDrone extends Enemy {
  constructor(x, y) {
    super(x, y, 16, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 18;
    this.hp = 18;
    this.speed = 120;
    this.color = '#00f0ff';
    this.contactDamage = 1;
    this.attackInterval = 1.8;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    // Orbiting strafe
    const perpAngle = angle + Math.PI / 2;
    this.vx = Math.cos(perpAngle) * this.speed * 0.7 + (dist > 180 ? Math.cos(angle) * 40 : 0);
    this.vy = Math.sin(perpAngle) * this.speed * 0.7 + (dist > 180 ? Math.sin(angle) * 40 : 0);

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const projSpeed = 330;
      const proj = new Projectile(
        this.x, this.y,
        Math.cos(angle) * projSpeed, Math.sin(angle) * projSpeed,
        this.faction, 1, 'plasma', this.isHacked ? '#00f0ff' : '#ff2a5f'
      );
      proj.owner = this;
      room.projectiles.push(proj);
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// Sector 2: Robo-Sentry
class RoboSentry extends Enemy {
  constructor(x, y) {
    super(x, y, 20, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 35;
    this.hp = 35;
    this.speed = 0; // Stationary
    this.color = '#38bdf8';
    this.contactDamage = 1;
    this.attackInterval = 2.4;
  }

  executeAI(dt, room) {
    this.vx = 0;
    this.vy = 0;
    if (!this.target) return;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const baseAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      [-0.25, 0, 0.25].forEach(offset => {
        const a = baseAngle + offset;
        const proj = new Projectile(
          this.x, this.y,
          Math.cos(a) * 310, Math.sin(a) * 310,
          this.faction, 1, 'plasma', this.isHacked ? '#00f0ff' : '#ff2a5f'
        );
        proj.owner = this;
        room.projectiles.push(proj);
      });
      if (window.soundEngine) window.soundEngine.playShoot('scatter');
    }
  }
}

// Sector 2: Robo-Roller (Heavy Rammer)
class RoboRoller extends Enemy {
  constructor(x, y) {
    super(x, y, 18, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 38;
    this.hp = 38;
    this.speed = 70;
    this.color = '#0284c7';
    this.contactDamage = 2;
    this.isCharging = false;
    this.chargeTimer = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;

    if (this.isCharging) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        this.speed = 70;
      }
    } else {
      const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
      const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      if (dist < 200 && this.attackTimer >= 3.0) {
        this.attackTimer = 0;
        this.isCharging = true;
        this.chargeTimer = 1.0;
        this.speed = 280;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        if (window.soundEngine) window.soundEngine.playDash();
      } else {
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
      }
    }
  }
}

// Sector 4: Red Core Bombardier - heavy explosive ranged unit
class CoreBombardier extends Enemy {
  constructor(x, y) {
    super(x, y, 24, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 58;
    this.hp = 58;
    this.speed = 34;
    this.color = '#ef4444';
    this.contactDamage = 2;
    this.attackInterval = 2.0;
  }

  applyHack(duration) {
    // Heavy Core Bombardiers are sealed against EMP takeover.
    return;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

    if (dist > 290) {
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    } else if (dist < 210) {
      this.vx = -Math.cos(angle) * this.speed * 0.8;
      this.vy = -Math.sin(angle) * this.speed * 0.8;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const proj = new Projectile(
        this.x, this.y,
        Math.cos(angle) * 235, Math.sin(angle) * 235,
        this.faction, 2, 'missile', '#ffcc33'
      );
      proj.owner = this;
      proj.homing = false;
      room.projectiles.push(proj);
      if (window.soundEngine) window.soundEngine.playShoot('missile');
    }
  }
}

// Sector 4: Core Kamikaze - fast explosive hunter, EMP-hackable
class CoreKamikaze extends Enemy {
  constructor(x, y) {
    super(x, y, 13, CONSTANTS.FACTIONS.ROBOT);
    this.maxHp = 20;
    this.hp = 20;
    this.speed = 205;
    this.color = '#ef4444';
    this.contactDamage = 1;
    this.isKamikaze = true;
    this.detonated = false;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const speed = this.isHacked ? this.speed * 0.72 : this.speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  detonate(finalizeDeath = true) {
    if (this.detonated) return;
    this.detonated = true;
    const game = window.gameInstance;
    const player = game?.player;
    const radius = 62;
    if (player && !player.dead) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d <= radius && window.areHostile(this, player)) player.takeDamage(2, this);
    }
    if (game) {
      game.addParticle(new Shockwave(this.x, this.y, radius, '#ffcc33', 0.32));
      game.addParticle(new Shockwave(this.x, this.y, radius * 0.62, '#ef4444', 0.22));
      game.screenShake(4, 0.16);
    }
    if (window.soundEngine) window.soundEngine.playExplosion();
    this.dead = true;
    if (finalizeDeath && !this.deathProcessed) {
      this.deathProcessed = true;
      super.onDeath(this);
    }
  }

  onDeath(source) {
    if (!this.detonated) this.detonate(false);
    super.onDeath(source);
  }
}

// Sector 3: Void Phantom
class VoidPhantom extends Enemy {
  constructor(x, y) {
    super(x, y, 16, CONSTANTS.FACTIONS.VOID);
    this.maxHp = 28;
    this.hp = 28;
    this.speed = 85;
    this.color = '#bf55ec';
    this.contactDamage = 1;
    this.teleportTimer = 0;
    this.attackInterval = 2.0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    this.teleportTimer += dt;

    if (this.teleportTimer >= 3.5) {
      this.teleportTimer = 0;
      const ang = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 80;
      this.x = Math.max(80, Math.min(CONSTANTS.ROOM_WIDTH - 80, this.target.x + Math.cos(ang) * dist));
      this.y = Math.max(80, Math.min(CONSTANTS.ROOM_HEIGHT - 80, this.target.y + Math.sin(ang) * dist));
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 45, '#bf55ec'));
      }
    }

    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const projSpeed = 310;
      const proj = new Projectile(
        this.x, this.y,
        Math.cos(angle) * projSpeed, Math.sin(angle) * projSpeed,
        this.faction, 1, 'plasma', '#bf55ec'
      );
      proj.owner = this;
      room.projectiles.push(proj);
      if (window.soundEngine) window.soundEngine.playShoot('plasma');
    }
  }
}

// ==========================================
// 6. BOSSES FOR ALL 4 SECTORS
// ==========================================

// SECRET BOSS: O VÓRTICE — uma singularidade errante encontrada em salas raras.
class BossVortex extends Enemy {
  constructor(x, y) {
    super(x, y, 72, CONSTANTS.FACTIONS.VOID);
    this.isBoss = true;
    this.bossName = 'O VÓRTICE';
    this.maxHp = 560;
    this.hp = 560;
    this.speed = 0;
    this.color = '#000000';
    this.contactDamage = 3;
    this.attackInterval = 3.6;
    this.attackPattern = Math.floor(Math.random() * 4);
    this.absorbing = false;
    this.spawning = true;
    this.spawnTimer = 2.1;
    this.spawnProgress = 0;
    this.spiralAngle = 0;
    this.teleportTimer = 0;
    this.teleportWarning = 0;
  }

  executeAI(dt, room) {
    this.vx = 0;
    this.vy = 0;

    if (this.spawning) {
      this.spawnTimer -= dt;
      this.spawnProgress = Math.min(1, 1 - Math.max(0, this.spawnTimer) / 2.1);
      this.spiralAngle += dt * (0.55 + this.spawnProgress * 0.85);
      if (this.spawnTimer <= 0) {
        this.spawning = false;
        this.spawnProgress = 1;
        this.attackTimer = -0.8;
        if (window.gameInstance) window.gameInstance.addParticle(new Shockwave(this.x, this.y, 105, '#090914', 0.5));
      }
      return;
    }

    this.spiralAngle += dt * (this.absorbing ? 3.8 : 1.4);
    if (this.teleportWarning > 0) this.teleportWarning -= dt;
    this.attackTimer += dt;
    if (this.attackTimer < this.attackInterval) return;

    this.attackTimer = 0;
    this.attackPattern = Math.floor(Math.random() * 4);

    if (this.attackPattern === 0) {
      // Absorption: a brief visible rotating aura window.
      this.absorbing = true;
      this.absorbTimer = 1.15;
      if (window.soundEngine) window.soundEngine.playVortexAbsorb();
    } else if (this.attackPattern === 1) {
      this.spawnDarkMinions(room);
    } else if (this.attackPattern === 2) {
      this.fireSpiral(room);
    } else {
      this.teleportInRoom(room);
    }
  }

  update(dt, room) {
    if (this.absorbing) {
      this.absorbTimer -= dt;
      if (this.absorbTimer <= 0) this.absorbing = false;
    }
    super.update(dt, room);
  }

  spawnDarkMinions(room) {
    const pool = [BioSwarmer, BioSpitter, BioBrood, RoboDrone, RoboSentry, RoboRoller, VoidPhantom];
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const Ctor = pool[Math.floor(Math.random() * pool.length)];
      let x = 130 + Math.random() * (CONSTANTS.ROOM_WIDTH - 260);
      let y = 110 + Math.random() * (CONSTANTS.ROOM_HEIGHT - 220);
      if (window.isPositionSafe) {
        let tries = 0;
        while (tries++ < 18 && !window.isPositionSafe(room, x, y, 22)) {
          x = 130 + Math.random() * (CONSTANTS.ROOM_WIDTH - 260);
          y = 110 + Math.random() * (CONSTANTS.ROOM_HEIGHT - 220);
        }
      }
      const minion = new Ctor(x, y);
      minion.darkVariant = true;
      room.enemies.push(minion);
    }
    if (window.soundEngine) window.soundEngine.playVortexMinions();
  }

  fireSpiral(room) {
    const count = 18;
    const gap = 0.55;
    const base = this.spiralAngle;
    for (let i = 0; i < count; i++) {
      const a = base + i * (Math.PI * 2 / count);
      // Keep a moving angular gap so the pattern is demanding but readable.
      const phase = ((i / count) * Math.PI * 2 + base) % (Math.PI * 2);
      if (phase > gap && phase < gap + 0.8) continue;
      const proj = new Projectile(this.x, this.y, Math.cos(a) * 235, Math.sin(a) * 235, this.faction, 1, 'void_spiral', '#050509');
      proj.radius = 8;
      proj.life = 3.1;
      proj.owner = this;
      room.projectiles.push(proj);
    }
    if (window.soundEngine) window.soundEngine.playVortexSpiral();
    if (window.gameInstance) window.gameInstance.screenShake(4, 0.18);
  }

  teleportInRoom(room) {
    const p = window.gameInstance?.player;
    if (!p) return;
    let x = this.x, y = this.y;
    for (let i = 0; i < 30; i++) {
      x = 110 + Math.random() * (CONSTANTS.ROOM_WIDTH - 220);
      y = 100 + Math.random() * (CONSTANTS.ROOM_HEIGHT - 200);
      if (Math.hypot(x - p.x, y - p.y) >= 150 && (!window.isPositionSafe || window.isPositionSafe(room, x, y, this.radius))) break;
    }
    this.x = x;
    this.y = y;
    this.teleportWarning = 0.22;
    if (window.gameInstance) window.gameInstance.addParticle(new Shockwave(x, y, 70, '#11111a', 0.25));
    if (window.soundEngine) window.soundEngine.playVortexTeleport();
  }

  onDeath(source) {
    const game = window.gameInstance;
    const room = game?.dungeon?.currentRoom;
    if (!game || !room || room.type !== 'VORTEX') return;
    room.vortexDefeatEffect = { x: this.x, y: this.y, startRadius: this.radius, elapsed: 0, duration: 1.55 };
    room.projectiles = [];
    room.enemies = room.enemies.filter(e => e !== this && !e.darkVariant);
    this.dead = true;
    if (window.soundEngine) window.soundEngine.playVortexDeath();
  }
}

// Sector 1 Boss: Gorgon
class BossGorgon extends Enemy {
  constructor(x, y) {
    super(x, y, 42, CONSTANTS.FACTIONS.ALIEN);
    this.isBoss = true;
    this.bossName = "GORGON: PATRIARCA BIOMASSA";
    this.maxHp = 220;
    this.hp = 220;
    this.speed = 60;
    this.color = '#39ff14';
    this.contactDamage = 2;
    this.attackInterval = 2.4;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + angle;
        const proj = new Projectile(
          this.x, this.y,
          Math.cos(a) * 230, Math.sin(a) * 230,
          this.faction, 1, 'plasma', '#39ff14'
        );
        proj.owner = this;
        room.projectiles.push(proj);
      }
      if (window.soundEngine) window.soundEngine.playShoot('scatter');
      if (window.gameInstance) window.gameInstance.screenShake(6, 0.2);
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.gameInstance) {
      window.gameInstance.onBossDefeated();
    }
  }
}

// Sector 2 Boss: Titan Autômato MK-IV
class BossTitan extends Enemy {
  constructor(x, y) {
    super(x, y, 46, CONSTANTS.FACTIONS.ROBOT);
    this.isBoss = true;
    this.bossName = "TITÃ MK-IV: GUARDIÃO CIBERNÉTICO";
    this.maxHp = 320;
    this.hp = 320;
    this.speed = 45;
    this.color = '#00f0ff';
    this.contactDamage = 3;
    this.attackInterval = 2.0;
    this.attackPattern = 0;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      this.attackPattern = (this.attackPattern + 1) % 2;

      if (this.attackPattern === 0) {
        // Homing Missile Barrage
        [-0.3, 0.3].forEach(offset => {
          const a = angle + offset;
          const proj = new Projectile(
            this.x, this.y,
            Math.cos(a) * 200, Math.sin(a) * 200,
            this.faction, 1, 'missile', '#ff2a5f'
          );
          proj.homing = true;
          proj.owner = this;
          room.projectiles.push(proj);
        });
        if (window.soundEngine) window.soundEngine.playShoot('missile');
      } else {
        // Shotgun Blast
        [-0.35, -0.18, 0, 0.18, 0.35].forEach(offset => {
          const a = angle + offset;
          const proj = new Projectile(
            this.x, this.y,
            Math.cos(a) * 320, Math.sin(a) * 320,
            this.faction, 1, 'plasma', '#00f0ff'
          );
          proj.owner = this;
          room.projectiles.push(proj);
        });
        if (window.soundEngine) window.soundEngine.playShoot('scatter');
      }
      if (window.gameInstance) window.gameInstance.screenShake(5, 0.18);
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.gameInstance) {
      window.gameInstance.onBossDefeated();
    }
  }
}

// Sector 3 Boss: Entropia do Vazio
class BossEntropia extends Enemy {
  constructor(x, y) {
    super(x, y, 48, CONSTANTS.FACTIONS.VOID);
    this.isBoss = true;
    this.bossName = "ENTROPIA: SINGULARIDADE DO VÁCUO";
    this.maxHp = 420;
    this.hp = 420;
    this.speed = 50;
    this.color = '#bf55ec';
    this.contactDamage = 3;
    this.attackInterval = 1.8;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      // Spiral bullet pulse
      const count = 10;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const proj = new Projectile(
          this.x, this.y,
          Math.cos(a) * 240, Math.sin(a) * 240,
          this.faction, 1, 'plasma', '#bf55ec'
        );
        proj.owner = this;
        room.projectiles.push(proj);
      }
      if (window.soundEngine) window.soundEngine.playShoot('rail');
      if (window.gameInstance) {
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 80, '#bf55ec'));
        window.gameInstance.screenShake(6, 0.22);
      }
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.gameInstance) {
      window.gameInstance.onBossDefeated();
    }
  }
}

// Sector 4 Final Boss: Archon do Vazio (Soberano do Núcleo)
class BossArchon extends Enemy {
  constructor(x, y) {
    super(x, y, 54, CONSTANTS.FACTIONS.VOID);
    this.isBoss = true;
    this.bossName = "ARCHON: SOBERANO DO NÚCLEO";
    this.maxHp = 600;
    this.hp = 600;
    this.speed = 55;
    this.color = '#ff0055';
    this.contactDamage = 3;
    this.attackInterval = 1.5;
    this.phase2Triggered = false;
  }

  executeAI(dt, room) {
    if (!this.target) return;
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Phase 2 Enrage (< 50% HP)
    if (!this.phase2Triggered && this.hp < this.maxHp * 0.5) {
      this.phase2Triggered = true;
      this.speed = 85;
      this.attackInterval = 1.1;
      if (window.gameInstance) {
        window.gameInstance.screenShake(10, 0.6);
        window.gameInstance.addParticle(new Shockwave(this.x, this.y, 160, '#ff0055'));
        window.gameInstance.addParticle(new FloatingText(this.x, this.y - 45, "SOBRECARGA DO NÚCLEO!", "#ff0055"));
      }
      if (window.soundEngine) window.soundEngine.playBossAlarm();
    }

    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;

      // Double Railgun & Bullet Ring
      const count = this.phase2Triggered ? 14 : 9;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const proj = new Projectile(
          this.x, this.y,
          Math.cos(a) * 260, Math.sin(a) * 260,
          this.faction, 1, 'plasma', '#ff0055'
        );
        proj.owner = this;
        room.projectiles.push(proj);
      }

      // Targeted Heavy Beam / Missiles
      if (this.phase2Triggered) {
        [-0.2, 0.2].forEach(offset => {
          const a = angle + offset;
          const proj = new Projectile(
            this.x, this.y,
            Math.cos(a) * 450, Math.sin(a) * 450,
            this.faction, 1, 'rail', '#ff0055'
          );
          proj.owner = this;
          room.projectiles.push(proj);
        });
      } else {
        const proj = new Projectile(
          this.x, this.y,
          Math.cos(angle) * 360, Math.sin(angle) * 360,
          this.faction, 1, 'missile', '#ff0055'
        );
        proj.homing = true;
        proj.owner = this;
        room.projectiles.push(proj);
      }

      if (window.soundEngine) window.soundEngine.playShoot('rail');
      if (window.gameInstance) window.gameInstance.screenShake(6, 0.2);
    }
  }

  onDeath(source) {
    super.onDeath(source);
    if (window.gameInstance) {
      window.gameInstance.onFinalVictory();
    }
  }
}

// ==========================================
// 7. PLAYER CLASS
// ==========================================
class Player extends Entity {
  constructor(x, y, game = null) {
    super(x, y, 16, CONSTANTS.FACTIONS.PLAYER);
    this.game = game || window.gameInstance;
    this.maxHp = 6;
    this.hp = 6;
    this.maxShield = 2;
    this.shield = 2;
    this.shieldRegenTimer = 0;

    this.baseSpeed = 220;
    this.speedMult = 1.0;
    this.angle = 0;
    this.walkAnimTimer = 0;

    // Oxygen
    this.maxO2 = 100;
    this.o2 = 100;
    this.o2DepletionRate = 3.5;
    this.o2DamageTimer = 0;

    // Inventory
    this.scrap = 20;
    this.modulesInventory = [];
    this.loadoutChoices = [];

    // Equipped Modules
    this.modules = {
      weapon: CONSTANTS.MODULES.find(m => m.id === 'weapon_blaster'),
      chassis: CONSTANTS.MODULES.find(m => m.id === 'chassis_nano'),
      engine: CONSTANTS.MODULES.find(m => m.id === 'engine_booster'),
      core: CONSTANTS.MODULES.find(m => m.id === 'core_overclock')
    };

    // Alien Mutations
    this.mutations = {
      causticBile: false,
      symbioticTentacle: false,
      predatorAdrenals: false,
      contagiousSpores: false,
      chitinShell: false,
      vampiricTendrils: false,
      voidbound: false
    };
    this.tentacleTimer = 0;
    this.spasmTimer = 0;

    // Combat Timers
    this.shootTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.2;
    this.dashTimeRemaining = 0;
    this.dashDir = { x: 0, y: 0 };

    // Hacking EMP
    this.hackCooldown = 5.0;
    this.hackTimer = 0;
    this.hackRange = 220;
    this.hackCooldownBonus = 0;

    // Companion Drone
    this.droneAngle = 0;
    this.droneShootTimer = 0;

    // Run Stats
    this.stats = {
      roomsCleared: 0,
      aliensKilled: 0,
      robotsKilled: 0,
      robotsHacked: 0,
      mutationsCount: 0,
      damageDealt: 0,
      startTime: Date.now()
    };

    // Base Hitbox & Mutation Sizing
    // The player uses a square hitbox to match the original visual/gameplay identity.
    // radius is kept for legacy systems, while halfSize is the authoritative player
    // collision extent for projectile and contact checks.
    this.baseRadius = 16;
    this.baseHalfSize = 16;
    this.radius = 16;
    this.halfSize = 16;
    this.updateHitbox();
  }

  updateHitbox() {
    // Symbiotic Tentacle drawback increases the square hitbox by ~15%.
    const mult = this.mutations.symbioticTentacle ? 1.15 : 1.0;
    this.halfSize = Math.round(this.baseHalfSize * mult * 10) / 10;
    // Keep radius-compatible systems conservative; projectile-vs-player uses halfSize.
    this.radius = this.halfSize;
  }

  addMutation(mutationId) {
    if (this.mutations && this.mutations.hasOwnProperty(mutationId)) {
      this.mutations[mutationId] = true;
      this.updateHitbox();
    }
  }

  removeMutation(mutationId) {
    if (this.mutations && this.mutations.hasOwnProperty(mutationId)) {
      this.mutations[mutationId] = false;
      this.updateHitbox();
    }
  }

  equipModule(module) {
    if (!module || !module.slot) return;
    const current = this.modules[module.slot];
    if (current && current.bonusShield) {
      this.maxShield -= current.bonusShield;
      this.shield = Math.min(this.shield, this.maxShield);
    }
    this.modules[module.slot] = module;
    if (module.bonusShield) {
      this.maxShield += module.bonusShield;
      this.shield = Math.min(this.shield + module.bonusShield, this.maxShield);
    }
    if (window.soundEngine) window.soundEngine.playPickup('module');
  }

  takeDamage(amount, source) {
    if (this.invulnTimer > 0 || this.isDashing || this.dead) return false;

    // Chitin Shell 25% deflection
    if (this.mutations.chitinShell && Math.random() < 0.25) {
      const game = this.game || window.gameInstance;
      if (game) {
        game.addParticle(new FloatingText(this.x, this.y - 20, "DEFLETIDO!", "#eab308"));
      }
      return false;
    }

    this.shieldRegenTimer = 0;

    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) {
        this.hp += this.shield;
        this.shield = 0;
      }

      if (this.shield === 0 && this.modules.chassis?.empOnBreak) {
        this.triggerEmpShockwave();
      }
    } else {
      this.hp -= amount;
    }

    this.invulnTimer = 0.85;
    this.flashTimer = 0.2;
    if (window.soundEngine) window.soundEngine.playPlayerDamage();

    const game = this.game || window.gameInstance;
    if (game) game.screenShake(7, 0.25);

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.onDeath(source);
    }
    return true;
  }

  triggerEmpShockwave() {
    if (window.soundEngine) window.soundEngine.playExplosion();
    const game = this.game || window.gameInstance;
    if (game) {
      game.addParticle(new Shockwave(this.x, this.y, 160, '#00f0ff'));
      const room = game.dungeon?.currentRoom;
      if (room && room.enemies) {
        room.enemies.forEach(e => {
          if (Math.hypot(e.x - this.x, e.y - this.y) < 160) {
            e.takeDamage(20, this);
            const a = Math.atan2(e.y - this.y, e.x - this.x);
            e.vx = Math.cos(a) * 350;
            e.vy = Math.sin(a) * 350;
          }
        });
      }
    }
  }

  onDeath(source) {
    if (this.game) {
      this.game.onPlayerDeath();
    } else if (window.gameInstance) {
      window.gameInstance.onPlayerDeath();
    }
  }

  update(dt, room, input) {
    if (this.dead) return;

    let currentSpeed = (this.baseSpeed + (this.modules.engine?.speedBonus || 0)) * this.speedMult;
    if (this.mutations.causticBile) currentSpeed *= 0.88;

    let fireRateMult = 1.0;
    let damageMult = 1.0;
    if (this.mutations.predatorAdrenals && this.hp <= this.maxHp * 0.5) {
      fireRateMult = 1.6;
      damageMult = 1.35;
    }
    if (this.mutations.voidbound) {
      fireRateMult *= 0.52;
      damageMult *= 2.6;
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shootTimer > 0) this.shootTimer -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.hackTimer > 0) this.hackTimer -= dt;

    // Shield Regen
    if (this.modules.chassis?.shieldRegenDelay && (!this.mutations.predatorAdrenals || this.hp >= this.maxHp)) {
      this.shieldRegenTimer += dt;
      if (this.shieldRegenTimer >= this.modules.chassis.shieldRegenDelay) {
        if (this.shield < this.maxShield) {
          this.shield++;
          const game = this.game || window.gameInstance;
          if (game) game.addParticle(new FloatingText(this.x, this.y - 20, "+ESCUDO", "#00f0ff"));
        }
        this.shieldRegenTimer = 0;
      }
    }

    // Oxygen in Vacuum Zones. The secret VÓRTICE room is exempt: entering it
    // freezes the current oxygen level and applies no depletion or recovery.
    if (room?.type === 'VORTEX') {
      this.o2DamageTimer = 0;
    } else if (room && room.vacuumBreach) {
      const efficiency = this.modules.chassis?.o2Efficiency || 1.0;
      this.o2 -= this.o2DepletionRate * efficiency * dt;
      if (this.o2 <= 0) {
        this.o2 = 0;
        this.o2DamageTimer += dt;
        if (this.o2DamageTimer >= 1.5) {
          this.o2DamageTimer = 0;
          this.takeDamage(1, null);
          const game = this.game || window.gameInstance;
          if (game) game.addParticle(new FloatingText(this.x, this.y - 20, "SEM OXIGÊNIO!", "#ff2a5f"));
        }
      }
    } else {
      if (this.o2 < this.maxO2) {
        this.o2 = Math.min(this.maxO2, this.o2 + 25 * dt);
      }
    }

    // Spores Spasm
    if (this.mutations.contagiousSpores) {
      this.spasmTimer += dt;
      if (this.spasmTimer > 14) {
        this.spasmTimer = 0;
        this.vx += (Math.random() - 0.5) * 200;
        this.vy += (Math.random() - 0.5) * 200;
      }
    }

    // Symbiotic Tentacle Strike
    if (this.mutations.symbioticTentacle && room && room.enemies) {
      this.tentacleTimer += dt;
      if (this.tentacleTimer >= 2.5) {
        this.tentacleTimer = 0;
        let target = null;
        let minDist = 140;
        for (let e of room.enemies) {
          if (e.dead || !window.areHostile(this, e)) continue;
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
        if (target) {
          target.takeDamage(12, this);
          const game = this.game || window.gameInstance;
          if (game) {
            game.addParticle(new Shockwave(target.x, target.y, 35, '#bf55ec'));
            game.addParticle(new FloatingText(target.x, target.y - 15, "GOLPE TENTÁCULO", "#bf55ec"));
          }
        }
      }
    }

    // Companion Drone
    if (this.modules.core?.hasCompanionDrone && room && room.enemies) {
      this.droneAngle += dt * 3.5;
      const droneX = this.x + Math.cos(this.droneAngle) * 36;
      const droneY = this.y + Math.sin(this.droneAngle) * 36;
      this.droneShootTimer += dt;

      if (this.droneShootTimer >= 0.85) {
        this.droneShootTimer = 0;
        let target = null;
        let minDist = 260;
        for (let e of room.enemies) {
          if (e.dead || !window.areHostile(this, e)) continue;
          const d = Math.hypot(e.x - droneX, e.y - droneY);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
        if (target) {
          const a = Math.atan2(target.y - droneY, target.x - droneX);
          const p = new Projectile(
            droneX, droneY,
            Math.cos(a) * 480, Math.sin(a) * 480,
            CONSTANTS.FACTIONS.PLAYER, 8, 'plasma', '#00f0ff'
          );
          p.owner = this;
          room.projectiles.push(p);
          if (window.soundEngine) window.soundEngine.playShoot('plasma');
        }
      }
    }

    // --- DASH HANDLING ---
    if (this.isDashing) {
      this.dashTimeRemaining -= dt;
      this.vx = this.dashDir.x * 550;
      this.vy = this.dashDir.y * 550;

      if (this.modules.engine?.fireTrail && window.gameInstance) {
        window.gameInstance.addParticle(new FireParticle(this.x, this.y));
      }

      if (this.dashTimeRemaining <= 0) {
        this.isDashing = false;
      }
    } else {
      // Movement Input (WASD / Arrows / Virtual Joystick)
      let moveX = 0;
      let moveY = 0;

      if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

      if (input.joystick.active) {
        moveX = input.joystick.dx;
        moveY = input.joystick.dy;
      } else if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }

      this.vx = moveX * currentSpeed;
      this.vy = moveY * currentSpeed;

      if (moveX !== 0 || moveY !== 0) {
        this.walkAnimTimer += dt;
      }

      // Dash Activation
      const dashCd = (this.modules.engine?.dashCooldown || 1.5) * (this.mutations.chitinShell ? 1.35 : 1.0);
      if ((input.justPressed['Space'] || input.justPressed['ShiftLeft'] || input.justPressed['ShiftRight']) && this.dashTimer <= 0) {
        if (moveX !== 0 || moveY !== 0) {
          this.isDashing = true;
          this.dashTimeRemaining = this.dashDuration;
          this.dashTimer = dashCd;
          this.dashDir = { x: moveX, y: moveY };
          if (window.soundEngine) window.soundEngine.playDash();

          if (this.modules.engine?.dashStun && window.gameInstance) {
            window.gameInstance.addParticle(new Shockwave(this.x, this.y, 90, '#ffffff'));
            if (room && room.enemies) {
              room.enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < 90) e.stunTimer = 1.2;
              });
            }
          }
        }
      }
    }

    // Aiming Direction (Mouse or Touch Auto-Aim)
    if (input.isTouchDevice && !input.touchAim.active) {
      // Auto-aim at closest enemy when firing on mobile without manual aim
      let nearestHostile = null;
      let minDist = 400;
      if (room && room.enemies) {
        for (let e of room.enemies) {
          if (e.dead || !window.areHostile(this, e)) continue;
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < minDist) {
            minDist = d;
            nearestHostile = e;
          }
        }
      }
      if (nearestHostile) {
        this.angle = Math.atan2(nearestHostile.y - this.y, nearestHostile.x - this.x);
      }
    } else {
      this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
    }

    // Shooting
    const weapon = this.modules.weapon || CONSTANTS.MODULES[0];
    const effectiveFireRate = (weapon.fireRate || 4) * fireRateMult;
    const fireInterval = 1 / effectiveFireRate;

    if ((input.mouseDown || input.touchAim.firing) && this.shootTimer <= 0 && !this.isDashing) {
      this.shootTimer = fireInterval;
      this.fireWeapon(weapon, room, damageMult);
    }

    // EMP Hacking Tool (Key E or Right Click)
    if ((input.justPressed['KeyE'] || input.rightMouseDown) && this.hackTimer <= 0) {
      const cd = (this.hackCooldown - this.hackCooldownBonus) * (this.modules.core?.hackCooldownMult || 1.0);
      this.triggerHackingTool(room, Math.max(1.5, cd));
    }

    // Magnet Siphon for Pickups
    const magnetRange = this.modules.core?.vacuumRange || 50;
    if (room && room.pickups) {
      for (let p of room.pickups) {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < magnetRange) {
          const a = Math.atan2(this.y - p.y, this.x - p.x);
          p.x += Math.cos(a) * 260 * dt;
          p.y += Math.sin(a) * 260 * dt;
        }
        if (d < this.radius + p.size) {
          this.collectPickup(p);
          p.dead = true;
        }
      }
      room.pickups = room.pickups.filter(p => !p.dead);
    }

    super.update(dt, room);
  }

  fireWeapon(weapon, room, damageMult) {
    if (!room) return;
    const bulletCount = weapon.bulletCount || 1;
    const baseDmg = (weapon.damage || 14) * damageMult;

    for (let i = 0; i < bulletCount; i++) {
      let shotAngle = this.angle;
      if (weapon.spread) {
        shotAngle += (Math.random() - 0.5) * weapon.spread;
      }

      const spd = weapon.speed || 550;
      const voidShot = this.mutations.voidbound;
      const proj = new Projectile(
        this.x + Math.cos(this.angle) * 18,
        this.y + Math.sin(this.angle) * 18,
        Math.cos(shotAngle) * spd,
        Math.sin(shotAngle) * spd,
        CONSTANTS.FACTIONS.PLAYER,
        baseDmg,
        voidShot ? 'voidblackhole' : weapon.bulletType,
        voidShot ? '#050509' : (weapon.bulletType === 'rail' ? '#bf55ec' : '#00f0ff')
      );
      proj.owner = this;

      if (weapon.pierce) proj.pierce = true;
      if (weapon.homing) proj.homing = true;
      if (weapon.chainTargets) proj.chainTargets = weapon.chainTargets;
      if (this.mutations.causticBile) proj.leavesAcid = true;

      room.projectiles.push(proj);
    }

    if (window.soundEngine) window.soundEngine.playShoot(this.mutations.voidbound ? 'void' : weapon.bulletType);
  }

  triggerHackingTool(room, cooldown) {
    this.hackTimer = cooldown;
    if (window.soundEngine) window.soundEngine.playHack();

    let hackedTarget = null;
    let minDist = this.hackRange;

    if (room && room.enemies) {
      for (let enemy of room.enemies) {
        if (enemy.dead || enemy.isHacked || enemy.faction !== CONSTANTS.FACTIONS.ROBOT || enemy.isBoss) continue;
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d < minDist) {
          minDist = d;
          hackedTarget = enemy;
        }
      }
    }

    const game = this.game || window.gameInstance;
    if (hackedTarget) {
      const duration = 8.0 * (this.modules.core?.hackDurationMult || 1.0);
      hackedTarget.applyHack(duration);
      this.stats.robotsHacked++;
      if (game) {
        game.addParticle(new Shockwave(hackedTarget.x, hackedTarget.y, 65, '#00f0ff'));
        game.addParticle(new FloatingText(hackedTarget.x, hackedTarget.y - 25, "HACKEADO! ALIADO", "#00f0ff"));
      }
    } else {
      if (game) {
        game.addParticle(new Shockwave(this.x, this.y, this.hackRange * 0.6, '#bf55ec'));
        game.addParticle(new FloatingText(this.x, this.y - 25, "PULSO EMP", "#bf55ec"));
      }
    }
  }

  collectPickup(p) {
    const game = this.game || window.gameInstance;
    if (p.type === 'scrap') {
      this.scrap += p.amount;
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (game) game.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount} SUCATA`, '#f59e0b'));
    } else if (p.type === 'hp') {
      const heal = this.mutations.vampiricTendrils ? Math.max(1, Math.floor(p.amount * 0.5)) : p.amount;
      this.hp = Math.min(this.maxHp, this.hp + heal);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (game) game.addParticle(new FloatingText(this.x, this.y - 20, `+${heal} HP`, '#ff0055'));
    } else if (p.type === 'shield') {
      this.shield = Math.min(this.maxShield, this.shield + p.amount);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (game) game.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount} ESCUDO`, '#00f0ff'));
    } else if (p.type === 'o2') {
      this.o2 = Math.min(this.maxO2, this.o2 + p.amount);
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      if (game) game.addParticle(new FloatingText(this.x, this.y - 20, `+${p.amount}% O2`, '#38bdf8'));
    } else if (p.type === 'mutation_void') {
      if (!this.mutations.voidbound) {
        this.addMutation('voidbound');
        this.stats.mutationsCount++;
        if (window.soundEngine) window.soundEngine.playVortexReward();
        if (game) {
          game.addParticle(new FloatingText(this.x, this.y - 30, 'VOIDBOUND', '#d8d8e8', 1.8));
          game.addParticle(new Shockwave(this.x, this.y, 70, '#050509', 0.7));
        }
      }
    } else if (p.type === 'module_item') {
      // QoL: keep only the two most recent loadout choices. Mutations are
      // intentionally independent and are never removed by this limit.
      if (!Array.isArray(this.modulesInventory)) this.modulesInventory = [];
      if (!Array.isArray(this.loadoutChoices)) this.loadoutChoices = [];
      this.modulesInventory.push(p.module);
      while (this.modulesInventory.length > 2) this.modulesInventory.shift();
      this.loadoutChoices.push(p.module);
      while (this.loadoutChoices.length > 2) this.loadoutChoices.shift();
      this.equipModule(p.module);
      if (game) game.addParticle(new FloatingText(this.x, this.y - 30, `LOADOUT: ${p.module.name}`, '#00f0ff'));
    }
  }
}

// Safe Room Position Validator
function isPositionSafe(room, x, y, radius = 16) {
  const T = CONSTANTS.WALL_THICKNESS + 8;
  const W = CONSTANTS.ROOM_WIDTH;
  const H = CONSTANTS.ROOM_HEIGHT;
  if (x - radius < T || x + radius > W - T || y - radius < T || y + radius > H - T) {
    return false;
  }
  if (room && room.obstacles) {
    for (let obs of room.obstacles) {
      const margin = radius + 4;
      if (x >= obs.x - margin && x <= obs.x + obs.w + margin &&
          y >= obs.y - margin && y <= obs.y + obs.h + margin) {
        return false;
      }
    }
  }
  return true;
}

// Window Exports
window.Entity = Entity;
window.Projectile = Projectile;
window.Particle = Particle;
window.FireParticle = FireParticle;
window.Shockwave = Shockwave;
window.FloatingText = FloatingText;
window.LightningArc = LightningArc;
window.Enemy = Enemy;
window.BioSwarmer = BioSwarmer;
window.BioSpitter = BioSpitter;
window.BioBrood = BioBrood;
window.RoboDrone = RoboDrone;
window.RoboSentry = RoboSentry;
window.RoboRoller = RoboRoller;
window.VoidPhantom = VoidPhantom;
window.CoreBombardier = CoreBombardier;
window.CoreKamikaze = CoreKamikaze;
window.BossGorgon = BossGorgon;
window.BossTitan = BossTitan;
window.BossEntropia = BossEntropia;
window.BossArchon = BossArchon;
window.Player = Player;
window.isPositionSafe = isPositionSafe;
