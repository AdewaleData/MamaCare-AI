# MamaCare AI - Frontend

A modern, user-friendly web application for pregnancy health management built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Modern UI/UX** - Clean, intuitive interface following HCI principles
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🔐 **Authentication** - Secure login and registration
- 📊 **Health Tracking** - Record and track vital signs and health measurements
- 🤰 **Pregnancy Management** - Track pregnancy details, weeks, and trimester
- ⚠️ **Emergency System** - One-tap emergency alerts with contact notifications
- 🧠 **AI Risk Assessment** - ML-powered risk analysis and recommendations
- 🌍 **Multilingual Support** - Support for multiple Nigerian languages
- ♿ **Accessible** - Built with accessibility in mind

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
│   ├── auth/       # Authentication pages
│   ├── health/     # Health record pages
│   └── pregnancy/  # Pregnancy management pages
├── services/        # API services
├── store/           # State management
├── types/           # TypeScript type definitions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## HCI Principles Applied

1. **Visibility** - Clear navigation, status indicators, and feedback
2. **Feedback** - Loading states, success/error messages, visual confirmations
3. **Constraints** - Form validation, disabled states, required fields
4. **Consistency** - Uniform design patterns, color scheme, and interactions
5. **Error Prevention** - Input validation, confirmations for critical actions
6. **Recognition over Recall** - Visual cues, icons, and clear labels
7. **Flexibility** - Responsive design, keyboard navigation support
8. **Accessibility** - ARIA labels, semantic HTML, keyboard navigation

## API Integration

The frontend connects to the backend API at `http://127.0.0.1:8001/api/v1`. Make sure the backend server is running.

## Environment Variables

Create a `.env` file if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api/v1
```

## License

MIT

