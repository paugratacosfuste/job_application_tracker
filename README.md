<div align="center">

# 🎯 Job Application Tracker

**Take control of your job search with an intelligent, all-in-one tracking dashboard.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<!-- Add a screenshot of your app here -->
<!-- ![App Screenshot](docs/assets/screenshot.png) -->

[Features](#-features) · [Quick Start](#-quick-start) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Roadmap](#-roadmap)

</div>

---

## 💡 The Problem

Job hunting is chaotic. You apply on LinkedIn, hear back on email, track deadlines in your head, and lose track of where you stand with each company. Spreadsheets don't scale, and most job trackers are either too simple or bloated with features you don't need.

**Job Application Tracker** is a self-hosted, privacy-first dashboard that brings order to your job search. Paste a job URL and let AI extract the details. Drag applications through your pipeline on a Kanban board. Spot trends in your analytics dashboard. Never miss a follow-up with the calendar view.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📋 **Kanban Board** | Drag-and-drop applications across pipeline stages — from *Saved* all the way to *Accepted* |
| 📊 **Analytics Dashboard** | Charts for status breakdown, response rate, salary distribution, time-per-stage, source effectiveness, and more |
| 📅 **Calendar View** | Visualize interviews, follow-ups, and deadlines with Google Calendar integration |
| 📑 **Table View** | Sortable, filterable data table with bulk actions and pagination |
| 🤖 **AI Job Parser** | Paste a URL or job description — Claude extracts company, title, salary, location, requirements, and tags automatically |
| 🏷️ **Tag System** | Create, edit, merge, and assign skill/requirement tags to organize applications |
| 📤 **Import / Export** | CSV and JSON export; CSV import to migrate from spreadsheets |
| 🌙 **Dark Mode** | Toggle between light and dark themes, persisted across sessions |
| ⌨️ **Keyboard Shortcuts** | `N` new · `K` kanban · `T` table · `D` dashboard · `C` calendar · `S` settings |

### Application Pipeline

```
Saved → Applied → Phone Screen → Technical → Final Round → Offer → Accepted
                                                                  → Rejected
                                                         → Withdrawn (any stage)
```

Every status transition is logged with a timestamp and optional notes, giving you a full history of each application.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **npm**

### 1. Clone the repository

```bash
git clone https://github.com/your-username/job-application-tracker.git
cd job-application-tracker
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your [Anthropic API key](https://console.anthropic.com/) (required for the AI parsing feature):

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

> **Tip:** You can also set the API key later from the Settings page in the UI.

### 4. Start the development server

```bash
npm run dev
```

This launches both the frontend ([http://localhost:5173](http://localhost:5173)) and the API server ([http://localhost:3001](http://localhost:3001)) concurrently.

### 5. (Optional) Seed sample data

```bash
cd server && npm run seed
```

### Production Build

```bash
npm run build        # Builds client → client/dist/  &  server → server/dist/
cd server && npm start  # Start production server
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| [React](https://react.dev/) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | Type safety |
| [Vite](https://vite.dev/) | 7 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling with custom HSL theme |
| [React Router](https://reactrouter.com/) | 7 | Client-side routing |
| [TanStack Table](https://tanstack.com/table) | 8 | Headless data table (sort, filter, paginate) |
| [dnd-kit](https://dndkit.com/) | 6 | Drag-and-drop primitives for Kanban |
| [Recharts](https://recharts.org/) | 3 | Composable chart library |
| [Lucide](https://lucide.dev/) | — | Icon library |
| [Sonner](https://sonner.emilkowal.ski/) | 2 | Toast notifications |
| [date-fns](https://date-fns.org/) | 4 | Date utilities |

### Backend

| Technology | Version | Role |
|---|---|---|
| [Express](https://expressjs.com/) | 4 | REST API server |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Type safety |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11 | SQLite driver with WAL mode |
| [Anthropic SDK](https://docs.anthropic.com/) | 0.39 | Claude API for AI parsing |
| [Cheerio](https://cheerio.js.org/) | 1 | HTML scraping for URL-based parsing |
| [Multer](https://github.com/expressjs/multer) | 1.4 | File upload handling (CSV import) |

### Database

- **SQLite** with WAL (Write-Ahead Logging) for concurrent read/write
- Foreign key constraints enabled
- Schema auto-migrates on server startup

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│                     http://localhost:5173                        │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐         │
│  │  Kanban   │ │  Table   │ │ Dashboard │ │ Calendar │  ...    │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘         │
│       └─────────────┴─────────────┴─────────────┘               │
│                         │  API calls                            │
└─────────────────────────┼───────────────────────────────────────┘
                          │  Vite proxy /api → :3001
┌─────────────────────────┼───────────────────────────────────────┐
│                    Server (Express)                              │
│                  http://localhost:3001                           │
│                                                                 │
│  ┌──────────────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌──────────┐ │
│  │ applications │ │ parse │ │ tags  │ │ stats  │ │ settings │ │
│  └──────┬───────┘ └───┬───┘ └───┬───┘ └───┬────┘ └────┬─────┘ │
│         └─────────────┴─────────┴─────────┴────────────┘       │
│                          │                                      │
│                    ┌─────┴─────┐       ┌───────────────┐       │
│                    │  SQLite   │       │  Claude API   │       │
│                    │  data.db  │       │  (Anthropic)  │       │
│                    └───────────┘       └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
job_application_follower/
│
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                      # Reusable UI primitives (Button, Card, Dialog…)
│   │   │   ├── KanbanBoard.tsx          # Drag-and-drop Kanban view
│   │   │   ├── TableView.tsx            # Data table with bulk actions
│   │   │   ├── Dashboard.tsx            # Analytics charts and stats
│   │   │   ├── CalendarView.tsx         # Calendar with event management
│   │   │   ├── SettingsPage.tsx         # API key, tags, import/export
│   │   │   ├── ApplicationDetail.tsx    # Full application editor + history
│   │   │   └── AddApplicationModal.tsx  # New application with AI parsing
│   │   ├── lib/                         # API client, constants, utilities
│   │   └── types/                       # TypeScript interfaces
│   ├── vite.config.ts                   # Vite config (proxy /api → :3001)
│   └── package.json
│
├── server/                              # Express REST API
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts             # SQLite connection (WAL, foreign keys)
│   │   │   ├── migrate.ts              # Auto-migration on startup
│   │   │   └── seed.ts                 # Sample data for development
│   │   ├── routes/
│   │   │   ├── applications.ts         # CRUD + bulk ops + status transitions
│   │   │   ├── parse.ts                # Claude-powered job extraction
│   │   │   ├── tags.ts                 # Tag CRUD + merge
│   │   │   ├── stats.ts                # Analytics aggregation
│   │   │   ├── export.ts               # CSV/JSON export & CSV import
│   │   │   └── settings.ts             # API key + data management
│   │   └── index.ts                    # Express app entry point
│   ├── .env.example                    # Environment template
│   └── package.json
│
├── package.json                         # Root: dev, build, install:all
├── LICENSE                              # MIT License
└── .gitignore
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

<details>
<summary><strong>Applications</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/applications` | List applications (query: `status`, `priority`, `work_mode`, `search`, `tag`, `sort`) |
| `GET` | `/applications/calendar-events` | Applications with status history for calendar |
| `GET` | `/applications/:id` | Application detail with tags and status history |
| `POST` | `/applications` | Create application |
| `PUT` | `/applications/:id` | Update application |
| `DELETE` | `/applications/:id` | Delete application |
| `PATCH` | `/applications/:id/status` | Transition status (logged to history) |
| `POST` | `/applications/bulk-delete` | Delete multiple by IDs |
| `POST` | `/applications/bulk-status` | Batch status update |

</details>

<details>
<summary><strong>Parse (AI)</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/parse/url` | Scrape URL and extract job details via Claude |
| `POST` | `/parse/text` | Extract job details from pasted text (max 8 KB) |

**Returns:** company name, job title, salary range, location, work mode, requirements/tags, seniority level, confidence score.

</details>

<details>
<summary><strong>Tags</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tags` | List tags with usage count |
| `POST` | `/tags` | Create tag |
| `PUT` | `/tags/:id` | Rename tag |
| `DELETE` | `/tags/:id` | Delete tag |
| `POST` | `/tags/merge` | Merge source tag into target |

</details>

<details>
<summary><strong>Statistics</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stats` | Aggregate analytics (query: `from`, `to` for date range) |

**Returns:** total count, by-status breakdown, response rate, average salary, active count, timeline, salary distribution, avg days per stage, top tags, source effectiveness.

</details>

<details>
<summary><strong>Export / Import</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/export/csv` | Download all applications as CSV |
| `GET` | `/export/json` | Download all applications as JSON |
| `POST` | `/import/csv` | Import from CSV (`multipart/form-data`) |

</details>

<details>
<summary><strong>Settings</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/settings/api-key-status` | Check API key status (masked) |
| `POST` | `/settings/api-key` | Set or update Anthropic API key |
| `POST` | `/settings/clear-data` | Wipe all applications, tags, and history |

</details>

---

## 🗄️ Database Schema

<details>
<summary><strong>applications</strong> — Core table for job applications</summary>

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `company_name` | TEXT | NOT NULL |
| `company_website` | TEXT | — |
| `company_size` | TEXT | CHECK: `startup`, `mid`, `enterprise` |
| `job_title` | TEXT | NOT NULL |
| `job_url` | TEXT | — |
| `job_description_raw` | TEXT | — |
| `salary_min` / `salary_max` | INTEGER | — |
| `salary_currency` | TEXT | DEFAULT `'EUR'` |
| `compensation_type` | TEXT | CHECK: `annual`, `hourly`, `contract` |
| `location_city` / `location_country` | TEXT | — |
| `work_mode` | TEXT | CHECK: `remote`, `hybrid`, `on-site` |
| `status` | TEXT | DEFAULT `'saved'` — 9 valid statuses |
| `date_applied` / `date_added` | TEXT | ISO 8601 timestamps |
| `match_score` | INTEGER | CHECK: 1–5 |
| `source` | TEXT | CHECK: `linkedin`, `indeed`, `company_site`, `referral`, `job_board`, `other` |
| `contact_name` / `contact_email` / `contact_role` | TEXT | — |
| `notes` | TEXT | — |
| `priority` | TEXT | DEFAULT `'medium'`; CHECK: `high`, `medium`, `low` |
| `follow_up_date` | TEXT | — |
| `resume_version` / `cover_letter_notes` | TEXT | — |

</details>

<details>
<summary><strong>status_history</strong> — Audit log for every status change</summary>

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `application_id` | INTEGER | FK → `applications(id)` ON DELETE CASCADE |
| `from_status` | TEXT | — |
| `to_status` | TEXT | — |
| `changed_at` | TEXT | DEFAULT `CURRENT_TIMESTAMP` |
| `notes` | TEXT | — |

</details>

<details>
<summary><strong>tags</strong> + <strong>application_tags</strong> — Many-to-many tagging</summary>

**tags**

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `name` | TEXT | UNIQUE NOT NULL |

**application_tags** (junction)

| Column | Type | Constraints |
|---|---|---|
| `application_id` | INTEGER | FK → `applications(id)` ON DELETE CASCADE |
| `tag_id` | INTEGER | FK → `tags(id)` ON DELETE CASCADE |
| | | PRIMARY KEY (`application_id`, `tag_id`) |

</details>

---

## 🎨 Theming

Custom color palette using HSL CSS variables for full control:

| Token | Light | Dark |
|---|---|---|
| Primary (Navy) | `#102542` | adjusted |
| Accent (Blue) | `#489FB5` | adjusted |
| Warning (Orange) | `#FFA62B` | adjusted |
| Destructive (Red) | `#E53D00` | adjusted |
| Success (Green) | `#7CB518` | adjusted |

Theme preference is stored in `localStorage` and toggled via the header.

---

## 📱 Responsive Design

- **Desktop** — Fixed collapsible sidebar navigation
- **Mobile** — Full-screen hamburger menu overlay
- **Breakpoint** — Tailwind `md:` (768px)

---

## 🗺️ Roadmap

Planned features for upcoming releases:

- [ ] **User Authentication** — Multi-user support with login/signup and per-user data isolation
- [ ] **Email Notifications** — Automated reminders for follow-ups and upcoming interviews
- [ ] **Browser Extension** — One-click save from job boards (LinkedIn, Indeed, etc.) directly into the tracker
- [ ] **Resume Attachment Storage** — Upload and link resume/cover letter versions to each application

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ to bring order to the job search.

</div>
