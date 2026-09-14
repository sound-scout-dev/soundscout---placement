import { useCallback, useState } from 'react'

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
          'w-full max-w-xl rounded border-2 border-dashed bg-paper/[0.03] px-8 py-16 text-center transition-colors',
          isDragOver ? 'border-signal-amber bg-signal-amber/5' : 'border-slate/30',
        ].join(' ')}
      >
        <p className="font-heading text-base font-semibold text-paper">Upload a drone or venue photo</p>
        <p className="mt-1.5 text-sm text-slate">Drag &amp; drop a JPG or PNG here, or choose a file below.</p>

        <label className="mt-6 inline-block cursor-pointer rounded bg-signal-amber px-4 py-2 text-sm font-medium text-ink-navy hover:bg-signal-amber/90 transition-colors">
          Choose Photo
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

        <p className="mt-8 text-xs text-slate/70">
          Next, you'll draw a line on a known-length object (like a fence or building edge) to calibrate scale.
        </p>
      </div>
    </div>
  )
}
