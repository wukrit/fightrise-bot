import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInButton } from './SignInButton';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { signIn } from 'next-auth/react';

describe('SignInButton', () => {
  it('should render a button with Discord sign-in text', () => {
    render(<SignInButton />);
    const button = screen.getByRole('button', { name: /sign in with discord/i });
    expect(button).toBeInTheDocument();
  });

  it('should render with default callback URL', () => {
    render(<SignInButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should call signIn with Discord provider on click', async () => {
    const user = userEvent.setup();
    render(<SignInButton callbackUrl="/dashboard" />);

    const button = screen.getByRole('button', { name: /sign in with discord/i });
    await user.click(button);

    expect(signIn).toHaveBeenCalledWith('discord', { callbackUrl: '/dashboard' });
  });

  it('should use default callback URL when not provided', async () => {
    const user = userEvent.setup();
    render(<SignInButton />);

    const button = screen.getByRole('button', { name: /sign in with discord/i });
    await user.click(button);

    expect(signIn).toHaveBeenCalledWith('discord', { callbackUrl: '/' });
  });

  it('should render with custom callback URL', () => {
    render(<SignInButton callbackUrl="/custom" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
