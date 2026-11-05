import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { roleLabels } from '../api/auth';
import { learningApi, type MyTrail } from '../api/learning';
import { overview, reportsApi } from '../api/reports';
import { useAuth } from '../auth/AuthContext';
import { ProgressBar } from '../components/ProgressBar';
import { useResource } from '../components/useResource';
import { ArrowRightIcon, ChartIcon, LayersIcon, RouteIcon, UsersIcon } from '../layout/icons';
import { Bone, Loading } from '../components/Skeleton';

const loadReport = () => reportsApi.progress();

function Section({ title, className, hideTitle, children }: Readonly<{ title: string; className: string; hideTitle?: boolean; children: ReactNode }>) {
  const id = useId();
  return (
    <section className={className} aria-labelledby={id}>
      <h2 id={id} className={hideTitle ? 'visually-hidden' : 'home-section-title'}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProgressRing({ percent }: Readonly<{ percent: number }>) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="home-ring" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle className="home-ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="home-ring-value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span>{percent}%</span>
    </div>
  );
}

function NextTrail({ trails }: Readonly<{ trails: MyTrail[] }>) {
  const pending = trails.filter((trail) => !trail.completed);
  const next = pending.find((trail) => trail.completedSteps > 0) ?? pending[0];

  if (trails.length === 0) {
    return (
      <Section title="Nenhuma trilha por aqui ainda" className="home-hero is-quiet">
        <p>Assim que sua empresa publicar uma trilha para o seu cargo, ela aparece aqui.</p>
      </Section>
    );
  }

  if (!next) {
    return (
      <Section title="Tudo concluído" className="home-hero">
        <p>Você concluiu todas as suas trilhas.</p>
        <Link to="/minhas-trilhas" className="home-hero-button">
          Rever trilhas
        </Link>
      </Section>
    );
  }

  const started = next.completedSteps > 0;
  return (
    <Section title={started ? 'Continue de onde parou' : 'Comece seu onboarding'} className="home-hero">
      <div className="home-hero-body">
        <div className="home-hero-text">
          <p className="home-hero-trail">{next.title}</p>
          <ProgressBar percent={next.percent} label={`Progresso em ${next.title}`} />
          <p className="home-hero-meta">
            {next.completedSteps} de {next.totalSteps} passos
          </p>
          <Link to={`/minhas-trilhas/${next.id}`} className="home-hero-button">
            {started ? 'Continuar' : 'Começar'}
            <ArrowRightIcon />
          </Link>
        </div>
        <ProgressRing percent={next.percent} />
      </div>
    </Section>
  );
}

function TeamSummary() {
  const report = useResource(loadReport);
  if (!report.data) {
    if (!report.loading) return null;
    return (
      <Loading label="Carregando a visão da equipe…" className="home-team">
        <Bone w={150} h={16} className="sk-gap-md" />
        <div className="sk-stats is-three">
          {[0, 1, 2].map((item) => (
            <div key={item} className="sk-card sk-stat">
              <Bone w="60%" h={12} />
              <Bone w={70} h={30} r={8} />
              <Bone w="50%" h={11} />
            </div>
          ))}
        </div>
      </Loading>
    );
  }
  const stats = overview(report.data.trails, report.data.rows);
  const items = [
    { label: 'Pessoas em onboarding', value: String(stats.people), hint: `${stats.trails} trilhas publicadas` },
    { label: 'Conclusão média', value: `${stats.averagePercent}%`, hint: `${stats.completedAssignments} de ${stats.assignments} trilhas concluídas` },
    { label: 'Paradas há mais de 7 dias', value: String(stats.stalled), hint: 'sem avançar nenhum passo', alert: stats.stalled > 0 },
  ];

  return (
    <Section title="Visão da equipe" className="home-team">
      <Link to="/painel" className="home-section-link">
        Ver painel
        <ArrowRightIcon />
      </Link>
      <dl className="home-stats">
        {items.map((item) => (
          <div key={item.label} className={item.alert ? 'home-stat is-alert' : 'home-stat'}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            <p>{item.hint}</p>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function HomePage() {
  const { session } = useAuth();
  const trails = useResource(learningApi.list);
  if (!session) return null;
  const { user, company } = session;
  const firstName = user.name.trim().split(/\s+/)[0];
  const manages = user.role !== 'colaborador';
  const list = trails.data ?? [];
  const done = list.filter((trail) => trail.completed).length;

  const shortcuts = [
    { to: '/minhas-trilhas', title: 'Minhas trilhas', text: 'Seu onboarding, passo a passo.', icon: <RouteIcon /> },
    ...(manages
      ? [
          { to: '/painel', title: 'Painel', text: 'Quem concluiu e quem está parado.', icon: <ChartIcon /> },
          { to: '/trilhas', title: 'Trilhas', text: 'Monte e publique para os cargos.', icon: <LayersIcon /> },
          { to: '/equipe', title: 'Equipe', text: 'Convide pessoas e organize cargos.', icon: <UsersIcon /> },
        ]
      : []),
  ];

  let next: ReactNode = null;
  if (trails.data) {
    next = <NextTrail trails={list} />;
  } else if (trails.loading) {
    next = (
      <Loading label="Carregando suas trilhas…">
        <div className="sk-hero" />
      </Loading>
    );
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1>Olá, {firstName}</h1>
        <p>
          {company.name} · {roleLabels[user.role]}
          {list.length > 0 ? (
            <>
              {' · '}
              <span>{`${done} de ${list.length} trilhas concluídas`}</span>
            </>
          ) : null}
        </p>
      </header>

      {next}

      {manages ? <TeamSummary /> : null}

      <Section title="Atalhos" className="home-shortcuts">
        <ul>
          {shortcuts.map((shortcut) => (
            <li key={shortcut.to}>
              <Link to={shortcut.to} className="home-shortcut">
                <span className="home-shortcut-icon">{shortcut.icon}</span>
                <span className="home-shortcut-text">
                  <strong>{shortcut.title}</strong>
                  <span>{shortcut.text}</span>
                </span>
                <ArrowRightIcon />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
