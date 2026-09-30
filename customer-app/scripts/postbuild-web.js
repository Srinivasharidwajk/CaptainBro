const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('✅ Generated .htaccess in dist/ directory for Hostinger single-page app routing.');
