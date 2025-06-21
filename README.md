# Mock Interview Assistant

An AI-powered mock interviewer that helps software engineers practice LeetCode problems with real-time voice and text interaction.

## ✨ Features

- **🎤 Voice Interaction**: Practice speaking your solutions using browser speech recognition
- **💬 Text Chat**: Type responses and questions to the AI interviewer
- **👨‍💻 Code Editor**: Write and test solutions with Monaco Editor
- **🤖 AI Interviewer**: Get real-time feedback, hints, and follow-up questions powered by Mistral AI
- **📊 Multiple Problem Types**: Practice with various LeetCode-style problems
- **🔄 Real-time Communication**: WebSocket-based instant messaging

## 🏗️ Architecture

```
Frontend (React + TypeScript)     Backend (Node.js + Express)
┌─────────────────────────────┐   ┌──────────────────────────────┐
│ • Voice/Text Input          │   │ • WebSocket Server           │
│ • Monaco Code Editor        │◄──┤ • Mistral AI Integration     │
│ • Interview Interface       │   │ • Session Management         │
└─────────────────────────────┘   └──────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Mistral AI API key ([Get one here](https://console.mistral.ai/))
- Modern browser with microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mock-interview
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   MISTRAL_API_KEY=your_mistral_api_key_here
   PORT=3001
   ```
   
   **Note**: You can get your Mistral API key from [console.mistral.ai](https://console.mistral.ai/)

4. **Start the application**
   ```bash
   npm run dev
   ```
   
   This will start both frontend (port 3000) and backend (port 3001) simultaneously.

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📖 How to Use

### Starting an Interview

1. **Grant Permissions**: Allow microphone access when prompted
2. **Choose Problem**: 
   - Select a problem category (Arrays, Strings, etc.)
   - Choose difficulty (Easy, Medium, Hard)
   - Or paste a LeetCode URL for a specific problem
3. **Click "Start Interview"**

### During the Interview

- **🎤 Voice Input**: Click "Hold to Speak" and talk through your solution
- **💬 Text Input**: Type questions or responses in the chat
- **👨‍💻 Code Editor**: Write your solution in the integrated editor
- **💡 Get Help**: Ask for hints, clarification, or feedback anytime

### Example Interactions

```
AI: "Let's start with Two Sum. Can you explain your approach?"

You: (voice) "I'll use a hash map to store numbers I've seen"

AI: "Great! What's the time complexity? Can you code this?"

You: (code editor) Write your solution...

AI: "Good approach! What about edge cases?"
```

## 📁 Project Structure

```
mock-interview/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── InterviewPanel.tsx    # Main interview interface
│   │   │   ├── CodeEditor.tsx        # Monaco code editor
│   │   │   ├── VoiceInput.tsx        # Voice recognition
│   │   │   └── ...
│   │   └── App.tsx          # Main app component
├── backend/                  # Node.js Express backend
│   ├── src/
│   │   ├── server.ts        # Main server with WebSocket
│   │   └── services/        # Mistral AI integration
├── shared/                   # Shared TypeScript types
│   └── types.ts
└── package.json             # Root package with scripts
```

## 🛠️ Available Scripts

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend in development mode
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only  
npm run dev:backend

# Build frontend for production
npm run build

# Start production server
npm start
```

## 🎯 Key Components

- **InterviewPanel**: Main interview interface with chat and controls
- **CodeEditor**: Monaco editor with Python/JavaScript support  
- **VoiceInput**: Web Speech API integration for voice recognition
- **VoiceOutput**: Text-to-speech for AI responses
- **WebSocket Server**: Real-time communication between frontend and backend
- **Mistral AI Service**: Handles AI conversation and code review

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required: Your Mistral AI API key
MISTRAL_API_KEY=your_api_key_here

# Optional: Server port (default: 3001)
PORT=3001

# Optional: Mistral model (default: mistral-large-latest)
MISTRAL_MODEL=mistral-large-latest
```

### Supported Languages

- **Code Editor**: Python, JavaScript (extensible to more languages)
- **Voice Recognition**: Supports multiple languages via browser API

## 🧪 Testing

A simple WebSocket test page is included:

```bash
# Open test-websocket.html in your browser
# Make sure the backend is running on port 3001
```

## 🎨 Customization

### Adding New Problems

Edit `backend/src/services/mistral.ts` to add new coding problems:

```typescript
const CODING_PROBLEMS = {
  array: {
    Easy: [
      // Add your problems here
    ]
  }
}
```

### Changing AI Behavior

Modify the interview prompts in `backend/src/services/mistral.ts`:

```typescript
const INTERVIEW_PROMPTS = {
  SYSTEM_PROMPT: "Your custom interviewer personality...",
  // ... other prompts
}
```

## 🔧 Troubleshooting

**Voice not working?**
- Check microphone permissions in browser settings
- Use Chrome or Edge for better Web Speech API support
- Text input works as a backup

**AI not responding?**
- Verify your Mistral API key in `.env` file
- Check browser console for error messages
- Ensure backend is running on port 3001

**WebSocket connection issues?**
- Make sure backend is running: `npm run dev:backend`
- Check firewall settings for ports 3000 and 3001
- Try refreshing the browser page

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with React, TypeScript, and Node.js
- AI powered by [Mistral AI](https://mistral.ai/)
- Code editor powered by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Voice recognition via Web Speech API

---

**Happy interviewing! 🎯** 