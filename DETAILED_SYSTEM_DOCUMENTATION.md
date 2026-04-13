# Detailed System Documentation - Zahnibörse Marketplace

This document serves as the authoritative technical reference for the Zahnibörse Marketplace system, covering the database schema, API routes, frontend architecture, user roles, core workflows, and known issues.

---

## Table of Contents
1. [PocketBase Collections Schema](#1-pocketbase-collections-schema)
2. [Express.js API Routes](#2-expressjs-api-routes)
3. [React Pages](#3-react-pages)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Complete Purchase Workflow](#5-complete-purchase-workflow)
6. [Known Issues & Bugs](#6-known-issues--bugs)

---

## 1. PocketBase Collections Schema

The system uses PocketBase as its primary database and authentication provider. Below are the 13 core collections.

### 1.1 `users` (Auth Collection)
Manages authentication and user profiles for buyers, sellers, and admins.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key (15 chars) |
| `email` | email | Yes | User's email address (unique) |
| `password` | password | Yes | Hashed password |
| `name` | text | No | Full name |
| `avatar` | file | No | Profile image (jpg, png, gif, webp) |
| `university` | text | No | User's university |
| `is_seller` | bool | No | True if user is an approved seller |
| `is_admin` | bool | No | True if user is an administrator |
| `user_id` | text | Yes | Custom unique user identifier |
| `seller_username` | text | No | Unique username for seller profile |
| `is_deleted` | bool | No | Soft delete flag |

### 1.2 `products`
Marketplace products listed by sellers.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `product_type` | select | Yes | Article, Set, Consumable |
| `name` | text | Yes | Product title |
| `description` | text | No | Detailed description |
| `price` | number | Yes | Price in EUR |
| `image` | file | No | Product image |
| `condition` | select | Yes | Neu, Wie neu, Gut, Befriedigend |
| `fachbereich` | select | No | Paro, Kons, Pro, KFO (Multiple) |
| `seller_id` | text | Yes | Relation to `users.id` |
| `seller_username` | text | No | Denormalized seller username |
| `status` | select | No | draft, active, pending_verification, rejected, sold |
| `verification_status`| select | No | pending, approved, rejected |

### 1.3 `shop_products`
Official Zahnibörse products (B2C).
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `name` | text | Yes | Product title |
| `description` | text | No | Detailed description |
| `price` | number | Yes | Price in EUR |
| `image` | file | No | Product image |
| `condition` | select | No | Condition |
| `fachbereich` | select | No | Categories |

### 1.4 `cart_items`
Shopping cart items for users.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `user_id` | text | Yes | Relation to `users.id` |
| `product_id` | text | Yes | Relation to `products.id` or `shop_products.id` |
| `quantity` | number | No | Number of items |
| `product_type` | select | No | 'shop' or 'marketplace' |

### 1.5 `favorites`
User wishlists/favorites.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `user_id` | text | Yes | Relation to `users.id` |
| `product_id` | text | Yes | Relation to `products.id` |

### 1.6 `orders`
Completed transactions.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `order_number` | text | Yes | Unique order reference (e.g., ORD-123...) |
| `buyer_id` | text | Yes | Relation to `users.id` |
| `seller_id` | text | Yes | Relation to `users.id` |
| `product_id` | text | Yes | Relation to `products.id` |
| `quantity` | number | No | Quantity purchased |
| `price` | number | Yes | Base price |
| `shipping_fee` | number | No | Shipping cost applied |
| `service_fee` | number | No | Service fee applied |
| `total_amount` | number | No | Total paid |
| `shipping_address` | json | No | Snapshot of delivery address |
| `status` | select | No | pending, paid, shipped, delivered |
| `dhl_tracking_number`| text | No | DHL tracking ID |
| `dhl_label_pdf` | file | No | Generated shipping label |
| `payment_intent_id`| text | No | Stripe Payment Intent ID |

### 1.7 `seller_earnings`
Tracks payouts owed to sellers.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `seller_id` | text | Yes | Relation to `users.id` |
| `order_id` | text | Yes | Relation to `orders.id` |
| `gross_amount` | number | No | Total product price |
| `transaction_fee` | number | No | Platform fee deducted |
| `net_amount` | number | No | Amount to be paid out |
| `status` | select | No | pending, confirmed |

### 1.8 `admin_settings`
Global platform configuration.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `shipping_fee` | number | No | Default shipping fee (e.g., 4.99) |
| `service_fee` | number | No | Default buyer service fee (e.g., 1.99) |
| `transaction_fee_percentage`| number | No | Seller fee percentage (e.g., 0.07) |

### 1.9 `newsletter_signups`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `email` | email | Yes | Subscriber email |

### 1.10 `product_verifications`
Audit trail for admin product approvals.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `product_id` | text | Yes | Relation to `products.id` |
| `seller_id` | text | Yes | Relation to `users.id` |
| `status` | select | No | pending, approved, rejected |
| `admin_notes` | text | No | Internal review notes |

### 1.11 `email_templates`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `template_name` | text | Yes | Identifier (e.g., 'order_confirmation') |
| `subject` | text | Yes | Email subject line |
| `body` | text | Yes | HTML/Text body |
| `variables` | json | No | Expected dynamic variables |

### 1.12 `returns`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `order_id` | text | Yes | Relation to `orders.id` |
| `product_id` | text | Yes | Relation to `products.id` |
| `seller_id` | text | Yes | Relation to `users.id` |
| `buyer_id` | text | Yes | Relation to `users.id` |
| `reason` | text | Yes | Return justification |
| `status` | select | No | Pending, Approved, Rejected, Completed |

### 1.13 `shipping_info`
Saved user addresses.
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Primary Key |
| `user_id` | text | Yes | Relation to `users.id` |
| `full_name` | text | No | Recipient name |
| `street_address` | text | No | Street and house number |
| `city` | text | No | City |
| `postal_code` | text | No | ZIP code |
| `country` | text | No | Country |

---

## 2. Express.js API Routes

Located in `apps/api/src/routes/`. Base URL prefix is `/hcgi/api` (handled by `apiServerClient`).

| Route Path | Method | Description | Auth Required | PB Collections |
|------------|--------|-------------|---------------|----------------|
| `/health` | GET | System health check | No | None |
| `/checkout/create-session` | POST | Creates Stripe Checkout Session. Validates cart, calculates totals (incl. 4.99 shipping), returns Stripe URL. | Yes | `cart_items` |
| `/checkout/session/:id` | GET | Retrieves Stripe session details for Success Page verification. | Yes | None |
| `/stripe/webhook` | POST | Handles Stripe events (`payment_intent.succeeded`). Creates `orders`, marks `products` as 'sold', deletes `cart_items`. | No (Stripe Sig) | `orders`, `products`, `cart_items` |
| `/orders/create` | POST | Creates a pending order manually (pre-payment). | Yes | `orders`, `products` |
| `/orders/:id/update-status` | POST | Updates order status (e.g., to 'delivered') and confirms seller earnings. | Yes | `orders`, `seller_earnings` |
| `/dhl-labels/generate-label` | POST | Generates DHL shipping label. Includes idempotency and race-condition checks. Updates order with tracking. | Yes | `orders`, `products`, `users` |
| `/dhl-labels/:id/pdf` | GET | Downloads the generated DHL label PDF as a buffer. | Yes | `orders` |
| `/email-notifications/send-order-confirmation` | POST | Queues order confirmation email via PB hooks. | Yes | `orders`, `products`, `emails` |
| `/email-notifications/send-sales-notification` | POST | Queues seller notification email via PB hooks. | Yes | `orders`, `products`, `emails` |

---

## 3. React Pages

Located in `apps/web/src/pages/`.

| Page Name | Route | Access | Description |
|-----------|-------|--------|-------------|
| `HomePage` | `/` | All | Landing page, hero section, popular products, info banners. |
| `MarketplacePage` | `/marketplace` | All | Main product listing with filters (category, condition, price). |
| `ProductDetailPage` | `/product/:id` | All | Single product view. Shows status (sold/pending). Add to cart/favorites. |
| `CartPage` | `/cart` | Buyer | Shopping cart overview. Calculates subtotal, shipping, service fees. |
| `CheckoutPage` | `/checkout` | Buyer | Address input, terms acceptance, triggers Stripe session creation. |
| `SuccessPage` | `/success` | Buyer | Post-payment confirmation. Verifies session via API and clears local cart. |
| `AuthPage` | `/auth` | Guest | Login and Registration forms. |
| `ProfilePage` | `/profile` | Buyer | User settings, address management. |
| `MyOrdersPage` | `/my-orders` | Buyer | List of purchased items, tracking info, status badges. |
| `FavoritesPage` | `/favorites` | Buyer | Saved products wishlist. |
| `SellerDashboardPage`| `/seller-dashboard` | Seller | Manage listings, view sales, download DHL labels, view earnings. |
| `NewProductForm` | `/seller/new-product` | Seller | Form to list a new marketplace item. |
| `AdminDashboardPage` | `/admin` | Admin | Platform overview, settings management. |
| `ProductVerificationAdminPage` | `/admin/verifications` | Admin | Approve/reject pending seller products. |

---

## 4. User Roles & Permissions

| Feature / Capability | Guest | Buyer (Auth) | Seller | Admin |
|----------------------|-------|--------------|--------|-------|
| Browse Marketplace | ✅ | ✅ | ✅ | ✅ |
| View Product Details | ✅ | ✅ | ✅ | ✅ |
| Add to Cart / Favorites| ❌ | ✅ | ✅ | ✅ |
| Checkout / Purchase | ❌ | ✅ | ✅ | ✅ |
| View Own Orders | ❌ | ✅ | ✅ | ✅ |
| List New Products | ❌ | ❌ | ✅ | ✅ |
| Manage Own Listings | ❌ | ❌ | ✅ | ✅ |
| Download DHL Labels | ❌ | ❌ | ✅ | ✅ |
| View Seller Earnings | ❌ | ❌ | ✅ | ✅ |
| Approve/Reject Products| ❌ | ❌ | ❌ | ✅ |
| Edit Platform Settings | ❌ | ❌ | ❌ | ✅ |

---

## 5. Complete Purchase Workflow

1. **Discovery**: Customer browses `/marketplace` and clicks a product.
2. **Cart Addition**: Customer clicks "In den Warenkorb" on `ProductDetailPage`. `CartContext` creates a `cart_items` record in PocketBase.
3. **Checkout Initiation**: Customer goes to `/checkout`, enters shipping details, and clicks "Zahlungspflichtig bestellen".
4. **Session Creation**: Frontend calls `POST /checkout/create-session`. Backend validates items, calculates totals (Subtotal + 4.99 Shipping + 1.99 Service), and returns a Stripe URL.
5. **Payment**: Customer pays on Stripe hosted checkout.
6. **Webhook Processing**: Stripe sends `payment_intent.succeeded` to `POST /stripe/webhook`.
   * Backend verifies signature.
   * Extracts metadata (buyer info, cart items, address).
   * **Race Condition Check**: Verifies products are not already `status='sold'`.
   * Creates `orders` record with `status='paid'`.
   * Updates `products` to `status='sold'`.
   * Deletes `cart_items`.
7. **Confirmation**: Customer is redirected to `/success`. Frontend calls `GET /checkout/session/:id` to verify and clears local cart state.
8. **Fulfillment**: Seller logs into `/seller-dashboard`.
   * Clicks "Label" on the new order.
   * Frontend calls `POST /dhl-labels/generate-label`.
   * Backend generates PDF via DHL API, saves base64 to `orders.dhl_label_pdf`, and returns it.
9. **Completion**: Once shipped/delivered, order status is updated, and `seller_earnings` are marked as `confirmed`.

---

## 6. Known Issues & Bugs

1. **Shipping Cost Discrepancy**: Historically, there was a mismatch between frontend display (€4.99) and backend Stripe calculation (€3.99). This has been hardcoded to `4.99` in `checkout.js`, but dynamic fetching from `admin_settings` in the backend is not fully implemented in the webhook/checkout route.
2. **Email Notifications**: The Express routes `/email-notifications/*` currently create records in an `emails` collection, relying on a PocketBase Go/JS hook to actually dispatch them via SMTP. If the PB hook fails, emails remain in `pending` status.
3. **DHL Label Race Conditions**: If a seller clicks "Generate Label" multiple times rapidly, it could trigger multiple DHL API calls. This is mitigated by an idempotency check in `dhl-labels.js`, but network latency could still cause edge cases.
4. **Product Visibility**: Products marked as `sold` by the webhook remain visible in the database but are filtered out of the main marketplace view by the `listRule` or frontend filters. Direct links to sold products still work but disable the "Add to Cart" button.
5. **Cart Context Polling**: `CartContext.jsx` uses a 5-second polling interval as a fallback for `admin_settings` real-time subscriptions. This can cause unnecessary network traffic if left open in multiple tabs.