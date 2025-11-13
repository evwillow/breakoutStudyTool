// Load environment variables from root .env.local before Next.js starts
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

