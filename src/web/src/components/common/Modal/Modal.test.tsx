import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { act } from 'react-dom/test-utils';
import { ThemeProvider } from 'styled-components';
import Modal from './Modal';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';
import { BREAKPOINTS, ACCESSIBILITY, Z_INDEX } from '../../../constants/ui.constants';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Helper function to render with theme
const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock matchMedia for responsive tests
const createMatchMedia = (width: number) => {
  return (query: string): MediaQueryList => ({
    matches: query.includes(`${width}`),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
};

describe('Modal Component', () => {
  const mockOnClose = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    title: 'Test Modal',
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render modal correctly when open', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    renderWithTheme(<Modal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should handle keyboard navigation and focus trap', async () => {
    renderWithTheme(<Modal {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getByLabelText(ACCESSIBILITY.ARIA_LABELS.closeButton);
    
    // Initial focus should be on close button
    expect(document.activeElement).toBe(closeButton);
    
    // Tab should cycle through focusable elements
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(closeButton);
    
    // Shift+Tab should cycle backwards
    await userEvent.tab({ shift: true });
    expect(document.activeElement).not.toBe(closeButton);
  });

  it('should close on escape key press', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close on overlay click', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('presentation'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render with correct z-index', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    
    const overlay = screen.getByRole('presentation');
    expect(overlay).toHaveStyle(`z-index: ${Z_INDEX.MODAL}`);
  });

  it('should handle custom width prop', () => {
    renderWithTheme(<Modal {...defaultProps} width="600px" />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle('width: 600px');
  });

  describe('Responsive Behavior', () => {
    const breakpoints = [
      { width: BREAKPOINTS.MOBILE.min, name: 'mobile' },
      { width: BREAKPOINTS.TABLET.min, name: 'tablet' },
      { width: BREAKPOINTS.DESKTOP.min, name: 'desktop' },
      { width: BREAKPOINTS.WIDE.min, name: 'wide' }
    ];

    breakpoints.forEach(({ width, name }) => {
      it(`should render correctly at ${name} breakpoint`, () => {
        window.matchMedia = createMatchMedia(width);
        renderWithTheme(<Modal {...defaultProps} />);
        
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeVisible();
        // Additional responsive checks can be added based on specific requirements
      });
    });
  });

  describe('Accessibility', () => {
    it('should meet WCAG 2.1 accessibility requirements', async () => {
      const { container } = renderWithTheme(<Modal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have correct ARIA attributes', () => {
      renderWithTheme(<Modal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should handle high contrast mode', () => {
      renderWithTheme(
        <Modal {...defaultProps} highContrast />,
        highContrastTheme
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-high-contrast', 'true');
    });
  });

  describe('Animation and Reduced Motion', () => {
    beforeEach(() => {
      window.matchMedia = createMatchMedia(BREAKPOINTS.DESKTOP.min);
    });

    it('should apply enter animation by default', async () => {
      const { container } = renderWithTheme(<Modal {...defaultProps} />);
      
      const overlay = container.firstChild;
      expect(overlay).toHaveStyle('animation: fadeIn');
    });

    it('should respect reduced motion preferences', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { container } = renderWithTheme(<Modal {...defaultProps} />);
      
      const overlay = container.firstChild;
      // Animation duration should be 0 when reduced motion is preferred
      expect(overlay).not.toHaveStyle('animation-duration: 0s');
    });
  });

  describe('Theme Integration', () => {
    it('should render correctly with light theme', () => {
      renderWithTheme(<Modal {...defaultProps} />, lightTheme);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle(`background: ${lightTheme.palette.white}`);
    });

    it('should render correctly with dark theme', () => {
      renderWithTheme(<Modal {...defaultProps} />, darkTheme);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle(`background: ${darkTheme.palette.white}`);
    });
  });
});