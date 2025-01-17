import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from 'react-error-boundary';
import { Container, Header, List, Item, AssigneeTag } from './ActionItems.styles';
import { WebActionItem, ActionItemStatus } from '../../../types/minutes.types';
import Button from '../../common/Button/Button';

export interface ActionItemsProps {
  actionItems: WebActionItem[];
  onStatusChange: (id: string, status: ActionItemStatus) => Promise<void>;
  onEdit: (id: string) => Promise<void>;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
}

const ActionItems: React.FC<ActionItemsProps> = ({
  actionItems,
  onStatusChange,
  onEdit,
  className = '',
  isLoading = false,
  error = null
}) => {
  // State for tracking loading states per action item
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});

  // Ref for virtualized list container
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration for performance
  const rowVirtualizer = useVirtualizer({
    count: actionItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });

  // Reset error states when action items change
  useEffect(() => {
    setErrorStates({});
  }, [actionItems]);

  // Handle status change with error handling and loading state
  const handleStatusChange = useCallback(async (id: string, newStatus: ActionItemStatus) => {
    try {
      setLoadingStates(prev => ({ ...prev, [id]: true }));
      setErrorStates(prev => ({ ...prev, [id]: '' }));
      
      await onStatusChange(id, newStatus);
    } catch (err) {
      setErrorStates(prev => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to update status'
      }));
      console.error('Status update failed:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [id]: false }));
    }
  }, [onStatusChange]);

  // Handle edit with error handling and loading state
  const handleEdit = useCallback(async (id: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [id]: true }));
      setErrorStates(prev => ({ ...prev, [id]: '' }));
      
      await onEdit(id);
    } catch (err) {
      setErrorStates(prev => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to edit action item'
      }));
      console.error('Edit failed:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [id]: false }));
    }
  }, [onEdit]);

  // Render individual action item with accessibility support
  const renderActionItem = useCallback((item: WebActionItem) => {
    const isItemLoading = loadingStates[item.id];
    const itemError = errorStates[item.id];

    return (
      <Item
        key={item.id}
        role="listitem"
        aria-busy={isItemLoading}
        aria-invalid={!!itemError}
      >
        <div>
          <span role="heading" aria-level={3}>
            {item.description}
          </span>
          {itemError && (
            <span role="alert" style={{ color: 'var(--error-text)' }}>
              {itemError}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AssigneeTag
            role="status"
            aria-label={`Assigned to ${item.assigneeId}`}
          >
            {item.assigneeId}
          </AssigneeTag>
          
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleStatusChange(item.id, 
              item.status === ActionItemStatus.PENDING ? 
              ActionItemStatus.IN_PROGRESS : 
              ActionItemStatus.COMPLETED
            )}
            loading={isItemLoading}
            disabled={isItemLoading}
            ariaLabel={`Update status of action item: ${item.description}`}
            icon={item.status === ActionItemStatus.COMPLETED ? 'checkmark' : 'clock'}
          >
            {item.status}
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={() => handleEdit(item.id)}
            loading={isItemLoading}
            disabled={isItemLoading}
            ariaLabel={`Edit action item: ${item.description}`}
            icon="edit"
          >
            Edit
          </Button>
        </div>
      </Item>
    );
  }, [loadingStates, errorStates, handleStatusChange, handleEdit]);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
    <div role="alert" style={{ padding: '16px', color: 'var(--error-text)' }}>
      <p>Failed to render action items: {error.message}</p>
      <Button variant="secondary" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Container className={className} role="region" aria-label="Action Items">
        <Header>Action Items</Header>
        
        {error && (
          <div role="alert" style={{ color: 'var(--error-text)', marginBottom: '16px' }}>
            {error.message}
          </div>
        )}
        
        <div ref={parentRef} style={{ overflow: 'auto', maxHeight: '600px' }}>
          <List
            role="list"
            aria-busy={isLoading}
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {renderActionItem(actionItems[virtualRow.index])}
              </div>
            ))}
          </List>
        </div>
      </Container>
    </ErrorBoundary>
  );
};

export default ActionItems;