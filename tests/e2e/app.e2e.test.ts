import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Test data generator
class TestDataGenerator {
  static generateUser() {
    return {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 65 }),
      bio: faker.lorem.paragraph(),
    };
  }
}

// Page Object Models
class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/login`);
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async expectError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
  }
}

class SignupPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/signup`);
  }

  async fillBasicInfo(user: any) {
    await this.page.fill('[data-testid="name-input"]', user.name);
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.fill('[data-testid="confirm-password-input"]', user.password);
  }

  async selectBirthDate(date: Date) {
    await this.page.click('[data-testid="birthdate-picker"]');
    await this.page.selectOption('[data-testid="year-select"]', date.getFullYear().toString());
    await this.page.selectOption('[data-testid="month-select"]', (date.getMonth() + 1).toString());
    await this.page.selectOption('[data-testid="day-select"]', date.getDate().toString());
  }

  async agreeToTerms() {
    await this.page.check('[data-testid="terms-checkbox"]');
    await this.page.check('[data-testid="age-verification-checkbox"]');
  }

  async submit() {
    await this.page.click('[data-testid="signup-button"]');
  }
}

class BalloonGridPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/balloons`);
  }

  async waitForBalloons() {
    await this.page.waitForSelector('[data-testid="balloon-grid"]');
  }

  async popBalloon(index: number) {
    await this.page.click(`[data-testid="balloon-${index}"]`);
    await this.page.waitForSelector('[data-testid="profile-reveal"]');
  }

  async swipeRight() {
    await this.page.click('[data-testid="like-button"]');
  }

  async swipeLeft() {
    await this.page.click('[data-testid="pass-button"]');
  }

  async getRevealedProfile() {
    return {
      name: await this.page.textContent('[data-testid="profile-name"]'),
      bio: await this.page.textContent('[data-testid="profile-bio"]'),
      age: await this.page.textContent('[data-testid="profile-age"]'),
    };
  }
}

class ChatPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/chat`);
  }

  async selectConversation(index: number) {
    await this.page.click(`[data-testid="conversation-${index}"]`);
  }

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="message-input"]', message);
    await this.page.click('[data-testid="send-button"]');
  }

  async expectMessage(message: string) {
    await expect(this.page.locator(`[data-testid="message"]:has-text("${message}")`)).toBeVisible();
  }

  async sendVoiceMessage() {
    await this.page.click('[data-testid="voice-button"]');
    await this.page.waitForTimeout(2000); // Simulate recording
    await this.page.click('[data-testid="stop-recording"]');
  }
}

class SubscriptionPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(`${BASE_URL}/subscription`);
  }

  async selectPlan(plan: 'monthly' | 'yearly') {
    await this.page.click(`[data-testid="${plan}-plan"]`);
  }

  async enterPaymentDetails(cardNumber: string, expiry: string, cvv: string) {
    await this.page.fill('[data-testid="card-number"]', cardNumber);
    await this.page.fill('[data-testid="card-expiry"]', expiry);
    await this.page.fill('[data-testid="card-cvv"]', cvv);
  }

  async completePurchase() {
    await this.page.click('[data-testid="purchase-button"]');
    await this.page.waitForSelector('[data-testid="purchase-success"]');
  }
}

// Test Suites
test.describe('Authentication Flow', () => {
  test('User can sign up successfully', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const user = TestDataGenerator.generateUser();
    
    await signupPage.navigate();
    await signupPage.fillBasicInfo(user);
    await signupPage.selectBirthDate(new Date(2000, 0, 1));
    await signupPage.agreeToTerms();
    await signupPage.submit();
    
    // Should redirect to onboarding
    await expect(page).toHaveURL(/.*onboarding/);
  });

  test('User cannot sign up if under 18', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const user = TestDataGenerator.generateUser();
    
    await signupPage.navigate();
    await signupPage.fillBasicInfo(user);
    await signupPage.selectBirthDate(new Date(2010, 0, 1)); // Under 18
    await signupPage.agreeToTerms();
    await signupPage.submit();
    
    // Should show age verification error
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
  });

  test('User can log in successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'TestPassword123!');
    
    // Should redirect to main app
    await expect(page).toHaveURL(/.*balloons/);
  });

  test('Invalid login shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigate();
    await loginPage.login('invalid@example.com', 'wrongpassword');
    
    await loginPage.expectError('Invalid email or password');
  });
});

