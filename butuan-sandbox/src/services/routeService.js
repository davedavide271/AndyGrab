export const CITY_HALL = {
  name: 'Butuan City Hall',
  lat: 8.95351,
  lng: 125.52923,
}

const ROUTE_API = 'https://router.project-osrm.org/route/v1/driving'
const GEOCODING_API = 'https://nominatim.openstreetmap.org/reverse'

export const formatEta = (durationSeconds) => {
  const totalMinutes = Math.max(1, Math.ceil(durationSeconds / 60))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []

  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours) parts.push(`${hours} hr`)
  if (minutes && parts.length < 2) parts.push(`${minutes} min`)

  return parts.join(' ')
}

export const formatEstimatedLocation = ({ address = {}, display_name: displayName } = {}) => {
  const area = address.suburb || address.neighbourhood || address.quarter || address.village
  const city = address.city || address.town || address.municipality
  const parts = [address.road || address.amenity || address.building, area, city].filter(Boolean)

  return [...new Set(parts)].join(', ') || displayName || null
}

export const selectQuickestRoute = (routes = []) =>
  routes.reduce(
    (quickest, route) => (!quickest || route.duration < quickest.duration ? route : quickest),
    null,
  )

const getEstimatedLocation = async (destination, signal) => {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: destination.lat,
    lon: destination.lng,
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'en',
  })
  const response = await fetch(`${GEOCODING_API}?${query}`, { signal })

  if (!response.ok) return null

  return formatEstimatedLocation(await response.json())
}

export const getDrivingRoute = async (destination, signal) => {
  const coordinates = `${CITY_HALL.lng},${CITY_HALL.lat};${destination.lng},${destination.lat}`
  const [response, locationResult] = await Promise.all([
    fetch(
      `${ROUTE_API}/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=false`,
      { signal },
    ),
    getEstimatedLocation(destination, signal).catch(() => null),
  ])

  if (!response.ok) throw new Error('Routing service is temporarily unavailable.')

  const data = await response.json()
  const routes = data.routes ?? []
  const route = selectQuickestRoute(routes)
  if (!route) throw new Error('No drivable route was found for that location.')

  const distanceKm = route.distance / 1000
  const eta = Math.max(1, Math.ceil(route.duration / 60))
  const pinnedLocation = `Pinned location (${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)})`

  return {
    destination: locationResult ? `${locationResult} · ${pinnedLocation}` : pinnedLocation,
    estimatedLocation: locationResult,
    pinnedLocation,
    destinationCoordinates: destination,
    origin: CITY_HALL,
    distance: `${distanceKm.toFixed(1)} km`,
    distanceKm,
    eta,
    etaLabel: formatEta(route.duration),
    alternativesConsidered: routes.length,
    fare: Math.ceil((60 + distanceKm * 18) / 5) * 5,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}
