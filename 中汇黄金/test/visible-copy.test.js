const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'js', 'app.js'), 'utf8');
const visibleSources = [html, app].join('\n');
const mojibakeMarkers = ['浠婃棩', '鍥炶喘', '瀹炴椂', '璧板娍', '寮€', '娑ㄨ穼', '閲戜环'];

for (const marker of mojibakeMarkers) {
  if (visibleSources.includes(marker)) throw new Error('Visible source contains mojibake: ' + marker);
}
for (const text of ['品类', '今日价格', '回收价格', '元/克', '西部郑记', '更新时间']) {
  if (!html.includes(text)) throw new Error('Missing expected HTML copy: ' + text);
}
if (!app.includes('价格暂时不可用') || !app.includes('读取固定金价失败')) {
  throw new Error('Missing fixed price error copy');
}

console.log('visible Chinese copy is readable and mojibake-free');
