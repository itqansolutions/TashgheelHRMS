# Tashgheel HRMS — Business Requirements Document (BRD)

**Version:** 1.0  
**Date:** 2025  
**Product:** Tashgheel HRMS — Recruitment & Placement Management System  
**Architecture:** Single-Tenant per Installation  
**Deployment:** Railway Cloud  
**Languages:** Arabic + English (toggle)

---

## Table of Contents

1. [Authentication & Administration](#1-authentication--administration)
2. [CRM Module](#2-crm-module)
3. [ATS — Jobs](#3-ats--jobs)
4. [ATS — Candidates](#4-ats--candidates)
5. [Recruitment Pipeline](#5-recruitment-pipeline)
6. [Interviews](#6-interviews)
7. [Offers](#7-offers)
8. [Placement Management](#8-placement-management)
9. [Replacement Management](#9-replacement-management)
10. [Finance](#10-finance)
11. [AI Features](#11-ai-features)
12. [Reporting & Analytics](#12-reporting--analytics)
13. [Notifications & Automation](#13-notifications--automation)

---

## 1. Authentication & Administration

### Purpose
The Authentication & Administration module is the security and governance foundation of Tashgheel HRMS. It controls who can access the system, what actions each user can perform, and how the system is configured. It provides login, session management, role-based access control (RBAC), user management, system settings, and audit logging capabilities.

### Business Rules
1. All users must authenticate with a valid email and password before accessing any system resource.
2. Passwords must be at least 10 characters and contain uppercase, lowercase, number, and special character.
3. Passwords are hashed using Argon2id before storage; plaintext passwords are never stored.
4. Access tokens expire after 15 minutes; refresh tokens expire after 7 days.
5. A user may have only one active role at a time; roles are non-additive.
6. Role permissions are defined at the resource+action level (e.g., `candidates:write`).
7. Failed login attempts are rate-limited to 10 per minute per IP; after 3 consecutive failures, a 15-minute lockout applies.
8. Password reset links are single-use, signed JWTs valid for 1 hour.
9. All mutating operations (create, update, delete) generate an immutable audit log entry.
10. The System Administrator is the only role that can manage users, roles, and system settings.
11. User accounts can be deactivated (soft delete); deactivated users cannot log in.
12. The system supports a maximum of 500 users per installation.
13. Session tokens are stored as hashed values in the database; raw tokens are never persisted.
14. Concurrent session limit per user is 5 devices.

### Functional Requirements

**FR-AUTH-001:** The system shall provide a login form accepting email and password credentials.  
**FR-AUTH-002:** The system shall issue a JWT access token (15 min TTL) and a refresh token (7 day TTL) upon successful login.  
**FR-AUTH-003:** The system shall provide a token refresh endpoint that rotates the refresh token on each use.  
**FR-AUTH-004:** The system shall provide logout functionality that invalidates the current session.  
**FR-AUTH-005:** The system shall provide a "Forgot Password" flow that sends a signed reset link to the user's email.  
**FR-AUTH-006:** The system shall provide a "Reset Password" form that validates the token and updates the password.  
**FR-AUTH-007:** The system shall enforce rate limiting on all authentication endpoints.  
**FR-USER-001:** Administrators shall be able to create, view, edit, and deactivate user accounts.  
**FR-USER-002:** The system shall support inviting new users via email with a one-time setup link (24 hour TTL).  
**FR-USER-003:** Users shall be able to update their own profile (name, avatar, password).  
**FR-USER-004:** The system shall allow uploading user avatars to Cloudflare R2.  
**FR-RBAC-001:** The system shall enforce permissions on every API endpoint using the `@Permissions()` guard.  
**FR-RBAC-002:** Administrators shall be able to assign permissions to roles via a permission matrix UI.  
**FR-RBAC-003:** Role changes take effect on the user's next API request (JWT does not cache role data).  
**FR-SETTINGS-001:** The system shall provide a company profile settings page (name, logo, address, timezone, currency).  
**FR-SETTINGS-002:** The system shall provide branding settings (primary color override, favicon, logo).  
**FR-SETTINGS-003:** The system shall provide email configuration settings (from name, from address).  
**FR-AUDIT-001:** The system shall log every create, update, and delete operation with user, timestamp, entity, before/after values.  
**FR-AUDIT-002:** Audit logs shall be queryable by user, resource type, action, and date range.  
**FR-AUDIT-003:** Audit logs are immutable; no user can edit or delete them.

### Acceptance Criteria

**AC-AUTH-001:** Given a valid email and password, when the user submits the login form, then the system returns a 200 response with access token and refresh token and redirects to the dashboard.  
**AC-AUTH-002:** Given an invalid password, when submitted 3 times consecutively, then the account is locked for 15 minutes and the user sees an error message.  
**AC-AUTH-003:** Given an expired access token and valid refresh token, when the client calls /auth/refresh, then a new access token and rotated refresh token are returned.  
**AC-AUTH-004:** Given a logged-out user, when they try to access a protected route, then they are redirected to the login page.  
**AC-RBAC-001:** Given a Recruiter user, when they attempt to access /settings, then the system returns a 403 Forbidden response.  
**AC-AUDIT-001:** Given any user performs a data mutation, when the operation completes, then an audit log entry is created within 100ms.

---

## 2. CRM Module

### Purpose
The CRM module manages all client-facing relationships for the recruitment agency. It serves as the central repository for client companies, their contacts, signed contracts, branch offices, and all communication activities. It enables recruiters and managers to track the full history of engagement with each client company.

### Business Rules
1. A company record is the parent entity; contacts, contracts, and branches must be linked to a company.
2. Company names must be unique within the installation.
3. Soft deletion is used for companies; deleted companies are hidden from UI but retained in the database.
4. A company can have multiple contacts; one contact can be flagged as the primary contact.
5. Contracts have an expiry date; the system alerts 30 days before expiry.
6. Activity types are: CALL, MEETING, NOTE, TASK, FOLLOW_UP, EMAIL.
7. Tasks have a due date, assignee (system user), and completion status.
8. The activity timeline shows all activities for a company/candidate in reverse chronological order.
9. Documents uploaded to contracts are stored in Cloudflare R2; presigned URLs are used for download.
10. All CRM entities are soft-deletable.

### Functional Requirements

**FR-CRM-001:** The system shall allow creating, reading, updating, and soft-deleting company records.  
**FR-CRM-002:** The system shall allow filtering companies by industry, status, and search term.  
**FR-CRM-003:** The system shall allow creating contacts linked to a company, with fields: name, title, email, phone, LinkedIn.  
**FR-CRM-004:** The system shall allow uploading contract documents (PDF, DOCX) to R2 and tracking expiry dates.  
**FR-CRM-005:** The system shall allow adding branches to a company with address and contact details.  
**FR-CRM-006:** The system shall provide a polymorphic activity system supporting all activity types.  
**FR-CRM-007:** The system shall send a BullMQ reminder email 1 hour before a TASK due date.  
**FR-CRM-008:** The system shall display a chronological activity timeline per company and per candidate.  
**FR-CRM-009:** The system shall allow assigning tasks to system users and tracking completion.  
**FR-CRM-010:** The company detail page shall show: open jobs count, active placements, total invoiced amount.

### Acceptance Criteria

**AC-CRM-001:** Given a user creates a company, when they submit the form, then the company appears in the list and its creation is logged in audit logs.  
**AC-CRM-002:** Given a company has a contract expiring in 25 days, when the daily scheduler runs, then a reminder notification is created for the account manager.  
**AC-CRM-003:** Given a user adds a CALL activity to a company, when they view the company timeline, then the call appears at the top with timestamp and description.  
**AC-CRM-004:** Given a task is overdue by 1 day, when the user views their task list, then the task is highlighted in coral/red.

---

## 3. ATS — Jobs

### Purpose
The Jobs module manages the end-to-end lifecycle of job openings within the recruitment agency. It covers internal job requisition creation and approval, publication of approved jobs as active openings, and tracking of each job's status through its lifecycle until it is filled.

### Business Rules
1. A Job Requisition must be created by an HR User or Recruitment Manager and approved before a Job Opening is created.
2. Approval workflow states: DRAFT → PENDING_APPROVAL → APPROVED → REJECTED.
3. Only System Administrator or Recruitment Manager can approve or reject a requisition.
4. A Job Opening is automatically created when a requisition is APPROVED.
5. Job Opening statuses: OPEN, ON_HOLD, CLOSED, FILLED.
6. A job transitions to FILLED automatically when a placement is created for it.
7. Salary range is optional but if provided, min salary must be less than max salary.
8. Job type options: FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP.
9. Jobs support both Arabic and English descriptions.
10. A job can be linked to one client company.

### Functional Requirements

**FR-JOB-001:** The system shall allow creating Job Requisitions with fields: title, department, company, location, type, salary range, description, requirements, deadline.  
**FR-JOB-002:** The system shall implement a requisition approval workflow with email notifications to approvers.  
**FR-JOB-003:** The system shall auto-create a Job Opening when a requisition is approved.  
**FR-JOB-004:** The system shall allow managing Job Opening status (Open, On Hold, Close).  
**FR-JOB-005:** The system shall display the number of applicants per stage on the job detail page.  
**FR-JOB-006:** The system shall support full-text search on job title, department, and company.  
**FR-JOB-007:** The system shall track time-to-fill (date opened → date first placement created).

### Acceptance Criteria

**AC-JOB-001:** Given an HR User creates a requisition, when submitted, then status is PENDING_APPROVAL and an email is sent to the Recruitment Manager.  
**AC-JOB-002:** Given a Recruitment Manager approves a requisition, when approved, then a Job Opening with status OPEN is created and the requester is notified.  
**AC-JOB-003:** Given a placement is created for a job, when saved, then the job status changes to FILLED automatically.

---

## 4. ATS — Candidates

### Purpose
The Candidates module is the central talent database of Tashgheel HRMS. It stores comprehensive profiles for all candidates, including their professional experience, education, skills, documents, and application history. It provides powerful search, filter, tagging, and pooling capabilities to help recruiters quickly find the right candidates.

### Business Rules
1. Candidate email must be unique in the system (if provided).
2. A candidate can be tagged with multiple tags for easy categorization.
3. Candidate documents are stored in Cloudflare R2; file types accepted: PDF, DOCX, PNG, JPG (max 10MB each).
4. Candidates support soft deletion; deleted candidates are removed from search results but not from placements.
5. Candidate pools are named collections that a recruiter can curate for a specific search need.
6. Experience years are calculated automatically from experience records (start date → end date or today).
7. Candidate skills support proficiency levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT.
8. Full-text search uses pg_trgm for fuzzy matching on name, email, and skills.
9. Candidates cannot be permanently deleted if they have active applications or placements.
10. Source tracking (LinkedIn, Referral, Job Board, Direct, etc.) is required.

### Functional Requirements

**FR-CAND-001:** The system shall allow creating candidate profiles with full personal and professional details.  
**FR-CAND-002:** The system shall allow managing experience, education, and skill sub-records per candidate.  
**FR-CAND-003:** The system shall allow uploading multiple documents per candidate to R2 with type labels (CV, Certificate, Portfolio).  
**FR-CAND-004:** The system shall provide full-text search with fuzzy matching using pg_trgm.  
**FR-CAND-005:** The system shall allow advanced filtering by: skills, location, nationality, experience years, expected salary range, availability, source, tags.  
**FR-CAND-006:** The system shall allow creating named candidate pools and adding/removing candidates from them.  
**FR-CAND-007:** The system shall show a candidate's full application history (job applied, stage, outcome, recruiter).  
**FR-CAND-008:** The system shall display a candidate availability indicator (Available, Notice Period, Employed, Unavailable).  
**FR-CAND-009:** The system shall support AI-generated candidate summaries (see AI module).

### Acceptance Criteria

**AC-CAND-001:** Given a recruiter searches for "python developer", when the search executes, then candidates with "Python" in their skills or title appear, including fuzzy matches.  
**AC-CAND-002:** Given a user uploads a 15MB PDF, when submitted, then the system rejects it with an error message stating the 10MB limit.  
**AC-CAND-003:** Given a candidate has an active placement, when a user attempts to delete the candidate, then the system prevents deletion and shows an error.

---

## 5. Recruitment Pipeline

### Purpose
The Recruitment Pipeline module provides a visual Kanban board interface for managing candidate applications through defined recruitment stages. It enables recruiters to track candidate progress, move them between stages, assign recruiter ownership, and maintain a complete history of every stage transition.

### Business Rules
1. An application links one candidate to one job opening (unique pair).
2. Pipeline stages in order: NEW_APPLICATION → SCREENING → HR_INTERVIEW → TECHNICAL_INTERVIEW → ASSESSMENT → OFFER → PLACEMENT.
3. Terminal states: REJECTED, WITHDRAWN (cannot be moved forward after these).
4. Every stage transition is recorded in application_stage_logs with timestamp and optional note.
5. A recruiter must be assigned to every active application.
6. A candidate can have multiple applications (to different jobs) simultaneously.
7. Bulk stage update is allowed (move multiple candidates at once).
8. The Kanban board is filtered per job opening; all jobs view is also available.
9. Cards show: candidate name, current title, days in current stage, assigned recruiter avatar.
10. Applications cannot be re-opened once they reach REJECTED or WITHDRAWN status.

### Functional Requirements

**FR-PIPE-001:** The system shall display a Kanban board with one column per pipeline stage.  
**FR-PIPE-002:** The system shall support drag-and-drop to move candidate cards between stages.  
**FR-PIPE-003:** The system shall prompt for an optional note when a card is moved to a new stage.  
**FR-PIPE-004:** The system shall allow filtering the Kanban by job opening.  
**FR-PIPE-005:** The system shall allow adding an existing candidate to a job's pipeline.  
**FR-PIPE-006:** The system shall show a right-side drawer with full application details when a card is clicked.  
**FR-PIPE-007:** The system shall display days-in-stage counter on each Kanban card.  
**FR-PIPE-008:** The system shall allow bulk stage transitions for selected candidates.  
**FR-PIPE-009:** The system shall provide an application stage history timeline in the detail drawer.

### Acceptance Criteria

**AC-PIPE-001:** Given a recruiter drags a card from "Screening" to "HR Interview", when dropped, then the stage log records the transition with user and timestamp, and the card appears in the new column.  
**AC-PIPE-002:** Given a card is in "Rejected" status, when a user tries to drag it, then the drag is blocked and a tooltip explains the restriction.  
**AC-PIPE-003:** Given a job has 40 candidates across stages, when the Kanban loads, then all candidates appear in their correct columns within 2 seconds.

---

## 6. Interviews

### Purpose
The Interviews module handles the end-to-end scheduling, tracking, and evaluation of candidate interviews. It supports multiple interview types, multiple interviewers per session, structured feedback collection, and automated email notifications with calendar invites to all participants.

### Business Rules
1. An interview must be linked to an application.
2. Interview types: HR, TECHNICAL, FINAL, ASSESSMENT, CLIENT.
3. Multiple interviewers can be assigned per interview session.
4. An interview requires: type, scheduled_at, at least one interviewer, and either location or video_link.
5. Email notifications with .ics calendar attachments are sent to candidate and all interviewers upon scheduling.
6. Rescheduling sends updated notifications to all parties.
7. Cancellation requires a reason; cancelled interviews are marked but not deleted.
8. Feedback forms can be submitted per interviewer independently.
9. Feedback fields: competency ratings (1–5 scale), overall recommendation (HIRE / HOLD / REJECT), general notes.
10. An interview cannot be scheduled in the past.

### Functional Requirements

**FR-INT-001:** The system shall allow scheduling interviews linked to applications with type, date/time, interviewers, and location.  
**FR-INT-002:** The system shall send email notifications with .ics attachments to candidate and all interviewers upon scheduling.  
**FR-INT-003:** The system shall allow rescheduling with updated notifications.  
**FR-INT-004:** The system shall allow cancelling an interview with a mandatory reason.  
**FR-INT-005:** The system shall provide a structured feedback form per interviewer with competency ratings.  
**FR-INT-006:** The system shall display upcoming interviews in a calendar/list view.  
**FR-INT-007:** The system shall prevent scheduling an interview in the past.  
**FR-INT-008:** The system shall show interview history per candidate on their profile.

### Acceptance Criteria

**AC-INT-001:** Given an interview is scheduled, when saved, then emails with .ics attachments are sent to the candidate and interviewers within 60 seconds.  
**AC-INT-002:** Given an interviewer submits feedback, when saved, then the feedback is visible on the application's interview history.  
**AC-INT-003:** Given a user attempts to schedule an interview with a past date, when submitted, then the form shows a validation error.

---

## 7. Offers

### Purpose
The Offers module manages the creation, approval, delivery, and tracking of job offers to candidates. It supports a structured approval workflow, PDF offer letter generation, email delivery to candidates, and full status tracking from draft through acceptance or rejection.

### Business Rules
1. An offer must be linked to an application that is in ASSESSMENT or OFFER stage.
2. Only one active offer can exist per application at a time.
3. Offer approval workflow: DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACCEPTED | REJECTED | EXPIRED.
4. Offers require Recruitment Manager approval before being sent to candidates.
5. Offer letters are generated as PDFs using a Handlebars HTML template rendered server-side.
6. Offer expiry date is mandatory; offers auto-transition to EXPIRED status on the expiry date.
7. When an offer is ACCEPTED, the system automatically creates a Placement record.
8. Offer salary currency must match the system's configured currency.
9. Rejected offers can have a rejection reason noted for reporting.
10. Sent offers cannot be edited; a new offer must be created to modify terms.

### Functional Requirements

**FR-OFF-001:** The system shall allow creating offers with fields: salary, currency, benefits, start_date, expiry_date, notes.  
**FR-OFF-002:** The system shall implement an approval workflow requiring manager sign-off before sending.  
**FR-OFF-003:** The system shall generate a PDF offer letter from a configurable Handlebars template.  
**FR-OFF-004:** The system shall allow sending the offer letter PDF to the candidate via email.  
**FR-OFF-005:** The system shall track offer status transitions with timestamps.  
**FR-OFF-006:** The system shall auto-create a Placement when an offer is marked as ACCEPTED.  
**FR-OFF-007:** The system shall auto-expire offers that pass their expiry date (via scheduled job).

### Acceptance Criteria

**AC-OFF-001:** Given a Recruitment Manager approves an offer, when the recruiter clicks "Send to Candidate", then a PDF offer letter is generated and emailed to the candidate.  
**AC-OFF-002:** Given a candidate accepts an offer, when the status is updated to ACCEPTED, then a Placement record is automatically created with start_date and fee_amount.  
**AC-OFF-003:** Given an offer's expiry date passes, when the daily scheduler runs, then the offer status changes to EXPIRED and a notification is created.

---

## 8. Placement Management

### Purpose
The Placement Management module tracks confirmed placements from offer acceptance through the guarantee period and beyond. It provides automated guarantee period monitoring, recruiter performance metrics, and proactive alerts to prevent untracked guarantee expirations.

### Business Rules
1. A Placement is created automatically when an offer is accepted.
2. Placement fields: start_date, fee_amount, fee_type (FIXED or PERCENTAGE), guarantee_days (default 90).
3. guarantee_end_date is calculated as: start_date + guarantee_days.
4. Guarantee statuses: ACTIVE (within period), AT_RISK (≤14 days remaining), EXPIRED (past end date), VOIDED (voided by admin).
5. A reminder email is sent to the responsible recruiter and manager 14 days before guarantee expiry.
6. A second reminder is sent 7 days before expiry.
7. On guarantee expiry day, status updates to EXPIRED and an in-app notification is created.
8. Placement statuses: ACTIVE, GUARANTEE_PERIOD, COMPLETED, REPLACED.
9. Time-to-fill is calculated per job: date job opened → date of first placement start_date.
10. A placement cannot be deleted; it can only be voided by a System Administrator.

### Functional Requirements

**FR-PLAC-001:** The system shall auto-create a Placement upon offer acceptance with all relevant fields.  
**FR-PLAC-002:** The system shall calculate and store guarantee_end_date at placement creation.  
**FR-PLAC-003:** The system shall run a daily BullMQ job to check guarantee expiry status and send reminders at 14-day and 7-day marks.  
**FR-PLAC-004:** The system shall auto-update guarantee_status on expiry via scheduled job.  
**FR-PLAC-005:** The system shall provide a placements list filterable by status, recruiter, company, and date range.  
**FR-PLAC-006:** The system shall display a guarantee countdown card on the placement detail page.  
**FR-PLAC-007:** The system shall provide recruiter performance metrics: total placements, total revenue, avg time-to-fill.

### Acceptance Criteria

**AC-PLAC-001:** Given a placement has 14 days left in its guarantee period, when the daily job runs, then an email is sent to the recruiter and manager.  
**AC-PLAC-002:** Given a placement's guarantee_end_date has passed, when the daily job runs, then guarantee_status updates to EXPIRED and an in-app notification is created.  
**AC-PLAC-003:** Given a recruiter views their performance dashboard, then they see their total placements, revenue generated, and average time-to-fill.

---

## 9. Replacement Management

### Purpose
The Replacement Management module handles cases where a placed candidate leaves during the guarantee period and the agency must provide a replacement. It tracks the replacement request, the reason for the original candidate's departure, the assignment of a new candidate, and the completion of the replacement cycle.

### Business Rules
1. A replacement can only be initiated for placements with status ACTIVE or GUARANTEE_PERIOD.
2. A replacement request must include a reason (enum) and optional details.
3. Reasons: PERFORMANCE, CULTURAL_FIT, RESIGNATION, TERMINATION, MEDICAL, OTHER.
4. Once a replacement is requested, the original placement status changes to REPLACED.
5. A new application and offer flow may be required for the replacement candidate.
6. Replacement statuses: REQUESTED → IN_PROGRESS → COMPLETED.
7. Only one active replacement per placement at a time.
8. Replacement statistics are tracked for reporting (rate per company, per recruiter, per period).

### Functional Requirements

**FR-REPL-001:** The system shall allow initiating a replacement request against an active placement.  
**FR-REPL-002:** The system shall track replacement reason, detail notes, and expected start date of replacement.  
**FR-REPL-003:** The system shall update original placement status to REPLACED on replacement initiation.  
**FR-REPL-004:** The system shall allow assigning a new candidate to complete the replacement.  
**FR-REPL-005:** The system shall provide replacement statistics: replacement rate by company, recruiter, and time period.

### Acceptance Criteria

**AC-REPL-001:** Given a recruiter initiates a replacement on a placement, when saved, then the original placement status becomes REPLACED and a replacement record is created with status REQUESTED.  
**AC-REPL-002:** Given the replacement is completed, when the recruiter marks it complete, then the replacement status becomes COMPLETED and the replacement_end_date is recorded.

---

## 10. Finance

### Purpose
The Finance module manages all financial operations of the recruitment agency including invoice generation, payment tracking, expense management, and revenue reporting. It provides clear visibility into financial performance, outstanding amounts, and profitability.

### Business Rules
1. Invoices are auto-numbered sequentially: INV-YYYY-NNN (e.g., INV-2025-001).
2. An invoice can be linked to a placement (auto-populates fee amount) or created manually.
3. Invoice statuses: DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.
4. An invoice becomes OVERDUE if unpaid after its due_date (checked daily by scheduler).
5. VAT percentage is configurable in system settings; tax is calculated automatically.
6. Multiple payments can be recorded against a single invoice until it is fully PAID.
7. Expense categories: OFFICE, TRAVEL, MARKETING, SOFTWARE, UTILITIES, OTHER.
8. Finance data is accessible only to Finance User, Recruitment Manager, and System Administrator.
9. Exports are available in Excel (.xlsx), PDF, and CSV formats.
10. Invoice cancellation requires an admin and records a cancellation reason.

### Functional Requirements

**FR-FIN-001:** The system shall auto-generate invoices with sequential numbers per year.  
**FR-FIN-002:** The system shall support multi-line invoice items with description, quantity, and unit price.  
**FR-FIN-003:** The system shall auto-populate invoice amount from a linked placement's fee.  
**FR-FIN-004:** The system shall allow recording partial and full payments against invoices.  
**FR-FIN-005:** The system shall auto-transition invoices to OVERDUE status via daily scheduled job.  
**FR-FIN-006:** The system shall allow creating, editing, and categorizing expense records.  
**FR-FIN-007:** The system shall provide revenue reports: monthly, by recruiter, by company, YTD.  
**FR-FIN-008:** The system shall provide an outstanding invoices report.  
**FR-FIN-009:** The system shall support exporting all reports in Excel, PDF, and CSV formats.  
**FR-FIN-010:** The system shall send overdue invoice reminder emails to the finance team.

### Acceptance Criteria

**AC-FIN-001:** Given a placement is created with fee_amount of $5,000, when the recruiter creates an invoice from it, then the invoice pre-fills with $5,000 and the correct client company.  
**AC-FIN-002:** Given an invoice's due_date has passed without full payment, when the daily job runs, then invoice status changes to OVERDUE and a notification is created.  
**AC-FIN-003:** Given a finance user exports the monthly revenue report, when they click Excel export, then a formatted .xlsx file downloads within 5 seconds.

---

## 11. AI Features

### Purpose
The AI Features module augments Tashgheel HRMS with intelligent automation capabilities powered by Google Gemini Flash and OpenAI GPT-4o Mini. It provides resume parsing to accelerate candidate creation, semantic candidate matching using vector embeddings, AI-generated job descriptions, personalized email drafting, and concise candidate executive summaries.

### Business Rules
1. Resume parsing accepts PDF files only, maximum 10MB.
2. Parsed candidate data must be reviewed by the recruiter before creating a candidate record.
3. Candidate embeddings are generated using OpenAI text-embedding-3-small (1536 dimensions).
4. Embeddings are stored in pgvector and updated within 60 seconds of candidate profile changes.
5. Candidate matching returns a maximum of 20 results ranked by cosine similarity.
6. AI-generated content (JDs, emails, summaries) is always presented for human review before use.
7. All AI API calls are logged with model, tokens used, and latency for cost monitoring.
8. AI features are only available to Recruiter, Recruitment Manager, and System Administrator roles.
9. Job Description generation supports both Arabic and English output.
10. The system degrades gracefully if AI services are unavailable (clear error message, no system crash).

### Functional Requirements

**FR-AI-001:** The system shall provide a resume upload interface supporting PDF drag-and-drop.  
**FR-AI-002:** The system shall extract candidate data from PDFs using Gemini Flash and return structured JSON.  
**FR-AI-003:** The system shall present parsed data for recruiter review before creating a candidate.  
**FR-AI-004:** The system shall generate OpenAI embeddings for each candidate upon creation/update.  
**FR-AI-005:** The system shall provide a "Find Matching Candidates" feature on job detail pages using pgvector cosine similarity.  
**FR-AI-006:** The system shall return matched candidates with a similarity score and skills gap analysis.  
**FR-AI-007:** The system shall provide an AI job description generator from title, department, and key requirements.  
**FR-AI-008:** The system shall provide AI email drafting for: offer letter, rejection, interview invite, follow-up.  
**FR-AI-009:** The system shall provide a 3-bullet AI candidate summary on the candidate profile page.  
**FR-AI-010:** The system shall support Arabic and English output for all AI-generated content.

### Acceptance Criteria

**AC-AI-001:** Given a recruiter uploads a 5MB PDF CV, when parsed, then structured candidate data (name, email, skills, experience) appears in a review form within 10 seconds.  
**AC-AI-002:** Given a job opening exists, when a recruiter clicks "Find Matching Candidates", then a ranked list of up to 20 candidates with similarity scores appears within 5 seconds.  
**AC-AI-003:** Given a recruiter selects Arabic as the output language for JD generation, when generated, then the returned job description is fully in Arabic.

---

## 12. Reporting & Analytics

### Purpose
The Reporting & Analytics module provides business intelligence for recruitment agency operations. It delivers real-time KPI dashboards, historical performance reports, and data exports that enable managers to make data-driven decisions across recruiting, client management, and financial performance.

### Business Rules
1. Dashboard KPIs are cached in Redis with a 5-minute TTL to ensure performance.
2. Reports are accessible by: System Administrator (all), Recruitment Manager (all), Finance User (finance reports only), Recruiter (own performance only).
3. Date range filters default to the current month; users can select any custom range.
4. Recruiter performance metrics: placements count, revenue generated, avg time-to-fill, replacement rate, pipeline count.
5. Pipeline funnel shows count and conversion rate per stage.
6. All reports support export in Excel (.xlsx), PDF, and CSV.
7. Client reports show per-company breakdown: placements, invoices, outstanding balance, replacement rate.
8. Finance reports include: total revenue, total expenses, net profit, collection rate, outstanding balance.

### Functional Requirements

**FR-REP-001:** The system shall provide a dashboard with real-time KPI cards: open jobs, active pipeline, placements MTD, revenue MTD, guarantee expiries upcoming.  
**FR-REP-002:** The system shall provide a monthly revenue vs expenses bar chart on the dashboard.  
**FR-REP-003:** The system shall provide a recruiter performance report with sortable table.  
**FR-REP-004:** The system shall provide a pipeline funnel chart per job or overall.  
**FR-REP-005:** The system shall provide a per-client report with date range selection.  
**FR-REP-006:** The system shall provide a finance report with monthly breakdown.  
**FR-REP-007:** The system shall support Excel, PDF, and CSV export on all report pages.

### Acceptance Criteria

**AC-REP-001:** Given a manager opens the dashboard, when the page loads, then all KPI cards display current data within 1 second (served from Redis cache).  
**AC-REP-002:** Given a recruiter views the recruiter performance report, then they only see their own data; a manager sees all recruiters.  
**AC-REP-003:** Given a user exports a report to Excel, when download completes, then the file contains correct headers, formatted data, and no missing rows.

---

## 13. Notifications & Automation

### Purpose
The Notifications & Automation module handles all system-generated communications — both real-time in-app notifications via Socket.IO and email notifications via Resend. It orchestrates automated scheduled jobs for guarantee monitoring, invoice reminders, and daily digest emails, ensuring that no critical event goes unnoticed.

### Business Rules
1. In-app notifications are delivered in real time via Socket.IO to online users.
2. Offline users receive their notifications upon next login.
3. Email notifications use Resend as the delivery provider.
4. Email templates are stored in the database and rendered with Handlebars at send time.
5. Users can configure which notification types they receive (email, in-app, or both).
6. Scheduled jobs run via BullMQ with Redis as the queue backend.
7. The daily digest email is sent at 7:00 AM system timezone to Recruitment Managers and System Administrators.
8. All queued emails are retried up to 3 times with exponential backoff on failure.
9. Failed emails after 3 retries create a system alert in audit logs.
10. Notification types: GUARANTEE_EXPIRY, INVOICE_OVERDUE, INTERVIEW_REMINDER, OFFER_EXPIRY, TASK_DUE, DAILY_DIGEST, SYSTEM_ALERT.

### Functional Requirements

**FR-NOTIF-001:** The system shall deliver real-time in-app notifications via Socket.IO to authenticated users.  
**FR-NOTIF-002:** The system shall persist all notifications in the database for retrieval by offline users.  
**FR-NOTIF-003:** The system shall allow users to mark individual notifications as read and mark all as read.  
**FR-NOTIF-004:** The system shall display an unread notification count badge on the topbar bell icon.  
**FR-NOTIF-005:** The system shall support configurable email templates stored in the database.  
**FR-NOTIF-006:** The system shall provide a daily digest email with: guarantee expiries, overdue invoices, upcoming interviews, pending tasks.  
**FR-NOTIF-007:** The system shall retry failed email deliveries up to 3 times with exponential backoff.  
**FR-NOTIF-008:** The system shall allow users to configure their notification preferences per notification type.

### Acceptance Criteria

**AC-NOTIF-001:** Given a placement guarantee is expiring in 14 days, when the daily scheduler runs at 8 AM, then a notification is created in-app and an email is sent to the recruiter and manager.  
**AC-NOTIF-002:** Given a user is online when a notification is triggered, when it fires, then the bell icon count updates in real time without page refresh.  
**AC-NOTIF-003:** Given a user marks all notifications as read, when confirmed, then the unread badge disappears and all notifications show as read.
