import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../layout/Logo';
import {
  ChartIcon,
  CheckIcon,
  ClockIcon,
  FlowIcon,
  LayersIcon,
  MailIcon,
  PlayIcon,
  RouteIcon,
  ShieldIcon,
  DevicesIcon,
  TagIcon,
  UsersIcon,
} from '../../layout/icons';
import { prefersReducedMotion } from '../../preferences/preferences';

function Clip({ name, label }: { name: string; label: string }) {
  const [still] = useState(prefersReducedMotion);
  return (
    <video
      className="lp-media"
      src={`/landing/${name}.mp4`}
      poster={`/landing/${name}-poster.webp`}
      aria-label={label}
      autoPlay={!still}
      controls={still}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

function Shot({ name, label }: { name: string; label: string }) {
  return (
    <>
      <img className="lp-media only-light" src={`/landing/${name}-light.webp`} alt={label} loading="lazy" />
      <img className="lp-media only-dark" src={`/landing/${name}-dark.webp`} alt={label} loading="lazy" />
    </>
  );
}

function Window({ children, address }: { children: ReactNode; address: string }) {
  return (
    <div className="lp-window">
      <div className="lp-window-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <em>{address}</em>
      </div>
      {children}
    </div>
  );
}

const audiences = [
  {
    icon: <LayersIcon />,
    title: 'Quem monta',
    text: 'Administradores e gestores organizam o conteúdo em trilhas e escolhem para quais cargos cada uma vale.',
  },
  {
    icon: <RouteIcon />,
    title: 'Quem chega',
    text: 'Colaboradores veem só o que é do cargo deles, avançam no próprio ritmo e retomam de onde pararam.',
  },
  {
    icon: <ChartIcon />,
    title: 'Quem acompanha',
    text: 'Gestores enxergam o progresso de cada pessoa e sabem quem está há dias sem avançar.',
  },
];

const features = [
  { icon: <TagIcon />, title: 'Trilhas por cargo', text: 'Cada pessoa recebe só as trilhas do cargo dela, sem lista genérica para todo mundo.' },
  { icon: <PlayIcon />, title: 'Texto, vídeo, link e imagem', text: 'Vídeos do YouTube e do Vimeo tocam dentro do passo, sem abrir outra aba.' },
  { icon: <FlowIcon />, title: 'Lista ou fluxo', text: 'Edite a trilha em lista ou veja o caminho inteiro desenhado como um fluxo.' },
  { icon: <ClockIcon />, title: 'Retoma de onde parou', text: 'O progresso é salvo a cada passo e a trilha abre no primeiro passo pendente.' },
  { icon: <ChartIcon />, title: 'Painel com CSV', text: 'Progresso por pessoa e por trilha, filtros e relatório para exportar.' },
  { icon: <MailIcon />, title: 'Convite por link', text: 'Gere o link com papel e cargo definidos. A pessoa cria a própria senha.' },
  { icon: <UsersIcon />, title: 'Três papéis', text: 'Administrador, gestor e colaborador, cada um com o acesso que precisa.' },
  { icon: <ShieldIcon />, title: 'Dados separados por empresa', text: 'Uma empresa nunca vê pessoas, trilhas ou progresso de outra.' },
  { icon: <DevicesIcon />, title: 'Claro, escuro e celular', text: 'Funciona no navegador do computador e do celular, no tema que a pessoa preferir.' },
];

const steps = [
  { title: 'Crie a conta da empresa', text: 'Nome, e-mail e senha, depois o nome da empresa e o CNPJ. Você entra como administrador.' },
  { title: 'Monte e publique uma trilha', text: 'Divida em módulos, adicione os passos e marque os cargos que devem ver a trilha.' },
  { title: 'Convide o time', text: 'Envie o link de convite. A pessoa entra e já encontra as trilhas do cargo dela.' },
];

const faq = [
  {
    question: 'Preciso instalar alguma coisa?',
    answer: 'Não. O OnboardHub funciona no navegador, tanto no computador quanto no celular.',
  },
  {
    question: 'Como as pessoas entram na empresa?',
    answer: 'O administrador gera um link de convite com o papel e o cargo da pessoa. O link vale por 7 dias e só pode ser usado uma vez.',
  },
  {
    question: 'Posso colocar vídeos nas trilhas?',
    answer: 'Sim. Cole o link do YouTube ou do Vimeo e o vídeo toca dentro do passo. Arquivos de vídeo também funcionam pelo endereço.',
  },
  {
    question: 'Quem vê o progresso de cada pessoa?',
    answer: 'Administradores e gestores, pelo painel. Cada colaborador vê apenas o próprio progresso.',
  },
  {
    question: 'Os dados da minha empresa ficam separados?',
    answer: 'Sim. Toda consulta é filtrada pela empresa, então pessoas, trilhas e progresso de uma empresa nunca aparecem para outra.',
  },
  {
    question: 'Quanto custa?',
    answer: 'O OnboardHub é um projeto de TCC em Engenharia de Software e pode ser usado sem custo durante o desenvolvimento.',
  },
];

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">
      <header className={scrolled ? 'lp-nav is-scrolled' : 'lp-nav'}>
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="OnboardHub, início">
            <Logo />
          </Link>
          <nav aria-label="Seções">
            <a href="#recursos">Recursos</a>
            <a href="#como-comecar">Como começar</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/entrar" className="lp-login">
              Entrar
            </Link>
            <Link to="/cadastro" className="button">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="lp-title">
          <div className="lp-container lp-hero-copy">
            <h1 id="lp-title">Do primeiro dia à autonomia, sem reunião repetida.</h1>
            <p>
              O OnboardHub organiza o treinamento de quem chega em trilhas por cargo. Cada pessoa avança no próprio ritmo e quem
              gerencia vê o progresso de todo mundo.
            </p>
            <div className="lp-hero-actions">
              <Link to="/cadastro" className="button lp-button-lg">
                Criar conta da empresa
              </Link>
              <a href="#como-comecar" className="button button-secondary lp-button-lg">
                Ver como começar
              </a>
            </div>
            <ul className="lp-hero-notes">
              <li>
                <CheckIcon />
                Funciona no navegador
              </li>
              <li>
                <CheckIcon />
                Convite por link
              </li>
              <li>
                <CheckIcon />
                Sem custo durante o TCC
              </li>
            </ul>
          </div>
          <div className="lp-container lp-hero-shot">
            <Window address="onboardhub / minhas trilhas">
              <Clip name="hero" label="Um professor conclui os últimos passos da trilha de onboarding e vê a trilha concluída" />
            </Window>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-audiences">
          <div className="lp-container">
            <header className="lp-head">
              <h2 id="lp-audiences">Um lugar só para os três lados do onboarding.</h2>
              <p>Quem prepara o conteúdo, quem está aprendendo e quem acompanha trabalham na mesma trilha.</p>
            </header>
            <ul className="lp-audiences">
              {audiences.map((item) => (
                <li key={item.title}>
                  <span className="lp-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-band" aria-labelledby="lp-build">
          <div className="lp-container lp-split">
            <div className="lp-split-text">
              <h2 id="lp-build">Explique uma vez. A trilha explica para quem chegar depois.</h2>
              <p>
                Monte o onboarding em módulos e passos com texto, vídeo, link ou imagem. Edite em lista ou veja o caminho inteiro
                como fluxo, e publique só quando estiver pronto.
              </p>
              <Link to="/cadastro" className="lp-text-link">
                Montar minha primeira trilha
              </Link>
            </div>
            <Window address="onboardhub / trilhas">
              <Clip name="editor" label="Edição de um passo e troca para o modo fluxo no editor de trilhas" />
            </Window>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-learn">
          <div className="lp-container lp-split is-flipped">
            <div className="lp-split-text">
              <h2 id="lp-learn">Quem chega sabe por onde começar.</h2>
              <p>
                O início mostra a próxima trilha e quanto falta. O progresso fica salvo a cada passo, então dá para parar no meio e
                continuar no dia seguinte, no computador ou no celular.
              </p>
            </div>
            <Window address="onboardhub / início">
              <Shot name="inicio" label="Tela inicial de um colaborador com a trilha em andamento" />
            </Window>
          </div>
        </section>

        <section className="lp-section lp-band" aria-labelledby="lp-track">
          <div className="lp-container lp-split">
            <div className="lp-split-text">
              <h2 id="lp-track">Veja quem avançou e quem precisa de uma mão.</h2>
              <p>
                O painel junta o progresso de cada pessoa em cada trilha e destaca quem está há mais de uma semana sem avançar.
                Exporte em CSV quando precisar levar os números para outro lugar.
              </p>
            </div>
            <Window address="onboardhub / painel">
              <Shot name="painel" label="Painel do gestor com indicadores e pessoas que precisam de atenção" />
            </Window>
          </div>
        </section>

        <section id="recursos" className="lp-section" aria-labelledby="lp-features">
          <div className="lp-container">
            <header className="lp-head">
              <h2 id="lp-features">O que vem pronto.</h2>
              <p>Tudo o que aparece aqui já funciona hoje no OnboardHub.</p>
            </header>
            <ul className="lp-features">
              {features.map((feature) => (
                <li key={feature.title}>
                  <span className="lp-icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-comecar" className="lp-section lp-band" aria-labelledby="lp-start">
          <div className="lp-container">
            <header className="lp-head">
              <h2 id="lp-start">Comece em três passos.</h2>
              <p>Da conta criada ao time recebendo a primeira trilha, no mesmo dia.</p>
            </header>
            <ol className="lp-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="lp-step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="perguntas" className="lp-section" aria-labelledby="lp-faq">
          <div className="lp-container lp-faq-layout">
            <header className="lp-head is-left">
              <h2 id="lp-faq">Perguntas frequentes.</h2>
              <p>
                Não achou o que procurava? <Link to="/cadastro">Crie uma conta</Link> e teste com o seu time.
              </p>
            </header>
            <div className="lp-faq">
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-cta" aria-labelledby="lp-cta-title">
          <div className="lp-container lp-cta-inner">
            <h2 id="lp-cta-title">Monte a primeira trilha hoje.</h2>
            <p>Quem começar na semana que vem já encontra tudo no lugar.</p>
            <div className="lp-hero-actions">
              <Link to="/cadastro" className="button button-on-brand lp-button-lg">
                Criar conta da empresa
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo />
            <p>Trilhas de onboarding por cargo para pequenas empresas.</p>
          </div>
          <nav aria-label="Rodapé" className="lp-footer-cols">
            <div>
              <strong>Produto</strong>
              <a href="#recursos">Recursos</a>
              <a href="#como-comecar">Como começar</a>
              <a href="#perguntas">Perguntas frequentes</a>
            </div>
            <div>
              <strong>Conta</strong>
              <Link to="/cadastro">Criar conta da empresa</Link>
              <Link to="/entrar">Acessar minha conta</Link>
              <Link to="/esqueci-senha">Esqueci a senha</Link>
            </div>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>Projeto de TCC em Engenharia de Software, Católica SC, 2026.</span>
        </div>
      </footer>
    </div>
  );
}
