import { create } from 'zustand';
import axios from 'axios';
import { useToastStore } from './toastStore';
import { useAuthStore } from './authStore';
import API_BASE from '../utils/apiBase'; // ✅ use shared API_BASE

export interface Lead {
  id: string;
  date?: string; 
  fullName: string;
  phone: string;
  email: string;
  altNumber: string;
  notes: string;
  deematAccountName: string;
  profession: string;
  stateName: string;
  capital: string;
  segment: string;
  wonOn?: string;
  gender?: string;
  dob?: string;
  age?: string;
  panCardNumber?: string;
  aadharCardNumber?: string;
  paymentHistory?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
  team_id: string;
  assigned_to?: string;
}

interface LeadStore {
  leads: Lead[];
  loading: boolean;
  fetchLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, lead: Omit<Lead, 'id'>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  uploadLeads: (file: File) => Promise<void>;
}

export const useLeadStore = create<LeadStore>((set) => ({
  leads: [],
  loading: false,

  fetchLeads: async () => {
    set({ loading: true });
    try {
      const { role, userId } = useAuthStore.getState();
      const { data } = await axios.get(`${API_BASE}/leads`, {
        params: { role, user_id: userId },
      });
      const mapped = data.map((lead: any) => ({
        ...lead,
        fullName: lead.full_name,
        altNumber: lead.alt_number,
        deematAccountName: lead.deemat_account_name,
        profession: lead.profession,
        stateName: lead.state_name,
        capital: lead.capital,
        segment: lead.segment,
        wonOn: lead.won_on,
        gender: lead.gender,
        dob: lead.dob,
        age: lead.age,
        panCardNumber: lead.pan_card_number,
        aadharCardNumber: lead.aadhar_card_number,
        paymentHistory: lead.payment_history,
      }));
      set({ leads: mapped });
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      set({ loading: false });
    }
  },

  addLead: async (lead) => {
    const addToast = useToastStore.getState().addToast;
    try {
      await axios.post(`${API_BASE}/leads`, lead);
      await useLeadStore.getState().fetchLeads();
      addToast('Lead added successfully', 'success');
    } catch (err) {
      console.error('Failed to add lead:', err);
      addToast('Failed to add lead', 'error');
    }
  },

  updateLead: async (id, lead) => {
    const addToast = useToastStore.getState().addToast;
    try {
      const { role, userId } = useAuthStore.getState();
      await axios.put(`${API_BASE}/leads/${id}`, lead, {
        params: { role, user_id: userId },
      });
      await useLeadStore.getState().fetchLeads();
      addToast('Lead updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update lead:', err);
      addToast('Failed to update lead', 'error');
    }
  },

  deleteLead: async (id) => {
    const addToast = useToastStore.getState().addToast;
    try {
      await axios.delete(`${API_BASE}/leads/${id}`);
      await useLeadStore.getState().fetchLeads();
      addToast('Lead deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete lead:', err);
      addToast('Failed to delete lead', 'error');
    }
  },

  uploadLeads: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const addToast = useToastStore.getState().addToast;
    try {
      await axios.post(`${API_BASE}/leads/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await useLeadStore.getState().fetchLeads();
      addToast('Leads uploaded successfully', 'success');
    } catch (err) {
      console.error('Failed to upload leads:', err);
      addToast('Failed to upload leads', 'error');
    }
  },
}));
