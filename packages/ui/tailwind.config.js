/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../apps/client/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require('@hackaton/tailwind-config')],
}
