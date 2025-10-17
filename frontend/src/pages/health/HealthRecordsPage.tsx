import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';

export const HealthRecordsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Health Records</h1>
        <Link to="/health/new" className="btn btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Record
        </Link>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-neutral-600">Health records will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};
