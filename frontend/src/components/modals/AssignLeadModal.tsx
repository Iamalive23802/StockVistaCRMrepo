import React, { useState } from 'react';
import Modal from './Modal'; // Reuse your base modal
import { useAuthStore } from '../../stores/authStore';

interface AssignLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  availableUsers: { id: string; displayName: string; role: string }[];
  onAssigned?: () => void; // optional refetch callback
}

const AssignLeadModal: React.FC<AssignLeadModalProps> = ({
  isOpen,
  onClose,
  leadId,
  availableUsers,
  onAssigned,
}) => {
  const { role } = useAuthStore();
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssign = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');

    // 🧪 Console logs to debug values
    console.log('Assigning leadId:', leadId);
    console.log('To user:', selectedUser);

    try {
      const response = await fetch(`http://localhost:5050/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: selectedUser }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign lead');
      }

      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('❌ Assign lead failed:', err);
      setError('Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Lead">
      <div className="form-group">
        <label className="form-label">Assign To</label>
        <select
          className="form-input"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Select user</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName} ({user.role})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <div className="flex justify-end mt-6 space-x-3">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleAssign}
          disabled={loading}
        >
          {loading ? 'Assigning...' : 'Assign Lead'}
        </button>
      </div>
    </Modal>
  );
};

export default AssignLeadModal;
