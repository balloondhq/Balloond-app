# Testing Documentation - Balloon'd

## Test Coverage

The project includes comprehensive test coverage for both backend and frontend components.

## Backend Testing

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

### Test Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.spec.ts
│   │   │   └── auth.controller.spec.ts
│   │   ├── users/
│   │   │   ├── users.service.spec.ts
│   │   │   └── users.controller.spec.ts
│   │   └── matching/
│   │       ├── matching.service.spec.ts
│   │       └── matching.controller.spec.ts
│   └── app.controller.spec.ts
└── test/
    └── app.e2e-spec.ts
```

### Key Test Scenarios

#### Authentication Tests
- User registration with valid data
- Duplicate email prevention
- Login with correct credentials
- Login with incorrect credentials
- JWT token generation
- Token refresh functionality
- OAuth login flow

#### User Management Tests
- Profile creation
- Profile updates
- Location updates
- Photo uploads
- Nearby user queries
- Age preference filtering

#### Matching Tests
- Balloon grid generation
- Single pop functionality
- Double pop functionality
- Match creation
- Daily balloon allocation
- Premium vs free limits

#### Chat Tests
- Message sending
- Message retrieval
- Read receipts
- Real-time messaging
- Typing indicators

## Frontend Testing

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test BalloonGrid.test.tsx
```

### Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── __tests__/
│   ├── screens/
│   │   └── __tests__/
│   └── services/
│       └── __tests__/
└── __tests__/
    └── App.test.tsx
```

### Key Test Scenarios

#### Component Tests
- Balloon animation rendering
- Pop interaction handling
- Navigation between screens
- Form validation
- Error message display

#### Screen Tests
- Welcome screen navigation
- Login form submission
- Signup form validation
- Profile setup flow
- Location permission handling

#### Service Tests
- API call mocking
- Authentication flow
- Error handling
- WebSocket connection
- Location service

## Integration Testing

### Database Tests

```bash
# Reset test database
npm run db:reset

# Run migration tests
npm run test:migrations

# Seed test data
npm run db:seed:test
```

### API Integration Tests

```javascript
describe('User Flow Integration', () => {
  it('should complete full user journey', async () => {
    // 1. Register user
    const signup = await request(app)
      .post('/api/auth/signup')
      .send(userData);
    
    // 2. Update profile
    const profile = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .send(profileData);
    
    // 3. Update location
    const location = await request(app)
      .put('/api/users/location')
      .set('Authorization', `Bearer ${signup.body.token}`)
      .send(locationData);
    
    // 4. Get balloons
    const balloons = await request(app)
      .get('/api/matching/balloons')
      .set('Authorization', `Bearer ${signup.body.token}`);
    
    expect(balloons.body).toBeInstanceOf(Array);
  });
});
```

## Performance Testing

### Load Testing with Artillery

Create `artillery.yml`:
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'User Flow'
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'password123'
      - get:
          url: '/api/matching/balloons'
```

Run load test:
```bash
artillery run artillery.yml
```

## Security Testing

### OWASP ZAP Scan

```bash
# Run security scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

### Dependency Vulnerability Check

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Mobile App Testing

### iOS Testing

```bash
# Run on iOS Simulator
cd frontend
npx expo start --ios

# Run detox tests
detox test -c ios
```

### Android Testing

```bash
# Run on Android Emulator
cd frontend
npx expo start --android

# Run detox tests
detox test -c android
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run frontend tests
        run: cd frontend && npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Data Management

### Seed Data

```javascript
// backend/prisma/seed.ts
const testUsers = [
  {
    email: 'alice@test.com',
    name: 'Alice Test',
    age: 25,
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    email: 'bob@test.com',
    name: 'Bob Test',
    age: 28,
    latitude: 51.5174,
    longitude: -0.1378,
  },
];

async function seed() {
  for (const user of testUsers) {
    await prisma.user.create({ data: user });
  }
}
```

## Debugging Tests

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend Tests",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Test Coverage Goals

- Unit test coverage: >80%
- Integration test coverage: >70%
- E2E test coverage: Critical user flows
- Performance: <200ms API response time
- Security: No critical vulnerabilities
