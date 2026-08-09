/**
 * main-programar-mobile.js - Controlador movil para el editor libre DevMe
 */
(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  const editor = $('editor');
  const consoleEl = $('console');
  const errorsEl = $('errors');
  const consoleSheet = $('console-sheet');
  const exampleSelect = $('example-select');

  let abortController = null;
  let isRunning = false;

  // ========== POBLAR EJEMPLOS ==========
  function populateExamples(){
    if(!exampleSelect || typeof EXAMPLES === 'undefined') return;
    exampleSelect.innerHTML = '';
    const keys = Object.keys(EXAMPLES).sort();
    for(const key of keys){
      const opt = document.createElement('option');
      opt.value = key;
      let label = key.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/^\w/, c=>c.toUpperCase());
      opt.textContent = label;
      exampleSelect.appendChild(opt);
    }
    if(EXAMPLES.hola) exampleSelect.value = 'hola';
  }

  // ========== OUTPUT ==========
  function writeOut(text, cls){
    if(!consoleEl) return;
    const span = document.createElement('span');
    span.className = cls || 'out';
    span.textContent = text;
    consoleEl.appendChild(span);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  function writelnOut(text, cls){ writeOut(text + '\n', cls); }
  function clearConsole(){ if(consoleEl) consoleEl.innerHTML = ''; }
  function clearErrors(){ if(errorsEl) errorsEl.innerHTML = ''; }

  function showError(err){
    if(!errorsEl) return;
    const div = document.createElement('div');
    div.className = 'err-line';
    const loc = err.line ? ` (linea ${err.line}${err.col ? ', col '+err.col : ''})` : '';
    div.innerHTML = `<span class="err-phase">[${err.phase||'Ejecucion'}]</span> ${err.message}${loc}`;
    errorsEl.appendChild(div);
  }
  function showOk(msg){
    if(!errorsEl) return;
    const div = document.createElement('div');
    div.className = 'err-line err-ok';
    div.textContent = msg;
    errorsEl.appendChild(div);
  }

  // ========== INPUT ==========
  function waitForInput(prompt){
    return new Promise((resolve, reject) => {
      const abortHandler = () => { reject(new Error('Ejecucion cancelada')); cleanup(); };
      if(abortController) abortController.signal.addEventListener('abort', abortHandler);

      const inputLine = $('input-line');
      const stdinInput = $('stdin');
      const promptEl = $('input-prompt');
      const btnSend = $('btn-send');

      consoleSheet.classList.add('open');
      inputLine.classList.add('visible');
      promptEl.textContent = prompt || 'Entrada:';
      stdinInput.value = '';
      stdinInput.focus();

      const send = () => {
        const val = stdinInput.value;
        writelnOut('> ' + val, 'in');
        inputLine.classList.remove('visible');
        cleanup();
        resolve(val);
      };
      const onKey = (e) => { if(e.key === 'Enter'){ e.preventDefault(); send(); } };
      const cleanup = () => {
        btnSend.removeEventListener('click', send);
        stdinInput.removeEventListener('keydown', onKey);
        if(abortController) abortController.signal.removeEventListener('abort', abortHandler);
      };
      btnSend.addEventListener('click', send);
      stdinInput.addEventListener('keydown', onKey);
    });
  }

  // ========== DIAGRAM ==========
  let diagramData = null;
  let mermaidInitialized = false;

  function initMermaid(){
    if(typeof mermaid !== 'undefined' && !mermaidInitialized){
      mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#dbeafe', primaryTextColor: '#1e3a5f', lineColor: '#64748b', fontSize: '12px' } });
      mermaidInitialized = true;
    }
  }

  async function renderMermaid(mermaidCode){
    if(!mermaidCode) return;
    initMermaid();
    const container = $('diagram-container');
    if(!container) return;
    container.innerHTML = '';
    try {
      const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
      const wrapper = document.createElement('div');
      wrapper.className = 'diagram-wrapper';
      wrapper.innerHTML = svg;
      container.appendChild(wrapper);
    } catch(e){
      console.error('Error al renderizar diagrama:', e);
      container.innerHTML = '<div style="padding:20px;color:#b31d28;">Error al generar el diagrama.</div>';
    }
  }

  // ========== EJECUCION ==========
  async function runProgram(){
    if(isRunning) return;
    clearConsole();
    clearErrors();

    const src = editor ? editor.value : '';
    if(!src.trim()){
      writelnOut('El editor esta vacio.', 'info');
      return;
    }

    const { tokens, errors: lexErrors } = Lexer.tokenize(src);
    if(lexErrors.length){
      lexErrors.forEach(showError);
      return;
    }
    const { ast, errors: parseErrors } = Parser.parse(tokens);
    if(parseErrors.length){
      parseErrors.forEach(showError);
      return;
    }
    const { errors: semErrors } = Semantic.analyze(ast);
    if(semErrors.length){
      semErrors.forEach(showError);
      return;
    }
    showOk('Analisis correcto. Ejecutando...');

    // Generate diagram
    try {
      const mermaidCode = DiagramGenerator.generateDiagram(ast);
      diagramData = mermaidCode;
      await renderMermaid(mermaidCode);
    } catch(e){ console.warn('Error diagrama:', e); }

    const io = {
      write: (t) => writeOut(t),
      writeln: (t) => writelnOut(t),
      read: () => waitForInput('Entrada:'),
      waitKey: () => waitForInput('Presione Enter para continuar...'),
      sleep: (sec) => {
        return new Promise((resolve, reject) => {
          if(abortController && abortController.signal.aborted){ reject(new Error('Ejecucion cancelada')); return; }
          let timer = setTimeout(() => resolve(), sec * 1000);
          const abortHandler = () => { clearTimeout(timer); reject(new Error('Ejecucion cancelada')); };
          if(abortController) abortController.signal.addEventListener('abort', abortHandler);
          const origResolve = resolve;
          resolve = (val) => { if(abortController) abortController.signal.removeEventListener('abort', abortHandler); origResolve(val); };
        });
      },
      clear: () => clearConsole()
    };

    isRunning = true;
    abortController = new AbortController();
    $('btn-run').style.display = 'none';
    $('btn-stop').style.display = 'flex';

    try {
      writelnOut('--- Inicio de ejecucion ---', 'info');
      await Interpreter.run(ast, io, abortController.signal, { stepDelay: 0, stepHighlight: false });
      writelnOut('--- Fin de ejecucion ---', 'info');
    } catch(err){
      if(err.message === 'Ejecucion cancelada') writelnOut('--- Ejecucion cancelada ---', 'info');
      else showError({ phase: err.phase || 'Ejecucion', message: err.message, line: err.line || 0 });
    } finally {
      isRunning = false;
      abortController = null;
      $('btn-run').style.display = 'flex';
      $('btn-stop').style.display = 'none';
    }
  }

  function stopProgram(){
    if(abortController) abortController.abort();
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

    handle.addEventListener('click', () => sheet.classList.toggle('open'));
    if(btnConsole) btnConsole.addEventListener('click', () => sheet.classList.toggle('open'));

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

  // ========== QUICK INSERT ==========
  function setupQuickInsert(){
    const btns = document.querySelectorAll('.quick-insert-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.insert;
        if(!text || !editor) return;
        const pos = editor.selectionStart;
        const before = editor.value.substring(0, pos);
        const after = editor.value.substring(pos);
        const insertion = (before.length > 0 && !before.endsWith('\n') ? '\n' : '') + text + '\n';
        editor.value = before + insertion + after;
        editor.selectionStart = editor.selectionEnd = pos + insertion.length;
        editor.focus();
      });
    });
  }

  // ========== EVENT LISTENERS ==========
  $('btn-run').addEventListener('click', runProgram);
  $('btn-stop').addEventListener('click', stopProgram);
  $('btn-clear').addEventListener('click', () => { clearConsole(); clearErrors(); });
  $('btn-example').addEventListener('click', () => {
    const key = exampleSelect.value;
    if(EXAMPLES[key] && editor){
      editor.value = EXAMPLES[key];
    }
  });

  // ========== INIT ==========
  populateExamples();
  setupTabs();
  setupConsoleSheet();
  setupQuickInsert();

  // Load default example
  if(editor && EXAMPLES && EXAMPLES.hola){
    editor.value = EXAMPLES.hola;
  }

})();
