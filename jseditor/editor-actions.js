/* ============================================================
 * DevMe Level Editor - Actions Module
 * Maneja: tabs, generar código, importar, exportar, storage, play
 * ============================================================ */
(function(global) {
  'use strict';

  // ---- Helpers para acceder a otros módulos ----
  function getGrid() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGrid() : []; }
  function getGridW() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGridW() : 8; }
  function getGridH() { return global.LevelEditorGrid ? global.LevelEditorGrid.getGridH() : 7; }
  function findElements(ch) { return global.LevelEditorGrid ? global.LevelEditorGrid.findElements(ch) : []; }
  function setGrid(g) { if (global.LevelEditorGrid) global.LevelEditorGrid.setGrid(g); }
  function setGridW(w) { if (global.LevelEditorGrid) global.LevelEditorGrid.setGridW(w); }
  function setGridH(h) { if (global.LevelEditorGrid) global.LevelEditorGrid.setGridH(h); }
  function renderGrid() { if (global.LevelEditorGrid) global.LevelEditorGrid.renderGrid(); }
  function updatePreview() { if (global.LevelEditorGrid) global.LevelEditorGrid.updatePreview(); }
  function centerGrid() { if (global.LevelEditorGrid) global.LevelEditorGrid.centerGrid(); }

  function getLinks() { return global.LevelEditorLinks || {}; }

  // ---- Tabs ----
  function switchTab(name) {
    document.querySelectorAll('.editor-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === name)
    );
    ['grid', 'config', 'links', 'code', 'import'].forEach(t => {
      const tabEl = document.getElementById('tab-' + t);
      if (tabEl) tabEl.style.display = t === name ? '' : 'none';
    });
    if (name === 'code') generateCode();
    if (name === 'links') getLinks().renderLinksTab();
    const links = getLinks();
    if (name !== 'grid' && links.isLinkMode && links.isLinkMode()) {
      links.toggleLinkMode();
    }
    if (name === 'grid') centerGrid();
  }

  // ---- Build Level Object ----
  function buildLevelObject() {
    const id = parseInt(document.getElementById('level-id').value) || 16;
    const name = document.getElementById('level-name').value || 'Mi nivel';
    const desc = document.getElementById('level-desc').value || '';
    const goals = document.getElementById('level-goals').value.split('\n').filter(Boolean);
    const hints = document.getElementById('level-hints').value.split('\n').filter(Boolean);
    const gold = parseInt(document.getElementById('star-gold').value) || 10;
    const silver = parseInt(document.getElementById('star-silver').value) || 20;
    const starter = document.getElementById('level-starter').value || '';
    const dir = document.getElementById('player-dir').value || 'derecha';

    const grid = getGrid();
    const data = {
      id, name, desc, goals, hints,
      starThresholds: {gold, silver},
      starter,
      grid: grid.map(r => r.join('')),
      dir
    };

    const links = getLinks();

    const switches = findElements('S');
    if (switches.length > 0) {
      data.switches = switches.map((sw, i) => {
        const link = (links.getSwitchLinks ? links.getSwitchLinks() : []).find(l => l.x === sw.x && l.y === sw.y) || {targets: []};
        return {x: sw.x, y: sw.y, targets: (link.targets || []).map(t => {
          const o = {x: t.x, y: t.y};
          if (t.type && t.type !== 'door') o.type = t.type;
          return o;
        })};
      });
    }

    const lasers = findElements('L');
    if (lasers.length > 0) {
      data.lasers = lasers.map((l, i) => {
        const cfg = (links.getLaserConfigs ? links.getLaserConfigs() : []).find(c => c.x === l.x && c.y === l.y) || {dir: 'norte', active: true};
        return {x: l.x, y: l.y, dir: cfg.dir, active: cfg.active !== false};
      });
    }

    const plates = findElements('o');
    if (plates.length > 0) {
      data.pressurePlates = plates.map((pp, i) => {
        const link = (links.getPlateLinks ? links.getPlateLinks() : []).find(l => l.x === pp.x && l.y === pp.y) || {cajasRequeridas: 1, targets: []};
        return {x: pp.x, y: pp.y, cajasRequeridas: link.cajasRequeridas || 1, targets: (link.targets || []).map(t => ({x: t.x, y: t.y}))};
      });
    }

    const npcs = findElements('N');
    if (npcs.length > 0) {
      data.npcs = npcs.map((n, i) => {
        const cfg = (links.getNpcConfigs ? links.getNpcConfigs() : []).find(c => c.x === n.x && c.y === n.y) || {requiredItems: [], targets: []};
        const reqItems = (cfg.requiredItems || []).map(key => 'item');
        return {x: n.x, y: n.y, requiredItems: reqItems, targets: (cfg.targets || []).map(t => ({x: t.x, y: t.y}))};
      });
    }

    const enemies = findElements('F');
    if (enemies.length > 0) {
      data.enemies = enemies.map((e, i) => {
        const cfg = (links.getEnemyConfigs ? links.getEnemyConfigs() : []).find(c => c.x === e.x && c.y === e.y) || {dir: 'derecha', active: true, targets: [], patrolMode: 'bounce', speed: 1};
        return {x: e.x, y: e.y, dir: cfg.dir, active: cfg.active !== false, targets: (cfg.targets || []).map(t => ({x: t.x, y: t.y})), patrolMode: cfg.patrolMode || 'bounce', speed: cfg.speed || 1};
      });
    }

    const pistons = findElements('G');
    if (pistons.length > 0) {
      data.pistons = pistons.map((p, i) => {
        const cfg = (links.getPistonConfigs ? links.getPistonConfigs() : []).find(c => c.x === p.x && c.y === p.y) || {dir: 'derecha', active: false, sticky: false, targets: []};
        return {x: p.x, y: p.y, dir: cfg.dir, active: cfg.active || false, sticky: cfg.sticky || false, targets: (cfg.targets || []).map(t => ({x: t.x, y: t.y}))};
      });
    }

    const keys = findElements('k');
    if (keys.length > 0) {
      data.keys = keys.map((k, i) => {
        const cfg = (links.getKeyConfigs ? links.getKeyConfigs() : []).find(c => c.x === k.x && c.y === k.y) || {targets: [], displayName: ''};
        return {x: k.x, y: k.y, targets: (cfg.targets || []).map(t => ({x: t.x, y: t.y})), displayName: cfg.displayName || ''};
      });
    }

    return data;
  }

  // ---- Play Custom Level ----
  function playCustomLevel() {
    const players = findElements('P');
    if (players.length === 0) {
      alert('Coloca un jugador (P) en el mapa antes de jugar.');
      return;
    }
    const targets = findElements('X');
    if (targets.length === 0) {
      alert('Coloca al menos una meta (X) en el mapa.');
      return;
    }

    const levelData = buildLevelObject();
    console.log('Level data to save:', levelData);

    try {
      const jsonData = JSON.stringify(levelData);
      localStorage.setItem('devme_custom_level', jsonData);
      console.log('Level saved to localStorage, size:', jsonData.length);

      const saved = localStorage.getItem('devme_custom_level');
      if (!saved) {
        alert('Error: No se pudo guardar el nivel en localStorage. Esto puede deberse al protocolo file://. Intenta usar un servidor web local.');
        return;
      }
      console.log('Level verified in localStorage');
      window.location.href = 'index.html?custom=1';
    } catch (e) {
      console.error('Error saving level:', e);
      alert('Error al guardar el nivel: ' + e.message + '\n\nEsto puede deberse al protocolo file://. Intenta usar un servidor web local o abre los archivos desde un servidor.');
    }
  }

  // ---- Code Generation ----
  function generateCode() {
    const data = buildLevelObject();
    const jsStr = obj => JSON.stringify(obj).replace(/"/g, "'");
    let code = '  {\n';
    code += `    id:${data.id},\n`;
    code += `    name:"${data.name}",\n`;
    code += `    desc:"${data.desc}",\n`;
    code += `    goals:[${data.goals.map(g => `"${g}"`).join(',')}],\n`;
    code += `    hints:[\n${data.hints.map(h => `      "${h}"`).join(',\n')}\n    ],\n`;
    code += `    starThresholds:{ gold: ${data.starThresholds.gold}, silver: ${data.starThresholds.silver} },\n`;
    code += `    starter:\n\`${data.starter}\`,\n`;
    code += `    grid:[\n${data.grid.map(g => '      "' + g + '"').join(',\n')}\n    ],\n`;
    code += `    dir:'${data.dir}'`;
    if (data.switches) code += `,\n    switches:${jsStr(data.switches)}`;
    if (data.lasers) code += `,\n    lasers:${jsStr(data.lasers)}`;
    if (data.pressurePlates) code += `,\n    pressurePlates:${jsStr(data.pressurePlates)}`;
    if (data.npcs) code += `,\n    npcs:${jsStr(data.npcs)}`;
    if (data.enemies) code += `,\n    enemies:${jsStr(data.enemies)}`;
    if (data.pistons) code += `,\n    pistons:${jsStr(data.pistons)}`;
    if (data.keys) code += `,\n    keys:${jsStr(data.keys)}`;
    if (data.boxesToCollect) code += `,\n    boxesToCollect: ${data.boxesToCollect}`;
    code += '\n  }';

    const output = document.getElementById('code-output');
    if (output) output.textContent = code;
    return code;
  }

  function copyCode() {
    const code = generateCode();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => alert('Codigo copiado.'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Codigo copiado.');
    }
  }

  function downloadCode() {
    const code = generateCode();
    const blob = new Blob([code], {type: 'text/javascript'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivel_${document.getElementById('level-id').value || 'custom'}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Import ----
  function importLevel() {
    try {
      const raw = document.getElementById('import-input').value.trim();
      const level = eval('(' + raw + ')');
      if (!level.grid) throw new Error('Falta la propiedad "grid"');
      const gridArr = level.grid;
      setGridH(gridArr.length);
      setGridW(gridArr[0].length);
      setGrid(gridArr.map(row => row.split('')));

      document.getElementById('grid-width').value = getGridW();
      document.getElementById('grid-height').value = getGridH();
      document.getElementById('level-id').value = level.id || 16;
      document.getElementById('level-name').value = level.name || '';
      document.getElementById('level-desc').value = level.desc || '';
      document.getElementById('level-goals').value = (level.goals || []).join('\n');
      document.getElementById('level-hints').value = (level.hints || []).join('\n');
      document.getElementById('player-dir').value = level.dir || 'derecha';
      document.getElementById('level-starter').value = level.starter || '';
      if (level.starThresholds) {
        document.getElementById('star-gold').value = level.starThresholds.gold || 10;
        document.getElementById('star-silver').value = level.starThresholds.silver || 20;
      }

      const links = getLinks();
      if (links.setSwitchLinks) links.setSwitchLinks((level.switches || []).map(s => ({x: s.x, y: s.y, targets: s.targets || []})));
      if (links.setPlateLinks) links.setPlateLinks((level.pressurePlates || []).map(p => ({x: p.x, y: p.y, cajasRequeridas: p.cajasRequeridas || 1, targets: p.targets || []})));
      if (links.setNpcConfigs) links.setNpcConfigs((level.npcs || []).map(n => ({x: n.x, y: n.y, requiredItems: n.requiredItems || [], targets: n.targets || []})));
      if (links.setLaserConfigs) links.setLaserConfigs((level.lasers || []).map(l => ({x: l.x, y: l.y, dir: l.dir || 'norte', active: l.active !== undefined ? l.active : true})));
      if (links.setEnemyConfigs) links.setEnemyConfigs((level.enemies || []).map(e => ({x: e.x, y: e.y, dir: e.dir || 'derecha', active: e.active !== undefined ? e.active : true, targets: e.targets || [], patrolMode: e.patrolMode || 'bounce', speed: e.speed || 1})));
      if (links.setPistonConfigs) links.setPistonConfigs((level.pistons || []).map(p => ({x: p.x, y: p.y, dir: p.dir || 'derecha', active: p.active || false, sticky: p.sticky || false, targets: p.targets || [], displayName: ''})));
      if (links.setKeyConfigs) links.setKeyConfigs((level.keys || []).map(k => ({x: k.x, y: k.y, targets: k.targets || [], displayName: k.displayName || ''})));

      renderGrid();
      updatePreview();
      switchTab('grid');
      alert('Nivel importado correctamente.');
    } catch (e) {
      alert('Error al importar: ' + e.message);
    }
  }

  // ---- Storage ----
  function saveToStorage() {
    const grid = getGrid();
    const links = getLinks();
    const data = {
      grid,
      gridW: getGridW(),
      gridH: getGridH(),
      id: document.getElementById('level-id').value,
      name: document.getElementById('level-name').value,
      desc: document.getElementById('level-desc').value,
      goals: document.getElementById('level-goals').value,
      hints: document.getElementById('level-hints').value,
      starGold: document.getElementById('star-gold').value,
      starSilver: document.getElementById('star-silver').value,
      starter: document.getElementById('level-starter').value,
      dir: document.getElementById('player-dir').value,
      switchLinks: links.getSwitchLinks ? links.getSwitchLinks() : [],
      plateLinks: links.getPlateLinks ? links.getPlateLinks() : [],
      npcConfigs: links.getNpcConfigs ? links.getNpcConfigs() : [],
      laserConfigs: links.getLaserConfigs ? links.getLaserConfigs() : [],
      enemyConfigs: links.getEnemyConfigs ? links.getEnemyConfigs() : [],
      pistonConfigs: links.getPistonConfigs ? links.getPistonConfigs() : [],
      keyConfigs: links.getKeyConfigs ? links.getKeyConfigs() : []
    };
    try {
      localStorage.setItem('devme_level_editor', JSON.stringify(data));
      alert('Nivel guardado.');
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  }

  function loadFromStorage() {
    const raw = localStorage.getItem('devme_level_editor');
    if (!raw) {
      alert('No hay datos guardados.');
      return;
    }
    try {
      const d = JSON.parse(raw);
      setGrid(d.grid);
      setGridW(d.gridW);
      setGridH(d.gridH);

      document.getElementById('grid-width').value = getGridW();
      document.getElementById('grid-height').value = getGridH();
      document.getElementById('level-id').value = d.id || 16;
      document.getElementById('level-name').value = d.name || '';
      document.getElementById('level-desc').value = d.desc || '';
      document.getElementById('level-goals').value = d.goals || '';
      document.getElementById('level-hints').value = d.hints || '';
      document.getElementById('star-gold').value = d.starGold || 10;
      document.getElementById('star-silver').value = d.starSilver || 20;
      document.getElementById('level-starter').value = d.starter || '';
      document.getElementById('player-dir').value = d.dir || 'derecha';

      const links = getLinks();
      if (links.setSwitchLinks) links.setSwitchLinks(d.switchLinks || []);
      if (links.setPlateLinks) links.setPlateLinks(d.plateLinks || []);
      if (links.setNpcConfigs) links.setNpcConfigs(d.npcConfigs || []);
      if (links.setLaserConfigs) links.setLaserConfigs(d.laserConfigs || []);
      if (links.setEnemyConfigs) links.setEnemyConfigs(d.enemyConfigs || []);
      if (links.setPistonConfigs) links.setPistonConfigs(d.pistonConfigs || []);
      if (links.setKeyConfigs) links.setKeyConfigs(d.keyConfigs || []);

      renderGrid();
      updatePreview();
      alert('Nivel cargado.');
    } catch (e) {
      alert('Error al cargar: ' + e.message);
    }
  }

  function exportJSON() {
    const data = buildLevelObject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivel_${data.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Public API ----
  global.LevelEditorActions = {
    switchTab,
    buildLevelObject,
    playCustomLevel,
    generateCode,
    copyCode,
    downloadCode,
    importLevel,
    saveToStorage,
    loadFromStorage,
    exportJSON
  };

})(window);
