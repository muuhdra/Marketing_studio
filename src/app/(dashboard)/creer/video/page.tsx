'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  ImagePlus,
  FilePlus2,
  RotateCcw,
  Bot,
  LayoutGrid,
  Check,
  ChevronDown,
  Download,
  Filter,
  Gem,
  Globe,
  Handshake,
  Image as ImageIcon,
  Images,
  Info,
  LayoutPanelLeft,
  Lightbulb,
  ListChecks,
  ListMusic,
  Maximize2,
  Megaphone,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Smile,
  Sparkles,
  ShoppingCart,
  Timer,
  Lock,
  Type,
  Upload,
  UserPlus,
  UserRound,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { actionListAvatarsForPicker, actionUploadTempImage, actionUploadTempVideo } from '@/lib/actions/avatar-assets'
import { actionListProducts, actionUploadProductImage, actionCreateProduct, actionDeleteProduct, type ProductDTO } from '@/lib/actions/products'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { actionGenerateScript, actionGenerateSpeech, actionSubmitVideo, actionGetVideoStatus, actionIsVoiceCloneEnabled, actionGenerateImage } from '@/lib/actions/ai'
import { VOICE_PROFILES, MINIMAX_EMOTIONS, VOICE_LANGUAGES } from '@/lib/ai/voice-catalog'
import { persistOutput } from '@/lib/actions/outputs'
import { actionSubmitClone, actionGetCloneStatus } from '@/lib/actions/clone'
import { useToast } from '@/lib/stores/toastStore'
import { useSettings } from '@/lib/stores/settingsStore'
import { useBrand } from '@/lib/stores/brandStore'
import { BrandContextToggle } from '@/components/features/creer/BrandContextToggle'
import { StepSlider } from '@/components/features/creer/WizardKit'
import { AssetPickerModal } from '@/components/features/creer/AssetPicker'

// Ordre des étapes dans la pile glissante du B-Roll Voice Over (flux IA = adjacent ; flux manuel saute les étapes IA).
const BROLL_STEP_ORDER = ['choice', 'goals', 'audience', 'products', 'images', 'actors', 'configure', 'manual-script'] as const

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
    id: 'clone-studio',
    title: 'Clonage studio',
    desc: 'Transfert de mouvement : ton personnage reproduit les actions d\'une vidéo de référence (motion control).',
    images: [
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfa78?auto=format&fit=crop&w=360&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=360&q=80',
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
]

const AVAILABLE_VIDEO_TYPE_IDS = new Set(['realistic-actor', 'broll-voiceover', 'video-generator', 'clone-studio'])

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

// Voix réelles (MiniMax via VOICE_PROFILES) — `voice` = voice_id fournisseur utilisé par le TTS.
const VOICES = VOICE_PROFILES.map((profile) => ({
  id: profile.id,
  name: profile.label,
  gender: profile.gender === 'f' ? 'Female' : profile.gender === 'm' ? 'Male' : 'Neutral',
  voice: profile.voice,
  tags: profile.tags,
  engine: profile.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs',
  recommended: profile.id === 'lively',
}))

const BROLL_GOALS = [
  { id: 'drive-sales', title: 'Drive Sales', desc: 'Get people to buy now', icon: ShoppingCart, details: 'Pousse à l\'achat immédiat avec une offre claire et un appel à l\'action fort. Idéal pour les promos, le déstockage et le retargeting.' },
  { id: 'explain-features', title: 'Explain Features', desc: 'Show how your product works', icon: ListChecks, details: 'Met en avant le fonctionnement et les bénéfices concrets de ton produit, fonctionnalité par fonctionnalité.' },
  { id: 'build-awareness', title: 'Build Awareness', desc: 'Introduce your brand to new audiences', icon: Megaphone, details: 'Fait découvrir ta marque à de nouvelles audiences avec un message mémorable et un ton engageant.' },
  { id: 'announce-launch', title: 'Announce Launch', desc: 'Tell people about something new', icon: Rocket, details: 'Crée l\'attente et l\'engouement autour d\'un nouveau produit, d\'une nouveauté ou d\'un événement à venir.' },
  { id: 'solve-problem', title: 'Solve a Problem', desc: 'Show before/after transformation', icon: Wand2, details: 'Montre le problème de ton audience puis la transformation apportée par ton produit (avant / après).' },
  { id: 'generate-leads', title: 'Generate Leads', desc: 'Get signups, downloads, or contact info', icon: UserPlus, details: 'Incite à s\'inscrire, télécharger ou laisser ses coordonnées en échange d\'une valeur concrète.' },
  { id: 'showcase-use-case', title: 'Showcase Use Case', desc: 'Demonstrate real-world application', icon: Lightbulb, details: 'Démontre une application concrète et réelle de ton produit dans la vie quotidienne de tes clients.' },
  { id: 'build-trust', title: 'Build Trust', desc: 'Establish credibility and overcome...', icon: Handshake, details: 'Renforce ta crédibilité avec des preuves, avis et témoignages pour lever les objections et rassurer.' },
]

const BROLL_AUDIENCES = [
  {
    id: 'remote-architect',
    title: 'Mid-30s Remote Architect Seeking Polished Comfort',
    desc: 'Male, 34-37, $120k income, Austin, TX, Homeowner',
    icon: UserRound,
    details: 'Homme, 34-37 ans, ~120k$/an, propriétaire à Austin (TX). Architecte en télétravail, exigeant sur la qualité et l\'esthétique. Recherche un confort haut de gamme et soigné, sensible au design et aux finitions.',
  },
  {
    id: 'social-organizer',
    title: 'Early-40s Social Organizer Prioritizing Ease',
    desc: 'Female, 40-43, $150k household income, Suburban Atlanta, Parent o...',
    icon: UserRound,
    details: 'Femme, 40-43 ans, foyer ~150k$/an, banlieue d\'Atlanta, parent. Organise la vie sociale et familiale ; valorise la simplicité et le gain de temps. Sensible aux solutions pratiques qui facilitent le quotidien.',
  },
  {
    id: 'sustainable-enthusiast',
    title: 'Late-30s Sustainable Enthusiast Auditing Consumption',
    desc: 'Female, 36-39, $90k income, Portland, OR, Environmentally conscious',
    icon: Zap,
    details: 'Femme, 36-39 ans, ~90k$/an, Portland (OR), très engagée pour l\'environnement. Analyse sa consommation, privilégie les marques durables et transparentes. Sensible à l\'éthique, à la provenance et à l\'impact.',
  },
  {
    id: 'genz-student',
    title: 'Gen-Z Student on a Tight Budget',
    desc: 'Mixed, 18-24, < $25k, Urban campus, Value-driven',
    icon: UserRound,
    details: 'Étudiant·e de 18-24 ans, budget serré (<25k$/an), en ville près du campus. Très actif sur les réseaux, sensible au rapport qualité-prix, aux tendances et aux preuves sociales (avis, créateurs).',
  },
  {
    id: 'startup-founder',
    title: 'Time-Poor Startup Founder',
    desc: 'Male, 30-40, $200k, San Francisco, Decision-maker',
    icon: Rocket,
    details: 'Fondateur de startup, 30-40 ans, ~200k$/an, San Francisco. Manque cruellement de temps, cherche l\'efficacité et le gain de productivité. Convaincu par des messages directs, des chiffres et un ROI clair.',
  },
  {
    id: 'new-parent',
    title: 'New Parent Seeking Simplicity',
    desc: 'Female, 28-34, $75k, Suburban, Sleep-deprived',
    icon: Handshake,
    details: 'Jeune parent, 28-34 ans, ~75k$/an, en banlieue. Fatigué·e et débordé·e, recherche des solutions simples, sûres et rapides. Sensible à la fiabilité, à la sécurité et aux avis d\'autres parents.',
  },
  {
    id: 'fitness-millennial',
    title: 'Fitness-Focused Millennial',
    desc: 'Male, 25-32, $65k, Active lifestyle, Health-conscious',
    icon: Zap,
    details: 'Millennial sportif, 25-32 ans, ~65k$/an, mode de vie actif. Soucieux de sa santé et de sa performance, suit des routines et des marques lifestyle. Réceptif aux résultats visibles et aux contenus aspirationnels.',
  },
  {
    id: 'savvy-retiree',
    title: 'Active Retiree Exploring Hobbies',
    desc: 'Female, 60-68, $55k, Leisure time, Loyal buyer',
    icon: Lightbulb,
    details: 'Retraité·e actif·ve, 60-68 ans, ~55k$/an, beaucoup de temps libre. Curieux·se, fidèle aux marques de confiance, valorise le service client et la clarté. Préfère des explications rassurantes et concrètes.',
  },
]

// Modèles vidéo réellement disponibles (catalogue AIML) — voir MODELS.video.
const CUSTOM_VIDEO_MODELS = [
  { id: 'kling', name: 'Kling 2.1', desc: 'Vidéo cinématique — image ou texte', tokens: 10, engine: 'kling' as const },
  { id: 'seedance', name: 'Seedance 2.0', desc: 'Haute qualité, audio natif + lip-sync', tokens: 15, engine: 'seedance' as const },
]

type Actor = { id: string; name: string; photoUrl: string }
type VideoMode = 'menu' | 'realistic-actor' | 'broll-voiceover' | 'video-generator' | 'clone-studio'

