/**
 * device-detect.js
 * Detecta si el usuario esta en un dispositivo movil y redirige a la version movil.
 * Se incluye en las paginas de PC. Las paginas moviles no lo incluyen.
 */
(function(){
  'use strict';
  
  // Detectar dispositivo movil
  function isMobile(){
    // User agent detection
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    if(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) return true;
    // Touch detection + small screen
    if(('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 900) return true;
    return false;
  }
  
  // Detectar si ya estamos en version movil
  function isAlreadyMobile(){
    return window.location.pathname.indexOf('-mobile') !== -1 || 
           window.location.search.indexOf('mobile=1') !== -1;
  }
  
  // Redirigir a version movil
  if(isMobile() && !isAlreadyMobile()){
    var path = window.location.pathname;
    var search = window.location.search;
    var hash = window.location.hash;
    
    // Determinar la URL movil correspondiente
    var mobilePath = path;
    
    // Landing page
    if(path.endsWith('/') || path.endsWith('/index.html') || path === ''){
      mobilePath = path.replace('index.html', 'index-mobile.html');
      if(mobilePath === path) mobilePath = 'index-mobile.html';
    }
    // Game page: jugar/index.html -> jugar/index-mobile.html
    else if(path.indexOf('jugar/index') !== -1 || (path.indexOf('jugar/') !== -1 && path.endsWith('/'))){
      mobilePath = path.replace('index.html', 'index-mobile.html');
      if(mobilePath === path) mobilePath = path + 'index-mobile.html';
    }
    // Programar page: programar/index.html -> programar/index-mobile.html
    else if(path.indexOf('programar/index') !== -1 || (path.indexOf('programar/') !== -1 && path.endsWith('/'))){
      mobilePath = path.replace('index.html', 'index-mobile.html');
      if(mobilePath === path) mobilePath = path + 'index-mobile.html';
    }
    // Editor page: jugar/editor.html -> jugar/editor-mobile.html
    else if(path.indexOf('editor.html') !== -1){
      mobilePath = path.replace('editor.html', 'editor-mobile.html');
    }
    // MiniJuego
    else if(path.indexOf('MiniJuegoTipodDato') !== -1){
      mobilePath = path.replace('index.html', 'index-mobile.html');
      if(mobilePath === path) mobilePath = path.replace(/\/$/, '') + '/index-mobile.html';
    }
    
    // Redirigir
    window.location.replace(mobilePath + search + hash);
  }
})();
