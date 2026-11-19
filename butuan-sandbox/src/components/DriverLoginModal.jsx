import { useState, useEffect, useRef } from 'react'

const STATIC_DRIVER_PIN = '1234'

const Icon = ({ name }) => {
  const paths = {
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-icon">
      {paths[name]}
    </svg>
  )
}

export default function DriverLoginModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleValidation = (candidatePin) => {
    if (!candidatePin || candidatePin.length < 4) {
      setErrorMessage('Please enter the required 4-digit PIN.')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return false
    }

    if (candidatePin !== STATIC_DRIVER_PIN) {
      setErrorMessage('Invalid PIN. Sign-in failed. Please try again.')
      setPin('')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return false
    }

    setErrorMessage('')
    try {
      sessionStorage.setItem('andygrab_driver_auth', 'true')
    } catch {
      // ignore storage write failure
    }
    onSuccess()
    return true
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    handleValidation(pin)
  }

  const handleKeypadPress = (val) => {
    if (val === 'clear') {
      setPin('')
      setErrorMessage('')
      return
    }
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1))
      setErrorMessage('')
      return
    }
    if (pin.length < 4) {
      const nextPin = pin + val
      setPin(nextPin)
      setErrorMessage('')
      if (nextPin.length === 4) {
        handleValidation(nextPin)
      }
    }
  }

  const handleInputChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(numeric)
    setErrorMessage('')
    if (numeric.length === 4) {
      handleValidation(numeric)
    }
  }

  const handleDismiss = () => {
    setPin('')
    setErrorMessage('')
    onClose()
  }

  return (
    <div
      className="modal-backdrop driver-login-modal-backdrop"
      role="presentation"
      onMouseDown={handleDismiss}
    >
      <section
        className={`modal driver-login-modal ${isShaking ? 'shake-animation' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-login-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="driver-modal-close-btn"
          onClick={handleDismiss}
          aria-label="Close driver sign-in modal"
        >
          <Icon name="x" />
        </button>

        <div className="driver-lock-badge">
          <Icon name="lock" />
        </div>

        <small className="driver-eyebrow">DRIVER AUTHENTICATION</small>
        <h2 id="driver-login-title">Driver Sign In</h2>
        <p className="driver-login-subtext">
          Enter your 4-digit PIN to access Andy&apos;s driver portal and booking schedule.
        </p>

        <form onSubmit={handleSubmit} className="driver-pin-form">
          <div
            className="pin-dots"
            aria-label="4-digit PIN input dots"
            onClick={() => inputRef.current?.focus()}
          >
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                className={`pin-dot ${pin.length > idx ? 'filled' : ''} ${errorMessage ? 'error' : ''}`}
              />
            ))}
          </div>

          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={handleInputChange}
            className="pin-hidden-input"
            aria-label="4-digit Driver PIN"
            autoComplete="off"
          />

          <div className="driver-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                className="keypad-btn"
                onClick={() => handleKeypadPress(`${num}`)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="keypad-btn action"
              onClick={() => handleKeypadPress('clear')}
              title="Clear PIN"
            >
              C
            </button>
            <button
              type="button"
              className="keypad-btn"
              onClick={() => handleKeypadPress('0')}
            >
              0
            </button>
            <button
              type="button"
              className="keypad-btn action"
              onClick={() => handleKeypadPress('backspace')}
              title="Backspace"
            >
              ⌫
            </button>
          </div>

          {errorMessage && (
            <div className="driver-pin-error" role="alert">
              <Icon name="alert" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="driver-pin-hint">
            Authorized Driver PIN: <strong>1234</strong>
          </p>

          <div className="driver-pin-actions">
            <button
              type="submit"
              className="driver-primary-btn"
              disabled={pin.length === 0}
            >
              Sign In <Icon name="arrow" />
            </button>
            <button
              type="button"
              className="driver-cancel-btn"
              onClick={handleDismiss}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
