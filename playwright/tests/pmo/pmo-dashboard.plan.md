# PMO Dashboard Test Plan

## Application Overview

The PMO Dashboard is a React-based project portfolio management view served at `/pmo-dashboard/`. It is protected by Django login and a configurable group-based permission (`pmo_allowed_groups`). Once authenticated, the dashboard fetches active projects from `/api/pmo/projects/` and renders a rich UI including: a filterable/searchable project table, status/hours/cost/Gantt charts, an at-risk panel, add-project modal, project-details modal, dark-mode toggle, and a PDF export action.

## Test Scenarios

### 1. Authentication & Access Control

**Seed:** `playwright/seed.spec.ts`

#### 1.1. Unauthenticated user is redirected to login

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Open a fresh browser session (no cookies) and navigate to `/pmo-dashboard/`
    - expect: The browser is redirected to the login page (URL contains `/accounts/login/` or similar)
    - expect: The PMO Dashboard content is NOT visible

#### 1.2. Authenticated user without PMO group sees 403

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Log in as a user who is NOT in any PMO-allowed group
  2. Navigate to `/pmo-dashboard/`
    - expect: A 403 Forbidden page is returned
    - expect: The dashboard content is not rendered
  3. Also request GET `/api/pmo/projects/` directly
    - expect: The API returns HTTP 403

#### 1.3. PMO group member can access dashboard and API

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Log in as a user who belongs to a group listed in `TimesheetPreferences.pmo_allowed_groups`
  2. Navigate to `/pmo-dashboard/`
    - expect: HTTP 200 is returned
    - expect: The PMO Dashboard page renders with a `<div id='root'>` containing the React app
  3. Request GET `/api/pmo/projects/`
    - expect: HTTP 200 is returned
    - expect: Response body is a JSON array (may be empty)

#### 1.4. Superuser can access dashboard and API

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Log in as a Django superuser (is_superuser=True)
  2. Navigate to `/pmo-dashboard/`
    - expect: HTTP 200 is returned
    - expect: The PMO Dashboard React app loads successfully
  3. Request GET `/api/pmo/projects/`
    - expect: HTTP 200 is returned

#### 1.5. Administrators group member can access dashboard

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Configure `TimesheetPreferences.pmo_allowed_groups` to include the 'Administrators' group
  2. Log in as a user in the 'Administrators' group and navigate to `/pmo-dashboard/`
    - expect: HTTP 200 is returned
    - expect: The dashboard renders without errors

#### 1.6. Unauthenticated user receives 401 from the API

**File:** `playwright/tests/pmo/auth-access.spec.ts`

**Steps:**
  1. Without any session cookie, send a GET request to `/api/pmo/projects/`
    - expect: HTTP 401 is returned
    - expect: Response body contains an authentication error message

### 2. Dashboard Load & Empty State

**Seed:** `playwright/seed.spec.ts`

#### 2.1. Dashboard renders correctly with no projects

**File:** `playwright/tests/pmo/dashboard-load.spec.ts`

**Steps:**
  1. Log in as a PMO user and navigate to `/pmo-dashboard/` with no active projects in the database
  2. Wait for the page to finish loading (spinner disappears)
    - expect: The project table header row ('Project', 'Project Manager', 'Due Date', 'Status', 'Budget (Hrs)', etc.) is visible
    - expect: The table body shows no data rows
    - expect: All chart panels are visible (Status, Hours Consumption, Sales/Cost, Billable Hours, Manager Workload, Manager Revenue)
    - expect: The at-risk panel shows the 'Portfolio Health Excellent' message

#### 2.2. Dashboard displays projects from the API

**File:** `playwright/tests/pmo/dashboard-load.spec.ts`

**Steps:**
  1. Create at least 2 active projects in the database with varying statuses (e.g., 'on_track', 'at_risk'), then log in as a PMO user and navigate to `/pmo-dashboard/`
  2. Wait for loading to complete
    - expect: Each project appears as a row in the 'Kartoza Running Projects' table
    - expect: Project name, manager, due date, status badge, budget hours, consumed hours, sales, cost, and progress fields are populated
    - expect: Charts update to reflect the project data

#### 2.3. Loading spinner appears while fetching data

**File:** `playwright/tests/pmo/dashboard-load.spec.ts`

**Steps:**
  1. Log in as a PMO user and navigate to `/pmo-dashboard/`
    - expect: A loading spinner or loading indicator is visible immediately after page load while the API call is in progress
  2. Wait for the network request to `/api/pmo/projects/` to complete
    - expect: The loading indicator disappears
    - expect: Project data (or empty state) is shown

#### 2.4. API error is surfaced to the user

**File:** `playwright/tests/pmo/dashboard-load.spec.ts`

