/**
 * TecnoBound - Game Constants, Biomes, Modules, Mutations and Centralized Rules
 */

const CONSTANTS = {
  GAME_NAME: "TecnoBound",
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 640,
  ROOM_WIDTH: 960,
  ROOM_HEIGHT: 640,
  TILE_SIZE: 40,
  DOOR_SIZE: 80,
  WALL_THICKNESS: 40,

  // Factions for inter-faction warfare
  FACTIONS: {
    PLAYER: 'player',
    ALIEN: 'alien',
    ROBOT: 'robot',
    VOID: 'void',
    NEUTRAL: 'neutral'
  },

  // Complete 4-Sector Progression
  SECTORS: [
    {
      id: 1,
      name: "Setor 01: Biomassa Alienígena",
      subtitle: "Nave-Mãe Infestada - Zona de Incubação",
      theme: "organic",
      wallColor: "#172b1d",
      wallBevel: "#244b2f",
      floorColor: "#0d1a12",
      accentColor: "#39ff14",
      ambientMusic: "organic",
      hasVacuum: false,
      roomCount: 9,
      description: "Paredes pulsantes de biomassa viva, casulos de esporos e criaturas territoriais."
    },
    {
      id: 2,
      name: "Setor 02: Complexo Autômato",
      subtitle: "Linha de Montagem e Servidores de Defesa",
      theme: "robotic",
      wallColor: "#111c2a",
      wallBevel: "#1e344e",
      floorColor: "#0b121b",
      accentColor: "#00f0ff",
      ambientMusic: "robotic",
      hasVacuum: false,
      roomCount: 11,
      description: "Corredores industriais patrulhados por autômatos, torres sentinelas e drones de combate."
    },
    {
      id: 3,
      name: "Setor 03: Vácuo Profundo",
      subtitle: "Casco Externo Despressurizado & Núcleo de Matéria Escura",
      theme: "vacuum",
      wallColor: "#181329",
      wallBevel: "#2a2147",
      floorColor: "#080611",
      accentColor: "#bf55ec",
      ambientMusic: "vacuum",
      hasVacuum: true,
      roomCount: 12,
      description: "Casco externo rompido exposto ao espaço sideral. Gravidade instável e oxigênio finito."
    },
    {
      id: 4,
      name: "Setor 04: Núcleo da Nave",
      subtitle: "Câmara de Fusão Biomecânica Central",
      theme: "core",
      wallColor: "#2a0e1c",
      wallBevel: "#4d1b35",
      floorColor: "#140610",
      accentColor: "#ff0055",
      ambientMusic: "core",
      hasVacuum: false,
      roomCount: 9,
      description: "O coração biomecânico da estação, onde a inteligência alienígena fundiu-se aos reatores."
    }
  ],

  MODULE_SLOTS: {
    WEAPON: 'weapon',
    CHASSIS: 'chassis',
    ENGINE: 'engine',
    CORE: 'core'
  },

  // Modules Database (with SVG icon identifiers, strictly zero emojis)
  MODULES: [
    // Weapons
    {
      id: 'weapon_blaster',
      name: 'Blaster de Plasma Padrão',
      slot: 'weapon',
      rarity: 'common',
      iconKey: 'weapon_blaster',
      description: 'Dispara pulsos de plasma rápidos e precisos.',
      fireRate: 5.5,
      damage: 15,
      speed: 560,
      bulletType: 'plasma',
      cost: 15
    },
    {
      id: 'weapon_shotgun',
      name: 'Dispersor de Fótons (Shotgun)',
      slot: 'weapon',
      rarity: 'rare',
      iconKey: 'weapon_shotgun',
      description: 'Dispara um cone devastador de 5 projéteis a curta distância.',
      fireRate: 2.2,
      damage: 11,
      speed: 500,
      bulletCount: 5,
      spread: 0.38,
      bulletType: 'scatter',
      cost: 30
    },
    {
      id: 'weapon_railgun',
      name: 'Canhão Linear Magnético (Railgun)',
      slot: 'weapon',
      rarity: 'epic',
      iconKey: 'weapon_railgun',
      description: 'Dispara feixes hiper-velozes que perfuram múltiplos alvos.',
      fireRate: 1.4,
      damage: 48,
      speed: 850,
      pierce: true,
      bulletType: 'rail',
      cost: 45
    },
    {
      id: 'weapon_missile',
      name: 'Lançador de Micro-Mísseis',
      slot: 'weapon',
      rarity: 'rare',
      iconKey: 'weapon_missile',
      description: 'Dispara ogivas teleguiadas com dano em área explosivo.',
      fireRate: 1.8,
      damage: 28,
      speed: 380,
      homing: true,
      bulletType: 'missile',
      cost: 35
    },
    {
      id: 'weapon_tesla',
      name: 'Emissor de Arco Voltaico',
      slot: 'weapon',
      rarity: 'legendary',
      iconKey: 'weapon_tesla',
      description: 'Correntes de alta voltagem que saltam entre múltiplos inimigos.',
      fireRate: 3.5,
      damage: 18,
      speed: 600,
      chainTargets: 3,
      bulletType: 'lightning',
      cost: 50
    },

    // Chassis
    {
      id: 'chassis_nano',
      name: 'Carcaça de Nanite Reativo',
      slot: 'chassis',
      rarity: 'common',
      iconKey: 'chassis_armor',
      description: 'Regenera 1 ponto de escudo a cada 7 segundos sem dano.',
      shieldRegenDelay: 7,
      bonusShield: 1,
      cost: 20
    },
    {
      id: 'chassis_titanium',
      name: 'Blindagem de Titânio Reforçado',
      slot: 'chassis',
      rarity: 'rare',
      iconKey: 'chassis_shield',
      description: 'Garante +2 de Escudo Máximo e imunidade a ácido biológico.',
      bonusShield: 2,
      acidImmunity: true,
      cost: 35
    },
    {
      id: 'chassis_eva',
      name: 'Traje de Pressão EVA Grau Militar',
      slot: 'chassis',
      rarity: 'rare',
      iconKey: 'chassis_eva',
      description: 'Reduz o consumo de O2 no vácuo em 50% e resiste a descompressões.',
      o2Efficiency: 0.5,
      bonusShield: 1,
      cost: 25
    },

    // Engines
    {
      id: 'engine_booster',
      name: 'Propulsor Quântico de Impulso',
      slot: 'engine',
      rarity: 'common',
      iconKey: 'engine_booster',
      description: 'Aumenta a velocidade de movimento base em +25%.',
      speedBonus: 55,
      cost: 15
    },
    {
      id: 'engine_warp',
      name: 'Módulo de Dash de Fase',
      slot: 'engine',
      rarity: 'rare',
      iconKey: 'engine_warp',
      description: 'Reduz a recarga da esquiva e atordoa inimigos no ponto de impacto.',
      dashCooldown: 0.85,
      dashStun: true,
      cost: 30
    },
    {
      id: 'engine_overdrive',
      name: 'Injetor de Plasma Térmico',
      slot: 'engine',
      rarity: 'epic',
      iconKey: 'engine_overdrive',
      description: 'O Dash deixa um rastro de chamas que queima perseguidores.',
      fireTrail: true,
      speedBonus: 35,
      cost: 35
    },

    // Cores
    {
      id: 'core_overclock',
      name: 'Processador Cripto-Hacker',
      slot: 'core',
      rarity: 'rare',
      iconKey: 'core_hacker',
      description: 'Aumenta a duração do hack em autômatos para 14 segundos.',
      hackDurationMult: 1.75,
      cost: 25
    },
    {
      id: 'core_companion',
      name: 'Sub-rotina de Drone Sentinela',
      slot: 'core',
      rarity: 'epic',
      iconKey: 'core_drone',
      description: 'Invoca um drone cibernético autônomo que orbita e atira nos hostis.',
      hasCompanionDrone: true,
      cost: 40
    },
    {
      id: 'core_siphon',
      name: 'Sifão Eletromagnético de Sucata',
      slot: 'core',
      rarity: 'common',
      iconKey: 'core_magnet',
      description: 'Atrai sucata e fragmentos caídos em um raio ampliado.',
      vacuumRange: 200,
      cost: 20
    }
  ],

  // Alien Mutations Database (with SVG icon identifiers, strictly zero emojis)
  MUTATIONS: [
    {
      id: 'causticBile',
      name: 'Bile Cáustica Concentrada',
      iconKey: 'mutation_bio',
      boon: 'Todos os disparos deixam poças de ácido orgânico que derretem inimigos.',
      drawback: 'Velocidade de movimento do jogador reduzida em 12%.'
    },
    {
      id: 'symbioticTentacle',
      name: 'Tentáculo Simbiótico Dorsal',
      iconKey: 'mutation_tentacle',
      boon: 'Golpeia ciclicamente o inimigo hostil mais próximo a cada 2.5 segundos.',
      drawback: 'Aumenta a área de colisão (hitbox) do jogador em 15%.'
    },
    {
      id: 'predatorAdrenals',
      name: 'Glândulas Adrenais de Predador',
      iconKey: 'mutation_adrenal',
      boon: 'Abaixo de 50% de HP, cadência de tiro aumenta em +60% e dano em +35%.',
      drawback: 'O jogador não pode regenerar escudos enquanto estiver ferido.'
    },
    {
      id: 'contagiousSpores',
      name: 'Esporos Mutagênicos Voláteis',
      iconKey: 'mutation_spores',
      boon: 'Inimigos abatidos explodem liberando nuvens de esporos letais.',
      drawback: 'Ocasionalmente sofre pequenos espasmos biológicos de recuo.'
    },
    {
      id: 'chitinShell',
      name: 'Exoesqueleto de Quitina Alienígena',
      iconKey: 'mutation_chitin',
      boon: '25% de chance de defletir completamente qualquer dano recebido.',
      drawback: 'O tempo de recarga da esquiva (Dash) é aumentado em 35%.'
    },
    {
      id: 'vampiricTendrils',
      name: 'Filamentos Celulares Drenadores',
      iconKey: 'mutation_vampire',
      boon: 'Eliminar inimigos no combate restaura 1 ponto de vitalidade (HP).',
      drawback: 'Pacotes médicos comuns coletados fornecem apenas 50% de cura.'
    }
  ]
};

