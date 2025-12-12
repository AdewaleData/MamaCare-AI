import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff, CheckCircle, User, Stethoscope, Building2, Upload } from 'lucide-react';

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
    role: 'patient', // patient, provider, government
    license_number: '',
    organization_name: '',
    id_document_url: '',
    // Government-specific fields
    contact_person_name: '',
    department_unit: '',
    // Location fields (for providers)
    address: '',
    city: '',
    state: '',
    country: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const govFileInputRef = useRef<HTMLInputElement>(null);

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
        
        // Navigate to appropriate dashboard based on role
        if (user.role === 'provider') {
          navigate('/app/provider-dashboard');
        } else if (user.role === 'government') {
          navigate('/app/government-dashboard');
        } else {
          navigate('/app/dashboard');
        }
      } catch (error) {
        navigate('/login');
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.detail || error.message || 'Registration failed. Please try again.';
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
        if (formData.role !== 'government' && !value) {
          newErrors.full_name = 'Full name is required';
        } else if (value && value.length < 2) {
          newErrors.full_name = 'Name must be at least 2 characters';
        }
        break;
      case 'contact_person_name':
        if (formData.role === 'government' && !value) {
          newErrors.contact_person_name = 'Contact person name is required';
        }
        break;
      case 'department_unit':
        if (formData.role === 'government' && !value) {
          newErrors.department_unit = 'Department/Unit is required';
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
      case 'license_number':
        if (formData.role === 'provider' && !value) {
          newErrors.license_number = 'Medical license number is required for healthcare providers';
        }
        break;
      case 'organization_name':
        if ((formData.role === 'provider' || formData.role === 'government') && !value) {
          const orgType = formData.role === 'provider' ? 'Hospital/Clinic name' : 'Government agency name';
          newErrors.organization_name = `${orgType} is required`;
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

    // Collect all validation errors synchronously
    const allErrors: Record<string, string> = {};

    // Validate email
    if (!formData.email) {
      allErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      allErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    if (!formData.password) {
      allErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      allErrors.password = 'Password must be at least 8 characters';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      allErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      allErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate full_name (for patient and provider)
    if (formData.role !== 'government' && !formData.full_name) {
      allErrors.full_name = 'Full name is required';
    } else if (formData.full_name && formData.full_name.length < 2) {
      allErrors.full_name = 'Name must be at least 2 characters';
    }

    // Validate age if provided
    if (formData.age && (isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 100)) {
      allErrors.age = 'Please enter a valid age';
    }

    // Role-specific validation
    if (formData.role === 'provider') {
      if (!formData.license_number) {
        allErrors.license_number = 'Medical license number is required';
      }
      if (!formData.organization_name) {
        allErrors.organization_name = 'Hospital/Clinic name is required';
      }
    }

    if (formData.role === 'government') {
      if (!formData.organization_name) {
        allErrors.organization_name = 'Ministry/Agency name is required';
      }
      if (!formData.contact_person_name) {
        allErrors.contact_person_name = 'Contact person name is required';
      }
      if (!formData.department_unit) {
        allErrors.department_unit = 'Department/Unit is required';
      }
    }

    // Update errors state
    setErrors(allErrors);

    // If no errors, submit the form
    if (Object.keys(allErrors).length === 0) {
      const { confirmPassword, contact_person_name, department_unit, latitude, longitude, ...submitData } = formData;
      
      // For government, use contact_person_name as full_name and append department to organization_name
      if (formData.role === 'government') {
        submitData.full_name = contact_person_name;
        // Append department/unit to organization name if provided
        if (department_unit && submitData.organization_name) {
          submitData.organization_name = `${submitData.organization_name} - ${department_unit}`;
        }
      }
      
      registerMutation.mutate({
        ...submitData,
        age: submitData.age ? Number(submitData.age) : undefined,
        license_number: submitData.license_number || undefined,
        organization_name: submitData.organization_name || undefined,
        id_document_url: submitData.id_document_url || undefined,
        address: submitData.address || undefined,
        city: submitData.city || undefined,
        state: submitData.state || undefined,
        country: submitData.country || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });
    }
  };

  const isFormValid = () => {
    // Base validation - email and password always required
    const hasEmail = !!formData.email;
    const hasPassword = !!formData.password;
    const passwordsMatch = formData.password === formData.confirmPassword;
    const passwordLength = formData.password.length >= 8;
    const noErrors = Object.keys(errors).length === 0;
    
    const baseValid = hasEmail && hasPassword && passwordsMatch && passwordLength && noErrors;

    // Role-specific validation
    if (formData.role === 'patient') {
      return baseValid && !!formData.full_name;
    }
    if (formData.role === 'provider') {
      return baseValid && !!formData.full_name && !!formData.license_number && !!formData.organization_name;
    }
    if (formData.role === 'government') {
      return baseValid && !!formData.organization_name && !!formData.contact_person_name && !!formData.department_unit;
    }

    return baseValid;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100/50 px-4 py-8 md:py-12 dots-bg">
      <div className="max-w-2xl w-full fade-in scale-in">
        <div className="text-center mb-8 md:mb-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-6 rounded-3xl shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-300 float">
              <img src="/logo.png" alt="MamaCare AI Logo" className="h-20 w-20 object-contain" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 text-gradient">Create Your Account</h1>
          <p className="text-lg md:text-xl text-gray-600">Start your journey with MamaCare AI</p>
        </div>

        <div className="card glass-card rounded-3xl shadow-2xl border-2 border-gray-200/50 backdrop-blur-xl p-6 md:p-8 lg:p-10 hover:shadow-3xl transition-all duration-300">
          {errors.general && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm" role="alert">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-800 mb-4">
                I am registering as <span className="text-danger-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, role: 'patient', license_number: '', organization_name: '', contact_person_name: '', department_unit: '' });
                    setErrors({ ...errors, license_number: '', organization_name: '', contact_person_name: '', department_unit: '' });
                  }}
                  className={`p-5 md:p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                    formData.role === 'patient'
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 shadow-lg'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 bg-white'
                  }`}
                >
                  <User className={`h-8 w-8 mx-auto mb-3 ${formData.role === 'patient' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-semibold text-sm md:text-base">Patient</div>
                  <div className="text-xs text-gray-500 mt-1">For expecting mothers</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, role: 'provider', contact_person_name: '', department_unit: '' });
                    setErrors({ ...errors, license_number: '', organization_name: '', contact_person_name: '', department_unit: '' });
                  }}
                  className={`p-5 md:p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                    formData.role === 'provider'
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 shadow-lg'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 bg-white'
                  }`}
                >
                  <Stethoscope className={`h-8 w-8 mx-auto mb-3 ${formData.role === 'provider' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-semibold text-sm md:text-base">Doctor</div>
                  <div className="text-xs text-gray-500 mt-1">Healthcare provider</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, role: 'government', license_number: '', full_name: '', age: '' });
                    setErrors({ ...errors, license_number: '', organization_name: '', contact_person_name: '', department_unit: '' });
                  }}
                  className={`p-5 md:p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                    formData.role === 'government'
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 shadow-lg'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 bg-white'
                  }`}
                >
                  <Building2 className={`h-8 w-8 mx-auto mb-3 ${formData.role === 'government' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-semibold text-sm md:text-base">Government</div>
                  <div className="text-xs text-gray-500 mt-1">Health agency</div>
                </button>
              </div>
            </div>

            {/* Patient and Provider Fields */}
            {(formData.role === 'patient' || formData.role === 'provider') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      {formData.role === 'provider' ? 'Doctor Name' : 'Full Name'} <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      onBlur={() => handleBlur('full_name')}
                      className={`input py-3 ${errors.full_name ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder={formData.role === 'provider' ? 'Dr. John Doe' : 'Jane Doe'}
                      aria-invalid={!!errors.full_name}
                      required
                    />
                    {errors.full_name && (
                      <p className="mt-2 text-sm text-danger-600">{errors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`input py-3 ${errors.email ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      required
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-danger-600">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="input py-3 focus:ring-primary-500"
                      placeholder="+234 800 000 0000"
                      autoComplete="tel"
                    />
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                      onBlur={() => handleBlur('age')}
                      className={`input py-3 ${errors.age ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="25"
                      min="13"
                      max="100"
                    />
                    {errors.age && (
                      <p className="mt-2 text-sm text-danger-600">{errors.age}</p>
                    )}
                  </div>
                </div>

                {/* Location Information for Patients */}
                {formData.role === 'patient' && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      Location Information (Optional)
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add your location to help find nearby healthcare providers
                    </p>
                    
                    <div className="mb-4">
                      <label htmlFor="address_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        id="address_patient"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="input py-3 focus:ring-primary-500"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="city_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          id="city_patient"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="Lagos"
                        />
                      </div>
                      <div>
                        <label htmlFor="state_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          id="state_patient"
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="Lagos State"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="country_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        id="country_patient"
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="input py-3 focus:ring-primary-500"
                        placeholder="Nigeria"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="latitude_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                          Latitude (Optional)
                        </label>
                        <input
                          id="latitude_patient"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => handleChange('latitude', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="6.5244"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Get coordinates from Google Maps
                        </p>
                      </div>
                      <div>
                        <label htmlFor="longitude_patient" className="block text-sm font-semibold text-gray-700 mb-2">
                          Longitude (Optional)
                        </label>
                        <input
                          id="longitude_patient"
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => handleChange('longitude', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="3.3792"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Government Fields */}
            {formData.role === 'government' && (
              <>
                <div>
                  <label htmlFor="organization_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ministry/Agency Name <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="organization_name"
                    type="text"
                    value={formData.organization_name}
                    onChange={(e) => handleChange('organization_name', e.target.value)}
                    onBlur={() => handleBlur('organization_name')}
                    className={`input py-3 ${errors.organization_name ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                    placeholder="Federal Ministry of Health"
                    required
                  />
                  {errors.organization_name && (
                    <p className="mt-2 text-sm text-danger-600">{errors.organization_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label htmlFor="contact_person_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Contact Person Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="contact_person_name"
                      type="text"
                      value={formData.contact_person_name}
                      onChange={(e) => handleChange('contact_person_name', e.target.value)}
                      onBlur={() => handleBlur('contact_person_name')}
                      className={`input py-3 ${errors.contact_person_name ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="Dr. Jane Smith"
                      required
                    />
                    {errors.contact_person_name && (
                      <p className="mt-2 text-sm text-danger-600">{errors.contact_person_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="department_unit" className="block text-sm font-semibold text-gray-700 mb-2">
                      Department/Unit <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="department_unit"
                      type="text"
                      value={formData.department_unit}
                      onChange={(e) => handleChange('department_unit', e.target.value)}
                      onBlur={() => handleBlur('department_unit')}
                      className={`input py-3 ${errors.department_unit ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="Maternal Health Division"
                      required
                    />
                    {errors.department_unit && (
                      <p className="mt-2 text-sm text-danger-600">{errors.department_unit}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Official Email Address <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`input py-3 ${errors.email ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                    placeholder="info@health.gov.ng"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    required
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-danger-600">{errors.email}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Use your official government email address
                  </p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Official Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input py-3 focus:ring-primary-500"
                    placeholder="+234 800 000 0000"
                    autoComplete="tel"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Official contact number for the ministry/agency
                  </p>
                </div>
              </>
            )}

            {/* Provider-specific verification fields */}
            {formData.role === 'provider' && (
              <>
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Healthcare Provider Verification
                    </h3>
                    <p className="text-sm text-gray-600">
                      Please provide your professional credentials for account verification
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="license_number" className="block text-sm font-semibold text-gray-700 mb-2">
                      Medical License Number <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="license_number"
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => handleChange('license_number', e.target.value)}
                      onBlur={() => handleBlur('license_number')}
                      className={`input py-3 ${errors.license_number ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="MD-12345-2020"
                      required
                    />
                    {errors.license_number && (
                      <p className="mt-2 text-sm text-danger-600">{errors.license_number}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="organization_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Hospital/Clinic Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="organization_name"
                      type="text"
                      value={formData.organization_name}
                      onChange={(e) => handleChange('organization_name', e.target.value)}
                      onBlur={() => handleBlur('organization_name')}
                      className={`input py-3 ${errors.organization_name ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                      placeholder="General Hospital Lagos"
                      required
                    />
                    {errors.organization_name && (
                      <p className="mt-2 text-sm text-danger-600">{errors.organization_name}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="id_document_url" className="block text-sm font-semibold text-gray-700 mb-2">
                      Medical License Document URL
                    </label>
                    <div className="relative">
                      <input
                        id="id_document_url"
                        type="url"
                        value={formData.id_document_url}
                        onChange={(e) => handleChange('id_document_url', e.target.value)}
                        className="input py-3 pr-12 focus:ring-primary-500"
                        placeholder="https://example.com/license.pdf"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Focus the URL input and show helpful message
                            const urlInput = document.getElementById('id_document_url') as HTMLInputElement;
                            if (urlInput) {
                              urlInput.focus();
                              // Show a temporary message
                              const originalPlaceholder = urlInput.placeholder;
                              urlInput.placeholder = `Selected: ${file.name} - Upload to hosting service and paste link`;
                              setTimeout(() => {
                                urlInput.placeholder = originalPlaceholder;
                              }, 5000);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors cursor-pointer p-1 rounded hover:bg-gray-100"
                        aria-label="Upload document"
                        title="Click to select a file"
                      >
                        <Upload className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Click the upload icon to select a file, then upload it to a file hosting service (Google Drive, Dropbox, etc.) and paste the shareable link above.
                    </p>
                  </div>

                  {/* Location Information for Providers */}
                  <div className="mb-6 mt-6 pt-6 border-t-2 border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      Location Information
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add your practice location to help patients find you nearby
                    </p>
                    
                    <div className="mb-4">
                      <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="input py-3 focus:ring-primary-500"
                        placeholder="123 Medical Center Drive"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          id="city"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="Lagos"
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          id="state"
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="Lagos State"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        id="country"
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="input py-3 focus:ring-primary-500"
                        placeholder="Nigeria"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="latitude" className="block text-sm font-semibold text-gray-700 mb-2">
                          Latitude (Optional)
                        </label>
                        <input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => handleChange('latitude', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="6.5244"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Get coordinates from Google Maps
                        </p>
                      </div>
                      <div>
                        <label htmlFor="longitude" className="block text-sm font-semibold text-gray-700 mb-2">
                          Longitude (Optional)
                        </label>
                        <input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => handleChange('longitude', e.target.value)}
                          className="input py-3 focus:ring-primary-500"
                          placeholder="3.3792"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 md:p-5 mt-6">
                    <p className="text-sm text-blue-900">
                      <strong className="font-semibold">📋 Verification Process:</strong> Your account will be reviewed by our team. You'll receive an email notification once your verification is complete. This process typically takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Government verification section - only document upload */}
            {formData.role === 'government' && (
              <>
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Official Documentation
                    </h3>
                    <p className="text-sm text-gray-600">
                      Please provide official authorization document for account verification
                    </p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="id_document_url_gov" className="block text-sm font-semibold text-gray-700 mb-2">
                      Official Authorization Document URL
                    </label>
                    <div className="relative">
                      <input
                        id="id_document_url_gov"
                        type="url"
                        value={formData.id_document_url}
                        onChange={(e) => handleChange('id_document_url', e.target.value)}
                        className="input py-3 pr-12 focus:ring-primary-500"
                        placeholder="https://example.com/official-authorization-letter.pdf"
                      />
                      <input
                        ref={govFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Focus the URL input and show helpful message
                            const urlInput = document.getElementById('id_document_url_gov') as HTMLInputElement;
                            if (urlInput) {
                              urlInput.focus();
                              // Show a temporary message
                              const originalPlaceholder = urlInput.placeholder;
                              urlInput.placeholder = `Selected: ${file.name} - Upload to hosting service and paste link`;
                              setTimeout(() => {
                                urlInput.placeholder = originalPlaceholder;
                              }, 5000);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => govFileInputRef.current?.click()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors cursor-pointer p-1 rounded hover:bg-gray-100"
                        aria-label="Upload document"
                        title="Click to select a file"
                      >
                        <Upload className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Click the upload icon to select a file, then upload it to a file hosting service (Google Drive, Dropbox, etc.) and paste the shareable link above.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 md:p-5 mt-6">
                    <p className="text-sm text-blue-900">
                      <strong className="font-semibold">📋 Verification Process:</strong> Your account will be reviewed by our team. You'll receive an email notification once your verification is complete. This process typically takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`input py-3 pr-10 ${errors.password ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-danger-600">{errors.password}</p>
                )}
                {formData.password && formData.password.length >= 8 && !errors.password && (
                  <p className="mt-2 text-sm text-success-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Password meets requirements
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-danger-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`input py-3 ${errors.confirmPassword ? 'border-danger-500 focus:ring-danger-500' : 'focus:ring-primary-500'}`}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  required
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-danger-600">{errors.confirmPassword}</p>
                )}
                {formData.confirmPassword &&
                  formData.password === formData.confirmPassword &&
                  !errors.confirmPassword && (
                    <p className="mt-2 text-sm text-success-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Passwords match
                    </p>
                  )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                onClick={(e) => {
                  // Prevent default and manually trigger submit to ensure validation runs
                  e.preventDefault();
                  handleSubmit(e);
                }}
                disabled={registerMutation.isPending}
                className="w-full btn-primary py-4 md:py-5 text-base md:text-lg font-bold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-xs text-gray-500">
                  Form valid: {isFormValid() ? 'Yes' : 'No'} | 
                  Errors: {Object.keys(errors).length} | 
                  Role: {formData.role}
                </div>
              )}
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm md:text-base text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

