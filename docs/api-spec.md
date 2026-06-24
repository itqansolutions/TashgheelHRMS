# Tashgheel HRMS — API Specification

**Version:** 1.0  
**Date:** 2025  
**Base URL:** `/api`  
**Response Formats:** All JSON responses conform to a unified standard structure:
```json
{
  "success": true,
  "data": {},
  "message": "Optional response message"
}
```
Or for errors:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message",
    "details": {}
  }
}
```

---

## 1. Authentication (`/auth`)

### 1.1 Login
- **Endpoint:** `POST /auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "user@tashgheel.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "c1a0172c-9a4f-4d6b-bd8d-69b7f58d0421",
        "email": "user@tashgheel.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["Recruiter"]
      }
    }
  }
  ```

### 1.2 Token Refresh
- **Endpoint:** `POST /auth/refresh`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

### 1.3 Logout
- **Endpoint:** `POST /auth/logout`
- **Auth:** JWT Required
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### 1.4 Forgot Password
- **Endpoint:** `POST /auth/forgot-password`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "user@tashgheel.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password reset instructions sent to your email"
  }
  ```

---

## 2. User & RBAC Management (`/users`, `/roles`)

### 2.1 Get Users
- **Endpoint:** `GET /users`
- **Auth:** JWT Required (Permission: `users:read`)
- **Query Params:** `page`, `limit`, `search`, `status`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "id": "c1a0172c-9a4f-4d6b-bd8d-69b7f58d0421",
          "email": "recruiter@tashgheel.com",
          "firstName": "Ahmed",
          "lastName": "Ali",
          "status": "ACTIVE",
          "roles": ["Recruiter"]
        }
      ],
      "meta": { "total": 1, "page": 1, "pages": 1 }
    }
  }
  ```

### 2.2 Create User / Invite User
- **Endpoint:** `POST /users/invite`
- **Auth:** JWT Required (Permission: `users:write`)
- **Request Body:**
  ```json
  {
    "email": "new.user@tashgheel.com",
    "firstName": "Khaled",
    "lastName": "Mansour",
    "roleId": "d3b07384-d113-4876-96b6-52c1e7a5eb23"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Invitation sent successfully",
    "data": {
      "id": "893c52a0-4eb6-4c3e-8fa9-b8833b9b4f0b"
    }
  }
  ```

---

## 3. CRM Module (`/companies`, `/contacts`, `/activities`)

### 3.1 Get Companies
- **Endpoint:** `GET /companies`
- **Auth:** JWT Required (Permission: `companies:read`)
- **Query Params:** `page`, `limit`, `search`, `status`, `industry`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "companies": [
        {
          "id": "f89d5f06-d08b-4a57-b08e-03ebf16a75f1",
          "name": "Tashgheel Tech Solutions",
          "industry": "Technology",
          "status": "ACTIVE",
          "activeJobsCount": 3,
          "placementsCount": 5
        }
      ],
      "meta": { "total": 1, "page": 1, "pages": 1 }
    }
  }
  ```

### 3.2 Create Company
- **Endpoint:** `POST /companies`
- **Auth:** JWT Required (Permission: `companies:write`)
- **Request Body:**
  ```json
  {
    "name": "Acme Corp",
    "industry": "Manufacturing",
    "website": "https://acme.com",
    "accountManagerId": "c1a0172c-9a4f-4d6b-bd8d-69b7f58d0421"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "893c52a0-4eb6-4c3e-8fa9-b8833b9b4f0b",
      "name": "Acme Corp",
      "status": "ACTIVE"
    }
  }
  ```

---

## 4. ATS Jobs Module (`/job-requisitions`, `/job-openings`)

