import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { setupComplete, login, setup } = useAuth()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSetup = setupComplete === false

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    if (step === 'confirm') {
      setConfirmPin(cleaned)
    } else {
      setPin(cleaned)
    }
    setError('')
  }

  const handleSubmit = async () => {
    if (loading) return

    if (isSetup) {
      if (step === 'enter') {
        if (pin.length < 4) {
          setError('PIN must be at least 4 digits')
          return
        }
        setStep('confirm')
        setConfirmPin('')
        return
      }
      // Confirm step
      if (confirmPin !== pin) {
        setError('PINs do not match')
        setConfirmPin('')
        return
      }
    } else {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits')
        return
      }
    }

    setLoading(true)
    try {
      if (isSetup) {
        await setup(pin)
      } else {
        await login(pin)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      if (!isSetup) setPin('')
      if (isSetup && step === 'confirm') {
        setStep('enter')
        setPin('')
        setConfirmPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const currentPin = step === 'confirm' ? confirmPin : pin
  const dots = Array.from({ length: 6 }, (_, i) => i < currentPin.length)

  // Wait for setup check
  if (setupComplete === null) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6">
      {/* Logo area */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#228B22] flex items-center justify-center">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-8-7.5-8-11a8 8 0 0116 0c0 3.5-4 7-8 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V7m0 4l-2-2m2 2l2-2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ArborSuite</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSetup
            ? step === 'confirm'
              ? 'Confirm your PIN'
              : 'Create PIN'
            : 'Enter PIN'}
        </p>
      </div>

      {/* PIN dots display */}
      <div className="flex gap-3 mb-8">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              filled
                ? 'bg-[#228B22] scale-110'
                : 'bg-gray-200 border-2 border-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Hidden input for keyboard/mobile input */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={currentPin}
        onChange={(e) => handlePinChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="sr-only"
        aria-label="PIN input"
      />

      {/* Tap to focus area */}
      <button
        onClick={() => inputRef.current?.focus()}
        className="mb-6 px-6 py-2 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg"
      >
        Tap here to type
      </button>

      {/* Error message */}
      {error && (
        <p className="mb-4 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading || currentPin.length < 4}
        className="w-full max-w-xs px-6 py-3 text-white font-semibold rounded-xl bg-[#228B22] hover:bg-[#1e7a1e] active:bg-[#1a6b1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Please wait...
          </span>
        ) : isSetup ? (
          step === 'confirm' ? 'Confirm & Create' : 'Next'
        ) : (
          'Unlock'
        )}
      </button>

      {/* Back button during confirm step */}
      {isSetup && step === 'confirm' && (
        <button
          onClick={() => {
            setStep('enter')
            setConfirmPin('')
            setError('')
          }}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Go back
        </button>
      )}
    </div>
  )
}
