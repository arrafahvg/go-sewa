# GO-SEWA — Rental Booking, Device Management & Operations System

> **🤖 AI agents:** read [`AGENTS.md`](AGENTS.md) first — it is the mandatory skill for
> this repo. The full product specification is in [`docs/SPEC.md`](docs/SPEC.md).

Full-stack rental platform for Go-Sewa: storefront, date-based availability,
individual physical device management, bookings, CRM basics, CMS content, and an
admin operations console.

## Tech stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4**
- **PostgreSQL** via **Drizzle ORM**
- **Better Auth** for authentication
- Server Actions as the API/service boundary

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL + BETTER_AUTH_SECRET

# create / update the schema from lib/db/schema.ts
npx drizzle-kit push         # or: npm run db:push

# load realistic Indonesian demo data
npm run db:seed

npm run dev
```

### Admin access (RBAC, §54)

New sign-ups default to role `customer` and cannot open `/admin`. Promote yourself
after signing up:

```sql
UPDATE "user" SET role = 'owner' WHERE email = 'you@example.com';
```

Roles: `owner` (full), `admin`, `staff` (bookings/handover), `customer` (storefront only).

### Overdue automation (§17)

`GET /api/cron/overdue` flags passed-due rentals as overdue (and their units).
Protect it by setting `CRON_SECRET` and calling with `Authorization: Bearer <secret>`.
The admin dashboard also runs the sweep on load so staff always sees current state.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Auth signing secret |
| `BETTER_AUTH_URL` | dev | Base URL for auth callbacks |

## Architecture

```
lib/db/schema.ts          46-table relational model (catalog, devices, bookings,
                          allocations, financials, agreements, CMS, audit logs)
lib/services/             Business logic layer (server-side only)
  availability.ts         Date-based availability engine
  pricing.ts              Configurable pricing rules + historical snapshots
  devices.ts              Device status lifecycle + maintenance/damage
  bookings.ts             Transactional booking creation w/ conflict prevention
  settings.ts             Configurable business settings
  audit.ts                Audit log helper
lib/data/                 Read/query helpers for pages (catalog, admin)
app/actions/              Server actions exposed to the UI
app/(storefront)/         Home, /rent, /rent/[slug], /checkout
app/admin                 Admin console (overview, bookings, walk-in rental)
```

### Availability logic (`lib/services/availability.ts`)

Available units for a date range = active rentable devices − devices already
allocated to overlapping blocking-status bookings − devices under manual
availability blocks − devices in an unbookable status
(`maintenance`, `damaged`, `lost`, `retired`, `blocked`).
A configurable turnaround buffer is supported. Availability is always computed
from the database — never stored as a static number.

### Booking conflict prevention (`lib/services/bookings.ts`)

Booking creation runs in a single transaction that takes
`SELECT ... FOR UPDATE` row locks on every physical unit of the product, then
re-evaluates free devices before inserting allocations. Two concurrent attempts
to book the last unit cannot both succeed.

The public checkout and the admin walk-in flow call the **same** service; only
the `channel` differs (`online` vs `in_store` / `phone` / `whatsapp`).

### Device lifecycle

`available → reserved → rented → returning → inspection → available`
plus side states `maintenance`, `damaged`, `lost`, `retired`, `blocked`.
Every unit carries its own asset code, serial number, IMEI, condition, battery
health, and history tables.

### Historical pricing snapshots (§58)

Each booking stores the rule kind, label, unit price, add-on cost, line total,
product name snapshot, deposit, discount, and channel at booking time. Changing
a product's price later never mutates historical rentals.

## Routes

| Route | Description |
| --- | --- |
| `/` | Storefront home (real products/categories from DB) |
| `/rent` | Product listing |
| `/rent/[slug]` | Product detail + live availability date picker |
| `/checkout` | Cart review + booking submission |
| `/admin` | Admin console (overview, bookings, walk-in new rental, customers) |
| `/sign-in`, `/sign-up` | Auth |

## Known limitations / next steps

- i18n strings are not yet extracted into locale files (§9) — biggest remaining gap.
- Account basics are live at `/account` (change email, change password, session
  management). "My bookings" is live at `/account/bookings`: online checkouts link
  the booking's customer record to the signed-in account (`customers.user_id`),
  and existing customers are auto-linked by exact email match on first visit.
- Admin CRM/CRM screens are live at `/admin/customers` (customer profiles + their
  rental history) and `/admin/leads` (create, filter by status, convert to a
  customer). Booking detail `/admin/bookings/[id]` includes handover + deposit
  & payment recording. Product/device/pricing CRUD UI is built at
  `/admin/inventory`.
- Invoice generation is live: booking detail → "Generate invoice", printable
  document at `/admin/invoices/[id]` (print-to-PDF), list at `/admin/invoices`.
- Rental agreement generation is live: booking detail → "Generate agreement",
  printable/signature-ready document at `/admin/agreements/[id]`, merged from
  the active template + booking snapshot. Template editing UI is pending.
- Deposits & payments (§13, §16): lifecycle is live end-to-end. Services
  (`lib/services/deposits.ts`, `payments.ts`), server actions
  (`app/actions/deposits.ts`, `app/actions/payments.ts`) and the booking-detail
  panel (`components/admin/deposit-payment-panel.tsx`) record deposit
  held/returned/forfeited and payments (derived paid status). The per-product
  `deposit_required` flag (column added in
  `drizzle/0003_worried_madelyne_pryor.sql` — run `npm run db:push`) is now
  enforced at checkout: flagged products force an identity document upload.
  Seed data marks the iPhone 15 Pro as `deposit_required`.
- Identity document (KTP/SIM) collateral upload is live: required at online
  checkout and walk-in creation, stored in a private Supabase Storage bucket
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ID_DOCS_BUCKET`),
  reviewed via short-lived signed URLs on the admin booking page. Create the
  private bucket once in the Supabase dashboard. Policy is configurable via
  settings `identity_document_required` and `identity_document_types`.
  Still pending: staff "verify identity" action wired into the admin customer/
  booking UI (`verifyIdentityDocument` service exists), and enforcement of
  `hasValidIdDocument()` at check-out time.
