/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#152033', muted: '#738097', brand: '#5f63e8', canvas: '#f5f6fa' }, fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] }, boxShadow: { card: '0 2px 12px rgba(26,39,68,.045)' } } }, plugins: [] };
