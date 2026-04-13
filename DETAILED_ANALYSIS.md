# Detailed Technical Analysis - Zahnibörse Marketplace

This document provides a comprehensive technical analysis and documentation of the Zahnibörse Marketplace system, covering the database schema, backend API routes, frontend React pages, user roles, core workflows, and known issues.

---

## 1. PocketBase Collections

The system uses PocketBase as its primary database. Below is the detailed schema for all 13 collections.

### 1.1 `users` (Auth Collection)
Manages authentication and user profiles for buyers, sellers, and admins.
*   **Fields:**
    *   `id` (text, required): Primary Key (15 chars)
    *   `email` (email, required): User's email address (unique)
    *   `password` (password, required): Hashed password
    *   `name` (text, optional): Full name
    *   `avatar` (file, optional): Profile image
    *   `university` (text, optional): User's university
    *   `is_seller` (bool, optional): True if user is an approved seller
    *   `is_admin` (bool, optional): True if user is an administrator
    *   `user_id` (text, required): Custom unique user identifier
    *   `seller_username` (text, optional): Unique username for seller profile
    *   `is_deleted` (bool, optional): Soft delete flag
*   **Relationships:** Referenced by `products.seller_id`, `orders.buyer_id`, `orders.seller_id`, `cart_items.user_id`, `favorites.user_id`, etc.

### 1.2 `products` (Marketplace Items)
Marketplace products listed by sellers.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `product_type` (select, required): Article, Set, Consumable
    *   `name` (text, required): Product title
    *   `description` (text, optional): Detailed description
    *   `price` (number, required): Price in EUR
    *   `image` (file, optional): Product image
    *   `condition` (select, required): Neu, Wie neu, Gut, Befriedigend
    *   `fachbereich` (select, optional): Paro, Kons, Pro, KFO (Multiple)
    *   `seller_id` (text, required): Relation to `users.id`
    *   `seller_username` (text, optional): Denormalized seller username
    *   `status` (select, optional): draft, active, pending_verification, rejected, sold
    *   `verification_status` (select, optional): pending, approved, rejected
*   **Relationships:** Belongs to `users` (seller). Referenced by `cart_items`, `favorites`, `orders`.

### 1.3 `shop_products` (Admin Shop)
Official Zahnibörse products (B2C).
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `name` (text, required): Product title
    *   `description` (text, optional): Detailed description
    *   `price` (number, required): Price in EUR
    *   `image` (file, optional): Product image
    *   `condition` (select, optional): Condition
    *   `fachbereich` (select, optional): Categories
*   **Relationships:** Referenced by `cart_items` (when `product_type` is 'shop').

### 1.4 `cart_items` (Shopping Cart)
Shopping cart items for users.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `user_id` (text, required): Relation to `users.id`
    *   `product_id` (text, required): Relation to `products.id` or `shop_products.id`
    *   `quantity` (number, optional): Number of items
    *   `product_type` (select, optional): 'shop' or 'marketplace'
*   **Relationships:** Belongs to `users`, references `products` or `shop_products`.

### 1.5 `favorites` (Saved Items)
User wishlists/favorites.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `user_id` (text, required): Relation to `users.id`
    *   `product_id` (text, required): Relation to `products.id`
*   **Relationships:** Belongs to `users`, references `products`.

### 1.6 `orders` (Purchase Records)
Completed transactions.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `order_number` (text, required): Unique order reference (e.g., ORD-123...)
    *   `buyer_id` (text, required): Relation to `users.id`
    *   `seller_id` (text, required): Relation to `users.id`
    *   `product_id` (text, required): Relation to `products.id`
    *   `quantity` (number, optional): Quantity purchased
    *   `price` (number, required): Base price
    *   `shipping_fee` (number, optional): Shipping cost applied
    *   `service_fee` (number, optional): Service fee applied
    *   `total_amount` (number, optional): Total paid
    *   `shipping_address` (json, optional): Snapshot of delivery address
    *   `status` (select, optional): pending, paid, shipped, delivered
    *   `dhl_tracking_number` (text, optional): DHL tracking ID
    *   `dhl_label_pdf` (file, optional): Generated shipping label
    *   `payment_intent_id` (text, optional): Stripe Payment Intent ID
*   **Relationships:** Belongs to `users` (buyer and seller), references `products`.

### 1.7 `seller_earnings` (Seller Payouts)
Tracks payouts owed to sellers.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `seller_id` (text, required): Relation to `users.id`
    *   `order_id` (text, required): Relation to `orders.id`
    *   `gross_amount` (number, optional): Total product price
    *   `transaction_fee` (number, optional): Platform fee deducted
    *   `net_amount` (number, optional): Amount to be paid out
    *   `status` (select, optional): pending, confirmed
*   **Relationships:** Belongs to `users` (seller) and `orders`.

