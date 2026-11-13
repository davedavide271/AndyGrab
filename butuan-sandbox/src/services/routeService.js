export const CITY_HALL = {
  name: 'Butuan City Hall',
  lat: 8.95351,
  lng: 125.52923,
}

const ROUTE_API = 'https://router.project-osrm.org/route/v1/driving'

export const selectQuickestRoute = (routes = []) =>
  routes.reduce(
    (quickest, route) => (!quickest || route.duration < quickest.duration ? route : quickest),
    null,
  )

export const getDrivingRoute = async (destination, signal) => {
  const coordinates = `${CITY_HALL.lng},${CITY_HALL.lat};${destination.lng},${destination.lat}`
  const response = await fetch(
    `${ROUTE_API}/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=false`,
    { signal },
  )

  if (!response.ok) throw new Error('Routing service is temporarily unavailable.')

  const data = await response.json()
  const routes = data.routes ?? []
  const route = selectQuickestRoute(routes)
  if (!route) throw new Error('No drivable route was found for that location.')

  const distanceKm = route.distance / 1000
  const eta = Math.max(1, Math.ceil(route.duration / 60))

  return {
    destination: `Pinned location (${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)})`,
    destinationCoordinates: destination,
    origin: CITY_HALL,
    distance: `${distanceKm.toFixed(1)} km`,
    distanceKm,
    eta,
    alternativesConsidered: routes.length,
    fare: Math.ceil((60 + distanceKm * 18) / 5) * 5,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}
