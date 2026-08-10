class InputManager {
    constructor(canvas) {
        this.keys = {};
        this.mouse = { x: 0, y: 0, isPressed: false };
        this.wheelDelta = 0;
        this.numberKeys = {};
        this.canvas = canvas;

        this.joystickActive = false;
        this.joystickVec = { x: 0, y: 0 };
        this.joystickTouchId = null;

        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        window.addEventListener('keydown', e => this.setKey(e, true));
        window.addEventListener('keyup', e => this.setKey(e, false));

        window.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
        });

        window.addEventListener('mousedown', () => {
            this.mouse.isPressed = true;
        });
        window.addEventListener('mouseup', () => {
            this.mouse.isPressed = false;
        });

        window.addEventListener('wheel', e => {
            this.wheelDelta = e.deltaY;
            e.preventDefault();
        }, { passive: false });

        this.setupTouchControls();
    }

    setupTouchControls() {
        const joystickZone = document.getElementById('joystick-zone');
        const joystickThumb = document.getElementById('joystick-thumb');
        const joystickBase = document.getElementById('joystick-base');
        const fireZone = document.getElementById('fire-zone');
        const pauseBtn = document.getElementById('pause-btn');
        const weaponBtns = document.querySelectorAll('.weapon-btn');

        if (joystickZone) {
            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.joystickTouchId = touch.identifier;
                this.joystickActive = true;
                this.updateJoystick(touch, joystickZone, joystickThumb);
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.joystickTouchId) {
                        this.updateJoystick(e.changedTouches[i], joystickZone, joystickThumb);
                    }
                }
            }, { passive: false });

            joystickZone.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.joystickTouchId) {
                        this.joystickActive = false;
                        this.joystickTouchId = null;
                        this.joystickVec = { x: 0, y: 0 };
                        joystickThumb.style.left = '40px';
                        joystickThumb.style.top = '40px';
                    }
                }
            }, { passive: false });

            joystickZone.addEventListener('touchcancel', (e) => {
                this.joystickActive = false;
                this.joystickTouchId = null;
                this.joystickVec = { x: 0, y: 0 };
                joystickThumb.style.left = '40px';
                joystickThumb.style.top = '40px';
            });
        }

        if (fireZone) {
            fireZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                this.mouse.x = (touch.clientX - rect.left) * scaleX;
                this.mouse.y = (touch.clientY - rect.top) * scaleY;
                this.mouse.isPressed = true;
            }, { passive: false });

            fireZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                this.mouse.x = (touch.clientX - rect.left) * scaleX;
                this.mouse.y = (touch.clientY - rect.top) * scaleY;
            }, { passive: false });

            fireZone.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.mouse.isPressed = false;
            }, { passive: false });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['ESC'] = true;
            }, { passive: false });
            pauseBtn.addEventListener('click', (e) => {
                this.keys['ESC'] = true;
            });
        }

        weaponBtns.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const idx = btn.getAttribute('data-weapon');
                if (idx !== null) {
                    this.numberKeys[String(parseInt(idx) + 1)] = true;
                }
            }, { passive: false });
        });

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('touchstart', (e) => {
                if (this.isTouchDevice) {
                    this.keys['SPACE'] = true;
                    setTimeout(() => { this.keys['SPACE'] = false; }, 50);
                }
            }, { passive: true });
        }
    }

    updateJoystick(touch, zone, thumb) {
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDist = 45;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
            dist = maxDist;
        }

        thumb.style.left = (40 + dx) + 'px';
        thumb.style.top = (40 + dy) + 'px';

        const deadzone = 10;
        this.joystickVec.x = dist > deadzone ? dx / maxDist : 0;
        this.joystickVec.y = dist > deadzone ? dy / maxDist : 0;
    }

    setKey(e, isPressed) {
        let key = e.key.toUpperCase();
        if (e.key === ' ') key = 'SPACE';
        if (e.key === 'Escape') key = 'ESC';
        if (e.key === 'Shift') key = 'SHIFT';
        this.keys[key] = isPressed;

        if (['1', '2', '3', '4'].includes(e.key)) {
            if (isPressed) this.numberKeys[e.key] = true;
        }

        if (['SPACE', 'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(key)) {
            e.preventDefault();
        }
    }

    isPressed(key) {
        const k = key.toUpperCase();
        if (this.joystickActive) {
            const deadzone = 0.3;
            if (k === 'W' && this.joystickVec.y < -deadzone) return true;
            if (k === 'S' && this.joystickVec.y > deadzone) return true;
            if (k === 'A' && this.joystickVec.x < -deadzone) return true;
            if (k === 'D' && this.joystickVec.x > deadzone) return true;
            if (k === 'ARROWUP' && this.joystickVec.y < -deadzone) return true;
            if (k === 'ARROWDOWN' && this.joystickVec.y > deadzone) return true;
            if (k === 'ARROWLEFT' && this.joystickVec.x < -deadzone) return true;
            if (k === 'ARROWRIGHT' && this.joystickVec.x > deadzone) return true;
        }
        return !!this.keys[k];
    }

    consumeNumberKey(n) {
        if (this.numberKeys[String(n)]) {
            this.numberKeys[String(n)] = false;
            return true;
        }
        return false;
    }
}
