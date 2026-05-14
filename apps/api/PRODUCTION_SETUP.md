# Production Setup - Stripe Checkout & DHL Label Generation

## Overview
This document outlines the production-ready implementation of Stripe checkout with DHL label generation for the Zahnibörse marketplace.

## STEP 1: STRIPE CHECKOUT METADATA NORMALIZATION ✅
**File:** `apps/api/src/routes/checkout.js`

### Changes:
- Added normalized metadata fields to Stripe checkout session:
  - `buyer_id`: Buyer user ID (string)
  - `buyer_name`: Buyer name (string)
  - `buyer_email`: Buyer email (string)
  - `shipping_address`: Shipping address as JSON string
  - `cart_item_ids`: Comma-separated cart item IDs
  - `type`: 'marketplace_order' (string)

- All metadata fields are strings (Stripe requirement)
- Validates each metadata field is under 500 characters
- Logs complete metadata object before session creation

### Endpoint:
```
POST /checkout/create-session
```

### Request Body:
```json
{
  "buyer_id": "user123",
  "buyer_name": "John Doe",
  "buyer_email": "john@example.com",
  "shipping_address": {
    "name": "John Doe",
    "street": "123 Main St",
    "postalCode": "60486",
    "city": "Frankfurt",
    "country": "DE"
  },
  "cart_items": [
    {
      "id": "cart_item_1",
      "product": {
        "id": "prod_123",
        "name": "Dental Product",
        "price": 29.99,
        "seller_id": "seller_456"
      },
      "quantity": 1
    }
  ]
}
```

### Response:
```json
{
  "url": "https://checkout.stripe.com/pay/...",
  "sessionId": "cs_live_..."
}
```

---

## STEP 2: STRIPE WEBHOOK METADATA VALIDATION ✅
**File:** `apps/api/src/routes/stripe-webhook.js`

### Changes:
- Extracts metadata from `event.data.object.metadata`
- Validates ALL required fields exist:
  - `buyer_id`
  - `buyer_name`
  - `buyer_email`
  - `shipping_address`
  - `cart_item_ids`
  - `type` (must equal 'marketplace_order')

- Throws error with message: "Missing required metadata fields in Stripe session" if validation fails
- Parses `shipping_address` from JSON string
- Parses `cart_item_ids` from comma-separated string
- Logs complete metadata validation result

### Webhook Event:
```
checkout.session.completed
```

