import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@fluentui/react-components';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';
import Banner from './Banner';
import type { BannerProps } from './Banner';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper function to render Banner with theme context
const renderBanner = (props: Partial<BannerProps> = {}) => {
  const defaultProps: BannerProps = {
    message: 'Test message',
    status: 'info',
    ...props
  };

  return render(
    <ThemeProvider theme={lightTheme}>
      <Banner {...defaultProps} />
    </ThemeProvider>
  );
};

// Helper to create test props with mock handlers
const createTestProps = (overrides: Partial<BannerProps> = {}): BannerProps => ({
  message: 'Test message',
  status: 'info',
  actions: [
    {
      label: 'Test Action',
      onClick: jest.fn(),
    }
  ],
  onDismiss: jest.fn(),
  ...overrides
});

describe('Banner Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderBanner();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders with different status types', () => {
      const statusTypes: Array<'success' | 'error' | 'warning' | 'info'> = [
        'success', 'error', 'warning', 'info'
      ];

      statusTypes.forEach(status => {
        const { rerender } = renderBanner({ status });
        const banner = screen.getByRole('alert');
        expect(banner).toHaveAttribute('status', status);
        expect(within(banner).getByLabelText(`${status} icon`)).toBeInTheDocument();
        rerender(<></>);
      });
    });

    it('renders with actions', () => {
      const actions = [
        { label: 'Action 1', onClick: jest.fn() },
        { label: 'Action 2', onClick: jest.fn() }
      ];
      renderBanner({ actions });

      actions.forEach(action => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });

    it('renders dismiss button when onDismiss provided', () => {
      const onDismiss = jest.fn();
      renderBanner({ onDismiss });
      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });

    it('handles RTL layout', () => {
      renderBanner({ dir: 'rtl' });
      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('Interaction', () => {
    it('calls action handlers when clicked', async () => {
      const actionHandler = jest.fn();
      const props = createTestProps({
        actions: [{ label: 'Test Action', onClick: actionHandler }]
      });
      renderBanner(props);

      const actionButton = screen.getByText('Test Action');
      await userEvent.click(actionButton);
      expect(actionHandler).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button clicked', async () => {
      const onDismiss = jest.fn();
      renderBanner({ onDismiss });

      const dismissButton = screen.getByLabelText('Dismiss notification');
      await userEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('disables actions when loading', async () => {
      const actionHandler = jest.fn();
      const props = createTestProps({
        actions: [{ label: 'Test Action', onClick: actionHandler }],
        isLoading: true
      });
      renderBanner(props);

      const actionButton = screen.getByText('Test Action');
      expect(actionButton).toBeDisabled();
      await userEvent.click(actionButton);
      expect(actionHandler).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderBanner();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides appropriate ARIA attributes', () => {
      renderBanner();
      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
      expect(banner).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation', async () => {
      const actionHandler = jest.fn();
      const props = createTestProps({
        actions: [{ label: 'Test Action', onClick: actionHandler }]
      });
      renderBanner(props);

      const actionButton = screen.getByText('Test Action');
      actionButton.focus();
      expect(actionButton).toHaveFocus();
      
      fireEvent.keyDown(actionButton, { key: 'Enter' });
      expect(actionHandler).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(actionButton, { key: ' ' });
      expect(actionHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theme Integration', () => {
    it('renders correctly with different themes', () => {
      const themes = [lightTheme, darkTheme, highContrastTheme];
      
      themes.forEach(theme => {
        const { rerender } = render(
          <ThemeProvider theme={theme}>
            <Banner message="Test message" status="info" />
          </ThemeProvider>
        );
        const banner = screen.getByRole('alert');
        expect(banner).toBeInTheDocument();
        rerender(<></>);
      });
    });

    it('maintains contrast ratios across themes', async () => {
      const { container } = render(
        <ThemeProvider theme={highContrastTheme}>
          <Banner message="Test message" status="error" />
        </ThemeProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error Handling', () => {
    it('handles missing optional props gracefully', () => {
      renderBanner({ actions: undefined, onDismiss: undefined });
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles empty message gracefully', () => {
      renderBanner({ message: '' });
      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('');
    });
  });
});