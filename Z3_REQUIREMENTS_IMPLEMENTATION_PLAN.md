# Z3 Requirements Implementation Plan

This document maps the requested Z3 shop, checkout, subscription, account, learning, admin, payout, DHL, and authentication work into clear implementation steps. It is intended to be used as a working checklist so each requirement can be solved in dependency order instead of as disconnected UI changes.

## 1. Target Subscription Page

The provided reference image shows a focused three-column subscription selector for Z3 learning packages.

### Visual Structure

- Page title: `Wähle dein Z3 Lernpaket`
- Subtitle: `Drei Optionen für deine Z3 Vorbereitung.`
- Desktop layout: three equal pricing cards in one row.
- Tablet layout: two cards in the first row and one below, or a horizontal-scroll/card grid if space is tight.
- Mobile layout: one card per row.
- Middle card, `Z3 Struktur`, is visually highlighted and marked as popular with a `Beliebt` pill.
- Cards use a clean white background, light border, subtle shadow, compact spacing, and strong blue/teal CTAs.

### Package Definitions

| Package | Subtitle | Monthly Price | Alternative Price | Highlight | CTA |
| --- | --- | ---: | --- | --- | --- |
| Z3 Start | Für selbstständiges Lernen | 19 EUR / Monat | oder 89 EUR bis zur Prüfung | No | Z3 Start wählen |
| Z3 Struktur | Mit individuellem Lernplan | 39 EUR / Monat | oder 169 EUR bis zur Prüfung | Popular | Z3 Struktur wählen |
| Z3 Prüfungstrainer | Für intensive Wiederholung | 59 EUR / Monat | oder 299 EUR bis zur Prüfung | No | Prüfungstrainer wählen |

### Package Features

`Z3 Start`

- Zugriff auf alle Lerninhalte
- Themen nach Fachgebieten sortiert
- Zusammenfassungen & Merksätze
- High-Yield-Markierungen

`Z3 Struktur`

- Alles aus Z3 Start
- Personalisierter Lernplan
- Tages- und Wochenziele
- Wiederholungs- & Puffer-Tage
- Fortschrittsanzeige

`Z3 Prüfungstrainer`

- Alles aus Z3 Struktur
- Priorisierte Wiederholungsthemen
- Vertiefende High-Yield-Lernseiten
- Wiederholungsübersicht
- Prüfungsnahe Inhaltsstruktur

Out of scope by user decision: cross-questions, answer explanations, mistake analysis or weakness tracking, and exam simulation are not to be implemented.

### Required CTA Behavior

Each CTA must start the correct subscription checkout flow:

- `Z3 Start wählen` starts checkout for the `z3-start` package.
- `Z3 Struktur wählen` starts checkout for the `z3-struktur` package.
- `Prüfungstrainer wählen` remains visible but disabled while the package is not being sold; direct checkout API calls for `z3-pruefungstrainer` must return a blocked response.

The checkout flow must create a Stripe subscription checkout session. After successful payment, Stripe webhooks must activate the correct subscription permission server-side.

## 2. Current Code Map

The current repository is split into a Vite React frontend and a Node/Express API backed by PocketBase.

### Frontend Areas

| Area | Main Files |
| --- | --- |
| App routes | `apps/web/src/App.jsx` |
| Header/navigation | `apps/web/src/components/Header.jsx` |
| Translations | `apps/web/src/lib/translations.js` |
| Cart | `apps/web/src/pages/CartPage.jsx` |
| Checkout/Kasse | `apps/web/src/pages/CheckoutPage.jsx` |
| Cart state | `apps/web/src/contexts/CartContext.jsx` |
| Auth state | `apps/web/src/contexts/AuthContext.jsx` |
| Login/register | `apps/web/src/pages/AuthPage.jsx` |
| Profile | `apps/web/src/pages/ProfilePage.jsx` |
| Buyer orders | `apps/web/src/pages/MyOrdersPage.jsx` |
| Seller sales/revenue | seller dashboard pages under `apps/web/src/pages/` |
| Learning landing/packages/checkout | `LearningLandingPage.jsx`, `LearningPackagePage.jsx`, `LearningCheckoutPage.jsx`, `LearningSubscriptionPage.jsx` |
| Learning dashboard/content | `LearningDashboardPage.jsx`, `LearningModulePage.jsx`, `LearningLessonPage.jsx` |
| Learning API client | `apps/web/src/lib/learningApi.js` |

