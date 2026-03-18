// ── Mock Data ─────────────────────────────────────────────────────────────────


export const FEATURES = [
  {
    icon: '📦',
    title: 'Smart Booking',
    desc: 'Manage multiple consignments simultaneously with intelligent rate auto-fill and batch processing.',
  },
  {
    icon: '🧾',
    title: 'Professional Invoicing',
    desc: 'Generate branded, GST-compliant invoices with your logo. Print or email in one click.',
  },
  {
    icon: '📊',
    title: 'Analytics & Reports',
    desc: 'Daily P&L, performance vs DTDC charges, consignment reports and cashflow summaries.',
  },
  {
    icon: '📤',
    title: 'Excel Integration',
    desc: 'Import/export data to Excel seamlessly. No manual re-entry, no data loss.',
  },
  {
    icon: '🔔',
    title: 'Client Notifications',
    desc: 'Auto-notify clients via SMS/email with invoice details after every booking.',
  },
  {
    icon: '📉',
    title: 'Rate Management',
    desc: 'Set custom rates, slab-based pricing, and seasonal discounts per client.',
  },
  {
    icon: '👥',
    title: 'Client CRM',
    desc: 'Manage walk-in and account clients, outstanding dues, and payment history.',
  },
  {
    icon: '🏪',
    title: 'Stationery Tracker',
    desc: 'Monitor supplies inventory and get low-stock alerts before you run out.',
  },
]

export const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 499,
    color: '#6366F1',
    tag: null,
    features: [
      'Up to 200 bookings/month',
      'Invoice generation',
      'Basic reports',
      'Email support',
      '1 user account',
    ],
  },
  {
    name: 'Growth',
    price: 999,
    color: '#0057FF',
    tag: 'Most Popular',
    features: [
      'Unlimited bookings',
      'Branded invoices + logo',
      'Advanced analytics',
      'SMS notifications',
      '3 user accounts',
      'Excel import/export',
    ],
  },
  {
    name: 'Pro',
    price: 1799,
    color: '#FF5A1F',
    tag: 'Best Value',
    features: [
      'Everything in Growth',
      'Multi-branch support',
      'Priority phone support',
      'Custom rate slabs',
      'Unlimited users',
      'API access',
      'Dedicated account manager',
    ],
  },
]

export const SITE_STATS = [
  { value: '12,000+', label: 'Active Franchises' },
  { value: '₹4.2Cr+', label: 'Invoices Generated' },
  { value: '99.9%',   label: 'Uptime SLA' },
  { value: '4.8★',    label: 'Avg. User Rating' },
]

export const TESTIMONIALS = [
  {
    name: 'Ramesh Gupta',
    location: 'DTDC Franchise, Jaipur',
    avatar: 'RG',
    rating: 5,
    text: 'Courier Billing transformed our daily ops. Billing that used to take 3 hours is done in 20 minutes. The reports are spot-on and always ready before my day ends.',
  },
  {
    name: 'Priya Sharma',
    location: 'Franchise Owner, Pune',
    avatar: 'PS',
    rating: 5,
    text: "The Excel sync is a lifesaver. No more manual data entry, and the DTDC charge comparison report helped us save ₹18,000 last month alone.",
  },
  {
    name: 'Arjun Mehta',
    location: 'Multi-branch, Mumbai',
    avatar: 'AM',
    rating: 5,
    text: 'We run 4 branches and finally have one dashboard for everything. Client notifications alone increased our collection rate significantly.',
  },
]

export const SAMPLE_INVOICE = {
  number:   'INV-2024-00847',
  date:     '18 Mar 2026',
  dueDate:  '25 Mar 2026',
  client:   'Spark Electronics Pvt. Ltd.',
  clientGst:'27AAGCS1234F1Z5',
  items: [
    { desc: 'Document – Delhi to Mumbai',  weight: '0.5 kg', rate: 85,  total: 85  },
    { desc: 'Parcel – Jaipur',             weight: '2.5 kg', rate: 145, total: 145 },
    { desc: 'Express – Bangalore',         weight: '1.0 kg', rate: 130, total: 130 },
    { desc: 'Fragile – Hyderabad',         weight: '3.0 kg', rate: 210, total: 210 },
  ],
  subtotal: 570,
  gst:      102.6,
  total:    672.6,
}

