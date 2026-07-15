// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PhoneFrame } from '../PhoneFrame';

afterEach(cleanup);

describe('PhoneFrame', () => {
  it('renders the application without a simulated device status bar', () => {
    const { container } = render(
      <PhoneFrame navigation={<nav>Navigation</nav>}>
        <main>Application</main>
      </PhoneFrame>,
    );

    expect(screen.getByText('Application')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
    expect(container.querySelector('.status-bar')).toBeNull();
    expect(container.querySelector('.phone-content')).toBeTruthy();
  });
});
