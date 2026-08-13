/* ============================================================
 * DevMe Level Editor - Grid Module
 * Maneja: grid, paleta, renderizado, viewport, zoom/pan
 * ============================================================ */
(function(global) {
  'use strict';

  // ---- Elementos del mapa ----
  const ELEMENTS = [
    {id:'wall',char:'#',label:'Pared',icon:'block',bg:'#4a3818',fg:'#6b5423',cls:'cell-wall'},
    {id:'player',char:'P',label:'Jugador',icon:'person',bg:'#e5d9a8',fg:'#e53e3e',cls:'cell-player'},
    {id:'target',char:'X',label:'Meta',icon:'star',bg:'#e5d9a8',fg:'#f4c025',cls:'cell-target'},
    {id:'box',char:'B',label:'Caja',icon:'inventory_2',bg:'#e5d9a8',fg:'#a56526',cls:'cell-box'},
    {id:'switch',char:'S',label:'Interruptor',icon:'toggle_on',bg:'#e5d9a8',fg:'#888',cls:'cell-switch'},
    {id:'door',char:'D',label:'Puerta',icon:'door_front',bg:'#e5d9a8',fg:'#5b3a1a',cls:'cell-door'},
    {id:'door_locked',char:'K',label:'P. Bloqueada',icon:'lock',bg:'#e5d9a8',fg:'#8b0000',cls:'cell-door-locked'},
    {id:'key',char:'k',label:'Llave',icon:'key',bg:'#e5d9a8',fg:'#ffd700',cls:'cell-key'},
    {id:'item',char:'i',label:'Item',icon:'diamond',bg:'#e5d9a8',fg:'#4488ff',cls:'cell-item'},
    {id:'npc',char:'N',label:'NPC',icon:'face',bg:'#e5d9a8',fg:'#4caf50',cls:'cell-npc'},
    {id:'plate',char:'o',label:'Placa presion',icon:'radio_button_checked',bg:'#e5d9a8',fg:'#777',cls:'cell-plate'},
    {id:'laser',char:'L',label:'Laser',icon:'flash_on',bg:'#e5d9a8',fg:'#cc0000',cls:'cell-laser'},
    {id:'enemy',char:'F',label:'Enemigo',icon:'dangerous',bg:'#e5d9a8',fg:'#d32f2f',cls:'cell-enemy'},
    {id:'piston',char:'G',label:'Piston',icon:'precision_manufacturing',bg:'#e5d9a8',fg:'#607d8b',cls:'cell-piston'},
  ];

  // ---- Estado del grid ----
  let gridW = 8, gridH = 7;
  let grid = [];
  let currentTool = 'wall';
  let isMouseDown = false;

  // ---- Estado del viewport (zoom/pan) ----
  let vpZoom = 1, vpOffX = 0, vpOffY = 0;
  let vpPanning = false, vpPanStartX = 0, vpPanStartY = 0;
  let panMode = false; // dedicated pan mode for mobile

  // ---- Cell size (responsive) ----
  function getCellSize() {
    return window.innerWidth < 768 ? 36 : 48;
  }

  // ---- Helpers ----
  function findElements(ch) {
    const r = [];
    for (let y = 0; y < gridH; y++)
      for (let x = 0; x < gridW; x++)
        if (grid[y][x] === ch) r.push({x, y});
    return r;
  }

  function cellLabel(ch) {
    const el = ELEMENTS.find(e => e.char === ch);
    return el ? el.label : ch;
  }

  function cellIcon(ch) {
    const el = ELEMENTS.find(e => e.char === ch);
    return el ? el.icon : 'help';
  }

  // ---- Paleta ----
  function buildPalette() {
    const pal = document.getElementById('palette');
    if (!pal) return;
    pal.innerHTML = '';
    ELEMENTS.forEach(el => {
      const d = document.createElement('div');
      d.className = 'palette-item' + (el.id === currentTool ? ' active' : '');
      d.dataset.tool = el.id;
      d.innerHTML = `<div class="palette-icon" style="background:${el.bg};color:${el.fg};border:1px solid rgba(0,0,0,.1)"><span class="material-symbols-outlined" style="font-size:16px">${el.icon}</span></div>${el.label} <span style="margin-left:auto;font-size:10px;opacity:.4">${el.char}</span>`;
      d.onclick = () => setTool(el.id);
      pal.appendChild(d);
    });
  }

  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.palette-item').forEach(p =>
      p.classList.toggle('active', p.dataset.tool === tool)
    );
  }

  // ---- Grid init/render ----
  function initGrid() {
    grid = [];
    for (let y = 0; y < gridH; y++) {
      grid[y] = [];
      for (let x = 0; x < gridW; x++) grid[y][x] = '.';
    }
  }

  function resizeGrid() {
    const nW = Math.min(Math.max(parseInt(document.getElementById('grid-width').value) || 8, 3), 20);
    const nH = Math.min(Math.max(parseInt(document.getElementById('grid-height').value) || 7, 3), 20);
    const old = grid.map(r => [...r]);
    gridW = nW; gridH = nH; grid = [];
    for (let y = 0; y < gridH; y++) {
      grid[y] = [];
      for (let x = 0; x < gridW; x++) grid[y][x] = (old[y] && old[y][x]) ? old[y][x] : '.';
    }
    renderGrid();
    updatePreview();
    centerGrid();
  }

  function resizeGridFromLinks() {
    const nW = Math.min(Math.max(parseInt(document.getElementById('links-grid-width').value) || 8, 3), 20);
    const nH = Math.min(Math.max(parseInt(document.getElementById('links-grid-height').value) || 7, 3), 20);
    document.getElementById('grid-width').value = nW;
    document.getElementById('grid-height').value = nH;
    const old = grid.map(r => [...r]);
    gridW = nW; gridH = nH; grid = [];
    for (let y = 0; y < gridH; y++) {
      grid[y] = [];
      for (let x = 0; x < gridW; x++) grid[y][x] = (old[y] && old[y][x]) ? old[y][x] : '.';
    }
    renderGrid();
    updatePreview();
    centerGrid();
    if (global.LevelEditorLinks) global.LevelEditorLinks.renderLinksTab();
  }

  function renderGrid() {
    const c = document.getElementById('grid-container');
    if (!c) return;
    const cellSize = getCellSize();
    c.style.gridTemplateColumns = `repeat(${gridW}, ${cellSize}px)`;
    c.style.gridAutoRows = `${cellSize}px`;
    c.innerHTML = '';

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const cell = document.createElement('div');
        const ch = grid[y][x];
        const el = ELEMENTS.find(e => e.char === ch) || ELEMENTS[0];
        const isDef = ch === '.';

        cell.className = 'grid-cell ' + (isDef ? 'cell-empty' : el.cls);
        cell.textContent = isDef ? '' : ch;
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.dataset.ch = ch;

        // Link mode visual indicators
        if (global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode()) {
          const actInfo = global.LevelEditorLinks.getActivatorInfo(x, y, ch);
          if (actInfo) {
            cell.classList.add('link-activator');
            cell.style.setProperty('--link-color', global.LevelEditorLinks.LINK_COLORS[actInfo.type] || '#888');
            const badge = document.createElement('div');
            badge.className = 'link-badge';
            badge.style.background = global.LevelEditorLinks.LINK_COLORS[actInfo.type] || '#888';
            badge.textContent = actInfo.label;
            cell.appendChild(badge);

            const sel = global.LevelEditorLinks.getSelectedActivator();
            if (sel && sel.x === x && sel.y === y) {
              cell.classList.add('link-selected');
            }
          }
          const tgtInfo = global.LevelEditorLinks.getTargetInfo(x, y, ch);
          const sel = global.LevelEditorLinks.getSelectedActivator();
          if (tgtInfo && sel) {
            cell.classList.add('link-target');
            cell.style.setProperty('--target-color', global.LevelEditorLinks.LINK_COLORS[sel.type] || '#22863a');
            const isLinked = global.LevelEditorLinks.isTargetLinked(x, y);
            const mark = document.createElement('div');
            mark.className = 'link-target-mark';
            mark.style.background = isLinked ? '#22863a' : '#e8e2ce';
            mark.textContent = isLinked ? '✓' : '○';
            cell.appendChild(mark);
          }
        }

        // Mouse events
        cell.onmousedown = e => {
          if (global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode()) {
            e.preventDefault();
            global.LevelEditorLinks.handleLinkClick(x, y);
            return;
          }
          e.preventDefault();
          isMouseDown = true;
          paintCell(x, y);
        };

        cell.onmouseenter = () => {
          if (isMouseDown && !(global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode())) {
            paintCell(x, y);
          }
        };

        cell.oncontextmenu = e => {
          e.preventDefault();
          if (!(global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode())) {
            eraseCell(x, y);
          }
        };

        // Touch events for mobile
        cell.ontouchstart = e => {
          e.preventDefault();
          if (global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode()) {
            global.LevelEditorLinks.handleLinkClick(x, y);
            return;
          }
          paintCell(x, y);
        };

        cell.title = `(${x}, ${y})`;
        c.appendChild(cell);
      }
    }

    if (global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode()) {
      global.LevelEditorLinks.drawLinkLines();
    }
  }

  document.addEventListener('mouseup', () => { isMouseDown = false; });
  document.addEventListener('touchend', () => { isMouseDown = false; });

  function paintCell(x, y) {
    if (currentTool === 'erase') { eraseCell(x, y); return; }
    const el = ELEMENTS.find(e => e.id === currentTool);
    if (!el) return;
    if (el.char === 'P') {
      for (let yy = 0; yy < gridH; yy++)
        for (let xx = 0; xx < gridW; xx++)
          if (grid[yy][xx] === 'P') grid[yy][xx] = '.';
    }
    grid[y][x] = el.char;
    renderGrid();
    updatePreview();
  }

  function eraseCell(x, y) {
    grid[y][x] = '.';
    renderGrid();
    updatePreview();
  }

  function clearGrid() {
    if (!confirm('¿Limpiar todo el mapa?')) return;
    initGrid();
    renderGrid();
    updatePreview();
  }

  // ---- Preview ----
  function updatePreview() {
    const cv = document.getElementById('preview-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const cw = cv.width, ch = cv.height;
    ctx.fillStyle = '#3a3218';
    ctx.fillRect(0, 0, cw, ch);
    const cell = Math.min(Math.floor(cw / gridW), Math.floor(ch / gridH));
    const oX = Math.floor((cw - cell * gridW) / 2);
    const oY = Math.floor((ch - cell * gridH) / 2);
    const cm = {
      '#': '#4a3818', 'P': '#e53e3e', 'X': '#f4c025', 'B': '#a56526',
      'S': '#888', 'D': '#5b3a1a', 'K': '#8b0000', 'k': '#ffd700',
      'i': '#4488ff', 'N': '#4caf50', 'o': '#777', 'L': '#cc0000',
      'F': '#d32f2f', 'G': '#607d8b'
    };
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const c = grid[y][x];
        ctx.fillStyle = c === '.' ? ((x + y) % 2 === 0 ? '#e5d9a8' : '#c9b976') : (cm[c] || '#e5d9a8');
        ctx.fillRect(oX + x * cell, oY + y * cell, cell, cell);
        if (c !== '.' && c !== '#') {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${cell * .5}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c, oX + x * cell + cell / 2, oY + y * cell + cell / 2 + 1);
        }
      }
    }
  }

  // ---- Zoom/Pan ----
  function updateTransform() {
    const t = document.getElementById('grid-transform');
    if (t) t.style.transform = `translate(${vpOffX}px, ${vpOffY}px) scale(${vpZoom})`;
    const lbl = document.getElementById('zoom-label');
    if (lbl) lbl.textContent = Math.round(vpZoom * 100) + '%';
  }

  function zoomIn() { vpZoom = Math.min(3, vpZoom * 1.2); updateTransform(); }
  function zoomOut() { vpZoom = Math.max(0.3, vpZoom / 1.2); updateTransform(); }
  function zoomReset() { vpZoom = 1; vpOffX = 0; vpOffY = 0; updateTransform(); }

  function centerGrid() {
    const vp = document.getElementById('grid-viewport');
    if (!vp || vp.clientWidth === 0) return;
    const cellSize = getCellSize();
    const gw = gridW * cellSize + 4, gh = gridH * cellSize + 4;
    vpOffX = (vp.clientWidth - gw * vpZoom) / 2;
    vpOffY = (vp.clientHeight - gh * vpZoom) / 2;
    updateTransform();
  }

  function fitToView() {
    const vp = document.getElementById('grid-viewport');
    if (!vp || vp.clientWidth === 0 || vp.clientHeight === 0) return false;
    const cellSize = getCellSize();
    const gw = gridW * cellSize + 4, gh = gridH * cellSize + 4;
    const pad = 32;
    const scaleX = (vp.clientWidth - pad) / gw;
    const scaleY = (vp.clientHeight - pad) / gh;
    if (scaleX <= 0 || scaleY <= 0) return false;
    vpZoom = Math.min(scaleX, scaleY, 2);
    vpZoom = Math.max(0.3, vpZoom);
    vpOffX = (vp.clientWidth - gw * vpZoom) / 2;
    vpOffY = (vp.clientHeight - gh * vpZoom) / 2;
    updateTransform();
    return true;
  }

  function setupViewport() {
    const vp = document.getElementById('grid-viewport');
    if (!vp) return;

    // Wheel zoom
    vp.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const oldZoom = vpZoom;
      if (e.deltaY < 0) vpZoom = Math.min(3, vpZoom * 1.1);
      else vpZoom = Math.max(0.3, vpZoom / 1.1);
      vpOffX = mx - (mx - vpOffX) * (vpZoom / oldZoom);
      vpOffY = my - (my - vpOffY) * (vpZoom / oldZoom);
      updateTransform();
    }, {passive: false});

    // Pan (middle mouse, alt+click, or pan mode)
    vp.addEventListener('mousedown', e => {
      const linkMode = global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode();
      if (linkMode && !panMode) return;
      if (panMode || e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        vpPanning = true;
        vpPanStartX = e.clientX - vpOffX;
        vpPanStartY = e.clientY - vpOffY;
        vp.classList.add('panning');
      }
    });

    document.addEventListener('mousemove', e => {
      if (vpPanning) {
        vpOffX = e.clientX - vpPanStartX;
        vpOffY = e.clientY - vpPanStartY;
        updateTransform();
      }
    });

    document.addEventListener('mouseup', e => {
      if (vpPanning) {
        vpPanning = false;
        if (vp) vp.classList.remove('panning');
      }
    });

    // Touch pan/zoom for mobile
    let touchStartDist = 0;
    let touchStartZoom = 1;
    let touchStartX = 0, touchStartY = 0;
    let touchStartOffX = 0, touchStartOffY = 0;

    vp.addEventListener('touchstart', e => {
      const linkMode = global.LevelEditorLinks && global.LevelEditorLinks.isLinkMode();
      
      // Two-finger: pinch zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
        touchStartZoom = vpZoom;
        touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchStartOffX = vpOffX;
        touchStartOffY = vpOffY;
      } 
      // Single touch: pan if in pan mode, or if touching viewport background
      else if (e.touches.length === 1) {
        const target = e.target;
        const isViewportBg = target === vp || target.id === 'grid-transform';
        
        if (panMode || (isViewportBg && !linkMode)) {
          e.preventDefault();
          vpPanning = true;
          vpPanStartX = e.touches[0].clientX - vpOffX;
          vpPanStartY = e.touches[0].clientY - vpOffY;
        }
      }
    }, {passive: false});

    vp.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchStartDist;
        vpZoom = Math.max(0.3, Math.min(3, touchStartZoom * scale));

        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        vpOffX = touchStartOffX + (cx - touchStartX);
        vpOffY = touchStartOffY + (cy - touchStartY);
        updateTransform();
      } else if (e.touches.length === 1 && vpPanning) {
        e.preventDefault();
        vpOffX = e.touches[0].clientX - vpPanStartX;
        vpOffY = e.touches[0].clientY - vpPanStartY;
        updateTransform();
      }
    }, {passive: false});

    vp.addEventListener('touchend', e => {
      if (e.touches.length === 0) {
        vpPanning = false;
      }
    });
  }

  // Toggle pan mode
  function togglePanMode() {
    panMode = !panMode;
    const vp = document.getElementById('grid-viewport');
    const btn = document.getElementById('btn-pan-mode');
    if (vp) {
      if (panMode) {
        vp.style.cursor = 'grab';
        if (btn) btn.classList.add('active');
      } else {
        vp.style.cursor = 'default';
        if (btn) btn.classList.remove('active');
      }
    }
  }

  // ---- Init ----
  function init() {
    buildPalette();
    initGrid();
    renderGrid();
    updatePreview();
    setupViewport();
    // Keep trying to fit grid until viewport has dimensions
    let attempts = 0;
    function tryFit() {
      if (fitToView()) return; // success
      attempts++;
      if (attempts < 20) setTimeout(tryFit, 100);
    }
    requestAnimationFrame(tryFit);
  }

  // ---- Public API ----
  global.LevelEditorGrid = {
    ELEMENTS,
    init,
    getGrid: () => grid,
    setGrid: (g) => { grid = g; },
    getGridW: () => gridW,
    setGridW: (w) => { gridW = w; },
    getGridH: () => gridH,
    setGridH: (h) => { gridH = h; },
    getCurrentTool: () => currentTool,
    findElements,
    cellLabel,
    cellIcon,
    buildPalette,
    setTool,
    initGrid,
    resizeGrid,
    resizeGridFromLinks,
    renderGrid,
    paintCell,
    eraseCell,
    clearGrid,
    updatePreview,
    updateTransform,
    zoomIn,
    zoomOut,
    zoomReset,
    centerGrid,
    fitToView,
    setupViewport,
    togglePanMode,
    getCellSize
  };

  // Re-center on window resize
  window.addEventListener('resize', () => {
    renderGrid();
    setTimeout(fitToView, 100);
  });

})(window);