### API Areas

| Area | Main Files |
| --- | --- |
| Checkout sessions | `apps/api/src/routes/checkout.js` |
| Stripe webhooks | `apps/api/src/routes/stripe-webhook.js` |
| Order creation | `apps/api/src/utils/orderHandler.js` |
| Stripe helpers | `apps/api/src/utils/stripeService.js` |
| Learning API | `apps/api/src/routes/learning.js` |
| Admin API | `apps/api/src/routes/admin.js` |
| Orders API | `apps/api/src/routes/orders.js` |
| Shop API | `apps/api/src/routes/shop.js` |
| Marketplace API | `apps/api/src/routes/marketplace.js` |
| Search API | `apps/api/src/routes/search.js` |
| DHL tracking/labels | `apps/api/src/routes/tracking.js`, `apps/api/src/routes/dhl-labels.js`, `apps/api/src/utils/dhlService.js` |
| Platform settings | `apps/api/src/utils/platformSettings.js` |
| Newsletter/email | `apps/api/src/routes/email.js` |

### Data Model Areas

PocketBase migrations live under `apps/api/pb_migrations/`.

The relevant existing collections include users, products, cart items, orders, seller earnings, learning packages, learning subscriptions, learning modules, learning lessons, invoices/events, and platform settings.

## 3. Dependency Overview

Some requirements can be implemented independently, but many depend on lower-level data and payment behavior.

### Foundation Dependencies

1. Stable routes and account navigation are needed before page redesigns can feel coherent.
2. Checkout legal checkbox data must be sent to the API before it can be persisted or validated server-side.
3. Stripe webhook confirmation must remain the only trusted source for paid order/subscription activation.
4. Z3 packages must exist in the database before the subscription page CTAs can be wired correctly.
5. Tier-based subscription access must exist before learning-plan and exam-trainer features can be protected correctly.
6. DHL delivered timestamps must be persisted before the two-day payout waiting period can work.
7. Seller balances and payout requests must be modeled before Stripe Connect payouts can be completed.

### Recommended Build Order

1. UI/navigation cleanup.
2. Checkout validation and payment hardening.
3. Z3 package data and subscription selector.
4. Subscription tier access control.
5. E-Learning content structure and learning search.
6. Learning plan and progress logic.
7. Admin-managed shop filters and product validation.
8. Order lifecycle, DHL delivery, waiting period, and payout availability.
9. Stripe Connect seller payouts.
10. Auth/login hardening.

## 4. Requirement Mapping

## 4.1 Design/UI Improvements

### Requirements

- Cart page redesign to match full website style.
- Checkout/KASSE page redesign.
- `Zahlungspflichtig bestellen` page/button redesign.
- AGB, Datenschutz, Newsletter checkbox integration inside order summary.
- Profile page background/layout alignment with `Meine Bestellungen`.
- Unified account area navigation: Profile, Orders, Sales, Revenue, Payouts, Subscriptions, E-Learning.
- Navigation text change: `Lernen` to `E-Learning`.
- Responsive design for desktop, tablet, mobile.

### Current State

- Cart and checkout pages already exist.
- Checkout has required AGB and Datenschutz checkboxes and optional newsletter checkbox, but they are not integrated into the order summary.
- Newsletter choice is not currently part of the checkout payload.
- Profile and orders pages use different background/layout patterns.
- Account navigation is spread across header/dropdown/page-specific links.
- `Lernen` exists in translation/navigation and should become `E-Learning`.

### Implementation Steps

1. Create a shared account layout component with a left/sidebar or top tab navigation depending on viewport.
2. Add account nav items:
   - Profile
   - Meine Bestellungen
   - Meine Verkäufe
   - Revenue
   - Payouts
   - Subscriptions
   - E-Learning
