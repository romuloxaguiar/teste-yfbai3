import React from 'react'; // v18.0.0
import { ACCESSIBILITY } from '../constants/ui.constants';

// Selector for finding focusable elements
const FOCUSABLE_ELEMENTS = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1']), [contenteditable]";

// Types for function parameters
interface FocusOptions extends React.FocusOptions {
  persistFocus?: boolean;
  customRing?: string;
}

interface HideOptions {
  removeFromFlow?: boolean;
  restoreFocusTo?: HTMLElement;
}

interface FocusTrapOptions {
  initialFocus?: HTMLElement;
  escapeDeactivates?: boolean;
  returnFocusOnDeactivate?: boolean;
}

/**
 * Generates dynamic ARIA labels for UI elements based on their type and state
 * @param elementType - Type of UI element requiring an ARIA label
 * @param props - Properties to interpolate into the label template
 * @returns Formatted ARIA label string
 */
export const getAriaLabel = (elementType: string, props: Record<string, any> = {}): string => {
  if (!elementType) {
    throw new Error('Element type is required for ARIA label generation');
  }

  const labelTemplate = ACCESSIBILITY.ARIA_LABELS[elementType];
  if (!labelTemplate) {
    console.warn(`No ARIA label template found for element type: ${elementType}`);
    return elementType; // Fallback to element type as label
  }

  // Interpolate props into label template if it contains placeholders
  let label = labelTemplate;
  Object.entries(props).forEach(([key, value]) => {
    label = label.replace(`{${key}}`, value);
  });

  return label;
};

/**
 * Manages keyboard focus visibility with enhanced focus ring styles
 * @param element - DOM element to manage focus for
 * @param visible - Whether focus should be visible
 * @param options - Additional focus options
 */
export const setFocusVisible = (
  element: HTMLElement,
  visible: boolean,
  options: FocusOptions = {}
): void => {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Valid HTML element required for focus management');
  }

  const { persistFocus, customRing, preventScroll } = options;

  // Apply focus ring styles
  const focusStyle = customRing || ACCESSIBILITY.FOCUS_VISIBLE.ring;
  element.style.outline = visible ? 'none' : '';
  element.style.boxShadow = visible ? focusStyle : '';

  // Update tab index if needed
  if (typeof options.tabIndex === 'number') {
    element.tabIndex = options.tabIndex;
  }

  // Handle focus persistence
  if (persistFocus) {
    element.dataset.persistFocus = 'true';
  }

  // Focus the element if needed
  if (visible) {
    element.focus({ preventScroll });
  }

  // Update ARIA states
  if (element.hasAttribute('aria-selected')) {
    element.setAttribute('aria-selected', visible.toString());
  }
  if (element.hasAttribute('aria-expanded')) {
    element.setAttribute('aria-expanded', visible.toString());
  }
};

/**
 * Comprehensively hides elements from screen readers
 * @param element - Element to hide from screen readers
 * @param options - Configuration options for hiding
 */
export const hideFromScreenReader = (
  element: HTMLElement,
  options: HideOptions = {}
): void => {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Valid HTML element required for screen reader hiding');
  }

  const { removeFromFlow, restoreFocusTo } = options;

  // Set ARIA attributes
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('tabindex', '-1');

  // Add screen reader only class if needed
  if (removeFromFlow) {
    Object.assign(element.style, ACCESSIBILITY.SCREEN_READER_TEXT.style);
  }

  // Handle aria-live regions
  if (element.hasAttribute('aria-live')) {
    element.setAttribute('aria-live', 'off');
  }

  // Store previous focus if restoration point provided
  if (restoreFocusTo && document.activeElement === element) {
    restoreFocusTo.focus();
  }

  // Remove element from sequential focus navigation
  element.querySelectorAll(FOCUSABLE_ELEMENTS).forEach(child => {
    if (child instanceof HTMLElement) {
      child.setAttribute('tabindex', '-1');
    }
  });
};

/**
 * Creates a focus trap for modal dialogs with keyboard navigation support
 * @param container - Container element to trap focus within
 * @param options - Focus trap configuration options
 * @returns Object with methods to activate and deactivate the focus trap
 */
export const createFocusTrap = (
  container: HTMLElement,
  options: FocusTrapOptions = {}
): { activate: () => void; deactivate: () => void } => {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('Valid HTML element required for focus trap');
  }

  const {
    initialFocus,
    escapeDeactivates = true,
    returnFocusOnDeactivate = true
  } = options;

  let focusableElements: HTMLElement[] = [];
  let previouslyFocusedElement: HTMLElement | null = null;
  let isActive = false;

  const updateFocusableElements = (): void => {
    focusableElements = Array.from(
      container.querySelectorAll(FOCUSABLE_ELEMENTS)
    ).filter(
      el => el instanceof HTMLElement && window.getComputedStyle(el).display !== 'none'
    ) as HTMLElement[];
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!isActive) return;

    if (event.key === 'Tab') {
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          event.preventDefault();
          lastFocusableEl.focus();
        }
      } else {
        if (document.activeElement === lastFocusableEl) {
          event.preventDefault();
          firstFocusableEl.focus();
        }
      }
    } else if (event.key === 'Escape' && escapeDeactivates) {
      deactivate();
    }
  };

  const activate = (): void => {
    if (isActive) return;

    isActive = true;
    previouslyFocusedElement = document.activeElement as HTMLElement;
    updateFocusableElements();

    // Set initial focus
    if (initialFocus && focusableElements.includes(initialFocus)) {
      initialFocus.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    container.addEventListener('keydown', handleKeyDown);
    // Update focusable elements when DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, { childList: true, subtree: true });
  };

  const deactivate = (): void => {
    if (!isActive) return;

    isActive = false;
    container.removeEventListener('keydown', handleKeyDown);

    if (returnFocusOnDeactivate && previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }
  };

  return { activate, deactivate };
};