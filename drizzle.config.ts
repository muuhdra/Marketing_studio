import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// Drizzle-kit ne lit pas .env.local nativement (convention Next.js)
// On le charge explicitement ici
config({ path: '.env.local' })

export default {
  schema: './src/lib/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // snake_case dans la DB, camelCase dans le code TypeScript
  verbose: true,
  strict: true,
} satisfies Config
