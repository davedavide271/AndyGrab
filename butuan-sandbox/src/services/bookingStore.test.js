import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  createBooking,
  acceptBooking,
  declineBooking,
  cancelBooking,
  listBookings,
} from './bookingStore.js'

// Mock localStorage for Node test environment
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
}

describe('bookingStore workflow', () => {
  beforeEach(() => {
    mockStorage.clear()
  })

  test('createBooking creates a pending booking with reference and passenger details', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const date = futureDate.toISOString().slice(0, 10)
    const time = futureDate.toTimeString().slice(0, 5)

    const booking = createBooking({
      date,
      time,
      passenger: { name: 'Juan Dela Cruz', phone: '09123456789' },
      destination: 'Robinsons Place Butuan',
      fare: 150,
      distance: '3.2 km',
      eta: 8,
    })

    assert.equal(booking.status, 'pending')
    assert.equal(booking.passenger.name, 'Juan Dela Cruz')
    assert.ok(booking.reference.startsWith('AG-'))

    const all = listBookings()
    assert.equal(all.length, 1)
    assert.equal(all[0].id, booking.id)
  })

  test('acceptBooking updates status to accepted', () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const date = futureDate.toISOString().slice(0, 10)
    const time = futureDate.toTimeString().slice(0, 5)

    const booking = createBooking({
      date,
      time,
      passenger: { name: 'Maria Santos', phone: '09987654321' },
      destination: 'SM City Butuan',
      fare: 180,
    })

    const updated = acceptBooking(booking.id)
    const accepted = updated.find((b) => b.id === booking.id)

    assert.equal(accepted.status, 'accepted')
    assert.ok(accepted.acceptedAt)
  })

  test('declineBooking sets status to declined and saves decline reason', () => {
    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000)
    const date = futureDate.toISOString().slice(0, 10)
    const time = futureDate.toTimeString().slice(0, 5)

    const booking = createBooking({
      date,
      time,
      passenger: { name: 'Carlos Garcia', phone: '09112223334' },
      destination: 'Bancasi Airport',
      fare: 250,
    })

    const reason = 'Vehicle maintenance - scheduled oil change'
    const updated = declineBooking(booking.id, reason)
    const declined = updated.find((b) => b.id === booking.id)

    assert.equal(declined.status, 'declined')
    assert.equal(declined.declineReason, reason)
    assert.ok(declined.declinedAt)
  })

  test('cancelBooking sets status to cancelled', () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const date = futureDate.toISOString().slice(0, 10)
    const time = futureDate.toTimeString().slice(0, 5)

    const booking = createBooking({
      date,
      time,
      passenger: { name: 'Elena Ramos', phone: '09334445556' },
      destination: 'Gaisano Mall',
      fare: 120,
    })

    const updated = cancelBooking(booking.id)
    const cancelled = updated.find((b) => b.id === booking.id)

    assert.equal(cancelled.status, 'cancelled')
    assert.ok(cancelled.cancelledAt)
  })
})
