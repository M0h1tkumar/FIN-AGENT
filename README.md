# FinAgent: Autonomous Financial Reconciliation Workspace

**Powered by Google Gemini 3 Pro & Gemini 2.5 Flash**

## 🔴 The Problem
Financial reconciliation is the invisible bottleneck of modern enterprise operations. Despite automated ledgers, exceptions handle **20-30% of transaction volume**, forcing highly paid finance professionals to become data janitors.

*   **Manual & Slow:** Finance teams spend hours investigating generic errors like "Routing Number Mismatch" or "Insufficient Funds".
*   **High Latency:** Critical vendor payments get stuck, causing relationship friction and supply chain delays.
*   **Fragmented Audit Trails:** Communication happens in email, while data lives in the ERP, creating a compliance nightmare.
*   **Human Error:** Manual data correction is prone to "fat-finger" mistakes, leading to further discrepancies.

## 🟢 The Solution
**FinAgent** transforms reconciliation from a manual data entry chore into a high-level supervisory task. It utilizes a **Multi-Agent Architecture** to autonomously detect, analyze, and resolve transaction exceptions.

Instead of just flagging an error, FinAgent acts on it.

### How We Solve It with Gemini
We leverage the specific strengths of different Gemini models to create a responsive yet deeply intelligent system:

1.  **Auditor Agent (Powered by `gemini-3-pro-preview`):**
    *   **Task:** Deep Analysis & Strategic Planning.
    *   **The Solve:** It looks at the raw error code and transaction metadata to deduce the root cause. It then generates a JSON-based "Auto-Pilot" plan, outlining the exact steps needed to fix the issue.

2.  **Liaison Agent (Powered by `gemini-2.5-flash`):**
    *   **Task:** External Communication.
    *   **The Solve:** Instantly drafts professional, context-aware emails to vendors. It pulls specific details (Invoice ID, Amount, Date) to reduce back-and-forth.

3.  **Controller Agent (Powered by `gemini-3-pro-preview`):**
    *   **Task:** Risk & Compliance Validation.
    *   **The Solve:** Acts as a safety layer. When a user (or the Auto-Pilot) suggests a fix, the Controller validates it against accounting rules to ensure it actually solves the reported failure reason.

### 🚀 Key Features
*   **Auto-Pilot Mode:** The system autonomously executes the auditor's plan—analyzing, drafting emails, and updating statuses—while visualizing its reasoning in real-time.
*   **ML Confidence Scoring:** A predictive model (simulated via Gemini) estimates the probability of successful resolution, helping humans prioritize high-risk cases.
*   **Visual Reasoning:** We don't just show the result; we show the *thinking*. Users can see the AI's logic card before an action is taken.
*   **Unified Audit Trail:** Every action—whether human or AI—is logged immutably, tagged by the specific Agent Persona (Auditor, Liaison, Controller).

## 🛠️ Tech Stack
*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **AI SDK:** Google GenAI SDK (`@google/genai`)
*   **Models:**
    *   `gemini-3-pro-preview` (Reasoning, Planning, Validation)
    *   `gemini-2.5-flash` (Chat, Summarization, Email Drafting)

## 🚢 How to Deploy to GitHub

Since this application is built with React and TypeScript, follow these steps to deploy the source code to GitHub:

### 1. Initialize Git
Open your terminal in the project directory and run:

```bash
git init
git add .
git commit -m "Initial commit: FinAgent v1"
```

### 2. Create Repository
1.  Go to [GitHub.com](https://github.com) and sign in.
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name it `finagent-workspace` and click **Create repository**.

### 3. Push to GitHub
Copy the commands provided by GitHub (under "…or push an existing repository from the command line") and run them:

```bash
git remote add origin https://github.com/YOUR_USERNAME/finagent-workspace.git
git branch -M main
git push -u origin main
```

## 💻 Running Locally

This project uses modern React with TypeScript. To run it locally outside of this web environment, we recommend using [Vite](https://vitejs.dev/).

1.  **Create a Vite project:**
    ```bash
    npm create vite@latest finagent -- --template react-ts
    cd finagent
    npm install
    ```

2.  **Install Dependencies:**
    ```bash
    npm install @google/genai tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```

3.  **Copy Files:**
    Move the files from this project into the `src` folder of your new Vite project.

4.  **Configure API Key:**
    Create a `.env` file in the root:
    ```
    VITE_API_KEY=your_google_ai_studio_key
    ```
    *Note: You will need to update `services/geminiService.ts` to use `import.meta.env.VITE_API_KEY` instead of `process.env.API_KEY`.*

5.  **Run:**
    ```bash
    npm run dev
    ```
