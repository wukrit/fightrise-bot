import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { UserMenu } from './UserMenu';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  SessionProvider: vi.fn(({ children }) => children),
}));

import { useSession } from 'next-auth/react';

const mockUseSession = useSession as ReturnType<typeof vi.fn>;

describe('UserMenu', () => {
  it('should render sign in button when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<UserMenu />);
    const button = screen.getByRole('button', { name: /sign in with discord/i });
    expect(button).toBeInTheDocument();
  });

  it('should render loading state when status is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(<UserMenu />);
    const loading = screen.getByText('Loading...');
    expect(loading).toBeInTheDocument();
  });

  it('should render username and avatar when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          discordId: 'discord-456',
          discordUsername: 'testuser',
          discordAvatar: 'avatar-hash',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
    });

    render(<UserMenu />);
    const username = screen.getByText('testuser');
    expect(username).toBeInTheDocument();
  });

  it('should render sign out button when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          discordId: 'discord-456',
          discordUsername: 'testuser',
          discordAvatar: 'avatar-hash',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
    });

    render(<UserMenu />);
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toBeInTheDocument();
  });

  it('should render default avatar when user has no custom avatar', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          discordId: '123456789',
          discordUsername: 'testuser',
          discordAvatar: null,
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
    });

    render(<UserMenu />);
    const username = screen.getByText('testuser');
    expect(username).toBeInTheDocument();
  });
});
