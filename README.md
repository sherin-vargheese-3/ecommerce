# Shop

An e-commerce application: customers browse a catalog, fill a cart and place orders; admins manage products,
fulfil orders and watch a dashboard. Spring Boot REST API + React SPA + PostgreSQL, run locally with Docker Compose.

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Data JPA / Hibernate, Flyway |
| Security | Spring Security, JWT (HS256 via the OAuth2 resource server), BCrypt |
| Database | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, React Router |
| Tests | JUnit 5, Mockito, Testcontainers · Vitest, React Testing Library · Playwright |
| Currency | INR (prices stored in rupees, formatted with `en-IN`) |

## Features

- **Accounts:** register, log in, stay logged in across reloads; roles `CUSTOMER` and `ADMIN`.
- **Catalog:** search, sort and page through products; product detail pages.
- **Cart:** add, change quantities, remove, empty; totals computed on the server at current prices.
- **Orders:** checkout in one transaction, order history, customers cancel while pending.
- **Admin:** create/edit/remove/restore products, move orders through their lifecycle, dashboard with revenue,
  order counts by status, stock alerts and recent orders.

## Quick start (Docker)

Requires Docker Desktop.

```bash
cp .env.example .env      # optional; defaults work for local use
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:3000 | The app (nginx serving the frontend, proxying `/api` to the backend) |
| http://localhost:8080/swagger-ui.html | API docs (Swagger UI) |
| http://localhost:8080/actuator/health | Health check |

### Test accounts (local development only)

| Role | Email | Password | Notes |
|---|---|---|---|
| ADMIN | `admin@shop.local` | `admin12345` | Created automatically on startup; change via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` |
| CUSTOMER | `sherin@shop.com` | `sherin12345` | Registered through `/register`; after `docker compose down -v` (fresh database) register it again |

New customers can sign up at `/register`. Never reuse these credentials outside local development.

### Stopping and data

Data lives in the `db-data` Docker volume and survives `restart`, `stop`/`start`, `down`/`up` and rebuilds.
Only `docker compose down -v` (or deleting the volume) wipes it.

## Local development

Run the database in Docker and the apps on your machine for hot reload:

```bash
docker compose up -d db

cd backend && ./mvnw spring-boot:run       # http://localhost:8080
cd frontend && npm install && npm run dev  # http://localhost:5173, proxies /api to :8080
```

## Tests

| Suite | Command | What it covers |
|---|---|---|
| Backend unit + integration | `cd backend && ./mvnw verify` | Services with Mockito; every endpoint against a real PostgreSQL via Testcontainers, including concurrent checkouts, error bodies, rate limiting and a full shopping journey. Needs Docker running. |
| Frontend | `cd frontend && npm test` | Pages and components with Vitest + React Testing Library, API mocked per endpoint. |
| Lint | `cd frontend && npm run lint` | oxlint |
| End-to-end | `cd frontend && npm run e2e` | Playwright drives a browser through the running stack: a customer buys, an admin confirms and cancels, role checks. |

End-to-end tests expect the stack on http://localhost:3000 (`docker compose up`); override with `E2E_BASE_URL`.
Playwright's own Chromium is installed with `npx playwright install chromium`; to use a browser you already have,
set `E2E_BROWSER_PATH`, for example
`E2E_BROWSER_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npm run e2e`.
The run leaves one `e2e-…@example.com` customer and one cancelled order in the database; stock is unchanged.

CI (`.github/workflows/ci.yml`) runs the backend suite, frontend lint/tests/build, then starts the stack and runs the
end-to-end tests.

## Configuration

