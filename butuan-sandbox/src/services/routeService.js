export const CITY_HALL = {
  name: 'Butuan City Hall',
  lat: 8.95351,
  lng: 125.52923,
}

const ROUTE_API = 'https://router.project-osrm.org/route/v1/driving'
const NOMINATIM_API = 'https://nominatim.openstreetmap.org'

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

export const formatEstimatedLocation = ({
  address = {},
  display_name: displayName,
} = {}) => {
  const area =
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.village

  const city =
    address.city ||
    address.town ||
    address.municipality

  const parts = [
    address.road || address.amenity || address.building,
    area,
    city,
  ].filter(Boolean)

  return [...new Set(parts)].join(', ') || displayName || null
}

export const selectQuickestRoute = (routes = []) =>
  routes.reduce(
    (quickest, route) =>
      !quickest || route.duration < quickest.duration ? route : quickest,
    null,
  )

export const searchPlaces = async (searchText, signal) => {
  const queryText = searchText.trim()

  if (queryText.length < 3) return []

  const query = new URLSearchParams({
    format: 'jsonv2',
    q: queryText,
    addressdetails: '1',
    limit: '6',
    countrycodes: 'ph',
    'accept-language': 'en',
    viewbox: '125.35,9.12,125.72,8.75',
    bounded: '0',
  })

  const response = await fetch(`${NOMINATIM_API}/search?${query}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Place search is temporarily unavailable.')
  }

  const results = await response.json()

  return results.map((place) => ({
    id: place.place_id,
    name: formatEstimatedLocation(place) || place.display_name,
    displayName: place.display_name,
    lat: Number(place.lat),
    lng: Number(place.lon),
  }))
}

export const reverseGeocode = async (location, signal) => {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(location.lat),
    lon: String(location.lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'en',
  })

  const response = await fetch(`${NOMINATIM_API}/reverse?${query}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) return null

  const place = await response.json()

  return {
    name: formatEstimatedLocation(place) || place.display_name,
    displayName: place.display_name,
    lat: location.lat,
    lng: location.lng,
  }
}

export const getDrivingRoute = async (origin, destination, signal) => {
  const coordinates =
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`

  const response = await fetch(
    `${ROUTE_API}/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=false`,
    { signal },
  )

  if (!response.ok) {
    throw new Error('Routing service is temporarily unavailable.')
  }

  const data = await response.json()
  const routes = data.routes ?? []
  const route = selectQuickestRoute(routes)

  if (!route) {
    throw new Error('No drivable route was found between these locations.')
  }

  if (!response.ok) {
    throw new Error('Place search is temporarily unavailable.')
  }

  const results = await response.json()

  return results.map((place) => ({
    id: place.place_id,
    name: formatEstimatedLocation(place) || place.display_name,
    displayName: place.display_name,
    lat: Number(place.lat),
    lng: Number(place.lon),
  }))
}

export const reverseGeocode = async (location, signal) => {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(location.lat),
    lon: String(location.lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'en',
  })

  const response = await fetch(`${NOMINATIM_API}/reverse?${query}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) return null

  const place = await response.json()

  return {
    origin: {
      name: origin.name || 'Selected pickup',
      lat: origin.lat,
      lng: origin.lng,
    },
    destination: destination.name || 'Selected destination',
    destinationCoordinates: {
      lat: destination.lat,
      lng: destination.lng,
    },
    distance: `${distanceKm.toFixed(1)} km`,
    distanceKm,
    eta,
    etaLabel: formatEta(route.duration),
    alternativesConsidered: routes.length,
    fare: Math.ceil((60 + distanceKm * 18) / 5) * 5,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}