3. Update route labels and translations from `Lernen` to `E-Learning`.
4. Redesign cart cards with image, title, price, quantity, edit/delete, and subtotal.
5. Redesign checkout order summary so required legal checkboxes and optional newsletter checkbox live inside the summary area.
6. Align Profile page container, background, spacing, and card style with `Meine Bestellungen`.
7. Test desktop, tablet, and mobile breakpoints.

### Acceptance Criteria

- Cart, checkout, profile, and orders feel like one design system.
- Legal checkboxes are visible near the final order total and payment button.
- Newsletter checkbox is optional and not preselected.
- Account pages share the same navigation.
- `E-Learning` appears everywhere the top-level learning area is shown.

## 4.2 Cart & Checkout

### Requirements

- Cart product cards include image, title, price, quantity, edit/delete, subtotal.
- Order summary includes subtotal, shipping, fees/commission if needed, and total amount.
- Checkout button exists.
- Required checkbox validation before order submission.
- Newsletter checkbox optional and not pre-selected.
- Payment method works end-to-end.
- Server-side payment confirmation via webhook.
- Order creation after successful payment.
- Clear payment error messages.

### Current State

- Cart product card behavior mostly exists.
- Summary totals exist.
- Checkout creates a Stripe Checkout Session.
- Stripe webhook validates Stripe signatures and creates marketplace orders after payment.
- Client-side legal checkbox validation exists.
- Server-side legal checkbox validation is missing.
- Newsletter choice is not persisted from checkout.

### Implementation Steps

1. Keep the cart behavior but redesign the visual structure.
2. Send `acceptedTerms`, `acceptedPrivacy`, and `newsletterOptIn` in the checkout request.
3. Validate `acceptedTerms` and `acceptedPrivacy` in `apps/api/src/routes/checkout.js`.
4. Store legal acceptance in Stripe metadata and/or order records.
5. If `newsletterOptIn` is true, create a newsletter signup after successful checkout or payment confirmation.
6. Normalize payment error messages in the frontend:
   - validation error
   - payment session creation failed
   - payment cancelled
   - payment confirmation pending
   - technical error
7. Add regression tests or manual verification notes for paid order creation through webhook.

### Acceptance Criteria

- Checkout cannot start without required legal confirmation.
- The server rejects checkout requests without legal confirmation.
- Newsletter is never checked by default.
- Order is created only after Stripe confirms payment.
- Users receive useful payment errors instead of generic failures.

## 4.3 Subscription / Abo System

### Requirements

- `Abo starten` opens a three-column package selection page.
- Packages:
  - Z3 Start
  - Z3 Struktur
  - Z3 Prüfungstrainer
- `Z3 Struktur` is marked as popular.
- Package CTAs start the correct checkout/subscription flow.
- After payment, subscription access activates automatically.
- Subscription permission checks happen server-side.

### Current State

- Learning subscription checkout already exists.
- Stripe subscription webhook handling exists.
- Current seeded learning package appears to be a different package, not the requested Z3 package set.
- Server-side access checks exist but are package-based, not full tier/capability-based.

### Implementation Steps

1. Add or migrate the three Z3 packages in PocketBase:
   - `z3-start`
   - `z3-struktur`
   - `z3-pruefungstrainer`
2. Store price IDs for each package and billing option.
3. Build the subscription selector page based on the reference image.
4. Route `Abo starten` to the selector page.
5. Wire each CTA to the correct package checkout.
6. Ensure Stripe webhook maps subscription metadata back to the correct package/tier.
7. Add server-side tier permission checks.

### Acceptance Criteria

- The subscription page visually matches the provided three-card reference.
- `Z3 Struktur` has the popular badge and highlighted card treatment.
- Each CTA starts the correct Stripe subscription flow.
- A paid subscription automatically unlocks the correct server-side access.

## 4.4 Subscription Access Control

### Requirements

Access must be tiered:

