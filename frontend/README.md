# MamaCare AI Frontend

A production-ready React application for maternal health risk assessment in Nigeria.

## Features

- **Mobile-first Design**: Optimized for mobile devices with responsive layout
- **Authentication**: Secure login/register with JWT tokens
- **Health Records**: Track and manage health data
- **Risk Assessment**: AI-powered maternal health risk evaluation
- **Appointments**: Schedule and manage medical appointments
- **Emergency Contacts**: Quick access to emergency information
- **Multi-language Support**: English, Hausa, Yoruba, and Igbo
- **PWA Support**: Progressive Web App capabilities
- **Offline Support**: Works offline with cached data

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching
- **React Hook Form** with Yup validation
- **Heroicons** for icons
- **Framer Motion** for animations

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the API URL in `.env` if needed:
```
REACT_APP_API_URL=http://localhost:8000/api/v1
```

4. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── layout/         # Layout components (Navbar, Sidebar)
│   └── ui/             # Basic UI components
├── pages/              # Page components
│   ├── auth/           # Login/Register pages
│   ├── dashboard/      # Dashboard page
│   ├── health/         # Health records pages
│   ├── risk/           # Risk assessment pages
│   ├── appointments/   # Appointment pages
│   ├── emergency/      # Emergency pages
│   ├── pregnancy/      # Pregnancy pages
│   ├── profile/        # Profile pages
│   └── education/      # Education pages
├── services/           # API services
│   └── api/            # API client and endpoints
├── store/              # State management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features

### Authentication
- Secure JWT-based authentication
- Protected routes
- Automatic token refresh
- Persistent login state

### Responsive Design
- Mobile-first approach
- Desktop and tablet optimized
- Touch-friendly interface
- Bottom navigation for mobile

### State Management
- Zustand for global state
- React Query for server state
- Local storage persistence
- Optimistic updates

### Form Handling
- React Hook Form for form management
- Yup for validation
- Error handling and display
- Accessibility support

## API Integration

The app connects to the MamaCare AI backend API. Make sure the backend is running on the configured URL.

### Available Endpoints
- Authentication: `/auth/login`, `/auth/register`
- Health Records: `/health-records`
- Risk Assessment: `/risk-assessments`
- Appointments: `/appointments`
- Emergency Contacts: `/emergency-contacts`

## Deployment

### Environment Variables
- `REACT_APP_API_URL`: Backend API URL
- `NODE_ENV`: Environment (development/production)

### Build Optimization
- Code splitting
- Tree shaking
- Minification
- Asset optimization

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test on mobile devices
5. Ensure accessibility compliance

## License

This project is part of the MamaCare AI maternal health platform.
