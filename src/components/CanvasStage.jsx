import { Fragment, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle, Arrow, Text } from 'react-konva'
import useHtmlImage from '../utils/useHtmlImage'

const INTERACTIVE_STEPS = new Set(['calibrate', 'stage', 'crowd'])

/**
 * Pure-ish renderer + pointer-event relay. It owns responsive scaling and
 * coordinate conversion (screen px -> original image px); the Planner page
 * owns all workflow state and decides what `scene` looks like at any given
 * step.
 */
export default function CanvasStage({ imageUrl, step, scene, onPointerDown, onPointerMove, onDoubleClick, stageRef }) {
  const [image, imgSize] = useHtmlImage(imageUrl)
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
      <div ref={wrapperRef} className="flex flex-1 items-center justify-center text-sm text-slate">
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

  const { calibration, stageMarker, crowd, suggestions, previewPoint } = scene

  return (
    <div ref={wrapperRef} className="flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        className="hairline rounded bg-black/20"
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

            {/* Calibration line */}
            {calibration?.a && (
              <>
                <Line
                  points={[calibration.a.x, calibration.a.y, (calibration.b ?? previewPoint ?? calibration.a).x, (calibration.b ?? previewPoint ?? calibration.a).y]}
                  stroke="#1F8A70"
                  strokeWidth={2 / scale}
                  dash={calibration.locked ? undefined : [8 / scale, 5 / scale]}
                />
                <Circle x={calibration.a.x} y={calibration.a.y} radius={5 / scale} fill="#1F8A70" />
                {calibration.b && <Circle x={calibration.b.x} y={calibration.b.y} radius={5 / scale} fill="#1F8A70" />}
                {calibration.locked && calibration.label && (
                  <Text
                    x={(calibration.a.x + calibration.b.x) / 2}
                    y={(calibration.a.y + calibration.b.y) / 2 - 18 / scale}
                    text={calibration.label}
                    fontFamily="IBM Plex Mono"
                    fontSize={13 / scale}
                    fill="#F7F5F1"
                  />
                )}
              </>
            )}

            {/* Crowd boundary */}
            {crowd?.points?.length > 0 && (
              <Line
                points={crowd.points.flatMap((p) => [p.x, p.y]).concat(!crowd.locked && previewPoint ? [previewPoint.x, previewPoint.y] : [])}
                closed={crowd.locked}
                stroke="#FFB020"
                strokeWidth={2 / scale}
                dash={crowd.locked ? undefined : [8 / scale, 5 / scale]}
                fill={crowd.locked ? 'rgba(255,176,32,0.12)' : undefined}
              />
            )}
            {crowd?.points?.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={4 / scale} fill="#FFB020" />
            ))}

            {/* Stage + facing direction */}
            {stageMarker?.position && (
              <>
                <Circle x={stageMarker.position.x} y={stageMarker.position.y} radius={7 / scale} fill="#5C5C6E" stroke="#F7F5F1" strokeWidth={1.5 / scale} />
                <Text
                  x={stageMarker.position.x + 10 / scale}
                  y={stageMarker.position.y - 22 / scale}
                  text="STAGE"
                  fontFamily="Space Grotesk"
                  fontSize={12 / scale}
                  fill="#F7F5F1"
                />
                {(stageMarker.facing || previewPoint) && (
                  <Arrow
                    points={[
                      stageMarker.position.x,
                      stageMarker.position.y,
                      (stageMarker.facing ?? previewPoint).x,
                      (stageMarker.facing ?? previewPoint).y,
                    ]}
                    stroke="#F7F5F1"
                    fill="#F7F5F1"
                    strokeWidth={2 / scale}
                    pointerLength={10 / scale}
                    pointerWidth={8 / scale}
                    dash={stageMarker.locked ? undefined : [6 / scale, 4 / scale]}
                  />
                )}
              </>
            )}

            {/* AI-generated suggestions */}
            {suggestions?.mainPA && (
              <>
                <Circle x={suggestions.mainPA.x} y={suggestions.mainPA.y} radius={8 / scale} fill="#FFB020" stroke="#12122B" strokeWidth={1.5 / scale} />
                <Text
                  x={suggestions.mainPA.x + 12 / scale}
                  y={suggestions.mainPA.y - 8 / scale}
                  text="MAIN PA"
                  fontFamily="Space Grotesk"
                  fontSize={12 / scale}
                  fill="#FFB020"
                />
                {suggestions.delayTowers.map((tower, i) => (
                  <Fragment key={tower.id}>
                    <Line
                      points={[suggestions.mainPA.x, suggestions.mainPA.y, tower.position.x, tower.position.y]}
                      stroke="#1F8A70"
                      strokeWidth={1.5 / scale}
                      dash={[5 / scale, 4 / scale]}
                    />
                    <Circle x={tower.position.x} y={tower.position.y} radius={8 / scale} fill="#1F8A70" stroke="#12122B" strokeWidth={1.5 / scale} />
                    <Text
                      x={tower.position.x + 12 / scale}
                      y={tower.position.y - 20 / scale}
                      text={`D${i + 1}`}
                      fontFamily="Space Grotesk"
                      fontSize={12 / scale}
                      fill="#1F8A70"
                    />
                    <Text
                      x={tower.position.x + 12 / scale}
                      y={tower.position.y - 4 / scale}
                      text={`${tower.recommendedDelayMs.toFixed(0)} ms`}
                      fontFamily="IBM Plex Mono"
                      fontSize={12 / scale}
                      fill="#F7F5F1"
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
