import { useEffect, useState } from 'react';
import { Info, Pencil } from 'lucide-react';
import { useLeadStore, Lead } from '../stores/leadStore';
import { useAuthStore } from '../stores/authStore';
import ClientDetailsModal from '../components/modals/ClientDetailsModal';
import Modal from '../components/modals/Modal';
import { parsePaymentHistory } from '../utils/payment';

const AllClientsPage = () => {
  const { leads, fetchLeads } = useLeadStore();
  const { role, userId } = useAuthStore();
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [infoLead, setInfoLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const wonLeads = leads.filter((lead) => {
    if (lead.status !== 'Won') return false;
    if (role === 'relationship_mgr') {
      return lead.assigned_to === userId;
    }
    return true;
  });

  const getWonDate = (lead: Lead) => {
    if (lead.wonOn) return lead.wonOn;
    if (!lead.notes) return '';
    const entries = lead.notes.split('|||').map((e) => e.split('__'));
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i][1] === 'Won' && entries[i][2]) return entries[i][2];
    }
    return '';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">🎉 Clients</h1>

      {wonLeads.length === 0 ? (
        <p className="text-gray-400">No leads have been marked as "Won" yet.</p>
      ) : (
        <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700 max-h-[80vh]">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400 sticky top-0">
              <tr>
                <th className="p-3">Full Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Payment History</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {wonLeads.map((lead) => {
                const payments = lead.paymentHistory
                  ? parsePaymentHistory(lead.paymentHistory).reduce(
                      (sum, ph) => sum + (ph.approved ? Number(ph.amount || 0) : 0),
                      0
                    )
                  : 0;
                return (
                  <tr key={lead.id} className="hover:bg-gray-700">
                    <td className="p-3 font-medium text-blue-300">{lead.fullName}</td>
                    <td className="p-3">{lead.email}</td>
                    <td className="p-3">
                      {role === 'relationship_mgr'
                        ? lead.phone
                          ? `${lead.phone.slice(0, 2)}******`
                          : '—'
                        : lead.phone || '—'}
                    </td>
                    <td className="p-3">{payments}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => setInfoLead(lead)}
                        className="text-blue-400 hover:text-blue-300"
                        title="View Client Details"
                      >
                        <Info size={16} />
                      </button>
                      <button
                        onClick={() => setEditLead(lead)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Edit Client"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {infoLead && (
        <Modal isOpen={true} onClose={() => setInfoLead(null)} title="Client Information">
          <div className="space-y-2 text-gray-200">
            <p><strong>Full Name:</strong> {infoLead.fullName}</p>
            <p><strong>Email:</strong> {infoLead.email}</p>
            <p>
              <strong>Phone:</strong>{' '}
              {role === 'relationship_mgr'
                ? infoLead.phone
                  ? `${infoLead.phone.slice(0, 2)}******`
                  : '—'
                : infoLead.phone || '—'}
            </p>
            <p><strong>Gender:</strong> {infoLead.gender || '—'}</p>
            <p><strong>DOB:</strong> {infoLead.dob || '—'}</p>
            <p><strong>PAN Card No:</strong> {infoLead.panCardNumber || '—'}</p>
            <p><strong>Aadhar Card No:</strong> {infoLead.aadharCardNumber || '—'}</p>
          </div>
        </Modal>
      )}
      {editLead && (
        <ClientDetailsModal
          isOpen={true}
          onClose={() => setEditLead(null)}
          lead={editLead}
        />
      )}
    </div>
  );
};

export default AllClientsPage;
