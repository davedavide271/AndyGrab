import { useMemo, useState } from 'react'
import './App.css'

const destinations = {
  'Butuan Airport': { eta: 24, distance: '12.4 km', fare: 245, x: 73, y: 22 },
  'SM City Butuan': { eta: 12, distance: '5.8 km', fare: 128, x: 66, y: 57 },
  'Robinsons Butuan': { eta: 16, distance: '7.2 km', fare: 156, x: 79, y: 72 },
  'Butuan City Hall': { eta: 9, distance: '3.6 km', fare: 98, x: 53, y: 41 },
}

const Icon = ({ name }) => {
  const paths = {
    pin: <><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    check: <path d="m7 12 3 3 7-7"/>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [destination, setDestination] = useState('Butuan Airport')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('09:30')
  const [booked, setBooked] = useState(false)
  const trip = useMemo(() => destinations[destination], [destination])

  const submitBooking = (event) => {
    event.preventDefault()
    setBooked(true)
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Andy Grab home"><span className="brand-mark">A</span><span>Andy<span>Grab</span></span></a>
        <div className="nav-links"><a href="#services">Services</a><a href="#booking">Book a ride</a><a href="#safety">Safety</a></div>
        <a className="nav-cta" href="#booking">Book now <Icon name="arrow" /></a>
        <button className="menu" aria-label="Open menu"><Icon name="menu" /></button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span></span> Your city, within reach</div>
          <h1>Move around.<br/><em>Move smarter.</em></h1>
          <p>Reliable rides, clear pricing, and thoughtful service—all around Butuan, right when you need it.</p>
          <div className="hero-actions"><a className="primary-button" href="#booking">Book your ride <Icon name="arrow" /></a><a className="text-link" href="#services">See how it works <span>↘</span></a></div>
          <div className="trust-row"><div className="avatars"><span>AR</span><span>JM</span><span>KS</span></div><div><strong>Local drivers, ready daily</strong><small>Carefully matched for your route</small></div></div>
        </div>

        <div className="map-visual" aria-label={`Map preview to ${destination}`}>
          <div className="map-grid"></div><div className="road road-one"></div><div className="road road-two"></div><div className="road road-three"></div><div className="river"></div>
          <span className="area area-one">AMPAYON</span><span className="area area-two">DOWNTOWN</span><span className="area area-three">BANCASI</span><div className="route"></div>
          <span className="map-pin start-pin"><i></i></span><span className="map-pin end-pin" style={{ left: `${trip.x}%`, top: `${trip.y}%` }}><Icon name="pin" /></span>
          <div className="eta-card"><span className="car-icon">✦</span><div><small>Estimated arrival</small><strong>{trip.eta} min</strong></div><span className="live-dot">Live</span></div>
          <div className="map-caption"><span><i></i> Andy Grab available</span><b>{trip.distance} away</b></div>
        </div>
      </section>

      <section className="booking-wrap shell" id="booking">
        <form className="booking-card" onSubmit={submitBooking}>
          <div className="booking-heading"><small>PLAN YOUR RIDE</small><h2>Where are you going?</h2></div>
          <label className="field destination-field"><span>Destination</span><div><Icon name="pin" /><select value={destination} onChange={(e) => setDestination(e.target.value)}>{Object.keys(destinations).map((place) => <option key={place}>{place}</option>)}</select></div></label>
          <label className="field"><span>Date</span><div><Icon name="calendar" /><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required /></div></label>
          <label className="field"><span>Pickup time</span><div><Icon name="clock" /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div></label>
          <button className="fare-button" type="submit"><span><small>Estimated fare</small><strong>₱{trip.fare}</strong></span><b>Reserve ride <Icon name="arrow" /></b></button>
        </form>
      </section>

      <section className="services shell" id="services">
        <div className="section-heading"><div><span className="section-number">01</span><small>WHY ANDY GRAB</small></div><h2>One ride.<br/>Everything considered.</h2><p>From booking to drop-off, every detail is designed to make getting around feel effortless.</p></div>
        <div className="feature-grid">
          <article><span className="feature-icon"><Icon name="clock" /></span><small>01 / ARRIVAL</small><h3>Know when<br/>we’re coming.</h3><p>Live ETA updates mean less waiting and more certainty.</p><b>~12 min <small>avg. pickup</small></b></article>
          <article><span className="feature-icon"><Icon name="pin" /></span><small>02 / COVERAGE</small><h3>Across the city,<br/>and beyond.</h3><p>Book a ride to key destinations throughout Butuan.</p><b>4 zones <small>and growing</small></b></article>
          <article id="safety"><span className="feature-icon"><Icon name="shield" /></span><small>03 / SAFETY</small><h3>People you can<br/>ride with.</h3><p>Every ride is supported by clear trip details and local drivers.</p><b>Every trip <small>tracked</small></b></article>
        </div>
      </section>

      <section className="closing"><div className="shell"><p>Ready when you are.</p><h2>Your next ride is<br/><em>just a few taps away.</em></h2><a className="primary-button light" href="#booking">Book with Andy Grab <Icon name="arrow" /></a></div></section>
      <footer className="shell"><a className="brand" href="#top"><span className="brand-mark">A</span><span>Andy<span>Grab</span></span></a><p>Local rides, made simple.</p><small>© 2026 Andy Grab. Frontend demo.</small></footer>

      {booked && <div className="modal-backdrop" role="presentation" onMouseDown={() => setBooked(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" onMouseDown={(e) => e.stopPropagation()}><span className="success-icon"><Icon name="check" /></span><small>RIDE RESERVED</small><h2 id="confirmation-title">You’re all set.</h2><p>Your ride to <strong>{destination}</strong> is scheduled for {new Date(`${date}T00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })} at {time}.</p><div><span>Estimated arrival</span><strong>{trip.eta} minutes</strong></div><button onClick={() => setBooked(false)}>Done</button></section></div>}
    </main>
  )
}

export default App
