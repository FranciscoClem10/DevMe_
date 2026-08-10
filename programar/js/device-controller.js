// Device Controller - Detects mobile vs desktop and applies appropriate behavior
(function() {
    'use strict';
    
    // Detect if device is mobile
    function isMobileDevice() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        return (isMobileUA && isTouchDevice) || (isSmallScreen && isTouchDevice);
    }
    
    // Set global flag
    window.DEVME_IS_MOBILE = isMobileDevice();
    
    // Apply mobile-specific adjustments on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyMobileAdjustments);
    } else {
        applyMobileAdjustments();
    }
    
    function applyMobileAdjustments() {
        if (!window.DEVME_IS_MOBILE) return;
        
        // Add mobile class to body for CSS targeting
        document.body.classList.add('devme-mobile');
        
        // Adjust console panel for mobile
        adjustConsoleForMobile();
        
        // Adjust sidebar for mobile
        adjustSidebarForMobile();
        
        // Adjust tabs for mobile
        adjustTabsForMobile();
        
        // Add touch event handlers
        addTouchHandlers();
    }
    
    function adjustConsoleForMobile() {
        const consolePanel = document.getElementById('console-panel');
        if (!consolePanel) return;
        
        // Make console collapsible on mobile
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'console-toggle-mobile';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">expand_more</span>';
        toggleBtn.style.cssText = 'position:absolute;top:-28px;right:8px;width:28px;height:28px;background:#f4c025;border:1px solid #e8e2ce;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:60;box-shadow:0 2px 6px rgba(0,0,0,0.15);';
        
        const consoleContainer = consolePanel.parentElement;
        if (consoleContainer) {
            consoleContainer.style.position = 'relative';
            consoleContainer.insertBefore(toggleBtn, consolePanel);
        }
        
        let isCollapsed = false;
        toggleBtn.addEventListener('click', function() {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                consolePanel.style.height = '40px';
                consolePanel.style.overflow = 'hidden';
                toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">expand_less</span>';
            } else {
                consolePanel.style.height = '200px';
                consolePanel.style.overflow = '';
                toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">expand_more</span>';
            }
        });
    }
    
    function adjustSidebarForMobile() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebar-toggle-mobile';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">menu</span>';
        toggleBtn.style.cssText = 'position:fixed;top:8px;left:8px;width:40px;height:40px;background:#f4c025;border:1px solid #e8e2ce;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        
        document.body.insertBefore(toggleBtn, document.body.firstChild);
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop-mobile';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:998;display:none;';
        document.body.insertBefore(backdrop, document.body.firstChild);
        
        // Sidebar styles for mobile
        sidebar.style.cssText += ';position:fixed;left:-280px;top:0;bottom:0;width:280px;z-index:999;transition:left 0.3s ease;overflow-y:auto;';
        
        let isOpen = false;
        toggleBtn.addEventListener('click', function() {
            isOpen = !isOpen;
            if (isOpen) {
                sidebar.style.left = '0';
                backdrop.style.display = 'block';
                toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">close</span>';
            } else {
                sidebar.style.left = '-280px';
                backdrop.style.display = 'none';
                toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">menu</span>';
            }
        });
        
        backdrop.addEventListener('click', function() {
            isOpen = false;
            sidebar.style.left = '-280px';
            backdrop.style.display = 'none';
            toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">menu</span>';
        });
    }
    
    function adjustTabsForMobile() {
        const tabsBar = document.querySelector('.main-tabs-bar');
        if (!tabsBar) return;
        
        // Make tabs scrollable horizontally
        tabsBar.style.cssText += ';overflow-x:auto;overflow-y:hidden;white-space:nowrap;-webkit-overflow-scrolling:touch;';
        
        // Hide scrollbar but keep functionality
        tabsBar.style.scrollbarWidth = 'none';
        tabsBar.style.msOverflowStyle = 'none';
        const style = document.createElement('style');
        style.textContent = '.main-tabs-bar::-webkit-scrollbar { display: none; }';
        document.head.appendChild(style);
    }
    
    function addTouchHandlers() {
        // Prevent zoom on double-tap for buttons
        document.addEventListener('touchstart', function(e) {
            if (e.target.closest('button, .btn, .tab, .palette-item')) {
                // Allow normal touch behavior
            }
        }, { passive: true });
        
        // Add touch feedback to buttons
        const buttons = document.querySelectorAll('button, .btn, .palette-item, .block-item');
        buttons.forEach(function(btn) {
            btn.addEventListener('touchstart', function() {
                this.style.opacity = '0.7';
            }, { passive: true });
            btn.addEventListener('touchend', function() {
                this.style.opacity = '';
            }, { passive: true });
        });
    }
    
    // Update mobile flag on resize (for orientation changes)
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            window.DEVME_IS_MOBILE = isMobileDevice();
            if (window.DEVME_IS_MOBILE) {
                document.body.classList.add('devme-mobile');
            } else {
                document.body.classList.remove('devme-mobile');
            }
        }, 250);
    });
    
})();
