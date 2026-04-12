# 🌊 Deep Flow — Study OS

> *A focus-first study environment with Socratic AI tutoring, facial drowsiness detection, adaptive soundscapes, and a gamified reward system.*

---

## Project Overview

Deep Flow is a full-stack web application designed to create a distraction-free, psychologically optimised study environment. It combines LLM-powered Socratic tutoring with real-time biometric feedback (facial eye tracking) and ambient audio adaptation to help users enter and sustain a cognitive "flow state."

---

## Architecture

```
deepflow/
├── frontend/
│   ├── index.html                  # Complete single-file web app (no build needed)
│   └── components/
│       ├── FaceMonitor.tsx         # MediaPipe webcam eye-tracking component
│       └── Soundscape.tsx          # Web Audio API adaptive soundscape component
│
├── backend/
│   ├── main.py                     # FastAPI server — all API endpoints
│   ├── socratic_logic.py           # LangGraph Socratic agent definition
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment variable template
│
└── README.md
```

---

## Feature Breakdown

### 1. Quest Log — Skill Tree Checklist
- Topics are broken into "Nodes" rendered as an interactive SVG constellation/skill tree
- Checking off a node lights it up with a golden glow and illuminates connecting edges
- Progress earns **Focus Hours** which unlock new Biome environments

### 2. Reward System
- **Biomes**: Void → Dark Forest → Rainy Café (1hr) → Library (3hrs)
  - Atmospheric background environments that unlock as Focus Hours accumulate
- **Artifacts**: Concept-specific collectibles unlocked when nodes are mastered
  - Clicking an artifact plays an audio snippet with a fun fact or quote

### 3. LLM Socratic Tutor
- Powered by **Google Gemini** via LangChain + LangGraph
- Never gives direct answers — uses guiding questions and progressive hints
- **Mental RAM Dump**: Pre-study anxiety-clearing feature; user types worries, AI summarises and "stores" them
- **Session Summary**: At session end, AI generates targeted quiz questions based on detected struggle points
- Streaming responses via **Server-Sent Events (SSE)**
- Session memory via **LangGraph MemorySaver** (per `session_id`)

### 4. Face Monitor
- Uses **MediaPipe Face Landmarker** (WASM, runs entirely in-browser)
- Calculates **Eye Aspect Ratio (EAR)** from 6 facial landmarks per eye
  ```
  EAR = (‖p1−p5‖ + ‖p2−p4‖) / (2 × ‖p0−p3‖)
  ```
- EAR < 0.22 for 25+ consecutive frames (~1 second) → drowsy event fired
- Triggers soundscape tempo shift and on-screen alert

### 5. Adaptive Soundscape
- **Lo-Fi mode**: Stacked harmonic oscillators (E2–C4) with LFO tremolo via Web Audio API
- **40Hz Gamma mode**: Amplitude-modulated carrier at 40Hz for cognitive entrainment
- On drowsy detection: gain increases, frequencies shift upward by ~10% to promote alertness
- Smooth transitions using `setTargetAtTime()` (no jarring cuts)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (zero build step) |
| React Components | TypeScript + React 18 |
| Face Tracking | MediaPipe Tasks Vision (WASM) |
| Audio | Web Audio API |
| Backend | FastAPI (Python 3.11+) |
| AI Agent | LangGraph + LangChain |
| LLM | Google Gemini 2.0 Flash |
| Streaming | Server-Sent Events (SSE) |
| Memory | LangGraph MemorySaver (in-memory) |

---

## User Flow

```
1. INTENT    → User types goal ("Master Thermodynamics") + picks vibe
2. SETUP     → App generates quest log nodes + loads soundscape
3. IMMERSION → Fullscreen study mode, face monitoring begins
4. DEEP WORK → User studies, asks AI questions, checks off nodes
5. REVIEW    → Session ends, AI generates weak-point quiz
6. REWARD    → User unlocks new Biome for next session
```

---

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your GOOGLE_API_KEY to .env

python main.py
# API runs at http://localhost:8000
```

### Frontend
```bash
# No build needed — just open the file:
open frontend/index.html

# Or serve it:
cd frontend
python -m http.server 3000
# Open http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/chat` | Streaming Socratic tutor chat |
| `POST` | `/anxiety-dump` | Mental RAM clearing summary |
| `POST` | `/session-summary` | End-of-session quiz generation |

### Example — Chat Request
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is entropy?", "session_id": "user_123"}'
```

---

## Key Technical Decisions

**Why LangGraph?** Provides built-in conversation memory (checkpointing) per session ID, enabling the AI to track what a specific student has struggled with across an entire study session — not just the last message.

**Why MediaPipe WASM?** Runs entirely in the browser with GPU acceleration — no video data ever leaves the device. Privacy-preserving facial analysis.

**Why Web Audio API over audio files?** Zero asset dependencies. The entire soundscape is synthesised procedurally, enabling real-time tempo/frequency manipulation in response to drowsiness state without file switching or loading delays.

**Why SSE over WebSockets?** One-directional streaming from server to client is sufficient for text generation. SSE is simpler, HTTP-native, and works through proxies without special configuration.

---

## Team

Built as part of a multidisciplinary experiment in cognitive science, HCI, and AI-augmented learning.
