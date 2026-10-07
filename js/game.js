/**
 * TecnoBound - Main Game Controller, Input System, PixelArt Engine, Collisions and Loop
 */

// ==========================================
// 1. INPUT SYSTEM (Desktop & Mobile Pointer Events)
// ==========================================
class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.justPressed = {};

    this.mouseX = CONSTANTS.CANVAS_WIDTH / 2;
    this.mouseY = CONSTANTS.CANVAS_HEIGHT / 2;
    this.mouseDown = false;
    this.rightMouseDown = false;

    this.isTouchDevice = false;
    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      dx: 0,
      dy: 0
    };

    this.touchAim = {
      active: false,
      pointerId: null,
      x: CONSTANTS.CANVAS_WIDTH / 2,
      y: CONSTANTS.CANVAS_HEIGHT / 2,
      firing: false
    };

    this.initDesktop();
    this.initMobileTouch();
    this.initFocusHandlers();
  }

  initDesktop() {
    window.addEventListener('keydown', (e) => {
      if (window.soundEngine) window.soundEngine.ensureContext();
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.updateMouseCoords(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (window.soundEngine) window.soundEngine.ensureContext();
      this.updateMouseCoords(e.clientX, e.clientY);
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateMouseCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scaleX = CONSTANTS.CANVAS_WIDTH / rect.width;
    const scaleY = CONSTANTS.CANVAS_HEIGHT / rect.height;
    this.mouseX = Math.max(0, Math.min(CONSTANTS.CANVAS_WIDTH, (clientX - rect.left) * scaleX));
    this.mouseY = Math.max(0, Math.min(CONSTANTS.CANVAS_HEIGHT, (clientY - rect.top) * scaleY));
  }

  initMobileTouch() {
    const joystickZone = document.getElementById('joystickZone');
    const joystickKnob = document.getElementById('joystickKnob');
    const mobileOverlay = document.getElementById('mobileControls');

    const activateMobileUI = () => {
      if (!this.isTouchDevice) {
        this.isTouchDevice = true;
        if (mobileOverlay) mobileOverlay.style.display = 'block';
      }
    };

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') activateMobileUI();
    }, { passive: true });

    // Pointer-based Virtual Joystick
    if (joystickZone && joystickKnob) {
      joystickZone.addEventListener('pointerdown', (e) => {
        if (window.soundEngine) window.soundEngine.ensureContext();
        e.preventDefault();
        try { joystickZone.setPointerCapture(e.pointerId); } catch (err) {}

        const rect = joystickZone.getBoundingClientRect();
        this.joystick.active = true;
        this.joystick.pointerId = e.pointerId;
        this.joystick.startX = rect.left + rect.width / 2;
        this.joystick.startY = rect.top + rect.height / 2;
        this.updateJoystick(e.clientX, e.clientY, joystickKnob);
      });

      joystickZone.addEventListener('pointermove', (e) => {
        if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return;
        e.preventDefault();
        this.updateJoystick(e.clientX, e.clientY, joystickKnob);
      });

      const endJoystick = (e) => {
        if (e.pointerId === this.joystick.pointerId) {
          this.joystick.active = false;
          this.joystick.pointerId = null;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
          joystickKnob.style.transform = `translate(0px, 0px)`;
          try { joystickZone.releasePointerCapture(e.pointerId); } catch (err) {}
        }
      };

      joystickZone.addEventListener('pointerup', endJoystick);
      joystickZone.addEventListener('pointercancel', endJoystick);
    }

    // Direct Touch Aim / Fire on Canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        if (window.soundEngine) window.soundEngine.ensureContext();
        this.touchAim.active = true;
        this.touchAim.pointerId = e.pointerId;
        this.touchAim.firing = true;
        this.updateMouseCoords(e.clientX, e.clientY);
      }
    }, { passive: true });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.touchAim.active && e.pointerId === this.touchAim.pointerId) {
        this.updateMouseCoords(e.clientX, e.clientY);
      }
    }, { passive: true });

    const endTouchAim = (e) => {
      if (e.pointerId === this.touchAim.pointerId) {
        this.touchAim.active = false;
        this.touchAim.pointerId = null;
        this.touchAim.firing = false;
      }
    };

    this.canvas.addEventListener('pointerup', endTouchAim, { passive: true });
    this.canvas.addEventListener('pointercancel', endTouchAim, { passive: true });

    // Touch Action Buttons
    const btnTouchDash = document.getElementById('btnTouchDash');
    if (btnTouchDash) {
      btnTouchDash.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed['Space'] = true;
        this.keys['Space'] = true;
      });
      btnTouchDash.addEventListener('pointerup', () => { this.keys['Space'] = false; });
      btnTouchDash.addEventListener('pointercancel', () => { this.keys['Space'] = false; });
    }

    const btnTouchHack = document.getElementById('btnTouchHack');
    if (btnTouchHack) {
      btnTouchHack.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed['KeyE'] = true;
        this.keys['KeyE'] = true;
      });
      btnTouchHack.addEventListener('pointerup', () => { this.keys['KeyE'] = false; });
      btnTouchHack.addEventListener('pointercancel', () => { this.keys['KeyE'] = false; });
    }

    const btnTouchFire = document.getElementById('btnTouchFire');
    if (btnTouchFire) {
      btnTouchFire.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.mouseDown = true;
      });
      btnTouchFire.addEventListener('pointerup', () => { this.mouseDown = false; });
      btnTouchFire.addEventListener('pointercancel', () => { this.mouseDown = false; });
    }

    const btnTouchInteract = document.getElementById('btnTouchInteract');
    if (btnTouchInteract) {
      btnTouchInteract.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed['Tab'] = true;
      });
    }

    const btnTouchPause = document.getElementById('btnTouchPause');
    if (btnTouchPause) {
      btnTouchPause.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.justPressed['Escape'] = true;
      });
    }
  }

  updateJoystick(clientX, clientY, knobEl) {
    const maxDist = 38;
    const diffX = clientX - this.joystick.startX;
    const diffY = clientY - this.joystick.startY;
    const dist = Math.hypot(diffX, diffY);

    if (dist === 0) {
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      knobEl.style.transform = `translate(0px, 0px)`;
      return;
    }

    const clampedDist = Math.min(dist, maxDist);
    const normX = diffX / dist;
    const normY = diffY / dist;

    this.joystick.dx = normX * (clampedDist / maxDist);
    this.joystick.dy = normY * (clampedDist / maxDist);

    knobEl.style.transform = `translate(${normX * clampedDist}px, ${normY * clampedDist}px)`;
  }

  initFocusHandlers() {
    window.addEventListener('blur', () => this.resetInputState());
    window.addEventListener('focus', () => this.clearMomentaryInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetInputState();
      else this.clearMomentaryInputs();
    });
    window.addEventListener('pointercancel', () => this.clearMomentaryInputs());
  }

  clearMomentaryInputs() {
    this.justPressed = {};
    this.mouseDown = false;
    this.rightMouseDown = false;
    if (this.touchAim) {
      this.touchAim.firing = false;
      this.touchAim.active = false;
      this.touchAim.pointerId = null;
    }
    if (this.joystick) {
      this.joystick.active = false;
      this.joystick.pointerId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    }
    const knob = document.getElementById('joystickKnob');
    if (knob) knob.style.transform = `translate(0px, 0px)`;
  }

  resetInputState() {
    this.keys = {};
    this.clearMomentaryInputs();
  }

  postUpdate() {
    this.justPressed = {};
  }
}

