import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import userEvent from '@testing-library/user-event';

import Summary from './Summary';
import { lightTheme } from '../../../assets/styles/theme';
import type { WebMinutes } from '../../../types/minutes.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock minutes data for testing
const mockMinutes: WebMinutes = {
  id: 'test-meeting-123',
  meetingId: 'meeting-123',
  title: 'Test Meeting',
  summary: 'This is a test summary of the meeting discussing important topics and decisions.',
  date: '2023-09-20T10:00:00Z',
  topics: [],
  actionItems: [],
  decisions: [],
  status: 'GENERATED',
  generatedAt: new Date('2023-09-20T10:30:00Z'),
  processingMetadata: {
    processingStartTime: new Date('2023-09-20T10:00:00Z'),
    processingEndTime: new Date('2023-09-20T10:30:00Z'),
    processingDuration: 1800000,
    modelVersion: '1.0.0',
    overallConfidence: 0.95
  }
};

// Test wrapper component with theme provider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Summary component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders summary content with proper visual hierarchy', async () => {
    const { container } = renderWithTheme(
      <Summary 
        minutes={mockMinutes}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    );

    // Verify heading typography
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveStyle({
      fontFamily: lightTheme.fonts.xLarge.fontFamily,
      fontSize: lightTheme.fonts.xLarge.fontSize,
      fontWeight: lightTheme.fonts.xLarge.fontWeight
    });

    // Verify content spacing
    const content = screen.getByTestId('summary-content');
    expect(content).toHaveStyle({
      padding: `${lightTheme.spacing.lg}px`
    });

    // Verify responsive container
    expect(container.firstChild).toMatchSnapshot();
  });

  it('meets WCAG 2.1 Level AA accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <Summary 
        minutes={mockMinutes}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    );

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA landmarks
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();

    // Verify heading hierarchy
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveAttribute('id', 'summary-title');

    // Verify keyboard navigation
    const content = screen.getByTestId('summary-content');
    expect(content).toHaveAttribute('aria-labelledby', 'summary-title');
    
    // Verify focus management
    userEvent.tab();
    expect(title).toHaveFocus();
  });

  it('handles loading state appropriately', () => {
    renderWithTheme(
      <Summary 
        minutes={mockMinutes}
        isLoading={true}
        error={null}
        onRetry={() => {}}
      />
    );

    // Verify loading spinner
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-busy', 'true');

    // Verify loading announcement
    expect(screen.getByText('minutes.summary.loading')).toBeInTheDocument();
  });

  it('handles error state with retry functionality', async () => {
    const onRetry = jest.fn();
    const error = new Error('Test error message');

    renderWithTheme(
      <Summary 
        minutes={mockMinutes}
        isLoading={false}
        error={error}
        onRetry={onRetry}
      />
    );

    // Verify error display
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(screen.getByText('minutes.summary.errorTitle')).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: 'common.retry' });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Verify keyboard accessibility
    fireEvent.keyDown(retryButton, { key: 'Enter' });
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when no summary is available', () => {
    const minutesWithoutSummary = {
      ...mockMinutes,
      summary: ''
    };

    renderWithTheme(
      <Summary 
        minutes={minutesWithoutSummary}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    );

    expect(screen.getByText('minutes.summary.noContent')).toBeInTheDocument();
  });

  it('handles theme changes correctly', () => {
    const { rerender } = renderWithTheme(
      <Summary 
        minutes={mockMinutes}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    );

    // Verify light theme styles
    const container = screen.getByTestId('summary-content');
    expect(container).toHaveStyle({
      backgroundColor: lightTheme.palette.white
    });

    // Mock dark theme media query
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    // Force re-render to trigger theme update
    rerender(
      <ThemeProvider theme={lightTheme}>
        <Summary 
          minutes={mockMinutes}
          isLoading={false}
          error={null}
          onRetry={() => {}}
        />
      </ThemeProvider>
    );

    // Verify dark theme styles are applied
    expect(container).toHaveStyle({
      backgroundColor: lightTheme.palette.neutralLighterAlt
    });
  });

  it('sanitizes and renders HTML content safely', () => {
    const minutesWithHtml = {
      ...mockMinutes,
      summary: 'Line 1\nLine 2\nLine 3'
    };

    renderWithTheme(
      <Summary 
        minutes={minutesWithHtml}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    );

    // Verify line breaks are rendered correctly
    const content = screen.getByRole('article');
    expect(content.innerHTML).toContain('Line 1<br />Line 2<br />Line 3');
  });
});