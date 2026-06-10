// Strapi 5 plugin entry point - @strapi/strapi types resolved at runtime
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default () => ({
  cmcc: {
    enabled: true,
    resolve: './src/plugins/cmcc',
  },
})