export const SIDEBAR_MENU = [
  { icon: '🏠', label: 'Dashboard',  path: '/app/dashboard' },
  { icon: '📦', label: 'Bookings',   path: '/app/bookings'  },
  { icon: '🧾', label: 'Invoices',   path: '/app/invoices'  },
  { icon: '👥', label: 'Clients',    path: '/app/clients'   },
  { icon: '📉', label: 'Rates',      path: '/app/rates'     },
  { icon: '⚙️', label: 'Settings',   path: '/app/settings'  },
]

export const BOOKINGS = [
  { id: 'AWB001234', client: 'Ravi Textiles',     dest: 'Chennai',   origin: 'Jaipur',  weight: '3.5', amount: 210, status: 'In Transit', date: '18 Mar 2026', type: 'Parcel'   },
  { id: 'AWB001235', client: 'Meera Exports',     dest: 'Delhi',     origin: 'Jaipur',  weight: '1.0', amount: 85,  status: 'Delivered',  date: '18 Mar 2026', type: 'Document' },
  { id: 'AWB001236', client: 'Sun Pharma',        dest: 'Mumbai',    origin: 'Jaipur',  weight: '0.5', amount: 75,  status: 'Booked',     date: '17 Mar 2026', type: 'Document' },
  { id: 'AWB001237', client: 'Zara Fashions',     dest: 'Kolkata',   origin: 'Jaipur',  weight: '5.0', amount: 340, status: 'In Transit', date: '17 Mar 2026', type: 'Parcel'   },
  { id: 'AWB001238', client: 'TechZone Pvt.',     dest: 'Hyderabad', origin: 'Jaipur',  weight: '2.0', amount: 155, status: 'Delivered',  date: '16 Mar 2026', type: 'Parcel'   },
  { id: 'AWB001239', client: 'Sharma Jewellers',  dest: 'Surat',     origin: 'Jaipur',  weight: '0.3', amount: 65,  status: 'Booked',     date: '16 Mar 2026', type: 'Document' },
  { id: 'AWB001240', client: 'Gupta Brothers',    dest: 'Pune',      origin: 'Jaipur',  weight: '7.0', amount: 420, status: 'Delivered',  date: '15 Mar 2026', type: 'Heavy'    },
  { id: 'AWB001241', client: 'Bright Solutions',  dest: 'Ahmedabad', origin: 'Jaipur',  weight: '1.5', amount: 110, status: 'In Transit', date: '15 Mar 2026', type: 'Parcel'   },
  { id: 'AWB001242', client: 'Star Industries',   dest: 'Bhopal',    origin: 'Jaipur',  weight: '4.0', amount: 270, status: 'Cancelled',  date: '14 Mar 2026', type: 'Parcel'   },
  { id: 'AWB001243', client: 'KM Electronics',    dest: 'Nagpur',    origin: 'Jaipur',  weight: '2.5', amount: 185, status: 'Delivered',  date: '14 Mar 2026', type: 'Parcel'   },
]

export const CLIENTS = [
  { id: 'CLI001', name: 'Ravi Textiles',     gstin: '09AACFR1234A1Z5', phone: '9876543210', city: 'Jaipur',   totalBusiness: 48000, lastBooking: '18 Mar 2026' },
  { id: 'CLI002', name: 'Meera Exports',     gstin: '27AABCM5678B1Z3', phone: '9876543211', city: 'Pune',     totalBusiness: 72000, lastBooking: '18 Mar 2026' },
  { id: 'CLI003', name: 'Sun Pharma',        gstin: '24AABCS9012C1Z1', phone: '9876543212', city: 'Mumbai',   totalBusiness: 96000, lastBooking: '17 Mar 2026' },
  { id: 'CLI004', name: 'Zara Fashions',     gstin: '',               phone: '9876543213', city: 'Jaipur',   totalBusiness: 12000, lastBooking: '17 Mar 2026' },
  { id: 'CLI005', name: 'TechZone Pvt.',     gstin: '36AABCT3456D1Z9', phone: '9876543214', city: 'Hyderabad',totalBusiness: 38000, lastBooking: '16 Mar 2026' },
  { id: 'CLI006', name: 'Sharma Jewellers',  gstin: '',               phone: '9876543215', city: 'Surat',    totalBusiness: 9800,  lastBooking: '16 Mar 2026' },
  { id: 'CLI007', name: 'Gupta Brothers',    gstin: '09AABCG7890E1Z7', phone: '9876543216', city: 'Jaipur',   totalBusiness: 54000, lastBooking: '15 Mar 2026' },
  { id: 'CLI008', name: 'Bright Solutions',  gstin: '24AABCB2345F1Z5', phone: '9876543217', city: 'Ahmedabad',totalBusiness: 22000, lastBooking: '15 Mar 2026' },
]

