import { useMemo, useState } from 'react'
import BookingMapModal from './BookingMapModal'

const STATIC_DRIVER_PIN = '1234'

const Icon = ({ name }) => {
  const paths = {
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m7 12 3 3 7-7" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    phone: <path d="M7 4H5a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-2l-4-1-1 2c-4-1-8-5-9-9l2-1-1-4Z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c.4-4 2.4-6 6-6s5.6 2 6 6" />
      </>
    ),
    car: (
      <>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8c-.7 0-1.3.3-1.8.7C5.3 8.6 4 10 4 10s-2.7.6-4.5 1.1C-.3 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </>
    ),
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

const PRESET_REASONS = [
  'Schedule conflict',
  'Vehicle maintenance / repair',
  'Destination outside service area',
  'Personal emergency',
  'Fully booked for this time window',
]

export default function DriverPortal({
  bookings,
  onAcceptBooking,
  onDeclineBooking,
  onBackToPassenger,
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('andygrab_driver_auth') === 'true'
  })
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'accepted', 'declined'
  const [selectedMapBooking, setSelectedMapBooking] = useState(null)

  // Decline modal state
  const [declineTarget, setDeclineTarget] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [declineError, setDeclineError] = useState('')

  const handlePinSubmit = (e) => {
    e?.preventDefault?.()
    if (!pin || pin.length < 4) {
      setPinError('Please enter the complete 4-digit PIN.')
      return
    }
    if (pin === STATIC_DRIVER_PIN) {
      sessionStorage.setItem('andygrab_driver_auth', 'true')
      setIsAuthenticated(true)
      setPinError('')
      setPin('')
    } else {
      setPinError('Invalid PIN. Sign-in failed. Please try again.')
      setPin('')
    }
  }

  const handleKeypadPress = (val) => {
    if (val === 'clear') {
      setPin('')
      setPinError('')
      return
    }
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1))
      setPinError('')
      return
    }
    if (pin.length < 4) {
      const nextPin = pin + val
      setPin(nextPin)
      setPinError('')
      if (nextPin.length === 4) {
        if (nextPin === STATIC_DRIVER_PIN) {
          sessionStorage.setItem('andygrab_driver_auth', 'true')
          setIsAuthenticated(true)
          setPin('')
        } else {
          setPinError('Invalid PIN. Sign-in failed. Please try again.')
          setPin('')
        }
      }
    }
  }

  const handleLockPortal = () => {
    sessionStorage.removeItem('andygrab_driver_auth')
    setIsAuthenticated(false)
    setPin('')
    setPinError('')
    onBackToPassenger()
  }

  const handleOpenDeclineModal = (booking) => {
    setDeclineTarget(booking)
    setDeclineReason(booking.declineReason || '')
    setDeclineError('')
  }

  const handleCloseDeclineModal = () => {
    setDeclineTarget(null)
    setDeclineReason('')
    setDeclineError('')
  }

  const handleConfirmDecline = (e) => {
    e?.preventDefault?.()
    if (!declineReason.trim()) {
      setDeclineError('Please provide a reason why you are declining this booking.')
      return
    }
    if (declineTarget) {
      onDeclineBooking(declineTarget.id, declineReason.trim())
      handleCloseDeclineModal()
    }
  }

  const stats = useMemo(() => {
    const total = bookings.length
    const pending = bookings.filter((b) => b.status === 'pending').length
    const accepted = bookings.filter(
      (b) => b.status === 'accepted' || b.status === 'confirmed',
    ).length
    const declined = bookings.filter((b) => b.status === 'declined').length
    const revenue = bookings
      .filter((b) => b.status === 'accepted' || b.status === 'confirmed')
      .reduce((sum, b) => sum + (Number(b.fare) || 0), 0)
    return { total, pending, accepted, declined, revenue }
  }, [bookings])

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings
    if (filter === 'accepted') {
      return bookings.filter(
        (b) => b.status === 'accepted' || b.status === 'confirmed',
      )
    }
    return bookings.filter((b) => b.status === filter)
  }, [bookings, filter])

  // Dedicated Driver Login Page (when visited directly without auth)
  if (!isAuthenticated) {
    return (
      <div className="driver-pin-screen shell">
        <div className="driver-pin-card">
          <div className="driver-lock-badge">
            <Icon name="lock" />
          </div>
          <span className="driver-eyebrow">PORTAL SECURITY</span>
          <h2>Driver Verification</h2>
          <p>
            Please enter Andy&apos;s 4-digit PIN code to access the booking schedule.
          </p>

          <form onSubmit={handlePinSubmit} className="driver-pin-form">
            <div className="pin-dots" aria-label="PIN Digits">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={`pin-dot ${pin.length > idx ? 'filled' : ''} ${pinError ? 'error' : ''}`}
                />
              ))}
            </div>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPin(val)
                setPinError('')
                if (val.length === 4) {
                  if (val === STATIC_DRIVER_PIN) {
                    sessionStorage.setItem('andygrab_driver_auth', 'true')
                    setIsAuthenticated(true)
                  } else {
                    setPinError('Invalid PIN. Sign-in failed. Please try again.')
                    setPin('')
                  }
                }
              }}
              className="pin-hidden-input"
              aria-label="Enter 4-digit PIN"
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
                title="Clear"
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

            <p className="driver-pin-hint">
              Default Driver PIN: <strong>1234</strong>
            </p>

            {pinError && (
              <div className="driver-pin-error" role="alert">
                <Icon name="alert" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="driver-pin-actions">
              <button
                type="submit"
                className="driver-primary-btn"
                disabled={pin.length === 0}
              >
                Unlock Dashboard <Icon name="arrow" />
              </button>
              <button
                type="button"
                className="driver-link-btn"
                onClick={onBackToPassenger}
              >
                ← Return to Passenger View
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="driver-dashboard shell">
      <div className="driver-header">
        <div>
          <div className="driver-status-chip">
            <span className="live-dot" /> Driver Active · Andy
          </div>
          <h1>Driver Dashboard</h1>
          <p>Review customer booking requests, accept rides, and manage your schedule.</p>
        </div>
        <div className="driver-header-actions">
          <button
            type="button"
            className="driver-secondary-btn"
            onClick={handleLockPortal}
            title="Lock driver portal and sign out"
          >
            <Icon name="lock" /> Sign Out
          </button>
          <button
            type="button"
            className="driver-primary-btn"
            onClick={onBackToPassenger}
          >
            Passenger View <Icon name="arrow" />
          </button>
        </div>
      </div>

      <div className="driver-stats-grid">
        <div className="stat-card">
          <small>PENDING REQUESTS</small>
          <div className="stat-val highlight">{stats.pending}</div>
          <span className="stat-desc">Awaiting your response</span>
        </div>
        <div className="stat-card">
          <small>ACCEPTED RIDES</small>
          <div className="stat-val">{stats.accepted}</div>
          <span className="stat-desc">Confirmed bookings</span>
        </div>
        <div className="stat-card">
          <small>DECLINED RIDES</small>
          <div className="stat-val">{stats.declined}</div>
          <span className="stat-desc">Released slots</span>
        </div>
        <div className="stat-card">
          <small>EST. CONFIRMED EARNINGS</small>
          <div className="stat-val revenue">₱{stats.revenue.toLocaleString()}</div>
          <span className="stat-desc">{stats.accepted} scheduled trips</span>
        </div>
      </div>

      <div className="driver-bookings-section">
        <div className="driver-controls-bar">
          <div className="filter-pills" role="tablist" aria-label="Filter bookings">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({bookings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'pending'}
              className={`filter-pill ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'accepted'}
              className={`filter-pill ${filter === 'accepted' ? 'active' : ''}`}
              onClick={() => setFilter('accepted')}
            >
              Accepted ({stats.accepted})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'declined'}
              className={`filter-pill ${filter === 'declined' ? 'active' : ''}`}
              onClick={() => setFilter('declined')}
            >
              Declined ({stats.declined})
            </button>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="driver-empty-state">
            <div className="empty-icon-wrap">
              <Icon name="car" />
            </div>
            <h3>No bookings found</h3>
            <p>
              {filter === 'all'
                ? 'No rides have been scheduled yet by passengers.'
                : `There are currently no bookings with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="driver-card-list">
            {filteredBookings.map((b) => {
              const isPending = b.status === 'pending'
              const isAccepted = b.status === 'accepted' || b.status === 'confirmed'
              const isDeclined = b.status === 'declined'
              const isCancelled = b.status === 'cancelled'

              return (
                <article
                  key={b.id}
                  className={`driver-trip-card ${b.status}`}
                >
                  <div className="driver-trip-left">
                    <div className="driver-trip-time">
                      <strong>
                        {new Date(`${b.date}T00:00`).toLocaleDateString('en-PH', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </strong>
                      <span>{b.time}</span>
                    </div>

                    <div className="driver-trip-info">
                      <div className="driver-ref-row">
                        <span className="ref-tag">{b.reference}</span>
                        <span className={`status-chip ${b.status}`}>
                          {isPending && 'Pending Decision'}
                          {isAccepted && 'Accepted'}
                          {isDeclined && 'Declined'}
                          {isCancelled && 'Cancelled by Passenger'}
                        </span>
                      </div>

                      <div className="driver-destination-row">
                        <h3 className="driver-destination">{b.destination}</h3>
                        <button
                          type="button"
                          className="driver-map-pill-btn"
                          onClick={() => setSelectedMapBooking(b)}
                          title="View exact client destination on map"
                        >
                          <Icon name="map" /> View Map
                        </button>
                      </div>

                      <div className="driver-meta-row">
                        <span>
                          <Icon name="user" /> {b.passenger?.name || 'Passenger'}
                        </span>
                        {b.passenger?.phone && (
                          <a
                            href={`tel:${b.passenger.phone}`}
                            className="phone-link"
                            title="Call passenger"
                          >
                            <Icon name="phone" /> {b.passenger.phone}
                          </a>
                        )}
                        <span>
                          <Icon name="pin" /> {b.distance}
                        </span>
                        <span>
                          <Icon name="clock" /> ~{b.eta} min drive
                        </span>
                      </div>

                      {/* Display decline reason if present */}
                      {isDeclined && (
                        <div className="driver-decline-reason-display">
                          <strong>Decline Reason (visible to passenger):</strong>
                          <p>{b.declineReason || 'No specific reason provided.'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="driver-trip-right">
                    <div className="driver-trip-fare">
                      <small>Fare</small>
                      <strong>₱{b.fare}</strong>
                    </div>

                    <div className="driver-trip-actions">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="btn-action-accept"
                            onClick={() => onAcceptBooking(b.id)}
                            title="Accept this booking request"
                          >
                            <Icon name="check" /> Accept
                          </button>
                          <button
                            type="button"
                            className="btn-action-decline"
                            onClick={() => handleOpenDeclineModal(b)}
                            title="Decline this booking request"
                          >
                            <Icon name="x" /> Decline
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <div className="driver-action-resolved">
                          <span className="tag-accepted">✓ Confirmed</span>
                          <button
                            type="button"
                            className="btn-action-subtle"
                            onClick={() => handleOpenDeclineModal(b)}
                            title="Change decision to decline"
                          >
                            Decline instead
                          </button>
                        </div>
                      )}

                      {isDeclined && (
                        <div className="driver-action-resolved">
                          <span className="tag-declined">✕ Declined</span>
                          <button
                            type="button"
                            className="btn-action-subtle"
                            onClick={() => onAcceptBooking(b.id)}
                            title="Accept ride"
                          >
                            Accept instead
                          </button>
                        </div>
                      )}

                      {isCancelled && (
                        <span className="tag-cancelled">Cancelled</span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {declineTarget && (
        <div
          className="modal-backdrop decline-modal-backdrop"
          role="presentation"
          onMouseDown={handleCloseDeclineModal}
        >
          <section
            className="modal decline-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="decline-modal-header">
              <small className="driver-eyebrow">DECLINE BOOKING REQUEST</small>
              <h2 id="decline-modal-title">Provide Reason for Declining</h2>
              <p className="decline-modal-sub">
                This reason will be displayed directly to <strong>{declineTarget.passenger?.name || 'the passenger'}</strong> for trip <strong>{declineTarget.reference}</strong>.
              </p>
            </div>

            <form onSubmit={handleConfirmDecline} className="decline-form">
              <div className="decline-booking-summary">
                <div>
                  <small>PASSENGER</small>
                  <strong>{declineTarget.passenger?.name}</strong>
                </div>
                <div>
                  <small>DATE & TIME</small>
                  <strong>{declineTarget.date} at {declineTarget.time}</strong>
                </div>
                <div>
                  <small>DESTINATION</small>
                  <strong>{declineTarget.destination}</strong>
                </div>
              </div>

              <div className="preset-reasons-wrap">
                <span className="preset-label">Quick select reasons:</span>
                <div className="preset-chips">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setDeclineReason(preset)
                        setDeclineError('')
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field decline-textarea-field">
                <span>Reason for decline (required)</span>
                <textarea
                  value={declineReason}
                  onChange={(e) => {
                    setDeclineReason(e.target.value)
                    setDeclineError('')
                  }}
                  rows={3}
                  placeholder="Explain why you cannot take this booking..."
                  required
                  autoFocus
                />
              </label>

              {declineError && (
                <div className="driver-pin-error" role="alert">
                  <Icon name="alert" />
                  <span>{declineError}</span>
                </div>
              )}

              <div className="decline-modal-actions">
                <button
                  type="submit"
                  className="btn-confirm-decline"
                >
                  <Icon name="x" /> Confirm Decline
                </button>
                <button
                  type="button"
                  className="driver-cancel-btn"
                  onClick={handleCloseDeclineModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedMapBooking && (
        <BookingMapModal
          booking={selectedMapBooking}
          role="driver"
          onClose={() => setSelectedMapBooking(null)}
        />
      )}
    </div>
  )
}
