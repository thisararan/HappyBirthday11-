/* =========================================================
   CELEBRATION ENGINE: Confetti, Fireworks, Balloons & Candles
   ========================================================= */

class CelebrationEngine {
    constructor() {
        this.confettiCanvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.balloonContainer = null;
        this.isRunning = false;
        this.colors = ['#ff3366', '#ff9933', '#ffff33', '#33cc33', '#3399ff', '#cc33ff', '#ff66cc', '#ffd700', '#00f5d4'];
    }

    init(canvasId, balloonContainerId) {
        this.confettiCanvas = document.getElementById(canvasId);
        if (this.confettiCanvas) {
            this.ctx = this.confettiCanvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        this.balloonContainer = document.getElementById(balloonContainerId);
    }

    resizeCanvas() {
        if (!this.confettiCanvas) return;
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
    }

    // Spawn massive confetti burst (e.g., when unboxing gift)
    burstConfetti(originX = window.innerWidth / 2, originY = window.innerHeight / 2, count = 120) {
        if (!this.confettiCanvas) return;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 12;
            const size = 6 + Math.random() * 8;
            const shape = Math.random() > 0.3 ? 'rect' : 'circle';

            this.particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // Initial upward pop
                size: size,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                shape: shape,
                alpha: 1,
                decay: 0.005 + Math.random() * 0.008,
                gravity: 0.18 + Math.random() * 0.12,
                friction: 0.98
            });
        }

        if (!this.isRunning) {
            this.startLoop();
        }
    }

    // Continuous gentle falling confetti shower
    startShower() {
        if (this.showerInterval) clearInterval(this.showerInterval);
        this.showerInterval = setInterval(() => {
            if (!this.isRunning && this.particles.length === 0) return;
            if (this.particles.length < 180) {
                this.particles.push({
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + Math.random() * 3.5,
                    size: 6 + Math.random() * 6,
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 8,
                    shape: Math.random() > 0.4 ? 'rect' : 'circle',
                    alpha: 1,
                    decay: 0.002,
                    gravity: 0.04,
                    friction: 0.99
                });
            }
        }, 150);
    }

    stopShower() {
        if (this.showerInterval) {
            clearInterval(this.showerInterval);
            this.showerInterval = null;
        }
    }

    startLoop() {
        this.isRunning = true;
        const render = () => {
            if (!this.ctx || !this.confettiCanvas) return;
            this.ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];

                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.friction;
                p.rotation += p.rotationSpeed;
                p.alpha -= p.decay;

                if (p.alpha <= 0 || p.y > window.innerHeight + 50) {
                    this.particles.splice(i, 1);
                    continue;
                }

                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, p.alpha);
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate((p.rotation * Math.PI) / 180);
                this.ctx.fillStyle = p.color;

                if (p.shape === 'rect') {
                    this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.restore();
            }

            if (this.particles.length > 0 || this.showerInterval) {
                this.animationId = requestAnimationFrame(render);
            } else {
                this.isRunning = false;
            }
        };

        this.animationId = requestAnimationFrame(render);
    }

    // Launch colorful floating balloons in background
    spawnBalloons(count = 14) {
        if (!this.balloonContainer) return;
        this.balloonContainer.innerHTML = '';

        const balloonColors = [
            'linear-gradient(135deg, #ff4081, #e91e63)',
            'linear-gradient(135deg, #7c4dff, #651fff)',
            'linear-gradient(135deg, #00e5ff, #00b0ff)',
            'linear-gradient(135deg, #ffd700, #ff9100)',
            'linear-gradient(135deg, #00e676, #00c853)',
            'linear-gradient(135deg, #ff5252, #ff1744)'
        ];

        for (let i = 0; i < count; i++) {
            const balloon = document.createElement('div');
            balloon.className = 'floating-balloon';
            
            const left = Math.random() * 92 + 4; // 4% to 96%
            const duration = 9 + Math.random() * 8; // 9s to 17s
            const delay = Math.random() * 6;
            const size = 38 + Math.random() * 24; // 38px to 62px
            const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];

            balloon.style.left = `${left}vw`;
            balloon.style.width = `${size}px`;
            balloon.style.height = `${size * 1.25}px`;
            balloon.style.background = color;
            balloon.style.animationDuration = `${duration}s`;
            balloon.style.animationDelay = `${delay}s`;

            // Click or tap to pop balloon!
            balloon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.birthdayAudio) window.birthdayAudio.playPartyPopper();
                this.burstConfetti(e.clientX, e.clientY, 35);
                balloon.classList.add('balloon-pop');
                setTimeout(() => balloon.remove(), 250);
            });

            this.balloonContainer.appendChild(balloon);
        }
    }

    // Reset everything
    clear() {
        this.stopShower();
        this.particles = [];
        if (this.ctx && this.confettiCanvas) {
            this.ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
        if (this.balloonContainer) {
            this.balloonContainer.innerHTML = '';
        }
    }
}

window.celebrationEngine = new CelebrationEngine();
