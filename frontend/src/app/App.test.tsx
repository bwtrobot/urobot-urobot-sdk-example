import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../pages/workbench/SpatialWorkbenchPage', () => ({
  SpatialWorkbenchPage: () => <main>uRobot SDK Web Example</main>,
}));

describe('App', () => {
  it('renders the SDK example shell', () => {
    render(<App />);

    expect(screen.getByText('uRobot SDK Web Example')).toBeInTheDocument();
  });
});
