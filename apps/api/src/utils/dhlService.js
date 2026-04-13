import 'dotenv/config';
import axios from 'axios';
import logger from './logger.js';

// ============================================================================
// DHL CONFIGURATION - All URLs and credentials from environment variables
// ============================================================================

const DHL_CONFIG = {
  // OAuth2 Token Endpoint
  TOKEN_URL: process.env.DHL_TOKEN_URL || 'https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token',

  // DHL Shipping API Endpoint
  SHIPPING_URL: process.env.DHL_SHIPPING_URL || 'https://api-eu.dhl.com/parcel/de/shipping/v2/orders',

  // DHL Additional API Endpoints (optional, for future use)
  PICKUP_URL: process.env.DHL_PICKUP_URL || 'https://api-eu.dhl.com/parcel/de/pickup/v1',
  RETURNS_URL: process.env.DHL_RETURNS_URL || 'https://api-eu.dhl.com/parcel/de/returns/v1',
  PARCEL_DE_TRACKING_URL: process.env.DHL_PARCEL_DE_TRACKING_URL || 'https://api-eu.dhl.com/parcel/de/tracking/v1',
  PRIVATE_SHIPPING_URL: process.env.DHL_PRIVATE_SHIPPING_URL || 'https://api-eu.dhl.com/parcel/de/private/shipping/v1',
  ACCOUNT_URL: process.env.DHL_ACCOUNT_URL || 'https://api-eu.dhl.com/parcel/de/account/v1',
  TRACKING_URL: process.env.DHL_TRACKING_URL || 'https://api-eu.dhl.com/parcel/de/tracking/v1',

  // DHL API Credentials
  API_KEY: process.env.DHL_API_KEY,
  API_SECRET: process.env.DHL_API_SECRET,
  USERNAME: process.env.DHL_USERNAME,
  PASSWORD: process.env.DHL_PASSWORD,
  TRACKING_API_KEY: process.env.DHL_TRACKING_API_KEY,

  // DHL Account Numbers
  CUSTOMER_NUMBER: process.env.DHL_CUSTOMER_NUMBER,
  BILLING_NUMBER: process.env.DHL_BILLING_NUMBER,

  // DHL Products
  PRODUCTS: {
    DOMESTIC: 'V01PAK',      // Domestic (DE to DE)
    INTERNATIONAL: 'V53WPAK', // International
  },

  // DHL Profiles
  PROFILE: 'STANDARD_GRUPPENPROFIL',

  // Token Cache Settings
  TOKEN_CACHE_BUFFER_MS: 60 * 1000, // 60 second buffer before expiration
};

// ============================================================================
// WAREHOUSE CONFIGURATION - All data from environment variables
// ============================================================================

const WAREHOUSE_CONFIG = {
  name: process.env.WAREHOUSE_NAME || 'Patrick Tchoquessi',
  street: process.env.WAREHOUSE_ADDRESS_STREET || 'Angelika-machinek-Straße 12',
  city: process.env.WAREHOUSE_ADDRESS_CITY || 'Frankfurt',
  zip: process.env.WAREHOUSE_ADDRESS_ZIP || '60486',
  country: process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE',
};

logger.info('[DHL-SERVICE] DHL Configuration loaded from environment variables');
logger.info(`[DHL-SERVICE] Token URL: ${DHL_CONFIG.TOKEN_URL}`);
logger.info(`[DHL-SERVICE] Shipping URL: ${DHL_CONFIG.SHIPPING_URL}`);
logger.info(`[DHL-SERVICE] Warehouse: ${WAREHOUSE_CONFIG.name}, ${WAREHOUSE_CONFIG.street}, ${WAREHOUSE_CONFIG.zip} ${WAREHOUSE_CONFIG.city}, ${WAREHOUSE_CONFIG.country}`);

// ============================================================================
// TOKEN CACHE
// ============================================================================

