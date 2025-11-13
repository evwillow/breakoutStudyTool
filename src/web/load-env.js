/**
 * @fileoverview Bootstraps Next.js with root-level environment variables.
 * @module src/web/load-env.js
 * @dependencies path, dotenv
 */
// Load environment variables from root .env.local before Next.js starts
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