| Role/Tier | Allowed Access |
| --- | --- |
| No subscription | Landing page, shop, subscription page, demo content only |
| Z3 Start | Full learning content, topic/subtopic navigation, direct links, search |
| Z3 Struktur | Everything from Z3 Start plus learning plan, goals, progress tracking, feedback |
| Z3 Prüfungstrainer | Everything from Z3 Struktur plus prioritized review topics, deep-dive High-Yield learning pages, review overview, and exam-oriented content structure |
| Admin | Manage learning content, shop products, filters, orders, commissions, payouts, users |

### Current State

- Authenticated learning access exists.
- Preview/demo lesson support exists.
- Access is not yet modeled as the requested tier hierarchy.

### Implementation Steps

1. Add a canonical tier enum:
   - `none`
   - `z3_start`
   - `z3_struktur`
   - `z3_pruefungstrainer`
   - `admin`
2. Map active Stripe subscriptions to one of these tiers.
3. Create API middleware/helper functions:
   - `requireLearningTier('z3_start')`
   - `requireLearningTier('z3_struktur')`
   - `requireLearningTier('z3_pruefungstrainer')`
   - `requireAdmin`
4. Apply checks to learning content, plan, and trainer endpoints.
5. Hide locked UI affordances on the frontend, but keep API checks authoritative.

### Acceptance Criteria

- Users cannot access higher-tier content by direct URL.
- Demo content remains available without a subscription.
- Admin can manage all protected areas.

## 4.5 E-Learning / Learnplace

### Requirements

- Central E-Learning area after login.
- Import all Road-to-Z3 learning modules.
- Learning content displayed as web learning pages, not just downloadable PDFs.
- Topic and subtopic structure.
- Each topic/subtopic has a direct URL.
- Search across modules, topics, subtopics, and content.
- Learning status per topic:
  - Open
  - Started
  - Completed
  - To repeat
  - Overdue
- Remove cover/meta text like `Made by` and `1. Auflage 2026` from learner-facing pages.

### Current State

- Learning dashboard and lesson pages exist.
- Lessons can show web text content and assets.
- Direct learning routes exist for modules/lessons.
- Road-to-Z3 content is not yet present as the requested Z3 module set.
- Search currently appears focused on products/shop, not learning content.
- Current learning statuses are simpler than requested.

### Implementation Steps

1. Define Road-to-Z3 import format.
2. Add module/topic/subtopic data model fields if missing.
3. Import modules and lessons into PocketBase.
4. Sanitize imported learner-facing content to remove cover/meta text.
5. Add direct URLs for:
   - package
   - module
   - topic
   - subtopic
   - lesson
6. Extend learning search to include module title, topic title, subtopic title, lesson title, and lesson body.
7. Add learning status model:
   - `open`
   - `started`
   - `completed`
   - `to_repeat`
   - `overdue`

### Acceptance Criteria

- Road-to-Z3 content is navigable as web pages.
- Search finds content across the learning hierarchy.
- Topic/subtopic URLs can be opened directly.
- Learners do not see PDF cover/meta text.

## 4.6 Learning Plan Feature

### Requirements

- Dashboard after login.
- Today's learning tasks.
- Direct links to assigned learning content.
- Daily progress.
- Weekly progress.
- Overall exam preparation progress.
- Missed content section: `Nacharbeiten`.
- Next-day preparation section: `Vorarbeiten`.
- `Weiterlernen` button.
- Flexible plan adjustment if user falls behind.
- Optional recalculation after long pause.
- Feedback messages:
  - You are on track
  - 2 topics still open
  - 1 day behind
  - Weekly goal reached

### Current State

- Learning dashboard exists.
- Progress tracking exists in a basic form.
- No full daily/weekly plan engine exists yet.

### Implementation Steps

1. Add learning plan collections:
   - plan
   - plan days
   - assigned topics/lessons
   - progress snapshots
2. Generate a plan from:
   - selected exam date
   - package tier
   - available weekdays
   - existing progress
3. Add dashboard sections:
   - Heute
   - Nacharbeiten
   - Vorarbeiten
   - Wochenfortschritt
   - Gesamtfortschritt
4. Add `Weiterlernen` to continue the next incomplete assignment.
5. Add recalculation rules:
   - minor delay: move missed content into `Nacharbeiten`
   - long pause: offer recalculation
   - completed early: unlock next-day preparation