// ==========================================
// 2. PIXEL ART GRAPHICS ENGINE
// ==========================================
const PixelArt = {
  px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  },

  drawFloor(ctx, room, W, H, T) {
    const theme = room.sector.theme;
    ctx.fillStyle = room.sector.floorColor;
    ctx.fillRect(T, T, W - 2 * T, H - 2 * T);

    const step = CONSTANTS.TILE_SIZE;

    // Floor tile grid lines with subtle contrast
    ctx.strokeStyle = room.sector.wallColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.28;

    for (let x = T; x < W - T; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, T);
      ctx.lineTo(x, H - T);
      ctx.stroke();
    }
    for (let y = T; y < H - T; y += step) {
      ctx.beginPath();
      ctx.moveTo(T, y);
      ctx.lineTo(W - T, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Sector-specific detailed retro environmental floor plating
    if (theme === 'organic') {
      // Sector 1: Alien Biomass Creep, Spores and Organic Veins
      ctx.fillStyle = '#163820';
      for (let x = T + 20; x < W - T; x += 80) {
        for (let y = T + 20; y < H - T; y += 80) {
          ctx.fillRect(x + 2, y + 4, 12, 3);
          ctx.fillRect(x + 4, y + 2, 8, 7);
          ctx.fillStyle = '#22543d';
          ctx.fillRect(x + 5, y + 4, 4, 3);
          ctx.fillStyle = '#163820';
        }
      }
    } else if (theme === 'robotic') {
      // Sector 2: Industrial Steel Decking, Rivets and Circuit Conduits
      ctx.fillStyle = '#0f2744';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;
      for (let x = T + step; x < W - T; x += step * 2) {
        ctx.beginPath();
        ctx.moveTo(x, T);
        ctx.lineTo(x, H - T);
        ctx.stroke();
        // Bolt rivets at tile corners
        ctx.fillStyle = '#38bdf8';
        for (let y = T + step; y < H - T; y += step * 2) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
      ctx.globalAlpha = 1.0;
    } else if (theme === 'vacuum') {
      // Sector 3: Vacuum Hull Plating with Hull Fractures and Starfield Specks
      ctx.fillStyle = '#e2e8f0';
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 18; i++) {
        const sx = T + 30 + ((i * 137) % (W - 2 * T - 60));
        const sy = T + 30 + ((i * 219) % (H - 2 * T - 60));
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1.0;
    } else if (theme === 'core') {
      // Sector 4: Reactor Energy Grid & Thermal Conduits
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 140, 0, Math.PI * 2);
      ctx.arc(W / 2, H / 2, 220, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Dynamic Room Decorations
    if (room.decorations) {
      room.decorations.forEach(dec => {
        if (theme === 'organic') {
          // Alien bio-pustule or moss cluster
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.arc(dec.x, dec.y, dec.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#39ff14';
          ctx.fillRect(dec.x - 2, dec.y - 2, 4, 4);
        } else if (theme === 'robotic') {
          // Floor ventilation grill or data junction
          ctx.fillStyle = '#0b192c';
          ctx.fillRect(dec.x, dec.y, dec.size, dec.size * 0.6);
          ctx.strokeStyle = '#1e3a5f';
          ctx.lineWidth = 1;
          ctx.strokeRect(dec.x, dec.y, dec.size, dec.size * 0.6);
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(dec.x + 3, dec.y + 3, 3, 3);
        } else if (theme === 'vacuum') {
          // Reinforced hull patch
          ctx.fillStyle = '#17122b';
          ctx.fillRect(dec.x, dec.y, dec.size * 0.7, dec.size * 0.7);
          ctx.strokeStyle = '#bf55ec';
          ctx.lineWidth = 1;
          ctx.strokeRect(dec.x, dec.y, dec.size * 0.7, dec.size * 0.7);
        } else {
          // Core energy vent
          ctx.fillStyle = '#2a0e1c';
          ctx.fillRect(dec.x, dec.y, dec.size * 0.6, dec.size * 0.6);
          ctx.fillStyle = '#ff2a5f';
          ctx.fillRect(dec.x + 2, dec.y + 2, 3, 3);
        }
      });
    }
  },

  drawWalls(ctx, room, W, H, T) {
    const mainCol = room.sector.wallColor;
    const bevelCol = room.sector.wallBevel;
    const accentCol = room.sector.accentColor || '#00f0ff';

    // North Wall
    ctx.fillStyle = mainCol;
    ctx.fillRect(0, 0, W, T);
    ctx.fillStyle = bevelCol;
    ctx.fillRect(0, T - 5, W, 5);
    // Bevel highlights
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, 3);

    // South Wall
    ctx.fillStyle = mainCol;
    ctx.fillRect(0, H - T, W, T);
    ctx.fillStyle = bevelCol;
    ctx.fillRect(0, H - T, W, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, H - 3, W, 3);

    // West Wall
    ctx.fillStyle = mainCol;
    ctx.fillRect(0, 0, T, H);
    ctx.fillStyle = bevelCol;
    ctx.fillRect(T - 5, 0, 5, H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 3, H);

    // East Wall
    ctx.fillStyle = mainCol;
    ctx.fillRect(W - T, 0, T, H);
    ctx.fillStyle = bevelCol;
    ctx.fillRect(W - T, 0, 5, H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(W - 3, 0, 3, H);

    // Sci-Fi Wall Seams and Conduit Accents
    ctx.fillStyle = accentCol;
    ctx.globalAlpha = 0.55;
    for (let x = 120; x < W - 120; x += 160) {
      ctx.fillRect(x, T - 8, 12, 3);
      ctx.fillRect(x, H - T + 5, 12, 3);
    }
    for (let y = 120; y < H - 120; y += 140) {
      ctx.fillRect(T - 8, y, 3, 12);
      ctx.fillRect(W - T + 5, y, 3, 12);
    }
    ctx.globalAlpha = 1.0;
  },

  drawDoor(ctx, x, y, dir, open, locked, theme) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const D = CONSTANTS.DOOR_SIZE;
    const T = CONSTANTS.WALL_THICKNESS;

    let dw = D;
    let dh = T;
    if (dir === 'west' || dir === 'east') {
      dw = T;
      dh = D;
    }

    // Door Frame Bulkhead
    ctx.fillStyle = '#060b13';
    ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);

    if (locked) {
      // Locked Blast Door: Crimson laser grid and hazard chevrons
      ctx.fillStyle = '#55081c';
      ctx.fillRect(-dw / 2 + 4, -dh / 2 + 4, dw - 8, dh - 8);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.strokeRect(-dw / 2 + 4, -dh / 2 + 4, dw - 8, dh - 8);

      // Warning hazard stripes
      ctx.fillStyle = '#ffaa00';
      if (dw > dh) {
        for (let i = -dw / 2 + 10; i < dw / 2 - 10; i += 14) {
          ctx.fillRect(i, -dh / 2 + 6, 6, dh - 12);
        }
      } else {
        for (let i = -dh / 2 + 10; i < dh / 2 - 10; i += 14) {
          ctx.fillRect(-dw / 2 + 6, i, dw - 12, 6);
        }
      }

      // Center lock core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (open) {
      // Open / Cleared Doorway: Deep access tunnel with glowing cyan energy field
      ctx.fillStyle = '#020509';
      ctx.fillRect(-dw / 2 + 2, -dh / 2 + 2, dw - 4, dh - 4);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-dw / 2 + 2, -dh / 2 + 2, dw - 4, dh - 4);

      // Entry chevrons
      ctx.fillStyle = '#38bdf8';
      if (dir === 'north') {
        ctx.fillRect(-8, -2, 16, 2);
        ctx.fillRect(-4, -5, 8, 2);
      } else if (dir === 'south') {
        ctx.fillRect(-8, 0, 16, 2);
        ctx.fillRect(-4, 3, 8, 2);
      } else if (dir === 'west') {
        ctx.fillRect(-2, -8, 2, 16);
        ctx.fillRect(-5, -4, 2, 8);
      } else {
        ctx.fillRect(0, -8, 2, 16);
        ctx.fillRect(3, -4, 2, 8);
      }
    }
    ctx.restore();
  },

  drawObstacle(ctx, obs, theme) {
    if (obs.type === 'pillar') {
      // Reinforced Structural Octagonal Column
      ctx.fillStyle = '#081320';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      // Chamfered sci-fi corners
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(obs.x + 3, obs.y + 3, obs.w - 6, obs.h - 6);

      // Outer metallic bevel border
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // Hazard chevrons on top/bottom
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(obs.x + 4, obs.y + 2, 6, 3);
      ctx.fillRect(obs.x + obs.w - 10, obs.y + 2, 6, 3);
      ctx.fillRect(obs.x + 4, obs.y + obs.h - 5, 6, 3);
      ctx.fillRect(obs.x + obs.w - 10, obs.y + obs.h - 5, 6, 3);

      // Central glowing power conduit
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(obs.x + obs.w / 2 - 3, obs.y + 8, 6, obs.h - 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(obs.x + obs.w / 2 - 1, obs.y + 10, 2, obs.h - 20);
    } else if (obs.type === 'terminal') {
      // Retro Diagnostic Workstation Terminal
      ctx.fillStyle = '#0b1626';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // CRT Display Screen
      ctx.fillStyle = '#021814';
      ctx.fillRect(obs.x + 8, obs.y + 6, obs.w - 16, obs.h - 20);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x + 8, obs.y + 6, obs.w - 16, obs.h - 20);

      // Scrolling green code lines
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(obs.x + 12, obs.y + 10, obs.w - 24, 2);
      ctx.fillRect(obs.x + 12, obs.y + 14, obs.w - 32, 2);
      ctx.fillRect(obs.x + 12, obs.y + 18, obs.w - 20, 2);

      // Keyboard Tray & Status LEDs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x + 8, obs.y + obs.h - 11, obs.w - 16, 6);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(obs.x + 10, obs.y + obs.h - 9, 3, 3);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(obs.x + 16, obs.y + obs.h - 9, 3, 3);
    } else if (obs.type === 'pedestal') {
      // High-Tech Module Pedestal
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = obs.claimed ? '#334155' : '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // Inner platform bevel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 8);

      if (!obs.claimed) {
        // Floating Holographic Module Cell
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obs.x + obs.w / 2 - 4, obs.y + obs.h / 2 - 4, 8, 8);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 16, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#475569';
        ctx.fillRect(obs.x + obs.w / 2 - 6, obs.y + obs.h / 2 - 6, 12, 12);
      }
    } else if (obs.type === 'mutagen_pod') {
      // Alien Mutagen Stasis Pod Cylinder
      ctx.fillStyle = '#051b11';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = obs.claimed ? '#334155' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // Stasis tube glass
      ctx.fillStyle = '#0b2e1e';
      ctx.fillRect(obs.x + 6, obs.y + 6, obs.w - 12, obs.h - 12);

      if (!obs.claimed) {
        // Glowing alien bio-organism floating inside
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        // Symbiont core & bubbles
        ctx.fillStyle = '#86efac';
        ctx.fillRect(obs.x + obs.w / 2 - 4, obs.y + obs.h / 2 - 6, 8, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obs.x + obs.w / 2 + 5, obs.y + obs.h / 2 - 8, 2, 2);
        ctx.fillRect(obs.x + obs.w / 2 - 7, obs.y + obs.h / 2 + 4, 2, 2);
      } else {
        ctx.fillStyle = '#1e3a2b';
        ctx.fillRect(obs.x + 8, obs.y + 8, obs.w - 16, obs.h - 16);
      }
    } else if (obs.type.startsWith('shop_')) {
      // Automated Cyber Fabricator / Vending Terminal
      ctx.fillStyle = '#0b1626';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = obs.bought ? '#334155' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // Display window
      ctx.fillStyle = '#060d17';
      ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 18);

      ctx.fillStyle = obs.bought ? '#475569' : '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const label = obs.type === 'shop_heal' ? 'NANITES' : (obs.type === 'shop_o2' ? 'O2 TANK' : 'MODULO');
      ctx.fillText(obs.bought ? 'ESGOTADO' : `${label} [${obs.cost || 25}]`, obs.x + obs.w / 2, obs.y + obs.h - 5);

      if (!obs.bought) {
        // Item icon indicator
        if (obs.type === 'shop_heal') {
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(obs.x + obs.w / 2 - 6, obs.y + 10, 12, 4);
          ctx.fillRect(obs.x + obs.w / 2 - 2, obs.y + 6, 4, 12);
        } else if (obs.type === 'shop_o2') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(obs.x + obs.w / 2 - 4, obs.y + 7, 8, 12);
        } else {
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(obs.x + obs.w / 2 - 5, obs.y + 7, 10, 10);
        }
      }
    }
  },

  drawEnemy(ctx, e) {
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));

    // Flash pure white on damage
    if (e.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Hacked Ally Indicator
    if (e.isHacked) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Facing angle towards target or movement
    const faceAngle = (e.vx !== 0 || e.vy !== 0) ? Math.atan2(e.vy, e.vx) : (e.target ? Math.atan2(e.target.y - e.y, e.target.x - e.x) : 0);
    ctx.rotate(faceAngle);

    // ==========================================
    // SECTOR 1: ALIEN INFESTATION
    // ==========================================
    if (e instanceof BioSwarmer) {
      // Bio-Swarmer: Alien Skitterer with segmented spiny abdomen, mandibles, compound eyes
      // Carapace Body
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius, e.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Segmented Chitin Ridges
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-6, -4, 4, 8);
      ctx.fillRect(0, -5, 4, 10);

      // Sharp Pincer Mandibles
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(e.radius - 2, -5, 5, 2);
      ctx.fillRect(e.radius - 2, 3, 5, 2);

      // Glowing Compound Alien Eyes
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(4, -3, 3, 2);
      ctx.fillRect(4, 1, 3, 2);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(6, -2, 2, 4);

      // Animated Twitching Skitter Legs
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 2;
      [-4, 2].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, -e.radius * 0.7);
        ctx.lineTo(lx - 4, -e.radius * 1.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, e.radius * 0.7);
        ctx.lineTo(lx - 4, e.radius * 1.3);
        ctx.stroke();
      });
    } else if (e instanceof BioSpitter) {
      // Bio-Spitter: Heavy Acidic Artillery Beast
      // Heavy Chitinous Crest Body
      ctx.fillStyle = '#14532d';
      ctx.fillRect(-e.radius, -e.radius * 0.8, e.radius * 1.8, e.radius * 1.6);
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 2;
      ctx.strokeRect(-e.radius, -e.radius * 0.8, e.radius * 1.8, e.radius * 1.6);

      // Translucent Pulsating Spore Acid Sac on dorsal
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-4, 0, e.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#86efac';
      ctx.fillRect(-6, -3, 5, 6);

      // Gaping Acidic Maw
      ctx.fillStyle = '#052e16';
      ctx.fillRect(e.radius - 6, -4, 8, 8);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(e.radius - 3, -2, 5, 4);

      // Armored Head Plate
      ctx.fillStyle = '#15803d';
      ctx.fillRect(2, -7, 6, 14);
    } else if (e instanceof BioBrood) {
      // Bio-Brood: Colossal Hive Matriarch Carrier
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius, e.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pulsing Larval Egg Sac Chambers
      ctx.fillStyle = '#39ff14';
      [-8, 0, 8].forEach(ex => {
        ctx.beginPath();
        ctx.arc(ex - 4, -6, 4, 0, Math.PI * 2);
        ctx.arc(ex - 4, 6, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Heavily Armored Head Horns
      ctx.fillStyle = '#166534';
      ctx.fillRect(e.radius - 6, -10, 8, 4);
      ctx.fillRect(e.radius - 6, 6, 8, 4);

      // Predatory Compound Eyes
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(e.radius - 2, -4, 4, 3);
      ctx.fillRect(e.radius - 2, 1, 4, 3);
    }
    // ==========================================
    // SECTOR 2: AUTOMATON COMPLEX
    // ==========================================
    else if (e instanceof RoboDrone) {
      // Robo-Drone: Aerial Combat Drone
      const bodyCol = e.isHacked ? '#0284c7' : '#0f172a';
      const glowCol = e.isHacked ? '#00f0ff' : '#ff2a5f';

      // Faceted Angular Chassis
      ctx.fillStyle = bodyCol;
      ctx.fillRect(-e.radius * 0.9, -e.radius * 0.8, e.radius * 1.8, e.radius * 1.6);
      ctx.strokeStyle = glowCol;
      ctx.lineWidth = 2;
      ctx.strokeRect(-e.radius * 0.9, -e.radius * 0.8, e.radius * 1.8, e.radius * 1.6);

      // Dual Lateral Thrusters
      ctx.fillStyle = '#334155';
      ctx.fillRect(-e.radius - 2, -e.radius * 0.9, 6, 5);
      ctx.fillRect(-e.radius - 2, e.radius * 0.9 - 5, 6, 5);

      // Jet Thruster Exhaust Flames
      ctx.fillStyle = glowCol;
      ctx.fillRect(-e.radius - 7, -e.radius * 0.9 + 1, 5, 3);
      ctx.fillRect(-e.radius - 7, e.radius * 0.9 - 4, 5, 3);

      // Cyclops Optical Sensor
      ctx.fillStyle = glowCol;
      ctx.fillRect(e.radius - 6, -3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.radius - 4, -1, 3, 2);
    } else if (e instanceof RoboSentry) {
      // Robo-Sentry: Heavy Stationary Tactical Turret
      const glowCol = e.isHacked ? '#00f0ff' : '#ff0055';

      // Quad Tripod Base
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      [-12, 12].forEach(yPos => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-e.radius - 2, yPos);
        ctx.moveTo(0, 0);
        ctx.lineTo(e.radius + 2, yPos);
        ctx.stroke();
      });

      // Turret Housing with Hazard Stripes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = glowCol;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dual Gatling Heavy Barrels
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, -5, 14, 3);
      ctx.fillRect(4, 2, 14, 3);

      // Center Laser Targeting Reticle
      ctx.fillStyle = glowCol;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -1, 2, 2);
    } else if (e instanceof RoboRoller) {
      // Robo-Roller: Heavy Armored Treaded Juggernaut
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Rotating Tread Chevrons
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Charging Laser Eye
      const eyeCol = e.isCharging ? '#ff0055' : '#00f0ff';
      ctx.fillStyle = eyeCol;
      ctx.fillRect(e.radius - 6, -4, 6, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.radius - 3, -2, 3, 4);
    }
    // ==========================================
    // SECTOR 3: VOID PHANTOM
    // ==========================================
    else if (e instanceof VoidPhantom) {
      // Void-Phantom: Shadowy Ethereal Cosmic Entity
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bf55ec';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Floating Faceless Cosmic Void Mask
      ctx.fillStyle = '#1e082c';
      ctx.fillRect(-4, -6, 12, 12);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(2, -4, 3, 3);
      ctx.fillRect(2, 1, 3, 3);

      // Swirling Dark Matter Tendrils
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-e.radius * 0.6, 0, e.radius * 0.5, 0, Math.PI);
      ctx.stroke();
    }
    // ==========================================
    // BOSSES
    // ==========================================
    else if (e instanceof BossGorgon) {
      // Sector 1 Boss: Gorgon - Patriarch of the Alien Hive
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Huge Spiked Curved Horns
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(e.radius * 0.5, -e.radius * 0.8);
      ctx.lineTo(e.radius * 1.1, -e.radius * 1.3);
      ctx.lineTo(e.radius * 0.2, -e.radius * 0.5);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(e.radius * 0.5, e.radius * 0.8);
      ctx.lineTo(e.radius * 1.1, e.radius * 1.3);
      ctx.lineTo(e.radius * 0.2, e.radius * 0.5);
      ctx.fill();

      // Fanged Maw with Dripping Venom
      ctx.fillStyle = '#052e16';
      ctx.fillRect(e.radius - 12, -10, 14, 20);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(e.radius - 4, -8, 6, 4);
      ctx.fillRect(e.radius - 4, 4, 6, 4);

      // Multiple Glowing Ruby Eyes
      ctx.fillStyle = '#39ff14';
      [-6, 0, 6].forEach(ey => {
        ctx.fillRect(e.radius - 14, ey - 2, 4, 4);
      });
    } else if (e instanceof BossTitan) {
      // Sector 2 Boss: Titan Autômato MK-IV
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-e.radius, -e.radius * 0.85, e.radius * 2, e.radius * 1.7);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(-e.radius, -e.radius * 0.85, e.radius * 2, e.radius * 1.7);

      // Dual Missile Pods on Shoulders
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-e.radius * 0.7, -e.radius * 1.2, 18, 10);
      ctx.fillRect(-e.radius * 0.7, e.radius * 0.9, 18, 10);
      ctx.fillStyle = '#ff2a5f';
      ctx.fillRect(-e.radius * 0.7 + 3, -e.radius * 1.2 + 2, 4, 4);
      ctx.fillRect(-e.radius * 0.7 + 3, e.radius * 0.9 + 2, 4, 4);

      // Heavy Frontal Railguns
      ctx.fillStyle = '#64748b';
      ctx.fillRect(e.radius - 4, -14, 18, 6);
      ctx.fillRect(e.radius - 4, 8, 18, 6);

      // Pulsing Reactor Core
      ctx.fillStyle = '#ff2a5f';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -4, 8, 8);
    } else if (e instanceof BossEntropia) {
      // Sector 3 Boss: Entropia - Void Singularity
      ctx.fillStyle = '#05020a';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bf55ec';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Glowing Accretion Disks
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * 1.25, e.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Cosmic Event Horizon Glow
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (e instanceof BossArchon) {
      // Sector 4 Final Boss: Archon - Sovereign of the Core
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Radiant Cyber Wings
      ctx.fillStyle = '#ff2a5f';
      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.5, -e.radius * 1.4);
      ctx.lineTo(e.radius * 0.8, -e.radius * 0.6);
      ctx.lineTo(-e.radius * 0.2, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.5, e.radius * 1.4);
      ctx.lineTo(e.radius * 0.8, e.radius * 0.6);
      ctx.lineTo(-e.radius * 0.2, 0);
      ctx.fill();

      // Divine Cyber Halo / Crest
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-14, 0, e.radius * 0.9, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // Supercharged Core
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -5, 10, 10);
    } else {
      ctx.fillStyle = e.color || '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Boss Top Health Bar
    if (e.isBoss) {
      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y));
      const bw = 150;
      const bh = 10;
      ctx.fillStyle = '#09111c';
      ctx.fillRect(-bw / 2, -e.radius - 26, bw, bh);
      ctx.fillStyle = '#ff0055';
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillRect(-bw / 2, -e.radius - 26, bw * pct, bh);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-bw / 2, -e.radius - 26, bw, bh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.bossName || 'CHEFE', 0, -e.radius - 29);
      ctx.restore();
    }
  },

  drawPlayer(ctx, player) {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));

    // Flash white on damage
    if (player.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Dash trail / i-frame cyber aura
    if (player.isDashing || player.invulnTimer > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Directional orientation according to weapon aim
    ctx.rotate(player.angle);

    // 1. Armored Walking Legs / Boots
    const walkCycle = Math.sin((player.walkAnimTimer || 0) * 12) * 5;
    ctx.fillStyle = '#09111e';
    // Left Boot
    ctx.fillRect(-10, -11 + walkCycle, 8, 5);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-10, -11 + walkCycle, 2, 5);
    // Right Boot
    ctx.fillStyle = '#09111e';
    ctx.fillRect(-10, 6 - walkCycle, 8, 5);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-10, 6 - walkCycle, 2, 5);

    // 2. Active Dorsal Symbiotic Tentacle Mutation
    if (player.mutations?.symbioticTentacle) {
      const tentWave = Math.sin((player.walkAnimTimer || 0) * 8) * 6;
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-player.radius + 2, 0);
      ctx.quadraticCurveTo(-player.radius - 12, tentWave, -player.radius - 22, -tentWave * 1.4);
      ctx.stroke();

      // Sharp venomous chitin barb tip
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(-player.radius - 22, -tentWave * 1.4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Player Exo-Suit Armored Torso
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Heavy Pauldrons
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, -player.radius, 10, 5);
    ctx.fillRect(-8, player.radius - 5, 10, 5);

    // Glowing Chest Reactor / Oxygen Intake
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-2, -3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -1, 3, 3);

    // 4. Helmet & Cyber Visor
    ctx.fillStyle = '#09111e';
    ctx.beginPath();
    ctx.arc(2, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Sleek Curved Cyan Visor
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(5, -4, 4, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, -3, 2, 3);

    // 5. Weapon Model Rendering
    const weaponId = player.modules?.weapon?.id || 'weapon_blaster';
    if (weaponId === 'weapon_shotgun') {
      // Photon Scattergun (Double Heavy Barrel)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 2, 14, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(20, 3, 4, 4);
    } else if (weaponId === 'weapon_railgun') {
      // Linear Magnetic Railgun (Long dual coil rails)
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(6, 2, 22, 5);
      ctx.fillStyle = '#bf55ec';
      ctx.fillRect(10, 1, 16, 2);
      ctx.fillRect(10, 7, 16, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(26, 3, 4, 3);
    } else if (weaponId === 'weapon_missile') {
      // Micro-Missile Launcher
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(6, 1, 16, 8);
      ctx.fillStyle = '#ff2a5f';
      ctx.fillRect(20, 2, 4, 6);
    } else if (weaponId === 'weapon_tesla') {
      // Arc Tesla Emitter
      ctx.fillStyle = '#082f49';
      ctx.fillRect(6, 2, 14, 6);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(18, 0, 3, 4);
      ctx.fillRect(18, 6, 3, 4);
    } else {
      // Standard Plasma Blaster
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 2, 12, 4);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(18, 2, 3, 4);
    }

    ctx.restore();

    // Companion Drone (Orbits in World Coordinates)
    if (player.modules?.core?.hasCompanionDrone) {
      const droneDist = 38;
      const dx = player.x + Math.cos(player.droneAngle || 0) * droneDist;
      const dy = player.y + Math.sin(player.droneAngle || 0) * droneDist;

      ctx.save();
      ctx.translate(Math.round(dx), Math.round(dy));
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Drone Sensor Eye
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  },

  drawPickup(ctx, p) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));

    if (p.type === 'scrap') {
      // Scrap Resource (Hexagonal Golden Cog / Nanite Gear)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-5, -5, 10, 10);
    } else if (p.type === 'hp') {
      // Medical Vitality Cell (Crimson Red Cross Pack)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillRect(-2, -5, 4, 10);
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -6, 12, 12);
    } else if (p.type === 'shield') {
      // Shield Barrier Hex Cell
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (p.type === 'o2') {
      // Oxygen Pressure Canister
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -8, 4, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-3, -2, 6, 4);
    } else if (p.type === 'module_item') {
      // Cybernetic Module Component Cube
      ctx.fillStyle = '#581c87';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#bf55ec';
      ctx.lineWidth = 2;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-3, -3, 6, 6);
    }

    ctx.restore();
  }
};