- Storefront search/filter/sort (§10, §44, §45) is live on `/rent`: debounced text
  search across name/description/category/spec values, category chips, daily-price
  bands, a "no deposit" filter and sort (featured/price/name) — all filtering the
  server-loaded catalog in-memory (single fetch, no redundant queries). Gallery +
  specs (§11) are live on `/rent/[slug]` — thumbnail gallery over `products.gallery`
  and a structured spec table from `products.specs`. Still pending: delivery form (§15).
- CMS (§42) is live in two admin screens:
  - `/admin/settings` — company profile (business name, **managed logo upload** to
    `/public/uploads/site/` via the storage provider + logo URL fallback, address,
    email, phone, WhatsApp, Instagram, Maps, footer tagline) applied to the storefront
    shell (header brand/logo, footer contact + socials, floating WhatsApp number).
  - `/admin/content` — content CMS: homepage hero (headline/kicker/sub), FAQ
    (add/edit/hide/delete) and testimonials (add/edit/hide/delete/rating), all stored as
    structured data (`cms_pages.sections` JSONB + `faq`/`testimonials` tables) and
    rendered on the home page. Every write is staff-gated (§54) and audit-logged (§63).
  The admin console uses a sticky multi-level sidebar (`components/admin/admin-sidebar.tsx`,
  §43): Overview + collapsible Catalog / Customers / Operations / Site groups, active-page
  highlighting, rendered from the shared admin layout.
  Storefront and admin routes ship loading skeletons (§67). Still pending: i18n (§9),
  cms_pages SEO-metadata editing, and a real scheduler for `/api/cron/overdue`.
- Maintenance & damage ops (§7–9) are live at `/admin/maintenance`: schedule/complete
  maintenance jobs (return device to available on completion) and report/resolve
  damage (writing a `damage_charges` line item when a charge is set). Completing a
  maintenance cost field and per-charge amount entry are still streamlined.
- Booking status automation runs on dashboard load + cron endpoint; a real scheduler
  (e.g. Vercel Cron hitting `/api/cron/overdue`) should be configured in deployment.
- No automated tests yet — the availability/pricing engines are pure enough to
  unit test first.
