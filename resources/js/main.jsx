import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import App from './App.jsx';
import './index.css';

const ThemedToaster = () => {
  const { darkMode } = useTheme();
  
  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '1.25rem',
          background: darkMode ? '#1e293b' : '#ffffff',
          color: darkMode ? '#f1f5f9' : '#4a5a67',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          padding: '12px 20px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: darkMode 
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)' 
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: {
            primary: '#ebc1b6',
            secondary: darkMode ? '#1e293b' : '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#f87171',
            secondary: darkMode ? '#1e293b' : '#fff',
          },
        },
      }}
    />
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <ThemedToaster />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);