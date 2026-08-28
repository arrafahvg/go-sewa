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

Customers book **without an account** — sign-in is for staff only. On the very
first run (no staff user in the database), `/sign-in` offers a one-time
**owner bootstrap**: create the first owner account there and the offer closes
automatically. Additional staff accounts are inserted into the `"user"` table
(role `owner` / `admin` / `staff`) — e.g.:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'colleague@example.com';
```

Roles: `owner` (full), `admin`, `staff` (bookings/handover). Staff see an
"Admin" shortcut chip on the storefront header while signed in; customers never
do. The owner creates additional staff accounts and changes roles in the
console at **`/admin/settings/users`** (no SQL needed).

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

The walk-in "New rental" customer field uses a dedicated `CustomerPicker`
component (§19B step 1) with two separated modes: **Existing customer** — a
searchable list that auto-fills name, phone and email and reuses the picked
customer id — or **New customer** with blank inline fields. The booking service
then reuses the exact customer record or creates a new one in the same
transaction.

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
| `/admin/invoices`, `/admin/agreements` | Booking-driven + manual invoice/agreement lists |
| `/admin/settings/account` | Staff account settings (email, password, sessions) |
| `/admin/settings/users` | Staff account management (owner-only: create accounts, change roles) |
| `/sign-in` | Staff-only auth (+ first-run owner bootstrap) |

## Known limitations / next steps

- **i18n (§9)**: ID/EN dictionaries (`lib/i18n/`) drive the full customer-facing
  surface — storefront shell, home, `/rent` list, `/rent/[slug]` and the checkout
  flow — with an ID/EN switcher in the header. The admin console remains English
  (staff tool); the staff account-settings panel is localized too.
- **Tests**: Vitest suite (`npm test`) — 29 unit tests (money, dates/ranges,
  tracking provider contract) plus DB integration tests for the overdue
  automation and the availability engine / booking conflict prevention
  (`tests/integration/*.test.ts`). Integration tests run automatically when
  `TEST_DATABASE_URL` points at a disposable database with the schema applied
  and are skipped otherwise.
- **Category management (§5/§42)**: admin manages categories at
  `/admin/content/categories` — create/edit (ID + EN names), sort order,
  activate/hide, delete (blocked while products reference it), and a
  **"Show in navbar"** flag per category. The storefront navbar renders the
  flagged categories dynamically (localized names); with none flagged it shows
  only Home/Rent. The product form has a **category picker with an inline
  "create new category" option** (ID/EN names; the category is created when the
  product is saved), and the category manager lets staff **assign existing
  products to a newly created category** in the same step (recorded in the
  audit log). Navbar visibility and storefront status use explicit dropdowns:
  **Show in navbar / Hidden from navbar** and **Active (visible on /rent) /
  Inactive (hidden from storefront)**. Seed data flags all five demo categories
  for the navbar. Migration `0009` adds `categories.show_in_nav`.
- **SEO basics**: `app/sitemap.ts` emits static routes + every active, indexable
  product page; `app/robots.ts` allows the storefront and disallows
  `/admin`, `/api`, `/d` and `/account`. Per-product OG/Twitter metadata is now generated per rental page
- **Tracking (§41)**: provider abstraction + schema + admin enrollment UI are
  live; no real provider is connected yet, so every surface honestly reports
  "Tracking integration not configured" and no location data is collected.
  Connect one by implementing `TrackingProvider` in
  `lib/services/tracking/provider.ts`.
- **Cron (§17)**: overdue sweep is scheduled three ways — Vercel Cron
  (`vercel.json` → hourly `/api/cron/overdue`), an optional in-process scheduler
  (`ENABLE_INTERNAL_CRON=1`, 15-min interval via `instrumentation.ts`), and an
  opportunistic sweep on admin dashboard load. Staff receive notifications when
  rentals flip to overdue.
- Account management lives only in the admin console at `/admin/settings/account`
  (change email, change password, session management) — staff-only. Customers do
  not log in: booking is fully account-less (name + WhatsApp + ID document at
  checkout), so `/account/*` and public sign-up were removed. The legacy
  `customers.user_id` link column remains in the schema but is unused.
- Document templates (`/admin/templates`) are kind-aware: the agreement editor
  offers title/intro/terms/footer/signature; the invoice editor exposes only the
  intro line and footer note — because invoices render from a fixed structured
  layout fed by immutable booking snapshots (§58). The invoice preview mirrors
  the real document instead of showing agreement content.
- Admin CRM/CRM screens are live at `/admin/customers` (customer profiles + their
  rental history) and `/admin/leads` (create, filter by status, convert to a
  customer). Every customer in the list opens a detail page at
  `/admin/customers/[id]` (spec §31B): lifetime stats, ID-document viewer via
  short-lived signed URLs, per-booking invoice/agreement deep links, WhatsApp
  quick-contact, and staff-only inline editing of contact details (audited).
   The detail page also renders the §32 customer activity timeline built from
   audit-log entries.
  Booking detail `/admin/bookings/[id]` includes handover + deposit
  & payment recording. Product/device/pricing CRUD UI is built at
  `/admin/inventory`.
- Invoice generation is live: booking detail → "Generate invoice", printable
  document at `/admin/invoices/[id]` (print-to-PDF), list at `/admin/invoices`.
  Manual **booking-less invoices** (§35) are also supported: on `/admin/invoices`
  use "New manual invoice" to issue a free-form, deposit-only or one-off document
  against an existing (or inline-created) customer. Line items are stored in
  `invoice_line_items` (new table, migration `0005`) and render on both the admin
  invoice page and the public `/d/[token]` share view.
- All money is formatted consistently through `formatMoney()` (stored minor-units
  "cents" → readable Rupiah) across the admin, storefront and public `/d/[token]`
  document views, so a shared invoice always shows the same amount as the admin page.
- Rental agreement generation is live: booking detail → "Generate agreement",
  printable/signature-ready document at `/admin/agreements/[id]`, merged from
  the active template + booking snapshot.
- Manual **booking-less rental agreements** (§21/§35) are also live: on
  `/admin/agreements` use "New manual agreement" to build an agreement from a
  customer + free-form equipment/terms lines (no linked rental). Lines are
  stored in `agreement_line_items` (new table, migration `0006`), the text is
  merged from the active template, and the draft is printable/signable/shareable
  exactly like a booking agreement. The Agreements page also lists all agreements.
- Document templates (§21B): staff edit agreement & invoice templates at
  `/admin/templates` (structured fields + live preview; saving bumps the
  version and can re-render existing draft agreements). Invoices and agreements
  support Print, real PDF download (jsPDF), and sharing via revocable public
  links `/d/[token]` to WhatsApp or email.
- Deposits & payments (§13, §16): lifecycle is live end-to-end. Services
  (`lib/services/deposits.ts`, `payments.ts`), server actions
  (`app/actions/deposits.ts`, `app/actions/payments.ts`) and the booking-detail
  panel (`components/admin/deposit-payment-panel.tsx`) record deposit
  held/returned/forfeited and payments (derived paid status). The per-product
  `deposit_required` flag (column added in
  `drizzle/0003_worried_madelyne_pryor.sql` — run `npm run db:push`) is now
  enforced at checkout: flagged products force an identity document upload.
  Seed data marks the iPhone 15 Pro as `deposit_required`.
- **Manual payment details (bank transfer / QRIS)** are live instead of an online
  payment gateway (deferred — an abstraction point for a gateway can be added later).
  Staff configure bank accounts (JSON setting `payment_bank_accounts`), a managed
  QRIS image (`payment_qris_image_url`) and optional instructions
  (`payment_instructions`) at `/admin/settings`. A shared block renders them on the
  admin invoice page and public `/d/[token]` share view — and therefore inside the
  printed/downloaded PDF automatically. The block is hidden entirely when nothing
  is configured; no hardcoded numbers anywhere (§73).
- **Per-invoice payment override**: when creating a manual invoice, staff can leave
  payment details on company defaults or override them — pick specific bank accounts,
  include/exclude the QRIS image, and write invoice-specific instructions. The client
  sends only selections (indexes/flags); actual account data is re-read from settings
  server-side (§6). Overrides are snapshotted on new nullable `invoices` columns
  (`payment_accounts`, `payment_qris_image_url`, `payment_instructions`, migration
  `0007`) so later settings edits never reinterpret old invoices; booking-generated
  invoices keep showing the global defaults. The override can also be edited (or
  reset to company settings) at any time from the invoice detail page via the
  "Payment details on this invoice" panel — audit-logged (`invoice_payment_details_updated`).
- Identity document (KTP/SIM) collateral upload is live: required at online
  checkout and walk-in creation, stored in a private Supabase Storage bucket
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ID_DOCS_BUCKET`),
  reviewed via short-lived signed URLs on the admin booking page. Create the
  private bucket once in the Supabase dashboard. Policy is configurable via
  settings `identity_document_required` and `identity_document_types`. Staff
  verify documents from the booking/customer screens; verification is enforced
  at check-out for deposit-required products (see "Ops gaps closed" below).
- Storefront search/filter/sort (§10, §44, §45) is live on `/rent`: debounced text
  search across name/description/category/spec values, category chips, daily-price
  bands, a "no deposit" filter and sort (featured/price/name) — all filtering the
  server-loaded catalog in-memory (single fetch, no redundant queries). Gallery +
  specs (§11) are live on `/rent/[slug]` — thumbnail gallery over `products.gallery`
  and a structured spec table from `products.specs`.
- Optional add-ons (§2C) are fully admin-manageable at `/admin/content/add-ons`
  (sidebar: Catalog → Add-ons): bilingual names, per-day or one-off per-rental
  pricing in Rupiah, **optional tracked stock** (blank = unlimited, like
  insurance/services), a live **"N held · M free"** availability readout, an
  Active/Inactive storefront dropdown, safe delete while unused, per-product
  attachment via Inventory → Edit product → Optional add-ons, **and an add-on-side
  "Attached products" editor** (click the product count on any add-on row to
  multi-select which products offer it — diffed so other add-ons are untouched).
  **Stock is live** (spec §2C/§70): tracked add-ons are reserved per booking via
  the new `booking_add_ons` ledger (migration `0011`), enforced server-side on
  every booking channel and on rental extensions, and shown honestly on the
  product page (disabled + "not available for your dates" when sold out, "Only X
  left" when low). All writes are staff-gated and audit-logged
  (`lib/services/addons.ts`).
- CMS (§42) is live in two admin screens:
  - `/admin/settings` — company profile (business name, **managed logo upload** to
    `/public/uploads/site/` via the storage provider + logo URL fallback, address,
    email, phone, WhatsApp, Instagram, Maps, footer tagline) applied to the storefront
    shell (header brand/logo, footer contact + socials, floating WhatsApp number).
  - `/admin/content` — content CMS: homepage hero (headline/kicker/sub), FAQ
    (add/edit/hide/delete) and testimonials (add/edit/hide/delete/rating), all stored as
    structured data (`cms_pages.sections` JSONB + `faq`/`testimonials` tables) and
    rendered on the home page. Every write is staff-gated (§54) and audit-logged (§63).
- **Managed product image upload** is live in /admin/inventory: the product form accepts a file (PNG/JPG/WebP/GIF, max 5 MB, validated server-side) which is stored via the storage provider to /public/uploads/products/, audit-logged (§63), previewed inline and persisted with the product on save. A manual URL can still be entered. Multi-image gallery management (products.gallery) is also live in the product form: add photos via upload (stored alongside main images, audit-logged §63), remove them inline; the storefront detail page renders the gallery (§11).
- **Storage provider & upload caps**: all public uploads (product image, gallery photos, logo) flow through the storage provider abstraction in lib/services/storage.ts. A Supabase Storage adapter is used automatically when SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are set — files land in the PUBLIC bucket named by SUPABASE_PUBLIC_BUCKET (default product-assets, create it once in the Supabase dashboard); without credentials it falls back to the local /public/uploads/ adapter (dev only — ephemeral on serverless hosts). Identity documents remain in their own PRIVATE bucket with signed URLs only. All image upload caps are now 50 MB (product images/gallery, logo, KTP/SIM collateral), enabled by experimental.serverActions.bodySizeLimit=75mb in next.config.mjs (base64 payload ~1.37x).
  The admin console uses a sticky multi-level sidebar (`components/admin/admin-shell.tsx`,
  §43): Overview plus collapsible Catalog / Customers / Operations / Site groups, with
  active-page highlighting, a collapse-to-icon-rail toggle (preference persisted in
  localStorage, hover flyouts keep groups navigable when collapsed), a dark gradient
  design, and an off-canvas drawer + top bar on mobile.
- Checkout delivery (§15) is live: pickup/delivery toggle; choosing delivery reveals
  address, recipient name/phone and notes fields, validates them server-side via the
  booking service, applies the configurable `delivery_fee_cents` per booking (shown in
  the price breakdown) and records fulfillment + return method on the booking.
  Storefront and admin routes ship loading skeletons (§67).
- Admin-reviewed pricing (§15, newly documented in the spec): online orders notify all
  staff in-app via the `notifications` table; while a booking is `pending` /
  `awaiting_confirmation` an **Adjust pricing** panel on `/admin/bookings/[id]` lets
  staff set the final delivery fee and per-line prices (server-recomputed totals,
  audit-logged); amounts freeze after confirmation. Checkout copy states the total is
  indicative until confirmation.
- Ops gaps closed: `hasValidIdDocument()` is now enforced at check-out for
  deposit-required products, and damage resolution supports per-report charge amount,
  note and optional deposit forfeiture (records `damage_charges` + a `forfeited`
  transaction). Staff identity verification was already wired in the documents panel.
- Maintenance & damage ops (§7–9) are live at `/admin/maintenance`: schedule/complete
  maintenance jobs (return device to available on completion) and report/resolve
  damage (writing a `damage_charges` line item when a charge is set). Completing a
  maintenance cost field and per-charge amount entry are still streamlined.
- Booking status automation runs on dashboard load + cron endpoint; a real scheduler
  (e.g. Vercel Cron hitting `/api/cron/overdue`) should be configured in deployment.
- No automated tests yet — the availability/pricing engines are pure enough to
  unit test first.

## Known limitations / open feedback (tracked)

User-reported items, tracked here until fixed:

1. **Admin pages have too much white/blank space on wide screens.** Every page
   under `/admin` used its own narrow, centered `max-w-*` container next to the
   fixed sidebar, leaving large empty gutters. → Being addressed by a dynamic,
   fluid admin layout (data tables/lists now use the full available width;
   only document/form pages keep a readable medium column).
2. **Storefront homepage hero had no image and no way for the admin to set
   one.** The hero CMS block was text-only. → Hero image support added: admins
   can upload/replace/remove a hero image at `/admin/content`; until one is
   uploaded, the storefront renders a bundled placeholder image
   (`public/hero-placeholder.svg`) so the hero never looks unfinished. The
   placeholder is demo fallback content — replace it with real imagery via the
   admin UI.
3. **Picking an existing customer in the walk-in / manual invoice / manual
   agreement forms did not auto-fill their phone number, and the plain
   `<datalist>` selector rendered inconsistently across browsers.** → Fixed:
   all three forms now use a dedicated `CustomerPicker` component with two
   clearly separated modes — *Existing customer* (searchable list; picking one
   auto-fills name + phone + email and reuses that exact customer id) and
   *New customer* (blank fields). The walk-in form also passes the picked id to
   the identity-document upload so collateral attaches to the right record.
4. **Deposit/payment "Amount (Rp)" inputs were inconsistent with every other
   money input** (they defaulted to raw ×100 minor-unit values and stored typed
   Rupiah without conversion, risking 100× errors), and a deposit error message
   displayed amounts 100× too large. → Fixed: shared `rupiahToCents()` /
   `centsToRupiah()` helpers now enforce the single convention everywhere
   (staff types plain Rupiah → stored ×100 minor units → rendered as `Rp` via
   `formatMoney`). All money remains IDR/Rupiah end-to-end.
5. **`/rent` intermittently returned "This page couldn't load — a server error
   occurred"** (e.g. on `/?category=action-cameras` + React #441/#419 in the
   console), while the homepage worked. **Root cause + hardening (all landed):**
   - **Root cause (React #441)**: `app/rent/page.tsx` passed a **closure function**
     (`categoryName`) into the client component `RentExplorer`. Functions can't be
     serialized across the Server→Client component boundary unless they're
     `"use server"` actions, so Turbopack threw *"Functions cannot be passed
     directly to Client Components"* during the server render → #441 → #419.
     **Fixed**: the localized category name is now resolved server-side and passed
     as a plain `{ slug, name }` array; the function prop was removed.
   - **Query graph**: the catalogue render also ran ~1 + 2×N sequential DB queries
     per product (category + price lookup). `getCatalogProducts()` now runs exactly
     three parallel queries (products, categories, active daily rules) and joins in
     memory (§81).
   - **Pool configuration**: `lib/db/index.ts` used `new Pool({ max: 5 })` with no
     timeouts. It now uses `connectionTimeoutMillis`, `idleTimeoutMillis`,
     `allowExitOnIdle` and an `error` handler so it fails *fast* instead of
     hanging, and DB-backed catalog reads go through a bounded one-shot
     `dbRequest()` retry for transient connection blips.
   - **Error surface**: added `app/error.tsx` so any residual failure renders a
     calm, on-brand fallback with "Reload / Browse catalog" actions instead of the
     raw "Application error" page.
   The homepage hero "Browse cameras" shortcut was also removed — the single
   "Browse devices" CTA covers the storefront and the category sections/navbar
   buttons already deep-link into the catalogue.
6. **`/rent` (and the homepage) listed zero devices even though every product
   was active in admin.** The default "Any price" filter chip was defined as
   `{ key: 'any', max: -1 }`, and the filter treated any defined `max` as a real
   bound — so `dailyCents > -1` excluded literally everything. → The `any` band
   now carries no bounds and no longer filters.
7. **Registered devices could not be edited** (condition, serial/IMEI, color,
   storage, battery, notes, asset code, Active flag) — the devices table was
   read-only apart from the status changer. → Added a per-row **Edit** dialog
   (`components/admin/device-editor.tsx`) writing through the existing
   staff-gated, audit-logged `saveDeviceAction`; operational status stays in the
   guarded "Set status" control (§4/§56).
8. **Favicon 404s** (`icon.svg`, `icon-*-32x32.png`, `apple-icon.png`) and no way
   to change the browser icon. → Bundled `public/favicon.svg` is the default, the
   root layout renders it via `generateMetadata`, and staff can upload/replace or
   reset it at `/admin/settings` (`favicon_url` setting, audit-logged). Also added
   **"Not available"** badges: the catalogue now carries a per-product stock
   snapshot (`stock.freeNow`), so products with no units yet — or with every unit
   currently rented — stay listed but are clearly labelled instead of vanishing.
9. **Storefront category navigation did not update the filter** — clicking
   *Cameras* in the navbar from `/rent?category=smartphones` changed the URL but
   kept the old filter (the client island only seeded its state on first mount).
   → The explorer now re-seeds from the incoming `?category=` prop and mirrors
   chip clicks back into the URL (no server round-trip).
10. **A product could only belong to one category.** → Added a
   `product_categories` many-to-many table (migration `0010`): the existing
   `category_id` stays the **primary/display** category, and the product form
   gains an "Additional categories" picker. Storefront category filters match
   the primary *or* any additional category; `deleteCategory` refuses while
   either reference exists. Seed adds demo cross-assignments (GoPro/Insta360/
   DJI RS 3 also under *Cameras*).
11. **Accessibility pass** — closed: global visible `:focus-visible` ring, a
    skip-to-content link plus `#main-content` landmark, `aria-expanded` on the
    mobile menu & FAQ, `aria-controls` on FAQ items, `aria-pressed` on
    toggle-style controls (fulfillment picker, add-ons, gallery thumbs),
    `aria-live` announcement of catalogue result counts and the availability
    status box (`role="status"`), and `role="alert"` on checkout errors.
12. **Add-on management** — optional add-ons existed only in the schema/seed;
    staff could not create, price, rename, hide or attach them. → Added the
    add-ons service + actions (audit-logged) and `/admin/content/add-ons` UI,
    plus an "Optional add-ons" picker in the product form.
13. **Homepage hero was single-language** — the admin-editable hero copy rendered
    identically for ID and EN visitors. → Hero fields are now bilingual in the CMS
    (Indonesian defaults + optional English kicker/headline/sub/image-alt with
    graceful per-field fallback), edited at `/admin/content`.
14. **Rental extensions (§29) were not implemented** — staff had no way to extend
    a rental; the `booking_extensions` table sat unused. → Added the extension
    flow: the booking-detail page now has an "Rental extensions" panel where
    staff pick a new end date. The §6 availability engine re-checks the extra
    window (excluding this booking's own allocations); conflicting requests are
    refused with a customer-safe message ("already reserved for another
    booking…") and nothing is mutated. Approved extensions move `endsAt`, append
    the extra days × active daily rule to the booking total, record an audit
    entry, and keep an in-panel history (`lib/services/extensions.ts`).