### Processing Flow:
1. Verify webhook signature
2. Extract and validate metadata
3. Respond to Stripe immediately with `{ received: true }`
4. Process orders asynchronously (don't block response)
5. For each cart item:
   - Create order record
   - Generate DHL label
   - Create seller earnings
   - Send confirmation emails
   - Delete cart item

---

## STEP 3: DHL SERVICE PRODUCTION SETUP ✅
**File:** `apps/api/src/utils/dhlService.js`

### New Functions:

#### `getDHLAccessToken()`
- POSTs to `process.env.DHL_TOKEN_URL`
- Uses OAuth2 Resource Owner Password Credentials (ROPC) flow
- Credentials from .env:
  - `DHL_API_KEY` (client_id)
  - `DHL_API_SECRET` (client_secret)
  - `DHL_USERNAME` (username)
  - `DHL_PASSWORD` (password)
- Implements token caching with 60s expiration buffer
- Logs token request/response with status and expires_in
- Returns access token string

#### `generateDHLLabel(order)`
- Uses Production DHL URLs: `https://api-eu.dhl.com/parcel/de/shipping/v2`
- Builds shipmentPayload with:
  - `profile`: 'STANDARD_GRUPPENPROFIL'
  - `product`: 'V01PAK'
  - `billingNumber`: from `process.env.DHL_BILLING_NUMBER`
  - `shipper`: Warehouse address from .env
  - `consignee`: Buyer shipping address from order
  - `details`: Weight and dimensions

- POSTs shipmentPayload to DHL with Bearer token
- Logs complete request/response including:
  - shipmentId
  - trackingNumber
  - label_pdf (base64)
  - HTTP status and statusText
  - Response body on error

- Returns:
  ```json
  {
    "tracking_number": "3SXXX...",
    "label_pdf": "<Buffer>"
  }
  ```

### Error Handling:
- Comprehensive error logging for all DHL API calls
- Logs status code, statusText, and response body
- Throws errors with descriptive messages

---

## STEP 4: DHL-LABELS ROUTE CONSOLIDATION ✅
**File:** `apps/api/src/routes/dhl-labels.js`

### Endpoint:
```
POST /dhl-labels/generate-label
```

### Request Body:
```json
{
  "order_id": "order_123"
}
```

### Processing Steps:

1. **Extract order_id** from request body
2. **Load order** from `pb.collection('orders').getOne(order_id)`
3. **HARD VALIDATION**: Check `order.status === 'paid'`
   - Throw 400 if not paid
4. **HARD VALIDATION**: Check `!order.dhl_tracking_number`
   - Throw 400 if label already exists
5. **Build orderForDHL object** from order fields
6. **HARD VALIDATION**: Check all required fields:
   - buyer_name
   - buyer_street
   - buyer_postal_code
   - buyer_city
   - seller_name
   - seller_street
   - seller_postal_code
   - seller_city
   - Throw 400 with field name if missing (NO FALLBACKS)
7. **Call dhlService.generateDHLLabel(orderForDHL)**
8. **Update order** in PocketBase with:
   - `dhl_tracking_number`
   - `dhl_label_pdf` (base64)
   - `label_generated_at` (timestamp)
   - `label_status`: 'generated'
9. **Return response** with tracking_number, label_pdf, message

### Response:
```json
{
  "success": true,
  "tracking_number": "3SXXX...",
  "label_pdf": "<base64 PDF>",
  "message": "Label generated successfully"
}
```

### Logging Prefixes:
- `[DHL LABEL REQUEST]` - Request processing
- `[DHL LABEL SUCCESS]` - Successful operations
- `[DHL LABEL ERROR]` - Error conditions

---

## STEP 5: ROUTES CLEANUP ✅
**File:** `apps/api/src/routes/index.js`

### Registered Routes:
✅ `router.use('/checkout', checkoutRouter)` - Stripe checkout
✅ `router.use('/dhl-labels', dhlLabelsRouter)` - DHL label generation
✅ `router.use('/stripe', stripeRouter)` - Stripe webhook handler
✅ `router.use('/email', emailRouter)` - Email notifications
✅ `router.use('/orders', ordersRouter)` - Order management
✅ `router.use('/admin', adminRouter)` - Admin operations
✅ `router.use('/seller', sellerRouter)` - Seller operations
✅ `router.use('/admin/orders', adminOrdersRouter)` - Admin order management
✅ `router.use('/email-notifications', emailNotificationsRouter)` - Email notifications
✅ `router.use('/favorites', favoritesRouter)` - Favorites management
✅ `router.use('/verification', verificationRouter)` - Product verification

### Deleted Routes:
❌ `/dhl` - Removed (replaced by dhl-labels)
❌ `/dhl-shipping` - Removed (replaced by dhl-labels)

---

## STEP 6: DELETE OBSOLETE FILES ✅

The following files have been replaced and should be deleted:
- ❌ `apps/api/src/routes/dhl.js` - Replaced by dhl-labels.js
- ❌ `apps/api/src/routes/dhl-shipping.js` - Replaced by dhl-labels.js
- ❌ `apps/api/src/routes/stripe.js` - Replaced by stripe-webhook.js

---

## STEP 7: ENVIRONMENT VARIABLES SETUP ✅
**File:** `apps/api/.env`

### DHL Production Credentials:

Security note: real DHL credentials must never be committed to this file. If real credentials were previously committed, rotate them before production use.

```env
# DHL Production API Credentials
# OAuth2 Token URL for DHL API authentication
DHL_TOKEN_URL=https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token

# DHL API Key (Client ID) for OAuth2 authentication
DHL_API_KEY=replace-with-production-client-id

# DHL API Secret (Client Secret) for OAuth2 authentication
DHL_API_SECRET=replace-with-production-client-secret

# DHL Username for Resource Owner Password Credentials (ROPC) flow
DHL_USERNAME=replace-with-gkp-system-user

# DHL Password for Resource Owner Password Credentials (ROPC) flow
DHL_PASSWORD=replace-with-gkp-system-user-password

# DHL Customer Number for shipment creation
DHL_CUSTOMER_NUMBER=replace-with-ekp

# DHL Billing Number for shipment creation (format: XXXXXXXXXX01XX)
DHL_BILLING_NUMBER=replace-with-domestic-billing-number

# Optional but required before creating international labels
DHL_BILLING_NUMBER_INTERNATIONAL=replace-with-international-billing-number
DHL_ALLOW_INTERNATIONAL=false

# Warehouse/Shipper Address Information
WAREHOUSE_NAME=Patrick Tchoquessi
WAREHOUSE_ADDRESS_STREET=Angelika-machinek-Straße 12
WAREHOUSE_ADDRESS_CITY=Frankfurt
WAREHOUSE_ADDRESS_ZIP=60486
WAREHOUSE_ADDRESS_COUNTRY=DE
```

### Notes:
- No Sandbox URLs are used
- Real credentials must be provisioned in the runtime environment, not copied into documentation
- Token URL uses ROPC (Resource Owner Password Credentials) flow
- The API converts app-level two-letter countries such as `DE` to DHL-required alpha-3 countries such as `DEU`
- `DHL_BILLING_NUMBER` is used for German domestic shipments
- Non-German destinations are disabled by default; set `DHL_ALLOW_INTERNATIONAL=true`, `DHL_BILLING_NUMBER_INTERNATIONAL`, and customs handling before enabling them
- Product/order parcel weight is required for label generation. Only set `DHL_DEFAULT_PARCEL_WEIGHT_G` after the business approves a default package weight.
- Optional hard dimension validation: set `DHL_REQUIRE_PARCEL_DIMENSIONS=true` when product length/width/height must be present before creating labels.
- Optional rate/cache controls: `DHL_LABEL_GENERATION_RATE_LIMIT`, `DHL_TRACKING_RATE_LIMIT`, `DHL_TRACKING_CACHE_TTL_MS`, `DHL_HTTP_RETRY_ATTEMPTS`, `DHL_HTTP_RETRY_BASE_DELAY_MS`.
- Run PocketBase migrations before deploying the API. Migrations `1776600000_020_dhl_label_jobs.js` and `1776600100_021_dhl_label_locks.js` create durable DHL label job/idempotency and cross-process lock state.

### Durable DHL Label State:
- Label creation is guarded by `dhl_label_jobs` plus short-lived unique `dhl_label_locks` records keyed by subject.
- Duplicate webhook/manual requests for the same order return the existing result or a conflict instead of creating a second label.
- Clear validation/auth errors mark the order label as `failed` and can be retried after the data/configuration is fixed.
- Ambiguous shipment-create failures such as network timeouts or DHL 5xx responses mark the label as `unknown`. Do not retry automatically; reconcile with DHL first to avoid duplicate shipments.
- If a label is created but cannot be saved to PocketBase, the job/order are also marked `unknown` for manual reconciliation.

---

## STEP 8: PRODUCTION VALIDATION CHECKLIST ✅

### DHL Token Request Logging:
- ✅ Log request URL
- ✅ Log request headers (without secrets)
- ✅ Log response status
- ✅ Log expires_in value
- ✅ Log token caching status

### DHL Shipment Request Logging:
- ✅ Log complete shipmentPayload (sanitized)
- ✅ Log response status
- ✅ Log shipmentId
- ✅ Log trackingNumber
- ✅ Log PDF size in bytes
- ✅ Log response body on error

### Stripe Webhook Logging:
- ✅ Log event type
- ✅ Log sessionId
- ✅ Log metadata validation result
- ✅ Log payment status
- ✅ Log cart item processing

### Order Creation Logging:
- ✅ Log order_id
- ✅ Log buyer_id
- ✅ Log seller_id
- ✅ Log total_amount
- ✅ Log DHL label generation status
- ✅ Log email sending status

### Error Handling:
- ✅ All errors include status code
- ✅ All errors include error message
- ✅ All errors include relevant context
- ✅ Use logger from '../utils/logger.js'
- ✅ NO console.log usage

---

## Testing Checklist

### 1. Stripe Checkout
- [ ] Create checkout session with valid cart items
- [ ] Verify metadata is normalized correctly
- [ ] Verify metadata fields are under 500 characters
- [ ] Verify Stripe session is created successfully
- [ ] Verify checkout URL is returned

### 2. Stripe Webhook
- [ ] Simulate checkout.session.completed event
- [ ] Verify webhook signature validation
- [ ] Verify metadata extraction and validation
- [ ] Verify error handling for missing metadata
- [ ] Verify error handling for invalid type
- [ ] Verify asynchronous order processing

### 3. DHL Token Request
- [ ] Verify OAuth2 token request succeeds
- [ ] Verify token is cached
- [ ] Verify cached token is reused
- [ ] Verify token expiration buffer works
- [ ] Verify error handling for invalid credentials

### 4. DHL Label Generation
- [x] Verify shipment payload is built correctly
- [ ] Verify DHL API request succeeds
- [ ] Verify tracking number is extracted
- [ ] Verify PDF is downloaded/extracted
- [ ] Verify PDF is converted to base64
- [ ] Verify error handling for API failures
- [x] Verify unsupported international billing configuration fails before calling DHL

### 5. DHL-Labels Route
- [x] Verify order validation (paid status)
- [x] Verify label existence check
- [x] Verify required field validation
- [x] Verify order update with label info
- [x] Verify response format
- [x] Verify error responses
- [x] Verify cancellation endpoint exists for incorrect labels
- [x] Verify concurrent manual generation is rejected

### 6. End-to-End Flow
- [ ] Create checkout session
- [ ] Complete payment via Stripe
- [ ] Verify webhook processes order
- [ ] Verify DHL label is generated
- [ ] Verify order is updated
- [ ] Verify emails are sent
- [ ] Verify cart items are deleted

---

## Logging Examples

### DHL Token Request:
```
[DHL-SERVICE] getDHLAccessToken() called
[DHL-SERVICE] Cached token invalid or missing - fetching new token
[DHL-SERVICE] OAuth2 Token Request - URL: https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token
[DHL-SERVICE] OAuth2 Credentials - Username: [configured DHL user], Client ID: abc123...wxyz
[DHL-SERVICE] Sending OAuth2 ROPC token request...
[DHL-SERVICE] OAuth2 token response received - Status: 200
[DHL-SERVICE] OAuth2 token received successfully - Expires in 3600s
[DHL-SERVICE] Token cached successfully
```

### DHL Shipment Request:
```
[DHL-SERVICE] Generating DHL label - Order: ORD-123456
[DHL-SERVICE] Step 1: Fetching OAuth2 access token...
[DHL-SERVICE] OAuth2 access token obtained - Length: 1234
[DHL-SERVICE] Step 2: Preparing DHL API request payload...
[DHL-SERVICE] DHL API Request Payload: {...}
[DHL-SERVICE] Step 3: Calling DHL Shipping API - URL: https://api-eu.dhl.com/parcel/de/shipping/v2/shipments
[DHL-SERVICE] Request Headers - Authorization: Bearer [abc123...wxyz], dhl-api-key: [abc123...wxyz]
[DHL-SERVICE] DHL API response received - Status: 200
[DHL-SERVICE] DHL API Response: {...}
[DHL-SERVICE] Extracted from shipment - Shipment: 3SXXX..., HasB64: true
[DHL-SERVICE] DHL label generation successful - Shipment: 3SXXX..., PDF size: 12345 bytes
```

### Stripe Webhook:
```
[WEBHOOK] Stripe webhook received
[WEBHOOK] Webhook signature verified - Event: checkout.session.completed
[WEBHOOK] Processing checkout.session.completed - Session: cs_live_...
[WEBHOOK] Extracting metadata from session...
[WEBHOOK] Metadata extracted - buyer_id: user123, buyer_name: John Doe, buyer_email: john@example.com, type: marketplace_order
[WEBHOOK] All required metadata fields validated successfully
[WEBHOOK] Shipping address parsed successfully - City: Frankfurt
[WEBHOOK] Parsed cart item IDs - Count: 1, IDs: cart_item_1
[WEBHOOK] Responding to Stripe immediately with received: true
[WEBHOOK] Processing marketplace order asynchronously - Buyer: user123, Items: 1
[WEBHOOK] Processing cart item 1/1 - ID: cart_item_1
[WEBHOOK] Fetching cart item - ID: cart_item_1
[WEBHOOK] Cart item fetched - Product: prod_123, Quantity: 1
[WEBHOOK] Calling orderHandler for cart item - Buyer: user123, Seller: seller_456, Product: prod_123
[WEBHOOK] Order created successfully - Order: order_123
[WEBHOOK] All cart items processed - Session: cs_live_...
```

### DHL-Labels Route:
```
[DHL LABEL REQUEST] Generate label request - Order: order_123
[DHL LABEL REQUEST] Fetching order - ID: order_123
[DHL LABEL REQUEST] Order fetched - Number: ORD-123456
[DHL LABEL REQUEST] Order payment status validated - Status: paid
[DHL LABEL REQUEST] No existing label found - Order: order_123
[DHL LABEL REQUEST] Fetching buyer - ID: user123
[DHL LABEL REQUEST] Fetching seller - ID: seller_456
[DHL LABEL REQUEST] Building orderForDHL object...
[DHL LABEL REQUEST] Validating required fields...
[DHL LABEL REQUEST] All required fields validated
[DHL LABEL REQUEST] orderForDHL object built - Order: order_123
[DHL LABEL REQUEST] Calling generateDHLLabel - Order: order_123
[DHL LABEL SUCCESS] DHL label generated - Shipment: 3SXXX..., PDF size: 12345 bytes
[DHL LABEL REQUEST] Updating order with shipment number - Order: order_123
[DHL LABEL SUCCESS] Order updated with shipment number - Order: order_123, Tracking: 3SXXX...
[DHL LABEL SUCCESS] DHL label generation completed successfully - Order: order_123
```

---

## Production Deployment Notes

1. **Environment Variables**: Ensure all DHL credentials are set in production .env
2. **Stripe Webhook**: Configure Stripe webhook endpoint to point to `/stripe/webhook`
3. **CORS**: Verify CORS_ORIGIN is set correctly for production domain
4. **Logging**: All operations are logged with [PREFIX] format for easy monitoring
5. **Error Handling**: All errors are thrown and caught by errorMiddleware
6. **Async Processing**: Webhook responds immediately, orders processed asynchronously
7. **Token Caching**: DHL tokens are cached with 60s expiration buffer
8. **Metadata Validation**: All Stripe metadata is validated before processing

---

## API Endpoints Summary

### Checkout
- `POST /checkout/create-session` - Create Stripe checkout session
- `GET /checkout/session/:sessionId` - Retrieve session details

### DHL Labels
- `POST /dhl-labels/generate-label` - Generate DHL shipping label
- `GET /dhl-labels/debug/:orderId` - Inspect DHL readiness for an order
- `GET /dhl-labels/:orderId/pdf` - Download label PDF
- `GET /dhl-labels/:orderId/tracking` - Fetch DHL tracking status
- `DELETE /dhl-labels/:orderId` - Cancel an unmanifested DHL label and clear order label fields

### Stripe Webhook
- `POST /stripe/webhook` - Handle Stripe webhook events (internal)

---

## Troubleshooting

### DHL Token Request Fails
- Check DHL_TOKEN_URL is correct
- Check DHL_API_KEY and DHL_API_SECRET are valid
- Check DHL_USERNAME and DHL_PASSWORD are correct
- Check network connectivity to DHL API

### DHL Shipment Request Fails
- Check token is valid (check logs for token expiration)
- Check shipment payload is valid (check logs for payload)
- Check DHL_BILLING_NUMBER is correct
- Check warehouse address is complete
- Check buyer shipping address is complete

### Stripe Webhook Not Processing
- Check STRIPE_WEBHOOK_SECRET is correct
- Check webhook signature validation (check logs)
- Check metadata is present in session (check logs)
- Check all required metadata fields are present

### Order Not Updated with Label
- Check order status is 'paid'
- Check order doesn't already have a label
- Check PocketBase connection
- Check order update permissions

---

End of Production Setup Documentation
