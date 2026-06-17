import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ParametresView from '@/components/features/parametres/ParametresView'

export default async function Page() {
  // Utilisateur courant (réel)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const currentUser = user
    ? { email: user.email ?? '—', createdAt: user.created_at ?? null }
    : null

  return <ParametresView currentUser={currentUser} />
}
