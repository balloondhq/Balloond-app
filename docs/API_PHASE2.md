# Balloon'd API Documentation - Phase 2

## Base URL
```
Production: https://api.balloond.com
Development: http://localhost:3000
```

## Authentication
All endpoints require JWT authentication unless specified otherwise.

```http
Authorization: Bearer <jwt_token>
```

---

## 📱 Chat & Messaging

### Send Voice Message
```http
POST /chat/conversations/{chatId}/voice
```

**Request Body:**
```json
{
  "audioData": "base64_encoded_audio",
  "duration": 30,
  "format": "webm"
}
```

**Response:**
```json
{
  "id": "msg_123",
  "chatId": "chat_456",
  "senderId": "user_789",
  "messageType": "VOICE",
  "mediaUrl": "https://s3.amazonaws.com/balloond/voice/...",
  "mediaDuration": 30,
  "createdAt": "2024-12-20T10:00:00Z"
}
```

**Limits:**
- Free tier: 30 seconds max
- Gold/Glowing: 60 seconds max

### Delete Message
```http
DELETE /chat/messages/{messageId}
```

**Response:**
```json
{
  "success": true
}
```

### Register Push Token
```http
POST /chat/push-token
```

**Request Body:**
```json
{
  "token": "expo_push_token_xyz",
  "platform": "IOS" | "ANDROID"
}
```

### Update Typing Status
```http
POST /chat/conversations/{chatId}/typing
```

**Request Body:**
```json
{
  "isTyping": true
}
```

---

## 💳 Subscriptions

### Get Subscription Status
```http
GET /subscriptions/status
```

**Response:**
```json
{
  "tier": "GOLD",
  "isActive": true,
  "expiresAt": "2025-01-20T00:00:00Z",
  "autoRenew": true,
  "platform": "STRIPE",
  "features": {
    "dailyPops": 15,
    "seeWhoLiked": true,
    "voiceMessageDuration": 60,
    "themedBalloons": false,
    "superPops": false,
    "dailyBoosts": false,
    "advancedFilters": true
  }
}
```

### Create Stripe Checkout Session
```http
POST /subscriptions/create-checkout-session
```

**Request Body:**
```json
{
  "tierId": "gold",
  "successUrl": "https://app.balloond.com/subscription-success",
  "cancelUrl": "https://app.balloond.com/subscription-cancel"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_..."
}
```

### Verify Apple Receipt
```http
POST /subscriptions/verify-apple-receipt
```

**Request Body:**
```json
{
  "receipt": "base64_receipt_data",
  "tierId": "gold"
}
```

### Verify Google Purchase
```http
POST /subscriptions/verify-google-purchase
```

**Request Body:**
```json
{
  "purchaseToken": "google_purchase_token",
  "tierId": "glowing",
  "productId": "com.balloond.subscription.glowing"
}
```

### Cancel Subscription
```http
POST /subscriptions/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will end on 2025-01-20"
}
```

### Create Portal Session (Stripe)
```http
POST /subscriptions/create-portal-session
```

**Response:**
```json
{
  "portalUrl": "https://billing.stripe.com/session/..."
}
```

---

## 🛡️ Moderation

### Report Content
```http
POST /moderation/report
```

**Request Body:**
```json
{
  "contentType": "USER" | "MESSAGE",
  "contentId": "user_or_message_id",
  "reason": "harassment",
  "description": "Optional details"
}
```

**Response:**
```json
{
  "id": "report_123",
  "status": "PENDING",
  "createdAt": "2024-12-20T10:00:00Z"
}
```

### Block User
```http
POST /moderation/block
```

**Request Body:**
```json
{
  "userId": "user_to_block"
}
```

### Unblock User
```http
DELETE /moderation/block/{userId}
```

### Get Blocked Users
```http
GET /moderation/blocks
```

**Response:**
```json
[
  {
    "id": "block_123",
    "blockedUserId": "user_456",
    "createdAt": "2024-12-20T10:00:00Z"
  }
]
```

### Verify Profile
```http
POST /moderation/verify-profile
```

**Request Body:**
```json
{
  "selfieData": "base64_encoded_selfie",
  "deviceId": "optional_device_id"
}
```

**Response:**
```json
{
  "verified": true,
  "similarity": 92.5,
  "message": "Profile successfully verified!"
}
```

### Get Verification Status
```http
GET /moderation/verification-status
```

**Response:**
```json
{
  "isVerified": true,
  "verifiedAt": "2024-12-20T10:00:00Z",
  "similarity": 92.5
}
```