// ==========================================
// CENTRALIZED FACTION HOSTILITY RULES
// ==========================================
function getEffectiveFaction(entity) {
  if (!entity) return null;
  if (entity.isHacked) return CONSTANTS.FACTIONS.PLAYER;
  return entity.faction;
}

function areHostile(entityA, entityB) {
  if (!entityA || !entityB || entityA === entityB) return false;
  if (entityA.dead || entityB.dead) return false;

  const fA = getEffectiveFaction(entityA);
  const fB = getEffectiveFaction(entityB);

  if (fA === CONSTANTS.FACTIONS.NEUTRAL || fB === CONSTANTS.FACTIONS.NEUTRAL) {
    return false;
  }
  // Same effective faction is friendly!
  if (fA === fB) {
    return false;
  }
  // Different factions are hostile to each other:
  // Player & Hacked Robot vs Alien: TRUE
  // Player & Hacked Robot vs Normal Robot: TRUE
  // Alien vs Normal Robot: TRUE
  // Void vs any other faction: TRUE
  return true;
}

// ==========================================
// ZERO-EMOJI VECTOR SVG ICONS LIBRARY
// ==========================================
const Icons = {
  // HP / Vitality Cell
  hp(active = true) {
    const col = active ? '#ff0055' : '#330c18';
    const glow = active ? 'drop-shadow(0 0 3px #ff0055)' : 'none';
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="filter: ${glow};">
      <path fill="${col}" d="M8 14s-6-3.8-6-8a4 4 0 0 1 6-2 4 4 0 0 1 6 2c0 4.2-6 8-6 8z"/>
    </svg>`;
  },

  // Shield Hex Barrier
  shield(active = true) {
    const col = active ? '#00f0ff' : '#072430';
    const glow = active ? 'drop-shadow(0 0 3px #00f0ff)' : 'none';
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="filter: ${glow};">
      <polygon fill="${col}" points="8,1 15,4 15,10 8,15 1,10 1,4"/>
      <polygon fill="#000" points="8,3 13,5.5 13,9.5 8,13 3,9.5 3,5.5" opacity="0.3"/>
    </svg>`;
  },

  // Oxygen Pod / Tank
  o2() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #38bdf8;">
      <rect x="5" y="3" width="6" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <rect x="6.5" y="1" width="3" height="2" fill="currentColor"/>
      <line x1="8" y1="5" x2="8" y2="12" stroke="currentColor" stroke-width="1.2"/>
    </svg>`;
  },

  // EMP Hack Lightning
  hack() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #bf55ec;">
      <polygon fill="currentColor" points="9,1 2,9 7,9 6,15 14,7 9,7"/>
    </svg>`;
  },

  // Scrap / Nanite Resource (Hex bolt)
  scrap() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #f59e0b;">
      <polygon fill="currentColor" points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5"/>
      <circle cx="8" cy="8" r="2.5" fill="#07090e"/>
    </svg>`;
  },

  // Blaster
  weapon_blaster() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #00f0ff;">
      <rect x="2" y="5" width="10" height="4" fill="currentColor"/>
      <rect x="9" y="4" width="4" height="6" fill="currentColor"/>
      <rect x="3" y="9" width="3" height="5" fill="currentColor"/>
      <rect x="12" y="6" width="3" height="2" fill="#fff"/>
    </svg>`;
  },

  // Shotgun
  weapon_shotgun() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #f59e0b;">
      <rect x="1" y="6" width="12" height="3" fill="currentColor"/>
      <rect x="1" y="9.5" width="12" height="2" fill="currentColor"/>
      <rect x="2" y="12" width="4" height="3" fill="currentColor"/>
    </svg>`;
  },

  // Railgun
  weapon_railgun() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #bf55ec;">
      <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" stroke-width="2"/>
      <line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="2"/>
      <rect x="5" y="7" width="6" height="2" fill="#fff"/>
    </svg>`;
  },

  // Missile
  weapon_missile() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #ff2a5f;">
      <polygon fill="currentColor" points="14,8 8,4 2,5 4,8 2,11 8,12"/>
      <polygon fill="#ffaa00" points="1,8 3,7 3,9"/>
    </svg>`;
  },

  // Tesla
  weapon_tesla() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #38bdf8;">
      <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>
    </svg>`;
  },

  // Chassis
  chassis_armor() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #00f0ff;">
      <polygon fill="currentColor" points="8,1 15,3 13,13 8,15 3,13 1,3"/>
    </svg>`;
  },
  chassis_shield() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #38bdf8;">
      <polygon fill="none" stroke="currentColor" stroke-width="2" points="8,2 14,4 12,12 8,14 4,12 2,4"/>
    </svg>`;
  },
  chassis_eva() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #39ff14;">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
      <rect x="5" y="6" width="6" height="4" rx="1" fill="currentColor"/>
    </svg>`;
  },

  // Engine
  engine_booster() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #39ff14;">
      <polygon fill="currentColor" points="2,14 8,2 14,14 8,11"/>
    </svg>`;
  },
  engine_warp() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #bf55ec;">
      <polygon fill="currentColor" points="1,8 7,2 7,6 15,6 15,10 7,10 7,14"/>
    </svg>`;
  },
  engine_overdrive() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #ff2a5f;">
      <polygon fill="currentColor" points="8,1 11,6 15,8 11,10 8,15 5,10 1,8 5,6"/>
    </svg>`;
  },

  // Core
  core_hacker() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #00f0ff;">
      <rect x="4" y="4" width="8" height="8" fill="currentColor"/>
      <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" stroke-width="1.5"/>
      <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>
      <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" stroke-width="1.5"/>
      <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>
    </svg>`;
  },
  core_drone() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #38bdf8;">
      <circle cx="8" cy="8" r="3" fill="currentColor"/>
      <circle cx="3" cy="3" r="2" fill="currentColor"/>
      <circle cx="13" cy="3" r="2" fill="currentColor"/>
      <circle cx="3" cy="13" r="2" fill="currentColor"/>
      <circle cx="13" cy="13" r="2" fill="currentColor"/>
    </svg>`;
  },
  core_magnet() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #f59e0b;">
      <path fill="none" stroke="currentColor" stroke-width="3" d="M3 3 v6 a5 5 0 0 0 10 0 v-6"/>
      <rect x="2" y="2" width="2" height="3" fill="#ff0055"/>
      <rect x="12" y="2" width="2" height="3" fill="#00f0ff"/>
    </svg>`;
  },

  // Mutations
  mutation_bio() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #39ff14;">
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="5" cy="5" r="2" fill="currentColor"/>
      <circle cx="11" cy="7" r="1.5" fill="currentColor"/>
    </svg>`;
  },
  mutation_tentacle() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #bf55ec;">
      <path fill="none" stroke="currentColor" stroke-width="2" d="M3 14 Q 5 6 9 7 T 14 2"/>
    </svg>`;
  },
  mutation_adrenal() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #ff0055;">
      <polygon fill="currentColor" points="8,1 14,14 2,14"/>
      <circle cx="8" cy="10" r="2" fill="#000"/>
    </svg>`;
  },
  mutation_spores() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #22c55e;">
      <circle cx="6" cy="6" r="3" fill="currentColor"/>
      <circle cx="11" cy="10" r="2.5" fill="currentColor"/>
      <circle cx="5" cy="12" r="2" fill="currentColor"/>
    </svg>`;
  },
  mutation_chitin() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #eab308;">
      <ellipse cx="8" cy="8" rx="6" ry="7" fill="none" stroke="currentColor" stroke-width="2"/>
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>
    </svg>`;
  },
  mutation_vampire() {
    return `<svg class="svg-icon" viewBox="0 0 16 16" style="color: #ff2a5f;">
      <path fill="currentColor" d="M8 1 C 4 6 3 9 3 11 a5 5 0 0 0 10 0 C 13 9 12 6 8 1 Z"/>
    </svg>`;
  },

  // Audio / Sound Controls
  soundOn() {
    return `<svg class="svg-icon" viewBox="0 0 16 16">
      <polygon fill="currentColor" points="2,5 5,5 9,2 9,14 5,11 2,11"/>
      <path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 4 a5 5 0 0 1 0 8 M14 2 a8 8 0 0 1 0 12"/>
    </svg>`;
  },
  soundOff() {
    return `<svg class="svg-icon" viewBox="0 0 16 16">
      <polygon fill="currentColor" points="2,5 5,5 9,2 9,14 5,11 2,11"/>
      <line x1="11" y1="5" x2="15" y2="11" stroke="#ff2a5f" stroke-width="1.8"/>
      <line x1="15" y1="5" x2="11" y2="11" stroke="#ff2a5f" stroke-width="1.8"/>
    </svg>`;
  },

  // Loadout / Settings Cog
  gear() {
    return `<svg class="svg-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2" d="M8 1 a7 7 0 1 0 0.1 0"/>
    </svg>`;
  },

  // Pause
  pause() {
    return `<svg class="svg-icon" viewBox="0 0 16 16">
      <rect x="4" y="3" width="3" height="10" fill="currentColor"/>
      <rect x="9" y="3" width="3" height="10" fill="currentColor"/>
    </svg>`;
  },

  // Generic getter
  get(key) {
    if (this[key] && typeof this[key] === 'function') {
      return this[key]();
    }
    return '';
  }
};

window.CONSTANTS = CONSTANTS;
window.Icons = Icons;
window.areHostile = areHostile;
window.getEffectiveFaction = getEffectiveFaction;
