/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',      // Tailwind blue-600
        secondary: '#facc15',    // Tailwind yellow-400
        accent: '#10b981',       // Tailwind green-500
        danger: '#ef4444',       // Tailwind red-500
        muted: '#6b7280',        // Tailwind gray-500
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      screens: {
        'print': {'raw': 'print'},
      },
    },
  },
  plugins: [],
}
