import { act, render } from '@testing-library/react';
import { AuthShowcase, showcaseSteps } from '../src/layout/AuthShowcase';

function wait(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 300) {
    act(() => vi.advanceTimersByTime(300));
  }
}

function doneCount(container: HTMLElement) {
  return container.querySelectorAll('.showcase-step.is-done').length;
}

describe('vitrine da tela de login', () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('conclui a trilha uma vez, avisa o gestor e para', () => {
    vi.useFakeTimers();
    const { container } = render(<AuthShowcase />);

    expect(container.querySelectorAll('.showcase-step')).toHaveLength(showcaseSteps.length);
    expect(doneCount(container)).toBe(0);
    expect(container).toHaveTextContent('0 de 5 passos');
    expect(container).not.toHaveTextContent('Gestor avisado');

    wait(10_000);
    expect(doneCount(container)).toBe(5);
    expect(container).toHaveTextContent('Trilha concluída');
    expect(container).toHaveTextContent('Gestor avisado');

    wait(30_000);
    expect(doneCount(container)).toBe(5);
  });

  it('mostra a trilha concluída sem animar para quem prefere menos movimento', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { container } = render(<AuthShowcase />);

    expect(doneCount(container)).toBe(5);
    expect(container).toHaveTextContent('Gestor avisado');
  });
});
