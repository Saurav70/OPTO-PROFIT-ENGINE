# OPTO-PROFIT: Release Notes & Handover Document

**Version:** 1.1.0 (Release Candidate)  
**Release Date:** July 2026  
**Prepared By:** OPTO-PROFIT Development Team  
**Prepared For:** [Client Name / Organization]

---

## Table of Contents

1. [Purpose of This Document](#1-purpose-of-this-document)
2. [Key Terms Explained](#2-key-terms-explained)
3. [What Is Being Delivered](#3-what-is-being-delivered)
4. [Features Included in v1.1.0](#4-features-included-in-v110)
5. [Security Features Summary](#5-security-features-summary)
6. [Accompanying Documentation](#6-accompanying-documentation)
7. [Known Limitations](#7-known-limitations)
8. [Future Roadmap](#8-future-roadmap)
9. [Handover Checklist](#9-handover-checklist)
10. [Acceptance & Sign-Off](#10-acceptance--sign-off)

---

## 1. Purpose of This Document

This document serves as the **official handover record** between the OPTO-PROFIT development team and your organization. It lists everything that is being delivered, what features are included, what limitations exist, and what documents you should have received alongside the software.

Think of this as a **receipt and inventory list** for your software purchase. After reviewing this document, you should have a clear understanding of what you are receiving and what to expect.

---

## 2. Key Terms Explained

| Term | What It Means |
|------|---------------|
| **Release Candidate (RC)** | A version of the software that the development team considers complete and ready for real-world use. It has passed all internal testing. |
| **v1.1.0** | The version number. The first number (1) represents a major release. The second (1) represents minor feature additions (e.g. PDF Export, Manual Overrides). The third (0) represents bug fixes. |
| **Handover** | The formal process of transferring the finished software, documentation, and license keys from the development team to your organization. |
| **Deliverable** | Any item (software, document, key, or file) that is provided to you as part of this project. |
| **Known Limitation** | A feature that is not yet implemented or a restriction that exists by design. These are documented here for full transparency. |
| **Roadmap** | A plan for future updates and improvements that are being considered for upcoming versions. |

---

## 3. What Is Being Delivered

### 3.1 Software Deliverables

| # | Deliverable | Description | Format |
|---|-------------|-------------|--------|
| 1 | **OPTO-PROFIT Desktop Application** | The main software installer for Windows | `.exe` installer (NSIS) |
| 2 | **License Key(s)** | One unique license key per authorized workstation | Text string (delivered securely) |

### 3.2 Documentation Deliverables

| # | Document | Audience | Description |
|---|----------|----------|-------------|
| 1 | End-User Manual | Factory engineers, operators | Step-by-step guide to using the software |
| 2 | Licensing & Provisioning Guide | IT administrators, managers | How to activate and manage licenses |
| 3 | IT & Deployment Guide | IT department | Installation, security, firewall, antivirus, backups |
| 4 | Troubleshooting & Support Guide | All users and IT support | Solutions to common problems |
| 5 | Release Notes & Handover Document | Management, IT leads | This document — formal record of what was delivered |

### 3.3 Support Arrangement

| Item | Details |
|------|---------|
| **Initial Support Period** | [To be agreed — e.g., 90 days from handover date] |
| **Support Channel** | [Email / Phone / Ticketing system — to be filled in] |
| **Response Time** | [To be agreed — e.g., 24 business hours for critical issues] |

> **Note:** Replace the bracketed `[...]` placeholders above with the actual terms agreed upon in your contract.

---

## 4. Features Included in v1.1.0

### 4.1 Core Assembly Line Optimization Engine

These are the main features that your engineers will use daily:

| Feature | Description |
|---------|-------------|
| **Task Management** | Create, edit, and delete assembly line tasks. Each task has an ID, name, duration (time), and optional zone assignment. |
| **Predecessor Mapping** | Define which tasks must be completed before others can begin. The system enforces these dependencies during optimization. |
| **Heuristic Optimization Algorithms** | Three industry-standard algorithms are included to automatically assign tasks to workstations: |
| — Longest Task First (LTF) | Prioritizes tasks with the longest individual duration. |
| — Most Following Tasks (MFT) | Prioritizes tasks that have the most tasks depending on them. |
| — Ranked Positional Weight (RPW) | Prioritizes tasks based on their own time plus all downstream successor times. Best overall balance. |
| **Zone Management** | Define physical areas of your factory (e.g., "Wet Zone", "Clean Room", "High-Voltage Area") and assign tasks to them. |
| **Zone Exclusions** | Define pairs of zones that cannot share a workstation (e.g., "Wet Zone" and "High-Voltage" cannot be together). |
| **Co-location Rules** | Force specific task pairs to always be assigned to the same workstation. |
| **Separation Rules** | Force specific task pairs to never be assigned to the same workstation. |
| **Custom Variables** | Define reusable variables (e.g., "Shift Time = 480 min", "Daily Demand = 200 units") and use them in formulas. |
| **Custom Formulas** | Write mathematical formulas using your variables (e.g., "Takt Time = shift_time / demand"). |
| **Target Efficiency** | Set your desired assembly line efficiency percentage (e.g., 85%) as a benchmark. |

### 4.2 Industrial Engineering KPIs (Key Performance Indicators)

The software automatically calculates and displays:

| KPI | What It Tells You |
|-----|-------------------|
| **Takt Time** | The maximum time allowed per unit to meet customer demand. Calculated as: Available Production Time ÷ Daily Demand. |
| **Line Efficiency (η)** | The percentage of total workstation time that is productive. Higher is better. 100% means zero idle time. |
| **Smoothness Index (SI)** | How evenly work is distributed across stations. Lower is better. A value of 0 means perfectly balanced. |
| **Theoretical Minimum Workstations** | The minimum number of stations mathematically required, before applying constraints. |

### 4.3 Project Management & Workflows

| Feature | Description |
|---------|-------------|
| **Profiles (Snapshots)** | Save your entire project state as a named profile. Restore it at any time to compare different optimization scenarios. |
| **Data Import/Export** | Import task data from `.csv`, `.xlsx`, `.json`, and `.opto` files. Export as `.opto` for offline sharing. |
| **Manual Task Overrides** | Interactively drag and drop tasks between stations on the Grid view to override the algorithm. The system bypasses strict takt-time bounds and live-recalculates KPIs. |
| **Financial Sensitivity Sliders** | A "What-If Scenario" panel with interactive range sliders for Demand, Unit Price, Unit Cost, and Operator Cost that recalculate ROI immediately. |
| **Station Layout Presets** | Create layout configurations on the interactive Floor Canvas, type a name, and save the spatial preset to switch layouts on the fly. |
| **PDF Report Generation** | Automatically generate and download a comprehensive PDF report capturing the precedence network, layout plan, KPI dashboard, and financial summary. |

### 4.4 Security & Authentication

| Feature | Description |
|---------|-------------|
| **User Registration & Login** | Secure account creation with password strength requirements (minimum 8 characters, 1 uppercase, 1 digit, 1 special character). |
| **Two-Factor Authentication (2FA)** | Optional extra security layer using authenticator apps (Google Authenticator, Microsoft Authenticator, etc.). |
| **Password Reset** | Built-in password reset flow with secure, one-time-use tokens that expire after 30 minutes. |
| **Session Management** | Automatic 24-hour session expiry. Sessions are cryptographically tied to the machine. |
| **Account Lockout** | After 5 failed login attempts, the account is temporarily locked to prevent brute-force attacks. |
| **Rate Limiting** | API-level throttling prevents abuse (e.g., max 3 login attempts per minute). |

### 4.5 Data Visualization

| Feature | Description |
|---------|-------------|
| **Interactive Precedence Diagram** | A visual graph showing all tasks and their dependencies as connected nodes. |
| **Station Assignment Charts** | Bar charts showing the workload distribution across workstations after optimization. |
| **Dashboard Overview** | A summary view displaying key metrics, recent projects, and quick-access actions. |

---

## 5. Security Features Summary

This section provides a high-level overview for management and compliance teams:

| Security Layer | Protection | Standard/Method |
|----------------|------------|-----------------|
| **License Enforcement** | Prevents unauthorized installation | Ed25519 digital signatures + HWID binding |
| **Database Encryption** | Protects data at rest | Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256) with PBKDF2-derived keys (600,000 iterations) |
| **Password Storage** | Prevents password theft | bcrypt one-way hashing with random salts |
| **Session Tokens** | Prevents session hijacking | JWT (HS256) in HttpOnly cookies + SHA-256 token hashing |
| **Transport Security** | Prevents eavesdropping | Localhost-only binding (127.0.0.1) — no external network exposure |
| **Injection Prevention** | Prevents SQL injection & XSS | SQLAlchemy ORM parameterized queries + React DOM auto-escaping |
| **Brute-Force Protection** | Prevents password guessing | Rate limiting (slowapi) + account lockout after 5 failures |
| **Security Headers** | Prevents clickjacking, MIME sniffing | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy |

**Offline Guarantee:** The application makes **zero outbound network connections**. No telemetry, no analytics, no update checks. All data remains on the local machine at all times.

---

## 6. Accompanying Documentation

Please verify that you have received all of the following documents:

| # | Document | Filename | ✓ Received |
|---|----------|----------|:----------:|
| 1 | End-User Manual | `end_user_manual.md` | ☐ |
| 2 | Licensing & Provisioning Guide | `client_provisioning_guide.md` | ☐ |
| 3 | IT & Deployment Guide | `it_deployment_guide.md` | ☐ |
| 4 | Troubleshooting & Support Guide | `troubleshooting_guide.md` | ☐ |
| 5 | Release Notes & Handover (this document) | `release_notes_handover.md` | ☐ |

---

## 7. Known Limitations

The following items are known limitations in v1.1.0. They are documented here for full transparency:

| # | Limitation | Impact | Workaround |
|---|-----------|--------|------------|
| 1 | **No automatic software updates** | New versions must be installed manually by IT. | The vendor will provide new installer files when updates are available. IT can use silent installation (`/S` flag) for mass deployment. |
| 2 | **Single-platform support (Windows only)** | The application runs only on Windows 10/11. macOS and Linux are not supported. | N/A — Windows is the target platform for industrial environments. |
| 3 | **License tied to hardware** | If the motherboard or CPU is replaced, a new license key is needed. | Contact the vendor with the old and new HWID to receive a replacement key at no additional cost. |
| 4 | **No cloud sync or real-time collaboration** | Users cannot edit the same project simultaneously on different machines. | Use `.opto` file exports to share project snapshots between machines. |
| 5 | **Database not portable between machines** | Copying the `data.db` file to another computer renders encrypted data unreadable. | Always use the in-app Export Profile feature to move data between machines. |
| 6 | **`.opto` double-click import requires Electron shell** | The OS file association for double-clicking `.opto` files is only active when running the full Electron desktop build. The pywebview fallback mode requires manual import via the dashboard. | Use the manual Import feature on the dashboard if the Electron shell is not available. |

---

## 8. Future Roadmap

The following features are under consideration for future releases. **These are NOT commitments** — they represent the development team's current direction and may change based on client feedback and priorities.

| Priority | Feature | Description |
|----------|---------|-------------|
| Medium | **Role-Based Access Control (RBAC)** | Granular permissions (Admin, Manager, Operator) to control who can modify vs. view data. |
| Medium | **Audit Log** | A tamper-proof log recording who changed what and when, for compliance purposes. |
| Low | **macOS Support** | Packaging the application for Apple macOS in addition to Windows. |
| Low | **Batch License Provisioning** | A tool for IT to activate multiple machines at once instead of one-by-one. |

---

## 9. Handover Checklist

This checklist should be completed jointly by the vendor and the client during the handover meeting:

### Software Delivery
- [ ] Installer file (`OPTO-PROFIT-Setup-1.0.0.exe`) delivered to client IT
- [ ] Installer successfully runs on at least one test workstation
- [ ] Application launches and displays the License Activation screen

### Licensing
- [ ] Client has provided HWID(s) for all workstations requiring activation
- [ ] Vendor has generated and delivered License Key(s) for each HWID
- [ ] At least one workstation has been successfully activated and tested
- [ ] Client IT understands the license renewal / transfer process

### Documentation
- [ ] All 5 documents listed in Section 6 have been received
- [ ] Client IT has reviewed the IT & Deployment Guide
- [ ] Client IT has configured antivirus exclusions (if applicable)
- [ ] End-users have received copies of the End-User Manual

### Training
- [ ] End-users have received a walkthrough / demo of core features
- [ ] IT staff understand the backup and recovery procedures
- [ ] At least one person on the client side can perform `.opto` file import/export

### Support
- [ ] Support contact information has been exchanged
- [ ] Support period and response times have been agreed upon
- [ ] Escalation procedure has been communicated

---

## 10. Acceptance & Sign-Off

By signing below, both parties confirm that the software and documentation have been delivered as described in this document, and that any known limitations have been disclosed and understood.

### Vendor

| Field | Details |
|-------|---------|
| **Name** | |
| **Title** | |
| **Date** | |
| **Signature** | |

### Client

| Field | Details |
|-------|---------|
| **Name** | |
| **Title** | |
| **Organization** | |
| **Date** | |
| **Signature** | |

---

*Document Version: 1.1 — OPTO-PROFIT v1.1.0 Release Candidate*