The backend reads these environment variables (defaults in `backend/src/main/resources/application.yml`):

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Token signing key, **at least 32 bytes**. The built-in development value logs a warning at startup; always override it outside local dev (`openssl rand -base64 48`). |
| `JWT_EXPIRATION` | Token lifetime (ISO-8601 duration, default `PT1H`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created on first start |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API directly |

Docker Compose also reads `POSTGRES_*`, `DB_PORT`, `BACKEND_PORT` and `FRONTEND_PORT`; see `.env.example`.

Schema changes go in `backend/src/main/resources/db/migration` as new Flyway migrations (`V<n>__description.sql`).
Never edit an applied migration; Hibernate only validates the schema.

## Project structure

```
backend/src/main/java/com/example/shop/
├── config/       security, JWT, OpenAPI, properties, clock, admin seeding
├── controller/   REST endpoints
├── service/      business logic (auth, products, cart, orders, dashboard, login rate limiting)
├── dto/          request/response records
├── model/        JPA entities and the order status rules
├── repository/   Spring Data repositories
└── exception/    custom exceptions and the global error handler

frontend/src/
├── api/          fetch client and endpoint functions
├── auth/         auth context, provider, useAuth hook
├── cart/         cart context, provider, useCart hook
├── components/   shared UI (incl. dashboard/ and the error boundary)
├── hooks/        useAsync, useDocumentTitle
├── pages/        route screens (admin/ for admin screens)
├── routes/       route guards
├── types/        TypeScript types mirroring backend DTOs
└── utils/        formatting and label helpers
frontend/e2e/     Playwright end-to-end tests
```

## API

| Endpoint | Access |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Public |
| `GET /api/auth/me` | Authenticated |
| `GET /api/products?q=&page=&size=&sort=`, `GET /api/products/{id}` | Public (active products only) |
| `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/{id}` | ADMIN |
| `GET/DELETE /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/{itemId}` | CUSTOMER (own cart) |
| `POST /api/orders` (checkout), `GET /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel` | CUSTOMER (own orders) |
| `GET /api/admin/orders?status=`, `GET /api/admin/orders/{id}`, `PATCH /api/admin/orders/{id}/status` | ADMIN |
| `GET /api/admin/dashboard/summary` | ADMIN |

Full request/response schemas are in Swagger UI.

**Errors** are RFC 7807 `ProblemDetail` JSON everywhere, including 401/403 from the security layer. Validation
errors add an `errors` map of field → message. Unexpected errors return a generic 500 message; details are only logged.

**Lists** return `{content, page, size, totalElements, totalPages}`. Products accept `sort` on `name`, `price`, `stock`
or `createdAt` with `,asc`/`,desc` (default newest first); unknown sort fields are ignored; max page size is 100.

## Business rules

- **Products** are soft-deleted (`active=false`): hidden from customers, kept for past orders, restorable by admins.
  `V3__seed_products.sql` adds 8 sample products.
- **Cart** totals use current prices. Adding a product already in the cart increases its quantity. Quantities are
  capped by stock and 99 per item (422). Items whose product was removed or lacks stock stay in the cart with
  `available: false` and are excluded from the total.
- **Checkout** (`POST /api/orders`) runs in one transaction: lock the products (`SELECT … FOR UPDATE`), check
  availability, decrement stock, copy each product's name and price onto the order, empty the cart. If any item fails,
  nothing changes (422 with the reason). Concurrent checkouts cannot oversell.
- **Order status** moves `PENDING → CONFIRMED → SHIPPED → DELIVERED`; `CANCELLED` is allowed from `PENDING` or
  `CONFIRMED` and returns the stock. Other transitions are rejected (422). Responses include `nextStatuses`.
  Customers may cancel their own orders while `PENDING`. Order numbers are store-wide, not per customer.
- **Dashboard** counts products (active, removed, out of stock, low stock at 5 or fewer), orders per status,
  revenue (all non-cancelled orders), the 5 most recent orders and up to 5 low-stock products.
- **Login rate limiting:** 5 failed attempts for an email within 15 minutes block further logins for that email (429 with
  `Retry-After`), even with the right password. A successful login resets the count.

## Design decisions

| Decision | Why |
|---|---|
| Layered packages (config/controller/service/dto/model/repository) | Team convention; one DTO per file. |
| Spring's OAuth2 resource server for JWT instead of a custom filter | Same result with less hand-written security code. |
| Pessimistic row locks at checkout, optimistic `@Version` on products and orders | Locks make concurrent checkouts deterministic (one wins, others get a clear 422); versions catch any other concurrent edit (409). Products are locked *before* the cart is loaded so stock is never read stale. |
| Order lines copy name and price | Order history never changes when the catalog does. |
| `nextStatuses` in order responses | The transition rules live only in `OrderStatus`; the UI renders whatever the server allows. |
| Login limiter keyed by email, in memory | Behind nginx every request shares one client IP and `X-Forwarded-For` can be forged. Trade-off: a known email can be locked out for up to 15 minutes. In-memory state is per instance and resets on restart; multiple instances would need a shared store (e.g. Redis). |
| No TanStack Query (yet) | Every screen loads its own data once, the cart is shared through one context, and there is no cross-page caching need. A small `useAsync` hook covers loading/error/reload. Revisit if pages start sharing cached server data or need background refetching. |
| Token in `localStorage` | Simple for this scope. An httpOnly cookie would resist XSS token theft but needs CSRF protection; the strict CSP reduces the XSS risk meanwhile. |

## Security notes

- Passwords hashed with BCrypt; self-registration always creates `CUSTOMER`.
- Customers only ever see their own cart and orders (others' ids return 404).
- nginx sends `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and
  `Referrer-Policy`, hides its version, gzips assets and never caches `index.html`.
- Containers run the backend as a non-root user.

**Before deploying anywhere shared:** set a strong `JWT_SECRET`, change `ADMIN_PASSWORD` and the database credentials,
serve over HTTPS, restrict `CORS_ALLOWED_ORIGINS`, and don't publish the database or backend ports.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to the Docker daemon` | Start Docker Desktop and wait for it to finish starting. |
| `port is already allocated` | Change `FRONTEND_PORT`, `BACKEND_PORT` or `DB_PORT` in `.env`. |
| `npm install` fails with `EACCES` | Fix npm cache ownership once: `sudo chown -R $(id -u):$(id -g) ~/.npm`. |
| Frontend tests fail with `localStorage.getItem is not a function` | Node 25+ ships its own `localStorage`; the Vitest config already disables it. Run tests through `npm test`. |
| "Too many failed login attempts" | Wait 15 minutes or restart the backend (the limiter is in memory). |
