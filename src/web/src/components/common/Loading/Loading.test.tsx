import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { axe, toHaveNoViolations } from 'jest-axe';
import Loading from './Loading';
import { lightTheme, darkTheme } from '../../../assets/styles/theme';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Loading Component', () => {
  beforeEach(() => {
    mockMatchMedia(false); // Default to no reduced motion
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders with default props', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Loading />
      </ThemeProvider>
    );

    const spinner = screen.getByTestId('loading-spinner');
    const loadingText = screen.getByText('Loading...');

    expect(spinner).toBeInTheDocument();
    expect(loadingText).toBeInTheDocument();
    expect(spinner).toHaveStyle({ animationDuration: '0.8s' });
  });

  it('renders with custom text', () => {
    const customText = 'Please wait...';
    render(
      <ThemeProvider theme={lightTheme}>
        <Loading text={customText} />
      </ThemeProvider>
    );

    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <ThemeProvider theme={lightTheme}>
        <Loading size="small" />
      </ThemeProvider>
    );

    let spinner = screen.getByTestId('loading-spinner');
    expect(spinner.firstChild).toHaveStyle({
      width: '16px',
      height: '16px',
      borderWidth: '2px'
    });

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Loading size="medium" />
      </ThemeProvider>
    );
    spinner = screen.getByTestId('loading-spinner');
    expect(spinner.firstChild).toHaveStyle({
      width: '32px',
      height: '32px',
      borderWidth: '3px'
    });

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Loading size="large" />
      </ThemeProvider>
    );
    spinner = screen.getByTestId('loading-spinner');
    expect(spinner.firstChild).toHaveStyle({
      width: '48px',
      height: '48px',
      borderWidth: '4px'
    });
  });

  it('handles invalid size prop gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    render(
      <ThemeProvider theme={lightTheme}>
        {/* @ts-expect-error Testing invalid prop */}
        <Loading size="invalid" />
      </ThemeProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid size prop "invalid" provided to Loading component. Defaulting to "medium".'
    );
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner.firstChild).toHaveStyle({
      width: '32px',
      height: '32px'
    });

    consoleSpy.mockRestore();
  });

  it('respects reduced motion preferences', () => {
    mockMatchMedia(true); // Enable reduced motion

    render(
      <ThemeProvider theme={lightTheme}>
        <Loading />
      </ThemeProvider>
    );

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner.firstChild).toHaveStyle({ animationDuration: '1.5s' });
  });

  it('applies theme colors correctly', () => {
    const { rerender } = render(
      <ThemeProvider theme={lightTheme}>
        <Loading />
      </ThemeProvider>
    );

    let spinner = screen.getByTestId('loading-spinner').firstChild;
    expect(spinner).toHaveStyle({
      borderColor: lightTheme.palette.neutralLight,
      borderTopColor: lightTheme.palette.themePrimary
    });

    rerender(
      <ThemeProvider theme={darkTheme}>
        <Loading />
      </ThemeProvider>
    );

    spinner = screen.getByTestId('loading-spinner').firstChild;
    expect(spinner).toHaveStyle({
      borderColor: darkTheme.palette.neutralLight,
      borderTopColor: darkTheme.palette.themePrimary
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <Loading />
      </ThemeProvider>
    );

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Check ARIA attributes
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    expect(spinner).toHaveAttribute('aria-busy', 'true');

    // Verify loading text is accessible to screen readers
    const loadingText = screen.getByText('Loading...');
    expect(loadingText).toHaveAttribute('role', 'alert');
    expect(loadingText).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('optimizes performance with hardware acceleration', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Loading />
      </ThemeProvider>
    );

    const spinner = screen.getByTestId('loading-spinner').firstChild;
    expect(spinner).toHaveStyle({
      transform: 'translateZ(0)',
      willChange: 'transform'
    });
  });

  it('maintains consistent dimensions across viewport sizes', async () => {
    const { rerender } = render(
      <ThemeProvider theme={lightTheme}>
        <Loading size="medium" />
      </ThemeProvider>
    );

    // Test at different viewport widths
    const viewports = [320, 768, 1024, 1440];
    
    for (const width of viewports) {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));
      
      await waitFor(() => {
        const spinner = screen.getByTestId('loading-spinner').firstChild;
        expect(spinner).toHaveStyle({
          width: '32px',
          height: '32px'
        });
      });
    }
  });
});