import 'dotenv/config';
import nodemailer from 'nodemailer';
import logger from './logger.js';

const WAREHOUSE_ADDRESS = {
  name: process.env.WAREHOUSE_NAME || 'Patrick Tchoquessi',
  street: process.env.WAREHOUSE_ADDRESS_STREET || 'Angelika-machynek-Straße 12',
  postalCode: process.env.WAREHOUSE_ADDRESS_ZIP || '60486',
  city: process.env.WAREHOUSE_ADDRESS_CITY || 'Frankfurt',
  country: process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE',
};

// Configure SMTP transporter using Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send email via SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {Array} attachments - Optional array of attachments
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendEmail = async (to, subject, html, attachments = []) => {
  const toStr = String(to).trim();
  const subjectStr = String(subject).trim();
  const htmlStr = String(html).trim();

  logger.info(`[EMAIL-SERVICE] Sending email - To: ${toStr}, Subject: ${subjectStr}, Attachments: ${attachments.length}`);

  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: toStr,
      subject: subjectStr,
      html: htmlStr,
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
      logger.info(`[EMAIL-SERVICE] Email includes ${attachments.length} attachment(s)`);
    }

    const info = await transporter.sendMail(mailOptions);

    logger.info(`[EMAIL-SERVICE] Email sent successfully - Message ID: ${info.messageId}, To: ${toStr}`);
    return info;
  } catch (error) {
    logger.error(`[EMAIL-SERVICE] Email sending failed - Error: ${error.message}, To: ${toStr}`);
    throw error;
  }
};

