import { readFileSync, writeFileSync } from 'node:fs';

// Ruta del index.html ya compilado por Vite
const indexPath = './dist/index.html';

let html;
try {
  html = readFileSync(indexPath, 'utf8');
} catch {
  console.warn('build-id: dist/index.html no existe (build fallido?), se omite.');
  process.exit(0);
}

// Inyecta un id de build (timestamp) para detectar versiones nuevas
const meta = '<meta name="build-id" content="' + Date.now() + '" />';

if (html.includes('name="build-id"')) {
  // Replace de un build previo
  html = html.replace(
    /<meta name="build-id" content="[^"]*" \/>/,
    meta,
  );
} else {
  html = html.replace('</head>', meta + '</head>');
}

writeFileSync(indexPath, html);
console.log('build-id: meta inyectado en dist/index.html');