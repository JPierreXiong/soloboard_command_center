# Creem Payment Integration Guide

## Overview
SoloBoard now uses Creem as the primary payment provider for subscription management.

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Creem Payment Configuration
CREEM_API_KEY=creem_test_Cx3RAlX8dwkGCTeF8nw2x
CREEM_SIGNING_SECRET=your-webhook-signing-secret
CREEM_ENVIRONMENT=sandbox  # or 'production'
```

### 2. Product IDs

The following Creem product IDs are configured:

- **Base Plan ($19.9/month)**: `prod_3i3wLrjX9sQiwts95zv1FG`
  - Payment URL: https://www.creem.io/test/payment/prod_3i3wLrjX9sQiwts95zv1FG

- **Pro Plan ($39.9/month)**: `prod_n1rGx5cxwauihvqwWRHxi`
  - Payment URL: https://www.creem.io/test/payment/prod_n1rGx5cxwauihvqwWRHxi

### 3. Pricing Configuration

Product IDs are stored in pricing JSON files:

- `src/config/locale/messages/en/pricing.json`
- `src/config/locale/messages/zh/pricing.json`
- `src/config/locale/messages/fr/pricing.json`

Each pricing item includes:
```json
{
  "payment_product_id": "prod_3i3wLrjX9sQiwts95zv1FG",
  "amount": 1990,
  "price": "$19.9"
}
```

## Implementation

### 1. Payment Provider Setup

The Creem provider is initialized in `/src/app/api/payment/create/route.ts`:

```typescript
import { createCreemProvider } from '@/extensions/payment';

const creemProvider = createCreemProvider({
  apiKey: process.env.CREEM_API_KEY,
  signingSecret: process.env.CREEM_SIGNING_SECRET,
  environment: process.env.CREEM_ENVIRONMENT || 'sandbox'
});

paymentManager.addProvider(creemProvider, true); // Set as default
```

### 2. Creating Payment Sessions

To create a payment with Creem:

```typescript
const response = await fetch('/api/payment/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'creem',
    productId: 'prod_3i3wLrjX9sQiwts95zv1FG', // Required for Creem
    type: 'subscription',
    plan: {
      name: 'SoloBoard Base'
    },
    metadata: {
      userId: 'user_123',
      planName: 'Base'
    }
  })
});

const { checkoutUrl } = await response.json();
window.location.href = checkoutUrl;
```

### 3. Payment Component Usage

Use the `PaymentSelector` component with product ID:

```tsx
import { PaymentSelector } from '@/components/payment/payment-selector';

<PaymentSelector
  amount={1990}
  currency="USD"
  productId="prod_3i3wLrjX9sQiwts95zv1FG"
  planName="Base"
/>
```

## Webhook Configuration

### 1. Webhook Endpoint

Creem webhooks are handled at: `/api/payment/notify/creem`

### 2. Webhook Events

The following events are processed:

- `checkout.completed` - Payment checkout completed
- `subscription.paid` - Subscription payment received
- `subscription.update` - Subscription updated
- `subscription.paused` - Subscription paused
- `subscription.active` - Subscription activated
- `subscription.canceled` - Subscription canceled

### 3. Webhook Signature Verification

Webhooks are verified using HMAC-SHA256:

```typescript
const signature = req.headers.get('creem-signature');
const computedSignature = await generateSignature(
  rawBody,
  process.env.CREEM_SIGNING_SECRET
);

if (computedSignature !== signature) {
  throw new Error('Invalid webhook signature');
}
```

## Testing

### Test Mode

1. Use the test API key: `creem_test_Cx3RAlX8dwkGCTeF8nw2x`
2. Set environment to `sandbox`
3. Use test product URLs:
   - Base: https://www.creem.io/test/payment/prod_3i3wLrjX9sQiwts95zv1FG
   - Pro: https://www.creem.io/test/payment/prod_n1rGx5cxwauihvqwWRHxi

### Test Cards

Use Creem's test card numbers for testing payments.

## Production Deployment

### 1. Update Environment Variables

```bash
CREEM_API_KEY=creem_live_...
CREEM_ENVIRONMENT=production
```

### 2. Update Product IDs

Replace test product IDs with production product IDs in pricing JSON files.

### 3. Configure Webhook URL

Set your production webhook URL in Creem dashboard:
```
https://yourdomain.com/api/payment/notify/creem
```

## Features

### Subscription Management

- ✅ Create subscriptions
- ✅ Cancel subscriptions
- ✅ Update subscriptions
- ✅ Customer portal access
- ✅ Webhook notifications

### Payment Features

- ✅ One-time payments
- ✅ Recurring subscriptions
- ✅ Discount codes
- ✅ Custom fields
- ✅ Metadata support

## API Reference

### Create Payment

```typescript
POST /api/payment/create
{
  "provider": "creem",
  "productId": "prod_xxx",
  "type": "subscription",
  "plan": { "name": "Plan Name" },
  "metadata": { "userId": "user_123" }
}
```

### Get Payment Status

```typescript
GET /api/payment/create?sessionId=xxx&provider=creem
```

### Cancel Subscription

```typescript
POST /api/payment/cancel
{
  "subscriptionId": "sub_xxx",
  "provider": "creem"
}
```

## Troubleshooting

### Common Issues

1. **"productId is required"**
   - Ensure you're passing `productId` when using Creem
   - Check that the product ID exists in Creem dashboard

2. **"Invalid webhook signature"**
   - Verify `CREEM_SIGNING_SECRET` is correct
   - Check that webhook payload is not modified

3. **"Payment creation failed"**
   - Verify API key is valid
   - Check environment setting (sandbox vs production)
   - Ensure product ID is correct

## Support

- Creem Documentation: https://docs.creem.io/
- Creem Dashboard: https://www.creem.io/dashboard
- SoloBoard Issues: https://github.com/yourusername/soloboard/issues


