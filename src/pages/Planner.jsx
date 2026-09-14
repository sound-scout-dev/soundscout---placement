import { useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from '../components/Toolbar'
import Disclaimer from '../components/Disclaimer'
import ImageUploader from '../components/ImageUploader'
import CanvasStage from '../components/CanvasStage'
import AnalyzingOverlay from '../components/AnalyzingOverlay'
import StepInstructions from '../components/StepInstructions'
import ResultsPanel from '../components/ResultsPanel'
import { generateSuggestions, DEFAULT_TEMPERATURE_C } from '../utils/acoustics'
import { analyzeVenuePhoto } from '../utils/aiService'
import useHtmlImage from '../utils/useHtmlImage'
import { stepIndex } from '../utils/steps'

const EMPTY_CALIBRATION = { metersPerPixel: null, reasoning: null, confidence: null }
// The stage is just a box, drawn corner-to-corner. `suggested` marks a box
// that came from the AI analysis and hasn't been accepted or overridden yet.
const EMPTY_STAGE = { a: null, b: null, locked: false, suggested: false, reasoning: null }
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
  const [analysisError, setAnalysisError] = useState(null)
  // Bumped to force the analysis effect to re-run even when `step` is
  // already 'analyzing' (setStep('analyzing') alone is a no-op then, since
  // React bails out on an unchanged value) — e.g. retrying after an error,
  // or re-opening "Analyze" from the breadcrumb while still on that step.
  const [analysisAttempt, setAnalysisAttempt] = useState(0)

  const stageRef = useRef(null)
  // Loaded once here (not inside CanvasStage) because converting the AI's
  // normalized stage-box suggestion into pixel coordinates needs the
  // photo's natural dimensions.
  const [image, imgSize] = useHtmlImage(imageUrl)

  const advanceTo = (key) => {
    setStep(key)
    setFurthestStep((prev) => (stepIndex(key) > stepIndex(prev) ? key : prev))
  }

  const jumpToStep = (key) => {
    setStep(key)
    // Re-opens that layer for editing. Downstream results just recompute
    // live from whatever the layers end up holding, so nothing else needs
    // to be cleared. Jumping back to "Analyze" re-runs the AI analysis.
    if (key === 'analyzing') setAnalysisAttempt((n) => n + 1)
    if (key === 'stage') setStage((prev) => ({ ...prev, locked: false }))
    if (key === 'crowd') setCrowd((prev) => ({ ...prev, locked: false }))
  }

  const handleImageSelected = (url) => {
    setImageUrl(url)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setCrowd(EMPTY_CROWD)
    setAnalysisError(null)
    advanceTo('analyzing')
  }

  const handleReset = () => {
    setImageUrl(null)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setCrowd(EMPTY_CROWD)
    setTemperatureC(DEFAULT_TEMPERATURE_C)
    setAnalysisError(null)
    setStep('upload')
    setFurthestStep('upload')
  }

  // Fully automatic: no vendor-drawn reference line. As soon as the photo
  // has loaded, send it to the AI service to get both a scale estimate and
  // a suggested stage placement in one call.
  useEffect(() => {
    if (step !== 'analyzing' || !imageUrl || !imgSize.width) return
    let cancelled = false
    setAnalysisError(null)

    analyzeVenuePhoto(imageUrl)
      .then((result) => {
        if (cancelled) return
        setCalibration({
          metersPerPixel: result.meters_per_pixel,
          reasoning: result.scale_reasoning,
          confidence: result.scale_confidence,
        })
        if (result.stage_box) {
          setStage({
            a: { x: result.stage_box.x1 * imgSize.width, y: result.stage_box.y1 * imgSize.height },
            b: { x: result.stage_box.x2 * imgSize.width, y: result.stage_box.y2 * imgSize.height },
            locked: false,
            suggested: true,
            reasoning: result.stage_reasoning,
          })
        }
        advanceTo('stage')
      })
      .catch((err) => {
        if (!cancelled) setAnalysisError(err.message || 'Could not reach the AI service.')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, imageUrl, imgSize.width, imgSize.height, analysisAttempt])

  const handlePointerDown = (point) => {
    if (step === 'stage') {
      setStage((prev) => {
        if (!prev.a || (prev.a && prev.b)) return { ...EMPTY_STAGE, a: point }
        advanceTo('crowd')
        return { ...prev, b: point, locked: true }
      })
    } else if (step === 'crowd') {
      setCrowd((prev) => ({ ...prev, points: [...prev.points, point] }))
    }
  }

  const handleAcceptStageSuggestion = () => {
    setStage((prev) => ({ ...prev, locked: true }))
    advanceTo('crowd')
  }

  // Center of the drawn stage box. There's no separate "facing" input —
  // generateSuggestions derives the sound-projection axis itself, from this
  // point toward the crowd's centroid, once both exist. Memoized on the
  // underlying coordinates so it keeps a stable reference across renders
  // where the box hasn't actually moved.
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
    if (!calibration.metersPerPixel || !stage.locked || !crowd.locked) return null
    return generateSuggestions({
      stagePosition: stageCenter,
      crowdPoints: crowd.points,
      metersPerPixel: calibration.metersPerPixel,
      temperatureCelsius: temperatureC,
    })
  }, [calibration.metersPerPixel, stage.locked, stageCenter, crowd.locked, crowd.points, temperatureC])

  const scene = {
    stageMarker: stage.a ? stage : null,
    crowd,
    suggestions,
    previewPoint: step === 'upload' || step === 'analyzing' || step === 'results' ? null : previewPoint,
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50 dark:bg-zinc-950">
      <Toolbar
        step={step}
        furthestStep={furthestStep}
        onJumpToStep={jumpToStep}
        temperatureC={temperatureC}
        onTemperatureChange={setTemperatureC}
        metersPerPixel={calibration.metersPerPixel}
        onMetersPerPixelChange={(value) => setCalibration((prev) => ({ ...prev, metersPerPixel: value }))}
        onReset={handleReset}
        hasImage={!!imageUrl}
      />
      <Disclaimer />

      {imageUrl && step !== 'analyzing' && (
        <StepInstructions
          step={step}
          stage={stage}
          crowd={crowd}
          onAcceptStageSuggestion={handleAcceptStageSuggestion}
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
            <div className="relative flex flex-1">
              <CanvasStage
                image={image}
                imgSize={imgSize}
                step={step}
                scene={scene}
                onPointerDown={handlePointerDown}
                onPointerMove={setPreviewPoint}
                onDoubleClick={() => {}}
                stageRef={stageRef}
              />
              {step === 'analyzing' && (
                <AnalyzingOverlay error={analysisError} onRetry={() => setAnalysisAttempt((n) => n + 1)} />
              )}
            </div>
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