6. Add feedback message calculation based on progress state.

### Acceptance Criteria

- Z3 Struktur and higher users see a useful learning dashboard.
- Behind/on-track/complete states are visible.
- Direct links take users to the correct learning page.
- Users who fall behind can continue without manually rebuilding their plan.

## 4.7 Shop / Marketplace Admin

### Requirements

Admin can manage shop filters:

- Create filters
- Rename filters
- Sort filters
- Deactivate filters
- Delete filters

Filter types:

- Dropdown
- Checkbox group
- Price range

Filter examples:

- Category
- Condition
- Price range
- Fachbereich
- Product type
- Location
- Shipping type
- Brand

Admin product management:

- Product list
- Search
- Filters
- Create product
- Edit product
- Delete product
- Disable product
- Approve product
- Validate seller products

Product fields:

- Title
- Description
- Price
- Images
- Category
- Condition
- Shipping
- Seller
- Status

### Current State

- Admin product management exists partially.
- Product approval/status management exists partially.
- Filters are mostly static in frontend/API logic.
- Product fields exist partially, but multiple images, shipping, location, brand, and dynamic filter fields need review.

### Implementation Steps

1. Add filter collections:
   - `shop_filters`
   - `shop_filter_options`
2. Add fields:
   - filter key
   - label
   - type
   - sort order
   - active flag
   - applies to product type
3. Update frontend filter UI to load filter definitions from API.
4. Update product create/edit forms to use active filter definitions.
5. Add admin filter management page.
6. Extend product schema for missing fields:
   - images
   - shipping type
   - location
   - brand
7. Add validation for seller-created products.

### Acceptance Criteria

- Admin can change filters without code changes.
- Disabled filters do not appear in the shop.
- Products can be searched, filtered, approved, disabled, edited, and deleted.

## 4.8 Order Validation

### Requirements

Order status logic:

- Paid
- Waiting for admin validation
- Validated
- Shipped
- DHL delivered
- 2-day waiting period
- Payout available
- Paid out
- Cancelled/refund

Admin can:

- Validate purchases/orders.
- View status and transaction details.
- Pause or cancel payment/order if there is an issue.

### Current State

- Orders currently use a smaller status set.
- Admin can update basic order statuses.
- Transaction/payment information exists but needs a clearer admin view.

### Implementation Steps

1. Extend order statuses:
   - `paid`
   - `waiting_admin_validation`
   - `validated`
   - `shipped`
   - `dhl_delivered`
   - `waiting_payout_release`
   - `payout_available`
   - `paid_out`
   - `cancelled`
   - `refunded`
2. Add transition rules so statuses cannot jump incorrectly.
3. Add admin order detail page with:
   - payment status
   - Stripe session/payment intent
   - DHL tracking
   - seller earning
   - payout state
   - buyer/seller details
4. Add admin actions:
   - validate order
   - pause order
   - cancel order
   - refund order
5. Log order status events for auditability.

### Acceptance Criteria

- Admin can see exactly where an order is in the lifecycle.
- Seller payout cannot become available before delivery and waiting-period completion.
- Cancel/refund states stop payout release.

## 4.9 Stripe Payment & Seller Payout

### Requirements

- Stripe checkout/payment integration.
- Stripe webhook validation.
- Seller revenue calculation:
  - sale price minus admin commission.
- Seller balance:
  - gross revenue
  - admin commission
  - net revenue
  - pending balance
  - available balance
  - payouts
- Seller payout request.
- Stripe Connect payout flow.
- Admin can define commission as percentage or fixed amount.
- Admin can manage payouts, conflicts, refunds, and blocked amounts.

### Current State

- Stripe checkout and webhook handling exist.
- Seller earnings are created.
- Commission calculation exists partially.
- Real Stripe Connect seller payout flow is missing.
- Seller payout request workflow is missing or incomplete.

### Implementation Steps

1. Add commission configuration:
   - percentage
   - fixed amount
   - optional minimum/maximum
2. Normalize seller earning calculations:
   - gross amount
   - commission amount
   - net amount
   - pending amount
   - available amount
