import { useEffect, useRef, useState } from 'react'
import { CITY_HALL, getDrivingRoute } from '../services/routeService'

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

function LiveRouteMap({ onRouteChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const routeLineRef = useRef(null)
  const requestRef = useRef(null)
  const [status, setStatus] = useState('Click anywhere on the map to choose a destination.')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    waitForLeaflet().then((L) => {
      if (!active || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        [CITY_HALL.lat, CITY_HALL.lng],
        14,
      )

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      L.circleMarker([CITY_HALL.lat, CITY_HALL.lng], {
        radius: 9,
        color: '#ffffff',
        weight: 4,
        fillColor: '#0d6b4f',
        fillOpacity: 1,
      }).addTo(map).bindTooltip('Pickup: Butuan City Hall', { permanent: true, direction: 'top' })

      map.on('click', async ({ latlng }) => {
        requestRef.current?.abort()
        requestRef.current = new AbortController()
        setLoading(true)
        setStatus('Calculating the best driving route...')

        destinationMarkerRef.current?.remove()
        routeLineRef.current?.remove()
        destinationMarkerRef.current = L.circleMarker(latlng, {
          radius: 9,
          color: '#ffffff',
          weight: 4,
          fillColor: '#c7ef64',
          fillOpacity: 1,
        }).addTo(map).bindTooltip('Destination', { permanent: true, direction: 'top' })

        try {
          const route = await getDrivingRoute({ lat: latlng.lat, lng: latlng.lng }, requestRef.current.signal)
          const routeOutline = L.polyline(route.geometry, {
            color: '#ffffff',
            weight: 9,
            opacity: 0.9,
            interactive: false,
          })
          const routePath = L.polyline(route.geometry, {
            color: '#0d6b4f',
            weight: 5,
            opacity: 1,
            interactive: false,
          })
          routeLineRef.current = L.featureGroup([routeOutline, routePath]).addTo(map)
          map.fitBounds(routeLineRef.current.getBounds(), { padding: [35, 35] })
          destinationMarkerRef.current.bindTooltip(
            route.destination,
            { permanent: true, direction: 'top' },
          )
          const routeLabel = route.alternativesConsidered > 1
            ? `Quickest of ${route.alternativesConsidered} routes`
            : 'Quickest available route'
          setStatus(`${routeLabel} · ${route.distance} · about ${route.etaLabel}`)
          onRouteChange(route)
        } catch (error) {
          if (error.name !== 'AbortError') {
            setStatus(error.message)
            onRouteChange(null)
          }
        } finally {
          setLoading(false)
        }
      })

      mapRef.current = map
    }).catch((error) => setStatus(error.message))

    return () => {
      active = false
      requestRef.current?.abort()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [onRouteChange])

  return (
    <div className="live-map-shell">
      <div ref={containerRef} className="live-map" aria-label="Interactive route map from Butuan City Hall" />
      <div className={`map-instruction ${loading ? 'loading' : ''}`}>
        <span></span>
        <p><small>FIXED PICKUP</small><strong>Butuan City Hall</strong>{status}</p>
      </div>
    </div>
  )
}

export default LiveRouteMap