/**
 * CRITICAL FIX 2: Send order confirmation email to buyer
 * Includes order details: order_number, product name, price, total_amount, shipping_fee, dhl_tracking_number
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {number} order.total_amount - Total order amount
 * @param {number} order.shipping_fee - Shipping fee
 * @param {string} order.dhl_tracking_number - DHL tracking number (optional)
 * @param {Object} product - Product object
 * @param {string} product.name - Product name
 * @param {number} product.price - Product price
 * @param {Object} buyer - Buyer object
 * @param {string} buyer.email - Buyer email
 * @param {string} buyer.name - Buyer name
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendOrderConfirmationToBuyer = async (order, product, buyer) => {
  const orderNumberStr = String(order.order_number).trim();
  const buyerEmailStr = String(buyer.email).trim();
  const buyerNameStr = String(buyer.name || 'Valued Customer').trim();
  const productNameStr = String(product.name).trim();
  const productPrice = parseFloat(product.price) || 0;
  const totalAmount = parseFloat(order.total_amount) || 0;
  const shippingFee = parseFloat(order.shipping_fee) || 0;
  const trackingNumber = order.dhl_tracking_number ? String(order.dhl_tracking_number).trim() : null;

  logger.info(`[EMAIL-SERVICE] Sending order confirmation to buyer - Order: ${orderNumberStr}, Buyer: ${buyerEmailStr}`);

  const trackingSection = trackingNumber
    ? `
    <p style="margin-top: 20px; padding: 12px; background-color: #e8f5e9; border-radius: 5px;">
      <strong>Tracking Number:</strong> ${trackingNumber}<br>
      <a href="https://www.dhl.de/de/en/privatkunden/pakete/paketversand/sendungsverfolgung.html?tracking-id=${trackingNumber}" style="color: #1976d2; text-decoration: none;">Track your package</a>
    </p>
    `
    : '';

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">Order Confirmation</h2>
      
      <p>Hello ${buyerNameStr},</p>
      <p>Thank you for your order! We're excited to get your item to you.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Order Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${orderNumberStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Product:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${productNameStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Product Price:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">€${productPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Shipping Fee:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">€${shippingFee.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>€${totalAmount.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
      
      ${trackingSection}
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Your order will be shipped within 2-3 business days. You will receive a tracking number via email once your item is on its way.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If you have any questions, please contact us at <strong>info@zahniboerse.com</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        Zahnibörse - Your trusted dental marketplace
      </p>
    </div>
  `;

  return sendEmail(buyerEmailStr, `Order Confirmation - Order #${orderNumberStr}`, emailBody);
};

/**
 * CRITICAL FIX 3: Send order notification email to seller
 * Includes product name, buyer name, sale price, total_amount, and DHL label download link
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {number} order.total_amount - Total order amount
 * @param {Object} product - Product object
 * @param {string} product.name - Product name
 * @param {number} product.price - Product price
 * @param {Object} seller - Seller object
 * @param {string} seller.email - Seller email
 * @param {string} seller.name - Seller name
 * @param {string} dhlLabelUrl - DHL label download URL (optional)
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendOrderNotificationToSeller = async (order, product, seller, labelPdfBuffer = null) => {
  const orderNumberStr = String(order.order_number).trim();
  const sellerEmailStr = String(seller.email).trim();
  const sellerNameStr = String(seller.name || 'Seller').trim();
  const productNameStr = String(product.name).trim();
  const productPrice = parseFloat(product.price) || 0;
  const totalAmount = parseFloat(order.total_amount) || 0;

  logger.info(`[EMAIL-SERVICE] Sending order notification to seller - Order: ${orderNumberStr}, Seller: ${sellerEmailStr}`);

  const dhlLabelSection = labelPdfBuffer
    ? `
    <p style="margin-top: 20px; color: #2e7d32; background-color: #e8f5e9; padding: 12px; border-radius: 5px;">
      <strong>DHL label attached:</strong> print the attached PDF and place it on the parcel before drop-off.
    </p>
    `
    : `
    <p style="margin-top: 20px; color: #ff9800; background-color: #fff3cd; padding: 12px; border-radius: 5px;">
      <strong>Note:</strong> The DHL label is not attached yet. Please download it from your seller dashboard.
    </p>
    `;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Congratulations! Your Product Sold</h2>
      
      <p>Hello ${sellerNameStr},</p>
      <p>Great news! Your product has been sold!</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Sale Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Order Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${orderNumberStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Product:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${productNameStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Sale Price:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">€${productPrice.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>€${totalAmount.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
      
      <h3 style="color: #333;">Shipping Instructions</h3>
      <ol style="color: #666;">
        <li>Package your item securely in a box or envelope</li>
        <li>Download and print the DHL label below (or show it on your mobile device)</li>
        <li>Take the package to a DHL location or DHL parcel shop</li>
        <li>Track your package using the tracking number on the label</li>
      </ol>
      
      ${dhlLabelSection}
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Your earnings will be transferred to your account once the buyer confirms receipt of the item.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If you have any questions, please contact us at <strong>info@zahniboerse.com</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        Zahnibörse - Your trusted dental marketplace
      </p>
    </div>
  `;

  const attachments = [];
  if (labelPdfBuffer) {
    attachments.push({
      filename: `DHL_Label_${orderNumberStr}.pdf`,
      content: Buffer.isBuffer(labelPdfBuffer) ? labelPdfBuffer : Buffer.from(labelPdfBuffer),
      contentType: 'application/pdf',
    });
  }

  return sendEmail(sellerEmailStr, `Product Sold! - Order #${orderNumberStr}`, emailBody, attachments);
};

/**
 * CRITICAL FIX 4: Send tracking email to buyer
 * Includes tracking_number, DHL tracking link, and estimated delivery date
 * @param {Object} order - Order object
 * @param {string} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {string} trackingNumber - DHL tracking number
 * @param {string} dhlLabelUrl - DHL tracking URL
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendTrackingEmailToBuyer = async (order, buyerEmail, trackingNumber, dhlLabelUrl) => {
  const orderNumberStr = String(order.order_number).trim();
  const buyerEmailStr = String(buyerEmail || order.buyer_email || '').trim();
  const trackingNumberStr = String(trackingNumber).trim();
  const dhlLabelUrlStr = String(dhlLabelUrl).trim();

  if (!buyerEmailStr) {
    throw new Error(`Missing buyer email for tracking email on order ${orderNumberStr}`);
  }

  logger.info(`[EMAIL-SERVICE] Sending tracking email to buyer - Order: ${orderNumberStr}, Tracking: ${trackingNumberStr}`);

  // Calculate estimated delivery date (2-3 business days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const deliveryDateStr = deliveryDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">Your Order is on the Way!</h2>
      
      <p>Hello,</p>
      <p>Great news! Your order has been shipped and is on its way to you.</p>
      
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2e7d32;">Tracking Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Order Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${orderNumberStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tracking Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${trackingNumberStr}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Estimated Delivery:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${deliveryDateStr}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin-top: 20px; text-align: center;">
        <a href="${dhlLabelUrlStr}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Track Your Package</a>
      </p>
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        You can track your package in real-time using the tracking number above. Click the button above to view detailed tracking information on the DHL website.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If you have any questions, please contact us at <strong>info@zahniboerse.com</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        Zahnibörse - Your trusted dental marketplace
      </p>
    </div>
  `;

  return sendEmail(buyerEmailStr, `Your Order is Shipped - Tracking #${trackingNumberStr}`, emailBody);
};

/**
 * Send order confirmation email with optional DHL label PDF attachment
 * Accepts order data object and DHL label PDF (as Buffer or file)
 * Extracts customer email from order data
 * Builds email with order details (order ID, items, total, shipping info)
 * Attaches DHL label PDF to email using nodemailer attachments
 * Includes error handling - if label is missing, still sends email without attachment
 * @param {Object} order - Order object with order details
 * @param {string} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {string} order.buyer_id - Buyer user ID
 * @param {number} order.total_amount - Total order amount
 * @param {Object} order.shipping_address - Shipping address (string or object)
 * @param {string} buyerEmail - Buyer email address
 * @param {Buffer} labelPdfBuffer - DHL label PDF as Buffer (optional)
 * @returns {Promise<Object>} Success/error status with message ID
 * @throws {Error} If email sending fails
 */
