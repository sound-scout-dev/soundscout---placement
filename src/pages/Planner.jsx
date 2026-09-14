import { useMemo, useRef, useState } from 'react'
import Toolbar from '../components/Toolbar'
import Disclaimer from '../components/Disclaimer'
import ImageUploader from '../components/ImageUploader'
import CanvasStage from '../components/CanvasStage'
import StepInstructions from '../components/StepInstructions'
import ResultsPanel from '../components/ResultsPanel'
import { generateSuggestions, computeMetersPerPixel, DEFAULT_TEMPERATURE_C } from '../utils/acoustics'
import { estimateScaleFromPhoto } from '../utils/aiService'
import { stepIndex } from '../utils/steps'

const EMPTY_CALIBRATION = { a: null, b: null, locked: false, realDistanceMeters: null, metersPerPixel: null, label: null }
// The stage is just a box, drawn corner-to-corner — same shape as calibration.
const EMPTY_STAGE = { a: null, b: null, locked: false }
const EMPTY_CROWD = { points: [], locked: false }

export default function Planner() {
  const [imageUrl, setImageUrl] = useState(null)
  const [temperatureC, setTemperatureC] = useState(DEFAULT_TEMPERATURE_C)
  const [calibration, setCalibration] = useState(EMPTY_CALIBRATION)
  const [stage, setStage] = useState(EMPTY_STAGE)
  const [crowd, setCrowd] = useState(EMPTY_CROWD)
  const [step, setStep] = useState('upload')
  const [furthestStep, setFurthestStep] = useState('upload')
  const [previewPoint, setPreviewPoint] = useState(null)

  const stageRef = useRef(null)

  const advanceTo = (key) => {
    setStep(key)
    setFurthestStep((prev) => (stepIndex(key) > stepIndex(prev) ? key : prev))
  }

  const jumpToStep = (key) => {
    setStep(key)
    // Re-opens that layer for editing. Downstream results just recompute
    // live from whatever the layers end up holding, so nothing else needs
    // to be cleared.
    if (key === 'calibrate') setCalibration((prev) => ({ ...prev, locked: false }))
    if (key === 'stage') setStage((prev) => ({ ...prev, locked: false }))
    if (key === 'crowd') setCrowd((prev) => ({ ...prev, locked: false }))
  }

  const handleImageSelected = (url) => {
    setImageUrl(url)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setCrowd(EMPTY_CROWD)
    advanceTo('calibrate')
  }

  const handleReset = () => {
    setImageUrl(null)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setCrowd(EMPTY_CROWD)
    setTemperatureC(DEFAULT_TEMPERATURE_C)
    setStep('upload')
    setFurthestStep('upload')
  }

  const handlePointerDown = (point) => {
    if (step === 'calibrate') {
      setCalibration((prev) => {
        if (!prev.a || (prev.a && prev.b)) return { ...EMPTY_CALIBRATION, a: point }
        return { ...prev, b: point }
      })
    } else if (step === 'stage') {
      setStage((prev) => {
        if (!prev.a || (prev.a && prev.b)) return { ...EMPTY_STAGE, a: point }
        advanceTo('crowd')
        return { ...prev, b: point, locked: true }
      })
    } else if (step === 'crowd') {
      setCrowd((prev) => ({ ...prev, points: [...prev.points, point] }))
    }
  }

  const handleConfirmDistance = (meters) => {
    setCalibration((prev) => {
      const metersPerPixel = computeMetersPerPixel(prev.a, prev.b, meters)
      return { ...prev, realDistanceMeters: meters, metersPerPixel, locked: true, label: `${meters}m` }
    })
    advanceTo('stage')
  }

  // Snapshots the canvas (photo + the calibration line drawn on it) and asks
  // the AI service to suggest a real-world distance. The caller (the
  // "Confirm Scale" form) still requires the vendor to review/edit and
  // submit the value themselves — this only pre-fills a starting guess.
  const handleRequestScaleEstimate = async () => {
    const stage = stageRef.current
    if (!stage) throw new Error('Canvas is not ready yet.')
    const dataUrl = stage.toDataURL({ pixelRatio: 1 })
    return estimateScaleFromPhoto(dataUrl)
  }

  // Center of the drawn stage box. There's no separate "facing" input
  // anymore — generateSuggestions derives the sound-projection axis itself,
  // from this point toward the crowd's centroid, once both exist. Memoized
  // on the underlying coordinates (not just stage.a/stage.b) so it keeps a
  // stable reference across renders where the box hasn't actually moved —
  // otherwise the suggestions useMemo below would never actually memoize.
  const stageCenter = useMemo(
    () => (stage.a && stage.b ? { x: (stage.a.x + stage.b.x) / 2, y: (stage.a.y + stage.b.y) / 2 } : null),
    [stage.a, stage.b]
  )

  const stageDimensionsMeters =
    stage.locked && calibration.metersPerPixel
      ? {
          width: Math.abs(stage.b.x - stage.a.x) * calibration.metersPerPixel,
          depth: Math.abs(stage.b.y - stage.a.y) * calibration.metersPerPixel,
        }
      : null

  const suggestions = useMemo(() => {
    if (!calibration.locked || !stage.locked || !crowd.locked) return null
    return generateSuggestions({
      stagePosition: stageCenter,
      crowdPoints: crowd.points,
      metersPerPixel: calibration.metersPerPixel,
      temperatureCelsius: temperatureC,
    })
  }, [calibration.locked, calibration.metersPerPixel, stage.locked, stageCenter, crowd.locked, crowd.points, temperatureC])

  const scene = {
    calibration: calibration.a ? calibration : null,
    stageMarker: stage.a ? stage : null,
    crowd,
    suggestions,
    previewPoint: step === 'upload' || step === 'results' ? null : previewPoint,
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50 dark:bg-zinc-950">
      <Toolbar
        step={step}
        furthestStep={furthestStep}
        onJumpToStep={jumpToStep}
        temperatureC={temperatureC}
        onTemperatureChange={setTemperatureC}
        onReset={handleReset}
        hasImage={!!imageUrl}
      />
      <Disclaimer />

      {imageUrl && (
        <StepInstructions
          step={step}
          calibration={calibration}
          crowd={crowd}
          onConfirmDistance={handleConfirmDistance}
          onRequestScaleEstimate={handleRequestScaleEstimate}
          onUndoCrowdPoint={() => setCrowd((prev) => ({ ...prev, points: prev.points.slice(0, -1) }))}
          onClearCrowd={() => setCrowd((prev) => ({ ...prev, points: [] }))}
          onFinishCrowd={() => {
            setCrowd((prev) => ({ ...prev, locked: true }))
            advanceTo('results')
          }}
          onRestartStage={() => setStage(EMPTY_STAGE)}
        />
      )}

      <main className="flex flex-1 flex-col sm:flex-row">
        {!imageUrl ? (
          <ImageUploader onImageSelected={handleImageSelected} />
        ) : (
          <>
            <CanvasStage
              imageUrl={imageUrl}
              step={step}
              scene={scene}
              onPointerDown={handlePointerDown}
              onPointerMove={setPreviewPoint}
              onDoubleClick={() => {}}
              stageRef={stageRef}
            />
            <ResultsPanel
              calibration={calibration}
              suggestions={suggestions}
              temperatureC={temperatureC}
              stageRef={stageRef}
              stageDimensionsMeters={stageDimensionsMeters}
            />
          </>
        )}
      </main>
    </div>
  )
}
