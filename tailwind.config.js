/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'media', // mode sombre automatique selon navigateur, non réglable
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Jetons de la maquette (src/index.css)
        green: token('green'),
        blue: token('blue'),
        yellow: token('yellow'),
        red: token('red'),
        'on-color': token('on-color'),
        bg: token('bg'),
        surface: token('surface'),
        surface2: token('surface2'),
        field: token('field'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        divider: token('divider'),
        shadow: token('shadow'),
        link: token('link'),
        success: token('success'),
        error: token('error'),
        'error-bg': token('error-bg'),

        // Anciens noms shadcn, ramenés sur les jetons le temps de la refonte
        border: token('divider'),
        input: token('line'),
        ring: token('link'),
        background: token('bg'),
        foreground: token('ink'),
        primary: { DEFAULT: token('green'), foreground: token('on-color') },
        secondary: { DEFAULT: token('blue'), foreground: token('on-color') },
        destructive: { DEFAULT: token('error'), foreground: token('white') },
        accent: { DEFAULT: token('surface2'), foreground: token('ink') },
        popover: { DEFAULT: token('surface'), foreground: token('ink') },
        card: { DEFAULT: token('surface'), foreground: token('ink') },
        'muted-foreground': token('muted'),
      },
      borderWidth: {
        2.5: '2.5px',
        3: '3px',
      },
      boxShadow: {
        pop: '4px 4px 0 rgb(var(--shadow))',
        'pop-md': '5px 5px 0 rgb(var(--shadow))',
        'pop-lg': '6px 6px 0 rgb(var(--shadow))',
        'pop-red': '5px 5px 0 rgb(var(--error))',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        sheet: '28px',
      },
      maxWidth: {
        chef: '640px',
        admin: '1200px',
      },
    },
  },
  plugins: [],
};