export default function CreerVideoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  // Contexte de marque (Profil de la marque active) → scripts vidéo on-brand.
  // Optionnel : désactivable pour une création libre, sans lien avec la marque/campagne.
  const brand = useBrand()
  // Lien à la campagne = point d'entrée : ON depuis Production, OFF en création libre (dashboard).
  const [useBrandCtx, setUseBrandCtx] = useState(searchParams.get('from') === 'production')
  const brandCtx = () => !useBrandCtx ? '' : [
    brand.name ? `Marque: ${brand.name}` : '',
    brand.communicationTone ? `Ton: ${brand.communicationTone}` : '',
    brand.targetAudience ? `Audience: ${brand.targetAudience}` : '',
    brand.preferredWords.length ? `Mots à privilégier: ${brand.preferredWords.slice(0, 6).join(', ')}` : '',
    brand.wordsToAvoid.length ? `Mots à éviter: ${brand.wordsToAvoid.slice(0, 6).join(', ')}` : '',
    brand.website ? `Site: ${brand.website}` : '',
  ].filter(Boolean).join(' · ')
  const studioName = useSettings((s) => s.studioName)
  const [mode, setMode] = useState<VideoMode>('menu')
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [selectedActorUrl, setSelectedActorUrl] = useState('')
  const [realisticStep, setRealisticStep] = useState(1)
  const [selectedVoiceId, setSelectedVoiceId] = useState('lively')
  const [voiceEngineTab, setVoiceEngineTab] = useState<'minimax' | 'elevenlabs'>('minimax')
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [cloneFileName, setCloneFileName] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState(1)
  const [voicePitch, setVoicePitch] = useState(0)
  const [voiceEmotion, setVoiceEmotion] = useState<(typeof MINIMAX_EMOTIONS)[number]>('neutral')
  // Realistic Actor Video — état fonctionnel
  const [actorScript, setActorScript] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [actorAudioUrl, setActorAudioUrl] = useState('')
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [actorVideoUrl, setActorVideoUrl] = useState('')
  const [actorModalOpen, setActorModalOpen] = useState(false)
  const [actorModalTarget, setActorModalTarget] = useState<'realistic' | 'broll' | 'clone'>('realistic')
  const [actorLightboxOpen, setActorLightboxOpen] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [voiceSearch, setVoiceSearch] = useState('')
  const [voiceGender, setVoiceGender] = useState<'all' | 'f' | 'm' | 'n'>('all')
  const [voiceAge, setVoiceAge] = useState<'all' | 'young' | 'adult' | 'mature'>('all')
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null)
  const [expressionMenuOpen, setExpressionMenuOpen] = useState(false)
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false)
  const [enhanceInstruction, setEnhanceInstruction] = useState('')
  // Clonage studio (transfert de mouvement : vidéo source + image personnage)
  const cloneVideoInputRef = useRef<HTMLInputElement>(null)
  const cloneImageInputRef = useRef<HTMLInputElement>(null)
  const [cloneMotionVideoUrl, setCloneMotionVideoUrl] = useState('')
  const [cloneCharacterImageUrl, setCloneCharacterImageUrl] = useState('')
  const [cloneOrientation, setCloneOrientation] = useState<'video' | 'image'>('video')
  const [uploadingMotion, setUploadingMotion] = useState(false)
  const [uploadingChar, setUploadingChar] = useState(false)
  const [generatingClone, setGeneratingClone] = useState(false)
  const [cloneVideoUrl, setCloneVideoUrl] = useState('')
  const [clonePrompt, setClonePrompt] = useState('')
  const [brollFlow, setBrollFlow] = useState<'ai' | 'manual'>('ai')
  const [brollStep, setBrollStep] = useState<'choice' | 'goals' | 'audience' | 'products' | 'images' | 'actors' | 'configure' | 'manual-script'>('choice')
  const [selectedBrollGoal, setSelectedBrollGoal] = useState('')
  const [customBrollGoal, setCustomBrollGoal] = useState('')
  const [openGoalInfo, setOpenGoalInfo] = useState<string | null>(null)
  const [openAudienceInfo, setOpenAudienceInfo] = useState<string | null>(null)
  const [selectedBrollAudience, setSelectedBrollAudience] = useState('')
  const [customBrollAudience, setCustomBrollAudience] = useState('')
  const [selectedBrollProduct, setSelectedBrollProduct] = useState('')
  const [selectedBrollActorUrl, setSelectedBrollActorUrl] = useState('')
  const [brollAspectRatio, setBrollAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('portrait')
  const [brollDuration, setBrollDuration] = useState(30)
  const [durationMenuOpen, setDurationMenuOpen] = useState(false)
  const [brollInstructions, setBrollInstructions] = useState('')
  const [manualBrollScript, setManualBrollScript] = useState('')
  // Structure d'inspiration issue d'un template sélectionné (Templates → « Utiliser »).
  const [templateStructure, setTemplateStructure] = useState('')
  const [customVideoType, setCustomVideoType] = useState<'image' | 'text'>('image')
  const [selectedCustomVideoModel, setSelectedCustomVideoModel] = useState('')
  const [customVideoStep, setCustomVideoStep] = useState<'models' | 'generate'>('models')
  const [customVideoPrompt, setCustomVideoPrompt] = useState('')
  const [customVideoImageUrl, setCustomVideoImageUrl] = useState('')
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [customVideoAspect, setCustomVideoAspect] = useState<'portrait' | 'landscape' | 'square'>('portrait')
  const [customVideoDuration, setCustomVideoDuration] = useState<5 | 10>(5)
  const [generatingCustomVideo, setGeneratingCustomVideo] = useState(false)
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [brollImages, setBrollImages] = useState<string[]>([])
  const [brollBusy, setBrollBusy] = useState(false)
  const [generatingBrollScript, setGeneratingBrollScript] = useState(false)
  const [generatingBrollVideo, setGeneratingBrollVideo] = useState(false)
  const [brollAudioUrl, setBrollAudioUrl] = useState('')
  const [generatingBrollAudio, setGeneratingBrollAudio] = useState(false)
  const [brollExprMenuOpen, setBrollExprMenuOpen] = useState(false)
  const [brollPauseMenuOpen, setBrollPauseMenuOpen] = useState(false)
  const [brollRefineInstruction, setBrollRefineInstruction] = useState('')

  useEffect(() => {
    actionListAvatarsForPicker().then(setAvatars).catch(() => setAvatars([]))
    actionListProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  // Ouverture directe d'un mode via ?mode= (raccourcis du dashboard).
  useEffect(() => {
    const m = searchParams.get('mode')
    if (m && AVAILABLE_VIDEO_TYPE_IDS.has(m)) setMode(m as VideoMode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handoff depuis Production (?from=production&…&prompt=…) ou Templates (?from=template&…&templatePrompt=…).
  // Production → pré-remplit directement le script. Template → mémorise la structure d'inspiration
  // (utilisée à la génération du script, adaptée au produit choisi), sans copier le contenu.
  useEffect(() => {
    if (!['production','template'].includes(searchParams.get('from') ?? '')) return
    const type = searchParams.get('type')
    const prompt = searchParams.get('prompt') ?? ''
    const tpl = searchParams.get('templatePrompt') ?? ''
    if (tpl) setTemplateStructure(tpl)
    if (type === 'broll-video') {
      setMode('broll-voiceover')
      if (prompt) setManualBrollScript(prompt)
    } else {
      setMode('realistic-actor')
      if (prompt) setActorScript(prompt)
    }
    toast.info(tpl ? 'Template appliqué — choisis ton produit puis génère le script' : 'Pré-rempli')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Avatar attaché (id) → on le résout vers l'URL de l'acteur une fois les avatars chargés.
  useEffect(() => {
    if (!['production','template'].includes(searchParams.get('from') ?? '')) return
    const avatarId = searchParams.get('avatar')
    if (!avatarId || avatars.length === 0) return
    const photo = avatars.find((a) => a.id === avatarId)?.photoUrl
    if (!photo) return
    if (searchParams.get('type') === 'broll-video') setSelectedBrollActorUrl(photo)
    else setSelectedActorUrl(photo)
  }, [avatars]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ferme les popovers / menus au clic en dehors.
  useEffect(() => {
    if (!openGoalInfo && !openAudienceInfo && !durationMenuOpen && !brollExprMenuOpen && !brollPauseMenuOpen && !voiceSettingsOpen) return
    const close = () => { setOpenGoalInfo(null); setOpenAudienceInfo(null); setDurationMenuOpen(false); setBrollExprMenuOpen(false); setBrollPauseMenuOpen(false); setVoiceSettingsOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openGoalInfo, openAudienceInfo, durationMenuOpen, brollExprMenuOpen, brollPauseMenuOpen, voiceSettingsOpen])

  // Sélecteur de fichier image.
  function pickImage(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = 'image/*'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })
  }
  // B-Roll : importer une image produit → créer le produit → le sélectionner.
  async function addBrollProduct() {
    const file = await pickImage()
    if (!file) return
    setBrollBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { path } = await actionUploadProductImage(fd)
      const name = file.name.replace(/\.[^.]+$/, '') || 'Nouveau produit'
      await actionCreateProduct({ name, description: null, currency: 'USD', price: null, benefits: [], imagePath: path, additionalPaths: [], sourceUrl: null })
      const list = await actionListProducts()
      setProducts(list)
      const created = list.find((product) => product.name === name)
      if (created) setSelectedBrollProduct(created.id)
      toast.success('Produit créé ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur création') }
    finally { setBrollBusy(false) }
  }
  // B-Roll : supprimer un produit du catalogue.
  async function deleteBrollProduct(id: string) {
    if (brollBusy) return
    setBrollBusy(true)
    try {
      await actionDeleteProduct(id)
      if (selectedBrollProduct === id) setSelectedBrollProduct('')
      setProducts(await actionListProducts())
      toast.success('Produit supprimé')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible') }
    finally { setBrollBusy(false) }
  }
  // B-Roll : importer une image dans la bibliothèque du brief.
  async function addBrollImage() {
    const file = await pickImage()
    if (!file) return
    setBrollBusy(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      if (!url) throw new Error('Upload échoué')
      setBrollImages((list) => [url, ...list])
      toast.success('Image ajoutée ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur upload') }
    finally { setBrollBusy(false) }
  }
  // B-Roll : génère le script voix-off (IA) dans le champ script manuel.
  async function generateBrollScript() {
    if (generatingBrollScript) return
    setGeneratingBrollScript(true)
    try {
      const goal = BROLL_GOALS.find((g) => g.id === selectedBrollGoal)
      const goalText = goal?.title ?? (selectedBrollGoal === 'write-your-own' ? customBrollGoal.trim() : '')
      const audience = BROLL_AUDIENCES.find((a) => a.id === selectedBrollAudience)
      const product = products.find((p) => p.id === selectedBrollProduct)
      const productCtx = product
        ? `Produit mis en avant : ${product.name}${product.description ? ` — ${product.description}` : ''}${product.benefits?.length ? ` · Bénéfices : ${product.benefits.join(', ')}` : ''}`
        : ''
      const res = await actionGenerateScript({
        campaignName: 'Voice Over Ad',
        campaignDna: [brandCtx(), productCtx, manualBrollScript.trim(), goalText, audience?.title || customBrollAudience, brollInstructions].filter(Boolean).join(' — ') || 'Punchy b-roll voice-over ad for a product.',
        contentType: 'ugc', format: 'social', platform: 'tiktok', duration: brollDuration,
        templateStructure: templateStructure || undefined,
      })
      setManualBrollScript((res.voiceover || res.script || '').trim())
      setBrollStep('manual-script')
      toast.success('Script généré')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Échec de la génération du script') }
    finally { setGeneratingBrollScript(false) }
  }
  // Video Generator : importe une image de référence (pour Image to Video).
  async function uploadCustomVideoImage() {
    const file = await pickImage()
    if (!file) return
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      if (!url) throw new Error('Upload échoué')
      setCustomVideoImageUrl(url)
      toast.success('Image ajoutée ✓')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur upload') }
  }
  // Video Generator : génère la vidéo via le moteur réel (kling/seedance) selon le modèle choisi.
  async function generateCustomVideo() {
    if (generatingCustomVideo) return
    if (!customVideoPrompt.trim()) { toast.error('Décris la vidéo à générer'); return }
    if (customVideoType === 'image' && !customVideoImageUrl) { toast.error('Importe une image de référence'); return }
    const engine: 'kling' | 'seedance' = selectedCustomVideoModelDetails?.engine ?? 'kling'
    const aspectRatio = customVideoAspect === 'landscape' ? '16:9' : customVideoAspect === 'square' ? '1:1' : '9:16'
    const isImg2Vid = customVideoType === 'image' && Boolean(customVideoImageUrl)
    // Réalisme + (en image-to-video) ancrage de fidélité au sujet de l'image de référence.
    const realism = 'Cinematic, photorealistic, natural realistic lighting, smooth realistic camera motion, premium high-end ad quality, sharp clean details, no text, no watermark, no logo overlay.'
    const fidelity = isImg2Vid
      ? ' Animate the scene starting from the reference image and keep its main subject EXACTLY faithful: same shape, colors, materials, text, logo, proportions and identity — never replace, swap or distort it.'
      : ''
    const prompt = `${customVideoPrompt.trim()}. ${realism}${fidelity}`
    const negativePrompt = 'blurry, low quality, distorted, deformed, warped, extra limbs, extra fingers, mutated hands, warped face, identity change, subject swap, watermark, text artifacts, flickering, jitter'
    setGeneratingCustomVideo(true)
    setActorVideoUrl('')
    try {
      const job = await actionSubmitVideo({
        prompt,
        engine,
        negativePrompt,
        ...(isImg2Vid ? { imageUrl: customVideoImageUrl } : {}),
        aspectRatio, duration: customVideoDuration,
      })
      for (let i = 0; i < 48; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const status = await actionGetVideoStatus(job.generationId, engine)
        if (status.status === 'completed' && status.videoUrl) {
          setActorVideoUrl(status.videoUrl)
          setActorLightboxOpen(true)
          persistOutput({ type: 'video', sourceUrl: status.videoUrl, title: 'Custom Video', engine, prompt: customVideoPrompt.slice(0, 200), format: aspectRatio }).catch(() => {})
          toast.success('Vidéo générée')
          return
        }
        if (status.status === 'failed') { toast.error(status.error || 'Échec de la génération'); return }
      }
      toast.error('Délai dépassé — réessaie')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération vidéo') }
    finally { setGeneratingCustomVideo(false) }
  }

  // B-Roll : insère une indication (émotion / pause) dans le script manuel.
  function insertBrollCue(cue: string) {
    setManualBrollScript((s) => `${s}${s && !s.endsWith(' ') ? ' ' : ''}${cue} `)
  }
  // B-Roll : affine le script manuel existant selon une consigne libre.
  async function refineBrollScript() {
    if (generatingBrollScript) return
    if (!manualBrollScript.trim()) { toast.error('Écris un script d\'abord'); return }
    setGeneratingBrollScript(true)
    try {
      const goal = BROLL_GOALS.find((g) => g.id === selectedBrollGoal)
      const goalText = goal?.title ?? (selectedBrollGoal === 'write-your-own' ? customBrollGoal.trim() : '')
      const audience = BROLL_AUDIENCES.find((a) => a.id === selectedBrollAudience)
      const res = await actionGenerateScript({
        campaignName: 'Voice Over Ad',
        campaignDna: [brandCtx(), `Script à affiner: ${manualBrollScript.trim()}`, brollRefineInstruction.trim() ? `Consigne: ${brollRefineInstruction.trim()}` : 'Améliore, dynamise et rends-le plus percutant', goalText, audience?.title || customBrollAudience].filter(Boolean).join(' — '),
        contentType: 'ugc', format: 'social', platform: 'tiktok', duration: brollDuration,
        templateStructure: templateStructure || undefined,
      })
      setManualBrollScript((res.voiceover || res.script || '').trim())
      toast.success('Script affiné')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'affinage') }
    finally { setGeneratingBrollScript(false) }
  }

  // B-Roll : vidéo CENTRÉE PRODUIT. Base i2v = le produit ; si un acteur est choisi, on compose
  // d'abord « l'acteur présente le produit » (Nano Banana) puis on anime → les deux apparaissent.
  async function generateBrollVideo() {
    if (generatingBrollVideo) return
    const productImg = products.find((p) => p.id === selectedBrollProduct)?.imageUrl || brollImages[0] || ''
    const actorImg = selectedBrollActorUrl || ''
    let baseImage = productImg || actorImg
    if (!baseImage) { toast.error('Ajoute une image produit (ou un acteur)'); return }
    if (!manualBrollScript.trim()) { toast.error('Écris ou génère un script d\'abord'); return }
    const ratioMap = { portrait: '9:16', landscape: '16:9', square: '1:1' } as const
    const sizeMap = { portrait: '1024x1792', landscape: '1792x1024', square: '1024x1024' } as const
    setGeneratingBrollVideo(true)
    setActorVideoUrl('')
    try {
      // Acteur + produit → composite (l'acteur tient/présente le produit) → les DEUX apparaissent.
      if (actorImg && productImg) {
        const comp = await actionGenerateImage({
          prompt: 'Realistic advertising photo: the exact same person from the reference naturally holding and presenting the exact product from the reference. Keep the person face and identity AND the product (shape, colors, text, logo, proportions) perfectly faithful. Clean premium ad look, no text, no watermark.',
          model: 'nano-banana',
          size: sizeMap[brollAspectRatio],
          n: 1,
          imageUrl: [productImg, actorImg],
        }).catch(() => null)
        if (comp?.[0]?.url) baseImage = comp[0].url
      }
      const prompt = `Cinematic b-roll voice-over advertisement for the product. Animate the scene from the reference image — keep its main subject (the product${actorImg ? ' and the person' : ''}) EXACTLY faithful: same shape, colors, text, logo and identity; never replace it. Natural camera motion, premium ad look. Voiceover script: "${manualBrollScript.trim().slice(0, 400)}".${brollInstructions.trim() ? ` Creative direction: ${brollInstructions.trim().slice(0, 150)}.` : ''}`
      const job = await actionSubmitVideo({ prompt, engine: 'kling', klingVersion: 'v2.1-standard', imageUrl: baseImage, aspectRatio: ratioMap[brollAspectRatio], duration: 5 })
      for (let i = 0; i < 48; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const status = await actionGetVideoStatus(job.generationId, 'kling')
        if (status.status === 'completed' && status.videoUrl) {
          setActorVideoUrl(status.videoUrl)
          setActorLightboxOpen(true)
          persistOutput({ type: 'video', sourceUrl: status.videoUrl, title: 'Voice Over Ad', engine: 'kling', prompt: prompt.slice(0, 200), format: ratioMap[brollAspectRatio] }).catch(() => {})
          toast.success('Vidéo générée')
          return
        }
        if (status.status === 'failed') { toast.error(status.error || 'Échec de la génération'); return }
      }
      toast.error('Délai dépassé — réessaie')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Échec de la génération vidéo') }
    finally { setGeneratingBrollVideo(false) }
  }

  // B-Roll : synthétise la voix-off à partir du script + voix sélectionnée (MiniMax/ElevenLabs) + réglages.
  async function generateBrollAudio() {
    if (generatingBrollAudio) return
    if (!manualBrollScript.trim()) { toast.error('Écris ou génère un script d\'abord'); return }
    setGeneratingBrollAudio(true)
    try {
      const profile = VOICE_PROFILES.find((v) => v.id === selectedVoiceId)
      const isMinimax = profile?.engine === 'minimax'
      const res = await actionGenerateSpeech({
        text: manualBrollScript.trim(),
        engine: profile?.engine,
        voice: profile?.voice as Parameters<typeof actionGenerateSpeech>[0]['voice'],
        speed: voiceSpeed,
        ...(isMinimax ? { pitch: voicePitch, emotion: voiceEmotion } : {}),
      })
      const url = `data:audio/mpeg;base64,${res.audioBase64}`
      setBrollAudioUrl(url)
      persistOutput({ type: 'audio', dataUrl: url, title: 'Voice Over Ad', engine: res.engine, prompt: manualBrollScript.slice(0, 200) }).catch(() => {})
      toast.success('Voix-off générée')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la voix-off') }
    finally { setGeneratingBrollAudio(false) }
  }

  const myActors: Actor[] = avatars
    .filter((avatar): avatar is { id: string; name: string; photoUrl: string } => Boolean(avatar.photoUrl))
    .map((avatar) => ({ id: avatar.id, name: avatar.name, photoUrl: avatar.photoUrl }))
  const selectedActor = [...myActors, ...FALLBACK_ACTORS].find((actor) => actor.photoUrl === selectedActorUrl)
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
      // Clonage studio
      setCloneMotionVideoUrl('')
      setCloneCharacterImageUrl('')
      setCloneOrientation('video')
      setClonePrompt('')
      setCloneVideoUrl('')
      return
    }
    router.push('/creer/image')
  }

  // ── Realistic Actor Video — génération ──
  async function generateActorScript() {
    if (generatingScript) return
    setGeneratingScript(true)
    try {
      const res = await actionGenerateScript({
        campaignName: 'Realistic Actor Video',
        campaignDna: [brandCtx(), actorScript.trim() || 'Short, punchy UGC video where an actor talks straight to camera about a product, friendly and authentic tone.'].filter(Boolean).join(' — '),
        contentType: 'ugc',
        format: 'social',
        platform: 'tiktok',
        duration: 20,
        avatarName: selectedActor?.name,
      })
      setActorScript((res.voiceover || res.script || '').trim())
      toast.success('Script généré')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération du script') }
    finally { setGeneratingScript(false) }
  }

  // Insère une indication (émotion / pause) dans le script.
  function insertScriptCue(cue: string) {
    setActorScript((s) => `${s}${s && !s.endsWith(' ') ? ' ' : ''}${cue} `)
  }
  // Améliore le script existant selon une consigne libre.
  async function autoEnhanceScript() {
    if (generatingScript) return
    if (!actorScript.trim() && !enhanceInstruction.trim()) { toast.error('Écris un script ou une consigne'); return }
    setGeneratingScript(true)
    try {
      const res = await actionGenerateScript({
        campaignName: 'Realistic Actor Video',
        campaignDna: [brandCtx(), `Script actuel: ${actorScript.trim() || '(vide)'}.${enhanceInstruction.trim() ? ` Consigne d'amélioration: ${enhanceInstruction.trim()}.` : ' Améliore, dynamise et rends-le plus percutant.'}`].filter(Boolean).join(' — '),
        contentType: 'ugc', format: 'social', platform: 'tiktok', duration: 20, avatarName: selectedActor?.name,
      })
      setActorScript((res.voiceover || res.script || '').trim())
      toast.success('Script amélioré')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'amélioration') }
    finally { setGeneratingScript(false) }
  }

  async function generateActorAudio() {
    if (generatingAudio) return
    if (!actorScript.trim()) { toast.error('Écris ou génère un script d\'abord'); return }
    setGeneratingAudio(true)
    try {
      const profile = VOICE_PROFILES.find((v) => v.id === selectedVoiceId)
      const isMinimax = profile?.engine === 'minimax'
      const res = await actionGenerateSpeech({
        text: actorScript.trim(),
        engine: profile?.engine,
        voice: profile?.voice as Parameters<typeof actionGenerateSpeech>[0]['voice'],
        speed: voiceSpeed,
        ...(isMinimax ? { pitch: voicePitch, emotion: voiceEmotion } : {}),
      })
      setActorAudioUrl(`data:audio/mpeg;base64,${res.audioBase64}`)
      toast.success('Audio généré')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération audio') }
    finally { setGeneratingAudio(false) }
  }

  // Aperçu audio d'une voix (court extrait TTS).
  async function previewVoice(profileId: string, providerVoice: string) {
    if (previewingVoiceId) return
    setPreviewingVoiceId(profileId)
    try {
      const profile = VOICE_PROFILES.find((v) => v.id === profileId)
      const res = await actionGenerateSpeech({ text: 'Bonjour ! Voici un aperçu de ma voix pour ta vidéo.', engine: profile?.engine, voice: providerVoice as Parameters<typeof actionGenerateSpeech>[0]['voice'] })
      const audio = new Audio(`data:audio/mpeg;base64,${res.audioBase64}`)
      audio.onended = () => setPreviewingVoiceId(null)
      audio.onerror = () => setPreviewingVoiceId(null)
      await audio.play()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Aperçu indisponible'); setPreviewingVoiceId(null) }
  }

  // Clonage de voix ElevenLabs — vérifie le gate réel (API dédiée). Tant qu'elle n'est
  // pas configurée, on conserve l'échantillon côté UI et on informe proprement.
  async function handleCloneVoice() {
    if (cloning) return
    if (!cloneName.trim()) { toast.error('Donne un nom à ta voix clonée'); return }
    if (!cloneFileName) { toast.error('Ajoute un échantillon audio (≥ 30s)'); return }
    setCloning(true)
    try {
      const enabled = await actionIsVoiceCloneEnabled()
      if (!enabled) {
        toast.info('Clonage bientôt disponible — l\'API dédiée ElevenLabs n\'est pas encore configurée.')
        return
      }
      toast.success('Voix envoyée au clonage ElevenLabs')
      setCloneOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec du clonage') }
    finally { setCloning(false) }
  }

  const selectedVoiceProfile = VOICE_PROFILES.find((v) => v.id === selectedVoiceId)
  const filteredVoices = VOICE_PROFILES.filter((p) =>
    (voiceGender === 'all' || p.gender === voiceGender) &&
    (voiceAge === 'all' || p.age === voiceAge) &&
    (!voiceSearch.trim() || `${p.label} ${p.tags.join(' ')}`.toLowerCase().includes(voiceSearch.trim().toLowerCase())),
  )

  async function generateActorVideo() {
    if (generatingVideo) return
    if (!selectedActorUrl) { toast.error('Choisis un acteur'); return }
    setGeneratingVideo(true)
    setActorVideoUrl('')
    try {
      const prompt = `UGC-style talking-head video of the EXACT same person shown in the reference image — preserve their face, hairstyle, skin tone, outfit and appearance, do not change their identity. They talk straight to the camera with natural facial expressions, lip movements and subtle hand gestures, authentic hand-held look.${actorScript.trim() ? ` They are saying: "${actorScript.trim().slice(0, 300)}".` : ''}`
      const job = await actionSubmitVideo({ prompt, engine: 'kling', klingVersion: 'v2.1-standard', imageUrl: selectedActorUrl, aspectRatio: '9:16', duration: 5 })
      // Polling jusqu'à complétion (~ jusqu'à 4 min)
      for (let i = 0; i < 48; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const status = await actionGetVideoStatus(job.generationId, 'kling')
        if (status.status === 'completed' && status.videoUrl) {
          setActorVideoUrl(status.videoUrl)
          persistOutput({ type: 'video', sourceUrl: status.videoUrl, title: `Acteur · ${selectedActor?.name ?? ''}`.trim(), engine: 'kling', prompt: prompt.slice(0, 200), format: '9:16' }).catch(() => {})
          toast.success('Vidéo générée')
          return
        }
        if (status.status === 'failed') { toast.error(status.error || 'Échec de la génération'); return }
      }
      toast.error('Délai dépassé — réessaie')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération vidéo') }
    finally { setGeneratingVideo(false) }
  }

  // ── Clonage studio : transfert de mouvement (vidéo source → image personnage) ──
  // Lit la durée d'une vidéo locale (métadonnées) sans l'uploader.
  function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
      v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('metadata')) }
      v.src = url
    })
  }
  async function uploadMotionVideo(file: File | undefined) {
    if (!file || !file.type.startsWith('video/')) return
    // kie.ai motion-control exige du MP4.
    if (file.type !== 'video/mp4' && !/\.mp4$/i.test(file.name)) { toast.error('Format non supporté : utilise un fichier MP4.'); return }
    // La durée du clone suit la vidéo source — bornée à 3–30 s (contrainte Kling motion-control).
    const duration = await getVideoDuration(file).catch(() => null)
    if (duration != null) {
      if (duration > 30.5) { toast.error('Vidéo trop longue : 30 s maximum.'); return }
      if (duration < 3) { toast.error('Vidéo trop courte : 3 s minimum.'); return }
    }
    setUploadingMotion(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { url } = await actionUploadTempVideo(fd)
      setCloneMotionVideoUrl(url)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload de la vidéo impossible') }
    finally { setUploadingMotion(false) }
  }
  async function uploadCharImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    setUploadingChar(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      setCloneCharacterImageUrl(url)
    } catch { toast.error('Upload de l\'image impossible') }
    finally { setUploadingChar(false) }
  }
  async function generateCloneVideo() {
    if (generatingClone) return
    if (!cloneMotionVideoUrl) { toast.error('Importe la vidéo des mouvements à imiter'); return }
    if (!cloneCharacterImageUrl) { toast.error('Importe l\'image du personnage'); return }
    setGeneratingClone(true)
    setCloneVideoUrl('')
    try {
      // Vrai motion control : Kling 3.0 motion-control (video-to-video, 720p) via kie.ai.
      const { taskId } = await actionSubmitClone({
        characterImageUrl: cloneCharacterImageUrl,
        motionVideoUrl: cloneMotionVideoUrl,
        prompt: clonePrompt.trim() || undefined,
        mode: '720p',
        orientation: cloneOrientation,
        backgroundSource: cloneOrientation === 'image' ? 'input_image' : 'input_video',
      })
      // Polling (~ jusqu'à 5 min)
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const res = await actionGetCloneStatus(taskId)
        if (res.state === 'success' && res.videoUrl) {
          setCloneVideoUrl(res.videoUrl)
          persistOutput({ type: 'video', sourceUrl: res.videoUrl, title: 'Clonage studio', engine: 'kling-3.0-motion', prompt: `motion-control · ${cloneOrientation}`, format: '9:16' }).catch(() => {})
          toast.success('Clone généré')
          return
        }
        if (res.state === 'fail') { toast.error(res.error || 'Échec de la génération'); return }
      }
      toast.error('Délai dépassé — réessaie')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec du clonage') }
    finally { setGeneratingClone(false) }
  }

  // Modales acteurs + voix — partagées par les flux realistic ET b-roll.
  const voiceAndActorModals = (
    <>
      {actorModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/75 p-4 sm:p-6 flex items-center justify-center animate-fade-in" onClick={() => setActorModalOpen(false)}>
          <div className="flex max-h-[82vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[16px] bg-bg-card shadow-neo-lg" onClick={(event) => event.stopPropagation()}>
            <header className="flex h-[50px] flex-shrink-0 items-center justify-between border-b border-border px-5">
              <h2 className="font-display text-[17px] font-extrabold text-accent">Choose Actor</h2>
              <button onClick={() => setActorModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto rounded-[14px] bg-bg-surface p-3.5">
                <h3 className="text-[13px] font-extrabold text-text-primary">Filters</h3>
                <div className="mt-2.5 h-px bg-border" />
                <label className="mt-3 flex h-9 items-center gap-2.5 rounded-[10px] border border-accent bg-bg-card px-3 text-text-secondary">
                  <Search size={15} />
                  <input placeholder="Search..." className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] font-medium text-text-primary placeholder:text-text-secondary focus:shadow-none" />
                </label>
                {['Gender', 'Age', 'Hair Style', 'Ethnicity', 'Language', 'Physique', 'Hair Color'].map((filter) => (
                  <div key={filter} className="mt-3">
                    <p className="mb-1.5 text-[11px] font-extrabold text-text-primary">{filter}</p>
                    <button className="flex h-8 w-full items-center justify-between rounded-[9px] border border-border bg-bg-card px-3 text-left text-[12px] font-medium text-text-primary shadow-sm">
                      All {filter === 'Gender' ? 'Genders' : filter === 'Age' ? 'Ages' : `${filter}s`}
                      <ChevronDown size={15} className="text-text-secondary" />
                    </button>
                  </div>
                ))}
              </aside>

              <main className="min-h-0 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2.5">
                  {myActors.map((actor) => {
                    const selected = (actorModalTarget === 'broll' ? selectedBrollActorUrl : actorModalTarget === 'clone' ? cloneCharacterImageUrl : selectedActorUrl) === actor.photoUrl
                    return (
                      <button
                        key={`modal-${actor.id}`}
                        title={actor.name}
                        onClick={() => { (actorModalTarget === 'broll' ? setSelectedBrollActorUrl : actorModalTarget === 'clone' ? setCloneCharacterImageUrl : setSelectedActorUrl)(actor.photoUrl); setActorModalOpen(false) }}
                        className={`group relative w-[108px] aspect-[9/16] overflow-hidden rounded-[12px] border-2 bg-bg-card transition-all hover:border-accent/70 ${selected ? 'border-accent ring-2 ring-accent/30 shadow-neo' : 'border-transparent'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white shadow-sm">
                            <Check size={12} strokeWidth={3} />
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
          <div className="flex max-h-[80vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[16px] bg-bg-card shadow-neo-lg" onClick={(event) => event.stopPropagation()}>
            <header className="flex flex-shrink-0 items-start justify-between gap-4 px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-extrabold text-text-primary">Choose a Voice</h2>
                <p className="mt-0.5 text-[12px] font-medium text-text-secondary">Parcours et sélectionne une voix de la bibliothèque</p>
              </div>
              <button onClick={() => setVoiceModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <div className="flex-shrink-0 px-5">
              <label className="flex h-9 items-center gap-2.5 rounded-[10px] border border-border bg-bg-card px-3 text-text-secondary focus-within:border-accent">
                <Search size={16} />
                <input value={voiceSearch} onChange={(e) => setVoiceSearch(e.target.value)} placeholder="Rechercher par nom ou ton…" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium text-text-primary placeholder:text-text-secondary focus:shadow-none" />
              </label>

              <div className="mt-2.5 flex flex-wrap gap-2">
                <button onClick={() => setVoiceGender((g) => g === 'all' ? 'f' : g === 'f' ? 'm' : g === 'm' ? 'n' : 'all')} className="flex h-8 items-center gap-2 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-bold text-text-primary shadow-sm hover:border-accent/60">
                  <Filter size={14} /> {voiceGender === 'all' ? 'Tous genres' : voiceGender === 'f' ? 'Femme' : voiceGender === 'm' ? 'Homme' : 'Neutre'}
                </button>
                <button onClick={() => setVoiceAge((a) => a === 'all' ? 'young' : a === 'young' ? 'adult' : a === 'adult' ? 'mature' : 'all')} className="flex h-8 items-center gap-2 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-bold text-text-primary shadow-sm hover:border-accent/60 capitalize">
                  {voiceAge === 'all' ? 'Tous âges' : voiceAge}
                </button>
                {(voiceGender !== 'all' || voiceAge !== 'all' || voiceSearch) && (
                  <button onClick={() => { setVoiceGender('all'); setVoiceAge('all'); setVoiceSearch('') }} className="flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-bold text-text-secondary hover:text-accent">
                    <X size={13} /> Réinitialiser
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <div className="overflow-hidden rounded-[10px] border border-border">
                {filteredVoices.length === 0 ? (
                  <p className="py-10 text-center text-[13px] font-medium text-text-secondary">Aucune voix ne correspond.</p>
                ) : filteredVoices.map((profile) => {
                  const selected = selectedVoiceId === profile.id
                  const previewing = previewingVoiceId === profile.id
                  const gender = profile.gender === 'f' ? 'FEMALE' : profile.gender === 'm' ? 'MALE' : 'NEUTRAL'
                  return (
                    <div
                      key={profile.id}
                      className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 ${selected ? 'bg-accent/10' : 'bg-bg-card hover:bg-accent/5'}`}
                    >
                      <button onClick={() => previewVoice(profile.id, profile.voice)} disabled={!!previewingVoiceId} className={`grid h-9 w-9 place-items-center rounded-full border-4 transition ${previewing ? 'border-accent/30 text-accent' : 'border-fg/[0.10] text-text-primary hover:text-accent'} bg-bg-card disabled:opacity-60`} aria-label="Écouter un aperçu">
                        {previewing ? <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" /> : <Play size={14} fill="currentColor" />}
                      </button>
                      <button onClick={() => { setSelectedVoiceId(profile.id); setVoiceModalOpen(false) }} className="min-w-0 text-left">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-extrabold text-text-primary">{profile.label}</span>
                          {selected && <Check size={14} className="shrink-0 text-accent" strokeWidth={3} />}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-fg/[0.07] px-2 py-0.5 text-[9px] font-extrabold text-text-primary">{gender}</span>
                          <span className="rounded-full bg-fg/[0.07] px-2 py-0.5 text-[9px] font-extrabold uppercase text-text-primary">{profile.age}</span>
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-extrabold text-accent">{profile.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}</span>
                          <span className="truncate text-[11px] font-medium capitalize text-text-secondary">{profile.tags.join(', ')}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-0.5" title={`Multilingue — ${VOICE_LANGUAGES.map((l) => l.label).join(', ')}`}>
                          <Globe size={11} className="mr-0.5 text-text-muted" />
                          {VOICE_LANGUAGES.slice(0, 7).map((l) => <span key={l.code} className="text-[11px] leading-none">{l.flag}</span>)}
                          {VOICE_LANGUAGES.length > 7 && <span className="ml-0.5 text-[9px] font-bold text-text-muted">+{VOICE_LANGUAGES.length - 7}</span>}
                        </span>
                      </button>
                      <button onClick={() => { setSelectedVoiceId(profile.id); setVoiceModalOpen(false) }} className={`h-8 shrink-0 rounded-[9px] px-3 text-[12px] font-extrabold transition ${selected ? 'bg-accent text-white' : 'border border-border bg-bg-card text-text-primary hover:bg-bg-surface'}`}>
                        {selected ? 'Choisie' : 'Choisir'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {cloneOpen && (
              <div className="flex-shrink-0 border-t border-border bg-bg-surface px-5 py-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/10 text-accent"><Lock size={14} /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-text-primary">Cloner ma voix · ElevenLabs</p>
                    <p className="text-[11px] font-medium text-text-secondary">Importe un échantillon clair de ≥ 30 s pour reproduire ta voix.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="Nom de la voix (ex. Ma voix)"
                    className="h-9 min-w-[160px] flex-1 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-medium text-text-primary placeholder:text-text-dim focus:border-accent focus:shadow-none"
                  />
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border border-dashed border-border bg-bg-card px-3 text-[12px] font-extrabold text-text-primary hover:border-accent/60">
                    <Upload size={14} /> {cloneFileName ? <span className="max-w-[140px] truncate">{cloneFileName}</span> : 'Échantillon audio'}
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => setCloneFileName(e.target.files?.[0]?.name ?? null)} />
                  </label>
                  <button onClick={handleCloneVoice} disabled={cloning} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-sm hover:brightness-105 transition disabled:opacity-55">
                    {cloning ? 'Envoi…' : <>Cloner <Sparkles size={13} /></>}
                  </button>
                  <button onClick={() => setCloneOpen(false)} className="inline-flex h-9 items-center rounded-[9px] px-3 text-[12px] font-extrabold text-text-secondary hover:text-text-primary">Annuler</button>
                </div>
              </div>
            )}
            <footer className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-[12px] font-medium text-text-secondary">{filteredVoices.length} voix {filteredVoices.length > 1 ? 'disponibles' : 'disponible'} · MiniMax + ElevenLabs</p>
              <button
                type="button"
                onClick={() => setCloneOpen((o) => !o)}
                className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-extrabold text-text-primary transition hover:border-accent/60 hover:bg-bg-surface"
              >
                <Lock size={13} /> Cloner ma voix · ElevenLabs
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )

  if (mode === 'realistic-actor') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">Realistic Actor Video</h1>
          </header>

          <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0 min-h-0">
              <StepSlider index={realisticStep - 1} slideClassName="px-3 py-4 sm:px-5 lg:px-6">
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mb-4 flex items-center justify-center gap-2.5">
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[11px] font-extrabold">1</span>
                    <h2 className="min-w-0 font-display text-[15px] font-extrabold leading-tight text-text-primary">Choose an actor for your video</h2>
                  </div>

                  <div className="mx-auto flex max-w-[560px] flex-wrap justify-center gap-2.5">
                    <button onClick={() => { setActorModalTarget('realistic'); setActorModalOpen(true) }} className="w-[92px] aspect-[9/16] rounded-[10px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center gap-1 text-text-primary hover:border-accent/70 hover:bg-accent/5 transition-colors">
                      <LayoutPanelLeft size={18} />
                      <span className="text-[10px] font-semibold">Show All</span>
                    </button>

                    {myActors.map((actor) => {
                      const selected = selectedActorUrl === actor.photoUrl
                      return (
                        <button
                          key={actor.id}
                          onClick={() => setSelectedActorUrl(actor.photoUrl)}
                          className={`relative w-[92px] aspect-[9/16] overflow-hidden rounded-[10px] border bg-bg-card transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
                          <span className="absolute left-1.5 bottom-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-bg-card/85 px-2 py-0.5 text-[10px] font-extrabold text-text-primary backdrop-blur">{actor.name}</span>
                          {selected && (
                            <span className="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
                              <Check size={13} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {myActors.length === 0 && (
                    <div className="mx-auto mt-4 flex max-w-[420px] flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-bg-card py-8 text-center">
                      <UserRound size={36} className="text-text-muted mb-2" strokeWidth={1.8} />
                      <p className="text-[13px] font-extrabold text-text-primary">Aucun acteur</p>
                      <p className="mt-1 text-[12px] text-text-secondary">Crée un avatar dans Characters pour le retrouver ici.</p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button disabled={!selectedActorUrl} className="h-9 rounded-[10px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary inline-flex items-center gap-2 transition hover:bg-fg/[0.12] disabled:opacity-50 disabled:cursor-not-allowed">
                      <Wand2 size={15} /> Edit Actor
                    </button>
                    <button onClick={() => setRealisticStep(2)} disabled={!selectedActorUrl} className="h-9 rounded-[10px] bg-accent px-5 text-[13px] font-extrabold text-white inline-flex items-center gap-2.5 shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed">
                      Continue <ChevronDown size={15} />
                    </button>
                  </div>
                </div>
                <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center py-5">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2.5">
                      <span className="w-5 h-5 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[11px] font-extrabold">2</span>
                      <h2 className="font-display text-[15px] font-extrabold text-text-primary">Choose the voice for your actor</h2>
                    </div>

                    {/* Sélecteur de moteur de voix */}
                    <div className="mb-3 inline-flex rounded-full bg-fg/[0.06] p-1">
                      <button
                        onClick={() => setVoiceEngineTab('minimax')}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold transition ${voiceEngineTab === 'minimax' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        <Sparkles size={13} className={voiceEngineTab === 'minimax' ? 'text-accent' : ''} /> MiniMax
                        <span className="rounded-full bg-fg/[0.08] px-1.5 py-px text-[8px] font-bold text-text-secondary">Synthèse</span>
                      </button>
                      <button
                        onClick={() => setVoiceEngineTab('elevenlabs')}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold transition ${voiceEngineTab === 'elevenlabs' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        <Sparkles size={13} className={voiceEngineTab === 'elevenlabs' ? 'text-accent' : ''} /> ElevenLabs
                        <span className="rounded-full bg-fg/[0.08] px-1.5 py-px text-[8px] font-bold text-text-secondary">Synthèse</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {VOICES.filter((v) => (voiceEngineTab === 'minimax' ? v.engine === 'MiniMax' : v.engine === 'ElevenLabs')).map((voice) => {
                        const selected = selectedVoiceId === voice.id
                        return (
                          <button
                            key={voice.id}
                            onClick={() => setSelectedVoiceId(voice.id)}
                            className={`relative flex h-[38px] items-center gap-2 rounded-full border bg-bg-card px-2 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/10 shadow-neo-sm' : 'border-border'}`}
                          >
                            {voice.recommended && <span className="absolute -top-2 right-2.5 rounded-full bg-accent px-1.5 py-0.5 text-[7px] font-extrabold text-white">RECOMMENDED</span>}
                            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border-[3px] border-fg/[0.10] bg-bg-card text-text-primary"><Play size={11} fill="currentColor" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-extrabold leading-tight text-text-primary">{voice.name}</span>
                              <span className="flex items-center gap-1">
                                <span className="rounded-full bg-bg-surface px-1.5 py-px text-[7px] font-bold text-text-primary">{voice.gender}</span>
                                <span className="flex items-center gap-px" title={`Multilingue — ${VOICE_LANGUAGES.map((l) => l.label).join(', ')}`}>
                                  {VOICE_LANGUAGES.slice(0, 4).map((l) => <span key={l.code} className="text-[10px] leading-none">{l.flag}</span>)}
                                  <span className="ml-0.5 text-[7px] font-bold text-text-muted">+{VOICE_LANGUAGES.length - 4}</span>
                                </span>
                              </span>
                            </span>
                            <span className="flex-shrink-0 rounded-full bg-accent/10 px-1.5 py-px text-[7px] font-extrabold text-accent">{voice.engine}</span>
                          </button>
                        )
                      })}
                      <button onClick={() => setVoiceModalOpen(true)} className="col-span-2 flex h-[38px] items-center justify-center gap-2 rounded-full bg-fg/[0.08] px-4 text-[12px] font-extrabold text-text-primary hover:bg-fg/[0.12] transition">
                        <ListMusic size={15} /> See all voices
                      </button>
                    </div>

                    {voiceEngineTab === 'elevenlabs' && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed border-border bg-bg-card px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary"><Lock size={12} /> Cloner ta propre voix — <span className="font-extrabold text-accent">Campagne Spéciale</span></span>
                        <button type="button" disabled title="Clonage de voix ElevenLabs — débloqué avec la Campagne Spéciale" className="inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-[8px] bg-fg/[0.06] px-2.5 text-[11px] font-extrabold text-text-muted">
                          <Lock size={12} /> Cloner ma voix
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <button onClick={() => setRealisticStep(1)} className="h-9 rounded-[10px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary inline-flex items-center gap-2 transition hover:bg-fg/[0.12]">
                      <ChevronDown size={15} className="rotate-90" /> Retour
                    </button>
                    <button onClick={() => setRealisticStep(3)} disabled={!selectedVoiceId} className="h-9 rounded-[10px] bg-accent px-5 text-[13px] font-extrabold text-white inline-flex items-center gap-2.5 shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed">
                      Continue <ChevronDown size={15} className="-rotate-90" />
                    </button>
                  </div>
                </div>

                <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center py-5">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button onClick={() => setRealisticStep(2)} className="grid h-7 w-7 place-items-center rounded-full bg-fg/[0.08] text-text-primary transition hover:bg-fg/[0.12]" aria-label="Retour"><ChevronDown size={15} className="rotate-90" /></button>
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-fg/[0.09] text-text-secondary flex items-center justify-center text-[11px] font-extrabold">3</span>
                        <h2 className="font-display text-[15px] font-extrabold text-text-primary">What will your actor say?</h2>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <BrandContextToggle on={useBrandCtx} onChange={setUseBrandCtx} />
                        <button onClick={generateActorScript} disabled={generatingScript} className="inline-flex items-center gap-2 text-[13px] font-extrabold text-accent hover:brightness-95 transition disabled:opacity-55">
                          <Sparkles size={15} /> {generatingScript ? 'Génération…' : 'Generate Script with AI'}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[10px] border border-border bg-bg-card">
                      <div className="flex h-10 items-center gap-4 border-b border-border px-4 text-[12px] font-bold text-text-secondary">
                        <div className="relative">
                          <button onClick={() => { setExpressionMenuOpen((o) => !o); setPauseMenuOpen(false); setVoiceSettingsOpen(false) }} disabled={selectedVoiceProfile?.engine !== 'minimax'} title={selectedVoiceProfile?.engine !== 'minimax' ? 'Émotions disponibles sur les voix MiniMax' : undefined} className="inline-flex items-center gap-2 transition hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"><Smile size={15} /> Add Expression <span className="capitalize text-text-primary">{selectedVoiceProfile?.engine === 'minimax' && voiceEmotion !== 'neutral' ? `· ${voiceEmotion}` : ''}</span> <ChevronDown size={13} /></button>
                          {expressionMenuOpen && (
                            <div className="absolute left-0 top-9 z-20 w-44 rounded-[10px] border border-border bg-bg-card p-1 shadow-neo-lg">
                              {MINIMAX_EMOTIONS.map((emotion) => (
                                <button key={emotion} onClick={() => { setVoiceEmotion(emotion); setExpressionMenuOpen(false) }} className={`flex w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-left text-[12px] font-semibold capitalize hover:bg-accent/10 ${voiceEmotion === emotion ? 'text-accent' : 'text-text-primary'}`}>{emotion} {voiceEmotion === emotion && <Check size={13} strokeWidth={3} />}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button onClick={() => { setPauseMenuOpen((o) => !o); setExpressionMenuOpen(false) }} className="inline-flex items-center gap-2 hover:text-text-primary"><Timer size={15} /> Add Pause <ChevronDown size={13} /></button>
                          {pauseMenuOpen && (
                            <div className="absolute left-0 top-9 z-20 w-44 rounded-[10px] border border-border bg-bg-card p-1 shadow-neo-lg">
                              {[{ label: 'Courte', cue: '…' }, { label: 'Moyenne', cue: '[pause]' }, { label: 'Longue', cue: '[longue pause]' }].map((p) => (
                                <button key={p.label} onClick={() => { insertScriptCue(p.cue); setPauseMenuOpen(false) }} className="flex w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-left text-[12px] font-semibold text-text-primary hover:bg-accent/10">{p.label} <span className="text-text-dim">{p.cue}</span></button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button onClick={() => { setVoiceSettingsOpen((o) => !o); setExpressionMenuOpen(false); setPauseMenuOpen(false) }} className={`inline-flex items-center gap-2 transition hover:text-text-primary ${voiceSettingsOpen ? 'text-text-primary' : ''}`}><SlidersHorizontal size={15} /> Voice Settings <ChevronDown size={13} /></button>
                          {voiceSettingsOpen && (
                            <div className="absolute left-0 top-9 z-20 w-[260px] rounded-[12px] border border-border bg-bg-card p-3 shadow-neo-lg" onClick={(e) => e.stopPropagation()}>
                              <div className="mb-2.5 flex items-center justify-between">
                                <p className="text-[12px] font-extrabold text-text-primary">Réglages de voix</p>
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-extrabold text-accent">{selectedVoiceProfile?.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}</span>
                              </div>

                              {selectedVoiceProfile?.engine === 'minimax' && (
                                <div className="mb-3">
                                  <p className="mb-1.5 text-[11px] font-bold text-text-secondary">Émotion</p>
                                  <div className="flex flex-wrap gap-1">
                                    {MINIMAX_EMOTIONS.map((emotion) => (
                                      <button key={emotion} onClick={() => setVoiceEmotion(emotion)} className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize transition ${voiceEmotion === emotion ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.12]'}`}>{emotion}</button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mb-3">
                                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-text-secondary"><span>Vitesse</span><span className="text-text-primary">{voiceSpeed.toFixed(2)}×</span></div>
                                <input type="range" min={0.5} max={2} step={0.05} value={voiceSpeed} onChange={(e) => setVoiceSpeed(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fg/[0.12] accent-accent" />
                              </div>

                              {selectedVoiceProfile?.engine === 'minimax' && (
                                <div className="mb-1">
                                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-text-secondary"><span>Tonalité</span><span className="text-text-primary">{voicePitch > 0 ? `+${voicePitch}` : voicePitch}</span></div>
                                  <input type="range" min={-12} max={12} step={1} value={voicePitch} onChange={(e) => setVoicePitch(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fg/[0.12] accent-accent" />
                                </div>
                              )}

                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                                <button onClick={() => { setVoiceSpeed(1); setVoicePitch(0); setVoiceEmotion('neutral') }} className="text-[11px] font-extrabold text-text-secondary hover:text-text-primary">Réinitialiser</button>
                                <button onClick={() => setVoiceSettingsOpen(false)} className="h-7 rounded-[8px] bg-accent px-3 text-[11px] font-extrabold text-white hover:brightness-105">OK</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedVoiceProfile && (
                          <span className="ml-auto inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] font-extrabold text-text-primary">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                            <span className="truncate">{selectedVoiceProfile.label}</span>
                            <span className="flex-shrink-0 font-medium text-text-secondary">· {selectedVoiceProfile.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}</span>
                          </span>
                        )}
                      </div>
                      <textarea
                        value={actorScript}
                        onChange={(event) => setActorScript(event.target.value)}
                        placeholder="Écris ce que ton acteur va dire… ou clique sur « Generate Script with AI »."
                        className="min-h-[120px] w-full resize-none border-0 bg-transparent px-4 py-2.5 text-[13px] font-medium leading-6 text-text-primary outline-none placeholder:text-text-dim focus:shadow-none"
                      />
                      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                        <span className="flex min-w-0 flex-1 items-center gap-2 text-[12px]">
                          <Sparkles size={14} className="shrink-0 text-accent" />
                          <input
                            value={enhanceInstruction}
                            onChange={(event) => setEnhanceInstruction(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); autoEnhanceScript() } }}
                            placeholder="Enhance your script...e.g. 'Add humor to my script'"
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] font-medium text-text-primary placeholder:text-text-dim focus:shadow-none"
                          />
                        </span>
                        <button onClick={autoEnhanceScript} disabled={generatingScript} className="h-8 shrink-0 rounded-[10px] bg-fg/[0.08] px-3.5 text-[12px] font-extrabold text-text-primary inline-flex items-center gap-2 hover:bg-fg/[0.12] transition disabled:opacity-55">
                          <Sparkles size={14} /> {generatingScript ? 'Enhancing…' : 'Auto Enhance'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-text-secondary">
                          {actorScript.trim() ? `${actorScript.trim().split(/\s+/).length} mots · ${actorScript.length} car.` : 'Aucun script'}
                          <span className="ml-1 text-text-dim">· ~{Math.max(1, Math.round(actorScript.trim().split(/\s+/).filter(Boolean).length / 2.5))}s</span>
                        </span>
                        <button onClick={generateActorAudio} disabled={generatingAudio || !actorScript.trim()} className="h-8 rounded-[10px] bg-accent px-4 text-[12px] font-extrabold text-white inline-flex items-center gap-2 shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                          {generatingAudio ? 'Génération…' : <>Generate Audio <Gem size={14} fill="currentColor" /> 1</>}
                        </button>
                      </div>
                      {actorAudioUrl && (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <audio src={actorAudioUrl} controls className="w-full" />
                      )}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <button onClick={generateActorVideo} disabled={generatingVideo || !selectedActorUrl} className="h-9 rounded-[10px] bg-[#ff987f] px-7 text-[13px] font-extrabold text-white inline-flex items-center gap-2.5 shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                        {generatingVideo ? 'Génération de la vidéo…' : <>Générer la vidéo <ChevronDown size={15} className="-rotate-90" /></>}
                      </button>
                    </div>
                  </div>
                </div>
              </StepSlider>
            </main>

            <aside className="min-h-0 flex flex-col border-t border-border bg-bg-surface px-4 py-4 lg:border-l lg:border-t-0 lg:px-5 lg:py-5 lg:overflow-y-auto">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-text-primary">Aperçu</h2>
                  <p className="mt-1 truncate text-[12px] font-medium text-text-secondary">{actorVideoUrl ? 'Vidéo générée' : selectedActor ? selectedActor.name : 'Sélectionne un acteur'}</p>
                </div>
                <button disabled={!selectedActorUrl} className="h-8 rounded-[10px] bg-accent px-3 text-[12px] font-extrabold text-white flex items-center gap-1.5 shadow-neo-solid hover:brightness-105 transition shrink-0 disabled:opacity-55 disabled:cursor-not-allowed"><Wand2 size={14} /> Edit Actor</button>
              </div>

              <div className="relative mt-4 flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-hidden rounded-[13px] border border-border bg-bg-card px-3 text-center [background-image:radial-gradient(circle_at_50%_28%,rgba(255,92,40,0.07),transparent_70%)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-bg-surface/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary shadow-sm backdrop-blur">
                  <span className={`h-1.5 w-1.5 rounded-full ${actorVideoUrl ? 'bg-green-600' : generatingVideo ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
                  {actorVideoUrl ? 'Vidéo' : generatingVideo ? 'En cours' : 'Aperçu'} · 9:16
                </span>

                {generatingVideo ? (
                  <div className="relative z-10 flex flex-col items-center gap-3 text-text-secondary">
                    <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <p className="text-[13px] font-semibold text-text-primary">Génération de la vidéo…</p>
                    <p className="text-[11px] text-text-secondary">Cela peut prendre 1 à 3 minutes</p>
                  </div>
                ) : actorVideoUrl ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={actorVideoUrl} controls autoPlay loop className="relative z-10 max-h-full max-w-full rounded-[8px] object-contain" />
                    <button onClick={() => setActorLightboxOpen(true)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Agrandir"><Maximize2 size={15} /></button>
                    <a href={actorVideoUrl} download target="_blank" rel="noreferrer" className="absolute right-3 top-12 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
                  </>
                ) : selectedActor ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedActor.photoUrl} alt={selectedActor.name} className="relative z-10 max-h-full max-w-full object-contain" />
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-3 text-text-secondary">
                    <UserRound size={42} strokeWidth={1.8} />
                    <p className="text-[13px] font-medium text-text-primary">Select an actor to see preview</p>
                  </div>
                )}
              </div>

              <div className="mt-4 shrink-0 rounded-[14px] border border-border bg-bg-card p-3.5">
                <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-text-primary"><Sparkles size={13} className="text-accent" /> Astuces</h3>
                <ul className="mt-2 space-y-1 text-[12px] font-medium leading-relaxed text-text-secondary">
                  <li>• Écris dans n’importe quelle langue, naturellement</li>
                  <li>• Ajoute de l’émotion et soigne le script</li>
                  <li>• Prévisualise l’acteur avant de générer la vidéo</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        {actorLightboxOpen && actorVideoUrl && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setActorLightboxOpen(false)}>
            <button onClick={() => setActorLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={actorVideoUrl} controls autoPlay loop onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
            <a href={actorVideoUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
          </div>
        )}

        {voiceAndActorModals}
      </div>
    )
  }

  if (mode === 'broll-voiceover') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">Voice Over Ad</h1>
          </header>

          <main className="relative min-h-0 flex-1">
            <StepSlider index={BROLL_STEP_ORDER.indexOf(brollStep)} slideClassName="flex items-center justify-center px-4 py-6">
              <div className="w-full max-w-[520px] space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setBrollFlow('ai')
                    setBrollStep('goals')
                  }}
                  className="group flex w-full items-center gap-4 rounded-[18px] border border-border bg-bg-surface px-5 py-4 text-left transition-all hover:border-accent/70 hover:bg-accent/5 hover:shadow-neo-sm"
                >
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[12px] bg-accent text-white">
                    <Bot size={28} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[16px] font-extrabold leading-tight text-text-primary">Generate with AI</span>
                    <span className="mt-1 block text-[13px] font-medium leading-relaxed text-text-secondary">Laisse {studioName} créer un script et un storyboard pour toi.</span>
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
                  className="group flex w-full items-center gap-4 rounded-[18px] border border-border bg-bg-surface px-5 py-4 text-left transition-all hover:border-accent/70 hover:bg-accent/5 hover:shadow-neo-sm"
                >
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[12px] bg-fg/[0.10] text-text-primary">
                    <Pencil size={26} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[16px] font-extrabold leading-tight text-text-primary">Write manually</span>
                    <span className="mt-1 block text-[13px] font-medium leading-relaxed text-text-secondary">Already have a script? Use it to create a storyboard.</span>
                  </span>
                </button>
              </div>
              <div className="w-full max-w-[820px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
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
                        title={goal.desc}
                        onClick={() => { setSelectedBrollGoal(goal.id); setOpenGoalInfo(null) }}
                        className={`group relative flex min-h-[58px] items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] transition-colors ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                          <Icon size={21} strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-extrabold leading-tight text-text-primary">{goal.title}</span>
                          <span className="mt-1 block truncate text-[13px] font-medium text-text-secondary">{goal.desc}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {selected && (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                              <Check size={15} strokeWidth={3} />
                            </span>
                          )}
                          <span
                            role="button"
                            tabIndex={-1}
                            aria-label="Voir la description"
                            onClick={(event) => { event.stopPropagation(); setOpenGoalInfo((id) => id === goal.id ? null : goal.id) }}
                            className={`grid h-6 w-6 cursor-pointer place-items-center rounded-full transition-colors ${openGoalInfo === goal.id ? 'bg-accent/15 text-accent' : 'text-text-primary/70 hover:bg-fg/[0.08] hover:text-accent'}`}
                          >
                            <Info size={16} />
                          </span>
                        </span>
                        {openGoalInfo === goal.id && (
                          <span onClick={(event) => event.stopPropagation()} className="absolute right-2 top-[calc(100%-4px)] z-30 block w-[260px] cursor-default rounded-[10px] border border-border bg-bg-card p-3 text-[12px] font-medium leading-relaxed text-text-secondary shadow-neo-lg">
                            {goal.details}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedBrollGoal('write-your-own')}
                    className={`flex min-h-[56px] w-full max-w-[410px] items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                      selectedBrollGoal === 'write-your-own'
                        ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                        : 'border-border bg-bg-surface'
                    }`}
                  >
                    <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${selectedBrollGoal === 'write-your-own' ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
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

                {selectedBrollGoal === 'write-your-own' && (
                  <div className="mx-auto mt-3 w-full max-w-[410px]">
                    <textarea
                      value={customBrollGoal}
                      onChange={(event) => setCustomBrollGoal(event.target.value)}
                      placeholder="Décris l'objectif de ta pub… ex. « Faire connaître notre nouvelle gamme éco-responsable »"
                      className="min-h-[80px] w-full resize-none rounded-[12px] border border-border bg-bg-surface px-3.5 py-3 text-[13px] font-medium leading-relaxed text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep('choice')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep('audience')}
                    disabled={!selectedBrollGoal || (selectedBrollGoal === 'write-your-own' && !customBrollGoal.trim())}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div className="w-full max-w-[640px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  Who are you targeting with this ad?
                </h2>

                <div className="mt-5 border-t border-border pt-3">
                  <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {BROLL_AUDIENCES.map((audience) => {
                      const Icon = audience.icon
                      const selected = selectedBrollAudience === audience.id

                      const infoOpen = openAudienceInfo === audience.id
                      return (
                        <div
                          key={audience.id}
                          className={`relative overflow-hidden rounded-[12px] border transition-all ${
                            selected
                              ? 'border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                              : 'border-border bg-bg-surface hover:border-accent/70 hover:bg-accent/5'
                          }`}
                        >
                          <button
                            type="button"
                            title={audience.desc}
                            onClick={() => {
                              setSelectedBrollAudience(audience.id)
                              setCustomBrollAudience('')
                              setOpenAudienceInfo(null)
                            }}
                            className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 pr-20 text-left"
                          >
                            <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                              <Icon size={20} strokeWidth={2.1} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-extrabold leading-tight text-text-primary">{audience.title}</span>
                              <span className="mt-1 block truncate text-[13px] font-medium text-text-primary">{audience.desc}</span>
                            </span>
                          </button>

                          <span className="absolute right-3 top-[27px] flex -translate-y-1/2 items-center gap-2">
                            {selected && (
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                                <Check size={15} strokeWidth={3} />
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label={infoOpen ? 'Masquer la description' : 'Voir la description'}
                              onClick={(event) => { event.stopPropagation(); setOpenAudienceInfo((id) => id === audience.id ? null : audience.id) }}
                              className={`grid h-6 w-6 cursor-pointer place-items-center rounded-full transition-colors ${infoOpen ? 'bg-accent text-white' : 'text-text-primary/70 hover:bg-fg/[0.08] hover:text-accent'}`}
                            >
                              {infoOpen ? <X size={14} /> : <Info size={16} />}
                            </button>
                          </span>

                          {infoOpen && (
                            <p className="border-t border-border bg-bg-card/60 px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-text-secondary">
                              {audience.details}
                            </p>
                          )}
                        </div>
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

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep('goals')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep('products')}
                    disabled={!selectedBrollAudience && !customBrollAudience.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div className="w-full max-w-[850px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  What are we promoting today?
                </h2>
                <p className="mt-2 text-center text-[13px] font-semibold text-text-secondary">
                  {selectedBrollProduct ? '1 produit sélectionné' : 'Choisis un produit'} · {products.length} disponible{products.length > 1 ? 's' : ''}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {products.map((product) => {
                    const selected = selectedBrollProduct === product.id
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedBrollProduct(selected ? '' : product.id)}
                        className={`group relative h-[160px] w-full max-w-[170px] overflow-hidden rounded-[14px] border bg-bg-card text-left transition-all hover:border-accent/70 hover:bg-accent/5 sm:w-[160px] ${
                          selected ? 'border-2 border-accent ring-4 ring-accent/15 shadow-neo' : 'border-border'
                        }`}
                      >
                        <div className="flex h-[118px] items-center justify-center overflow-hidden bg-bg-surface">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : <span className="text-text-faint"><ImageIcon size={24} /></span>}
                        </div>
                        <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate text-[13px] font-extrabold text-text-primary">{product.name}</span>
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label="Supprimer le produit"
                          title="Supprimer le produit"
                          onClick={(event) => { event.stopPropagation(); deleteBrollProduct(product.id) }}
                          className="absolute left-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </span>
                        {selected && (
                          <span className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-white shadow-sm">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={addBrollProduct}
                    disabled={brollBusy}
                    className="flex h-[160px] w-full max-w-[170px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-border-strong bg-bg-card px-4 text-center transition-colors hover:border-accent/70 hover:bg-accent/5 sm:w-[160px] disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-fg/[0.08] text-text-primary">
                      <Plus size={18} strokeWidth={2.2} />
                    </span>
                    <span className="mt-2.5 text-[13px] font-extrabold text-text-primary">Add new product</span>
                    <span className="mt-0.5 text-[12px] font-medium text-text-secondary">Importer une image produit</span>
                  </button>
                </div>

                <div className="mt-7 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep(brollFlow === 'manual' ? 'choice' : 'audience')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep('images')}
                    disabled={!selectedBrollProduct}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={15} />
                  </button>
                </div>
              </div>
              <div className="w-full max-w-[920px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  Select image(s) for your ad
                </h2>
                <p className="mt-2 text-center text-[13px] font-semibold text-text-secondary">{brollImages.length} / 14 (max)</p>

                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <button
                    type="button"
                    onClick={addBrollImage}
                    disabled={brollBusy}
                    className="flex h-[150px] w-full max-w-[180px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-border-strong bg-bg-card px-5 text-center transition-colors hover:border-accent/70 hover:bg-accent/5 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-fg/[0.08] text-text-primary">
                      <Plus size={22} strokeWidth={2.2} />
                    </span>
                    <span className="mt-3 text-[14px] font-extrabold text-text-primary">Importer une image</span>
                  </button>

                  {brollFlow === 'ai' && selectedBrollProduct && products.find((p) => p.id === selectedBrollProduct)?.imageUrl && (
                    <div className="h-[150px] w-full max-w-[180px] overflow-hidden rounded-[14px] border border-border bg-bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={products.find((p) => p.id === selectedBrollProduct)!.imageUrl!} alt="Produit" className="h-full w-full object-cover" />
                    </div>
                  )}

                  {brollImages.map((url, index) => (
                    <div key={`${url}-${index}`} className="group relative h-[150px] w-full max-w-[180px] overflow-hidden rounded-[14px] border border-border bg-bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBrollImages((list) => list.filter((_, i) => i !== index))}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/75"
                        aria-label="Supprimer l'image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep('products')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep('actors')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                  >
                    Continue
                    <ChevronDown size={15} />
                  </button>
                </div>
              </div>
              <div className="w-full max-w-[760px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  Choose Actors <span className="font-semibold text-text-secondary">(Optional)</span>
                </h2>
                <p className="mt-2 text-center text-[13px] font-semibold text-text-secondary">
                  {selectedBrollActorUrl ? '1 acteur sélectionné' : 'Optionnel — ajoute un acteur à ta pub, ou passe cette étape'}
                </p>

                <div className="mx-auto mt-5 grid max-w-[720px] grid-cols-3 gap-2.5 sm:grid-cols-6">
                  <button onClick={() => { setActorModalTarget('broll'); setActorModalOpen(true) }} className="aspect-[9/16] rounded-[10px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center gap-1 text-text-primary hover:border-accent/70 hover:bg-accent/5 transition-colors">
                    <LayoutPanelLeft size={20} />
                    <span className="text-[10px] font-semibold">Show All</span>
                  </button>

                  {myActors.slice(0, 5).map((actor) => {
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

                <div className="mt-8 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep('images')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedBrollActorUrl(''); setBrollStep(brollFlow === 'manual' ? 'manual-script' : 'configure') }}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrollStep(brollFlow === 'manual' ? 'manual-script' : 'configure')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                  >
                    Continue
                    <ChevronDown size={15} />
                  </button>
                </div>
              </div>
              <div className="w-full max-w-[760px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  Configure your script
                </h2>

                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-extrabold text-text-primary" htmlFor="broll-duration">
                      Video Duration
                    </label>
                    <div className="relative">
                      <button
                        id="broll-duration"
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setDurationMenuOpen((o) => !o) }}
                        className="flex h-10 w-full items-center justify-between rounded-[10px] border border-border bg-bg-surface px-3.5 text-left text-[14px] font-medium text-text-primary transition hover:border-accent/60"
                      >
                        {brollDuration} seconds
                        <ChevronDown size={16} className={`text-text-secondary transition-transform ${durationMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {durationMenuOpen && (
                        <div onClick={(event) => event.stopPropagation()} className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-[10px] border border-border bg-bg-card p-1 shadow-neo-lg">
                          {[15, 30, 45, 60].map((seconds) => (
                            <button
                              key={seconds}
                              type="button"
                              onClick={() => { setBrollDuration(seconds); setDurationMenuOpen(false) }}
                              className={`flex w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-left text-[13px] font-semibold transition-colors ${brollDuration === seconds ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.06]'}`}
                            >
                              {seconds} seconds
                              {brollDuration === seconds && <Check size={14} strokeWidth={3} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 flex gap-2 text-[12px] font-medium leading-relaxed text-text-secondary">
                      <Info size={14} className="mt-0.5 flex-shrink-0" />
                      <span>Durée approximative, elle peut varier selon le rythme du contenu.</span>
                    </p>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[13px] font-extrabold text-text-primary">Video Aspect Ratio</p>
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
                          className={`h-9 rounded-[8px] px-3.5 text-[13px] font-extrabold transition ${
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

                <div className="mt-5">
                  <label className="mb-1.5 flex items-center gap-2 text-[13px] font-extrabold text-text-primary" htmlFor="broll-instructions">
                    Additional Instructions (Optional)
                    <Info size={14} className="text-text-primary/75" />
                  </label>
                  <textarea
                    id="broll-instructions"
                    value={brollInstructions}
                    onChange={(event) => setBrollInstructions(event.target.value)}
                    placeholder={'Ajoute ta touche créative…  ex. « Ton dramatique de bande-annonce », « Humour pince-sans-rire », « Look VHS années 90 »'}
                    className="min-h-[120px] w-full resize-none rounded-[10px] border border-border bg-bg-surface px-3.5 py-3 text-[13px] font-medium leading-relaxed text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <BrandContextToggle on={useBrandCtx} onChange={setUseBrandCtx} />
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBrollStep('actors')}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                    >
                      <ChevronDown size={15} className="rotate-90" /> Retour
                    </button>
                    <button
                      type="button"
                      onClick={generateBrollScript}
                      disabled={generatingBrollScript}
                      className="inline-flex h-10 items-center justify-center gap-2.5 rounded-[10px] bg-accent px-6 text-[14px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={16} />
                      {generatingBrollScript ? 'Génération…' : 'Generate Voiceover Script'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-full max-w-[720px] animate-fade-in">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-[18px] font-extrabold tracking-tight text-text-primary">
                      Edit your script
                    </h2>
                    <p className="mt-1.5 max-w-[560px] text-[13px] font-medium leading-relaxed text-text-secondary">
                      This will be the crux of your ad. Make sure to spend time here perfecting it before creating your storyboard. (Minimum 50 characters)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateBrollScript}
                    disabled={generatingBrollScript}
                    className="inline-flex items-center gap-2 pt-1 text-[13px] font-extrabold text-accent transition hover:brightness-95 disabled:opacity-55"
                  >
                    <Sparkles size={15} />
                    {generatingBrollScript ? 'Génération…' : 'Generate Script with AI'}
                  </button>
                </div>

                <div className="overflow-hidden rounded-[14px] border border-border bg-bg-card">
                  <div className="flex h-9 flex-wrap items-center gap-4 border-b border-border px-4 text-[12px] font-bold text-text-secondary">
                    <div className="relative">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setBrollExprMenuOpen((o) => !o); setBrollPauseMenuOpen(false) }} className="inline-flex items-center gap-2 hover:text-text-primary"><Smile size={15} /> Add Expression <ChevronDown size={13} /></button>
                      {brollExprMenuOpen && (
                        <div onClick={(event) => event.stopPropagation()} className="absolute left-0 top-9 z-20 w-44 rounded-[10px] border border-border bg-bg-card p-1 shadow-neo-lg">
                          {MINIMAX_EMOTIONS.map((emotion) => (
                            <button key={emotion} type="button" onClick={() => { insertBrollCue(`(${emotion})`); setBrollExprMenuOpen(false) }} className="block w-full rounded-[8px] px-3 py-1.5 text-left text-[12px] font-semibold capitalize text-text-primary hover:bg-accent/10">{emotion}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setBrollPauseMenuOpen((o) => !o); setBrollExprMenuOpen(false) }} className="inline-flex items-center gap-2 hover:text-text-primary"><Timer size={15} /> Add Pause <ChevronDown size={13} /></button>
                      {brollPauseMenuOpen && (
                        <div onClick={(event) => event.stopPropagation()} className="absolute left-0 top-9 z-20 w-44 rounded-[10px] border border-border bg-bg-card p-1 shadow-neo-lg">
                          {[{ label: 'Courte', cue: '…' }, { label: 'Moyenne', cue: '[pause]' }, { label: 'Longue', cue: '[longue pause]' }].map((p) => (
                            <button key={p.label} type="button" onClick={() => { insertBrollCue(p.cue); setBrollPauseMenuOpen(false) }} className="flex w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-left text-[12px] font-semibold text-text-primary hover:bg-accent/10">{p.label} <span className="text-text-dim">{p.cue}</span></button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setVoiceSettingsOpen((o) => !o); setBrollExprMenuOpen(false); setBrollPauseMenuOpen(false) }} className={`inline-flex items-center gap-2 transition hover:text-text-primary ${voiceSettingsOpen ? 'text-text-primary' : ''}`}><SlidersHorizontal size={15} /> Voice Settings <ChevronDown size={13} /></button>
                      {voiceSettingsOpen && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-9 z-20 w-[260px] rounded-[12px] border border-border bg-bg-card p-3 shadow-neo-lg">
                          <div className="mb-2.5 flex items-center justify-between">
                            <p className="text-[12px] font-extrabold text-text-primary">Réglages de voix</p>
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-extrabold text-accent">{selectedVoiceProfile?.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}</span>
                          </div>
                          {selectedVoiceProfile?.engine === 'minimax' && (
                            <div className="mb-3">
                              <p className="mb-1.5 text-[11px] font-bold text-text-secondary">Émotion</p>
                              <div className="flex flex-wrap gap-1">
                                {MINIMAX_EMOTIONS.map((emotion) => (
                                  <button key={emotion} type="button" onClick={() => setVoiceEmotion(emotion)} className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize transition ${voiceEmotion === emotion ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.12]'}`}>{emotion}</button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mb-3">
                            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-text-secondary"><span>Vitesse</span><span className="text-text-primary">{voiceSpeed.toFixed(2)}×</span></div>
                            <input type="range" min={0.5} max={2} step={0.05} value={voiceSpeed} onChange={(e) => setVoiceSpeed(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fg/[0.12] accent-accent" />
                          </div>
                          {selectedVoiceProfile?.engine === 'minimax' && (
                            <div className="mb-1">
                              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-text-secondary"><span>Tonalité</span><span className="text-text-primary">{voicePitch > 0 ? `+${voicePitch}` : voicePitch}</span></div>
                              <input type="range" min={-12} max={12} step={1} value={voicePitch} onChange={(e) => setVoicePitch(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fg/[0.12] accent-accent" />
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                            <button type="button" onClick={() => { setVoiceSpeed(1); setVoicePitch(0); setVoiceEmotion('neutral') }} className="text-[11px] font-extrabold text-text-secondary hover:text-text-primary">Réinitialiser</button>
                            <button type="button" onClick={() => setVoiceSettingsOpen(false)} className="h-7 rounded-[8px] bg-accent px-3 text-[11px] font-extrabold text-white hover:brightness-105">OK</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={manualBrollScript}
                    onChange={(event) => setManualBrollScript(event.target.value)}
                    className="min-h-[118px] w-full resize-none border-0 bg-bg-card px-4 py-2.5 text-[13px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-secondary focus:shadow-none focus:ring-0"
                    placeholder="Écris ou colle ton script voix-off ici…"
                  />

                  <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-[12px]">
                      <Wand2 size={14} className="shrink-0 text-accent" />
                      <input
                        value={brollRefineInstruction}
                        onChange={(event) => setBrollRefineInstruction(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); refineBrollScript() } }}
                        placeholder="Affine ton script…  ex. « Ajoute de l'humour »"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] font-medium text-text-primary placeholder:text-text-dim focus:shadow-none"
                      />
                    </span>
                    <button
                      type="button"
                      onClick={refineBrollScript}
                      disabled={!manualBrollScript.trim() || generatingBrollScript}
                      className="h-8 shrink-0 rounded-[10px] bg-fg/[0.08] px-3.5 text-[12px] font-extrabold text-text-primary transition hover:bg-fg/[0.12] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {generatingBrollScript ? 'Affinage…' : 'Refine'}
                    </button>
                  </div>

                  <div className="border-t border-border px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-text-secondary">Voix :</span>
                      {VOICES.map((voice) => {
                        const selected = selectedVoiceId === voice.id
                        return (
                          <button
                            key={voice.id}
                            type="button"
                            onClick={() => setSelectedVoiceId(voice.id)}
                            className={`inline-flex h-6 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-[11px] font-extrabold transition hover:border-accent/70 ${selected ? 'border-accent bg-accent/10 text-text-primary' : 'border-border bg-bg-surface text-text-primary'}`}
                          >
                            <span
                              role="button"
                              tabIndex={-1}
                              aria-label="Écouter un aperçu"
                              onClick={(event) => { event.stopPropagation(); previewVoice(voice.id, voice.voice) }}
                              className="grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-full border-2 border-fg/[0.10] bg-bg-card hover:text-accent"
                            >
                              {previewingVoiceId === voice.id ? <span className="h-2.5 w-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" /> : <Play size={9} fill="currentColor" />}
                            </span>
                            {voice.name}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setVoiceModalOpen(true)}
                        className="inline-flex h-6 items-center gap-1.5 rounded-full bg-fg/[0.08] px-2.5 text-[11px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                      >
                        <ListMusic size={13} className="text-accent" />
                        See all voices
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-text-secondary">{brollAudioUrl ? 'Voix-off prête ✓' : 'Synthétise la voix-off avec la voix sélectionnée'}</span>
                    <button type="button" onClick={generateBrollAudio} disabled={generatingBrollAudio || !manualBrollScript.trim()} className="inline-flex h-7 items-center gap-2 rounded-[10px] bg-accent px-3.5 text-[11px] font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed">
                      {generatingBrollAudio ? 'Génération…' : <>Générer la voix-off <Gem size={13} fill="currentColor" /> 1</>}
                    </button>
                  </div>
                  {brollAudioUrl && (
                    <div className="border-t border-border px-4 py-3">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={brollAudioUrl} controls className="w-full" />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBrollStep('actors')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-fg/[0.08] px-5 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={15} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={generateBrollVideo}
                    disabled={generatingBrollVideo || !manualBrollScript.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2.5 rounded-[10px] bg-[#ff987f] px-6 text-[14px] font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {generatingBrollVideo ? 'Génération de la vidéo…' : <>Générer la vidéo <ChevronDown size={15} className="-rotate-90" /></>}
                  </button>
                </div>
              </div>
            </StepSlider>
          </main>
        </section>

        {actorLightboxOpen && actorVideoUrl && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setActorLightboxOpen(false)}>
            <button onClick={() => setActorLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={actorVideoUrl} controls autoPlay loop onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
            <a href={actorVideoUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
          </div>
        )}

        {/* [DEV] Navigation libre entre les étapes du flux b-roll (à retirer en prod) */}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 rounded-full border border-border bg-bg-card/95 backdrop-blur px-2 py-1.5 shadow-neo-lg">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">Dev</span>
          {([
            { id: 'choice', label: 'Choix' },
            { id: 'goals', label: 'Objectif' },
            { id: 'audience', label: 'Audience' },
            { id: 'products', label: 'Produit' },
            { id: 'images', label: 'Images' },
            { id: 'actors', label: 'Acteurs' },
            { id: 'configure', label: 'Configure' },
            { id: 'manual-script', label: 'Script' },
          ] as { id: typeof brollStep; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'manual-script') setBrollFlow('manual')
                else if (id === 'goals' || id === 'audience' || id === 'configure') setBrollFlow('ai')
                setBrollStep(id)
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${brollStep === id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-fg/[0.06]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {voiceAndActorModals}
      </div>
    )
  }

  if (mode === 'clone-studio') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">
              Clonage studio
            </h1>
          </header>

          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
            {/* Colonne gauche : formulaire */}
            <div className="min-h-0 overflow-y-auto border-r border-border px-5 py-5">
            <div className="mx-auto w-full max-w-[560px]">

              <div className="mb-5">
                <h2 className="font-display text-[20px] font-extrabold tracking-tight text-text-primary">Cloner une vidéo</h2>
                <p className="mt-1 text-[12px] font-medium text-text-muted">Transfère les mouvements d&apos;une vidéo de référence sur ton personnage.</p>
              </div>

              {/* 2 sections : vidéo de mouvements + image personnage */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Vidéo des mouvements à imiter */}
                <input ref={cloneVideoInputRef} type="file" accept="video/mp4" className="hidden" onChange={(e) => { uploadMotionVideo(e.target.files?.[0]); e.target.value = '' }} />
                <button
                  type="button"
                  onClick={() => cloneVideoInputRef.current?.click()}
                  disabled={uploadingMotion}
                  className="group relative flex aspect-[16/10] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[12px] border-2 border-dashed border-border-strong bg-fg/[0.03] p-2.5 text-center text-text-secondary transition hover:border-accent disabled:opacity-60"
                >
                  {cloneMotionVideoUrl ? (
                    <video src={cloneMotionVideoUrl} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
                  ) : uploadingMotion ? (
                    <><RotateCcw size={20} className="animate-spin" /><span className="text-[12px] font-bold">Envoi…</span></>
                  ) : (
                    <><FilePlus2 size={20} /><span className="text-[11px] font-bold leading-tight">Vidéo des mouvements à imiter</span><span className="text-[10px] font-medium text-text-muted">MP4 · 3–30 s · la durée du clone suit la vidéo</span></>
                  )}
                </button>

                {/* Image du personnage */}
                <input ref={cloneImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadCharImage(e.target.files?.[0]); e.target.value = '' }} />
                <button
                  type="button"
                  onClick={() => cloneImageInputRef.current?.click()}
                  disabled={uploadingChar}
                  className="group relative flex aspect-[16/10] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[12px] border-2 border-dashed border-border-strong bg-fg/[0.03] p-2.5 text-center text-text-secondary transition hover:border-accent disabled:opacity-60"
                >
                  {cloneCharacterImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cloneCharacterImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : uploadingChar ? (
                    <><RotateCcw size={20} className="animate-spin" /><span className="text-[12px] font-bold">Envoi…</span></>
                  ) : (
                    <><ImagePlus size={20} /><span className="text-[11px] font-bold leading-tight">Image du personnage</span><span className="text-[10px] font-medium text-text-muted">L'avatar qui exécutera les mouvements</span></>
                  )}
                </button>
              </div>

              {/* …ou choisir un personnage existant (avatar) */}
              {avatars.filter((a) => a.photoUrl).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-extrabold text-text-primary">…ou utilise un de tes personnages</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {/* Tuile « Tout voir » */}
                    <button
                      type="button"
                      onClick={() => { setActorModalTarget('clone'); setActorModalOpen(true) }}
                      className="flex aspect-[3/4] w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed border-border-strong text-text-secondary transition hover:border-accent hover:text-accent"
                    >
                      <LayoutGrid size={20} strokeWidth={2} />
                      <span className="text-[11px] font-extrabold">Tout voir</span>
                    </button>
                    {avatars.filter((a) => a.photoUrl).map((a) => {
                      const selected = cloneCharacterImageUrl === a.photoUrl
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setCloneCharacterImageUrl(a.photoUrl!)}
                          title={a.name}
                          className={`group relative aspect-[3/4] w-[100px] shrink-0 overflow-hidden rounded-[14px] border-2 transition-colors ${selected ? 'border-accent' : 'border-transparent hover:border-accent/40'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.photoUrl!} alt={a.name} className="h-full w-full object-cover" />
                          <span className="absolute bottom-2 left-2 rounded-full bg-bg-card/90 px-2.5 py-0.5 text-[11px] font-extrabold text-text-primary shadow-neo-sm backdrop-blur-sm">{a.name}</span>
                          {selected && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-white shadow-neo-sm"><Check size={10} strokeWidth={3} /></span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Description (prompt) */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-text-primary">
                    <Sparkles size={13} className="text-accent" />
                    Description <span className="font-medium text-text-muted">(optionnel)</span>
                  </p>
                  <span className="text-[10px] font-semibold text-text-muted">{clonePrompt.length}/2500</span>
                </div>
                <div className="group rounded-[14px] border border-border bg-bg-card p-1 shadow-neo-sm">
                  <textarea
                    value={clonePrompt}
                    onChange={(e) => setClonePrompt(e.target.value.slice(0, 2500))}
                    placeholder="Décris la scène, le décor, l'ambiance ou ce que dit le personnage…"
                    rows={3}
                    className="w-full resize-none rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-[13px] font-medium leading-relaxed text-text-primary outline-none ring-0 placeholder:text-text-muted focus:border-0 focus:shadow-none focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-0.5">
                    {['Décor naturel lumineux', 'Studio minimaliste', 'Ambiance cinématique'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setClonePrompt(s)}
                        className="rounded-full border border-border bg-bg-surface px-2.5 py-1 text-[10px] font-semibold text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orientation du personnage */}
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-extrabold text-text-primary">Orientation du personnage</p>
                <div className="flex gap-2">
                  {([['video', 'Comme la vidéo'], ['image', 'Comme l\'image']] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setCloneOrientation(id)} className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-[12px] font-extrabold transition-colors ${cloneOrientation === id ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-secondary hover:border-border-strong'}`}>
                      <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${cloneOrientation === id ? 'border-accent' : 'border-border-strong'}`}>{cloneOrientation === id && <span className="h-2 w-2 rounded-full bg-accent" />}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-text-muted">
                  Orientation = vidéo → meilleurs mouvements complexes ; = image → meilleurs mouvements de caméra.
                </p>
              </div>

              <button
                type="button"
                onClick={generateCloneVideo}
                disabled={!cloneMotionVideoUrl || !cloneCharacterImageUrl || generatingClone}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-accent text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {generatingClone ? <><RotateCcw size={15} className="animate-spin" /> Clonage en cours… (~2 min)</> : <><Sparkles size={15} /> Générer le clone</>}
              </button>
            </div>
            </div>

            {/* Colonne droite : aperçu */}
            <div className="flex min-h-0 flex-col overflow-y-auto bg-fg/[0.015] p-5">
              <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wide text-text-muted">Aperçu</p>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-[16px] border border-border bg-bg-card p-3">
                {cloneVideoUrl ? (
                  <video src={cloneVideoUrl} controls autoPlay loop className="max-h-full w-auto max-w-full rounded-[10px]" />
                ) : generatingClone ? (
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <RotateCcw size={26} className="animate-spin text-accent" />
                    <span className="text-[12px] font-bold">Clonage en cours…</span>
                    <span className="text-[11px] font-medium">~2 min</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5 text-center text-text-muted">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.04]"><Bot size={26} strokeWidth={1.8} /></span>
                    <span className="text-[12px] font-bold text-text-secondary">Ton clone apparaîtra ici</span>
                    <span className="max-w-[220px] text-[11px] font-medium leading-relaxed">Importe une vidéo de mouvements et un personnage, puis lance la génération.</span>
                  </div>
                )}
              </div>
            </div>
          </main>
        </section>
        {voiceAndActorModals}
      </div>
    )
  }

  if (mode === 'video-generator') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
            <button onClick={handleBack} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
              <ArrowLeft size={20} />
            </button>
            <span className="w-px h-7 flex-shrink-0 bg-border" />
            <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">Custom Video Creator</h1>
          </header>

          <main className="relative min-h-0 flex-1">
            <StepSlider index={customVideoStep === 'models' ? 0 : 1} slideClassName="flex items-center justify-center px-4 py-6 sm:py-8">
              <div className="w-full max-w-[840px] animate-fade-in">
                <h2 className="text-center font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                  How do you want to generate the video?
                </h2>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        className={`flex min-h-[68px] items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-2 border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${selected ? 'bg-accent text-white' : 'bg-fg/[0.08] text-text-primary'}`}>
                          <Icon size={18} strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-extrabold leading-tight text-text-primary">{option.title}</span>
                          <span className="mt-0.5 block text-[12px] font-medium leading-snug text-text-secondary">{option.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <h3 className="mt-6 text-[14px] font-extrabold text-text-primary">Select models to generate video</h3>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {CUSTOM_VIDEO_MODELS.map((model) => {
                    const selected = selectedCustomVideoModel === model.id

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedCustomVideoModel(model.id)}
                        className={`flex min-h-[64px] items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-all hover:border-accent/70 hover:bg-accent/5 ${
                          selected
                            ? 'border-2 border-accent bg-accent/8 shadow-[0_0_0_3px_rgba(255,65,18,0.10)]'
                            : 'border-border bg-bg-surface'
                        }`}
                      >
                        <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border ${selected ? 'border-accent bg-accent text-white' : 'border-text-secondary bg-transparent'}`}>
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-extrabold leading-tight text-text-primary">{model.name}</span>
                          <span className="mt-0.5 block text-[12px] font-medium leading-snug text-text-secondary">{model.desc}</span>
                        </span>
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-fg/[0.10] px-2 py-0.5 text-[12px] font-extrabold text-text-primary">
                          <Gem size={14} className="text-accent" fill="currentColor" />
                          {model.tokens}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setCustomVideoStep('generate')}
                    disabled={!selectedCustomVideoModel}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                  >
                    Continue
                    <ChevronDown size={15} />
                  </button>
                </div>
              </div>
              <div className="flex min-h-full w-full max-w-[660px] animate-fade-in flex-col justify-center self-stretch py-5">
                <div className="text-center">
                  <h2 className="font-display text-[16px] font-extrabold tracking-tight text-text-primary sm:text-[18px]">
                    Generate a Video
                  </h2>
                  <p className="mt-1 text-[12px] font-medium text-text-secondary">
                    Write your direction · configure · generate
                  </p>
                </div>

                {customVideoType === 'image' && (
                  <div className="mt-5">
                    <p className="mb-1.5 text-[12px] font-extrabold text-text-primary">Image de référence *</p>
                    <button
                      type="button"
                      onClick={uploadCustomVideoImage}
                      className="relative flex h-[88px] w-full items-center justify-center overflow-hidden rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card text-center transition-colors hover:border-accent/70 hover:bg-accent/5"
                    >
                      {customVideoImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={customVideoImageUrl} alt="Référence" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="flex flex-col items-center gap-1.5 text-text-secondary">
                          <ImageIcon size={22} />
                          <span className="text-[12px] font-extrabold text-text-primary">Clique pour importer une image</span>
                        </span>
                      )}
                    </button>
                    <button type="button" onClick={() => setAssetPickerOpen(true)} className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-text-secondary transition hover:text-accent"><Images size={13} /> Depuis mes Assets</button>
                  </div>
                )}

                <div className="mt-4 overflow-hidden rounded-[16px] border border-border bg-bg-surface shadow-neo-sm transition-colors focus-within:border-accent/70">
                  <textarea
                    value={customVideoPrompt}
                    onChange={(event) => setCustomVideoPrompt(event.target.value)}
                    placeholder="Describe the video you want to generate..."
                    className="min-h-[96px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[13px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-secondary focus:shadow-none sm:min-h-[110px]"
                  />
                  <div className="flex min-h-[52px] flex-wrap items-center gap-4 border-t border-border px-5 py-2.5 text-[13px]">
                    <button
                      type="button"
                      onClick={() => setCustomVideoAspect((a) => a === 'portrait' ? 'landscape' : a === 'landscape' ? 'square' : 'portrait')}
                      className="inline-flex items-center gap-1.5 font-extrabold text-text-primary transition hover:text-accent capitalize"
                    >
                      {customVideoAspect === 'portrait' ? 'Portrait' : customVideoAspect === 'landscape' ? 'Landscape' : 'Square'}
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomVideoDuration((d) => d === 5 ? 10 : 5)}
                      className="inline-flex items-center gap-1.5 font-extrabold text-text-primary transition hover:text-accent"
                    >
                      {customVideoDuration}s
                      <ChevronDown size={14} />
                    </button>
                    {['720p', 'Standard'].map((label) => (
                      <span key={label} className="inline-flex items-center gap-1.5 font-extrabold text-text-secondary">
                        {label}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCustomVideoStep('models')}
                      title="Changer de modèle"
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-fg/[0.06] px-2.5 py-1 font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                    >
                      <Gem size={14} className="text-accent" fill="currentColor" /> {selectedCustomVideoModelDetails?.name ?? 'Modèle'}
                      <ChevronDown size={13} className="-rotate-90 text-text-secondary" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomVideoStep('models')}
                    className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-[12px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary transition hover:bg-fg/[0.12]"
                  >
                    <ChevronDown size={16} className="rotate-90" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={generateCustomVideo}
                    disabled={generatingCustomVideo || !customVideoPrompt.trim() || (customVideoType === 'image' && !customVideoImageUrl)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] bg-accent text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {generatingCustomVideo ? (
                      <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Génération de la vidéo…</>
                    ) : (
                      <><Wand2 size={16} /> Generate Video <span className="opacity-80">·</span> <Gem size={15} fill="currentColor" /> {selectedCustomVideoModelDetails?.tokens ?? 15}</>
                    )}
                  </button>
                </div>
              </div>
            </StepSlider>
          </main>
        </section>

        <AssetPickerModal open={assetPickerOpen} onClose={() => setAssetPickerOpen(false)} onPick={(url) => setCustomVideoImageUrl(url)} types={['image']} selectedUrls={[customVideoImageUrl]} closeOnPick title="Mes Assets (images)" />

        {actorLightboxOpen && actorVideoUrl && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setActorLightboxOpen(false)}>
            <button onClick={() => setActorLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={actorVideoUrl} controls autoPlay loop onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
            <a href={actorVideoUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-[780px] mx-auto pb-12 pt-2">
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
                if (type.id === 'clone-studio') { setMode('clone-studio') }
              }}
              className={`group relative h-[260px] overflow-hidden rounded-[20px] border border-border bg-bg-card text-left shadow-neo transition-all ${
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
              <div className="absolute right-4 top-4 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-extrabold text-accent shadow-neo-sm">
                Coming soon
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-5">
              <ArrowUpRight size={22} className={`absolute right-5 bottom-6 text-white/95 transition-transform ${isAvailable ? 'group-hover:scale-110' : ''}`} />
              <h2 className="font-display text-[20px] font-extrabold leading-tight text-white pr-10">
                {type.title}
              </h2>
              <p className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-white/82 pr-8">
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
