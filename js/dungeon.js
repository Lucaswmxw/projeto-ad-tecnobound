/**
 * VOIDBOUND: DERELICT
 * Procedural Dungeon & Room Generator (The Binding of Isaac style)
 */

class Room {
  constructor(gx, gy, type = 'COMBAT', sector) {
    this.gx = gx;
    this.gy = gy;
    this.type = type; // 'START', 'COMBAT', 'TREASURE', 'MUTAGEN', 'FABRICATOR', 'HAZARD', 'BOSS'
    this.sector = sector;
    this.doors = {
      north: false,
      south: false,
      east: false,
      west: false
    };
    this.doorsLocked = false;
    this.visited = false;
    this.cleared = (type === 'START' || type === 'TREASURE' || type === 'MUTAGEN' || type === 'FABRICATOR');
    this.enemies = [];
    this.projectiles = [];
    this.obstacles = [];
    this.pickups = [];
    this.hazards = [];
    this.decorations = [];
    this.terminals = [];
    this.bossDefeated = false;
    this.airlockActive = false;
    this.vacuumBreach = (sector.hasVacuum || (type === 'HAZARD' && Math.random() < 0.6));
    
    // Layout generation
    this.initLayout();
  }

  initLayout() {
    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;
    const T = CONSTANTS.WALL_THICKNESS;

    // Generate random room decorations (pipes, floor plates, grates, bio-growths)
    const decorCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < decorCount; i++) {
      this.decorations.push({
        x: T + 40 + Math.random() * (W - 2 * T - 80),
        y: T + 40 + Math.random() * (H - 2 * T - 80),
        size: 15 + Math.random() * 30,
        type: Math.floor(Math.random() * 4),
        rotation: Math.random() * Math.PI * 2
      });
    }

