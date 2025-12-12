import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../services/api';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, User, Loader2, Eye, MessageSquare } from 'lucide-react';
import type { Appointment, AppointmentStatusUpdate } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';

export default function ProviderAppointmentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [providerNotes, setProviderNotes] = useState('');
  const token = localStorage.getItem('access_token');

  // Get appointments based on filter
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['provider-appointments', statusFilter],
    queryFn: () => {
      if (statusFilter === 'pending') {
        return appointmentsApi.getPending();
      }
      return appointmentsApi.getAll(statusFilter);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // WebSocket for real-time notifications
  useWebSocket(token, (message) => {
    console.log('[ProviderAppointments] WebSocket message:', message);
    if (message.type === 'appointment_request') {
      console.log('[ProviderAppointments] New appointment request received');
      queryClient.invalidateQueries({ queryKey: ['provider-appointments'] });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: AppointmentStatusUpdate }) =>
      appointmentsApi.accept(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-appointments'] });
      setShowDetails(false);
      setSelectedAppointment(null);
      setProviderNotes('');
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: AppointmentStatusUpdate }) =>
      appointmentsApi.decline(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-appointments'] });
      setShowDetails(false);
      setSelectedAppointment(null);
      setProviderNotes('');
    },
  });

  const handleViewDetails = async (appointment: Appointment) => {
    try {
      const details = await appointmentsApi.getDetails(appointment.id);
      setSelectedAppointment(details);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
    }
  };

  const handleAccept = () => {
    if (!selectedAppointment) return;
    acceptMutation.mutate({
      appointmentId: selectedAppointment.id,
      data: {
        status: 'accepted',
        provider_notes: providerNotes || null,
      },
    });
  };

  const handleDecline = () => {
    if (!selectedAppointment) return;
    declineMutation.mutate({
      appointmentId: selectedAppointment.id,
      data: {
        status: 'declined',
        provider_notes: providerNotes || null,
      },
    });
  };

  const appointments = appointmentsData?.appointments || [];

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-gray-600">Manage patient appointment requests</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === 'pending'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({appointmentsData?.total || 0})
        </button>
        <button
          onClick={() => setStatusFilter('accepted')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === 'accepted'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Accepted
        </button>
        <button
          onClick={() => setStatusFilter('declined')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === 'declined'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Declined
        </button>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            statusFilter === ''
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Appointments</h2>
          <p className="text-gray-600">
            {statusFilter === 'pending'
              ? 'You have no pending appointment requests.'
              : 'No appointments found with this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{appointment.clinic_name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(appointment.status)}`}>
                      {appointment.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 ml-8">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">Patient:</span>
                      <span className="ml-2">{appointment.patient_name || 'Unknown'}</span>
                    </div>
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
                    {appointment.notes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Patient Notes:</span> {appointment.notes}
                      </div>
                    )}
                    {appointment.provider_notes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Your Notes:</span> {appointment.provider_notes}
                      </div>
                    )}
                  </div>
                </div>

                {appointment.status === 'pending' && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(appointment)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Details Modal */}
      {showDetails && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedAppointment(null);
                    setProviderNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Info */}
              {selectedAppointment.patient && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Patient Information
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Name:</span> {selectedAppointment.patient.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedAppointment.patient.email}</p>
                  </div>
                </div>
              )}

              {/* Pregnancy Info */}
              {selectedAppointment.pregnancy && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Pregnancy Information</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Due Date:</span> {new Date(selectedAppointment.pregnancy.due_date).toLocaleDateString()}</p>
                    {selectedAppointment.pregnancy.current_week && (
                      <p><span className="font-medium">Current Week:</span> Week {selectedAppointment.pregnancy.current_week}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Appointment Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date & Time</label>
                  <p className="text-gray-900">{new Date(selectedAppointment.appointment_date).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital</label>
                  <p className="text-gray-900">{selectedAppointment.clinic_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{selectedAppointment.clinic_address}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                  <p className="text-gray-900">{selectedAppointment.appointment_type.replace('_', ' ')}</p>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Notes</label>
                    <p className="text-gray-900">{selectedAppointment.notes}</p>
                  </div>
                )}

                {selectedAppointment.status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Notes (Optional)
                    </label>
                    <textarea
                      value={providerNotes}
                      onChange={(e) => setProviderNotes(e.target.value)}
                      placeholder="Add any notes about this appointment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>
                )}

                {selectedAppointment.provider_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Previous Notes</label>
                    <p className="text-gray-900">{selectedAppointment.provider_notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedAppointment.status === 'pending' && (
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setSelectedAppointment(null);
                      setProviderNotes('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={declineMutation.isPending}
                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    {declineMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Declining...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                    className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    {acceptMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