**Steps:**
  1. Simulate an API failure (e.g., set the backend offline or mock a 500 response) and then navigate to `/pmo-dashboard/` as a PMO user
    - expect: An error message is displayed on the page (e.g., 'Failed to connect to ERP Backend')
    - expect: The table and charts do not show stale or partial data

### 3. Project Table — Search & Filtering

**Seed:** `playwright/seed.spec.ts`

#### 3.1. Search by project name filters table rows

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. With multiple projects loaded, type a partial project name into the search input
    - expect: Only rows whose project name contains the search string (case-insensitive) are displayed
    - expect: Non-matching rows are hidden
  2. Clear the search input
    - expect: All project rows are restored

#### 3.2. Filter by Project Type

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. Click the 'Filter' button to open the filter panel
    - expect: The filter panel opens
    - expect: The 'Project Type' section is visible
  2. Expand the 'Project Type' section and select one project type option
    - expect: The table immediately shows only projects matching that project type
    - expect: The count badge next to the option matches the number of visible rows
  3. Deselect the project type filter
    - expect: All project rows are visible again

#### 3.3. Filter by Status

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. Open the filter panel and expand the 'Status' section, then select 'at_risk'
    - expect: Only at-risk projects appear in the table
    - expect: Charts may update to reflect filtered data

#### 3.4. Filter by Manager

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. Open the filter panel and expand the 'Manager' section, then select a manager name
    - expect: Only projects managed by that manager are shown in the table

#### 3.5. Multiple filter combinations narrow results correctly

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. Select both a Project Type filter and a Status filter simultaneously
    - expect: Only rows matching BOTH criteria are displayed
    - expect: If no projects match the combined criteria, the table body is empty

#### 3.6. Filter panel closes on outside click or Escape key

**File:** `playwright/tests/pmo/filters.spec.ts`

**Steps:**
  1. Open the filter panel, then click outside of it
    - expect: The filter panel closes
  2. Open the filter panel again, then press the Escape key
    - expect: The filter panel closes

### 4. Project Table — Inline Editing

**Seed:** `playwright/seed.spec.ts`

#### 4.1. Editable number field (Budget Hours) can be changed

**File:** `playwright/tests/pmo/editable-table.spec.ts`

**Steps:**
  1. With at least one project loaded, locate the 'Budget (Hrs)' cell for the first project row and click to edit it
    - expect: The cell becomes editable (input is focused)
  2. Clear the field, type a new numeric value, and press Tab or click elsewhere
    - expect: A PATCH/PUT request is sent to the API to update the project
    - expect: The displayed value in the cell updates to the new value

#### 4.2. Entering a non-numeric value in a number field defaults to 0

**File:** `playwright/tests/pmo/editable-table.spec.ts`

**Steps:**
  1. Click an editable number cell and type a non-numeric string (e.g., 'abc')
    - expect: The value sent to the API is 0
    - expect: The cell displays 0 or an equivalent representation

#### 4.3. Deleting a project row removes it from the table

**File:** `playwright/tests/pmo/editable-table.spec.ts`

**Steps:**
  1. Locate the delete button (Trash2 icon) for a project row and click it
    - expect: A DELETE request is sent to the API
    - expect: The row is removed from the table without a page reload
    - expect: Other rows remain unaffected

#### 4.4. Project name link opens the Project Details modal

**File:** `playwright/tests/pmo/editable-table.spec.ts`

**Steps:**
  1. Click the underlined project name link in a table row
    - expect: The Project Details modal opens
    - expect: The modal header shows the correct project name and business unit badge
    - expect: Fields like Project Manager, Relations Manager, Start Date, Due Date, Team Members, and Subtasks are visible
  2. Click the close button (X) or click outside the modal
    - expect: The modal closes and the table is still visible

### 5. Add Project Modal

**Seed:** `playwright/seed.spec.ts`

#### 5.1. Add Project modal opens and can be cancelled

**File:** `playwright/tests/pmo/add-project.spec.ts`

**Steps:**
  1. Click the 'Add Project' button in the dashboard toolbar
    - expect: The 'Create New Project' modal opens with a form
    - expect: Fields include: Project name, Relationship Manager, Due Date, Status (dropdown), Budget Hours, Consumed Hours, Sales (ZAR), Cost (ZAR), Actual Progress
  2. Click the X close button without filling in any field
    - expect: The modal closes without creating a project
    - expect: The project table is unchanged

#### 5.2. Submitting without a project name does nothing

**File:** `playwright/tests/pmo/add-project.spec.ts`

**Steps:**
  1. Open the Add Project modal, leave the project name field blank, and click Save
    - expect: The form is not submitted
    - expect: The modal remains open
    - expect: No API request is sent

#### 5.3. Creating a new project adds it to the table

**File:** `playwright/tests/pmo/add-project.spec.ts`

