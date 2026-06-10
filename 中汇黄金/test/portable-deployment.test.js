const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredFiles = [
  '启动中汇黄金.cmd',
  '停止中汇黄金.cmd',
  '首次部署-允许局域网访问.cmd',
  '门店部署说明.txt',
  path.join('scripts', 'start-store.ps1'),
  path.join('scripts', 'stop-store.ps1'),
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing portable deployment file: ${relativePath}`);
  }
}

const startScript = fs.readFileSync(path.join(root, 'scripts', 'start-store.ps1'), 'utf8');
const startScriptBytes = fs.readFileSync(path.join(root, 'scripts', 'start-store.ps1'));
const stopScriptBytes = fs.readFileSync(path.join(root, 'scripts', 'stop-store.ps1'));
for (const [name, bytes] of [
  ['start-store.ps1', startScriptBytes],
  ['stop-store.ps1', stopScriptBytes],
]) {
  if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
    throw new Error(`Expected ${name} to use UTF-8 BOM for Windows PowerShell 5 compatibility`);
  }
}
if (!startScript.includes("runtime\\node.exe")) {
  throw new Error('Expected the store launcher to use the bundled Node runtime');
}
if (!startScript.includes('Get-NetIPConfiguration')) {
  throw new Error('Expected the store launcher to detect the current LAN address');
}
if (!startScript.includes("$env:HOST = '0.0.0.0'")) {
  throw new Error('Expected the store launcher to expose the site on the local network');
}
if (!startScript.includes("$env:PORT = '3001'")) {
  throw new Error('Expected the store launcher to use the independent port 3001');
}

const guide = fs.readFileSync(path.join(root, '门店部署说明.txt'), 'utf8');
if (!guide.includes('首次部署-允许局域网访问.cmd') ||
    !guide.includes('启动中汇黄金.cmd') ||
    !guide.includes('http://门店电脑IP:3001')) {
  throw new Error('Expected the deployment guide to include first-run and LAN access instructions');
}

console.log('portable store deployment files are complete');
