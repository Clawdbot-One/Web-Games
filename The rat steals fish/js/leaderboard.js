// 排行榜功能
const Leaderboard = {
  STORAGE_KEY: 'mouseFishLeaderboard',
  MAX_ENTRIES: 100,
  
  // 加载排行榜
  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
      return [];
    }
  },
  
  // 保存排行榜
  save(leaderboard) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(leaderboard));
    } catch (e) {
      console.error('Failed to save leaderboard:', e);
    }
  },
  
  // 添加新记录
  addEntry(name, score) {
    const leaderboard = this.load();
    const entry = {
      name: name.toUpperCase(),
      score: score,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };
    
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    
    // 只保留前100条
    const trimmed = leaderboard.slice(0, this.MAX_ENTRIES);
    this.save(trimmed);
    
    // 返回新记录的排名
    return trimmed.findIndex(e => e.timestamp === entry.timestamp) + 1;
  },
  
  // 检查分数是否能进入排行榜
  isHighScore(score) {
    const leaderboard = this.load();
    if (leaderboard.length < this.MAX_ENTRIES) {
      return true;
    }
    return score > leaderboard[leaderboard.length - 1].score;
  },
  
  // 验证名字格式（3个字符，大写字母和常用符号）
  validateName(name) {
    if (!name || name.length !== 3) {
      return false;
    }
    // 允许大写字母、数字和一些常用符号
    const pattern = /^[A-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3}$/;
    return pattern.test(name);
  },
  
  // 渲染排行榜
  render(containerId, highlightScore = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const leaderboard = this.load();
    
    if (leaderboard.length === 0) {
      container.innerHTML = '<div class="empty-leaderboard">暂无记录，快来挑战吧！</div>';
      return;
    }
    
    let html = '<table class="leaderboard-table">';
    html += '<thead><tr><th>排名</th><th>名字</th><th>分数</th><th>日期</th></tr></thead>';
    html += '<tbody>';
    
    leaderboard.forEach((entry, index) => {
      const isHighlighted = highlightScore && entry.score === highlightScore;
      const rank = index + 1;
      let rankClass = '';
      let rankEmoji = '';
      
      if (rank === 1) { rankClass = 'rank-gold'; rankEmoji = '🥇'; }
      else if (rank === 2) { rankClass = 'rank-silver'; rankEmoji = '🥈'; }
      else if (rank === 3) { rankClass = 'rank-bronze'; rankEmoji = '🥉'; }
      
      html += `<tr class="${isHighlighted ? 'highlight' : ''} ${rankClass}">`;
      html += `<td>${rankEmoji ? rankEmoji : rank}</td>`;
      html += `<td>${this.escapeHtml(entry.name)}</td>`;
      html += `<td>${entry.score.toLocaleString()}</td>`;
      html += `<td>${entry.date}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  },
  
  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
