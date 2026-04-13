import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

const EMAIL_SENDERS = {
  order_confirmation: 'info@zahniboerse.com',
  sales_confirmation: 'info@zahniboerse.com',
  verification_notification: 'info@zahniboerse.com',
  verification_approval: 'info@zahniboerse.com',
  verification_rejection: 'info@zahniboerse.com',
  shipping_notification: 'info@zahniboerse.com',
  dhl_label: 'info@zahniboerse.com',
  purchase_notification: 'info@zahniboerse.com',
  newsletter: 'newsletter@zahniboerse.com',
  withdrawal_form: 'info@zahniboerse.com',
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /email/send-order-confirmation
// Send order confirmation email to customer
router.post('/send-order-confirmation', async (req, res) => {
  const { orderId, buyerEmail, sellerEmail } = req.body;

  // Ensure IDs and emails are strings
  const orderIdStr = String(orderId);
  const buyerEmailStr = String(buyerEmail).trim();
  const sellerEmailStr = String(sellerEmail).trim();

  logger.info(`[EMAIL] Send order confirmation - Order: ${orderIdStr}, Buyer: ${buyerEmailStr}`);

  if (!orderIdStr || !buyerEmailStr || !sellerEmailStr) {
    return res.status(400).json({ error: 'Missing required fields: orderId, buyerEmail, sellerEmail' });
  }

  // Validate email formats
  if (!EMAIL_REGEX.test(buyerEmailStr) || !EMAIL_REGEX.test(sellerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Fetch order details
  const order = await pb.collection('orders').getOne(orderIdStr);

  // Send order confirmation email to buyer via PocketBase hooks
  await pb.collection('emails').create({
    recipient: buyerEmailStr,
    type: 'order_confirmation',
    sender: EMAIL_SENDERS.order_confirmation,
    subject: `Order Confirmation - Order #${orderIdStr}`,
    body: `Your order has been confirmed. Order ID: ${orderIdStr}. Total: €${order.total_amount?.toFixed(2) || '0.00'}`,
    metadata: {
      order_id: orderIdStr,
      total_amount: order.total_amount,
    },
    status: 'pending',
  });

  // Send sales confirmation email to seller via PocketBase hooks
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'sales_confirmation',
    sender: EMAIL_SENDERS.sales_confirmation,
    subject: `Sale Confirmed - Order #${orderIdStr}`,
    body: `Your product has been sold. Order ID: ${orderIdStr}. Total: €${order.total_amount?.toFixed(2) || '0.00'}`,
    metadata: {
      order_id: orderIdStr,
      total_amount: order.total_amount,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Order confirmation emails queued - Order: ${orderIdStr}`);
  res.json({ success: true, messageId: `order_${orderIdStr}` });
});

// POST /email/send-verification-approval
// Send product verification approval email to seller
router.post('/send-verification-approval', async (req, res) => {
  const { sellerId, productId, productName, sellerEmail } = req.body;

  // Ensure all values are strings
  const sellerIdStr = String(sellerId);
  const productIdStr = String(productId);
  const productNameStr = String(productName).trim();
  const sellerEmailStr = String(sellerEmail).trim();

  logger.info(`[EMAIL] Send verification approval - Product: ${productIdStr}, Seller: ${sellerIdStr}`);

  if (!sellerIdStr || !productIdStr || !productNameStr || !sellerEmailStr) {
    return res.status(400).json({
      error: 'Missing required fields: sellerId, productId, productName, sellerEmail',
    });
  }

  if (!EMAIL_REGEX.test(sellerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'verification_approval',
    sender: EMAIL_SENDERS.verification_approval,
    subject: `Product Verified - ${productNameStr}`,
    body: `Congratulations! Your product "${productNameStr}" has been verified and is now active on Zahnibörse. Product ID: ${productIdStr}`,
    metadata: {
      seller_id: sellerIdStr,
      product_id: productIdStr,
      product_name: productNameStr,
      verification_status: 'approved',
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Verification approval email queued - Product: ${productIdStr}`);
  res.json({ success: true, messageId: `approval_${productIdStr}` });
});

// POST /email/send-verification-rejection
// Send product verification rejection email to seller
router.post('/send-verification-rejection', async (req, res) => {
  const { sellerId, productId, productName, sellerEmail, reason } = req.body;

  // Ensure all values are strings
  const sellerIdStr = String(sellerId);
  const productIdStr = String(productId);
  const productNameStr = String(productName).trim();
  const sellerEmailStr = String(sellerEmail).trim();
  const reasonStr = reason ? String(reason).trim() : null;

  logger.info(`[EMAIL] Send verification rejection - Product: ${productIdStr}, Seller: ${sellerIdStr}`);

  if (!sellerIdStr || !productIdStr || !productNameStr || !sellerEmailStr) {
    return res.status(400).json({
      error: 'Missing required fields: sellerId, productId, productName, sellerEmail',
    });
  }

  if (!EMAIL_REGEX.test(sellerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'verification_rejection',
    sender: EMAIL_SENDERS.verification_rejection,
    subject: `Product Verification Failed - ${productNameStr}`,
    body: `Unfortunately, your product "${productNameStr}" did not pass verification. ${reasonStr ? `Reason: ${reasonStr}` : 'Please review the product details and try again.'} Product ID: ${productIdStr}`,
    metadata: {
      seller_id: sellerIdStr,
      product_id: productIdStr,
      product_name: productNameStr,
      verification_status: 'rejected',
      rejection_reason: reasonStr,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Verification rejection email queued - Product: ${productIdStr}`);
  res.json({ success: true, messageId: `rejection_${productIdStr}` });
});

// POST /email/send-dhl-label
// Send DHL shipping label to seller
router.post('/send-dhl-label', async (req, res) => {
  const { sellerEmail, productId, productName, trackingNumber, labelUrl, dhlLabel } = req.body;

  // Ensure all values are strings
  const sellerEmailStr = String(sellerEmail).trim();
  const productIdStr = String(productId);
  const productNameStr = String(productName).trim();
  const trackingNumberStr = String(trackingNumber).trim();
  const labelUrlStr = labelUrl ? String(labelUrl).trim() : null;

  logger.info(`[EMAIL] Send DHL label - Product: ${productIdStr}, Seller: ${sellerEmailStr}, Tracking: ${trackingNumberStr}`);

  if (!sellerEmailStr || !productIdStr || !productNameStr || !trackingNumberStr) {
    return res.status(400).json({
      error: 'Missing required fields: sellerEmail, productId, productName, trackingNumber',
    });
  }

  if (!EMAIL_REGEX.test(sellerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'dhl_label',
    sender: EMAIL_SENDERS.dhl_label,
    subject: `DHL Shipping Label - ${productNameStr}`,
    body: `Your DHL shipping label for product verification is ready. Product: ${productNameStr}. Tracking Number: ${trackingNumberStr}. Label URL: ${labelUrlStr || 'See attachment'}`,
    metadata: {
      product_id: productIdStr,
      product_name: productNameStr,
      tracking_number: trackingNumberStr,
      label_url: labelUrlStr,
      dhl_label: dhlLabel,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] DHL label email queued - Product: ${productIdStr}, Tracking: ${trackingNumberStr}`);
  res.json({ success: true, messageId: `dhl_${trackingNumberStr}` });
});

// POST /email/send-purchase-notification
// Send purchase notification email to seller
router.post('/send-purchase-notification', async (req, res) => {
  const { sellerEmail, productId, productName, buyerEmail, orderId } = req.body;

  // Ensure all values are strings
  const sellerEmailStr = String(sellerEmail).trim();
  const productIdStr = String(productId);
  const productNameStr = String(productName).trim();
  const buyerEmailStr = String(buyerEmail).trim();
  const orderIdStr = orderId ? String(orderId) : null;

  logger.info(`[EMAIL] Send purchase notification - Product: ${productIdStr}, Seller: ${sellerEmailStr}`);

  if (!sellerEmailStr || !productIdStr || !productNameStr || !buyerEmailStr) {
    return res.status(400).json({
      error: 'Missing required fields: sellerEmail, productId, productName, buyerEmail',
    });
  }

  if (!EMAIL_REGEX.test(sellerEmailStr) || !EMAIL_REGEX.test(buyerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'purchase_notification',
    sender: EMAIL_SENDERS.purchase_notification,
    subject: `Product Sold - ${productNameStr}`,
    body: `Your product "${productNameStr}" has been purchased by ${buyerEmailStr}. Order ID: ${orderIdStr || 'N/A'}. Please prepare the item for shipment.`,
    metadata: {
      product_id: productIdStr,
      product_name: productNameStr,
      buyer_email: buyerEmailStr,
      order_id: orderIdStr,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Purchase notification email queued - Product: ${productIdStr}`);
  res.json({ success: true, messageId: `purchase_${productIdStr}` });
});

// POST /email/send-shipping-notification
// Send shipping notification email to customer
router.post('/send-shipping-notification', async (req, res) => {
  const { customerEmail, orderId, trackingNumber, labelUrl, productName } = req.body;

  // Ensure all values are strings
  const customerEmailStr = String(customerEmail).trim();
  const orderIdStr = String(orderId);
  const trackingNumberStr = String(trackingNumber).trim();
  const labelUrlStr = labelUrl ? String(labelUrl).trim() : null;
  const productNameStr = productName ? String(productName).trim() : null;

  logger.info(`[EMAIL] Send shipping notification - Order: ${orderIdStr}, Customer: ${customerEmailStr}`);

  if (!customerEmailStr || !orderIdStr || !trackingNumberStr) {
    return res.status(400).json({
      error: 'Missing required fields: customerEmail, orderId, trackingNumber',
    });
  }

  if (!EMAIL_REGEX.test(customerEmailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: customerEmailStr,
    type: 'shipping_notification',
    sender: EMAIL_SENDERS.shipping_notification,
    subject: `Your Order is on the Way - Tracking #${trackingNumberStr}`,
    body: `Your order has been shipped! ${productNameStr ? `Product: ${productNameStr}. ` : ''}Tracking Number: ${trackingNumberStr}. ${labelUrlStr ? `Track your package: ${labelUrlStr}` : 'You can track your package using the tracking number above.'}`,
    metadata: {
      order_id: orderIdStr,
      tracking_number: trackingNumberStr,
      label_url: labelUrlStr,
      product_name: productNameStr,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Shipping notification email queued - Order: ${orderIdStr}`);
  res.json({ success: true, messageId: `shipping_${orderIdStr}` });
});

// POST /email/send-verification-notification (legacy endpoint)
// Send verification notification email to seller
router.post('/send-verification-notification', async (req, res) => {
  const { sellerId, productId, status, adminNotes } = req.body;

  // Ensure all values are strings
  const sellerIdStr = String(sellerId);
  const productIdStr = String(productId);
  const statusStr = String(status).trim();
  const adminNotesStr = adminNotes ? String(adminNotes).trim() : null;

  logger.info(`[EMAIL] Send verification notification - Product: ${productIdStr}, Status: ${statusStr}`);

  if (!sellerIdStr || !productIdStr || !statusStr) {
    return res.status(400).json({
      error: 'Missing required fields: sellerId, productId, status',
    });
  }

  // Fetch seller details
  const seller = await pb.collection('users').getOne(sellerIdStr);

  // Fetch product details
  const product = await pb.collection('products').getOne(productIdStr);

  // Send verification notification email to seller via PocketBase hooks
  await pb.collection('emails').create({
    recipient: seller.email,
    type: 'verification_notification',
    sender: EMAIL_SENDERS.verification_notification,
    subject: `Product Verification Status - ${product.name}`,
    body: `Your product "${product.name}" has been ${statusStr}. ${adminNotesStr ? `Admin Notes: ${adminNotesStr}` : ''}`,
    metadata: {
      seller_id: sellerIdStr,
      product_id: productIdStr,
      verification_status: statusStr,
      admin_notes: adminNotesStr,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Verification notification email queued - Product: ${productIdStr}`);
  res.json({ success: true });
});

// POST /email/send (generic email endpoint)
// Send generic email notification
router.post('/send', async (req, res) => {
  const { recipient_email, email_type, data } = req.body;

  // Ensure all values are strings
  const recipientEmailStr = String(recipient_email).trim();
  const emailTypeStr = String(email_type).trim();

  logger.info(`[EMAIL] Send generic email - Type: ${emailTypeStr}, Recipient: ${recipientEmailStr}`);

  if (!recipientEmailStr || !emailTypeStr || !data) {
    return res.status(400).json({
      error: 'Missing required fields: recipient_email, email_type, data',
    });
  }

  if (!EMAIL_SENDERS[emailTypeStr]) {
    return res.status(400).json({ error: `Invalid email_type: ${emailTypeStr}` });
  }

  // Use PocketBase built-in email service
  const emailRecord = await pb.collection('emails').create({
    recipient: recipientEmailStr,
    type: emailTypeStr,
    sender: EMAIL_SENDERS[emailTypeStr],
    subject: data.subject || `Notification - ${emailTypeStr}`,
    body: data.body || '',
    metadata: data,
    status: 'pending',
  });

  logger.info(`[EMAIL] Generic email queued - Type: ${emailTypeStr}, Recipient: ${recipientEmailStr}`);
  res.json({ success: true, messageId: emailRecord.id });
});

// POST /email/newsletter
// Newsletter signup
router.post('/newsletter', async (req, res) => {
  const { email } = req.body;

  // Ensure email is a string
  const emailStr = String(email).trim();

  logger.info(`[EMAIL] Newsletter signup - Email: ${emailStr}`);

  if (!emailStr) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Validate email format
  if (!EMAIL_REGEX.test(emailStr)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if email already exists in newsletter_signups
  const existingSubscribers = await pb.collection('newsletter_signups').getList(1, 1, {
    filter: `email="${emailStr}"`,
  });

  if (existingSubscribers.items && existingSubscribers.items.length > 0) {
    return res.json({ success: false, message: 'Email already subscribed' });
  }

  // Create new newsletter signup record
  const subscriber = await pb.collection('newsletter_signups').create({
    email: emailStr,
    subscribed_at: new Date().toISOString(),
    status: 'active',
  });

  // Send welcome email
  await pb.collection('emails').create({
    recipient: emailStr,
    type: 'newsletter',
    sender: EMAIL_SENDERS.newsletter,
    subject: 'Willkommen bei Zahnibörse Newsletter',
    body: 'Vielen Dank für Ihre Anmeldung zu unserem Newsletter! Sie erhalten nun regelmäßig Updates und exklusive Angebote.',
    metadata: {
      subscriber_id: subscriber.id,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Newsletter subscriber added - Email: ${emailStr}`);
  res.json({ success: true, message: 'Successfully subscribed to newsletter' });
});

// POST /email/send-withdrawal-form
// Send withdrawal form submission to admin
router.post('/send-withdrawal-form', async (req, res) => {
  const { bestelltAm, erhaltenAm, name, anschrift, unterschrift, datum } = req.body;

  // Ensure all values are strings
  const bestelltAmStr = String(bestelltAm).trim();
  const erhaltenAmStr = String(erhaltenAm).trim();
  const nameStr = String(name).trim();
  const anschriftStr = String(anschrift).trim();
  const unterschriftStr = String(unterschrift).trim();
  const datumStr = String(datum).trim();

  logger.info(`[EMAIL] Send withdrawal form - Name: ${nameStr}, Datum: ${datumStr}`);

  // Validate required fields
  if (!bestelltAmStr || !erhaltenAmStr || !nameStr || !anschriftStr || !unterschriftStr || !datumStr) {
    return res.status(400).json({
      error: 'Missing required fields: bestelltAm, erhaltenAm, name, anschrift, unterschrift, datum',
    });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: 'info@zahniboerse.com',
    type: 'withdrawal_form',
    sender: EMAIL_SENDERS.withdrawal_form,
    subject: `Withdrawal Form Submission - ${nameStr}`,
    body: `New withdrawal form submission received:\n\nName: ${nameStr}\nAddress: ${anschriftStr}\nOrdered Date: ${bestelltAmStr}\nReceived Date: ${erhaltenAmStr}\nSubmission Date: ${datumStr}\n\nSignature: ${unterschriftStr}`,
    metadata: {
      bestelltAm: bestelltAmStr,
      erhaltenAm: erhaltenAmStr,
      name: nameStr,
      anschrift: anschriftStr,
      unterschrift: unterschriftStr,
      datum: datumStr,
    },
    status: 'pending',
  });

  logger.info(`[EMAIL] Withdrawal form email queued - Name: ${nameStr}`);
  res.json({ success: true, message: 'Form submitted successfully' });
});

export default router;