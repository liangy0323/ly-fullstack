# LY Fullstack

[简体中文](README.md) | English

[![CI](https://github.com/liangy0323/ly-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/liangy0323/ly-fullstack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v0.1.0-087f5b.svg)](docs/releases/v0.1.0.md)

A general-purpose full-stack foundation for open-source showcases and real-world products.

📖 [Official documentation (Chinese)](https://liangy0323.github.io/ly-fullstack/) · Run locally with `pnpm docs:dev`

The admin foundation is complete and connected end to end: authentication, dynamic menus, user, role, menu, dictionary, and public configuration management, five-table RBAC, database migrations, and seed data all run against a real database. The project also includes a default end-user-facing API limited to health checks and public reads of dictionaries and configuration. Features for specific end-user products will not be presented as existing capabilities until they are actually implemented.

## Core Philosophy

A single repository cannot predict every product's end-user domain in advance. The product might be a mini app such as a WeChat Mini Program, an SSR website, a single-page application, a mobile client, or a specialized product for a particular industry. Whatever form it takes, it still needs an admin system, and capabilities such as authentication, users, roles, menus, permissions, and engineering conventions are highly reusable.

LY Fullstack therefore focuses first on a reusable admin foundation, a standard monorepo engineering model, and a clearly structured Vue 3 admin application:

- `apps/admin`: a general Vue 3 admin console with explicit boundaries between page entries, business components, base components, the request layer, state, routing, navigation, and theming.
- `apps/admin-api`: a general NestJS admin service with modular authentication, RBAC, and system-management capabilities.
- `apps/api`: the default end-user-facing NestJS API, providing only health checks and public reads of dictionaries and configuration as a baseline for real business modules.
- `packages/*`: reusable database access, cross-application types, framework-agnostic utilities, and chart infrastructure that prevent code duplication and preserve dependency direction.
- Repository tooling: pnpm workspace, Turborepo, a unified application registry, and architecture checks provide a standard workflow for developing, testing, and building applications and shared packages.

The project does not invent end-user pages or business domains before the requirements are clear. The default `apps/api` retains only broadly reusable health checks and public dictionary/configuration reads. It contains no end-user authentication and does not imply any particular product shape. Add business modules directly to this service when starting a real project, and run `pnpm new:server` only when a separate service is justified. Choose Nuxt, Next.js, Vue, React, a mini app, or another client stack according to the actual product requirements.

For well-defined end-user scenarios, the project can provide matching business APIs and client solutions on top of this common foundation. No single business model, however, is baked into the core repository as the default.

## Scope & Architecture Boundaries

LY Fullstack is currently centered on a NestJS modular monolith. The monorepo manages the frontend, the Admin API, shared packages, and independently created business applications. These applications can run and deploy separately, but that does not make the system a microservices architecture: the project does not currently provide an API gateway, service registration and discovery, centralized configuration, distributed tracing, distributed transactions, or a complete service-governance stack.

### Why Not Microservices by Default

Microservices are not an "advanced version" of a monolith, and an architecture does not become more professional simply by becoming more complex. Microservices address specific needs, including independent deployment and scaling, fault isolation, and autonomy across multiple teams. They also introduce the cost of network communication, data consistency, message idempotency, tracing, deployment orchestration, and operational governance. Splitting services before those needs exist usually means applying distributed-system complexity to problems the project does not have.

For developers with some Vue, TypeScript, or Node.js experience who are moving systematically into full-stack development — as well as for personal projects, small teams, and many real-world small-to-medium applications — it is more valuable to first master frontend/backend boundaries, database design, authentication, authorization, testing, and deployment. LY Fullstack uses a modular monolith not because microservices are out of reach, but because it delivers a disciplined, maintainable full-stack project that covers most common scenarios with lower cognitive and operational overhead.

This architecture prioritizes development efficiency, clear code boundaries, reusable admin capabilities, and long-term maintainability for real-world small-to-medium projects. It is a good fit for:

- Corporate websites, mini apps, content platforms, and functional web products built by individual developers or small teams.
- Startup products, MVPs, and projects still validating their business model.
- Operations consoles, internal management systems, and supporting business APIs for small-to-medium organizations.
- Projects whose concurrency, data volume, availability targets, and integration complexity can still be reasonably served by a monolith and a single database.

It should not be advertised as a foundation for large distributed systems, nor used without additional design for:

- Extreme concurrency, massive data volumes, or hard real-time workloads.
- Multi-region disaster recovery, stringent high-availability targets, or complex autoscaling requirements.
- Complex systems where many independent teams deliver in parallel and services must scale and fail independently.
- Systems requiring complex multi-tenant isolation, distributed transactions, message-driven architectures, or strict industry compliance.

Whether the project fits cannot be judged by company size alone. A small product can carry enormous traffic, and an internal system in a medium-sized organization can remain a good modular-monolith fit for years. Evaluate against peak concurrency, data growth, SLAs, tenancy model, deployment environment, team boundaries, and release cadence.

As the product grows, address concrete bottlenecks first with database indexes and connection pooling, caching, task queues, object storage, rate limiting, monitoring, and multi-instance deployment. Split services and introduce a gateway and service governance only after the business boundaries, team boundaries, and independent scaling requirements are real. LY Fullstack provides a sustainable engineering starting point; it does not claim that one default architecture can serve every scale.

### What's Next: A Microservices Edition

The next phase will be a standalone NestJS microservices solution for projects that genuinely require service decomposition, independent scaling, fault isolation, and collaboration across multiple teams. It will focus on an API gateway, inter-service communication, message reliability, authentication propagation, configuration management, observability, containerized deployment, and distributed testing.

The microservices edition will remain separate from this repository; LY Fullstack will not be forcibly converted into a microservices project. The two solutions will have distinct boundaries: LY Fullstack will continue to support efficient delivery with modular monoliths for small-to-medium projects, while the microservices edition will address products whose scale and organizational complexity genuinely require a distributed architecture. Until that standalone solution is released, it remains a plan rather than a current capability.

## UI Preview

The admin console includes complete dark and light themes. On the first visit, it follows the operating system's color preference; after the user selects a theme explicitly, that choice is preserved. Both themes share the same design language and functional structure, with dedicated adaptations for readability, component states, and data visualization.

### Dashboard

| Dark theme                                                            | Light theme                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ![LY Fullstack dashboard, dark theme](docs/images/dashboard-dark.png) | ![LY Fullstack dashboard, light theme](docs/images/dashboard-light.png) |

### Login

| Dark theme                                                         | Light theme                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| ![LY Fullstack login page, dark theme](docs/images/login-dark.png) | ![LY Fullstack login page, light theme](docs/images/login-light.png) |

## Tech Stack

| Area           | Choice                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| Admin console  | Rsbuild 2 + Vue 3 + TypeScript + Element Plus + SCSS                              |
| Server         | NestJS 11 + Fastify; the Admin API and default end-user API run independently     |
| Data layer     | `@repo/database` + PostgreSQL 17 + Prisma 7 (driver adapter mode)                 |
| Shared package | `@repo/shared` (cross-app types and framework-agnostic utilities)                 |
| Charts package | `@repo/charts` (ECharts on-demand registration, initialization, and shared types) |
| Engineering    | pnpm workspace + Turborepo + ESLint + Prettier + Husky + commitlint               |
| Testing        | Rstest + Playwright                                                               |

## Quick Start

### 1. Prepare the environment

| Dependency        | Version                    | How to get it                                                                                                           |
| ----------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Node.js           | >= 22.19                   | [Official downloads](https://nodejs.org/en/download)                                                                    |
| pnpm              | >= 11 < 12                 | Node 22 ships Corepack — run `corepack enable`; or see the [pnpm install guide](https://pnpm.io/installation)           |
| PostgreSQL        | 17.x                       | [Official downloads](https://www.postgresql.org/download/) — note the `postgres` superuser password during installation |
| Docker (optional) | Any current stable release | When PostgreSQL is not installed locally, the repository's `compose.yaml` starts a container automatically              |

A few notes:

- The exact Node and pnpm versions are pinned by the root `packageManager` and `engines` fields; with Corepack enabled there is nothing to align manually.
- Use either a local PostgreSQL installation or Docker. If PostgreSQL is installed locally, make sure the service can start; otherwise, `pnpm setup` starts the project's PostgreSQL container through Docker Compose.
- `pnpm setup` handles database creation, schema migrations, and seed data. You do not need to create the database or run SQL manually.
- [pgAdmin](https://www.pgadmin.org/) is a useful graphical client for inspecting tables and seed data. See its official documentation for installation and usage.
- The password assigned to the `postgres` user by the graphical PostgreSQL installer is the first value requested in the next step. Resetting it later can be inconvenient, so record it during installation.

### 2. Install dependencies

```bash
pnpm install
```

Installation runs `prisma generate` automatically to generate Prisma Client, but it does not connect to PostgreSQL, create the database, apply migrations, or load seed data.

### 3. Initialize the database and local config

From the repository root, run:

```bash
pnpm setup
```

The script requests four values and does not modify the local environment until all four have been entered:

1. **PostgreSQL password**: the password of the local `postgres` user, hidden input.
2. **Database name**: defaults to `ly_fullstack` — just press Enter; only letters, digits, and underscores are allowed.
3. **Initial admin password**: the password used to create the `admin` account, 8–64 characters, hidden input.
4. **Confirm admin password**: enter it again. If the two values do not match, the script prompts you to retry.

After collecting these values, the script automatically:

- Checks `127.0.0.1:5432`: if PostgreSQL is already running, the script reuses it; otherwise, when Docker Compose is available, it starts the project's PostgreSQL 17 container.
- Creates the target database idempotently — an existing database is skipped, and no data is ever deleted.
- Generates `apps/admin-api/.env.development` and `apps/api/.env.development`. Both services share the local database connection, while the Admin API also receives a randomly generated JWT secret. Both files are excluded from Git.
- Applies the Prisma migrations to create the complete database schema.
- Loads the RBAC seed data: the super-admin role, the complete menu permission tree, and the `admin` account. Running Setup again never overwrites the password of an existing account.

CI and automation can skip the prompts: `pnpm setup --non-interactive` with the `SETUP_DATABASE_PASSWORD`, `SETUP_DATABASE_NAME`, and `SETUP_ADMIN_PASSWORD` environment variables. See [`docs/environment.md`](docs/environment.md) for the security boundaries of these env files.

### 4. Start the apps

```bash
# Interactive selection: first pick server apps, then frontend apps
pnpm dev

# Or non-interactive
pnpm dev all                    # start every app
pnpm dev api admin-api admin    # start a specific combination
```

Local URLs are maintained centrally in the root [`workspace.config.json`](workspace.config.json):

- Admin console: <http://localhost:8081>
- Admin API health check: <http://localhost:3000/api/health>
- Default end-user API health check: <http://localhost:3001/api/health>
- Public dictionary example: `GET http://localhost:3001/api/public/dictionaries/:code`
- Public configuration example: `GET http://localhost:3001/api/public/configs/:key`

Open the admin console and sign in as `admin` with the password configured during Setup. When development is complete, run `pnpm dev:stop` to stop every development process started by this repository.

## Creating a new service

When you need a standalone business service in addition to the default `apps/api`, run this command from the repository root:

```bash
pnpm new:server
```

The generator asks for a service name and a local port, then does four things:

1. Scaffolds a NestJS + Fastify service with a health check from `scripts/templates/server`.
2. Uses `@repo/<service-name>` as the package name.
3. Registers the service under `apps.server` in `workspace.config.json`.
4. Installs dependencies, then runs type checking, tests, and a build for the new service.

For example, entering `content-api` and `3002` creates `apps/content-api`, which then appears automatically in the `pnpm dev` service list. The template includes no database, JWT, or business modules. End-user authentication and admin authentication belong to separate application boundaries and should be implemented independently when actual requirements emerge.

Business APIs can serve any client stack: mini apps, SSR sites built with Nuxt or Next.js, Vue or React single-page applications, mobile clients, or other functional websites. Create the client only after the product shape is clear. To include it in this monorepo, register it under `apps.web` in `workspace.config.json`.

## Common commands

| Command                   | Description                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm setup`              | Validate frontend ports; initialize the database, seed data, and server config      |
| `pnpm new:server`         | Generate and register a new NestJS + Fastify service                                |
| `pnpm dev`                | Interactively select server and frontend apps from the registry                     |
| `pnpm dev all`            | Non-interactively start every app in the registry                                   |
| `pnpm dev:admin`          | Start admin only                                                                    |
| `pnpm dev:admin-api`      | Start admin-api only                                                                |
| `pnpm dev:api`            | Start the default end-user API only                                                 |
| `pnpm dev:stop`           | Stop development processes previously started by this repository                    |
| `pnpm typecheck`          | Run type checking across the workspace                                              |
| `pnpm check:architecture` | Check cross-package dependencies, directory boundaries, and service-layer direction |
| `pnpm lint`               | ESLint check (`lint:fix` auto-fixes)                                                |
| `pnpm format`             | Prettier formatting (`format:check` checks only)                                    |
| `pnpm test`               | Service template smoke tests and workspace-wide Rstest unit tests                   |
| `pnpm test:e2e`           | Start all three apps with an isolated database and run the Playwright regression    |
| `pnpm test:e2e:ui`        | Run end-to-end tests in Playwright UI mode                                          |
| `pnpm test:e2e:report`    | Open the latest Playwright HTML report                                              |
| `pnpm build`              | Build all applications and packages                                                 |
| `pnpm docs:dev`           | Start the Rspress documentation site                                                |
| `pnpm docs:build`         | Build the site, per-page Markdown, and `llms.txt`                                   |
| `pnpm check`              | Run the complete code quality gate and build the documentation site                 |

## Directory structure

```text
ly-fullstack/
├── apps/
│   ├── admin/                 # Admin console (Rsbuild + Vue 3 + Element Plus)
│   ├── admin-api/             # Admin API (NestJS + Fastify)
│   └── api/                   # Default end-user API (health checks, public dictionaries, and configuration)
├── packages/
│   ├── charts/                # Framework-agnostic ECharts integration and shared types
│   ├── database/              # Prisma schema, migrations, generated client, and DB types
│   └── shared/                # Cross-app types and framework-agnostic utilities
├── scripts/
│   ├── templates/server/      # Template used to generate NestJS services
│   └── *.mjs                  # Development, setup, config loading, and template test scripts
├── docs/                      # Engineering topic docs and implementation source of truth
├── tests/e2e/                 # Playwright tests for real authentication, RBAC, and business flows
├── website/                   # Rspress official documentation source
├── .rules/                    # Development conventions
├── .github/workflows/ci.yml   # Quality gate for pull requests and the main branch
├── workspace.config.json      # Source of truth for app categories, paths, package names, local ports, and health checks
└── compose.yaml               # Local PostgreSQL dependency
```

## Current capability boundaries

Implemented:

- Admin shell: collapsible sidebar with a responsive drawer for narrow screens, header, dashboard, 404 page, and design tokens.
- Themes: complete dark and light themes, Element Plus Sass variable overrides, component-level theme adaptations, and theme-switching animation.
- Authentication: real username/password login, JWT session restoration, token revocation after password changes, login rate limiting, a single-use server-generated image slider CAPTCHA, 401 handling, and route guards.
- Five-table RBAC: users, roles, menus, user-role relations, and role-menu relations; the built-in super-admin has full permissions.
- System management: fully implemented pagination, filtering, creation, editing, status controls, relationship assignment, and protection rules for users, roles, menus, dictionaries, and public configuration.
- Dynamic navigation: the sidebar consumes the database-backed menu tree included in the authenticated session; menu icons are managed through a Lucide allowlist.
- Request layer: `AxiosFactory` + isolated service instances + interceptors; token handling, auth expiry, and UI feedback are injected from the app bootstrap layer.
- Admin API: CORS allowlist, ValidationPipe, JWT guard, permission guard, health check, and system-management CRUD.
- Default end-user API: a standalone NestJS application providing health checks and unauthenticated exact-key lookups for enabled dictionaries and non-sensitive public configuration.
- Database: Prisma schema, migrations, seed data, and the default admin initialization flow.
- Service extensibility: a configuration-driven development launcher and a NestJS service template validated by generating a real service.
- Engineering baseline: workspace catalog, Turborepo, architecture boundary checks, ESLint, Prettier, Husky, commitlint, Rstest, and GitHub Actions CI.

Not yet implemented: product-specific end-user business features, end-user authentication, or an end-user client. The default `apps/api` is only a starting point for business services and must not be presented as a finished end-user product. The deployment environment-variable contract is defined, but CI currently provides quality gates only. Continuous deployment is not an existing capability until it is connected to a real deployment target.

## Documentation and AI Collaboration

### `website/`: official usage documentation — "how to use the project"

The Rspress 2 site provides task-oriented guides for local setup, directory responsibilities, modular-monolith boundaries, Admin CRUD development, menu permissions, the default end-user API, database migrations, service generation, quality gates, and production deployment. Run `pnpm docs:dev` to read it locally. `pnpm docs:build` generates the static site, per-page Markdown, `llms.txt`, and `llms-full.txt`.

`website/` is neither a business application nor a shared package. It is not registered in `workspace.config.json`, and it does not change the topic-document semantics of the root `docs/` directory.

### `.rules/`: development conventions — "how code should be written"

The directory contains thirteen mandatory convention files organized by technical area: admin CRUD and page patterns (`admin.md`), Vue component structure and ordering (`vue3.md`), TypeScript type principles (`typescript.md`), comment style (`comment-style.md`), error-handling layers (`error-handling.md`), request-layer encapsulation (`axios.md`), state management (`pinia.md`), server modules (`server.md`), styles (`style.md`), naming and directories (`naming.md`, `directory.md`), engineering configuration (`engineering.md`), and the pre-commit self-review checklist (`code-review.md`).

Read the relevant file before starting a task. The complete task-to-rule map is maintained in section 4 of [`AGENTS.md`](AGENTS.md). These conventions are requirements rather than suggestions: noncompliant code will fail linting, architecture checks, or CI quality gates.

### `docs/`: topic docs — "how the system is designed and runs"

Consult these topic-specific implementation notes as needed:

| Document                                                         | Contents                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| [`docs/environment.md`](docs/environment.md)                     | Environment variable boundaries and Setup behavior      |
| [`docs/e2e-testing.md`](docs/e2e-testing.md)                     | Playwright environment, commands, and diagnostics       |
| [`docs/public-api.md`](docs/public-api.md)                       | Capabilities and security boundaries of the default API |
| [`docs/admin-theme.md`](docs/admin-theme.md)                     | Multi-theme and Element Plus customization              |
| [`docs/admin-design-system.md`](docs/admin-design-system.md)     | Design system and page delivery checklist               |
| [`docs/admin-version-offline.md`](docs/admin-version-offline.md) | Version detection and offline caching                   |
| [`docs/deployment.md`](docs/deployment.md)                       | Production deployment                                   |
| [`docs/releases/`](docs/releases)                                | Release notes for each version                          |

The repository root also contains [`ROADMAP.md`](ROADMAP.md) (roadmap), [`CHANGELOG.md`](CHANGELOG.md) (changelog), and [`CONTRIBUTING.md`](CONTRIBUTING.md) (contribution process).

### Keep one set of conventions across AI coding tools

This documentation system was designed with AI collaboration in mind. It keeps project output consistent whether the code is written by people, AI, or both:

1. **`AGENTS.md` is the single entry point for AI**. AI coding agents that support the AGENTS.md convention, including Codex and Claude Code, load it as the workspace instructions. It defines the programming philosophy, technology stack, hard architecture boundaries, and the task-to-rule map for `.rules/`.
2. **Open the repository root as the workspace when using AI**. The tool can load `AGENTS.md` automatically and consult the appropriate `.rules/` file for the task, such as CRUD pages, server modules, styles, or tests. There is no need to paste the complete conventions into every prompt.
3. **Tooling enforces the conventions**. Code written by people or AI must pass the local `pnpm check` pipeline: architecture checks, type checking, linting, formatting checks, tests, and builds. The same quality gates run in remote CI, while boundaries such as cross-package dependency direction and directory structure are verified automatically by `scripts/check-architecture.mjs`.
4. **Changing tools does not change the conventions**. `AGENTS.md` and `.rules/` are plain Markdown and are not tied to any AI product. Any tool that can read workspace instructions uses the same source of truth.

## License

The project is open source under the [MIT License](LICENSE).

LY Fullstack Team
