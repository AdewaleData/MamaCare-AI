import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    age: '',
    password: '',
    confirmPassword: '',
    language_preference: 'en',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => {
      // Auto-login after registration
      try {
        const loginData = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        const user = await authApi.getCurrentUser();
        setAuth(user, loginData.access_token);
        navigate('/dashboard');
      } catch (error) {
        navigate('/login');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      if (Array.isArray(error.response?.data?.detail)) {
        const fieldErrors: Record<string, string> = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            fieldErrors[err.loc[1]] = err.msg;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: message });
      }
    },
  });

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    delete newErrors[name];

    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = 'Email is invalid';
        }
        break;
      case 'full_name':
        if (!value) {
          newErrors.full_name = 'Full name is required';
        } else if (value.length < 2) {
          newErrors.full_name = 'Name must be at least 2 characters';
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        break;
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      case 'age':
        if (value && (isNaN(Number(value)) || Number(value) < 13 || Number(value) > 100)) {
          newErrors.age = 'Please enter a valid age';
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleBlur = (name: string) => {
    setTouched({ ...touched, [name]: true });
    validateField(name, formData[name as keyof typeof formData]);
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      if (key !== 'confirmPassword') {
        validateField(key, formData[key as keyof typeof formData]);
      }
    });
    validateField('confirmPassword', formData.confirmPassword);

    if (Object.keys(errors).length === 0 && formData.password === formData.confirmPassword) {
      const { confirmPassword, ...submitData } = formData;
      registerMutation.mutate({
        ...submitData,
        age: submitData.age ? Number(submitData.age) : undefined,
        role: 'patient',
      });
    }
  };

  const isFormValid = () => {
    return (
      formData.email &&
      formData.full_name &&
      formData.password &&
      formData.password === formData.confirmPassword &&
      formData.password.length >= 8 &&
      Object.keys(errors).length === 0
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <img src="/logo.jpeg" alt="MamaCare AI Logo" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Start your journey with MamaCare AI</p>
        </div>

        <div className="card">
          {errors.general && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm" role="alert">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-danger-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                onBlur={() => handleBlur('full_name')}
                className={`input ${errors.full_name ? 'border-danger-500' : ''}`}
                placeholder="Jane Doe"
                aria-invalid={!!errors.full_name}
                required
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-danger-600">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-danger-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`input ${errors.email ? 'border-danger-500' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input"
                placeholder="+234 800 000 0000"
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1.5">
                Age
              </label>
              <input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                onBlur={() => handleBlur('age')}
                className={`input ${errors.age ? 'border-danger-500' : ''}`}
                placeholder="25"
                min="13"
                max="100"
              />
              {errors.age && (
                <p className="mt-1 text-sm text-danger-600">{errors.age}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`input pr-10 ${errors.password ? 'border-danger-500' : ''}`}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
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
                <p className="mt-1 text-sm text-danger-600">{errors.password}</p>
              )}
              {formData.password && formData.password.length >= 8 && !errors.password && (
                <p className="mt-1 text-sm text-success-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Password meets requirements
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-danger-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`input ${errors.confirmPassword ? 'border-danger-500' : ''}`}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword}</p>
              )}
              {formData.confirmPassword &&
                formData.password === formData.confirmPassword &&
                !errors.confirmPassword && (
                  <p className="mt-1 text-sm text-success-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Passwords match
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending || !isFormValid()}
              className="w-full btn-primary py-3 text-base font-semibold flex items-center justify-center"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

