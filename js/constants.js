/**
 * VOIDBOUND: DERELICT
 * Game Constants, Definitions, Biomes, Modules and Mutations
 */

const CONSTANTS = {
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

  // Sectors / Biomes
  SECTORS: [
    {
      id: 1,
      name: "Setor 01: Biomassa Alienígena",
      subtitle: "Nave-Mãe Infestada - Zona de Incubação",
      theme: "organic",
      bgColor: "#0d1a10",
      wallColor: "#1a3820",
      accentColor: "#39ff14",
      floorColor: "#0f2316",
      ambientMusic: "organic",
      hasVacuum: false,
      roomCount: 9,
      description: "Paredes cobertas de biomassa viva, casulos de esporos e criaturas alienígenas territoriais."
    },
    {
      id: 2,
      name: "Setor 02: Complexo Autômato",
      subtitle: "Linha de Montagem e Servidores de Defesa",
      theme: "robotic",
      bgColor: "#0b141e",
      wallColor: "#14283c",
      accentColor: "#00f0ff",
      floorColor: "#0f1c2b",
      ambientMusic: "robotic",
      hasVacuum: false,
      roomCount: 12,
      description: "Corredores cibernéticos patrulhados por drones de combate, torres sentinelas e mechas descontrolados."
    },
    {
      id: 3,
      name: "Setor 03: Vácuo Profundo",
      subtitle: "Casco Externo Despressurizado & Núcleo de Matéria Escura",
      theme: "vacuum",
      bgColor: "#070712",
      wallColor: "#1d1933",
      accentColor: "#bf55ec",
      floorColor: "#0e0d1f",
      ambientMusic: "vacuum",
      hasVacuum: true,
      roomCount: 14,
      description: "Setor com fendas no casco expostas ao espaço sideral. Oxigênio limitado e anomalias de gravidade zero."
    }
  ],

  // Modular Slots
  MODULE_SLOTS: {
    WEAPON: 'weapon',
    CHASSIS: 'chassis',
    ENGINE: 'engine',
    CORE: 'core'
  },

  // Robotic Modules Database
  MODULES: [
    // Weapons
    {
      id: 'weapon_blaster',
      name: 'Blaster de Plasma Padrão',
      slot: 'weapon',
      rarity: 'common',
      icon: '🔫',
      description: 'Dispara pulsos de plasma rápidos e precisos.',
      fireRate: 5.5, // shots per sec
      damage: 14,
      speed: 550,
      accuracy: 0.96,
      bulletType: 'plasma',
      cost: 15
    },
    {
      id: 'weapon_shotgun',
      name: 'Dispersor de Fótons (Shotgun)',
      slot: 'weapon',
      rarity: 'rare',
      icon: '💥',
      description: 'Dispara uma rajada de 5 projéteis de alto impacto e repulsão.',
      fireRate: 2.0,
      damage: 11, // per pellet (5x)
      pellets: 5,
      spread: 0.38,
      speed: 460,
      knockback: 1.8,
      bulletType: 'scatter',
      cost: 30
    },
    {
      id: 'weapon_railgun',
      name: 'Canhão de Trânsito (Railgun)',
      slot: 'weapon',
      rarity: 'rare',
      icon: '⚡',
      description: 'Dispara um feixe de alta energia que perfura múltiplos alvos e causa dano massivo.',
      fireRate: 1.2,
      damage: 48,
      speed: 900,
      pierce: 4,
      bulletType: 'rail',
      cost: 35
    },
    {
      id: 'weapon_missiles',
      name: 'Lança Micro-Mísseis',
      slot: 'weapon',
      rarity: 'epic',
      icon: '🚀',
      description: 'Lança mísseis autoguiados que perseguem os alvos hostis mais próximos.',
      fireRate: 2.8,
      damage: 22,
      speed: 380,
      homing: true,
      bulletType: 'missile',
      cost: 45
    },
    {
      id: 'weapon_arc',
      name: 'Emissor de Arco Elétrico',
      slot: 'weapon',
      rarity: 'epic',
      icon: '🌩️',
      description: 'Dispara correntes de eletricidade que saltam entre inimigos próximos.',
      fireRate: 3.2,
      damage: 18,
      speed: 600,
      chainTargets: 3,
      bulletType: 'arc',
      cost: 40
    },

    // Chassis
    {
      id: 'chassis_nano',
      name: 'Escudo Nanite Adaptativo',
      slot: 'chassis',
      rarity: 'common',
      icon: '🛡️',
      description: 'Regenera 1 ponto de escudo a cada 7 segundos sem sofrer dano. +1 Escudo Máximo.',
      bonusShield: 1,
      shieldRegenDelay: 7.0,
      cost: 20
    },
    {
      id: 'chassis_reactive',
      name: 'Blindagem de Pulso Reativo',
      slot: 'chassis',
      rarity: 'rare',
      icon: '💠',
      description: 'Ao perder o escudo, libera uma onda de choque EMP que empurra e atordoa inimigos próximos.',
      empOnBreak: true,
      bonusHp: 1,
      cost: 30
    },
    {
      id: 'chassis_vacuum',
      name: 'Armadura Selada de Vácuo',
      slot: 'chassis',
      rarity: 'rare',
      icon: '🤿',
      description: 'Reduz o consumo de Oxigênio no Vácuo em 50% e confere resistência a gases e poças ácidas.',
      o2Efficiency: 0.5,
      acidImmunity: true,
      cost: 28
    },

    // Engine
    {
      id: 'engine_booster',
      name: 'Propulsor de Hiperespaço',
      slot: 'engine',
      rarity: 'common',
      icon: '💨',
      description: 'Permite uma esquiva rápida (Dash com [Shift] ou [Espaço]) com frames de invulnerabilidade.',
      dashCooldown: 1.5,
      speedBonus: 15,
      cost: 20
    },
    {
      id: 'engine_warp',
      name: 'Flash Quântico',
      slot: 'engine',
      rarity: 'rare',
      icon: '✨',
      description: 'O Dash agora emite uma explosão de luz que atordoa e cega inimigos na origem.',
      dashStun: true,
      dashCooldown: 1.8,
      speedBonus: 25,
      cost: 35
    },
    {
      id: 'engine_combustion',
      name: 'Pós-Combustão Quântica',
      slot: 'engine',
      rarity: 'epic',
      icon: '🔥',
      description: 'Deixa um rastro de plasma fervente ao se mover e durante o Dash, queimando inimigos que pisarem nele.',
      fireTrail: true,
      speedBonus: 30,
      cost: 40
    },

    // Core
    {
      id: 'core_overclock',
      name: 'Transmissor Overclock (Hack Duplo)',
      slot: 'core',
      rarity: 'rare',
      icon: '💻',
      description: 'Aumenta a duração do hackeamento de robôs em 75% e recarrega o feixe EMP 40% mais rápido.',
      hackDurationMult: 1.75,
      hackCooldownMult: 0.6,
      cost: 30
    },
    {
      id: 'core_drone',
      name: 'Drone de Apoio Sentinel-X',
      slot: 'core',
      rarity: 'epic',
      icon: '🤖',
      description: 'Um drone autônomo flutua ao seu redor disparando tiros de apoio contra alvos hostis.',
      hasCompanionDrone: true,
      cost: 45
    },
    {
      id: 'core_magnet',
      name: 'Magneto de Sucata & O2',
      slot: 'core',
      rarity: 'common',
      icon: '🧲',
      description: 'Atrai automaticamente Sucata, Cápsulas de Nanite e Tanques de O2 a longa distância.',
      pickupRadiusMult: 3.5,
      cost: 20
    }
  ],

  // Alien Mutations Database (Double-edged: Boon & Drawback)
  MUTATIONS: [
    {
      id: 'mut_caustic_bile',
      name: 'Bílis Cáustica',
      icon: '🧪',
      boon: 'Todos os seus tiros deixam poças de ácido tóxico que derretem inimigos.',
      drawback: 'Seu metabolismo fica pesado: -12% de velocidade de movimento.',
      apply: (player) => {
        player.mutations.causticBile = true;
        player.speedMult *= 0.88;
      }
    },
    {
      id: 'mut_symbiotic_tentacle',
      name: 'Tentáculo Simbiótico',
      icon: '🐙',
      boon: 'Um tentáculo surge a cada 2.5s chicoteando inimigos próximos com alto dano físico e repulsão.',
      drawback: 'O organismo parasita consome sua rede de escudos: Escudo Máximo reduzido em 1.',
      apply: (player) => {
        player.mutations.symbioticTentacle = true;
        player.maxShield = Math.max(1, player.maxShield - 1);
        player.shield = Math.min(player.shield, player.maxShield);
      }
    },
    {
      id: 'mut_predator_adrenals',
      name: 'Glândula Predatória',
      icon: '🩸',
      boon: 'Quando abaixo de 50% da vida, sua cadência de tiro aumenta em 60% e causa +35% de dano.',
      drawback: 'Sede de sangue: perde 1 ponto de vida a cada 60s se passar mais de 20s fora de combate.',
      apply: (player) => {
        player.mutations.predatorAdrenals = true;
      }
    },
    {
      id: 'mut_contagious_spores',
      name: 'Esporos Contagiosos',
      icon: '🍄',
      boon: 'Inimigos mortos explodem em uma nuvem de esporos que infecta outros alvos com dano contínuo.',
      drawback: 'Espasmos neuronais: a cada 15 segundos ocorre um tremor motor involuntário.',
      apply: (player) => {
        player.mutations.contagiousSpores = true;
      }
    },
    {
      id: 'mut_chitin_shell',
      name: 'Carcaça Quitinosa',
      icon: '🪲',
      boon: '+2 de Vida Máxima e 25% de chance de repelir qualquer ataque sofrido.',
      drawback: 'A couraça endurecida interfere no chip neural: tempo de recarga do Hack aumenta em 35%.',
      apply: (player) => {
        player.mutations.chitinShell = true;
        player.maxHp += 2;
        player.hp += 2;
        player.hackCooldownBonus += 1.0;
      }
    },
    {
      id: 'mut_vampiric_tendrils',
      name: 'Fios Vampíricos',
      icon: '💉',
      boon: 'Eliminar 8 inimigos restaura instantaneamente 1 Ponto de Vida.',
      drawback: 'Kits médicos de Nanite comuns curam apenas metade da eficácia original.',
      apply: (player) => {
        player.mutations.vampiricTendrils = true;
        player.vampireKillsNeeded = 8;
        player.vampireKillCounter = 0;
      }
    }
  ]
};

// Expose to window for clean global access
window.CONSTANTS = CONSTANTS;
