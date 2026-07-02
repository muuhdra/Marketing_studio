'use client'

import { useEffect, useState } from 'react'
import { Crown, Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react'
import { useToast } from '@/lib/stores/toastStore'
import { useT } from '@/lib/i18n'
import {
  listBrandMembers,
  addBrandMember,
  removeBrandMember,
  type BrandMemberDTO,
} from '@/lib/actions/brand-members'

export function TeamPanel({ brandId }: { brandId: string | null }) {
  const tr = useT()
  const toast = useToast()
  const [members, setMembers] = useState<BrandMemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const youAreOwner = members.find((m) => m.isYou)?.role === 'owner'

  useEffect(() => {
    let alive = true
    if (!brandId) { setMembers([]); setLoading(false); return }
    setLoading(true)
    listBrandMembers(brandId)
      .then((rows) => { if (alive) setMembers(rows) })
      .catch(() => { if (alive) setMembers([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [brandId])

  async function invite() {
    if (!brandId || !email.trim() || inviting) return
    setInviting(true)
    try {
      const added = await addBrandMember(brandId, email)
      setMembers((m) => [...m, added])
      setEmail('')
      toast.success(tr('params.team.added', { email: added.email ?? '' }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('params.team.addFailed'))
    } finally {
      setInviting(false)
    }
  }

  async function remove(userId: string) {
    if (!brandId || removingId) return
    setRemovingId(userId)
    try {
      await removeBrandMember(brandId, userId)
      setMembers((m) => m.filter((x) => x.userId !== userId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('params.team.removeFailed'))
    } finally {
      setRemovingId(null)
    }
  }

  if (!brandId) {
    return <p className="text-[14px] font-medium text-text-secondary">{tr('params.team.noBrand')}</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-accent" />
        <h2 className="font-display text-[18px] font-extrabold tracking-tight text-text-primary">{tr('params.team.title')}</h2>
      </div>
      <p className="mt-1 text-[13px] font-medium leading-relaxed text-text-secondary">{tr('params.team.subtitle')}</p>

      {youAreOwner && (
        <div className="mt-5 rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-4">
          <label className="text-[12px] font-bold uppercase tracking-wide text-text-secondary">{tr('params.team.inviteLabel')}</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); invite() } }}
                placeholder={tr('params.team.emailPlaceholder')}
                className="!pl-9 w-full rounded-xl border border-fg/[0.1] bg-bg px-3 py-2.5 text-[14px] font-medium text-text-primary outline-none transition focus:border-accent"
              />
            </div>
            <button
              type="button"
              onClick={invite}
              disabled={inviting || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {inviting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {tr('params.team.invite')}
            </button>
          </div>
          <p className="mt-2 text-[12px] font-medium leading-relaxed text-text-muted">{tr('params.team.inviteHint')}</p>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[13px] font-medium text-text-muted"><Loader2 size={15} className="animate-spin" /> {tr('common.loading')}</div>
        ) : members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between rounded-xl border border-fg/[0.07] bg-fg/[0.02] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/12 text-[13px] font-extrabold uppercase text-accent">
                {(m.email ?? '?').slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-text-primary">
                  {m.email ?? tr('params.team.unknownUser')}
                  {m.isYou && <span className="ml-1.5 text-[12px] font-semibold text-text-muted">({tr('params.team.you')})</span>}
                </p>
                <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${m.role === 'owner' ? 'text-accent' : 'text-text-secondary'}`}>
                  {m.role === 'owner' && <Crown size={12} />}
                  {m.role === 'owner' ? tr('params.team.roleOwner') : tr('params.team.roleMember')}
                </span>
              </div>
            </div>
            {youAreOwner && m.role !== 'owner' && (
              <button
                type="button"
                onClick={() => remove(m.userId)}
                disabled={removingId === m.userId}
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-coral/10 hover:text-coral disabled:opacity-50"
                aria-label={tr('params.team.remove')}
              >
                {removingId === m.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
