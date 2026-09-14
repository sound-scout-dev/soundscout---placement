// Ordered workflow steps. Shared between the Toolbar (breadcrumb) and the
// Planner page (state machine) so the two never drift out of sync.
export const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'stage', label: 'Stage' },
  { key: 'crowd', label: 'Crowd Area' },
  { key: 'results', label: 'Results' },
]

export const stepIndex = (key) => STEPS.findIndex((s) => s.key === key)
