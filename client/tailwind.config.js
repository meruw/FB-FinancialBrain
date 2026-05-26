/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Color tokens for the Brain UI. Override or replace once the team
      // settles on a visual identity. Pick something distinct from FastBank
      // so the demo reads as a separate product.
      colors: {
        brain: {
          bg: '#0B1220',
          surface: '#0F172A',
          accent: '#22D3EE',
          ok: '#4ADE80',
          warn: '#FACC15',
          danger: '#F87171',
          muted: '#64748B',
        },
      },
      fontFamily: {
        // Use the system stack until someone picks a real type pair.
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
