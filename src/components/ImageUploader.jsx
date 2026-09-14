import { useCallback, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import Button from './Button'

export default function ImageUploader({ onImageSelected }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Please upload a JPG or PNG image.')
        return
      }
      setError('')
      const url = URL.createObjectURL(file)
      onImageSelected(url)
    },
    [onImageSelected]
  )

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={[
          'w-full max-w-xl rounded-xl border-2 border-dashed bg-white px-8 py-16 text-center shadow-sm transition-colors dark:bg-zinc-900',
          isDragOver ? 'border-cyan-600 bg-cyan-600/5' : 'border-gray-300 dark:border-zinc-700',
        ].join(' ')}
      >
        <UploadCloud className="mx-auto text-gray-400 dark:text-zinc-500" size={32} strokeWidth={1.5} />
        <p className="mt-3 font-display text-base font-semibold text-gray-900 dark:text-white">Upload a drone or venue photo</p>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-zinc-400">Drag &amp; drop a JPG or PNG here, or choose a file below.</p>

        <label className="mt-6 inline-block">
          <Button as="span" className="cursor-pointer">
            Choose Photo
          </Button>
          <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>

        {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

        <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">
          Next: draw a line on a known-length object to calibrate scale
        </p>
      </div>
    </div>
  )
}