3. Add payout request collection:
   - seller
   - amount
   - status
   - Stripe transfer/payout id
   - admin notes
4. Add Stripe Connect onboarding for sellers.
5. Store seller Stripe connected account id.
6. Add seller payout request UI.
7. Add admin payout management UI.
8. Execute transfers only after:
   - order delivered
   - two-day waiting period passed
   - no active conflict/refund
   - seller has a connected Stripe account
9. Handle refunds/disputes by blocking or reversing affected balances.

### Acceptance Criteria

- Seller balances are transparent.
- Available balance excludes pending, blocked, refunded, or disputed amounts.
- Payout requests can be reviewed and paid through Stripe Connect.

## 4.10 Buyer/Seller Account Area

### Requirements

Buyer can see `Meine Bestellungen`.

Buyer order details:

- Status
- Payment
- Shipping
- Tracking
- Invoice/order summary

Seller can see:

- Meine Verkäufe
- Revenue
- Pending balance
- Available balance
- Payout history
- Payout request action when balance is available

### Current State

- Buyer orders page exists.
- Seller pages exist partially.
- Account area is not unified.
- Payout history/request depends on payout model work.

### Implementation Steps

1. Build shared account layout/navigation.
2. Update buyer orders and order details to show all required sections.
3. Update seller sales page to include lifecycle status.
4. Add seller revenue page:
   - gross
   - commission
   - net
   - pending
   - available
5. Add seller payouts page:
   - request payout
   - payout history
   - payout status
6. Gate seller pages by seller permission.

### Acceptance Criteria

- Buyers and sellers use one coherent account area.
- Sellers can understand exactly when money is pending, available, requested, and paid.

## 4.11 DHL Delivery + Waiting Period

### Requirements

- Seller adds DHL tracking.
- DHL delivery confirmation.
- Two-day waiting period after delivery.
- If no conflict/refund occurs, seller balance becomes available.

### Current State

- DHL label/tracking lookup exists.
- Delivery confirmation is not yet a complete persisted lifecycle trigger.
- Seller earnings may become confirmed too early.

### Implementation Steps

1. Persist DHL tracking number on order.
2. Add fields:
   - delivered_at
   - payout_release_at
   - delivery_status_source
3. Poll or manually refresh DHL tracking status.
4. When DHL says delivered:
   - set order status `dhl_delivered`
   - set `delivered_at`
   - set `payout_release_at = delivered_at + 2 days`
   - keep seller earning pending
5. Add scheduled job or admin action to release eligible balances.
6. Block release if refund/conflict exists.

### Acceptance Criteria

- Delivered orders do not immediately release seller funds.
- Seller funds become available only after the two-day waiting period.
- Refund/conflict prevents release.

## 4.12 Login & Account

### Requirements

- Existing account login works.
- Check session handling.
- Check password hashing.
- Check email verification.
- Correct redirect after login:
  - Buyer -> Profile/Orders
  - Subscriber -> E-Learning Dashboard
  - Admin -> Admin Dashboard
- Clear login errors:
  - Wrong password
  - Account does not exist
  - Email not confirmed
  - Technical error
- Password reset flow works.

### Current State

- PocketBase login exists.
- Auth state is stored and refreshed through the frontend auth context.
- Login error messages are generic.
- Email verification and password reset UI need to be completed or verified.
- Role-based default redirect after login is incomplete.

### Implementation Steps

1. Audit PocketBase auth settings for:
   - password hashing
   - email verification
   - password reset email templates
2. Add frontend password reset request page.
3. Add frontend password reset confirmation page if needed.
4. Add email verification request/resend flow.
5. Improve login error mapping:
   - wrong password
   - account missing
   - email not confirmed
   - technical error
6. Add role/subscription-aware post-login redirect:
   - admin -> admin dashboard
   - active subscriber -> E-Learning dashboard
   - seller -> seller account area
   - buyer -> profile/orders
7. Ensure protected routes preserve intended destination when applicable.

### Acceptance Criteria

- Existing users can log in reliably.
- Users understand why login failed.
- Reset and verification flows are available.
- Users land in the most relevant area after login.

## 5. Data Model Changes Needed

