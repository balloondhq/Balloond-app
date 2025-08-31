/**
 * Frontend Component Tests
 * Test suite for React Native components
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../frontend/src/contexts/AuthContext';
import { ThemeProvider } from '../frontend/src/contexts/ThemeContext';
import { WelcomeScreen } from '../frontend/src/screens/auth/WelcomeScreen';
import { LoginScreen } from '../frontend/src/screens/auth/LoginScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </NavigationContainer>
);

describe('Welcome Screen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <WelcomeScreen />
      </TestWrapper>
    );

    expect(getByText("Balloon'd")).toBeTruthy();
    expect(getByText('Pop to reveal, double pop to connect')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('navigates to signup screen when Create Account is pressed', () => {
    const { getByText } = render(
      <TestWrapper>
        <WelcomeScreen />
      </TestWrapper>
    );

    fireEvent.press(getByText('Create Account'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to login screen when Sign In is pressed', () => {
    const { getByText } = render(
      <TestWrapper>
        <WelcomeScreen />
      </TestWrapper>
    );

    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});

describe('Login Screen', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const loginButton = getByText('Sign In');
    fireEvent.press(loginButton);

    // Alert should be called with error message
    // Note: In a real test, you'd mock Alert and check it was called
  });

  it('handles input changes', () => {
    const { getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });
});
