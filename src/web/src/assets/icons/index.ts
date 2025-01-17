// @fluentui/react-icons version: ^2.0.0
import { 
  RecordRegular,
  RecordStopRegular,
  MicRegular,
  DismissRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  InfoRegular,
  ArrowDownloadRegular,
  ShareRegular,
  EditRegular,
  DeleteRegular,
  DocumentRegular,
  BulletedListRegular,
  TaskListSquareRegular,
  ClipboardTaskRegular
} from '@fluentui/react-icons';
import React from 'react'; // version: ^18.0.0

// Icon size constants for consistent sizing across application
export const ICON_SIZES = {
  SM: 16,
  MD: 20,
  LG: 24,
  XL: 32
} as const;

// Teams-aligned color tokens for icons
export const ICON_COLORS = {
  PRIMARY: 'var(--teams-color-primary)',
  SUCCESS: 'var(--teams-color-success)',
  ERROR: 'var(--teams-color-error)',
  WARNING: 'var(--teams-color-warning)',
  INFO: 'var(--teams-color-info)'
} as const;

// Interface for icon component props with accessibility support
export interface IconComponent {
  size: typeof ICON_SIZES[keyof typeof ICON_SIZES];
  color?: string;
  className?: string;
  ariaLabel: string;
  role?: string;
}

// Meeting control and status icons
export const MeetingIcons = {
  transcription: (props: IconComponent) => (
    <MicRegular 
      fontSize={props.size} 
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  start: (props: IconComponent) => (
    <RecordRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  stop: (props: IconComponent) => (
    <RecordStopRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  end: (props: IconComponent) => (
    <DismissRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  )
};

// Notification and status indicator icons
export const NotificationIcons = {
  success: (props: IconComponent) => (
    <CheckmarkCircleRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.SUCCESS}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  error: (props: IconComponent) => (
    <DismissCircleRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.ERROR}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  warning: (props: IconComponent) => (
    <WarningRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.WARNING}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  info: (props: IconComponent) => (
    <InfoRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.INFO}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  )
};

// Action-related icons for user interactions
export const ActionIcons = {
  download: (props: IconComponent) => (
    <ArrowDownloadRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  share: (props: IconComponent) => (
    <ShareRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  edit: (props: IconComponent) => (
    <EditRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  delete: (props: IconComponent) => (
    <DeleteRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  )
};

// Meeting minutes content section icons
export const MinutesIcons = {
  summary: (props: IconComponent) => (
    <DocumentRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  topic: (props: IconComponent) => (
    <BulletedListRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  actionItem: (props: IconComponent) => (
    <TaskListSquareRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  ),
  decision: (props: IconComponent) => (
    <ClipboardTaskRegular
      fontSize={props.size}
      color={props.color || ICON_COLORS.PRIMARY}
      className={props.className}
      aria-label={props.ariaLabel}
      role={props.role || 'img'}
    />
  )
};