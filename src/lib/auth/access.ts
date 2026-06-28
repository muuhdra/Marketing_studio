/**
 * Helpers d'accès (synchrones) — utilisables côté serveur partout.
 * Séparés des Server Actions ('use server') qui, elles, doivent être async.
 */

/** Emails « développeur » (gestion des templates système, etc.). DEV_EMAILS, fallback dev. */
export function devEmails(): string[] {
  const env = (process.env.DEV_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return env.length ? env : ['zutgame@gmail.com']
}

/** Allowlist d'accès au projet (ALLOWED_EMAILS) — les DEV sont toujours inclus. */
export function allowedEmails(): string[] {
  const env = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...env, ...devEmails()]))
}

/** True si l'email est dans la liste DEV. */
export function isDevEmail(email: string | null | undefined): boolean {
  return devEmails().includes((email ?? '').trim().toLowerCase())
}

/** True si l'email fait partie de l'allowlist (accès privé). */
export function isEmailAllowed(email: string | null | undefined): boolean {
  return allowedEmails().includes((email ?? '').trim().toLowerCase())
}
