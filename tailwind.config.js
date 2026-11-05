export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#89601c',
        secondary: '#245452',
        brand: { 50: '#fcf8ed', 100: '#f6ebcf', 200: '#e8d3a0', 300: '#d8b96e', 400: '#c49a42', 500: '#a47928', 600: '#89601c', 700: '#704b19', 800: '#583b1b', 900: '#392b1a' },
        ocean: { 50: '#f0f6f3', 100: '#dfece6', 200: '#bfd7cf', 300: '#91b8ac', 400: '#65968b', 500: '#38766c', 600: '#245e56', 700: '#214d47', 800: '#203f3b', 900: '#132e2c' },
        paper: '#fffdf7'
      },
      boxShadow: { lg: '0 10px 28px -10px rgb(76 54 20 / 0.14)', xl: '0 18px 48px -18px rgb(76 54 20 / 0.18)', '2xl': '0 24px 60px -20px rgb(76 54 20 / 0.2)' }
    },
  },
  plugins: [],
}
