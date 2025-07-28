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
            h: 34, // Make taller for zombie head
            speed: 5,
            color: '#7ec850' // Zombie green
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
        this.invaderH = 28;
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
                // Assign a "variety" property for different FSM types
                const type = row % 4;
                // 0: classic, 1: meatball-heavy, 2: multi-eye, 3: rainbow
                this.invaders.push({
                    x: 40 + col * (this.invaderW + this.invaderPaddingX),
                    y: this.invaderStartY + row * (this.invaderH + this.invaderPaddingY),
                    w: this.invaderW,
                    h: this.invaderH,
                    alive: true,
                    type: type, // for FSM variety
                    variety: type // alias for clarity
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

        // Draw player as zombie
        this.drawZombie(
            this.player.x,
            this.player.y,
            this.player.w,
            this.player.h
        );

        // Draw player bullets
        this.ctx.fillStyle = '#fff';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Draw FSM invaders
        for (let inv of this.invaders) {
            if (!inv.alive) continue;
            this.drawSpaghettiMonster(inv.x, inv.y, inv.w, inv.h, inv.variety);
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

    // FSM: Flying Spaghetti Monster
    drawSpaghettiMonster(x, y, w, h, variety) {
        const ctx = this.ctx;
        ctx.save();

        // Body - spaghetti base (light yellow ellipse)
        ctx.shadowColor = '#fad96288';
        ctx.shadowBlur = 10 + 3*variety;
        ctx.fillStyle = '#fbeabf';
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2.2, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Noodles: squiggly lines (variety changes color/shape)
        let noodleColors = [
            '#ffe9a5',     // classic yellow
            '#ffe9a5',     // same for meatball-heavy
            '#faf38c',     // more neon for multi-eye
            '#ffe9a5'      // base for rainbow (will be rainbow below)
        ];
        for (let i = 0; i < 6 + variety * 2; i++) {
            ctx.save();
            let angle = (Math.PI * 2 / (6 + variety * 2)) * i + 0.4 * (variety%2);
            let cx = x + w/2 + Math.cos(angle) * (w*0.23 + Math.random()*7);
            let cy = y + h/2 + Math.sin(angle) * (h*0.22 + Math.random()*7);
            ctx.strokeStyle =
                variety === 3
                    ? `hsl(${(i*60)%360},90%,70%)`
                    : noodleColors[variety];
            ctx.lineWidth = 2.6 + 0.8 * (Math.sin(i + Date.now()/600) * 0.5);
            ctx.beginPath();
            ctx.moveTo(x + w/2, y + h/2);
            ctx.bezierCurveTo(
                x + w/2 + Math.cos(angle)*w*0.18,
                y + h/2 + Math.sin(angle)*h*0.18 + Math.sin(Date.now()/300 + i)*4,
                cx - 7, cy + 7,
                cx, cy
            );
            ctx.stroke();
            ctx.restore();
        }

        // Meatballs: position and count varies by variety
        let meatballSets = [
            [ [0, 0] ], // classic - center
            [ [-w*0.14, -h*0.08], [w*0.14, -h*0.09], [0, h*0.07] ], // meatball-heavy (3)
            [ [-w*0.13, -h*0.07], [w*0.13, -h*0.07] ], // multi-eye (2)
            [ [-w*0.14, -h*0.09], [w*0.14, -h*0.09] ], // rainbow (2, higher up)
        ];
        let ballRadii = [w*0.16, w*0.13, w*0.13, w*0.12];
        let mbSet = meatballSets[variety] || meatballSets[0];
        for (let i = 0; i < mbSet.length; i++) {
            ctx.save();
            let [dx, dy] = mbSet[i];
            let cx = x + w/2 + dx;
            let cy = y + h*0.4 + dy;
            ctx.fillStyle = '#9b4e24';
            ctx.shadowColor = '#a2603280';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(cx, cy, ballRadii[variety], 0, 2*Math.PI);
            ctx.fill();

            // Meatball shine
            ctx.beginPath();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = '#fff';
            ctx.arc(cx - ballRadii[variety]*0.3, cy - ballRadii[variety]*0.3, ballRadii[variety]*0.23, 0, 2*Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.restore();

            // Eyes for each meatball (multi-eye variety has multi eyes)
            let eyeCount = (variety === 2) ? 4 : 2;
            if (variety === 1) eyeCount = 1; // meatball-heavy: 1 eye per meatball
            for (let e = 0; e < eyeCount; e++) {
                ctx.save();
                let ex, ey;
                if (eyeCount === 4) {
                    ex = cx + (e % 2 === 0 ? -1 : 1) * ballRadii[variety]*0.28;
                    ey = cy + (e < 2 ? -1 : 1) * ballRadii[variety]*0.18;
                } else if (eyeCount === 2) {
                    ex = cx + (e === 0 ? -1 : 1) * ballRadii[variety]*0.22;
                    ey = cy - ballRadii[variety]*0.06;
                } else {
                    ex = cx;
                    ey = cy - ballRadii[variety]*0.09;
                }
                // Eye white
                ctx.beginPath();
                ctx.fillStyle = '#fff';
                ctx.ellipse(ex, ey, ballRadii[variety]*0.14, ballRadii[variety]*0.17, 0, 0, 2*Math.PI);
                ctx.fill();
                // Pupil
                ctx.beginPath();
                ctx.fillStyle = '#232';
                ctx.ellipse(ex, ey, ballRadii[variety]*0.06, ballRadii[variety]*0.08, 0, 0, 2*Math.PI);
                ctx.fill();

                // Rainbow eyes get colored pupils
                if (variety === 3) {
                    ctx.beginPath();
                    ctx.fillStyle = `hsl(${(i*60+e*40)%360},100%,60%)`;
                    ctx.ellipse(ex, ey, ballRadii[variety]*0.03, ballRadii[variety]*0.04, 0, 0, 2*Math.PI);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Eyestalks: noodle lines from body to meatballs
        for (let i = 0; i < mbSet.length; i++) {
            ctx.save();
            let [dx, dy] = mbSet[i];
            let cx = x + w/2 + dx;
            let cy = y + h*0.4 + dy;
            let stalkColor = (variety === 3)
                ? `hsl(${(i*100)%360},90%,75%)`
                : noodleColors[variety];
            ctx.strokeStyle = stalkColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + w/2, y + h*0.15 + (variety === 1 ? 8 : 0));
            ctx.quadraticCurveTo(
                x + w/2 + dx*0.7,
                y + h*0.23 + dy*0.5 + Math.sin(Date.now()/200 + i)*6,
                cx, cy - ballRadii[variety]*0.7
            );
            ctx.stroke();
            ctx.restore();
        }

        // Mouth: classic smile or "fangs" for variety
        ctx.save();
        ctx.strokeStyle = variety === 2 ? '#c1440e' : '#705118';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        if (variety === 2) {
            // Multi-eye: little jagged mouth
            ctx.moveTo(x + w*0.41, y + h*0.74);
            ctx.lineTo(x + w*0.45, y + h*0.77);
            ctx.lineTo(x + w*0.51, y + h*0.74);
            ctx.lineTo(x + w*0.57, y + h*0.77);
            ctx.lineTo(x + w*0.62, y + h*0.74);
        } else if (variety === 3) {
            // Rainbow: big open mouth
            ctx.arc(x + w/2, y + h*0.7, w*0.10, 0, Math.PI, false);
            ctx.lineWidth = 2.7;
        } else {
            // Classic: arc smile
            ctx.arc(x + w/2, y + h*0.75, w*0.13, 0, Math.PI, false);
        }
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    drawZombie(x, y, w, h) {
        const ctx = this.ctx;
        ctx.save();

        // Head
        ctx.shadowColor = '#7ec85077';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#7ec850';
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2.1, w/2, h/2.1, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Left eye (large, white with red pupil)
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.ellipse(x + w*0.33, y + h*0.42, w*0.13, h*0.11, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#b30000';
        ctx.ellipse(x + w*0.33, y + h*0.42, w*0.05, h*0.05, 0, 0, 2*Math.PI);
        ctx.fill();

        // Right eye (smaller, yellow)
        ctx.beginPath();
        ctx.fillStyle = '#eed600';
        ctx.ellipse(x + w*0.62, y + h*0.44, w*0.10, h*0.08, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#222';
        ctx.ellipse(x + w*0.62, y + h*0.44, w*0.035, h*0.035, 0, 0, 2*Math.PI);
        ctx.fill();

        // Mouth (stitched smile)
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w/2, y + h*0.67, w*0.19, 0, Math.PI, false);
        ctx.stroke();
        // Stitch lines
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            let mx = x + w/2 + Math.sin(Math.PI*(i+2)/5)*w*0.19;
            let my = y + h*0.67 + Math.cos(Math.PI*(i+2)/5)*w*0.19;
            ctx.moveTo(mx, my-4);
            ctx.lineTo(mx, my+4);
            ctx.stroke();
        }
        ctx.restore();

        // Scar (forehead)
        ctx.save();
        ctx.strokeStyle = '#b30000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w*0.6, y + h*0.26);
        ctx.lineTo(x + w*0.72, y + h*0.17);
        ctx.stroke();
        // Scar stitches
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 3; i++) {
            let px = x + w*0.6 + (w*0.04)*i;
            let py = y + h*0.26 - (h*0.03)*i;
            ctx.beginPath();
            ctx.moveTo(px-3, py-2);
            ctx.lineTo(px+3, py+2);
            ctx.stroke();
        }
        ctx.restore();

        // Body (simple shirt rectangle)
        ctx.shadowColor = '#335';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#3a2d1c';
        ctx.fillRect(x + w*0.17, y + h*0.83, w*0.66, h*0.18);

        // Arms (zombie-extended)
        ctx.strokeStyle = '#7ec850';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x + w*0.17, y + h*0.85);
        ctx.lineTo(x + w*0.05, y + h*0.98);
        ctx.moveTo(x + w*0.83, y + h*0.85);
        ctx.lineTo(x + w*0.95, y + h*0.98);
        ctx.stroke();

        // Hands (simple circles)
        ctx.beginPath();
        ctx.arc(x + w*0.05, y + h*0.98, w*0.05, 0, 2*Math.PI);
        ctx.arc(x + w*0.95, y + h*0.98, w*0.05, 0, 2*Math.PI);
        ctx.fillStyle = '#7ec850';
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
    }
}

// ----- INIT -----
function initGame() {
    new SpaceInvadersGame('gameContainer');
}
window.addEventListener('DOMContentLoaded', initGame);