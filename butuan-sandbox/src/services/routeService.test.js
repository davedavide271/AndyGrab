import test from 'node:test'
import assert from 'node:assert/strict'
import { selectQuickestRoute } from './routeService.js'

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
