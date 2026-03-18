# CourierBilling — Frontend React App

A full-featured, production-grade React frontend for a courier billing & management SaaS — built exclusively for DTDC franchise owners.

---

## Tech Stack

| Layer      | Choice                     |
|------------|----------------------------|
| Framework  | React 18 + Vite            |
| Routing    | React Router DOM v6        |
| Styling    | Inline styles + CSS tokens |
| State      | React Context API          |
| Fonts      | Syne (display) + DM Sans   |

No heavy UI library dependencies — intentionally lightweight and customizable.

---

## Project Structure

```
courier-billing/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                    # App entry
    ├── App.jsx                     # Router & routes
    ├── index.css                   # Global resets & animations
    │
    ├── constants/
    │   ├── theme.js                # Design tokens (colors, radius, shadows)
    │   └── data.js                 # All mock data
    │
    ├── context/
    │   └── AppContext.jsx          # Global state (sidebar, toasts)
    │
    ├── hooks/
    │   └── useCounter.js           # Animated number counter
    │
    ├── components/
    │   ├── common/
    │   │   ├── Badge.jsx           # Pill label badge
    │   │   ├── StatusBadge.jsx     # Booking/invoice status chip
    │   │   ├── Button.jsx          # Multi-variant button
    │   │   ├── Input.jsx           # Text / select / textarea
    │   │   └── Modal.jsx           # Overlay modal
    │   │
    │   ├── layout/
    │   │   ├── Navbar.jsx          # Public sticky navbar
    │   │   ├── Footer.jsx          # Public footer
    │   │   ├── Sidebar.jsx         # Dashboard sidebar with NavLink
    │   │   └── DashboardLayout.jsx # Sidebar + topbar + toast wrapper
    │   │
    │   └── dashboard/
    │       ├── KpiCard.jsx         # KPI metric card
    │       ├── RevenueChart.jsx    # Bar chart (pure CSS/HTML)
    │       ├── RecentBookingsTable.jsx
    │       └── QuickBookingForm.jsx
    │
    └── pages/
        ├── landing/
        │   ├── LandingPage.jsx     # Assembles all sections
        │   ├── HeroSection.jsx     # Hero with animated counters
        │   └── LandingSections.jsx # StatsBar, Features, Invoice, Pricing, Testimonials, CTA
        │
        ├── dashboard/
        │   └── DashboardPage.jsx
        ├── bookings/
        │   └── BookingsPage.jsx    # Full CRUD table + modal
        ├── invoices/
        │   └── InvoicesPage.jsx    # Invoice table + preview modal
        ├── clients/
        │   └── ClientsPage.jsx     # CRM table + add modal
        ├── reports/
        │   └── ReportsPage.jsx     # Analytics + DTDC comparison
        ├── payments/
        │   └── PaymentsPage.jsx    # Payment history + record modal
        ├── rates/
        │   └── RatesPage.jsx       # Zone rate slab editor
        ├── settings/
        │   └── SettingsPage.jsx    # Tabbed settings (Profile, Invoice, Notifs, Users, Plan)
        └── NotFoundPage.jsx        # 404 page
```

---

## Quick Start

### 1. Install dependencies

```bash
cd courier-billing
npm install
```

### 2. Start dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Build for production

```bash
npm run build
```

---

## Pages & Routes

| Route               | Page                  | Description                          |
|---------------------|-----------------------|--------------------------------------|
| `/`                 | Landing Page          | Marketing site with all sections     |
| `/app/dashboard`    | Dashboard             | KPIs, revenue chart, recent bookings |
| `/app/bookings`     | Bookings              | Full consignment table, search, add  |
| `/app/invoices`     | Invoices              | Invoice list, preview, send          |
| `/app/clients`      | Clients               | CRM with outstanding amounts         |
| `/app/reports`      | Reports               | Analytics, DTDC comparison           |
| `/app/payments`     | Payments              | Payment history, record payments     |
| `/app/rates`        | Rate Management       | Edit zone-wise pricing slabs         |
| `/app/settings`     | Settings              | Profile, invoice, notifications, plan|
| `*`                 | 404 Page              | Parcel Not Found                     |

---

## Design System

Colors, border radii, and shadows are all defined in `src/constants/theme.js`. To change the brand color:

```js
// src/constants/theme.js
export const COLORS = {
  primary:     '#0057FF',  // ← change this
  primaryDark: '#003FCC',
  ...
}
```

---

## Key Features Implemented

- ✅ Fully responsive layout (CSS grid auto-fit + minmax)
- ✅ Collapsible sidebar with active route highlighting
- ✅ Toast notification system (global via Context)
- ✅ Animated counter on hero section
- ✅ Search + filter on Bookings and Clients pages
- ✅ Add / Create modals with form validation
- ✅ Invoice preview modal with line items
- ✅ Monthly/Annual pricing toggle
- ✅ Editable rate slabs in Rates page
- ✅ Tabbed Settings page with toggles
- ✅ 404 page with courier-themed copy
- ✅ Dark hero (Testimonials section) with light landing

---

## Customization Tips

- **Add auth**: Wrap `/app/*` routes with an auth guard component
- **Connect API**: Replace mock data in `src/constants/data.js` with API calls via `useEffect`
- **Add charts**: Drop in `recharts` or `chart.js` inside `RevenueChart.jsx`
- **PDF export**: Add `jspdf` + `html2canvas` for real invoice PDF download
- **SMS/email**: Wire up Twilio or SendGrid calls from the backend
