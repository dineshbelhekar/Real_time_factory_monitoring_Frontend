# 🏭 Factory Monitoring Dashboard — Frontend

A React dashboard for the [Real-Time MQTT-Based Factory Monitoring System](https://github.com/dineshbelhekar/Real-Time_MQTT_Based_Factory_Monitoring_System) backend. It gives five different factory roles — Admin, Plant Manager, Department Manager, Operator, and Maintenance Technician — a live, role-specific view of machine health, production, and maintenance activity, backed by JWT authentication and a resilient real-time data layer.

---

## 🚀 Overview

The backend streams live machine telemetry over MQTT and exposes it through REST APIs and a WebSocket/STOMP channel, scoped per user role and department. This frontend is the client that:

- Authenticates users and routes them to the correct dashboard based on the role returned by the backend.
- Subscribes to the WebSocket channel for live, sub-5-second machine updates.
- **Automatically falls back to REST polling** if the WebSocket connection can't be established or drops, so the dashboard stays usable even on flaky networks — and switches back to WebSocket transparently once it recovers.
- Lets Admins manage employees, Plant/Department Managers monitor machine and power data at different scopes, Operators watch their assigned machines, and Technicians respond to maintenance alerts in real time.

---

## 🧩 Key Features

### 🔐 Authentication & Routing
- Login form collects username, employee ID, and password and posts to the backend's `/user/login`, which returns a raw JWT.
- The JWT is decoded client-side (no server round-trip) to read the username for display, and is attached as a `Bearer` token to every subsequent REST call and WebSocket `CONNECT` frame.
- A `ProtectedRoute` wrapper checks for a stored token on load; if present, it calls `/general/role` to validate the token and fetch the user's role, storing it in `localStorage`. An invalid/expired token clears storage and redirects to login — no dashboard is rendered until the role check resolves.
- Role returned by the backend (`ADMIN`, `PLANTMANAGER`, `DEPTMANAGER`, `OPERATOR`, `TECHNICIAN`) determines which dashboard component is rendered; an unrecognized role shows a friendly "no dashboard configured" screen instead of crashing.

### 📡 Resilient Real-Time Data Layer
- Live views (Plant Manager, Department Manager, Operator, Maintenance) connect to the backend's STOMP endpoint over SockJS and subscribe to `/user/queue/messages`.
- **Automatic WebSocket → REST fallback:** if the socket fails to connect (or errors out) 3 times in a row, the dashboard switches to REST polling (every 30 seconds) and shows a "REST fallback" status badge — then automatically reconnects to WebSocket in the background and switches back once it succeeds.
- A shared script loader (`wsLoader.js`) loads the SockJS/STOMP client libraries from CDN once and reuses them across every dashboard component, avoiding duplicate script injection.
- Incoming pushes are diffed against the previous snapshot so only genuinely changed machines are highlighted, and machines that stop appearing in a push are marked stopped rather than silently disappearing.

### 🛠️ Live Maintenance Workflow (Technician view)
- Technicians receive maintenance alerts pushed in real time the moment the backend detects a machine failure.
- An in-progress job shows a running elapsed-time timer computed from the original `acceptedAt` timestamp (so it stays accurate even if the tab is backgrounded or switched), with **Accept** and **Complete** actions wired directly to the backend's maintenance endpoints.

### 👥 Role-Specific Dashboards
| Role | Capabilities |
|---|---|
| **Admin** | Full employee directory — add, edit, delete, and assign department/role/designation to employees |
| **Plant Manager** | Plant-wide live machine data, plant/department/machine historical data, full employee list |
| **Department Manager** | Live data, historical machine data, and employee list scoped to their own department |
| **Operator** | Live view of their assigned machines only, with running/stopped KPIs and production/current/voltage readouts |
| **Technician (Maintenance)** | Real-time failure alerts, accept/complete maintenance actions, active job timer |

### 🎨 UI/UX
- Each role has its own themed dashboard (distinct color palettes, layouts, and status indicators) built with plain CSS per component rather than a shared generic template.
- Live connection status (Connected / Connecting / REST fallback) is always visible so users know whether they're seeing true real-time data or 30-second polled data.
- Search and filter controls (by machine ID, running/stopped condition, department) on live-data views.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| UI library | React 19 |
| Build tool | Vite |
| Real-time transport | SockJS + STOMP (`@stomp/stompjs`, `sockjs-client`, `stompjs`, loaded via CDN at runtime) |
| Charts | Recharts |
| Linting | ESLint (React Hooks + Refresh plugins) |
| Auth | JWT (decoded client-side, no external JWT library needed) |

> Note: `@stomp/stompjs` and `react-use-websocket` are listed as dependencies, but the live dashboards currently use the CDN-loaded `window.SockJS` / `window.Stomp` client (see `wsLoader.js`) rather than the npm packages directly.

---

## 📦 Project Structure

```
src/
├── App.jsx                     Role-based routing after login
├── main.jsx                    App entry point
├── components/
│   ├── Login/                  Login page, form UI, background effects
│   ├── ProtectedRoute.jsx      Token/role verification gate
│   ├── Admin/                  Employee management dashboard
│   ├── PlantManager/           Plant-wide dashboard + sections (live data, machine data, department data, plant data, employees)
│   ├── DeptManager/             Department-scoped dashboard + sections
│   ├── Operator/                Assigned-machines live view
│   └── maintenance/             Technician alert & job-tracking dashboard
├── api/                         Thin fetch wrappers per role (admin, auth, dept, plant, maintenance)
├── hooks/
│   └── useLoginForm.js          Login form state, validation, and submit handling
└── utils/
    └── wsLoader.js              Shared SockJS/STOMP script loader (loads once, reused everywhere)
```

---

## ⚙️ How It Works — Data Flow

1. **Login** — User submits credentials → `POST /user/login` → backend returns a raw JWT → stored in `localStorage`.
2. **Role check** — `ProtectedRoute` calls `GET /general/role` with the JWT → backend returns the user's role → stored in `localStorage` → `App.jsx` renders the matching dashboard.
3. **Live connection** — The dashboard opens a SockJS connection to `/ws`, sends the JWT in the STOMP `CONNECT` header, and subscribes to `/user/queue/messages`.
4. **Live updates** — The backend pushes department/machine-scoped data every ~2 seconds; the dashboard diffs it against the previous state to highlight changes and updates KPIs.
5. **Fallback** — If the socket can't connect after 3 attempts, the dashboard switches to calling the equivalent REST endpoint (e.g. `getLiveData`) every 30 seconds, and keeps retrying the WebSocket connection in the background.
6. **Actions** — Role-specific actions (add/edit/delete employee, accept/complete maintenance alert) call the corresponding REST endpoint directly with the stored JWT attached.

---

## ▶️ Running the Project

**1. Clone the repository**
```bash
git clone https://github.com/dineshbelhekar/Real_time_factory_monitoring_Frontend.git
cd Real_time_factory_monitoring_Frontend
```

**2. Install dependencies**
```bash
npm install
```

**3. Point the app at your backend**

The API base URLs are currently hardcoded per file (e.g. `src/api/plantApi.js`, `src/api/authApi.js`, the `WS_URL` constants in the live-data components). Update these to your backend's URL, for example:
```js
const BASE_URL = "http://localhost:8080";
const WS_URL   = "http://localhost:8080/ws";
```

**4. Run the dev server**
```bash
npm run dev
```

**5. Build for production**
```bash
npm run build
npm run preview
```

---

## 📈 Future Improvements

- Move hardcoded backend URLs into environment variables (`.env` + `import.meta.env`) instead of per-file constants
- Replace the CDN-loaded SockJS/STOMP globals with the already-installed `@stomp/stompjs` npm package for a more standard, bundler-friendly setup
- Add automated tests (component + integration) for the auth flow and WebSocket fallback logic
- Add a shared design system/theme instead of per-dashboard CSS files
- Handle JWT expiry proactively (e.g. refresh or redirect before a request fails) rather than only reacting to a rejected request
- Add pagination/virtualization for the employee and machine-history tables as data volume grows

---

## 🔗 Related

- Backend: [Real-Time_MQTT_Based_Factory_Monitoring_System](https://github.com/dineshbelhekar/Real-Time_MQTT_Based_Factory_Monitoring_System) — Spring Boot + MQTT + MySQL + Redis backend this dashboard connects to.

---

## 👨‍💻 Author

**Dinesh Belhekar**