**Steps:**
  1. Open the Add Project modal and fill in all required fields: Project name = 'New Test Project', a valid due date, status = 'On track', Budget Hours = 80
  2. Click the Save button
    - expect: A POST request is sent to the API
    - expect: The modal closes
    - expect: The new project row 'New Test Project' appears in the project table

#### 5.4. Status dropdown shows all options

**File:** `playwright/tests/pmo/add-project.spec.ts`

**Steps:**
  1. Open the Add Project modal and click the Status dropdown
    - expect: The dropdown shows all options: 'On track', 'Delayed', 'At risk', 'Completed', 'On Hold', 'Cancelled' (with their emoji indicators)

### 6. View Toggle — Table vs Gantt

**Seed:** `playwright/seed.spec.ts`

#### 6.1. Default view is the Table view

**File:** `playwright/tests/pmo/view-toggle.spec.ts`

**Steps:**
  1. Log in as a PMO user and navigate to `/pmo-dashboard/` with at least one project loaded
    - expect: The Table view is active by default
    - expect: The 'Kartoza Running Projects' table is visible
    - expect: The Gantt chart is not rendered

#### 6.2. Switching to Gantt view renders the Gantt chart

**File:** `playwright/tests/pmo/view-toggle.spec.ts`

**Steps:**
  1. Click the Gantt view toggle button
    - expect: The Gantt chart replaces the table view
    - expect: Each project appears as a task bar on the Gantt timeline
    - expect: Progress is shown on each bar

#### 6.3. Gantt view is fullscreen-expandable

**File:** `playwright/tests/pmo/view-toggle.spec.ts`

**Steps:**
  1. Switch to Gantt view and click the Maximize (fullscreen) button
    - expect: The Gantt chart expands to fill the screen or a maximized container
  2. Click the Minimize button
    - expect: The Gantt chart returns to its normal embedded size

#### 6.4. Clicking a task in the Gantt view opens Project Details modal

**File:** `playwright/tests/pmo/view-toggle.spec.ts`

**Steps:**
  1. In Gantt view, click on a project task bar or its name in the task list
    - expect: The Project Details modal opens with the correct project's information

#### 6.5. Switching back to Table view from Gantt restores the table

**File:** `playwright/tests/pmo/view-toggle.spec.ts`

**Steps:**
  1. While in Gantt view, click the Table view toggle button
    - expect: The project table is rendered again
    - expect: The Gantt chart is no longer visible

### 7. At-Risk Panel

**Seed:** `playwright/seed.spec.ts`

#### 7.1. Healthy portfolio shows no action items

**File:** `playwright/tests/pmo/at-risk-panel.spec.ts`

**Steps:**
  1. Load the dashboard with only 'on_track' projects (no at-risk or overdue projects)
    - expect: The at-risk panel shows the 'Portfolio Health Excellent: No projects currently require immediate attention.' message
    - expect: No expand/collapse button is present

#### 7.2. At-risk projects trigger the action items panel

**File:** `playwright/tests/pmo/at-risk-panel.spec.ts`

**Steps:**
  1. Load the dashboard with at least one project whose status is 'at_risk' or 'overdue'
    - expect: The at-risk panel shows a collapsed button with the count of at-risk projects
    - expect: The button label contains 'Action Items Available'
  2. Click the action items button to expand it
    - expect: The panel expands to show the list of at-risk projects with their names and status indicators

#### 7.3. Clicking a project in at-risk panel opens Project Details modal

**File:** `playwright/tests/pmo/at-risk-panel.spec.ts`

**Steps:**
  1. Expand the at-risk panel and click the arrow/link on one of the listed projects
    - expect: The Project Details modal opens with that project's information

#### 7.4. At-risk panel collapses on second click

**File:** `playwright/tests/pmo/at-risk-panel.spec.ts`

**Steps:**
  1. Expand the at-risk panel and then click the panel header or the collapse button
    - expect: The panel collapses back to the button view

### 8. Dark Mode Toggle

**Seed:** `playwright/seed.spec.ts`

#### 8.1. Toggling dark mode applies dark styles

**File:** `playwright/tests/pmo/dark-mode.spec.ts`

**Steps:**
  1. Log in as a PMO user and navigate to `/pmo-dashboard/`
  2. If in light mode, click the Moon/dark mode toggle button in the header
    - expect: The `dark` class is added to `<html>` (document root)
    - expect: Background and text colors change to the dark theme palette
    - expect: The toggle icon changes to Sun (indicating light mode can be restored)
  3. Click the Sun icon to switch back to light mode
    - expect: The `dark` class is removed from `<html>`
    - expect: Light theme colors are restored

#### 8.2. Dark mode preference is persisted in localStorage

**File:** `playwright/tests/pmo/dark-mode.spec.ts`

