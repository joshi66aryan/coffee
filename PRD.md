# Product Requirements Document
## Beverage Procurement Platform — Phase 2: Digital Ordering

**Version:** 1.1  
**Date:** 2026-07-29  
**Status:** Finalized

---

## 1. Overview

This document defines the requirements for Phase 2 of the beverage procurement platform — a mobile-accessible web application that replaces the WhatsApp + spreadsheet system used in Phase 1. The app serves independent cafés in Kathmandu who need a faster, more reliable way to reorder supplies from vetted suppliers.

**The app is not a marketplace. It is an ordering tool for cafés that already have a relationship with the platform.**

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Migrate Phase 1 cafés to the app | 50 existing cafés onboarded within 4 weeks of launch |
| Grow active café base | 200 cafés placing orders via the app by end of Phase 2 |
| Sustain repeat ordering | Repeat-order rate ≥ 60% month-over-month |
| Remove founder from onboarding | A new café can complete signup and place first order without founder involvement |
| Reduce order processing time | Order placed → confirmed in under 5 minutes during business hours |

---

## 3. Users & Roles

### 3.1 Café User (Primary)
- A café owner or manager placing supply orders
- Typically ordering from a shared tablet or personal phone
- Wants speed above everything — not interested in learning new software
- May have inconsistent internet connectivity

### 3.2 Admin (Internal — You)
- Manages product catalog, pricing, and suppliers
- Confirms orders and updates delivery status
- Views all orders, payments, and café activity
- This is the operator role during Phase 2 — suppliers do not have self-serve access yet (that is Phase 3)

> **Note:** There is no supplier-facing portal in Phase 2. Admin manually manages the catalog and relays orders to suppliers via existing channels (WhatsApp/phone). This changes in Phase 3.

---

## 4. Features In Scope

### 4.1 Café Onboarding
- Signup via phone number + OTP (no email/password friction)
- Café profile: name, neighborhood, contact name, delivery address
- After signup, account is pending until admin approves (prevents random signups)
- Admin can also pre-create a café account and send them a magic link to activate

### 4.2 Product Catalog (Browse & Order)
- Admin-managed catalog — cafés cannot edit products
- Initial SKUs: coffee beans (2–3 variants), sugar sachets, syrups (2–3 flavors), chocolate powder
- Each product shows: name, unit (kg / pack / bottle), price per unit (café-specific), available stock status (In Stock / Low / Out of Stock)
- **Pricing is per-café** — admin can set a custom price per product per café. If no custom price is set, the product's base price applies.
- Cafés can only order products marked In Stock
- Simple quantity selector — no complex cart needed, just a list with +/- per item

### 4.3 Repeat Last Order (Most Important Feature)
- Every café's home screen shows a single prominent button: **"Repeat Last Order"**
- Tapping it loads the exact previous order into a review screen
- Café can adjust quantities before confirming
- If any item from the last order is now out of stock, it is flagged clearly with a substitute suggestion or removal option
- This single feature should handle 70%+ of all orders once cafés are in the habit

### 4.4 Order Placement & Confirmation
- Order review screen shows: items, quantities, unit prices, total
- One-tap confirm to place order
- Immediate confirmation screen with order ID and delivery window: **next day, 5–6 PM**
- Orders placed after a daily cutoff time (to be set by admin — recommended: 6 PM) are scheduled for delivery the day after next
- Admin receives a push notification for every new order placed

### 4.5 Order Status Tracking
- Four statuses, in order:
  1. **Received** — order placed, admin has been notified
  2. **Confirmed** — admin has confirmed the order with the supplier
  3. **Out for Delivery** — rider has picked up
  4. **Delivered** — order completed
- Status is visible on the café's order detail screen
- Push notification sent to café on each status change
- Cafés can view current and past orders

### 4.6 Digital Invoice
- Auto-generated and **stored in Supabase Storage once** at the moment of order confirmation
- Contents: order ID, date, café name, itemized list (product, qty, unit price, line total), grand total, payment status
- Viewable in-app and downloadable via a permanent PDF link — no regeneration on each download
- Invoice number follows a simple sequential format: `INV-001`, `INV-002`, etc.
- PDF is available within 30 seconds of order confirmation

### 4.7 Payment Status Tracking
- Three states per order: **Paid** / **Pending** / **Credit (Due)**
- Each order is clearly labeled with its payment type: **Cash** or **Credit** — visible to both the café and admin
- Admin manually marks payment status — no payment gateway in Phase 2
- Cafés can see their own payment status per order
- **Outstanding bills summary**: café home screen shows a count of unpaid bills (e.g., "You have 2 outstanding bills") and the total amount owed across all unpaid orders
- Tapping the summary navigates to a filtered order list showing only unpaid/credit orders
- Admin dashboard shows all unpaid/credit orders at a glance
- Credit is only available for cafés with 3+ completed orders (enforced by admin manually at this stage)