// ==========================================
// 3. MAIN GAME CONTROLLER & GAME LOOP
// ==========================================
class Game {
  constructor() {
    window.gameInstance = this;
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.width = CONSTANTS.CANVAS_WIDTH;
    this.height = CONSTANTS.CANVAS_HEIGHT;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.currentSectorIndex = 0;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.dungeon = null;
    this.player = null;

    // Room Transition State
    this.transitionProgress = 0;
    this.transitionDir = { dx: 0, dy: 0 };
    this.prevRoom = null;
    this.nextRoom = null;
    this.targetPlayerPos = { x: 0, y: 0 };

    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.particles = [];

    this.input = new InputSystem(this.canvas);

    // State Machine: 'MENU', 'PLAYING', 'TRANSITION', 'PAUSED', 'LOADOUT', 'MUTAGEN_SELECT', 'GAME_OVER', 'VICTORY'
    this.state = 'MENU';
    this.lastTime = 0;
    this.running = false;
    this.animationFrameId = null;
    this.validationTimer = 0;
    this.maxParticles = 120;

    this.initUIListeners();
  }

  initUIListeners() {
    const btnStart = document.getElementById('btnStartGame');
    if (btnStart) btnStart.addEventListener('click', () => this.startNewRun());

    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) btnRestart.addEventListener('click', () => this.startNewRun());

