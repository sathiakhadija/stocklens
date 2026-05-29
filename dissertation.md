# StockLens — Dissertation Foundation Document
**System Type:** Web-Based Decision Support System for SME Retail Inventory Management  
**Stack:** Python / Flask / SQLite / Vanilla JS / Chart.js 4  
**Status:** All bullets tagged [CONFIRMED] (visible in code) | [INFERRED] (logical from structure) | [UNCERTAIN] (needs verification)

---

## 1. Project Overview

- [CONFIRMED] StockLens is a web-based Decision Support System (DSS) that helps small-to-medium retail businesses manage inventory through automated forecasting, reorder decision generation, and scenario simulation.
- [CONFIRMED] The system targets two user roles within a company: `manager` (full access) and `staff` (read-only operational views).
- [CONFIRMED] The core problem solved is reactive inventory management — businesses currently reorder only when stock runs out. StockLens replaces this with proactive, data-driven reorder recommendations generated from historical sales analysis.
- [CONFIRMED] StockLens is explicitly a DSS, not an ERP or reporting tool. It provides recommendations with explanatory reason strings rather than automated actions — human approval is always required.
- [CONFIRMED] The system supports multi-company tenancy — each company has an isolated workspace with its own products, sales, forecasts, and decisions identified by `company_id`.
- [CONFIRMED] Deployment target is local network / single-node — Flask development server on port 5001, SQLite database. No cloud infrastructure is assumed.
- [INFERRED] The system is designed for businesses without dedicated inventory analysts — the interface is designed to be self-explanatory through badge labels, reason strings, and plain-English recommendations.
- [CONFIRMED] Multilingual support is built in — 14 languages (English, Spanish, Arabic, French, German, Portuguese, Hindi, Urdu, Bengali, Turkish, Chinese Simplified, Indonesian, Thai, Vietnamese) — via a client-side translation layer (`translations.js`). RTL layout is applied automatically for Arabic and Urdu.

→ **Dissertation chapter target: Chapter 1 (Introduction) and Chapter 2 (Literature Review — DSS definition)**

---

## 2. Problem Definition

- [CONFIRMED] The system is built on the observation that SME retailers reorder reactively — only after stockout — resulting in lost sales, emergency orders, and excess safety buffer purchasing.
- [INFERRED] Existing enterprise tools (SAP, Oracle, Cin7, Unleashed) are priced and configured for large organisations with dedicated supply chain teams, making them inaccessible to SME operators.
- [CONFIRMED] The scenario simulation module directly models the "without system" baseline as reactive reorder behaviour (`stock ≤ 0` triggers order), contrasting it against the proactive approach. This is the core justification for the system's existence — it quantifies the improvement.
- [INFERRED] SME retailers typically lack structured sales data in any consistent format. The upload system's flexible column aliasing (60+ variants per field) and 18+ date format support directly addresses this problem.
- [CONFIRMED] The system handles irregular and sparse data through minimum thresholds (30 days for forecasting, 90 days for evaluation) rather than crashing or producing meaningless output.
- [INFERRED] SME managers make inventory decisions under cognitive load — multiple products, limited time, no analytical staff. The decision layer reduces this to a single badge (REORDER / AT_RISK / HOLD / INACTIVE) per product.
- [CONFIRMED] The role model (manager vs staff) reflects the typical SME org structure: one or two managers responsible for ordering, and multiple staff who need visibility but not decision authority.
- [INFERRED] The system assumes that historical sales are a sufficient proxy for future demand — no integration with external demand signals (weather, events, competitor pricing) is present in the current version.
- [CONFIRMED] ABC-XYZ classification addresses the prioritisation problem: managers cannot give equal attention to all products. The combined matrix produces differentiated review frequencies (daily / weekly / monthly).
- [UNCERTAIN] Whether the target user base has been validated through interviews, surveys, or a pilot study is not determinable from code alone — this is a dissertation methodology question.

→ **Dissertation chapter target: Chapter 2 (Literature Review — inventory management problems, SME context)**

---

## 3. System Architecture

- [CONFIRMED] Entry point is `run.py` at project root. It inserts `src/core` into `sys.path` and calls `create_app()` from `app.py`. Port: 5001.
- [CONFIRMED] Application factory pattern: `create_app()` in `src/core/app.py` initialises Flask, configures sessions, runs `_run_migrations()`, then registers all blueprints.
- [CONFIRMED] Five Flask blueprints registered:
  - `pages` — page rendering routes: `/` (homepage, redirects logged-in users to dashboard), `/login`, `/register`, `/forgot-password`, `/reset-password/<token>`, `/verify-email/<token>`, `/onboarding`, `/dashboard`, `/privacy`, `/terms`, `/contact`. The last three serve a shared `legal.html` template with page-specific content injected as a Jinja2 variable.
  - `auth` (prefix `/api`) — login, register, logout, `/api/me`, `POST /api/password/forgot`, `POST /api/password/reset`, `POST /api/email/verify`, `POST /api/email/resend`. Rate-limited on all auth surfaces (10 attempts / 5-minute window for login; 5 attempts / 5-minute window for register, forgot, reset, and resend). Returns HTTP 429 on breach.
  - `onboarding` (prefix `/api`) — company creation, invite code generation and joining
  - `api` (prefix `/api`) — all data endpoints (products, inventory, forecast, decisions, upload, analytics, pipeline). Includes four reorder action loop endpoints: `POST /api/reorder/log`, `GET /api/reorder/pending`, `POST /api/reorder/update`, `POST /api/reorder/confirm`.
  - `admin` (prefix `/api`) — staff management (list, remove, role change)
- [CONFIRMED] Service layer in `src/core/services/`:
  - `forecast_service.py` — multi-model forecasting, safety stock, EOQ
  - `decision_service.py` — rule-based action generation from forecast outputs
  - `evaluation_service.py` — model accuracy metrics on historical data
  - `scenario_service.py` — reactive vs proactive simulation comparison
  - `abc_xyz_service.py` — revenue and variability-based inventory classification
- [CONFIRMED] Database layer: single SQLite file at `db/stocklens.db`. Connection created per request via `get_db()` with `PRAGMA foreign_keys = ON` and `sqlite3.Row` factory. Core tables: `users`, `companies`, `invite_codes`, `products`, `inventory`, `sales`, `forecast`, `decisions`, `evaluation`, `upload_log`, `product_classification`, `reorder_log`, `password_reset_tokens`, `email_verification_tokens`, `rate_limits`, `scenario_results`, `pipeline_jobs`. The `password_reset_tokens` and `email_verification_tokens` tables store SHA-256 hashes (not raw tokens), user_id, expiry timestamps, and `used_at` for single-use enforcement. The `rate_limits` table is a DB-backed bucket store (`bucket_key TEXT`, `created_at INTEGER`) supporting the rate limiter across all auth operations. The `pipeline_jobs` table records async pipeline run state (`job_id`, `status`, `products_processed`, `error`) for future async worker support. The `scenario_results` table persists per-company baseline simulation outputs so they are not recomputed on every page load.
- [CONFIRMED] `reorder_log` table (V2 addition): records manager-initiated reorder actions (`product_id`, `quantity_ordered`, `actual_quantity`, `expected_days`, `ordered_by`, `notes`, `status` [pending/delivered], `ordered_at`, `delivered_at`). Indexed by `(company_id, status)`. Enables the full decision → action → pending update → delivery confirmation loop. Operationally, one pending reorder per product is enforced: if a product already has a pending `reorder_log` entry, the Decisions tab shows "Pending Delivery" rather than "Order Placed", and `POST /api/reorder/log` rejects a duplicate pending order with HTTP 409 until the manager confirms delivery. While the order is still pending, `POST /api/reorder/update` lets a manager change `quantity_ordered`, `expected_days`, and notes without affecting stock.
- [CONFIRMED] Schema migrations are applied at startup by `_run_migrations()` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern — the system is self-upgrading and requires no manual migration step.
- [CONFIRMED] Multi-tenancy enforced at query level: every data table includes a `company_id` column. All API routes call `require_company()` to extract `company_id` from session before any query. No row-level security at DB level — all enforcement is application-layer.
- [CONFIRMED] **Currency symbol per company:** `companies.currency_symbol TEXT DEFAULT '£'` allows each company workspace to display its own currency symbol. The dashboard route reads this at render time and injects it as a Jinja2 template variable; `app.js` uses it when formatting monetary values (inventory value KPI, EOQ cost estimates). This is the database-layer foundation for regional currency support alongside the client-side language switching in `translations.js`.
- [CONFIRMED] **`products.purchase_cost` column:** Added via migration as `REAL` (nullable). Intended to capture the wholesale cost per unit for more accurate EOQ holding-cost calculations. Currently stored but not used in EOQ logic (which defaults to `max(0.10, unit_price × 0.25)` based on `price`). A future improvement would substitute `purchase_cost` into the holding cost formula when available.
- [CONFIRMED] Comprehensive DB indexes: 14 named indexes cover all company-scoped query patterns (`idx_users_email`, `idx_users_company`, `idx_products_company`, `idx_sales_company`, `idx_inventory_company`, `idx_forecast_company`, `idx_decisions_company`, `idx_evaluation_company`, `idx_classification_company`, `idx_upload_log_company`, `idx_invite_codes_company`, `idx_rate_limits_bucket`, `idx_scenario_results_company`, `idx_pipeline_jobs_company`). All created with `CREATE INDEX IF NOT EXISTS`. The `rate_limits` index covers `(bucket_key, created_at)` for efficient window-based pruning.
- [CONFIRMED] Authentication: Flask session with `SECRET_KEY` (env variable, defaults to `'dev-only-change-me'`). Session lifetime: 12 hours. Cookie flags: `HttpOnly=True`, `SameSite=Lax`, `Secure` configurable via env.
- [CONFIRMED] **Full CSRF protection** via a `@app.before_request csrf_protect()` hook registered in `create_app()`. On every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) to `/api/*` from an authenticated session, the hook compares the `X-CSRF-Token` request header (or `csrf_token` form field) against the session-bound token. Mismatch returns HTTP 403 (`{"message": "CSRF token missing or invalid"}`). The following auth endpoints are explicitly exempted from CSRF checks (because they must work before a session exists): `/api/login`, `/api/register`, `/api/password/forgot`, `/api/password/reset`, `/api/email/verify`. The CSRF token itself is generated as `secrets.token_urlsafe(32)` at session creation time and injected into the dashboard template as `window.STOCKLENS_CSRF` for use by `app.js` fetch calls.
- [CONFIRMED] Two access-control decorators: `login_required` (checks `user_id` in session) and `manager_required` (checks role = 'manager'). Both defined in `auth_utils.py`.
- [CONFIRMED] Component communication is synchronous and request-scoped. Upload triggers immediate in-process pipeline execution (forecast → decision → evaluation → scenario → classification). No async workers, queues, or background tasks.
- [CONFIRMED] File upload size cap: `MAX_CONTENT_LENGTH = 16 MB` enforced by Flask. Requests exceeding the limit are rejected with a JSON 413 response (`{"error": "File too large. Maximum upload size is 16 MB."}`), registered via a custom `@app.errorhandler(413)` handler in `create_app()`.
- [CONFIRMED] Frontend: Jinja2 templates for initial render (passes `role`, `username`, `company_name` to HTML). All subsequent data loaded via `fetch()` calls to `/api/*` endpoints. Single-page behaviour without SPA framework.
- [CONFIRMED] Three JS files: `app.js` (all data fetching, DOM rendering, tab logic, auth), `charts.js` (Chart.js 4.x wrappers for all six chart types), `translations.js` (i18n lookup for EN/AR/ES).

→ **Dissertation chapter target: Chapter 3 (Methodology — system design) and Chapter 4 (Implementation)**

---

## 4. Target Users and Role Model

- [CONFIRMED] **Manager role**: full system access. Can upload data, view all tabs, run forecasts, trigger pipeline, generate invite codes, manage team members, view evaluation and scenario results, run classification.
- [CONFIRMED] **Staff role**: read-only access to Overview, Inventory, Decisions, and Analytics tabs. Cannot upload, cannot view Forecast/Evaluation/Scenario/ABC-XYZ/Team tabs.
- [CONFIRMED] Role enforcement is dual-layer: backend decorators (`manager_required` returns 403 for non-managers on protected API routes) and frontend Jinja2 conditionals (`{% if role == 'manager' %}`) that hide navigation items and tab panels from the rendered HTML.
- [CONFIRMED] `window.STOCKLENS_ROLE = '{{ role }}'` is injected into the dashboard page, enabling client-side JS to conditionally show/hide elements and adjust table column counts.
- [CONFIRMED] Admin protection: a manager cannot demote themselves, cannot remove themselves, and cannot demote the last remaining manager in a company (enforced by `COUNT(*) ≤ 1` active manager check in `admin.py`).
- [INFERRED] The two-role model reflects SME retail structure: owner/manager controls ordering and company setup; staff need inventory visibility for day-to-day operations but should not alter forecasting parameters or company data.
- [CONFIRMED] Invite code system: managers generate 6-character alphanumeric codes (14-day expiry) that new users can use during registration to join the company as `staff`. Without a code, new registrants create their own company.
- [INFERRED] Role model simplicity is intentional — more granular roles (e.g., buyer, analyst, auditor) would add configuration complexity that SME managers are unlikely to manage.

→ **Dissertation chapter target: Chapter 3 (Methodology — user requirements) and Chapter 5 (System design)**

---

## 5. Core Features Breakdown

