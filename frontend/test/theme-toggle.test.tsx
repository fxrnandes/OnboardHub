import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applyPreferences, readPreferences } from '../src/preferences/preferences';
import { mockFetch } from './support/fetch';
import { renderApp } from './support/render';

describe('troca de tema na landing', () => {
  afterEach(() => {
    localStorage.removeItem('onboardhub.preferences');
    applyPreferences(readPreferences());
  });

  it('alterna entre claro e escuro e lembra da escolha', async () => {
    mockFetch({});
    applyPreferences({ theme: 'light' });
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readPreferences().theme).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(readPreferences().theme).toBe('light');
  });
});
