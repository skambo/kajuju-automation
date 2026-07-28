/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        barn: {
          green: '#2d5a27',
          greendark: '#1e3d1a',
          greenmid: '#3b6d11',
          greenlight: '#f4faf0',
          greenborder: '#b0cba8',
          cardborder: '#d0ddc8',
          cream: '#fafaf8',
          ink: '#1a1a1a',
          navy: '#1a1a2e',
          // Single anniversary-campaign accent. Scope: credit badges + the
          // Pay Now CTA only. Everything else stays on the barn.green palette
          // above so the page still reads as the same property.
          accent: '#b8862e',
          accentlight: '#faf3e6',
          accentdark: '#7a561c',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
