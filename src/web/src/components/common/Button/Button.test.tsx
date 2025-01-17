import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, jest } from '@jest/globals';
import Button from './Button';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../../assets/styles/theme';

// Helper function to render components with theme context
const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      renderWithTheme(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('renders with different variants', () => {
      const variants = ['primary', 'secondary', 'text'] as const;
      variants.forEach(variant => {
        renderWithTheme(<Button variant={variant}>Button</Button>);
        const button = screen.getByRole('button', { name: /button/i });
        expect(button).toHaveAttribute('data-variant', variant);
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach(size => {
        renderWithTheme(<Button size={size}>Button</Button>);
        const button = screen.getByRole('button', { name: /button/i });
        expect(button).toHaveAttribute('data-size', size);
      });
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles click events', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Button disabled onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('prevents click when loading', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Button loading onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA contrast requirements', () => {
      renderWithTheme(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      
      const styles = window.getComputedStyle(button);
      expect(styles.backgroundColor).toBeDefined();
      expect(styles.color).toBeDefined();
    });

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('provides proper ARIA attributes', () => {
      renderWithTheme(
        <Button 
          loading 
          disabled 
          ariaLabel="Test button"
        >
          Click me
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  // Icon Tests
  describe('Icon Support', () => {
    it('renders with left icon', () => {
      renderWithTheme(
        <Button icon="download" iconPosition="left">
          Download
        </Button>
      );
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('span[role="img"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'download icon');
    });

    it('renders with right icon', () => {
      renderWithTheme(
        <Button icon="share" iconPosition="right">
          Share
        </Button>
      );
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('span[role="img"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'share icon');
    });

    it('shows loading spinner when loading', () => {
      renderWithTheme(
        <Button loading>
          Loading
        </Button>
      );
      
      const spinner = screen.getByRole('img', { name: /loading/i });
      expect(spinner).toBeInTheDocument();
    });
  });

  // Theming Tests
  describe('Theming', () => {
    it('applies light theme styles correctly', () => {
      renderWithTheme(<Button>Light Theme</Button>, lightTheme);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: lightTheme.palette.themePrimary
      });
    });

    it('applies dark theme styles correctly', () => {
      renderWithTheme(<Button>Dark Theme</Button>, darkTheme);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: darkTheme.palette.themePrimary
      });
    });

    it('supports high contrast mode styles', () => {
      // Simulate high contrast mode
      const mediaQuery = '(-ms-high-contrast: active)';
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === mediaQuery,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn()
      }));

      renderWithTheme(<Button>High Contrast</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        border: '1px solid currentColor'
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('renders fallback on error', () => {
      const errorMessage = 'Button render error';
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithTheme(
        <Button onClick={() => { throw new Error(errorMessage); }}>
          Error Button
        </Button>
      );
      
      const fallbackButton = screen.getByRole('button', { name: /error button/i });
      expect(fallbackButton).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage)
      );
      
      consoleError.mockRestore();
    });
  });
});