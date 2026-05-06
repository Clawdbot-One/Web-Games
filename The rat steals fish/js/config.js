// 游戏配置文件
const CONFIG = {
  // 游戏常量
  TILE_SIZE: 32,
  MAP_WIDTH: 19,
  MAP_HEIGHT: 15,
  
  // 得分配置
  SCORE: {
    FISH: 100,
    POWERUP: 50,
    COMBO_MULTIPLIER: 10,
    LIFE_BONUS: 200,
    TIME_BONUS: 5,
    PERFECT_BONUS: 1000,
    EXCELLENT_BONUS: 500
  },
  
  // 道具配置
  POWERUPS: {
    BROOM: { name: 'broom', emoji: '🧹', duration: 5000 },
    BOMB: { name: 'bomb', emoji: '💣', duration: 0 },
    SPEED: { name: 'speed', emoji: '⚡', duration: 8000 },
    SHIELD: { name: 'shield', emoji: '🛡️', duration: 0 }
  },
  
  // 评价配置
  RATINGS: {
    PERFECT: 1.0,
    EXCELLENT: 0.8,
    PASS: 0.6
  },
  
  // 颜色配置
  COLORS: {
    primary: '#FF6B35',
    secondary: '#1E3A8A',
    danger: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
    background: '#0F172A',
    wall: '#374151',
    path: '#1F2937'
  }
};
