import { useEffect, useState } from 'react'

/**
 * Loads an image URL into an HTMLImageElement Konva can draw, plus its
 * natural size. Returns an error string too — without an onerror handler, a
 * corrupt file or a URL the browser can't decode would otherwise leave
 * every step waiting on this silently, forever, with no feedback.
 */
export default function useHtmlImage(url) {
  const [image, setImage] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) {
      setImage(null)
      setSize({ width: 0, height: 0 })
      setError(null)
      return
    }
    setError(null)
    const img = new window.Image()
    img.src = url
    img.onload = () => {
      setImage(img)
      setSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      setError("Couldn't load that image — it may be corrupted or an unsupported format.")
    }
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return [image, size, error]
}
