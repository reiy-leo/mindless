/** @type {import('tailwindcss').Config} */

import themeColors from './plugins/theme-color'
// import { tailwindcssPaletteGenerator } from '@bobthered/tailwindcss-palette-generator'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  plugins: [themeColors],
  safelist: [
    'bg-theme-sidebar',
    'bg-theme-sidebar-dark',
    {
      pattern: /^(bg|text|border)-theme-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
  ],
  theme: {
    extend: {},
  },
}