export const INVOICES = [
  { id: 'INV-2026-00847', client: 'Spark Electronics', amount: 672.6,  status: 'Paid',    date: '18 Mar 2026', dueDate: '25 Mar 2026', items: 4 },
  { id: 'INV-2026-00846', client: 'Ravi Textiles',     amount: 3200,   status: 'Unpaid',  date: '15 Mar 2026', dueDate: '22 Mar 2026', items: 8 },
  { id: 'INV-2026-00845', client: 'Sun Pharma',        amount: 8400,   status: 'Overdue', date: '01 Mar 2026', dueDate: '08 Mar 2026', items: 21},
  { id: 'INV-2026-00844', client: 'Meera Exports',     amount: 1840,   status: 'Paid',    date: '28 Feb 2026', dueDate: '07 Mar 2026', items: 5 },
  { id: 'INV-2026-00843', client: 'TechZone Pvt.',     amount: 1200,   status: 'Unpaid',  date: '25 Feb 2026', dueDate: '04 Mar 2026', items: 3 },
  { id: 'INV-2026-00842', client: 'Gupta Brothers',    amount: 5600,   status: 'Overdue', date: '20 Feb 2026', dueDate: '27 Feb 2026', items: 14},
  { id: 'INV-2026-00841', client: 'Bright Solutions',  amount: 2200,   status: 'Paid',    date: '18 Feb 2026', dueDate: '25 Feb 2026', items: 6 },
]

export const PAYMENTS = [
  { id: 'PAY001', client: 'Spark Electronics', invoice: 'INV-2026-00847', amount: 672.6,  method: 'UPI',     date: '18 Mar 2026', ref: 'UPI123456' },
  { id: 'PAY002', client: 'Meera Exports',     invoice: 'INV-2026-00844', amount: 1840,   method: 'NEFT',    date: '06 Mar 2026', ref: 'NEFT789012' },
  { id: 'PAY003', client: 'Bright Solutions',  invoice: 'INV-2026-00841', amount: 2200,   method: 'Cash',    date: '24 Feb 2026', ref: 'CASH-0024' },
  { id: 'PAY004', client: 'TechZone Pvt.',     invoice: 'INV-2026-00843', amount: 600,    method: 'Cheque',  date: '02 Mar 2026', ref: 'CHQ-445521' },
  { id: 'PAY005', client: 'Zara Fashions',     invoice: 'INV-2026-00840', amount: 340,    method: 'UPI',     date: '17 Mar 2026', ref: 'UPI654321' },
]

export const RATE_SLABS = [
  { zone: 'Within State', upTo500g: 45,  upTo1kg: 65,  upTo2kg: 95,  perKgAfter: 30, },
  { zone: 'Metro',        upTo500g: 65,  upTo1kg: 85,  upTo2kg: 130, perKgAfter: 40, },
  { zone: 'Non-Metro',    upTo500g: 75,  upTo1kg: 100, upTo2kg: 155, perKgAfter: 48, },
  { zone: 'Special Zone', upTo500g: 95,  upTo1kg: 130, upTo2kg: 195, perKgAfter: 60, },
]

export const MONTHLY_REVENUE = [
  { month: 'Oct', revenue: 88000,  bookings: 412 },
  { month: 'Nov', revenue: 95000,  bookings: 448 },
  { month: 'Dec', revenue: 112000, bookings: 531 },
  { month: 'Jan', revenue: 98000,  bookings: 462 },
  { month: 'Feb', revenue: 105000, bookings: 498 },
  { month: 'Mar', revenue: 124500, bookings: 589 },
]

export const KPI_DATA = [
  { label: "Today's Revenue",   value: '₹8,240',   change: '+12% vs yesterday', up: true,  icon: '💰' },
  { label: 'Total Bookings',    value: '47',        change: '+5 since 9am',      up: true,  icon: '📦' },
  { label: 'Pending Collection',value: '₹3,180',   change: '3 clients',         up: false, icon: '⏳' },
  { label: 'Monthly Revenue',   value: '₹1,24,500',change: '84% of target',     up: true,  icon: '📈' },
]
