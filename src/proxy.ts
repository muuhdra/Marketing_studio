import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes totalement exclues du proxy (pas de vérification session)
// /api/mcp : serveur MCP authentifié par clé API (Bearer), pas par cookie Supabase.
const BYPASS_ROUTES = ['/auth/callback', '/auth/', '/api/mcp']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bypass complet pour les routes auth — laisser Next.js gérer directement
  if (BYPASS_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Route login — toujours accessible
  if (pathname === '/login') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Vérifier la session uniquement pour les routes protégées.
  // Si Supabase est injoignable (réseau coupé), on ne plante pas : on traite
  // comme non authentifié et on redirige vers /login.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) {
    // Non authentifié → login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Protéger toutes les routes sauf assets statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
