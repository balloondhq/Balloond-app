# API Documentation - Balloon'd

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.balloond.com/api`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isVerified": false
  },
  "token": "jwt-token"
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token"
}
```

### Users

#### GET /users/profile
Get current user's profile. (Protected)

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "bio": "Love hiking and coffee",
  "age": 28,
  "photos": ["url1", "url2"],
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 50
}
```

#### PUT /users/profile
Update user profile. (Protected)

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "age": 29,
  "minAge": 21,
  "maxAge": 35
}
```

#### PUT /users/location
Update user location. (Protected)

**Request Body:**
```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 50
}
```

### Matching

#### GET /matching/balloons
Get available balloons (nearby users). (Protected)

**Response:**
```json
[
  {
    "userId": "uuid",
    "isPopped": false,
    "popType": null,
    "preview": null
  },
  {
    "userId": "uuid",
    "isPopped": true,
    "popType": "SINGLE",
    "preview": {
      "photos": ["blurred-url"],
      "name": "J***"
    }
  }
]
```

#### POST /matching/pop
Pop a balloon. (Protected)

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "popType": "SINGLE" // or "DOUBLE"
}
```

#### GET /matching/matches
Get all matches. (Protected)

**Response:**
```json
[
  {
    "id": "uuid",
    "otherUser": {
      "id": "uuid",
      "name": "Jane Smith",
      "photos": ["url1", "url2"],
      "bio": "Adventure seeker"
    },
    "chatId": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Chat

#### GET /chat/conversations
Get all chat conversations. (Protected)

**Response:**
```json
[
  {
    "id": "uuid",
    "otherUser": {
      "id": "uuid",
      "name": "Jane Smith",
      "photos": ["url1"],
      "lastSeen": "2024-01-15T10:30:00Z"
    },
    "lastMessage": {
      "content": "Hey there!",
      "createdAt": "2024-01-15T10:30:00Z",
      "senderId": "uuid"
    },
    "unreadCount": 2
  }
]
```

#### GET /chat/conversations/:chatId/messages
Get messages in a chat. (Protected)

**Response:**
```json
[
  {
    "id": "uuid",
    "chatId": "uuid",
    "senderId": "uuid",
    "content": "Hello!",
    "messageType": "TEXT",
    "isRead": true,
    "sender": {
      "id": "uuid",
      "name": "John Doe",
      "photos": ["url1"]
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /chat/conversations/:chatId/messages
Send a message. (Protected)

**Request Body:**
```json
{
  "content": "Hi there!",
  "messageType": "TEXT"
}
```

### Location

#### GET /location/nearby
Get nearby users. (Protected)

**Query Parameters:**
- `radius` (optional): Search radius in km

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Jane Smith",
    "photos": ["url1", "url2"],
    "bio": "Coffee enthusiast",
    "age": 26,
    "distance": 2.5
  }
]
```

## WebSocket Events

Connect to WebSocket at `ws://localhost:3000` (or production URL).

### Client Events

#### authenticate
```json
{
  "userId": "uuid"
}
```

#### join-chat
```json
{
  "chatId": "uuid",
  "userId": "uuid"
}
```

#### send-message
```json
{
  "chatId": "uuid",
  "userId": "uuid",
  "content": "Hello!"
}
```

#### typing
```json
{
  "chatId": "uuid",
  "userId": "uuid",
  "isTyping": true
}
```

### Server Events

#### authenticated
```json
{
  "success": true
}
```

#### new-message
```json
{
  "id": "uuid",
  "chatId": "uuid",
  "senderId": "uuid",
  "content": "Hello!",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### user-typing
```json
{
  "userId": "uuid",
  "isTyping": true
}
```

## Error Responses

All errors follow this format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

Common status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error
