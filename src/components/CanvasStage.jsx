import { Fragment, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text, Group, Transformer } from 'react-konva'

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
export default function CanvasStage({ image, imgSize, step, scene, onPointerDown, onPointerMove, onStageTransform, stageRef }) {
  const wrapperRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const stageGroupRef = useRef(null)
  const transformerRef = useRef(null)

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

  const { stageMarker, stageDraftCorner, crowd, suggestions, previewPoint } = scene
  // The box is only draggable/resizable/rotatable while its own step is
  // active and it hasn't been confirmed yet — matches how every other layer
  // freezes once you move past its step, and avoids the transform handles
  // eating clicks meant for drawing the crowd polygon on the same canvas.
  const isStageEditable = step === 'stage' && !!stageMarker && !stageMarker.locked

  useEffect(() => {
    if (isStageEditable && stageGroupRef.current && transformerRef.current) {
      transformerRef.current.nodes([stageGroupRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [isStageEditable])

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

  // Konva Text can't read the label text's own bounding box before it's
  // drawn, so a fixed shadow gives every canvas label a readable halo
  // against a photo of any brightness, in either app theme.
  const labelShadow = { shadowColor: 'black', shadowBlur: 4, shadowOpacity: 0.85, shadowOffset: { x: 0, y: 0 } }

  return (
    <div ref={wrapperRef} className="flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        className="rounded border border-gray-200 bg-gray-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        style={{ width: displayWidth, height: displayHeight, cursor: isInteractive && !isStageEditable ? 'crosshair' : 'default' }}
      >
        <Stage
          ref={stageRef}
          width={displayWidth}
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            // Once a stage box exists, Planner's handler no-ops regardless of
            // what was clicked — so a mousedown that starts a drag/resize on
            // the box itself is harmless here; Konva handles that natively.
            const p = getImagePoint(e)
            if (p) onPointerDown(p)
          }}
          onMouseMove={(e) => {
            const p = getImagePoint(e)
            if (p) onPointerMove(p)
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

            {/* Rubber-band preview while drawing a brand-new stage box
                (before the second click finalizes it into a real shape). */}
            {!stageMarker && stageDraftCorner && (
              <Rect
                x={Math.min(stageDraftCorner.x, (previewPoint ?? stageDraftCorner).x)}
                y={Math.min(stageDraftCorner.y, (previewPoint ?? stageDraftCorner).y)}
                width={Math.abs((previewPoint ?? stageDraftCorner).x - stageDraftCorner.x)}
                height={Math.abs((previewPoint ?? stageDraftCorner).y - stageDraftCorner.y)}
                fill="rgba(55,65,81,0.4)"
                stroke={COLORS.markerStroke}
                strokeWidth={1.5 / scale}
                dash={[6 / scale, 4 / scale]}
              />
            )}

            {/* Stage box — a rotatable, draggable, resizable Konva Group once
                drawn. Transform handles (Transformer below) appear whenever
                it's editable; dragging/resizing/rotating reports back up to
                the Planner via onStageTransform. */}
            {stageMarker && (
              <>
                <Group
                  ref={stageGroupRef}
                  x={stageMarker.x}
                  y={stageMarker.y}
                  rotation={stageMarker.rotation}
                  draggable={isStageEditable}
                  onDragEnd={(e) => onStageTransform({ x: e.target.x(), y: e.target.y() })}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const nextWidth = Math.max(10, stageMarker.width * node.scaleX())
                    const nextHeight = Math.max(10, stageMarker.height * node.scaleY())
                    node.scaleX(1)
                    node.scaleY(1)
                    onStageTransform({ x: node.x(), y: node.y(), width: nextWidth, height: nextHeight, rotation: node.rotation() })
                  }}
                >
                  <Rect
                    x={-stageMarker.width / 2}
                    y={-stageMarker.height / 2}
                    width={stageMarker.width}
                    height={stageMarker.height}
                    fill="rgba(55,65,81,0.55)"
                    stroke={COLORS.markerStroke}
                    strokeWidth={1.5 / scale}
                    dash={stageMarker.locked ? undefined : [6 / scale, 4 / scale]}
                  />
                  <Text
                    x={-stageMarker.width / 2 + 6 / scale}
                    y={-stageMarker.height / 2 - 18 / scale}
                    text={stageMarker.suggested && !stageMarker.locked ? 'STAGE (AI SUGGESTED)' : 'STAGE'}
                    fontFamily="Space Grotesk"
                    fontSize={12 / scale}
                    fontStyle="bold"
                    fill="#FFFFFF"
                    {...labelShadow}
                  />
                </Group>
                {isStageEditable && (
                  <Transformer
                    ref={transformerRef}
                    rotateEnabled
                    anchorSize={9 / scale}
                    anchorStroke={COLORS.stage}
                    anchorFill="#FFFFFF"
                    borderStroke={COLORS.stage}
                    borderDash={[4 / scale, 3 / scale]}
                    rotateAnchorOffset={22 / scale}
                    boundBoxFunc={(oldBox, newBox) => (newBox.width < 15 || newBox.height < 15 ? oldBox : newBox)}
                  />
                )}
              </>
            )}

            {/* AI-generated suggestions */}
            {suggestions?.mainPAs && (
              <>
                {suggestions.mainPAs.map((hang) => (
                  <Fragment key={hang.side}>
                    <Circle x={hang.x} y={hang.y} radius={8 / scale} fill={COLORS.mainPA} stroke={COLORS.markerStroke} strokeWidth={1.5 / scale} />
                    <Text
                      x={hang.x + 12 / scale}
                      y={hang.y - 8 / scale}
                      text={`MAIN PA — ${hang.side.toUpperCase()}`}
                      fontFamily="Space Grotesk"
                      fontSize={12 / scale}
                      fontStyle="bold"
                      fill={COLORS.mainPA}
                      {...labelShadow}
                    />
                  </Fragment>
                ))}
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
