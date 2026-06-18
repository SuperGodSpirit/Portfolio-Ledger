# Portfolio Ledger — Full Website Description

## Overview

**Portfolio Ledger** is a private, invite-only web application built for a small group of investors who pool money together to apply for IPOs (Initial Public Offerings) in the Indian stock market. It serves as a centralized command center for the full IPO lifecycle: from researching market IPOs, recording applications, calculating profit/loss and member entitlements, tracking settlements between members, analyzing performance, and exporting audit-ready reports.

The app is built with **React + TypeScript + Vite**, styled with **Tailwind CSS**, and uses **Google Firebase** (Firestore + Firebase Auth) as its backend. It has a sophisticated **role-based access control (RBAC)** system and is fully dark-themed with a professional finance-tool aesthetic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend/DB | Firebase Firestore |
| Backend APIs | Netlify Functions |
| Auth | Firebase Authentication |
| Push Notifications | Firebase Cloud Messaging (FCM) + Service Workers |
| Charts | Recharts (PieChart) |
| Animated Counters | react-countup |
| Excel Export | ExcelJS + file-saver |
| Icons | Lucide React |
| Routing | React Router v6 |

---

## Design Language

- **Dark mode only**: Deep navy/charcoal background (`#0a0d11`, `#101418`, `#12171c`, `#151a20`)
- **Color system**: Custom Tailwind tokens — `ledger-green` (profit/positive), `ledger-red` (loss/negative), `ledger-blue` (accents), `ledger-gray` (muted text), `ledger-amber` (warnings/pending), `ledger-line` (subtle borders)
- **Typography**: Monospaced font for all financial figures (currency, P&L). Clean sans-serif for UI text.
- **Cards**: Rounded corners, subtle `border-white/5` borders, hover micro-animations (`hover:-translate-y-1`, `hover:shadow-lg`)
- **Animated numbers**: P&L counters animate from 0 to final value using `CountUp` on the dashboard
- **Responsive**: Full mobile layout with table→card fallbacks, sidebar collapsing, responsive grids

---

## User Roles & Access Control

There are **4 user roles** with hierarchical access:

| Role | Description |
|---|---|
| **Owner** | Full access to all features including all admin capabilities |
| **Manager** | Full access except cannot promote/manage other Owner/Manager accounts |
| **Viewer** | Read-only access, scoped only to portfolios they are assigned to. Cannot add/edit IPOs or mark settlements |
| **Guest** | Placeholder — no active access |

### User Statuses
- **Pending** – Account created but awaiting admin approval
- **Active** – Full access based on role
- **Deactivated** – Account blocked; shown a "Deactivated Access" page

### Portfolio Scoping (for Viewers)
- Owners and Managers see **all portfolios**
- Viewers are **individually assigned** to specific portfolios; they only see data for those portfolios

### Route Guards
- All dashboard routes are wrapped in a `ProtectedRoute` component that checks role
- A `RoleRedirect` component at `/` sends authenticated users to their role-specific dashboard (`/owner`, `/manager`, `/viewer`)
- Unauthenticated users are redirected to `/login`
- Pending users are redirected to `/pending`
- Deactivated users are redirected to `/deactivated`

---

## Pages & Features

### 1. Login Page (`/login`)
- Email + password sign-in form using Firebase Auth
- "Create Account" button opens a **Private Access Modal** for new account requests
- Shows version number, Privacy Policy and Terms & Conditions links at the bottom
- Error feedback for invalid credentials

