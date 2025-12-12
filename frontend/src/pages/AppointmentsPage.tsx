import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pregnancyApi, appointmentsApi } from '../services/api';
import { Calendar, Plus, MapPin, Clock, Loader2, X, CheckCircle, XCircle, Bell } from 'lucide-react';
import type { Appointment, AppointmentCreate } from '../services/api';
import { useTranslation } from '../contexts/TranslationContext';
import { useWebSocket } from '../hooks/useWebSocket';

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<AppointmentCreate>({
    pregnancy_id: '',
    appointment_date: '',
    clinic_name: '',
    clinic_address: '',
    appointment_type: 'routine',
  });

  const { data: pregnancy } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
  });

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', pregnancy?.id],
    queryFn: () => appointmentsApi.getByPregnancy(pregnancy!.id),
    enabled: !!pregnancy?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const token = localStorage.getItem('access_token');
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string; appointmentId: string }>>([]);

  // WebSocket for real-time notifications
  useWebSocket(token, (message) => {
    console.log('[Appointments] WebSocket message:', message);
    if (message.type === 'appointment_accepted' || message.type === 'appointment_declined') {
      console.log('[Appointments] Appointment status update received:', message.type);
      const notification = {
        id: Date.now().toString(),
        message: message.message || `Your appointment has been ${message.type === 'appointment_accepted' ? 'accepted' : 'declined'}`,
        type: message.type,
        appointmentId: message.appointment_id,
      };
      setNotifications((prev) => [notification, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['appointments', pregnancy?.id] });
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Appointment Update', {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-dismiss notifications after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 10000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const createMutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', pregnancy?.id] });
      setShowCreateForm(false);
      setFormData({
        pregnancy_id: pregnancy!.id,
        appointment_date: '',
        clinic_name: '',
        clinic_address: '',
        appointment_type: 'routine',
      });
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      alert(error?.response?.data?.detail || error?.message || 'Failed to create appointment. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregnancy) {
      alert('Please create a pregnancy profile first');
      return;
    }
    
    // Validate form data
    if (!formData.appointment_date || !formData.clinic_name || !formData.clinic_address) {
      alert('Please fill in all required fields');
      return;
    }
    
    console.log('Submitting appointment:', {
      ...formData,
      pregnancy_id: pregnancy.id,
    });
    
    createMutation.mutate({
      ...formData,
      pregnancy_id: pregnancy.id,
    });
  };

  if (!pregnancy) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('no_active_pregnancy', 'No Active Pregnancy')}</h2>
          <p className="text-gray-600">{t('please_create_pregnancy_profile_first', 'Please create a pregnancy profile first to manage appointments.')}</p>
        </div>
      </div>
    );
  }

  const appointments = appointmentsData?.appointments || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-2 flex items-start space-x-3 ${
                notification.type === 'appointment_accepted'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {notification.type === 'appointment_accepted' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  notification.type === 'appointment_accepted' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {notification.type === 'appointment_accepted' ? 'Appointment Accepted' : 'Appointment Declined'}
                </p>
                <p className={`text-sm ${
                  notification.type === 'appointment_accepted' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('appointments', 'Appointments')}</h1>
          <p className="mt-2 text-gray-600">{t('manage_healthcare_appointments', 'Manage your healthcare appointments')}</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center">
          <Plus className="mr-2 h-5 w-5" />
          {t('new_appointment', 'New Appointment')}
        </button>
      </div>

      {showCreateForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('create_appointment', 'Create Appointment')}</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('appointment_date_time', 'Appointment Date & Time')} <span className="text-danger-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('clinic_hospital_name', 'Clinic/Hospital Name')} <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clinic_name}
                onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                className="input"
                placeholder="Enter clinic or hospital name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('clinic_address', 'Clinic Address')} <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clinic_address}
                onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                className="input"
                placeholder="Enter clinic address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('appointment_type', 'Appointment Type')} <span className="text-danger-500">*</span>
              </label>
              <select
                value={formData.appointment_type}
                onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                className="input"
                required
              >
                <option value="routine">{t('routine_checkup', 'Routine Check-up')}</option>
                <option value="ultrasound">{t('ultrasound', 'Ultrasound')}</option>
                <option value="lab_test">{t('lab_test', 'Lab Test')}</option>
                <option value="consultation">Consultation</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary inline-flex items-center"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Create Appointment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('no_appointments', 'No Appointments')}</h2>
          <p className="text-gray-600 mb-4">You don't have any appointments scheduled yet.</p>
          <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Create First Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{appointment.clinic_name}</h3>
                    <span className={`badge ${
                      appointment.status === 'accepted' ? 'badge-success' :
                      appointment.status === 'declined' ? 'badge-danger' :
                      appointment.status === 'pending' ? 'badge-warning' :
                      appointment.status === 'completed' ? 'badge-success' :
                      appointment.status === 'cancelled' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                    {appointment.status === 'pending' && (
                      <span className="flex items-center text-xs text-yellow-600">
                        <Bell className="h-3 w-3 mr-1 animate-pulse" />
                        Waiting for provider
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 ml-8">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {new Date(appointment.appointment_date).toLocaleString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {appointment.clinic_address}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Type:</span> {appointment.appointment_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

