import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';

function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const palettes = {};
for (const theme of ['light', 'dark']) {
  const ast = postcss.parse(fs.readFileSync(`app/styles/${theme}.css`, 'utf8'));
  const tokens = {};
  ast.walkDecls(declaration => { tokens[declaration.prop] = declaration.value; });
  palettes[theme] = tokens;
  const pairs = [];
  for (const foreground of ['text', 'secondary', 'muted']) {
    for (const surface of ['bg', 'surface', 'subtle', 'hover', 'sidebar']) {
      pairs.push([foreground, surface]);
    }
  }
  for (const tone of ['red', 'blue', 'cyan', 'amber', 'purple', 'green', 'orange']) {
    pairs.push([tone, `${tone}-bg`], [tone, 'surface'], ['on-strong', `${tone}-strong`]);
  }
  pairs.push(['on-strong', 'strong'], ['on-strong', 'strong-hover']);
  for (const [foreground, background] of pairs) {
    const ratio = contrast(tokens[`--studio-${foreground}`], tokens[`--studio-${background}`]);
    assert.ok(ratio >= 4.5, `${theme}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1; needs 4.5:1`);
  }
}
assert.deepEqual(Object.keys(palettes.light).sort(), Object.keys(palettes.dark).sort(), 'Both themes must define the same token contract');
for (const name of fs.readdirSync('app/styles').filter(name => name.endsWith('.css'))) {
  const ast = postcss.parse(fs.readFileSync(`app/styles/${name}`, 'utf8'));
  ast.walk(node => {
    if (!node.nodes) return;
    const properties = new Set();
    for (const child of node.nodes) {
      if (child.type !== 'decl') continue;
      assert.ok(!properties.has(child.prop), `${name}: duplicate ${child.prop} in ${node.selector ?? node.name}`);
      properties.add(child.prop);
    }
  });
}
console.log('Theme regression passed: complete light/dark token contracts and 4.5:1 text contrast for neutral surfaces, status badges, and solid actions.');
