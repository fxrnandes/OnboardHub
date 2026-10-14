import { Link } from 'react-router';
import { Logo } from '../../layout/Logo';

const features = [
  {
    title: 'Monte sem programar',
    text: 'Organize a trilha em módulos e passos com texto, vídeo, imagem e link. Edite em lista ou visualize como um fluxo.',
    tint: 'lavender',
  },
  {
    title: 'Cada cargo vê a sua trilha',
    text: 'Atribua trilhas aos cargos e cada pessoa recebe só o que é dela, sem planilhas nem e-mails perdidos.',
    tint: 'sky',
  },
  {
    title: 'Retome de onde parou',
    text: 'O progresso fica salvo a cada passo. Ao voltar, a pessoa continua exatamente do ponto em que estava.',
    tint: 'mint',
  },
  {
    title: 'Saiba quem precisa de ajuda',
    text: 'O painel mostra quem concluiu, quem está em andamento e quem está parado há mais de uma semana.',
    tint: 'peach',
  },
];

const steps = [
  { title: 'Crie as trilhas', text: 'Monte os módulos e passos do onboarding da sua empresa e publique para os cargos certos.' },
  { title: 'Convide o time', text: 'Gere um link de convite. A pessoa cria a senha e já entra vendo as trilhas do cargo dela.' },
  { title: 'Acompanhe o progresso', text: 'Veja o avanço de cada pessoa em tempo real e exporte o relatório em CSV quando precisar.' },
];

const preview = [
  { title: 'Boas-vindas à empresa', percent: 100, label: '4 de 4 passos', done: true },
  { title: 'Ferramentas do dia a dia', percent: 60, label: '3 de 5 passos', done: false },
  { title: 'Atendimento ao cliente', percent: 20, label: '1 de 5 passos', done: false },
];

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Seções">
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>
        <div className="landing-nav-actions">
          <Link to="/entrar" className="landing-login">
            Entrar
          </Link>
          <Link to="/cadastro" className="button">
            Criar conta
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="auth-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="landing-hero-content">
            <span className="landing-eyebrow">Onboarding para pequenas empresas</span>
            <h1>Do primeiro dia à autonomia, sem reunião repetida.</h1>
            <p>
              O OnboardHub transforma o treinamento de quem chega em trilhas organizadas por cargo, com conteúdo no
              ritmo de cada pessoa e acompanhamento para quem gerencia.
            </p>
            <div className="landing-hero-actions">
              <Link to="/cadastro" className="button">
                Criar conta da empresa
              </Link>
              <a href="#como-funciona" className="button button-on-dark">
                Ver como funciona
              </a>
            </div>
          </div>

          <div className="landing-mockup" aria-hidden="true">
            <div className="landing-mockup-bar">
              <span />
              <span />
              <span />
              <em>Minhas trilhas</em>
            </div>
            <div className="landing-mockup-body">
              {preview.map((trail) => (
                <div key={trail.title} className="landing-mockup-card">
                  {trail.done ? <span className="badge status-published">Concluída</span> : <span className="landing-mockup-spacer" />}
                  <strong>{trail.title}</strong>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${trail.percent}%` }} />
                  </div>
                  <span className="muted small">
                    {trail.label} · {trail.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="landing-section">
          <header className="landing-section-head">
            <h2>Tudo o que o onboarding precisa</h2>
            <p>Menos tempo explicando a mesma coisa, mais tempo com a pessoa trabalhando de verdade.</p>
          </header>
          <ul className="landing-features">
            {features.map((feature) => (
              <li key={feature.title} className={`landing-feature tint-${feature.tint}`}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="landing-section">
          <header className="landing-section-head">
            <h2>Como funciona</h2>
            <p>Três passos para tirar o onboarding das reuniões e colocar em um só lugar.</p>
          </header>
          <ol className="landing-steps">
            {steps.map((step, index) => (
              <li key={step.title} className="card">
                <span className="landing-step-number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-cta">
          <h2>Organize o onboarding da sua empresa hoje.</h2>
          <p>Crie a conta, monte a primeira trilha e convide o time em poucos minutos.</p>
          <Link to="/cadastro" className="button button-light">
            Criar conta da empresa
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Logo />
        <span>Projeto de TCC · Engenharia de Software · Católica SC · 2026</span>
      </footer>
    </div>
  );
}
