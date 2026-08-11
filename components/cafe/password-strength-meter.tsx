import { getPasswordStrength, type PasswordCriterion, type PasswordStrengthLabel } from '@/lib/cafe/password'

// Strength reads as a climb through the brand palette rather than a
// red/amber/green traffic light.
const BAR_COLOR: Record<PasswordStrengthLabel, string> = {
  'Too weak': 'bg-red-600',
  Weak:       'bg-red-600',
  Fair:       'bg-brand-400',
  Good:       'bg-brand-600',
  Strong:     'bg-olive-600',
}

const LABEL_COLOR: Record<PasswordStrengthLabel, string> = {
  'Too weak': 'text-red-700',
  Weak:       'text-red-700',
  Fair:       'text-brand-600',
  Good:       'text-brand-700',
  Strong:     'text-olive-600',
}

const REQUIREMENTS: { key: PasswordCriterion; label: string }[] = [
  { key: 'length',    label: 'At least 10 characters' },
  { key: 'lowercase', label: 'A lowercase letter' },
  { key: 'uppercase', label: 'An uppercase letter' },
  { key: 'number',    label: 'A number' },
  { key: 'special',   label: 'A special character' },
]

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const { score, criteria, label } = getPasswordStrength(password)

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1" role="progressbar" aria-label="Password strength" aria-valuenow={score} aria-valuemin={0} aria-valuemax={5} aria-valuetext={label}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? BAR_COLOR[label] : 'bg-cream-300'}`}
          />
        ))}
      </div>
      <p className={`eyebrow-sm ${LABEL_COLOR[label]}`}>{label}</p>

      <ul className="space-y-0.5 text-xs">
        {REQUIREMENTS.map((req) => (
          <li key={req.key} className={criteria[req.key] ? 'text-olive-600' : 'text-gray-400'}>
            {criteria[req.key] ? '✓' : '·'} {req.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
