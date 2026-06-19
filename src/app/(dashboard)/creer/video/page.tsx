'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gem,
  Globe2,
  Handshake,
  Image as ImageIcon,
  Info,
  LayoutPanelLeft,
  Lightbulb,
  ListChecks,
  ListMusic,
  Megaphone,
  MessageSquare,
  PenLine,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Smile,
  Volume2,
  Sparkles,
  ShoppingCart,
  Timer,
  Type,
  UserPlus,
  UserRound,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { actionListAvatarsForPicker } from '@/lib/actions/avatar-assets'

const VIDEO_TYPES = [
  {
    id: 'realistic-actor',
    title: 'Realistic Actor Video',
    desc: 'Natural, human-like presenters for authentic promo videos.',
    images: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'broll-voiceover',
    title: 'B-Roll Voice-over Ad',
    desc: 'A voice-over ad with b-roll video clips to create a story driven ad for your product.',
    images: [
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'video-generator',
    title: 'Video Generator',
    desc: 'Create videos from a text or image.',
    images: [
      'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1520975682031-a9e3b68c8450?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'video-effects',
    title: 'Video Effects',
    desc: 'A collection of video effects to enhance your product visuals.',
    images: [
      'https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1567016546367-c27a0d56712c?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'green-screen-meme',
    title: 'Green-Screen Meme',
    desc: 'Fast, viral meme videos using green-screen actors.',
    images: [
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1596633605818-1b0d36de9b2a?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'asmr',
    title: 'ASMR',
    desc: 'Relaxing ASMR content to showcase your product.',
    images: [
      'https://images.unsplash.com/photo-1585386959984-a41552231658?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'billboard',
    title: 'Billboard',
    desc: 'Realistic billboard visuals for high-impact branding.',
    images: [
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=360&q=80',
    ],
  },
  {
    id: 'sora-2',
    title: 'Sora 2',
    desc: 'Create realistic videos from text or image prompts',
    images: [
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=360&q=80',
    ],
  },
]

const AVAILABLE_VIDEO_TYPE_IDS = new Set(['realistic-actor', 'broll-voiceover', 'video-generator'])

const IMAGE_POSITIONS = [
  'left-[28px] top-[34px] w-[118px] h-[170px] rotate-[-1deg]',
  'left-[158px] top-[18px] w-[118px] h-[180px] rotate-[1deg]',
  'right-[28px] top-0 w-[118px] h-[190px] rotate-[2deg]',
]

const FALLBACK_ACTORS = [
  { id: 'mei', name: 'Mei', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80' },
  { id: 'alice', name: 'Alice', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80' },
  { id: 'kevin', name: 'Kevin', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' },
  { id: 'maria', name: 'Maria', photoUrl: 'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?auto=format&fit=crop&w=600&q=80' },
  { id: 'samir', name: 'Samir', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80' },
  { id: 'lena', name: 'Lena', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80' },
  { id: 'yuki', name: 'Yuki', photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80' },
  { id: 'jay', name: 'Jay', photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80' },
  { id: 'emma', name: 'Emma', photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80' },
  { id: 'nora', name: 'Nora', photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80' },
  { id: 'marc', name: 'Marc', photoUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'sofia', name: 'Sofia', photoUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=600&q=80' },
  { id: 'mia', name: 'Mia', photoUrl: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=600&q=80' },
  { id: 'ava', name: 'Ava', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
  { id: 'ethan', name: 'Ethan', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
  { id: 'olivia', name: 'Olivia', photoUrl: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=600&q=80' },
]

const VOICES = [
  { id: 'cassidy', name: 'Cassidy - Natural', gender: 'Female' },
  { id: 'hope', name: 'Hope - Upbeat', gender: 'Female' },
  { id: 'monika', name: 'Monika S...', gender: 'Female' },
  { id: 'arabella', name: 'Arabella - Warm', gender: 'Female' },
  { id: 'devi', name: 'Devi - Energetic', gender: 'Female' },
  { id: 'brittney', name: 'Brittney - Bright', gender: 'Female', recommended: true },
  { id: 'jessica', name: 'Jessica A...', gender: 'Female' },
]

const BROLL_GOALS = [
  { id: 'drive-sales', title: 'Drive Sales', desc: 'Get people to buy now', icon: ShoppingCart },
  { id: 'explain-features', title: 'Explain Features', desc: 'Show how your product works', icon: ListChecks },
  { id: 'build-awareness', title: 'Build Awareness', desc: 'Introduce your brand to new audiences', icon: Megaphone },
  { id: 'announce-launch', title: 'Announce Launch', desc: 'Tell people about something new', icon: Rocket },
  { id: 'solve-problem', title: 'Solve a Problem', desc: 'Show before/after transformation', icon: Wand2 },
  { id: 'generate-leads', title: 'Generate Leads', desc: 'Get signups, downloads, or contact info', icon: UserPlus },
  { id: 'showcase-use-case', title: 'Showcase Use Case', desc: 'Demonstrate real-world application', icon: Lightbulb },
  { id: 'build-trust', title: 'Build Trust', desc: 'Establish credibility and overcome...', icon: Handshake },
]

const BROLL_AUDIENCES = [
  {
    id: 'remote-architect',
    title: 'Mid-30s Remote Architect Seeking Polished Comfort',
    desc: 'Male, 34-37, $120k income, Austin, TX, Homeowner',
    icon: UserRound,
  },
  {
    id: 'social-organizer',
    title: 'Early-40s Social Organizer Prioritizing Ease',
    desc: 'Female, 40-43, $150k household income, Suburban Atlanta, Parent o...',
    icon: UserRound,
  },
  {
    id: 'sustainable-enthusiast',
    title: 'Late-30s Sustainable Enthusiast Auditing Consumption',
    desc: 'Female, 36-39, $90k income, Portland, OR, Environmentally conscious',
    icon: Zap,
  },
]

const CUSTOM_VIDEO_MODELS = [
  { id: 'veo-31', name: 'Veo 3.1', desc: 'Versatile video model', tokens: 8 },
  { id: 'seedance-20', name: 'Seedance 2.0', desc: 'High-quality video with native audio and lip-sync', tokens: 15 },
  { id: 'seedance-15-pro', name: 'Seedance 1.5 Pro', desc: 'Video + audio generation with lip-sync', tokens: 5 },
  { id: 'wan-26', name: 'Wan 2.6', desc: 'Artistic video styles', tokens: 10 },
  { id: 'kling-3', name: 'Kling 3', desc: 'Cinematic video with audio support', tokens: 10 },
  { id: 'kling-03', name: 'Kling O3', desc: 'Latest Kling model with audio support', tokens: 10 },
  { id: 'kling-03-pro', name: 'Kling O3 Pro', desc: 'Pro version with higher quality', tokens: 10 },
]

type Actor = { id: string; name: string; photoUrl: string }
type VideoMode = 'menu' | 'realistic-actor' | 'broll-voiceover' | 'video-generator'

export default function CreerVideoPage() {
  const router = useRouter()
  const [mode, setMode] = useState<VideoMode>('menu')
  const [actorSource, setActorSource] = useState<'heyoz' | 'mine'>('heyoz')
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [selectedActorUrl, setSelectedActorUrl] = useState('')
  const [realisticStep, setRealisticStep] = useState(1)
  const [selectedVoiceId, setSelectedVoiceId] = useState('brittney')
  const [actorModalOpen, setActorModalOpen] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [brollFlow, setBrollFlow] = useState<'ai' | 'manual'>('ai')
  const [brollStep, setBrollStep] = useState<'choice' | 'goals' | 'audience' | 'products' | 'images' | 'configure' | 'manual-script'>('choice')
  const [selectedBrollGoal, setSelectedBrollGoal] = useState('')
  const [selectedBrollAudience, setSelectedBrollAudience] = useState('')
  const [customBrollAudience, setCustomBrollAudience] = useState('')
  const [selectedBrollProduct, setSelectedBrollProduct] = useState('')
  const [selectedBrollActorUrl, setSelectedBrollActorUrl] = useState('')
  const [brollAspectRatio, setBrollAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('portrait')
  const [brollInstructions, setBrollInstructions] = useState('')
  const [manualBrollScript, setManualBrollScript] = useState('')
  const [customVideoType, setCustomVideoType] = useState<'image' | 'text'>('image')
  const [selectedCustomVideoModel, setSelectedCustomVideoModel] = useState('')
  const [customVideoStep, setCustomVideoStep] = useState<'models' | 'generate'>('models')
  const [customVideoPrompt, setCustomVideoPrompt] = useState('')

  useEffect(() => {
    actionListAvatarsForPicker().then(setAvatars).catch(() => setAvatars([]))
  }, [])

  const myActors: Actor[] = avatars
    .filter((avatar): avatar is { id: string; name: string; photoUrl: string } => Boolean(avatar.photoUrl))
    .map((avatar) => ({ id: avatar.id, name: avatar.name, photoUrl: avatar.photoUrl }))
  const actors = actorSource === 'mine' ? myActors : FALLBACK_ACTORS
  const selectedActor = actors.find((actor) => actor.photoUrl === selectedActorUrl)
  const selectedCustomVideoModelDetails = CUSTOM_VIDEO_MODELS.find((model) => model.id === selectedCustomVideoModel)

  function handleBack() {
    if (mode !== 'menu') {
      setMode('menu')
      setSelectedActorUrl('')
      setRealisticStep(1)
      setBrollFlow('ai')
      setBrollStep('choice')
      setSelectedBrollGoal('')
      setSelectedBrollAudience('')
      setCustomBrollAudience('')
      setSelectedBrollProduct('')
      setSelectedBrollActorUrl('')
      setBrollAspectRatio('portrait')
      setBrollInstructions('')
      setManualBrollScript('')
      setCustomVideoType('image')
      setSelectedCustomVideoModel('')
      setCustomVideoStep('models')
      setCustomVideoPrompt('')
      return
    }
    router.push('/creer/image')
  }

  if (mode === 'realistic-actor') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-2 pt-2 pb-3 sm:px-4">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-border px-3 sm:h-[56px] sm:gap-5 sm:px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[19px] font-extrabold tracking-tight text-text-primary sm:text-[22px]">Realistic Actor Video</h1>
          </header>

          <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,31vw)] 2xl:grid-cols-[minmax(0,1fr)_430px]">
            <main className="min-w-0 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6">
              {realisticStep === 1 ? (
                <>
                  <div className="mb-4 flex items-center gap-3 sm:mb-5">
                    <span className="w-6 h-6 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">1</span>
                    <h2 className="min-w-0 font-display text-[16px] font-extrabold leading-tight text-text-primary sm:text-[18px]">Choose an actor for your video</h2>
                  </div>

                  <div className="mx-auto max-w-[760px] rounded-[10px] bg-fg/[0.08] p-1 grid grid-cols-2">
                    <button onClick={() => setActorSource('heyoz')} className={`h-8 rounded-[8px] text-[13px] font-extrabold transition ${actorSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80 hover:text-text-primary'}`}>HeyOz Actors</button>
                    <button onClick={() => setActorSource('mine')} className={`h-8 rounded-[8px] text-[13px] font-extrabold transition ${actorSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80 hover:text-text-primary'}`}>My Actors</button>
                  </div>

                  <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(74px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(84px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(92px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(98px,1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(106px,1fr))]">
                    <button onClick={() => setActorModalOpen(true)} className="aspect-[9/16] rounded-[10px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center gap-1.5 text-text-primary hover:border-accent/70 hover:bg-accent/5 transition-colors">
                      <LayoutPanelLeft size={23} />
                      <span className="text-[11px] font-semibold">Show All</span>
                    </button>

                    {actors.map((actor) => {
                      const selected = selectedActorUrl === actor.photoUrl
                      return (
                        <button
                          key={actor.id}
                          onClick={() => setSelectedActorUrl(actor.photoUrl)}
                          className={`relative aspect-[9/16] overflow-hidden rounded-[10px] border bg-bg-card transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
                          <span className="absolute left-1.5 bottom-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-bg-card/85 px-2 py-0.5 text-[10px] font-extrabold text-text-primary backdrop-blur">{actor.name}</span>
                          {selected && (
                            <span className="absolute right-1.5 top-1.5 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button disabled={!selectedActorUrl} className="h-10 rounded-[10px] bg-fg/[0.08] px-4 text-[14px] font-extrabold text-text-primary inline-flex items-center gap-2 transition hover:bg-fg/[0.12] disabled:opacity-50 disabled:cursor-not-allowed sm:px-5">
                      <Wand2 size={17} /> Edit Actor
                    </button>
                    <button onClick={() => setRealisticStep(2)} disabled={!selectedActorUrl} className="h-10 rounded-[10px] bg-accent px-5 text-[14px] font-extrabold text-white inline-flex items-center gap-3 shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed sm:px-6">
                      Continue <ChevronDown size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col justify-center py-8">
                  <div className="mb-8">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">2</span>
                      <h2 className="font-display text-[18px] font-extrabold text-text-primary">Choose the voice for your actor</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {VOICES.map((voice) => {
                        const selected = selectedVoiceId === voice.id
                        return (
                          <button
                            key={voice.id}
                            onClick={() => setSelectedVoiceId(voice.id)}
                            className={`relative flex h-[54px] items-center gap-3 rounded-full border bg-bg-card px-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/10 shadow-neo-sm' : 'border-border'}`}
                          >
                            {voice.recommended && <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[9px] font-extrabold text-white">RECOMMENDED</span>}
                            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border-4 border-fg/[0.10] bg-bg-card text-text-primary"><Play size={15} fill="currentColor" /></span>
                            <span className="min-w-0">
                              <span className="block truncate text-[14px] font-extrabold text-text-primary">{voice.name}</span>
                              <span className="mt-0.5 flex items-center gap-1">
                                <span className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-primary">{voice.gender}</span>
                                <span className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-primary">+2</span>
                              </span>
                            </span>
                          </button>
                        )
                      })}
                      <button onClick={() => setVoiceModalOpen(true)} className="flex h-[54px] items-center justify-center gap-3 rounded-full bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary hover:bg-fg/[0.12] transition">
                        <ListMusic size={18} /> See all voices
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">3</span>
                        <h2 className="font-display text-[18px] font-extrabold text-text-primary">What will your actor say?</h2>
                      </div>
                      <button className="inline-flex items-center gap-2 text-[14px] font-extrabold text-accent hover:brightness-95 transition">
                        <Sparkles size={16} /> Generate Script with AI
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-[10px] border border-border bg-bg-card">
                      <div className="flex h-11 items-center gap-6 border-b border-border px-4 text-[13px] font-bold text-text-secondary">
                        <button className="inline-flex items-center gap-2 hover:text-text-primary"><Smile size={16} /> Add Expression <ChevronDown size={14} /></button>
                        <button className="inline-flex items-center gap-2 hover:text-text-primary"><Timer size={16} /> Add Pause <ChevronDown size={14} /></button>
                        <button className="inline-flex items-center gap-2 hover:text-text-primary"><SlidersHorizontal size={16} /> Voice Settings</button>
                      </div>
                      <div className="min-h-[250px] px-4 py-4 text-[15px] font-medium leading-7 text-text-primary">
                        <p><span className="font-extrabold text-accent">[laughs]</span> Alright...guys - guys. Seriously.</p>
                        <p><span className="font-extrabold text-accent">[exhales]</span> Can you believe just how - realistic - this sounds now?</p>
                        <p><span className="font-extrabold text-accent">[laughing hysterically]</span> I mean OH MY GOD...it's so good.</p>
                        <p>Like you could never do this with the old model.</p>
                        <p>For example <span className="font-extrabold text-accent">[pauses]</span> could you switch my accent in the old model?</p>
                      </div>
                      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                        <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-text-dim"><Sparkles size={15} className="text-accent" /> Enhance your script...e.g. 'Add humor to my script'</span>
                        <button className="h-9 rounded-[10px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary inline-flex items-center gap-2 hover:bg-fg/[0.12] transition">
                          <Sparkles size={15} /> Auto Enhance
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button className="h-10 rounded-[10px] bg-accent px-5 text-[14px] font-extrabold text-white inline-flex items-center gap-2 shadow-sm hover:brightness-105 transition">
                        Generate Audio <Gem size={17} fill="currentColor" /> 1
                      </button>
                    </div>
                    <div className="mt-8 flex justify-center">
                      <button className="h-12 rounded-[10px] bg-[#ff987f] px-10 text-[16px] font-extrabold text-white inline-flex items-center gap-3 shadow-sm hover:brightness-105 transition">
                        Continue <ChevronDown size={18} className="-rotate-90" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>

            <aside className="min-h-0 border-t border-border bg-bg-surface p-3 sm:p-5 lg:border-l lg:border-t-0 lg:overflow-y-auto">
              <div className="flex min-h-[520px] flex-col rounded-[16px] border border-border bg-bg-surface/80 px-4 py-4 lg:min-h-full">
                <div className="mb-4 flex justify-end">
                  <button disabled={!selectedActorUrl} className="h-11 rounded-[12px] bg-accent px-5 text-[15px] font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed inline-flex items-center gap-2">
                    <Wand2 size={17} /> Edit Actor
                  </button>
                </div>

                <div className="flex min-h-[360px] w-full items-center justify-center overflow-hidden bg-bg-card lg:min-h-[520px]">
                  {selectedActor ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedActor.photoUrl} alt={selectedActor.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-5 text-center text-text-secondary px-6">
                      <UserRound size={52} strokeWidth={1.8} />
                      <p className="text-[15px] font-medium text-text-primary">Select an actor to see preview</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 divide-y divide-border">
                  {[
                    { label: 'WRITE IN ANY LANGUAGE', icon: Globe2 },
                    { label: 'WRITE NATURALLY', icon: PenLine },
                    { label: 'ADD EMOTION', icon: Smile },
                    { label: 'POLISH THE SCRIPT', icon: Sparkles },
                  ].map(({ label, icon: Icon }) => (
                    <button key={label} className="flex h-14 w-full items-center justify-between gap-4 text-left text-[12px] font-extrabold tracking-wide text-text-primary">
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon size={18} className="flex-shrink-0 text-text-primary" />
                        <span className="truncate">{label}</span>
                      </span>
                      <ChevronDown size={20} className="flex-shrink-0 text-text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {actorModalOpen && (
          <div className="fixed inset-0 z-[1200] bg-black/75 p-4 sm:p-6 flex items-center justify-center animate-fade-in" onClick={() => setActorModalOpen(false)}>
            <div className="flex h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[18px] bg-bg-card shadow-neo-lg" onClick={(event) => event.stopPropagation()}>
              <header className="flex h-[58px] flex-shrink-0 items-center justify-between border-b border-border px-6">
                <h2 className="font-display text-[22px] font-extrabold text-accent">Choose Actor</h2>
                <button onClick={() => setActorModalOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer">
                  <X size={24} />
                </button>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="min-h-0 overflow-y-auto rounded-[16px] bg-bg-surface p-5">
                  <h3 className="text-[16px] font-extrabold text-text-primary">Filters</h3>
                  <div className="mt-4 h-px bg-border" />
                  <label className="mt-5 flex h-11 items-center gap-3 rounded-[10px] border border-accent bg-bg-card px-3 text-text-secondary">
                    <Search size={18} />
                    <input placeholder="Search..." className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-medium text-text-primary placeholder:text-text-secondary focus:shadow-none" />
                  </label>
                  {['Gender', 'Age', 'Hair Style', 'Ethnicity', 'Language', 'Physique', 'Hair Color'].map((filter) => (
                    <div key={filter} className="mt-5">
                      <p className="mb-2 text-[13px] font-extrabold text-text-primary">{filter}</p>
                      <button className="flex h-11 w-full items-center justify-between rounded-[10px] border border-border bg-bg-card px-4 text-left text-[13px] font-medium text-text-primary shadow-sm">
                        All {filter === 'Gender' ? 'Genders' : filter === 'Age' ? 'Ages' : `${filter}s`}
                        <ChevronDown size={18} className="text-text-secondary" />
                      </button>
                    </div>
                  ))}
                </aside>

                <main className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
                    {actors.map((actor, index) => {
                      const selected = selectedActorUrl === actor.photoUrl
                      const age = index % 3 === 2 ? 'Teen' : 'Adult'
                      return (
                        <button
                          key={`modal-${actor.id}`}
                          onClick={() => setSelectedActorUrl(actor.photoUrl)}
                          className={`relative aspect-[4/5] overflow-hidden rounded-[12px] border bg-bg-card text-left shadow-neo-sm transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent ring-2 ring-accent/20' : 'border-border'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
                          <span className="absolute left-4 bottom-9 text-[16px] font-extrabold text-white drop-shadow">{actor.name}</span>
                          <span className="absolute left-4 bottom-4 text-[13px] font-semibold text-white/85 drop-shadow">{age}</span>
                          {selected && (
                            <span className="absolute right-3 top-3 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
                              <Check size={17} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </main>
              </div>
            </div>
          </div>
        )}

        {voiceModalOpen && (
          <div className="fixed inset-0 z-[1200] bg-black/75 p-4 sm:p-6 flex items-center justify-center animate-fade-in" onClick={() => setVoiceModalOpen(false)}>
            <div className="flex h-[88vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-[18px] bg-bg-card shadow-neo-lg" onClick={(event) => event.stopPropagation()}>
              <header className="flex flex-shrink-0 items-start justify-between gap-6 px-6 py-6">
                <div>
                  <h2 className="font-display text-[24px] font-extrabold text-text-primary">Choose a Voice</h2>
                  <p className="mt-3 text-[16px] font-medium text-text-primary">Browse and select from the ElevenLabs voice library</p>
                </div>
                <button onClick={() => setVoiceModalOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer">
                  <X size={24} />
                </button>
              </header>

              <div className="flex-shrink-0 px-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
                  <label className="flex h-12 items-center gap-3 rounded-[10px] border border-accent bg-bg-card px-4 text-text-secondary">
                    <Search size={20} />
                    <input placeholder="Search voices by name, description..." className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium text-text-primary placeholder:text-text-secondary focus:shadow-none" />
                  </label>
                  <button className="flex h-12 items-center justify-between rounded-[10px] border border-border bg-bg-card px-4 text-[15px] font-extrabold text-text-primary shadow-sm">
                    Most Cloned <ChevronDown size={18} className="text-text-secondary" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { label: 'All Categories', icon: Filter },
                    { label: 'All Genders' },
                    { label: 'All Ages' },
                    { label: 'All Languages' },
                  ].map(({ label, icon: Icon }) => (
                    <button key={label} className="flex h-11 items-center gap-3 rounded-[10px] border border-border bg-bg-card px-4 text-[15px] font-medium text-text-primary shadow-sm">
                      {Icon && <Icon size={18} />}
                      {label}
                      <ChevronDown size={17} className="text-text-secondary" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="overflow-hidden rounded-[10px] border border-border bg-bg-card">
                  <div className="grid min-w-[980px] grid-cols-[110px_250px_310px_minmax(260px,1fr)_230px] border-b border-border bg-bg-card px-3 py-4 text-[14px] font-extrabold text-text-primary">
                    <span>Preview</span>
                    <span>Voice</span>
                    <span>Attributes</span>
                    <span>Description</span>
                    <span>Languages</span>
                  </div>
                  <div className="overflow-x-auto">
                    {[
                      { id: 'mark', name: 'Mark - Natural Conversations', type: 'Conversational', attrs: ['MALE', 'YOUNG', 'AMERICAN', 'CASUAL'], desc: 'A casual, young-adult speaking in a natural tone...', langs: ['🇺🇸 ENGLISH (AMERICAN)', '+18'] },
                      { id: 'spuds', name: 'Spuds Oxley - Wise and Approachable', type: 'Conversational', attrs: ['MALE', 'OLD', 'AMERICAN', 'GENTLE'], desc: 'Grandpa Spuds Oxley - A friendly grandparent voice...', langs: ['🇺🇸 ENGLISH (AMERICAN)', '🇪🇸 SPANISH (LATIN)', '+13'] },
                      { id: 'niraj', name: 'Niraj- Romantic and Smooth', type: 'Narrative Story', attrs: ['MALE', 'MIDDLE AGED', 'STANDARD', 'DEEP'], desc: 'Niraj is the pen name of a veteran Indian narrator...', langs: ['🇮🇳 HINDI', '+13'] },
                      { id: 'james', name: 'James - Husky, Engaging and Bold', type: 'Narrative Story', attrs: ['MALE', 'MIDDLE AGED', 'AMERICAN', 'DEEP'], desc: 'James - Husky & Engaging - A slightly deep voice...', langs: ['🇺🇸 ENGLISH (AMERICAN)', '+11'] },
                      { id: 'adam', name: 'Adam - American, Dark and Tough', type: 'Characters Animation', attrs: ['MALE', 'MIDDLE AGED', 'AMERICAN', 'INTENSE'], desc: 'Adam - Brooding, Dark, Tough American delivery...', langs: ['🇺🇸 ENGLISH (AMERICAN)', '+13'] },
                      { id: 'michael', name: 'Michael C. Vincent - Confident, Expressive', type: 'Narrative Story', attrs: ['MALE', 'MIDDLE AGED', 'AMERICAN', 'CONFIDENT'], desc: 'Michael C. Vincent - A confident and expressive voice...', langs: ['🇺🇸 ENGLISH (AMERICAN)', '🇧🇷 PORTUGUESE (BRAZILIAN)', '+10'] },
                    ].map((voice) => {
                      const selected = selectedVoiceId === voice.id
                      return (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoiceId(voice.id)}
                          className={`grid min-w-[980px] grid-cols-[110px_250px_310px_minmax(260px,1fr)_230px] items-center border-b border-border px-3 py-4 text-left transition-colors hover:bg-accent/5 ${selected ? 'bg-accent/10' : 'bg-bg-card'}`}
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-full border-4 border-fg/[0.10] bg-bg-card text-text-primary"><Play size={16} fill="currentColor" /></span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-extrabold leading-tight text-text-primary">{voice.name}</span>
                            <span className="mt-1 block text-[13px] font-medium text-text-secondary">{voice.type}</span>
                          </span>
                          <span className="flex flex-wrap gap-2">
                            {voice.attrs.map((attr) => <span key={attr} className="rounded-full bg-fg/[0.07] px-3 py-1 text-[11px] font-extrabold text-text-primary">{attr}</span>)}
                          </span>
                          <span className="truncate text-[14px] font-medium text-text-primary">{voice.desc}</span>
                          <span className="flex flex-wrap gap-2">
                            {voice.langs.map((lang) => <span key={lang} className="rounded-full bg-fg/[0.07] px-3 py-1 text-[11px] font-extrabold text-text-primary">{lang}</span>)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <footer className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5">
                <div>
                  <div className="flex items-center gap-3 text-[14px] font-medium text-text-primary">
                    Show
                    <button className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 font-extrabold shadow-sm">25 <ChevronDown size={16} /></button>
                    per page
                  </div>
                  <p className="mt-3 text-[14px] font-medium text-text-primary">Showing 25 voices on this page • More available</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[14px] font-medium text-text-primary">Page 1</span>
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-card text-text-secondary shadow-sm"><ChevronLeft size={18} /></button>
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-card text-text-primary shadow-sm"><ChevronRight size={18} /></button>
                </div>
              </footer>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'broll-voiceover') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-2 pt-2 pb-3 sm:px-4">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-border px-3 sm:h-[56px] sm:gap-5 sm:px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[19px] font-extrabold tracking-tight text-text-primary sm:text-[22px]">Voice Over Ad</h1>
          </header>

          <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
            {brollStep === 'choice' ? (
              <div className="w-full max-w-[520px] space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setBrollFlow('ai')
                    setBrollStep('goals')
                  }}
                  className="group flex w-full items-center gap-5 rounded-[22px] border border-border bg-bg-surface px-6 py-5 text-left transition-all hover:border-accent/70 hover:bg-accent/5 hover:shadow-neo-sm"
                >
                  <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-[12px] bg-accent text-white">
                    <Bot size={38} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[20px] font-extrabold leading-tight text-text-primary">Generate with AI</span>
                    <span className="mt-2 block text-[15px] font-medium leading-relaxed text-text-primary">Let HeyOz create a script & storyboard for you.</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrollFlow('manual')
                    setBrollStep('products')
                    setSelectedBrollGoal('')
                    setSelectedBrollAudience('')
                    setCustomBrollAudience('')
                    setSelectedBrollProduct('')
                    setSelectedBrollActorUrl('')
                    setBrollAspectRatio('portrait')
                    setBrollInstructions('')
                    setManualBrollScript('')
                  }}
                  className="group flex w-full items-center gap-5 rounded-[22px] border border-border bg-bg-surface px-6 py-5 text-left transition-all hover:border-accent/70 hover:bg-accent/5 hover:shadow-neo-sm"
                >
                  <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-[12px] bg-fg/[0.10] text-text-primary">
                    <Pencil size={32} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[20px] font-extrabold leading-tight text-text-primary">Write manually</span>
                    <span className="mt-2 block text-[15px] font-medium leading-relaxed text-text-primary">Already have a script? Use it to create a storyboard.</span>
                  </span>
                </button>
              </div>
            ) : brollStep === 'goals' ? (
              <div className="w-full max-w-[820px] animate-fade-in">
                <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px]">
                  What&apos;s the main goal of your ad?
                </h2>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {BROLL_GOALS.map((goal) => {
                    const Icon = goal.icon
                    const selected = selectedBrollGoal === goal.id

                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setSelectedBrollGoal(goal.id)}
                        className={`group relative flex min-h-[76px] items-center gap-4 rounded-[12px] border px-4 py-3 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-[10px] transition-colors ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                          <Icon size={21} strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-extrabold leading-tight text-text-primary">{goal.title}</span>
                          <span className="mt-1 block truncate text-[13px] font-medium text-text-secondary">{goal.desc}</span>
                        </span>
                        {selected ? (
                          <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-accent text-white">
                            <Check size={15} strokeWidth={3} />
                          </span>
                        ) : (
                          <Info size={18} className="flex-shrink-0 text-text-primary/75" />
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedBrollGoal('write-your-own')}
                    className={`flex min-h-[70px] w-full max-w-[410px] items-center gap-4 rounded-[12px] border px-4 py-3 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                      selectedBrollGoal === 'write-your-own'
                        ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                        : 'border-border bg-bg-surface'
                    }`}
                  >
                    <span className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-[10px] ${selectedBrollGoal === 'write-your-own' ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                      <Pencil size={20} strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold leading-tight text-text-primary">Write your own</span>
                      <span className="mt-1 block truncate text-[13px] font-medium text-text-secondary">Nothing fits? Describe your ad&apos;s purpose</span>
                    </span>
                    {selectedBrollGoal === 'write-your-own' && (
                      <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-accent text-white">
                        <Check size={15} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setBrollStep('audience')}
                    disabled={!selectedBrollGoal}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-7 text-[14px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : brollStep === 'audience' ? (
              <div className="w-full max-w-[640px] animate-fade-in">
                <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px]">
                  Who are you targeting with this ad?
                </h2>

                <div className="mt-7 border-t border-border pt-3">
                  <div className="space-y-3">
                    {BROLL_AUDIENCES.map((audience) => {
                      const Icon = audience.icon
                      const selected = selectedBrollAudience === audience.id

                      return (
                        <button
                          key={audience.id}
                          type="button"
                          onClick={() => {
                            setSelectedBrollAudience(audience.id)
                            setCustomBrollAudience('')
                          }}
                          className={`flex min-h-[70px] w-full items-center gap-4 rounded-[12px] border px-4 py-3 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                            selected
                              ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                              : 'border-border bg-bg-surface'
                          }`}
                        >
                          <span className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-[10px] ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                            <Icon size={20} strokeWidth={2.1} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-extrabold leading-tight text-text-primary">{audience.title}</span>
                            <span className="mt-1 block truncate text-[13px] font-medium text-text-primary">{audience.desc}</span>
                          </span>
                          {selected ? (
                            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-accent text-white">
                              <Check size={15} strokeWidth={3} />
                            </span>
                          ) : (
                            <Info size={18} className="flex-shrink-0 text-text-primary/75" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-5">
                  <label className="block text-[14px] font-extrabold text-text-primary" htmlFor="broll-custom-audience">
                    Or describe your own audience
                  </label>
                  <textarea
                    id="broll-custom-audience"
                    value={customBrollAudience}
                    onChange={(event) => {
                      setCustomBrollAudience(event.target.value)
                      setSelectedBrollAudience('')
                    }}
                    placeholder="e.g., Busy working professionals aged 25-40 who struggle with time management and want quick, practical solutions..."
                    className="mt-3 min-h-[94px] w-full resize-none rounded-[12px] border border-border bg-bg-surface px-4 py-3 text-[15px] font-medium leading-relaxed text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setBrollStep('products')}
                    disabled={!selectedBrollAudience && !customBrollAudience.trim()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-7 text-[14px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : brollStep === 'products' ? (
              <div className="w-full max-w-[850px] animate-fade-in">
                <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
                  <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px] md:col-start-1 md:text-right">
                    What are we promoting today?
                  </h2>
                  <div className="space-y-7 pt-1 text-center text-[15px] font-semibold text-text-primary md:text-left">
                    <p>0 / 5 (max)</p>
                    <p>{selectedBrollProduct ? 1 : 0} / 5 selected</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col justify-center gap-5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSelectedBrollProduct(selectedBrollProduct ? '' : 'unwejnw')}
                    className={`relative h-[250px] w-full max-w-[280px] overflow-hidden rounded-[16px] border bg-bg-card text-left transition-all hover:border-accent/70 hover:bg-accent/5 sm:w-[250px] ${
                      selectedBrollProduct
                        ? 'border-2 border-accent ring-4 ring-accent/15 shadow-neo'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex h-[148px] items-start justify-center overflow-hidden bg-bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=420&q=80"
                        alt="unwejnw"
                        className="h-full w-[150px] object-cover object-top"
                      />
                    </div>
                    <span className="absolute bottom-5 left-5 max-w-[calc(100%-40px)] truncate text-[16px] font-extrabold text-text-primary">
                      unwejnw
                    </span>
                    {selectedBrollProduct && (
                      <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-accent text-white shadow-sm">
                        <Check size={18} strokeWidth={3} />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="flex h-[250px] w-full max-w-[280px] flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-border-strong bg-bg-card px-6 text-center transition-colors hover:border-accent/70 hover:bg-accent/5 sm:w-[250px]"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-fg/[0.08] text-text-primary">
                      <Plus size={24} strokeWidth={2.2} />
                    </span>
                    <span className="mt-5 text-[18px] font-extrabold text-text-primary">Add new product</span>
                    <span className="mt-1 text-[13px] font-medium text-text-secondary">Create a new product</span>
                  </button>
                </div>

                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setBrollStep('images')}
                    disabled={!selectedBrollProduct}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-7 text-[15px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : brollStep === 'images' ? (
              <div className="w-full max-w-[920px] animate-fade-in">
                <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
                  <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px] md:col-start-1 md:text-right">
                    Select image(s) for your ad
                  </h2>
                  <p className="pt-1 text-center text-[15px] font-semibold text-text-primary md:text-left">0 / 14 (max)</p>
                </div>

                <div className="mt-8 flex flex-col justify-center gap-5 sm:flex-row">
                  <button
                    type="button"
                    className="flex h-[180px] w-full max-w-[220px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-border-strong bg-bg-card px-5 text-center transition-colors hover:border-accent/70 hover:bg-accent/5"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-fg/[0.08] text-text-primary">
                      <Plus size={24} strokeWidth={2.2} />
                    </span>
                    <span className="mt-5 text-[15px] font-extrabold text-text-primary">Add from library</span>
                  </button>

                  {brollFlow === 'ai' && (
                    <button
                      type="button"
                      className="h-[180px] w-full max-w-[220px] overflow-hidden rounded-[14px] border border-border bg-bg-card transition-all hover:border-accent/70"
                    >
                      <div className="flex h-full items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=420&q=80"
                          alt="Selected product"
                          className="h-full w-[150px] object-cover object-top"
                        />
                      </div>
                    </button>
                  )}
                </div>

                <div className="mt-10">
                  <h3 className="text-center font-display text-[18px] font-extrabold text-text-primary">
                    Choose Actors <span className="font-semibold text-text-secondary">(Optional)</span>
                  </h3>

                  <div className="mx-auto mt-5 max-w-[760px] rounded-[10px] bg-fg/[0.08] p-1 grid grid-cols-2">
                    <button onClick={() => setActorSource('heyoz')} className={`h-9 rounded-[8px] text-[14px] font-extrabold transition ${actorSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80 hover:text-text-primary'}`}>HeyOz Actors</button>
                    <button onClick={() => setActorSource('mine')} className={`h-9 rounded-[8px] text-[14px] font-extrabold transition ${actorSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80 hover:text-text-primary'}`}>My Actors</button>
                  </div>

                  <div className="mx-auto mt-5 grid max-w-[760px] grid-cols-3 gap-3 sm:grid-cols-6">
                    <button onClick={() => setActorModalOpen(true)} className="aspect-[9/16] rounded-[10px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center gap-1.5 text-text-primary hover:border-accent/70 hover:bg-accent/5 transition-colors">
                      <LayoutPanelLeft size={23} />
                      <span className="text-[11px] font-semibold">Show All</span>
                    </button>

                    {actors.slice(0, 5).map((actor) => {
                      const selected = selectedBrollActorUrl === actor.photoUrl
                      return (
                        <button
                          key={`broll-actor-${actor.id}`}
                          type="button"
                          onClick={() => setSelectedBrollActorUrl(selected ? '' : actor.photoUrl)}
                          className={`relative aspect-[9/16] overflow-hidden rounded-[10px] border bg-bg-card transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 h-full w-full object-cover" />
                          {selected && (
                            <span className="absolute right-1.5 top-1.5 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setBrollStep(brollFlow === 'manual' ? 'manual-script' : 'configure')}
                    className="inline-flex h-11 items-center justify-center rounded-[10px] bg-fg/[0.08] px-5 text-[14px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep(brollFlow === 'manual' ? 'manual-script' : 'configure')}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[14px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : brollStep === 'configure' ? (
              <div className="w-full max-w-[760px] animate-fade-in">
                <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px]">
                  Configure your script
                </h2>

                <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div>
                    <label className="mb-2 block text-[15px] font-extrabold text-text-primary" htmlFor="broll-duration">
                      Video Duration
                    </label>
                    <button
                      id="broll-duration"
                      type="button"
                      className="flex h-12 w-full items-center justify-between rounded-[10px] border border-border bg-bg-surface px-4 text-left text-[16px] font-medium text-text-primary transition hover:border-accent/60"
                    >
                      30 seconds
                      <ChevronDown size={18} className="text-text-secondary" />
                    </button>
                    <p className="mt-3 flex gap-2 text-[13px] font-medium leading-relaxed text-text-primary">
                      <Info size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Duration is approximate and may vary slightly based on content pacing and storyboard.</span>
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-[15px] font-extrabold text-text-primary">Video Aspect Ratio</p>
                    <div className="inline-flex rounded-[10px] bg-fg/[0.08] p-1">
                      {[
                        { id: 'portrait', label: 'Portrait' },
                        { id: 'landscape', label: 'Landscape' },
                        { id: 'square', label: 'Square' },
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => setBrollAspectRatio(ratio.id as 'portrait' | 'landscape' | 'square')}
                          className={`h-10 rounded-[8px] px-4 text-[15px] font-extrabold transition ${
                            brollAspectRatio === ratio.id
                              ? 'bg-bg-card text-text-primary shadow-neo-sm'
                              : 'text-text-primary/75 hover:text-text-primary'
                          }`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7">
                  <label className="mb-2 flex items-center gap-2 text-[15px] font-extrabold text-text-primary" htmlFor="broll-instructions">
                    Additional Instructions (Optional)
                    <Info size={16} className="text-text-primary/75" />
                  </label>
                  <textarea
                    id="broll-instructions"
                    value={brollInstructions}
                    onChange={(event) => setBrollInstructions(event.target.value)}
                    placeholder={`Add your creative spin to make this ad uniquely yours...\n\nExamples:\n• "Make it feel like a dramatic movie trailer with intense pauses"\n• "Include references to our premium materials and handmade process"\n• "Use a sarcastic, deadpan humor style throughout"\n• "Make the visual hook feel like a 90s VHS commercial"`}
                    className="min-h-[170px] w-full resize-none rounded-[10px] border border-border bg-bg-surface px-4 py-4 text-[15px] font-medium leading-relaxed text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </div>

                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-3 rounded-[10px] bg-accent px-7 text-[15px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                  >
                    <Check size={17} strokeWidth={3} />
                    Generate Voiceover Script
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[720px] animate-fade-in">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-[22px] font-extrabold tracking-tight text-text-primary">
                      Edit your script
                    </h2>
                    <p className="mt-2 max-w-[560px] text-[14px] font-medium leading-relaxed text-text-secondary">
                      This will be the crux of your ad. Make sure to spend time here perfecting it before creating your storyboard. (Minimum 50 characters)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 pt-1 text-[14px] font-extrabold text-accent transition hover:brightness-95"
                  >
                    <Sparkles size={16} />
                    Generate Script with AI
                  </button>
                </div>

                <div className="overflow-hidden rounded-[14px] border border-border bg-bg-card">
                  <div className="flex h-12 flex-wrap items-center gap-5 border-b border-border px-4 text-[13px] font-bold text-text-secondary">
                    <button type="button" className="inline-flex items-center gap-2 hover:text-text-primary"><Smile size={16} /> Add Expression <ChevronDown size={14} /></button>
                    <button type="button" className="inline-flex items-center gap-2 hover:text-text-primary"><Timer size={16} /> Add Pause <ChevronDown size={14} /></button>
                    <button type="button" className="inline-flex items-center gap-2 hover:text-text-primary"><SlidersHorizontal size={16} /> Voice Settings</button>
                  </div>

                  <textarea
                    value={manualBrollScript}
                    onChange={(event) => setManualBrollScript(event.target.value)}
                    className="min-h-[240px] w-full resize-none border-0 bg-bg-card px-4 py-4 text-[15px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-secondary focus:ring-0"
                    placeholder="Write or paste your voiceover script here..."
                  />

                  <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-text-dim">
                      <Wand2 size={16} className="text-accent" />
                      Refine your script...e.g. 'Add humor to my script'
                    </span>
                    <button
                      type="button"
                      disabled={!manualBrollScript.trim()}
                      className="h-9 rounded-[10px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Refine
                    </button>
                  </div>

                  <div className="border-t border-border px-4 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[14px] font-medium text-text-primary">Voice:</span>
                      {[
                        'Mark - Nat...',
                        'Spuds Oxle...',
                        'Niraj- Rom...',
                        'James - Hu...',
                        'Adam - Am...',
                        'Michael C. ...',
                        'Peter',
                        'Christophe...',
                      ].map((voice, index) => (
                        <button
                          key={voice}
                          type="button"
                          onClick={() => setSelectedVoiceId(voice)}
                          className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-extrabold transition hover:border-accent/70 ${
                            index === 0
                              ? 'border-accent bg-accent/10 text-text-primary'
                              : 'border-border bg-bg-surface text-text-primary'
                          }`}
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-full border-4 border-fg/[0.10] bg-bg-card">
                            <Play size={12} fill="currentColor" />
                          </span>
                          {voice}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVoiceModalOpen(true)}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                      >
                        <ListMusic size={16} className="text-accent" />
                        See all voices
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-3 rounded-[10px] bg-[#ff987f] px-7 text-[15px] font-extrabold text-white shadow-sm transition hover:brightness-105"
                  >
                    <ListMusic size={18} />
                    Generate Voiceover
                    <Gem size={17} fill="currentColor" />
                    1
                  </button>
                </div>
              </div>
            )}

            <button className="absolute bottom-6 right-6 grid h-16 w-16 place-items-center rounded-full bg-[#e75a00] text-white shadow-neo-solid hover:brightness-105 transition" aria-label="Chat">
              <MessageSquare size={30} fill="currentColor" />
            </button>
          </main>
        </section>
      </div>
    )
  }

  if (mode === 'video-generator') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-2 pt-2 pb-3 sm:px-4">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-border px-3 sm:h-[56px] sm:gap-5 sm:px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[19px] font-extrabold tracking-tight text-text-primary sm:text-[22px]">Custom Video Creator</h1>
          </header>

          <main className="relative flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:py-8">
            {customVideoStep === 'models' ? (
              <div className="w-full max-w-[840px] animate-fade-in">
                <h2 className="text-center font-display text-[20px] font-extrabold tracking-tight text-text-primary sm:text-[23px]">
                  How do you want to generate the video?
                </h2>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { id: 'image', title: 'Image to Video', desc: 'Animate a reference image into a video', icon: ImageIcon },
                    { id: 'text', title: 'Text to Video', desc: 'Generate a video purely from a text prompt', icon: Type },
                  ].map((option) => {
                    const Icon = option.icon
                    const selected = customVideoType === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setCustomVideoType(option.id as 'image' | 'text')}
                        className={`flex min-h-[92px] items-center gap-4 rounded-[14px] border px-5 py-4 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-2 border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-[12px] ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                          <Icon size={22} strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[17px] font-extrabold leading-tight text-text-primary">{option.title}</span>
                          <span className="mt-2 block text-[14px] font-medium leading-relaxed text-text-primary">{option.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <h3 className="mt-8 text-[16px] font-extrabold text-text-primary">Select models to generate video</h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {CUSTOM_VIDEO_MODELS.map((model) => {
                    const selected = selectedCustomVideoModel === model.id

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedCustomVideoModel(model.id)}
                        className={`flex min-h-[94px] items-center gap-4 rounded-[14px] border px-5 py-4 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-2 border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border ${selected ? 'border-accent bg-accent text-white' : 'border-text-secondary bg-transparent'}`}>
                          {selected && <Check size={16} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-extrabold leading-tight text-text-primary">{model.name}</span>
                          <span className="mt-2 block text-[14px] font-medium leading-relaxed text-text-primary">{model.desc}</span>
                        </span>
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-fg/[0.10] px-2.5 py-1 text-[13px] font-extrabold text-text-primary">
                          <Gem size={16} className="text-accent" fill="currentColor" />
                          {model.tokens}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setCustomVideoStep('generate')}
                    disabled={!selectedCustomVideoModel}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-8 text-[15px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-full w-full max-w-[760px] animate-fade-in flex-col justify-center self-stretch py-8">
                <div className="text-center">
                  <h2 className="font-display text-[26px] font-extrabold tracking-tight text-text-primary sm:text-[30px]">
                    Generate a Video
                  </h2>
                  <p className="mt-3 text-[16px] font-medium text-text-primary">
                    Write your direction · configure · generate
                  </p>
                </div>

                <div className="mt-8 overflow-hidden rounded-[18px] border border-border bg-bg-surface shadow-neo-sm">
                  <textarea
                    value={customVideoPrompt}
                    onChange={(event) => setCustomVideoPrompt(event.target.value)}
                    placeholder="Describe the video you want to generate..."
                    className="min-h-[190px] w-full resize-none bg-transparent px-6 py-5 text-[17px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-secondary sm:min-h-[220px]"
                  />
                  <div className="flex min-h-[58px] flex-wrap items-center gap-5 border-t border-border px-5 py-3">
                    {['Portrait', '720p', '5s', 'Standard'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-text-primary transition hover:text-accent"
                      >
                        {label}
                        <ChevronDown size={15} />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent/12 text-accent transition hover:bg-accent/18"
                      aria-label="Audio"
                    >
                      <Volume2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-accent text-[17px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Wand2 size={20} />
                  Generate Video
                  <span className="opacity-80">·</span>
                  <Gem size={18} fill="currentColor" />
                  {selectedCustomVideoModelDetails?.tokens ?? 15}
                </button>
              </div>
            )}

            <button className="absolute bottom-6 right-6 grid h-16 w-16 place-items-center rounded-full bg-[#e75a00] text-white shadow-neo-solid hover:brightness-105 transition" aria-label="Chat">
              <MessageSquare size={30} fill="currentColor" />
            </button>
          </main>
        </section>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-[920px] mx-auto pb-12 pt-2">
      <h1 className="font-display text-[34px] font-extrabold tracking-tight text-text-primary mb-9">
        What will you create?
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-8">
        {VIDEO_TYPES.map((type) => {
          const isAvailable = AVAILABLE_VIDEO_TYPE_IDS.has(type.id)

          return (
            <button
              key={type.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => {
                if (!isAvailable) return
                if (type.id === 'realistic-actor') setMode('realistic-actor')
                if (type.id === 'broll-voiceover') setMode('broll-voiceover')
                if (type.id === 'video-generator') setMode('video-generator')
              }}
              className={`group relative h-[380px] overflow-hidden rounded-[22px] border border-border bg-bg-card text-left shadow-neo transition-all ${
                isAvailable
                  ? 'hover:-translate-y-0.5 hover:shadow-neo-lg'
                  : 'cursor-not-allowed opacity-60 grayscale-[0.25]'
              }`}
            >
            <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden">
              {type.images.map((src, index) => (
                <span
                  key={`${type.id}-${src}-${index}`}
                  className={`absolute overflow-hidden rounded-[8px] bg-bg-elevated shadow-neo-sm ${IMAGE_POSITIONS[index]}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </span>
              ))}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#f03b25] from-[37%] via-[#ef5b48]/95 via-[56%] to-transparent" />
            {!isAvailable && (
              <div className="absolute right-5 top-5 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-extrabold text-accent shadow-neo-sm">
                Coming soon
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-8">
              <ArrowUpRight size={28} className={`absolute right-8 bottom-10 text-white/95 transition-transform ${isAvailable ? 'group-hover:scale-110' : ''}`} />
              <h2 className="font-display text-[26px] font-extrabold leading-tight text-white pr-12">
                {type.title}
              </h2>
              <p className="mt-3 max-w-[300px] text-[14px] font-medium leading-relaxed text-white/82 pr-8">
                {type.desc}
              </p>
            </div>
          </button>
          )
        })}
      </div>
    </div>
  )
}
