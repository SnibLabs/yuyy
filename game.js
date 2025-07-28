class SpaceInvadersGame {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = 480;
        this.height = 640;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Game state
        this.state = 'menu'; // 'menu', 'playing', 'gameover', 'win'

        // Player
        this.player = {
            x: this.width / 2 - 20,
            y: this.height - 60,
            w: 40,
            h: 18,
            speed: 5,
            color: '#0ff'
        };

        // Bullets
        this.bullets = [];
        this.bulletSpeed = 8;
        this.bulletCooldown = 0;

        // Invaders
        this.invaders = [];
        this.invaderRows = 4;
        this.invaderCols = 8;
        this.invaderW = 34;
        this.invaderH = 20;
        this.invaderPaddingX = 18;
        this.invaderPaddingY = 18;
        this.invaderStartY = 60;
        this.invaderSpeedX = 1.1;
        this.invaderDir = 1; // 1:right, -1:left
        this.invaderDownStep = 22;
        this.invaderFireChance = 0.002; // per frame, per invader

        // Invader Bullets
        this.invaderBullets = [];
        this.invaderBulletSpeed = 4;

        // Controls
        this.leftPressed = false;
        this.rightPressed = false;
        this.spacePressed = false;

        // Score & lives
        this.score = 0;
        this.lives = 3;

        // Timing
        this.lastTime = 0;

        // Bindings
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMenuClick = this.handleMenuClick.bind(this);

        // Show menu immediately
        this.showMenu();

        // Input listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Start first render for menu (shows canvas right away)
        this.render();
    }

    showMenu() {
        this.state = 'menu';
        this.clearMenus();

        this.menuDiv = document.createElement('div');
        this.menuDiv.className = 'menu';
        this.menuDiv.innerHTML = `<h1>SPACE INVADERS</h1>
            <p>Move: &#8592; &#8594; &nbsp; &nbsp; Shoot: Space</p>
            <button id="startGameBtn">Start Game</button>`;
        document.body.appendChild(this.menuDiv);

        document.getElementById('startGameBtn').addEventListener('click', this.handleMenuClick);
    }

    handleMenuClick() {
        this.clearMenus();
        this.resetGame();
        this.state = 'playing';
        this.render();
    }

    showGameOver(win = false) {
        this.state = win ? 'win' : 'gameover';
        this.clearMenus();

        this.menuDiv = document.createElement('div');
        this.menuDiv.className = 'menu';
        this.menuDiv.innerHTML = `<h1>${win ? 'YOU WIN!' : 'GAME OVER'}</h1>
            <p>Score: ${this.score}</p>
            <button id="restartBtn">Restart</button>`;
        document.body.appendChild(this.menuDiv);

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.clearMenus();
            this.resetGame();
            this.state = 'playing';
            this.render();
        });
    }

    clearMenus() {
        const menus = document.querySelectorAll('.menu');
        menus.forEach((div) => div.parentNode.removeChild(div));
    }

    resetGame() {
        // Player
        this.player.x = this.width / 2 - 20;
        this.lives = 3;
        this.score = 0;

        // Bullets
        this.bullets = [];
        this.bulletCooldown = 0;

        // Invaders
        this.invaders = [];
        for (let row = 0; row < this.invaderRows; row++) {
            for (let col = 0; col < this.invaderCols; col++) {
                this.invaders.push({
                    x: 40 + col * (this.invaderW + this.invaderPaddingX),
                    y: this.invaderStartY + row * (this.invaderH + this.invaderPaddingY),
                    w: this.invaderW,
                    h: this.invaderH,
                    alive: true,
                    type: row // for color
                });
            }
        }
        this.invaderDir = 1;
        this.invaderSpeedX = 1.1;
        this.invaderBullets = [];
    }

    handleKeyDown(e) {
        if (this.state !== 'playing') return;
        if (e.code === 'ArrowLeft') this.leftPressed = true;
        if (e.code === 'ArrowRight') this.rightPressed = true;
        if (e.code === 'Space') this.spacePressed = true;
    }

    handleKeyUp(e) {
        if (this.state !== 'playing') return;
        if (e.code === 'ArrowLeft') this.leftPressed = false;
        if (e.code === 'ArrowRight') this.rightPressed = false;
        if (e.code === 'Space') this.spacePressed = false;
    }

    render(now = 0) {
        // Animation loop, but also renders menu immediately
        if (this.state === 'playing') {
            const dt = Math.min((now - this.lastTime) / 16.67, 2) || 1; // For consistent movement
            this.update(dt);
        }
        this.draw();

        // Continue rendering if not in menu or gameover
        if (this.state === 'playing') {
            this.lastTime = now;
            requestAnimationFrame((t) => this.render(t));
        }
    }

    update(dt) {
        // Player movement
        if (this.leftPressed) {
            this.player.x -= this.player.speed * dt;
            if (this.player.x < 0) this.player.x = 0;
        }
        if (this.rightPressed) {
            this.player.x += this.player.speed * dt;
            if (this.player.x + this.player.w > this.width)
                this.player.x = this.width - this.player.w;
        }

        // Player shooting
        if (this.spacePressed && this.bulletCooldown <= 0) {
            this.bullets.push({
                x: this.player.x + this.player.w / 2 - 2,
                y: this.player.y - 8,
                w: 4,
                h: 12
            });
            this.bulletCooldown = 14;
        }
        if (this.bulletCooldown > 0) this.bulletCooldown -= dt;

        // Update bullets
        this.bullets.forEach(b => { b.y -= this.bulletSpeed * dt; });
        // Remove off-screen
        this.bullets = this.bullets.filter(b => b.y + b.h > 0);

        // Invader movement
        let hitEdge = false;
        let leftMost = this.width, rightMost = 0;
        this.invaders.forEach(inv => {
            if (!inv.alive) return;
            inv.x += this.invaderSpeedX * this.invaderDir * dt;
            if (inv.x < leftMost) leftMost = inv.x;
            if (inv.x + inv.w > rightMost) rightMost = inv.x + inv.w;
        });
        if (leftMost < 6 || rightMost > this.width - 6) {
            hitEdge = true;
        }
        if (hitEdge) {
            this.invaderDir *= -1;
            this.invaders.forEach(inv => {
                if (inv.alive) inv.y += this.invaderDownStep;
            });
            this.invaderSpeedX *= 1.05; // Speed up
        }

        // Invader shooting
        this.invaders.forEach(inv => {
            if (!inv.alive) return;
            // Only bottom invaders in their column can shoot
            let isLowest = true;
            for (let other of this.invaders) {
                if (
                    other !== inv &&
                    other.alive &&
                    other.x === inv.x &&
                    other.y > inv.y
                ) {
                    isLowest = false;
                    break;
                }
            }
            if (isLowest && Math.random() < this.invaderFireChance) {
                this.invaderBullets.push({
                    x: inv.x + inv.w / 2 - 2,
                    y: inv.y + inv.h,
                    w: 4,
                    h: 12
                });
            }
        });

        // Update invader bullets
        this.invaderBullets.forEach(b => { b.y += this.invaderBulletSpeed * dt; });
        this.invaderBullets = this.invaderBullets.filter(b => b.y < this.height + 16);

        // Collisions: bullet hits invader
        for (let bullet of this.bullets) {
            for (let inv of this.invaders) {
                if (!inv.alive) continue;
                if (
                    bullet.x < inv.x + inv.w &&
                    bullet.x + bullet.w > inv.x &&
                    bullet.y < inv.y + inv.h &&
                    bullet.y + bullet.h > inv.y
                ) {
                    inv.alive = false;
                    bullet.y = -1000; // Remove bullet
                    this.score += 20;
                }
            }
        }
        this.invaders = this.invaders; // Keep reference

        // Collisions: invader bullet hits player
        for (let b of this.invaderBullets) {
            if (
                b.x < this.player.x + this.player.w &&
                b.x + b.w > this.player.x &&
                b.y < this.player.y + this.player.h &&
                b.y + b.h > this.player.y
            ) {
                this.lives--;
                b.y = this.height + 100; // Remove bullet
                if (this.lives <= 0) {
                    this.showGameOver(false);
                    return;
                }
            }
        }

        // Invader reaches player line
        for (let inv of this.invaders) {
            if (inv.alive && inv.y + inv.h >= this.player.y) {
                this.lives = 0;
                this.showGameOver(false);
                return;
            }
        }

        // Win condition
        if (this.invaders.every(inv => !inv.alive)) {
            this.showGameOver(true);
            return;
        }
    }

    draw() {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw stars (background)
        for (let i = 0; i < 50; i++) {
            this.ctx.globalAlpha = 0.14;
            this.ctx.fillStyle = ['#fff', '#0ff', '#0af'][i % 3];
            let x = ((i * 97) % this.width) + ((i * 13) % 13);
            let y = ((i * 151) % this.height) + ((i * 7) % 7);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 1 + (i % 2), 0, 2 * Math.PI);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;

        // Draw player
        this.ctx.save();
        this.ctx.fillStyle = this.player.color;
        this.ctx.shadowColor = '#0ff8';
        this.ctx.shadowBlur = 12;
        // Body
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
        // Dome
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.w/2, this.player.y, this.player.w/3, Math.PI, 2*Math.PI);
        this.ctx.fill();
        this.ctx.restore();

        // Draw player bullets
        this.ctx.fillStyle = '#fff';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Draw invaders
        for (let inv of this.invaders) {
            if (!inv.alive) continue;
            this.ctx.save();
            this.ctx.shadowColor = ['#ff0','#0f0','#f0f','#f00'][inv.type%4] + '9';
            this.ctx.shadowBlur = 8;
            this.ctx.fillStyle = ['#ff0','#0f0','#f0f','#f44'][inv.type%4];
            // Invader body
            this.ctx.fillRect(inv.x, inv.y, inv.w, inv.h/2);
            // Invader legs
            this.ctx.fillRect(inv.x+4, inv.y+inv.h/2, inv.w-8, inv.h/2-5);
            // Invader eyes
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(inv.x+6, inv.y+5, 6, 4);
            this.ctx.fillRect(inv.x+inv.w-12, inv.y+5, 6, 4);
            this.ctx.restore();
        }

        // Draw invader bullets
        this.ctx.fillStyle = '#ff0';
        this.invaderBullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Draw UI
        this.ctx.save();
        this.ctx.font = 'bold 18px Courier New, monospace';
        this.ctx.fillStyle = '#0ff';
        this.ctx.shadowColor = '#0ff';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText('SCORE: ' + this.score, 14, 28);
        this.ctx.fillText('LIVES: ' + this.lives, this.width - 120, 28);
        this.ctx.restore();
    }
}

// ----- INIT -----
function initGame() {
    new SpaceInvadersGame('gameContainer');
}
window.addEventListener('DOMContentLoaded', initGame);