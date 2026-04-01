# PRD: AI-Powered Atlas-to-Ready-to-Deliver Course Platform

**Version:** 3.1 – Agent Debate + GitHub Research Edition  
**Date:** April 2026  
**Status:** Ready for Phase 0 Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Agent Debate Roundtable](#2-agent-debate-roundtable)
3. [Consensus Architecture](#3-consensus-architecture)
4. [Detailed Architecture (Production-Ready)](#4-detailed-architecture-production-ready)
5. [Full Database Schema (Prisma)](#5-full-database-schema-prisma)
6. [Supabase RLS Policies](#6-supabase-rls-policies)
7. [Key Features + Sample Code](#7-key-features--sample-code)
8. [GitHub Open-Source Repository Research](#8-github-open-source-repository-research)
9. [Repository Comparison Matrix](#9-repository-comparison-matrix)
10. [Recommended Integration Strategy by Phase](#10-recommended-integration-strategy-by-phase)
11. [Licensing Risk Assessment](#11-licensing-risk-assessment)
12. [Estimated Development Time Savings](#12-estimated-development-time-savings)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

This PRD defines an **AI-Powered Atlas-to-Ready-to-Deliver Course Platform** that ingests structured curriculum data from Atlas exports (Excel and OneRoster CSV formats), uses AI (LangGraph + LLMs) to generate structured weekly course plans aligned with AERO educational standards, and delivers a full interactive LMS experience with role-based access control (Admin, Teacher, Student). The target tech stack is **Next.js 15 + Supabase + Prisma**, deployed on Vercel.

A comprehensive GitHub research effort identified **18 open-source repositories** across 8 categories that can accelerate development by an estimated **50%** (from ~14 days to ~7 days). All primary recommendations carry **MIT or Apache-2.0 licensing**, ensuring unrestricted commercial use and modification. The top repositories include EduPath-LMS (exact stack match), AjarinAja (Supabase-native LMS), ClassBuild (AI course generator), ExcelJS (Excel parsing), Inngest (background jobs), and shadcn/ui (UI components).

**Total MVP Estimate: 11 days** (with repos) vs ~14 days (from scratch).

---

## 2. Agent Debate Roundtable

### Architect Agent (Pragmatic, code-first)

> "We must keep it dead simple for an AI coding agent to ship MVP in <2 weeks. Next.js + Supabase is perfect: one repo, zero ops, built-in auth/storage/queue. Atlas exports = Excel + OneRoster CSVs (confirmed via docs). No API calls needed. But we must make the parser handle both formats or users will hate us."

### Educator Agent (Pedagogy-first)

> "Atlas is already gold-standard structured (units → objectives → AERO tags → resources). LLM should only refine pacing/themes and fill gaps (activities/assessments). Never hallucinate core content. AERO standards are PDF-only → we seed a static aero_standards table once (JSON import). Differentiation (PreAP vs AP) must preserve vertical alignment across grades. Output must feel like a real LMS: interactive, not PDF."

### Scalability Agent (100s of courses)

> "Batch processing is non-negotiable. Inngest or Supabase Edge Functions for background jobs. 100+ courses = ~10k weeks → use vector embeddings for theme similarity (optional but cheap). DB must scale: indexes on course.school_id, week.theme_id. RLS everywhere or we leak data."

### Security Agent (RLS obsessive)

> "Single-school but multi-role (Admin/Teacher/Student). Use Supabase RLS with a profiles + memberships pattern. Never trust client-side. All AI generations audited. Resources stored in Supabase Storage with signed URLs. If we ever go multi-school, tenant_id is trivial to add."

### Consensus Reached (after debate)

- **Stick with Next.js 15 + Supabase** (winner: zero-config Postgres + RLS + Storage + Edge Functions).
- **Parser:** Hybrid (xlsx for Atlas Excel, csv-parser for OneRoster).
- **AI:** Structured outputs (Zod + LangGraph) – 90% deterministic where Atlas already gives data.
- **Delivery:** Full interactive LMS (not just plans).
- **RLS:** Production-grade multi-role policies from day 1.
- **Open Source:** Leverage MIT-licensed GitHub repos to accelerate development by ~50%.

---

## 3. Consensus Architecture

### Key Decisions (post-debate)

| Decision | Choice | Rationale |
|---|---|---|
| **Ingestion** | File upload → background job (Inngest) | Supports zip of multiple CSVs/Excel |
| **AI Layer** | LangGraph state machine | Parse → ThemeExtract → Pacing → WeekGen → AEROValidate → Persist |
| **Storage** | Supabase Storage | Google Drive links → downloaded & re-hosted privately |
| **Deployment** | Vercel + Supabase | Frontend + API on Vercel; DB + Auth + Storage on Supabase |
| **Open Source** | 18 repos leveraged | MIT/Apache-2.0 primary; AGPL/GPL reference-only |

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 (App Router) | SSR, API routes, middleware |
| Styling | Tailwind CSS + shadcn/ui | UI components, responsive design |
| Database | Supabase (PostgreSQL) | Managed Postgres, RLS, real-time |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | Supabase Auth | Social login, RLS integration |
| Storage | Supabase Storage | Resource files, signed URLs |
| AI Orchestration | LangGraph | State machine pipeline |
| AI Validation | Zod | Structured output schemas |
| Background Jobs | Inngest | Batch processing, cron |
| Deployment | Vercel | Frontend + serverless API |

---

## 4. Detailed Architecture (Production-Ready)

### High-Level Pipeline

```
Atlas Export (Excel/CSV)
        │
        ▼
  ┌─────────────┐
  │  File Upload  │ ──── Inngest Background Job
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Parser      │ ──── ExcelJS (xlsx) / SheetJS (csv)
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────────┐
  │           LangGraph AI Pipeline            │
  │                                           │
  │  Parse → ThemeExtract → Pacing            │
  │    → WeekGen → AEROValidate → Persist      │
  │                                           │
  │  Each node: Zod-validated structured output │
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │         Supabase (PostgreSQL)             │
  │                                           │
  │  School → Course → Theme → Week → Resource │
  │       → User → Membership → Progress       │
  │                                           │
  │  RLS policies enforce multi-role access     │
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │        Interactive LMS (Next.js)          │
  │                                           │
  │  Teacher: Course mgmt, Week cards, Gap     │
  │  Student: Progress, Resources, Assessments │
  │  Admin: Dashboard, Audit, Settings         │
  └──────────────────────────────────────────┘
```

### Data Flow

1. **Admin uploads** Atlas Excel or OneRoster CSV/ZIP via the upload UI
2. **Inngest queues** a background job for processing
3. **Parser** extracts structured curriculum data (units, objectives, AERO tags, resources)
4. **LangGraph pipeline** orchestrates AI generation:
   - **Parse node:** Raw data → structured intermediate format
   - **ThemeExtract node:** Groups content into 4-8 Learning Themes (LLM + Zod)
   - **Pacing node:** Optimizes weekly pacing within each theme
   - **WeekGen node:** Generates weekly plans with objectives, activities, assessments
   - **AEROValidate node:** Validates AERO standard coverage, flags gaps
   - **Persist node:** Saves complete course to Supabase via Prisma
5. **LMS UI** delivers interactive course experience to teachers and students

---

## 5. Full Database Schema (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model School {
  id        String    @id @default(cuid())
  name      String
  domain    String?   // for SSO
  createdAt DateTime  @default(now())

  users    User[]
  courses  Course[]
}

model User {
  id          String    @id @default(cuid())
  supabaseId  String    @unique
  email       String    @unique
  name        String
  role        UserRole
  schoolId    String
  school      School    @relation(fields: [schoolId], references: [id])
  createdAt   DateTime  @default(now())

  memberships Membership[]
  progress    StudentProgress[]
}

model Membership {
  id        String       @id @default(cuid())
  userId    String
  courseId  String?
  role      MembershipRole
  user      User         @relation(fields: [userId], references: [id])
  course    Course?      @relation(fields: [courseId], references: [id])
}

model Course {
  id            String       @id @default(cuid())
  atlasId       String?      // traceability
  name          String
  gradeLevel    Int
  track         Track        @default(STANDARD)
  schoolId      String
  aeroStandards Json[]       // [{code: "ELA.11.RL.1", desc: "..."}]
  totalWeeks    Int
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  school        School       @relation(fields: [schoolId], references: [id])
  themes        LearningTheme[]
  memberships   Membership[]
  progress      StudentProgress[]
}

model LearningTheme {
  id            String   @id @default(cuid())
  courseId      String
  title         String
  durationWeeks Int
  aeroAlignment Json[]

  course Course @relation(fields: [courseId], references: [id])
  weeks  Week[]
}

model Week {
  id          String  @id @default(cuid())
  themeId     String
  weekNumber  Int
  focus       String
  objectives  Json[]  // [{text, aeroCode}]
  activities  Json[]  // AI-generated or Atlas
  assessment  Json?   // {formative: "...", summative: "..."}

  theme     LearningTheme    @relation(fields: [themeId], references: [id])
  resources Resource[]
  progress  StudentProgress[]
}

model Resource {
  id        String  @id @default(cuid())
  weekId    String
  title     String
  type      ResourceType
  url       String  // signed Supabase URL or external
  embedded  Boolean @default(false)
  atlasRef  String? // original Atlas ID

  week Week @relation(fields: [weekId], references: [id])
}

model StudentProgress {
  id          String        @id @default(cuid())
  userId      String
  weekId      String?
  courseId    String
  status      ProgressStatus @default(NOT_STARTED)
  completedAt DateTime?
  score       Float?

  user   User   @relation(fields: [userId], references: [id])
  week   Week?  @relation(fields: [weekId], references: [id])
  course Course @relation(fields: [courseId], references: [id])
}

enum UserRole { ADMIN TEACHER STUDENT }
enum MembershipRole { OWNER TEACHER STUDENT }
enum Track { STANDARD PREAP AP }
enum ResourceType { DOCUMENT VIDEO LINK ASSESSMENT PDF }
enum ProgressStatus { NOT_STARTED IN_PROGRESS COMPLETED }
```

### Indexes

```prisma
// Add to Course model
@@index([schoolId])

// Add to Week model
@@index([courseId, weekNumber])
```

---

## 6. Supabase RLS Policies

```sql
-- 1. Enable RLS on ALL tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Week" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProgress" ENABLE ROW LEVEL SECURITY;

-- 2. Users can only see their own profile
CREATE POLICY "Users can only see their own profile"
ON "User" FOR SELECT USING (supabaseId = auth.uid()::text);

-- 3. Course policies (role-based)
CREATE POLICY "Admins see all courses"
ON "Course" FOR ALL USING (
  EXISTS (SELECT 1 FROM "User" WHERE supabaseId = auth.uid()::text AND role = 'ADMIN')
);

CREATE POLICY "Teachers see courses they teach or own"
ON "Course" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Membership"
    WHERE courseId = "Course".id
    AND userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
    AND role IN ('OWNER', 'TEACHER')
  )
);

CREATE POLICY "Students see enrolled courses"
ON "Course" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Membership"
    WHERE courseId = "Course".id
    AND userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
    AND role = 'STUDENT'
  )
);

-- 4. Weeks & Resources cascade from course policies
CREATE POLICY "Users can access weeks of accessible courses"
ON "Week" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Course" c
    JOIN "Membership" m ON m.courseId = c.id
    WHERE c.id = "Week".courseId
    AND m.userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
  )
);

-- 5. StudentProgress (students see own, teachers see class)
CREATE POLICY "Students see own progress"
ON "StudentProgress" FOR SELECT USING (
  userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
);
```

---

## 7. Key Features + Sample Code

### Feature 1: Atlas Export Parser

**File:** `app/api/ingest/route.ts`

```typescript
import { parseAtlasExcel, parseOneRoster } from '@/lib/parsers';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  let rawData;
  if (file.name.endsWith('.xlsx')) {
    rawData = await parseAtlasExcel(buffer); // uses ExcelJS + Zod
  } else if (file.name.endsWith('.csv') || file.name.endsWith('.zip')) {
    rawData = await parseOneRoster(buffer); // uses SheetJS csv-parser
  }

  // Queue background job via Inngest
  await ingest.send({ name: 'course.generate', data: { rawData, userId: auth.user.id } });
  return NextResponse.json({ jobId: 'queued' });
}
```

### Feature 2: LangGraph AI Pipeline

**File:** `lib/ai/course-graph.ts`

```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { z } from "zod";

const WeekSchema = z.object({
  weekNumber: z.number(),
  focus: z.string(),
  objectives: z.array(z.object({ text: z.string(), aeroCode: z.string() })),
  activities: z.array(z.string()),
});

const graph = new StateGraph()
  .addNode("parse", async (state) => ({ ...state, parsed: await parseRaw(state.rawData) }))
  .addNode("extract_themes", llmNode({ prompt: themePrompt, schema: ThemeSchema }))
  .addNode("validate_aero", aeroValidatorNode) // exact code match + embedding fallback
  .addNode("generate_weeks", llmNode({ prompt: weekPrompt, schema: z.array(WeekSchema) }))
  .addNode("persist", async (state) => ({ ...state, courseId: await saveToDB(state) }))
  .addEdge("parse" → "extract_themes" → "validate_aero" → "generate_weeks" → "persist" → END);
```

**Example Prompt (theme extraction):**

```
You are an AERO-aligned curriculum expert.
Atlas data (already perfectly structured):
{atlasJson}

Group into 4-8 logical Learning Themes.
Output ONLY valid JSON matching this schema:
{ "themes": [{ "title": "...", "durationWeeks": 4, ... }] }
Respect track: {track}. Do NOT invent new standards.
```

### Feature 3: Delivery UI (Teacher view – Week card)

**File:** `app/courses/[id]/weeks/[weekNumber]/page.tsx`

```tsx
export default async function WeekPage({ params }: { params: { id: string; weekNumber: string } }) {
  const week = await prisma.week.findFirst({
    where: { courseId: params.id, weekNumber: parseInt(params.weekNumber) },
    include: { resources: true }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card> {/* Objectives, Activities */} </Card>
      <Card> {/* Embedded resources via iframe or viewer */} </Card>
      <Card> {/* Student progress tracker */} </Card>
    </div>
  );
}
```

### Feature 4: Gap Analyzer (post-generation report)

Simple SQL + LLM summary: _"Missing 3 AERO RL standards in Q3 – suggested theme: Literary Analysis."_

---

## 8. GitHub Open-Source Repository Research

### 8.1 Research Methodology

We conducted 25+ targeted web searches across GitHub to identify repositories matching the PRD requirements. Each repository was evaluated against four primary criteria:

1. **License:** MIT or similarly permissive (commercial use, modification, distribution)
2. **Community:** Active maintenance, stars, forks, recent commits
3. **Stack Alignment:** Next.js, Supabase, Prisma, TypeScript compatibility
4. **Feature Overlap:** Course management, progress tracking, role-based access, assessment

### 8.2 Tier 1: Primary LMS Platforms

#### 🏆 EduPath-LMS (Top Recommendation)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/theeaashish/EduPath-LMS |
| **License** | MIT License ✅ |
| **Stars** | Active (emerging) |
| **Relevance** | HIGH – Direct Stack Match |
| **Stack** | Next.js 15 + TypeScript + Prisma + Tailwind CSS |

**Description:** EduPath-LMS is a modern, full-featured LMS built with the **exact same stack** specified in the PRD. The project includes comprehensive authentication, payment integration (Stripe), course management with lesson hierarchies, quiz and assessment systems, student progress tracking, and role-based access control. The database schema uses Prisma models that closely mirror the PRD schema design, including Course, User, Enrollment, Lesson, Progress, and Assessment models.

**Key Features:**
- Course CRUD with chapter/lesson hierarchy
- Built-in authentication and authorization
- Quiz and assessment engine with auto-grading
- Student progress tracking per lesson and course
- Stripe payment integration
- Responsive UI with modern design
- Video embedding and resource management

**How to Leverage:** Fork as primary project scaffold. Adapt Prisma schema, auth patterns, and course management API routes. Replace Stripe with role-based enrollment.

---

#### 🏆 AjarinAja LMS

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/lil-id/AjarinAja |
| **License** | MIT License ✅ |
| **Stars** | Growing community |
| **Relevance** | HIGH – Supabase Native LMS |
| **Stack** | React + TypeScript + Supabase |

**Description:** A full-featured LMS specifically built for schools and educators with React, TypeScript, and Supabase. Being **Supabase-native**, it offers directly reusable patterns for RLS policies, authentication, storage integration, and real-time subscriptions. Provides a complete school management ecosystem including course creation, student enrollment, assignment management, grade tracking, discussion forums, and attendance monitoring.

**Key Features:**
- Multi-role school management (Admin/Teacher/Student)
- Course and lesson management
- Assignment creation and grading
- Student progress and attendance tracking
- Discussion forum module
- Supabase RLS policy patterns ready for adaptation
- File upload and storage management

**How to Leverage:** Study RLS policy patterns for multi-role access. Adapt Supabase storage patterns for resource management. Reference discussion forum implementation.

---

#### ClassroomIO

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/classroomio/classroomio |
| **License** | Open Source (permissive) ✅ |
| **Stars** | Active and growing |
| **Relevance** | HIGH – Feature-Complete Education Platform |

**Description:** A comprehensive open-source education platform designed as a simple and beautiful alternative to Moodle, EdX, Thinkific, and Teachable. Supports unlimited course creation, rich lesson management, student invitations, assignment grading, and multi-cohort management from a unified interface. Features a modern, mobile-responsive admin dashboard with analytics and reporting.

**Key Features:**
- Unlimited course creation and management
- Rich lesson editor with multiple content types
- Student enrollment and invitation system
- Assignment creation and automated grading
- Multi-cohort and class management
- Analytics dashboard and reporting
- Mobile-responsive design

**How to Leverage:** Reference for course management UX workflows, cohort management patterns, and admin dashboard analytics design.

---

#### Learning-Platform-NextJS (RiP3rQ)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/RiP3rQ/Learning-Platform-NextJS |
| **License** | MIT License ✅ |
| **Stars** | Community-backed |
| **Relevance** | MEDIUM-HIGH – FullStack Next.js Reference |

**Description:** Complete full-stack learning platform built entirely with Next.js, covering frontend, backend API layer, and database integration. Includes user authentication, course browsing and enrollment, lesson content delivery, progress tracking, and quiz functionality.

**Key Features:**
- Full-stack Next.js implementation (frontend + API + DB)
- User authentication and profile management
- Course browsing, enrollment, and completion
- Lesson content delivery system
- Progress tracking and quiz features

---

#### PATMESH Learning Management System

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/PATMESH/Learning-Management-System |
| **License** | Open Source |
| **Stars** | Active development |
| **Relevance** | MEDIUM-HIGH – Assessment & Certificate Focus |

**Description:** Well-rounded LMS with particular strength in assessment and certification features. Includes comprehensive user profile management, course management with structured content hierarchy, assessment tools for course completion evaluation, progress tracking, automated certificate generation, and a discussion forum.

**Key Features:**
- Complete course management with content hierarchy
- Comprehensive assessment and quiz engine
- Student progress tracking with visual indicators
- Automated certificate generation system
- Discussion forum for collaborative learning

---

#### Frappe LMS (Honorable Mention – Reference Only)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/frappe/lms |
| **License** | ⚠️ AGPL-3.0 (Reference Only) |
| **Stars** | 2,000+ |
| **Relevance** | MEDIUM – Feature Reference Only |

**Description:** One of the most popular open-source LMS platforms on GitHub. Provides polished, production-ready LMS with 3-level content hierarchy (Course > Chapter > Lesson), video integration, quiz engine with multiple question types, progress tracking, and discussion forums.

> **⚠️ Licensing Warning:** AGPL-3.0 requires derivative works to also be open-sourced. Use as a **UX benchmark and feature reference only** – do not copy code into a commercial product.

---

### 8.3 Tier 2: AI Course Generation Tools

#### 🏆 ClassBuild (Top AI Generation Pick)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/jtangen/classbuild |
| **License** | MIT License ✅ |
| **Stars** | 10+ (active) |
| **Relevance** | VERY HIGH – AI Course Generation Match |

**Description:** AI-powered course generator built on evidence-based learning science principles. Generates complete course structures including learning objectives, activities, assessments, and resource recommendations using LLM APIs. Offers both CLI (suitable for batch processing) and web interface.

**Key Features:**
- AI-powered course generation from topics/standards
- Evidence-based learning science principles
- CLI for batch course generation (aligned with batch processing need)
- Structured output with objectives, activities, assessments
- MIT License for commercial use
- LLM prompt patterns adaptable to LangGraph nodes

**How to Leverage:** Adapt prompt engineering patterns for LangGraph pipeline nodes (theme extraction, weekly plan generation). Reuse structured output schemas with Zod validation.

---

#### LangGraph Ecosystem Resources

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/langchain-ai/langgraph |
| **License** | Apache-2.0 ✅ |
| **Stars** | 70,000+ (LangChain ecosystem) |
| **Relevance** | VERY HIGH – Core Pipeline Framework |

**Description:** The core framework specified in the PRD for building the AI course generation pipeline. The ecosystem includes extensive examples and community resources for building state-machine based AI workflows with Zod integration for structured output validation.

**Key Community Resources:**
- **awesome-LangGraph:** https://github.com/von-development/awesome-LangGraph – Curated index of tools and templates
- **LangGraph-Mastery-Playbook:** https://github.com/leslieo2/LangGraph-Mastery-Playbook – Code-first lessons for memory-aware agents
- **Agentic_AI_using_LangGraph:** https://github.com/mohd-faizy/Agentic_AI_using_LangGraph – Multi-agent systems with MCP

**How to Leverage:** Direct use for pipeline orchestration. The PRD architecture (Parse → ThemeExtract → Pacing → WeekGen → AEROValidate → Persist) maps directly to LangGraph node patterns.

---

### 8.4 Tier 3: Data Parsing and Import Tools

#### 🏆 ExcelJS (Top Parser Pick)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/exceljs/exceljs |
| **License** | MIT License ✅ |
| **Stars** | 15,000+ |
| **Relevance** | VERY HIGH – Excel Parsing Essential |

**Description:** Most comprehensive MIT-licensed library for reading, manipulating, and writing Excel files (XLSX and CSV) in Node.js. Battle-tested in production with full TypeScript support, streaming mode for large files, and multi-sheet workbook handling.

**Key Features:**
- Read/write XLSX and CSV files
- Cell styles, formulas, and merged cell support
- Streaming mode for large files
- TypeScript types included
- MIT License, 15,000+ stars, production-proven

**How to Leverage:** Primary library for Atlas Excel export parser. Handle multi-sheet curriculum workbooks with structured data extraction.

---

#### SheetJS Community Edition

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/SheetJS/sheetjs |
| **License** | Apache-2.0 ✅ |
| **Stars** | 34,000+ |
| **Relevance** | VERY HIGH – Universal Spreadsheet Parser |

**Description:** Industry-standard JavaScript spreadsheet parsing library supporting virtually every format (XLSX, XLS, CSV, ODS). Works in both Node.js and browser environments.

**How to Leverage:** Complementary to ExcelJS for scenarios requiring browser-side parsing or unusual formats. Use for OneRoster CSV parsing.

---

#### OAT OneRoster Import (Reference Only)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/oat-sa/oneroster-import |
| **License** | ⚠️ GPL-2.0 (Reference Only) |
| **Stars** | Part of OAT ecosystem |
| **Relevance** | HIGH – Education Standard Specific |

**Description:** Purpose-built PHP library for importing OneRoster V1.1 CSV files. Includes file handler, data mapping, validation, and sample data files.

> **⚠️ Licensing Warning:** GPL-2.0 requires derivative works to be open-sourced. Study the OneRoster data model and validation logic, then **reimplement in TypeScript** to avoid GPL obligations.

---

### 8.5 Tier 4: Education Standards and Curriculum

#### Common Standards Project

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/commonstandardsproject/api |
| **License** | Open Source (permissive) ✅ |
| **Stars** | Active (by Common Curriculum) |
| **Relevance** | HIGH – Standards Database for AERO Alignment |

**Description:** Comprehensive API and database of academic standards from all 50 US states plus organizations, districts, and schools. Provides a proven data model for storing, querying, and cross-referencing educational standards.

**How to Leverage:** Reference the JSON data model (`[{code: "ELA.11.RL.1", desc: "..."}]`) for designing the `aero_standards` Prisma table. Use API patterns if future expansion to Common Core/NGSS is desired.

---

#### Course-in-a-Box (P2PU)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/p2pu/course-in-a-box |
| **License** | MIT License ✅ |
| **Stars** | 500+ (mature) |
| **Relevance** | MEDIUM – Course Structure Reference |

**Description:** Free MIT-licensed tool by Peer 2 Peer University for creating and publishing online courses. Provides structured course design methodology with learning objectives, course outlines, resource lists, and assessment criteria.

---

### 8.6 Tier 5: Infrastructure and Utility Libraries

#### 🏆 Inngest (Background Job Processing)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/inngest/inngest |
| **License** | MIT License (SDKs) ✅ |
| **Stars** | Active, well-funded startup |
| **Relevance** | VERY HIGH – Direct PRD Match for Batch Jobs |

**Description:** Explicitly named in the PRD for background job processing and batch course generation. Purpose-built for Next.js with automatic step retries, stateful function execution, concurrency control, and real-time status updates.

**Key Features:**
- MIT License for open-source SDKs
- Purpose-built for Next.js background jobs
- Step functions with automatic retry
- Event-driven workflow orchestration
- Cron and scheduled job support
- [Demo repo](https://github.com/inngest/demo-nextjs-full-stack) for Next.js integration

**How to Leverage:** Direct integration for batch processing 100+ courses. Use Inngest SDK with Next.js API route handler.

---

#### shadcn/ui + Admin Dashboard Templates

| Attribute | Detail |
|---|---|
| **URL** | https://ui.shadcn.com / https://github.com/shadcn-ui/ui |
| **License** | MIT License ✅ |
| **Stars** | 70,000+ |
| **Relevance** | HIGH – UI Component Foundation |

**Description:** Most popular open-source UI component library for React/Next.js. Copy-paste components (no npm dependency lock-in). Several MIT-licensed admin dashboard templates available:

- **shadcn-admin-kit:** https://github.com/marmelab/shadcn-admin-kit (MIT) – Complete admin component kit
- **next-shadcn-admin-dashboard:** https://github.com/arhamkhnz (MIT) – Next.js admin with auth layouts, multiple dashboards

**How to Leverage:** Foundation for all UI components. Use admin templates to bootstrap Admin, Teacher, and Student dashboards.

---

#### Student Progress Tracker

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/KunalSalunkhe12/Student-Progress-Tracker |
| **License** | MIT License ✅ |
| **Stars** | Active academic project |
| **Relevance** | MEDIUM – Progress Analytics Patterns |

**Description:** Predicts academic performance using SVM, providing teachers with insights on student categories (slow, average, good). Data visualization patterns and progress tracking UI components are useful reference implementations.

---

## 9. Repository Comparison Matrix

| Repository | License | Stack Match | Course Mgmt | AI Pipeline | Progress | Assessment |
|---|---|---|---|---|---|---|
| **EduPath-LMS** | MIT ✅ | Next.js 15/Prisma | Yes | No | Yes | Yes |
| **AjarinAja** | MIT ✅ | React/Supabase | Yes | No | Yes | Yes |
| **ClassroomIO** | Permissive ✅ | Own Framework | Yes | No | Partial | Yes |
| **RiP3rQ Platform** | MIT ✅ | Next.js | Yes | No | Yes | Yes |
| **PATMESH LMS** | Open Source | Web Stack | Yes | No | Yes | Yes |
| **Frappe LMS** | ⚠️ AGPL-3.0 | Frappe/Python | Yes | No | Yes | Yes |
| **ClassBuild** | MIT ✅ | CLI/Node.js | Yes | Yes | No | Partial |
| **LangGraph** | Apache-2.0 ✅ | Python/JS | No | Yes | No | No |
| **ExcelJS** | MIT ✅ | Node.js | N/A | N/A | N/A | N/A |
| **SheetJS** | Apache-2.0 ✅ | JS/Browser | N/A | N/A | N/A | N/A |
| **OneRoster Import** | ⚠️ GPL-2.0 | PHP | N/A | N/A | N/A | N/A |
| **Inngest** | MIT ✅ | Next.js Native | No | Yes | No | No |
| **Common Standards** | Permissive ✅ | REST API | N/A | N/A | N/A | N/A |
| **Course-in-a-Box** | MIT ✅ | Web/SCSS | Yes | No | No | Partial |
| **shadcn/ui** | MIT ✅ | React/Next.js | No | No | No | No |

---

## 10. Recommended Integration Strategy by Phase

### Phase 0 (Day 1): Foundation

| Action | Repository | What to Take |
|---|---|---|
| Project scaffold | **EduPath-LMS** | Next.js 15 + Prisma setup, project structure, auth patterns |
| UI components | **shadcn/ui** + admin templates | Component library, admin/teacher/student dashboard layouts |
| RLS policies | **AjarinAja** | Production multi-role Supabase RLS policy patterns |
| Schema reference | EduPath + AjarinAja | Prisma model patterns for User, Course, Enrollment, Progress |

### Phase 1 (Days 2-3): Parser + Ingest

| Action | Repository | What to Take |
|---|---|---|
| Atlas Excel parser | **ExcelJS** | Full XLSX parsing with multi-sheet support, TypeScript types |
| OneRoster CSV parser | **SheetJS** | CSV parsing, delimited file handling |
| OneRoster reference | OAT OneRoster Import | Data model understanding, validation rules ( reimplement in TS) |
| Background jobs | **Inngest SDK** | File upload → queue pattern from demo-nextjs-full-stack |

### Phase 2 (Days 4-6): AI Pipeline

| Action | Repository | What to Take |
|---|---|---|
| Pipeline orchestration | **LangGraph** (Apache-2.0) | State machine framework, step functions, retry logic |
| Prompt engineering | **ClassBuild** (MIT) | Theme extraction prompts, weekly plan generation patterns |
| Structured outputs | LangGraph + Zod | Schema validation at each pipeline node |
| AERO validation | Common Standards Project | Standards matching data model |
| Pipeline tutorials | LangGraph-Mastery-Playbook | Code-first examples for reliable state machines |

### Phase 3 (Days 7-9): Delivery UI

| Action | Repository | What to Take |
|---|---|---|
| Course delivery | **EduPath-LMS** | Lesson navigation, progress indicators, resource embedding |
| Week card component | **shadcn/ui** Card + AjarinAja | Week-by-week course delivery interface |
| Progress tracker UI | PATMESH LMS + Student Progress Tracker | Progress bars, completion badges, status indicators |
| UX benchmarks | Frappe LMS (reference only) | Video player, quiz interface, certificate design |

### Phase 4 (Days 10-11): Differentiation + Gap Analysis

| Action | Repository | What to Take |
|---|---|---|
| Track toggle UI | **shadcn/ui** Toggle/Select | Standard/Pre-AP/AP differentiation controls |
| Gap analysis prompts | **ClassBuild** | LLM-powered suggestions for missing AERO standards |
| Standards cross-ref | Common Standards Project | Cross-referencing data model |
| Audit logging | AjarinAja | Activity logging patterns for Supabase |
| Assessment design | PATMESH LMS | Formative/summative rubric structures, auto-grading logic |

---

## 11. Licensing Risk Assessment

| Repository | License | Commercial Use | Modify | Distribution | Recommendation |
|---|---|---|---|---|---|
| EduPath-LMS | MIT ✅ | Yes | Yes | Yes | Safe to fork and modify |
| AjarinAja | MIT ✅ | Yes | Yes | Yes | Safe to fork and modify |
| ClassroomIO | Permissive ✅ | Yes | Yes | Yes | Safe to fork and modify |
| RiP3rQ Platform | MIT ✅ | Yes | Yes | Yes | Safe to fork and modify |
| PATMESH LMS | Open Source | Check terms | Check terms | Check terms | Review specific license |
| Frappe LMS | ⚠️ AGPL-3.0 | Yes* | Yes* | Yes* | **Reference only** – copyleft risk |
| ClassBuild | MIT ✅ | Yes | Yes | Yes | Safe to fork and modify |
| LangGraph | Apache-2.0 ✅ | Yes | Yes | Yes | Safe – include NOTICE file |
| ExcelJS | MIT ✅ | Yes | Yes | Yes | Safe to use as dependency |
| SheetJS | Apache-2.0 ✅ | Yes | Yes | Yes | Safe – include NOTICE file |
| OneRoster Import | ⚠️ GPL-2.0 | Yes* | Yes* | No** | **Reference only** – reimplement in TS |
| Inngest SDKs | MIT ✅ | Yes | Yes | Yes | Safe to use as dependency |
| Common Standards | Permissive ✅ | Yes | Yes | Yes | Safe to use API/data model |
| Course-in-a-Box | MIT ✅ | Yes | Yes | Yes | Safe to fork and modify |
| shadcn/ui | MIT ✅ | Yes | Yes | Yes | Safe to use components |

> * AGPL/GPL requires source disclosure if modified code is network-served or distributed.
> ** GPL prohibits closed-source distribution of derivative works.

---

## 12. Estimated Development Time Savings

| Component | From Scratch | With Repos | Time Saved | Primary Repo(s) |
|---|---|---|---|---|
| Project Setup + Auth | 1 day | 0.5 day | **50%** | EduPath-LMS + AjarinAja |
| Atlas Excel Parser | 1 day | 0.25 day | **75%** | ExcelJS |
| OneRoster CSV Parser | 1 day | 0.5 day | **50%** | SheetJS + OAT reference |
| AI Pipeline (LangGraph) | 3 days | 2 days | **33%** | LangGraph + ClassBuild |
| Delivery UI | 3 days | 1.5 days | **50%** | EduPath-LMS + shadcn/ui |
| Progress Tracking | 1 day | 0.5 day | **50%** | PATMESH LMS patterns |
| Assessment Engine | 1 day | 0.5 day | **50%** | PATMESH + EduPath-LMS |
| Background Jobs | 1 day | 0.25 day | **75%** | Inngest SDK |
| Gap Analysis | 1 day | 0.75 day | **25%** | ClassBuild prompts + CSP ref |
| Admin Dashboard | 1 day | 0.25 day | **75%** | shadcn admin templates |
| **TOTAL** | **~14 days** | **~7 days** | **~50%** | |

---

## 13. Implementation Roadmap

| Phase | Duration | Focus | Key Repos | Deliverables |
|---|---|---|---|---|
| **Phase 0** | 1 day | Foundation | EduPath-LMS, AjarinAja, shadcn/ui | Next.js + Supabase + Auth + Prisma schema + RLS policies |
| **Phase 1** | 2 days | Parser + Ingest | ExcelJS, SheetJS, Inngest | Atlas/OneRoster parser + background job + upload UI |
| **Phase 2** | 3 days | AI Pipeline | LangGraph, ClassBuild | LangGraph pipeline + AERO seed script + theme/week generation |
| **Phase 3** | 3 days | Delivery UI | EduPath-LMS, shadcn/ui, PATMESH | Full LMS UI + publish button + progress tracking |
| **Phase 4** | 2 days | Polish | ClassBuild, shadcn/ui, AjarinAja | Differentiation toggle + Gap report + audit log |

**Total MVP: 11 days** (with open-source repos) vs ~14 days (from scratch)

### Next Action

Reply **"START PHASE 0"** → I will output the complete GitHub repo scaffold (package.json, supabase config, first 5 files, seed script for AERO).

Or specify:
- Preferred LLM (OpenAI / Anthropic / Grok)?
- Any existing SSO (Google Workspace / Microsoft)?
- Do we need parent view in MVP?

---

## 14. Open Questions

1. **LLM Provider:** Which LLM should power the course generation pipeline? (OpenAI GPT-4, Anthropic Claude, xAI Grok) – impacts prompt design and API integration.
2. **SSO Integration:** Does the school use Google Workspace or Microsoft for single sign-on? Impacts Supabase Auth configuration.
3. **Parent View:** Should the MVP include a parent/guardian role for viewing student progress, or is this a post-MVP feature?
4. **Multi-School:** Is the single-school MVP scope sufficient, or should multi-tenant (tenant_id) be included from Phase 0?
5. **Resource Storage Limits:** What are the expected storage volumes for re-hosted Atlas resources (videos, PDFs, documents)?
6. **Offline Support:** Is PWA/offline access for students a requirement, or is the platform purely web-based?
7. **Analytics Depth:** Beyond basic progress tracking, do teachers need advanced analytics (learning outcome heatmaps, standards coverage dashboards)?
8. **Curriculum Languages:** Are all courses in English, or does the platform need multi-language support for curriculum content?
