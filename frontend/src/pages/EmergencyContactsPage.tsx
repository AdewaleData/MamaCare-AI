import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyContactsApi } from '../services/api';
import { Plus, Phone, User, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmergencyContactsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    is_primary: false,
  });

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: async () => {
      try {
        const result = await emergencyContactsApi.getAll();
        console.log('Emergency contacts loaded:', result);
        return result || [];
      } catch (err) {
        console.error('Error loading emergency contacts:', err);
        throw err;
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: emergencyContactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      setShowForm(false);
      resetForm();
      setEditingId(null);
    },
    onError: (error: any) => {
      console.error('Error creating contact:', error);
      alert(error.response?.data?.detail || 'Failed to save contact. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => emergencyContactsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
      setEditingId(null);
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      console.error('Error updating contact:', error);
      alert(error.response?.data?.detail || 'Failed to update contact. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: emergencyContactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: '',
      is_primary: false,
    });
  };

  const handleEdit = (contact: any) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary,
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  // Safety check - ensure component renders
  console.log('EmergencyContactsPage rendering', { contacts, isLoading, error });

  // Ensure we always have valid data
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Contacts</h1>
          <p className="mt-2 text-gray-600">Manage your emergency contacts</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Contact
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
                setEditingId(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-danger-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+234 800 000 0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Relationship <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="input"
                placeholder="Spouse, Parent, Friend, etc."
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_primary" className="ml-2 text-sm text-gray-700">
                Set as primary contact
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setEditingId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary inline-flex items-center"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Loading contacts...</span>
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Contacts</h3>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'Failed to load emergency contacts'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-flex items-center"
          >
            Retry
          </button>
        </div>
      ) : !safeContacts || safeContacts.length === 0 ? (
        <div className="card text-center py-12">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Emergency Contacts</h3>
          <p className="text-gray-600 mb-6">Add contacts to notify in case of emergency</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeContacts.map((contact) => (
            <div key={contact.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                {contact.is_primary && (
                  <span className="badge-success">Primary</span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">{contact.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{contact.relationship}</p>

              <div className="flex items-center text-sm text-gray-700 mb-4">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                {contact.phone}
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(contact)}
                  className="flex-1 btn-secondary text-sm inline-flex items-center justify-center"
                >
                  <Edit2 className="mr-1 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="btn-danger text-sm inline-flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

