import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SessionProvider } from './SessionProvider';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: vi.fn(({ children }) => children),
}));

describe('SessionProvider', () => {
  it('should render children', () => {
    const { container } = render(
      <SessionProvider>
        <div>Test Content</div>
      </SessionProvider>
    );

    expect(container.textContent).toBe('Test Content');
  });

  it('should accept session prop', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: '2024-01-01',
    };

    // This should not throw
    expect(() =>
      render(
        <SessionProvider session={mockSession as any}>
          <div>Content</div>
        </SessionProvider>
      )
    ).not.toThrow();
  });

  it('should accept null session', () => {
    expect(() =>
      render(
        <SessionProvider session={null}>
          <div>Content</div>
        </SessionProvider>
      )
    ).not.toThrow();
  });

  it('should wrap children with NextAuth SessionProvider', () => {
    const { container } = render(
      <SessionProvider>
        <span>Wrapped Content</span>
      </SessionProvider>
    );

    const span = container.querySelector('span');
    expect(span).toHaveTextContent('Wrapped Content');
    expect(NextAuthSessionProvider).toHaveBeenCalled();
  });
});
