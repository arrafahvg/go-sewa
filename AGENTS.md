# AGENTS.md — Mandatory instructions for every AI agent working on this codebase

> **This file is the binding skill for this repository.** Read it fully before writing any
> code. The complete product specification lives in **[`docs/SPEC.md`](docs/SPEC.md)** and is
> the authoritative source of truth. Section numbers below (`§`) refer to it.

---

## 1. What this project is

**Go-Sewa** — a production-grade rental platform + rental operations system for
smartphones, action cameras, 360 cameras and creator gear in Bali.

It is **NOT**: a landing page, a generic e-commerce store, a simple booking form,
a Shopify clone, or a boilerplate admin dashboard.

Products are **rented for date ranges**, backed by **individually tracked physical
devices** with their own asset codes, serial numbers, IMEIs and lifecycle.

## 2. Non-negotiable rules

1. **No fake functionality (§80).** Every button must do what it says.
   Forbidden: "Check Availability" that doesn't query the engine; "Assign Device" that
   doesn't reserve an asset; "Generate Invoice" that shows an alert; invented GPS data;
   static-card CRM/CMS. If an integration is unavailable, build the abstraction and mark
   the integration point explicitly.
2. **Database is the single source of truth (§81).** No duplicated rental/pricing/
   availability state in components. Prices come from pricing rules, availability from
   devices + allocations, historical bookings from their stored snapshots.
3. **No hardcoded business data (§73).** Never hardcode prices, deposits, late fees,
   WhatsApp numbers, templates or translations. They live in DB tables / settings /
   locale files. Read them via `lib/services/settings.ts`.
4. **Server-side validation for critical logic (§6, §59).** Availability checks, conflict
   prevention and device assignment must never trust the client. Business logic belongs in
   `lib/services/*`, not inside UI components.
5. **No silent simplification (§79).** If something is hard: explain the limitation,
   implement the closest robust production solution, keep it extensible. Do not stub it.
6. **Individual physical devices, not stock counts (§3, §56).** A booking reserves
   specific assets via `booking_device_allocations`; availability derives from real units.
7. **Historical accuracy via snapshots (§58).** Booking items capture price rule, unit
   price, add-on cost, line total, product name at booking time. Changing today's price
   must never mutate old bookings.
8. **Walk-in = same pipeline (§19B).** Admin-created bookings go through the identical
   availability, pricing and conflict-prevention service as public checkout. Only the
   `channel` differs. Never create a second simplified path.
9. **Deposits are separate from rental fees (§13, §16).** Never collapse them into one total.
10. **Do not fake tracking (§11, Phase 11).** Tracking UI only renders when a real provider
    is connected.

## 3. Architecture map

| Layer | Location | Rule |
| --- | --- | --- |
| Schema | `lib/db/schema.ts` | Drizzle, normalized, enums, indexes, timestamps |
| Services | `lib/services/` | server-side business logic only |
| Query helpers | `lib/data/` | used by server components |
| API boundary | `app/actions/*.ts` | Server Actions; validate inputs, typed results |
| Storefront | `app/page.tsx`, `app/rent/*`, `app/checkout` | server components + client islands |
| Admin console | `app/admin`, `components/admin/` | reads/writes via services & actions |
| Shared utils | `lib/utils/`, `lib/cart.ts` | pure, client-safe |

**Never import `db` into a client component.** Client components talk to server actions.

### Key services
- `services/availability.ts` → date-range availability + free device ids (§6, §57)
- `services/pricing.ts` → rule-based pricing + quotes (§13, §14)
- `services/bookings.ts` → transactional creation with `SELECT ... FOR UPDATE` locks (§6)
- `services/devices.ts` → status transitions, maintenance, damage (§4)
- `services/settings.ts` → configurable business rules (§12, §18)

## 4. Domain rules cheat-sheet

- **Device statuses** (§4): available, reserved, rented, overdue, returning, inspection,
  maintenance, damaged, lost, retired, blocked.
  Unbookable by default: maintenance, damaged, lost, retired, blocked.
- **Booking statuses** (§17): draft … completed/cancelled/refunded. Walk-ins start at
  `confirmed`; online starts at `pending`.
- **Blocking statuses** that reserve stock: see `BLOCKING_BOOKING_STATUSES`
  (`availability.ts`), mirrored in `bookings.ts`.
