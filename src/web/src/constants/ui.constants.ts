// Breakpoint values in pixels
const MIN_MOBILE_WIDTH = 320;
const MIN_TABLET_WIDTH = 768;
const MIN_DESKTOP_WIDTH = 1024;
const MIN_WIDE_WIDTH = 1440;

export const BREAKPOINTS = {
  MOBILE: {
    min: MIN_MOBILE_WIDTH,
    max: MIN_TABLET_WIDTH - 1,
    orientation: 'portrait'
  },
  TABLET: {
    min: MIN_TABLET_WIDTH,
    max: MIN_DESKTOP_WIDTH - 1,
    orientation: 'landscape'
  },
  DESKTOP: {
    min: MIN_DESKTOP_WIDTH,
    max: MIN_WIDE_WIDTH - 1
  },
  WIDE: {
    min: MIN_WIDE_WIDTH,
    max: Infinity
  }
} as const;

export const ACCESSIBILITY = {
  FOCUS_VISIBLE: {
    outline: 'none',
    ring: '2px solid #0078D4' // Teams primary color
  },
  MIN_TOUCH_TARGET: {
    width: 44, // WCAG 2.1 minimum touch target size
    height: 44
  },
  SCREEN_READER_TEXT: {
    className: 'sr-only',
    style: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    }
  },
  ARIA_LABELS: {
    closeButton: 'Close',
    menuButton: 'Toggle menu',
    searchInput: 'Search',
    nextPage: 'Next page',
    previousPage: 'Previous page',
    notification: 'Notification',
    loading: 'Loading content'
  },
  KEYBOARD_NAVIGATION: {
    skipLink: 'Skip to main content',
    focusTrap: 'dialog',
    tabIndex: '0',
    keyboardShortcuts: 'Keyboard shortcuts'
  }
} as const;

export const ANIMATION = {
  DURATION_SHORT: 200,
  DURATION_MEDIUM: 300,
  DURATION_LONG: 500,
  EASING: {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
    easeIn: 'cubic-bezier(0.42, 0.0, 1.0, 1.0)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.58, 1.0)',
    easeInOut: 'cubic-bezier(0.42, 0.0, 0.58, 1.0)'
  },
  REDUCED_MOTION: {
    enabled: true,
    duration: 0 // Instant transitions when reduced motion is enabled
  }
} as const;

export const Z_INDEX = {
  MODAL: 1000,
  OVERLAY: 900,
  TOOLTIP: 800,
  DROPDOWN: 700,
  NESTED_MODAL: 1100 // Higher than regular modal
} as const;

export const UI_STATES = {
  PROCESSING_STATES: {
    IDLE: 'idle',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },
  ERROR_STATES: {
    NONE: 'none',
    VALIDATION: 'validation',
    NETWORK: 'network',
    SYSTEM: 'system'
  },
  LOADING_STATES: {
    INITIAL: 'initial',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  }
} as const;

export const MEETING_UI = {
  CONTROL_STATES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DISABLED: 'disabled',
    LOADING: 'loading'
  },
  STATUS_TYPES: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success'
  },
  TAB_TYPES: {
    SUMMARY: 'summary',
    TRANSCRIPT: 'transcript',
    ACTIONS: 'actions',
    DECISIONS: 'decisions'
  }
} as const;