### 1.8 `admin_settings` (Configuration)
Global platform configuration.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `shipping_fee` (number, optional): Default shipping fee (e.g., 4.99)
    *   `service_fee` (number, optional): Default buyer service fee (e.g., 1.99)
    *   `transaction_fee_percentage` (number, optional): Seller fee percentage (e.g., 0.07)
*   **Relationships:** None (Singleton pattern).

### 1.9 `newsletter_signups` (Email List)
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `email` (email, required): Subscriber email
*   **Relationships:** None.

### 1.10 `product_verifications` (Verification Queue)
Audit trail for admin product approvals.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `product_id` (text, required): Relation to `products.id`
    *   `seller_id` (text, required): Relation to `users.id`
    *   `status` (select, optional): pending, approved, rejected
    *   `admin_notes` (text, optional): Internal review notes
*   **Relationships:** Belongs to `products` and `users` (seller).

### 1.11 `email_templates` (Email Designs)
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `template_name` (text, required): Identifier (e.g., 'order_confirmation')
    *   `subject` (text, required): Email subject line
    *   `body` (text, required): HTML/Text body
    *   `variables` (json, optional): Expected dynamic variables
*   **Relationships:** None.

### 1.12 `returns` (Return Requests)
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `order_id` (text, required): Relation to `orders.id`
    *   `product_id` (text, required): Relation to `products.id`
    *   `seller_id` (text, required): Relation to `users.id`
    *   `buyer_id` (text, required): Relation to `users.id`
    *   `reason` (text, required): Return justification
    *   `status` (select, optional): Pending, Approved, Rejected, Completed
*   **Relationships:** Belongs to `orders`, `products`, `users` (buyer and seller).

### 1.13 `shipping_info` (Address Data)
Saved user addresses.
*   **Fields:**
    *   `id` (text, required): Primary Key
    *   `user_id` (text, required): Relation to `users.id`
    *   `full_name` (text, optional): Recipient name
    *   `street_address` (text, optional): Street and house number
    *   `city` (text, optional): City
    *   `postal_code` (text, optional): ZIP code
    *   `country` (text, optional): Country
*   **Relationships:** Belongs to `users`.

---

## 2. Express.js Routes

All routes are prefixed with `/hcgi/api` via the `apiServerClient`.

### 2.1 Checkout Routes (`/checkout`)
*   **`POST /checkout/create-session`**
    *   **Description:** Creates a Stripe Checkout Session. Validates cart, calculates totals (incl. 4.99 shipping), returns Stripe URL.
    *   **Auth:** Required.
    *   **Body:** `buyer_id`, `buyer_name`, `buyer_email`, `shipping_address`, `cart_items`.
    *   **Response:** `{ success: true, sessionId: string, url: string }`
    *   **Collections:** `cart_items` (indirectly via validation).
*   **`GET /checkout/session/:id`**
    *   **Description:** Retrieves Stripe session details for Success Page verification.
    *   **Auth:** Required.
    *   **Response:** `{ id, status, amountTotal, customerEmail, metadata, paymentIntentId }`

### 2.2 Stripe Webhook (`/stripe/webhook`)
*   **`POST /stripe/webhook`**
    *   **Description:** Handles Stripe events (`payment_intent.succeeded`). Creates `orders`, marks `products` as 'sold', deletes `cart_items`.
    *   **Auth:** None (Uses Stripe Signature).
    *   **Collections:** `orders` (create), `products` (update), `cart_items` (delete).

### 2.3 Orders Routes (`/orders`)
*   **`POST /orders/create`**
    *   **Description:** Creates a pending order manually (pre-payment).
    *   **Auth:** Required.
    *   **Body:** `seller_id`, `product_id`, `quantity`, `shipping_address`.
    *   **Collections:** `orders` (create), `products` (read).
*   **`POST /orders/:id/update-status`**
    *   **Description:** Updates order status (e.g., to 'delivered') and confirms seller earnings.
    *   **Auth:** Required.
    *   **Body:** `status`.
    *   **Collections:** `orders` (update), `seller_earnings` (update).

### 2.4 DHL Labels Routes (`/dhl-labels`)
*   **`POST /dhl-labels/generate-label`**
    *   **Description:** Generates DHL shipping label. Includes idempotency and race-condition checks. Updates order with tracking.
    *   **Auth:** Required.
    *   **Body:** `order_id`.
    *   **Collections:** `orders` (read/update), `products` (read), `users` (read).
*   **`GET /dhl-labels/:id/pdf`**
    *   **Description:** Downloads the generated DHL label PDF as a buffer.
    *   **Auth:** Required.
    *   **Response:** PDF Buffer.