- **Channels** (§19B): online | in_store | phone | whatsapp — always stored on bookings.
- **Money**: integer minor units ("cents" = Rp 1) in `*Cents` columns. Format with
  `formatMoney()` from `lib/utils/money.ts`.
- **Dates**: rentals are `[startsAt, endsAt)`; helpers in `lib/utils/dates.ts`.

## 5. Required UX standards

- Every important action has loading / success / error / empty states with the copy tone
  of §61. Never surface raw technical errors to customers.
- Availability copy (§70): "Available for your selected dates" / "Only 1 left…" /
  "Not available for your selected dates". Internal inventory jargon never reaches customers.
- Status is never color-only (§52) — always include the label text too.
- Mobile-first navigation and booking flow (§8); premium restrained style per §67.
- WhatsApp CTA is persistent, floating, contextually pre-filled, number from settings (§18).
- Bilingual ID/EN via locale files, not duplicated apps (§9) — when adding UI, put
  user-facing strings in the translation layer rather than inline literals.

## 6. Workflow for any change

1. State which spec sections the change touches.
2. Schema first if needed → regenerate migration (`npx drizzle-kit generate`).
3. Implement in services → expose via actions → wire UI last (§77: never UI-first).
4. Validate: `npx tsc --noEmit` must be clean, then `npm run build` must succeed.
5. Update seed data (`lib/db/seed.ts`) when adding entities so the demo stays alive (§74/§75).
6. **Documentation is part of done — no exceptions.** Every change MUST update all three
   (as applicable): `README.md` ("Known limitations / next steps"), `docs/SPEC.md`
   (only if a behavior or contract changed), and the §78 phase-status table in this file.
   A change without its docs update is INCOMPLETE — treat missing doc updates the same as
   a failing build. Do not merge/commit with stale limitations or a stale phase table.

### Commands

```bash
npm run dev          # dev server
npm run db:push      # apply schema to DB (drizzle-kit push)
npm run db:generate  # generate SQL migration files
npm run db:seed      # seed realistic Indonesian demo data
npx tsc --noEmit     # typecheck (must pass before finishing)
npm run build        # production build (must pass before finishing)
```

## 7. Implementation status vs phases (§78)

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: schema, auth, settings | ✅ done — incl. RBAC §54 (roles: owner/admin/staff/customer) |
| 2 | Products + physical devices + pricing rules | ✅ schema/services done; admin CRUD UI pending |
| 3 | Availability engine + conflict prevention | ✅ done |
| 4 | Storefront: home / rent / detail / cart | ✅ core done (search/filter/sort pending §10) |
| 5 | Checkout + confirmation + WhatsApp | ✅ done — multi-line cart checkout, confirmation, WhatsApp (delivery fields pending §15) |
| 6 | Admin CRM + check-out/check-in/inspection | ✅ CRM (customers + leads), walk-in form, booking detail (device assignment, check-out/in, inspection, deposit & payment recording) done. Per-product `deposit_required` flag editable in inventory AND enforced at checkout (forces ID document + deposit hold) |
| 7–9 | Invoices, agreements, deposits, maintenance ops | 🟡 invoices & agreements generation live; deposit/payment actions + UI live (`app/actions/deposits.ts`, `app/actions/payments.ts`, `components/admin/deposit-payment-panel.tsx`); maintenance + damage admin UI live (`/admin/maintenance`, `app/actions/maintenance.ts`, `lib/services/devices.ts` — schedule/complete jobs, report/resolve damage writing `damage_charges`). Damage-charge amount entry + deposit-forfeit wiring still pending |
| 10 | CMS admin | ⏳ schema + seed only |
| 11 | Tracking architecture | ⏳ schema-ready; never fake data (§80) |
| 12 | SEO / perf / a11y / tests / i18n | ⏳ pending (ID/EN i18n required §9) |

When continuing work, pick the highest-priority incomplete item above and follow §78.

## 8. Definition of done

A feature is done only when **all** hold:
- real data flows end-to-end through services (no mocks in committed code);
- edge cases from §76 are handled (no availability, conflicting ranges, empty cart,
  invalid dates);
- admin actions write audit logs (§63);
- `README.md`, `docs/SPEC.md` (if contracts changed) and the §78 phase table are updated
  to reflect reality;
- `npx tsc --noEmit` and `npm run build` both pass;
- nothing from §80's forbidden list exists anywhere in the repo;
- seed data still produces a living demo after your change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
