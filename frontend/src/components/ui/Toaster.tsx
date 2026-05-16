import { useToastStore, type Toast } from '../../stores/toast'

const KIND_STYLES: Record<Toast['kind'], string> = {
  success: 'bg-[#228B22] text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white',
}

const KIND_ICONS: Record<Toast['kind'], string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 shadow-lg active:scale-[0.98] transition-transform ${KIND_STYLES[t.kind]}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {KIND_ICONS[t.kind]}
          </span>
          <span className="flex-1 text-left text-sm font-medium">{t.message}</span>
        </button>
      ))}
    </div>
  )
}
