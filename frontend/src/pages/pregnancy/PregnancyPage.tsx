import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pregnancyApi } from '../../services/api';
import { Baby, Calendar, Heart, Save, Loader2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PregnancyPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    due_date: '',
    doctor_name: '',
    hospital_name: '',
    blood_type: '',
    notes: '',
  });

  const { data: pregnancy, isLoading } = useQuery({
    queryKey: ['pregnancy', 'current'],
    queryFn: () => pregnancyApi.getCurrent(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => pregnancyApi.update(pregnancy!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pregnancy'] });
      setIsEditing(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: pregnancyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pregnancy'] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    if (pregnancy) {
      setFormData({
        due_date: pregnancy.due_date,
        doctor_name: pregnancy.doctor_name || '',
        hospital_name: pregnancy.hospital_name || '',
        blood_type: pregnancy.blood_type || '',
        notes: pregnancy.notes || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (pregnancy) {
      setFormData({
        due_date: pregnancy.due_date,
        doctor_name: pregnancy.doctor_name || '',
        hospital_name: pregnancy.hospital_name || '',
        blood_type: pregnancy.blood_type || '',
        notes: pregnancy.notes || '',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pregnancy) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pregnancy Information</h1>
          <p className="mt-2 text-gray-600">Manage your pregnancy details</p>
        </div>
        {pregnancy && !isEditing && (
          <button onClick={handleEdit} className="btn-secondary inline-flex items-center">
            <Edit2 className="mr-2 h-5 w-5" />
            Edit
          </button>
        )}
      </div>

      {!pregnancy && !isEditing ? (
        <div className="card text-center py-12">
          <Baby className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pregnancy Record</h3>
          <p className="text-gray-600 mb-6">Create a pregnancy record to get started</p>
          <button onClick={() => setIsEditing(true)} className="btn-primary inline-flex items-center">
            <Baby className="mr-2 h-5 w-5" />
            Create Pregnancy Record
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="input"
                required
                disabled={!isEditing}
              />
              {pregnancy && !isEditing && (
                <p className="mt-1 text-sm text-gray-500">
                  {format(new Date(pregnancy.due_date), 'MMMM dd, yyyy')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Blood Type
              </label>
              <input
                type="text"
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="input"
                placeholder="A+, B+, O+, etc."
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Doctor Name
              </label>
              <input
                type="text"
                value={formData.doctor_name}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                className="input"
                placeholder="Dr. Jane Smith"
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hospital Name
              </label>
              <input
                type="text"
                value={formData.hospital_name}
                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                className="input"
                placeholder="General Hospital"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={4}
              placeholder="Additional notes about your pregnancy..."
              disabled={!isEditing}
            />
          </div>

          {pregnancy && !isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Current Week</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  Week {pregnancy.current_week || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-success-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Baby className="h-5 w-5 text-success-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Trimester</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {pregnancy.trimester || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-warning-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Heart className="h-5 w-5 text-warning-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Stage</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {pregnancy.pregnancy_stage || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending || createMutation.isPending}
                className="btn-primary inline-flex items-center"
              >
                {(updateMutation.isPending || createMutation.isPending) ? (
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
          )}
        </form>
      )}
    </div>
  );
}

