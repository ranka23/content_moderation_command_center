// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
})