### 2. Pending Access Page (`/pending`)
- Shown to users who have signed up but have not yet been approved by an admin
- Two-panel layout: left panel describes the app's three core features (Research & Evaluation, Group-Based Applications, Portfolio Governance); right panel shows the pending status card
- Animated "Pending Approval" badge with a pulsing orange dot
- Link to **request access via Telegram** (direct link to admin's Telegram)
- Sign Out button

### 3. Deactivated Access Page (`/deactivated`)
- Shown to users whose accounts have been deactivated
- Explains that access has been revoked and instructs them to contact an admin

### 4. Owner / Manager Dashboard (Main Dashboard)
**The central hub.** Displays a `DashboardShell` component with:

#### Command Center Hero Card
- **Total Portfolio Profit** (large animated number, color-coded green/red based on value)
- **Your Total Share** (the logged-in user's personal entitlement across all IPOs, also animated)
- Dense metrics panel: Active IPOs count, Settled IPOs count, Top IPO Profit, Top Earner name

#### Portfolio Summary Cards (Dynamic)
- Separate cards generated for each portfolio (Alpha, Beta, etc.)
- Shows: total P&L for that portfolio, number of IPOs, best IPO name, best IPO profit

#### Top Performing IPO Card
- Highlights the single best-performing IPO across all portfolios

#### Member Earnings Leaderboard
- Ranks all portfolio members by total earnings (cumulative entitlements across all IPOs)
- Rank #1 shown with a highlighted blue badge

#### Quick Action Buttons
- **Add IPO** (owners/managers only)
- **Settlement Center**
- **IPO History**
- **Admin Center** (owners/managers only)
- **Analytics**

#### Portfolio Access Panel (Right Sidebar)
- Shows per-portfolio P&L and the user's personal share in each
- Has a filter to switch portfolio view

### 5. Viewer Dashboard (`/viewer`)
- Same DashboardShell but in read-only mode
- No "Add IPO" or "Admin Center" buttons
- Data scoped to only portfolios they have been assigned

### 6. Market IPOs Page (`/*/market`)
Displays **live IPO market data** fetched from an external data source (cached in Firestore):
- **Active IPOs** section: currently open IPOs with price band, minimum investment, close date, and GMP (Grey Market Premium, color coded green/red)
- **Upcoming IPOs** section: IPOs not yet open
- **Recently Closed (Last 5)** section: closed and listed IPOs
- Clicking any IPO card opens a **detail modal** with full information
- The modal shows an "Apply" button (only for owners/managers; viewers see read-only view)
- Shows last-fetched timestamp (IST timezone)

### 7. IPO History Page (`/*/ipos`)
A searchable, filterable table of all recorded IPO entries:

#### Filters Available
- **Search by name**: text input that filters IPO names in real-time
- **Status filter**: Active | Archived | All
- **Portfolio filter**: All Portfolios | Portfolio Alpha | Portfolio Beta
- **P/L filter**: All P/L | Profit Only | Loss Only
- **Date range**: From and To date pickers

#### Table Features
- Each row shows: IPO Name, Portfolio, Allotment Date, P&L, Status, Actions
- **Archive** action (owners/managers): moves IPO to archived status
- **Restore** action: unarchives a previously archived IPO
- Clicking an IPO name navigates to the detail page
- "Add IPO" button (owners/managers only) at top right

### 8. Add IPO Page (`/*/ipos/add`) — Owners & Managers Only
A form to record a new IPO entry using the `IpoForm` component:
- **IPO Name**: text input
- **Portfolio**: dropdown to select Portfolio Alpha or Beta (or any other configured portfolio)
- **Allotment Date**: date picker
- **Lot Value**: numeric input (price per lot)
- **Member Entries Table**: For each member of the selected portfolio, enter:
  - Applied Lots
  - Allotted Lots
  - Applied Amount
  - Allotted Amount
  - Final Bank Credit (actual proceeds received from the bank)
- **Live Settlement Preview**: As data is entered, a real-time calculation panel shows:
  - Total Profit/Loss
  - Each member's actual contribution, entitled share (based on their PSR ratio), and net position
  - Settlement instructions (who pays whom how much to equalize)
- On submit, saves to Firestore and creates an audit log entry

### 9. Edit IPO Page (`/*/ipos/:ipoId/edit`) — Owners & Managers Only
- Same form as Add IPO, but pre-populated with existing data
- Supports editing all fields
- On save, updates Firestore and creates an audit log entry

### 10. IPO Detail View Page (`/*/ipos/:ipoId`)
A comprehensive single-IPO view:
- **IPO metadata**: name, portfolio, allotment date, status badge
- **Member Entries table**: shows each member's applied/allotted lots, applied/allotted amounts, bank credit
- **Settlement Preview** (embedded): the full P&L calculation breakdown
  - Total investment, total P&L
  - Each member's: actual gain, ratio-based entitlement, net position (+/-)
  - Settlement instructions list with per-instruction toggle (Mark Settled / Mark Pending) for owners/managers
- **Audit Log for this IPO**: shows every recorded action on this specific IPO (created, edited, archived, settlements toggled)
- Edit button (owners/managers only)

### 11. Settlement Center Page (`/*/settlements`)
A unified view of **all settlement instructions** across all active IPOs:
- **Filters**: by portfolio, by status (All / Pending / Settled)
- Each settlement card shows:
  - Portfolio label (Alpha or Beta)
  - Clickable link to the source IPO
  - Direction: "From [member] pays ₹X to [member]"
  - Status badge: PENDING (amber) or SETTLED (green)
  - Toggle button: "Mark Settled" or "Mark Pending" (not shown to viewers)
- Settlement changes are saved back to Firestore and logged in the audit trail
- Shows empty state with icon if no settlements match the filter

### 12. Analytics Page (`/*/analytics`)
A dedicated performance analysis hub divided into two columns:

#### Left Column
- **Portfolio Distribution Chart**: A donut (ring) PieChart (Recharts) showing count of IPOs per portfolio (blue = Alpha, violet = Beta)
- **Performance Overviews**: 
  - Best IPO and Worst IPO cards (name + P&L)
  - Per-portfolio profitability rate (profitable IPOs / total IPOs) with fraction display
  - Per-portfolio allotment rate (how many IPOs got allotted shares)
- **Settlement Insights**:
  - Pending Receivable (money owed to the logged-in user)
  - Pending Payable (money the logged-in user owes)
  - Net Position (Receivable − Payable, color coded)
  - Historical settlement count (settled vs pending breakdown with colored pill badges)

#### Right Column
- **Member Rankings**: Leaderboard ranked by total entitlement earnings, split by Portfolio Alpha and Portfolio Beta
- **Monthly Timeline**: Grouped by allotment month (most recent first), showing portfolio total profit and the logged-in user's personal share that month

### 13. Audit Log Page (`/*/audit`)
A filterable, chronological log of all significant events in the system:

#### Filters
- Portfolio filter
- Event type filter (IPO Created, IPO Edited, IPO Archived, IPO Restored, Settlement Settled, Settlement Pending, User Login, User Logout)
- User name text filter
- Date range (From / To)

#### Table Columns
- Timestamp (formatted: "Jun 16, 2026 10:28 AM")
- User (who performed the action)
- Event Type (monospaced badge: e.g., "IPO CREATED")
- Description (human-readable summary, e.g., "Created IPO 'Zomato' in Portfolio Alpha")
- Responsive: full table on desktop, card layout on mobile

### 14. Admin Center (`/*/admin`)
Accessible by Owners and Managers. Contains two tabs:

#### User Management Tab
- Table of all registered users (sorted: Owner → Manager → Viewer, then alphabetically)
- Shows: Name, Status badge (Active/Pending/Deactivated), Role, Assigned Portfolios
- Per-user actions:
  - **Approve** (for pending users) — sets status to active
  - **Deactivate** (for active Viewer users) — blocks access
  - **Reactivate** (for deactivated users) — restores access
- Portfolio assignment (for Viewers): clickable portfolio buttons to toggle which portfolios a viewer can see
- Toggle to "Show deactivated users"
- Owners/Managers shown as "Admin Access" (not manageable through this panel)

#### Portfolio Management Tab
- List of all portfolios with member rosters
- **Edit Portfolio**: modify the member list for a portfolio (add/remove members with names and share ratios)
  - Members can be added by typing a name or selecting from a dropdown of existing active users
  - Each member has a configurable **ratio** (the PSR — Profit Sharing Ratio)
  - Saving creates a new versioned PSR snapshot (`v1`, `v2`, etc.) in Firestore
- **Create New Portfolio**: form to add a new portfolio with a custom ID and name
- **Archive/Unarchive Portfolio**: toggle a portfolio's active status
- Toggle to show archived portfolios

#### Database Maintenance Tab
- Tools to maintain database health and prevent bloat.
- **Notification Cleanup**: Trigger a background Netlify Function to purge all historical notifications older than 90 days.

### 15. Reports & Export Page (`/*/reports`) — Owners & Managers Only
A complete data export center for generating Excel (`.xlsx`) reports:

#### Report Types (card selection UI)
1. **IPO Ledger** — List of IPOs with total P&L, investment amounts, final credits
2. **Settlement Report** — All settlement instructions with status, dates, and days pending
3. **Member Profit Report** — Two-sheet workbook: Member Summary (totals) + Member Breakdown (per-IPO per-member data)
4. **Portfolio Summary** — Aggregated portfolio stats: total P&L, average P&L, best/worst IPO, settled vs pending counts

#### Report Configuration
- **Report Scope**: "Current Filtered Data" or "All Historical Data"
- **Filters** (active only when scope is "Current Filtered Data"):
  - Portfolio filter (All / Alpha / Beta)
  - IPO Status filter (All / Active / Archived)
  - Date Range (From / To)

#### Export Panel (right sidebar)
- Shows count of available records
- **Download XLSX** button with loading spinner while generating
- Error message if no records match filters
- Note: "Report will be processed locally in your browser. No data leaves your device."

#### Excel Output Quality
- Professional formatting: branded header with "Portfolio Ledger" title, report name, generation timestamp, and generated-by name
- Frozen header rows for easy scrolling
- Alternating row colors for readability
- INR currency formatting (₹) with red negative numbers
- Date columns formatted as "dd-mmm-yyyy"
- A **Metadata sheet** in every workbook: lists version, report type, user, timestamp, all applied filters
- Each export is logged as a `report_exported` audit event

### 16. Not Found Page (`/any-unknown-route`)
- Simple 404 page redirecting users back to the app

### 17. Privacy Policy (`/privacy`) & Terms & Conditions (`/terms`)
- Static informational pages accessible without login
- Linked from the login page footer

### 18. Notification Center (`/*/notifications`)
A centralized inbox for all system alerts:
- **Notification Bell**: Located in the top navigation header with an unread count badge. Updates instantly across all tabs using real-time Firestore listeners and an optimistic UI state.
- **Dropdown Preview**: Clicking the bell shows the last 5 notifications with icons indicating the category (IPO Alerts, Settlement Alerts, Admin Messages).
- **Full Inbox View**: Dedicated page displaying up to 100 recent notifications with "Mark all as read" functionality.
- **Push Notifications**: Supported natively via Firebase Cloud Messaging for desktop and mobile, ensuring critical alerts reach users even when the app is closed. Backend delivery is handled securely via Netlify Functions.

---

## Core Data Models

### IpoRecord
The central data entity. Key fields:
- `ipoName`, `portfolioId`, `portfolioName`, `allotmentDate`, `lotValue`
- `status`: "active" | "archived"
- `memberEntries`: Record of each member's applied lots, allotted lots, applied amount, allotted amount, and final bank credit
- `calculationSnapshot`: Stores computed results:
  - `totalProfitLoss`
  - `memberEntitlements[]` — each member's actual gain, ratio-based entitlement, and net position
  - `settlementInstructions[]` — who pays whom, how much, and settlement status
- `lockedPsr`: The exact PSR (ratio array) used when the IPO was created (immutable historical record)
- `createdByUid`, `createdByName`, `createdAt`, `updatedAt`

### Portfolio
- `id`, `name`, `members[]` (each has a `code`, `name`, and `ratio`)
- `status`: "active" | "archived"

### PsrVersion
- Versioned snapshots of a portfolio's member share ratios
- Created every time the member roster changes (v1, v2, v3...)
- IPOs are linked to a specific PSR version for immutable historical accuracy

### LedgerUser
- `uid`, `name`, `role`, `status`, `portfolios[]` (list of portfolio IDs for viewers)

### AuditLog
- `eventType` (one of: ipo_created, ipo_edited, ipo_archived, ipo_restored, settlement_settled, settlement_pending, psr_updated, user_login, user_logout, report_exported)
- `entityType`, `entityId`, `userUid`, `userName`, `timestamp`, `description`, `portfolioId`

### MarketIpo
- Live market data: name, price band, GMP (Grey Market Premium), close date, minimum investment, status (active / upcoming / closed / listed)

### NotificationHistoryItem
- `title`, `body`, `category` (ipoAlerts, settlementAlerts, adminAlerts)
- `sentAt` (timestamp), `targetType` (role, portfolio, users, broadcast), `targets` (array)
- Used to render the Notification Center inbox and track delivery.

---

## The Calculation Engine

At the heart of the app is a `calculationEngine` utility (`/src/utils/calculationEngine.ts`) that:

1. Takes member entries (applied/allotted amounts, bank credits)
2. Uses the locked PSR ratios to determine each member's fair share of profit
3. Computes each member's **actual** profit (bank credit − allotted amount)
4. Computes each member's **entitled** profit (total IPO profit × their ratio)
5. Computes each member's **net position** (entitled − actual)
6. Generates **settlement instructions**: minimal set of transactions to equalize all members' positions

This calculation is run **live on the form** as the user types, so the settlement preview updates in real time before saving.

---

## Navigation Structure

Each role has its own route namespace (`/owner/*`, `/manager/*`, `/viewer/*`). The sidebar (in `DashboardLayout`) contains navigation links appropriate to the user's role:

| Route | Owner | Manager | Viewer |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Market IPOs | ✅ | ✅ | ✅ (read-only) |
| IPO History | ✅ | ✅ | ✅ (read-only) |
| Settlement Center | ✅ | ✅ | ✅ (read-only) |
| Analytics | ✅ | ✅ | ✅ |
| Audit Log | ✅ | ✅ | ❌ |
| Reports & Export | ✅ | ✅ | ❌ |
| Admin Center | ✅ | ✅ | ❌ |

---

## Security & Auth Architecture

- Firebase Authentication handles login/logout
- On login, the app fetches the corresponding user record from the Firestore `users` collection
- User status is checked every session load; pending/deactivated users are redirected
- Firestore Security Rules (in `firestore.rules`) enforce server-side access control so data cannot be read/written by unauthorized users even if they bypass the frontend
- A `SessionTimeoutModal` component handles session expiry gracefully

---

## Audit Trail

Every significant action automatically writes to the `auditLogs` Firestore collection:
- IPO created, edited, archived, restored
- Settlement marked settled or pending
- PSR (member ratios) updated
- User login and logout
- Report exported

The audit log is immutable (append-only) and viewable by Owners and Managers on the Audit Log page.

---

## Summary of All Features

| # | Feature | Description |
|---|---|---|
| 1 | Role-based access control | Owner / Manager / Viewer / Guest roles with route guards |
| 2 | Firebase Auth login | Email + password with "pending" and "deactivated" state handling |
| 3 | Account request flow | New users request access via modal; admin approves in Admin Center |
| 4 | Multi-portfolio support | Supports multiple named portfolios (Alpha, Beta, etc.) |
| 5 | IPO recording | Form to enter all member-level application and allotment data |
| 6 | Live P&L calculation | Real-time settlement preview using the calculation engine |
| 7 | PSR versioning | Immutable ratio snapshots tied to each IPO for historical accuracy |
| 8 | IPO management | Archive, restore, edit operations with audit logging |
| 9 | Advanced IPO filtering | Filter by name, status, portfolio, P/L, and date range |
| 10 | Settlement center | Cross-IPO view of all settlements; toggle settled/pending |
| 11 | Market IPO feed | Live GMP, price band, close dates for active/upcoming IPOs |
| 12 | Analytics hub | Pie chart, best/worst IPO, profitability rates, member leaderboard, monthly timeline, settlement insights |
| 13 | Member leaderboard | Rankings by cumulative entitlements across portfolios |
| 14 | Audit log | Filterable chronological record of all system events |
| 15 | Admin — user management | Approve, deactivate, reactivate users; assign viewer portfolios |
| 16 | Admin — portfolio management | Create/archive portfolios; edit member rosters; PSR versioning |
| 17 | Reports & Export | 4 report types as formatted XLSX files generated client-side |
| 18 | Session timeout | Graceful session expiry handling via modal |
| 19 | Responsive design | Desktop table layouts with mobile card fallbacks throughout |
| 20 | Privacy & Terms pages | Static legal pages linked from login |
| 21 | In-App Notifications | Real-time inbox with unread badges, mark-as-read, and targeted delivery by role/portfolio |
| 22 | Push Notifications | OS-level push notifications via Firebase Cloud Messaging and Service Workers |
| 23 | Database Maintenance | Admin tools to safely prune old database records (e.g. 90-day notification retention) |
