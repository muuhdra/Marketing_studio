/**
 * Helpers client (DOM) — capture de frames vidéo & lecture de fichier.
 * Utilisés pour le reverse-engineering (Gemini) : image → 1 frame, vidéo → N frames.
 * Les blobs locaux évitent tout souci de CORS (canvas non « tainted »).
 */

/** Capture une frame représentative (milieu) d'une vidéo locale. */
export function captureVideoFrame(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    let done = false
    const finish = (data: string | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(data)
    }
    const timer = setTimeout(() => finish(null), 8000)
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    video.onloadeddata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2) }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        const ctx = canvas.getContext('2d')
        if (!ctx) return finish(null)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL('image/jpeg', 0.8))
      } catch { finish(null) }
    }
    video.onerror = () => finish(null)
  })
}

/**
 * Capture N frames réparties uniformément sur la timeline (décomposition vidéo).
 * Renvoie un tableau ordonné de data URLs JPEG (peut être vide si échec).
 */
export function captureVideoFrames(file: File, count = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const frames: string[] = []
    let times: number[] = []
    let idx = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(frames)
    }
    // Garde-fou global (vidéos longues / codecs lents)
    const timer = setTimeout(finish, 20000)

    const grab = () => {
      try {
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.7))
        }
      } catch { /* frame ignorée */ }
      idx++
      if (idx < times.length) video.currentTime = times[idx]
      else finish()
    }

    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    video.onloadedmetadata = () => {
      const dur = video.duration && isFinite(video.duration) ? video.duration : 0
      times = dur > 0
        ? Array.from({ length: count }, (_, i) => (dur * (i + 1)) / (count + 1))  // évite début/fin exacts
        : [0]
      video.currentTime = times[0]
    }
    video.onseeked = grab
    video.onerror = finish
  })
}

/** Lit un fichier image local en data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Lecture du fichier échouée'))
    r.readAsDataURL(file)
  })
}
