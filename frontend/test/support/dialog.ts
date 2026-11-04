import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export async function confirmInDialog(confirmLabel: string) {
  const dialog = await screen.findByRole('dialog');
  const confirm = within(dialog).getByRole('button', { name: confirmLabel });
  expect(confirm).toBeDisabled();
  await userEvent.click(within(dialog).getByRole('checkbox', { name: /não pode ser desfeita/ }));
  await userEvent.click(confirm);
}
