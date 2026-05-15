const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const PUBLIC = path.resolve(__dirname, '../public');
const SRC = path.join(PUBLIC, 'brand/iris-mark.svg');
const BG = '#0b0c10';

const render = (svg, width, height, outFile, innerScale = 0.82) => {
  const inner = Math.round(Math.min(width, height) * innerScale);
  const offsetX = Math.round((width - inner) / 2);
  const offsetY = Math.round((height - inner) / 2);
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${offsetX} ${offsetY})">
    <svg width="${inner}" height="${inner}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      ${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
    </svg>
  </g>
</svg>`;
  const resvg = new Resvg(wrapped, {
    fitTo: { mode: 'width', value: width },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(PUBLIC, outFile), png);
  console.log(`✓ ${outFile} (${width}×${height}, mark @ ${innerScale * 100}%, ${png.length} bytes)`);
};

const svg = fs.readFileSync(SRC, 'utf8');

render(svg, 192, 192, 'icon-192.png');
render(svg, 512, 512, 'icon-512.png');
render(svg, 180, 180, 'apple-touch-icon.png');
render(svg, 512, 512, 'icon-512-maskable.png', 0.68);
render(svg, 480, 720, 'logo_no_text.png', 0.5);
