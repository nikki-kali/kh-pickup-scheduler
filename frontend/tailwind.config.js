/** Colors pulled from khdentallab.com's actual site CSS (primary blue used
 * ~26x across buttons/section backgrounds, dark neutral used for text/
 * borders, light blue tint used for section backgrounds) — not placeholders.
 * Swap only if KH provides an official brand/style guide with different
 * values. See README.md for how this merges into KH's real site theme. */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './pages/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'kh-teal': '#31799b',
        'kh-deep': '#404350',
        'teal-mist': '#ebf4ff',
        ink: '#111318',
        slate: '#6b7280',
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        data: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
