import React, { useCallback, useMemo, memo } from 'react';
import { ChevronDown, ChevronRight } from '@fluentui/react-icons'; // ^1.1.0
import {
  TopicsContainer,
  TopicItem,
  TopicTitle,
  SubtopicList,
  SubtopicItem
} from './Topics.styles';
import type { WebTopic } from '../../../types/minutes.types';

interface TopicsProps {
  topics: WebTopic[];
  onTopicClick: (topicId: string) => void;
}

/**
 * Renders a recursive list of subtopics with proper hierarchy and accessibility
 * @param subtopics Array of subtopics to render
 * @param level Current nesting level for proper ARIA attributes
 * @param onTopicClick Click handler for topic expansion
 */
const renderSubtopics = (
  subtopics: WebTopic[],
  level: number,
  onTopicClick: (topicId: string) => void
): JSX.Element | null => {
  if (!subtopics?.length) return null;

  return (
    <SubtopicList
      role="list"
      aria-label={`Level ${level} subtopics`}
    >
      {subtopics.map((subtopic) => (
        <SubtopicItem
          key={subtopic.id}
          role="listitem"
          aria-expanded={subtopic.isExpanded}
          aria-level={level}
          aria-label={`Subtopic: ${subtopic.title}`}
        >
          <TopicItem
            onClick={() => onTopicClick(subtopic.id)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTopicClick(subtopic.id);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={subtopic.isExpanded}
            data-testid={`subtopic-${subtopic.id}`}
          >
            {subtopic.subtopics?.length > 0 && (
              <span aria-hidden="true">
                {subtopic.isExpanded ? <ChevronDown /> : <ChevronRight />}
              </span>
            )}
            <span>{subtopic.title}</span>
          </TopicItem>
          {subtopic.isExpanded && subtopic.content && (
            <div
              role="region"
              aria-label={`Content for ${subtopic.title}`}
            >
              {subtopic.content}
            </div>
          )}
          {subtopic.isExpanded && renderSubtopics(subtopic.subtopics, level + 1, onTopicClick)}
        </SubtopicItem>
      ))}
    </SubtopicList>
  );
};

/**
 * Topics component for displaying hierarchical meeting topics with Teams-aligned styling
 * Implements WCAG 2.1 Level AA compliance and performance optimizations
 */
const Topics: React.FC<TopicsProps> = memo(({ topics, onTopicClick }) => {
  // Memoize the click handler to prevent unnecessary re-renders
  const handleTopicClick = useCallback((topicId: string) => {
    onTopicClick(topicId);
  }, [onTopicClick]);

  // Memoize the root topics rendering for performance
  const renderedTopics = useMemo(() => {
    if (!topics?.length) {
      return (
        <div role="alert" aria-live="polite">
          No topics available for this meeting.
        </div>
      );
    }

    return topics.map((topic) => (
      <TopicItem
        key={topic.id}
        role="region"
        aria-label={`Topic: ${topic.title}`}
        data-testid={`topic-${topic.id}`}
      >
        <TopicTitle
          onClick={() => handleTopicClick(topic.id)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTopicClick(topic.id);
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={topic.isExpanded}
          aria-controls={`topic-content-${topic.id}`}
        >
          {topic.subtopics?.length > 0 && (
            <span 
              className="topic-icon" 
              aria-hidden="true"
            >
              {topic.isExpanded ? <ChevronDown /> : <ChevronRight />}
            </span>
          )}
          <span>{topic.title}</span>
        </TopicTitle>
        
        {topic.isExpanded && topic.content && (
          <div
            id={`topic-content-${topic.id}`}
            role="region"
            aria-label={`Content for ${topic.title}`}
          >
            {topic.content}
          </div>
        )}
        
        {topic.isExpanded && renderSubtopics(topic.subtopics, 2, handleTopicClick)}
      </TopicItem>
    ));
  }, [topics, handleTopicClick]);

  return (
    <TopicsContainer
      role="region"
      aria-label="Meeting Topics"
      data-testid="topics-container"
    >
      {renderedTopics}
    </TopicsContainer>
  );
});

Topics.displayName = 'Topics';

export default Topics;