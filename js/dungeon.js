/**
 * TecnoBound - Procedural Dungeon, Rooms and Guaranteed Room Allocation
 */

class Room {
  constructor(gx, gy, type = 'COMBAT', sector) {
    this.gx = gx;
    this.gy = gy;
    this.type = type; // 'START', 'COMBAT', 'TREASURE', 'MUTAGEN', 'FABRICATOR', 'HAZARD', 'BOSS'
    this.sector = sector;
    this.doors = { north: false, south: false, east: false, west: false };
    this.doorsLocked = false;
    this.visited = false;
    this.cleared = (type === 'START' || type === 'TREASURE' || type === 'MUTAGEN' || type === 'FABRICATOR');
    this.enemies = [];
    this.pendingEnemies = [];
    this.projectiles = [];
    this.obstacles = [];
    this.pickups = [];
    this.hazards = [];
    this.decorations = [];
    this.bossDefeated = false;
    this.airlockActive = false;
    this.vacuumBreach = (sector.hasVacuum || (type === 'HAZARD' && Math.random() < 0.6));
    this.treasureClaimed = false;
    this.mutagenClaimed = false;

    this.initLayout();
  }

  initLayout() {
    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;
    const T = CONSTANTS.WALL_THICKNESS;

    // Floor and structural retro decorations
    const decorCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < decorCount; i++) {
      this.decorations.push({
        x: T + 40 + Math.random() * (W - 2 * T - 80),
        y: T + 40 + Math.random() * (H - 2 * T - 80),
        size: 15 + Math.random() * 25,
        type: Math.floor(Math.random() * 4),
        rotation: Math.random() * Math.PI * 2
      });
    }

    if (this.type === 'START') {
      // Diagnostic Terminal in Start Room
      this.obstacles.push({
        x: W / 2 - 35,
        y: 110,
        w: 70,
        h: 40,
        type: 'terminal',
        label: 'CONSOLE DE DIAGNÓSTICO'
      });
    } else if (this.type === 'TREASURE') {
      // High-grade Robotic Module Pedestal
      this.obstacles.push({
        x: W / 2 - 30,
        y: H / 2 - 30,
        w: 60,
        h: 60,
        type: 'pedestal',
        claimed: false,
        label: 'CÁPSULA DE MÓDULO'
      });
    } else if (this.type === 'MUTAGEN') {
      // Alien Mutagen Infusion Pod
      this.obstacles.push({
        x: W / 2 - 35,
        y: H / 2 - 35,
        w: 70,
        h: 70,
        type: 'mutagen_pod',
        claimed: false,
        label: 'CÂMARA DE INFUSÃO MUTAGÊNICA'
      });
    } else if (this.type === 'FABRICATOR') {
      // Shop Terminals
      this.obstacles.push(
        { x: W / 2 - 130, y: 115, w: 75, h: 45, type: 'shop_item', bought: false, cost: 25 },
        { x: W / 2 + 55,  y: 115, w: 75, h: 45, type: 'shop_item', bought: false, cost: 25 },
        { x: W / 2 - 130, y: H - 165, w: 75, h: 45, type: 'shop_heal', bought: false, cost: 15 },
        { x: W / 2 + 55,  y: H - 165, w: 75, h: 45, type: 'shop_o2', bought: false, cost: 10 }
      );
    } else if (this.type === 'BOSS') {
      // Arena Cover Pillars
      this.obstacles.push(
        { x: 170, y: 170, w: 45, h: 45, type: 'pillar' },
        { x: W - 215, y: 170, w: 45, h: 45, type: 'pillar' },
        { x: 170, y: H - 215, w: 45, h: 45, type: 'pillar' },
        { x: W - 215, y: H - 215, w: 45, h: 45, type: 'pillar' }
      );
    } else if (this.type === 'HAZARD') {
      // Acid Pools or Obstacles
      this.hazards.push({
        x: W / 2 - 60,
        y: H / 2 - 60,
        w: 120,
        h: 120,
        type: 'acid_pool'
      });
    } else {
      // Combat Room Covers
      if (Math.random() < 0.6) {
        this.obstacles.push(
          { x: W / 2 - 90, y: H / 2 - 20, w: 40, h: 40, type: 'pillar' },
          { x: W / 2 + 50, y: H / 2 - 20, w: 40, h: 40, type: 'pillar' }
        );
      }
    }
  }

  spawnEnemies() {
    if (this.cleared || this.enemies.length > 0) return;
    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;

    if (this.type === 'BOSS') {
      if (this.sector.id === 1) {
        this.enemies.push(new BossGorgon(W / 2, H / 2));
      } else if (this.sector.id === 2) {
        this.enemies.push(new BossTitan(W / 2, H / 2));
      } else if (this.sector.id === 3) {
        this.enemies.push(new BossEntropia(W / 2, H / 2));
      } else if (this.sector.id === 4) {
        this.enemies.push(new BossArchon(W / 2, H / 2));
      }
      if (window.soundEngine) window.soundEngine.playBossAlarm();
      return;
    }

    if (this.type === 'COMBAT' || this.type === 'HAZARD') {
      const enemyCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < enemyCount; i++) {
        let ex = 120 + Math.random() * (W - 240);
        let ey = 120 + Math.random() * (H - 240);

        // Pre-validate coordinates so enemies never spawn inside pillars or obstacles
        let safeTries = 0;
        while (safeTries < 25 && window.isPositionSafe && !window.isPositionSafe(this, ex, ey, 24)) {
          ex = 120 + Math.random() * (W - 240);
          ey = 120 + Math.random() * (H - 240);
          safeTries++;
        }

        if (this.sector.id === 1) {
          // Sector 1: Alien Infestation
          const roll = Math.random();
          if (roll < 0.55) {
            this.enemies.push(new BioSwarmer(ex, ey));
          } else if (roll < 0.85) {
            this.enemies.push(new BioSpitter(ex, ey));
          } else {
            this.enemies.push(new BioBrood(ex, ey));
          }
        } else if (this.sector.id === 2) {
          // Sector 2: Automaton Complex
          const roll = Math.random();
          if (roll < 0.45) {
            this.enemies.push(new RoboDrone(ex, ey));
          } else if (roll < 0.75) {
            this.enemies.push(new RoboSentry(ex, ey));
          } else {
            this.enemies.push(new RoboRoller(ex, ey));
          }
        } else if (this.sector.id === 3) {
          // Sector 3: Deep Vacuum & Void Stalkers
          const roll = Math.random();
          if (roll < 0.45) {
            this.enemies.push(new VoidPhantom(ex, ey));
          } else if (roll < 0.75) {
            this.enemies.push(new RoboDrone(ex, ey));
          } else {
            this.enemies.push(new BioSpitter(ex, ey));
          }
        } else {
          // Sector 4: Ship Core (Inter-faction Warzone)
          const roll = Math.random();
          if (roll < 0.35) {
            this.enemies.push(new RoboDrone(ex, ey));
          } else if (roll < 0.70) {
            this.enemies.push(new BioSpitter(ex, ey));
          } else {
            this.enemies.push(new VoidPhantom(ex, ey));
          }
        }
      }
    }
  }
}