export const sendOrderConfirmationWithLabel = async (order, buyerEmail, labelPdfBuffer) => {
  const orderIdStr = String(order.id || order.order_id).trim();
  const orderNumberStr = String(order.order_number).trim();
  const buyerEmailStr = String(buyerEmail).trim();
  const totalAmountNum = parseFloat(order.total_amount) || 0;

  logger.info(`[EMAIL-SERVICE] Sending order confirmation with optional DHL label - Order: ${orderNumberStr}, Buyer: ${buyerEmailStr}`);

  // Parse shipping address from order
  let shippingAddress = {};
  try {
    shippingAddress = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address || {};
  } catch (parseError) {
    logger.warn(`[EMAIL-SERVICE] Failed to parse shipping address - Error: ${parseError.message}`);
    shippingAddress = {};
  }

  const shippingAddressStr = shippingAddress
    ? `${String(shippingAddress.street || '').trim()}, ${String(shippingAddress.postalCode || '').trim()} ${String(shippingAddress.city || '').trim()}`
    : 'N/A';

  const emailBody = `
    <h2>Bestellbestätigung</h2>
    <p>Hallo,</p>
    <p>Vielen Dank für deine Bestellung! Dein Artikel wird bald versendet.</p>
    
    <p><strong>Bestelldetails:</strong></p>
    <ul>
      <li><strong>Bestellnummer:</strong> ${orderNumberStr}</li>
      <li><strong>Gesamtbetrag:</strong> €${totalAmountNum.toFixed(2)}</li>
    </ul>
    
    <p><strong>Versandadresse:</strong></p>
    <p>${shippingAddressStr}</p>
    
    ${labelPdfBuffer ? `<p style="margin-top: 20px; color: #666; font-size: 14px;">Das DHL-Versandetikett ist dieser E-Mail als PDF-Anhang beigefügt.</p>` : ''}
    
    <p style="color: #666; font-size: 14px;">
      Bei Fragen kontaktiere uns unter: <strong>info@zahniboerse.com</strong>
    </p>
  `;

  // Prepare attachments
  const attachments = [];
  if (labelPdfBuffer) {
    try {
      // Ensure labelPdfBuffer is a Buffer
      const pdfBuffer = Buffer.isBuffer(labelPdfBuffer) ? labelPdfBuffer : Buffer.from(labelPdfBuffer);
      
      attachments.push({
        filename: `DHL_Label_${orderNumberStr}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
      logger.info(`[EMAIL-SERVICE] DHL label PDF attachment prepared - Order: ${orderNumberStr}, Size: ${pdfBuffer.length} bytes`);
    } catch (attachmentError) {
      logger.warn(`[EMAIL-SERVICE] Failed to prepare PDF attachment - Error: ${attachmentError.message}, continuing without attachment`);
      // Continue without attachment - email will still be sent
    }
  } else {
    logger.info(`[EMAIL-SERVICE] No DHL label PDF provided - sending email without attachment`);
  }

  try {
    const info = await sendEmail(buyerEmailStr, `Bestellbestätigung - Bestellung #${orderNumberStr}`, emailBody, attachments);
    logger.info(`[EMAIL-SERVICE] Order confirmation email sent successfully - Order: ${orderNumberStr}, Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      message: `Order confirmation email sent to ${buyerEmailStr}`,
    };
  } catch (error) {
    logger.error(`[EMAIL-SERVICE] Failed to send order confirmation email - Order: ${orderNumberStr}, Error: ${error.message}`);
    throw error;
  }
};

/**
 * Send order confirmation email with DHL label PDF attachment
 * @param {Object} order - Order object with order details
 * @param {string} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {string} order.buyer_email - Buyer email address
 * @param {number} order.total_amount - Total order amount
 * @param {Object} order.shipping_address - Shipping address
 * @param {Buffer} labelPdfBuffer - DHL label PDF as Buffer
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendOrderConfirmationWithDHLLabel = async (order, labelPdfBuffer) => {
  const orderIdStr = String(order.id || order.order_id).trim();
  const orderNumberStr = String(order.order_number).trim();
  const buyerEmailStr = String(order.buyer_email).trim();
  const totalAmountNum = parseFloat(order.total_amount) || 0;

  logger.info(`[EMAIL-SERVICE] Sending order confirmation with DHL label - Order: ${orderNumberStr}, Buyer: ${buyerEmailStr}`);

  // Parse shipping address from order
  let shippingAddress = {};
  try {
    shippingAddress = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address || {};
  } catch (parseError) {
    logger.warn(`[EMAIL-SERVICE] Failed to parse shipping address - Error: ${parseError.message}`);
    shippingAddress = {};
  }

  const shippingAddressStr = shippingAddress
    ? `${String(shippingAddress.street || '').trim()}, ${String(shippingAddress.postalCode || '').trim()} ${String(shippingAddress.city || '').trim()}`
    : 'N/A';

  const emailBody = `
    <h2>Bestellbestätigung</h2>
    <p>Hallo,</p>
    <p>Vielen Dank für deine Bestellung! Dein Artikel wird bald versendet.</p>
    
    <p><strong>Bestelldetails:</strong></p>
    <ul>
      <li><strong>Bestellnummer:</strong> ${orderNumberStr}</li>
      <li><strong>Gesamtbetrag:</strong> €${totalAmountNum.toFixed(2)}</li>
    </ul>
    
    <p><strong>Versandadresse:</strong></p>
    <p>${shippingAddressStr}</p>
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      Das DHL-Versandetikett ist dieser E-Mail als PDF-Anhang beigefügt.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Bei Fragen kontaktiere uns unter: <strong>info@zahniboerse.com</strong>
    </p>
  `;

  // Prepare attachments
  const attachments = [];
  if (labelPdfBuffer) {
    try {
      attachments.push({
        filename: `DHL_Label_${orderNumberStr}.pdf`,
        content: labelPdfBuffer,
        contentType: 'application/pdf',
      });
      logger.info(`[EMAIL-SERVICE] DHL label PDF attachment prepared - Order: ${orderNumberStr}, Size: ${labelPdfBuffer.length} bytes`);
    } catch (attachmentError) {
      logger.error(`[EMAIL-SERVICE] Failed to prepare PDF attachment - Error: ${attachmentError.message}`);
      // Continue without attachment
    }
  }

  return sendEmail(buyerEmailStr, `Bestellbestätigung - Bestellung #${orderNumberStr}`, emailBody, attachments);
};

/**
 * Send verification fee confirmation email to seller
 * Includes DHL label download link, tracking number, warehouse address, and shipping instructions
 * Handles missing labelUrl gracefully
 * @param {string} sellerEmail - Seller email address
 * @param {string} productName - Product name
 * @param {string} trackingNumber - DHL tracking number
 * @param {string} labelUrl - DHL label URL (optional)
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendVerificationFeeEmail = async (sellerEmail, productName, trackingNumber, labelUrl) => {
  const sellerEmailStr = String(sellerEmail).trim();
  const productNameStr = String(productName).trim();
  const trackingNumberStr = String(trackingNumber).trim();
  const labelUrlStr = labelUrl ? String(labelUrl).trim() : null;

  if (!labelUrlStr) {
    logger.info(`[EMAIL-SERVICE] Sending verification fee email without DHL label - Email: ${sellerEmailStr}, Product: ${productNameStr}`);
  } else {
    logger.info(`[EMAIL-SERVICE] Sending verification fee email - Email: ${sellerEmailStr}, Product: ${productNameStr}, Tracking: ${trackingNumberStr}`);
  }

  const labelSection = labelUrlStr
    ? `
    <p style="margin-top: 20px;">
      <a href="${labelUrlStr}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">DHL-Etikett herunterladen</a>
    </p>
    `
    : `
    <p style="margin-top: 20px; color: #ff9800; background-color: #fff3cd; padding: 12px; border-radius: 5px;">
      <strong>Hinweis:</strong> Das DHL-Etikett wird in Kürze verfügbar sein. Bitte überprüfen Sie Ihr Dashboard in wenigen Minuten erneut.
    </p>
    `;

  const emailBody = `
    <h2>Qualitätsprüfung bestätigt</h2>
    <p>Hallo,</p>
    <p>Vielen Dank für deine Zahlung! Dein Produkt "${productNameStr}" ist bereit zur Überprüfung.</p>
    
    <p><strong>Versanddetails:</strong></p>
    <ul>
      <li><strong>Tracking-Nummer:</strong> ${trackingNumberStr}</li>
      <li><strong>Versanddauer:</strong> 2-3 Werktage</li>
    </ul>
    
    <p><strong>Versandanweisungen:</strong></p>
    <ol>
      <li>Verpacke dein Produkt sicher in einem Karton oder Paket</li>
      <li>Drucke das DHL-Etikett aus oder zeige es auf deinem Mobilgerät</li>
      <li>Bringe das Paket zu einer DHL-Filiale oder einem DHL-Paketshop</li>
      <li>Verfolge dein Paket mit der Tracking-Nummer: <strong>${trackingNumberStr}</strong></li>
    </ol>
    
    <p><strong>Versandadresse (Zahnibörse Qualitätsprüfung):</strong></p>
    <p>
      ${WAREHOUSE_ADDRESS.name}<br>
      ${WAREHOUSE_ADDRESS.street}<br>
      ${WAREHOUSE_ADDRESS.postalCode} ${WAREHOUSE_ADDRESS.city}<br>
      ${WAREHOUSE_ADDRESS.country}
    </p>
    
    ${labelSection}
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      Sobald wir dein Produkt erhalten und überprüft haben, wird es auf Zahnibörse aktiviert und kann verkauft werden.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Bei Fragen kontaktiere uns unter: <strong>info@zahniboerse.com</strong>
    </p>
  `;

  return sendEmail(sellerEmailStr, `Qualitätsprüfung bestätigt - ${productNameStr}`, emailBody);
};

/**
 * Send marketplace purchase confirmation email to buyer
 * Includes order details, shipping address, tracking number, and delivery message
 * Handles missing labelUrl gracefully
 * @param {string} buyerEmail - Buyer email address
 * @param {string} productName - Product name
 * @param {string} orderNumber - Order number
 * @param {number} totalAmount - Total order amount
 * @param {Object} shippingAddress - Shipping address object
 * @param {string} trackingNumber - DHL tracking number (optional)
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendMarketplaceBuyerEmail = async (buyerEmail, productName, orderNumber, totalAmount, shippingAddress, trackingNumber) => {
  const buyerEmailStr = String(buyerEmail).trim();
  const productNameStr = String(productName).trim();
  const orderNumberStr = String(orderNumber).trim();
  const totalAmountNum = parseFloat(totalAmount) || 0;
  const trackingNumberStr = trackingNumber ? String(trackingNumber).trim() : null;

  if (!trackingNumberStr) {
    logger.info(`[EMAIL-SERVICE] Sending marketplace buyer email without tracking number - Email: ${buyerEmailStr}, Order: ${orderNumberStr}`);
  } else {
    logger.info(`[EMAIL-SERVICE] Sending marketplace buyer email - Email: ${buyerEmailStr}, Order: ${orderNumberStr}, Tracking: ${trackingNumberStr}`);
  }

  const shippingAddressStr = shippingAddress ? `${String(shippingAddress.street || '').trim()}, ${String(shippingAddress.postalCode || '').trim()} ${String(shippingAddress.city || '').trim()}` : 'N/A';

  const trackingSection = trackingNumberStr
    ? `
    <p><strong>Tracking-Nummer:</strong> ${trackingNumberStr}</p>
    `
    : `
    <p style="color: #ff9800; background-color: #fff3cd; padding: 12px; border-radius: 5px;">
      <strong>Hinweis:</strong> Die Tracking-Nummer wird in Kürze verfügbar sein. Bitte überprüfen Sie Ihr Dashboard in wenigen Minuten erneut.
    </p>
    `;

  const emailBody = `
    <h2>Bestellbestätigung</h2>
    <p>Hallo,</p>
    <p>Vielen Dank für deine Bestellung! Dein Artikel wird bald versendet.</p>
    
    <p><strong>Bestelldetails:</strong></p>
    <ul>
      <li><strong>Bestellnummer:</strong> ${orderNumberStr}</li>
      <li><strong>Produkt:</strong> ${productNameStr}</li>
      <li><strong>Gesamtbetrag:</strong> €${totalAmountNum.toFixed(2)}</li>
    </ul>
    
    <p><strong>Versandadresse:</strong></p>
    <p>${shippingAddressStr}</p>
    
    ${trackingSection}
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      Du erhältst eine weitere E-Mail mit der Tracking-Nummer, sobald dein Artikel versendet wird.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Bei Fragen kontaktiere uns unter: <strong>info@zahniboerse.com</strong>
    </p>
  `;

  return sendEmail(buyerEmailStr, `Bestellbestätigung - Bestellung #${orderNumberStr}`, emailBody);
};

/**
 * Send marketplace purchase confirmation email to seller
 * Includes product name, seller earnings, DHL label link, tracking number, warehouse address, and shipping instructions
 * Handles missing labelUrl gracefully
 * @param {string} sellerEmail - Seller email address
 * @param {string} productName - Product name
 * @param {string} orderNumber - Order number
 * @param {number} sellerEarnings - Seller earnings (after transaction fee)
 * @param {string} trackingNumber - DHL tracking number
 * @param {string} labelUrl - DHL label URL (optional)
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendMarketplaceSellerEmail = async (sellerEmail, productName, orderNumber, sellerEarnings, trackingNumber, labelUrl) => {
  const sellerEmailStr = String(sellerEmail).trim();
  const productNameStr = String(productName).trim();
  const orderNumberStr = String(orderNumber).trim();
  const sellerEarningsNum = parseFloat(sellerEarnings) || 0;
  const trackingNumberStr = String(trackingNumber).trim();
  const labelUrlStr = labelUrl ? String(labelUrl).trim() : null;

  if (!labelUrlStr) {
    logger.info(`[EMAIL-SERVICE] Sending marketplace seller email without DHL label - Email: ${sellerEmailStr}, Order: ${orderNumberStr}`);
  } else {
    logger.info(`[EMAIL-SERVICE] Sending marketplace seller email - Email: ${sellerEmailStr}, Order: ${orderNumberStr}, Earnings: €${sellerEarningsNum.toFixed(2)}`);
  }

  const labelSection = labelUrlStr
    ? `
    <p style="margin-top: 20px;">
      <a href="${labelUrlStr}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">DHL-Etikett herunterladen</a>
    </p>
    `
    : `
    <p style="margin-top: 20px; color: #ff9800; background-color: #fff3cd; padding: 12px; border-radius: 5px;">
      <strong>Hinweis:</strong> Das DHL-Etikett wird in Kürze verfügbar sein. Bitte überprüfen Sie Ihr Dashboard in wenigen Minuten erneut.
    </p>
    `;

  const emailBody = `
    <h2>Glückwunsch! Dein Produkt wurde verkauft</h2>
    <p>Hallo,</p>
    <p>Großartig! Dein Produkt "${productNameStr}" wurde gerade verkauft!</p>
    
    <p><strong>Verkaufsdetails:</strong></p>
    <ul>
      <li><strong>Bestellnummer:</strong> ${orderNumberStr}</li>
      <li><strong>Produkt:</strong> ${productNameStr}</li>
      <li><strong>Dein Verdienst:</strong> €${sellerEarningsNum.toFixed(2)}</li>
    </ul>
    
    <p><strong>Versanddetails:</strong></p>
    <ul>
      <li><strong>Tracking-Nummer:</strong> ${trackingNumberStr}</li>
      <li><strong>Versanddauer:</strong> 2-3 Werktage</li>
    </ul>
    
    <p><strong>Versandanweisungen:</strong></p>
    <ol>
      <li>Verpacke dein Produkt sicher in einem Karton oder Paket</li>
      <li>Drucke das DHL-Etikett aus oder zeige es auf deinem Mobilgerät</li>
      <li>Bringe das Paket zu einer DHL-Filiale oder einem DHL-Paketshop</li>
      <li>Verfolge dein Paket mit der Tracking-Nummer: <strong>${trackingNumberStr}</strong></li>
    </ol>
    
    <p><strong>Versandadresse (Käufer):</strong></p>
    <p>
      Die Versandadresse des Käufers findest du in deinem Zahnibörse-Dashboard unter "Meine Verkäufe".
    </p>
    
    ${labelSection}
    
    <p style="margin-top: 20px; color: #666; font-size: 14px;">
      Dein Verdienst wird auf dein Konto überwiesen, sobald der Käufer die Ware erhalten und bestätigt hat.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Bei Fragen kontaktiere uns unter: <strong>info@zahniboerse.com</strong>
    </p>
  `;

  return sendEmail(sellerEmailStr, `Verkauft! - ${productNameStr} (Bestellung #${orderNumberStr})`, emailBody);
};

/**
 * Send DHL label email to seller (legacy function)
 * Handles missing labelUrl gracefully
 * @param {string} userEmail - Seller email address
 * @param {string} productName - Product name
 * @param {string} trackingNumber - DHL tracking number
 * @param {string} labelUrl - DHL label URL (optional)
 * @returns {Promise<Object>} Nodemailer response
 * @throws {Error} If email sending fails
 */
export const sendDHLLabelEmail = async (userEmail, productName, trackingNumber, labelUrl) => {
  return sendVerificationFeeEmail(userEmail, productName, trackingNumber, labelUrl);
};
