import test from 'node:test'
import assert from 'node:assert/strict'
import { formatEstimatedLocation, formatEta, selectQuickestRoute } from './routeService.js'

test('formatEta uses minutes, hours, and days as needed', () => {
  assert.equal(formatEta(180), '3 min')
  assert.equal(formatEta(5400), '1 hr 30 min')
  assert.equal(formatEta(183600), '2 days 3 hr')
})

test('formatEstimatedLocation builds a concise nearby address', () => {
  assert.equal(formatEstimatedLocation({
    address: { road: 'T. Calo Street', suburb: 'Poblacion', city: 'Butuan' },
  }), 'T. Calo Street, Poblacion, Butuan')
})

test('selectQuickestRoute returns the route with the lowest duration', () => {
  const quickest = selectQuickestRoute([
    { duration: 720, distance: 3000 },
    { duration: 540, distance: 4200 },
    { duration: 660, distance: 2800 },
  ])

  assert.deepEqual(quickest, { duration: 540, distance: 4200 })
})

test('selectQuickestRoute returns null when no routes are available', () => {
  assert.equal(selectQuickestRoute(), null)
})
