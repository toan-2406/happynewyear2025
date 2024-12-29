class SnakeSprites {
    constructor(size = 64) { // size có thể là 32 hoặc 64
        this.size = size;
        this.sprites = {};
        this.animations = {};
        this.particles = [];
        
        // Khởi tạo particles hoa mai/đào rơi
        this.initTetParticles();
        
        this.loadSprites();
    }

    initTetParticles() {
        // Tạo 50 hoa mai/đào rơi
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: 0.5 + Math.random() * 1,
                angle: Math.random() * Math.PI * 2,
                rotation: Math.random() * Math.PI * 2,
                color: Math.random() < 0.5 ? '#ffd700' : '#ff69b4' // Vàng hoặc hồng
            });
        }
    }

    loadSprites() {
        // Load snake sprites với theme Tết
        this.sprites.snakeHead = {
            green: this.loadImage(`snake_tet_head_green_${this.size}.png`),
            gold: this.loadImage(`snake_tet_head_gold_${this.size}.png`)
        };

        this.sprites.snakeBody = {
            green: this.loadImage(`snake_tet_body_green_${this.size}.png`),
            gold: this.loadImage(`snake_tet_body_gold_${this.size}.png`)
        };

        // Load vật phẩm Tết
        this.sprites.tetItems = {
            banh_chung: this.loadImage(`banh_chung_${this.size}.png`),
            hoa_dao: this.loadImage(`hoa_dao_${this.size}.png`),
            hoa_mai: this.loadImage(`hoa_mai_${this.size}.png`),
            li_xi: this.loadImage(`li_xi_${this.size}.png`),
            mut_tet: this.loadImage(`mut_tet_${this.size}.png`),
            phao: this.loadImage(`phao_${this.size}.png`)
        };
    }

    loadImage(filename) {
        const img = new Image();
        img.src = `assets/snakesprites/${filename}`;
        return img;
    }

    // Xoay sprite theo hướng
    rotateSprite(ctx, sprite, x, y, angle) {
        ctx.save();
        ctx.translate(x + this.size/2, y + this.size/2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.drawImage(sprite, -this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }

    // Tạo hiệu ứng particle
    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + this.size/2,
                y: y + this.size/2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 5 + 2,
                color: color,
                life: 1.0
            });
        }
    }

    // Cập nhật và vẽ particles
    updateParticles(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.type === 'firework') {
                // Xử lý particle pháo hoa
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Trọng lực
                p.life -= 0.02;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Xử lý particle thông thường
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // Animation cho vật phẩm Tết
    animateCollectible(ctx, type, x, y, frame) {
        const sprite = this.sprites.tetItems[type];
        const bounce = Math.sin(frame * 0.1) * 3;
        
        // Thêm hiệu ứng lấp lánh cho lì xì
        if (type === 'li_xi') {
            const glowIntensity = Math.abs(Math.sin(frame * 0.05));
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 10 * glowIntensity;
        }
        
        ctx.drawImage(sprite, x, y + bounce, this.size, this.size);
        ctx.shadowBlur = 0; // Reset shadow
    }

    // Vẽ đầu rắn với hướng và góc tùy chỉnh
    drawSnakeHead(ctx, x, y, direction, color = 'green', customAngle = null) {
        const angles = {
            'up': -90,
            'right': 0,
            'down': 90,
            'left': 180
        };
        
        // Sử dụng góc tùy chỉnh nếu có, ngược lại sử dụng góc mặc định theo hướng
        const angle = customAngle !== null ? customAngle : angles[direction];
        
        // Chỉ vẽ đầu, bỏ phần vẽ mắt vì không có sprite mắt
        this.rotateSprite(ctx, this.sprites.snakeHead[color], x, y, angle);
    }

    // Vẽ phần thân rắn
    drawSnakeBody(ctx, x, y, color = 'green') {
        ctx.drawImage(this.sprites.snakeBody[color], x, y, this.size, this.size);
    }

    // Hiệu ứng khi ăn vật phẩm
    collectItem(ctx, type, x, y) {
        const colors = {
            banh_chung: '#45a049',
            hoa_dao: '#ff69b4',
            hoa_mai: '#ffd700',
            li_xi: '#ff0000',
            mut_tet: '#ffa500',
            phao: '#ff4444'
        };

        // Tạo nhiều particle hơn cho lì xì
        const particleCount = type === 'li_xi' ? 30 : 15;
        this.createParticles(x, y, colors[type], particleCount);

        // Thêm hiệu ứng đặc biệt cho pháo
        if (type === 'phao') {
            this.createFireworks(ctx, x, y);
        }
    }

    // Hiệu ứng pháo hoa
    createFireworks(ctx, x, y) {
        const colors = ['#ff0000', '#ffd700', '#ff69b4', '#4CAF50', '#ff4444'];
        
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = 2 + Math.random() * 3;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push({
                x: x + this.size/2,
                y: y + this.size/2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                color: color,
                life: 1.0,
                type: 'firework'
            });
        }
    }
} 