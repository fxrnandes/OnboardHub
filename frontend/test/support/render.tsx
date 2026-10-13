import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../../src/App';
import { AuthProvider } from '../../src/auth/AuthContext';

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}
