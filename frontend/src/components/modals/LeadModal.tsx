import { useState, useEffect } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { useLeadStore } from '../../stores/leadStore';
import { useTeamStore } from '../../stores/teamStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import type { Lead } from '../../stores/leadStore';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead }) => {
  const { addLead, updateLead, leads } = useLeadStore();
  const { fetchTeams } = useTeamStore();
  const { users, fetchUsers } = useUserStore();
  const { role, userId } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  const [showConfirm, setShowConfirm] = useState(false);
  const [noteHistory, setNoteHistory] = useState<
    { note: string; status: Lead['status']; date: string; isNew?: boolean }[]
  >([]);

  const [formData, setFormData] = useState<Omit<Lead, 'id'>>({
    fullName: '',
    phone: '',
    email: '',
    altNumber: '',
    notes: '',
    deematAccountName: '',
    profession: '',
    stateName: '',
    capital: '',
    segment: '',
    status: 'New',
    team_id: '',
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (lead) {
      setFormData({
        fullName: lead.fullName || '',
        phone: lead.phone || '',
        email: lead.email || '',
        altNumber: lead.altNumber || '',
        notes: lead.notes || '',
        deematAccountName: lead.deematAccountName || '',
        profession: lead.profession || '',
        stateName: lead.stateName || '',
        capital: lead.capital || '',
        segment: lead.segment || '',
        status: lead.status || 'New',
        team_id: lead.team_id || '',
      });
      const history = lead.notes
        ?.split('|||')
        .map((entry) => {
          const parts = entry.split('__');
          return {
            note: parts[0] || '',
            status: (parts[1] || 'New') as Lead['status'],
            date: parts[2] || new Date().toISOString(),
            isNew: false,
          };
        }) || [];
      setNoteHistory(history.reverse());
    } else {
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        altNumber: '',
        notes: '',
        deematAccountName: '',
        profession: '',
        stateName: '',
        capital: '',
        segment: '',
        status: 'New',
        team_id: '',
      });
      setNoteHistory([
        {
          note: '',
          status: 'New',
          date: new Date().toISOString(),
          isNew: true,
        },
      ]);
    }
  }, [lead]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNoteChange = (
    index: number,
    field: 'note' | 'status',
    value: string
  ) => {
    if (role === 'relationship_mgr' && !noteHistory[index].isNew) return;
    const updated = [...noteHistory];
    updated[index][field] = value as any;
    setNoteHistory(updated);
  };

  const addNewRow = () => {
    const now = new Date().toISOString();
    setNoteHistory([
      {
        status: 'New',
        note: '',
        date: now,
        isNew: true,
      },
      ...noteHistory,
    ]);
  };

  const submitLead = async (forcedStatus?: string) => {
  const reversed = [...noteHistory].reverse();
  const notesString = reversed
    .map((n) => `${n.note.trim()}__${n.status}__${n.date}`)
    .join('|||');
  const newStatus = noteHistory[0]?.status || 'New';

  let finalData = {
    ...formData,
    notes: notesString,
    status: (forcedStatus ?? newStatus) as Lead['status'],
  };

  if (role === 'relationship_mgr') {
    const user = users.find(u => u.id === userId);
    if (user) {
      finalData = {
        ...finalData,
        team_id: user.team_id || '',
        assigned_to: userId,
      };
    }
  }

  console.log("✅ submitLead triggered", formData);
  console.log("Final payload to update/add:", finalData);

  if (lead) {
    await updateLead(lead.id, finalData);
  } else {
    await addLead(finalData);
  }

  onClose();

  setTimeout(() => {
    const event = new CustomEvent('refreshLeads');
    window.dispatchEvent(event);
  }, 100);
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lead && formData.phone && leads.some(l => l.phone === formData.phone)) {
      addToast('A lead with this phone number already exists!', 'error');
      return;
    }

    const latestStatus = noteHistory[0]?.status || 'New';
    if (lead?.status !== 'Won' && latestStatus === 'Won') {
      setShowConfirm(true);
      return;
    }

    await submitLead();
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'Edit Lead' : 'Add Lead'}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="fullName"
            className="form-input"
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={role === 'relationship_mgr' && !!lead?.fullName}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="text"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.phone}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={role === 'relationship_mgr' && !!lead?.email}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Alternate Number</label>
          <input
            type="text"
            name="altNumber"
            className="form-input"
            value={formData.altNumber}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.altNumber}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Deemat Account Name</label>
          <select
            name="deematAccountName"
            className="form-input"
            value={formData.deematAccountName}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.deematAccountName}
          >
            <option value="">Select</option>
            <option value="Zerodha">Zerodha</option>
            <option value="Upstox">Upstox</option>
            <option value="Angel One">Angel One</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Profession</label>
          <select
            name="profession"
            className="form-input"
            value={formData.profession}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.profession}
          >
            <option value="">Select</option>
            <option value="Student">Student</option>
            <option value="Private Sector">Private Sector</option>
            <option value="Business">Business</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">State</label>
          <select
            name="stateName"
            className="form-input"
            value={formData.stateName}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.stateName}
          >
            <option value="">Select</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            <option value="Assam">Assam</option>
            <option value="Bihar">Bihar</option>
            <option value="Chhattisgarh">Chhattisgarh</option>
            <option value="Goa">Goa</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Haryana">Haryana</option>
            <option value="Himachal Pradesh">Himachal Pradesh</option>
            <option value="Jharkhand">Jharkhand</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Manipur">Manipur</option>
            <option value="Meghalaya">Meghalaya</option>
            <option value="Mizoram">Mizoram</option>
            <option value="Nagaland">Nagaland</option>
            <option value="Odisha">Odisha</option>
            <option value="Punjab">Punjab</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Sikkim">Sikkim</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Telangana">Telangana</option>
            <option value="Tripura">Tripura</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Uttarakhand">Uttarakhand</option>
            <option value="West Bengal">West Bengal</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Capital</label>
          <input
            type="text"
            name="capital"
            className="form-input"
            value={formData.capital}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.capital}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Segment</label>
          <input
            type="text"
            name="segment"
            className="form-input"
            value={formData.segment}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead?.segment}
          />
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-2">
            <label className="form-label">Status &amp; Notes History</label>
            <button
              type="button"
              onClick={addNewRow}
              className="text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 transition"
            >
              + Add Row
            </button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-600">
              <tr>
                <th className="p-2">Date &amp; Time</th>
                <th className="p-2">Status</th>
                <th className="p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {noteHistory.map((entry, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="p-2 text-gray-400">{new Date(entry.date).toLocaleString()}</td>
                  <td className="p-2">
                    <select
                      className="form-input"
                      value={entry.status}
                      onChange={(e) => handleNoteChange(i, 'status', e.target.value)}
                      disabled={role === 'relationship_mgr' && !entry.isNew}
                    >
                      <option value="New">New</option>
                      <option value="Switched off">Switched off</option>
                      <option value="Free Trial">Free Trial</option>
                      <option value="Busy">Busy</option>
                      <option value="Won">Won</option>
                      <option value="Follow Up">Follow Up</option>
<option value="Not Interested">Not Interested</option>
<option value="Callback">Callback</option>
<option value="Conversion">Conversion</option>
<option value="Less Funds">Less Funds</option>
<option value="Language Barrier">Language Barrier</option>
<option value="Invalid">Invalid</option>
<option value="Non Trader">Non Trader</option>

                    </select>
                  </td>
                  <td className="p-2">
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Enter note"
                      value={entry.note}
                      onChange={(e) => handleNoteChange(i, 'note', e.target.value)}
                      disabled={role === 'relationship_mgr' && !entry.isNew}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {lead ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </form>
    </Modal>
    {showConfirm && (
  <ConfirmModal
    isOpen={true}
    onClose={() => {
      setShowConfirm(false);
      setNoteHistory((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[0].status = lead?.status || 'New';
        }
        return updated;
      });
    }}
    onConfirm={async () => {
      console.log("🟡 ConfirmModal confirmed"); // ← add this
      setShowConfirm(false);
      await submitLead('Won'); // ← force Won status
    }}
    message="Marking this lead as Won will convert it to a client and cannot be undone. Continue?"
  />
)}
    </>
  );
};

export default LeadModal;
