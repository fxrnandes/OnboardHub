import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  idleDays,
  idleSince,
  isStalled,
  overview,
  progressStatusLabels,
  relativeDate,
  reportsApi,
  statusOf,
  type ProgressRow,
  type ProgressStatus,
} from '../../api/reports';
import { FormAlert } from '../../components/FormAlert';
import { ProgressBar } from '../../components/ProgressBar';
import { useAction } from '../../components/useAction';
import { useResource } from '../../components/useResource';
import { AlertIcon, ArrowRightIcon, ChartIcon, CheckIcon, ClockIcon, DownloadIcon, SearchIcon, UsersIcon } from '../../layout/icons';
import { Bone, HeaderBones, Loading, TableBones } from '../../components/Skeleton';

type StatusFilter = ProgressStatus | 'stalled' | 'all';


function Ring({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="home-ring dash-ring" aria-hidden="true">
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
    </div>
  );
}

function idleText(row: ProgressRow, now: number) {
  const days = idleDays(row, now);
  return row.lastActivityAt ? `sem avançar há ${days} dias` : `não começou em ${days} dias`;
}

export function DashboardPage() {
  const report = useResource(reportsApi.progress);
  const exporting = useAction();
  const [trailId, setTrailId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const tableRef = useRef<HTMLElement>(null);
  const [now] = useState(() => Date.now());

  const rows = report.data?.rows ?? [];
  const trails = report.data?.trails ?? [];
  const stats = useMemo(() => overview(trails, rows, now), [trails, rows, now]);

  const attention = rows
    .filter((row) => isStalled(row, now))
    .sort((a, b) => idleSince(a).localeCompare(idleSince(b)))
    .slice(0, 5);

  const filtered = rows.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesStatus = status === 'all' || (status === 'stalled' ? isStalled(row, now) : statusOf(row) === status);
    return (
      (!trailId || row.trailId === trailId) &&
      matchesStatus &&
      (!term || row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term))
    );
  });

  function showStalled() {
    setStatus('stalled');
    setTrailId('');
    tableRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  if (report.loading && !report.data) {
    return (
      <Loading label="Carregando o painel…" className="dash">
        <HeaderBones action />
        <div className="sk-stats">
          <div className="sk-card sk-stat is-hero" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="sk-card sk-stat">
              <Bone w="55%" h={12} />
              <Bone w={70} h={32} r={8} />
              <Bone w="70%" h={11} />
            </div>
          ))}
        </div>
        <div className="sk-split">
          <div className="sk-card sk-pad">
            <Bone w={120} h={16} />
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="sk-bar-row">
                <Bone w="40%" h={13} />
                <Bone h={8} r={4} />
                <Bone w={36} h={13} />
              </div>
            ))}
          </div>
          <div className="sk-card sk-pad">
            <Bone w={160} h={16} />
            {[0, 1, 2].map((item) => (
              <div key={item} className="sk-person">
                <Bone w={32} h={32} r={9} />
                <div className="sk-row-text">
                  <Bone w="50%" h={13} />
                  <Bone w="70%" h={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <TableBones rows={5} />
      </Loading>
    );
  }

  return (
    <section className="dash">
      <header className="page-head">
        <div className="home-header">
          <h1>Painel</h1>
          <p>Acompanhe o onboarding de cada pessoa nas trilhas publicadas.</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={exporting.pending || rows.length === 0}
          onClick={() => exporting.run(() => reportsApi.downloadCsv(trailId || undefined))}
        >
          <DownloadIcon />
          {exporting.pending ? 'Gerando…' : 'Exportar CSV'}
        </button>
      </header>

      <FormAlert message={report.error ?? exporting.error} />

      {report.data && rows.length === 0 ? (
        <div className="my-trails-empty">
          <div className="my-trails-empty-art" aria-hidden="true">
            <span />
            <span />
            <span />
            <ChartIcon />
          </div>
          <h2>Ainda não há o que acompanhar</h2>
          <p>
            O painel mostra as pessoas dos cargos atribuídos a trilhas publicadas. <Link to="/trilhas">Publique uma trilha</Link> e
            atribua cargos a ela.
          </p>
        </div>
      ) : report.data ? (
        <>
          <dl className="dash-stats">
            <div className="dash-stat is-hero">
              <dt>Progresso médio</dt>
              <dd>{stats.averagePercent}%</dd>
              <span className="dash-stat-hint">
                em {stats.trails} {stats.trails === 1 ? 'trilha publicada' : 'trilhas publicadas'}
              </span>
              <Ring percent={stats.averagePercent} />
            </div>
            <div className="dash-stat">
              <span className="dash-stat-icon" aria-hidden="true">
                <UsersIcon />
              </span>
              <dt>Pessoas em onboarding</dt>
              <dd>{stats.people}</dd>
              <span className="dash-stat-hint">com pelo menos uma trilha</span>
            </div>
            <div className="dash-stat">
              <span className="dash-stat-icon" aria-hidden="true">
                <CheckIcon />
              </span>
              <dt>Trilhas concluídas</dt>
              <dd>
                {stats.completedAssignments}
                <span>/{stats.assignments}</span>
              </dd>
              <span className="dash-stat-hint">trilhas atribuídas já finalizadas</span>
            </div>
            <div className={stats.stalled ? 'dash-stat is-alert' : 'dash-stat'}>
              <span className="dash-stat-icon" aria-hidden="true">
                <ClockIcon />
              </span>
              <dt>Paradas há 7+ dias</dt>
              <dd>{stats.stalled}</dd>
              <span className="dash-stat-hint">sem avançar nenhum passo</span>
            </div>
          </dl>

          <div className="dash-split">
            <section className="dash-card" aria-labelledby="por-trilha">
              <header className="dash-card-head">
                <h2 id="por-trilha">Por trilha</h2>
                <span>Clique para filtrar a tabela</span>
              </header>
              <ul className="dash-trails">
                {trails.map((trail) => {
                  const selected = trailId === trail.trailId;
                  return (
                    <li key={trail.trailId}>
                      <button
                        type="button"
                        className={selected ? 'dash-trail is-selected' : 'dash-trail'}
                        aria-pressed={selected}
                        onClick={() => setTrailId(selected ? '' : trail.trailId)}
                      >
                        <span className="dash-trail-title">{trail.title}</span>
                        <span className="dash-trail-bar">
                          <ProgressBar percent={trail.averagePercent} label={`Progresso médio em ${trail.title}`} />
                        </span>
                        <span className="dash-trail-percent">{trail.averagePercent}%</span>
                        <span className="dash-trail-meta">
                          {trail.completed} de {trail.assigned} {trail.assigned === 1 ? 'pessoa concluiu' : 'pessoas concluíram'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="dash-card" aria-labelledby="atencao">
              <header className="dash-card-head">
                <h2 id="atencao">Precisam de atenção</h2>
                {stats.stalled ? (
                  <button type="button" className="dash-link" onClick={showStalled}>
                    Ver {stats.stalled === 1 ? 'a pessoa' : `as ${stats.stalled}`}
                    <ArrowRightIcon />
                  </button>
                ) : null}
              </header>
              {attention.length ? (
                <ul className="dash-attention">
                  {attention.map((row) => (
                    <li key={`${row.trailId}-${row.userId}`}>
                      <span className="dash-attention-icon" aria-hidden="true">
                        <AlertIcon />
                      </span>
                      <span className="dash-attention-text">
                        <strong>{row.name}</strong>
                        <span>
                          {row.trailTitle} · {row.percent}%
                        </span>
                      </span>
                      <span className="dash-attention-idle">{idleText(row, now)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dash-all-good">
                  <span aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <p>Ninguém parado há mais de 7 dias. Todo mundo está avançando.</p>
                </div>
              )}
            </section>
          </div>

          <section ref={tableRef} className="dash-card dash-people" aria-labelledby="por-pessoa">
            <header className="dash-card-head">
              <h2 id="por-pessoa">Por pessoa</h2>
              <span>
                {filtered.length} de {rows.length}
              </span>
            </header>
            <div className="dash-filters">
              <label className="dash-search">
                <SearchIcon />
                <input
                  type="search"
                  aria-label="Buscar pessoa"
                  placeholder="Buscar por nome ou e-mail"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
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
                <option value="stalled">Paradas há 7+ dias</option>
              </select>
            </div>

            {filtered.length ? (
              <div className="table-wrap">
                <table className="dash-table">
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
                      const stalled = isStalled(row, now);
                      return (
                        <tr key={`${row.trailId}-${row.userId}`}>
                          <td>
                            <strong>{row.name}</strong>
                            <span className="dash-sub">{row.jobRoleName ?? row.email}</span>
                          </td>
                          <td>{row.trailTitle}</td>
                          <td className="dash-progress">
                            <ProgressBar percent={row.percent} label={`Progresso de ${row.name} em ${row.trailTitle}`} />
                            <span>
                              {row.completedSteps}/{row.totalSteps} · {row.percent}%
                            </span>
                          </td>
                          <td className={stalled ? 'dash-idle is-stalled' : 'dash-idle'}>{relativeDate(row.lastActivityAt)}</td>
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
              <div className="dash-none">
                <strong>Ninguém encontrado</strong>
                <p>Ajuste a busca ou os filtros.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
