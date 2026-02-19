import React from 'react';

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
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
  animation: 'fadeIn 0.2s ease',
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
  backgroundColor: 'var(--color-bg, #ffffff)',
  boxShadow: side === 'left'
    ? '4px 0 6px -1px rgba(0, 0, 0, 0.1)'
    : '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
  zIndex: 1001,
  display: 'flex',
  flexDirection: 'column',
  animation: side === 'left' ? 'slideInLeft 0.2s ease' : 'slideInRight 0.2s ease',
});

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 24px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
  flexShrink: 0,
};

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text, #1a1a1a)',
};

const closeButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease',
};

const contentStyles: React.CSSProperties = {
  padding: '24px',
  overflow: 'auto',
  flex: 1,
};

const footerStyles: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid var(--color-border, #e5e5e5)',
  display: 'flex',
  gap: '12px',
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
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to return focus later
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus the drawer container
      setTimeout(() => {
        drawerRef.current?.focus();
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
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll<HTMLElement>(
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

    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
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
    <>
      <div style={overlayStyles} onClick={handleOverlayClick} />
      <div
        ref={drawerRef}
        style={getDrawerStyles(side, sizeStyles[size])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
      >
        {title && (
          <div style={headerStyles}>
            <h2 id="drawer-title" style={titleStyles}>{title}</h2>
            <button
              style={closeButtonStyles}
              onClick={handleClose}
              aria-label="Close drawer"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div style={contentStyles}>{children}</div>
      </div>
    </>
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
