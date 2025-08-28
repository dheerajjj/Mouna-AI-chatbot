// Compute Subresource Integrity (SRI) hash for public/widget.js and print the <script> snippet
// Usage: node scripts/generate-sri.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

try {
  const file = path.join(__dirname, '..', 'public', 'widget.js');
  const data = fs.readFileSync(file);
  const hash = crypto.createHash('sha384').update(data).digest('base64');
  const sri = `sha384-${hash}`;
  const snippet = `<script src="https://www.mouna-ai.com/widget.js" integrity="${sri}" crossorigin="anonymous" data-api-key="YOUR_API_KEY" data-tenant-id="YOUR_TENANT_ID" data-primary-color="#667eea" data-position="bottom-right"></script>`;
  console.log('\nSubresource Integrity (SRI) for widget.js');
  console.log('Integrity:', sri);
  console.log('\nUse this snippet:');
  console.log(snippet);
} catch (e) {
  console.error('Failed to compute SRI:', e.message);
  process.exit(1);
}

