/**
 * main-mobile.js - Controlador movil para el juego DevMe
 * Reemplaza main.js en dispositivos moviles con controles touch-friendly
 */
(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  const gameCanvas = $('game-canvas');
  const gameOverlay = $('game-overlay');
  const gameSpeed = $('game-speed');
  const gameSpeedLbl = $('game-speed-lbl');
  const editor = $('editor');
  const consoleEl = $('console');
  const errorsEl = $('errors');
  const consoleSheet = $('console-sheet');

  let currentLevelIdx = parseInt(localStorage.getItem('cq_level')||'0',10);
  if(currentLevelIdx >= LEVELS.length) currentLevelIdx = 0;
  let world = null;
  let initialWorld = null;
  let controller = null;
  const renderer = makeRenderer(gameCanvas);
  let highlightLine = -1;
  let enemyPatrolInterval = null;

  // ========== TRADUCCION DE ERRORES ==========
  function tradError(msg){
    const map = {
      'Expected': 'Se esperaba', 'Unexpected': 'No se esperaba',
      'Undefined variable': 'Variable no definida', 'Division by zero': 'Division entre cero',
      'Maximum recursion depth': 'Se excedio la recursion maxima',
      'Unknown command': 'Comando no reconocido', 'Missing': 'Falta',
      'Unexpected end': 'Fin inesperado', 'Expected end': 'Se esperaba el cierre',
      'Cannot advance': 'No se puede avanzar', 'wall': 'pared',
      'No box': 'No hay caja', 'Already carrying': 'Ya llevas un objeto',
      'Not carrying': 'No llevas ningun objeto', 'No switch': 'No hay interruptor',
      'No door': 'No hay puerta', 'Invalid direction': 'Direccion no valida',
    };
    let result = msg;
    for(const [en, es] of Object.entries(map)){
      result = result.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), es);
    }
    return result;
  }

  // ========== CARGA DE NIVELES ==========
  function loadLevel(idx, isReset){
    currentLevelIdx = idx;
    localStorage.setItem('cq_level', String(idx));
    const def = LEVELS[idx];
    world = buildLevel(def);
    initialWorld = cloneWorld(world);
    highlightLine = -1;
    
    $('game-level-title').textContent = `Nivel ${def.id}`;
    $('game-level-subtitle').textContent = def.name;
    $('game-level-label').textContent = `Nivel ${def.id}: ${def.name}`;
    
    renderGoals();
    renderHints();
    updateStarsDisplay();
    renderer.setWorld(world);
    setGameStatus('idle','Listo');
    updateInstrCount(0);
    hideGameOverlay();
    startEnemyPatrol();

    if (!isReset && def.starter) {
      editor.value = def.starter;
    }
  }

  function renderGoals(){
    const c = $('game-goals');
    const cs = $('game-goals-sheet');
    if(!c) return;
    c.innerHTML = '';
    if(cs) cs.innerHTML = '';
    world.def.goals.forEach((g,i)=>{
      const d = document.createElement('div');
      d.className = 'goal-item';
      d.innerHTML = `<span class="material-symbols-outlined">radio_button_unchecked</span><span>${g}</span>`;
      d.dataset.goal = i;
      c.appendChild(d);
      if(cs){
        const d2 = d.cloneNode(true);
        cs.appendChild(d2);
      }
    });
  }

  function renderHints(){
    const c = $('game-hints');
    const cs = $('game-hints-sheet');
    if(!c) return;
    c.innerHTML = '';
    if(cs) cs.innerHTML = '';
    (world.def.hints||[]).forEach((h,i)=>{
      const d = document.createElement('details');
      d.style.cssText = 'background:rgba(244,192,37,0.1);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:12px;';
      d.innerHTML = `<summary style="cursor:pointer;font-weight:600;color:#b8860b;">Pista ${i+1}</summary><p style="margin:6px 0 0;color:#6b5a2e;">${h}</p>`;
      c.appendChild(d);
      if(cs){
        const d2 = d.cloneNode(true);
        cs.appendChild(d2);
      }
    });
    $('game-desc').textContent = world.def.desc;
    if($('game-desc-sheet')) $('game-desc-sheet').textContent = world.def.desc;
  }

  function updateGoalsUI(){
    const items = $('game-goals') ? $('game-goals').querySelectorAll('.goal-item') : [];
    const itemsSheet = $('game-goals-sheet') ? $('game-goals-sheet').querySelectorAll('.goal-item') : [];
    const st = getGoalsState();
    [items, itemsSheet].forEach(itemSet => {
      itemSet.forEach((it,i)=>{
        if(st[i]){
          it.classList.add('done');
          it.querySelector('.material-symbols-outlined').textContent = 'check_circle';
        } else {
          it.classList.remove('done');
          it.querySelector('.material-symbols-outlined').textContent = 'radio_button_unchecked';
        }
      });
    });
  }

  function getGoalsState(){
    if(!world || !world.def) return [];
    const def = world.def;
    const st = [];
    for(let i=0;i<def.goals.length;i++){
      const g = def.goals[i].toLowerCase();
      if(g.includes('tomar la caja') || g.includes('tomar caja')){
        st[i] = !!world.player.carrying || world.delivered>0 || (world.inventory && world.inventory.length > 0);
      } else if(g.includes('recoger la llave') || g.includes('recoger llave')){
        st[i] = (world.inventory||[]).some(it => it.type === 'llave') || world.delivered > 0;
      } else if(g.includes('recoger el') && g.includes('item')){
        st[i] = (world.inventory||[]).some(it => it.type === 'item') || world.delivered > 0;
      } else if(g.includes('activar') && g.includes('interruptor')){
        st[i] = world.switches.some(s=>s.active);
      } else if(g.includes('activar') && g.includes('placa')){
        st[i] = (world.pressurePlates||[]).some(pp=>pp.active);
      } else if((g.includes('desactivar')) && g.includes('laser')){
        st[i] = world.lasers.length > 0 && (world.lasers||[]).every(l=>!l.active);
      } else if(g.includes('entregar') && (g.includes('npc') || g.includes('al npc'))){
        st[i] = (world.npcs||[]).some(n=>n.completed);
      } else if(g.includes('abrir') && g.includes('bloqueada')){
        st[i] = world.doors.some(d => d.locked && d.open);
      } else if(g.includes('activar')){
        st[i] = world.switches.some(s=>s.active) || (world.pressurePlates||[]).some(pp=>pp.active);
      } else if(g.includes('recoger') && g.match(/\d+/)){
        const n = parseInt(g.match(/\d+/)[0],10);
        st[i] = (world.boxesToCollect - world.boxes.length) >= n || world.delivered >= n;
      } else if(g.includes('depositar') || g.includes('con la caja')){
        if(g.match(/\d+/)){
          const n = parseInt(g.match(/\d+/)[0],10);
          st[i] = world.delivered >= n;
        } else if(g.includes('todas')){
          st[i] = world.delivered >= world.boxesToCollect;
        } else {
          st[i] = world.delivered >= 1;
        }
      } else if(g.includes('llegar') || g.includes('meta')){
        st[i] = world.targets.some(t=>t.x===world.player.x && t.y===world.player.y);
      } else if(g.includes('empujar') && g.includes('placa')){
        st[i] = (world.pressurePlates||[]).some(pp=>pp.active);
      } else if(g.includes('derrotar') && g.includes('enemigo')){
        st[i] = (world.enemies||[]).length > 0 && (world.enemies||[]).every(e=>e.defeated || !e.active);
      } else if(g.includes('activar') && g.includes('piston')){
        st[i] = (world.pistons||[]).some(p=>p.active);
      } else {
        st[i] = false;
      }
    }
    return st;
  }

  function checkGoalsSilent(){
    if(!world || !world.def) return false;
    const st = getGoalsState();
    return st.length > 0 && st.every(Boolean);
  }

  // ========== UI HELPERS ==========
  function setGameStatus(cls, txt){
    const chip = $('game-status-chip');
    if(!chip) return;
    chip.textContent = txt;
    chip.className = 'status-chip';
    if(cls === 'running') chip.classList.add('running');
    else if(cls === 'ok') chip.classList.add('ok');
    else if(cls === 'err') chip.classList.add('err');
  }
  function updateInstrCount(n){ const el=$('game-instr-count'); if(el) el.textContent=n; }
  function hideGameOverlay(){ gameOverlay.classList.add('hidden'); gameOverlay.classList.remove('error'); gameOverlay.innerHTML=''; }
  function showGameOverlay(txt, err){
    gameOverlay.classList.remove('hidden');
    gameOverlay.classList.toggle('error', !!err);
    gameOverlay.innerHTML = `<div>${txt}</div>`;
  }

  function gameLog(msg, cls){
    if(!consoleEl) return;
    const d = document.createElement('span');
    d.className = cls||'';
    d.textContent = msg + '\n';
    consoleEl.appendChild(d);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function updateStarsDisplay() {
    const starsEl = $('game-stars-display');
    if (!starsEl || !world || !world.def) return;
    const prog = JSON.parse(localStorage.getItem('cq_progress') || '{}');
    const stars = prog[world.def.id] || 0;
    starsEl.innerHTML = [1,2,3].map(n =>
      n <= stars ? '<span style="color:#f4c025;">&#9733;</span>' : '<span style="color:#e8e2ce;">&#9733;</span>'
    ).join('');
  }

  // ========== EJECUCION DEL JUEGO ==========
  async function runGameProgram(){
    if(controller) return;
    stopEnemyPatrol();
    resetEnemiesToOrigin();
    await new Promise(r => setTimeout(r, 350));

    if(consoleEl) consoleEl.innerHTML = '';
    world = cloneWorld(initialWorld);
    renderer.setWorld(world);
    updateGoalsUI();

    const src = editor ? editor.value : '';
    if(!src.trim()){
      gameLog('El editor esta vacio. Escribe tu algoritmo.', 'info');
      return;
    }

    let ast;
    try {
      ast = GameParser.parse(src);
    } catch(e){
      const msg = tradError(e.message);
      gameLog(`Linea ${e.line}: ${msg}`, 'err');
      setGameStatus('err','Error de sintaxis');
      showGameOverlay(msg, true);
      return;
    }

    controller = new AbortController();
    setGameStatus('running','Ejecutando...');
    $('btn-run').style.display = 'none';
    $('btn-stop').style.display = 'flex';
    $('btn-pause').style.display = 'flex';
    hideGameOverlay();
    updateInstrCount(0);

    const ui = {
      getStepDelay: ()=> (850 - parseInt(gameSpeed.value,10)),
      onStep: (line)=>{ highlightLine=line; },
      render: ()=>{ renderer.render(); updateGoalsUI(); },
      updateCounter: (n)=>{ updateInstrCount(n); },
      log: gameLog,
      checkGoals: ()=>{ updateGoalsUI(); return checkGoalsSilent(); },
      checkGoalsSilent: ()=> checkGoalsSilent(),
      sayBubble: (m)=>{ renderer.sayBubble(m); },
      animateEntity: (entity, fromX, fromY)=>{
        const delay = 850 - parseInt(gameSpeed.value,10);
        const duration = Math.max(50, Math.min(350, delay * 0.65));
        renderer.setAnimDuration(duration);
        renderer.animateEntity(entity, fromX, fromY, duration);
      },
      read: (varName)=>{
        return new Promise((resolve, reject) => {
          const inputLine = $('input-line');
          const stdinInput = $('stdin');
          const promptEl = $('input-prompt');
          const btnSend = $('btn-send');
          if(!inputLine || !stdinInput) { resolve(''); return; }

          // Open console sheet
          consoleSheet.classList.add('open');
          inputLine.classList.add('visible');
          promptEl.textContent = `Leer ${varName || 'valor'}:`;
          stdinInput.value = '';
          stdinInput.focus();

          const abortHandler = () => { cleanup(); reject(new Error('Ejecucion cancelada')); };
          controller.signal.addEventListener('abort', abortHandler);

          const send = () => {
            const val = stdinInput.value;
            if(consoleEl){
              const d = document.createElement('span');
              d.className = 'in';
              d.textContent = '> ' + val + '\n';
              consoleEl.appendChild(d);
              consoleEl.scrollTop = consoleEl.scrollHeight;
            }
            cleanup();
            resolve(val);
          };
          const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } };
          const cleanup = () => {
            inputLine.classList.remove('visible');
            btnSend.removeEventListener('click', send);
            stdinInput.removeEventListener('keydown', onKey);
            controller.signal.removeEventListener('abort', abortHandler);
          };
          btnSend.addEventListener('click', send);
          stdinInput.addEventListener('keydown', onKey);
        });
      },
      onPause: ()=>{
        setGameStatus('running','Pausado');
        $('btn-pause').querySelector('.material-symbols-outlined').textContent = 'play_arrow';
      },
      onResume: ()=>{
        setGameStatus('running','Ejecutando...');
        $('btn-pause').querySelector('.material-symbols-outlined').textContent = 'pause';
      }
    };

    try {
      const res = await GameRuntime.run(ast, world, ui, controller.signal);
      if(res && res.cancelled){
        setGameStatus('idle','Detenido');
        gameLog('--- Ejecucion cancelada ---', 'info');
      } else {
        renderer.render();
        updateGoalsUI();
        if(checkGoalsSilent()){
          onGameWin(res.instrCount);
        } else {
          setGameStatus('idle','Fin del programa');
          gameLog(`Programa terminado (${res.instrCount} instrucciones). Objetivo no alcanzado.`, 'info');
        }
      }
    } catch(e){
      if(e.message==='__WIN__'){
        renderer.render();
        updateGoalsUI();
        onGameWin(parseInt($('game-instr-count').textContent,10)||0);
      } else if(e.message==='Ejecucion cancelada'){
        setGameStatus('idle','Detenido');
        gameLog('--- Ejecucion cancelada ---', 'info');
      } else {
        const msg = tradError(e.message);
        gameLog(`Linea ${e.line||'?'}: ${msg}`, 'err');
        setGameStatus('err','Error');
        showGameOverlay(msg, true);
        world = cloneWorld(initialWorld);
        renderer.setWorld(world);
        updateGoalsUI();
      }
    } finally {
      controller = null;
      $('btn-run').style.display = 'flex';
      $('btn-stop').style.display = 'none';
      $('btn-pause').style.display = 'none';
      $('btn-pause').querySelector('.material-symbols-outlined').textContent = 'pause';
      window.__gameState = null;
      startEnemyPatrol();
    }
  }

  function stopGameProgram(){
    if(controller) controller.abort();
    if(window.__gameState && window.__gameState.paused) window.__gameState.resume();
  }

  function togglePauseGame(){
    if(window.__gameState) window.__gameState.togglePause();
  }

  function resetGame(){
    if(controller) controller.abort();
    if(window.__gameState && window.__gameState.paused) window.__gameState.resume();
    stopEnemyPatrol();
    loadLevel(currentLevelIdx, true);
  }

  function onGameWin(n){
    const def = world.def;
    setGameStatus('ok','Completado!');
    gameLog(`Nivel completado en ${n} instrucciones!`, 'ok');
    const {gold, silver} = def.starThresholds || {gold:999,silver:999};
    let stars = 1;
    if(n <= gold) stars = 3;
    else if(n <= silver) stars = 2;
    const prog = JSON.parse(localStorage.getItem('cq_progress')||'{}');
    prog[def.id] = Math.max(stars, prog[def.id]||0);
    localStorage.setItem('cq_progress', JSON.stringify(prog));
    $('game-win-stats').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;padding:8px 12px;background:#f5f3ee;border-radius:8px;">
        <div style="font-size:20px;font-weight:700;color:#f4c025;">${n}</div>
        <div style="font-size:10px;color:#9c8749;text-transform:uppercase;">Instrucciones</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;padding:8px 12px;background:#f5f3ee;border-radius:8px;">
        <div style="font-size:20px;font-weight:700;color:#f4c025;">${gold}</div>
        <div style="font-size:10px;color:#9c8749;text-transform:uppercase;">Meta oro</div>
      </div>
    `;
    $('game-win-stars').innerHTML = [1,2,3].map(i => i<=stars?'<span style="color:#f4c025;text-shadow:0 0 12px rgba(244,192,37,0.4);">&#9733;</span>':'<span>&#9733;</span>').join('');
    $('game-win-modal').classList.add('open');
  }

  // ========== ENEMY PATROL ==========
  function startEnemyPatrol(){
    stopEnemyPatrol();
    if(!world || !world.enemies || world.enemies.length === 0) return;
    for(const e of world.enemies){
      if(e.origX === undefined){ e.origX = e.x; e.origY = e.y; e.origDir = e.dir; }
    }
    const DELTAS_PATROL = { arriba:[0,-1], derecha:[1,0], abajo:[0,1], izquierda:[-1,0] };
    enemyPatrolInterval = setInterval(()=>{
      if(!world || !world.enemies) return;
      for(const enemy of world.enemies){
        if(!enemy.active || enemy.defeated) continue;
        const [dx,dy] = DELTAS_PATROL[enemy.dir] || [1,0];
        const nx = enemy.x + dx;
        const ny = enemy.y + dy;
        let blocked = false;
        if(nx<0 || ny<0 || nx>=world.W || ny>=world.H) blocked = true;
        if(!blocked && world.walls.some(w => w.x===nx && w.y===ny)) blocked = true;
        if(!blocked){ const d = world.doors.find(d => d.x===nx && d.y===ny); if(d && !d.open) blocked = true; }
        if(!blocked && (world.npcs||[]).some(n => n.x===nx && n.y===ny)) blocked = true;
        if(!blocked && world.boxes.some(b => b.x===nx && b.y===ny)) blocked = true;
        if(!blocked && (world.pistons||[]).some(p => { if(p.x===nx && p.y===ny) return true; if(p.extended && p.extendX===nx && p.extendY===ny) return true; return false; })) blocked = true;
        if(blocked){
          if(enemy.patrolMode === 'bounce'){
            const opp = {arriba:'abajo', abajo:'arriba', izquierda:'derecha', derecha:'izquierda'};
            enemy.dir = opp[enemy.dir] || enemy.dir;
          }
        } else {
          renderer.animateEntity(enemy, enemy.x, enemy.y, 300);
          enemy.x = nx;
          enemy.y = ny;
        }
      }
      renderer.render();
    }, 450);
  }

  function stopEnemyPatrol(){
    if(enemyPatrolInterval){ clearInterval(enemyPatrolInterval); enemyPatrolInterval = null; }
  }

  function resetEnemiesToOrigin(){
    if(!world || !world.enemies) return;
    for(const e of world.enemies){
      if(e.origX !== undefined){
        renderer.animateEntity(e, e.x, e.y, 300);
        e.x = e.origX;
        e.y = e.origY;
        e.dir = e.origDir || e.dir;
      }
    }
  }

  // ========== LEVEL SELECTOR ==========
  function renderLevelsGrid(){
    const grid = $('game-levels-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const prog = JSON.parse(localStorage.getItem('cq_progress')||'{}');
    LEVELS.forEach((lvl,i)=>{
      const d = document.createElement('div');
      d.className = 'level-card';
      const stars = prog[lvl.id]||0;
      const prevStars = i===0 ? 1 : (prog[LEVELS[i-1].id]||0);
      const locked = i>0 && prevStars===0;
      if(locked) d.classList.add('locked');
      d.innerHTML = `
        <div style="font-size:10px;color:#9c8749;font-weight:600;">Nivel ${lvl.id}</div>
        <div style="font-weight:700;font-size:12px;color:#1c180d;">${lvl.name}</div>
        <div style="display:flex;gap:2px;font-size:14px;color:#9c8749;">
          ${[1,2,3].map(n=>`<span style="${n<=stars?'color:#f4c025':''}">&#9733;</span>`).join('')}
        </div>
      `;
      if(!locked) d.addEventListener('click',()=>{
        loadLevel(i);
        $('game-levels-modal').classList.remove('open');
      });
      grid.appendChild(d);
    });
  }

  // ========== TABS ==========
  function setupTabs(){
    const tabs = document.querySelectorAll('.mobile-tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        panels.forEach(p => p.style.display = 'none');
        const panel = $('tab-' + tabName);
        if(panel) panel.style.display = 'flex';
      });
    });
  }

  // ========== CONSOLE SHEET ==========
  function setupConsoleSheet(){
    const handle = $('console-handle');
    const sheet = consoleSheet;
    const btnConsole = $('btn-console');
    
    handle.addEventListener('click', () => {
      sheet.classList.toggle('open');
    });
    
    if(btnConsole){
      btnConsole.addEventListener('click', () => {
        sheet.classList.toggle('open');
      });
    }

    // Sheet tabs
    const sheetTabs = document.querySelectorAll('.sheet-tab');
    const sheetPanels = document.querySelectorAll('.sheet-panel');
    sheetTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sheetTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.sheetTab;
        sheetPanels.forEach(p => p.style.display = 'none');
        const panel = $('sheet-' + tabName);
        if(panel) panel.style.display = 'block';
      });
    });
  }

  // ========== QUICK ACTIONS ==========
  function setupQuickActions(){
    const btns = document.querySelectorAll('.quick-action-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if(!cmd) return;
        const textarea = editor;
        if(!textarea) return;
        
        // Insert command at cursor or at end
        const pos = textarea.selectionStart;
        const before = textarea.value.substring(0, pos);
        const after = textarea.value.substring(pos);
        const indent = before.match(/[ \t]*$/)[0];
        const insertion = (before.length > 0 && !before.endsWith('\n') ? '\n' : '') + indent + cmd + '\n';
        textarea.value = before + insertion + after;
        textarea.selectionStart = textarea.selectionEnd = pos + insertion.length;
        textarea.focus();
      });
    });
  }

  // ========== EVENT LISTENERS ==========
  $('btn-run').addEventListener('click', runGameProgram);
  $('btn-stop').addEventListener('click', stopGameProgram);
  $('btn-pause').addEventListener('click', togglePauseGame);
  $('btn-reset').addEventListener('click', resetGame);
  $('btn-levels').addEventListener('click', ()=>{ renderLevelsGrid(); $('game-levels-modal').classList.add('open'); });
  $('game-close-levels').addEventListener('click', ()=>{ $('game-levels-modal').classList.remove('open'); });
  $('game-win-retry').addEventListener('click', ()=>{ $('game-win-modal').classList.remove('open'); loadLevel(currentLevelIdx); });
  $('game-win-next').addEventListener('click', ()=>{
    $('game-win-modal').classList.remove('open');
    const next = currentLevelIdx+1;
    if(next<LEVELS.length) loadLevel(next);
    else renderLevelsGrid(), $('game-levels-modal').classList.add('open');
  });
  gameSpeed.addEventListener('input', ()=>{
    const inverted = 850 - parseInt(gameSpeed.value, 10);
    gameSpeedLbl.textContent=inverted+'ms';
  });

  // ========== INIT ==========
  setupTabs();
  setupConsoleSheet();
  setupQuickActions();
  loadLevel(currentLevelIdx);
  gameSpeedLbl.textContent = (850 - parseInt(gameSpeed.value,10))+'ms';

  // Expose globals
  window.resetGame = resetGame;
  window.runGameProgram = runGameProgram;
  window.stopGameProgram = stopGameProgram;
  window.renderLevelsGrid = renderLevelsGrid;
  window.openLevelSelector = () => { renderLevelsGrid(); $('game-levels-modal').classList.add('open'); };

})();
