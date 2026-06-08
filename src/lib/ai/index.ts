/**
 * AIML API — Point d'entrée unifié
 *
 * Import depuis '@/lib/ai' pour accéder à tous les services IA.
 *
 * Pipeline de génération enrichie :
 *   1. runResearchAgent()   → Perplexity cherche les tendances actuelles
 *   2. generateScript()     → Claude/ChatGPT génère avec le contexte recherche
 *   3. submitVideoGeneration() → Kling/Seedance produit la vidéo
 *   4. generateSpeech()     → ElevenLabs/MiniMax ajoute la voix
 */

export * from './client'
export * from './research'
export * from './text'
export * from './image'
export * from './video'
export * from './tts'
