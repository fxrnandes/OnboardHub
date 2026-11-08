import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { learningApi, myTrailStatus, sortMyTrails, type MyTrail, type MyTrailStatus } from '../../api/learning';
import { relativeDate } from '../../api/reports';
import { useAuth } from '../../auth/AuthContext';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useResource } from '../../components/useResource';
import { ArrowRightIcon, CheckIcon, RouteIcon } from '../../layout/icons';
import { Bone, Loading, RowBones } from '../../components/Skeleton';

type Status = MyTrailStatus;
type Filter = 'all' | Status;

const statusOf = myTrailStatus;

const statusLabels: Record<Status, string> = { todo: 'Não iniciada', doing: 'Em andamento', done: 'Concluída' };

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'todo', label: 'Não iniciadas' },
  { value: 'done', label: 'Concluídas' },
];

const actionLabels: Record<Status, string> = { todo: 'Começar', doing: 'Continuar', done: 'Rever trilha' };

function TrailRow({ trail }: Readonly<{ trail: MyTrail }>) {
  const status = statusOf(trail);
  const href = `/minhas-trilhas/${trail.id}`;
  return (
    <li className={`my-trail is-${status}`}>
      <span className="my-trail-icon" aria-hidden="true">
        {status === 'done' ? <CheckIcon /> : <RouteIcon />}
      </span>
      <div className="my-trail-info">
        <h2>
          <Link to={href}>{trail.title}</Link>
        </h2>
        {trail.description ? <p>{trail.description}</p> : null}
      </div>
      <div className="my-trail-progress">
        <ProgressBar percent={trail.percent} label={`Progresso em ${trail.title}`} />
        <span>
          {trail.completedSteps} de {trail.totalSteps} passos · {trail.percent}%
        </span>
      </div>
      <div className="my-trail-meta">
        <span className={`status-chip is-${status}`}>{statusLabels[status]}</span>
        <span className="my-trail-activity">
          {trail.lastActivityAt ? `Última atividade: ${relativeDate(trail.lastActivityAt).toLowerCase()}` : 'Ainda sem atividade'}
        </span>
      </div>
      <Link className={status === 'done' ? 'button button-secondary my-trail-action' : 'button my-trail-action'} to={href}>
        {actionLabels[status]}
        <ArrowRightIcon />
      </Link>
    </li>
  );
}

function EmptyTrails({ hasJobRole }: Readonly<{ hasJobRole: boolean }>) {
  return (
    <div className="my-trails-empty">
      <div className="my-trails-empty-art" aria-hidden="true">
        <span />
        <span />
        <span />
        <RouteIcon />
      </div>
      <h2>Nenhuma trilha por aqui ainda</h2>
      <p>
        {hasJobRole
          ? 'Quando uma trilha for publicada para o seu cargo, ela aparece nesta página e você já pode começar.'
          : 'Você ainda não tem um cargo definido. Peça ao administrador para atribuir um cargo a você.'}
      </p>
    </div>
  );
}

function FilteredTrails({ all }: Readonly<{ all: MyTrail[] }>) {
  const [filter, setFilter] = useState<Filter>('all');
  const count = (value: Filter) => (value === 'all' ? all.length : all.filter((trail) => statusOf(trail) === value).length);
  const visible = filter === 'all' ? all : all.filter((trail) => statusOf(trail) === filter);

  return (
    <>
      <fieldset className="segmented" aria-label="Filtrar trilhas">
        {filters.map((option) => (
          <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label}
            <span className="segmented-count">{count(option.value)}</span>
          </button>
        ))}
      </fieldset>
      {visible.length ? (
        <ul className="my-trail-list">
          {visible.map((trail) => (
            <TrailRow key={trail.id} trail={trail} />
          ))}
        </ul>
      ) : (
        <p className="my-trails-none">Nenhuma trilha nesta situação.</p>
      )}
    </>
  );
}

function summaryOf(all: MyTrail[]) {
  if (!all.length) return 'As trilhas de onboarding do seu cargo. Seu progresso fica salvo a cada passo.';
  const done = all.filter((trail) => trail.completed).length;
  const noun = all.length === 1 ? 'trilha concluída' : 'trilhas concluídas';
  return `${done} de ${all.length} ${noun} · seu progresso fica salvo a cada passo.`;
}

export function MyTrailsPage() {
  const { session } = useAuth();
  const trails = useResource(learningApi.list);
  const hasJobRole = Boolean(session?.user.jobRoleId);
  const all = sortMyTrails(trails.data ?? []);

  let content: ReactNode = null;
  if (trails.loading && !trails.data) {
    content = (
      <Loading label="Carregando suas trilhas…">
        <Bone w={420} h={44} r={12} />
        <RowBones rows={4} />
      </Loading>
    );
  } else if (all.length) {
    content = <FilteredTrails all={all} />;
  } else if (trails.data) {
    content = <EmptyTrails hasJobRole={hasJobRole} />;
  }

  return (
    <section className="my-trails">
      <header className="home-header">
        <h1>Minhas trilhas</h1>
        <p>{summaryOf(all)}</p>
      </header>

      <FormAlert message={trails.error} />

      {content}
    </section>
  );
}
