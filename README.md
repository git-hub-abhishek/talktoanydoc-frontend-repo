# TalkToAnyDoc — Frontend

React + TypeScript single-page application for the TalkToAnyDoc document Q&A platform. Upload a PDF or Word document, wait for it to be processed, then ask questions and get streamed answers grounded in the document.

---

## Features

- Cognito authentication (sign up, sign in, sign out) via AWS Amplify v6
- Document upload with pre-signed S3 URLs — no file size limit imposed by the API
- Real-time document processing status (polls until `READY` or `FAILED`)
- Two query modes selectable per session:
  - **Standard** — fast streaming response via kNN retrieval
  - **Reranked** — higher-quality streaming response with Claude Haiku reranking and adjacent chunk expansion
- Document delete with two-step confirmation (trash icon → Yes/No inline)
- Streamed answers using `ReadableStream` / `fetch` with `getReader()`

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Auth | AWS Amplify v6 + Cognito User Pool |
| Routing | React Router v6 |
| Styling | CSS Modules + global design tokens |
| Hosting | S3 + CloudFront |

---

## Repository structure

```text
src/
  api/
    client.ts           — typed fetch wrappers for all backend endpoints
  components/
    DocumentCard.tsx    — card with status badge and delete confirmation
    FileUpload.tsx       — drag-and-drop / file picker with upload progress
    Layout.tsx           — app shell with nav and sign-out
    QueryChat.tsx        — streaming chat panel with mode toggle
  context/
    AuthContext.tsx      — Amplify session provider, exposes idToken
  hooks/
    useDocumentUpload.ts          — upload state machine
    useDocumentQuery.ts           — standard streaming query hook
    useDocumentQueryReranked.ts   — reranked streaming query hook
  pages/
    LoginPage.tsx        — sign-in page
    SignUpPage.tsx        — sign-up + confirmation page
    DashboardPage.tsx    — main page (document list + chat panel)
  types/
    index.ts             — shared TypeScript interfaces
  amplify-config.ts      — Amplify.configure() wired from env vars
  App.tsx                — router + auth guard
  main.tsx               — entry point
```

---

## Prerequisites

- Node.js 20+
- The [TalkToAnyDoc backend](../talktoanydoc-backend-repo) deployed — you need its SAM output values

---

## Local development

**1. Create `.env.local`**

```bash
cp .env.example .env.local
```

Fill in your values from `sam deploy` outputs:

```bash
VITE_AWS_REGION=<region>
VITE_USER_POOL_ID=<CognitoUserPoolId output>
VITE_USER_POOL_CLIENT_ID=<CognitoUserPoolClientId output>
VITE_API_BASE_URL=<ApiBaseUrl output>
VITE_QUERY_STREAM_URL=<QueryStreamUrl output>
VITE_QUERY_STREAM_RERANKED_URL=<QueryStreamRerankedUrl output>
```

**2. Install and run**

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## Build and deploy

**1. Build**

```bash
npm run build
```

Output goes to `dist/`.

**2. Upload to S3**

```bash
aws s3 sync dist/ s3://<your-bucket-name> --delete
```

**3. Invalidate CloudFront cache**

```bash
# Find your distribution ID
aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[*].DomainName, '<your-bucket-name>')].Id" \
  --output text

# Invalidate
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

Changes are live once the invalidation propagates (~30 seconds).

---

## Environment variables reference

| Variable | Description |
|---|---|
| `VITE_AWS_REGION` | AWS region (e.g. `eu-west-2`) |
| `VITE_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_USER_POOL_CLIENT_ID` | Cognito App Client ID |
| `VITE_API_BASE_URL` | API Gateway base URL (no trailing slash) |
| `VITE_QUERY_STREAM_URL` | Lambda Function URL for standard streaming query |
| `VITE_QUERY_STREAM_RERANKED_URL` | Lambda Function URL for reranked streaming query |

All variables are required at build time. A missing variable will cause a runtime error on the first API call.
