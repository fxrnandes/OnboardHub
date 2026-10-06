# OnboardHub

Plataforma SaaS para criação e organização de trilhas de onboarding para usuários de sistemas digitais.

> Projeto desenvolvido como parte do Projeto de Aprendizagem Colaborativa Extensionista (PAC) e da disciplina de Portfólio — Engenharia de Software, 7ª e 8ª Fase
> Centro Universitário Católica de Santa Catarina — 2026

---

## Sobre o Projeto

O **OnboardHub** é uma plataforma web baseada no modelo SaaS voltada para pequenas e médias empresas que precisam estruturar o processo de capacitação inicial de seus usuários. A proposta substitui treinamentos manuais por trilhas de aprendizado organizadas, acessíveis e segmentadas por perfil de usuário.

O projeto nasceu da observação de um problema recorrente no ambiente de trabalho: o onboarding de novos usuários depende frequentemente de reuniões manuais e suporte direto das equipes, o que gera alto custo operacional e dificulta a escalabilidade.

---

## Funcionalidades Previstas

- Criação de trilhas de onboarding organizadas em módulos e passos (vídeos, textos, imagens, links)
- Segmentação de trilhas por cargo ou perfil de usuário
- Convite de usuários e controle de acesso por papel (master, gestor, colaborador)
- Registro de progresso, com retomada a partir do último passo visto
- Painel do gestor com acompanhamento de progresso por pessoa e por trilha
- Relatórios de conclusão com exportação em CSV

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + TypeScript + Express |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT (JSON Web Tokens) + senhas com hash bcrypt |
| Armazenamento de Mídia | Azure Blob Storage |
| Infraestrutura | Microsoft Azure + Docker |
| CI/CD | GitHub Actions |
| Qualidade | Testes automatizados (TDD) e análise estática de código |

---

## Estrutura do Repositório

```
backend/     API REST (Node.js + Express)
frontend/    Interface web (React)
docs/        Documentação técnica
```

---

## Como rodar o backend

Pré-requisito: Node.js 20 ou superior.

```bash
cd backend
npm install
npm run dev            # API em http://localhost:3333
npm test               # testes
npm run test:coverage  # testes com relatório de cobertura
```

---

## Autor

**Vinicius Fernandes Carvalho**
Engenharia de Software — Católica SC
[vinni.fernandescar@gmail.com](mailto:vinni.fernandescar@gmail.com)
