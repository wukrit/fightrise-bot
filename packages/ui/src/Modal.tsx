import React from 'react';

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
  zIndex: 1000,
  padding: '20px',
  animation: 'fadeIn 0.2s ease',
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { maxWidth: '400px', width: '100%' },
  md: { maxWidth: '560px', width: '100%' },
  lg: { maxWidth: '720px', width: '100%' },
};

const modalStyles: React.CSSProperties = {
  backgroundColor: 'var(--color-bg, #ffffff)',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  maxHeight: '90vh',
  overflow: 'auto',
  animation: 'slideUp 0.2s ease',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 24px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
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
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  padding: '16px 24px',
  borderTop: '1px solid var(--color-border, #e5e5e5)',
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
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={overlayStyles} onClick={handleOverlayClick}>
      <div style={{ ...modalStyles, ...sizeStyles[size] }}>
        {title && (
          <div style={headerStyles}>
            <h2 style={titleStyles}>{title}</h2>
            <button
              style={closeButtonStyles}
              onClick={onClose}
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
