const fs = require('fs');
const path = require('path');

const config = fs.readFileSync(path.join(__dirname, '..', '..', 'render.yaml'), 'utf8');

const requiredLines = [
  'name: zhonghui-gold-display',
  'repo: https://github.com/yxj88888888/ZhongHui',
  'branch: main',
  'rootDir: 中汇黄金',
  'buildCommand: npm ci --omit=dev',
  'startCommand: npm start',
  'healthCheckPath: /api/health',
];

for (const line of requiredLines) {
  if (!config.includes(line)) {
    throw new Error(`Missing Render deployment setting: ${line}`);
  }
}

console.log('Render deployment targets the ZhongHui repository and project directory');
