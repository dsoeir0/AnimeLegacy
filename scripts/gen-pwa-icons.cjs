const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const PUBLIC = path.resolve(__dirname, '../public');
const SRC = path.join(PUBLIC, 'brand/iris-mark.svg');
const BG = '#0b0c10';

const renderTo = (svg, size, outFile) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(PUBLIC, outFile), png);
  console.log(`✓ ${outFile} (${size}×${size}, ${png.length} bytes)`);
};

const renderMaskable = (svg, size, outFile, innerScale, background) => {
  const inner = Math.round(size * innerScale);
  const offset = Math.round((size - inner) / 2);
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="translate(${offset} ${offset})">
    <svg width="${inner}" height="${inner}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
    </svg>
  </g>
</svg>`;
  const resvg = new Resvg(wrapped, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(PUBLIC, outFile), png);
  console.log(`✓ ${outFile} (${size}×${size} maskable, mark @ ${innerScale * 100}%, ${png.length} bytes)`);
};

const svg = fs.readFileSync(SRC, 'utf8');

renderTo(svg, 192, 'icon-192.png');
renderTo(svg, 512, 'icon-512.png');
renderTo(svg, 180, 'apple-touch-icon.png');
renderMaskable(svg, 512, 'icon-512-maskable.png', 0.68, BG);