### 4.8 Admin Dashboard
- Order queue: all active orders sorted by time placed, with status controls
- Café list: name, last order date, total orders, outstanding balance
- Product catalog management: add / edit / remove products, update stock status, set base price
- **Per-café pricing management**: set a custom price per product for any specific café; overrides base price for that café only
- Basic order history with filters (by café, by date range, by status)
- Mark payment as paid / pending / credit
- Credit eligibility flag: system shows a badge when a café has 3+ completed orders (admin manually grants credit)

---

## 5. Out of Scope for Phase 2

These are explicitly deferred. Do not build them now.

| Feature | When |
|---------|------|
| Supplier-facing portal | Phase 3 |
| Inventory forecasting / low-stock alerts | Phase 4 / 8 |
| Multi-supplier routing | Phase 5 |
| Online payment gateway (eSewa, Khalti) | Phase 3 or 4 |
| Loyalty / rewards program | Not planned |
| POS / accounting integration | Phase 7 |
| AI features of any kind | Phase 8 |
| Native iOS / Android app | Not planned until Phase 5+ |
| WhatsApp bot / integration | Phase 7 |
| Multi-city / multi-warehouse | Phase 10 |

---

## 6. User Stories

### Café User

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| U1 | As a café manager, I want to sign up with my phone number so I don't need to remember a password | OTP sent within 10 seconds; account activated after admin approval |
| U2 | As a café manager, I want to repeat my last order in one tap so ordering takes under 30 seconds | "Repeat Last Order" button visible on home screen; tapping it loads a pre-filled review screen |
| U3 | As a café manager, I want to browse all available products and build a custom order | Product list loads in under 2 seconds; quantity can be set to 0 to exclude items |
| U4 | As a café manager, I want to know when my order is out for delivery | Push notification sent when status changes to "Out for Delivery" |
| U5 | As a café manager, I want to download my invoice as a PDF | PDF available on order detail screen within 30 seconds of order confirmation |
| U6 | As a café manager, I want to see how much I owe | Payment status visible per order on my order history screen |
| U8 | As a café manager, I want to see how many unpaid bills I have at a glance | Home screen shows outstanding bill count and total amount owed; tapping it shows the unpaid orders list |
| U9 | As a café manager, I want to know if each order is cash or credit | Every order (in list and detail view) is clearly labeled Cash or Credit |
| U7 | As a café manager, I want the app to work on my phone browser without installing anything | App functions as a PWA; installable but not required |

### Admin

| # | Story | Acceptance Criteria |
|---|-------|---------------------|
| A1 | As admin, I want to see all new orders immediately | New order notification within 60 seconds of placement; appears at top of order queue |
| A2 | As admin, I want to update order status with one tap | Status update reflected in café's app within 30 seconds |
| A3 | As admin, I want to update product stock status quickly | Stock status change propagates to café catalog immediately |
| A4 | As admin, I want to see which cafés have outstanding balances | Payment dashboard shows all credit/pending orders sorted by age |
| A5 | As admin, I want to approve new café signups | Pending signups list with approve / reject action |
| A6 | As admin, I want to pre-create café accounts | Admin can create a café account and share an activation link |
| A7 | As admin, I want to set a custom product price for a specific café | Per-café price overrides base price for that café only; other cafés unaffected |
| A8 | As admin, I want to see which cafés are eligible for credit | System badges cafés with 3+ completed orders; admin toggles credit on their profile |

---

## 7. UX & Design Requirements

- **Mobile-first.** All café-facing screens must be fully usable on a 375px wide screen (iPhone SE size). Admin dashboard can be tablet/desktop optimized.
- **Minimum tap targets.** All interactive elements minimum 44×44px.
- **Nepali language support.** UI labels should support both English and Nepali. English is default for v1; Nepali toggle is a near-term follow-up.
- **Offline awareness.** If a café user loses connectivity mid-order, show a clear error and preserve their cart. Do not silently fail.
- **Low-data mode consideration.** Product images are optional. Text-first UI. No heavy animations.
- **Speed above aesthetics.** The repeat-order flow must complete in under 3 taps and under 30 seconds on a 4G connection.

---

## 8. Technical Specification

### 8.1 Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 15 (App Router) | PWA support, SSR for fast first load, single codebase for café + admin |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first, fast to build, consistent components |
| Backend | Next.js API Routes | Keeps infra simple at this stage |
| Database | PostgreSQL via Supabase | Relational, managed, free tier covers Phase 2 volume |
| Auth | Supabase Auth (phone OTP) | Built-in OTP, role-based access, no extra service |
| File Storage | Supabase Storage | PDF invoice storage |
| Push Notifications | Web Push API + Supabase Edge Functions | Native push without a native app |
| PDF Generation | `@react-pdf/renderer` or `puppeteer` | Invoice PDF generation server-side |
| Hosting | Vercel | Free tier, automatic deploys from git, global CDN |
| PWA | `next-pwa` | Installable on home screen, offline shell |

