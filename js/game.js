class SnakeGame {
    constructor(canvasId) {
        this._godMode = false;
        this._isDebugBuild = false;

        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.sprites = new SnakeSprites(64);
        this.frameCount = 0;
        
        // Khởi tạo particles cho hiệu ứng Tết
        this.particles = [];
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 0.5 + Math.random() * 1,
                angle: Math.random() * Math.PI * 2,
                rotation: Math.random() * Math.PI * 2,
                color: Math.random() < 0.5 ? '#ffd700' : '#ff69b4'
            });
        }
        
        // Các cấp độ với tên theo chủ đề Tết
        this.levels = {
            'Mùng Một': { speed: 5, foodScore: 10, bombFrequency: 0.1 },
            'Mùng Hai': { speed: 7, foodScore: 15, bombFrequency: 0.2 },
            'Mùng Ba': { speed: 9, foodScore: 20, bombFrequency: 0.3 }
        };

        // Vật phẩm Tết
        this.tetItems = {
            banh_chung: { score: 20, color: '#45a049' },
            hoa_dao: { score: 15, color: '#ff69b4' },
            hoa_mai: { score: 15, color: '#ffd700' },
            li_xi: { score: 30, color: '#ff0000' },
            mut_tet: { score: 10, color: '#ffa500' },
            phao: { score: -50, color: '#ff4444' }
        };
        
        this.currentLevel = 'Mùng Một';
        this.levelUpScore = 100;
        
        // Theme màu sắc Tết
        this.theme = {
            background: '#fff7e6', // Màu nền nhẹ nhàng
            border: '#ff4d4d',     // Viền đỏ
            text: '#d4380d',       // Chữ đỏ đậm
            score: '#389e0d'       // Điểm màu xanh lá
        };
        
        // Khởi tạo rắn với màu sắc Tết
        this.snake = {
            body: [
                {
                    x: 320, y: 320,
                    renderX: 320, renderY: 320
                },
                {
                    x: 256, y: 320,  // Thêm một phần thân phía sau head
                    renderX: 256, renderY: 320
                }
            ],
            direction: 'right',
            color: this.getRandomTetColor(),
            lastDirection: 'right',
            moveProgress: 0
        };
        
        this.food = this.generateFood();
        this.score = 0;
        this.gameOver = false;
        
        // Thêm touch controls cho mobile
        this.touchStart = null;
        this.setupTouchControls();
        
        // Thêm virtual joystick cho mobile
        this.setupVirtualJoystick();
        
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.lastTime = 0;
        this.fps = 120; // Tăng FPS cho animation mượt mà
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // Cập nhật điểm yêu cầu cho từng level
        this.levelScores = {
            'Mùng Một': 100,
            'Mùng Hai': 120,
            'Mùng Ba': 150
        };
        
        // Thêm biến để kiểm tra chiến thắng
        this.hasWon = false;
        
        // Thêm biến để lưu lời chúc ngẫu nhiên
        this.currentWish = null;
        
        // Tải dữ liệu lời chúc và chọn một câu ngẫu nhiên
        fetch('assets/wishes_2025.json')
            .then(response => response.json())
            .then(data => {
                const randomIndex = Math.floor(Math.random() * data.wishes.length);
                this.currentWish = data.wishes[randomIndex].content;
            })
            .catch(error => console.error('Error loading wishes:', error));
        
        // Thêm buffer cho input điều khiển
        this.inputBuffer = [];
        this.lastInputTime = 0;
        this.inputDelay = 30; // Giảm từ 50ms xuống 30ms
        this.maxBufferSize = 3; // Tăng buffer size để lưu nhiều input hơn
    }
    
    setupTouchControls() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.touchStart) return;

            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };

            const dx = touchEnd.x - this.touchStart.x;
            const dy = touchEnd.y - this.touchStart.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (dx > 0) this.changeDirection('right');
                else this.changeDirection('left');
            } else {
                // Vertical swipe
                if (dy > 0) this.changeDirection('down');
                else this.changeDirection('up');
            }

            this.touchStart = null;
        });
    }

    setupVirtualJoystick() {
        // Chỉ hiện joystick trên mobile
        if (!/Mobi|Android/i.test(navigator.userAgent)) return;

        const joystick = document.createElement('div');
        joystick.id = 'joystick';
        joystick.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            touch-action: none;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const stick = document.createElement('div');
        stick.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            position: absolute;
        `;

        joystick.appendChild(stick);
        document.body.appendChild(joystick);

        let active = false;
        let currentPos = { x: 0, y: 0 };

        const handleJoystick = (e) => {
            const touch = e.touches[0];
            const rect = joystick.getBoundingClientRect();
            const x = touch.clientX - rect.left - rect.width / 2;
            const y = touch.clientY - rect.top - rect.height / 2;
            const angle = Math.atan2(y, x);
            const distance = Math.min(40, Math.hypot(x, y));
            
            currentPos = {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            };

            stick.style.transform = `translate(${currentPos.x}px, ${currentPos.y}px)`;

            // Chuyển đổi góc thành hướng
            const deg = angle * 180 / Math.PI;
            if (deg > -45 && deg <= 45) this.changeDirection('right');
            else if (deg > 45 && deg <= 135) this.changeDirection('down');
            else if (deg > 135 || deg <= -135) this.changeDirection('left');
            else this.changeDirection('up');
        };

        joystick.addEventListener('touchstart', (e) => {
            active = true;
            handleJoystick(e);
        });

        joystick.addEventListener('touchmove', (e) => {
            if (!active) return;
            handleJoystick(e);
        });

        joystick.addEventListener('touchend', () => {
            active = false;
            currentPos = { x: 0, y: 0 };
            stick.style.transform = 'translate(0px, 0px)';
        });
    }

    changeDirection(newDirection) {
        // Không cho đổi hướng khi game over hoặc đã thắng
        if (this.gameOver || this.hasWon) return;

        const opposite = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };

        const now = Date.now();
        
        // Log thông tin input mới
        console.log(`Input mới: ${newDirection}, Hướng hiện tại: ${this.snake.direction}, Move Progress: ${this.snake.moveProgress}`);
        
        // Cho phép đổi hướng khi đã di chuyển được 70% quãng đường
        if (this.snake.moveProgress < 0.7) {
            // Nếu buffer chưa đầy, thêm input vào buffer
            if (this.inputBuffer.length < this.maxBufferSize) {
                if (this.inputBuffer.length === 0 || this.inputBuffer[this.inputBuffer.length - 1] !== newDirection) {
                    this.inputBuffer.push(newDirection);
                    console.log(`Thêm vào buffer do chưa di chuyển đủ: ${newDirection}, Buffer: [${this.inputBuffer.join(', ')}]`);
                }
            }
            return;
        }

        // Kiểm tra thời gian giữa các lần input
        if (now - this.lastInputTime < this.inputDelay) {
            if (this.inputBuffer.length < this.maxBufferSize) {
                if (this.inputBuffer.length === 0 || this.inputBuffer[this.inputBuffer.length - 1] !== newDirection) {
                    this.inputBuffer.push(newDirection);
                    console.log(`Thêm vào buffer do quá nhanh: ${newDirection}, Buffer: [${this.inputBuffer.join(', ')}]`);
                }
            }
            return;
        }

        // Lấy hướng từ buffer nếu có, không thì dùng hướng mới
        const directionToApply = this.inputBuffer.length > 0 ? this.inputBuffer.shift() : newDirection;
        
        // Kiểm tra hướng ngược lại với hướng hiện tại
        if (opposite[directionToApply] === this.snake.direction) {
            console.log('Bỏ qua do là hướng ngược lại');
            return;
        }

        // Cập nhật hướng và thời gian
        this.snake.lastDirection = this.snake.direction;
        this.snake.direction = directionToApply;
        this.lastInputTime = now;
        console.log(`Đã đổi hướng thành: ${directionToApply}, Move Progress: ${this.snake.moveProgress}`);
    }
    
    handleKeyPress(event) {
        const directions = {
            'ArrowUp': 'up',
            'ArrowRight': 'right',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'KeyW': 'up',
            'KeyD': 'right',
            'KeyS': 'down',
            'KeyA': 'left'
        };
        
        if (directions[event.code]) {
            this.changeDirection(directions[event.code]);
        }
        
        if (event.code === 'Space' && this.gameOver) {
            this.restartGame();
        }
    }
    
    getRandomTetColor() {
        const tetColors = ['green', 'gold']; // Chỉ sử dụng 2 màu có sẵn
        return tetColors[Math.floor(Math.random() * tetColors.length)];
    }
    
    restartGame() {
        this.snake = {
            body: [
                {
                    x: 320, y: 320,
                    renderX: 320, renderY: 320
                },
                {
                    x: 256, y: 320,  // Thêm một phần thân phía sau head
                    renderX: 256, renderY: 320
                }
            ],
            direction: 'right',
            color: this.getRandomTetColor(),
            lastDirection: 'right',
            moveProgress: 0
        };
        this.food = this.generateFood();
        this.score = 0;
        this.currentLevel = 'Mùng Một';
        this.gameOver = false;
        this.hasWon = false; // Reset trạng thái chiến thắng
    }
    
    generateFood() {
        const foods = [];
        const tetItemTypes = Object.keys(this.tetItems);
        const safeItems = tetItemTypes.filter(type => type !== 'phao');
        
        // Hàm kiểm tra vị trí có trùng với thân rắn không
        const isPositionValid = (x, y) => {
            // Kiểm tra trùng với các vật phẩm khác
            if (foods.some(food => food.x === x && food.y === y)) {
                return false;
            }
            // Kiểm tra trùng với thân rắn và đầu rắn
            if (this.snake.body.some(part => 
                part.x === x && part.y === y || 
                Math.abs(part.x - x) < 64 && Math.abs(part.y - y) < 64
            )) {
                return false;
            }
            return true;
        };

        // Hàm tạo vị trí ngẫu nhiên hợp lệ
        const getRandomValidPosition = () => {
            let x, y;
            let attempts = 0;
            const maxAttempts = 100;

            do {
                x = Math.floor(Math.random() * (this.canvas.width / 64)) * 64;
                y = Math.floor(Math.random() * (this.canvas.height / 64)) * 64;
                attempts++;
                if (attempts >= maxAttempts) {
                    // Nếu không tìm được vị trí sau nhiều lần thử, tìm vị trí xa rắn nhất
                    let maxDistance = 0;
                    let bestPosition = { x: 0, y: 0 };
                    
                    for (let testX = 0; testX < this.canvas.width; testX += 64) {
                        for (let testY = 0; testY < this.canvas.height; testY += 64) {
                            let minDistance = Infinity;
                            this.snake.body.forEach(part => {
                                const distance = Math.hypot(testX - part.x, testY - part.y);
                                minDistance = Math.min(minDistance, distance);
                            });
                            if (minDistance > maxDistance) {
                                maxDistance = minDistance;
                                bestPosition = { x: testX, y: testY };
                            }
                        }
                    }
                    return bestPosition;
                }
            } while (!isPositionValid(x, y));

            return { x, y };
        };

        // Tạo vật phẩm an toàn
        const safePosition = getRandomValidPosition();
        foods.push({
            ...safePosition,
            type: safeItems[Math.floor(Math.random() * safeItems.length)]
        });

        // Thêm pháo theo tần suất
        if (Math.random() < this.levels[this.currentLevel].bombFrequency) {
            const phaoPosition = getRandomValidPosition();
            if (isPositionValid(phaoPosition.x, phaoPosition.y)) {
                foods.push({
                    ...phaoPosition,
                    type: 'phao'
                });
            }
        }

        return foods;
    }
    
    checkLevelUp() {
        const levels = Object.keys(this.levels);
        const currentLevelIndex = levels.indexOf(this.currentLevel);
        const currentLevelScore = this.levelScores[this.currentLevel];
        
        if (this.score >= currentLevelScore) {
            if (currentLevelIndex < levels.length - 1) {
                // Chuyển sang level tiếp theo
                this.currentLevel = levels[currentLevelIndex + 1];
                // Đổi màu rắn khi lên level
                this.snake.color = this.getRandomTetColor();
                return true;
            } else if (this.score >= this.levelScores['Mùng Ba']) {
                // Chiến thắng game khi đạt đủ điểm ở level cuối
                this.hasWon = true;
                return true;
            }
        }
        return false;
    }
    
    update() {
        // Không update khi game over hoặc đã thắng
        if (this.gameOver || this.hasWon) return;
        
        this.snake.body.forEach(part => {
            if (!part.renderX) part.renderX = part.x;
            if (!part.renderY) part.renderY = part.y;
        });
        
        const head = {...this.snake.body[0]};
        switch(this.snake.direction) {
            case 'up': head.y -= 64; break;
            case 'right': head.x += 64; break;
            case 'down': head.y += 64; break;
            case 'left': head.x -= 64; break;
        }
        
        if (!this.isGodMode) {
            if (head.x < 0 || head.x >= this.canvas.width ||
                head.y < 0 || head.y >= this.canvas.height) {
                this.gameOver = true;
                return;
            }
        } else {
            if (head.x < 0) head.x = this.canvas.width - 64;
            if (head.x >= this.canvas.width) head.x = 0;
            if (head.y < 0) head.y = this.canvas.height - 64;
            if (head.y >= this.canvas.height) head.y = 0;
        }
        
        if (!this.isGodMode && this.snake.body.some(part => part.x === head.x && part.y === head.y)) {
            this.gameOver = true;
            return;
        }
        
        const collidedFoodIndex = this.food.findIndex(f => f.x === head.x && f.y === head.y);
        
        if (collidedFoodIndex !== -1) {
            const collidedFood = this.food[collidedFoodIndex];
            this.sprites.collectItem(this.ctx, collidedFood.type, collidedFood.x, collidedFood.y);
            
            if (collidedFood.type === 'phao' && !this.isGodMode) {
                this.gameOver = true;
                return;
            }
            
            const scoreMultiplier = this.isGodMode ? 2 : 1;
            this.score += this.levels[this.currentLevel].foodScore * scoreMultiplier;
            
            if (this.checkLevelUp()) {
                this.sprites.createParticles(head.x, head.y, '#ffffff', 30);
            }
            
            this.food = this.generateFood();
            
            const tail = this.snake.body[this.snake.body.length - 1];
            head.renderX = head.x;
            head.renderY = head.y;
            this.snake.body.unshift(head);
            
            const newTail = {
                x: tail.x,
                y: tail.y,
                renderX: tail.renderX,
                renderY: tail.renderY
            };
            this.snake.body.push(newTail);

            // Log độ dài của rắn và loại vật phẩm vừa ăn
            console.log(`Độ dài rắn: ${this.snake.body.length}, Vật phẩm: ${collidedFood.type}`);
        } else {
            head.renderX = head.x;
            head.renderY = head.y;
            this.snake.body.unshift(head);
            this.snake.body.pop();
        }
        
        this.snake.moveProgress = Math.min(1, this.snake.moveProgress + 0.15); // Tăng tốc độ di chuyển
        
        // Xử lý input từ buffer khi đã di chuyển được 70% quãng đường
        if (this.inputBuffer.length > 0 && 
            this.snake.moveProgress >= 0.7 && 
            Date.now() - this.lastInputTime >= this.inputDelay) {
            const nextDirection = this.inputBuffer[0];
            const opposite = {
                'up': 'down',
                'down': 'up',
                'left': 'right',
                'right': 'left'
            };
            
            // Chỉ áp dụng hướng mới nếu không phải hướng ngược lại
            if (opposite[nextDirection] !== this.snake.direction) {
                this.snake.lastDirection = this.snake.direction;
                this.snake.direction = this.inputBuffer.shift();
                this.lastInputTime = Date.now();
            } else {
                // Xóa input không hợp lệ khỏi buffer
                this.inputBuffer.shift();
            }
        }
    }
    
    draw() {
        // Vẽ nền Tết
        this.ctx.fillStyle = this.theme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Vẽ viền
        this.ctx.strokeStyle = this.theme.border;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width-4, this.canvas.height-4);

        this.snake.moveProgress = Math.min(1, this.snake.moveProgress + 0.1);
        
        this.snake.body.forEach((part, index) => {
            const progress = this.easeInOutQuad(this.snake.moveProgress);
            const renderX = part.renderX + (part.x - part.renderX) * progress;
            const renderY = part.renderY + (part.y - part.renderY) * progress;
            
            if (index === 0) {
                const angle = this.snake.headAngle !== null ? 
                    this.snake.headAngle : 
                    this.getAngleFromDirection(this.snake.direction);
                this.sprites.drawSnakeHead(this.ctx, renderX, renderY, this.snake.direction, this.snake.color, angle);
            } else {
                this.sprites.drawSnakeBody(this.ctx, renderX, renderY, this.snake.color);
            }
            
            part.renderX = renderX;
            part.renderY = renderY;
        });
        
        // Vẽ tất cả các vật phẩm
        this.food.forEach(food => {
            this.sprites.animateCollectible(this.ctx, food.type, food.x, food.y, this.frameCount);
        });
        
        this.sprites.updateParticles(this.ctx);
        
        // Hiển thị thông tin game với style Tết
        this.ctx.fillStyle = this.theme.text;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Điểm: ${this.score}`, 10, 30);
        this.ctx.fillText(`Ngày: ${this.currentLevel}`, 10, 60);
        this.ctx.fillText(`Mốc tiếp theo: ${this.levelUpScore - this.score} điểm`, 10, 90);

        if (this.hasWon) {
            // Vẽ màn hình chiến thắng
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'; // Màu vàng trong suốt
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#d4380d'; // Màu đỏ tết
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎊 Chúc Mừng Chiến Thắng! 🎊', this.canvas.width/2, this.canvas.height/2 - 60);
            
            // Hiển thị lời chúc đã được chọn
            if (this.currentWish) {
                this.ctx.font = '24px Arial';
                this.ctx.fillText(this.currentWish, this.canvas.width/2, this.canvas.height/2);
            }
            
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText(`Điểm số: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 60);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Nhấn SPACE để chơi lại', this.canvas.width/2, this.canvas.height/2 + 100);
            
            // Tạo thêm hiệu ứng pháo hoa
            this.createFireworks();
        } else if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(255, 77, 77, 0.8)'; // Màu đỏ trong suốt
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Chúc Bạn Năm Mới!', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Điểm cao: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            this.ctx.fillText('Nhấn SPACE để chơi tiếp', this.canvas.width/2, this.canvas.height/2 + 80);
        }

        // Hiệu ứng particle cho Tết
        this.drawTetEffects();
    }

    // Thêm hiệu ứng Tết
    drawTetEffects() {
        if (!this.particles) return;
        
        // Vẽ hoa mai rơi
        this.particles.forEach((p, index) => {
            p.y += p.speed;
            p.x += Math.sin(p.angle) * 0.5;
            p.angle += 0.02;
            
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            // Vẽ hoa 5 cánh
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI / 5) + p.rotation;
                const x = p.x + Math.cos(angle) * 5;
                const y = p.y + Math.sin(angle) * 5;
                this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();

            // Reset particle khi rơi xuống dưới
            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    getAngleFromDirection(direction) {
        return {
            'up': -90,
            'right': 0,
            'down': 90,
            'left': 180
        }[direction];
    }
    
    // Hàm easing để tạo chuyển động mượt mà
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        const currentSpeed = this.levels[this.currentLevel].speed;
        
        // Cập nhật game với tốc độ được điều chỉnh
        if (deltaTime >= 1000/currentSpeed) {
            this.update();
            this.lastTime = timestamp;
        }
        
        // Vẽ với FPS cao để animation mượt mà
        this.frameCount++;
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    get isGodMode() {
        return this._godMode && this._isDebugBuild;
    }

    createFireworks() {
        // Tạo hiệu ứng pháo hoa khi chiến thắng
        if (Math.random() < 0.1) { // 10% cơ hội mỗi frame
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const colors = ['#ff0000', '#ffd700', '#ff69b4', '#00ff00', '#ff4500'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.sprites.createParticles(x, y, color, 20);
        }
    }
} 