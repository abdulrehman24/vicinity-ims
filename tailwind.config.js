/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./resources/**/*.blade.php",
      "./resources/**/*.js",
      "./resources/**/*.jsx",
      "./resources/**/*.ts",
      "./resources/**/*.tsx",
    ],
    theme: {
      extend: {
        colors: {
          vicinity: {
            primary: '#4a5a67',
            accent: '#ebc1b6',
            'primary-dark': '#3d4b55',
            'accent-light': '#f5e0db',
          }
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        }
      },
    },
    plugins: [],
  }
