import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { tokens } from './tokens.js';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: tokens.zIndex.modal,
  animation: 'fadeIn 200ms ease',
};

const sizeStyles: Record<string, string> = {
  sm: '320px',
  md: '400px',
  lg: '560px',
};

const getDrawerStyles = (side: 'left' | 'right', size: string): React.CSSProperties => ({
  position: 'fixed',
  top: 0,
  [side]: 0,
  bottom: 0,
  width: size,
  maxWidth: '100vw',
  backgroundColor: tokens.colors.white,
  boxShadow: side === 'left'
    ? tokens.shadows.md
    : `-4px 0 6px -1px rgba(0, 0, 0, 0.1)`,
  zIndex: tokens.zIndex.modal + 1,
  display: 'flex',
  flexDirection: 'column',
  animation: side === 'left' ? 'slideInLeft 200ms ease' : 'slideInRight 200ms ease',
});

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  borderBottom: `1px solid ${tokens.colors.border}`,
  flexShrink: 0,
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
  overflow: 'auto',
  flex: 1,
};

const footerStyles: React.CSSProperties = {
  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  borderTop: `1px solid ${tokens.colors.border}`,
  display: 'flex',
  gap: tokens.spacing.sm,
  justifyContent: 'flex-end',
  flexShrink: 0,
};

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Drawer({ isOpen, onClose, title, children, side = 'right', size = 'md' }: DrawerProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyles} />
        <Dialog.Content
          style={getDrawerStyles(side, sizeStyles[size])}
          className="drawer-content"
        >
          {title && (
            <div style={headerStyles}>
              <Dialog.Title style={titleStyles}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  style={closeButtonStyles}
                  onClick={onClose}
                  aria-label="Close drawer"
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

export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DrawerContent({ children, style, ...props }: DrawerContentProps) {
  return (
    <div style={{ ...contentStyles, ...style }} {...props}>
      {children}
    </div>
  );
}

export interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DrawerFooter({ children, style, ...props }: DrawerFooterProps) {
  return (
    <div style={{ ...footerStyles, ...style }} {...props}>
      {children}
    </div>
  );
}