test.describe('Balloon Pop Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'TestPassword123!');
  });

  test('User can pop balloons and swipe', async ({ page }) => {
    const balloonPage = new BalloonGridPage(page);
    
    await balloonPage.navigate();
    await balloonPage.waitForBalloons();
    
    // Pop first balloon
    await balloonPage.popBalloon(0);
    
    // Check profile is revealed
    const profile = await balloonPage.getRevealedProfile();
    expect(profile.name).toBeTruthy();
    expect(profile.bio).toBeTruthy();
    
    // Swipe right
    await balloonPage.swipeRight();
    
    // Next balloon should be ready
    await expect(page.locator('[data-testid="balloon-1"]')).toBeVisible();
  });

  test('Free user hits pop limit', async ({ page }) => {
    const balloonPage = new BalloonGridPage(page);
    
    await balloonPage.navigate();
    await balloonPage.waitForBalloons();
    
    // Pop 3 balloons (free limit)
    for (let i = 0; i < 3; i++) {
      await balloonPage.popBalloon(i);
      await balloonPage.swipeLeft();
    }
    
    // Should show paywall
    await expect(page.locator('[data-testid="paywall"]')).toBeVisible();
  });
});

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'TestPassword123!');
  });

  test('User can send and receive messages', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    await chatPage.navigate();
    await chatPage.selectConversation(0);
    
    const message = 'Hello, this is a test message!';
    await chatPage.sendMessage(message);
    
    await chatPage.expectMessage(message);
  });

  test('User can send voice messages', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    await chatPage.navigate();
    await chatPage.selectConversation(0);
    
    await chatPage.sendVoiceMessage();
    
    // Check voice message appears
    await expect(page.locator('[data-testid="voice-message"]')).toBeVisible();
  });
});

test.describe('Subscription Purchase', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'TestPassword123!');
  });

  test('User can purchase monthly subscription', async ({ page }) => {
    const subscriptionPage = new SubscriptionPage(page);
    
    await subscriptionPage.navigate();
    await subscriptionPage.selectPlan('monthly');
    
    // Use test card
    await subscriptionPage.enterPaymentDetails(
      '4242424242424242',
      '12/25',
      '123'
    );
    
    await subscriptionPage.completePurchase();
    
    // Should show success
    await expect(page.locator('[data-testid="purchase-success"]')).toBeVisible();
  });

  test('Invalid card shows error', async ({ page }) => {
    const subscriptionPage = new SubscriptionPage(page);
    
    await subscriptionPage.navigate();
    await subscriptionPage.selectPlan('monthly');
    
    // Use invalid test card
    await subscriptionPage.enterPaymentDetails(
      '4000000000000002',
      '12/25',
      '123'
    );
    
    await subscriptionPage.completePurchase();
    
    // Should show error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
  });
});

// Performance Tests
test.describe('Performance', () => {
  test('Page load times are acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/balloons`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('API response times are acceptable', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${API_URL}/api/health`);
    
    const responseTime = Date.now() - startTime;
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500); // Should respond in under 500ms
  });
});

// Accessibility Tests
test.describe('Accessibility', () => {
  test('App is keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'email-input');
    
    // Check ARIA labels
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');
  });

  test('App has proper contrast ratios', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // This would typically use an accessibility testing library
    // For now, we'll check that important elements are visible
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('label')).toHaveCSS('color', /.+/);
  });
});

// Mobile Responsiveness Tests
test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('App works on mobile viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check that mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Check that form is still functional
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
  });
});

// Error Recovery Tests
test.describe('Error Recovery', () => {
  test('App handles network errors gracefully', async ({ page, context }) => {
    // Block API requests
    await context.route('**/api/**', route => route.abort());
    
    await page.goto(`${BASE_URL}/balloons`);
    
    // Should show error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    
    // Should have retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('App handles server errors gracefully', async ({ page, context }) => {
    // Return 500 for all API requests
    await context.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto(`${BASE_URL}/balloons`);
    
    // Should show error message
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
  });
});

export { LoginPage, SignupPage, BalloonGridPage, ChatPage, SubscriptionPage, TestDataGenerator };
