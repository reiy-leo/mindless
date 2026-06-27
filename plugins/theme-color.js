// plugins/theme-colors.js
import plugin from 'tailwindcss/plugin'

const lightnessMap = {
  50: '95%',
  100: '90%',
  200: '80%',
  300: '70%',
  400: '60%',
  500: '50%',
  600: '40%',
  700: '30%',
  800: '20%',
  900: '10%',
  950: '5%',
}

const alphaList = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]

export default plugin(({ addUtilities }) => {
  const utilities = {}

  // 为每个色阶生成 text-*、bg-*、border-* 工具类
  Object.entries(lightnessMap).forEach(([shade, lightness]) => {
    const colorValue = `hsl(from var(--theme-color) h s ${lightness})`

    utilities[`.text-theme-${shade}`] = { color: colorValue }
    utilities[`.bg-theme-${shade}`] = { backgroundColor: colorValue }
    alphaList.forEach((alpha) => {
      utilities[`.bg-theme-${shade}/${alpha}`] = {
        backgroundColor: `hsl(from var(--theme-color) h s ${lightness} / ${alpha}%)`,
      }
    })
    utilities[`.border-theme-${shade}`] = { borderColor: colorValue }
    // utilities[`.placeholder-theme-${shade}`] = { '&::placeholder': { color: colorValue } };
  })

  addUtilities(utilities)
})
