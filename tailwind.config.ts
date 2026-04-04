import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(220 14% 92%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(224 71% 4%)',
        muted: 'hsl(220 14% 96%)',
        primary: 'hsl(224 71% 40%)',
        card: 'hsl(0 0% 100%)',
        destructive: 'hsl(0 72% 51%)'
      }
    }
  },
  plugins: []
};

export default config;