### 8.2 Data Models (Simplified)

```
Cafe
  id, name, contact_name, phone, neighborhood, delivery_address,
  status (pending/active), credit_enabled (bool), created_at

Product
  id, name, category, unit, base_price, stock_status (in_stock/low/out_of_stock),
  description, created_at

CafeProductPrice                          -- per-café pricing override
  id, cafe_id, product_id, custom_price, created_at
  (unique on cafe_id + product_id)
  -- if a row exists, café sees custom_price; otherwise falls back to Product.base_price

Order
  id, cafe_id, status (received/confirmed/out_for_delivery/delivered),
  total_amount, payment_type (cash/credit), payment_status (paid/pending/due),
  invoice_number, delivery_date, created_at, updated_at

OrderItem
  id, order_id, product_id, quantity, unit_price_at_time_of_order
  -- unit_price_at_time_of_order locks in whatever price the café saw at checkout

Invoice
  id, order_id, invoice_number, pdf_url, generated_at
```

### 8.3 Auth & Roles

| Role | Access |
|------|--------|
| `cafe` | Own orders, own invoices, product catalog (read-only) |
| `admin` | All orders, all cafés, product catalog (full CRUD), payment management |

### 8.4 Environments

| Environment | Purpose |
|-------------|---------|
| `local` | Development |
| `staging` | Internal testing before rollout |
| `production` | Live |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load (first contentful paint) | < 2 seconds on 4G |
| Order confirmation latency | < 5 seconds end-to-end |
| Uptime | 99.5% (Vercel + Supabase SLA covers this) |
| Data retention | All orders kept indefinitely — needed for Phase 8 (AI forecasting) |
| Security | HTTPS only; phone OTP auth; no plain-text passwords; row-level security (RLS) on all Supabase tables |
| GDPR / Privacy | Not applicable for Nepal in Phase 2; revisit at Phase 10.4 (South Asia expansion) |

---

## 10. Screens (Page List)

### Café App
| Screen | Description |
|--------|-------------|
| `/login` | Phone number entry + OTP verification |
| `/pending` | "Your account is pending approval" holding screen |
| `/` (home) | Repeat Last Order button + quick nav to catalog and orders |
| `/catalog` | Full product list with quantity selectors |
| `/order/review` | Order review before confirmation — editable |
| `/order/confirm` | Order placed confirmation with ID and ETA |
| `/orders` | Order history list |
| `/orders/[id]` | Order detail: status timeline, items, invoice download |
| `/profile` | Café name, address, contact — editable |

### Admin Dashboard
| Screen | Description |
|--------|-------------|
| `/admin` | Order queue — all active orders |
| `/admin/orders/[id]` | Order detail with status update controls |
| `/admin/cafes` | Café list with approval queue |
| `/admin/cafes/[id]` | Café detail: orders, balance, contact info, per-café pricing, credit toggle |
| `/admin/products` | Product catalog management (base prices) |
| `/admin/products/new` | Add product form |
| `/admin/payments` | All orders with payment status filters |

---

## 11. Phased Rollout Plan

| Week | Milestone |
|------|-----------|
| 1–2 | Project setup, auth (phone OTP), café signup, admin approval flow |
| 3–4 | Product catalog (admin CRUD + café read), basic order placement |
| 5 | Repeat last order feature, order status tracking |
| 6 | Digital invoice generation (PDF), payment status tracking |
| 7 | Push notifications (status changes + new order alerts for admin) |
| 8 | PWA setup, testing on real devices, soft launch to 10 pilot cafés |
| 9–10 | Bug fixes from pilot, parallel WhatsApp fallback maintained |
| 11–12 | Full migration push to all 50 Phase 1 cafés, onboarding new cafés to hit 200 |

---

## 12. Resolved Decisions

All open questions are resolved. No blockers to development.

| # | Question | Decision |
|---|----------|----------|
| Q1 | Delivery time slots | Next-day delivery, **5–6 PM window**. Orders placed after daily cutoff deliver the day after next. |
| Q2 | Credit eligibility | **3+ completed orders** — system badges eligible cafés, admin manually toggles credit on their profile. |
| Q3 | Admin app location | **`/admin` route on the same deployment** — role-based access via Supabase RLS. |
| Q4 | PDF invoice handling | **Generated once on order confirmation, stored in Supabase Storage.** Permanent download link, no regeneration. |
| Q5 | Catalog pricing | **Per-café pricing** — `CafeProductPrice` table overrides base price for specific cafés. Falls back to `Product.base_price` if no override exists. |

---

*This PRD covers Phase 2 only. Phase 3 (supplier portal), Phase 4 (recurring orders), and beyond are separate documents.*
