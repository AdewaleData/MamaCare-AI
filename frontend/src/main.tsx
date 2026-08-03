import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { TranslationProvider } from './contexts/TranslationContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TranslationProvider>
          <App />
        </TranslationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
)