### 4.1 Create Requisition
- **Endpoint:** `POST /job-requisitions`
- **Auth:** JWT Required (Permission: `jobs:write`)
- **Request Body:**
  ```json
  {
    "title": "Senior React Developer",
    "department": "Engineering",
    "companyId": "f89d5f06-d08b-4a57-b08e-03ebf16a75f1",
    "location": "Riyadh, KSA (Hybrid)",
    "type": "FULL_TIME",
    "salaryMin": 15000,
    "salaryMax": 20000,
    "descriptionEn": "We are looking for...",
    "requirementsEn": "5+ years experience..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e93d5c2e-4b62-43cf-bf29-3736780c102a",
      "status": "PENDING_APPROVAL"
    }
  }
  ```

### 4.2 Approve/Reject Requisition
- **Endpoint:** `POST /job-requisitions/:id/approve`
- **Auth:** JWT Required (Permission: `jobs:approve`)
- **Request Body:**
  ```json
  {
    "approved": true,
    "rejectionReason": ""
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "requisitionId": "e93d5c2e-4b62-43cf-bf29-3736780c102a",
      "status": "APPROVED",
      "jobOpeningId": "c92e105e-f08a-4d2c-8822-cb6f966144da"
    }
  }
  ```

---

## 5. ATS Candidates Module (`/candidates`)

### 5.1 Create Candidate
- **Endpoint:** `POST /candidates`
- **Auth:** JWT Required (Permission: `candidates:write`)
- **Request Body:**
  ```json
  {
    "firstName": "Omar",
    "lastName": "Hassan",
    "email": "omar.hassan@example.com",
    "phone": "+966501234567",
    "linkedinUrl": "https://linkedin.com/in/omarhassan",
    "nationality": "Saudi",
    "currentLocation": "Riyadh",
    "expectedSalary": 18000,
    "availability": "NOTICE_PERIOD",
    "source": "LinkedIn",
    "skills": [
      { "skillName": "React", "proficiency": "ADVANCED" },
      { "skillName": "TypeScript", "proficiency": "ADVANCED" }
    ],
    "experience": [
      {
        "companyName": "Tech Corp",
        "title": "Frontend Engineer",
        "startDate": "2023-01-01",
        "isCurrent": true
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "d04e12c5-ef9a-4c28-bb8d-73629e843c1b"
    }
  }
  ```

### 5.2 Upload Candidate Document
- **Endpoint:** `POST /candidates/:id/documents`
- **Auth:** JWT Required (Permission: `candidates:write`)
- **Request Multipart:** `file` (PDF, DOCX) + `type` (CV, CERTIFICATE, PORTFOLIO)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e3e8f4c2-901a-4d02-a1bb-e493e82bc814",
      "fileName": "resume_omar.pdf",
      "fileUrl": "https://r2.tashgheel-hrms.com/candidates/d04e12c5-ef9a-4c28-bb8d-73629e843c1b/resume_omar.pdf"
    }
  }
  ```

---

## 6. Pipeline & Applications (`/applications`)

### 6.1 Move Application Stage
- **Endpoint:** `PATCH /applications/:id/stage`
- **Auth:** JWT Required (Permission: `pipeline:write`)
- **Request Body:**
  ```json
  {
    "toStage": "HR_INTERVIEW",
    "note": "Candidate passed screening. Moving to HR Interview."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "b90e4f2a-e883-4a11-a8bb-2bcf81e053fa",
      "stage": "HR_INTERVIEW"
    }
  }
  ```

---

## 7. Interviews (`/interviews`)

### 7.1 Schedule Interview
- **Endpoint:** `POST /interviews`
- **Auth:** JWT Required (Permission: `interviews:write`)
- **Request Body:**
  ```json
  {
    "applicationId": "b90e4f2a-e883-4a11-a8bb-2bcf81e053fa",
    "type": "TECHNICAL",
    "scheduledAt": "2025-07-01T10:00:00Z",
    "location": "Zoom Video Call",
    "videoLink": "https://zoom.us/j/123456789",
    "interviewerIds": ["c1a0172c-9a4f-4d6b-bd8d-69b7f58d0421"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e93f10cb-82b2-4d2c-88ee-1a932ec0b4a1",
      "status": "SCHEDULED"
    }
  }
  ```

### 7.2 Submit Feedback
- **Endpoint:** `POST /interviews/:id/feedback`
- **Auth:** JWT Required (Permission: `interviews:write`)
- **Request Body:**
  ```json
  {
    "recommendation": "HIRE",
    "notes": "Excellent JavaScript problem-solving skills.",
    "competencyRatings": {
      "javascript": 5,
      "communication": 4,
      "problem_solving": 5
    }
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Feedback submitted successfully"
  }
  ```

---

## 8. Offers & Placements (`/offers`, `/placements`)

### 8.1 Create Offer
- **Endpoint:** `POST /offers`
- **Auth:** JWT Required (Permission: `offers:write`)
- **Request Body:**
  ```json
  {
    "applicationId": "b90e4f2a-e883-4a11-a8bb-2bcf81e053fa",
    "salaryAmount": 18000,
    "currency": "SAR",
    "benefits": "Medical insurance + Annual ticket",
    "startDate": "2025-08-01",
    "expiryDate": "2025-07-15"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "f90c4083-d922-4a0b-8fee-463dfb12e0da",
      "status": "PENDING_APPROVAL"
    }
  }
  ```

### 8.2 Accept Offer (Transitions to Placement)
- **Endpoint:** `POST /offers/:id/accept`
- **Auth:** JWT Required (Permission: `offers:write`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "offerId": "f90c4083-d922-4a0b-8fee-463dfb12e0da",
      "status": "ACCEPTED",
      "placement": {
        "id": "783f902e-c1bb-4e92-baee-23e9a4f479a8",
        "startDate": "2025-08-01",
        "feeAmount": 18000,
        "guaranteeEndDate": "2025-10-30",
        "guaranteeStatus": "ACTIVE"
      }
    }
  }
  ```

