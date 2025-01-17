import React, { memo, useEffect, useCallback, useRef } from 'react';
import {
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalContent,
  ModalFooter,
  CloseButton
} from './Modal.styles';
import { Icon } from '../Icon/Icon';
import { createFocusTrap, getAriaLabel } from '../../../utils/accessibility';
import { Z_INDEX, ACCESSIBILITY } from '../../../constants/ui.constants';

interface ModalProps {
  /** Controls modal visibility state */
  isOpen: boolean;
  /** Callback function when modal is closed */
  onClose: () => void;
  /** Modal title text with ARIA support */
  title: string;
  /** Modal content with accessibility context */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Optional custom CSS class */
  className?: string;
  /** Optional responsive width override */
  width?: string;
  /** Optional high contrast mode toggle */
  highContrast?: boolean;
}

/**
 * Modal component implementing Microsoft Teams design system standards
 * with comprehensive accessibility features and responsive design
 */
const Modal: React.FC<ModalProps> = memo(({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  width,
  highContrast = false
}) => {
  // Refs for DOM elements and focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const focusTrapRef = useRef<{ activate: () => void; deactivate: () => void } | null>(null);

  // Initialize focus trap when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store current active element for focus restoration
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Create and activate focus trap
      focusTrapRef.current = createFocusTrap(modalRef.current, {
        initialFocus: modalRef.current.querySelector('[data-autofocus]') as HTMLElement,
        escapeDeactivates: true,
        returnFocusOnDeactivate: true
      });
      focusTrapRef.current.activate();

      // Prevent background scrolling
      document.body.style.overflow = 'hidden';

      // Add ARIA attributes to mark other content as hidden
      document.querySelectorAll('body > *:not([aria-hidden])').forEach(element => {
        if (element !== modalRef.current?.parentElement) {
          element.setAttribute('aria-hidden', 'true');
        }
      });
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
      }
      // Restore background scrolling and ARIA attributes
      document.body.style.overflow = '';
      document.querySelectorAll('[aria-hidden="true"]').forEach(element => {
        element.removeAttribute('aria-hidden');
      });
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Handle escape key press
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <ModalOverlay
      role="presentation"
      onClick={handleOverlayClick}
      style={{ zIndex: Z_INDEX.MODAL }}
      data-high-contrast={highContrast}
    >
      <ModalContainer
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
        className={className}
        style={{ width: width }}
        data-high-contrast={highContrast}
      >
        <ModalHeader>
          <h2 id="modal-title">
            {title}
          </h2>
          <CloseButton
            onClick={onClose}
            aria-label={getAriaLabel('closeButton')}
            data-autofocus
          >
            <Icon
              name="end"
              size="md"
              variant={highContrast ? 'primary' : 'secondary'}
              ariaLabel={ACCESSIBILITY.ARIA_LABELS.closeButton}
            />
          </CloseButton>
        </ModalHeader>

        <ModalContent role="document">
          {children}
        </ModalContent>

        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
});

// Display name for debugging
Modal.displayName = 'Modal';

export default Modal;