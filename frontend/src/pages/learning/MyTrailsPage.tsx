import { Link } from 'react-router';
import { learningApi, type MyTrail } from '../../api/learning';
import { useAuth } from '../../auth/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useResource } from '../../components/useResource';

const actionLabel = (trail: MyTrail) =>
  trail.completed ? 'Rever trilha' : trail.completedSteps > 0 ? 'Continuar' : 'Começar';

export function MyTrailsPage() {
  const { session } = useAuth();
  const trails = useResource(learningApi.list);
  const hasJobRole = Boolean(session?.user.jobRoleId);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Minhas trilhas</h1>
        <p>As trilhas de onboarding do seu cargo. Seu progresso fica salvo a cada passo.</p>
      </header>

      <FormAlert message={trails.error} />

      {trails.loading && !trails.data ? (
        <p className="page-loading">Carregando suas trilhas…</p>
      ) : trails.data?.length ? (
        <ul className="trail-grid">
          {trails.data.map((trail) => (
            <li key={trail.id} className="card trail-card">
              <div className="trail-card-head">
                {trail.completed ? <span className="badge status-published">Concluída</span> : null}
              </div>
              <h2>
                <Link to={`/minhas-trilhas/${trail.id}`}>{trail.title}</Link>
              </h2>
              {trail.description ? <p className="trail-card-description">{trail.description}</p> : null}
              <div className="trail-progress">
                <ProgressBar percent={trail.percent} label={`Progresso em ${trail.title}`} />
                <span className="muted small">
                  {trail.completedSteps} de {trail.totalSteps} passos · {trail.percent}%
                </span>
              </div>
              <div className="trail-card-actions">
                <Link className={trail.completed ? 'button button-secondary' : 'button'} to={`/minhas-trilhas/${trail.id}`}>
                  {actionLabel(trail)}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : trails.data ? (
        <EmptyState title="Nenhuma trilha por aqui ainda">
          {hasJobRole
            ? 'Quando uma trilha for publicada para o seu cargo, ela aparece nesta página.'
            : 'Você ainda não tem um cargo definido. Peça ao administrador para atribuir um cargo a você.'}
        </EmptyState>
      ) : null}
    </section>
  );
}
