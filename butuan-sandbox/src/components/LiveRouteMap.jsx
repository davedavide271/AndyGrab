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

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function PlaceSearch({
  label,
  value,
  placeholder,
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
    <div className="map-search-field">
      <label>
        <span
          className={`search-location-dot ${label.toLowerCase()}`}
        />

        <span className="map-search-label">{label}</span>

        <input
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
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
      </label>

      {open && query.trim().length >= 3 && (
        <div className="place-results">
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
  const originRef = useRef(CITY_HALL)
  const originMarkerRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const routeLineRef = useRef(null)
  const requestRef = useRef(null)

  const [origin, setOrigin] = useState(CITY_HALL)
  const [destination, setDestination] = useState(null)
  const [status, setStatus] = useState(
    'Search for pickup and destination places, or click the map.',
  )
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const drawLocationMarkers = useCallback(
    (L, map, start, end) => {
      originMarkerRef.current?.remove()
      destinationMarkerRef.current?.remove()

      originMarkerRef.current = L.circleMarker(
        [start.lat, start.lng],
        {
          radius: 9,
          color: '#ffffff',
          weight: 4,
          fillColor: '#0d6b4f',
          fillOpacity: 1,
        },
      )
        .addTo(map)
        .bindTooltip(`From: ${start.name}`, {
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
          .bindTooltip(`To: ${end.name}`, {
            permanent: true,
            direction: 'top',
          })
      }
    },
    [],
  )

  const calculateRoute = useCallback(
    async (start, end) => {
      const map = mapRef.current
      const L = window.L

      if (!map || !L || !start || !end) return

      requestRef.current?.abort()

      const controller = new AbortController()
      requestRef.current = controller

      setLoading(true)
      setStatus('Calculating the quickest driving route...')

      routeLineRef.current?.remove()
      routeLineRef.current = null

      drawLocationMarkers(L, map, start, end)

      try {
        const route = await getDrivingRoute(
          start,
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
          padding: [55, 55],
        })

        const routeLabel =
          route.alternativesConsidered > 1
            ? `Quickest of ${route.alternativesConsidered} routes`
            : 'Quickest available route'

        setStatus(
          `${routeLabel} · ${route.distance} · about ${route.etaLabel}`,
        )

        onRouteChange(route)
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
    },
    [drawLocationMarkers, onRouteChange],
  )

  const selectOrigin = useCallback(
    (place) => {
      originRef.current = place
      setOrigin(place)

      mapRef.current?.setView([place.lat, place.lng], 15)

      if (destination) {
        calculateRoute(place, destination)
      } else if (window.L && mapRef.current) {
        drawLocationMarkers(
          window.L,
          mapRef.current,
          place,
          null,
        )

        setStatus('Choose a destination to calculate the route.')
        onRouteChange(null)
      }
    },
    [
      calculateRoute,
      destination,
      drawLocationMarkers,
      onRouteChange,
    ],
  )

  const selectDestination = useCallback(
    (place) => {
      setDestination(place)
      calculateRoute(originRef.current, place)
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

        drawLocationMarkers(
          L,
          map,
          originRef.current,
          null,
        )

        map.on('click', async ({ latlng }) => {
          requestRef.current?.abort()

          const controller = new AbortController()
          requestRef.current = controller

          setLoading(true)
          setStatus('Finding the selected place...')

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

            await calculateRoute(
              originRef.current,
              selectedPlace,
            )
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
      <div className="map-search-panel">
        <PlaceSearch
          key={`origin-${origin.lat}-${origin.lng}`}
          label="From"
          value={origin}
          placeholder="Search pickup place"
          onSelect={selectOrigin}
        />

        <div className="map-search-divider" />

        <PlaceSearch
          key={
            destination
              ? `destination-${destination.lat}-${destination.lng}`
              : 'destination-empty'
          }
          label="To"
          value={destination}
          placeholder="Search destination"
          onSelect={selectDestination}
        />
      </div>

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

      <div
        ref={containerRef}
        className="live-map"
        aria-label="Interactive route map"
      />

      <div
        className={`map-instruction ${
          loading ? 'loading' : ''
        }`}
      >
        <span />

        <p>
          <small>ROUTE STATUS</small>

          <strong>
            {origin?.name ?? 'Choose pickup'}
            {' → '}
            {destination?.name ?? 'Choose destination'}
          </strong>

          {status}
        </p>
      </div>
    </div>
  )
}

export default LiveRouteMap