The exact PocketBase migration names should be created during implementation, but the expected model additions are:

| Area | Needed Data |
| --- | --- |
| Z3 packages | package slug, display name, tier, price ids, monthly/one-time pricing, feature list, popular flag |
| Tier access | canonical tier, feature flags/capabilities |
| Checkout legal | accepted terms, accepted privacy, newsletter opt-in, timestamps |
| Learning hierarchy | module, topic, subtopic, lesson direct slugs |
| Learning progress | topic status, lesson status, repeat/overdue markers |
| Learning plan | plan, plan day, assignments, recalculation state |
| Shop filters | filter definitions, options, type, sort order, active flag |
| Product fields | multiple images, shipping type, location, brand, dynamic filter values |
| Orders | expanded status, validation state, pause/cancel/refund fields, transaction refs |
| DHL | tracking number, delivered timestamp, release timestamp, delivery source |
| Seller earnings | pending, available, blocked, paid out, payout request id |
| Payouts | payout request status, Stripe Connect account, transfer/payout ids |
| Auth support | verification/reset UI routes and server settings |

## 6. API Changes Needed

### Checkout API

- Validate legal acceptance server-side.
- Store legal/newsletter metadata.
- Return clear error codes for frontend display.

### Stripe Webhook API

- Keep webhook signature validation.
- Keep order/subscription activation webhook-driven.
- Map subscription events to Z3 tiers.
- Prevent duplicate order/subscription creation.

### Learning API

- Add tier-aware access helpers.
- Add learning search.
- Add plan endpoints.
- Add progress/status endpoints for topics and subtopics.

### Admin API

- Add filter CRUD.
- Add order validation and lifecycle actions.
- Add payout management.
- Add commission configuration.

### Seller API

- Add payout request endpoints.
- Add revenue/balance summary endpoint.
- Add Stripe Connect onboarding endpoint.

### DHL API

- Persist delivery confirmation.
- Trigger waiting period calculation.
- Expose tracking and waiting-period state to buyer, seller, and admin.

## 7. Frontend Changes Needed

### Public Navigation

- Rename `Lernen` to `E-Learning`.
- Route `Abo starten` to the three-card subscription selector.

### Cart

- Product image/title/price/quantity/edit/delete/subtotal.
- Summary with subtotal, shipping, fee/commission, total.
- Responsive card layout.

### Checkout

- Shipping/customer form.
- Order summary.
- Required legal checkboxes inside summary.
- Optional newsletter checkbox not preselected.
- Clear error messages.
- `Zahlungspflichtig bestellen` final action.

### Subscription Selector

- Build the three-card layout from the reference image.
- Highlight `Z3 Struktur`.
- Connect CTAs to correct subscription checkout.

### Account Area

- Shared navigation.
- Profile.
- Orders.
- Sales.
- Revenue.
- Payouts.
- Subscriptions.
- E-Learning.

### E-Learning

- Dashboard.
- Content hierarchy.
- Search.
- Topic/subtopic direct pages.
- Learning plan.
- Practice/exam trainer for highest tier.

### Admin

- Product management.
- Filter management.
- Order validation.
- Commission settings.
- Payout management.
- Learning content management.

## 8. Testing And Verification Plan

### UI Verification

- Desktop: 1440px width.
- Tablet: 768px to 1024px width.
- Mobile: 360px to 430px width.
- Check cart, checkout, subscription selector, profile, orders, account nav.

### Checkout Verification

1. Try checkout without legal checkboxes.
2. Try checkout with newsletter unchecked.
3. Try checkout with newsletter checked.
4. Complete Stripe test payment.
5. Confirm order is created only after webhook.
6. Confirm cart clears after successful payment.

### Subscription Verification

1. Start each package checkout.
2. Confirm Stripe metadata contains the correct package slug/tier.
3. Complete test payment.
4. Confirm webhook activates subscription.
5. Confirm access matches the purchased tier.

### Learning Verification

1. No subscription sees demo content only.
2. Z3 Start sees learning content and search.
3. Z3 Struktur sees learning plan and progress.
4. Z3 Prüfungstrainer sees the additional review structure and High-Yield learning pages, not practice/exam tools.
5. Admin sees management areas.

