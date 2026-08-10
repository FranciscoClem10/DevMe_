/**
 * touch-utils.js — Touch support for drag-and-drop
 * Adds touch event handlers that simulate HTML5 drag-and-drop behavior
 */
(function(global) {
  'use strict';

  let touchDragData = null;
  let touchDragElement = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let isTouchDragging = false;
  let touchGhost = null;

  const DRAG_THRESHOLD = 10;

  function createGhostElement(text, className) {
    const ghost = document.createElement('div');
    ghost.className = className || 'touch-drag-ghost';
    ghost.textContent = text;
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      opacity: 0.8;
      transform: translate(-50%, -50%) scale(1.05);
      background: #fde68a;
      color: #1c180d;
      padding: 8px 16px;
      border-radius: 8px;
      border: 2px solid #f4c025;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      white-space: nowrap;
    `;
    return ghost;
  }

  function findDropTarget(x, y) {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (el.classList.contains('block-inner-dz') || 
          el.classList.contains('block-row') ||
          el.id === 'block-drop-zone' ||
          el.classList.contains('block-workspace')) {
        return el;
      }
    }
    return null;
  }

  function highlightDropZone(el, highlight, clientY) {
    if (!el) return;
    if (highlight) {
      if (el.classList.contains('block-row')) {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        el.classList.toggle('block-drop-top', clientY < mid);
        el.classList.toggle('block-drop-bot', clientY >= mid);
      } else {
        el.classList.add('block-inner-dz-active');
      }
    } else {
      el.classList.remove('block-inner-dz-active', 'block-drop-top', 'block-drop-bot');
    }
  }

  function simulateDrop(dropTarget, dragData, clientY) {
    if (!dropTarget || !dragData) return;

    // Create a synthetic drop event
    const syntheticEvent = {
      clientX: touchCurrentX,
      clientY: clientY,
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: {
        dropEffect: dragData.source === 'palette' ? 'copy' : 'move'
      }
    };

    // Trigger the drop handler
    if (dropTarget._touchDropHandler) {
      dropTarget._touchDropHandler(dragData, syntheticEvent);
    }
  }

  function handleTouchStart(e) {
    const target = e.target.closest('[data-block-type], [data-block-id]');
    if (!target) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDragElement = target;
    isTouchDragging = false;

    if (target.dataset.blockType) {
      touchDragData = { source: 'palette', type: target.dataset.blockType };
    } else if (target.dataset.blockId) {
      touchDragData = { source: 'workspace', blockId: target.dataset.blockId };
    }
  }

  function handleTouchMove(e) {
    if (!touchDragElement) return;

    touchCurrentX = e.touches[0].clientX;
    touchCurrentY = e.touches[0].clientY;

    const dx = touchCurrentX - touchStartX;
    const dy = touchCurrentY - touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!isTouchDragging && dist > DRAG_THRESHOLD) {
      isTouchDragging = true;
      e.preventDefault();

      // Create ghost element
      const label = touchDragElement.textContent || touchDragData.type || 'Bloque';
      touchGhost = createGhostElement(label.trim().substring(0, 30));
      document.body.appendChild(touchGhost);

      if (touchDragElement.dataset.blockId) {
        touchDragElement.style.opacity = '0.4';
      }
    }

    if (isTouchDragging && touchGhost) {
      touchGhost.style.left = touchCurrentX + 'px';
      touchGhost.style.top = touchCurrentY + 'px';

      // Highlight potential drop zones
      const dropTarget = findDropTarget(touchCurrentX, touchCurrentY);
      document.querySelectorAll('.block-inner-dz-active, .block-drop-top, .block-drop-bot').forEach(el => {
        el.classList.remove('block-inner-dz-active', 'block-drop-top', 'block-drop-bot');
      });
      if (dropTarget) {
        highlightDropZone(dropTarget, true, touchCurrentY);
      }
    }
  }

  function handleTouchEnd(e) {
    if (!touchDragElement) return;

    if (isTouchDragging && touchDragData) {
      const dropTarget = findDropTarget(touchCurrentX, touchCurrentY);
      if (dropTarget) {
        simulateDrop(dropTarget, touchDragData, touchCurrentY);
      }

      // Cleanup
      if (touchGhost) {
        touchGhost.remove();
        touchGhost = null;
      }
      if (touchDragElement.dataset.blockId) {
        touchDragElement.style.opacity = '1';
      }
      document.querySelectorAll('.block-inner-dz-active, .block-drop-top, .block-drop-bot').forEach(el => {
        el.classList.remove('block-inner-dz-active', 'block-drop-top', 'block-drop-bot');
      });
    }

    touchDragElement = null;
    touchDragData = null;
    isTouchDragging = false;
  }

  function initTouchDrag() {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  // Export to global scope
  global.TouchDragUtils = {
    init: initTouchDrag,
    simulateDrop: simulateDrop,
    getDragData: () => touchDragData
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTouchDrag);
  } else {
    initTouchDrag();
  }

})(window);
