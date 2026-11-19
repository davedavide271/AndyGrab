const STORAGE_KEY = 'andy-grab-bookings-v1'

const readBookings = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

const writeBookings = (bookings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  return bookings
}

const createReference = () => {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `AG-${date}-${random}`
}

export const listBookings = () =>
  readBookings().sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))

export const isSlotAvailable = (date, time, bookings = readBookings()) => {
  const requestedTime = new Date(`${date}T${time}`).getTime()
  return !bookings.some((booking) => {
    if (booking.status === 'cancelled' || booking.status === 'declined') return false
    const bookedTime = new Date(`${booking.date}T${booking.time}`).getTime()
    return Math.abs(bookedTime - requestedTime) < 60 * 60 * 1000
  })
}

export const createBooking = (booking) => {
  const bookings = readBookings()
  const pickupTime = new Date(`${booking.date}T${booking.time}`)

  if (pickupTime <= new Date()) {
    throw new Error('Pickup time must be in the future.')
  }

  if (!isSlotAvailable(booking.date, booking.time, bookings)) {
    throw new Error('Andy is already booked near that time. Please allow a one-hour gap.')
  }

  const savedBooking = {
    ...booking,
    id: crypto.randomUUID?.() ?? `${Date.now()}`,
    reference: createReference(),
    status: 'pending',
    driver: 'Andy',
    createdAt: new Date().toISOString(),
  }

  writeBookings([...bookings, savedBooking])
  return savedBooking
}

export const updateBookingStatus = (bookingId, status, extraData = {}) => {
  const updated = readBookings().map((booking) =>
    booking.id === bookingId
      ? {
          ...booking,
          status,
          ...extraData,
          updatedAt: new Date().toISOString(),
          ...(status === 'cancelled' ? { cancelledAt: new Date().toISOString() } : {}),
          ...(status === 'declined' ? { declinedAt: new Date().toISOString() } : {}),
          ...(status === 'accepted' ? { acceptedAt: new Date().toISOString() } : {}),
        }
      : booking,
  )
  return writeBookings(updated)
}

export const acceptBooking = (bookingId) =>
  updateBookingStatus(bookingId, 'accepted', { declineReason: undefined })

export const declineBooking = (bookingId, reason = '') =>
  updateBookingStatus(bookingId, 'declined', { declineReason: reason.trim() })

export const cancelBooking = (bookingId) =>
  updateBookingStatus(bookingId, 'cancelled')