### Marketplace/Payout Verification

1. Buyer purchases product.
2. Webhook creates order and seller earning.
3. Admin validates order.
4. Seller ships and adds DHL tracking.
5. DHL delivery is confirmed.
6. Two-day waiting period starts.
7. Balance becomes available only after waiting period.
8. Seller requests payout.
9. Admin approves or blocks payout.
10. Stripe Connect payout succeeds.

### Auth Verification

1. Wrong password shows correct error.
2. Unknown account shows correct error.
3. Unverified email shows correct error.
4. Password reset works.
5. Buyer, subscriber, seller, and admin redirect correctly after login.

## 9. Implementation Checklist

Use this checklist to work one section at a time.

- [x] Rename navigation from `Lernen` to `E-Learning`.
- [x] Create shared account layout/navigation.
- [x] Apply shared account navigation to Profile, Orders, Sales, Revenue, Payouts, Subscriptions, and E-Learning pages.
- [x] Add desktop/mobile E2E coverage for account navigation.
- [x] Redesign cart page.
- [x] Add desktop/mobile E2E coverage for cart cards, quantity changes, deletion, and checkout CTA.
- [x] Redesign checkout page and summary.
- [x] Redesign `Zahlungspflichtig bestellen` final action area.
- [x] Add desktop/mobile E2E coverage for checkout legal validation, newsletter opt-in, payload, and redirect.
- [x] Move legal/newsletter checkboxes into order summary.
- [x] Send legal/newsletter data to checkout API.
- [x] Validate legal acceptance server-side.
- [x] Persist or process newsletter opt-in.
- [x] Improve payment error messages.
- [x] Seed/create Z3 Start, Z3 Struktur, Z3 Prüfungstrainer packages.
- [x] Build three-card subscription selector page from the reference image.
- [x] Wire `Abo starten` to the selector page.
- [x] Wire package CTAs to correct checkout flow.
- [x] Map Stripe subscription webhook events to Z3 tiers.
- [x] Add tier-based server access checks.
- [x] Keep Z3 Prüfungstrainer visible but disable subscription checkout.
- [x] Import Road-to-Z3 modules.
- [x] Render imported content as web learning pages.
- [x] Add topic/subtopic direct URLs.
- [x] Add learning search.
- [x] Add topic status values.
- [x] Build learning plan data model.
- [x] Build dashboard plan sections.
- [x] Add plan recalculation/behind-state handling.
- [x] Add dynamic shop filter model.
- [ ] Build admin filter CRUD.
- [ ] Extend product fields.
- [ ] Add admin product validation workflow.
- [ ] Extend order statuses.
- [ ] Add admin order validation and pause/cancel/refund actions.
- [ ] Persist DHL delivery confirmation.
- [ ] Add two-day payout waiting period.
- [ ] Add seller balance model.
- [ ] Add seller payout request flow.
- [ ] Add Stripe Connect seller onboarding/payouts.
- [ ] Add admin payout/conflict/refund management.
- [ ] Improve login error mapping.
- [ ] Add password reset flow.
- [ ] Add email verification flow.
- [ ] Add role/subscription-aware redirects.

## 10. Risk Notes

- Do not activate orders or subscriptions from the frontend after redirect alone. Stripe webhook confirmation must remain authoritative.
- Do not rely only on hidden frontend UI for tier protection. API endpoints must enforce permissions.
- Do not release seller funds immediately when DHL marks delivered. The two-day waiting period is a business rule and must be persisted.
- Do not store or expose payment/DHL secrets in documentation, logs, or client code.
- Existing local environment files may contain sensitive keys. They should be treated as private and never copied into docs.

## 11. First Practical Milestone

The safest first milestone is:

1. Rename `Lernen` to `E-Learning`.
2. Build the three-card Z3 subscription selector page.
3. Seed/create the three Z3 package records.
4. Wire each CTA to the existing subscription checkout flow.
5. Confirm Stripe webhook activates access for the selected package.

This milestone creates the visible subscription entry point while reusing the existing payment and learning subscription foundation.
