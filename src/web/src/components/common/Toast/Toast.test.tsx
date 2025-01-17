import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import Toast from './Toast';
import { ThemeProvider } from '../../theme';
import { lightTheme, darkTheme } from '../../../assets/styles/theme';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock timers for animation and duration testing
beforeEach(() => {
  jest.useFakeTimers();
  // Mock matchMedia for theme and reduced motion testing
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Helper function to render toast with theme context
const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Helper function to create consistent toast props
const createToastProps = (overrides = {}) => ({
  message: 'Test message',
  status: 'info',
  duration: 3000,
  onClose: jest.fn(),
  ...overrides,
});

describe('Toast Component Rendering', () => {
  it('renders with success status and correct styling', () => {
    const props = createToastProps({ status: 'success', message: 'Operation successful' });
    renderWithTheme(<Toast {...props} />);
    
    const toast = screen.getByRole('alert');
    const icon = within(toast).getByRole('img', { name: /success/i });
    
    expect(toast).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(toast).toHaveStyle({ borderLeftColor: lightTheme.palette.greenDark });
  });

  it('renders with error status and correct styling', () => {
    const props = createToastProps({ status: 'error', message: 'Error occurred' });
    renderWithTheme(<Toast {...props} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveStyle({ borderLeftColor: lightTheme.palette.redDark });
  });

  it('handles long messages with proper truncation', () => {
    const longMessage = 'A'.repeat(200);
    const props = createToastProps({ message: longMessage });
    renderWithTheme(<Toast {...props} />);
    
    const message = screen.getByText(longMessage);
    expect(message).toHaveStyle({ overflow: 'hidden' });
  });

  it('applies correct theme-based colors', () => {
    const props = createToastProps({ status: 'info' });
    renderWithTheme(<Toast {...props} />, darkTheme);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveStyle({ background: darkTheme.palette.neutralLighter });
  });
});

describe('Toast Behavior', () => {
  it('auto-closes after specified duration', async () => {
    const onClose = jest.fn();
    const props = createToastProps({ duration: 1000, onClose });
    renderWithTheme(<Toast {...props} />);
    
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('remains visible when autoClose is false', () => {
    const onClose = jest.fn();
    const props = createToastProps({ autoClose: false, onClose });
    renderWithTheme(<Toast {...props} />);
    
    jest.advanceTimersByTime(5000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles animation cancellation on unmount', () => {
    const props = createToastProps();
    const { unmount } = renderWithTheme(<Toast {...props} />);
    
    unmount();
    jest.advanceTimersByTime(3000);
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe('Accessibility Compliance', () => {
  it('meets WCAG 2.1 AA requirements', async () => {
    const props = createToastProps();
    const { container } = renderWithTheme(<Toast {...props} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('uses correct ARIA roles and attributes', () => {
    const props = createToastProps({ status: 'error' });
    renderWithTheme(<Toast {...props} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('supports reduced motion preferences', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    const props = createToastProps();
    renderWithTheme(<Toast {...props} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveStyle({ animation: expect.stringContaining('100ms') });
  });
});

describe('Theme Integration', () => {
  it('applies Teams theme colors correctly', () => {
    const props = createToastProps({ status: 'info' });
    renderWithTheme(<Toast {...props} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveStyle({
      background: lightTheme.palette.white,
      color: lightTheme.palette.neutralPrimary,
    });
  });

  it('supports dark mode switching', () => {
    const props = createToastProps();
    const { rerender } = renderWithTheme(<Toast {...props} />);
    
    // Rerender with dark theme
    rerender(
      <ThemeProvider theme={darkTheme}>
        <Toast {...props} />
      </ThemeProvider>
    );
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveStyle({ background: darkTheme.palette.neutralLighter });
  });

  it('maintains proper contrast ratios', async () => {
    const props = createToastProps({ status: 'warning' });
    const { container } = renderWithTheme(<Toast {...props} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Error Handling', () => {
  it('renders fallback UI when error occurs', () => {
    const props = createToastProps({ message: undefined }); // Trigger error
    renderWithTheme(<Toast {...props} />);
    
    const fallback = screen.getByText(/An error occurred displaying the notification/i);
    expect(fallback).toBeInTheDocument();
  });

  it('logs error when rendering fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const props = createToastProps({ status: 'invalid' });
    
    renderWithTheme(<Toast {...props} />);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});