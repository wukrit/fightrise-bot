import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: tokens.zIndex.modal,
  padding: tokens.spacing.md,
  animation: 'fadeIn 200ms ease',
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
  animation: 'slideUp 200ms ease',
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
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyles} className="modal-overlay" />
        <Dialog.Content
          style={{ ...modalStyles, ...sizeStyles[size] }}
          className="modal-content"
        >
          {title && (
            <div style={headerStyles}>
              <Dialog.Title style={titleStyles}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  style={closeButtonStyles}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              </Dialog.Close>
            </div>
          )}
          <div style={contentStyles}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
