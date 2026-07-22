// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from '../LoginScreen';

afterEach(cleanup);

describe('LoginScreen', () => {
  it('uses the required aquarium image and keeps placeholder legal links inert', () => {
    const { container } = render(
      <LoginScreen isLoading={false} isExiting={false} onSignIn={vi.fn()} />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/oceaneyes-login-aquarium.png');
    expect(container.querySelector('.glass-card')).not.toBeNull();

    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy (placeholder)' });
    const termsLink = screen.getByRole('link', { name: 'Terms of Service (placeholder)' });
    fireEvent.click(privacyLink);
    fireEvent.click(termsLink);

    expect(window.location.hash).toBe('');
  });
});
