import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { act } from 'react-dom/test-utils';
import ActionItems from './ActionItems';
import { WebActionItem, ActionItemStatus } from '../../../types/minutes.types';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

describe('ActionItems Component', () => {
  // Mock data
  const mockActionItems: WebActionItem[] = [
    {
      id: '1',
      description: 'Review project timeline',
      assigneeId: 'user1@example.com',
      dueDate: new Date('2024-01-01'),
      status: ActionItemStatus.PENDING,
      confidence: 0.95,
      isEditing: false,
      isSelected: false
    },
    {
      id: '2',
      description: 'Update documentation',
      assigneeId: 'user2@example.com',
      dueDate: new Date('2024-01-15'),
      status: ActionItemStatus.IN_PROGRESS,
      confidence: 0.88,
      isEditing: false,
      isSelected: false
    }
  ];

  // Mock handlers
  const mockHandleStatusChange = jest.fn();
  const mockHandleEdit = jest.fn();
  const mockHandleDelete = jest.fn();
  const mockHandleAssigneeChange = jest.fn();

  // Setup user event instance
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(
      <ActionItems
        actionItems={[]}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
        isLoading={true}
      />
    );

    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders action items with correct content and structure', () => {
    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    // Verify header
    expect(screen.getByText('Action Items')).toBeInTheDocument();

    // Verify list structure
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    // Verify individual items
    mockActionItems.forEach(item => {
      const listItem = screen.getByRole('listitem', { name: new RegExp(item.description, 'i') });
      expect(listItem).toBeInTheDocument();
      expect(within(listItem).getByText(item.description)).toBeInTheDocument();
      expect(within(listItem).getByText(item.assigneeId)).toBeInTheDocument();
      expect(within(listItem).getByText(item.status)).toBeInTheDocument();
    });
  });

  it('handles status changes correctly', async () => {
    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    const statusButton = screen.getAllByRole('button', { name: /update status/i })[0];
    await user.click(statusButton);

    expect(mockHandleStatusChange).toHaveBeenCalledWith(
      mockActionItems[0].id,
      ActionItemStatus.IN_PROGRESS
    );
  });

  it('handles edit actions correctly', async () => {
    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    const editButton = screen.getAllByRole('button', { name: /edit action item/i })[0];
    await user.click(editButton);

    expect(mockHandleEdit).toHaveBeenCalledWith(mockActionItems[0].id);
  });

  it('displays error states appropriately', async () => {
    const error = new Error('Failed to update status');
    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={() => Promise.reject(error)}
        onEdit={mockHandleEdit}
        error={error}
      />
    );

    // Verify error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent(error.message);
  });

  it('handles loading states during actions', async () => {
    const delayedStatusChange = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={delayedStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    const statusButton = screen.getAllByRole('button', { name: /update status/i })[0];
    await user.click(statusButton);

    // Verify loading state
    expect(statusButton).toHaveAttribute('aria-busy', 'true');
    expect(statusButton).toBeDisabled();

    // Wait for loading to complete
    await waitFor(() => {
      expect(statusButton).not.toHaveAttribute('aria-busy', 'true');
      expect(statusButton).not.toBeDisabled();
    });
  });

  it('meets accessibility standards', async () => {
    const { container } = render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    render(
      <ActionItems
        actionItems={mockActionItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    // Tab to first status button
    await user.tab();
    const firstStatusButton = screen.getAllByRole('button', { name: /update status/i })[0];
    expect(firstStatusButton).toHaveFocus();

    // Tab to first edit button
    await user.tab();
    const firstEditButton = screen.getAllByRole('button', { name: /edit action item/i })[0];
    expect(firstEditButton).toHaveFocus();
  });

  it('handles virtualization correctly', async () => {
    // Create large dataset to test virtualization
    const manyItems = Array.from({ length: 100 }, (_, i) => ({
      ...mockActionItems[0],
      id: `item-${i}`,
      description: `Action Item ${i}`
    }));

    render(
      <ActionItems
        actionItems={manyItems}
        onStatusChange={mockHandleStatusChange}
        onEdit={mockHandleEdit}
      />
    );

    // Verify only visible items are rendered
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeLessThan(manyItems.length);

    // Verify scroll behavior
    const container = screen.getByRole('region');
    await act(async () => {
      fireEvent.scroll(container, { target: { scrollTop: 1000 } });
    });

    // Wait for new items to be rendered after scroll
    await waitFor(() => {
      expect(screen.getByText(/Action Item 50/)).toBeInTheDocument();
    });
  });
});