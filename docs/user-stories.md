# Tashgheel HRMS — User Stories & Acceptance Criteria

**Version:** 1.0  
**Date:** 2025  
**Product:** Tashgheel HRMS  

---

## 1. Authentication & RBAC

### US-001: User Login
**As a** registered staff member  
**I want to** authenticate with my email and password  
**So that** I can securely access the Tashgheel HRMS system.

* **Acceptance Criteria:**
  * **AC-1:** Form validation requires a valid email format and non-empty password.
  * **AC-2:** Successful authentication returns JWT access and refresh tokens, caching permissions in the UI state.
  * **AC-3:** 3 failed attempts within a 15-minute window locks the account, notifying the user.

### US-002: Role-Based Page Access
**As a** Recruiter  
**I want to** be blocked from accessing administrative pages like "System Settings"  
**So that** security and data isolation are maintained.

* **Acceptance Criteria:**
  * **AC-1:** The sidebar hides admin settings if the logged-in user lacks `settings:read` permission.
  * **AC-2:** Direct URL navigation to `/settings` triggers a 403 Page overlay with a "Go Back" button.

---

## 2. CRM Module

### US-003: Client Company Management
**As a** Recruiter / Account Manager  
**I want to** create and view client profiles  
**So that** I have a single source of truth for our commercial clients.

* **Acceptance Criteria:**
  * **AC-1:** Creating a company requires a unique name and industry field.
  * **AC-2:** Deleting a company soft-deletes the record (marking `deletedAt`), retaining it in database history for placements.

### US-004: Uploading Contracts
**As a** Recruiter  
**I want to** upload signed contracts and set expiration dates  
**So that** the system can alert me before contracts expire.

* **Acceptance Criteria:**
  * **AC-1:** Only PDF and DOCX files are allowed, up to 10MB.
  * **AC-2:** File is uploaded to Cloudflare R2 and linked to the company record.
  * **AC-3:** Expiry alert triggers 30 days before contract endDate.

---

## 3. ATS Jobs & Candidates

### US-005: Job Requisition Flow
**As an** HR User  
**I want to** request a new job posting through a requisition form  
**So that** managers can approve budgets and job terms.

* **Acceptance Criteria:**
  * **AC-1:** Draft requisitions are saved in `DRAFT` status.
  * **AC-2:** Submitting transitions status to `PENDING_APPROVAL` and emails the Recruitment Manager.
  * **AC-3:** Approval by manager changes status to `APPROVED` and automatically spawns a `JobOpening` in the ATS.

### US-006: Candidate Database & Search
**As a** Recruiter  
**I want to** search for candidates using fuzzy matching on name, skills, and resume text  
**So that** I can quickly find qualified talent.

* **Acceptance Criteria:**
  * **AC-1:** Search input uses `pg_trgm` for fuzzy matching (e.g., searching "javscript" matches candidates with "JavaScript").
  * **AC-2:** Filters (skills, availability, location) can be combined to narrow down results.

---

## 4. Recruitment Pipeline

### US-007: Visual Kanban Board
**As a** Recruiter  
**I want to** manage candidate applications on a Kanban board  
**So that** I have a visual pipeline of our active recruitment status.

* **Acceptance Criteria:**
  * **AC-1:** A card represents an application and shows name, days-in-stage, and owner.
  * **AC-2:** Dragging cards between columns updates the application stage.
  * **AC-3:** Dropping a card in a column triggers a stage change modal asking for an optional transition note.
  * **AC-4:** Candidates in `REJECTED` or `WITHDRAWN` columns are locked and cannot be dragged.

---

## 5. Interviews & Offers

### US-008: Schedule Interview
**As a** Recruiter  
**I want to** schedule interview events with calendars and video links  
**So that** candidates and interviewers are aligned.

* **Acceptance Criteria:**
  * **AC-1:** Form requires a date, time, type, at least one interviewer, and location/videoLink.
  * **AC-2:** An automated email is sent to the candidate and interviewers with an attached `.ics` file.

### US-009: Submit Feedback
**As an** Interviewer  
**I want to** submit feedback with numeric competency ratings and text comments  
**So that** the hiring team can make a decision.

* **Acceptance Criteria:**
  * **AC-1:** The interviewer is presented with a standard evaluation form.
  * **AC-2:** Rating is required for all listed competencies (1-5 scale).
  * **AC-3:** Feedback is saved and displayed chronologically in the candidate's profile.

---

## 6. Placement & Replacement

### US-010: Placement Guarantee Monitoring
**As a** Recruitment Manager  
**I want to** monitor guarantee periods and receive alerts  
**So that** I don't lose revenue or replacement obligations.

* **Acceptance Criteria:**
  * **AC-1:** Placement tracks a 90-day guarantee period from candidate start date.
  * **AC-2:** System sends automatic alerts 14 days and 7 days prior to guarantee end date.

---

## 7. Finance & AI Features

### US-011: Generate Invoices
**As a** Finance User  
**I want to** generate client invoices directly from confirmed placements  
**So that** billing is automated and error-free.

* **Acceptance Criteria:**
  * **AC-1:** Generating invoice from placement pre-populates company, fee amount, and details.
  * **AC-2:** Invoice number uses format `INV-YYYY-NNN` (e.g. `INV-2025-001`).

### US-012: Resume Parser
**As a** Recruiter  
**I want to** upload candidate resume PDFs to auto-parse details  
**So that** I don't waste time entering profile fields manually.

* **Acceptance Criteria:**
  * **AC-1:** Uploading PDF calls Gemini Flash to extract structural JSON.
  * **AC-2:** A review screen displays parsed fields for recruiter verification before saving.