    // Generate room specific obstacles based on type and sector
    if (this.type === 'START') {
      // Clean room with welcome terminal and starting supplies
      this.obstacles.push({
        x: W / 2 - 30,
        y: 120,
        w: 60,
        h: 40,
        type: 'terminal',
        label: 'CONSOLE DE DIAGNÓSTICO'
      });
    } else if (this.type === 'TREASURE') {
      // Item Pedestal in center
      this.obstacles.push({
        x: W / 2 - 25,
        y: H / 2 - 25,
        w: 50,
        h: 50,
        type: 'pedestal',
        label: 'CÁPSULA DE MÓDULO'
      });
    } else if (this.type === 'MUTAGEN') {
      // Bio-Pod in center
      this.obstacles.push({
        x: W / 2 - 30,
        y: H / 2 - 30,
        w: 60,
        h: 60,
        type: 'mutagen_pod',
        label: 'CÂMARA DE INFUSÃO ALIEN'
      });
    } else if (this.type === 'FABRICATOR') {
      // Shop terminals along walls
      this.obstacles.push(
        { x: W / 2 - 120, y: 120, w: 70, h: 45, type: 'shop_item', index: 0 },
        { x: W / 2 + 50, y: 120, w: 70, h: 45, type: 'shop_item', index: 1 },
        { x: W / 2 - 120, y: H - 160, w: 70, h: 45, type: 'shop_heal' },
        { x: W / 2 + 50, y: H - 160, w: 70, h: 45, type: 'shop_o2' }
      );
    } else if (this.type === 'BOSS') {
      // Minimal obstacles for boss fight
      this.obstacles.push(
        { x: 160, y: 160, w: 50, h: 50, type: 'pillar' },
        { x: W - 210, y: 160, w: 50, h: 50, type: 'pillar' },
        { x: 160, y: H - 210, w: 50, h: 50, type: 'pillar' },
        { x: W - 210, y: H - 210, w: 50, h: 50, type: 'pillar' }
      );
    } else {
      // COMBAT / HAZARD room layouts
      const layoutPattern = Math.floor(Math.random() * 5);
      
      if (layoutPattern === 0) {
        // 4 Central Cover Pillars
        this.obstacles.push(
          { x: W * 0.3, y: H * 0.35, w: 50, h: 50, type: 'crate' },
          { x: W * 0.7 - 50, y: H * 0.35, w: 50, h: 50, type: 'crate' },
          { x: W * 0.3, y: H * 0.65 - 50, w: 50, h: 50, type: 'crate' },
          { x: W * 0.7 - 50, y: H * 0.65 - 50, w: 50, h: 50, type: 'crate' }
        );
      } else if (layoutPattern === 1) {
        // Central block with explosive barrels around
        this.obstacles.push({ x: W / 2 - 40, y: H / 2 - 40, w: 80, h: 80, type: 'pillar' });
        this.obstacles.push(
          { x: W / 2 - 140, y: H / 2 - 20, w: 35, h: 35, type: 'explosive_barrel', hp: 20 },
          { x: W / 2 + 105, y: H / 2 - 20, w: 35, h: 35, type: 'explosive_barrel', hp: 20 }
        );
      } else if (layoutPattern === 2) {
        // Slime / Acid hazard pools or vacuum fissure
        this.hazards.push({
          x: W / 2 - 70,
          y: H / 2 - 70,
          w: 140,
          h: 140,
          type: this.sector.theme === 'organic' ? 'acid_pool' : 'electrified_grate'
        });
      } else if (layoutPattern === 3) {
        // Corner cover blocks and explosive barrels
        this.obstacles.push(
          { x: 200, y: 150, w: 70, h: 40, type: 'crate' },
          { x: W - 270, y: H - 190, w: 70, h: 40, type: 'crate' },
          { x: W / 2 - 15, y: H / 2 - 15, w: 35, h: 35, type: 'explosive_barrel', hp: 20 }
        );
      } else {
        // Symmetrical trenches / walls
        this.obstacles.push(
          { x: W / 2 - 120, y: H / 2 - 15, w: 80, h: 30, type: 'pillar' },
          { x: W / 2 + 40, y: H / 2 - 15, w: 80, h: 30, type: 'pillar' }
        );
      }
    }
  }

  // Populate enemies when the player first enters an uncleared room
  spawnEnemies() {
    if (this.cleared || this.enemies.length > 0) return;

    const W = CONSTANTS.ROOM_WIDTH;
    const H = CONSTANTS.ROOM_HEIGHT;

    if (this.type === 'BOSS') {
      // Spawn Sector Boss!
      if (this.sector.id === 1) {
        // Boss 1: Gorgon-X / Bio-Core Primus (Organic Sector)
        this.enemies.push(new BossGorgon(W / 2, H / 2));
      } else if (this.sector.id === 2) {
        // Boss 2: Titan-Omega / Mech Overlord (Robotic Sector)
        this.enemies.push(new BossTitan(W / 2, H / 2));
      } else {
        // Boss 3: Entropia / Void Reactor (Vacuum Sector)
        this.enemies.push(new BossEntropia(W / 2, H / 2));
      }
      return;
    }

    if (this.type === 'HAZARD') {
      // Warzone: Faction battle between ALIEN and ROBOT!
      // 3 Aliens vs 3 Robots
      const spawnPoints = [
        { x: 180, y: 180 }, { x: 180, y: H - 180 }, { x: 250, y: H / 2 },
        { x: W - 180, y: 180 }, { x: W - 180, y: H - 180 }, { x: W - 250, y: H / 2 }
      ];

      // Left side: Aliens
      this.enemies.push(new BioSwarmer(spawnPoints[0].x, spawnPoints[0].y));
      this.enemies.push(new BioSwarmer(spawnPoints[1].x, spawnPoints[1].y));
      this.enemies.push(new BioSpitter(spawnPoints[2].x, spawnPoints[2].y));

      // Right side: Robots
      this.enemies.push(new RoboDrone(spawnPoints[3].x, spawnPoints[3].y));
      this.enemies.push(new RoboSentry(spawnPoints[4].x, spawnPoints[4].y));
      this.enemies.push(new RoboRoller(spawnPoints[5].x, spawnPoints[5].y));
      return;
    }

    // Standard COMBAT room spawn
    const count = 3 + Math.floor(Math.random() * 3) + Math.floor(this.sector.id * 0.8);
    const primaryFaction = this.sector.theme === 'organic' ? 'alien' : (this.sector.theme === 'robotic' ? 'robot' : 'void');

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 180 + Math.random() * 80;
      const ex = W / 2 + Math.cos(angle) * dist;
      const ey = H / 2 + Math.sin(angle) * dist;

      if (primaryFaction === 'alien') {
        const roll = Math.random();
        if (roll < 0.55) {
          this.enemies.push(new BioSwarmer(ex, ey));
        } else if (roll < 0.85) {
          this.enemies.push(new BioSpitter(ex, ey));
        } else {
          this.enemies.push(new BioBrood(ex, ey));
        }
      } else if (primaryFaction === 'robot') {
        const roll = Math.random();
        if (roll < 0.45) {
          this.enemies.push(new RoboDrone(ex, ey));
        } else if (roll < 0.75) {
          this.enemies.push(new RoboSentry(ex, ey));
        } else {
          this.enemies.push(new RoboRoller(ex, ey));
        }
      } else {
        // Void sector - mixed rogue entities and void stalkers
        const roll = Math.random();
        if (roll < 0.35) {
          this.enemies.push(new VoidPhantom(ex, ey));
        } else if (roll < 0.65) {
          this.enemies.push(new RoboDrone(ex, ey));
        } else {
          this.enemies.push(new BioSpitter(ex, ey));
        }
      }
    }
  }
}

class Dungeon {
  constructor(sector) {
    this.sector = sector;
    this.gridSize = 7;
    this.rooms = new Map(); // key: "x,y" => Room
    this.startRoom = null;
    this.bossRoom = null;
    this.treasureRoom = null;
    this.mutagenRoom = null;
    this.shopRoom = null;
    this.currentRoom = null;

    this.generate();
  }

