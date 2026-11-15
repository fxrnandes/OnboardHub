# OnboardHub

Plataforma SaaS para pequenas e médias empresas montarem trilhas de onboarding, segmentarem por cargo e acompanharem o progresso de cada pessoa.

[![CI](https://github.com/fxrnandes/OnboardHub/actions/workflows/ci.yml/badge.svg)](https://github.com/fxrnandes/OnboardHub/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=fxrnandes_OnboardHub&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=fxrnandes_OnboardHub)
[![Cobertura](https://sonarcloud.io/api/project_badges/measure?project=fxrnandes_OnboardHub&metric=coverage)](https://sonarcloud.io/summary/new_code?id=fxrnandes_OnboardHub)

- **Aplicação em produção:** https://onboardhub-api.northcentralus.cloudapp.azure.com
- **Documentação (Wiki):** https://github.com/fxrnandes/OnboardHub/wiki
- **Versões:** https://github.com/fxrnandes/OnboardHub/releases

> Projeto desenvolvido no Projeto de Aprendizagem Colaborativa Extensionista (PAC) e na disciplina de Portfólio — Engenharia de Software, 7ª e 8ª fase.
> Centro Universitário Católica de Santa Catarina — 2026

---

## Sobre o projeto

O onboarding de novos usuários costuma depender de reuniões e de suporte direto das equipes, o que custa caro e não escala. O OnboardHub troca esse treinamento manual por trilhas organizadas em módulos e passos, que cada pessoa faz no seu ritmo, e mostra ao gestor quem concluiu e quem está parado.

---

## Funcionalidades

- **Empresa e acesso:** cadastro da empresa com CNPJ validado, login, recuperação de senha por e-mail, troca de senha, edição do nome da empresa e exclusão da própria conta (LGPD).
- **Equipe:** papéis de administrador (master), gestor e colaborador; cargos; convites por e-mail ou por link, com papel e cargo definidos, validade de 7 dias, reenvio e revogação.
- **Trilhas:** módulos e passos de texto, link, vídeo (YouTube, Vimeo ou arquivo) e imagem; upload de mídia; editor em lista e em fluxo; publicação e segmentação por cargo.
- **Onboarding:** "Minhas trilhas" com o progresso salvo a cada passo e retomada do ponto onde a pessoa parou.
- **Painel do gestor:** indicadores, progresso por trilha e por pessoa, quem está parado há mais de 7 dias e exportação em CSV.
- **Interface:** tema claro e escuro, uso em computador e celular.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Backend | Node.js 22 + TypeScript + Express 5 |
| Banco de dados | PostgreSQL 16 |
| Autenticação | JWT + senhas com hash bcrypt |
| Mídia | Azure Blob Storage (contêiner privado, links temporários) |
| Infraestrutura | Máquina virtual na Azure, Docker Compose e Caddy com HTTPS |
| CI/CD | GitHub Actions: testes, SonarCloud e deploy automático |
| Observabilidade | New Relic APM e conferência de disponibilidade |
| Qualidade | TDD com Vitest; cobertura acima de 90% no backend e no frontend |

---

## Estrutura do repositório

```
backend/              API REST (Express), migrações SQL e testes
frontend/             Interface web (React) e testes
deploy/               Arquivos de produção (Docker Compose e Caddy)
.github/workflows/    CI/CD e conferência de disponibilidade
docker-compose.yml    Banco de dados para desenvolvimento
```

---

## Como rodar

Pré-requisitos: Node.js 22 e Docker.

### 1. Banco de dados

Na raiz do repositório:

```bash
docker compose up -d   # PostgreSQL em localhost:5432 e pgweb em http://localhost:8081
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # no Windows: copy .env.example .env
npm install
npm run db:migrate     # cria as tabelas
npm run dev            # API em http://localhost:3333
```

Sem `SMTP_HOST`, os e-mails (convite e redefinição de senha) aparecem no terminal da API. Sem `AZURE_STORAGE_CONNECTION_STRING`, os arquivos enviados ficam na pasta `uploads/`.

### 3. Frontend

Com a API rodando, em outro terminal:

```bash
cd frontend
npm install
npm run dev            # interface em http://localhost:5173
```

Em desenvolvimento, as chamadas para `/api` são encaminhadas para `http://localhost:3333`. Em produção, o Caddy serve o frontend e encaminha `/api` para a API.

### Testes

```bash
npm test               # em backend/ ou frontend/
npm run test:coverage  # com relatório de cobertura
```

Os testes do backend usam o PostgreSQL do passo 1.

---

## Deploy

Cada push na `main` roda os testes, a análise do SonarCloud e, se tudo passar, publica as imagens e atualiza a aplicação na Azure. O passo a passo está na [Wiki](https://github.com/fxrnandes/OnboardHub/wiki/Deploy).

---

## Autor

**Vinicius Fernandes Carvalho**
Engenharia de Software — Católica SC
[vinni.fernandescar@gmail.com](mailto:vinni.fernandescar@gmail.com)
