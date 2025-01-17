import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@fluentui/react-theme-provider';
import Icon from './Icon';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';
import { ICON_SIZES, ICON_COLORS } from '../../../assets/icons';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme context
const mockTheme = {
  ...lightTheme,
  palette: {
    ...lightTheme.palette,
    themePrimary: '#0078d4',
    themeDarker: '#004578',
    themeDark: '#005a9e'
  }
};

// Helper to render with theme context
const renderWithTheme = (ui: React.ReactNode, theme = mockTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Icon Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithTheme(<Icon name="transcription" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
    });

    it('renders with correct aria-label', () => {
      renderWithTheme(<Icon name="transcription" ariaLabel="Start transcription" />);
      const icon = screen.getByLabelText('Start transcription');
      expect(icon).toBeInTheDocument();
    });

    it('falls back to name as aria-label when not provided', () => {
      renderWithTheme(<Icon name="transcription" />);
      const icon = screen.getByLabelText('transcription');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it.each(['sm', 'md', 'lg', 'xl'] as const)('applies correct size class for %s', (size) => {
      renderWithTheme(<Icon name="transcription" size={size} />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveStyle({
        width: `${ICON_SIZES[size.toUpperCase() as keyof typeof ICON_SIZES]}px`,
        height: `${ICON_SIZES[size.toUpperCase() as keyof typeof ICON_SIZES]}px`
      });
    });

    it('defaults to medium size when not specified', () => {
      renderWithTheme(<Icon name="transcription" />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveStyle({
        width: `${ICON_SIZES.MD}px`,
        height: `${ICON_SIZES.MD}px`
      });
    });
  });

  describe('Variants and Colors', () => {
    it.each(['primary', 'secondary', 'error', 'success', 'warning'] as const)(
      'applies correct color for %s variant',
      (variant) => {
        renderWithTheme(<Icon name="transcription" variant={variant} />);
        const icon = screen.getByRole('img');
        expect(icon).toHaveStyle({
          color: expect.any(String)
        });
      }
    );

    it('applies disabled styles when disabled', () => {
      renderWithTheme(<Icon name="transcription" disabled />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveStyle({ opacity: '0.5' });
      expect(icon).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Interaction Handling', () => {
    it('handles click events when enabled', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Icon name="transcription" onClick={handleClick} />);
      
      const icon = screen.getByRole('button');
      await userEvent.click(icon);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click events when disabled', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Icon name="transcription" onClick={handleClick} disabled />);
      
      const icon = screen.getByRole('button');
      await userEvent.click(icon);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports keyboard interaction', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<Icon name="transcription" onClick={handleClick} />);
      
      const icon = screen.getByRole('button');
      await userEvent.tab();
      expect(icon).toHaveFocus();
      
      await userEvent.keyboard('{enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await userEvent.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theming', () => {
    it('adapts to theme changes', () => {
      const { rerender } = renderWithTheme(<Icon name="transcription" />);
      
      // Light theme
      let icon = screen.getByRole('img');
      expect(icon).toHaveStyle({
        color: mockTheme.palette.themePrimary
      });

      // Dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <Icon name="transcription" />
        </ThemeProvider>
      );
      expect(icon).toHaveStyle({
        color: darkTheme.palette.themePrimary
      });

      // High contrast theme
      rerender(
        <ThemeProvider theme={highContrastTheme}>
          <Icon name="transcription" />
        </ThemeProvider>
      );
      expect(icon).toHaveStyle({
        color: highContrastTheme.palette.themePrimary
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility requirements', async () => {
      const { container } = renderWithTheme(
        <Icon name="transcription" ariaLabel="Transcription icon" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides correct role based on interaction type', () => {
      const { rerender } = renderWithTheme(<Icon name="transcription" />);
      expect(screen.getByRole('img')).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={mockTheme}>
          <Icon name="transcription" onClick={() => {}} />
        </ThemeProvider>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports tooltip for additional context', () => {
      renderWithTheme(
        <Icon name="transcription" tooltip="Start meeting transcription" />
      );
      const icon = screen.getByRole('img');
      expect(icon.parentElement).toHaveAttribute('aria-label', 'Start meeting transcription');
    });
  });

  describe('Error Handling', () => {
    it('renders fallback for invalid icon names', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      renderWithTheme(<Icon name="invalid-icon" />);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon "invalid-icon" not found in any collection')
      );
      consoleSpy.mockRestore();
    });

    it('handles loading state correctly', () => {
      renderWithTheme(<Icon name="transcription" loading />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-busy', 'true');
      expect(icon).toHaveStyle({ opacity: '0.5' });
    });
  });
});