import { useMemo, useRef, useState } from 'react'
import Toolbar from '../components/Toolbar'
import Disclaimer from '../components/Disclaimer'
import ImageUploader from '../components/ImageUploader'
import CanvasStage from '../components/CanvasStage'
import StepInstructions from '../components/StepInstructions'
import ResultsPanel from '../components/ResultsPanel'
import { generateSuggestions, computeMetersPerPixel, DEFAULT_TEMPERATURE_C } from '../utils/acoustics'
import { stepIndex } from '../utils/steps'

const EMPTY_CALIBRATION = { a: null, b: null, locked: false, realDistanceMeters: null, metersPerPixel: null, label: null }
const EMPTY_STAGE = { position: null, facing: null, locked: false }
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
        if (!prev.position || (prev.position && prev.facing)) return { position: point, facing: null, locked: false }
        advanceTo('crowd')
        return { ...prev, facing: point, locked: true }
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

  const suggestions = useMemo(() => {
    if (!calibration.locked || !stage.locked || !crowd.locked) return null
    return generateSuggestions({
      stagePosition: stage.position,
      facingPosition: stage.facing,
      crowdPoints: crowd.points,
      metersPerPixel: calibration.metersPerPixel,
      temperatureCelsius: temperatureC,
    })
  }, [calibration.locked, calibration.metersPerPixel, stage.locked, stage.position, stage.facing, crowd.locked, crowd.points, temperatureC])

  const scene = {
    calibration: calibration.a ? calibration : null,
    stageMarker: stage.position ? stage : null,
    crowd,
    suggestions,
    previewPoint: step === 'upload' || step === 'results' ? null : previewPoint,
  }

  return (
    <div className="flex min-h-screen flex-col">
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
            <ResultsPanel calibration={calibration} crowd={crowd} suggestions={suggestions} temperatureC={temperatureC} stageRef={stageRef} />
          </>
        )}
      </main>
    </div>
  )
}
