/* ============================================================
 * DevMe Level Editor - Links Module
 * Maneja: sistema de vínculos, link mode, floating panel, link lines
 * ============================================================ */
(function(global) {
  'use strict';

  // ---- Estado de vínculos ----
  let switchLinks = [];
  let plateLinks = [];
  let npcConfigs = [];
  let laserConfigs = [];
  let enemyConfigs = [];
  let pistonConfigs = [];
  let keyConfigs = [];

  // ---- Estado del link mode ----
  let linkMode = false;
  let selectedActivator = null; // {type, x, y, idx}

  const LINK_COLORS = {
    switch: '#888', plate: '#9c27b0', npc: '#4caf50',
    laser: '#cc0000', enemy: '#d32f2f', piston: '#607d8b', key: '#ffd700'
  };

  // ---- Helpers para acceder al grid ----
  function getGrid() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGrid() : []; }
  function getGridW() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGridW() : 8; }
  function getGridH() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGridH() : 7; }
  function findElements(ch) { return global.LevelEditorGrid ? global.LevelEditorGrid.findElements(ch) : []; }
  function cellLabel(ch) { return global.LevelEditorGrid ? global.LevelEditorGrid.cellLabel(ch) : ch; }
  function cellIcon(ch) { return global.LevelEditorGrid ? global.LevelEditorGrid.cellIcon(ch) : 'help'; }

  // ---- Link Mode ----
  function isLinkMode() { return linkMode; }
  function getSelectedActivator() { return selectedActivator; }

  function toggleLinkMode() {
    linkMode = !linkMode;
    const btn = document.getElementById('btn-link-mode');
    if (btn) btn.classList.toggle('active', linkMode);
    const hint = document.getElementById('link-mode-hint');
    if (linkMode) {
      if (hint) {
        hint.style.display = '';
        hint.textContent = 'Modo enlace: haz clic en un interruptor, placa, NPC, laser o llave para vincularlo';
      }
      selectedActivator = null;
      hideFloatPanel();
    } else {
      if (hint) hint.style.display = 'none';
      selectedActivator = null;
      hideFloatPanel();
    }
    if (global.LevelEditorGrid) global.LevelEditorGrid.renderGrid();
  }

  function deselectActivator() {
    selectedActivator = null;
    hideFloatPanel();
    if (global.LevelEditorGrid) global.LevelEditorGrid.renderGrid();
  }

  function getActivatorInfo(x, y, ch) {
    if (ch === 'S') {
      const idx = switchLinks.findIndex(l => l.x === x && l.y === y);
      return {type: 'switch', label: 'S', idx: idx >= 0 ? idx : switchLinks.length};
    }
    if (ch === 'o') {
      const idx = plateLinks.findIndex(l => l.x === x && l.y === y);
      return {type: 'plate', label: 'P', idx: idx >= 0 ? idx : plateLinks.length};
    }
    if (ch === 'N') {
      const idx = npcConfigs.findIndex(l => l.x === x && l.y === y);
      return {type: 'npc', label: 'N', idx: idx >= 0 ? idx : npcConfigs.length};
    }
    if (ch === 'L') {
      const idx = laserConfigs.findIndex(l => l.x === x && l.y === y);
      return {type: 'laser', label: 'L', idx: idx >= 0 ? idx : laserConfigs.length};
    }
    if (ch === 'F') {
      const idx = enemyConfigs.findIndex(l => l.x === x && l.y === y);
      return {type: 'enemy', label: 'F', idx: idx >= 0 ? idx : enemyConfigs.length};
    }
    if (ch === 'G') {
      const idx = pistonConfigs.findIndex(l => l.x === x && l.y === y);
      return {type: 'piston', label: 'G', idx: idx >= 0 ? idx : pistonConfigs.length};
    }
    if (ch === 'k') {
      const idx = keyConfigs.findIndex(l => l.x === x && l.y === y);
      return {type: 'key', label: 'K', idx: idx >= 0 ? idx : keyConfigs.length};
    }
    return null;
  }

  function getTargetInfo(x, y, ch) {
    if (ch === 'D' || ch === 'K') return {type: 'door'};
    if (ch === 'L') return {type: 'laser'};
    if (ch === 'i') return {type: 'item'};
    if (ch === 'F') return {type: 'enemy'};
    if (ch === 'G') return {type: 'piston'};
    return null;
  }

  function ensureLinkData(type, x, y) {
    if (type === 'switch') {
      let idx = switchLinks.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { switchLinks.push({x, y, targets: []}); idx = switchLinks.length - 1; }
      return switchLinks[idx];
    }
    if (type === 'plate') {
      let idx = plateLinks.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { plateLinks.push({x, y, cajasRequeridas: 1, targets: []}); idx = plateLinks.length - 1; }
      return plateLinks[idx];
    }
    if (type === 'npc') {
      let idx = npcConfigs.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { npcConfigs.push({x, y, requiredItems: [], targets: []}); idx = npcConfigs.length - 1; }
      return npcConfigs[idx];
    }
    if (type === 'laser') {
      let idx = laserConfigs.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { laserConfigs.push({x, y, dir: 'norte', active: true}); idx = laserConfigs.length - 1; }
      return laserConfigs[idx];
    }
    if (type === 'enemy') {
      let idx = enemyConfigs.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { enemyConfigs.push({x, y, dir: 'derecha', active: true, targets: [], patrolMode: 'bounce', speed: 1}); idx = enemyConfigs.length - 1; }
      return enemyConfigs[idx];
    }
    if (type === 'piston') {
      let idx = pistonConfigs.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { pistonConfigs.push({x, y, dir: 'derecha', active: false, sticky: false, targets: [], displayName: ''}); idx = pistonConfigs.length - 1; }
      return pistonConfigs[idx];
    }
    if (type === 'key') {
      let idx = keyConfigs.findIndex(l => l.x === x && l.y === y);
      if (idx < 0) { keyConfigs.push({x, y, targets: [], displayName: ''}); idx = keyConfigs.length - 1; }
      return keyConfigs[idx];
    }
    return null;
  }

  function handleLinkClick(x, y) {
    const grid = getGrid();
    const ch = grid[y][x];
    const actInfo = getActivatorInfo(x, y, ch);

    if (actInfo) {
      const linkData = ensureLinkData(actInfo.type, x, y);
      selectedActivator = {type: actInfo.type, x, y, idx: actInfo.idx};
      showFloatPanel(actInfo.type, x, y, linkData);
      if (global.LevelEditorGrid) global.LevelEditorGrid.renderGrid();
      return;
    }

    if (selectedActivator) {
      const tgtInfo = getTargetInfo(x, y, ch);
      if (tgtInfo) {
        toggleLinkTarget(x, y, tgtInfo.type);
        if (global.LevelEditorGrid) global.LevelEditorGrid.renderGrid();
        return;
      }
    }

    deselectActivator();
  }

  function toggleLinkTarget(tx, ty, targetType) {
    if (!selectedActivator) return;
    const linkData = ensureLinkData(selectedActivator.type, selectedActivator.x, selectedActivator.y);

    if (selectedActivator.type === 'npc') {
      if (targetType === 'item') {
        const key = tx + ',' + ty;
        if (!linkData.requiredItems) linkData.requiredItems = [];
        const idx = linkData.requiredItems.indexOf(key);
        if (idx >= 0) linkData.requiredItems.splice(idx, 1);
        else linkData.requiredItems.push(key);
      } else if (targetType === 'door') {
        if (!linkData.targets) linkData.targets = [];
        const idx = linkData.targets.findIndex(t => t.x === tx && t.y === ty);
        if (idx >= 0) linkData.targets.splice(idx, 1);
        else linkData.targets.push({x: tx, y: ty, type: 'door'});
      }
    } else if (selectedActivator.type === 'key') {
      if (!linkData.targets) linkData.targets = [];
      const idx = linkData.targets.findIndex(t => t.x === tx && t.y === ty);
      if (idx >= 0) linkData.targets.splice(idx, 1);
      else linkData.targets.push({x: tx, y: ty, type: 'door'});
    } else {
      if (!linkData.targets) linkData.targets = [];
      const idx = linkData.targets.findIndex(t => t.x === tx && t.y === ty);
      if (idx >= 0) linkData.targets.splice(idx, 1);
      else linkData.targets.push({x: tx, y: ty, type: targetType});
    }

    showFloatPanel(selectedActivator.type, selectedActivator.x, selectedActivator.y, linkData);
  }

  function isTargetLinked(tx, ty) {
    if (!selectedActivator) return false;
    if (selectedActivator.type === 'npc') {
      const cfg = npcConfigs.find(c => c.x === selectedActivator.x && c.y === selectedActivator.y);
      if (!cfg) return false;
      const isItem = (cfg.requiredItems || []).some(k => {
        const [ix, iy] = k.split(',').map(Number);
        return ix === tx && iy === ty;
      });
      if (isItem) return true;
      return (cfg.targets || []).some(t => t.x === tx && t.y === ty);
    }
    if (selectedActivator.type === 'key') {
      const cfg = keyConfigs.find(c => c.x === selectedActivator.x && c.y === selectedActivator.y);
      if (!cfg) return false;
      return (cfg.targets || []).some(t => t.x === tx && t.y === ty);
    }
    let linkData;
    if (selectedActivator.type === 'switch') linkData = switchLinks.find(l => l.x === selectedActivator.x && l.y === selectedActivator.y);
    else if (selectedActivator.type === 'plate') linkData = plateLinks.find(l => l.x === selectedActivator.x && l.y === selectedActivator.y);
    if (!linkData) return false;
    return (linkData.targets || []).some(t => t.x === tx && t.y === ty);
  }

  // ---- Floating Link Panel ----
  function showFloatPanel(type, x, y, linkData) {
    const panel = document.getElementById('float-link-panel');
    const icon = document.getElementById('flp-icon');
    const title = document.getElementById('flp-title');
    const body = document.getElementById('flp-body');
    if (!panel) return;

    const labels = {
      switch: 'Interruptor', plate: 'Placa de presion', npc: 'NPC',
      laser: 'Laser', enemy: 'Enemigo', piston: 'Piston', key: 'Llave'
    };
    const icons = {
      switch: 'toggle_on', plate: 'radio_button_checked', npc: 'face',
      laser: 'flash_on', enemy: 'dangerous', piston: 'precision_manufacturing', key: 'key'
    };
    const color = LINK_COLORS[type] || '#888';
    icon.innerHTML = `<span class="material-symbols-outlined">${icons[type]}</span>`;
    icon.style.background = color + '22';
    icon.style.color = color;
    const nameSuffix = linkData.displayName ? ` — ${linkData.displayName}` : '';
    title.textContent = `${labels[type]} (${x}, ${y})${nameSuffix}`;

    let html = '';
    html += `<div style="margin-bottom:8px"><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9c8749;display:block;margin-bottom:2px">Nombre</label>`;
    html += `<input type="text" placeholder="Nombre descriptivo" value="${linkData.displayName || ''}" class="config-input" style="width:100%;padding:3px 6px;font-size:12px" onchange="LevelEditorLinks.ensureLinkData('${type}',${x},${y}).displayName=this.value;LevelEditorLinks.showFloatPanel('${type}',${x},${y},LevelEditorLinks.ensureLinkData('${type}',${x},${y}))"></div>`;

    if (type === 'switch' || type === 'plate') {
      const doors = [...findElements('D'), ...findElements('K')];
      const lasers = findElements('L');
      const enemies = findElements('F');
      const pistons = findElements('G');

      html += `<div class="flp-section-title">Puertas vinculadas</div>`;
      if (doors.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
        doors.forEach(d => {
          const linked = (linkData.targets || []).some(t => t.x === d.x && t.y === d.y);
          html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${d.x},${d.y},'door')"><span class="material-symbols-outlined" style="font-size:14px">door_front</span>Puerta (${d.x},${d.y})</span>`;
        });
        html += '</div>';
      } else html += '<div class="flp-empty">No hay puertas en el mapa</div>';

      if (type === 'switch') {
        html += `<div class="flp-section-title">Laseres vinculados</div>`;
        if (lasers.length > 0) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
          lasers.forEach(l => {
            const linked = (linkData.targets || []).some(t => t.x === l.x && t.y === l.y);
            html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${l.x},${l.y},'laser')"><span class="material-symbols-outlined" style="font-size:14px">flash_on</span>Laser (${l.x},${l.y})</span>`;
          });
          html += '</div>';
        } else html += '<div class="flp-empty">No hay laseres en el mapa</div>';

        html += `<div class="flp-section-title">Enemigos vinculados (desactivar)</div>`;
        if (enemies.length > 0) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
          enemies.forEach(e => {
            const linked = (linkData.targets || []).some(t => t.x === e.x && t.y === e.y && t.type === 'enemy');
            html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${e.x},${e.y},'enemy')"><span class="material-symbols-outlined" style="font-size:14px">dangerous</span>Enemigo (${e.x},${e.y})</span>`;
          });
          html += '</div>';
        } else html += '<div class="flp-empty">No hay enemigos en el mapa</div>';

        html += `<div class="flp-section-title">Pistones vinculados (activar)</div>`;
        if (pistons.length > 0) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
          pistons.forEach(p => {
            const linked = (linkData.targets || []).some(t => t.x === p.x && t.y === p.y && t.type === 'piston');
            html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${p.x},${p.y},'piston')"><span class="material-symbols-outlined" style="font-size:14px">precision_manufacturing</span>Piston (${p.x},${p.y})</span>`;
          });
          html += '</div>';
        } else html += '<div class="flp-empty">No hay pistones en el mapa</div>';
      }

      if (type === 'plate') {
        html += `<div class="flp-section-title">Cajas necesarias</div>`;
        html += `<input type="number" min="1" max="10" value="${linkData.cajasRequeridas || 1}" class="config-input" style="width:50px;padding:3px 6px;font-size:12px" onchange="LevelEditorLinks.ensureLinkData('plate',${x},${y}).cajasRequeridas=parseInt(this.value)||1">`;
      }
    } else if (type === 'npc') {
      const items = [...findElements('i')];
      html += `<div class="flp-section-title">Items requeridos (clic para agregar/quitar)</div>`;
      if (items.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
        items.forEach(it => {
          const grid = getGrid();
          const ch = grid[it.y][it.x];
          const linked = (linkData.requiredItems || []).some(k => {
            const [ix, iy] = k.split(',').map(Number);
            return ix === it.x && iy === it.y;
          });
          html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${it.x},${it.y},'item')"><span class="material-symbols-outlined" style="font-size:14px">${cellIcon(ch)}</span>${cellLabel(ch)} (${it.x},${it.y})</span>`;
        });
        html += '</div>';
      } else html += '<div class="flp-empty">No hay items en el mapa</div>';

      const npcDoors = [...findElements('D'), ...findElements('K')];
      html += `<div class="flp-section-title">Puertas que abre al completarse</div>`;
      if (npcDoors.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
        npcDoors.forEach(d => {
          const linked = (linkData.targets || []).some(t => t.x === d.x && t.y === d.y);
          html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${d.x},${d.y},'door')"><span class="material-symbols-outlined" style="font-size:14px">door_front</span>Puerta (${d.x},${d.y})</span>`;
        });
        html += '</div>';
      } else html += '<div class="flp-empty">No hay puertas en el mapa</div>';
    } else if (type === 'laser') {
      html += `<div class="flp-section-title">Direccion</div>`;
      html += `<select class="config-input" style="padding:3px 6px;font-size:12px;width:100px" onchange="LevelEditorLinks.ensureLinkData('laser',${x},${y}).dir=this.value">`;
      ['norte', 'sur', 'este', 'oeste'].forEach(d => {
        html += `<option value="${d}"${linkData.dir === d ? ' selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`;
      });
      html += `</select>`;
      html += `<div style="margin-top:8px"><label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" ${linkData.active !== false ? 'checked' : ''} onchange="LevelEditorLinks.ensureLinkData('laser',${x},${y}).active=this.checked"> Activo al inicio</label></div>`;
    } else if (type === 'enemy') {
      html += `<div class="flp-section-title">Direccion inicial</div>`;
      html += `<select class="config-input" style="padding:3px 6px;font-size:12px;width:100px" onchange="LevelEditorLinks.ensureLinkData('enemy',${x},${y}).dir=this.value">`;
      ['norte', 'sur', 'este', 'oeste'].forEach(d => {
        html += `<option value="${d}"${linkData.dir === d ? ' selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`;
      });
      html += `</select>`;
      html += `<div style="margin-top:8px"><label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" ${linkData.active !== false ? 'checked' : ''} onchange="LevelEditorLinks.ensureLinkData('enemy',${x},${y}).active=this.checked"> Activo</label></div>`;
      html += `<div style="margin-top:8px"><span class="flp-section-title">Modo:</span>`;
      html += `<select class="config-input" style="padding:3px 6px;font-size:12px;width:100px" onchange="LevelEditorLinks.ensureLinkData('enemy',${x},${y}).patrolMode=this.value">`;
      html += `<option value="bounce"${linkData.patrolMode === 'bounce' ? ' selected' : ''}>Rebota</option>`;
      html += `<option value="patrol"${linkData.patrolMode === 'patrol' ? ' selected' : ''}>Patrualla fija</option>`;
      html += `</select></div>`;
      html += `<div style="margin-top:8px"><span class="flp-section-title">Velocidad (1-3 movimientos por tick):</span>`;
      html += `<input type="number" min="1" max="3" value="${linkData.speed || 1}" class="config-input" style="width:50px;padding:3px 6px;font-size:12px" onchange="LevelEditorLinks.ensureLinkData('enemy',${x},${y}).speed=parseInt(this.value)||1"></div>`;
    } else if (type === 'piston') {
      html += `<div class="flp-section-title">Direccion</div>`;
      html += `<select class="config-input" style="padding:3px 6px;font-size:12px;width:100px" onchange="LevelEditorLinks.ensureLinkData('piston',${x},${y}).dir=this.value">`;
      ['norte', 'sur', 'este', 'oeste'].forEach(d => {
        html += `<option value="${d}"${linkData.dir === d ? ' selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`;
      });
      html += `</select>`;
      html += `<div style="margin-top:8px"><label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" ${linkData.sticky ? 'checked' : ''} onchange="LevelEditorLinks.ensureLinkData('piston',${x},${y}).sticky=this.checked"> Pegajoso (atrae)</label></div>`;
    } else if (type === 'key') {
      html += `<div class="flp-section-title">Nombre de la llave</div>`;
      html += `<input type="text" placeholder="Ej: Llave maestra" value="${linkData.displayName || ''}" class="config-input" style="width:100%;padding:3px 6px;font-size:12px" onchange="LevelEditorLinks.ensureLinkData('key',${x},${y}).displayName=this.value">`;
      html += `<div class="flp-section-title">Puerta bloqueada que abre (clic para vincular)</div>`;
      const lockedDoors = [...findElements('K')];
      if (lockedDoors.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:2px">';
        lockedDoors.forEach(d => {
          const linked = (linkData.targets || []).some(t => t.x === d.x && t.y === d.y);
          html += `<span class="flp-chip${linked ? ' selected' : ''}" onclick="LevelEditorLinks.toggleLinkTarget(${d.x},${d.y},'door')"><span class="material-symbols-outlined" style="font-size:14px">lock</span>P. Bloqueada (${d.x},${d.y})</span>`;
        });
        html += '</div>';
      } else html += '<div class="flp-empty">No hay puertas bloqueadas (K) en el mapa</div>';
    }

    body.innerHTML = html;
    panel.classList.add('visible');
  }

  function hideFloatPanel() {
    const panel = document.getElementById('float-link-panel');
    if (panel) panel.classList.remove('visible');
  }

  // ---- Link Lines (SVG overlay) ----
  function drawLinkLines() {
    const svg = document.getElementById('link-svg');
    if (!svg) { if (svg) svg.innerHTML = ''; return; }
    if (!linkMode || !selectedActivator) { svg.innerHTML = ''; return; }
    const gc = document.getElementById('grid-container');
    const cells = gc.querySelectorAll('.grid-cell');
    // Get actual cell size from first cell
    const cellSize = cells.length > 0 ? cells[0].offsetWidth : 48;
    const half = cellSize / 2;
    let ax = 0, ay = 0;
    cells.forEach(c => {
      if (+c.dataset.x === selectedActivator.x && +c.dataset.y === selectedActivator.y) {
        ax = c.offsetLeft + half;
        ay = c.offsetTop + half;
      }
    });
    const color = LINK_COLORS[selectedActivator.type] || '#888';
    let targets = [];
    if (selectedActivator.type === 'switch') {
      const link = switchLinks.find(l => l.x === selectedActivator.x && l.y === selectedActivator.y);
      if (link) targets = link.targets || [];
    } else if (selectedActivator.type === 'plate') {
      const link = plateLinks.find(l => l.x === selectedActivator.x && l.y === selectedActivator.y);
      if (link) targets = link.targets || [];
    } else if (selectedActivator.type === 'npc') {
      const cfg = npcConfigs.find(c => c.x === selectedActivator.x && c.y === selectedActivator.y);
      if (cfg) {
        targets = (cfg.requiredItems || []).map(k => {
          const [ix, iy] = k.split(',').map(Number);
          return {x: ix, y: iy};
        });
        const doorTargets = (cfg.targets || []).map(t => ({x: t.x, y: t.y}));
        targets = targets.concat(doorTargets);
      }
    } else if (selectedActivator.type === 'key') {
      const cfg = keyConfigs.find(c => c.x === selectedActivator.x && c.y === selectedActivator.y);
      if (cfg) targets = (cfg.targets || []).map(t => ({x: t.x, y: t.y}));
    }
    let lines = '';
    targets.forEach(t => {
      let tx = 0, ty = 0;
      cells.forEach(c => {
        if (+c.dataset.x === t.x && +c.dataset.y === t.y) {
          tx = c.offsetLeft + half;
          ty = c.offsetTop + half;
        }
      });
      lines += `<line x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}" stroke="${color}" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>`;
      lines += `<circle cx="${tx}" cy="${ty}" r="5" fill="${color}" opacity="0.7"/>`;
    });
    svg.innerHTML = lines;
  }

  // ---- Render Links Tab ----
  function renderLinksTab() {
    const container = document.getElementById('links-container');
    if (!container) return;
    container.innerHTML = '';

    const switches = findElements('S');
    const doors = [...findElements('D'), ...findElements('K')];
    const lasers = findElements('L');
    const plates = findElements('o');
    const npcs = findElements('N');
    const enemies = findElements('F');
    const pistons = findElements('G');
    const keys = findElements('k');

    syncLinks('switch', switches, switchLinks);
    syncLinks('plate', plates, plateLinks);
    syncLinks('npc', npcs, npcConfigs);
    syncLinks('laser', lasers, laserConfigs);
    syncLinks('enemy', enemies, enemyConfigs);
    syncLinks('piston', pistons, pistonConfigs);
    syncLinks('key', keys, keyConfigs);

    // GENERAL SECTION
    {
      const section = createSection('General', 'settings', '#9c8749', 'Configuracion general del nivel: direccion del jugador y tamano del mapa.');
      const card = document.createElement('div');
      card.className = 'link-card';
      const gridW = getGridW(), gridH = getGridH();
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="text-xs font-semibold" style="color:#9c8749">Direccion inicial del jugador:</span>
          <select id="links-player-dir" class="config-input" style="padding:3px 6px;font-size:12px;width:110px">
            <option value="derecha">Derecha</option><option value="izquierda">Izquierda</option><option value="arriba">Arriba</option><option value="abajo">Abajo</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">
          <span class="text-xs font-semibold" style="color:#9c8749">Tamano del mapa:</span>
          <span class="text-xs" style="color:#9c8749">Ancho</span>
          <input type="number" id="links-grid-width" class="config-input" style="width:60px;padding:3px 6px;font-size:12px" value="${gridW}" min="3" max="20" />
          <span class="text-xs" style="color:#9c8749">Alto</span>
          <input type="number" id="links-grid-height" class="config-input" style="width:60px;padding:3px 6px;font-size:12px" value="${gridH}" min="3" max="20" />
          <button class="btn btn-sm btn-outline" onclick="LevelEditorGrid.resizeGridFromLinks()">Aplicar</button>
        </div>
      `;
      section.appendChild(card);
      container.appendChild(section);
      setTimeout(() => {
        const sel = document.getElementById('links-player-dir');
        if (sel) sel.value = document.getElementById('player-dir').value || 'derecha';
        if (sel) sel.onchange = function() { document.getElementById('player-dir').value = this.value; };
      }, 0);
    }

    // KEYS SECTION
    if (keys.length > 0) {
      const section = createSection('Llaves', 'key', '#ffd700', 'Vincula cada llave con una puerta bloqueada. Puedes asignar un nombre para identificarlas.');
      keys.forEach((k, i) => {
        const card = createLinkCard('Llave', k, cellIcon('k'), '#fffde7', '#ffd700', keyConfigs[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Llave maestra';
        nameInput.value = keyConfigs[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { keyConfigs[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const targetsHeader = document.createElement('div');
        targetsHeader.className = 'link-section-title';
        targetsHeader.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Puerta que abre (clic para vincular):';
        card.appendChild(targetsHeader);

        const chipsWrap = document.createElement('div');
        chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
        const lockedDoors = findElements('K');
        lockedDoors.forEach(d => {
          const chip = createTargetChip('K', d, keyConfigs[i], 'door');
          chipsWrap.appendChild(chip);
        });
        if (lockedDoors.length === 0) {
          chipsWrap.innerHTML = '<span class="empty-hint">No hay puertas bloqueadas (K) en el mapa.</span>';
        }
        card.appendChild(chipsWrap);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // SWITCHES SECTION
    if (switches.length > 0) {
      const section = createSection('Interruptores', 'toggle_on', '#888', 'Cada interruptor puede abrir puertas, desactivar laseres, activar pistones o desactivar enemigos.');
      switches.forEach((sw, i) => {
        const card = createLinkCard('Interruptor', sw, cellIcon('S'), '#f5f3ee', '#888', switchLinks[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Interruptor principal';
        nameInput.value = switchLinks[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { switchLinks[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const targetsHeader = document.createElement('div');
        targetsHeader.className = 'link-section-title';
        targetsHeader.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Controla (clic para vincular/desvincular):';
        card.appendChild(targetsHeader);

        const chipsWrap = document.createElement('div');
        chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
        doors.forEach(d => {
          const chip = createTargetChip('D', d, switchLinks[i], 'door');
          chipsWrap.appendChild(chip);
        });
        lasers.forEach(l => {
          const chip = createTargetChip('L', l, switchLinks[i], 'laser');
          chipsWrap.appendChild(chip);
        });
        const enemiesForSwitch = findElements('F');
        enemiesForSwitch.forEach(e => {
          const chip = createTargetChip('F', e, switchLinks[i], 'enemy');
          chipsWrap.appendChild(chip);
        });
        const pistonsForSwitch = findElements('G');
        pistonsForSwitch.forEach(p => {
          const chip = createTargetChip('G', p, switchLinks[i], 'piston');
          chipsWrap.appendChild(chip);
        });

        if (doors.length === 0 && lasers.length === 0 && enemiesForSwitch.length === 0 && pistonsForSwitch.length === 0) {
          chipsWrap.innerHTML = '<span class="empty-hint">No hay puertas, laseres, enemigos ni pistones en el mapa.</span>';
        }
        card.appendChild(chipsWrap);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // PLATES SECTION
    if (plates.length > 0) {
      const section = createSection('Placas de presion', 'radio_button_checked', '#777', 'Cada placa se activa al poner una caja encima. Controla puertas.');
      plates.forEach((pp, i) => {
        const card = createLinkCard('Placa', pp, cellIcon('o'), '#f5f3ee', '#777', plateLinks[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Placa de entrada';
        nameInput.value = plateLinks[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { plateLinks[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const cajasRow = document.createElement('div');
        cajasRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';
        cajasRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Cajas necesarias:</span>`;
        const cajasInput = document.createElement('input');
        cajasInput.type = 'number'; cajasInput.min = '1'; cajasInput.max = '10'; cajasInput.value = plateLinks[i].cajasRequeridas || 1;
        cajasInput.className = 'config-input'; cajasInput.style.cssText = 'width:50px;padding:3px 6px;font-size:12px';
        cajasInput.onchange = function() { plateLinks[i].cajasRequeridas = parseInt(this.value) || 1; };
        cajasRow.appendChild(cajasInput);
        card.appendChild(cajasRow);

        const targetsHeader = document.createElement('div');
        targetsHeader.className = 'link-section-title';
        targetsHeader.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Controla (clic para vincular/desvincular):';
        card.appendChild(targetsHeader);

        const chipsWrap = document.createElement('div');
        chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
        doors.forEach(d => {
          const chip = createTargetChip('D', d, plateLinks[i], 'door');
          chipsWrap.appendChild(chip);
        });
        if (doors.length === 0) {
          chipsWrap.innerHTML = '<span class="empty-hint">No hay puertas en el mapa.</span>';
        }
        card.appendChild(chipsWrap);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // NPC SECTION
    if (npcs.length > 0) {
      const section = createSection('NPCs', 'face', '#4caf50', 'Configura que necesita cada NPC para completarse.');
      npcs.forEach((n, i) => {
        const card = createLinkCard('NPC', n, cellIcon('N'), '#f0faf0', '#4caf50', npcConfigs[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Guardian del bosque';
        nameInput.value = npcConfigs[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { npcConfigs[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const itemsHeader = document.createElement('div');
        itemsHeader.className = 'link-section-title';
        itemsHeader.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">inventory</span> Items requeridos (clic para agregar):';
        card.appendChild(itemsHeader);

        const itemsWrap = document.createElement('div');
        itemsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;margin-bottom:8px;';
        const mapItems = [...findElements('i')];
        if (mapItems.length > 0) {
          mapItems.forEach(it => {
            const grid = getGrid();
            const ch = grid[it.y][it.x];
            const isSelected = (npcConfigs[i].requiredItems || []).some(r => r === it.x + ',' + it.y);
            const chip = document.createElement('span');
            chip.className = 'target-chip' + (isSelected ? ' selected' : '');
            chip.innerHTML = `<span class="chip-icon material-symbols-outlined">${cellIcon(ch)}</span>${cellLabel(ch)} (${it.x},${it.y})`;
            chip.onclick = () => {
              if (!npcConfigs[i].requiredItems) npcConfigs[i].requiredItems = [];
              const key = it.x + ',' + it.y;
              const idx = npcConfigs[i].requiredItems.indexOf(key);
              if (idx >= 0) npcConfigs[i].requiredItems.splice(idx, 1);
              else npcConfigs[i].requiredItems.push(key);
              renderLinksTab();
            };
            itemsWrap.appendChild(chip);
          });
        } else {
          itemsWrap.innerHTML = '<span class="empty-hint">No hay items en el mapa.</span>';
        }
        card.appendChild(itemsWrap);

        const npcTargetsHeader = document.createElement('div');
        npcTargetsHeader.className = 'link-section-title';
        npcTargetsHeader.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Puertas que abre al completarse (clic para vincular):';
        card.appendChild(npcTargetsHeader);

        const npcTargetsWrap = document.createElement('div');
        npcTargetsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
        doors.forEach(d => {
          const chip = createTargetChip('D', d, npcConfigs[i], 'door');
          npcTargetsWrap.appendChild(chip);
        });
        if (doors.length === 0) {
          npcTargetsWrap.innerHTML = '<span class="empty-hint">No hay puertas en el mapa.</span>';
        }
        card.appendChild(npcTargetsWrap);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // LASER SECTION
    if (lasers.length > 0) {
      const section = createSection('Laseres', 'flash_on', '#cc0000', 'Configura la direccion y estado de cada laser.');
      lasers.forEach((l, i) => {
        const card = createLinkCard('Laser', l, cellIcon('L'), '#fff5f5', '#cc0000', laserConfigs[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Laser de seguridad';
        nameInput.value = laserConfigs[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { laserConfigs[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
        row.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Direccion:</span>`;
        const sel = document.createElement('select');
        sel.className = 'config-input'; sel.style.cssText = 'padding:3px 6px;font-size:12px;width:90px';
        ['norte', 'sur', 'este', 'oeste'].forEach(d => {
          const o = document.createElement('option'); o.value = d; o.textContent = d.charAt(0).toUpperCase() + d.slice(1);
          if (laserConfigs[i].dir === d) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function() { laserConfigs[i].dir = this.value; };
        row.appendChild(sel);

        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = laserConfigs[i].active !== false;
        cb.onchange = function() { laserConfigs[i].active = this.checked; };
        lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' Activo al inicio'));
        row.appendChild(lbl);
        card.appendChild(row);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // ENEMY SECTION
    if (enemies.length > 0) {
      const section = createSection('Enemigos', 'dangerous', '#d32f2f', 'Configura el comportamiento de cada enemigo. Los enemigos se mueven automaticamente y matan al jugador al tocarlo.');
      enemies.forEach((e, i) => {
        const card = createLinkCard('Enemigo', e, cellIcon('F'), '#fff0f0', '#d32f2f', enemyConfigs[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Dragon guardian';
        nameInput.value = enemyConfigs[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { enemyConfigs[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
        row.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Direccion inicial:</span>`;
        const sel = document.createElement('select');
        sel.className = 'config-input'; sel.style.cssText = 'padding:3px 6px;font-size:12px;width:90px';
        ['norte', 'sur', 'este', 'oeste'].forEach(d => {
          const o = document.createElement('option'); o.value = d; o.textContent = d.charAt(0).toUpperCase() + d.slice(1);
          if (enemyConfigs[i].dir === d) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function() { enemyConfigs[i].dir = this.value; };
        row.appendChild(sel);

        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = enemyConfigs[i].active !== false;
        cb.onchange = function() { enemyConfigs[i].active = this.checked; };
        lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' Activo'));
        row.appendChild(lbl);

        const modeSel = document.createElement('select');
        modeSel.className = 'config-input'; modeSel.style.cssText = 'padding:3px 6px;font-size:12px;width:100px';
        const opt1 = document.createElement('option'); opt1.value = 'bounce'; opt1.textContent = 'Rebota';
        const opt2 = document.createElement('option'); opt2.value = 'patrol'; opt2.textContent = 'Patrualla fija';
        if (enemyConfigs[i].patrolMode === 'patrol') opt2.selected = true; else opt1.selected = true;
        modeSel.appendChild(opt1); modeSel.appendChild(opt2);
        modeSel.onchange = function() { enemyConfigs[i].patrolMode = this.value; };
        row.appendChild(document.createTextNode(' Modo:'));
        row.appendChild(modeSel);

        const speedLbl = document.createElement('span');
        speedLbl.style.cssText = 'font-size:12px;font-weight:600;color:#9c8749;margin-left:8px';
        speedLbl.textContent = 'Velocidad:';
        row.appendChild(speedLbl);
        const speedSel = document.createElement('select');
        speedSel.className = 'config-input'; speedSel.style.cssText = 'padding:3px 6px;font-size:12px;width:50px';
        [1, 2, 3].forEach(s => {
          const o = document.createElement('option'); o.value = s; o.textContent = s;
          if ((enemyConfigs[i].speed || 1) === s) o.selected = true;
          speedSel.appendChild(o);
        });
        speedSel.onchange = function() { enemyConfigs[i].speed = parseInt(this.value) || 1; };
        row.appendChild(speedSel);

        card.appendChild(row);
        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // PISTON SECTION
    if (pistons.length > 0) {
      const section = createSection('Pistones', 'precision_manufacturing', '#607d8b', 'Configura la direccion y comportamiento de cada piston. Los pistones empujan bloques al activarse.');
      pistons.forEach((p, i) => {
        const card = createLinkCard('Piston', p, cellIcon('G'), '#f5f5f5', '#607d8b', pistonConfigs[i].displayName);
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        nameRow.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Nombre:</span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.placeholder = 'Ej: Piston secreto';
        nameInput.value = pistonConfigs[i].displayName || '';
        nameInput.className = 'config-input'; nameInput.style.cssText = 'flex:1;padding:3px 6px;font-size:12px';
        nameInput.onchange = function() { pistonConfigs[i].displayName = this.value; };
        nameRow.appendChild(nameInput);
        card.appendChild(nameRow);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
        row.innerHTML = `<span class="text-xs font-semibold" style="color:#9c8749">Direccion:</span>`;
        const sel = document.createElement('select');
        sel.className = 'config-input'; sel.style.cssText = 'padding:3px 6px;font-size:12px;width:90px';
        ['norte', 'sur', 'este', 'oeste'].forEach(d => {
          const o = document.createElement('option'); o.value = d; o.textContent = d.charAt(0).toUpperCase() + d.slice(1);
          if (pistonConfigs[i].dir === d) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function() { pistonConfigs[i].dir = this.value; };
        row.appendChild(sel);

        const stickyLbl = document.createElement('label');
        stickyLbl.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer';
        const stickyCb = document.createElement('input'); stickyCb.type = 'checkbox'; stickyCb.checked = !!pistonConfigs[i].sticky;
        stickyCb.onchange = function() { pistonConfigs[i].sticky = this.checked; };
        stickyLbl.appendChild(stickyCb); stickyLbl.appendChild(document.createTextNode(' Pegajoso (atrae al retraer)'));
        row.appendChild(stickyLbl);
        card.appendChild(row);

        section.appendChild(card);
      });
      container.appendChild(section);
    }

    // Empty state hint (append, don't replace - so General section stays)
    if (switches.length === 0 && plates.length === 0 && npcs.length === 0 && lasers.length === 0 && enemies.length === 0 && pistons.length === 0 && keys.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'text-align:center;padding:30px 20px;margin-top:10px;border:2px dashed #e8e2ce;border-radius:12px;';
      emptyDiv.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:36px;color:#e8e2ce">link_off</span>
        <p class="text-sm text-text-light-muted mt-2">No hay elementos vinculables en el mapa.</p>
        <p class="text-xs text-text-light-muted mt-1">Coloca interruptores (S), placas (o), NPCs (N), llaves (k) o laseres (L) en la pestaña Mapa para configurar vínculos.</p>
      `;
      container.appendChild(emptyDiv);
    }
  }

  // ---- Helpers ----
  function syncLinks(type, positions, linksArr) {
    for (let i = linksArr.length - 1; i >= 0; i--) {
      if (!positions.some(p => p.x === linksArr[i].x && p.y === linksArr[i].y)) linksArr.splice(i, 1);
    }
    positions.forEach(p => {
      if (!linksArr.some(l => l.x === p.x && l.y === p.y)) {
        if (type === 'switch') linksArr.push({x: p.x, y: p.y, targets: [], displayName: ''});
        else if (type === 'plate') linksArr.push({x: p.x, y: p.y, cajasRequeridas: 1, targets: [], displayName: ''});
        else if (type === 'npc') linksArr.push({x: p.x, y: p.y, requiredItems: [], targets: [], displayName: ''});
        else if (type === 'laser') linksArr.push({x: p.x, y: p.y, dir: 'norte', active: true, displayName: ''});
        else if (type === 'enemy') linksArr.push({x: p.x, y: p.y, dir: 'derecha', active: true, targets: [], patrolMode: 'bounce', speed: 1, displayName: ''});
        else if (type === 'piston') linksArr.push({x: p.x, y: p.y, dir: 'derecha', active: false, sticky: false, targets: [], displayName: ''});
        else if (type === 'key') linksArr.push({x: p.x, y: p.y, targets: [], displayName: ''});
      }
    });
  }

  function createSection(title, icon, color, hint) {
    const div = document.createElement('div');
    div.style.marginBottom = '20px';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span class="material-symbols-outlined" style="font-size:20px;color:${color}">${icon}</span>
        <span style="font-weight:700;font-size:15px">${title}</span>
      </div>
      <p class="text-xs text-text-light-muted" style="margin-bottom:10px">${hint}</p>
    `;
    return div;
  }

  function createLinkCard(label, pos, icon, bg, fg, displayName) {
    const card = document.createElement('div');
    card.className = 'link-card';
    const header = document.createElement('div');
    header.className = 'link-card-header';
    const nameStr = displayName ? ` — <span style="color:#1c180d;font-style:italic">${displayName}</span>` : '';
    header.innerHTML = `<div class="icon-badge" style="background:${bg};color:${fg};border:1px solid ${fg}30"><span class="material-symbols-outlined">${icon}</span></div>${label} <span style="font-weight:400;color:#9c8749;font-size:12px">(${pos.x}, ${pos.y})</span>${nameStr}`;
    card.appendChild(header);
    return card;
  }

  function createTargetChip(ch, pos, linkData, type) {
    const isSelected = (linkData.targets || []).some(t => t.x === pos.x && t.y === pos.y && t.type === type);
    const chip = document.createElement('span');
    chip.className = 'target-chip' + (isSelected ? ' selected' : '');
    const icon = cellIcon(ch);
    const label = cellLabel(ch);
    let displayName = '';
    if (ch === 'K' || ch === 'D') {
      const keyLink = keyConfigs.find(k => (k.targets || []).some(t => t.x === pos.x && t.y === pos.y));
      if (keyLink && keyLink.displayName) displayName = ` [${keyLink.displayName}]`;
    }
    chip.innerHTML = `<span class="chip-icon material-symbols-outlined">${icon}</span>${label} (${pos.x},${pos.y})${displayName}`;
    chip.onclick = () => {
      if (!linkData.targets) linkData.targets = [];
      const idx = linkData.targets.findIndex(t => t.x === pos.x && t.y === pos.y && t.type === type);
      if (idx >= 0) linkData.targets.splice(idx, 1);
      else linkData.targets.push({x: pos.x, y: pos.y, type: type});
      renderLinksTab();
    };
    return chip;
  }

  // ---- Getters para links data ----
  function getSwitchLinks() { return switchLinks; }
  function getPlateLinks() { return plateLinks; }
  function getNpcConfigs() { return npcConfigs; }
  function getLaserConfigs() { return laserConfigs; }
  function getEnemyConfigs() { return enemyConfigs; }
  function getPistonConfigs() { return pistonConfigs; }
  function getKeyConfigs() { return keyConfigs; }

  function setSwitchLinks(v) { switchLinks = v; }
  function setPlateLinks(v) { plateLinks = v; }
  function setNpcConfigs(v) { npcConfigs = v; }
  function setLaserConfigs(v) { laserConfigs = v; }
  function setEnemyConfigs(v) { enemyConfigs = v; }
  function setPistonConfigs(v) { pistonConfigs = v; }
  function setKeyConfigs(v) { keyConfigs = v; }

  // ---- Public API ----
  global.LevelEditorLinks = {
    LINK_COLORS,
    isLinkMode,
    getSelectedActivator,
    toggleLinkMode,
    deselectActivator,
    getActivatorInfo,
    getTargetInfo,
    ensureLinkData,
    handleLinkClick,
    toggleLinkTarget,
    isTargetLinked,
    showFloatPanel,
    hideFloatPanel,
    drawLinkLines,
    renderLinksTab,
    syncLinks,
    getSwitchLinks,
    getPlateLinks,
    getNpcConfigs,
    getLaserConfigs,
    getEnemyConfigs,
    getPistonConfigs,
    getKeyConfigs,
    setSwitchLinks,
    setPlateLinks,
    setNpcConfigs,
    setLaserConfigs,
    setEnemyConfigs,
    setPistonConfigs,
    setKeyConfigs
  };

})(window);
