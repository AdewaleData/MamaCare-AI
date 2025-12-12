import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { User } from '../../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      try {
        console.log('Login response data:', data);
        if (!data.access_token) {
          setErrors({ general: 'Invalid login response. Please try again.' });
          return;
        }

        // Set auth state immediately - this updates both store and localStorage
        if (data.user) {
          setAuth(data.user, data.access_token);
          console.log('Auth set successfully');
          
          // Navigate immediately - no delays needed
          const role = data.user.role || 'patient';
          let targetPath = '/dashboard';
          if (role === 'provider') {
            targetPath = '/provider-dashboard';
          } else if (role === 'government') {
            targetPath = '/government-dashboard';
          }
          
          console.log('Navigating to:', targetPath);
          // Use window.location for immediate navigation to avoid React Router issues
          window.location.href = targetPath;
        } else {
          // Fallback: if user not in response, fetch it
          localStorage.setItem('access_token', data.access_token);
          authApi.getCurrentUser()
            .then((user) => {
              setAuth(user, data.access_token);
              const role = user.role || 'patient';
              let targetPath = '/dashboard';
              if (role === 'provider') {
                targetPath = '/provider-dashboard';
              } else if (role === 'government') {
                targetPath = '/government-dashboard';
              }
              window.location.href = targetPath;
            })
            .catch((error) => {
              console.error('Failed to fetch user:', error);
              setErrors({ general: 'Login successful but failed to load user data. Please refresh.' });
              localStorage.removeItem('access_token');
            });
        }
      } catch (error: any) {
        console.error('Login success handler error:', error);
        setErrors({ general: 'Failed to complete login. Please try again.' });
        localStorage.removeItem('access_token');
      }
    },
    onError: (error: any) => {
      console.error('Login API error:', error);
      const message = error.response?.data?.detail || error.message || 'Login failed. Please check your credentials.';
      setErrors({ general: message });
    },
  });

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (validate()) {
      loginMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/pregnant_women.jpg)',
        }}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/85 to-primary-900/90"></div>
      </div>
      
      <div className="max-w-md w-full relative z-10 fade-in scale-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="glass-card p-5 rounded-3xl shadow-2xl border-2 border-white/30 transform hover:scale-110 hover:rotate-6 transition-all duration-300 float">
              <img src="/logo.png" alt="MamaCare AI Logo" className="h-16 w-16 object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl text-gradient-animated">Welcome to MamaCare AI</h1>
          <p className="text-lg text-white/95 drop-shadow-lg">
            Sign in as Patient, Healthcare Provider, or Government Official
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card card rounded-3xl shadow-2xl border-2 border-white/30 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
          {errors.general && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm" role="alert">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`input ${errors.email ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                autoComplete="email"
                required
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-danger-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`input pr-10 ${errors.password ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-danger-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full btn-primary py-4 text-base font-bold flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Accessibility note */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Secure login with encrypted authentication
        </p>
      </div>
    </div>
  );
}