    const btnRestartWin = document.getElementById('btnRestartWin');
    if (btnRestartWin) btnRestartWin.addEventListener('click', () => this.startNewRun());

    const btnResume = document.getElementById('btnResume');
    if (btnResume) btnResume.addEventListener('click', () => this.togglePause());

    const btnRestartFromPause = document.getElementById('btnRestartFromPause');
    if (btnRestartFromPause) btnRestartFromPause.addEventListener('click', () => this.startNewRun());

    const btnOpenLoadout = document.getElementById('btnOpenLoadout');
    if (btnOpenLoadout) btnOpenLoadout.addEventListener('click', () => this.toggleLoadout());

    const btnCloseLoadout = document.getElementById('btnCloseLoadout');
    if (btnCloseLoadout) btnCloseLoadout.addEventListener('click', () => this.toggleLoadout());

    const btnPause = document.getElementById('btnPauseGame');
    if (btnPause) btnPause.addEventListener('click', () => this.togglePause());

    const btnAudio = document.getElementById('btnToggleAudio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        if (window.soundEngine) {
          const active = window.soundEngine.toggleMusic();
          btnAudio.innerHTML = `${active ? window.Icons.soundOn() : window.Icons.soundOff()} BGM: ${active ? 'ON' : 'OFF'}`;
        }
      });
    }

    const btnSfx = document.getElementById('btnToggleSfx');
    if (btnSfx) {
      btnSfx.addEventListener('click', () => {
        if (window.soundEngine) {
          const active = window.soundEngine.toggleSfx();
          btnSfx.innerHTML = `${active ? window.Icons.soundOn() : window.Icons.soundOff()} SFX: ${active ? 'ON' : 'OFF'}`;
        }
      });
    }

    const btnAcceptMutation = document.getElementById('btnAcceptMutation');
    if (btnAcceptMutation) {
      btnAcceptMutation.addEventListener('click', () => {
        if (this.pendingMutation) {
          this.player.addMutation(this.pendingMutation.id);
          this.player.stats.mutationsCount++;
          document.getElementById('mutagenModal').classList.add('hidden');
          this.state = 'PLAYING';
          this.input.clearMomentaryInputs();
        }
      });
    }

    const btnRejectMutation = document.getElementById('btnRejectMutation');
    if (btnRejectMutation) {
      btnRejectMutation.addEventListener('click', () => {
        document.getElementById('mutagenModal').classList.add('hidden');
        this.state = 'PLAYING';
        this.input.clearMomentaryInputs();
      });
    }
  }

  startNewRun() {
    this.currentSectorIndex = 0;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.player = new Player(this.width / 2, this.height / 2, this);
    this.loadSector(this.currentSectorIndex);

    document.querySelectorAll('.game-modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('hudOverlay').classList.remove('hidden');

    this.input.resetInputState();
    this.state = 'PLAYING';
  }

  loadSector(index) {
    this.currentSectorIndex = index;
    this.sector = CONSTANTS.SECTORS[this.currentSectorIndex];
    this.dungeon = new Dungeon(this.sector);
    this.particles = [];

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
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
      banner.style.borderColor = this.sector.accentColor;
    }
  }

  screenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  addParticle(p) {
    if (!p || this.particles.length >= this.maxParticles) return;
    this.particles.push(p);
  }

  // --- ROCK-SOLID ROOM TRANSITION ---
  checkDoorTransitions() {
    if (this.state !== 'PLAYING' || !this.dungeon?.currentRoom) return;
    const room = this.dungeon.currentRoom;
    if (room.doorsLocked) return;

    const p = this.player;
    const W = this.width;
    const H = this.height;
    const T = CONSTANTS.WALL_THICKNESS;
    const D = CONSTANTS.DOOR_SIZE;

    // North
    if (room.doors.north && p.y - p.radius <= T + 2 && Math.abs(p.x - W / 2) < D / 2) {
      this.initiateTransition(0, -1, p.x, H - T - p.radius - 22);
    }
    // South
    else if (room.doors.south && p.y + p.radius >= H - T - 2 && Math.abs(p.x - W / 2) < D / 2) {
      this.initiateTransition(0, 1, p.x, T + p.radius + 22);
    }
    // East
    else if (room.doors.east && p.x + p.radius >= W - T - 2 && Math.abs(p.y - H / 2) < D / 2) {
      this.initiateTransition(1, 0, T + p.radius + 22, p.y);
    }
    // West
    else if (room.doors.west && p.x - p.radius <= T + 2 && Math.abs(p.y - H / 2) < D / 2) {
      this.initiateTransition(-1, 0, W - T - p.radius - 22, p.y);
    }
  }

  initiateTransition(dx, dy, targetX, targetY) {
    const cur = this.dungeon.currentRoom;
    const next = this.dungeon.getRoom(cur.gx + dx, cur.gy + dy);
    if (!next) return;

    this.state = 'TRANSITION';
    this.transitionProgress = 0;
    this.transitionDir = { dx, dy };
    this.prevRoom = cur;
    this.nextRoom = next;
    this.targetPlayerPos = { x: targetX, y: targetY };

    this.player.vx = 0;
    this.player.vy = 0;
    // Clear momentary clicks/taps but PRESERVE held movement keys
    this.input.clearMomentaryInputs();

    if (window.soundEngine) window.soundEngine.playDoorOpen();
  }

  updateTransition(dt) {
    this.transitionProgress += dt * 3.0;

    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;

      this.dungeon.currentRoom = this.nextRoom;
      this.dungeon.currentRoom.visited = true;

      // Safe placement beyond door sensor
      this.player.x = this.targetPlayerPos.x;
      this.player.y = this.targetPlayerPos.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.input.clearMomentaryInputs();

      if (!this.dungeon.currentRoom.cleared) {
        this.dungeon.currentRoom.spawnEnemies();
        if (this.dungeon.currentRoom.enemies.length > 0) {
          this.dungeon.currentRoom.doorsLocked = true;
        }
      }

      if (this.prevRoom) {
        this.prevRoom.projectiles = [];
        this.prevRoom.hazards = [];
      }
      this.prevRoom = null;
      this.nextRoom = null;

      this.state = 'PLAYING';
    }
  }

  renderTransition(ctx) {
    const prog = this.transitionProgress;
    const dx = this.transitionDir.dx * this.width * prog;
    const dy = this.transitionDir.dy * this.height * prog;

    if (this.prevRoom) this.renderRoom(ctx, this.prevRoom, -dx, -dy);
    if (this.nextRoom) this.renderRoom(ctx, this.nextRoom, -dx + this.transitionDir.dx * this.width, -dy + this.transitionDir.dy * this.height);

    const px = this.player.x - dx;
    const py = this.player.y - dy;
    PixelArt.drawPlayer(ctx, { ...this.player, x: px, y: py });
  }

  renderRoom(ctx, room, offX = 0, offY = 0) {
    ctx.save();
    ctx.translate(Math.round(offX), Math.round(offY));

    const W = this.width;
    const H = this.height;
    const T = CONSTANTS.WALL_THICKNESS;

    PixelArt.drawFloor(ctx, room, W, H, T);

    // Hazards
    if (room.hazards) {
      room.hazards.forEach(haz => {
        if (haz.type === 'acid_pool') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.fillRect(haz.x, haz.y, haz.w, haz.h);
        }
      });
    }

    PixelArt.drawWalls(ctx, room, W, H, T);

    const isLocked = room.doorsLocked;
    if (room.doors.north) PixelArt.drawDoor(ctx, W / 2, T / 2, 'north', !isLocked, isLocked, room.sector.theme);
    if (room.doors.south) PixelArt.drawDoor(ctx, W / 2, H - T / 2, 'south', !isLocked, isLocked, room.sector.theme);
    if (room.doors.west) PixelArt.drawDoor(ctx, T / 2, H / 2, 'west', !isLocked, isLocked, room.sector.theme);
    if (room.doors.east) PixelArt.drawDoor(ctx, W - T / 2, H / 2, 'east', !isLocked, isLocked, room.sector.theme);

    if (room.obstacles) {
      room.obstacles.forEach(obs => PixelArt.drawObstacle(ctx, obs, room.sector.theme));
    }

    // Boss progression portal. It is a room object, not a transient effect,
    // so it remains visible until the player actually enters it.
    if (room.type === 'BOSS' && room.airlockActive) {
      const portal = room.progressionPortal || { x: W / 2, y: H / 2, radius: 32 };
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.10;
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#040810';
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius - 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius - 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ELEVADOR', 0, 4);
      ctx.restore();
    }

    if (room.pickups) {
      room.pickups.forEach(p => PixelArt.drawPickup(ctx, p));
    }

    if (room.enemies) {
      room.enemies.forEach(e => PixelArt.drawEnemy(ctx, e));
    }

    if (room.projectiles) {
      room.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(Math.round(proj.x), Math.round(proj.y), proj.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // --- SAFE CONTACT DAMAGE & COLLISION RESOLUTION ---
  resolvePlayerEnemyCollisions() {
    const room = this.dungeon?.currentRoom;
    if (!room || !room.enemies || !this.player || this.player.dead) return;

    for (let enemy of room.enemies) {
      if (enemy.dead) continue;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.player.radius + enemy.radius;

      if (dist < minDist) {
        // Safe angle preventing division by zero
        const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
        const overlap = minDist - Math.max(dist, 0.001);

        // Elastic separation
        this.player.x += Math.cos(angle) * (overlap * 0.6);
        this.player.y += Math.sin(angle) * (overlap * 0.6);
        enemy.x -= Math.cos(angle) * (overlap * 0.4);
        enemy.y -= Math.sin(angle) * (overlap * 0.4);

        // Contact Damage
        if (window.areHostile(this.player, enemy)) {
          if (this.player.invulnTimer <= 0 && !this.player.isDashing && !this.player.dead) {
            const dmg = enemy.contactDamage || 1;
            const tookDamage = this.player.takeDamage(dmg, enemy);
            if (tookDamage) {
              const knockSpeed = 360;
              this.player.vx = Math.cos(angle) * knockSpeed;
              this.player.vy = Math.sin(angle) * knockSpeed;
              enemy.vx = -Math.cos(angle) * 140;
              enemy.vy = -Math.sin(angle) * 140;
              this.screenShake(6, 0.2);
              this.addParticle(new Shockwave(this.player.x, this.player.y, 40, '#ff2a5f'));
            }
          }
        }
      }
    }
  }

  resolveEnemyInteractions(dt, room) {
    if (!room || !room.enemies) return;
    const enemies = room.enemies;
    const count = enemies.length;

    for (let i = 0; i < count; i++) {
      const e1 = enemies[i];
      if (e1.dead) continue;

      for (let j = i + 1; j < count; j++) {
        const e2 = enemies[j];
        if (e2.dead) continue;

        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e1.radius + e2.radius;

        if (dist < minDist) {
          const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
          const overlap = minDist - Math.max(dist, 0.001);
          e1.x += Math.cos(angle) * (overlap * 0.5);
          e1.y += Math.sin(angle) * (overlap * 0.5);
          e2.x -= Math.cos(angle) * (overlap * 0.5);
          e2.y -= Math.sin(angle) * (overlap * 0.5);

          // Inter-faction Melee Clash
          if (window.areHostile(e1, e2)) {
            if (Math.random() < 0.05) {
              e1.takeDamage(1, e2);
              e2.takeDamage(1, e1);
            }
          }
        }
      }
    }
  }

  checkInteractions() {
    const room = this.dungeon?.currentRoom;
    if (!room || this.state !== 'PLAYING') return;

    // Treasure Pedestal
    if (room.type === 'TREASURE' && !room.treasureClaimed) {
      const ped = room.obstacles.find(o => o.type === 'pedestal');
      if (ped && Math.hypot(this.player.x - (ped.x + ped.w / 2), this.player.y - (ped.y + ped.h / 2)) < 55) {
        const unequipped = CONSTANTS.MODULES.filter(m => m.id !== 'weapon_blaster');
        const chosen = unequipped[Math.floor(Math.random() * unequipped.length)];
        this.player.collectPickup({ type: 'module_item', module: chosen });
        room.treasureClaimed = true;
        ped.claimed = true;
      }
    }

    // Mutagen Pod
    if (room.type === 'MUTAGEN' && !room.mutagenClaimed) {
      const pod = room.obstacles.find(o => o.type === 'mutagen_pod');
      if (pod && Math.hypot(this.player.x - (pod.x + pod.w / 2), this.player.y - (pod.y + pod.h / 2)) < 60) {
        this.openMutagenModal();
      }
    }

    // Shop Terminals
    if (room.type === 'FABRICATOR') {
      room.obstacles.forEach(obs => {
        if (obs.type === 'shop_item' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            if (this.player.scrap >= 25) {
              this.player.scrap -= 25;
              obs.bought = true;
              const pool = CONSTANTS.MODULES.filter(m => !Object.values(this.player.modules).includes(m));
              const mod = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : CONSTANTS.MODULES[1];
              this.player.collectPickup({ type: 'module_item', module: mod });
            }
          }
        } else if (obs.type === 'shop_heal' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            if (this.player.scrap >= 15 && this.player.hp < this.player.maxHp) {
              this.player.scrap -= 15;
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
              obs.bought = true;
              if (window.soundEngine) window.soundEngine.playPickup('scrap');
              this.addParticle(new FloatingText(obs.x + 35, obs.y - 15, "NANITES +2 HP", "#39ff14"));
            }
          }
        } else if (obs.type === 'shop_o2' && !obs.bought) {
          if (Math.hypot(this.player.x - (obs.x + obs.w / 2), this.player.y - (obs.y + obs.h / 2)) < 50) {
            if (this.player.scrap >= 10) {
              this.player.scrap -= 10;
              this.player.o2 = 100;
              obs.bought = true;
              if (window.soundEngine) window.soundEngine.playPickup('scrap');
              this.addParticle(new FloatingText(obs.x + 35, obs.y - 15, "O2 RECARREGADO", "#38bdf8"));
            }
          }
        }
      });
    }

    // Boss progression portal: interaction is checked during UPDATE only.
    // Never change sectors from the render path.
    if (room.type === 'BOSS' && room.airlockActive && room.progressionPortal?.active) {
      const portal = room.progressionPortal;
      if (Math.hypot(this.player.x - portal.x, this.player.y - portal.y) < portal.radius + this.player.radius + 8) {
        this.advanceToNextSector();
      }
    }
  }

  openMutagenModal() {
    const pool = CONSTANTS.MUTATIONS.filter(m => !this.player.mutations[m.id]);
    if (pool.length === 0) return;

    this.pendingMutation = pool[Math.floor(Math.random() * pool.length)];
    const modal = document.getElementById('mutagenModal');
    const titleEl = document.getElementById('mutagenTitle');
    const boonEl = document.getElementById('mutagenBoon');
    const drawEl = document.getElementById('mutagenDrawback');

    if (titleEl) titleEl.innerHTML = `${window.Icons.get(this.pendingMutation.iconKey)} ${this.pendingMutation.name}`;
    if (boonEl) boonEl.textContent = this.pendingMutation.boon;
    if (drawEl) drawEl.textContent = this.pendingMutation.drawback;

    this.state = 'MUTAGEN_SELECT';
    this.input.resetInputState();
    modal.classList.remove('hidden');

    const room = this.dungeon.currentRoom;
    room.mutagenClaimed = true;
    const pod = room.obstacles.find(o => o.type === 'mutagen_pod');
    if (pod) pod.claimed = true;
  }

  toggleLoadout() {
    const modal = document.getElementById('loadoutModal');
    if (!modal) return;

    if (this.state === 'PLAYING') {
      this.state = 'LOADOUT';
      this.input.resetInputState();
      this.renderLoadoutModal();
      modal.classList.remove('hidden');
    } else if (this.state === 'LOADOUT') {
      this.state = 'PLAYING';
      this.input.clearMomentaryInputs();
      modal.classList.add('hidden');
    }
  }

  renderLoadoutModal() {
    const slotsEl = document.getElementById('equippedSlots');
    if (slotsEl && this.player) {
      slotsEl.innerHTML = '';
      for (let [slot, mod] of Object.entries(this.player.modules)) {
        const div = document.createElement('div');
        div.className = 'slot-box equipped';
        div.innerHTML = `
          <div class="slot-name">${slot.toUpperCase()}</div>
          <div style="font-size: 13px; margin: 4px 0;">${mod ? window.Icons.get(mod.iconKey) : ''}</div>
          <div style="font-weight: bold; color: #fff;">${mod ? mod.name : 'VAZIO'}</div>
          <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">${mod ? mod.description : ''}</div>
        `;
        slotsEl.appendChild(div);
      }
    }

    const invEl = document.getElementById('inventoryModules');
    if (invEl && this.player) {
      invEl.innerHTML = '';
      if (this.player.modulesInventory.length === 0) {
        invEl.innerHTML = '<p style="color: #64748b; font-size: 11px;">Nenhum módulo sobressalente no inventário.</p>';
      } else {
        this.player.modulesInventory.forEach(m => {
          const card = document.createElement('div');
          card.className = 'module-badge-card';
          card.innerHTML = `
            <div>${window.Icons.get(m.iconKey)} <strong>${m.name}</strong> [${m.slot}]</div>
            <button class="retro-btn" style="padding: 2px 6px; font-size: 9px;" onclick="window.gameInstance.player.equipModule(window.CONSTANTS.MODULES.find(x => x.id === '${m.id}')); window.gameInstance.renderLoadoutModal();">EQUIPAR</button>
          `;
          invEl.appendChild(card);
        });
      }
    }

    const mutEl = document.getElementById('activeMutationsList');
    if (mutEl && this.player) {
      mutEl.innerHTML = '';
      let hasMut = false;
      CONSTANTS.MUTATIONS.forEach(m => {
        if (this.player.mutations[m.id]) {
          hasMut = true;
          const card = document.createElement('div');
          card.className = 'mutation-badge-card';
          card.innerHTML = `
            <div>${window.Icons.get(m.iconKey)} <strong>${m.name}</strong></div>
            <div class="boon">+ ${m.boon}</div>
            <div class="drawback">- ${m.drawback}</div>
          `;
          mutEl.appendChild(card);
        }
      });
      if (!hasMut) {
        mutEl.innerHTML = '<p style="color: #64748b; font-size: 11px;">Nenhuma simbiose alienígena ativa.</p>';
      }
    }
  }

  togglePause() {
    const modal = document.getElementById('pauseModal');
    if (!modal) return;

    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.input.resetInputState();
      modal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.input.clearMomentaryInputs();
      modal.classList.add('hidden');
    }
  }

  onBossDefeated() {
    const room = this.dungeon?.currentRoom;
    if (!room || room.type !== 'BOSS') return;
    if (room.bossDefeated && room.airlockActive) return;

    room.bossDefeated = true;
    room.airlockActive = true;
    room.cleared = true;
    room.doorsLocked = false;
    room.enemies = (room.enemies || []).filter(e => !e.isBoss && !e.dead);

    // Persistent progression object. Keep it away from the player if the boss
    // died while the player was standing on the arena center.
    const px = this.player?.x ?? this.width / 2;
    const py = this.player?.y ?? this.height / 2;
    let portalX = this.width / 2;
    let portalY = this.height / 2;
    if (Math.hypot(px - portalX, py - portalY) < 75 && this.player) {
      const angle = Math.atan2(py - portalY, px - portalX) || 0;
      this.player.x = portalX + Math.cos(angle) * 90;
      this.player.y = portalY + Math.sin(angle) * 90;
      this.player.x = Math.max(CONSTANTS.WALL_THICKNESS + this.player.radius + 5, Math.min(this.width - CONSTANTS.WALL_THICKNESS - this.player.radius - 5, this.player.x));
      this.player.y = Math.max(CONSTANTS.WALL_THICKNESS + this.player.radius + 5, Math.min(this.height - CONSTANTS.WALL_THICKNESS - this.player.radius - 5, this.player.y));
    }

    room.progressionPortal = { x: portalX, y: portalY, radius: 32, active: true };

    this.addParticle(new Shockwave(portalX, portalY, 220, '#00f0ff'));
    this.addParticle(new FloatingText(portalX, portalY - 48, "ELEVADOR DO SETOR ATIVADO!", "#00f0ff"));
  }

  advanceToNextSector() {
    const room = this.dungeon?.currentRoom;
    if (!room || !room.airlockActive || !room.progressionPortal?.active) return;
    room.progressionPortal.active = false;
    const next = this.currentSectorIndex + 1;
    if (next < CONSTANTS.SECTORS.length) {
      this.loadSector(next);
    } else {
      this.onFinalVictory();
    }
  }

  onPlayerDeath() {
    this.state = 'GAME_OVER';
    this.input.resetInputState();
    if (window.soundEngine) {
      window.soundEngine.playDeath();
      window.soundEngine.stopMusic();
    }

    const modal = document.getElementById('gameOverModal');
    if (modal) {
      const statsEl = document.getElementById('gameOverStats');
      if (statsEl && this.player) {
        const sec = Math.floor((Date.now() - this.player.stats.startTime) / 1000);
        statsEl.innerHTML = `
          <p><strong>Setor Alcançado:</strong> ${this.sector.name}</p>
          <p><strong>Salas Conquistadas:</strong> ${this.player.stats.roomsCleared}</p>
          <p><strong>Criaturas Eliminadas:</strong> ${this.player.stats.aliensKilled}</p>
          <p><strong>Autômatos Destruídos:</strong> ${this.player.stats.robotsKilled}</p>
          <p><strong>Robôs Hackeados:</strong> ${this.player.stats.robotsHacked}</p>
          <p><strong>Mutações Sofridas:</strong> ${this.player.stats.mutationsCount}</p>
          <p><strong>Tempo de Sobrevivência:</strong> ${sec}s</p>
        `;
      }
      modal.classList.remove('hidden');
    }
  }

  onFinalVictory() {
    this.state = 'VICTORY';
    this.input.resetInputState();
    if (window.soundEngine) {
      window.soundEngine.playVictory();
      window.soundEngine.stopMusic();
    }

    const modal = document.getElementById('victoryModal');
    if (modal) {
      const statsEl = document.getElementById('victoryStats');
      if (statsEl && this.player) {
        const sec = Math.floor((Date.now() - this.player.stats.startTime) / 1000);
        statsEl.innerHTML = `
          <p><strong>A ameaça biológica e os autômatos rebeldes foram silenciados.</strong></p>
          <p><strong>Inimigos Totais Abatidos:</strong> ${this.player.stats.aliensKilled + this.player.stats.robotsKilled}</p>
          <p><strong>Robôs Aliados Hackeados:</strong> ${this.player.stats.robotsHacked}</p>
          <p><strong>Mutações Ativas:</strong> ${this.player.stats.mutationsCount}</p>
          <p><strong>Tempo Total da Expedição:</strong> ${sec}s</p>
        `;
      }
      modal.classList.remove('hidden');
    }
  }

  // --- SINGLE CONTROLLED GAME LOOP ---
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  loop(currentTime) {
    // A single unexpected runtime error must never permanently stop the
    // requestAnimationFrame loop and leave the player with a frozen screen.
    const rawDt = (currentTime - this.lastTime) / 1000;
    const dt = Number.isFinite(rawDt) ? Math.min(Math.max(rawDt, 0), 0.05) : 0.016;
    this.lastTime = currentTime;

    try {
      if (this.input.justPressed['KeyI'] || this.input.justPressed['Tab']) {
        this.toggleLoadout();
      } else if (this.input.justPressed['Escape'] || this.input.justPressed['KeyP']) {
        this.togglePause();
      }

      if (this.state === 'PLAYING') {
        this.update(dt);
      } else if (this.state === 'TRANSITION') {
        this.updateTransition(dt);
      }

      this.render();
      this.updateHUD();
    } catch (error) {
      // Recover on the next frame instead of silently killing the game loop.
      // Keep the error in the console for diagnosis without exposing it to the UI.
      console.error('TecnoBound runtime error recovered:', error);
      if (!['MENU', 'GAME_OVER', 'VICTORY'].includes(this.state)) {
        this.state = 'PLAYING';
      }
      this.validateGameState();
      this.validatePlayer();
    } finally {
      this.input.postUpdate();
      if (this.running) {
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
      }
    }
  }

  update(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }

    // State safety checks run periodically instead of four full validation
    // passes every frame. This keeps the safety net without wasting CPU during
    // combat.
    this.validationTimer -= dt;
    let runValidation = false;
    if (this.validationTimer <= 0) {
      this.validationTimer = 0.25;
      runValidation = true;
      this.validateGameState();
      this.validatePlayer();
    }

    const room = this.dungeon?.currentRoom;
    if (!room) return;

    if (runValidation) {
      this.validateRoom(room);
      this.validateEntities(room);
    }

    // 1. Update Player
    this.player.update(dt, room, this.input);

    // 2. Update Projectiles (with safety cap against endless accumulation)
    if (room.projectiles) {
      // Hard cap protects the game loop from accidental projectile storms.
      if (room.projectiles.length > 90) room.projectiles.length = 90;
      for (let i = 0; i < room.projectiles.length; i++) {
        const proj = room.projectiles[i];
        if (proj && !proj.dead) proj.update(dt, room);
      }
      room.projectiles = room.projectiles.filter(p => p && !p.dead);
    }

    // 3. Update Enemies
    let aliveHostiles = 0;
    if (room.enemies) {
      for (let enemy of room.enemies) {
        enemy.update(dt, room);
        if (!enemy.dead && !enemy.isHacked && enemy.faction !== CONSTANTS.FACTIONS.PLAYER) {
          aliveHostiles++;
        }
      }
      room.enemies = room.enemies.filter(e => !e.dead);
      if (room.pendingEnemies && room.pendingEnemies.length > 0) {
        room.enemies.push(...room.pendingEnemies);
        room.pendingEnemies = [];
      }
    }

    // 4. Contact Damage & Inter-faction Melee
    this.resolvePlayerEnemyCollisions();
    this.resolveEnemyInteractions(dt, room);

    // 5. Room Cleared Check
    if (aliveHostiles === 0 && !room.cleared) {
      room.cleared = true;
      room.doorsLocked = false;
      this.player.stats.roomsCleared++;
      if (window.soundEngine) window.soundEngine.playPickup('scrap');
      this.addParticle(new FloatingText(this.width / 2, 65, "SETOR SEGURO // PORTAS LIBERADAS", "#00f0ff"));
    }

    // 6. Room Hazards
    if (room.hazards) {
      for (let haz of room.hazards) {
        if (haz.duration) haz.duration -= dt;
        if (haz.type === 'acid_pool' && !this.player.modules.chassis?.acidImmunity) {
          if (this.player.x >= haz.x && this.player.x <= haz.x + haz.w &&
              this.player.y >= haz.y && this.player.y <= haz.y + haz.h) {
            this.player.takeDamage(1, null);
          }
        }
        if (room.enemies) {
          room.enemies.forEach(e => {
            if (e.x >= haz.x && e.x <= haz.x + haz.w && e.y >= haz.y && e.y <= haz.y + haz.h) {
              e.takeDamage(15 * dt, null);
            }
          });
        }
      }
      room.hazards = room.hazards.filter(h => !h.duration || h.duration > 0);
    }

    // 7. Particles
    for (let p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter(p => !p.dead);

    this.checkInteractions();
    this.checkDoorTransitions();
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.state === 'TRANSITION') {
      this.renderTransition(ctx);
    } else if (this.dungeon && this.dungeon.currentRoom) {
      this.renderRoom(ctx, this.dungeon.currentRoom);
      if (this.player && !this.player.dead) {
        PixelArt.drawPlayer(ctx, this.player);
      }
    }

    // Floating particles & text
    for (let p of this.particles) {
      p.render(ctx);
    }

    ctx.restore();
  }

  updateHUD() {
    if (!this.player || this.state === 'MENU') return;

    // HP & Shield Pips (Zero Emojis)
    const hpEl = document.getElementById('hpDisplay');
    if (hpEl) {
      let hpPips = '<div class="status-pips-container">';
      for (let i = 0; i < this.player.maxHp; i++) {
        const active = i < this.player.hp;
        hpPips += `<span class="pip pip-hp ${active ? '' : 'empty'}"></span>`;
      }
      hpPips += '</div>';
      hpEl.innerHTML = hpPips;
    }

    const shieldEl = document.getElementById('shieldDisplay');
    if (shieldEl) {
      let sPips = '<div class="status-pips-container">';
      for (let i = 0; i < this.player.maxShield; i++) {
        const active = i < this.player.shield;
        sPips += `<span class="pip pip-shield ${active ? '' : 'empty'}"></span>`;
      }
      sPips += '</div>';
      shieldEl.innerHTML = sPips;
    }

    // Oxygen Gauge
    const o2Val = document.getElementById('o2Value');
    const o2Bar = document.getElementById('o2BarFill');
    const o2Widget = document.getElementById('o2Widget');
    if (o2Val && o2Bar) {
      const pct = Math.max(0, Math.min(100, Math.round(this.player.o2)));
      o2Val.textContent = `${pct}%`;
      o2Bar.style.width = `${pct}%`;

      const inVacuum = this.dungeon?.currentRoom?.vacuumBreach || false;
      if (o2Widget) {
        if (inVacuum || pct < 30) {
          o2Widget.classList.add('vacuum-alert');
        } else {
          o2Widget.classList.remove('vacuum-alert');
        }
      }
    }

    // Hack Tool Gauge
    const hackBar = document.getElementById('hackBarFill');
    const hackStatus = document.getElementById('hackStatus');
    if (hackBar && hackStatus) {
      if (this.player.hackTimer <= 0) {
        hackBar.style.width = '100%';
        hackStatus.textContent = 'PRONTO';
        hackStatus.style.color = 'var(--border-purple)';
      } else {
        const cd = this.player.hackCooldown;
        const pct = Math.max(0, Math.min(100, Math.round((1 - this.player.hackTimer / cd) * 100)));
        hackBar.style.width = `${pct}%`;
        hackStatus.textContent = `${this.player.hackTimer.toFixed(1)}s`;
        hackStatus.style.color = '#94a3b8';
      }
    }

    // Weapon & Scrap
    const scrapEl = document.getElementById('scrapValue');
    if (scrapEl) scrapEl.textContent = this.player.scrap;

    const wepName = document.getElementById('activeWeaponName');
    if (wepName && this.player.modules.weapon) {
      wepName.textContent = this.player.modules.weapon.name;
    }

    // Minimap
    this.renderMinimap();
  }

  renderMinimap() {
    const mCanvas = document.getElementById('minimapCanvas');
    if (!mCanvas || !this.dungeon) return;
    const mCtx = mCanvas.getContext('2d');
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);

    const size = 12;
    const pad = 2;
    const ox = mCanvas.width / 2 - 3.5 * (size + pad);
    const oy = mCanvas.height / 2 - 3.5 * (size + pad);

    this.dungeon.rooms.forEach(room => {
      if (!room.visited && room !== this.dungeon.currentRoom) return;
      const rx = ox + room.gx * (size + pad);
      const ry = oy + room.gy * (size + pad);

      if (room === this.dungeon.currentRoom) {
        mCtx.fillStyle = '#ffffff';
      } else if (room.type === 'START') {
        mCtx.fillStyle = '#3b82f6';
      } else if (room.type === 'BOSS') {
        mCtx.fillStyle = '#ff0055';
      } else if (room.type === 'TREASURE') {
        mCtx.fillStyle = '#f59e0b';
      } else if (room.type === 'MUTAGEN') {
        mCtx.fillStyle = '#39ff14';
      } else if (room.type === 'FABRICATOR') {
        mCtx.fillStyle = '#00f0ff';
      } else {
        mCtx.fillStyle = '#334155';
      }

      mCtx.fillRect(rx, ry, size, size);
    });
  }

  // --- AUTOMATED STATE VALIDATIONS & CRASH PREVENTION ---
  validateGameState() {
    if (!this.player) {
      this.player = new Player(this.width / 2, this.height / 2, this);
    }
    const validStates = ['MENU', 'PLAYING', 'TRANSITION', 'PAUSED', 'LOADOUT', 'MUTAGEN_SELECT', 'GAME_OVER', 'VICTORY'];
    if (!validStates.includes(this.state)) {
      this.state = 'PLAYING';
    }
    return { valid: true };
  }

  validatePlayer() {
    if (!this.player) return false;
    if (isNaN(this.player.x) || !isFinite(this.player.x)) this.player.x = this.width / 2;
    if (isNaN(this.player.y) || !isFinite(this.player.y)) this.player.y = this.height / 2;
    if (isNaN(this.player.vx) || !isFinite(this.player.vx)) this.player.vx = 0;
    if (isNaN(this.player.vy) || !isFinite(this.player.vy)) this.player.vy = 0;
    if (isNaN(this.player.hp) || !isFinite(this.player.hp)) this.player.hp = this.player.maxHp || 6;
    if (isNaN(this.player.shield) || !isFinite(this.player.shield)) this.player.shield = this.player.maxShield || 2;
    this.player.hp = Math.max(0, Math.min(this.player.maxHp || 6, this.player.hp));
    this.player.shield = Math.max(0, Math.min(this.player.maxShield || 2, this.player.shield));
    return true;
  }

  validateRoom(room) {
    if (!room) return false;
    if (!Array.isArray(room.enemies)) room.enemies = [];
    if (!Array.isArray(room.projectiles)) room.projectiles = [];
    if (!Array.isArray(room.obstacles)) room.obstacles = [];
    if (!Array.isArray(room.pickups)) room.pickups = [];
    if (!Array.isArray(room.hazards)) room.hazards = [];
    if (!Array.isArray(room.decorations)) room.decorations = [];
    return true;
  }

  validateEntities(room) {
    if (!room || !room.enemies) return;
    room.enemies.forEach(e => {
      if (isNaN(e.x) || !isFinite(e.x)) e.x = this.width / 2;
      if (isNaN(e.y) || !isFinite(e.y)) e.y = this.height / 2;
      if (isNaN(e.vx) || !isFinite(e.vx)) e.vx = 0;
      if (isNaN(e.vy) || !isFinite(e.vy)) e.vy = 0;
      if (isNaN(e.hp) || !isFinite(e.hp)) e.hp = e.maxHp || 10;
    });
  }
}

// Window Exports & Entry Point
window.PixelArt = PixelArt;
window.Game = Game;

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
  window.gameInstance.start();
});