---

## 9. Finance (`/invoices`, `/payments`, `/expenses`)

### 9.1 Create Invoice
- **Endpoint:** `POST /invoices`
- **Auth:** JWT Required (Permission: `finance:write`)
- **Request Body:**
  ```json
  {
    "companyId": "f89d5f06-d08b-4a57-b08e-03ebf16a75f1",
    "placementId": "783f902e-c1bb-4e92-baee-23e9a4f479a8",
    "issueDate": "2025-08-01",
    "dueDate": "2025-08-31",
    "items": [
      {
        "description": "Recruitment service fee - Placement: Omar Hassan (Senior React Developer)",
        "quantity": 1,
        "unitPrice": 18000
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e30f40ab-d88e-4a6c-9fee-b8a2e1d053fa",
      "invoiceNumber": "INV-2025-001",
      "subtotal": 18000,
      "vatAmount": 2700,
      "totalAmount": 20700
    }
  }
  ```

---

## 10. AI Module (`/ai`)

### 10.1 Parse Resume
- **Endpoint:** `POST /ai/parse-resume`
- **Auth:** JWT Required (Permission: `candidates:write`)
- **Request Multipart:** `file` (PDF)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "firstName": "Omar",
      "lastName": "Hassan",
      "email": "omar.hassan@example.com",
      "phone": "+966501234567",
      "skills": ["React", "TypeScript", "NodeJS"],
      "experience": [
        {
          "companyName": "Tech Corp",
          "title": "Frontend Developer",
          "startDate": "2023-01-01",
          "isCurrent": true
        }
      ]
    }
  }
  ```

### 10.2 Semantic Candidate Match
- **Endpoint:** `GET /ai/match-candidates/:jobOpeningId`
- **Auth:** JWT Required (Permission: `candidates:read`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "candidateId": "d04e12c5-ef9a-4c28-bb8d-73629e843c1b",
        "name": "Omar Hassan",
        "similarityScore": 0.89,
        "skillsGap": {
          "matching": ["React", "TypeScript"],
          "missing": ["TailwindCSS"]
        }
      }
    ]
  }
  ```
