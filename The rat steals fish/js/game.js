// 游戏主逻辑
const Game = {
  canvas: null,
  ctx: null,
  
  state: {
    currentLevel: 1,
    lives: 3,
    score: 0,
    totalScore: 0,
    fishEaten: 0,
    totalFish: 0,
    timeLeft: 0,
    isPlaying: false,
    isPaused: false,
    combo: 0,
    lastEatTime: 0
  },
  
  powerups: {
    speedBoost: false,
    shield: false,
    catsScared: false
  },
  
  player: {
    x: 0,
    y: 0,
    direction: 'right',
    nextDirection: 'right',
    speed: 0.5,
    baseSpeed: 0.5,
    lastPortal: null,
    portalCooldown: 0,
    invincible: false,
    invincibleTimer: 0
  },
  
  cats: [],
  fish: [],
  powerupItems: [],
  portals: [],
  
  currentMap: null,
  animationId: null,
  timerInterval: null,
  
  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.setupInput();
    this.showMenu();
  },
  
  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    // 虚拟按键（触屏支持）
    const setupVirtualButton = (id, direction) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.state.isPlaying) {
            this.player.nextDirection = direction;
          }
        });
      }
    };
    
    setupVirtualButton('btnUp', 'up');
    setupVirtualButton('btnDown', 'down');
    setupVirtualButton('btnLeft', 'left');
    setupVirtualButton('btnRight', 'right');
  },
  
  handleKeyDown(e) {
    if (!this.state.isPlaying) return;
    
    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.player.nextDirection = 'up';
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.player.nextDirection = 'down';
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.player.nextDirection = 'left';
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.player.nextDirection = 'right';
        e.preventDefault();
        break;
      case 'Escape':
      case 'p':
      case 'P':
        this.togglePause();
        break;
    }
  },
  
  showMenu() {
    this.stopGame();
    document.getElementById('menuScreen').style.display = 'flex';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('leaderboardScreen').style.display = 'none';
    document.getElementById('manualScreen').style.display = 'none';
  },
  
  startGame(level = 1) {
    this.state.currentLevel = level;
    this.state.lives = 3;
    this.state.score = 0;
    this.state.totalScore = 0;
    this.loadLevel(level);
    
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('leaderboardScreen').style.display = 'none';
    document.getElementById('manualScreen').style.display = 'none';
    
    this.state.isPlaying = true;
    this.startTimer();
    this.gameLoop();
  },
  
  loadLevel(level) {
    const levelData = LEVELS[level - 1];
    this.currentMap = levelData.map;
    
    this.state.fishEaten = 0;
    this.state.totalFish = levelData.fishCount;
    this.state.timeLeft = levelData.timeLimit;
    this.state.combo = 0;
    this.powerups = {
      speedBoost: false,
      shield: false,
      catsScared: false
    };
    this.player.speed = this.player.baseSpeed;
    
    // 找到出生点
    let spawnX = 0, spawnY = 0;
    let catSpawns = [];
    this.portals = [];
    
    for (let y = 0; y < this.currentMap.length; y++) {
      for (let x = 0; x < this.currentMap[y].length; x++) {
        if (this.currentMap[y][x] === 2) {
          spawnX = x;
          spawnY = y;
        } else if (this.currentMap[y][x] === 3) {
          catSpawns.push({ x, y });
        } else if (this.currentMap[y][x] === 4) {
          this.portals.push({ x, y });
        }
      }
    }
    
    this.player.x = spawnX;
    this.player.y = spawnY;
    this.player.direction = 'right';
    this.player.nextDirection = 'right';
    
    // 创建猫咪
    this.cats = [];
    for (let i = 0; i < levelData.catCount; i++) {
      const spawn = catSpawns[i % catSpawns.length];
      this.cats.push({
        x: spawn.x,
        y: spawn.y,
        direction: ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)],
        speed: 0.3 + (level * 0.025),
        isScared: false,
        eatingFish: false,
        eatTimer: 0
      });
    }
    
    // 放置鱼
    this.fish = [];
    const pathTiles = this.getPathTiles();
    this.shuffleArray(pathTiles);
    
    for (let i = 0; i < levelData.fishCount && i < pathTiles.length; i++) {
      if (pathTiles[i].x !== spawnX || pathTiles[i].y !== spawnY) {
        this.fish.push({
          x: pathTiles[i].x,
          y: pathTiles[i].y,
          eaten: false
        });
      }
    }
    

    
    // 放置道具
    this.powerupItems = [];
    const powerupTypes = ['broom', 'bomb', 'speed', 'shield'];
    let availableTiles = pathTiles.filter(t => 
      t.x !== spawnX || t.y !== spawnY
    );
    
    for (let i = 0; i < levelData.powerupCount && availableTiles.length > 0; i++) {
      const index = Math.floor(Math.random() * availableTiles.length);
      const tile = availableTiles.splice(index, 1)[0];
      this.powerupItems.push({
        x: tile.x,
        y: tile.y,
        type: powerupTypes[i % powerupTypes.length],
        collected: false
      });
    }
    
    this.updateUI();
  },
  
  getPathTiles() {
    const tiles = [];
    for (let y = 0; y < this.currentMap.length; y++) {
      for (let x = 0; x < this.currentMap[y].length; x++) {
        if (this.currentMap[y][x] !== 1) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  },
  
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },
  
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      if (this.state.isPlaying && !this.state.isPaused) {
        this.state.timeLeft--;
        this.updateUI();
        
        if (this.state.timeLeft <= 0) {
          this.endLevel(false);
        }
      }
    }, 1000);
  },
  
  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) {
      pauseOverlay.style.display = this.state.isPaused ? 'flex' : 'none';
    }
  },
  
  gameLoop() {
    if (!this.state.isPlaying) return;
    
    if (!this.state.isPaused) {
      this.update();
      this.render();
    }
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  },
  
  update() {
    this.updatePlayer();
    this.updateCats();
    this.checkCollisions();
    
    // 连击计时器
    if (Date.now() - this.state.lastEatTime > 2000) {
      this.state.combo = 0;
    }
    
    // 传送门冷却
    if (this.player.portalCooldown > 0) {
      this.player.portalCooldown -= 1;
    }
    
    // 无敌时间倒计时
    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= 1;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
      }
    }
  },
  
  updatePlayer() {
    // 尝试转向
    if (this.canMove(this.player.nextDirection)) {
      this.player.direction = this.player.nextDirection;
    }
    
    // 移动
    if (this.canMove(this.player.direction)) {
      const speed = this.powerups.speedBoost ? this.player.speed * 1.5 : this.player.speed;
      
      switch(this.player.direction) {
        case 'up': this.player.y -= speed / 20; break;
        case 'down': this.player.y += speed / 20; break;
        case 'left': this.player.x -= speed / 20; break;
        case 'right': this.player.x += speed / 20; break;
      }
      
      // 检查传送门
      this.checkPortals();
    }
  },
  
  updateCats() {
    this.cats.forEach(cat => {
      if (cat.isScared) return;
      
      const catX = Math.round(cat.x);
      const catY = Math.round(cat.y);
      
      // 检查是否正在吃鱼
      if (cat.eatingFish) {
        cat.eatTimer += 1;
        if (cat.eatTimer >= 180) { // 3秒吃完
          const fish = this.fish.find(f => !f.eaten && Math.round(f.x) === catX && Math.round(f.y) === catY);
          if (fish) {
            fish.eaten = true;
            this.updateUI();
          }
          cat.eatingFish = false;
          cat.eatTimer = 0;
        }
        return; // 吃鱼时不移动
      }
      
      // 检查2格范围内是否有鱼
      let nearbyFish = null;
      let minFishDist = 3;
      
      for (const fish of this.fish) {
        if (fish.eaten) continue;
        const dist = Math.abs(Math.round(fish.x) - catX) + Math.abs(Math.round(fish.y) - catY);
        if (dist <= 2 && dist < minFishDist) {
          minFishDist = dist;
          nearbyFish = fish;
        }
      }
      
      // 检查老鼠距离
      const playerDist = Math.abs(Math.round(this.player.x) - catX) + Math.abs(Math.round(this.player.y) - catY);
      
      // 优先追捕老鼠（如果老鼠在5格范围内）
      let targetX, targetY;
      let chasePlayer = false;
      
      if (playerDist <= 5 && !this.player.invincible) {
        chasePlayer = true;
        targetX = Math.round(this.player.x);
        targetY = Math.round(this.player.y);
      } else if (nearbyFish) {
        // 去吃鱼
        targetX = Math.round(nearbyFish.x);
        targetY = Math.round(nearbyFish.y);
      }
      
      if (chasePlayer || nearbyFish) {
        // 向目标移动
        const dx = targetX - catX;
        const dy = targetY - catY;
        
        let bestDir = cat.direction;
        let bestDist = 1000;
        
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
          if (this.canCatMove(cat, dir)) {
            let newX = catX, newY = catY;
            switch(dir) {
              case 'up': newY--; break;
              case 'down': newY++; break;
              case 'left': newX--; break;
              case 'right': newX++; break;
            }
            const dist = Math.abs(targetX - newX) + Math.abs(targetY - newY);
            if (dist < bestDist) {
              bestDist = dist;
              bestDir = dir;
            }
          }
        }
        
        cat.direction = bestDir;
        
        // 如果到达鱼的位置，开始吃鱼
        if (nearbyFish && catX === Math.round(nearbyFish.x) && catY === Math.round(nearbyFish.y)) {
          cat.eatingFish = true;
          cat.eatTimer = 0;
          return;
        }
      } else {
        // 随机移动
        if (Math.random() < 0.02) {
          cat.direction = ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];
        }
        
        if (!this.canCatMove(cat, cat.direction)) {
          const directions = ['left', 'right', 'up', 'down'];
          this.shuffleArray(directions);
          for (const dir of directions) {
            if (this.canCatMove(cat, dir)) {
              cat.direction = dir;
              break;
            }
          }
        }
      }
      
      // 移动
      if (this.canCatMove(cat, cat.direction) && !cat.eatingFish) {
        const speed = this.powerups.catsScared ? cat.speed * 0.5 : cat.speed;
        switch(cat.direction) {
          case 'up': cat.y -= speed / 20; break;
          case 'down': cat.y += speed / 20; break;
          case 'left': cat.x -= speed / 20; break;
          case 'right': cat.x += speed / 20; break;
        }
      }
    });
  },
  
  canMove(direction) {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    let newX = x, newY = y;
    
    switch(direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    if (newY < 0 || newY >= this.currentMap.length || 
        newX < 0 || newX >= this.currentMap[0].length) {
      return false;
    }
    
    return this.currentMap[newY][newX] !== 1;
  },
  
  canCatMove(cat, direction) {
    const x = Math.round(cat.x);
    const y = Math.round(cat.y);
    let newX = x, newY = y;
    
    switch(direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    if (newY < 0 || newY >= this.currentMap.length || 
        newX < 0 || newX >= this.currentMap[0].length) {
      return false;
    }
    
    return this.currentMap[newY][newX] !== 1;
  },
  
  checkPortals() {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    
    if (this.currentMap[y][x] === 4 && this.player.portalCooldown === 0) {
      // 找到另一个传送门
      for (const portal of this.portals) {
        if (portal.x !== x || portal.y !== y) {
          this.player.x = portal.x;
          this.player.y = portal.y;
          this.player.portalCooldown = 60; // 60帧的冷却时间
          break;
        }
      }
    }
  },
  
  checkCollisions() {
    // 吃鱼
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y);
    
    this.fish.forEach(fish => {
      if (!fish.eaten && Math.round(fish.x) === px && Math.round(fish.y) === py) {
        fish.eaten = true;
        this.state.fishEaten++;
        this.state.combo++;
        this.state.lastEatTime = Date.now();
        
        // 计算分数
        let points = CONFIG.SCORE.FISH;
        points += this.state.combo * CONFIG.SCORE.COMBO_MULTIPLIER;
        this.state.score += points;
        this.state.totalScore += points;
        
        this.updateUI();
        
        // 检查关卡是否完成
        if (this.state.fishEaten >= this.state.totalFish) {
          this.endLevel(true);
        }
      }
    });
    
    // 吃道具
    this.powerupItems.forEach(powerup => {
      if (!powerup.collected && Math.round(powerup.x) === px && Math.round(powerup.y) === py) {
        powerup.collected = true;
        this.activatePowerup(powerup.type);
        this.state.score += CONFIG.SCORE.POWERUP;
        this.state.totalScore += CONFIG.SCORE.POWERUP;
        this.updateUI();
      }
    });
    
    // 猫咪碰撞
    this.cats.forEach(cat => {
      if (cat.isScared || this.player.invincible) return;
      
      const dx = Math.abs(this.player.x - cat.x);
      const dy = Math.abs(this.player.y - cat.y);
      
      if (dx < 0.8 && dy < 0.8) {
        if (this.powerups.shield) {
          this.powerups.shield = false;
        } else {
          this.catHit();
        }
      }
    });
  },
  
  activatePowerup(type) {
    switch(type) {
      case 'broom':
        this.powerups.catsScared = true;
        this.cats.forEach(cat => cat.isScared = true);
        setTimeout(() => {
          this.powerups.catsScared = false;
          this.cats.forEach(cat => cat.isScared = false);
        }, CONFIG.POWERUPS.BROOM.duration);
        break;
        
      case 'bomb':
        // 移除猫咪一段时间
        const originalCats = [...this.cats];
        this.cats = [];
        setTimeout(() => {
          this.cats = originalCats;
        }, 10000);
        break;
        
      case 'speed':
        this.powerups.speedBoost = true;
        setTimeout(() => {
          this.powerups.speedBoost = false;
        }, CONFIG.POWERUPS.SPEED.duration);
        break;
        
      case 'shield':
        this.powerups.shield = true;
        break;
    }
  },
  
  catHit() {
    this.state.lives--;
    this.state.combo = 0;
    this.updateUI();
    
    if (this.state.lives <= 0) {
      this.endLevel(false);
    } else {
      // 重新定位玩家到出生点
      for (let y = 0; y < this.currentMap.length; y++) {
        for (let x = 0; x < this.currentMap[y].length; x++) {
          if (this.currentMap[y][x] === 2) {
            this.player.x = x;
            this.player.y = y;
            break;
          }
        }
      }
      
      // 设置3秒无敌时间（180帧）
      this.player.invincible = true;
      this.player.invincibleTimer = 180;
    }
  },
  
  endLevel(success) {
    this.stopGame();
    
    const ratio = this.state.fishEaten / this.state.totalFish;
    let rating = '';
    let levelScore = this.state.score;
    
    if (!success) {
      rating = '失败';
    } else if (ratio >= 1) {
      rating = '完美！';
      levelScore += CONFIG.SCORE.PERFECT_BONUS;
    } else if (ratio >= 0.8) {
      rating = '优秀！';
      levelScore += CONFIG.SCORE.EXCELLENT_BONUS;
    } else if (ratio >= 0.6) {
      rating = '通过';
    } else {
      rating = '失败';
      success = false;
    }
    
    // 关卡奖励
    if (success) {
      levelScore += this.state.lives * CONFIG.SCORE.LIFE_BONUS;
      levelScore += this.state.timeLeft * CONFIG.SCORE.TIME_BONUS;
    }
    
    this.state.totalScore = levelScore;
    
    this.showResult(success, rating, ratio);
  },
  
  showResult(success, rating, ratio) {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'flex';
    
    const ratingElement = document.getElementById('resultRating');
    ratingElement.textContent = rating;
    ratingElement.className = 'result-rating';
    
    // 根据评级设置样式
    if (rating === '完美！') {
      ratingElement.classList.add('perfect');
    } else if (rating === '优秀！') {
      ratingElement.classList.add('excellent');
    } else if (rating === '通过') {
      ratingElement.classList.add('pass');
    } else {
      ratingElement.classList.add('fail');
    }
    
    document.getElementById('resultLevel').textContent = `第 ${this.state.currentLevel} 关`;
    document.getElementById('resultFish').textContent = `${this.state.fishEaten}/${this.state.totalFish} (${Math.round(ratio * 100)}%)`;
    document.getElementById('resultScore').textContent = `得分: ${this.state.totalScore.toLocaleString()}`;
    
    const nextBtn = document.getElementById('btnNextLevel');
    const retryBtn = document.getElementById('btnRetryLevel');
    const submitBtn = document.getElementById('btnSubmitScore');
    
    if (success && this.state.currentLevel < LEVELS.length) {
      nextBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = 'none';
    }
    
    retryBtn.style.display = 'inline-block';
    
    if (!success || this.state.currentLevel >= LEVELS.length) {
      if (Leaderboard.isHighScore(this.state.totalScore)) {
        submitBtn.style.display = 'inline-block';
      } else {
        submitBtn.style.display = 'none';
      }
    } else {
      submitBtn.style.display = 'none';
    }
  },
  
  nextLevel() {
    this.state.currentLevel++;
    this.state.score = 0;
    this.loadLevel(this.state.currentLevel);
    
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    this.state.isPlaying = true;
    this.startTimer();
    this.gameLoop();
  },
  
  retryLevel() {
    this.state.lives = 3;
    this.state.score = 0;
    this.loadLevel(this.state.currentLevel);
    
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    this.state.isPlaying = true;
    this.startTimer();
    this.gameLoop();
  },
  
  showSubmitScore() {
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('submitScoreScreen').style.display = 'flex';
  },
  
  submitScore() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();
    
    if (!Leaderboard.validateName(name)) {
      alert('请输入3个大写字母或符号！');
      return;
    }
    
    Leaderboard.addEntry(name, this.state.totalScore);
    
    document.getElementById('submitScoreScreen').style.display = 'none';
    this.showLeaderboard();
  },
  
  showLeaderboard() {
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('submitScoreScreen').style.display = 'none';
    document.getElementById('leaderboardScreen').style.display = 'flex';
    document.getElementById('manualScreen').style.display = 'none';
    
    Leaderboard.render('leaderboardContainer');
  },
  
  showManual() {
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('leaderboardScreen').style.display = 'none';
    document.getElementById('manualScreen').style.display = 'flex';
  },
  
  stopGame() {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },
  
  updateUI() {
    document.getElementById('currentLevel').textContent = this.state.currentLevel;
    document.getElementById('livesCount').textContent = '❤️'.repeat(this.state.lives);
    document.getElementById('fishCount').textContent = `${this.state.fishEaten}/${this.state.totalFish}`;
    document.getElementById('timeLeft').textContent = this.state.timeLeft;
    document.getElementById('scoreValue').textContent = this.state.score.toLocaleString();
    
    // 道具状态
    const powerupStatus = document.getElementById('powerupStatus');
    let statusText = '';
    if (this.powerups.speedBoost) statusText += '⚡ ';
    if (this.powerups.shield) statusText += '🛡️ ';
    if (this.powerups.catsScared) statusText += '🧹 ';
    powerupStatus.textContent = statusText;
  },
  
  render() {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;
    
    // 清空画布
    ctx.fillStyle = CONFIG.COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制地图
    for (let y = 0; y < this.currentMap.length; y++) {
      for (let x = 0; x < this.currentMap[y].length; x++) {
        const tile = this.currentMap[y][x];
        
        if (tile === 1) {
          // 墙壁
          ctx.fillStyle = CONFIG.COLORS.wall;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          
          // 墙壁装饰
          ctx.strokeStyle = '#4a5568';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
        } else if (tile === 4) {
          // 传送门
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          ctx.fill();
          
          // 传送门动画效果
          ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 通道
          ctx.fillStyle = CONFIG.COLORS.path;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
    
    // 绘制鱼
    this.fish.forEach(fish => {
      if (!fish.eaten) {
        this.drawEmoji(fish.x, fish.y, '🐟', tileSize);
      }
    });
    
    // 绘制道具
      this.powerupItems.forEach(powerup => {
        if (!powerup.collected) {
          let emoji = '⭐';
          switch(powerup.type) {
            case 'broom': emoji = '🧹'; break;
            case 'bomb': emoji = '💣'; break;
            case 'speed': emoji = '⚡'; break;
            case 'shield': emoji = '🛡️'; break;
          }
          this.drawEmoji(powerup.x, powerup.y, emoji, tileSize);
        }
      });
    
    // 绘制猫咪
    this.cats.forEach(cat => {
      let emoji = cat.isScared ? '😿' : '🐱';
      // 如果正在吃鱼，显示吃东西的表情
      if (cat.eatingFish) {
        emoji = '😋';
      }
      this.drawEmoji(cat.x, cat.y, emoji, tileSize);
    });
    
    // 绘制玩家
    let playerEmoji = '🐭';
    
    // 无敌状态效果 - 闪烁
    if (this.player.invincible) {
      if (Math.floor(this.player.invincibleTimer / 10) % 2 === 0) {
        // 绘制无敌光环
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(
          this.player.x * tileSize + tileSize / 2,
          this.player.y * tileSize + tileSize / 2,
          tileSize / 1.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    if (this.powerups.shield) {
      // 有护盾的效果
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.beginPath();
      ctx.arc(
        this.player.x * tileSize + tileSize / 2,
        this.player.y * tileSize + tileSize / 2,
        tileSize / 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    if (this.powerups.speedBoost) {
      playerEmoji = '🐭'; // 可以用不同的emoji表示加速状态
    }
    this.drawEmoji(this.player.x, this.player.y, playerEmoji, tileSize);
  },
  
  drawEmoji(x, y, emoji, tileSize) {
    const ctx = this.ctx;
    ctx.font = `${tileSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      emoji,
      x * tileSize + tileSize / 2,
      y * tileSize + tileSize / 2
    );
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
  
  // 绑定按钮事件
  document.getElementById('btnStartGame').addEventListener('click', () => Game.startGame(1));
  document.getElementById('btnShowLeaderboard').addEventListener('click', () => Game.showLeaderboard());
  document.getElementById('btnShowManual').addEventListener('click', () => Game.showManual());
  document.getElementById('btnBackToMenu').addEventListener('click', () => Game.showMenu());
  document.getElementById('btnBackFromLeaderboard').addEventListener('click', () => Game.showMenu());
  document.getElementById('btnBackFromManual').addEventListener('click', () => Game.showMenu());
  document.getElementById('btnNextLevel').addEventListener('click', () => Game.nextLevel());
  document.getElementById('btnRetryLevel').addEventListener('click', () => Game.retryLevel());
  document.getElementById('btnBackFromResult').addEventListener('click', () => Game.showMenu());
  document.getElementById('btnSubmitScore').addEventListener('click', () => Game.showSubmitScore());
  document.getElementById('btnConfirmSubmit').addEventListener('click', () => Game.submitScore());
  document.getElementById('btnCancelSubmit').addEventListener('click', () => Game.showMenu());
  document.getElementById('btnResumeGame').addEventListener('click', () => Game.togglePause());
  document.getElementById('btnQuitGame').addEventListener('click', () => Game.showMenu());
});
