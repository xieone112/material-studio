// 生成模板封面与结果示例 SVG（演示素材，可替换为真实图片）
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'main', 'resources', 'static', 'demo');
mkdirSync(outDir, { recursive: true });

const items = [
  { key: 'pet-wiggle',    emoji: '🐶', c1: '#f7d794', c2: '#f0932b', title: 'Pet Wiggle' },
  { key: 'santa-hug',     emoji: '🎅', c1: '#ff6b6b', c2: '#c0392b', title: 'AI-Hug Santa' },
  { key: 'wedding-film',  emoji: '💍', c1: '#a29bfe', c2: '#6c5ce7', title: 'Wedding Film' },
  { key: 'postcard',      emoji: '🏝️', c1: '#55efc4', c2: '#00b894', title: 'Travel Postcard' },
  { key: 'ice-queen',     emoji: '❄️', c1: '#74b9ff', c2: '#0984e3', title: 'Ice Queen' },
  { key: 'island',        emoji: '🌊', c1: '#81ecec', c2: '#00cec9', title: 'Island Breeze' },
  { key: 'city',          emoji: '🌆', c1: '#fd79a8', c2: '#e84393', title: 'City Skyline' },
  { key: 'portrait',      emoji: '🧑‍🎤', c1: '#ffeaa7', c2: '#fdcb6e', title: 'Portrait Pro' },
  { key: 'flow-style',    emoji: '🎨', c1: '#dfe6e9', c2: '#b2bec3', title: 'Style Transfer' },
  { key: 'flow-caption',  emoji: '💬', c1: '#fab1a0', c2: '#e17055', title: 'Caption Cards' },
];

const svg = ({ emoji, c1, c2, title }, kind) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#g)"/>
  <circle cx="240" cy="70" r="90" fill="#ffffff" opacity="0.15"/>
  <circle cx="40" cy="330" r="70" fill="#ffffff" opacity="0.12"/>
  <text x="150" y="215" font-size="110" text-anchor="middle">${emoji}</text>
  <text x="150" y="330" font-family="Arial, sans-serif" font-size="26" font-weight="bold"
        fill="#ffffff" text-anchor="middle">${title}</text>
  ${kind === 'result' ? '<rect x="90" y="345" width="120" height="30" rx="15" fill="#00000055"/><text x="150" y="366" font-family="Arial, sans-serif" font-size="15" fill="#fff" text-anchor="middle">✨ RESULT</text>' : ''}
</svg>
`;

for (const item of items) {
  writeFileSync(join(outDir, `tpl-${item.key}.svg`), svg(item, 'cover'));
  writeFileSync(join(outDir, `res-${item.key}.svg`), svg(item, 'result'));
}
console.log('Generated', items.length * 2, 'demo assets in', outDir);
