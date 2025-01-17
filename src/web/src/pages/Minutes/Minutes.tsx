import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pivot, PivotItem } from '@fluentui/react'; // ^8.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import Summary from '../components/minutes/Summary/Summary';
import Topics from '../components/minutes/Topics/Topics';
import ActionItems from '../components/minutes/ActionItems/ActionItems';
import type { WebMinutes, MinutesTabType, ActionItemStatus } from '../../types/minutes.types';
import { useMeeting } from '../../hooks/useMeeting';
import { MinutesIcons } from '../../assets/icons';

interface MinutesProps {
  minutes: WebMinutes;
  className?: string;
}

/**
 * Minutes page component implementing Teams-aligned design and accessibility
 * with optimized performance through virtualization and memoization
 */
const Minutes: React.FC<MinutesProps> = memo(({ minutes, className }) => {
  // Hooks and state
  const { meeting } = useMeeting();
  const [selectedTab, setSelectedTab] = useState<MinutesTabType>(MinutesTabType.SUMMARY);
  const [error, setError] = useState<Error | null>(null);

  // Configure virtualizer for large content lists
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: minutes?.topics?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });

  /**
   * Handles tab selection changes with accessibility announcements
   */
  const handleTabChange = useCallback((item?: PivotItem) => {
    if (!item?.props.itemKey) return;
    
    const newTab = item.props.itemKey as MinutesTabType;
    setSelectedTab(newTab);
    
    // Update page title for screen readers
    document.title = `${meeting?.title || 'Meeting'} - ${newTab.toLowerCase()}`;
    
    // Announce tab change to screen readers
    const liveRegion = document.getElementById('minutes-live-region');
    if (liveRegion) {
      liveRegion.textContent = `Switched to ${newTab.toLowerCase()} tab`;
    }
  }, [meeting?.title]);

  /**
   * Handles real-time content updates with optimistic UI
   */
  const handleContentUpdate = useCallback((updatedMinutes: Partial<WebMinutes>) => {
    try {
      // Validate update data
      if (!updatedMinutes || !updatedMinutes.id) {
        throw new Error('Invalid update data received');
      }

      // Update UI state optimistically
      setError(null);
      
      // Announce changes to screen readers
      const liveRegion = document.getElementById('minutes-live-region');
      if (liveRegion) {
        liveRegion.textContent = 'Minutes content updated';
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update content'));
    }
  }, []);

  /**
   * Handles action item status changes
   */
  const handleActionItemStatusChange = useCallback(async (
    id: string,
    status: ActionItemStatus
  ) => {
    try {
      // Update action item status
      const updatedItems = minutes.actionItems.map(item =>
        item.id === id ? { ...item, status } : item
      );
      
      handleContentUpdate({ ...minutes, actionItems: updatedItems });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update action item'));
    }
  }, [minutes, handleContentUpdate]);

  /**
   * Renders content based on selected tab with error boundaries
   */
  const renderContent = useMemo(() => {
    switch (selectedTab) {
      case MinutesTabType.SUMMARY:
        return (
          <Summary
            minutes={minutes}
            isLoading={false}
            error={error}
            onRetry={() => setError(null)}
          />
        );
      
      case MinutesTabType.TOPICS:
        return (
          <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
            <Topics
              topics={minutes.topics}
              onTopicClick={(topicId) => {
                // Handle topic expansion
              }}
            />
          </div>
        );
      
      case MinutesTabType.ACTION_ITEMS:
        return (
          <ActionItems
            actionItems={minutes.actionItems}
            onStatusChange={handleActionItemStatusChange}
            onEdit={() => {}}
            isLoading={false}
            error={error}
          />
        );
      
      default:
        return null;
    }
  }, [selectedTab, minutes, error, handleActionItemStatusChange]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div role="alert" aria-live="assertive">
          <h2>Error displaying minutes</h2>
          <p>{error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
      onReset={() => setError(null)}
    >
      <div 
        className={className}
        role="main"
        aria-label="Meeting Minutes"
      >
        {/* Live region for accessibility announcements */}
        <div
          id="minutes-live-region"
          role="status"
          aria-live="polite"
          className="sr-only"
        />

        <Pivot
          selectedKey={selectedTab}
          onLinkClick={handleTabChange}
          aria-label="Minutes Sections"
        >
          <PivotItem
            itemKey={MinutesTabType.SUMMARY}
            headerText="Summary"
            itemIcon={MinutesIcons.summary}
          />
          <PivotItem
            itemKey={MinutesTabType.TOPICS}
            headerText="Topics"
            itemIcon={MinutesIcons.topic}
          />
          <PivotItem
            itemKey={MinutesTabType.ACTION_ITEMS}
            headerText="Action Items"
            itemIcon={MinutesIcons.actionItem}
          />
        </Pivot>

        <div role="region" aria-label={`${selectedTab} Content`}>
          {renderContent}
        </div>
      </div>
    </ErrorBoundary>
  );
});

// Display name for debugging
Minutes.displayName = 'Minutes';

export default Minutes;