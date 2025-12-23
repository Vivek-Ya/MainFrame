type Props = {
  checked: boolean
  onChange: () => void
}

export function Switch({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={`relative h-6 w-12 rounded-full transition-all ${checked ? 'bg-neon/80' : 'bg-white/20'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'translate-x-6' : ''}`}
      />
    </button>
  )
}
