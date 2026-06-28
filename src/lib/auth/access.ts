/**
 * Helpers d'accès (synchrones) — utilisables côté serveur partout.
 * Séparés des Server Actions ('use server') qui, elles, doivent être async.
 *
 * Accès au projet = modèle INVITATION : seuls les comptes invités dans Supabase
 * (signups désactivés) peuvent se connecter. Pas d'allowlist applicative.
 */

/** Emails « développeur » (gestion des templates système, etc.). DEV_EMAILS, fallback dev. */
export function devEmails(): string[] {
  const env = (process.env.DEV_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return env.length ? env : ['zutgame@gmail.com']
}

/** True si l'email est dans la liste DEV. */
export function isDevEmail(email: string | null | undefined): boolean {
  return devEmails().includes((email ?? '').trim().toLowerCase())
}
