import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CITY_HALL,
  getDrivingRoute,
  reverseGeocode,
  searchPlaces,
} from '../services/routeService'

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

const MapIcon = ({ type }) => {
  if (type === 'expand') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
      </svg>
    )
  }

  if (type === 'pin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function DestinationSearch({
  value,
  onSelect,
}) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const searchControllerRef = useRef(null)

  useEffect(() => {
    if (!open || query.trim().length < 3) return undefined

    const timer = window.setTimeout(async () => {
      searchControllerRef.current?.abort()

      const controller = new AbortController()
      searchControllerRef.current = controller
      setSearching(true)

      try {
        const places = await searchPlaces(query, controller.signal)

        if (!controller.signal.aborted) {
          setResults(places)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false)
        }
      }
    }, 500)

    return () => {
      window.clearTimeout(timer)
      searchControllerRef.current?.abort()
    }
  }, [open, query])

  const choosePlace = (place) => {
    searchControllerRef.current?.abort()
    setQuery(place.name)
    setResults([])
    setSearching(false)
    setOpen(false)
    onSelect(place)
  }

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value

    setQuery(nextQuery)
    setOpen(true)

    if (nextQuery.trim().length < 3) {
      searchControllerRef.current?.abort()
      setResults([])
      setSearching(false)
    }
  }

  return (
    <div className="destination-search">
      <div className="fixed-pickup">
        <span className="route-point route-point-origin" />

        <div>
          <small>FROM</small>
          <strong>{CITY_HALL.name}</strong>
        </div>

      </div>

      <div className="route-connector" />

      <div className="destination-input-wrap">
        <span className="route-point route-point-destination" />

        <div className="destination-input-content">
          <small>TO</small>

          <div className="destination-input-row">
            <MapIcon type="pin" />

            <input
              type="search"
              value={query}
              placeholder="Search your destination"
              autoComplete="off"
              aria-label="Search destination"
              onFocus={() => setOpen(true)}
              onChange={handleQueryChange}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  searchControllerRef.current?.abort()
                  setOpen(false)
                  setSearching(false)
                  event.currentTarget.blur()
                }

                if (
                  event.key === 'Enter' &&
                  open &&
                  results.length > 0
                ) {
                  event.preventDefault()
                  choosePlace(results[0])
                }
              }}
            />
          </div>
        </div>
      </div>

      {open && query.trim().length >= 3 && (
        <div className="place-results destination-results">
          {searching && (
            <p className="place-results-message">
              Searching places...
            </p>
          )}

          {!searching && results.length === 0 && (
            <p className="place-results-message">
              No matching places found.
            </p>
          )}

          {!searching &&
            results.map((place) => (
              <button
                type="button"
                key={place.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choosePlace(place)}
              >
                <strong>{place.name}</strong>
                <small>{place.displayName}</small>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function LiveRouteMap({ onRouteChange }) {
  const shellRef = useRef(null)
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const routeLineRef = useRef(null)
  const requestRef = useRef(null)

  const [destination, setDestination] = useState(null)
  const [routeSummary, setRouteSummary] = useState(null)
  const [status, setStatus] = useState(
    'Search for a destination or select a point on the map.',
  )
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const drawLocationMarkers = useCallback(
    (L, map, end) => {
      originMarkerRef.current?.remove()
      destinationMarkerRef.current?.remove()

      originMarkerRef.current = L.circleMarker(
        [CITY_HALL.lat, CITY_HALL.lng],
        {
          radius: 9,
          color: '#ffffff',
          weight: 4,
          fillColor: '#0d6b4f',
          fillOpacity: 1,
        },
      )
        .addTo(map)
        .bindTooltip(`Pickup: ${CITY_HALL.name}`, {
          permanent: true,
          direction: 'top',
        })

      if (end) {
        destinationMarkerRef.current = L.circleMarker(
          [end.lat, end.lng],
          {
            radius: 9,
            color: '#ffffff',
            weight: 4,
            fillColor: '#c7ef64',
            fillOpacity: 1,
          },
        )
          .addTo(map)
          .bindTooltip(end.name, {
            permanent: true,
            direction: 'top',
          })
      }
    },
    [],
  )

  const calculateRoute = useCallback(
    async (end) => {
      const map = mapRef.current
      const L = window.L

      if (!map || !L || !end) return

      requestRef.current?.abort()

      const controller = new AbortController()
      requestRef.current = controller

      setLoading(true)
      setRouteSummary(null)
      setStatus('Calculating the quickest driving route...')

      routeLineRef.current?.remove()
      routeLineRef.current = null

      drawLocationMarkers(L, map, end)

      try {
        const route = await getDrivingRoute(
          CITY_HALL,
          end,
          controller.signal,
        )

        if (controller.signal.aborted) return

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

        routeLineRef.current = L.featureGroup([
          routeOutline,
          routePath,
        ]).addTo(map)

        map.fitBounds(routeLineRef.current.getBounds(), {
          paddingTopLeft: [45, 145],
          paddingBottomRight: [45, 145],
        })

        const routeLabel =
          route.alternativesConsidered > 1
            ? `Quickest of ${route.alternativesConsidered} routes`
            : 'Quickest available route'

        setStatus(routeLabel)
        setRouteSummary(route)
        onRouteChange(route)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setRouteSummary(null)
          setStatus(error.message)
          onRouteChange(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [drawLocationMarkers, onRouteChange],
  )

  const selectDestination = useCallback(
    (place) => {
      setDestination(place)
      calculateRoute(place)
    },
    [calculateRoute],
  )

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await shellRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      setStatus(
        'Full-screen mode is not supported by this browser.',
      )
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active =
        document.fullscreenElement === shellRef.current

      setIsFullscreen(active)

      window.setTimeout(() => {
        mapRef.current?.invalidateSize()

        if (routeLineRef.current) {
          mapRef.current?.fitBounds(
            routeLineRef.current.getBounds(),
            {
              padding: active ? [80, 80] : [45, 45],
            },
          )
        }
      }, 150)
    }

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange,
    )

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange,
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    let map = null

    waitForLeaflet()
      .then((L) => {
        if (
          !active ||
          !containerRef.current ||
          mapRef.current
        ) {
          return
        }

        map = L.map(containerRef.current, {
          zoomControl: true,
        }).setView(
          [CITY_HALL.lat, CITY_HALL.lng],
          14,
        )

        L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        ).addTo(map)

        mapRef.current = map

        drawLocationMarkers(L, map, null)

        map.on('click', async ({ latlng }) => {
          requestRef.current?.abort()

          const controller = new AbortController()
          requestRef.current = controller

          setLoading(true)
          setRouteSummary(null)
          setStatus('Finding the selected destination...')

          try {
            const place = await reverseGeocode(
              {
                lat: latlng.lat,
                lng: latlng.lng,
              },
              controller.signal,
            )

            if (controller.signal.aborted) return

            const selectedPlace = place ?? {
              name: `Pinned location (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`,
              lat: latlng.lat,
              lng: latlng.lng,
            }

            setDestination(selectedPlace)
            await calculateRoute(selectedPlace)
          } catch (error) {
            if (error.name !== 'AbortError') {
              setStatus(error.message)
              onRouteChange(null)
            }
          } finally {
            if (!controller.signal.aborted) {
              setLoading(false)
            }
          }
        })
      })
      .catch((error) => {
        if (active) {
          setStatus(error.message)
        }
      })

    return () => {
      active = false
      requestRef.current?.abort()

      if (map) {
        map.remove()
      }

      mapRef.current = null
    }
  }, [
    calculateRoute,
    drawLocationMarkers,
    onRouteChange,
  ])

  return (
    <div ref={shellRef} className="live-map-shell">
      <div className="map-top-controls">
        <DestinationSearch
          key={
            destination
              ? `destination-${destination.lat}-${destination.lng}`
              : 'destination-empty'
          }
          value={destination}
          onSelect={selectDestination}
        />

        <button
          type="button"
          className="map-fullscreen-button"
          onClick={toggleFullscreen}
          aria-label={
            isFullscreen
              ? 'Exit full screen'
              : 'Open map full screen'
          }
          title={
            isFullscreen
              ? 'Exit full screen'
              : 'Open map full screen'
          }
        >
          <MapIcon
            type={isFullscreen ? 'close' : 'expand'}
          />

          <span>
            {isFullscreen ? 'Exit' : 'Full screen'}
          </span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="live-map"
        aria-label={`Interactive route map from ${CITY_HALL.name}`}
      />

      <section
        className={`map-route-card ${
          loading ? 'loading' : ''
        }`}
        aria-live="polite"
      >
        <div className="route-card-heading">
          <div>
            <small>YOUR ROUTE</small>

            <strong>
              {routeSummary
                ? routeSummary.destination
                : 'Choose a destination'}
            </strong>
          </div>

          <span
            className={`route-state-dot ${
              loading ? 'is-loading' : ''
            }`}
          />
        </div>

        {routeSummary ? (
          <div className="route-metrics">
            <div>
              <small>DRIVING ETA</small>
              <strong>{routeSummary.etaLabel}</strong>
            </div>

            <div>
              <small>DISTANCE</small>
              <strong>{routeSummary.distance}</strong>
            </div>

            <div>
              <small>EST. FARE</small>
              <strong>₱{routeSummary.fare}</strong>
            </div>
          </div>
        ) : (
          <p className="route-empty-message">
            Search above or click anywhere on the map.
          </p>
        )}

        <p className="route-status-message">
          {loading && <span className="route-spinner" />}
          {status}
        </p>
      </section>
    </div>
  )
}

export default LiveRouteMap