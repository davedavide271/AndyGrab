import { useCallback, useMemo, useState } from 'react'
import './App.css'
import LiveRouteMap from './components/LiveRouteMap'
import { cancelBooking, createBooking, isSlotAvailable, listBookings } from './services/bookingStore'

const formatDateInput = (value) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getNextPickupSlot = () => {
  const next = new Date(Date.now() + 60 * 60 * 1000)
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60, 0, 0)
  return { date: formatDateInput(next), time: next.toTimeString().slice(0, 5) }
}

const initialPickup = getNextPickupSlot()

const Icon = ({ name }) => {
  const paths = {
    pin: <><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    check: <path d="m7 12 3 3 7-7"/>,
    user: <><circle cx="12" cy="8" r="3"/><path d="M6 20c.4-4 2.4-6 6-6s5.6 2 6 6"/></>,
    phone: <path d="M7 4H5a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-2l-4-1-1 2c-4-1-8-5-9-9l2-1-1-4Z"/>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [trip, setTrip] = useState(null)
  const [date, setDate] = useState(initialPickup.date)
  const [time, setTime] = useState(initialPickup.time)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [booked, setBooked] = useState(null)
  const [bookings, setBookings] = useState(() => listBookings())
  const [bookingError, setBookingError] = useState('')
  const slotAvailable = useMemo(() => isSlotAvailable(date, time, bookings), [bookings, date, time])
  const handleRouteChange = useCallback((route) => {
    setTrip(route)
    setBookingError('')
  }, [])

  const submitBooking = (event) => {
    event.preventDefault()
    setBookingError('')

    if (!trip) {
      setBookingError('Select a destination on the map before reserving your ride.')
      return
    }

    try {
      const savedBooking = createBooking({
        date,
        time,
        passenger: { name: name.trim(), phone: phone.trim() },
        ...trip,
        geometry: undefined,
      })
      setBookings(listBookings())
      setBooked(savedBooking)
    } catch (error) {
      setBookingError(error.message)
    }
  }

  const handleCancellation = (bookingId) => {
    cancelBooking(bookingId)
    setBookings(listBookings())
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Andy Grab home"><span className="brand-mark">A</span><span>Andy<span>Grab</span></span></a>
        <div className="nav-links"><a href="#services">Services</a><a href="#booking">Book a ride</a><a href="#trips">My trips</a></div>
        <a className="nav-cta" href="#booking">Book now <Icon name="arrow" /></a>
        <button className="menu" aria-label="Open menu"><Icon name="menu" /></button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span></span> Your city, within reach</div>
          <h1>Move around.<br/><em>Move smarter.</em></h1>
          <p>Reliable rides, clear pricing, and thoughtful service—all around Butuan, right when you need it.</p>
          <div className="hero-actions"><a className="primary-button" href="#booking">Book your ride <Icon name="arrow" /></a><a className="text-link" href="#services">See how it works <span>↘</span></a></div>
          <div className="trust-row"><div className="driver-avatar">A</div><div><strong>Driven personally by Andy</strong><small>One driver, one carefully managed schedule</small></div></div>
        </div>

        <div className="map-visual">
          <LiveRouteMap onRouteChange={handleRouteChange} />
          <div className="eta-card"><span className="car-icon">✦</span><div><small>Driving ETA</small><strong>{trip ? `${trip.eta} min` : 'Select route'}</strong></div><span className="live-dot">Live</span></div>
          <div className="map-caption"><span><i></i> Origin fixed at Butuan City Hall</span><b>{trip?.distance ?? 'Click the map'}</b></div>
        </div>
      </section>

      <section className="booking-wrap shell" id="booking">
        <form className="booking-card" onSubmit={submitBooking}>
          <div className="booking-heading"><small>PLAN YOUR RIDE</small><h2>Where are you going?</h2></div>
          <label className="field"><span>Passenger name</span><div><Icon name="user" /><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></div></label>
          <label className="field"><span>Mobile number</span><div><Icon name="phone" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" pattern="[0-9+ ]{10,16}" autoComplete="tel" required /></div></label>
          <label className="field destination-field"><span>Destination</span><div><Icon name="pin" /><input type="text" value={trip?.destination ?? ''} placeholder="Select on the map" readOnly required /></div></label>
          <label className="field"><span>Date</span><div><Icon name="calendar" /><input type="date" value={date} min={formatDateInput(new Date())} onChange={(e) => setDate(e.target.value)} required /></div></label>
          <label className="field"><span>Pickup time</span><div><Icon name="clock" /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div></label>
          <button className="fare-button" type="submit" disabled={!trip}><span><small>Estimated fare</small><strong>{trip ? `₱${trip.fare}` : '—'}</strong></span><b>Reserve ride <Icon name="arrow" /></b></button>
          <p className={`slot-status ${slotAvailable ? 'available' : 'unavailable'}`}><i></i>{slotAvailable ? 'Andy is available for this slot' : 'Andy has a nearby booking—choose another time'}</p>
          {bookingError && <p className="booking-error" role="alert">{bookingError}</p>}
        </form>
      </section>

      <section className="trips shell" id="trips">
        <div className="trips-heading"><div><small>ANDY'S SCHEDULE</small><h2>Your bookings</h2></div><p>{bookings.length ? 'Your bookings are saved on this device.' : 'Your scheduled rides with Andy will appear here.'}</p></div>
        {bookings.length === 0 ? (
          <div className="empty-trips"><span><Icon name="calendar" /></span><h3>No rides booked yet</h3><p>Choose your destination and schedule your first trip.</p><a href="#booking">Plan a ride <Icon name="arrow" /></a></div>
        ) : (
          <div className="trip-list">
            {bookings.map((booking) => (
              <article className={`trip-card ${booking.status}`} key={booking.id}>
                <div className="trip-date"><strong>{new Date(`${booking.date}T00:00`).toLocaleDateString('en-PH', { day: '2-digit' })}</strong><span>{new Date(`${booking.date}T00:00`).toLocaleDateString('en-PH', { month: 'short' })}</span></div>
                <div className="trip-route"><small>{booking.reference}</small><h3>{booking.destination}</h3><p>{booking.time} · {booking.distance} · {booking.passenger.name}</p></div>
                <div className="trip-fare"><span className={`status ${booking.status}`}>{booking.status}</span><strong>₱{booking.fare}</strong></div>
                {booking.status === 'confirmed' && <button className="cancel-button" type="button" onClick={() => handleCancellation(booking.id)}>Cancel ride</button>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="services shell" id="services">
        <div className="section-heading"><div><span className="section-number">01</span><small>WHY ANDY GRAB</small></div><h2>One ride.<br/>Everything considered.</h2><p>From booking to drop-off, every detail is designed to make getting around feel effortless.</p></div>
        <div className="feature-grid">
          <article><span className="feature-icon"><Icon name="clock" /></span><small>01 / ARRIVAL</small><h3>Know when<br/>we’re coming.</h3><p>Live ETA updates mean less waiting and more certainty.</p><b>~12 min <small>avg. pickup</small></b></article>
          <article><span className="feature-icon"><Icon name="pin" /></span><small>02 / COVERAGE</small><h3>Across the city,<br/>and beyond.</h3><p>Book a ride to key destinations throughout Butuan.</p><b>4 zones <small>and growing</small></b></article>
          <article id="safety"><span className="feature-icon"><Icon name="shield" /></span><small>03 / YOUR DRIVER</small><h3>The same driver,<br/>every time.</h3><p>Book directly with Andy and know exactly who will arrive.</p><b>One driver <small>personal service</small></b></article>
        </div>
      </section>

      <section className="closing"><div className="shell"><p>Ready when you are.</p><h2>Your next ride is<br/><em>just a few taps away.</em></h2><a className="primary-button light" href="#booking">Book with Andy Grab <Icon name="arrow" /></a></div></section>
      <footer className="shell"><a className="brand" href="#top"><span className="brand-mark">A</span><span>Andy<span>Grab</span></span></a><p>Local rides, made simple.</p><small>© 2026 Andy Grab. Frontend demo.</small></footer>

      {booked && <div className="modal-backdrop" role="presentation" onMouseDown={() => setBooked(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onMouseDown={(e) => e.stopPropagation()}><span className="success-icon"><Icon name="check" /></span><small>{booked.reference}</small><h2 id="confirmation-title">You’re all set.</h2><p><strong>{booked.passenger.name}</strong>, your ride to <strong>{booked.destination}</strong> is scheduled for {new Date(`${booked.date}T00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })} at {booked.time}.</p><div><span>Estimated arrival</span><strong>{booked.eta} minutes</strong></div><button onClick={() => setBooked(null)}>View my trips</button></section></div>}
    </main>
  )
}

export default App
