import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'

type StoredVideo = {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  dataUrl: string
}

const STORAGE_KEY = 'video-library-v1'
const MAX_FILE_SIZE_MB = 20

export const Route = createFileRoute('/')({
  component: VideoLibraryPage,
})

function VideoLibraryPage() {
  const [videos, setVideos] = useState<StoredVideo[]>([])
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const savedVideos = localStorage.getItem(STORAGE_KEY)
    if (!savedVideos) return

    try {
      const parsedVideos = JSON.parse(savedVideos) as StoredVideo[]
      setVideos(parsedVideos)
    } catch (error) {
      console.error('Could not parse saved videos', error)
      setErrorMessage('No se pudieron recuperar los videos guardados previamente.')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
  }, [videos])

  const totalSizeMb = useMemo(() => {
    const bytes = videos.reduce((total, video) => total + video.size, 0)
    return (bytes / (1024 * 1024)).toFixed(2)
  }, [videos])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage(null)

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Selecciona un archivo de video válido.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`El video supera ${MAX_FILE_SIZE_MB} MB. Usa un archivo más ligero.`)
      event.target.value = ''
      return
    }

    setIsReadingFile(true)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const storedVideo: StoredVideo = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
      }

      setVideos((currentVideos) => [storedVideo, ...currentVideos])
    } catch (error) {
      console.error('Error while reading file', error)
      setErrorMessage('Hubo un error al subir el video. Inténtalo de nuevo.')
    } finally {
      event.target.value = ''
      setIsReadingFile(false)
    }
  }

  const deleteVideo = (videoId: string) => {
    setVideos((currentVideos) => currentVideos.filter((video) => video.id !== videoId))
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Mi videoteca</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sube videos, guárdalos localmente y reprodúcelos después desde esta misma página.
          </p>

          <label
            htmlFor="video-upload"
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            {isReadingFile ? 'Subiendo video...' : 'Subir video'}
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            disabled={isReadingFile}
            onChange={handleFileSelect}
          />

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              Videos guardados: <span className="font-semibold">{videos.length}</span>
            </p>
            <p>
              Tamaño total aprox.: <span className="font-semibold">{totalSizeMb} MB</span>
            </p>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {videos.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm md:col-span-2">
              Aún no hay videos. Sube uno para empezar.
            </div>
          ) : (
            videos.map((video) => (
              <article key={video.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <video
                  controls
                  className="aspect-video w-full rounded-lg bg-black"
                  preload="metadata"
                  src={video.dataUrl}
                >
                  Tu navegador no soporta la reproducción de video.
                </video>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="line-clamp-1 text-sm font-semibold text-slate-900">{video.name}</h2>
                    <p className="text-xs text-slate-500">
                      {(video.size / (1024 * 1024)).toFixed(2)} MB ·{' '}
                      {new Date(video.uploadedAt).toLocaleString('es-ES')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteVideo(video.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}
