import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DHL_TOKEN_URL = 'https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token';
process.env.DHL_SHIPPING_URL = 'https://api-sandbox.dhl.com/parcel/de/shipping/v2/orders/';
process.env.DHL_API_KEY = 'test-client-id';
process.env.DHL_API_SECRET = 'test-client-secret';
process.env.DHL_USERNAME = 'user-valid';
process.env.DHL_PASSWORD = 'SandboxPasswort2023!';
process.env.DHL_BILLING_NUMBER = '33333333330101';
process.env.DHL_BILLING_NUMBER_INTERNATIONAL = '33333333335301';

const { __private } = await import('../src/utils/dhlService.js');

test('converts app country codes to DHL alpha-3 country codes', () => {
  assert.equal(__private.toDhlCountryCode('DE'), 'DEU');
  assert.equal(__private.toDhlCountryCode('Germany'), 'DEU');
  assert.equal(__private.toDhlCountryCode('Deutschland'), 'DEU');
  assert.equal(__private.toDhlCountryCode('at'), 'AUT');
  assert.equal(__private.toDhlCountryCode('GBR'), 'GBR');
  assert.throws(() => __private.toDhlCountryCode('XX'), /Unsupported DHL country code/);
});

test('keeps international labels disabled unless explicitly configured', () => {
  delete process.env.DHL_ALLOW_INTERNATIONAL;

  assert.equal(__private.selectProduct('Germany'), 'V01PAK');
  assert.equal(__private.selectProduct('DE'), 'V01PAK');
  assert.throws(() => __private.selectProduct('AT'), /International DHL labels are disabled/);

  process.env.DHL_ALLOW_INTERNATIONAL = 'true';
  assert.equal(__private.selectProduct('AT'), 'V53WPAK');
  delete process.env.DHL_ALLOW_INTERNATIONAL;
});

test('builds a domestic DHL payload with domestic billing number', () => {
  const payload = __private.buildShipmentPayload({
    orderId: 'order_123',
    orderNumber: 'ORD-123',
    product: 'V01PAK',
    shipper: {
      name: 'Seller',
      street: 'Main Street 1',
      postalCode: '60486',
      city: 'Frankfurt',
      country: 'DE',
    },
    recipient: {
      name: 'Buyer',
      street: 'Other Street 2',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
    },
    parcel: {
      weight_g: 750,
      length_mm: 220,
      width_mm: 160,
      height_mm: 110,
    },
  });

  assert.equal(payload.shipments[0].product, 'V01PAK');
  assert.equal(payload.shipments[0].billingNumber, '33333333330101');
  assert.equal(payload.shipments[0].shipper.country, 'DEU');
  assert.equal(payload.shipments[0].consignee.country, 'DEU');
  assert.equal(payload.shipments[0].details.weight.value, 750);
});

test('builds an international DHL payload with international billing number', () => {
  const payload = __private.buildShipmentPayload({
    orderId: 'order_456',
    orderNumber: 'ORD-456',
    product: 'V53WPAK',
    shipper: {
      name: 'Seller',
      street: 'Main Street 1',
      postalCode: '60486',
      city: 'Frankfurt',
      country: 'DE',
    },
    recipient: {
      name: 'Buyer',
      street: 'Ringstrasse 2',
      postalCode: '1010',
      city: 'Vienna',
      country: 'AT',
    },
    parcel: {
      weight_g: 600,
    },
  });

  assert.equal(payload.shipments[0].product, 'V53WPAK');
  assert.equal(payload.shipments[0].billingNumber, '33333333335301');
  assert.equal(payload.shipments[0].shipper.country, 'DEU');
  assert.equal(payload.shipments[0].consignee.country, 'AUT');
  assert.equal(payload.shipments[0].details.weight.value, 600);
});

test('requires parcel weight unless an approved default is configured', () => {
  delete process.env.DHL_DEFAULT_PARCEL_WEIGHT_G;

  assert.throws(() => __private.normalizeParcelDetails({}), /weight is required/);

  process.env.DHL_DEFAULT_PARCEL_WEIGHT_G = '500';
  assert.equal(__private.normalizeParcelDetails({}).weight, 500);
  delete process.env.DHL_DEFAULT_PARCEL_WEIGHT_G;
});

test('classifies ambiguous network failures separately from validation failures', () => {
  assert.deepEqual(
    __private.classifyDhlError({ code: 'ECONNABORTED', message: 'timeout' }),
    {
      type: 'network',
      retryable: true,
      ambiguous: true,
      status: null,
      message: 'timeout',
    }
  );

  assert.equal(__private.classifyDhlError({ response: { status: 400 }, message: 'bad request' }).retryable, false);
  assert.equal(__private.classifyDhlError({ response: { status: 429 }, message: 'limited' }).retryable, true);
});

test('sanitizes DHL response logs without label base64 content', () => {
  const summary = __private.sanitizeDhlResponseForLog({
    items: [
      {
        shipmentNo: '00340434123456789012',
        label: {
          b64: 'PDF_BASE64_SHOULD_NOT_BE_LOGGED',
          url: 'https://example.test/label.pdf',
        },
      },
    ],
  });

  assert.equal(summary.itemCount, 1);
  assert.equal(summary.items[0].shipmentNo, '00340434123456789012');
  assert.equal(summary.items[0].hasLabel, true);
  assert.equal(JSON.stringify(summary).includes('PDF_BASE64_SHOULD_NOT_BE_LOGGED'), false);
});
