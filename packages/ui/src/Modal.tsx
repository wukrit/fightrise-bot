import React from 'react';
import { tokens } from './tokens.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: tokens.zIndex.modal,
  padding: tokens.spacing.md,
  animation: 'fadeIn 0.2s ease',
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { maxWidth: '400px', width: '100%' },
  md: { maxWidth: '560px', width: '100%' },
  lg: { maxWidth: '720px', width: '100%' },
};

const modalStyles: React.CSSProperties = {
  backgroundColor: tokens.colors.white,
  borderRadius: tokens.borderRadius.xl,
  boxShadow: tokens.shadows.lg,
  maxHeight: '90vh',
  overflow: 'auto',
  animation: 'slideUp 0.2s ease',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  borderBottom: `1px solid ${tokens.colors.border}`,
};

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: tokens.typography.fontSize.lg,
  fontWeight: tokens.typography.fontWeight.semibold,
  color: tokens.colors.gray[900],
};

const closeButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: tokens.spacing.sm,
  borderRadius: tokens.borderRadius.md,
  color: tokens.colors.gray[500],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: tokens.transitions.fast,
};

const contentStyles: React.CSSProperties = {
  padding: tokens.spacing.lg,
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  gap: tokens.spacing.sm,
  justifyContent: 'flex-end',
  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  borderTop: `1px solid ${tokens.colors.border}`,
};

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to return focus later
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus the modal container
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    // Return focus to the trigger element
    previousActiveElement.current?.focus();
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div style={overlayStyles} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div
        ref={modalRef}
        style={{ ...modalStyles, ...sizeStyles[size] }}
        tabIndex={-1}
      >
        {title && (
          <div style={headerStyles}>
            <h2 id="modal-title" style={titleStyles}>{title}</h2>
            <button
              style={closeButtonStyles}
              onClick={handleClose}
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div style={contentStyles}>{children}</div>
      </div>
    </div>
  );
}

export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ModalContent({ children, style, ...props }: ModalContentProps) {
  return (
    <div style={{ ...contentStyles, ...style }} {...props}>
      {children}
    </div>
  );
}

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ModalFooter({ children, style, ...props }: ModalFooterProps) {
  return (
    <div style={{ ...footerStyles, ...style }} {...props}>
      {children}
    </div>
  );
}
