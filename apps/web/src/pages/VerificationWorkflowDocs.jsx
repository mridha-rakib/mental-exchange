import React from 'react';

// This is a documentation component to fulfill Task 10.
// It outlines the end-to-end verification workflow.
const VerificationWorkflowDocs = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto prose">
      <h1>Zahnibörse Verification Workflow Documentation</h1>
      
      <h2>1. Seller Uploads Product</h2>
      <ul>
        <li>Seller navigates to <code>/seller/new-product</code> and fills out the form.</li>
        <li>If the condition is <strong>"Neu"</strong> or <strong>"Wie neu"</strong>, the product is created with <code>status = 'pending_verification'</code>.</li>
        <li>If the condition is "Gut" or "Befriedigend", the product is created with <code>status = 'active'</code> and is immediately visible on the marketplace.</li>
      </ul>

      <h2>2. Verification Payment Flow</h2>
      <ul>
        <li>For "Neu"/"Wie neu" products, the seller is redirected to Step 3 (Payment).</li>
        <li>Seller clicks "15 € bezahlen & Label erhalten".</li>
        <li>Frontend calls <code>POST /verification/pay-fee</code>.</li>
        <li>Backend creates a Stripe Payment Intent, generates a DHL label, and emails the label to the seller.</li>
        <li>Seller prints the label and ships the product to Zahnibörse for physical inspection.</li>
      </ul>

      <h2>3. Admin Approval/Rejection</h2>
      <ul>
        <li>Admin navigates to <code>/admin</code> and opens the <strong>Verifications</strong> tab.</li>
        <li>Admin sees all products with <code>status = 'pending_verification'</code>.</li>
        <li><strong>Approve:</strong> Admin clicks "Freigeben". Frontend calls <code>POST /admin/approve-product</code>. Backend updates status to <code>verified</code> (or <code>active</code>) and sends an approval email to the seller.</li>
        <li><strong>Reject:</strong> Admin clicks "Ablehnen" and provides a reason. Frontend calls <code>POST /admin/reject-product</code>. Backend deletes the product and sends a rejection email to the seller.</li>
      </ul>

      <h2>4. Customer Purchase</h2>
      <ul>
        <li>Verified products appear on the marketplace.</li>
        <li>Customer adds the product to the cart and completes checkout.</li>
        <li>Backend calls <code>POST /email/send-order-confirmation</code> to notify the customer.</li>
        <li>Backend calls <code>POST /email/send-purchase-notification</code> to notify the seller.</li>
        <li>Backend generates a new DHL label with the customer's address and calls <code>POST /email/send-dhl-label</code> to send it to the seller.</li>
        <li>Seller ships the product directly to the customer.</li>
      </ul>

      <h2>5. Cart Functionality</h2>
      <ul>
        <li>Cart state is synced with both PocketBase (<code>cart_items</code> collection) and <code>localStorage</code>.</li>
        <li>This ensures cart persistence across page reloads even for guest users (via local storage) and cross-device sync for logged-in users.</li>
      </ul>
    </div>
  );
};

export default VerificationWorkflowDocs;