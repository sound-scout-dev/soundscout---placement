import { useEffect, useState } from 'react'

/** Loads an image URL into an HTMLImageElement Konva can draw, plus its natural size. */
export default function useHtmlImage(url) {
  const [image, setImage] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!url) {
      setImage(null)
      setSize({ width: 0, height: 0 })
      return
    }
    const img = new window.Image()
    img.src = url
    img.onload = () => {
      setImage(img)
      setSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    return () => {
      img.onload = null
    }
  }, [url])

  return [image, size]
}
