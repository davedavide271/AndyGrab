import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import LiveRouteMap from "./components/LiveRouteMap";
import DriverPortal from "./components/DriverPortal";
import DriverLoginModal from "./components/DriverLoginModal";
import BookingMapModal from "./components/BookingMapModal";
import {
  acceptBooking,
  cancelBooking,
  createBooking,
  declineBooking,
  isSlotAvailable,
  listBookings,
} from "./services/bookingStore";

const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("andygrab_theme");
    if (saved === "dark" || saved === "light") return saved;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  }
  return "light";
};

const formatDateInput = (value) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextPickupSlot = () => {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60, 0, 0);
  return { date: formatDateInput(next), time: next.toTimeString().slice(0, 5) };
};

const initialPickup = getNextPickupSlot();

const Icon = ({ name }) => {
  const paths = {
    pin: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4m8-4v4M4 10h16" />
      </>
    ),
    shield: (
      <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4" />
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    check: <path d="m7 12 3 3 7-7" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c.4-4 2.4-6 6-6s5.6 2 6 6" />
      </>
    ),
    phone: (
      <path d="M7 4H5a1 1 0 0 0-1 1c0 8.3 6.7 15 15 15a1 1 0 0 0 1-1v-2l-4-1-1 2c-4-1-8-5-9-9l2-1-1-4Z" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
      </>
    ),
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
  };
  return (
    <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash === "#driver") {
      return "driver";
    }
    return "passenger";
  });
  const [isDriverLoggedIn, setIsDriverLoggedIn] = useState(() => {
    return (
      typeof window !== "undefined" &&
      sessionStorage.getItem("andygrab_driver_auth") === "true"
    );
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trip, setTrip] = useState(null);
  const [date, setDate] = useState(initialPickup.date);
  const [time, setTime] = useState(initialPickup.time);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState(null);
  const [bookings, setBookings] = useState(() => listBookings());
  const [bookingError, setBookingError] = useState("");
  const [clientMapBooking, setClientMapBooking] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("andygrab_theme", theme);
    } catch {
      // ignore storage errors if blocked
    }
  }, [theme]);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#driver") {
        setView("driver");
      } else if (
        window.location.hash === "" ||
        window.location.hash === "#top"
      ) {
        setView("passenger");
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigateTo = (newView) => {
    setView(newView);
    setMobileMenuOpen(false);
    window.location.hash = newView === "driver" ? "#driver" : "#top";
  };

  const handleOpenDriverAccess = () => {
    setMobileMenuOpen(false);
    const isAuth =
      isDriverLoggedIn ||
      (typeof window !== "undefined" &&
        sessionStorage.getItem("andygrab_driver_auth") === "true");
    if (isAuth) {
      if (!isDriverLoggedIn) setIsDriverLoggedIn(true);
      navigateTo("driver");
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleDriverLoginSuccess = () => {
    setIsDriverLoggedIn(true);
    setIsLoginModalOpen(false);
    navigateTo("driver");
  };

  const handleLockPortal = () => {
    try {
      sessionStorage.removeItem("andygrab_driver_auth");
    } catch {
      // ignore storage errors
    }
    setIsDriverLoggedIn(false);
    navigateTo("passenger");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const slotAvailable = useMemo(
    () => isSlotAvailable(date, time, bookings),
    [bookings, date, time],
  );

  const handleRouteChange = useCallback((route) => {
    setTrip(route);
    setBookingError("");
  }, []);

  const submitBooking = (event) => {
    event.preventDefault();
    setBookingError("");

    if (!trip) {
      setBookingError(
        "Select a destination on the map before reserving your ride.",
      );
      return;
    }

    try {
      const savedBooking = createBooking({
        date,
        time,
        passenger: { name: name.trim(), phone: phone.trim() },
        ...trip,
        geometry: trip.geometry,
        destinationCoordinates: trip.destinationCoordinates,
      });
      setBookings(listBookings());
      setBooked(savedBooking);
    } catch (error) {
      setBookingError(error.message);
    }
  };

  const handleCancellation = (bookingId) => {
    cancelBooking(bookingId);
    setBookings(listBookings());
  };

  const handleAcceptBooking = (bookingId) => {
    acceptBooking(bookingId);
    setBookings(listBookings());
  };

  const handleDeclineBooking = (bookingId, reason) => {
    declineBooking(bookingId, reason);
    setBookings(listBookings());
  };

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a
          className="brand"
          href="#top"
          onClick={(e) => {
            if (view === "driver") {
              e.preventDefault();
              navigateTo("passenger");
            }
          }}
          aria-label="Andy Grab home"
        >
          <span className="brand-mark">A</span>
          <span>
            Andy<span>Grab</span>
          </span>
          {view === "driver" && (
            <span className="driver-nav-badge">Driver Portal</span>
          )}
        </a>

        {view === "passenger" && (
          <div className={`nav-links ${mobileMenuOpen ? "open" : ""}`}>
            <a href="#services" onClick={() => setMobileMenuOpen(false)}>
              Services
            </a>
            <a href="#booking" onClick={() => setMobileMenuOpen(false)}>
              Book a ride
            </a>
            <a href="#trips" onClick={() => setMobileMenuOpen(false)}>
              My trips
            </a>
          </div>
        )}

        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
            title={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
            <span className="theme-toggle-label">
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </button>
          {view === "passenger" ? (
            <>
              <button
                type="button"
                className="nav-cta driver-header-login-btn"
                onClick={handleOpenDriverAccess}
                title={
                  isDriverLoggedIn
                    ? "Go to Driver's Portal"
                    : "Open driver sign-in modal"
                }
              >
                <Icon name={isDriverLoggedIn ? "user" : "lock"} />{" "}
                {isDriverLoggedIn ? "Driver's Portal" : "Driver Sign In"}
              </button>
              <button
                className="menu"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                <Icon name={mobileMenuOpen ? "x" : "menu"} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="driver-secondary-btn"
              onClick={handleLockPortal}
              title="Lock driver portal and sign out"
            >
              <Icon name="lock" /> Sign Out
            </button>
          )}
        </div>
      </nav>

      {view === "driver" ? (
        <DriverPortal
          bookings={bookings}
          onAcceptBooking={handleAcceptBooking}
          onDeclineBooking={handleDeclineBooking}
          onBackToPassenger={() => navigateTo("passenger")}
        />
      ) : (
        <>
          <section className="hero shell" id="top">
            <div className="hero-copy">
              <div className="eyebrow">
                <span></span> Your city, within reach
              </div>
              <h1>
                Move around.
                <br />
                <em>Move smarter.</em>
              </h1>
              <p>
                Reliable rides, clear pricing, and thoughtful service—all around
                Butuan, right when you need it.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#booking">
                  Book your ride <Icon name="arrow" />
                </a>
              </div>
              <div className="trust-row">
                <div className="driver-avatar">A</div>
                <div>
                  <strong>Driven personally by Andy</strong>
                  <small>One driver, one carefully managed schedule</small>
                </div>
              </div>
            </div>

            <div className="map-visual">
              <LiveRouteMap onRouteChange={handleRouteChange} />
              <div className="eta-card">
                <span className="car-icon">✦</span>
                <div>
                  <small>Driving ETA</small>
                  <strong>
                    {trip ? trip.etaLabel || `${trip.eta} min` : "Select route"}
                  </strong>
                </div>
                <span className="live-dot">Live</span>
              </div>
              <div className="map-caption">
                <span>
                  <i></i> Origin fixed at Butuan City Hall
                </span>
                <b>{trip?.distance ?? "Click the map"}</b>
              </div>
            </div>
          </section>

          <section className="booking-wrap shell" id="booking">
            <form className="booking-card" onSubmit={submitBooking}>
              <div className="booking-heading">
                <small>PLAN YOUR RIDE</small>
                <h2>Where are you going?</h2>
              </div>
              <label className="field">
                <span>Passenger name</span>
                <div>
                  <Icon name="user" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>Mobile number</span>
                <div>
                  <Icon name="phone" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09XX XXX XXXX"
                    pattern="[0-9+ ]{10,16}"
                    autoComplete="tel"
                    required
                  />
                </div>
              </label>
              <label className="field destination-field">
                <span>Destination</span>
                <div>
                  <Icon name="pin" />
                  <input
                    type="text"
                    value={trip?.destination ?? ""}
                    placeholder="Select on the map"
                    readOnly
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>Date</span>
                <div>
                  <Icon name="calendar" />
                  <input
                    type="date"
                    value={date}
                    min={formatDateInput(new Date())}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>Pickup time</span>
                <div>
                  <Icon name="clock" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </label>
              <button className="fare-button" type="submit" disabled={!trip}>
                {/* <span>
                  <small>Estimated fare</small>
                  <strong>{trip ? `₱${trip.fare}` : "—"}</strong>
                </span> */}
                <b>
                  Reserve ride <Icon name="arrow" />
                </b>
              </button>
              <p
                className={`slot-status ${slotAvailable ? "available" : "unavailable"}`}
              >
                <i></i>
                {slotAvailable
                  ? "Andy is available for this slot"
                  : "Andy has a nearby booking—choose another time"}
              </p>
              {bookingError && (
                <p className="booking-error" role="alert">
                  {bookingError}
                </p>
              )}
            </form>
          </section>

          <section className="trips shell" id="trips">
            <div className="trips-heading">
              <div>
                <small>ANDY'S SCHEDULE</small>
                <h2>Your bookings</h2>
              </div>
              <p>
                {bookings.length
                  ? "Your bookings are saved on this device."
                  : "Your scheduled rides with Andy will appear here."}
              </p>
            </div>
            {bookings.length === 0 ? (
              <div className="empty-trips">
                <span>
                  <Icon name="calendar" />
                </span>
                <h3>No rides booked yet</h3>
                <p>Choose your destination and schedule your first trip.</p>
                <a href="#booking">
                  Plan a ride <Icon name="arrow" />
                </a>
              </div>
            ) : (
              <div className="trip-list">
                {bookings.map((booking) => {
                  const isPending = booking.status === "pending";
                  const isAccepted =
                    booking.status === "accepted" ||
                    booking.status === "confirmed";
                  const isDeclined = booking.status === "declined";

                  return (
                    <article
                      className={`trip-card ${booking.status}`}
                      key={booking.id}
                    >
                      <div className="trip-date">
                        <strong>
                          {new Date(`${booking.date}T00:00`).toLocaleDateString(
                            "en-PH",
                            { day: "2-digit" },
                          )}
                        </strong>
                        <span>
                          {new Date(`${booking.date}T00:00`).toLocaleDateString(
                            "en-PH",
                            { month: "short" },
                          )}
                        </span>
                      </div>
                      <div className="trip-route">
                        <small>{booking.reference}</small>
                        <h3>{booking.destination}</h3>
                        <p>
                          {booking.time} · {booking.distance} ·{" "}
                          {booking.passenger?.name || "Passenger"}
                        </p>

                        {/* Display driver decline reason for all users */}
                        {isDeclined && (
                          <div className="trip-decline-banner" role="status">
                            <span className="decline-banner-header">
                              <Icon name="x" /> Declined by Andy
                            </span>
                            <p className="decline-banner-reason">
                              <strong>Reason:</strong>{" "}
                              {booking.declineReason ||
                                "No specific reason provided."}
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          className="trip-map-btn"
                          onClick={() => setClientMapBooking(booking)}
                          title="View destination and route on map"
                        >
                          <Icon name="map" /> View destination on map
                        </button>
                      </div>

                      <div className="trip-fare">
                        <span className={`status ${booking.status}`}>
                          {isPending && "Pending"}
                          {isAccepted && "Confirmed"}
                          {isDeclined && "Declined"}
                          {booking.status === "cancelled" && "Cancelled"}
                        </span>
                        {/* <strong>₱{booking.fare}</strong> */}
                      </div>

                      {(isAccepted || isPending) && (
                        <button
                          className="cancel-button"
                          type="button"
                          onClick={() => handleCancellation(booking.id)}
                        >
                          Cancel ride
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="services shell" id="services">
            <div className="section-heading">
              <div>
                <span className="section-number">01</span>
                <small>WHY ANDY GRAB</small>
              </div>
              <h2>
                One ride.
                <br />
                Everything considered.
              </h2>
              <p>
                From booking to drop-off, every detail is designed to make
                getting around feel effortless.
              </p>
            </div>
            <div className="feature-grid">
              <article>
                <span className="feature-icon">
                  <Icon name="clock" />
                </span>
                <small>01 / ARRIVAL</small>
                <h3>
                  Know when
                  <br />
                  we’re coming.
                </h3>
                <p>Live ETA updates mean less waiting and more certainty.</p>
                <b>
                  ~12 min <small>avg. pickup</small>
                </b>
              </article>
              <article>
                <span className="feature-icon">
                  <Icon name="pin" />
                </span>
                <small>02 / COVERAGE</small>
                <h3>
                  Across the city,
                  <br />
                  and beyond.
                </h3>
                <p>Book a ride to key destinations throughout Butuan.</p>
                <b>
                  4 zones <small>and growing</small>
                </b>
              </article>
              <article id="safety">
                <span className="feature-icon">
                  <Icon name="shield" />
                </span>
                <small>03 / YOUR DRIVER</small>
                <h3>
                  The same driver,
                  <br />
                  every time.
                </h3>
                <p>Book directly with Andy and know exactly who will arrive.</p>
                <b>
                  One driver <small>personal service</small>
                </b>
              </article>
            </div>
          </section>

          <section className="closing">
            <div className="shell">
              <p>Ready when you are.</p>
              <h2>
                Your next ride is
                <br />
                <em>just a few taps away.</em>
              </h2>
              <div className="closing-actions">
                <a className="primary-button light" href="#booking">
                  Book with Andy Grab <Icon name="arrow" />
                </a>
                <button
                  type="button"
                  className="driver-secondary-light-btn"
                  onClick={handleOpenDriverAccess}
                >
                  <Icon name={isDriverLoggedIn ? "user" : "lock"} />{" "}
                  {isDriverLoggedIn ? "Driver's Portal" : "Driver Sign In"}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="shell">
        <a
          className="brand"
          href="#top"
          onClick={(e) => {
            if (view === "driver") {
              e.preventDefault();
              navigateTo("passenger");
            }
          }}
        >
          <span className="brand-mark">A</span>
          <span>
            Andy<span>Grab</span>
          </span>
        </a>
        <p>Local rides, made simple.</p>

        <small>© 2026 Andy Grab. Frontend demo.</small>
      </footer>

      {/* Driver Login Modal */}
      <DriverLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleDriverLoginSuccess}
      />

      {booked && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setBooked(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="success-icon">
              <Icon name="check" />
            </span>
            <small>{booked.reference}</small>
            <h2 id="confirmation-title">Booking Submitted!</h2>
            <p>
              <strong>{booked.passenger?.name}</strong>, your ride request to{" "}
              <strong>{booked.destination}</strong> is scheduled for{" "}
              {new Date(`${booked.date}T00:00`).toLocaleDateString("en-PH", {
                month: "long",
                day: "numeric",
              })}{" "}
              at {booked.time}.
            </p>
            <div>
              <span>Estimated arrival</span>
              <strong>{booked.etaLabel || `${booked.eta} min`}</strong>
            </div>
            <p className="modal-note">
              Andy will review and confirm your booking in the driver schedule.
            </p>
            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-view-map-btn"
                onClick={() => {
                  const b = booked;
                  setBooked(null);
                  setClientMapBooking(b);
                }}
              >
                <Icon name="map" /> View on Map
              </button>
              <button type="button" onClick={() => setBooked(null)}>
                View my trips
              </button>
            </div>
          </section>
        </div>
      )}

      {clientMapBooking && (
        <BookingMapModal
          booking={clientMapBooking}
          role="client"
          onClose={() => setClientMapBooking(null)}
        />
      )}
    </main>
  );
}

export default App;
