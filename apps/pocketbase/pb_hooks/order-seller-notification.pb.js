/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  // Fetch seller from users collection
  const seller = $app.findRecordById("users", e.record.get("seller_id"));
  
  if (!seller) {
    e.next();
    return;
  }
  
  const sellerEmail = seller.get("email");
  
  // Build email body with order details
  const orderNumber = e.record.get("order_number");
  const buyerId = e.record.get("buyer_id");
  const productId = e.record.get("product_id");
  const quantity = e.record.get("quantity") || 1;
  const price = e.record.get("price") || 0;
  const shippingFee = e.record.get("shipping_fee") || 0;
  const serviceFee = e.record.get("service_fee") || 0;
  const totalAmount = e.record.get("total_amount") || 0;
  const trackingNumber = e.record.get("tracking_number") || "Pending";
  const shippingAddress = e.record.get("shipping_address");
  
  // Format shipping address
  let addressHtml = "<p><strong>Lieferadresse:</strong><br>";
  if (shippingAddress && typeof shippingAddress === "object") {
    addressHtml += (shippingAddress.full_name || "") + "<br>";
    addressHtml += (shippingAddress.street_address || "") + "<br>";
    addressHtml += (shippingAddress.postal_code || "") + " " + (shippingAddress.city || "") + "<br>";
    addressHtml += (shippingAddress.country || "") + "</p>";
  } else {
    addressHtml += "Adresse nicht verfügbar</p>";
  }
  
  // Build HTML email body
  const htmlBody = `
    <h2>Neue Bestellung auf Zahnibörse</h2>
    <p><strong>Bestellnummer:</strong> ${orderNumber}</p>
    
    <h3>Bestelldetails</h3>
    <ul>
      <li><strong>Produkt-ID:</strong> ${productId}</li>
      <li><strong>Menge:</strong> ${quantity}</li>
      <li><strong>Preis pro Einheit:</strong> €${price.toFixed(2)}</li>
      <li><strong>Versandgebühr:</strong> €${shippingFee.toFixed(2)}</li>
      <li><strong>Servicegebühr:</strong> €${serviceFee.toFixed(2)}</li>
      <li><strong>Gesamtbetrag:</strong> €${totalAmount.toFixed(2)}</li>
    </ul>
    
    ${addressHtml}
    
    <h3>Versandinformationen</h3>
    <p><strong>Tracking-Nummer:</strong> ${trackingNumber}</p>
    
    <p>
      <a href="https://zahniboerse.com/orders/${e.record.id}/dhl-label" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        DHL-Label herunterladen
      </a>
    </p>
    
    <p>Vielen Dank für Ihren Verkauf auf Zahnibörse!</p>
  `;
  
  // Send email
  const message = new MailerMessage({
    from: {
      address: "info@zahniboerse.com",
      name: "Zahnibörse"
    },
    to: [{ address: sellerEmail }],
    subject: "Neue Bestellung auf Zahnibörse - " + orderNumber,
    html: htmlBody
  });
  
  $app.newMailClient().send(message);
  e.next();
}, "orders");