  generate() {
    const center = Math.floor(this.gridSize / 2);
    const targetRoomCount = this.sector.roomCount || 10;
    
    // Step 1: Procedural random walk BFS expansion (Isaac layout)
    const positions = [{ x: center, y: center }];
    const posSet = new Set([`${center},${center}`]);

    let safetyCount = 0;
    while (positions.length < targetRoomCount && safetyCount < 300) {
      safetyCount++;
      const basePos = positions[Math.floor(Math.random() * positions.length)];
      const dirs = [
        { dx: 0, dy: -1 }, // N
        { dx: 0, dy: 1 },  // S
        { dx: 1, dy: 0 },  // E
        { dx: -1, dy: 0 }  // W
      ];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = basePos.x + dir.dx;
      const ny = basePos.y + dir.dy;
      const key = `${nx},${ny}`;

      // Stay within grid boundaries
      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && !posSet.has(key)) {
        // Isaac rule: Don't clump too many neighbors together (maintains tree-like branching)
        let neighborCount = 0;
        dirs.forEach(d => {
          if (posSet.has(`${nx + d.dx},${ny + d.dy}`)) neighborCount++;
        });

        if (neighborCount === 1 || Math.random() < 0.35) {
          positions.push({ x: nx, y: ny });
          posSet.add(key);
        }
      }
    }

    // Step 2: Assign room roles
    // Start is at center
    const startPos = positions[0];
    const deadEnds = [];

    // Calculate distance from start and neighbor counts
    const dirs = [
      { dx: 0, dy: -1, name: 'north' },
      { dx: 0, dy: 1, name: 'south' },
      { dx: 1, dy: 0, name: 'east' },
      { dx: -1, dy: 0, name: 'west' }
    ];

    positions.forEach(p => {
      let nNeighbors = 0;
      dirs.forEach(d => {
        if (posSet.has(`${p.x + d.dx},${p.y + d.dy}`)) nNeighbors++;
      });
      const dist = Math.abs(p.x - startPos.x) + Math.abs(p.y - startPos.y);
      if (nNeighbors === 1 && (p.x !== startPos.x || p.y !== startPos.y)) {
        deadEnds.push({ ...p, dist });
      }
    });

    // Sort dead ends by distance (farthest first)
    deadEnds.sort((a, b) => b.dist - a.dist);

    // Farthest dead-end is BOSS room
    const bossPos = deadEnds.length > 0 ? deadEnds[0] : positions[positions.length - 1];
    
    // Other special rooms from remaining dead ends or outer branches
    const remainingDeadEnds = deadEnds.filter(p => `${p.x},${p.y}` !== `${bossPos.x},${bossPos.y}`);
    const treasurePos = remainingDeadEnds.length > 0 ? remainingDeadEnds[0] : positions[1];
    const mutagenPos = remainingDeadEnds.length > 1 ? remainingDeadEnds[1] : positions[2];
    const shopPos = remainingDeadEnds.length > 2 ? remainingDeadEnds[2] : positions[3];

    // Step 3: Instantiate Room objects
    positions.forEach(p => {
      const key = `${p.x},${p.y}`;
      let type = 'COMBAT';

      if (p.x === startPos.x && p.y === startPos.y) {
        type = 'START';
      } else if (p.x === bossPos.x && p.y === bossPos.y) {
        type = 'BOSS';
      } else if (p.x === treasurePos.x && p.y === treasurePos.y) {
        type = 'TREASURE';
      } else if (p.x === mutagenPos.x && p.y === mutagenPos.y) {
        type = 'MUTAGEN';
      } else if (p.x === shopPos.x && p.y === shopPos.y) {
        type = 'FABRICATOR';
      } else if (Math.random() < 0.28) {
        // Chance of Warzone / Hazard room
        type = 'HAZARD';
      }

      const room = new Room(p.x, p.y, type, this.sector);
      this.rooms.set(key, room);

      if (type === 'START') this.startRoom = room;
      if (type === 'BOSS') this.bossRoom = room;
      if (type === 'TREASURE') this.treasureRoom = room;
      if (type === 'MUTAGEN') this.mutagenRoom = room;
      if (type === 'FABRICATOR') this.shopRoom = room;
    });

    // Step 4: Configure Door connections between adjacent rooms
    this.rooms.forEach(room => {
      const northKey = `${room.gx},${room.gy - 1}`;
      const southKey = `${room.gx},${room.gy + 1}`;
      const eastKey = `${room.gx + 1},${room.gy}`;
      const westKey = `${room.gx - 1},${room.gy}`;

      if (this.rooms.has(northKey)) room.doors.north = true;
      if (this.rooms.has(southKey)) room.doors.south = true;
      if (this.rooms.has(eastKey)) room.doors.east = true;
      if (this.rooms.has(westKey)) room.doors.west = true;
    });

    // Set initial active room
    this.currentRoom = this.startRoom;
    this.currentRoom.visited = true;
  }

  getRoom(gx, gy) {
    return this.rooms.get(`${gx},${gy}`) || null;
  }
}

window.Room = Room;
window.Dungeon = Dungeon;