let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Check if cached token is still valid
 * Validates token exists and hasn't expired (with 60s buffer)
 * @returns {boolean} True if token is valid and not expired
 */
const isTokenValid = () => {
  if (!tokenCache.accessToken || !tokenCache.expiresAt) {
    logger.info('[DHL-SERVICE] Token cache check - No cached token available');
    return false;
  }

  const now = Date.now();
  const expirationTime = tokenCache.expiresAt - DHL_CONFIG.TOKEN_CACHE_BUFFER_MS;
  const isValid = expirationTime > now;

  if (isValid) {
    const remainingSeconds = Math.floor((tokenCache.expiresAt - now) / 1000);
    logger.info(`[DHL-SERVICE] Token cache check - Token is valid, expires in ${remainingSeconds}s`);
  } else {
    logger.info('[DHL-SERVICE] Token cache check - Token has expired or is about to expire');
  }

  return isValid;
};

/**
 * Get valid DHL OAuth2 access token
 * Checks cache first, fetches new token if needed
 * Implements Resource Owner Password Credentials (ROPC) flow
 * Caches token with 60s expiration buffer
 * @returns {Promise<string>} Valid access token
 * @throws {Error} If token retrieval fails
 */
const getValidToken = async () => {
  logger.info('[DHL-SERVICE] getValidToken() called');

  // Check if cached token is still valid
  if (isTokenValid()) {
    logger.info('[DHL-SERVICE] Using cached access token');
    return tokenCache.accessToken;
  }

  logger.info('[DHL-SERVICE] Cached token invalid or missing - fetching new token from DHL');

  // Validate required OAuth2 credentials
  if (!DHL_CONFIG.TOKEN_URL || !DHL_CONFIG.API_KEY || !DHL_CONFIG.API_SECRET || !DHL_CONFIG.USERNAME || !DHL_CONFIG.PASSWORD) {
    logger.error('[DHL-SERVICE] Missing DHL OAuth2 credentials in environment variables');
    throw new Error('DHL OAuth2 credentials not configured: TOKEN_URL, API_KEY, API_SECRET, USERNAME, PASSWORD');
  }

  logger.info(`[DHL-SERVICE] OAuth2 Token Request - URL: ${DHL_CONFIG.TOKEN_URL}`);
  logger.info(`[DHL-SERVICE] OAuth2 Credentials - Username: ${DHL_CONFIG.USERNAME}, Client ID: ${DHL_CONFIG.API_KEY.substring(0, 10)}...`);

  // Prepare OAuth2 ROPC request body
  const tokenRequestBody = new URLSearchParams({
    grant_type: 'password',
    username: DHL_CONFIG.USERNAME,
    password: DHL_CONFIG.PASSWORD,
    client_id: DHL_CONFIG.API_KEY,
    client_secret: DHL_CONFIG.API_SECRET,
  });

  logger.info('[DHL-SERVICE] Sending OAuth2 ROPC token request...');

  try {
    const response = await axios.post(DHL_CONFIG.TOKEN_URL, tokenRequestBody.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    logger.info(`[DHL-SERVICE] OAuth2 token response received - Status: ${response.status}`);

    const tokenData = response.data;

    if (!tokenData.access_token) {
      logger.error('[DHL-SERVICE] OAuth2 response missing access_token field');
      logger.error(`[DHL-SERVICE] Response body: ${JSON.stringify(tokenData)}`);
      throw new Error('OAuth2 response missing access_token');
    }

    const accessToken = String(tokenData.access_token).trim();
    const expiresIn = parseInt(tokenData.expires_in, 10) || 3600; // Default 1 hour
    const expiresAt = Date.now() + expiresIn * 1000;

    logger.info(`[DHL-SERVICE] OAuth2 token received successfully - Expires in ${expiresIn}s`);

    // Cache the token
    tokenCache = {
      accessToken,
      expiresAt,
    };

    logger.info('[DHL-SERVICE] Token cached successfully with 60s expiration buffer');
    return accessToken;
  } catch (error) {
    const status = error.response?.status || 'UNKNOWN';
    const statusText = error.response?.statusText || '';
    const errorMsg = error.message || 'Unknown error';

    logger.error(`[DHL-SERVICE] OAuth2 token request failed - Status: ${status} ${statusText}, Error: ${errorMsg}`);

    if (error.response?.data) {
      logger.error(`[DHL-SERVICE] OAuth2 response body: ${JSON.stringify(error.response.data)}`);
    }

    throw new Error(`DHL OAuth2 token request failed: ${status} ${statusText} - ${errorMsg}`);
  }
};

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * Validate address object has all required fields
 * HARD VALIDATION - throws error without fallbacks
 * Required fields: name, street, postal_code, city
 * Country must be 2-letter ISO code (e.g., 'DE', 'AT', 'CH')
 * @param {Object} address - Address object to validate
 * @param {string} addressType - Type of address ('shipper' or 'recipient') for error messages
 * @returns {Object} Validated address object
 * @throws {Error} If any required field is missing or invalid
 */
const validateAddress = (address, addressType) => {
  const typeStr = String(addressType).trim();

  logger.info(`[DHL-SERVICE] Validating ${typeStr} address...`);

  if (!address || typeof address !== 'object') {
    logger.error(`[DHL-SERVICE] ${typeStr} address is not an object`);
    throw new Error(`${typeStr} address must be an object`);
  }

  // Extract and validate required fields
  const name = String(address.name || '').trim();
  const street = String(address.street || '').trim();
  const postalCode = String(address.postal_code || address.postalCode || '').trim();
  const city = String(address.city || '').trim();
  const country = String(address.country || '').trim().toUpperCase();

  logger.info(`[DHL-SERVICE] ${typeStr} address fields - Name: ${name ? 'OK' : 'MISSING'}, Street: ${street ? 'OK' : 'MISSING'}, PostalCode: ${postalCode ? 'OK' : 'MISSING'}, City: ${city ? 'OK' : 'MISSING'}, Country: ${country ? 'OK' : 'MISSING'}`);

  // HARD VALIDATION - no fallbacks
  if (!name) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Missing 'name' field`);
    throw new Error(`${typeStr} address validation failed: 'name' field is required`);
  }

  if (!street) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Missing 'street' field`);
    throw new Error(`${typeStr} address validation failed: 'street' field is required`);
  }

  if (!postalCode) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Missing 'postal_code' field`);
    throw new Error(`${typeStr} address validation failed: 'postal_code' field is required`);
  }

  if (!city) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Missing 'city' field`);
    throw new Error(`${typeStr} address validation failed: 'city' field is required`);
  }

  if (!country) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Missing 'country' field`);
    throw new Error(`${typeStr} address validation failed: 'country' field is required`);
  }

  // Validate country is 2-letter ISO code
  if (!/^[A-Z]{2}$/.test(country)) {
    logger.error(`[DHL-SERVICE] ${typeStr} address validation failed - Invalid country code: ${country}`);
    throw new Error(`${typeStr} address validation failed: 'country' must be 2-letter ISO code (e.g., 'DE', 'AT', 'CH'), received: ${country}`);
  }

  logger.info(`[DHL-SERVICE] ${typeStr} address validation passed - Name: ${name}, City: ${city}, Country: ${country}`);

  return {
    name,
    street,
    postalCode,
    city,
    country,
  };
};

// ============================================================================
// PRODUCT SELECTION
// ============================================================================

/**
 * Select appropriate DHL product based on destination country
 * Domestic (DE to DE): V01PAK
 * International: V53WPAK
 * @param {string} destinationCountry - 2-letter destination country code
 * @returns {string} DHL product code
 */
const selectProduct = (destinationCountry) => {
  const countryStr = String(destinationCountry).trim().toUpperCase();

  logger.info(`[DHL-SERVICE] Selecting DHL product for destination: ${countryStr}`);

  if (countryStr === 'DE') {
    logger.info(`[DHL-SERVICE] Domestic shipment detected - Using product: ${DHL_CONFIG.PRODUCTS.DOMESTIC}`);
    return DHL_CONFIG.PRODUCTS.DOMESTIC;
  } else {
    logger.info(`[DHL-SERVICE] International shipment detected - Using product: ${DHL_CONFIG.PRODUCTS.INTERNATIONAL}`);
    return DHL_CONFIG.PRODUCTS.INTERNATIONAL;
  }
};

// ============================================================================
// SHIPMENT PAYLOAD BUILDER
// ============================================================================

/**
 * Build DHL shipment payload
 * @param {Object} params - Payload parameters
 * @param {string} params.orderId - Order ID
 * @param {string} params.orderNumber - Order number
 * @param {Object} params.shipper - Validated shipper address
 * @param {Object} params.recipient - Validated recipient address
 * @param {string} params.product - DHL product code
 * @returns {Object} DHL shipment payload
 */
const buildShipmentPayload = (params) => {
  const { orderId, orderNumber, shipper, recipient, product } = params;

  logger.info(`[DHL-SERVICE] Building shipment payload - Order: ${orderNumber}, Product: ${product}`);

  const payload = {
    profile: DHL_CONFIG.PROFILE,
    shipments: [
      {
        product,
        billingNumber: DHL_CONFIG.BILLING_NUMBER,
        refNo: `ORD-${String(orderNumber).slice(-8)}`,
        shipper: {
          name1: shipper.name,
          addressStreet: shipper.street,
          postalCode: shipper.postalCode,
          city: shipper.city,
          country: shipper.country === 'DE' ? 'DEU' : shipper.country,
        },
        consignee: {
          name1: recipient.name,
          addressStreet: recipient.street,
          postalCode: recipient.postalCode,
          city: recipient.city,
          country: recipient.country === 'DE' ? 'DEU' : recipient.country,
        },
        details: {
          weight: { uom: 'g', value: 500 },
          dim: { uom: 'mm', height: 100, length: 200, width: 150 },
        },
        contents: [
          {
            itemDescription: 'Dental Product',
            weight: { uom: 'g', value: 500 },
            netWeight: { uom: 'g', value: 500 },
          },
        ],
      },
    ],
  };

  logger.info(`[DHL-SERVICE] Shipment payload built successfully`);
  logger.info(`[DHL-SERVICE] Payload: ${JSON.stringify(payload, null, 2)}`);

  return payload;
};

// ============================================================================
// MAIN LABEL GENERATION
// ============================================================================

/**
 * Generate DHL shipping label for order
 * Single entry point that orchestrates entire flow:
 * 1. Validate shipper and recipient addresses
 * 2. Get valid OAuth2 token
 * 3. Select appropriate DHL product
 * 4. Build shipment payload
 * 5. Call DHL API with Bearer token
 * 6. Validate response has trackingNumber and labelPdf
 * 7. Return label data
 *
 * @param {Object} orderData - Order data object
 * @param {string} orderData.id - Order ID
 * @param {string} orderData.order_number - Order number
 * @param {Object} orderData.shipper - Shipper address {name, street, postal_code, city, country}
 * @param {Object} orderData.recipient - Recipient address {name, street, postal_code, city, country}
 * @returns {Promise<Object>} Label data: {tracking_number, label_pdf, generated_at, destination_country, product_used}
 * @throws {Error} If any validation or API call fails
 */
export const generateLabel = async (orderData) => {
  const orderId = String(orderData.id || orderData.order_id).trim();
  const orderNumber = String(orderData.order_number).trim();

  logger.info(`[DHL-SERVICE] generateLabel() called - Order: ${orderNumber}`);
  logger.info(`[DHL-SERVICE] Order data: ${JSON.stringify(orderData, null, 2)}`);

  // ========================================================================
  // STEP 1: VALIDATE ADDRESSES
  // ========================================================================
  logger.info('[DHL-SERVICE] STEP 1: Validating shipper and recipient addresses...');

  const shipper = validateAddress(orderData.shipper, 'shipper');
  const recipient = validateAddress(orderData.recipient, 'recipient');

  logger.info(`[DHL-SERVICE] Shipper validated - Name: ${shipper.name}, City: ${shipper.city}`);
  logger.info(`[DHL-SERVICE] Recipient validated - Name: ${recipient.name}, City: ${recipient.city}`);

  // ========================================================================
  // STEP 2: GET VALID OAUTH2 TOKEN
  // ========================================================================
  logger.info('[DHL-SERVICE] STEP 2: Getting valid OAuth2 access token...');

  const accessToken = await getValidToken();
  logger.info(`[DHL-SERVICE] Access token obtained - Length: ${accessToken.length}`);

  // ========================================================================
  // STEP 3: SELECT DHL PRODUCT
  // ========================================================================
  logger.info('[DHL-SERVICE] STEP 3: Selecting DHL product based on destination...');

  const product = selectProduct(recipient.country);
  logger.info(`[DHL-SERVICE] Product selected - Product: ${product}, Destination: ${recipient.country}`);

  // ========================================================================
  // STEP 4: BUILD SHIPMENT PAYLOAD
  // ========================================================================
  logger.info('[DHL-SERVICE] STEP 4: Building DHL shipment payload...');

  const payload = buildShipmentPayload({
    orderId,
    orderNumber,
    shipper,
    recipient,
    product,
  });

  // ========================================================================
  // STEP 5: CALL DHL SHIPPING API
  // ========================================================================
  logger.info('[DHL-SERVICE] STEP 5: Calling DHL Shipping API...');
  logger.info(`[DHL-SERVICE] DHL API URL: ${DHL_CONFIG.SHIPPING_URL}?includeDocs=include&docFormat=PDF`);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'dhl-api-key': DHL_CONFIG.API_KEY,
    'Content-Type': 'application/json',
  };

  logger.info(`[DHL-SERVICE] Request headers - Authorization: Bearer [${accessToken.substring(0, 20)}...], dhl-api-key: [${DHL_CONFIG.API_KEY.substring(0, 10)}...]`);

  try {
    const response = await axios.post(
      `${DHL_CONFIG.SHIPPING_URL}?includeDocs=include&docFormat=PDF`,
      payload,
      {
        headers,
        timeout: 10000,
      }
    );

    logger.info(`[DHL-SERVICE] DHL API response received - Status: ${response.status}`);
    logger.info(`[DHL-SERVICE] Response body: ${JSON.stringify(response.data, null, 2)}`);

    // ========================================================================
    // STEP 6: VALIDATE RESPONSE
    // ========================================================================
    logger.info('[DHL-SERVICE] STEP 6: Validating DHL API response...');

    const data = response.data;

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      logger.error('[DHL-SERVICE] DHL API response validation failed - No items array in response');
      logger.error(`[DHL-SERVICE] Response: ${JSON.stringify(data)}`);
      throw new Error('DHL API response validation failed: missing items array');
    }

    const shipment = data.items[0];
    logger.info(`[DHL-SERVICE] Item object extracted: ${JSON.stringify(shipment, null, 2)}`);

    const trackingNumber = shipment.shipmentNo || null;
    const labelB64 = shipment.label?.b64 || null;

    logger.info(`[DHL-SERVICE] Extracted tracking number: ${trackingNumber}, Has label PDF: ${!!labelB64}`);

    if (!trackingNumber) {
      logger.error('[DHL-SERVICE] DHL API response validation failed - Missing shipmentNo');
      throw new Error('DHL API response validation failed: missing shipmentNo');
    }

    if (!labelB64) {
      logger.error('[DHL-SERVICE] DHL API response validation failed - Missing label PDF (base64)');
      throw new Error('DHL API response validation failed: missing label PDF');
    }

    // ========================================================================
    // STEP 7: CONVERT LABEL TO BUFFER
    // ========================================================================
    logger.info('[DHL-SERVICE] STEP 7: Converting label PDF from base64 to buffer...');

    const labelPdf = Buffer.from(labelB64, 'base64');
    logger.info(`[DHL-SERVICE] Label PDF converted - Size: ${labelPdf.length} bytes`);

    // ========================================================================
    // STEP 8: RETURN LABEL DATA
    // ========================================================================
    logger.info('[DHL-SERVICE] STEP 8: Returning label data...');

    const result = {
      tracking_number: trackingNumber,
      label_pdf: labelPdf,
      generated_at: new Date().toISOString(),
      destination_country: recipient.country,
      product_used: product,
    };

    logger.info(`[DHL-SERVICE] Label generation completed successfully - Order: ${orderNumber}, Tracking: ${trackingNumber}, PDF Size: ${labelPdf.length} bytes`);
    logger.info(`[DHL-SERVICE] Result: ${JSON.stringify(result, null, 2)}`);

    return result;
  } catch (error) {
    const status = error.response?.status || 'UNKNOWN';
    const statusText = error.response?.statusText || '';
    const errorMsg = error.message || 'Unknown error';

    logger.error(`[DHL-SERVICE] DHL API request failed - Status: ${status} ${statusText}, Error: ${errorMsg}`);
    logger.error(`[DHL-SERVICE] Order context - Order: ${orderNumber}, Destination: ${recipient.country}`);

    if (error.response?.data) {
      logger.error(`[DHL-SERVICE] DHL API response body: ${JSON.stringify(error.response.data)}`);
    }

    throw new Error(`DHL label generation failed: ${status} ${statusText} - ${errorMsg}`);
  }
};

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * Legacy function - use generateLabel() instead
 * @deprecated Use generateLabel() instead
 * Reads warehouse data from environment variables: WAREHOUSE_NAME, WAREHOUSE_ADDRESS_STREET,
 * WAREHOUSE_ADDRESS_CITY, WAREHOUSE_ADDRESS_ZIP, WAREHOUSE_ADDRESS_COUNTRY
 */
export const generateDHLLabel = async (order) => {
  logger.warn('[DHL-SERVICE] generateDHLLabel() is deprecated - use generateLabel() instead');

  // Parse shipping address from order
  let shippingAddress = {};
  if (typeof order.shipping_address === 'string') {
    try {
      shippingAddress = JSON.parse(order.shipping_address);
    } catch (parseError) {
      logger.warn(`[DHL-SERVICE] Failed to parse shipping address - Error: ${parseError.message}`);
      shippingAddress = {};
    }
  } else {
    shippingAddress = order.shipping_address || {};
  }

  // Build warehouse address from environment variables
  const shipper = {
    name: WAREHOUSE_CONFIG.name,
    street: WAREHOUSE_CONFIG.street,
    postal_code: WAREHOUSE_CONFIG.zip,
    city: WAREHOUSE_CONFIG.city,
    country: WAREHOUSE_CONFIG.country,
  };

  logger.info(`[DHL-SERVICE] Using warehouse from environment - Name: ${shipper.name}, City: ${shipper.city}`);

  const recipient = {
    name: shippingAddress.name || 'Recipient',
    street: shippingAddress.street || 'Street',
    postal_code: shippingAddress.postalCode || shippingAddress.postal_code || '00000',
    city: shippingAddress.city || 'City',
    country: shippingAddress.country || 'DE',
  };

  const result = await generateLabel({
    id: order.id,
    order_number: order.order_number,
    shipper,
    recipient,
  });

  // Return in legacy format
  return {
    tracking_number: result.tracking_number,
    label_pdf: result.label_pdf,
  };
};