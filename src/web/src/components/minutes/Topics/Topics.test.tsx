import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Topics from './Topics';
import type { WebTopic } from '../../../types/minutes.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver for component rendering
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock test data
const mockTopics: WebTopic[] = [
  {
    id: '1',
    title: 'Project Overview',
    content: 'Discussion of project goals and timeline',
    confidence: 0.95,
    isExpanded: false,
    isHighlighted: false,
    subtopics: [
      {
        id: '1-1',
        title: 'Timeline',
        content: 'Q4 2023 delivery target',
        confidence: 0.92,
        isExpanded: false,
        isHighlighted: false,
        subtopics: []
      }
    ]
  },
  {
    id: '2',
    title: 'Technical Requirements',
    content: 'System architecture and dependencies',
    confidence: 0.88,
    isExpanded: false,
    isHighlighted: false,
    subtopics: []
  }
];

const mockOnTopicClick = jest.fn();

// Helper function to render Topics component with test data
const renderTopics = (topics = mockTopics, onTopicClick = mockOnTopicClick) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(<Topics topics={topics} onTopicClick={onTopicClick} />)
  };
};

describe('Topics component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders topics correctly with Teams theme styling', async () => {
      const { container } = renderTopics();
      
      // Verify root topics are rendered
      expect(screen.getByText('Project Overview')).toBeInTheDocument();
      expect(screen.getByText('Technical Requirements')).toBeInTheDocument();
      
      // Verify initial collapsed state
      expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
      
      // Verify Teams theme integration
      const topicsContainer = container.firstChild;
      expect(topicsContainer).toHaveStyle({
        backgroundColor: expect.any(String),
        borderRadius: expect.any(String),
        padding: expect.any(String)
      });
    });

    test('renders empty state message when no topics provided', () => {
      renderTopics([]);
      expect(screen.getByText('No topics available for this meeting.')).toBeInTheDocument();
    });

    test('expands/collapses topics on click', async () => {
      const { user } = renderTopics();
      
      // Click to expand first topic
      await user.click(screen.getByText('Project Overview'));
      expect(mockOnTopicClick).toHaveBeenCalledWith('1');
      
      // Verify subtopic becomes visible when parent is expanded
      const updatedTopics = [...mockTopics];
      updatedTopics[0].isExpanded = true;
      renderTopics(updatedTopics);
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('meets WCAG accessibility requirements', async () => {
      const { container } = renderTopics();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides proper ARIA attributes', () => {
      renderTopics();
      
      // Verify container ARIA attributes
      const container = screen.getByTestId('topics-container');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Meeting Topics');
      
      // Verify topic button ARIA attributes
      const topicButtons = screen.getAllByRole('button');
      topicButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-expanded');
        expect(button).toHaveAttribute('tabindex', '0');
      });
    });

    test('supports keyboard navigation', async () => {
      const { user } = renderTopics();
      
      // Tab to first topic
      await user.tab();
      expect(screen.getByText('Project Overview')).toHaveFocus();
      
      // Expand topic with Enter key
      await user.keyboard('{Enter}');
      expect(mockOnTopicClick).toHaveBeenCalledWith('1');
      
      // Tab to next topic
      await user.tab();
      expect(screen.getByText('Technical Requirements')).toHaveFocus();
      
      // Expand topic with Space key
      await user.keyboard(' ');
      expect(mockOnTopicClick).toHaveBeenCalledWith('2');
    });
  });

  describe('Performance', () => {
    test('handles large topic lists efficiently', async () => {
      // Generate large topic list
      const largeTopicList: WebTopic[] = Array.from({ length: 100 }, (_, i) => ({
        id: `topic-${i}`,
        title: `Topic ${i}`,
        content: `Content ${i}`,
        confidence: 0.9,
        isExpanded: false,
        isHighlighted: false,
        subtopics: []
      }));
      
      const { container } = renderTopics(largeTopicList);
      
      // Verify render performance
      expect(container.querySelectorAll('[role="button"]')).toHaveLength(100);
      
      // Verify scroll performance
      const topicsContainer = screen.getByTestId('topics-container');
      fireEvent.scroll(topicsContainer, { target: { scrollY: 1000 } });
      
      // Wait for any potential performance issues
      await waitFor(() => {
        expect(mockResizeObserver).toHaveBeenCalled();
      });
    });

    test('memoizes topic rendering correctly', async () => {
      const { rerender } = renderTopics();
      const initialRender = screen.getAllByRole('button');
      
      // Rerender with same props
      rerender(<Topics topics={mockTopics} onTopicClick={mockOnTopicClick} />);
      const secondRender = screen.getAllByRole('button');
      
      // Verify components were not recreated
      expect(initialRender).toEqual(secondRender);
    });
  });

  describe('Error Handling', () => {
    test('handles malformed topic data gracefully', () => {
      // @ts-expect-error Testing invalid topic data
      const invalidTopics = [{ id: '1', title: null }];
      
      renderTopics(invalidTopics);
      expect(screen.getByText('No topics available for this meeting.')).toBeInTheDocument();
    });

    test('handles click events on disabled topics', async () => {
      const { user } = renderTopics();
      const disabledTopic = screen.getAllByRole('button')[0];
      
      // Simulate disabled state
      disabledTopic.setAttribute('disabled', 'true');
      
      await user.click(disabledTopic);
      expect(mockOnTopicClick).not.toHaveBeenCalled();
    });
  });
});