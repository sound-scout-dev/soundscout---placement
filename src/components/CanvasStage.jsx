import { Fragment, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text } from 'react-konva'

const INTERACTIVE_STEPS = new Set(['stage', 'crowd'])

// Marker colors follow the same semantic roles the main platform uses
// elsewhere (StatusBadge, links): cyan = in-progress/measurement, emerald =
// confirmed/primary result, amber = a boundary/highlight, neutral gray for
// structural elements. Markers sit on top of an arbitrary photo, not app
// chrome, so each pairs a solid fill with a contrasting stroke ring to stay
// legible regardless of the photo underneath or the app's light/dark theme.
const COLORS = {
  stage: '#374151', // gray-700
  crowd: '#F59E0B', // amber-500
  mainPA: '#059669', // emerald-600
  delayTower: '#0891B2', // cyan-600
  markerStroke: '#FFFFFF',
}

/**
 * Pure-ish renderer + pointer-event relay. It owns responsive scaling; the
 * Planner page owns image loading (it needs the natural size itself, to
 * convert the AI's normalized stage suggestion into pixel coordinates) and
 * all workflow state, deciding what `scene` looks like at any given step.
 */
export default function CanvasStage({ image, imgSize, step, scene, onPointerDown, onPointerMove, onDoubleClick, stageRef }) {
  const wrapperRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!wrapperRef.current) return
    const el = wrapperRef.current
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!image || imgSize.width === 0) {
    return (
      <div ref={wrapperRef} className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-zinc-400">
        Loading photo…
      </div>
    )
  }

  const scale = Math.min(
    containerSize.width ? containerSize.width / imgSize.width : 1,
    containerSize.height ? containerSize.height / imgSize.height : 1,
    1.5 // don't upscale a small photo into a blurry mess
  )
  const displayWidth = imgSize.width * scale
  const displayHeight = imgSize.height * scale

  const getImagePoint = (konvaEvent) => {
    const stage = konvaEvent.target.getStage()
    return stage.getPointerPosition() ? stage.getRelativePointerPosition() : null
  }

  const isInteractive = INTERACTIVE_STEPS.has(step)

  const { stageMarker, crowd, suggestions, previewPoint } = scene

  // Konva Text can't read the label text's own bounding box before it's
  // drawn, so a fixed shadow gives every canvas label a readable halo
  // against a photo of any brightness, in either app theme.
  const labelShadow = { shadowColor: 'black', shadowBlur: 4, shadowOpacity: 0.85, shadowOffset: { x: 0, y: 0 } }

  return (
    <div ref={wrapperRef} className="flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        className="rounded border border-gray-200 bg-gray-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        style={{ width: displayWidth, height: displayHeight, cursor: isInteractive ? 'crosshair' : 'default' }}
      >
        <Stage
          ref={stageRef}
          width={displayWidth}
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            const p = getImagePoint(e)
            if (p) onPointerDown(p)
          }}
          onMouseMove={(e) => {
            const p = getImagePoint(e)
            if (p) onPointerMove(p)
          }}
          onDblClick={(e) => {
            const p = getImagePoint(e)
            if (p) onDoubleClick(p)
          }}
        >
          <Layer>
            <KonvaImage image={image} width={imgSize.width} height={imgSize.height} />

            {/* Crowd boundary */}
            {crowd?.points?.length > 0 && (
              <Line
                points={crowd.points.flatMap((p) => [p.x, p.y]).concat(!crowd.locked && previewPoint ? [previewPoint.x, previewPoint.y] : [])}
                closed={crowd.locked}
                stroke={COLORS.crowd}
                strokeWidth={2 / scale}
                dash={crowd.locked ? undefined : [8 / scale, 5 / scale]}
                fill={crowd.locked ? 'rgba(245,158,11,0.15)' : undefined}
              />
            )}
            {crowd?.points?.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={4 / scale} fill={COLORS.crowd} stroke={COLORS.markerStroke} strokeWidth={1 / scale} />
            ))}

            {/* Stage box — drawn corner-to-corner, same interaction as the
                calibration line: click one corner, then the opposite one. */}
            {stageMarker?.a && (
              <>
                <Rect
                  x={Math.min(stageMarker.a.x, (stageMarker.b ?? previewPoint ?? stageMarker.a).x)}
                  y={Math.min(stageMarker.a.y, (stageMarker.b ?? previewPoint ?? stageMarker.a).y)}
                  width={Math.abs((stageMarker.b ?? previewPoint ?? stageMarker.a).x - stageMarker.a.x)}
                  height={Math.abs((stageMarker.b ?? previewPoint ?? stageMarker.a).y - stageMarker.a.y)}
                  fill="rgba(55,65,81,0.55)"
                  stroke={COLORS.markerStroke}
                  strokeWidth={1.5 / scale}
                  dash={stageMarker.locked ? undefined : [6 / scale, 4 / scale]}
                />
                <Circle x={stageMarker.a.x} y={stageMarker.a.y} radius={4 / scale} fill={COLORS.stage} stroke={COLORS.markerStroke} strokeWidth={1 / scale} />
                {stageMarker.b && <Circle x={stageMarker.b.x} y={stageMarker.b.y} radius={4 / scale} fill={COLORS.stage} stroke={COLORS.markerStroke} strokeWidth={1 / scale} />}
                <Text
                  x={Math.min(stageMarker.a.x, (stageMarker.b ?? previewPoint ?? stageMarker.a).x) + 6 / scale}
                  y={Math.min(stageMarker.a.y, (stageMarker.b ?? previewPoint ?? stageMarker.a).y) - 18 / scale}
                  text={stageMarker.suggested && !stageMarker.locked ? 'STAGE (AI SUGGESTED)' : 'STAGE'}
                  fontFamily="Space Grotesk"
                  fontSize={12 / scale}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  {...labelShadow}
                />
              </>
            )}

            {/* AI-generated suggestions */}
            {suggestions?.mainPA && (
              <>
                <Circle x={suggestions.mainPA.x} y={suggestions.mainPA.y} radius={8 / scale} fill={COLORS.mainPA} stroke={COLORS.markerStroke} strokeWidth={1.5 / scale} />
                <Text
                  x={suggestions.mainPA.x + 12 / scale}
                  y={suggestions.mainPA.y - 8 / scale}
                  text="MAIN PA"
                  fontFamily="Space Grotesk"
                  fontSize={12 / scale}
                  fontStyle="bold"
                  fill={COLORS.mainPA}
                  {...labelShadow}
                />
                {suggestions.delayTowers.map((tower, i) => (
                  <Fragment key={tower.id}>
                    <Line
                      points={[suggestions.mainPA.x, suggestions.mainPA.y, tower.position.x, tower.position.y]}
                      stroke={COLORS.delayTower}
                      strokeWidth={1.5 / scale}
                      dash={[5 / scale, 4 / scale]}
                    />
                    <Circle x={tower.position.x} y={tower.position.y} radius={8 / scale} fill={COLORS.delayTower} stroke={COLORS.markerStroke} strokeWidth={1.5 / scale} />
                    <Text
                      x={tower.position.x + 12 / scale}
                      y={tower.position.y - 20 / scale}
                      text={`D${i + 1}`}
                      fontFamily="Space Grotesk"
                      fontSize={12 / scale}
                      fontStyle="bold"
                      fill={COLORS.delayTower}
                      {...labelShadow}
                    />
                    <Text
                      x={tower.position.x + 12 / scale}
                      y={tower.position.y - 4 / scale}
                      text={`${tower.recommendedDelayMs.toFixed(0)} ms`}
                      fontFamily="IBM Plex Mono"
                      fontSize={12 / scale}
                      fill="#FFFFFF"
                      {...labelShadow}
                    />
                  </Fragment>
                ))}
              </>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
