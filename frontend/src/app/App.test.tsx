import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the SDK example shell', () => {
    render(<App />);

    expect(screen.getByText('uRobot SDK Web Example')).toBeInTheDocument();
  });
});
