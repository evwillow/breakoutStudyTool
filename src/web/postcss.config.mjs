/**
 * @fileoverview PostCSS configuration enabling Tailwind CSS and Autoprefixer.
 * @module src/web/postcss.config.mjs
 * @dependencies postcss-load-config, tailwindcss, autoprefixer
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