### 2.5 Email Notifications (`/email-notifications`)
*   **`POST /email-notifications/send-order-confirmation`**
    *   **Description:** Queues order confirmation email via PB hooks.
    *   **Auth:** Required.
    *   **Body:** `orderId`, `buyerEmail`.
    *   **Collections:** `orders`, `products`, `emails` (custom collection for hooks).
*   **`POST /email-notifications/send-sales-notification`**
    *   **Description:** Queues seller notification email via PB hooks.
    *   **Auth:** Required.
    *   **Body:** `orderId`, `sellerEmail`.
*   **`POST /email-notifications/send-verification-notification`**
    *   **Description:** Queues verification status email.
    *   **Auth:** Required.

### 2.6 Admin Routes (`/admin`)
*   **`GET /admin/products`**: List all products with filters.
*   **`GET /admin/products/:id`**: Get single product details.
*   **`POST /admin/products`**: Create new product.
*   **`PUT /admin/products/:id`**: Update product.
*   **`DELETE /admin/products/:id`**: Delete product.
*   **`POST /admin/approve-product`**: Approve product verification.
*   **`POST /admin/reject-product`**: Reject product verification.
*   **`GET /admin/orders`**: Get Orders with Filters.
*   **`PUT /admin/orders/:id`**: Update Order Status.
*   **`GET /admin/users`**: Get Users with Filters.
*   **`GET /admin/settings`**: Get Admin Settings.
*   **`PUT /admin/settings`**: Update Admin Settings.
    *   **Auth:** Required (Admin only).

### 2.7 Seller Routes (`/seller`)
*   **`POST /seller/activate`**: Activate Seller Account.
*   **`GET /seller/products`**: Get Current User's Seller Products.
*   **`GET /seller/profile`**: Get Seller Profile.
    *   **Auth:** Required.

### 2.8 Verification Routes (`/verification`)
*   **`POST /verification/pay-fee`**: Create Stripe Checkout Session for product verification fee (15 EUR).
    *   **Auth:** Required.

---

## 3. React Pages

All pages are located in `apps/web/src/pages/`.

| Page Name | Route | Access | Description |
|-----------|-------|--------|-------------|
| `HomePage` | `/` | All | Landing page, hero section, popular products, info banners. |
| `ShopPage` | `/shop` | All | Official Zahnibörse B2C products. |
| `MarketplacePage` | `/marketplace` | All | Main product listing with filters (category, condition, price). |
| `ProductDetailPage` | `/product/:id` | All | Single product view. Shows status (sold/pending). Add to cart/favorites. |
| `CartPage` | `/cart` | Buyer | Shopping cart overview. Calculates subtotal, shipping, service fees. |
| `CheckoutPage` | `/checkout` | Buyer | Address input, terms acceptance, triggers Stripe session creation. |
| `SuccessPage` | `/success` | Buyer | Post-payment confirmation. Verifies session via API and clears local cart. |
| `AuthPage` | `/auth` | Guest | Login and Registration forms. |
| `ProfilePage` | `/profile` | Buyer | User settings, address management. |
| `MyOrdersPage` | `/my-orders` | Buyer | List of purchased items, tracking info, status badges. |
| `OrderDetailsPage` | `/order-details/:id` | Buyer | Detailed view of a specific order. |
| `FavoritesPage` | `/favorites` | Buyer | Saved products wishlist. |
| `SellerDashboardPage`| `/seller-dashboard` | Seller | Manage listings, view sales, download DHL labels, view earnings. |
| `SellerInfoPage` | `/seller-info` | Buyer | Information page to become a seller. |
| `SellerProductsPage` | `/seller-products` | Seller | Detailed list of seller's own products. |
| `NewProductForm` | `/seller/new-product` | Seller | Form to list a new marketplace item. |
| `AdminDashboardPage` | `/admin` | Admin | Platform overview, settings management, user/order management. |
| `ProductVerificationAdminPage` | `/admin/verifications` | Admin | Approve/reject pending seller products. |
| `ImpressumPage`, `DatenschutzPage`, `AgbPage`, `FaqPage`, `HilfePage`, `AboutPage` | Various | All | Static legal and informational pages. |

---

## 4. User Roles & Permissions

| Feature / Capability | Guest | Buyer (Auth) | Seller | Admin |
|----------------------|-------|--------------|--------|-------|
| Browse Marketplace | ✅ | ✅ | ✅ | ✅ |
| View Product Details | ✅ | ✅ | ✅ | ✅ |
| Add to Cart / Favorites| ❌ | ✅ | ✅ | ✅ |
| Checkout / Purchase | ❌ | ✅ | ✅ | ✅ |
| View Own Orders | ❌ | ✅ | ✅ | ✅ |
| Become a Seller | ❌ | ✅ | N/A | N/A |
| List New Products | ❌ | ❌ | ✅ | ✅ |
| Manage Own Listings | ❌ | ❌ | ✅ | ✅ |
| Download DHL Labels | ❌ | ❌ | ✅ | ✅ |
| View Seller Earnings | ❌ | ❌ | ✅ | ✅ |
| Approve/Reject Products| ❌ | ❌ | ❌ | ✅ |
| Edit Platform Settings | ❌ | ❌ | ❌ | ✅ |

