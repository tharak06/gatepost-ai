# GatePost — Privacy-First Conversational AI Platform (MERN)

**GatePost** is a privacy-first conversational AI web platform combining an ultra-luxury cybernetic UI with a strict architectural guarantee: **uploaded and AI-generated media (images, PDFs) are NEVER written to disk or saved in the database.** They exist solely as in-memory RAM buffers for the duration of a single request, then are discarded. Only text messages and metadata are persisted.

---

## 🔒 Privacy Architecture & Enforcement Mechanism

### 1. Database Schema Constraint (Physical Enforcement)
The database schema itself is the primary enforcement mechanism — not just a policy:
```javascript
// server/models/Message.js
{
  chat_id: String,
  role: 'user' | 'assistant',
  content_text: String,
  message_type: 'text' | 'image_upload' | 'pdf_upload' | 'image_generated',
  createdAt: Date
}
```
There is **no column or field for file bytes, binary blobs, or file storage paths**. It is physically impossible for the database to store media files.

### 2. Zero-Disk In-Memory Processing
- **Image Analysis**: Uploads are accepted via `multer.memoryStorage()`, streamed directly from RAM into the Google Gemini Vision API, and the memory buffers are wiped immediately.
- **PDF Analysis**: PDFs are parsed directly from memory via `pdf-parse(buffer)`. Both the raw PDF bytes and extracted text are wiped from RAM after generating the reply.
- **Image Generation**: Generated images are streamed straight to the client browser as base64 data URLs in the HTTP response body and rendered in the DOM — never saved on the server.
- *Honest Privacy Notice*: While GatePost guarantees zero disk/database persistence on its own servers, uploaded content does transit to Google Gemini's API servers transiently for processing.

---

## 🚀 Quick Start

### 1. Backend Server
```bash
cd server
npm install
npm start
# Express API runs on http://localhost:5000
```

### 2. Frontend Application
```bash
cd client
npm install
npm run dev
# Vite dev server runs on http://localhost:3000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register account with bcrypt password hashing | No |
| `POST` | `/api/auth/login` | Authenticate and receive JWT token | No |
| `POST` | `/api/chats` | Create a new chat session | Yes (JWT) |
| `GET` | `/api/chats` | List all chat sessions for user | Yes (JWT) |
| `GET` | `/api/chats/:id/messages` | Retrieve message history | Yes (JWT) |
| `POST` | `/api/chats/:id/messages` | Send text message & receive Gemini reply | Yes (JWT) |
| `POST` | `/api/chats/:id/upload-image` | In-memory image analysis (multipart) | Yes (JWT) |
| `POST` | `/api/chats/:id/upload-pdf` | In-memory PDF text extraction & analysis | Yes (JWT) |
| `POST` | `/api/chats/:id/generate-image` | Generate image returned as base64 data URL | Yes (JWT) |
| `GET` | `/api/health` | Health & privacy policy check | No |

---

## 🎨 Frontend Highlights

- **Executive Hub (Image 1 Style)**:
  - 60fps dynamic Canvas AI Energy Orb with cyan/sapphire plasma rings and cursor parallax.
  - SVG circuit connectors with traveling neon electron pulses.
  - Floating glassmorphic cards (*Task Lists*, *Workflows*, *Analytics*, *Insights*).
- **Luxury Assistant Modal (Image 2 Style)**:
  - Siri/mobile luxury view with "How can I help you today?".
  - Real-time in-memory media upload buttons (📷 Image, 📄 PDF, 🎨 Image Gen).
  - Distinct **ephemeral** styling with dashed borders and badges for media turns.
  - Rendered base64 image preview directly in the chat view.
  - Web Speech API integration (voice recognition + speech synthesis).
