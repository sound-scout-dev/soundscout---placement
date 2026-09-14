import { useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from '../components/Toolbar'
import Disclaimer from '../components/Disclaimer'
import WorkflowStepper from '../components/WorkflowStepper'
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
// The stage is a rotatable box: {x, y} is its CENTER (matches Konva's
// offset-to-center convention for rotate-in-place), width/height are its
// unrotated local dimensions, rotation in degrees. `suggested` marks a box
// that came from the AI analysis and hasn't been accepted or overridden yet.
const EMPTY_STAGE = { x: null, y: null, width: 0, height: 0, rotation: 0, locked: false, suggested: false, reasoning: null }
const EMPTY_CROWD = { points: [], locked: false }

// Where "← Back" lands from each step — deliberately not always the literal
// previous step: there's nothing editable at 'analyzing' itself, so backing
// out of 'stage' re-runs the analysis (same photo, fresh AI pass) rather
// than dead-ending on a spinner.
const BACK_TARGET = { analyzing: 'upload', stage: 'analyzing', crowd: 'stage', results: 'crowd' }

export default function Planner({ vendorName, onLogout }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [temperatureC, setTemperatureC] = useState(DEFAULT_TEMPERATURE_C)
  const [calibration, setCalibration] = useState(EMPTY_CALIBRATION)
  const [stage, setStage] = useState(EMPTY_STAGE)
  // Holds the first click while the vendor is drawing a brand-new stage box
  // (before it becomes a real, transformable shape on the second click).
  const [stageDraftCorner, setStageDraftCorner] = useState(null)
  const [crowd, setCrowd] = useState(EMPTY_CROWD)
  const [step, setStep] = useState('upload')
  const [furthestStep, setFurthestStep] = useState('upload')
  const [previewPoint, setPreviewPoint] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  // Bumped to force the analysis effect to re-run even when `step` is
  // already 'analyzing' (setStep('analyzing') alone is a no-op then, since
  // React bails out on an unchanged value) — e.g. retrying after an error,
  // or re-opening "Analyze" from the breadcrumb/Back button.
  const [analysisAttempt, setAnalysisAttempt] = useState(0)

  const stageRef = useRef(null)
  // Loaded once here (not inside CanvasStage) because converting the AI's
  // normalized stage-box suggestion into pixel coordinates needs the
  // photo's natural dimensions.
  const [image, imgSize, imageError] = useHtmlImage(imageUrl)

  const advanceTo = (key) => {
    setStep(key)
    setFurthestStep((prev) => (stepIndex(key) > stepIndex(prev) ? key : prev))
  }

  const jumpToStep = (key) => {
    setStep(key)
    // Re-opens that layer for editing. Downstream results just recompute
    // live from whatever the layers end up holding, so nothing else needs
    // to be cleared — going back and forward again preserves your work.
    if (key === 'analyzing') setAnalysisAttempt((n) => n + 1)
    if (key === 'stage') setStage((prev) => ({ ...prev, locked: false }))
    if (key === 'crowd') setCrowd((prev) => ({ ...prev, locked: false }))
  }

  const handleBack = () => {
    const target = BACK_TARGET[step]
    if (!target) return
    if (target === 'upload') {
      handleReset()
      return
    }
    jumpToStep(target)
  }

  const handleImageSelected = (url) => {
    setImageUrl(url)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setStageDraftCorner(null)
    setCrowd(EMPTY_CROWD)
    setAnalysisError(null)
    advanceTo('analyzing')
  }

  const handleReset = () => {
    setImageUrl(null)
    setCalibration(EMPTY_CALIBRATION)
    setStage(EMPTY_STAGE)
    setStageDraftCorner(null)
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
          const { x1, y1, x2, y2 } = result.stage_box
          setStage({
            x: ((x1 + x2) / 2) * imgSize.width,
            y: ((y1 + y2) / 2) * imgSize.height,
            width: Math.max(10, (x2 - x1) * imgSize.width),
            height: Math.max(10, (y2 - y1) * imgSize.height),
            rotation: 0,
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
      // Once a box exists, further plain clicks on the canvas do nothing —
      // adjustments happen by dragging/resizing/rotating the box itself, or
      // via the explicit "Clear & Redraw" action, so a stray click can't
      // wipe out an in-progress edit.
      if (stage.x != null) return
      if (!stageDraftCorner) {
        setStageDraftCorner(point)
        return
      }
      const width = Math.max(10, Math.abs(point.x - stageDraftCorner.x))
      const height = Math.max(10, Math.abs(point.y - stageDraftCorner.y))
      setStage({
        x: (stageDraftCorner.x + point.x) / 2,
        y: (stageDraftCorner.y + point.y) / 2,
        width,
        height,
        rotation: 0,
        locked: false,
        suggested: false,
        reasoning: null,
      })
      setStageDraftCorner(null)
    } else if (step === 'crowd') {
      setCrowd((prev) => ({ ...prev, points: [...prev.points, point] }))
    }
  }

  // Called by the canvas whenever the vendor drags, resizes, or rotates the
  // stage box — merges the change straight into state so it's reflected
  // live everywhere (footprint stats, main PA position, etc).
  const handleStageTransform = (next) => {
    setStage((prev) => ({ ...prev, ...next }))
  }

  const handleClearStage = () => {
    setStage(EMPTY_STAGE)
    setStageDraftCorner(null)
  }

  const handleConfirmStage = () => {
    setStage((prev) => ({ ...prev, locked: true }))
    advanceTo('crowd')
  }

  const stageDimensionsMeters =
    stage.locked && calibration.metersPerPixel
      ? { width: stage.width * calibration.metersPerPixel, depth: stage.height * calibration.metersPerPixel }
      : null

  const suggestions = useMemo(() => {
    if (!calibration.metersPerPixel || !stage.locked || !crowd.locked || stage.x == null) return null
    return generateSuggestions({
      stagePosition: { x: stage.x, y: stage.y },
      stageWidthMeters: stage.width * calibration.metersPerPixel,
      crowdPoints: crowd.points,
      metersPerPixel: calibration.metersPerPixel,
      temperatureCelsius: temperatureC,
    })
  }, [calibration.metersPerPixel, stage.locked, stage.x, stage.y, stage.width, crowd.locked, crowd.points, temperatureC])

  const scene = {
    stageMarker: stage.x != null ? stage : null,
    stageDraftCorner: step === 'stage' ? stageDraftCorner : null,
    crowd,
    suggestions,
    previewPoint: step === 'upload' || step === 'analyzing' || step === 'results' ? null : previewPoint,
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50 dark:bg-zinc-950">
      <Toolbar
        temperatureC={temperatureC}
        onTemperatureChange={setTemperatureC}
        metersPerPixel={calibration.metersPerPixel}
        onMetersPerPixelChange={(value) => setCalibration((prev) => ({ ...prev, metersPerPixel: value }))}
        onReset={handleReset}
        hasImage={!!imageUrl}
        vendorName={vendorName}
        onLogout={onLogout}
      />
      <Disclaimer />
      <WorkflowStepper step={step} furthestStep={furthestStep} onStepClick={jumpToStep} />

      {imageUrl && step !== 'analyzing' && (
        <StepInstructions
          step={step}
          stage={stage}
          crowd={crowd}
          onBack={stepIndex(step) > 0 ? handleBack : null}
          onConfirmStage={handleConfirmStage}
          onUndoCrowdPoint={() => setCrowd((prev) => ({ ...prev, points: prev.points.slice(0, -1) }))}
          onClearCrowd={() => setCrowd((prev) => ({ ...prev, points: [] }))}
          onFinishCrowd={() => {
            setCrowd((prev) => ({ ...prev, locked: true }))
            advanceTo('results')
          }}
          onClearStage={handleClearStage}
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
                onStageTransform={handleStageTransform}
                stageRef={stageRef}
              />
              {step === 'analyzing' && (
                <AnalyzingOverlay
                  error={imageError || analysisError}
                  onRetry={imageError ? handleReset : () => setAnalysisAttempt((n) => n + 1)}
                  retryLabel={imageError ? 'Choose a Different Photo' : 'Retry Analysis'}
                  onBack={handleReset}
                />
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
