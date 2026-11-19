import { useEffect, useRef, useState } from 'react'
import { CITY_HALL, getDrivingRoute } from '../services/routeService'

const getBookingCoordinates = (booking) => {
  if (!booking) return null
  if (booking.destinationCoordinates?.lat && booking.destinationCoordinates?.lng) {
    return {
      lat: Number(booking.destinationCoordinates.lat),
      lng: Number(booking.destinationCoordinates.lng),
    }
  }
  if (typeof booking.destination === 'string') {
    const match = booking.destination.match(/([0-9]+\.[0-9]+),\s*([0-9]+\.[0-9]+)/)
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
    }
  }
  return null
}

const waitForLeaflet = () =>
  new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L)

    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      if (window.L) {
        window.clearInterval(timer)
        resolve(window.L)
      } else if (attempts >= 50) {
        window.clearInterval(timer)
        reject(new Error('The map library could not be loaded.'))
      }
    }, 100)
  })

export default function BookingMapModal({ booking, onClose, role = 'driver' }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const coords = getBookingCoordinates(booking)

  useEffect(() => {
    if (!booking || !coords) return

    let active = true

    waitForLeaflet()
      .then(async (L) => {
        if (!active || !mapContainerRef.current) return

        // Clean up previous map if any
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([coords.lat, coords.lng], 14)

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        // Pickup Marker (Butuan City Hall)
        const originMarker = L.circleMarker([CITY_HALL.lat, CITY_HALL.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 4,
          fillColor: '#0d6b4f',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip('Pickup: Butuan City Hall', { permanent: false, direction: 'top' })

        // Destination Marker (Client's exact destination)
        const destMarker = L.circleMarker([coords.lat, coords.lng], {
          radius: 10,
          color: '#ffffff',
          weight: 4,
          fillColor: '#c7ef64',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(`Destination: ${booking.destination}`, {
            permanent: true,
            direction: 'top',
          })

        // Draw driving route polyline
        let geometry = booking.geometry
        if (!geometry || !geometry.length) {
          try {
            setLoading(true)
            const route = await getDrivingRoute(coords)
            geometry = route.geometry
            setRouteInfo(route)
          } catch (err) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }

        if (geometry && geometry.length) {
          const polyline = L.polyline(geometry, {
            color: '#0d6b4f',
            weight: 5,
            opacity: 0.9,
          }).addTo(map)
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
        } else {
          const group = L.featureGroup([originMarker, destMarker])
          map.fitBounds(group.getBounds(), { padding: [40, 40] })
        }

        // Invalidate size to ensure container rendered cleanly
        setTimeout(() => {
          if (active && map) {
            map.invalidateSize()
          }
        }, 150)

        mapRef.current = map
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [booking, coords])

  if (!booking) return null

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&origin=${CITY_HALL.lat},${CITY_HALL.lng}&destination=${coords.lat},${coords.lng}`
    : null

  return (
    <div
      className="modal-backdrop booking-map-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="booking-map-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="map-modal-header">
          <div>
            <div className="map-modal-badge">
              {role === 'driver' ? 'DRIVER ROUTE VIEW' : 'PASSENGER TRIP ROUTE'}
            </div>
            <h2 id="map-modal-title">Exact Destination Map</h2>
            <p className="map-modal-sub">
              <strong>{booking.passenger?.name || 'Passenger'}</strong> · {booking.reference} ·{' '}
              {booking.date} at {booking.time}
            </p>
          </div>
          <button
            type="button"
            className="map-modal-close-btn"
            onClick={onClose}
            aria-label="Close destination map"
          >
            ✕
          </button>
        </div>

        <div className="map-modal-body">
          <div className="map-modal-map-wrap">
            <div ref={mapContainerRef} className="map-modal-leaflet-container" />
            {loading && <div className="map-modal-loading-pill">✦ Loading route...</div>}
            <div className="map-modal-floating-info">
              <span className="car-icon">✦</span>
              <div>
                <small>Driving Route</small>
                <strong>
                  {booking.distance || routeInfo?.distance || 'Direct path'} · ~
                  {booking.eta || routeInfo?.eta || '10'} min
                </strong>
              </div>
              <div className="floating-fare">
                <small>Fare</small>
                <strong>₱{booking.fare}</strong>
              </div>
            </div>
          </div>

          <div className="map-modal-details-bar">
            <div className="detail-item">
              <small>PICKUP ORIGIN</small>
              <strong>Butuan City Hall</strong>
              <span>Fixed City Origin</span>
            </div>
            <div className="detail-divider">→</div>
            <div className="detail-item">
              <small>EXACT DESTINATION</small>
              <strong>{booking.destination}</strong>
              <span>
                {coords
                  ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`
                  : 'Coordinates on map'}
              </span>
            </div>
          </div>

          {error && <p className="map-modal-error">{error}</p>}
        </div>

        <div className="map-modal-footer">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-modal-directions-btn"
            >
              <span>↗</span> Open in Google Maps Navigation
            </a>
          )}
          <button
            type="button"
            className="map-modal-dismiss-btn"
            onClick={onClose}
          >
            Close Map
          </button>
        </div>
      </section>
    </div>
  )
}
