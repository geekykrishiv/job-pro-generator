# JobPro AI: Architecture & Project Master Document

JobPro AI is a modern web application designed to help users tailor and optimize their LaTeX resumes for specific job descriptions using Google's Gemini AI, with instant PDF preview generation powered by a local MiKTeX installation.

## High-Level Architecture

The project is structured as a **React + TypeScript single-page application (SPA)** built with **Vite**. 

Unlike a traditional web app with a standalone Node.js backend, this project leverages a hybrid architecture:
1.  **Frontend Serverless Operations:** Firebase handles authentication and database persistence. Gemini AI calls are made directly from the browser.
2.  **Local Backend Proxy (Vite Plugin):** LaTeX compilation requires native system binaries (`pdflatex`), which cannot run in the browser. This is handled by a custom Vite development server plugin that intercepts API calls and executes local system commands.

---

## 1. Core Technology Stack

- **Frontend Framework:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, `shadcn/ui` (Radix UI components)
- **Database & Auth:** Firebase (Authentication, Firestore)
- **AI Integration:** Google GenAI JS SDK (`@google/genai`)
- **PDF Generation:** MiKTeX (`pdflatex` CLI binary)
- **State Management:** React Context API (`AuthContext`)

---

## 2. Directory Structure & Key Modules

```text
job-pro-generator/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── project/      # Project-specific views (LatexEditor, ProjectChat, etc.)
│   │   ├── ResumePreview.tsx   # PDF iframe renderer
│   │   └── CompilationError.tsx # LaTeX error log viewer
│   ├── config/           # Centralized application configs
│   │   └── gemini.ts     # Gemini models (PRIMARY_MODEL, FALLBACK_MODELS)
│   ├── contexts/         # React Context providers
│   │   └── AuthContext.tsx # Manages Firebase Auth state
│   ├── lib/              # Core utility and service libraries
│   │   ├── firebase.ts   # Firebase initialization
│   │   ├── resumeStore.ts# Firestore CRUD operations & Gemini Key validation
│   │   ├── gemini.ts     # Google GenAI API client & auto-fallback logic
│   │   └── latexCompiler.ts # Frontend service fetching from the Vite compile endpoint
│   ├── pages/            # Top-level route components (MasterResume, Settings, etc.)
│   ├── types.ts          # Global TypeScript interfaces
│   └── main.tsx          # Application entry point
├── vite.config.ts        # Vite config & Custom LaTeX Compilation Middleware
└── resume.tex            # Test master resume
```

---

## 3. Core Data Flow & Workflows

### A. The AI Tailoring Workflow
1.  **Input:** The user uploads a Master Resume (`masterLatexResume` in Firestore) and a Job Description.
2.  **Prompting:** `src/components/project/ProjectChat.tsx` constructs a system prompt containing the Master Resume and Job Description.
3.  **Inference:** `src/lib/gemini.ts` calls the Gemini API via the `@google/genai` SDK.
    - If `gemini-2.0-flash` returns a `429 Quota Exceeded` error, the system automatically catches the error and retries with `gemini-1.5-flash` to prevent UI crashes.
4.  **Parsing:** The AI returns optimized LaTeX code, which is saved as a new version in Firestore.

### B. The LaTeX Compilation Pipeline
Browser-based LaTeX compilers (like `latex.js`) are unstable for complex modern resumes. JobPro AI solves this by deferring compilation to the local OS.
1.  **Trigger:** The user clicks "Compile" in the `LatexEditor` or `MasterResume`.
2.  **Request:** `src/lib/latexCompiler.ts` sends a `POST /api/compile` request with the raw LaTeX string.
3.  **Vite Middleware (`vite.config.ts`):** 
    - The custom Vite plugin intercepts `/api/compile`.
    - It writes the LaTeX code to a temporary system file.
    - It executes the local MiKTeX `pdflatex.exe` binary in a background process.
    - It waits up to 120 seconds (allowing MiKTeX to install missing packages on the fly).
4.  **Response:** The Vite plugin reads the generated `.pdf` file and returns it as an `application/pdf` binary buffer.
5.  **Render:** `ResumePreview.tsx` converts the binary into a Blob URL and renders it inside an `<iframe />`.

### C. Data Persistence (Firebase Firestore)
Data is organized hierarchically to enforce strict user ownership:
- `users/{uid}`: Stores User Settings (API Keys) and the Master Resume.
  - `projects/{projectId}`: A subcollection containing tailored iterations.
    - Each Project contains a history of `versions` and `chatHistory`.

---

## 4. Environment & Configuration

### Prerequisites
- **Node.js & npm:** For running the Vite server.
- **MiKTeX:** Must be installed on the host machine. The `pdflatex` binary path is resolved automatically in `vite.config.ts`.
- **Firebase:** A web project config must be placed in `src/lib/firebase.ts`.

### Architecture Benefits
- **Zero Backend Deployment:** By embedding the compilation API into Vite, developers do not need to boot up a separate Express.js server during local development.
- **Client-Side AI:** API keys are stored in Firebase on a per-user basis, meaning users bring their own Gemini keys, eliminating central API cost overhead for the platform.
- **Robustness:** The Gemini fallback chain ensures high availability even on the Google GenAI free tier.
