import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Minutes from './Minutes';
import type { WebMinutes, MinutesTabType } from '../../types/minutes.types';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../assets/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockMinutesData: WebMinutes = {
  id: '123',
  meetingId: '456',
  summary: 'Test meeting summary with key points discussed',
  topics: [
    {
      id: 'topic1',
      title: 'Project Updates',
      content: 'Discussed current project status',
      confidence: 0.95,
      subtopics: [],
      isExpanded: false,
      isHighlighted: false
    }
  ],
  actionItems: [
    {
      id: 'action1',
      description: 'Follow up on deliverables',
      assigneeId: 'user1',
      dueDate: new Date('2024-01-01'),
      status: 'PENDING',
      confidence: 0.9,
      isEditing: false,
      isSelected: false
    }
  ],
  decisions: [
    {
      id: 'decision1',
      description: 'Approved new timeline',
      madeBy: 'John Doe',
      timestamp: new Date(),
      confidence: 0.95,
      isHighlighted: false
    }
  ],
  status: 'GENERATED',
  generatedAt: new Date(),
  uiState: {
    selectedTab: MinutesTabType.SUMMARY,
    isExportModalOpen: false,
    isShareModalOpen: false,
    errorMessage: null
  }
};

// Test setup helper
const setup = (minutes = mockMinutesData) => {
  const user = userEvent.setup();
  const utils = render(
    <ThemeProvider theme={lightTheme}>
      <Minutes minutes={minutes} />
    </ThemeProvider>
  );
  return {
    user,
    ...utils
  };
};

describe('Minutes Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = setup();
      expect(container).toBeInTheDocument();
    });

    it('displays initial summary tab content', () => {
      setup();
      expect(screen.getByText('Test meeting summary with key points discussed')).toBeInTheDocument();
    });

    it('renders all navigation tabs', () => {
      setup();
      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /topics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /action items/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = setup();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels and roles', () => {
      setup();
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Meeting Minutes');
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const { user } = setup();
      const summaryTab = screen.getByRole('tab', { name: /summary/i });
      
      await user.tab();
      expect(summaryTab).toHaveFocus();
      
      await user.keyboard('{arrowright}');
      expect(screen.getByRole('tab', { name: /topics/i })).toHaveFocus();
    });
  });

  describe('Tab Navigation', () => {
    it('switches content when tabs are clicked', async () => {
      const { user } = setup();
      
      await user.click(screen.getByRole('tab', { name: /topics/i }));
      expect(screen.getByText('Project Updates')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: /action items/i }));
      expect(screen.getByText('Follow up on deliverables')).toBeInTheDocument();
    });

    it('announces tab changes to screen readers', async () => {
      const { user } = setup();
      
      await user.click(screen.getByRole('tab', { name: /topics/i }));
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/switched to topics tab/i);
    });
  });

  describe('Content Updates', () => {
    it('handles real-time content updates', async () => {
      const { rerender } = setup();
      
      const updatedMinutes = {
        ...mockMinutesData,
        summary: 'Updated summary content'
      };
      
      rerender(
        <ThemeProvider theme={lightTheme}>
          <Minutes minutes={updatedMinutes} />
        </ThemeProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Updated summary content')).toBeInTheDocument();
      });
    });

    it('shows loading state during updates', async () => {
      const { rerender } = setup({
        ...mockMinutesData,
        uiState: { ...mockMinutesData.uiState, isLoading: true }
      });
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages appropriately', () => {
      setup({
        ...mockMinutesData,
        uiState: { 
          ...mockMinutesData.uiState,
          errorMessage: 'Failed to load content'
        }
      });
      
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load content');
    });

    it('provides retry functionality for failed operations', async () => {
      const { user } = setup({
        ...mockMinutesData,
        uiState: {
          ...mockMinutesData.uiState,
          errorMessage: 'Failed to load content'
        }
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Teams Integration', () => {
    it('inherits Teams theme styles', () => {
      const { container } = setup();
      const minutesContainer = container.firstChild;
      expect(minutesContainer).toHaveStyle({
        backgroundColor: lightTheme.palette.white
      });
    });

    it('supports high contrast mode', () => {
      // Mock high contrast mode
      const mediaQuery = window.matchMedia('(forced-colors: active)');
      Object.defineProperty(mediaQuery, 'matches', { value: true });
      
      const { container } = setup();
      const minutesContainer = container.firstChild;
      expect(minutesContainer).toHaveStyle({
        border: '1px solid currentColor'
      });
    });
  });
});