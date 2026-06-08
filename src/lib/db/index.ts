import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Connexion Postgres via Supabase
// En production : DATABASE_URL = postgresql://...supabase.com:5432/postgres
// En self-hosted futur : même variable, nouvelle URL NAS
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your .env.local file.')
}

// Client postgres-js — utilisé par Drizzle ORM
// max: 1 en serverless (Next.js API routes / Server Actions)
const client = postgres(connectionString, { max: 1 })

// Instance Drizzle avec le schéma complet
export const db = drizzle(client, { schema })

// Re-export du schéma pour imports pratiques
export * from './schema'
