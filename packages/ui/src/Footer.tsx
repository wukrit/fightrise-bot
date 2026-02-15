import React from 'react';

export interface FooterProps {
  children?: React.ReactNode;
}

const footerStyles: React.CSSProperties = {
  padding: '24px',
  backgroundColor: 'var(--color-bg, #ffffff)',
  borderTop: '1px solid var(--color-border, #e5e5e5)',
  textAlign: 'center',
  fontSize: '14px',
  color: '#6b7280',
};

const linkStyles: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
};

export function Footer({ children }: FooterProps) {
  return (
    <footer style={footerStyles}>
      {children || (
        <p>
          &copy; {new Date().getFullYear()} FightRise. All rights reserved.
        </p>
      )}
    </footer>
  );
}

export interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

export function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <a href={href} style={linkStyles}>
      {children}
    </a>
  );
}