---

## 5. Complete Purchase Workflow

1.  **Discovery**: Customer browses `/marketplace` and clicks a product.
2.  **Product Detail**: Customer views `/product/:id`. If status is `active` or `verified`, they can proceed.
3.  **Add to Cart**: Customer clicks "In den Warenkorb". `CartContext` creates a `cart_items` record in PocketBase.
4.  **Checkout Initiation**: Customer goes to `/checkout`, enters shipping details, accepts AGB/Privacy, and clicks "Zahlungspflichtig bestellen".
5.  **Session Creation**: Frontend calls `POST /checkout/create-session`. Backend validates items, calculates totals (Subtotal + 4.99 Shipping + 1.99 Service), and returns a Stripe URL.
6.  **Payment**: Customer pays on Stripe hosted checkout.
7.  **Webhook Processing**: Stripe sends `payment_intent.succeeded` to `POST /stripe/webhook`.
    *   Backend verifies signature.
    *   Extracts metadata (buyer info, cart items, address).
    *   **Race Condition Check**: Verifies products are not already `status='sold'`.
    *   Creates `orders` record with `status='paid'`.
    *   Updates `products` to `status='sold'`.
    *   Deletes `cart_items`.
8.  **Confirmation**: Customer is redirected to `/success`. Frontend calls `GET /checkout/session/:id` to verify and clears local cart state.
9.  **Seller Fulfillment**: Seller logs into `/seller-dashboard`.
    *   Clicks "Label" on the new order.
    *   Frontend calls `POST /dhl-labels/generate-label`.
    *   Backend generates PDF via DHL API, saves base64 to `orders.dhl_label_pdf`, and returns it.
10. **Completion**: Once shipped/delivered, order status is updated, and `seller_earnings` are marked as `confirmed`.

---

## 6. Known Issues & Bugs

### 6.1 Shipping Cost Discrepancy
*   **What doesn't work:** The shipping cost was historically mismatched between frontend (€4.99) and backend Stripe calculation (€3.99).
*   **Where:** `apps/api/src/routes/checkout.js` and `apps/web/src/contexts/CartContext.jsx`.
*   **Why:** Hardcoded values in the backend didn't match the dynamic or frontend values.
*   **Fix:** The backend `checkout.js` has been updated to hardcode `const SHIPPING_FEE = 4.99;`. However, a better fix is to dynamically fetch this from the `admin_settings` collection during checkout session creation.

### 6.2 Email Notifications (Pending Status)
*   **What doesn't work:** Emails might not actually send, remaining in a `pending` state.
*   **Where:** `apps/api/src/routes/email-notifications.js`.
*   **Why:** The Express routes create records in an `emails` collection, relying on a PocketBase Go/JS hook to dispatch them via SMTP. If the PB hook fails or SMTP is misconfigured, emails don't send.
*   **Fix:** Ensure the PocketBase SMTP settings are correct and the `pb_hooks` script that processes the `emails` collection is functioning. Alternatively, move email sending directly into the Express route using Nodemailer.

### 6.3 DHL Label Race Conditions
*   **What doesn't work:** Rapidly clicking "Generate Label" could trigger multiple DHL API calls and charges.
*   **Where:** `apps/api/src/routes/dhl-labels.js`.
*   **Why:** Network latency between the request and the database update.
*   **Fix:** Implemented an idempotency check (`if (order.dhl_tracking_number) return existing`) and a double-check refetch before calling the DHL API.

### 6.4 Product Visibility After Purchase
*   **What doesn't work:** Products marked as `sold` by the webhook remain visible in the database.
*   **Where:** `apps/web/src/pages/MarketplacePage.jsx` and `ProductDetailPage.jsx`.
*   **Why:** They are filtered out of the main marketplace view by the `listRule` or frontend filters, but direct links to sold products still work.
*   **Fix:** The `ProductDetailPage` correctly disables the "Add to Cart" button and shows a "VERKAUFT" badge if `product.status === 'sold'`. This is intended behavior, but users might find it confusing if they kept the tab open.

### 6.5 Cart Context Polling
*   **What doesn't work:** Unnecessary network traffic.
*   **Where:** `apps/web/src/contexts/CartContext.jsx`.
*   **Why:** Uses a 5-second `setInterval` polling fallback for `admin_settings` real-time subscriptions.
*   **Fix:** The polling logic was updated to check if values actually changed before triggering a state update (`if (prev.shipping_fee === records[0].shipping_fee) return prev;`), preventing infinite re-renders.