### Scan Image for Moderation
```http
POST /moderation/scan-image
```

**Request Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "safe": true,
  "confidence": 0.95,
  "details": {
    "adult": "VERY_UNLIKELY",
    "violence": "VERY_UNLIKELY",
    "racy": "UNLIKELY"
  }
}
```

### Upload Photo with Moderation
```http
POST /moderation/upload-photo
```

**Request Body:**
```json
{
  "photoData": "base64_encoded_image",
  "photoType": "profile",
  "position": 0
}
```

**Response:**
```json
{
  "approved": true,
  "photoUrl": "https://s3.amazonaws.com/balloond/photos/...",
  "moderationResult": {
    "safe": true,
    "confidence": 0.98
  }
}
```

---

## 🔔 WebSocket Events

### Connection
```javascript
const socket = io('wss://api.balloond.com', {
  transports: ['websocket']
});

// Authenticate
socket.emit('authenticate', { userId: 'user_123' });
```

### Chat Events

#### Join Chat Room
```javascript
socket.emit('join-chat', { 
  chatId: 'chat_456',
  userId: 'user_123'
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  chatId: 'chat_456',
  userId: 'user_123',
  content: 'Hello!'
});
```

#### Send Voice Message
```javascript
socket.emit('send-voice-message', {
  chatId: 'chat_456',
  userId: 'user_123',
  audioData: 'base64_audio',
  duration: 30,
  format: 'webm'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  chatId: 'chat_456',
  userId: 'user_123',
  isTyping: true
});
```

#### Mark Messages Read
```javascript
socket.emit('message-read', {
  chatId: 'chat_456',
  userId: 'user_123'
});
```

#### Delete Message
```javascript
socket.emit('delete-message', {
  messageId: 'msg_789',
  userId: 'user_123',
  chatId: 'chat_456'
});
```

### Listening to Events

```javascript
// New text message
socket.on('new-message', (message) => {
  console.log('New message:', message);
});

// New voice message
socket.on('new-voice-message', (message) => {
  console.log('New voice message:', message);
});

// Typing status
socket.on('user-typing', (data) => {
  console.log(`User ${data.userId} typing: ${data.isTyping}`);
});

// Messages read
socket.on('messages-read', (data) => {
  console.log(`Messages read in chat ${data.chatId}`);
});

// Message deleted
socket.on('message-deleted', (data) => {
  console.log(`Message ${data.messageId} deleted`);
});
```

---

## 🔒 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|---------|
| Voice messages | 20/hour | Per user |
| Reports | 10/day | Per user |
| Profile verification | 3/day | Per user |
| Photo uploads | 20/day | Per user |
| Push token registration | 5/hour | Per device |

---

## 📊 Subscription Limits

### Free Tier
- 5 daily balloon pops
- 30-second voice messages
- Basic chat features
- No themed balloons
- No Super Pops
- No daily boosts

### Gold Tier ($9.99/month)
- 15 daily balloon pops
- 60-second voice messages
- See who liked you
- Priority in search
- Advanced filters
- Read receipts

### Glowing Tier ($19.99/month)
- Unlimited balloon pops (fair use: 999/day)
- 60-second voice messages
- All Gold features
- Themed balloon designs
- Super Pops (instant reveal)
- Daily profile boosts
- Priority support

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Voice messages cannot exceed 60 seconds",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Daily pop limit reached. Upgrade to continue.",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Chat not found",
  "error": "Not Found"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests",
  "retryAfter": 3600
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "An unexpected error occurred",
  "error": "Internal Server Error"
}
```

---

## 🧪 Testing

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0000 0000 3220`

### Test Users
```json
{
  "free": {
    "email": "free@test.balloond.com",
    "password": "Test123!"
  },
  "gold": {
    "email": "gold@test.balloond.com",
    "password": "Test123!"
  },
  "glowing": {
    "email": "glowing@test.balloond.com",
    "password": "Test123!"
  }
}
```

### Test Voice Message (Base64)
```
data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2...
```

---

## 📝 Webhook Endpoints

### Stripe Webhooks
```http
POST /webhooks/stripe
```

Events handled:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Apple Server-to-Server Notifications
```http
POST /webhooks/apple
```

### Google Real-time Developer Notifications
```http
POST /webhooks/google
```

---

## 🔗 Related Documentation

- [Stripe Integration Guide](https://stripe.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Google Vision API](https://cloud.google.com/vision/docs)
- [AWS S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
