/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', '"Merriweather"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        number: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: '#f2f0e9',
        cream: '#fdfbf7',
        racing: '#1b4d3e',
        navy: '#0f172a',
        burgundy: '#781d1d',
        espresso: '#2c1810',
        antique: '#b09160',
      },
      boxShadow: {
        glass: '0 14px 50px rgba(27,77,62,0.25)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
