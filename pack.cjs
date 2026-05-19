const fs = require('fs');
const html = fs.readFileSync('temp.html', 'utf8');
const code = 'export const appMarkup = `' + html.replace(/`/g, '\\`') + '`;\n';
fs.writeFileSync('./src/appMarkup.js', code);