class Dungeon {
  constructor(sector) {
    this.sector = sector;
    this.gridSize = 7;
    this.rooms = new Map();
    this.startRoom = null;
    this.bossRoom = null;
    this.treasureRoom = null;
    this.mutagenRoom = null;
    this.shopRoom = null;
    this.currentRoom = null;

    this.generateWithValidation();
  }

  generateWithValidation() {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      attempts++;
      this.rooms.clear();
      this.startRoom = null;
      this.bossRoom = null;
      this.treasureRoom = null;
      this.mutagenRoom = null;
      this.shopRoom = null;
      this.currentRoom = null;

      this.generate();

      const validation = this.validateMap();
      if (validation.valid) {
        return;
      }
    }

    // Deterministic fallback guarantees a fully playable, 100% connected map with all required rooms
    this.generateDeterministicFallback();
  }

  generate() {
    const center = Math.floor(this.gridSize / 2); // 3
    const targetRoomCount = Math.max(9, this.sector.roomCount || 9);

    // Step 1: Isaac-style Random Walk BFS Tree Expansion
    const positions = [{ x: center, y: center }];
    const posSet = new Set([`${center},${center}`]);

    let safety = 0;
    while (positions.length < targetRoomCount && safety < 400) {
      safety++;
      const base = positions[Math.floor(Math.random() * positions.length)];
      const dirs = [
        { dx: 0, dy: -1 }, // N
        { dx: 0, dy: 1 },  // S
        { dx: 1, dy: 0 },  // E
        { dx: -1, dy: 0 }  // W
      ];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = base.x + dir.dx;
      const ny = base.y + dir.dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && !posSet.has(key)) {
        let neighbors = 0;
        dirs.forEach(d => {
          if (posSet.has(`${nx + d.dx},${ny + d.dy}`)) neighbors++;
        });

        // Maintain tree-like branching
        if (neighbors === 1 || Math.random() < 0.3) {
          positions.push({ x: nx, y: ny });
          posSet.add(key);
        }
      }
    }

    // Step 2: Identify Dead Ends and Distance Metrics
    const startPos = positions[0];
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
    ];

    const deadEnds = [];
    positions.forEach(p => {
      if (p.x === startPos.x && p.y === startPos.y) return;
      let neighbors = 0;
      dirs.forEach(d => {
        if (posSet.has(`${p.x + d.dx},${p.y + d.dy}`)) neighbors++;
      });
      const dist = Math.abs(p.x - startPos.x) + Math.abs(p.y - startPos.y);
      if (neighbors === 1) {
        deadEnds.push({ ...p, dist });
      }
    });

    // Sort dead ends farthest from start first
    deadEnds.sort((a, b) => b.dist - a.dist);

    // Step 3: Guaranteed Position Reservation (Zero Overwrites)
    // Candidate pool contains all positions except startPos
    let candidatePool = positions.filter(p => !(p.x === startPos.x && p.y === startPos.y));
    candidatePool.sort((a, b) => {
      const da = Math.abs(a.x - startPos.x) + Math.abs(a.y - startPos.y);
      const db = Math.abs(b.x - startPos.x) + Math.abs(b.y - startPos.y);
      return db - da; // Farthest first
    });

    const reservedPositions = new Map(); // key `${x},${y}` => type
    reservedPositions.set(`${startPos.x},${startPos.y}`, 'START');

    const takeFromPool = (preferredArray) => {
      // Find first available from preferredArray
      for (let i = 0; i < preferredArray.length; i++) {
        const key = `${preferredArray[i].x},${preferredArray[i].y}`;
        if (!reservedPositions.has(key)) {
          return preferredArray[i];
        }
      }
      // Fallback: take first available from candidatePool
      for (let i = 0; i < candidatePool.length; i++) {
        const key = `${candidatePool[i].x},${candidatePool[i].y}`;
        if (!reservedPositions.has(key)) {
          return candidatePool[i];
        }
      }
      return null;
    };

    // 1. BOSS Room: Farthest dead end, or farthest candidate
    const bossPos = takeFromPool(deadEnds);
    if (bossPos) reservedPositions.set(`${bossPos.x},${bossPos.y}`, 'BOSS');

    // 2. TREASURE Room: Dead end or outer branch
    const treasurePos = takeFromPool(deadEnds);
    if (treasurePos) reservedPositions.set(`${treasurePos.x},${treasurePos.y}`, 'TREASURE');

    // 3. MUTAGEN Room: Dead end or outer branch
    const mutagenPos = takeFromPool(deadEnds);
    if (mutagenPos) reservedPositions.set(`${mutagenPos.x},${mutagenPos.y}`, 'MUTAGEN');

    // 4. FABRICATOR (Shop) Room: Dead end or candidate
    const shopPos = takeFromPool(deadEnds);
    if (shopPos) reservedPositions.set(`${shopPos.x},${shopPos.y}`, 'FABRICATOR');

    // Step 4: Instantiate All Rooms
    positions.forEach(p => {
      const key = `${p.x},${p.y}`;
      let type = reservedPositions.get(key);
      if (!type) {
        type = Math.random() < 0.25 ? 'HAZARD' : 'COMBAT';
      }

      const room = new Room(p.x, p.y, type, this.sector);
      this.rooms.set(key, room);

      if (type === 'START') this.startRoom = room;
      else if (type === 'BOSS') this.bossRoom = room;
      else if (type === 'TREASURE') this.treasureRoom = room;
      else if (type === 'MUTAGEN') this.mutagenRoom = room;
      else if (type === 'FABRICATOR') this.shopRoom = room;
    });

    // Step 5: Door Connectivity Linking
    this.rooms.forEach(room => {
      if (this.rooms.has(`${room.gx},${room.gy - 1}`)) room.doors.north = true;
      if (this.rooms.has(`${room.gx},${room.gy + 1}`)) room.doors.south = true;
      if (this.rooms.has(`${room.gx + 1},${room.gy}`)) room.doors.east = true;
      if (this.rooms.has(`${room.gx - 1},${room.gy}`)) room.doors.west = true;
    });

    this.currentRoom = this.startRoom;
    if (this.currentRoom) {
      this.currentRoom.visited = true;
    }
  }

  validateMap() {
    // 1. Mandatory rooms check
    if (!this.startRoom) return { valid: false, reason: 'Start room missing' };
    if (!this.bossRoom) return { valid: false, reason: 'Boss room missing' };
    if (!this.treasureRoom) return { valid: false, reason: 'Treasure room missing' };
    if (!this.mutagenRoom) return { valid: false, reason: 'Mutagen room missing' };
    if (!this.shopRoom) return { valid: false, reason: 'Shop room missing' };

    // 2. Uniqueness check (No coordinate collisions)
    const specialCoords = new Set([
      `${this.startRoom.gx},${this.startRoom.gy}`,
      `${this.bossRoom.gx},${this.bossRoom.gy}`,
      `${this.treasureRoom.gx},${this.treasureRoom.gy}`,
      `${this.mutagenRoom.gx},${this.mutagenRoom.gy}`,
      `${this.shopRoom.gx},${this.shopRoom.gy}`
    ]);
    if (specialCoords.size !== 5) {
      return { valid: false, reason: 'Duplicate coordinates among special rooms' };
    }

    // 3. Reachability check (BFS from Start room)
    const visited = new Set();
    const queue = [`${this.startRoom.gx},${this.startRoom.gy}`];
    visited.add(queue[0]);

    while (queue.length > 0) {
      const key = queue.shift();
      const [x, y] = key.split(',').map(Number);
      const room = this.rooms.get(key);
      if (!room) continue;

      const neighbors = [
        { k: `${x},${y - 1}`, hasDoor: room.doors.north },
        { k: `${x},${y + 1}`, hasDoor: room.doors.south },
        { k: `${x + 1},${y}`, hasDoor: room.doors.east },
        { k: `${x - 1},${y}`, hasDoor: room.doors.west }
      ];

      neighbors.forEach(n => {
        if (n.hasDoor && this.rooms.has(n.k) && !visited.has(n.k)) {
          visited.add(n.k);
          queue.push(n.k);
        }
      });
    }

    // Check that every room in this.rooms is reachable
    if (visited.size !== this.rooms.size) {
      return { valid: false, reason: 'Not all rooms are connected to start' };
    }

    return { valid: true };
  }

  getRoom(gx, gy) {
    return this.rooms.get(`${gx},${gy}`) || null;
  }

  generateDeterministicFallback() {
    this.rooms.clear();
    const cx = Math.floor(this.gridSize / 2); // 3
    const cy = Math.floor(this.gridSize / 2); // 3

    // Cross-shaped guaranteed map layout
    const layout = [
      { gx: cx, gy: cy, type: 'START' },
      { gx: cx, gy: cy - 1, type: 'COMBAT' },
      { gx: cx, gy: cy - 2, type: 'BOSS' },
      { gx: cx - 1, gy: cy, type: 'TREASURE' },
      { gx: cx + 1, gy: cy, type: 'MUTAGEN' },
      { gx: cx, gy: cy + 1, type: 'FABRICATOR' },
      { gx: cx - 1, gy: cy - 1, type: 'COMBAT' },
      { gx: cx + 1, gy: cy - 1, type: 'HAZARD' },
      { gx: cx, gy: cy + 2, type: 'COMBAT' }
    ];

    layout.forEach(item => {
      const room = new Room(item.gx, item.gy, item.type, this.sector);
      const key = `${item.gx},${item.gy}`;
      this.rooms.set(key, room);
      if (item.type === 'START') this.startRoom = room;
      else if (item.type === 'BOSS') this.bossRoom = room;
      else if (item.type === 'TREASURE') this.treasureRoom = room;
      else if (item.type === 'MUTAGEN') this.mutagenRoom = room;
      else if (item.type === 'FABRICATOR') this.shopRoom = room;
    });

    // Link all adjacent doors
    this.rooms.forEach(room => {
      if (this.rooms.has(`${room.gx},${room.gy - 1}`)) room.doors.north = true;
      if (this.rooms.has(`${room.gx},${room.gy + 1}`)) room.doors.south = true;
      if (this.rooms.has(`${room.gx + 1},${room.gy}`)) room.doors.east = true;
      if (this.rooms.has(`${room.gx - 1},${room.gy}`)) room.doors.west = true;
    });

    this.currentRoom = this.startRoom;
    if (this.currentRoom) {
      this.currentRoom.visited = true;
    }
  }
}

window.Room = Room;
window.Dungeon = Dungeon;
