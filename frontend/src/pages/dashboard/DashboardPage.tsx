import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  overview,
  progressStatusLabels,
  relativeDate,
  reportsApi,
  statusOf,
  type ProgressStatus,
} from '../../api/reports';
import { EmptyState } from '../../components/EmptyState';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';

type StatusFilter = ProgressStatus | 'all';

export function DashboardPage() {
  const report = useResource(reportsApi.progress);
  const exporting = useAction();
  const [trailId, setTrailId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const rows = report.data?.rows ?? [];
  const trails = report.data?.trails ?? [];
  const stats = useMemo(() => overview(trails, rows), [trails, rows]);

  const filtered = rows.filter((row) => {
    const term = search.trim().toLowerCase();
    return (
      (!trailId || row.trailId === trailId) &&
      (status === 'all' || statusOf(row) === status) &&
      (!term || row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term))
    );
  });

  if (report.loading && !report.data) return <p className="page-loading">Carregando o painel…</p>;

  return (
    <section className="page page-wide">
      <header className="page-header editor-header">
        <div>
          <h1>Painel</h1>
          <p>Acompanhe o onboarding de cada pessoa nas trilhas publicadas.</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={exporting.pending || rows.length === 0}
          onClick={() => exporting.run(() => reportsApi.downloadCsv(trailId || undefined))}
        >
          {exporting.pending ? 'Gerando…' : 'Exportar CSV'}
        </button>
      </header>

      <FormAlert message={report.error ?? exporting.error} />

      {report.data && rows.length === 0 ? (
        <EmptyState title="Ainda não há o que acompanhar">
          O painel mostra as pessoas dos cargos atribuídos a trilhas publicadas.{' '}
          <Link to="/trilhas">Publique uma trilha</Link> e atribua cargos a ela.
        </EmptyState>
      ) : report.data ? (
        <div className="stack">
          <dl className="stat-grid">
            <div className="stat">
              <dt>Trilhas publicadas</dt>
              <dd>{stats.trails}</dd>
            </div>
            <div className="stat">
              <dt>Pessoas em onboarding</dt>
              <dd>{stats.people}</dd>
            </div>
            <div className="stat">
              <dt>Trilhas concluídas</dt>
              <dd>
                {stats.completedAssignments}
                <span>/{stats.assignments}</span>
              </dd>
            </div>
            <div className="stat">
              <dt>Progresso médio</dt>
              <dd>{stats.averagePercent}%</dd>
            </div>
            <div className={stats.stalled ? 'stat stat-alert' : 'stat'}>
              <dt>Paradas há 7+ dias</dt>
              <dd>{stats.stalled}</dd>
            </div>
          </dl>

          <section aria-labelledby="por-trilha">
            <h2 id="por-trilha">Por trilha</h2>
            <ul className="trail-grid">
              {trails.map((trail) => {
                const selected = trailId === trail.trailId;
                return (
                  <li key={trail.trailId}>
                    <button
                      type="button"
                      className={selected ? 'card report-card selected' : 'card report-card'}
                      aria-pressed={selected}
                      onClick={() => setTrailId(selected ? '' : trail.trailId)}
                    >
                      <strong>{trail.title}</strong>
                      <ProgressBar percent={trail.averagePercent} label={`Progresso médio em ${trail.title}`} />
                      <span className="report-card-meta">
                        <span>Progresso médio: {trail.averagePercent}%</span>
                        <span>
                          {trail.completed} de {trail.assigned} {trail.assigned === 1 ? 'pessoa concluiu' : 'pessoas concluíram'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="por-pessoa" className="stack-tight">
            <h2 id="por-pessoa">Por pessoa</h2>
            <div className="filters">
              <input
                type="search"
                aria-label="Buscar pessoa"
                placeholder="Buscar por nome ou e-mail"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select aria-label="Filtrar por trilha" value={trailId} onChange={(event) => setTrailId(event.target.value)}>
                <option value="">Todas as trilhas</option>
                {trails.map((trail) => (
                  <option key={trail.trailId} value={trail.trailId}>
                    {trail.title}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por situação"
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
              >
                <option value="all">Todas as situações</option>
                {(Object.keys(progressStatusLabels) as ProgressStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {progressStatusLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            {filtered.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Pessoa</th>
                      <th>Trilha</th>
                      <th>Progresso</th>
                      <th>Última atividade</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const rowStatus = statusOf(row);
                      return (
                        <tr key={`${row.trailId}-${row.userId}`}>
                          <td>
                            <strong>{row.name}</strong>
                            <div className="muted small">{row.jobRoleName ?? row.email}</div>
                          </td>
                          <td>{row.trailTitle}</td>
                          <td className="cell-progress">
                            <ProgressBar percent={row.percent} label={`Progresso de ${row.name} em ${row.trailTitle}`} />
                            <span className="muted small">
                              {row.completedSteps}/{row.totalSteps} · {row.percent}%
                            </span>
                          </td>
                          <td>{relativeDate(row.lastActivityAt)}</td>
                          <td>
                            <span className={`badge progress-${rowStatus}`}>{progressStatusLabels[rowStatus]}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Ninguém encontrado">Ajuste a busca ou os filtros.</EmptyState>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