### 5a. Dashboard and KPI Overview
- [CONFIRMED] Four KPI cards: Total Products, Active Products, Reorder Now (REORDER count), Inventory Value (£). Each KPI value is coloured semantically — green for healthy metrics, red for alerts, neutral text for financial values — using a strict separation between brand colour (#3D8565 Eucalyptus Green, UI only) and data-semantic colours (red/amber/slate/green).
- [CONFIRMED] KPI values animate from 0 via `animateCount()` on first Overview load per session (count-up, 1200ms ease-out). A `sessionStorage.kpi_animated` flag is set after the first animation so that subsequent tab returns within the same session skip the animation and set the value directly, preventing the effect from becoming repetitive and distracting.
- [CONFIRMED] KPI trend indicators: each card displays a directional arrow (↑/↓) with percentage change comparing last 7 days vs prior 7 days of sales. Positive trend shown in green, negative in red. Computed server-side from the `sales` table using two 7-day windows.
- [CONFIRMED] **Data freshness signal**: A status pill above the KPI grid shows "Forecast last run: Xh ago" or "Xd ago". If the forecast is ≥3 days old, the pill turns amber with a "data may be outdated" warning and — for managers — a "Re-run forecast" link. The timestamp comes from `MAX(created_at)` in the `forecast` table, exposed as `last_forecast_run` in the `/api/overview` response. This directly resolves the data currency awareness gap identified in the product audit.
- [CONFIRMED] **Urgent Actions Required panel**: Rendered at the top of the Overview tab when any REORDER decisions exist. Shows a card per urgent product with: current stock level, estimated days to stockout (`stock_on_hand / forecast_demand`), stockout probability (%), and a "Reorder Now" button that navigates to the Decisions tab. Products sorted by lowest stock first, capped at 6. Panel hidden entirely when no REORDER items exist.
- [CONFIRMED] **Smart Recommendations panel**: Below the Urgent Actions panel, plain-English AI-style recommendation strings are generated per REORDER product. Each string states the product name, projected stockout timing, stockout probability, EOQ-based recommended order quantity, and a trend note if demand is directional. Urgency classified as critical (≤3 days), warning (≤7 days), or moderate (>7 days) and colour-codes the left border of each recommendation card.
- [CONFIRMED] **Sidebar notification badge**: The Decisions nav item displays a count badge showing the number of active REORDER decisions. Hidden when count is zero. Updates on every Overview load.
- [CONFIRMED] **Decision Breakdown panel**: Shows count per action type (REORDER / AT_RISK / HOLD / INACTIVE) as coloured badges with counts. Each row is clickable (eucalyptus hover) and navigates to the Decisions tab. Card header includes a "View all →" link. Rows use `.breakdown-row--link` with delegated click handler.
- [CONFIRMED] **Risk Overview panel**: Same breakdown by risk flag (HIGH / MEDIUM / LOW). Each row navigates to the Inventory tab on click. Card header includes "View inventory →" link. Both breakdown cards were previously informational only; the clickable rows convert them into navigation affordances.
- [CONFIRMED] Low Stock Alerts list shows up to 8 REORDER/AT_RISK products with decision badge and timestamp.
- [CONFIRMED] **Recent Activity feed**: Shows the 6 most recent system events from four sources: (1) recent REORDER/AT_RISK decisions from the `decisions` table; (2) recent file uploads from `upload_log`; (3) manager reorder actions from `reorder_log`; (4) last forecast computation timestamp from the `forecast` table. Events sorted by timestamp descending. Each entry shows a type-specific icon, human-readable message, and timestamp.
- [CONFIRMED] **Post-onboarding welcome banner**: On first login to a company with no upload history (`upload_log` count = 0), a gradient banner renders at the top of the Overview tab. Contains a personalised greeting (username from Jinja2 via `window.STOCKLENS_USER_NAME`), role-specific subtitle, and three step-chips that navigate to the relevant tab. Dismisses with a CSS fade animation and sets `sessionStorage.welcome_dismissed = '1'`. Absent once any upload has been made.
- [CONFIRMED] **Navigation section labels**: Sidebar nav is divided into two labelled groups — "Daily" (Overview, Products, Inventory, Decisions, Analytics) and "Manager" (Forecast, Evaluation, Scenarios, ABC-XYZ, Team). Labels use `.nav-section-label` with uppercase 11px caps text.
- [CONFIRMED] `/api/overview` returns a single JSON response containing: `total_products`, `active_products`, `decision_counts`, `risk_counts`, `alerts`, `inventory_value`, `urgent_actions`, `smart_recommendations`, `activity`, `kpi_trends`, `is_first_visit`, `last_forecast_run`, and `pending_reorders_count`.
- [CONFIRMED] **KPI sales trend computation uses relative date window:** Sales trend KPIs compare the 7-day window ending at `MAX(date)` in the sales table against the prior 7-day window, rather than `DATE('now')`. This ensures historical datasets show meaningful trend arrows — a correction from the initial implementation that showed 0% change for any dataset not ending today.
- [CONFIRMED] **Pending orders counter on Overview:** `pending_reorders_count` from `/api/overview` drives a pulsing status bar ("N pending orders awaiting delivery confirmation") at the top of the Overview tab when pending reorders exist. Button opens the delivery confirmation modal without leaving the tab.
- [CONFIRMED] **Reorder Activity in feed:** Manager-initiated reorder log entries appear in the Recent Activity feed with a shopping-cart icon, alongside upload and forecast events. Status distinguishes 'placed' from 'delivered'.

→ **Dissertation chapter target: Chapter 5 (System design — dashboard) and Chapter 4 (Implementation — decision support interface)**

### 5b. CSV/XLSX Upload Pipeline
- [CONFIRMED] Accepts `.csv`, `.xlsx`, `.xls` files via drag-and-drop or file picker. Multiple files in one upload supported.
- [CONFIRMED] Preview mode (`write_rows=False`) runs the parser without committing to DB — manager sees sample rows and detected column mapping before confirming.
- [CONFIRMED] Full cleaning summary returned in response: rows accepted, duplicates removed, negatives removed, stock levels updated, new products created.
- [CONFIRMED] Auto-detects interaction log format (e-commerce event logs with interaction_type column) and aggregates purchase events into daily unit counts before processing.
- [CONFIRMED] Each upload is logged to `upload_log` table with filename, uploader, rows inserted, new products, duplicates skipped, inventory updates, timestamp.
- [CONFIRMED] **Pipeline progress indicator**: On upload submission, a multi-step progress panel appears showing six named pipeline stages (Uploading → Validating & cleaning → Updating inventory → Running forecast model → Generating decisions → Finalising) with a branded gradient fill bar and coloured dot per step. Each step activates via `setTimeout` with cumulative delays tuned to typical pipeline duration (~3 seconds). On `fetch` resolution, `stop(success)` is called — dots turn green (success) or red (error), bar completes, then the panel auto-hides after 2 seconds. Resolves the "upload appears to stall" usability issue identified in the product audit.

→ **Dissertation chapter target: Chapter 4 (Implementation — data ingestion)**

### 5b-ii. Manual Data Entry Mode
- [CONFIRMED] A complementary data ingestion pathway exists alongside CSV/XLSX upload, targeting SME users who have no structured sales history. Accessible from the **Manual Entry** tab (manager-only).
- [CONFIRMED] **Product creation endpoint:** `POST /api/manual/product` — manager creates a named product with optional category, current stock level, and price. The product is written to the `products` table (same table used by CSV upload) with `data_source = 'manual'` and an auto-generated SKU (`MAN-NNNN`). An inventory row is immediately seeded with the supplied stock figure, so the product appears on the Inventory tab without requiring a pipeline run.
- [CONFIRMED] **Sales entry endpoint:** `POST /api/manual/sales` — accepts `{product_id, date, units_sold}`. Validates that the date is not in the future, that units_sold ≥ 0, and that the product belongs to the authenticated company. If the date already exists, the entry is updated (upsert behaviour). Written to the `sales` table with `data_source = 'manual'`.
- [CONFIRMED] **Automatic gap filling:** After every sales entry, `_fill_date_gaps()` computes the full contiguous date range from the earliest to the latest recorded date and inserts `units_sold = 0` for any missing days. This ensures the time-series is always gapless — a requirement for the moving-average forecasting models. The count of gap-filled days is returned in the API response and surfaced to the manager as `"N missing days filled as 0"`.
- [CONFIRMED] **Timeline endpoint:** `GET /api/manual/sales/<product_id>` — returns the complete daily series for a product in reverse-chronological order, with `total_days`, `filled_days`, and `pipeline_ready` (True if total_days ≥ 30) flags.
- [CONFIRMED] **Product list endpoint:** `GET /api/manual/products` — returns all products with `data_source = 'manual'` for this company, enriched with total recorded days, total units, last entry date, current stock, and latest decision badge.
- [CONFIRMED] **Pipeline trigger endpoint:** `POST /api/manual/pipeline/<product_id>` — runs the identical forecast → decision → evaluation pipeline used by the upload pathway (`run_forecast_for_product` → `compute_decision_for_product` → `run_evaluation_for_product`). Enforces the same 30-day minimum data requirement. Evaluation is only attempted at ≥ 90 days. Returns success/failure with `evaluated` flag.
- [CONFIRMED] **Frontend — three-screen flow:** (1) Product list with visual progress pills showing days recorded vs. the 30-day threshold; (2) Add-sales form with date picker and units field, including a "Today" shortcut button; (3) Timeline table distinguishing manually entered values from auto-filled zeros. A progress bar tracks the 30-day threshold milestone after each entry.
- [CONFIRMED] **Pipeline integration — shared pathway:** `data_source` is stored for traceability but is never read by the forecasting, decision, evaluation, or scenario services. Manual data flows through exactly the same analytical pipeline as uploaded data. A product created and populated via manual entry produces identical forecast, decision, and evaluation outputs to one created via CSV upload.
- [CONFIRMED] **Migration:** `data_source TEXT DEFAULT 'upload'` is added to both `products` and `sales` tables via `_run_migrations()` at app startup using `add_col_if_missing()` — no manual migration step required.
- [CONFIRMED] **Validation rules enforced at API level:** no future dates; no negative units_sold; no duplicate product names within the same company; price and category are optional; `product_id` must be an integer; date must parse as ISO format (`YYYY-MM-DD`). All validation errors return HTTP 400 with a descriptive message.

→ **Dissertation chapter target: Chapter 4 (Implementation — data ingestion). Academic framing: addresses DSR problem of SMEs lacking structured historical data by providing a zero-prerequisite data capture mechanism that feeds the same analytical artefact.**

### 5c. Forecasting Module
- [CONFIRMED] Four models: Simple Moving Average (SMA), Weighted Moving Average (WMA), Simple Exponential Smoothing (SES, α=0.3), Holt's Linear Trend (α=0.3, β=0.1).
- [CONFIRMED] Model selection by lowest MAE on a 30-day validation window — automatic, no user configuration required.
- [CONFIRMED] Outputs per product: `forecast_demand`, `safety_stock`, `reorder_point`, `order_quantity` (EOQ), `risk_flag`, `model_used`, `lower_bound`, `upper_bound` (95% CI), `stockout_prob`, `trend_slope`, `trend_direction`.
- [CONFIRMED] Minimum 30 days of sales data required. Products below threshold receive a placeholder record (`model_used='N/A'`) and a HOLD decision with explanatory reason.
- [CONFIRMED] **Forecast table visual components**: Three styled components replace plain-text cells in the forecast table. (1) `.trend-chip` — a pill badge (border-radius 999px) coloured green for INCREASING, red for DECREASING, slate for STABLE, with slope rate appended (e.g. "↑ Rising +1.2/day"). (2) `.prob-gauge-wrap` — a miniature bar chart (6px tall) beneath the stockout percentage, fill colour thresholded at ≥50% (red), ≥20% (amber), <20% (green). (3) `.demand-range` — 95% CI bounds formatted as "lo – hi u/day" with bolded numerals and muted units text.
- [CONFIRMED] **Model insight panel**: A summary panel above the forecast table (manager view) shows: Products Forecast count, Dominant Model (most frequently selected by MAE, with percentage), High Stockout Risk count (≥50% probability), and a segmented colour-coded model distribution bar (Mid Green=SMA, Slate=WMA, Green=SES, Amber=Holt) with a legend. This makes the algorithmic model selection visible to the manager, elevating a technical detail into a meaningful product signal.
- [CONFIRMED] Manager-only tab. "Run Forecast" button triggers fresh pipeline execution for the company.

→ **Dissertation chapter target: Chapter 4 (Implementation — forecasting engine)**

### 5d. Inventory Decision Logic
- [CONFIRMED] Four decision classes: REORDER (stock < safety_stock), AT_RISK (stock < reorder_point), HOLD (stock ≥ reorder_point), INACTIVE (product.is_active = 0).
- [CONFIRMED] Each decision includes a natural-language reason string containing: current stock, threshold values, EOQ recommendation, stockout probability, trend direction and slope.
- [CONFIRMED] Decisions tab is visible to both roles. Forecast demand column visible to managers only (Jinja2 conditional). Reason text is no longer an inline column — it is accessible via progressive disclosure (see below).
- [CONFIRMED] **Expandable decision row**: Clicking any decision row (manager view) inserts an accordion sub-row beneath it containing: Forecast Demand, 95% CI Range, Reorder Point, and a full-width reason card with an eucalyptus left border. Only one brief is open at a time. A `›` chevron in the row rotates 90° when open. The brief uses a `fadeInDown` keyframe (220ms). Row data is stored in `window._decisionsData` and retrieved by `data-decision-idx` attribute on click.
- [CONFIRMED] **REORDER row visual hierarchy**: REORDER rows in all data tables carry a 3px red left border (`box-shadow: inset 3px 0 0 var(--semantic-critical)` on the first `<td>`) and a `rgba(220,38,38,0.032)` background tint. This replaces the previous `pulse-glow` infinite animation — the border and tint are visually distinguishing without the continuous motion that competes with the user's focus.
- [CONFIRMED] **Contextual empty states**: When the Decisions API returns an empty array, the table body renders a `.empty-state` panel containing a branded icon, explanatory title, body text, and role-gated CTA (manager: "Run Pipeline" → navigates to Forecast tab; staff: "Ask your manager to run the forecasting pipeline"). The same pattern applies to Inventory, Forecast, Evaluation, and Classification tabs via a shared `renderEmptyState()` utility.
- [CONFIRMED] **Mark as Ordered / Pending Delivery state (manager view):** REORDER rows in the Decisions table show an "Order Placed" button for managers only when that product has no pending order. Clicking opens a prompt for quantity and expected delivery days, then calls `POST /api/reorder/log`. This creates a `reorder_log` record linking the action to the product, quantity, and the manager who triggered it. If a pending order already exists, the row instead shows "Pending Delivery" and links to the pending order modal; the backend also rejects duplicate pending orders with HTTP 409. From the pending order modal, the manager can edit the planned reorder quantity, expected delivery days, and notes via `POST /api/reorder/update` before delivery is confirmed. This prevents the operational failure where the same REORDER decision could be acted on repeatedly while stock remains unchanged before delivery, while still allowing real-world order corrections before receipt.
- [CONFIRMED] **Staff decision context (enriched view):** Staff users now see two additional columns in the Decisions table: current stock on hand and recommended order quantity (EOQ). This allows staff to understand the urgency of a REORDER decision without access to internal forecast details (confidence bounds, risk flags, reason strings remain manager-only). The staff query joins the `inventory` and `forecast` tables to add `stock_on_hand`, `order_quantity`, and `forecast_demand` to the response.
- [CONFIRMED] **Pending orders bar on Decisions tab:** A pulsing status bar above the Decisions table (managers only) shows pending delivery count and a "Confirm Deliveries →" button. Opens the same delivery confirmation modal as the Overview pending orders bar.

→ **Dissertation chapter target: Chapter 4 (Implementation — decision engine)**

### 5i. Password Reset and Email Verification

- [CONFIRMED] **Forgot password flow:** `GET /forgot-password` renders a form. Submitting the email address calls `POST /api/password/forgot`. If the email matches an active account, a `password_reset_tokens` record is created with a SHA-256-hashed `secrets.token_urlsafe(32)` token, a 1-hour expiry, and the user's `user_id`. The raw token is embedded in a reset URL routed to `/reset-password/<token>` and emailed to the user via `_send_reset_email()`. The API response is deliberately non-disclosing: the same message is returned regardless of whether the account exists ("If that account exists, a reset link has been sent"), preventing account enumeration. Rate-limited to 5 attempts per 5-minute window per IP.
- [CONFIRMED] **Password reset flow:** `/reset-password/<token>` renders `reset_password.html` with the token passed as a Jinja2 variable. `POST /api/password/reset` accepts `{token, password}`. The backend looks up the SHA-256 hash of the submitted token in `password_reset_tokens`, checks it is unused (`used_at IS NULL`) and unexpired (`expires_at > DATETIME('now')`). On success: updates `users.password_hash` with a bcrypt hash of the new password, clears the legacy plaintext `password` field, and marks the token as used by setting `used_at`. Minimum password length is 8 characters. Rate-limited to 5 attempts per 5-minute window.
- [CONFIRMED] **Email verification flow:** On registration, a `email_verification_tokens` record is issued with a 72-hour expiry and immediately emailed via `_send_verification_email()`. The `users.email_verified` column (INTEGER, default 0) tracks verification status. `GET /verify-email/<token>` renders `verify_email.html`; `POST /api/email/verify` validates the token and sets `email_verified = 1`. `POST /api/email/resend` (authenticated) re-issues a fresh 72-hour token for unverified accounts, rate-limited to 5 requests per 5 minutes.
- [CONFIRMED] **SMTP-optional email delivery:** All email is sent via `mailer.py` — a thin wrapper around Python's standard-library `smtplib`. Configuration is environment-variable driven: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS` (default "1"). If `SMTP_HOST` is not set, `send_email()` returns `(False, "SMTP_HOST is not configured")` without raising. Both `forgot_password()` and `register()` handle this gracefully: when `email_sent = False`, the API response includes the raw reset/verification URL in the JSON body so it can be accessed directly during development or local deployment. This allows the full authentication flow to be tested without a real mail server.
- [CONFIRMED] **Token security design:** Raw tokens are never stored — only their SHA-256 digest (`hashlib.sha256(token.encode()).hexdigest()`). The raw token exists only in the URL sent to the user's email and in the verification/reset form. A compromised database exposes only hashes; without the raw token, they cannot be redeemed. Each token is single-use: `used_at` is set on successful redemption and the `WHERE used_at IS NULL` check rejects reuse.
- [CONFIRMED] **Registration security hardening:** Rate-limited at 5 attempts / 5-minute window per IP (stricter than login's 10 attempts). Username auto-deduplication: if the requested username is already taken, the system appends a numeric suffix (`username 2`, `username 3`, etc.) rather than rejecting, ensuring the account is created without blocking the user flow. New accounts receive `email_verified = 0` and `is_active = 1`; `email_verified` is recorded but not currently enforced as a login gate (users can log in before verifying).
- [CONFIRMED] **Legacy password migration:** Users who registered before bcrypt hashing was added have their plaintext password in the `password` column. On successful login, if `password_hash` is null and `password` matches, the system immediately computes and stores a bcrypt hash and clears the plaintext column. This transparent migration occurs within the same login transaction — no batch migration job is required.

→ **Dissertation chapter target: Chapter 4 (Implementation — authentication and security) and Chapter 3 (Methodology — security design decisions). Design decisions: 14k-ii (CSRF), 14k-iii (SMTP-optional email), 14k-iv (token hashing)**

### 5j. Homepage and Public Pages

- [CONFIRMED] **Public homepage (`/`):** Authenticated users are redirected to the dashboard. Unauthenticated visitors see `homepage.html` — a public marketing/landing page introducing StockLens. This gives the system a complete public entry point distinct from the login page, appropriate for a product intended for multiple companies.
- [CONFIRMED] **Legal pages:** Three routes serve policy content via a shared `legal.html` template with page-specific content injected as Jinja2 variables: `/privacy` (data storage policy — explains what data StockLens stores and excludes personal data), `/terms` (usage terms — clarifies that forecasts are informational and require manager review), `/contact` (support instructions — directs users to the system administrator). The routes are publicly accessible without authentication.
- [CONFIRMED] **Currency symbol per company:** The `companies` table has a `currency_symbol TEXT DEFAULT '£'` column. The dashboard route queries this at render time and injects it as `currency_symbol` into `dashboard.html`. This allows companies in different locales to see their currency symbol rather than the hardcoded pound sign — a foundational step for internationalisation beyond the translation layer.

→ **Dissertation chapter target: Chapter 4 (Implementation — public interface and multi-tenancy) and Chapter 5 (Interface design)**

### 5e. Model Evaluation Module
- [CONFIRMED] Computes: MAE, RMSE, Bias, Accuracy % (derived from MAPE), MASE, Tracking Signal per product.
- [CONFIRMED] Minimum 90 days of sales data required for evaluation to run.
- [CONFIRMED] Summary card shows fleet-wide averages. Per-product table shows individual metrics with an evaluation period date range.
- [CONFIRMED] Manager-only tab.

→ **Dissertation chapter target: Chapter 4 (Implementation — evaluation) and Chapter 6 (Evaluation)**

### 5f. Scenario Simulation
- [CONFIRMED] User adjusts: demand shock multiplier (0.7–1.5×), lead time (3–21 days), simulation horizon (30/60/90 days). All inputs validated server-side.
- [CONFIRMED] Simulation compares reactive (reorder at stockout) vs proactive (reorder at reorder point) strategies.
- [CONFIRMED] Outputs per product: stockout days, overstock days, total reorders, adjusted reorder qty, improvement delta. Bar chart comparison per product.
- [CONFIRMED] Pre-computed baseline (90-day) saved as JSON per company and reloaded without recomputation unless pipeline re-runs.
- [CONFIRMED] **Scenario verdict panel**: After a custom simulation runs, a plain-English verdict block renders below the result with a colour-coded left border. Green verdict if `stockout_reduction > 0` (system prevents stockouts), red if the system adds stockout days, slate if neutral. The verdict states the total stockout-days prevented, percentage improvement, and the top 3 most exposed products. This converts a raw number pair ("X stockout-days with system vs Y without") into an actionable recommendation.
- [CONFIRMED] Manager-only tab.

→ **Dissertation chapter target: Chapter 4 (Implementation — scenario builder)**

### 5g. ABC-XYZ Classification
- [CONFIRMED] ABC: products ranked by revenue (units × price, last 90 days). Cumulative thresholds: A ≤ 80%, B ≤ 95%, C > 95%.
- [CONFIRMED] XYZ: demand variability by coefficient of variation (CV = std/mean). X < 0.5, Y < 1.0, Z ≥ 1.0.
- [CONFIRMED] 9 combined strategies with review frequency (Daily/Weekly/Monthly) and ordering strategy string per cell.
- [CONFIRMED] 3×3 matrix grid rendered in the UI as coloured cells showing product count per classification.
- [CONFIRMED] Manager-only tab.
- [CONFIRMED] Product activation/deactivation is operationally closed: the manager toggle updates `products.is_active`, deletes stale forecast/decision/evaluation rows for that product, then immediately re-runs forecast, decision, and evaluation logic. Deactivated products therefore receive an `INACTIVE` decision without waiting for a full company pipeline run; reactivated products receive fresh derived records from current data.

→ **Dissertation chapter target: Chapter 4 (Implementation — classification)**

### 5h. Team Management
- [CONFIRMED] Manager can list all company staff (sorted: managers first, then alphabetical).
- [CONFIRMED] Soft-delete staff (sets `is_active=0`; user cannot log in but record preserved).
- [CONFIRMED] Role change: promote staff to manager or demote manager to staff. System prevents demotion if only one active manager remains.
- [CONFIRMED] Generate new invite codes on demand. Latest code and expiry displayed in the team tab.
- [CONFIRMED] Re-run Pipeline button triggers full company-wide recomputation: deletes all forecast/decisions/evaluation/classification records, recomputes for all active products.

→ **Dissertation chapter target: Chapter 4 (Implementation — team management)**

---

## 6. Data Pipeline — Full Detail

- [CONFIRMED] **Stage 1 — File reception:** `upload_sales()` receives multipart form files. Validates extension (`.csv`, `.xlsx`, `.xls` only). Empty file list returns 400.
- [CONFIRMED] **Stage 2 — File reading:** `_read_upload_file()` decodes bytes. CSV: tries UTF-8, falls back through latin-1/cp1252. XLSX: uses `openpyxl` via `_xlsx_to_dictrows()`.
- [CONFIRMED] **Stage 3 — Column detection:** `_parse_stream()` builds a lowercase header map (`hmap`). `_match_col()` checks each alias set case-insensitively. Detects: date, product, units_sold, price, stock_on_hand. If no exact alias matches, `_fuzzy_match_col()` applies substring matching — e.g. a column named `coffee_name` matches the product type because it contains `name`; a column named `order_dt` matches the date type because it contains `dt`. Fuzzy hints exist for all five column types (date, product, units, price, stock) with type-specific exclusion lists to prevent cross-type false matches. If date/product/units cannot be resolved by either pass, the parser returns an error listing found columns and a rename tip.
- [CONFIRMED] **Stage 4 — Format auto-detection (two paths):**
  - **Interaction log:** If the dataset has an interaction_type-like column but no units column, `_aggregate_interaction_log()` filters rows where the interaction field matches a purchase keyword set (`purchase`, `buy`, `order`, `checkout`, etc.) and aggregates by (product, date) into daily unit counts. Rewrites headers to standard format.
  - **Transaction log (units inference):** If date and product columns are detected but no quantity column exists after both the exact-alias and fuzzy passes, `_aggregate_as_transaction_log()` treats each row as one sale (units = 1) and aggregates by (product, date). This handles POS exports and e-commerce order logs where each row represents a single transaction with no explicit quantity field. The `format_used` field in the API response is set to `"transaction-log (each row = 1 sale, aggregated by product + date)"` so the manager sees the inferred format in the upload preview before confirming.
- [CONFIRMED] **Stage 5 — Duplicate pre-load:** All existing `(product_id, date)` pairs for known products are loaded into a Python set before row iteration. In-batch duplicates tracked via a second set `new_pairs`. O(1) lookup per row.
- [CONFIRMED] **Stage 6 — Row parsing loop:** For each row: (a) parse date via `_normalise_date()` (18 formats + dateutil fallback); (b) strip product name; (c) parse units via `_parse_units()` (handles comma separators, trailing chars); (d) skip if units ≤ 0 (returns/negatives); (e) lookup or auto-create product; (f) check duplicate pair; (g) insert to `sales` table; (h) track latest stock value per product.
- [CONFIRMED] **Stage 7 — Product auto-creation:** New product names get: `category='Imported'`, `sku='SKU-{product_id}'`, initial `inventory` row with `stock_on_hand=0`. Product ID is immediately usable for subsequent rows in the same file.
- [CONFIRMED] **Stage 8 — Stock update:** After all rows processed, the latest-dated stock value per product (from the stock column in the file) updates `inventory.stock_on_hand` if present.
- [CONFIRMED] **Stage 9 — Logging:** Each file's stats (filename, uploader, rows_inserted, new_products, skipped_duplicates, inventory_updates) logged to `upload_log` with timestamp.
- [CONFIRMED] **Stage 10 — Forecast recomputation:** For each affected `product_id`: delete existing forecast, decisions, evaluation records for that product. Re-run: `run_forecast_for_product()` → `compute_decision_for_product()` → `run_evaluation_for_product()` (active products only).
- [CONFIRMED] **Stage 11 — Scenario and classification refresh:** `run_scenario_comparison(company_id)` and `run_classification(company_id)` run company-wide after individual products are updated.
- [CONFIRMED] **Stage 12 — Response:** JSON with `success`, `total_rows`, `products_updated`, `new_products`, cleaning summary, per-file summaries, and human-readable `message`.
- [CONFIRMED] **Edge case — empty file:** Parsing loop produces 0 rows. Response reports no rows inserted.
- [CONFIRMED] **Edge case — all duplicates:** `skipped_duplicates` count returned; message explains data already in database.
- [CONFIRMED] **Edge case — parse errors:** Up to 5 error messages returned per file in `errors[]`. Further errors truncated.
- [INFERRED] **Known failure mode:** If pipeline recomputation raises an unhandled exception mid-loop, partial results may be committed. No transaction wrapping around the full pipeline.

→ **Dissertation chapter target: Chapter 4 (Implementation — data pipeline) and Chapter 3 (Methodology — data flow)**

---

## 7. Data Cleaning and Preprocessing

- [CONFIRMED] **Negative/return row removal:** Any row where parsed `units_sold ≤ 0` is silently skipped. Count tracked as `skipped_returns`. Prevents return transactions from corrupting demand signal.
- [CONFIRMED] **Duplicate detection:** Two-layer — pre-loaded DB pairs checked first (prevents re-uploading previously committed data), in-batch pairs checked second (prevents duplicates within the same file). Key: `(product_id, date)`.
- [CONFIRMED] **Date normalisation:** `_normalise_date()` attempts 18 explicit `strptime` format strings (ISO, UK, US, text months, with/without time components). Falls back to `dateutil.parser.parse(raw, dayfirst=True)`. Returns `None` on total failure; row skipped.
- [CONFIRMED] **Numeric coercion:** `_parse_units()` strips whitespace, removes trailing non-numeric characters, handles comma-as-thousands-separator (`1,234` → `1234`) and comma-as-decimal-separator (`1,5` → `1.5` in locale-aware formats). Converts to `int` via `round(float(...))`.
- [CONFIRMED] **Column alias resolution:** Two-pass detection per field. Pass 1: case-insensitive exact match against 60+ alias variants per field (e.g. `qty`, `Quantity Sold`, `units`, `vol` all resolve to the units column). Pass 2 (fuzzy fallback): `_fuzzy_match_col()` checks whether the lowercased header *contains* any of a type-specific hint list — e.g. `coffee_name` contains `name` → product column; `order_dt` contains `dt` → date column; `weekly_qty_sold` contains `qty` → units column. Each type has an exclusion list to prevent cross-type matches (e.g. a column containing `date` is excluded from the product type, a column containing `name` is excluded from the date type).
- [CONFIRMED] **Auto aggregation — interaction logs:** If source is an e-commerce event log (has interaction_type-like column, no units column), purchase events are filtered by keyword set and grouped by `(product, date)` and summed — converting transaction-level data to daily aggregate demand.
- [CONFIRMED] **Auto aggregation — transaction logs (units inference):** If date and product columns are found but no quantity column exists, every row is treated as a single sale (units = 1) and aggregated by (product, date). Handles POS and order-export formats where each row is one sale record with no quantity field.
- [CONFIRMED] **Data sorting for time-series:** `forecast_service.py` fetches sales `ORDER BY date DESC LIMIT 90` then reverses — ensures oldest-first ordering for model training regardless of upload order.
- [CONFIRMED] **New product initialisation:** Auto-created products start with `stock_on_hand = 0`. If the upload file includes a stock column, the latest-dated row updates this. No assumption is made about initial stock.
- [CONFIRMED] **Price defaults:** Products without price in the DB default to `1.0` for EOQ calculation. This is a silent default — no warning is raised. [RISK: affects ABC revenue ranking and EOQ accuracy for products with NULL price.]
- [UNCERTAIN] **Outlier removal:** No explicit outlier detection (e.g., IQR or Z-score filter on units_sold). Extremely high one-day demand figures are accepted and passed to the forecasting model unchanged.
- [INFERRED] **Cleaning does NOT catch:** product name inconsistencies (e.g., "Widget A" vs "Widget-A" treated as two products), unit of measure changes in the same column, or currency conversions in price columns.

→ **Dissertation chapter target: Chapter 4 (Implementation — data preprocessing) and Chapter 3 (Methodology — data quality)**

---

## 8. Forecasting System — Full Detail

- [CONFIRMED] **Data window:** Last 90 days of sales fetched per product (`ORDER BY date DESC LIMIT 90`, then reversed to oldest-first). Minimum 30 rows required.
- [CONFIRMED] **Train/validation split (for model selection):** If ≥90 rows: train = rows[0:60], validate = rows[60:90]. If 30–89 rows: train = rows[:-30], validate = rows[-30:]. Validation is always the most recent 30 observations.
- [CONFIRMED] **SMA implementation:** `mean(train)`. Single scalar. No window parameter — uses entire training set.
- [CONFIRMED] **WMA implementation:** Linearly increasing weights from 1 to `n`. `sum(w*v for w,v in zip(weights, train)) / sum(weights)`. Recent observations weighted more heavily.
- [CONFIRMED] **SES implementation:** `alpha=0.3`. Iterates through training series: `level = alpha * x + (1-alpha) * level`. Final level is forecast.
- [CONFIRMED] **Holt's Linear Trend implementation:** `alpha=0.3`, `beta=0.1`. Tracks level and trend components. Forecast = `level + trend`. Captures directional momentum in the series.
- [CONFIRMED] **Model selection:** Each model's forecast scalar is compared against all 30 validation values using MAE (`sum(abs(fc - v) for v in validate) / len(validate)`). Model with lowest MAE is selected. Ties default to whichever is evaluated first (SMA).
- [CONFIRMED] **Standard deviation:** Computed on training window using sample variance formula (`/ max(n-1, 1)`).
- [CONFIRMED] **Safety stock:** `Z_SCORE × std_dev × sqrt(LEAD_TIME)`. Z=1.645 (95% service level), LEAD_TIME=7 days.
- [CONFIRMED] **Reorder point:** `(mean_demand × LEAD_TIME) + safety_stock`.
- [CONFIRMED] **EOQ:** `sqrt((2 × annual_demand × ORDERING_COST) / holding_cost)`. `ORDERING_COST=£25/order`, `HOLDING_RATE=25%/year`. `holding_cost = max(0.10, unit_price × 0.25)`. Annual demand = `mean_demand × 365`.
- [CONFIRMED] **95% confidence bounds:** `lower = max(0, mean_demand - 1.645 × std_dev)`, `upper = mean_demand + 1.645 × std_dev`. Point forecast bounds on daily demand, not cumulative.
- [CONFIRMED] **Trend detection:** OLS linear slope on last 30 observations. `INCREASING` if slope > 0.3, `DECREASING` if slope < -0.3, `STABLE` otherwise. Threshold 0.3 units/day.
- [CONFIRMED] **Stockout probability:** Normal CDF of `z = (stock - mean_demand × LEAD_TIME) / (std_dev × sqrt(LEAD_TIME))`. `P(stockout) = 1 - Φ(z)`. CDF approximated via `erf`. Result clamped to [0, 100].
- [CONFIRMED] **Risk flag:** HIGH if `stock < safety_stock`, MEDIUM if `stock < reorder_point`, LOW if `stock ≥ reorder_point`, INACTIVE if `is_active=0`.
- [CONFIRMED] **Insufficient data:** Products with < 30 rows receive a placeholder record (`risk_flag='LOW'`, `model_used='N/A'`, all numeric fields = 0). Decision service interprets N/A and writes HOLD with "need ≥ 30 days" reason.
- [CONFIRMED] **Key assumptions:** Demand stationarity (no seasonal decomposition). Constant lead time (7 days). Normal distribution of demand. No external factors (promotions, stockouts, competitor events).
- [INFERRED] **Known limitations:** Fixed alpha/beta in SES/Holt (no grid search or optimisation). No seasonal adjustment. WMA uses linear weights (no exponential). Model selection retrains every pipeline run — no model persistence.

→ **Dissertation chapter target: Chapter 4 (Implementation — forecasting) and Chapter 2 (Literature Review — forecasting models)**

---

## 9. Inventory Decision Logic — Full Detail

- [CONFIRMED] **Decision hierarchy (evaluated in order):**
  1. `is_active = 0` → `INACTIVE` (no further calculation)
  2. `model_used = 'N/A'` → `HOLD` with insufficient-data reason
  3. No forecast/inventory record → `HOLD` with upload-prompt reason
  4. `stock < safety_stock` → `REORDER`
  5. `stock < reorder_point` → `AT_RISK`
  6. `stock ≥ reorder_point` → `HOLD`
- [CONFIRMED] **Safety stock threshold** is the critical boundary — it represents the buffer needed to cover demand uncertainty during lead time. Crossing it means there is no buffer remaining.
- [CONFIRMED] **Reason string contents:** Always includes current stock units, relevant threshold value, EOQ-based recommended order quantity. REORDER and AT_RISK add stockout probability. All include trend direction and slope if non-stable.
- [CONFIRMED] **Example REORDER reason:** `"Stock (45 units) is below safety stock (62.3 units). Urgent reorder of 120 units recommended (EOQ). Stockout probability over lead time: 78.4%. Demand is trending UP (+0.45 units/day) — consider ordering more."`
- [CONFIRMED] **Reason strings are not templated but constructed programmatically** — values from forecast record are embedded directly.
- [INFERRED] **Explainability design choice:** Reason strings make the decision logic transparent and auditable. A manager can understand exactly why the system recommends a reorder. This is a deliberate DSS design choice — the system advises, the human decides.
- [INFERRED] **Rule-based approach rationale:** Thresholds (safety stock, reorder point) are grounded in classical inventory theory (EOQ/ROP model). Rules are interpretable, consistent, and require no training data. Alternative — ML classification — would require labelled outcome data (was the decision correct?) which does not exist for a new system.
- [CONFIRMED] **No automated ordering:** The system writes a decision and reason. The manager must physically action the reorder. This is intentional — purchase orders, supplier relationships, and cash flow decisions remain with the human operator.
- [CONFIRMED] **Decision priority sort in API:** `REORDER=1, AT_RISK=2, HOLD=3, INACTIVE=4` — most urgent items appear first regardless of product name.
- [CONFIRMED] **REORDER rows highlighted** in UI with a permanent 3px red left border (`box-shadow: inset 3px 0 0 var(--semantic-critical)`) and a faint red background tint (`rgba(220,38,38,0.032)`). The previous `pulse-glow` infinite animation was removed — the static border and tint are visually distinguishing without continuous motion competing with the user's focus across the entire table. See Section 5d for full treatment.
- [INFERRED] **Limitation — fixed thresholds:** Reorder point is computed from a fixed lead time (7 days) and fixed service level (95%). It does not adapt to actual supplier performance or seasonal demand variation.

→ **Dissertation chapter target: Chapter 4 (Implementation — decision engine) and Chapter 2 (Literature Review — DSS, inventory control theory)**

---

## 10. Evaluation System

- [CONFIRMED] **Minimum data threshold:** 90 days of sales required. Products with 30–89 days get a forecast and decision but no evaluation metrics.
- [CONFIRMED] **Train/test split:** Training = `rows[-90:-30]` (days -90 to -31, 60 observations). Test = `rows[-30:]` (last 30 days). No cross-validation — single holdout split.
- [CONFIRMED] **Metrics computed (per product):**
  - **MAE** — mean absolute error on test set. Unit: same as demand (units/day).
  - **RMSE** — penalises large errors more than MAE. Unit: units/day.
  - **Bias** — signed mean error. Positive = systematic overforecasting, negative = underforecasting.
  - **Accuracy %** — `max(0, 100 - MAPE)`. MAPE = `(MAE / actual_mean) × 100`. Expressed as percentage.
  - **MASE** — MAE divided by naïve one-step-ahead baseline MAE. MASE < 1 = better than naïve. Rounded to 3 decimal places.
  - **Tracking Signal** — `cumulative_signed_error / MAD`. Threshold `|TS| > 4` indicates systematic drift. Rounded to 2 decimal places.
- [CONFIRMED] **Naïve baseline for MASE:** `mean(|series[i] - series[i-1]| for i in range(1, n))`. Returns 1.0 if series has only 1 observation (division guard).
- [CONFIRMED] **Predicted value for metrics:** Uses `_select_best_model(train, validate)` to get the model's forecast scalar. Applied as a constant forecast for all 30 test days.
- [CONFIRMED] **Evaluation period stored:** `eval_period = "{first_test_date} to {last_test_date}"` — visible in the evaluation table.
- [INFERRED] **Limitation:** Evaluation uses the same model selection logic as forecasting — it is not an independent out-of-sample test of the deployed forecast. It measures how well the best model (as selected by MAE) performs on the most recent 30 days.
- [INFERRED] **Limitation:** No tracking of live inventory outcomes — the system cannot measure whether REORDER decisions that were acted upon actually prevented stockouts. This would require integration with a purchasing or POS system.
- [INFERRED] **Limitation:** Single forecast scalar applied across 30 test days. Real forecasts change daily; this evaluates a point-in-time snapshot.
- [CONFIRMED] **Aggregate evaluation:** The summary card computes fleet-wide averages **client-side in JavaScript**, not via SQL AVG. `loadEvaluation()` in `app.js` receives the per-product JSON array from `/api/evaluation` and computes `avgAcc`, `avgMae`, `avgRmse`, and `avgMase` using `Array.reduce()` / `Array.length`. The "Beat Naïve Baseline" count (`beatsNaive`) is also computed client-side by filtering products where `naive_mase < 1`. No server-side aggregation exists for these summary figures.

→ **Dissertation chapter target: Chapter 6 (Evaluation — system performance metrics)**

---

## 11. Scenario Simulation

- [CONFIRMED] **User-adjustable parameters:** Demand shock (0.1× to 5.0× multiplier, validated server-side), lead time (1–60 days), horizon (7–180 days). UI presents preset values: shock 0.7–1.5, lead time 3–21, horizon 30/60/90.
- [CONFIRMED] **Simulation logic:** Day-by-day loop. Each day: (1) receive pending delivery if lead time elapsed; (2) decide whether to reorder; (3) fulfill daily demand; (4) check overstock. Two runs per product: reactive (reorder at stockout) and proactive (reorder at reorder point).
- [CONFIRMED] **Overstock threshold:** `stock > reorder_point × 3`. Days exceeding this are counted as overstock days.
- [CONFIRMED] **Minimum data for simulation:** 30 days of historical sales required per product. Products below threshold are skipped silently.
- [CONFIRMED] **Initial stock for simulation:** `max(int(stock_on_hand), 10)` — floors at 10 to prevent degenerate simulations with zero starting stock.
- [CONFIRMED] **Outputs per product:** stockout_days (without/with), overstock_days (without/with), total_reorders (without/with), adjusted_reorder_qty, improvement delta (stockout reduction, overstock reduction).
- [CONFIRMED] **Chart:** Bar chart comparing stockout days with vs without system across all products.
- [CONFIRMED] **Pre-computed baseline:** The 90-day company-wide baseline is stored as JSON and reloaded without recalculation. Custom runs (via the builder) are computed on demand and not persisted.
- [INFERRED] **Dissertation argument:** The scenario module provides the empirical justification for the system — it quantifies the improvement from proactive vs reactive inventory management, directly answering the research question.
- [INFERRED] **Limitation:** Simulation uses a constant daily demand (forecast scalar) for all days. Demand variability within the simulation period is not modelled — real days vary stochastically. Results are therefore optimistic. To quantify this: the coefficient of variation per product is computed by the ABC-XYZ module (stored as `cv` in `product_classification`). Extract the CV range from the classification output after a pipeline run and complete the following sentence before submission — **"The coefficient of variation for demand in the evaluated dataset ranges from [X_min] to [X_max]. Products classified as Z-class (CV ≥ 1.0) account for [N] of [total] products; for these products, real stockout risk during the simulation window is materially higher than the constant-demand model suggests, as demand spikes of up to [CV × mean_demand] units/day above the scalar are possible within any single 7-day lead time window."** This turns the vague limitation into a quantified, examinable claim.

→ **Dissertation chapter target: Chapter 4 (Implementation — scenario) and Chapter 6 (Evaluation — value demonstration)**

---

## 12. ABC-XYZ Classification

- [CONFIRMED] **ABC — revenue segmentation:** Products ranked by total revenue (units_sold × price) over last 90 days. Sorted descending. Cumulative revenue percentage computed. A ≤ 80%, B ≤ 95%, C > 95%.
- [CONFIRMED] **XYZ — demand variability:** Coefficient of variation `CV = std(daily_units) / mean(daily_units)` over last 90 days of sales per product. X: CV < 0.5, Y: 0.5 ≤ CV < 1.0, Z: CV ≥ 1.0. Products with zero mean get CV = 0.0.
- [CONFIRMED] **Combined matrix:** 9 cells (AX through CZ). Each product assigned one combined class. `INSERT OR REPLACE` ensures re-runs update existing records.
- [CONFIRMED] **Strategy guidance per cell:** Review frequency (Daily/Weekly/Monthly) and ordering strategy string. E.g., AX → "Tight EOQ — high value, stable demand", CZ → "Review for discontinuation — low value, erratic demand".
- [CONFIRMED] **Scope:** Only `is_active = 1` products are classified. Inactive products are excluded.
- [INFERRED] **Business purpose:** Differentiates inventory management intensity. High-value stable items (AX) warrant daily monitoring and tight EOQ; low-value erratic items (CZ) can be reviewed monthly and may be candidates for discontinuation. Prevents equal attention to unequal items.
- [CONFIRMED] **Price sensitivity:** Revenue calculation uses `float(p['price'] or 0.0)`. Products with NULL price contribute £0 revenue and are likely classified C regardless of volume.
- [INFERRED] **Limitation:** 90-day lookback does not capture seasonal patterns — a product with high December sales classified in January will appear lower revenue than it truly is. No weighting or seasonal adjustment applied.
- [INFERRED] **Limitation:** ABC rank is relative to the current product catalogue. Adding or removing products changes the ranking of all products.

→ **Dissertation chapter target: Chapter 4 (Implementation — classification) and Chapter 2 (Literature Review — ABC-XYZ theory)**

---

## 13. Technical Architecture and Interface Design

### Architecture

- [CONFIRMED] **Flask blueprint structure:** Separates concerns by domain (auth, pages, data API, admin, onboarding). Each blueprint is a separate Python module. Registered in `create_app()` with URL prefixes.
- [CONFIRMED] **SQLite choice:** Single-file embedded database. No separate DB server process. `db/stocklens.db` path computed from project root at startup. Suitable for single-node deployment; not suitable for concurrent multi-process or distributed deployment.
- [CONFIRMED] **company_id multi-tenancy:** Every data table has a `company_id` integer column. All API queries parameterise on `company_id` extracted from `session['company_id']`. No row-level security at DB layer — relies entirely on application logic.
- [CONFIRMED] **Session auth:** Flask signed cookies. `SECRET_KEY` from environment (hardcoded dev default: `'dev-only-change-me'` — must be changed in production). `HttpOnly=True` prevents JS access. `SameSite=Lax` mitigates CSRF on same-origin links. `Secure` flag configurable via env; in production mode (`IS_PRODUCTION=true`), the app raises a `RuntimeError` at startup if `SESSION_COOKIE_SECURE` is not enabled.
- [CONFIRMED] **Full CSRF protection via before_request hook:** `@app.before_request csrf_protect()` runs on every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) to `/api/*` from an authenticated session. It compares the `X-CSRF-Token` request header (or `csrf_token` form field) against a `secrets.token_urlsafe(32)` token stored in the session. Mismatch returns HTTP 403. Pre-authentication endpoints (`/api/login`, `/api/register`, `/api/password/forgot`, `/api/password/reset`, `/api/email/verify`) are exempted by an explicit allowlist. The CSRF token is injected into the dashboard template and used by `app.js` for all `fetch()` calls. This provides cryptographic CSRF protection beyond `SameSite=Lax` baseline mitigation.
- [CONFIRMED] **Rate limiting:** A DB-backed `rate_limits` table (`bucket_key TEXT`, `created_at INTEGER`) replaces the earlier in-memory `defaultdict`. Rate limiting is applied to all auth surfaces: login (10 attempts / 5 min), register (5 / 5 min), forgot-password (5 / 5 min), reset-password (5 / 5 min), email resend (5 / 5 min). The DB-backed approach persists across process restarts, unlike the in-memory approach. IP extracted from `X-Forwarded-For` header with fallback to `request.remote_addr`.
- [CONFIRMED] **File upload size limit:** Flask `MAX_CONTENT_LENGTH = 16 × 1024 × 1024` (16 MB). Requests exceeding this are rejected by Flask before route handler runs, returning HTTP 413. A custom `@app.errorhandler(413)` returns `{"error": "File too large. Maximum upload size is 16 MB."}` as JSON rather than Flask's default HTML error page.
- [CONFIRMED] **Migration system:** `_run_migrations()` runs at every app startup. Uses `PRAGMA table_info()` to check existing columns and `ALTER TABLE ADD COLUMN` for additions. Creates new tables with `CREATE TABLE IF NOT EXISTS`. Backfills legacy data (email generation, password hashing, company_id assignment). No migration version tracking — idempotent by design.
- [CONFIRMED] **Foreign key enforcement:** `PRAGMA foreign_keys = ON` set on every connection. Ensures referential integrity (e.g., invite codes reference valid companies and users).
- [CONFIRMED] **No ORM:** All queries are raw SQL strings with parameterised placeholders. `sqlite3.Row` provides dict-style column access.

### Interface

- [CONFIRMED] **Jinja2 + modular JS:** Server renders initial HTML with session-injected variables (`role`, `username`, `company_name`). All data fetched client-side via `fetch()`. No full page reloads after initial load.
- [CONFIRMED] **Tab-based lazy loading:** `loadedTabs = new Set()`. Each tab loads its data only once on first activation, stored in the set. Subsequent tab switches do not refetch. Upload clears this set to force refresh.
- [CONFIRMED] **Role-aware navigation:** Jinja2 conditionals remove manager-only nav items and tab panels from HTML entirely for staff users — not just hidden via CSS, but absent from DOM.
- [CONFIRMED] **Mobile design:** `bottom-nav` (4 tabs) displayed below 768px. Slide-out `mobile-drawer` sheet for additional manager tabs. Sidebar hides and becomes an overlay on mobile (slide-in via `.sidebar.open` class).
- [CONFIRMED] **Light/dark theme:** `data-theme` attribute on `<html>`. Toggled via `theme-toggle` button in topbar. Persisted in `localStorage`. CSS uses `[data-theme="dark"]` custom property overrides.
- [CONFIRMED] **Multilingual text:** `translations.js` defines key-value maps for 14 languages: EN, ES, AR, FR, DE, PT, HI, UR, BN, TR, ZH, ID, TH, VI. `t(key)` function returns translation. `data-i18n` attributes on HTML elements updated on language switch. Language stored in `localStorage`. RTL applied for Arabic and Urdu: `document.documentElement.setAttribute('dir', 'rtl')`.
- [CONFIRMED] **Chart.js 4.x:** Six chart types: Sales Trend (line), Forecast vs Actual (line), Category Breakdown (doughnut), Top Products (bar), Inventory Levels vs Reorder Points (bar), Scenario Comparison (bar). All theme-aware (grid/tick colours swap on dark mode). Destroyed and recreated on each tab reload to prevent canvas conflicts.
- [CONFIRMED] **Animation system:** CSS keyframe animations (`fadeIn`, `slideUp`, `scaleIn`, `fadeInDown`, `slideDown`, `countUp`) applied to tab panels, cards, auth card, modals, empty states, activity items, welcome banner, and expandable decision brief. `animateCount()` JS function for KPI count-up (1200ms ease-out), session-guarded so it fires only on first Overview load per session. `prefers-reduced-motion` media query globally disables all animations and transitions for accessibility.
- [CONFIRMED] **REORDER row visual treatment:** REORDER rows carry a permanent 3px red left border (`box-shadow: inset 3px 0 0 #DC2626` on the first `<td>`) and a very faint red background tint (`rgba(220,38,38,0.032)`). The previous `pulse-glow` infinite animation was replaced — the static border and tint differentiate urgent rows without continuous motion competing with user focus across the entire table.
- [CONFIRMED] **Design system — colour separation:** The UI uses a two-layer colour system. Brand colour (#3D8565 Eucalyptus Green) is used exclusively for interactive UI elements (buttons, active nav, focus rings, progress indicators, expandable brief left border). Data-semantic colours are reserved for meaning: red (#DC2626) = critical/REORDER, amber (#F59E0B) = warning/AT_RISK, slate (#475569) = neutral/safe, green (#16A34A) = healthy/positive, slate (#F1F5F9 bg / #475569 text) = HOLD/neutral. This separation prevents cognitive confusion between "click here" and "this product is critical".
- [CONFIRMED] **Design system — glassmorphism surfaces:** The sidebar and authentication card use `rgba` translucent backgrounds with `backdrop-filter: blur(20px)`, giving a frosted-glass effect. The auth page uses a CSS `::before` pseudo-element with a pulsing radial gradient orb (8s infinite animation) as a decorative background. These are purely visual enhancements with no functional impact.
- [CONFIRMED] **Design system — gradient interactions:** Primary buttons use a linear gradient (Eucalyptus Green) with brand box-shadow. Active sidebar nav items use the same gradient with a reduced shadow. Logo icons on all pages use the gradient with a box-shadow glow. All gradients use the same two-stop colour range to maintain visual consistency.
- [CONFIRMED] **KPI card hover:** Cards lift `translateY(-6px)` on hover with a `0 20px 40px rgba(0,0,0,0.10)` shadow, providing clear affordance that they are interactive. Animation uses 200ms ease-out.
- [CONFIRMED] **Staggered KPI animation:** KPI cards have animation delays of 0/40/80/120ms respectively, creating a cascading entrance effect when the Overview tab first loads.

→ **Dissertation chapter target: Chapter 4 (Implementation — technical decisions) and Chapter 5 (Interface design)**

---

## 14. Key Design Decisions

### 14a. Flask over Django / FastAPI
- **Chosen:** Flask (micro-framework)
- **Alternative:** Django (full-stack), FastAPI (async API-first)
- **Why chosen:** Flask's minimal footprint matches the project scope — a research prototype, not a production SaaS. No ORM, admin panel, or async runtime needed. Application factory pattern provides sufficient structure. Fast to iterate.
- **Trade-off:** No built-in ORM (all raw SQL), no admin scaffolding, no async support. Would need significant rework to scale to production traffic.

### 14b. SQLite over PostgreSQL / MySQL
- **Chosen:** SQLite (embedded file database)
- **Alternative:** PostgreSQL, MySQL (client-server relational)
- **Why chosen:** Zero infrastructure — no database server to configure or run. Appropriate for single-user/small-team research prototype. `sqlite3` is in Python standard library.
- **Trade-off:** No concurrent write support (write lock on the file). Single-node only. Not suitable for multi-process deployment (Gunicorn workers would conflict). Maximum practical dataset size ~GB before performance degrades.

### 14c. Service layer over inline route logic
- **Chosen:** Separate `services/` directory with domain-focused modules
- **Alternative:** All logic inline in route handlers
- **Why chosen:** Forecast, decision, evaluation, and classification logic is complex and reused across endpoints (upload triggers the same pipeline as the manual run button). Separation enables independent testing and modification of each analytical component.
- **Trade-off:** More files, more import overhead. Slightly more complex call chain.

### 14d. Session auth over JWT
- **Chosen:** Flask server-side sessions (signed cookies)
- **Alternative:** JSON Web Tokens (JWT) with refresh tokens
- **Why chosen:** Server-side sessions are simpler to implement, easier to invalidate (session clear on logout), and built into Flask. No need for token refresh logic or client-side token management.
- **Trade-off:** Sessions are stateful (stored server-side). Does not scale horizontally without shared session storage. JWT would allow stateless scaling but adds complexity (refresh tokens, expiry handling, token revocation).

### 14e. Synchronous pipeline over async workers
- **Chosen:** Pipeline runs synchronously in the upload request handler
- **Alternative:** Celery/RQ background workers, async execution
- **Why chosen:** Simplicity. No message broker infrastructure. Response includes pipeline results immediately. Appropriate for small datasets typical of an SME.
- **Trade-off:** Upload request blocks until all forecasts, decisions, evaluations, and classifications complete. For large datasets (1000+ products), this could timeout. A simulated progress indicator (`simulatePipelineProgress()`) shows six named pipeline stages during the wait — reducing perceived wait time and preventing premature re-submission — but the stage timeline is approximated via `setTimeout` offsets rather than driven by real server-side events. A future improvement would stream actual stage completion via Server-Sent Events.

### 14f. Rule-based decision logic over ML classification
- **Chosen:** Rule-based thresholds (safety stock, reorder point from EOQ/statistical model)
- **Alternative:** Trained ML classifier (random forest, logistic regression on product features)
- **Why chosen:** Rules are grounded in classical inventory theory (EOQ, safety stock formula). Interpretable — manager can understand and verify the logic. Requires no training data or labelling. No risk of model drift without retraining.
- **Trade-off:** Fixed rules do not adapt to product-specific patterns. A product with highly seasonal demand may be under-buffered by a fixed safety stock formula.

### 14g. Statistical forecasting models over ML / deep learning
- **Chosen:** SMA, WMA, SES, Holt's Linear (classical time-series)
- **Alternative:** ARIMA, Prophet, LSTM, Transformer-based forecasting
- **Why chosen:** Classical models are interpretable (the manager can understand what "weighted moving average" means), computationally cheap (run in milliseconds per product), and perform competitively on short series (30–90 data points). Deep learning models require large datasets and are effectively black boxes.
- **Trade-off:** No automatic seasonality detection, no exogenous variables, no long-range dependency modelling. For retail with strong seasonal patterns (Christmas, school year), these models will underperform at seasonal turning points.

### 14h. Jinja2 + vanilla JS over React / Vue
- **Chosen:** Server-rendered HTML (Jinja2) with vanilla JavaScript for interactivity
- **Alternative:** React/Vue SPA with Flask as pure API backend
- **Why chosen:** Aligns with Flask's natural rendering model. No build pipeline (webpack/vite) required. Role-based access control in the initial render is straightforward (Jinja2 conditionals). Reduces project complexity significantly.
- **Trade-off:** No component reuse, no virtual DOM diffing, no state management library. DOM manipulation is manual. Less maintainable as UI complexity grows.

### 14i. Semantic colour separation over uniform accent colour
- **Chosen:** Two-layer colour system — brand colour (#3D8565 Eucalyptus Green) for UI, semantic colours (red/amber/slate/green) for data meaning
- **Alternative:** Single accent colour applied to all elements
- **Why chosen:** In an inventory decision support tool, colour carries meaning — red means "reorder now", amber means "at risk". Using the same colour for both "this button is clickable" and "this product is critical" creates cognitive ambiguity that could delay managerial response. Strict separation ensures that red always means urgency, not branding.
- **Trade-off:** Requires discipline in all future UI additions to maintain the separation. Slightly more complex CSS variable structure.

### 14j. Plain-English recommendation generation over structured data display
- **Chosen:** Server-side generation of natural-language recommendation strings per REORDER product
- **Alternative:** Display raw forecast numbers (demand, safety stock, EOQ) in a table
- **Why chosen:** SME managers are not inventory analysts. A table of numbers requires interpretation — a recommendation string does the interpretation for them. "Widget A will stockout in 3 days — order 84 units" is immediately actionable without domain knowledge. This aligns with the DSS principle that the system should reduce decision-making cognitive load.
- **Trade-off:** Text generation is deterministic and rule-based — it does not adapt to context beyond the available fields (stock, demand, EOQ, probability, trend). Edge cases (e.g., product with zero forecast demand) require guards to avoid nonsensical output.

### 14k-ii. Full CSRF Protection with Explicit Exemption List over Flask-WTF
- **Chosen:** Custom `@app.before_request` hook validating `X-CSRF-Token` header / `csrf_token` form field against session token; pre-auth endpoints exempted by explicit allowlist.
- **Alternative:** Flask-WTF (adds form-level CSRF field generation and validation automatically).
- **Why chosen:** Flask-WTF couples CSRF validation to form objects — for a JSON API returning fetch()-driven data, form-level coupling is unnatural. The custom hook allows JSON requests with an `X-CSRF-Token` header to be validated without a form object, while the explicit exemption list makes the security surface visible and auditable in one place. The exemption list design (allow-by-exception rather than deny-by-default) forces a conscious decision per exempt endpoint.
- **Trade-off:** More code than Flask-WTF. Exemption list must be maintained manually — a developer adding a new endpoint must actively decide whether to exempt it. Flask-WTF handles this implicitly per form field.

### 14k-iii. SMTP-Optional Email with Graceful Fallback to In-App Link Display
- **Chosen:** `mailer.py` wrapping `smtplib` with env-var configuration; returns `(False, reason)` if `SMTP_HOST` not set; API responses include the raw URL when email cannot be sent.
- **Alternative:** Require SMTP or an email provider (Mailgun, SendGrid) as a hard dependency.
- **Why chosen:** Forcing SMTP configuration at startup would prevent the system from running in local development or dissertation demo environments without a mail server. By surfacing the reset/verification URL in the API JSON response when SMTP is absent, the full flow remains testable without infrastructure. The decision explicitly separates "email delivery" from "token generation" — the security model (token expiry, hash storage) is always enforced, regardless of whether email is available.
- **Trade-off:** A misconfigured production deployment silently fails to send emails and displays the token URL in JSON responses. Without monitoring, this is not visible to the operator. Production hardening should add a startup warning log when `SMTP_HOST` is unset.

### 14k-iv. SHA-256 Token Hashing for Password Reset and Email Verification Tokens
- **Chosen:** Tokens are generated as `secrets.token_urlsafe(32)`, immediately SHA-256 hashed, and only the hash stored in the database. The raw token exists only in the URL sent to the user.
- **Alternative:** Store raw tokens in the database (common in simpler implementations).
- **Why chosen:** If the `password_reset_tokens` or `email_verification_tokens` tables were compromised, an attacker would obtain only SHA-256 digests — infeasible to reverse without the original token. Raw tokens are 256-bit cryptographically random values (`secrets.token_urlsafe(32)` produces 32 bytes = 256 bits of entropy), making brute force infeasible. This is the same pattern used by GitHub, Django, and other production systems for password reset.
- **Trade-off:** Adds a `hashlib.sha256()` call on both token issuance and redemption. No functional impact at the scale of this system.

→ **Dissertation chapter target: Chapter 3 (Methodology — design decisions) and Chapter 7 (Discussion)**

### 14k. Unified data table for upload and manual entry paths
- **Chosen:** Manual entries are written to the same `products` and `sales` tables as uploaded data. A `data_source` column (`'upload'` | `'manual'`) tracks provenance without forking the schema.
- **Alternative:** A separate `manual_sales` table with a join layer at the service boundary.
- **Why chosen:** A single data table means the forecasting, decision, evaluation, and scenario services require zero modification — they query the `sales` table regardless of origin. This satisfies the DSR principle of building a single unified artefact rather than two parallel systems. Schema forking would require duplicating all service logic or adding conditional query branches, increasing maintenance surface and introducing inconsistency risk.
- **Trade-off:** `data_source = 'manual'` auto-filled zeros (gap-filling rows) are indistinguishable from genuinely zero-sales days in aggregate analytics. The `data_source` column and the `units_sold = 0` value together allow filtering, but the analytics dashboard does not currently surface this distinction. A future improvement would shade auto-filled rows differently in the Sales Trend chart.

→ **Dissertation chapter target: Chapter 4 (Implementation — data model) and Chapter 6 (Evaluation — design validity)**

---

## 14l. Front-End Design System — Full Specification

This section documents every measurable front-end design decision so the interface chapter can be written with precise, verifiable claims rather than vague description.

### Colour Palette

**Brand layer (UI interactions only):**
| Token | Hex | Used for |
|---|---|---|
| `--accent` | `#3D8565` (Eucalyptus Green) | Buttons, active nav, focus rings, progress dots |
| `--accent-hover` | `#2D6A4F` | Button hover state, link hover |
| `--accent-dark` | `#1B4332` | Logo icons and deepest brand moments |
| `--accent-light` | `rgba(61,133,101,0.10)` | Hover/selected backgrounds and row affordances |
| `--sidebar-bg` | `#DDF0E6` | Sidebar and important eucalyptus sections |
| `--topbar-bg` | `#EEF8F2` | Topbar and light UI surfaces |

**Semantic data layer (meaning only, never UI chrome):**
| Token | Hex | Meaning |
|---|---|---|
| `--semantic-critical` / `--danger` | `#DC2626` | REORDER decision, HIGH risk, stockout imminent |
| `--semantic-warning` / `--warning` | `#F59E0B` | AT_RISK decision, MEDIUM risk |
| `--semantic-safe` | `#475569` (Slate) | HOLD decisions and neutral/safe states |
| `--semantic-positive` / `--success` | `#16A34A` | Active/healthy products, positive trends, upload success |

Each semantic colour has a paired `-bg` variant (e.g., `--semantic-critical-bg: #FEF2F2`) used for badge and alert backgrounds, ensuring foreground text maintains WCAG contrast.

**Neutral surface layer:**
| Token | Light mode | Dark mode | Used for |
|---|---|---|---|
| `--background` | `#F0F4F0` | `#0B1220` | Page background |
| `--surface` | `#FFFFFF` | `#111827` | Cards and primary surfaces |
| `--surface-2` | `#EEF8F2` | `#1F2937` | Table headers, input backgrounds, user pill |
| `--border` | `#E2E8F0` | `#374151` | All dividers and card borders |
| `--text` | `#0F172A` | `#F8FAFC` | Body text |
| `--text-muted` | `#64748B` | `#E2E8F0` | Labels, timestamps, secondary copy |

**Auth page background:** `#F0F4F0` in light mode with white cards and eucalyptus logo marks — consistent with the dashboard and homepage palette.

**Dashboard background:** `var(--background)` (`#F0F4F0`) with white cards, `#EEF8F2` table headers/topbar, and `#DDF0E6` sidebar. This creates clear layer separation without introducing blue or purple UI chrome.

---

### Typography

- **Font family:** Inter (Google Fonts, weights 400/500/600/700). Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Base size:** `14px` on `<html>` (set via `font-size: 14px`). All subsequent sizes relative to this.
- **Font smoothing:** `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` — removes subpixel rendering artefacts on macOS/retina displays.

**Type scale used in the system:**
| Context | Size | Weight | Element/class |
|---|---|---|---|
| Nav section labels | 11px | 600 | `.nav-section-label` |
| Badges | 11px | 600 | `.badge` |
| KPI labels, timestamps | 12px | 500 | `.kpi-label`, `.activity-time` |
| Table headers | 11px | 600, uppercase | `.data-table thead th` |
| Body / table cells | 13px | 400 | `.data-table tbody td` |
| Buttons, nav links | 14px | 500 | `.btn`, `.nav-link` |
| Card titles | 14px | 600 | `.card-title` |
| Page title | 20px | 700 | `.page-title` |
| KPI values | 22px | 700 | `.kpi-value` |
| Auth headings | 20px | 700 | `.auth-logo-title` |

---

### Layout

**Shell structure:** `display: flex; height: 100vh; overflow: hidden` — prevents double scrollbars. Sidebar is fixed width; main content takes the remaining space.

| Element | Measurement | Token / value |
|---|---|---|
| Sidebar width | 240px | `--sidebar-w: 240px` |
| Topbar height | 56px | `--topbar-h: 56px` |
| Tab panel padding | `20px 24px 32px` | `.tab-panel` |
| Tab panel padding (mobile) | `16px 14px 28px` | `@media max-width:768px` |
| Page header padding | `20px 24px 0` | `.page-header` |
| KPI grid gap | 16px | `.kpi-grid { gap: 16px }` |
| Card gap (2-col row) | 16px | `.row-2col { gap: 16px }` |
| Card internal padding | 20px | `.card { padding: 20px }` |
| KPI card internal padding | 16px | `.kpi-card { padding: 16px }` |
| Charts grid gap | 16px | `.charts-grid { gap: 16px }` |
| Bottom nav height (mobile) | 56px | `.bottom-nav { height: 56px }` |

**Spacing pattern:** The system uses a 4px base unit with multiples of 4: 4, 8, 12, 16, 20, 24, 28, 32px. The dominant rhythm is **12–16–24px** (gaps, padding increments, section spacing). This is consistent with an 8px grid system adapted for a dense data application.

---

### Border Radius Tokens

| Token | Value | Applied to |
|---|---|---|
| `--r-card` | 16px | All `.card`, `.kpi-card`, `.table-wrap`, `.modal-card`, `.auth-card` |
| `--r-btn` | 10px | All `.btn`, `.search-input`, `.form-input`, `.scenario-select` |
| `--r-badge` | 999px | All `.badge` — fully rounded pill shape |
| `--r-input` | 10px | Form inputs |
| Logo icon | 10px (sidebar) / 14px (auth) | Inline style |
| Urgent panel icon | 10px | `.urgent-panel-icon` |
| Nav item active | 8px | `.nav-link` (via `border-radius: 8px`) |
| KPI icon container | 10px | `.kpi-icon { border-radius: 10px }` |
| Auth card | 24px | Overrides `--r-card` for larger visual softness on login |

---

### Shadow System

| Token | Value | Used when |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)` | Resting state: cards, table-wrap, kpi-cards |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.10)` | Hover state: cards, kpi-cards, buttons |
| `--shadow-lg` | `0 10px 30px rgba(0,0,0,.14)` | Elevated: modals, open mobile sidebar, mobile drawer |
| `--shadow-brand` | `0 4px 14px rgba(61,133,101,0.30)` | Brand elements: primary buttons, logo icons, active nav |
| Auth card | `0 25px 50px -12px rgba(0,0,0,0.18)` | Login card — maximum depth to separate from background |
| Sidebar | `4px 0 20px rgba(0,0,0,0.06)` | Lateral shadow separating sidebar from content area |

Dark mode shadow values are amplified (opacity ×3–4) because dark backgrounds absorb shadow less visibly than light ones.

---

### Animation System

**Easing function:** `cubic-bezier(0.22, 1, 0.36, 1)` — defined as `--ease-out`. This is a fast-start, slow-finish curve that feels snappy rather than mechanical. Used on all transitions and entrance animations.

**Duration scale:**
| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 180ms | Hover transitions (background, colour), badge changes |
| `--dur-base` | 220ms | Tab panel fade, modal scale, sidebar open/close |
| `--dur-slow` | 260ms | Auth card entrance (scaleIn) |
| Count-up | 1200ms | `animateCount()` — KPI number roll-up from 0 to target |
| Orb pulse | 8s infinite | Auth page background orb — slow and subtle, not distracting |

**Keyframe catalogue:**
| Name | Motion | Applied to |
|---|---|---|
| `fadeIn` | `opacity: 0 → 1` | All tab panels on activation; analytics/scenario panels use linear timing to avoid Chart.js ResizeObserver conflicts |
| `slideUp` | `opacity:0, translateY(8px) → visible` | Upload result messages, activity feed items |
| `slideDown` | `opacity:0, translateY(-6px) → visible` | Upload file list items appearing |
| `scaleIn` | `opacity:0, scale(0.96) → visible` | Auth card, modal inner content |
| `countUp` | `opacity:0, translateY(4px) → visible` | KPI value elements — CSS entrance; JS handles the number increment |
| `pulse-orb` | `scale(1) opacity(0.04) → scale(1.15) opacity(0.07)` | Auth background orb |

*Note: The `pulse-glow` keyframe (previously applied to REORDER rows) was removed in V2. REORDER rows are now differentiated by a static 3px red left border and background tint — see Sections 5d and 9.*

**Stagger delays (KPI cards):** nth-child 1–4 receive delays of 0ms / 40ms / 80ms / 120ms. This creates a cascading left-to-right entrance without the cards all appearing simultaneously.

**Transition base rule:** `*, *::before, *::after` has `transition-timing-function: var(--ease-out)` set globally. Individual transition properties are still explicitly listed on each component class (not `transition: all`) to avoid unintended property transitions.

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` sets all animation durations to `0.01ms !important`. This is a hard override — users who have set "reduce motion" in their OS accessibility settings see no animations at all.

**Chart.js animation exception:** Panels containing Chart.js canvases (`#tab-analytics`, `#tab-scenario`) use only `fadeIn` (opacity only), not `slideUp` or `scaleIn`. This is because transform-based animations that change the element's layout boundary trigger Chart.js's `ResizeObserver`, causing charts to briefly mis-size. Opacity-only animation avoids this.

---

### Responsive Breakpoints

| Breakpoint | What changes |
|---|---|
| `≤ 1024px` | KPI grid → 2 columns; Charts grid → 1 column; 2-col card rows → 1 column; chart-wide loses full-width span |
| `≤ 900px` | `.mobile-hide` class hides selected table columns (e.g., Seasonal, Last Updated, Reorder Qty) to prevent horizontal scroll |
| `≤ 768px` | Sidebar becomes a fixed overlay (slides in via `.sidebar.open` class); `menu-toggle` button appears in topbar; bottom nav bar appears; tab panel padding reduced; KPI grid stays 2-col but gaps tighten (10px); search input expands to 100% width |
| `≤ 480px` | KPI grid → 1 column (each KPI full width) |

The sidebar breakpoint (768px) matches the standard tablet-portrait boundary. The bottom nav shows exactly 4 tabs (Overview, Inventory, Decisions, Analytics) — selected to cover the highest-frequency actions for both roles without a "more" button on most screens.

---

### Component Specifications

**Badges (decision/risk classification):**
| Class | Background | Text colour | Applied to |
|---|---|---|---|
| `.badge-reorder` | `#FEF2F2` (danger-bg) | `#DC2626` | REORDER decisions |
| `.badge-at_risk` | `#FFFBEB` (warning-bg) | `#F59E0B` | AT_RISK decisions |
| `.badge-hold` | `#F1F5F9` | `#475569` | HOLD decisions |
| `.badge-inactive` | `#F1F5F9` (surface-2) | `#64748B` | INACTIVE products |
| `.badge-high` | `#FEF2F2` | `#DC2626` | HIGH risk flag |
| `.badge-medium` | `#FFFBEB` | `#F59E0B` | MEDIUM risk flag |
| `.badge-low` | `#ECFDF5` | `#16A34A` | LOW risk flag |

All badges: `padding: 2px 8px`, `border-radius: 999px`, `font-size: 11px`, `font-weight: 600`. The pill shape (999px radius) is a deliberate choice — it visually distinguishes status indicators from action buttons (which use 10px radius).

**Data tables:**
- Header: `background: var(--surface-2)`, `font-size: 11px`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.05em`
- Row hover: `background: var(--surface-2)` — 180ms ease-out transition
- REORDER rows: 3px red left border (`box-shadow: inset 3px 0 0 #DC2626` on first `<td>`) and `rgba(220,38,38,0.032)` background tint applied via `.row-reorder` class added dynamically by `markReorderRows()`. The previous `pulse-glow` animation was removed — see Section 5d and Feature 24 in Section 22.
- Horizontal scroll container: `.table-wrap` with `overflow-x: auto` prevents layout break on small screens
- Stock level bar: 6px height, `border-radius: 99px`, filled green/amber/red based on risk flag

**KPI icon containers:**
- Size: 40×40px, `border-radius: 10px`
- Background: semantic colour at 12% opacity (`rgba(16,163,74,0.12)` for green, `rgba(220,38,38,0.12)` for red, `rgba(61,133,101,0.12)` for brand-neutral financial values)
- Icon stroke: corresponding semantic colour (not brand colour)

**Navigation links (sidebar):**
- Resting: `color: var(--text-muted)`, `border-radius: 8px`, no background
- Hover: `background: var(--surface-2)`, `transform: translateX(2px)`, `color: var(--text)`
- Active: `background: #3D8565`, `color: #fff`, `box-shadow: 0 4px 14px rgba(61,133,101,0.35)`, no translateX

The active state uses a solid eucalyptus brand colour rather than a gradient. The decision rationale: StockLens is a decision-support product, so interaction colours must feel stable and operational rather than decorative. The green shadow anchors the selected item visually without introducing extra hues.

**Primary button:**
- Background: `#3D8565`
- Box-shadow (resting): `0 4px 14px rgba(61,133,101,0.30)`
- Hover: `#2D6A4F`, subtle `translateY(-1px)`, shadow deepens to `0 8px 20px rgba(61,133,101,0.40)`
- Active: `transform: translateY(0)` — tactile press feedback
- Disabled: `opacity: 0.5`, `cursor: not-allowed`

**Authentication card (login/register/onboarding):**
- `background: rgba(255,255,255,0.92)` with `backdrop-filter: blur(20px)`
- `border-radius: 24px` (larger than the standard 16px card to give the auth surface a distinct "premium" feel)
- `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.18)` — deep shadow to lift the card above the gradient background
- Entrance animation: `scaleIn` (260ms) — card scales from 96% to 100% with fade

→ **Dissertation chapter target: Chapter 5 (Interface design — design system specification) and Chapter 3 (Methodology — UI design rationale)**

---

## 15. System Robustness and Edge Case Handling

- [CONFIRMED] **Empty workspace (new company):** All data queries return empty arrays when no products/sales exist. Frontend renders empty tables, not errors. KPI cards show zero values. No cross-company data leakage confirmed by company_id isolation.
- [CONFIRMED] **Insufficient data (< 30 days):** Forecast service writes placeholder (`model_used='N/A'`). Decision service writes HOLD + human-readable reason ("need ≥ 30 days of sales data"). Product appears in decisions table with informative state rather than being absent.
- [CONFIRMED] **Insufficient data for evaluation (< 90 days):** `run_evaluation_for_product()` returns early without writing. Product has no evaluation row. UI shows empty or dash for that product in the evaluation table.
- [CONFIRMED] **Bad upload format:** `_parse_stream()` returns error message listing found columns and rename tip. `file_summaries[].errors[]` contains per-file error messages. Response still returns 200 with `success=false` context.
- [CONFIRMED] **Multiple files in one upload:** Each file parsed independently. Errors in one file do not abort others. Aggregate stats summed across all files.
- [CONFIRMED] **Interaction log format:** Auto-detected if interaction_type column present without units column. If no purchase events found, specific error returned listing the column name and expected keyword examples.
- [CONFIRMED] **Duplicate uploads:** Pre-loaded `(product_id, date)` pair set prevents re-insertion. Response reports `skipped_duplicates` count. Forecast is NOT rerun if 0 rows were inserted.
- [CONFIRMED] **Product status toggle:** Deactivating/reactivating a product immediately refreshes its derived analytical state. This prevents stale REORDER/AT_RISK/HOLD badges after `is_active` changes.
- [CONFIRMED] **Soft delete (staff removal):** Sets `is_active=0`. Record preserved for audit. User can no longer log in (login query includes `WHERE is_active = 1`).
- [CONFIRMED] **Last manager protection:** `staff/role` endpoint checks active manager count before demotion. Returns error if only one manager remains.
- [CONFIRMED] **Pipeline determinism:** Same input data produces same forecast output. Model selection is deterministic (same MAE comparison order). Random elements: none confirmed in active codebase.
- [INFERRED] **Graceful degradation:** If any service function raises an uncaught exception, the upload handler's `except Exception as e` catch logs the error and continues to the next file. Per-product pipeline errors are not explicitly caught — a failure in one product's forecast does not roll back others.
- [CONFIRMED] **Multi-tenant isolation:** Verified across all API endpoints — all queries parameterise on session-extracted company_id. No wildcard queries without company_id filter found in active routes.
- [CONFIRMED] **Rate limiting across all auth surfaces:** DB-backed `rate_limits` table enforces rolling 5-minute windows per IP across six operation scopes: `login` (10 attempts), `register` (5), `forgot` (5), `reset` (5), `verify-resend` (5). Unlike the earlier in-memory `defaultdict` approach, the DB-backed store persists across process restarts. Returns HTTP 429 on breach. The stricter limits on account creation and password operations reflect their higher abuse potential.
- [CONFIRMED] **Upload size cap:** Flask `MAX_CONTENT_LENGTH = 16 MB` rejects oversized uploads before route logic runs. Custom JSON 413 handler prevents the default HTML error page leaking Flask internals to the client. Prevents memory exhaustion from maliciously large file uploads.
- [CONFIRMED] **Password reset token single-use enforcement:** `password_reset_tokens.used_at` is set to `DATETIME('now')` on successful redemption. All redemption queries include `WHERE used_at IS NULL` — a consumed token cannot be reused even if the URL is captured from browser history or server logs.
- [CONFIRMED] **Token expiry:** Password reset tokens expire in 1 hour; email verification tokens expire in 72 hours. Both use `WHERE expires_at > DATETIME('now')` in the redemption query, making clock drift (if any) the only bypass vector at this scale.
- [CONFIRMED] **Username deduplication on registration:** If the requested username is already taken, the system automatically appends a numeric suffix (`username 2`, `username 3`, etc.) via a `WHILE` loop checking DB existence, rather than rejecting the registration. This prevents usernames from becoming a blocking constraint on account creation in multi-company environments where the same person name may appear across companies.
- [CONFIRMED] **Production startup guard:** If `IS_PRODUCTION=true` is set and `SESSION_COOKIE_SECURE` is not enabled, `create_app()` raises `RuntimeError` before the app starts. This prevents accidental deployment of the app without HTTPS in a production context.
- [CONFIRMED] **Account enumeration prevention:** `POST /api/password/forgot` returns the same response message regardless of whether the email address matches an account. The reset URL is only included in the JSON response body when email delivery fails (i.e., in development with no SMTP), never when email is successfully sent. This prevents attackers from probing which email addresses are registered.

→ **Dissertation chapter target: Chapter 4 (Implementation — robustness) and Chapter 6 (Evaluation — testing)**

---

## 16. Known Limitations

- [CONFIRMED] **No seasonality modelling:** All four forecasting models assume demand stationarity. Products with Christmas, Ramadan, or back-to-school sales spikes will be under-forecast during peaks and over-forecast in troughs. No STL decomposition, no Fourier terms.
- [CONFIRMED] **Fixed model hyperparameters:** SES alpha=0.3, Holt alpha=0.3/beta=0.1 are hardcoded. No grid search or per-product optimisation. Products with different smoothing requirements receive the same model specification.
- [CONFIRMED] **Fixed lead time (7 days):** Safety stock and reorder point calculations assume constant 7-day delivery. Real suppliers vary. No mechanism to record actual delivery dates or update the lead time assumption per product or supplier.
- [CONFIRMED] **Synchronous pipeline blocking:** Large datasets cause long upload response times. The HTTP connection is held open until the full pipeline completes. A simulated frontend progress indicator (`simulatePipelineProgress()`) shows six named pipeline stages during the wait, reducing perceived wait time and preventing premature re-submission — but the timeline is approximated via `setTimeout` offsets, not driven by real server-side events. If the pipeline takes significantly longer than ~3 seconds (very large datasets or slow hardware), the bar appears stuck at 98% before the response arrives. A future improvement would stream real stage completion via Server-Sent Events.
- [CONFIRMED] **SQLite concurrency limit:** Single write lock. Not suitable for concurrent users both triggering pipeline runs simultaneously. In practice, the upload endpoint is manager-only and pipeline runs are infrequent.
- [CONFIRMED] **CSRF protection is implemented but SMTP may not be configured:** Full CSRF token validation (`X-CSRF-Token` header) is enforced on all authenticated state-changing API requests (see Section 3 and Section 5i). The remaining gap is operational: in local/dev deployments where `SMTP_HOST` is not set, email verification links are returned in the API JSON response rather than sent by email. Users can log in without verifying their email address (`email_verified` is tracked but not enforced as a login gate in the current implementation). For a public-internet deployment, enforcing email verification before dashboard access would prevent accounts with mistyped addresses from silently losing reset capability.
- [CONFIRMED] **Invite codes use short alphanumeric codes:** 6-character invite codes are not cryptographically strong (they can be brute-forced in ~308 million attempts at the base-36 character set). Mitigated by: 14-day expiry, use_count / max_uses enforcement (codes are invalidated after reaching their use limit), and the fact that knowing a code alone is insufficient — the user must complete registration with a valid email and password before the code is consumed.
- [CONFIRMED] **SECRET_KEY default:** Hardcoded to `'dev-only-change-me'` if environment variable not set. Production deployment without setting this variable would make all session cookies forgeable.
- [CONFIRMED] **No longitudinal outcome tracking:** The evaluation module measures forecast accuracy on historical data. The reorder log (V2) records manager-initiated reorder actions and delivery confirmations, but does not automatically verify whether acted-upon decisions actually prevented stockouts — that would require POS integration.
- [CONFIRMED] **No accessibility audit:** UI has not been tested against WCAG 2.1 guidelines. `prefers-reduced-motion` is respected for animations, but screen reader compatibility, keyboard navigation completeness, and colour contrast ratios have not been formally audited.
- [CONFIRMED] **Price NULL defaults:** Products without prices default to £1.00 for EOQ and £0 revenue for ABC classification. This silently misclassifies such products — they appear as C-class regardless of volume.
- [INFERRED] **No external data integration:** Demand forecasts are based solely on historical sales. No integration with weather APIs, local event calendars, supplier lead time feeds, or competitor pricing — all known to influence retail demand.
- [INFERRED] **Data format dependency:** System assumes input data represents actual sales (units sold per day). It cannot distinguish between a day with zero sales (no transaction) and a day with no data uploaded (gap in records). Sparse uploads will produce lower demand estimates.

→ **Dissertation chapter target: Chapter 7 (Discussion and critical analysis)**

---

## 17. Implementation Decisions That Need Academic Justification

> ⚠️ **CITATION VERIFICATION REQUIRED FOR THIS ENTIRE SECTION.** The "Cite:" entries below name real papers, but several require exact journal volume/issue/page/DOI confirmation before use in dissertation prose. Each entry notes its verification status. Do not write dissertation sentences from any entry marked VERIFY.

---

### MAE for model selection (not RMSE or MAPE)
- **What the system does:** Compares SMA, WMA, SES, Holt by mean absolute error on a 30-day validation window. Selects lowest MAE.
- **Academic justification needed:** MAE is preferred over RMSE for inventory forecasting because it does not disproportionately penalise large errors, making it more robust to demand spikes. MAPE is undefined when actual demand is zero, which is common in sparse retail data.
- **Citation (VERIFIED):** Hyndman, R. & Koehler, A. (2006). "Another look at measures of forecast accuracy." *International Journal of Forecasting*, 22(4), 679–688. DOI: 10.1016/j.ijforecast.2006.03.001
- **Citation (VERIFIED):** Hyndman, R. & Athanasopoulos, G. (2021). *Forecasting: Principles and Practice* (3rd ed.). OTexts. Available: otexts.com/fpp3

---

### Simple statistical models over ML
- **What the system does:** Uses SMA, WMA, SES, Holt. No ARIMA, no neural networks.
- **Academic justification needed:** M-competitions demonstrate that simple models frequently outperform complex ones on short time series. SME sales data typically provides 30–90 observations per product — insufficient for ML generalisation.
- **Citation (VERIFIED):** Makridakis, S., Spiliotis, E. & Assimakopoulos, V. (2020). "The M4 Competition: 100,000 time series and 61 forecasting methods." *International Journal of Forecasting*, 36(1), 54–74. DOI: 10.1016/j.ijforecast.2019.04.014

---

### Rule-based decisions over learned classification
- **What the system does:** Applies fixed thresholds (safety stock, reorder point) rather than a trained classifier.
- **Academic justification needed:** DSS preserves human agency. Rule-based logic is interpretable and does not require labelled training data. Explainability is critical for adoption.
- **Citation (VERIFY — book, no DOI):** Power, D. (2002). *Decision Support Systems: Concepts and Resources for Managers*. Westport, CT: Quorum Books. ISBN: 1-56720-497-0. Verify this exact ISBN and publisher against a library catalogue before citing.
- **Citation (VERIFY journal name):** Sivarajah, U. et al. (2017). "Critical analysis of Big Data challenges and analytical methods." *Journal of Business Research*, 70, 263–286. DOI: 10.1016/j.jbusres.2016.08.001 — Note: this is a Big Data adoption paper, not specifically about DSS explainability. Confirm relevance to your argument before using.

---

### Human-in-the-loop override capability
- **What the system does:** System recommends; manager decides. No automated purchasing.
- **Academic justification needed:** Technology Acceptance Model — perceived usefulness and ease of use drive adoption. Controllable systems are adopted faster.
- **Citation (VERIFIED):** Davis, F. (1989). "Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology." *MIS Quarterly*, 13(3), 319–340. DOI: 10.2307/249008

---

### Role-based access control (RBAC)
- **What the system does:** Two roles: manager (full) and staff (read-only). Enforced in backend decorators and frontend rendering.
- **Academic justification needed:** Cognitive load theory — presenting irrelevant functionality increases cognitive load and reduces decision quality.
- **Citation (VERIFIED):** Sweller, J. (1988). "Cognitive load during problem solving: Effects on learning." *Cognitive Science*, 12(2), 257–285. DOI: 10.1207/s15516709cog1202_4

---

### Interpretable outputs with reason strings
- **What the system does:** Every decision record includes a natural-language explanation of the threshold logic, values, and recommendation.
- **Academic justification needed:** Explainability increases user trust in algorithmic recommendations.
- **Citation (VERIFIED):** Ribeiro, M., Singh, S. & Guestrin, C. (2016). "'Why Should I Trust You?': Explaining the predictions of any classifier." *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 1135–1144. DOI: 10.1145/2939672.2939778

---

### Lightweight deployment (SQLite, Flask dev server)
- **What the system does:** Runs on a single machine, no cloud infrastructure required. Accessible via local network.
- **Academic justification needed:** SME technology adoption research shows cost and infrastructure complexity as primary barriers.
- **Citation (VERIFY — multiple Ramdani papers exist from this group):** Ramdani, B., Kawalek, P. & Lorenzo, O. (2009). "Predicting SMEs' adoption of enterprise systems." *Journal of Enterprise Information Management*, 22(1/2), 10–24. DOI: 10.1108/17410390910922796 — Verify this DOI opens the correct paper before citing. A second Ramdani & Kawalek (2008) paper exists in the same journal on the same topic; confirm year and volume number match.

→ **Dissertation chapter target: Chapter 3 (Methodology — justification) and Chapter 7 (Discussion — design rationale)**

---

## 18. Future Improvements

- [CONFIRMED] **Manual Data Entry mode (implemented):** Managers who lack structured sales history can now create products and record daily sales directly in the browser without preparing a CSV file. Five dedicated API endpoints (`POST /api/manual/product`, `POST /api/manual/sales`, `GET /api/manual/sales/<id>`, `GET /api/manual/products`, `POST /api/manual/pipeline/<id>`) handle creation, entry, retrieval, and pipeline triggering. Automatic gap-filling inserts zero-sales rows for missing days to maintain a contiguous time-series. The same forecast → decision → evaluation pipeline runs once 30 days of data are recorded. A front-end progress indicator displays each day's progress towards the 30-day threshold, with the pipeline button unlocking automatically. All data lands in the existing `products` and `sales` tables with `data_source = 'manual'` for traceability; the analytical services are unchanged. Addresses the primary barrier identified in user interviews: SME managers do not have exportable datasets.
- [INFERRED] **Demand anomaly detection:** Z-score or IQR-based alert when a product's current week sales deviate significantly from its 90-day baseline. Flags unexpected demand spikes before stockout occurs. Implementable in ~50 lines of Python added to `get_overview()`.
- [CONFIRMED] **Reorder action loop (implemented):** Managers can now log a reorder directly from the Decisions tab ("Order Placed" button per REORDER product) via `POST /api/reorder/log`. A pending-order state prevents duplicate order logs for the same product before delivery. While pending, managers can correct reorder quantity, expected delivery days, and notes via `POST /api/reorder/update`. Stock is automatically updated on delivery confirmation (`POST /api/reorder/confirm`), which also re-runs the forecast pipeline for the affected product — closing the full recommend → act → update pending order → deliver → reassess decision loop.
- [INFERRED] **Automated purchase order draft:** Generate a formatted PDF or email body listing product, quantity (EOQ), and suggested delivery date. Flask-generated PDF via ReportLab or WeasyPrint.
- [INFERRED] **Cash flow impact modelling:** Calculate total cash outlay if all REORDER items are actioned simultaneously. Prioritise items by `stockout_probability × revenue_at_risk` to enable partial ordering under cash constraint.
- [INFERRED] **Supplier lead time learning:** Allow managers to log actual delivery dates against expected orders. System recalculates safety stock and reorder point using observed lead time distribution rather than the fixed 7-day constant.
- [INFERRED] **Seasonal pattern detection:** Year-on-year demand comparison per product. Surface products expected to spike in the next 30 days based on prior-year data. Proactive buffer build recommendation before peak season.
- [CONFIRMED] **Hyperparameter optimisation:** Grid search over alpha/beta for SES/Holt per product rather than fixed values. Computationally feasible for dataset sizes typical of SME (< 1000 products). Would improve forecast accuracy measurably.
- [INFERRED] **Weekly automated digest:** Cron-triggered email to manager summarising: top REORDER alerts, forecast accuracy trend, upload reminder if no new data in 7 days. Removes the requirement for managers to remember to log in.
- [INFERRED] **PostgreSQL migration path:** Replace SQLite with PostgreSQL to support multiple concurrent users and multi-node deployment. The application-layer company_id isolation and parameterised queries would transfer with minimal changes.
- [CONFIRMED] **Login rate limiting (implemented):** `POST /api/login` now enforces a 10-attempt-per-5-minute rolling window per IP address using an in-memory `defaultdict` store in `auth.py`. Returns HTTP 429 with a human-readable message on breach. Prevents brute-force and credential stuffing without external dependencies.
- [CONFIRMED] **Full CSRF token validation (implemented):** A custom `@app.before_request csrf_protect()` hook validates `X-CSRF-Token` on all authenticated state-changing API requests. Flask-WTF was not needed — the JSON API approach requires header-based validation rather than form-field coupling. Pre-auth endpoints are exempted via an explicit allowlist. See Section 5i and Section 14k-ii.
- [CONFIRMED] **Password reset and email verification (implemented):** Full token-based password reset flow (`/forgot-password` → `POST /api/password/forgot` → `/reset-password/<token>` → `POST /api/password/reset`) and email verification flow on registration (`POST /api/email/verify`, `POST /api/email/resend`). Tokens stored as SHA-256 hashes with 1-hour (reset) and 72-hour (verification) expiry. Email delivery via configurable SMTP (`mailer.py`); graceful fallback to in-app URL when SMTP not configured. See Section 5i and design decisions 14k-iii, 14k-iv.
- [INFERRED] **Accessibility audit:** WCAG 2.1 AA compliance review. Add ARIA labels to dynamic content, ensure keyboard navigation completeness, verify colour contrast ratios for badge variants and text-on-surface combinations.
- [INFERRED] **Dead stock clearance intelligence:** For products with CV < 0.1 and > 180 days of cover, calculate holding cost and suggest a clearance discount percentage to liquidate within a target window.
- [INFERRED] **Mobile app / PWA:** Progressive Web App manifest to allow install on mobile devices. The responsive design already supports mobile browsers; adding a service worker and manifest would enable offline dashboard viewing and push notifications for urgent alerts.

→ **Dissertation chapter target: Chapter 7 (Discussion — future work) and Chapter 8 (Conclusion)**

---

## 19. Conceptual Framework — Stage-by-Stage Academic Grounding

**Framework:** Data → Forecast → Inventory Logic → Explanation → Human Decision → Outcome → Feedback

---

### Stage 1: Data Ingestion

- **Grounding theory:** Design Science Research — Hevner, March, Park & Ram (2004). The artefact must be built on rigorously identified knowledge inputs drawn from the real-world environment (relevance cycle).
- **StockLens context:**
  - Historical sales data (`units_sold` per product per day) is the sole input signal.
  - Preprocessing pipeline (deduplication, date normalisation, negative removal, column alias resolution) transforms raw retail data into a clean time series — this is the "environment" input described in Hevner's relevance cycle.
  - The 30-day minimum threshold operationalises the requirement that the artefact only acts on adequate knowledge; below this, a placeholder record with informative reason replaces missing output.
- **Citation:** Hevner, A., March, S., Park, J. & Ram, S. (2004). "Design science in information systems research." *MIS Quarterly*, 28(1), 75–105.

---

### Stage 2: Forecasting

- **Grounding theory:** Classical forecasting methods and competitive model selection — Makridakis, Wheelwright & Hyndman (2008); M-competition evidence (Makridakis, Spiliotis & Assimakopoulos, 2020) that simple models outperform complex ones on short retail series.
- **StockLens context:**
  - Four models (SMA, WMA, SES, Holt's Linear Trend) evaluated per product on a 30-day validation window; lowest MAE selects the deployed model.
  - Holt's method explicitly captures the trend component (stored as `trend_slope` and `trend_direction`).
  - 95% confidence interval bounds (`lower_bound`, `upper_bound`) quantify forecast uncertainty for the manager.
  - Series of 30–90 observations are insufficient for ARIMA or LSTM; M-competition evidence justifies the classical approach.
- **Citation:** Makridakis, S., Wheelwright, S. & Hyndman, R. (2008). *Forecasting: Methods and Applications* (3rd ed.). Wiley.
- **Citation:** Makridakis, S., Spiliotis, E. & Assimakopoulos, V. (2020). "The M4 Competition: 100,000 time series and 61 forecasting methods." *International Journal of Forecasting*, 36(1), 54–74.

---

### Stage 3: Inventory Logic

- **Grounding theory:** Classical inventory control — EOQ (restated in Silver, Pyke & Thomas, 2016); safety stock service-level approach (Teerasoponpong & Sopadang, 2022).
- **StockLens context:**
  - EOQ formula (√(2DS/H)) translates forecast mean demand into an order quantity that minimises total inventory cost.
  - Safety stock = Z × σ × √L (Z=1.645, L=7 days) sets the buffer at a 95% service level.
  - Reorder point = (mean_demand × L) + safety_stock — the proactive trigger threshold.
  - Decision hierarchy (REORDER / AT_RISK / HOLD / INACTIVE) maps current stock position relative to these thresholds into four discrete action classes; evaluation order is deterministic (inactive → insufficient data → below safety stock → below ROP → hold).
- **Citation:** Silver, E., Pyke, D. & Thomas, D. (2016). *Inventory and Production Management in Supply Chains* (4th ed.). CRC Press.
- **Citation:** ⚠️ VERIFY BEFORE USE — Two candidate papers exist by this author pair. Do not cite until confirmed via Google Scholar DOI lookup:
  - Candidate A: Teerasoponpong, S. & Sopadang, A. (2022). *Computers & Industrial Engineering*, 164, 107896 — DOI: 10.1016/j.cie.2021.107896
  - Candidate B: Teerasoponpong, S. & Sopadang, A. (year). *Journal of Industrial Information Integration*, 26, 100274 — DOI: 10.1016/j.jii.2021.100274
  - Both journals are real Elsevier journals. Open each DOI, confirm title matches "Decision support system for inventory management in small and medium-sized enterprises," then cite the correct one. Delete the other candidate line from this document before submitting.

---

### Stage 4: Explanation

- **Grounding theory:** DSS transparency and legitimacy — Arnott & Pervan (2014). DSS credibility depends on exposing reasoning, not only output. Explainable AI — Ribeiro, Singh & Guestrin (2016): explanations increase user trust in and willingness to act on algorithmic recommendations.
- **StockLens context:**
  - Every decision record contains a programmatically constructed natural-language reason string embedding the exact threshold values, current stock level, EOQ recommendation, and stockout probability.
  - Reason strings are not templated — values from the forecast record are computed and embedded at decision time, making each explanation product-specific.
  - This operationalises Arnott & Pervan's "transparency" DSS quality criterion: the system exposes *why* a recommendation is made, enabling managerial error-checking and override.
- **Citation:** Arnott, D. & Pervan, G. (2014). "A critical analysis of decision support systems research revisited." *Journal of Information Technology*, 29(4), 269–293.
- **Citation:** Ribeiro, M., Singh, S. & Guestrin, C. (2016). "'Why Should I Trust You?': Explaining the predictions of any classifier." *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 1135–1144.

---

### Stage 5: Human Decision

- **Grounding theory:** DSS philosophy — decision support, not decision automation (Power, 2002; Arnott & Pervan, 2014). Prescriptive analytics with human-in-the-loop (Bertsimas & Kallus, 2020).
- **StockLens context:**
  - System writes a recommendation and reason; the manager must physically action the reorder. No automated purchasing exists.
  - Role model (manager vs staff) enforces the boundary: only managers see the reason strings, forecast values, and confidence bounds needed to evaluate and override a recommendation.
  - **V2 — reorder action loop:** When a manager acts on a REORDER recommendation, they can now record the action directly in the system via the "Order Placed" button in the Decisions table. This calls `POST /api/reorder/log`, creating a `reorder_log` record with the product, quantity, manager identifier, and expected delivery window. While that record is pending, the same product's decision row changes to "Pending Delivery" and the backend rejects duplicate pending reorder logs with HTTP 409, preventing repeated action on the same unresolved recommendation. If the supplier changes the order or delivery estimate, the manager can update the pending record through `POST /api/reorder/update`, changing planned quantity, expected delivery days, and notes without changing stock. When the physical delivery arrives, the manager confirms via `POST /api/reorder/confirm`, which updates `inventory.stock_on_hand`, marks the log as 'delivered', and re-runs the forecast pipeline for the product — producing an updated decision that reflects the new stock level. This closes the full recommend → act → update pending order → deliver → reassess loop while preserving the human-in-the-loop principle: no stock update or order is triggered automatically. The system supports the decision but does not execute it.
  - Pending reorder count is surfaced on the Overview and Decisions tabs (pulsing status bar) to ensure managers are prompted to confirm deliveries rather than leaving stock levels stale.
- **Citation:** Bertsimas, D. & Kallus, N. (2020). "From predictive to prescriptive analytics." *Management Science*, 66(3), 1025–1044.

---

### Stage 6: Outcome

- **Grounding theory:** DSS evaluation via counterfactual comparison — Arnott & Pervan (2014) evaluation cycle; Hevner et al. (2004) rigor cycle requiring artefact utility demonstration.
- **StockLens context:**
  - Scenario simulation module is the primary outcome evaluation: reactive (without system, `stock ≤ 0` triggers order) vs proactive (with system, `stock ≤ reorder_point` triggers order) compared on `stockout_days`, `overstock_days`, `total_reorders` over a 90-day window.
  - Evaluation module measures internal forecast quality (MAE, RMSE, MASE, Tracking Signal, Naïve MAE comparison).
  - The scenario module provides the empirical answer to RQ1; the evaluation module provides the empirical answer to RQ2.

---

### Stage 7: Feedback Loop

- **Grounding theory:** Adaptive systems and iterative refinement — Hevner et al. (2004) rigor cycle. Tracking Signal as a drift-detection mechanism (Trigg, 1964).
- **StockLens context:**
  - Each new CSV upload triggers fresh model selection per product — the best model may change as more data arrives (SMA may win early; Holt's may take over as trend emerges).
  - Tracking Signal (Trigg's method) detects systematic forecast drift: |TS| > 4 signals that the current model is no longer appropriate and reforecasting is warranted.
  - ABC-XYZ classification re-runs company-wide after each pipeline execution — review frequencies update as the product revenue mix changes.
  - [CONFIRMED — V2] The `reorder_log` table now records whether a REORDER recommendation was acted upon (manager logs the order via "Order Placed" button), whether the pending order was corrected before receipt (`POST /api/reorder/update`), and whether stock was updated (delivery confirmation). Delivery confirmation triggers pipeline re-execution for the product, closing the recommend → act → update → deliver → reassess loop.
  - [LIMITATION] No automatic outcome verification: the system cannot independently confirm that a delivery confirmation corresponds to a real-world event, nor can it measure whether the reorder actually prevented a stockout, without POS integration. This is noted in Section 16 and Chapter 7.

---

### Diagram Specification

**Layout:** Left-to-right linear pipeline, 7 labelled boxes connected by single-direction arrows. A curved return arrow below the main flow runs from Stage 6 (Outcome) back to Stage 1 (Data), labelled "new upload / re-run pipeline."

**Box labels:**
1. Data Ingestion *(CSV/XLSX → cleaning → sales DB)*
2. Forecasting *(SMA/WMA/SES/Holt → MAE selection → CI bounds)*
3. Inventory Logic *(EOQ + Safety Stock → REORDER/AT_RISK/HOLD)*
4. Explanation *(reason strings + 95% CI + trend slope)*
5. Human Decision *(manager reviews, acts or overrides)*
6. Outcome *(stockout reduction / forecast accuracy / SUS)*
7. Feedback *(re-upload → pipeline re-run → Tracking Signal drift)*

**Colour coding by theoretical domain:**
- Blue (#2563eb): Stages 1–2 — Forecasting & Data Science (Makridakis)
- Green (#16a34a): Stage 3 — Inventory Control Theory (Silver/Pyke/Thomas, Teerasoponpong)
- Amber (#d97706): Stage 4 — Explainability / DSS Transparency (Arnott & Pervan, Ribeiro)
- Purple (#7c3aed): Stage 5 — Decision Science / Human Factors (Power, Bertsimas & Kallus)
- Red (#dc2626): Stage 6 — Evaluation / Effectiveness (Hevner)
- Grey (#6b7280): Stage 7 — Feedback / Adaptation (Hevner rigor cycle, Trigg)

**Recommended tool:** Draw.io or LaTeX TikZ. Export as PDF vector for inclusion in dissertation.

---

### Cross-Chapter Reference Sentences

**Chapter 3 (Methodology):**
> "The system design follows the seven-stage conceptual framework illustrated in Figure 3.1, grounded in Design Science Research (Hevner et al., 2004): raw sales data is ingested and cleaned (Stage 1), passed through a competitive forecasting pipeline (Stage 2), converted into inventory decisions via classical EOQ and safety stock theory (Silver et al., 2016; Teerasoponpong & Sopadang, 2022) (Stage 3), explained via natural-language reason strings (Stage 4), and acted upon by the human manager (Stage 5), with outcomes measured through scenario simulation and accuracy metrics (Stage 6) and fed back into the system on subsequent uploads (Stage 7)."

**Chapter 4 (Implementation):**
> "Each implementation section corresponds to a stage of the conceptual framework (Figure 3.1): Section 4.2 covers Stage 1 (data pipeline), Section 4.3 covers Stage 2 (forecasting engine), Section 4.4 covers Stage 3 (decision logic), and Section 4.5 covers Stage 4 (explanation layer)."

**Chapter 6 (Results):**
> "Results are structured around Stages 2 and 6 of the conceptual framework (Figure 3.1): Section 6.2 presents forecast accuracy evidence (Stage 2), and Section 6.3 presents scenario simulation outcomes (Stage 6), together providing empirical answers to RQ1 and RQ2."

**Chapter 7 (Discussion):**
> "The framework's Stage 7 feedback loop is substantially implemented in V2 — model re-selection on each pipeline run and Tracking Signal drift detection are present, and the reorder action loop (`reorder_log` table, `POST /api/reorder/log`, `POST /api/reorder/update`, `POST /api/reorder/confirm`) now records manager-initiated orders, pending order corrections, and delivery confirmations, triggering automatic pipeline re-execution for the affected product. The remaining gap is automated outcome verification: the system cannot independently confirm whether a REORDER decision prevented a real-world stockout without POS integration. This represents the primary direction for future development (Section 7.3)."

→ **Dissertation chapter target: Chapter 2 (Literature Review — synthesis/framework section) and Chapter 3 (Methodology — design rationale)**

---

## 20. Usability Evaluation Protocol (Chapter 3.8)

*This section is the complete protocol to be documented in Chapter 3.8 and executed before Chapter 6 is written.*

---

### 20.1 Participant Profile

- **Count:** 6–8 participants. Nielsen (1993) established that 5 users detect approximately 85% of usability problems in formative studies; 6–8 provides comfortable margin and allows role-split analysis.
- **Role split:** 3–4 with manager access (full system), 2–3 with staff access (read-only). Ensures both tab sets are evaluated independently.
- **Technical background:** Mix — at least half should be technically comfortable (regular Excel/spreadsheet users) and at least two should be technically basic (email/phone primary tools). No prior inventory software experience required or preferred.
- **Recruitment:** University convenience sample — peers, postgraduate students in business, operations management, or retail logistics programmes. Lecturers in supply chain or retail operations as stretch targets for external validity. No financial compensation required for fellow students; token (coffee/voucher) for external participants.
- **Exclusion criteria:** Anyone who has previously seen the StockLens interface. Anyone with a software development background (confounds usability findings — developers compensate for poor UX automatically).

---

### 20.2 Task Script

*Provide each participant with the sample CSV file (downloadable from `/api/upload/sample-csv`) before the session. Do not show the interface until the session begins.*

**Task 1 — Login and orientation** *(both roles)*
> "You have been given login credentials. Log in to the system. Once you are in, tell me in your own words what you think this system does."
*Observable: login success, ability to articulate system purpose without prompting.*

**Task 2 — Upload sales data** *(manager only)*
> "Upload the CSV file I provided. Confirm whether the upload was successful and tell me how many rows were accepted."
*Observable: locates Upload tab, uses drag-drop or file picker, reads the confirmation message and identifies the row count.*

**Task 3 — Find the highest-risk product** *(both roles)*
> "Which product is most urgently in need of restocking, and why does the system recommend this?"
*Observable: navigates to Decisions tab, identifies the REORDER badge at the top of the list, reads and paraphrases the reason string.*

**Task 4 — Read the forecast** *(manager only)*
> "What is the expected daily demand for [named product]? What forecasting model did the system use, and is demand trending upward or downward?"
*Observable: navigates to Forecast tab, reads forecast_demand value, reads model badge, reads trend indicator with slope.*

**Task 5 — Interpret evaluation accuracy** *(manager only)*
> "Is the system's forecasting accurate? Find the product with the lowest accuracy and explain what the accuracy percentage means."
*Observable: navigates to Evaluation tab, identifies lowest accuracy_pct row, provides verbal interpretation of the number.*

**Task 6 — Scenario simulation** *(manager only)*
> "Imagine your supplier's delivery time increases from 7 to 14 days. Change the lead time and run the simulation. How does this affect stockout risk compared to the current setup?"
*Observable: finds Scenario tab, adjusts lead time select to 14 days, runs simulation, reads results table or chart and draws a comparison.*

**Task 7 — Generate an invite code** *(manager only)*
> "You have a new team member starting next week. Generate an invite code so they can join your company workspace."
*Observable: navigates to Team tab, locates invite code generation, reads and identifies the generated code and its expiry date.*

---

### 20.3 Data Collection Plan

**Think-aloud instructions** *(read verbatim to participant before starting)*:
> "As you use the system, please say out loud what you are thinking, what you are trying to do, and what you expect to happen next. There are no right or wrong answers — we are testing the system, not you. If you find something confusing, say so. If a feature is not where you expect it, tell me. You can ask me to confirm which task you are on, but I cannot help you find things in the interface or tell you if you are in the right place."

**SUS Questionnaire** *(10 items, administered on paper or Google Form immediately after the session, before any debrief)*:

Rate each on a 1–5 scale: 1 = Strongly Disagree, 5 = Strongly Agree.

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Error frequency recording sheet** *(completed by researcher during session)*:

| Task | P-ID | Completed (Y/N) | Error count | Error description | Time (sec) | Verbal confusion noted |
|------|------|-----------------|-------------|-------------------|------------|----------------------|

**Error definition:** Any action that does not move the participant toward the task goal — wrong navigation, failed form submission, misreading a UI element, or backtracking to a previous tab.

**Task completion:** Binary — 1 (completed without researcher intervention within 3 minutes) or 0 (not completed or required intervention). No partial credit.

---

### 20.4 Analysis Plan

**SUS score calculation:**
- Odd items (1,3,5,7,9): contribution = score − 1
- Even items (2,4,6,8,10): contribution = 5 − score
- SUS score = sum of all contributions × 2.5 (range: 0–100)
- Interpretation bands: ≥ 85 = Excellent, 71–84 = Good, 51–70 = OK, < 51 = Poor (Bangor, Kortum & Miller, 2008)
- Report: mean SUS across all participants ± standard deviation; separate means for manager vs staff subgroups if sample permits.

**Think-aloud thematic categorisation** using affinity mapping with four categories:
1. **Navigation confusion** — participant cannot locate a feature or navigates to the wrong tab
2. **Label ambiguity** — participant misunderstands a term (e.g., "MASE", "reorder point", "safety stock")
3. **Feedback absence** — participant unsure whether an action succeeded
4. **Positive reactions** — unprompted positive verbal statements about a specific feature

**Usability finding threshold:** A finding is reportable in Chapter 6 if ≥ 2 participants (≥ 25% of sample) encounter the same issue independently, OR if a single participant expresses severe frustration (task abandonment, explicit negative statement). Single-occurrence minor issues are noted in Appendix only.

**Task completion analysis:** Report completion rate per task as percentage. Completion rate below 80% on any task = usability problem requiring discussion in Chapter 7 with proposed remediation.

---

### 20.5 Ethical Considerations

**Consent form required fields:**
- Study title and one-sentence purpose
- What the participant will be asked to do (7 tasks + SUS questionnaire, approximately 45 minutes total)
- Whether the session will be audio-recorded (if yes: where stored, how anonymised, when deleted)
- That participation is voluntary and may be withdrawn at any point without consequence or explanation
- That no personally identifying information will appear in the dissertation
- Participant signature and date

**Data anonymisation procedure:**
- Assign participant codes (P1–P8) at recruitment; use only codes in all notes, transcripts, and recording files
- Remove any utterances containing participant names, employer names, or other identifiers from transcripts before analysis
- Raw audio files deleted after thematic coding is complete and verified

**Recording permissions:**
- Audio-only recording preferred (reduces inhibition vs screen recording with video)
- If participant declines audio recording: researcher takes contemporaneous written notes; participant reviews notes at end of session for accuracy
- Written consent must be obtained before any recording begins

**Ethics approval:** Submit for departmental ethics review before recruitment begins. For convenience samples involving no sensitive personal data and no deception, most institutions permit expedited review. Confirm supervisory requirements.

**Citation:** Bangor, A., Kortum, P. & Miller, J. (2008). "An empirical evaluation of the System Usability Scale." *International Journal of Human-Computer Interaction*, 24(6), 574–594.

→ **Dissertation chapter target: Chapter 3 (Methodology — Section 3.8 Evaluation Design)**

---

## 21. Chapter 6 Structure — Results and Analysis Outline

*This section provides the structure, presentation guidance, and analytic targets for Chapter 6. No prose is included here — Chapter 6 is written after usability sessions are conducted.*

---

### 6.1 Introduction to the Results Chapter
**Purpose:** Map the three RQs to the three evaluation dimensions; explain how data was collected (scenario simulation from the live DB, evaluation metrics from historical sales, usability sessions with participants); state explicitly what Chapter 6 contains (results and descriptive analysis) and what belongs in Chapter 7 (interpretation, contextualisation, and critique).

---

### 6.2 Forecasting Accuracy Results *(addresses RQ2)*

**What to present:**
- Per-product: MAE, Naïve MAE, MASE, Naïve MASE, RMSE, Accuracy %, Tracking Signal, model selected, evaluation period
- Fleet-level averages for each metric
- Count and percentage of products where Naïve MASE < 1 (model outperforms persistence baseline)
- Model selection distribution: how many products used SMA vs WMA vs SES vs Holt

**Table structure:**
| Product | Model | MAE | Naïve MAE | MASE | Accuracy % | Tracking Signal |
|---------|-------|-----|-----------|------|------------|-----------------|

**Chart:** Grouped bar chart — model MAE vs naïve MAE per product, sorted by model MAE descending. Secondary: pie chart showing model selection distribution across all products.

**What it proves:** RQ2 — the forecasting pipeline produces measurably better predictions than a naïve persistence model for the majority of products; model selection is non-trivial (different models win for different products, confirming the value of the competitive selection step).

**Good result threshold:** Naïve MASE < 1 for ≥ 70% of products; mean accuracy > 65%; no product with |Tracking Signal| > 4 (no systematic drift).

**Poor result threshold:** Naïve MASE > 1 for majority (model worse than naïve baseline); mean accuracy < 50%; multiple products with |TS| > 4. If this occurs, discuss in Chapter 7 — likely cause is insufficient data, dominant outlier demand, or inappropriate fixed alpha values.

---

### 6.3 Inventory Decision Effectiveness — Scenario Simulation *(addresses RQ1)*

**What to present:**
- Per-product: stockout days (reactive vs proactive), overstock days (reactive vs proactive), total reorders, improvement delta
- Fleet-level aggregate: mean stockout reduction (days), mean overstock reduction (days), percentage of products where proactive strategy outperforms reactive

**Table structure:**
| Product | Stockouts (reactive) | Stockouts (proactive) | Reduction | Overstocks (reactive) | Overstocks (proactive) |
|---------|---------------------|----------------------|-----------|----------------------|----------------------|

**Chart:** Clustered bar chart — one pair of bars per product (reactive vs proactive stockout days). Separate smaller chart for overstock comparison. Horizontal reference line at 0.

**What it proves:** RQ1 — the proactive reorder strategy (enabled by the system's recommendations) reduces stockout days relative to the reactive baseline. This is the primary effectiveness evidence for the system's existence.

**Good result threshold:** Stockout reduction > 0 for ≥ 80% of products; mean reduction ≥ 3 days per 90-day window; some overstock days present in proactive scenario (confirming system is not simply over-ordering to avoid stockouts — that would be a false positive).

**Poor result threshold:** Stockout reduction ≤ 0 for majority (proactive no better than reactive); overstock days increase dramatically (system trading stockouts for excessive inventory). If this occurs, likely cause is that historical sales volatility exceeds the safety stock formula's assumptions — discuss fixed Z and fixed LEAD_TIME in Chapter 7.

---

### 6.4 Decision Classification Distribution

**What to present:** Count and percentage of REORDER / AT_RISK / HOLD / INACTIVE decisions across all active products. Risk flag distribution (HIGH / MEDIUM / LOW).

**Chart:** Stacked bar or donut chart showing decision class proportions.

**What it proves:** The system produces differentiated outputs — not all products receive the same recommendation. A distribution heavily weighted toward HOLD confirms the system is not generating false alarms; a reasonable REORDER count confirms it is identifying genuine risk.

---

### 6.5 ABC-XYZ Classification Results

**What to present:** Product count per cell in the 3×3 matrix. Revenue contribution breakdown for A vs B vs C classes. CV distribution for X vs Y vs Z classes.

**Chart:** 3×3 coloured heatmap grid with product count per cell (matching the UI design).

**What it proves:** Classification produces a non-uniform distribution — meaningful differentiation across the product catalogue that justifies differentiated management attention and review frequencies.

---

### 6.6 Usability Results — SUS and Task Completion *(addresses RQ3)*

> ⛔ **BLOCKED — DO NOT WRITE THIS SECTION UNTIL USABILITY SESSIONS ARE COMPLETE.**
> Execute the full protocol in Section 20 (minimum 5 participants) before writing any content here.
> The structure and tables below are the template — fill in with real data from sessions.
> Writing this section from hypothetical data invalidates RQ3.

**What to present:**
- SUS score per participant, mean ± SD, SUS band (Excellent/Good/OK/Poor)
- Task completion rate per task (%) — managers and staff separately where tasks differ
- Error frequency per task (total errors, mean per participant)
- Error frequency by theme category (navigation confusion / label ambiguity / feedback absence / positive)

**Table structure:**
| Participant | Role | SUS Score | Tasks completed (n/7) | Notable errors |
|-------------|------|-----------|-----------------------|----------------|

**Chart:** Box plot of SUS scores across participants; bar chart of task completion rate per task; bar chart of error count by task.

**What it proves:** RQ3 — the system is usable (SUS ≥ 71) and core tasks (finding urgent products, uploading data, reading forecasts) are completable without training by ≥ 80% of participants.

**Good result threshold:** Mean SUS ≥ 71 (Good band); task completion ≥ 80% on Tasks 2, 3, 4 (core journeys); ≤ 2 reportable usability problems (≥ 2 participants each).

**Poor result threshold:** Mean SUS < 51; task 3 (find REORDER) completion < 60%; consistent navigation confusion on Evaluation or Scenario tabs. If SUS < 71, acknowledge in Chapter 7 with specific findings from think-aloud themes.

---

### 6.7 Think-Aloud Themes

> ⛔ **BLOCKED — DO NOT WRITE THIS SECTION UNTIL THINK-ALOUD NOTES ARE CODED.**
> Requires contemporaneous session notes from all participants. Conduct affinity mapping (Section 20.4) across all sessions before writing. Minimum threshold: 2+ participants per theme.

**What to present:** Thematic table with theme name, category, frequency (n participants), representative verbatim quote, and affected feature.

**Table structure:**
| Theme | Category | n participants | Verbatim quote | Feature |
|-------|----------|----------------|----------------|---------|

**What it proves:** Qualitative texture supporting or complicating the SUS score — specific interface elements that caused confusion or generated positive reactions. Required by RQ3's "interpretable" framing.

---

### 6.8 Cross-Dimensional Synthesis

**The connective argument for this section:**
> The scenario simulation (§6.3) demonstrates that proactive reorder decisions reduce stockout days when the underlying forecast is acted upon. The forecast accuracy results (§6.2) establish that the system's forecasts are meaningfully better than a naïve persistence model for [X]% of products, providing a credible basis for those reorder recommendations. The usability results (§6.6–6.7) confirm that the decision recommendations and forecast outputs are legible to non-technical SME users within a single session — without training — satisfying the interpretability criterion of RQ3. Together, these three dimensions establish that StockLens is technically accurate, operationally effective, and humanly usable: the three necessary conditions for a viable lightweight DSS.

**What belongs in Chapter 7, not Chapter 6:**
- Why specific models were selected (design rationale → Chapter 3)
- Why MASE > 1 for certain products (interpretation and root-cause analysis → Chapter 7)
- Comparison of results against prior DSS literature (Chapter 7)
- Whether results generalise beyond the test dataset (limitations → Chapter 7)
- Proposed improvements based on evaluation findings (future work → Chapter 7)

Chapter 6 presents and describes results only. Chapter 7 interprets, contextualises, and critiques.

→ **Dissertation chapter target: Chapter 6 (Results and Analysis — complete structure)**

---

## 22. HCI Theory Mapping — Interface Design Rationale

*Each feature below maps to a specific HCI principle with a verifiable academic citation. Use in Chapter 4.9 (Interface Design Rationale) and Chapter 7.5 (Usability Discussion).*

---

### Feature 1: Role-based tab hiding — absent from DOM, not CSS-hidden

- **HCI principle:** Cognitive load theory — extraneous cognitive load (Sweller, 1988). Irrelevant interface elements compete for working memory with the actual task.
- **Citation:** Sweller, J. (1988). "Cognitive load during problem solving: Effects on learning." *Cognitive Science*, 12(2), 257–285.
- **Dissertation sentence:** "Manager-only tabs are removed from the DOM entirely for staff users rather than hidden with CSS, following Sweller's (1988) principle of reducing extraneous cognitive load — staff users are not presented with forecasting controls irrelevant to their operational role, minimising the attentional overhead of navigating an interface designed for a different user type."
- **Chapter:** 4.9 (design decision 14h), 7.5 (if usability session confirms staff users complete tasks faster than managers).

---

### Feature 2: REORDER rows — static left border and tint

- **HCI principle:** Pre-attentive processing — colour is detected by the visual system before conscious attention is directed (Treisman & Gelade, 1980). A red left border is a pre-attentive colour signal that differentiates urgent rows without requiring motion.
- **Design detail:** REORDER rows carry a `box-shadow: inset 3px 0 0 #DC2626` (red left border on the first `<td>`) and `rgba(220,38,38,0.032)` background tint. The previous `pulse-glow 2.4s ease-in-out infinite` animation was replaced to eliminate continuous visual noise across all urgent rows simultaneously. The border and tint communicate the same urgency as the animation at a lower attentional cost (see Feature 24 for the full design rationale).
- **Citation:** Treisman, A. & Gelade, G. (1980). "A feature-integration theory of attention." *Cognitive Psychology*, 12(1), 97–136.
- **Dissertation sentence:** "REORDER rows are differentiated by a permanent red left border and background tint, leveraging Treisman & Gelade's (1980) finding that colour is a pre-attentive feature detectable without deliberate scanning — the static treatment achieves the same urgency signal as animation while avoiding the continuous visual noise of a pulsing effect applied to potentially every row in a large table."
- **Chapter:** 4.9.

---

### Feature 3: KPI count-up animation — session-guarded first-load signal

- **HCI principle:** Visibility of system status — Nielsen's first usability heuristic (1994). The count-up animation confirms data has loaded on first encounter; a `sessionStorage` guard prevents it re-triggering on subsequent tab returns within the same session, eliminating redundant extraneous cognitive load (Sweller, 1988).
- **Design detail:** `animateCount()` checks `sessionStorage.kpi_animated` before running. On first Overview load per session, the 1200ms ease-out animation runs and the flag is set. On subsequent loads, the value is set directly. The flag is cleared on logout. See Feature 23 for the full design rationale.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann. Sweller, J. (1988). "Cognitive load during problem solving." *Cognitive Science*, 12(2), 257–285.
- **Dissertation sentence:** "KPI values animate from zero to their current value on first session load, satisfying Nielsen's (1994) first heuristic — the animation signals that live data has been fetched. A session-scope guard prevents the animation re-triggering on tab returns, following Sweller's (1988) extraneous cognitive load principle: repeated animation with no new information competes with the user's focus on the values themselves."
- **Chapter:** 4.9.

---

### Feature 4: Reason strings — natural language explanation per decision

- **HCI principle:** Explainability and user trust in algorithmic recommendations (Ribeiro, Singh & Guestrin, 2016). Transparent system output increases adoption and reduces over-reliance.
- **Citation:** Ribeiro, M., Singh, S. & Guestrin, C. (2016). "'Why Should I Trust You?': Explaining the predictions of any classifier." *Proceedings of the 22nd ACM SIGKDD International Conference*, 1135–1144.
- **Dissertation sentence:** "Every inventory decision includes a natural-language reason string embedding the specific threshold values, stockout probability, and EOQ recommendation that produced it, following Ribeiro et al.'s (2016) finding that explanations increase user trust in and willingness to act on algorithmic recommendations — particularly important for SME managers who must justify purchasing decisions to stakeholders."
- **Chapter:** 4.9 and 7.5 (cross-reference to usability task 3 — did participants successfully read and paraphrase reason strings?).

---

### Feature 5: Mobile bottom navigation — 4 primary tabs

- **HCI principle:** Fitts' Law — target acquisition time is a function of distance and target size (Fitts, 1954). Bottom navigation positions the most frequent navigation targets within thumb reach on mobile touchscreens, minimising motor cost.
- **Citation:** Fitts, P. (1954). "The information capacity of the human motor system in controlling the amplitude of movement." *Journal of Experimental Psychology*, 47(6), 381–391.
- **Dissertation sentence:** "The mobile bottom navigation bar positions the four most-accessed tabs (Overview, Inventory, Decisions, Analytics) within thumb reach, applying Fitts' (1954) Law to minimise the motor cost of navigation for staff users who primarily access the system on mobile devices during floor operations."
- **Chapter:** 4.9.

---

### Feature 6: Light/dark theme toggle with localStorage persistence

- **HCI principle:** User control and freedom — Nielsen's third usability heuristic (1994). Persistence respects the user's environmental and accessibility preferences across sessions.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Academic Press. [Heuristic 3: User control and freedom.]
- **Dissertation sentence:** "Theme preference is persisted across sessions via localStorage, satisfying Nielsen's (1994) principle of user control — the interface adapts to the user's environmental preference (bright retail floor vs dim back-office) rather than imposing a fixed visual mode that may impair readability."
- **Chapter:** 4.9.

---

### Feature 7: Multilingual support (14 languages) with RTL layout for Arabic and Urdu

- **HCI principle:** Culturally situated interface design — internationalisation requires more than text translation; text direction and layout conventions must be adapted to match user cultural context (Marcus & Gould, 2000).
- **Citation:** Marcus, A. & Gould, E. (2000). "Crosscurrents: Cultural dimensions and global web user-interface design." *Interactions*, 7(4), 32–46.
- **Implementation detail:** `translations.js` provides complete key-value dictionaries for 14 languages: English, Spanish, Arabic, French, German, Portuguese, Hindi, Urdu, Bengali, Turkish, Chinese (Simplified), Indonesian, Thai, and Vietnamese. All navigation labels, table headers, decision badges, action strings, KPI labels, upload UI, and yes/no values are translated per language. A language selector in the topbar persists the choice to `localStorage`. RTL layout (`dir="rtl"`) is applied automatically for Arabic and Urdu via `applyTranslations()`.
- **Dissertation sentence:** "The system supports 14 languages covering 5 scripts (Latin, Arabic, Devanagari, Chinese, Thai) with automatic right-to-left layout reversal for Arabic and Urdu, following Marcus & Gould's (2000) framework for culturally situated web interfaces — the system adapts reading direction and layout conventions to match user cultural context rather than imposing a Western-default LTR layout on all users."
- **Chapter:** 4.9. [LIMITATION to note in 7.5: formal i18n testing was not conducted across all 14 languages; RTL layout correctness for Arabic and Urdu, and script rendering accuracy for Hindi, Bengali, Thai, and Chinese, were not verified with native speakers.]

---

### Feature 8: Low Stock Alerts — top 8 products only

- **HCI principle:** Progressive disclosure and attention management — Card, Moran & Newell (1983) on attention as a scarce cognitive resource. Overview panels should direct attention, not duplicate the detail view.
- **Citation:** Card, S., Moran, T. & Newell, A. (1983). *The Psychology of Human-Computer Interaction*. Lawrence Erlbaum Associates.
- **Dissertation sentence:** "The Low Stock Alerts panel displays a maximum of 8 items, applying progressive disclosure — the overview card directs managerial attention to the most urgent products without replacing the dedicated Decisions tab, consistent with Card et al.'s (1983) treatment of attention as a scarce resource that interface design must allocate efficiently."
- **Chapter:** 4.9.

---

### Feature 9: Lazy tab loading — data fetched only on first activation

- **HCI principle:** Response time and perceived continuity — Nielsen (1993) established that response times under 1 second maintain the user's flow of thought; Miller (1968) identified 1 second as the boundary for uninterrupted cognitive engagement.
- **Citation:** Nielsen, J. (1993). *Usability Engineering*. Academic Press. [Chapter 5: Response time limits.]
- **Dissertation sentence:** "Tab data is fetched only on first activation and cached client-side for subsequent switches, keeping tab navigation below Nielsen's (1993) 1-second response threshold for perceived continuity — critical for a locally-hosted application without edge caching or CDN acceleration."
- **Chapter:** 4.9.

---

### Feature 10: prefers-reduced-motion media query

- **HCI principle:** Inclusive design and accessibility — WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions, AAA). Users with vestibular disorders, epilepsy, or motion sensitivity can be harmed by non-essential animation.
- **Citation:** W3C Web Content Accessibility Guidelines (WCAG) 2.1. (2018). Success Criterion 2.3.3: Animation from Interactions. World Wide Web Consortium.
- **Dissertation sentence:** "The `prefers-reduced-motion` CSS media query disables all keyframe animations when the user's operating system motion-sensitivity setting is enabled, aligning with WCAG 2.1 Success Criterion 2.3.3 and reflecting the principle that accessibility constraints are design requirements, not post-hoc additions."
- **Chapter:** 4.9 (implementation note) and 7.5 (WCAG compliance discussion — note that a full WCAG 2.1 AA audit was not conducted; this is an identified limitation).

→ **Dissertation chapter target: Chapter 4 (Section 4.9 — Interface Design Rationale) and Chapter 7 (Section 7.5 — Usability Discussion)**

### Feature 11: Urgent Actions Required panel — top-of-page interruption design

- **HCI principle:** Visual hierarchy and attention management — Norman's (2013) principle of visibility states that critical information must be discoverable without search. Placing the most urgent content (stockout-imminent products) at the top of the first tab ensures it is seen on every login without the manager needing to navigate anywhere.
- **Design detail:** The panel only renders when REORDER decisions exist (zero-state = hidden). This prevents "cry wolf" desensitisation — an always-visible empty urgency panel trains users to ignore it. The red-to-orange gradient icon and red border distinguish it from neutral card components at a glance.
- **Citation:** Norman, D. A. (2013). *The Design of Everyday Things* (Revised ed.). Basic Books. Ch. 1 (Visibility, feedback, affordance).
- **Dissertation sentence:** "Following Norman's (2013) principle of visibility, the Urgent Actions panel is placed at the highest-priority position in the interface — the top of the Overview tab — and is rendered only when actionable reorder decisions exist, preventing alert fatigue through conditional display."
- **Chapter:** 4.9 (interface rationale) and 5.x (interface design)

### Feature 12: Sidebar notification badge — peripheral awareness

- **HCI principle:** Peripheral awareness and notification design — Healey et al. (1995) on ambient displays and McCrickard & Chewar (2003) on notification systems. A badge delivers count information without requiring navigation, reducing the cost of staying informed.
- **Design detail:** A red pill badge (`border-radius: 999px`, `background: #DC2626`) showing the REORDER count is injected on the Decisions nav item after every Overview load. Hidden (not rendered) when count is zero, avoiding visual noise.
- **Citation:** McCrickard, D. S., & Chewar, C. M. (2003). Attuning notification design to user goals and attention costs. *Communications of the ACM*, 46(3), 67–72.
- **Dissertation sentence:** "A notification badge on the Decisions navigation item provides peripheral awareness of the current REORDER count, allowing the manager to assess urgency before navigating — consistent with McCrickard and Chewar's (2003) principle that notifications should communicate status without interrupting primary task flow."
- **Chapter:** 4.9 (interface rationale)

### Feature 13: KPI trend arrows — contextualising absolute numbers

- **HCI principle:** Data contextualisation — Tufte's (2001) principle that data acquires meaning through comparison. A KPI value of "23 reorders" is ambiguous without knowing whether that is better or worse than last week.
- **Design detail:** Each KPI card displays a directional arrow with percentage change (last 7 days vs prior 7 days). Green ↑ = improving, red ↓ = worsening. Trend is computed server-side from real sales data, not simulated. Direction arrows use the semantic colour system (green/red), never the brand colour, maintaining the two-layer separation.
- **Citation:** Tufte, E. R. (2001). *The Visual Display of Quantitative Information* (2nd ed.). Graphics Press.
- **Dissertation sentence:** "KPI trend indicators provide directional context for each metric, applying Tufte's (2001) principle that quantitative values gain meaning through comparison — a reorder count is informative only when understood relative to the prior period."
- **Chapter:** 4.9 (interface rationale) and 5.x (KPI design)

### Feature 14: Recent Activity feed — temporal awareness

- **HCI principle:** Situational awareness — Endsley's (1995) three levels: perception of elements, comprehension of their meaning, projection of future state. An activity feed addresses level 1 (what has happened recently) and supports level 2 (has the system been kept up to date?).
- **Design detail:** Activity items are drawn from three real data sources: decision table (stock alerts triggered), upload_log (data added), and forecast table (last recomputation time). Sorted by timestamp descending, max 6 items. Each item has a semantic icon (colour-coded), message, and timestamp. Items animate in with staggered `slideUp` (60ms per item).
- **Citation:** Endsley, M. R. (1995). Toward a theory of situation awareness in dynamic systems. *Human Factors*, 37(1), 32–64.
- **Dissertation sentence:** "The Recent Activity feed addresses Endsley's (1995) first level of situation awareness — perception of relevant system state — by surfacing the most recent data events (uploads, alerts, forecast runs) directly on the Overview tab without requiring navigation to audit logs."
- **Chapter:** 4.9 (interface rationale)

### Feature 15: Smart Recommendations panel — decision support through language

- **HCI principle:** Cognitive load theory (Sweller, 1988) and DSS design principle of explanation transparency (Turban et al., 2011). Displaying raw numbers (demand = 12.4, EOQ = 84, stockout_prob = 78.4%) transfers interpretation burden to the user. A recommendation string performs the synthesis.
- **Design detail:** Strings are generated server-side per REORDER product, combining stock level, days-to-stockout, stockout probability, EOQ quantity, and trend direction into one sentence. Urgency (critical/warning/moderate) sets the left border colour (red/amber/slate/green). The panel is absent when no REORDER items exist.
- **Citation:** Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257–285. Turban, E., Sharda, R., & Delen, D. (2011). *Decision Support and Business Intelligence Systems* (9th ed.). Pearson.
- **Dissertation sentence:** "Smart recommendation strings reduce the interpretive cognitive load (Sweller, 1988) associated with multi-variable inventory data by synthesising forecast demand, stockout probability, and EOQ into a single actionable sentence — consistent with Turban et al.'s (2011) principle that a DSS should advise, not merely report."
- **Chapter:** 4.9 (interface rationale) and 2.x (literature review — DSS design)

→ **Dissertation chapter target: Chapter 4 (Section 4.9 — Interface Design Rationale) and Chapter 5 (Interface Design)**

---

## 14m. Contextual Empty States — Design Decision

### 14m. Contextual empty states over generic "no data" messages

- **Chosen:** Per-tab empty state components with a branded illustration placeholder (icon in a circle), a descriptive title, a body sentence explaining why the tab is empty, a role-gated CTA button (manager) or a staff note (non-manager), and a slide-up CSS animation on entry.
- **Alternative:** A generic "No data" text cell spanning the table, or simply leaving the table empty.
- **Why chosen:** A blank table communicates nothing about how to remedy the situation. The contextual empty state answers three user questions: (1) why is it empty, (2) what should I do next, (3) can I do it right now? The role gate prevents staff from seeing a CTA they cannot execute (e.g. "Run Pipeline"), reducing frustration. This aligns with Nielsen's heuristic 9 — help users recognise, diagnose, and recover from situations.
- **Implementation detail:** A single `renderEmptyState({ icon, title, body, managerCta, staffNote })` utility is called at the top of each of the five data-loading functions (`loadInventory`, `loadDecisions`, `loadForecast`, `loadEvaluation`, `loadClassification`) before the table rows are built. The function emits a single `<tr><td colspan="99">…</td></tr>` containing the `.empty-state` panel, so it slots cleanly inside any existing `<tbody>` without layout changes.
- **Trade-off:** Five separate config objects need to be maintained when tab navigation changes. The CTA buttons use inline `onclick` strings pointing to `switchTab()` — a minor coupling that could be refactored to event delegation in a future iteration.

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale) and Chapter 5 (Usability)**

---

### 14m. Forecast tab visual enhancements — trend chip, probability gauge, styled range

- **Chosen:** Three new display components replace plain text in the forecast table: (1) `.trend-chip` — a pill badge with green/red/grey colouring for INCREASING / DECREASING / STABLE trend direction; (2) `.prob-gauge-wrap` — a miniature bar chart (6 px tall) with label and fill colour scaled to stockout probability (red ≥50%, amber ≥20%, green <20%); (3) `.demand-range` — a styled span showing "lo – hi u/day" in muted text with the values bolded.
- **Alternative:** Keep plain-text coloured spans (`font-size:12px; color:#dc2626`).
- **Why chosen:** The previous implementation used inline style strings (`color:#dc2626;font-weight:600`) which carry no semantic class name, making them invisible to design system maintenance. Replacing them with class-based components means all trend colours are updated by editing one CSS block, not 40 scattered inline attributes. The probability gauge adds a pre-attentive signal (length) on top of the existing numeric signal (percentage), reducing the cognitive effort required to identify high-risk products by scanning.
- **Trade-off:** The gauge bar requires a containing `<div>` rather than a single `<span>`, which adds a small amount of DOM depth per forecast row. For tables with hundreds of rows this is negligible; for tens of thousands it would require virtualisation.

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — pre-attentive processing)**

---

### 14n. Expandable decision row brief panel

- **Chosen:** Clicking any decision row (manager view) inserts an accordion-style sub-row (`decision-brief-row`) directly beneath it, displaying four data fields in a three-column grid: Forecast Demand, 95% CI Range, Reorder Point, and a full-width reason card with an eucalyptus left border. Only one brief is open at a time; clicking the same row a second time closes it.
- **Alternative:** Show all reason text inline in a fourth column (as previously implemented).
- **Why chosen:** The inline reason column consumed horizontal space permanently on every row, even for rows where the user had no interest in the reasoning. Most decision tasks require only three data points (product name, action, severity). The reason is relevant only when the manager wants to understand or audit a decision. Progressive disclosure keeps the table scannable while making the full context a single click away.
- **Implementation detail:** `window._decisionsData` stores the full API response. Each `<tr>` carries a `data-decision-idx` attribute. A single delegated `click` listener on the `<tbody>` reads the index, retrieves the record from `_decisionsData`, builds the brief with `buildDecisionBrief(d)`, and inserts a new `<tr>` after the clicked row. A `fadeInDown` keyframe (opacity 0→1, translateY −6px→0) makes the insertion feel smooth.
- **Trade-off:** The expand state resets on every `loadDecisions()` call (tab change or pipeline re-run). This is acceptable because decisions change between runs; persisting an open row would create a mismatch between the visible brief and updated data.

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — progressive disclosure)**

---

### 14o. HOLD badge semantic neutrality fix

- **Chosen:** `.badge-hold` uses `background: #F1F5F9; color: #475569` (neutral slate), matching the semantic intent of "no action required".
- **Alternative:** Previous state used the brand accent colour (#3D8565) for all badges.
- **Why chosen:** Using green — the same hue as primary interactive elements — for HOLD badges created false urgency. A HOLD decision means the product is stable and needs no intervention. Neutral slate communicates inactivity without competing for visual attention alongside REORDER (red) and AT_RISK (amber) badges.
- **Trade-off:** Requires discipline to maintain colour intent. Dark mode variant also updated (`background: #1E293B; color: #94A3B8`).

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — semantic colour, Section 14i)**

---

### 14p. Upload pipeline progress indicator

- **Chosen:** A multi-step pipeline progress component (`#pipeline-progress`) appears on upload submission, showing a branded gradient fill bar and a vertically stacked list of pipeline stages (Uploading → Validating → Cleaning → Forecast → Decisions → Finalising). Each stage activates with a coloured dot and label change as a simulated timeline progresses. On completion (success or error), all dots turn green or red and the bar hides after 2 seconds.
- **Alternative:** Replace button text with "Uploading…" and re-enable on completion (previous implementation).
- **Why chosen:** A single-word label change gives no indication of how long the operation will take or what is happening internally. The pipeline performs several sequential operations (file parsing, deduplication, stock update, forecast recalculation, decision regeneration) that collectively take several seconds. Without visible progress, the user may assume the system has stalled and re-submit. The staged indicator sets expectations, communicates that multiple operations are in progress, and reduces premature re-submission.
- **Implementation detail:** `simulatePipelineProgress()` returns a `stop(success)` closure. Internally it registers a series of `setTimeout` callbacks whose cumulative delay matches an empirically estimated pipeline duration (~3 seconds total). The real `fetch` resolves asynchronously; `stop()` is called with the result flag to synchronise the visual state with reality before hiding.
- **Trade-off:** The timeline is simulated, not driven by real server-side events. If the pipeline takes significantly longer than ~3 seconds (very large datasets), the bar will appear "stuck" at 98% before the response arrives. A future improvement would use Server-Sent Events or WebSocket to stream real pipeline stage completion.

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — system feedback / Nielsen heuristic 1)**

---

### 14q. Post-onboarding welcome banner

- **Chosen:** On first login to a company account with no upload history (`is_first_visit = True` from `/api/overview`), a gradient welcome banner renders at the top of the Overview tab. It displays a personalised greeting (username from Jinja2), a role-appropriate subtitle, and three step-by-step quick-action buttons that navigate to the relevant tab. A "Dismiss" button removes the banner (CSS fade + shrink) and sets `sessionStorage.welcome_dismissed = '1'` to prevent it reappearing in the same session. The banner does not appear once at least one upload exists.
- **Alternative:** No onboarding guidance; user discovers the interface independently.
- **Why chosen:** New users, particularly non-technical SME managers, face a cold-start problem: the dashboard is empty and offers no guidance on what to do first. The banner reduces first-session abandonment by providing a visible path forward without requiring the user to explore the navigation. Role-specific steps (manager sees Upload CSV → Run Forecast → Review Decisions; staff sees Browse Products → Check Inventory → See Decisions) ensure the guidance is relevant.
- **Trade-off:** The `is_first_visit` flag is server-side, based on `upload_log` count rather than a dedicated `has_seen_welcome` field. This means a manager who uploaded via a previous session but dismissed the banner could theoretically see it again if they clear `sessionStorage`. This is an acceptable trade-off for prototype scope; production would use a persistent `users.welcome_shown` flag.

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — onboarding UX) and Chapter 5 (System Walkthrough)**

---

### 14r. Data freshness signal — system currency transparency
- **Chosen:** Status pill showing "Forecast last run: Xh/Xd ago", turning amber with stale warning when ≥3 days old. Inline "Re-run forecast" link for managers.
- **Alternative:** No freshness indicator; user infers currency from the Recent Activity feed.
- **Why chosen:** Without a freshness signal, a manager viewing KPIs on a stale forecast cannot make accurate ordering decisions. The pill delivers this information at the exact point of decision — directly above the KPIs — satisfying Nielsen's (1994) first heuristic (visibility of system status).
- **Trade-off:** Age computed client-side from `last_forecast_run`; inaccurate if client clock diverges from server time. Acceptable for the SME same-device deployment context.

### 14s. KPI count-up — session-scoped animation guard
- **Chosen:** `sessionStorage.kpi_animated` prevents the count-up animation re-triggering on tab returns. First load animates; subsequent loads set values directly. Cleared on logout.
- **Alternative:** Animate on every Overview load (previous behaviour).
- **Why chosen:** Repeated animation with no new information content is extraneous cognitive load (Sweller, 1988) — it competes with the user's focus on the numbers. The guard preserves the first-impression signal while removing the recurring cost.
- **Trade-off:** Animation suppressed in private-browsing sessions where sessionStorage is blocked by some browsers.

### 14t. REORDER row visual treatment — static border over infinite animation
- **Chosen:** 3px red left border (`box-shadow: inset 3px 0 0 #DC2626`) + `rgba(220,38,38,0.032)` tint on REORDER rows. Previous `pulse-glow` animation removed.
- **Alternative:** Infinite `pulse-glow` animation (previous behaviour).
- **Why chosen:** In a table with many REORDER rows, all simultaneously animating creates visual noise that makes non-urgent rows harder to read. Colour is a pre-attentive differentiator (Treisman & Gelade, 1980) — a red border achieves the same urgency signal without continuous motion.
- **Trade-off:** Less immediately eye-catching on first page load than an animation. This is the intended trade-off — border attracts attention on scan without demanding it repeatedly.

### 14u. Scenario verdict — synthesis over raw output
- **Chosen:** After simulation, a colour-coded verdict block (`.scenario-verdict`) states the total stockout-days prevented, percentage improvement, and the 3 most exposed products in assertive language.
- **Alternative:** Display raw number pair ("X stockout-days with system vs Y without") as a text line (previous behaviour).
- **Why chosen:** Raw numbers transfer the interpretation task to the user. The verdict performs the synthesis, following Turban et al.'s (2011) principle that a DSS should advise, not merely report.
- **Trade-off:** The recommendation language is generic — it does not incorporate financial impact (revenue at risk per prevented stockout-day).

### 14v. Overview breakdown cards — clickable navigation affordances
- **Chosen:** Decision Breakdown and Risk Overview card rows are clickable with eucalyptus hover and `onclick` → `switchTab()`. Card headers have "View all →" / "View inventory →" links.
- **Alternative:** Informational panels only (previous behaviour).
- **Why chosen:** Norman's (2013) principle of affordance — perceived and actual properties of an element should suggest how to use it. A count labelled "REORDER: 4" implies action; adding a click affordance collapses the follow-up navigation into the same interaction.
- **Trade-off:** Clickable rows without an explicit label are not universally expected. Hover state and cursor change provide cues but are not self-describing.

### 14w. Forecast model insight panel — algorithmic transparency
- **Chosen:** Summary panel above the forecast table showing: Products Forecast, Dominant Model (most-selected by MAE with percentage), High Stockout Risk count, and a segmented model distribution bar.
- **Alternative:** No insight panel; model information available only as a per-row column.
- **Why chosen:** The per-row column requires scanning the entire table to understand model distribution. The insight panel performs this aggregation, answering "what is the system predominantly using?" at a glance. Satisfies algorithmic transparency (Diakopoulos, 2016) — the model selection process becomes a visible product signal.
- **Trade-off:** Does not include evaluation accuracy per model — combining model distribution with MASE scores would require additional API integration.

### 14x. Navigation section grouping — "Daily" and "Manager" tiers
- **Chosen:** "Daily" section label added above Overview nav link, pairing with the existing "Manager" label. Both use `.nav-section-label` (11px uppercase).
- **Alternative:** Flat 11-item list (previous state for the "Daily" group).
- **Why chosen:** An 11-item flat list exceeds working memory capacity (Miller, 1956 — 7±2 items). Grouping into two tiers of 5–6 reduces the search cost of navigation. Staff see only "Daily"; the "Manager" label is inside a Jinja2 conditional and absent from their DOM.
- **Trade-off:** "Daily" is a usage-frequency assumption that may not match every manager's workflow (some use Forecast daily).

→ **Dissertation chapter target: Chapter 4 (Interface Design Rationale — Sections 14r–14x)**

---

### Feature 16: Contextual empty states — error recovery through guided next actions

- **HCI principle:** Error recovery and recognition — Nielsen's heuristic 9: "Help users recognise, diagnose, and recover from errors" (Nielsen, 1994). An empty table is a system state that the user must interpret without guidance; the contextual empty state transforms that silent failure into an explicit, actionable message.
- **Design detail:** Each of the five data tabs (Inventory, Decisions, Forecast, Evaluation, Classification) renders a unique empty state panel when the API returns an empty array. The panel contains: a 64 px icon in a circular slate background, a 15 px bold title, a 13 px muted body, and a role-gated CTA. Manager CTAs link directly to the remediation action (e.g. "Upload CSV" navigates to the Upload tab; "Run Pipeline" triggers the forecast tab). Staff sees a plain-English note ("Ask your manager to upload inventory data") instead of a disabled button.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann. Norman, D. (2013). *The Design of Everyday Things* (revised ed.). Basic Books — principle of visibility.
- **Dissertation sentence:** "Contextual empty states implement Nielsen's (1994) ninth heuristic by converting a visually ambiguous blank table into a recovery path: each state names the missing data, explains the remedy, and provides a role-appropriate action button that removes the need to navigate independently."
- **Chapter:** 4.9 (interface rationale) and 5 (system walkthrough)

---

### Feature 17: Forecast tab visual enhancements — pre-attentive encoding for risk scanning

- **HCI principle:** Pre-attentive processing — Treisman and Gelade (1980) demonstrated that colour, orientation, size, and motion are detected by the visual system in parallel before conscious attention is directed. A miniature bar encodes stockout probability as length, a pre-attentive attribute, allowing managers to identify high-risk products by peripheral scan rather than sequential reading of percentages.
- **Design detail:** Three components replace plain-text coloured spans in the forecast table. `.trend-chip` is a pill badge (border-radius: 999px) with semantic background fill: green for INCREASING, red for DECREASING, slate for STABLE — converting a text direction label into a colour-coded signal. `.prob-gauge-wrap` renders a 6 px tall bar beneath the percentage label, with fill colour thresholded at ≥50% (critical/red), ≥20% (warning/amber), <20% (safe/green). `.demand-range` styles the 95% CI bounds as "lo – hi u/day" with bolded numerals and muted units text, separating data value from unit annotation.
- **Citation:** Treisman, A. M., & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology*, 12(1), 97–136.
- **Dissertation sentence:** "The probability gauge encodes stockout risk as a pre-attentive length attribute (Treisman & Gelade, 1980) in addition to the numeric percentage, reducing the visual search required to identify the highest-risk products from sequential reading to parallel scanning."
- **Chapter:** 4.9 (interface rationale)

---

### Feature 18: Expandable decision row brief — progressive disclosure of reasoning

- **HCI principle:** Progressive disclosure (Krug, 2014; Nielsen, 1993) — information should be revealed incrementally rather than presented all at once. Displaying all columns at all times competes for limited visual attention; disclosure-on-demand preserves table scannability while keeping full context one interaction away.
- **Design detail:** A `click` event on any decision row expands an accordion sub-row (`decision-brief-row`) with a three-column grid (Forecast Demand, 95% CI Range, Reorder Point) and a full-width reason card with an eucalyptus left border. Only one brief is open at a time. The chevron icon (›) in the final column rotates 90° via CSS `transform` when the row is open, giving a clear affordance that the row is interactive. The expand/collapse animation uses a `fadeInDown` keyframe (opacity 0→1, translateY −6px→0, 220 ms).
- **Citation:** Krug, S. (2014). *Don't Make Me Think, Revisited* (3rd ed.). New Riders. Nielsen, J. (1993). *Usability Engineering*. AP Professional.
- **Dissertation sentence:** "The expandable decision brief applies progressive disclosure (Krug, 2014) to the decisions table: the core action (REORDER / HOLD) is always visible, but the supporting rationale — forecast demand, confidence interval, and plain-English reason — is revealed on demand, preventing information overload without sacrificing transparency."
- **Chapter:** 4.9 (interface rationale) and 2.x (DSS explainability)

---

### Feature 19: Upload pipeline progress indicator — system status visibility

- **HCI principle:** Visibility of system status — Nielsen's first usability heuristic (1994): "The system should always keep users informed about what is going on, through appropriate feedback within reasonable time." For operations exceeding 1 second, a progress indicator is required to prevent user uncertainty (Miller, 1968).
- **Design detail:** `simulatePipelineProgress()` renders a six-stage stepped indicator (Uploading → Validating → Cleaning → Updating inventory → Running forecast → Generating decisions → Finalising) with a branded solid green progress bar and percentage readout. Each stage activates sequentially via `setTimeout` with cumulative delays tuned to a typical pipeline duration (~3 seconds). Each step has a coloured dot (green when active, green when done, red on error) that changes state via CSS class toggling rather than style mutation, ensuring design-system consistency. On completion `stop(success)` is called from the upload `fetch` resolution, synchronising the visual state with the real outcome before auto-hiding at 2 seconds.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann. Miller, R. B. (1968). Response time in man-computer conversational transactions. *Proceedings of the AFIPS Fall Joint Computer Conference*, 33, 267–277.
- **Dissertation sentence:** "The pipeline progress indicator satisfies Nielsen's (1994) first heuristic — visibility of system status — by decomposing an opaque multi-second server operation into named, sequentially activating stages, preventing premature re-submission and reducing the perceived wait time through visible forward progress (Miller, 1968)."
- **Chapter:** 4.9 (interface rationale) and 5 (upload walkthrough)

---

### Feature 20: Post-onboarding welcome banner — first-use guidance and wayfinding

- **HCI principle:** Onboarding and learnability — Norman's (2013) principle that affordances must be visible to be used; Schneiderman's (2016) "golden rules" include supporting internal locus of control and reducing short-term memory load. A first-time user of an empty dashboard has no visible affordance for the correct next action.
- **Design detail:** `is_first_visit` is determined server-side by counting rows in `upload_log` for the company. When the count is zero and `sessionStorage.welcome_dismissed` is unset, `renderWelcomeBanner()` inserts a full-width gradient panel (eucalyptus green) at the top of the Overview tab. It contains: a personalised greeting (`window.STOCKLENS_USER_NAME` injected from Jinja2), a role-specific subtitle, and three quick-action step chips that call `switchTab()` on click. The dismiss animation uses CSS `opacity` and `transform` transitions (250 ms) before DOM removal, making the state change feel intentional rather than abrupt. The dismissed state is stored in `sessionStorage` (tab-session scope) rather than `localStorage` (persistent), so the banner reappears on the next fresh login if no upload has yet been made.
- **Citation:** Norman, D. (2013). *The Design of Everyday Things* (revised ed.). Basic Books. Shneiderman, B., Plaisant, C., Cohen, M., Jacobs, S., & Elmqvist, N. (2016). *Designing the User Interface* (6th ed.). Pearson.
- **Dissertation sentence:** "The welcome banner resolves the cold-start problem (Norman, 2013) by making the correct first action visible to a manager who has never used the system: rather than leaving the user to discover the upload flow through navigation, the banner surfaces the three-step workflow inline and removes itself once it is no longer needed."
- **Chapter:** 4.9 (interface rationale) and 5 (onboarding walkthrough)

---

### Feature 21: HOLD badge semantic neutrality — colour meaning consistency

- **HCI principle:** Consistency and standards — Nielsen's fourth heuristic (1994): "Users should not have to wonder whether different words, situations, or actions mean the same thing." Using the primary accent colour (Green #3D8565) for a HOLD badge — meaning "no action required" — creates a semantic inconsistency with interactive elements (buttons, active nav links) that also use green to signal "you can click here."
- **Design detail:** `.badge-hold` is set to `background: #F1F5F9; color: #475569` (neutral slate), matching the passive, no-action semantic of the HOLD state. This maintains the two-layer colour rule from Section 14i: brand eucalyptus green is reserved for interactive UI chrome; semantic colours (red, amber, slate, green) carry data meaning. Dark mode variant: `background: #1E293B; color: #94A3B8`. The fix required changing a single CSS rule, but its impact spans every decision row and every overview breakdown item.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann.
- **Dissertation sentence:** "Restoring semantic neutrality to the HOLD badge — replacing accent green with neutral slate — eliminates a colour-meaning inconsistency (Nielsen, 1994) that would have caused managers to associate the HOLD state with interactive urgency rather than passive stability, potentially triggering unnecessary reorder actions."
- **Chapter:** 4.9 (interface rationale) and 3 (design decisions)

→ **Dissertation chapter target: Chapter 4 (Section 4.9 — Interface Design Rationale)**

---

### Feature 22: Data freshness signal — system currency at decision point

- **HCI principle:** Visibility of system status — Nielsen's first usability heuristic (1994). The user should always be informed about what is going on in the system through appropriate feedback within reasonable time.
- **Design detail:** A status pill above the KPI grid reads "Forecast last run: Xh ago" / "Xd ago". When ≥3 days have elapsed, the pill turns amber (semantic warning colour `#F59E0B`), adds bold "data may be outdated" text, and — for managers — an inline "Re-run forecast" text link. Timestamp computed client-side from `last_forecast_run` returned by `/api/overview`. The freshness bar has a `.stale` CSS modifier class.
- **Citation:** Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann.
- **Dissertation sentence:** "The data freshness signal resolves a critical visibility gap: a manager reviewing KPI values on a stale dataset cannot make accurate ordering decisions. By displaying the forecast age immediately above the KPIs — at the exact point of decision — and warning in amber when data is ≥3 days old, the system satisfies Nielsen's (1994) first heuristic without requiring the user to navigate away to check system state."
- **Chapter:** 4.9 (interface rationale) and 5 (dashboard walkthrough)

---

### Feature 23: KPI count-up session guard — eliminating redundant animation

- **HCI principle:** Cognitive load theory — extraneous cognitive load (Sweller, 1988). Repeated animations with no new information content consume attentional resources without benefit, competing with the user's focus on the data values themselves.
- **Design detail:** A `sessionStorage.kpi_animated` flag is written after the first count-up animation completes. All subsequent `animateCount()` calls in the same session skip the interval-based animation and set the element's `textContent` directly. The flag is erased on logout via `sessionStorage.clear()`, so the next session's first Overview load triggers the animation again.
- **Citation:** Sweller, J. (1988). "Cognitive load during problem solving: Effects on learning." *Cognitive Science*, 12(2), 257–285.
- **Dissertation sentence:** "The session-scoped animation guard eliminates a source of extraneous cognitive load (Sweller, 1988): the count-up animation signals data freshness on first encounter, but when re-triggered on every tab return it competes with the user's attention on the numbers themselves — the guard preserves the first-impression benefit while removing the recurring attentional cost."
- **Chapter:** 4.9 (interface rationale) and 7.5 (usability discussion)

---

### Feature 24: REORDER row static border — purposeful use of motion

- **HCI principle:** Signal-to-noise ratio in visual design — Tufte's (2001) principle of data-ink ratio generalised to animation: motion that carries no additional information beyond the static state should be removed. Animated elements that are always visible create a permanently elevated "noise floor" that the visual system must continuously suppress.
- **Design detail:** REORDER rows now carry a `box-shadow: inset 3px 0 0 #DC2626` left border on the first `<td>` and a `rgba(220,38,38,0.032)` background tint. Hover deepens to `rgba(220,38,38,0.07)`. The previous `pulse-glow 2.4s ease-in-out infinite` animation is removed entirely. Colour alone (a pre-attentive feature per Treisman & Gelade, 1980) is sufficient for row differentiation.
- **Citation:** Tufte, E. (2001). *The Visual Display of Quantitative Information* (2nd ed.). Graphics Press. Treisman, A. & Gelade, G. (1980). "A feature-integration theory of attention." *Cognitive Psychology*, 12(1), 97–136.
- **Dissertation sentence:** "Replacing the infinite pulse-glow animation with a static red left border reduces the visual noise floor of the decisions table (Tufte, 2001) — colour remains a pre-attentive differentiator (Treisman & Gelade, 1980) without the continuous motion that prevents users from reading non-urgent rows without distraction."
- **Chapter:** 4.9 (interface rationale) and 7.5 (usability discussion)

---

### Feature 25: Scenario verdict — explanation over bare numbers

- **HCI principle:** Cognitive load reduction through synthesis — Turban et al.'s (2011) DSS design principle that a system should advise, not merely report. Presenting raw numbers transfers the interpretation task to the user; synthesising them into a verdict transfers cognitive work to the system.
- **Design detail:** After a simulation runs, `runCustomScenario()` computes a colour-coded verdict block (`.scenario-verdict`, border-left 4px). Green verdict if `stockout_reduction > 0`, red if negative, slate if zero. Verdict text names the total stockout-days prevented, percentage improvement, and the 3 most exposed products. Written in assertive language: "The StockLens system prevents X stockout-days — maintain current policy."
- **Citation:** Turban, E., Sharda, R. & Delen, D. (2011). *Decision Support and Business Intelligence Systems* (9th ed.). Pearson. Norman, D. (2013). *The Design of Everyday Things* (revised ed.). Basic Books.
- **Dissertation sentence:** "The scenario verdict block converts a raw number comparison into an explicit recommendation, following Turban et al.'s (2011) principle that a DSS should synthesise data into actionable advice — a manager reading 'prevents 8 stockout-days (40% reduction)' receives an immediately interpretable conclusion rather than having to perform the comparison themselves."
- **Chapter:** 4.9 (interface rationale) and 5 (scenario module walkthrough)

---

### Feature 26: Clickable breakdown cards — affordance at the point of information

- **HCI principle:** Affordance and direct manipulation — Norman's (2013) principle that the perceived and actual properties of an interface element should suggest how to use it. An information panel that shows "REORDER: 4" implies an action but provides no mechanism for it.
- **Design detail:** Both Decision Breakdown and Risk Overview cards have a "View all →" / "View inventory →" header link (`.card-nav-link`). Each badge-count row has class `.breakdown-row--link` with `cursor:pointer`, eucalyptus hover (`var(--accent-light)` background), and an `onclick` calling `switchTab()`. The hover background is the first visual affordance of interactivity; the cursor change confirms it.
- **Citation:** Norman, D. (2013). *The Design of Everyday Things* (revised ed.). Basic Books.
- **Dissertation sentence:** "Making each breakdown row a navigation affordance applies Norman's (2013) principle of perceived affordance: a manager who sees 'REORDER: 4' and wants to act can click the row directly rather than having to locate and activate a separate navigation element, collapsing a two-step interaction into one."
- **Chapter:** 4.9 (interface rationale) and 5 (overview walkthrough)

---

### Feature 27: Forecast model insight panel — making algorithmic depth visible

- **HCI principle:** Transparency and explainability in algorithmic systems — Diakopoulos (2016) on algorithmic accountability. Users cannot trust or appropriately calibrate their reliance on a system whose internal workings are invisible.
- **Design detail:** A four-metric summary panel above the forecast table shows: Products Forecast, Dominant Model (most frequently selected by MAE with percentage), High Stockout Risk count, and a segmented model distribution bar. The distribution bar uses four distinct colours (Mid Green=SMA, Slate=WMA, Green=SES, Amber=Holt). Computed client-side from the forecast API response already in memory — no additional API call.
- **Citation:** Diakopoulos, N. (2016). "Accountability in algorithmic decision making." *Communications of the ACM*, 59(2), 56–62. DOI: 10.1145/2844110
- **Dissertation sentence:** "The model insight panel makes the automatic model selection visible — a manager who sees 'Dominant Model: Holt (62%)' understands that most products have directional demand trends, turning an invisible algorithm into a meaningful business signal and satisfying the principle of algorithmic transparency (Diakopoulos, 2016)."
- **Chapter:** 4.9 (interface rationale) and 2.x (literature review — algorithmic accountability in DSS)

---

### Feature 28: Navigation section labels — two-tier cognitive grouping

- **HCI principle:** Chunking and working memory capacity — Miller (1956) established that working memory holds 7±2 items. An 11-item flat navigation list exceeds this limit; dividing into two labelled groups of 5 and 6 reduces the cognitive effort of navigation.
- **Design detail:** A "Daily" section label (`.nav-section-label`, 11px uppercase, `--text-muted`) is added above the Overview link. It pairs with the existing "Manager" label that already prefixes the analytical tabs. Both labels are styled identically. Staff see only the "Daily" group (Jinja2 conditional removes "Manager" section entirely). The section labels do not affect tab behaviour — they are purely informational `<li>` elements.
- **Citation:** Miller, G. A. (1956). "The magical number seven, plus or minus two: Some limits on our capacity for processing information." *Psychological Review*, 63(2), 81–97. DOI: 10.1037/h0043158
- **Dissertation sentence:** "Grouping the 11 navigation items into two labelled tiers ('Daily' and 'Manager') applies Miller's (1956) chunking principle — a user navigating to a specific tab must search a group of 5–6 items rather than an undifferentiated list of 11, reducing the working memory load of navigation."
- **Chapter:** 4.9 (interface rationale) and 5 (navigation design)

→ **Dissertation chapter target: Chapter 4 (Section 4.9 — Interface Design Rationale)**

---

## Verification Checklist

- [x] Every bullet tagged [CONFIRMED], [INFERRED], or [UNCERTAIN]
- [x] No legacy files (forecast.py, script.js, index.html) described as current system behaviour
- [x] Every section ends with dissertation chapter target note
- [x] No fabricated features — all confirmed against active codebase files
- [x] Design decisions section (14a–14x) covers what / alternative / why / trade-off for all 24 decisions (original 10 + 6 V1 UX enhancements + 7 audit gap-fixes + HOLD badge fix)
- [x] Section 14k covers the full front-end design system: colour palette (brand + semantic + neutral), typography scale, layout measurements, border radius tokens, shadow system, animation system (easing, durations, keyframe catalogue, stagger delays, reduced-motion), responsive breakpoints, and component specifications (badges, tables, KPI icons, nav, buttons, auth card)
- [x] HCI theory mapping (Section 22) now covers 28 interface features, each with principle, citation, and dissertation sentence
- [x] Sections 5a, 5b, 5c, 5d, 5f updated to reflect current implementation: freshness signal, pipeline progress, model insight panel, expandable decision row, scenario verdict, static REORDER border, session-guarded count-up
- [x] Section 13 Interface updated: animation system now documents session-guarded count-up and static REORDER row border; colour separation section updated to include slate for HOLD
- [x] Feature 2 (REORDER rows) updated in Section 22: pulse-glow animation removed, static left border + tint documented with correct HCI rationale
- [x] Feature 3 (KPI count-up) updated in Section 22: session guard documented with dual citation (Nielsen heuristic 1 + Sweller cognitive load)
- [x] Section 16 Known Limitations updated: synchronous pipeline blocking now notes frontend progress indicator mitigation and its limitation (simulated timeline, not server-driven)
- [x] Limitations section is honest and specific, not defensive
- [x] Section 10 UNCERTAIN bullet (aggregate evaluation) resolved to [CONFIRMED]: fleet averages computed client-side via JS Array.reduce() in loadEvaluation()
- [x] New features (Urgent Actions, Smart Recommendations, sidebar badge, KPI trends, Recent Activity) documented in sections 5a, 14j, 14k, and 22 (Features 11–15)
- [x] V1 UX Enhancement features (empty states, forecast chips, expandable decisions, HOLD badge fix, pipeline progress, welcome banner) documented in sections 14l–14q and 22 (Features 16–21)
- [x] Audit gap-fix features (freshness signal, session count-up, static REORDER row, scenario verdict, actionable breakdowns, model insight panel, nav grouping) documented in sections 14r–14x and 22 (Features 22–28)
- [x] Diakopoulos (2016) and Miller (1956) added as new citations in Section 22 (Features 27 and 28)
- [x] Section 11 simulation limitation includes placeholder sentence for CV quantification — fill in [X_min], [X_max], and [N] from ABC-XYZ output before submission
- [x] Section 17 citations: each entry marked VERIFIED or VERIFY with exact DOIs; Ramdani and Power citations flagged for library catalogue confirmation
- [x] Section 17 Teerasoponpong citation: two candidate papers listed — open both DOIs to confirm before citing
- [x] Sections 6.6 and 6.7 blocked with ⛔ warnings — must not be written until usability sessions (Section 20) are executed
- [x] Section 19: Conceptual framework grounded in 6 real sources (Hevner 2004, Makridakis 2008/2020, Silver/Pyke/Thomas 2016, Teerasoponpong 2022 — pending DOI verification, Arnott/Pervan 2014, Bertsimas/Kallus 2020)
- [x] Section 20: Usability protocol includes SUS 10-item instrument, think-aloud instructions, recording sheet, ethical consent requirements, and analysis plan
- [x] Section 21: Chapter 6 outline specifies data, table structure, chart type, what each section proves, and good/poor result thresholds for all three RQs
- [x] Section 22: 28 interface features each mapped to a named principle, verifiable citation, dissertation-ready sentence, and target chapter/section

---

*Document generated from codebase inspection of:*
- `src/core/app.py`, `config.py`, `database.py`, `auth_utils.py`
- `src/core/routes/pages.py`, `auth.py`, `api.py`, `onboarding.py`, `admin.py`
- `src/core/services/forecast_service.py`, `decision_service.py`, `evaluation_service.py`, `scenario_service.py`, `abc_xyz_service.py`
- `src/core/static/js/app.js`, `charts.js`, `translations.js`
- `src/core/static/css/style.css`
- `src/core/templates/dashboard.html`, `login.html`, `register.html`, `onboarding.html`
- `run.py`
