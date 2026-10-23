import { readFileSync, readdirSync } from 'node:fs';
import { wcagContrast } from 'culori';

// 1. Читаем все файлы токенов из папки tokens
const tokens = {};

function collect(node, path) {
  if (node && typeof node === 'object' && '$value' in node) {
    tokens[path.join('.')] = node.$value;
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    collect(child, [...path, key]);
  }
}

for (const file of readdirSync('tokens').filter((f) => f.endsWith('.json'))) {
  collect(JSON.parse(readFileSync(`tokens/${file}`, 'utf8')), []);
}

// 2. Превращаем ссылки вида {color.blue.600} в итоговый цвет
function resolve(name) {
  let value = tokens[name];
  if (value === undefined) {
    throw new Error(`Токен не найден: ${name}`);
  }
  while (typeof value === 'string' && value.startsWith('{')) {
    const target = value.slice(1, -1);
    if (tokens[target] === undefined) {
      throw new Error(`Ссылка ${value} в токене ${name} ведёт в никуда`);
    }
    value = tokens[target];
  }
  return value;
}

// 3. Пары «текст на фоне» и минимальный порог
// 4.5 - обычный текст, 3 - крупный текст и элементы интерфейса
const pairs = [
  { text: 'color.text.primary',      bg: 'color.background.page',    min: 4.5 },
  { text: 'color.text.secondary',    bg: 'color.background.page',    min: 4.5 },
  { text: 'color.text.secondary',    bg: 'color.background.section', min: 4.5 },
  { text: 'color.text.link',         bg: 'color.background.page',    min: 4.5 },
  { text: 'color.text.link',         bg: 'color.background.section', min: 4.5 },
  { text: 'color.text.link-visited', bg: 'color.background.page',    min: 4.5 },
  { text: 'button.primary.text',     bg: 'button.primary.background',        min: 4.5 },
  { text: 'button.primary.text',     bg: 'button.primary.background-hover',  min: 4.5 },
  { text: 'button.primary.text',     bg: 'button.primary.background-active', min: 4.5 },
  { text: 'button.secondary.text',        bg: 'button.secondary.background',        min: 4.5 },
  { text: 'button.secondary.text-hover',  bg: 'button.secondary.background-hover',  min: 4.5 },
  { text: 'button.secondary.text-active', bg: 'button.secondary.background-active', min: 4.5 },
  { text: 'tab.text',                bg: 'tab.background-hover',     min: 4.5 },
  { text: 'tab.text-active',         bg: 'tab.background-active',    min: 4.5 },
  { text: 'chip.text',               bg: 'chip.background',          min: 4.5 },
  { text: 'color.text.on-brand',     bg: 'footer.background',        min: 4.5 },
  { text: 'color.text.on-brand',     bg: 'color.accent.default',     min: 4.5 },
];

// 4. Считаем и печатаем результат
let failed = 0;

for (const pair of pairs) {
  const textColor = resolve(pair.text);
  const bgColor = resolve(pair.bg);
  const ratio = wcagContrast(textColor, bgColor);
  const ok = ratio >= pair.min;
  if (!ok) failed++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${ratio.toFixed(2)} (нужно ${pair.min})  ${pair.text} на ${pair.bg}`
  );
}

console.log(`\nПроверено пар: ${pairs.length}, не прошло: ${failed}`);

if (failed > 0) {
  process.exit(1);
}