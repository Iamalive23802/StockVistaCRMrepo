import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useLeadStore, Lead } from '../../stores/leadStore';
import { useAuthStore } from '../../stores/authStore';
import {
  PaymentEntry,
  parsePaymentHistory,
  serializePaymentHistory,
} from '../../utils/payment';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, lead }) => {
  const { updateLead } = useLeadStore();
  const { role } = useAuthStore();

  const [formData, setFormData] = useState({
    gender: '',
    dob: '',
    panCardNumber: '',
    aadharCardNumber: '',
  });

  const [paymentHistory, setPaymentHistory] = useState<PaymentEntry[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Total of approved payments
  const totalApproved = paymentHistory
    .filter(e => e.approved)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Seed form + history once we get the lead
  useEffect(() => {
    if (lead) {
      setFormData({
        gender: lead.gender || '',
        dob: lead.dob || '',
        panCardNumber: lead.panCardNumber || '',
        aadharCardNumber: lead.aadharCardNumber || '',
      });
      const history = parsePaymentHistory(lead.paymentHistory);
      // newest-first in the table
      setPaymentHistory(history.reverse());
      setIsSaved(false);
    }
  }, [lead]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateAge = (date: string) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)).toString();
  };

  const handlePaymentChange = (
    index: number,
    field: keyof PaymentEntry,
    value: string | boolean,
  ) => {
    const updated = [...paymentHistory];
    (updated[index] as any)[field] = value;
    setPaymentHistory(updated);
  };

  const addPaymentRow = () => {
    setPaymentHistory([
      {
        amount: '',
        date: new Date().toISOString(),
        utr: '',
        approved: false,
        isNew: true,
      },
      ...paymentHistory,
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) Drop blank new rows  
    // 2) Remove isNew flag  
    // 3) Keep approved=false on those just-added
    const cleaned = paymentHistory
      .filter(entry => !(entry.isNew && entry.amount.trim() === ''))
      .map(entry => {
        const { isNew, ...rest } = entry;
        return {
          ...rest,
          approved: entry.approved && !entry.isNew
        };
      });

    // 4) oldest-first → serialize → save
    const reversed = [...cleaned].reverse();
    const historyStr = serializePaymentHistory(reversed);

    await updateLead(lead.id, {
      ...lead,
      gender: formData.gender,
      dob: formData.dob,
      age: calculateAge(formData.dob),
      panCardNumber: formData.panCardNumber,
      aadharCardNumber: formData.aadharCardNumber,
      paymentHistory: historyStr
    });

    // 5) Reflect “saved but unapproved” state immediately
    setPaymentHistory(cleaned.reverse());
    setIsSaved(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Client Details – ${lead.fullName}`}>
      <form onSubmit={handleSubmit}>
        {/* ————— Personal Info ————— */}
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select
            name="gender"
            className="form-input"
            value={formData.gender}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead.gender}
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth (dd/mm/yyyy)</label>
          <input
            type="date"
            name="dob"
            className="form-input"
            value={formData.dob}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead.dob}
          />
        </div>

        <div className="form-group">
          <label className="form-label">PAN Card Number</label>
          <input
            type="text"
            name="panCardNumber"
            className="form-input"
            value={formData.panCardNumber}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead.panCardNumber}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Aadhar Card Number</label>
          <input
            type="text"
            name="aadharCardNumber"
            className="form-input"
            value={formData.aadharCardNumber}
            onChange={handleChange}
            disabled={role === 'relationship_mgr' && !!lead.aadharCardNumber}
          />
        </div>

        {/* ————— Payment History ————— */}
        <div className="form-group">
          <div className="flex justify-between items-center mb-2">
            <label className="form-label">Payment History</label>
            {role === 'relationship_mgr' && (
              <button
                type="button"
                onClick={addPaymentRow}
                className="text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 transition"
              >
                + Add Payment
              </button>
            )}
          </div>

          <div className="mb-2 font-semibold">
            Total Approved: ₹{totalApproved}
          </div>

          <table className="w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-600">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Amount</th>
                <th className="p-2">UTR / Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((entry, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="p-2 text-gray-400">
                    {new Date(entry.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="form-input"
                      value={entry.amount}
                      onChange={e => handlePaymentChange(i, 'amount', e.target.value)}
                      disabled={!(entry.isNew && role === 'relationship_mgr')}
                    />
                  </td>
                  <td className="p-2">
                    {role === 'financial_manager' ? (
                      // FM: enter UTR → approved
                      entry.approved ? (
                        entry.utr || '—'
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          value={entry.utr}
                          onChange={e => handlePaymentChange(i, 'utr', e.target.value)}
                          onBlur={e => {
                            const val = e.target.value.trim();
                            if (val) {
                              handlePaymentChange(i, 'utr', val);
                              handlePaymentChange(i, 'approved', true);
                            }
                          }}
                        />
                      )
                    ) : (
                      // RM (and everyone else): 
                      // brand-new rows show “—”
                      entry.isNew ? (
                        '—'
                      ) : 
                      // approved entries show UTR
                      entry.approved ? (
                        entry.utr || '—'
                      ) : (
                        // saved but not yet approved → spinner + label
                        <div className="flex items-center gap-2 text-yellow-400">
                          <svg
                            className="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          Awaiting Approval
                        </div>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ————— Actions ————— */}
        <div className="flex justify-end space-x-3 mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {isSaved ? 'Close' : 'Cancel'}
          </button>
          {!isSaved && (
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ClientDetailsModal;