**Steps:**
  1. Enable dark mode using the toggle
    - expect: localStorage key `pmo_theme` is set to `'dark'`
  2. Reload the page
    - expect: Dark mode is still active after reload — the `dark` class is present on `<html>`
  3. Switch to light mode
    - expect: localStorage key `pmo_theme` is set to `'light'`

### 9. Export to PDF

**Seed:** `playwright/seed.spec.ts`

#### 9.1. Export PDF button triggers download

**File:** `playwright/tests/pmo/export-pdf.spec.ts`

**Steps:**
  1. With at least one project loaded, click the 'Export PDF' / Download button in the header
    - expect: A PDF file download is initiated
    - expect: No unhandled JavaScript errors appear in the console

#### 9.2. Export button shows a loading indicator while exporting

**File:** `playwright/tests/pmo/export-pdf.spec.ts`

**Steps:**
  1. Click the Export PDF button
    - expect: The button shows a spinner or 'Exporting…' state while the export is in progress
    - expect: The button returns to its normal state after the export completes

### 10. Project Details Modal

**Seed:** `playwright/seed.spec.ts`

#### 10.1. Modal shows all project metadata fields

**File:** `playwright/tests/pmo/project-details.spec.ts`

**Steps:**
  1. Create a project with all fields filled (business unit, project type, customer, start date, due date, project manager, relations manager, budget hours, consumed time, progress, team members, subtasks) and open its Project Details modal
    - expect: Business unit badge is shown
    - expect: Status badge is shown
    - expect: Project name heading is shown
    - expect: Project manager name appears under the 'Project Manager' section
    - expect: Relations manager name appears
    - expect: Start date and due date are shown
    - expect: Schedule progress bar is visible and reflects time elapsed
    - expect: Budget hours, consumed time, and progress percentage are displayed
    - expect: Team members list is rendered
    - expect: Subtask list is rendered with budget and consumed hours per subtask

#### 10.2. Modal handles missing optional fields gracefully

**File:** `playwright/tests/pmo/project-details.spec.ts`

**Steps:**
  1. Open a project that has no start date, no project manager, no relations manager, and no team members
    - expect: The modal opens without errors
    - expect: Missing fields show a placeholder (e.g., '—' or 'N/A') rather than crashing
    - expect: No JavaScript errors appear in the console

#### 10.3. Clicking outside the modal closes it

**File:** `playwright/tests/pmo/project-details.spec.ts`

**Steps:**
  1. Open the Project Details modal and click on the backdrop (outside the modal card)
    - expect: The modal closes
    - expect: The dashboard table is visible and unchanged

#### 10.4. Schedule progress bar is clamped to 0–100%

**File:** `playwright/tests/pmo/project-details.spec.ts`

**Steps:**
  1. Open a project whose due date is in the past (overdue)
    - expect: The schedule progress bar shows 100% (not more than 100%)
  2. Open a project whose start date is in the future
    - expect: The schedule progress bar shows 0% (not a negative value)

### 11. API — Project Data Serialization

**Seed:** `playwright/seed.spec.ts`

#### 11.1. Active projects are returned; inactive ones are excluded

**File:** `playwright/tests/pmo/api-serialization.spec.ts`

**Steps:**
  1. Create one active project and one project with `is_active=False`, then request GET `/api/pmo/projects/` as a PMO user
    - expect: Only the active project appears in the response array
    - expect: The inactive project is not listed

#### 11.2. Project status is computed correctly based on rules

**File:** `playwright/tests/pmo/api-serialization.spec.ts`

**Steps:**
  1. Create a project with `expected_time=100`, `actual_time=90`, `total_sales_amount=1000`, `total_costing_amount=600`, and a due date 10 days in the future; then GET `/api/pmo/projects/`
    - expect: The project's `status` field is `'warning'` (hours at 90% threshold)
  2. Create a project with `expected_end_date` set to yesterday; then GET `/api/pmo/projects/`
    - expect: The project's `status` field is `'at_risk'` or `'overdue'` (behind schedule)

#### 11.3. Projects are ordered alphabetically by name

**File:** `playwright/tests/pmo/api-serialization.spec.ts`

**Steps:**
  1. Create projects named 'Zebra', 'Alpha', and 'Mango', then GET `/api/pmo/projects/`
    - expect: Projects are returned in alphabetical order: Alpha, Mango, Zebra

#### 11.4. Team members and subtasks are nested in project response

**File:** `playwright/tests/pmo/api-serialization.spec.ts`

**Steps:**
  1. Create a project with 2 team members and 3 subtasks (Tasks), then GET `/api/pmo/projects/`
    - expect: The project object contains a `team_members` array with 2 entries, each having `id`, `name`, `role`, and `is_lead` fields
    - expect: The project object contains a `subtasks` array with 3 entries, each having `id`, `name`, `budget_time`, and `consumed_time`
