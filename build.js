const fs = require('fs');
const { execSync } = require('child_process');

// Lire les fichiers CSS et JS
const style = fs.readFileSync('./css/style-dist.css', 'utf8');
const script = fs.readFileSync('./js/script-dist.js', 'utf8');
let html = fs.readFileSync('index-dist.html', 'utf8');

// Insérer le CSS dans la balise <style> du <head>
html = html.replace('</head>', `<style>${style}</style>\n</head>`);

// Insérer le JS avant la fermeture de </body>
html = html.replace('</body>', `<script>${script}</script>\n</body>`);

// Écrire le fichier temporaire avant minification
fs.writeFileSync('temp.html', html, 'utf8');

// Minifier le fichier HTML final
execSync('npx html-minifier temp.html -o dist/fretboard.html --collapse-whitespace --minify-css true --minify-js true');

// Supprimer le fichier temporaire
fs.unlinkSync('temp.html');

console.log('✅ Build completed: dist/fretboard.html');