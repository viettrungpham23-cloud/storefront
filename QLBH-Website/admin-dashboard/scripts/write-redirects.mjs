import { writeFileSync } from 'node:fs'

const origin = process.env.ADMIN_API_ORIGIN

if (!origin) {
  console.error('Missing ADMIN_API_ORIGIN for Netlify API proxy redirects.')
  process.exit(1)
}

const cleanOrigin = origin.replace(/\/+$/, '')

writeFileSync(
  'dist/_redirects',
  `/api/* ${cleanOrigin}/api/:splat 200!\n/* /index.html 200\n`,
  'utf8',
)

console.log(`Netlify API proxy target: ${cleanOrigin}`)
