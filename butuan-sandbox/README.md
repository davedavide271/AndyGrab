# Andy Grab

Andy Grab is a frontend ride-booking demo for Butuan City. It lets passengers select a destination on an interactive map, estimate a ride, reserve a pickup slot, and manage bookings. The same application includes a driver portal for reviewing and updating ride requests.

## Features

- Interactive Leaflet/OpenStreetMap destination map
- Place search and map-click destination selection
- Fastest driving route calculation through OSRM
- Estimated distance, travel time, and fare
- Passenger name and mobile number collection
- Date and pickup-time scheduling
- Booking availability checks and Local Storage persistence
- Passenger trip history with cancellation support
- Driver PIN sign-in
- Driver booking accept and decline workflow
- Booking route map modal
- Light and dark themes
- Responsive passenger and driver layouts

## Tech Stack

- React 19
- Vite 8
- Leaflet
- OpenStreetMap
- Nominatim geocoding
- OSRM routing
- Browser Local Storage and Session Storage
- Node.js test runner
- ESLint

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Internet access for map tiles, place search, geocoding, and route calculations

### Installation

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## Available Commands

```bash
npm run dev     # Start the development server
npm run build   # Create a production build
npm run preview # Preview the production build
npm run lint    # Run ESLint
npm test        # Run service tests
```

## Passenger Workflow

1. Search for a destination or click a point on the map.
2. Review the route, distance, ETA, and estimated fare.
3. Enter the passenger name and mobile number.
4. Choose a date and pickup time.
5. Reserve the ride when a destination and available slot are selected.
6. View or cancel the booking from My Trips.

## Driver Portal

Open the Driver Sign In button to enter the portal. The driver can view pending, accepted, declined, and cancelled bookings, then accept or decline ride requests.

Driver authentication is demo-only. This project does not include a backend or secure production authentication system.

## Data Storage

- Passenger bookings are saved in browser Local Storage.
- Theme preference is saved in browser Local Storage.
- Driver authentication state is saved in browser Session Storage.

Clearing browser storage removes the demo data stored on that device.

## Project Structure

```text
src/
├── App.jsx                  # Main passenger, navigation, booking, and theme views
├── App.css                  # Application and component styling
├── components/
│   ├── LiveRouteMap.jsx     # Interactive map and destination search
│   ├── BookingMapModal.jsx  # Booking route detail view
│   ├── DriverLoginModal.jsx # Driver PIN login
│   └── DriverPortal.jsx     # Driver booking management
└── services/
    ├── bookingStore.js      # Local booking state and workflow
    ├── bookingStore.test.js # Booking workflow tests
    ├── routeService.js      # Search, geocoding, and routing services
    └── routeService.test.js # Route formatting and selection tests
```

## External Services

- Leaflet for interactive map controls
- OpenStreetMap for map tiles
- Nominatim for place search and reverse geocoding
- OSRM for driving route calculations

A network or service outage may prevent route and destination searches from loading.

## Notes

This is a frontend demonstration project. It does not currently provide server-side booking validation, payment processing, real ride dispatching, or production authentication.
