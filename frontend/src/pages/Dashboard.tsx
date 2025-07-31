import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useLeadStore } from '../stores/leadStore';
import { useTeamStore } from '../stores/teamStore';
import { parsePaymentHistory } from '../utils/payment';

const Dashboard = () => {
  const { role, userId } = useAuthStore();
  const { users } = useUserStore();
  const { leads } = useLeadStore();
  const { teams } = useTeamStore();

  useEffect(() => {
    useUserStore.getState().fetchUsers();
    useLeadStore.getState().fetchLeads();
    useTeamStore.getState().fetchTeams();
  }, []);

  const currentUser = users.find(u => u.id === userId);
  const teamId = currentUser?.team_id;

  const filteredUsers = role === 'team_leader'
    ? users.filter(u => u.team_id === teamId)
    : users;

  const filteredLeads = role === 'team_leader'
    ? leads.filter(l => l.team_id === teamId)
    : leads;

  const totalUsers = filteredUsers.length;
  const totalLeads = filteredLeads.length;
  const totalTeams = teams.length;

  const paidClients = filteredLeads.filter(l => l.status === 'Won').length;
  const totalSales = filteredLeads.reduce((sum, lead) => {
    if (lead.status === 'Won' && lead.paymentHistory) {
      return (
        sum +
        parsePaymentHistory(lead.paymentHistory).reduce(
          (s, ph) => s + (ph.approved ? parseFloat(ph.amount || '0') : 0),
          0
        )
      );
    }
    return sum;
  }, 0);

  const conversionRate = filteredLeads.length
    ? Math.round((filteredLeads.filter(l => l.status === 'Won').length / filteredLeads.length) * 100)
    : 0;

  const teamsWithClientCounts = teams.map(team => {
    const clients = leads.filter(l => l.team_id === team.id && l.status === 'Won').length;
    return {
      name: team.name,
      clients,
      avatarColor: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'][Math.floor(Math.random() * 4)],
    };
  });

  const maxClients = Math.max(...teamsWithClientCounts.map(t => t.clients), 0);

  const topTeams = teamsWithClientCounts
    .sort((a, b) => b.clients - a.clients)
    .slice(0, 5)
    .map(team => ({
      ...team,
      percent: maxClients ? Math.round((team.clients / maxClients) * 100) : 0,
    }));

  const rmSales = users
    .filter(
      u =>
        (u.role === 'relationship_mgr' || u.role === 'financial_manager') &&
        (role !== 'team_leader' || u.team_id === teamId)
    )
    .map(rm => {
      const rmLeads = filteredLeads.filter(l => l.assigned_to === rm.id && l.status === 'Won');
      const sales = rmLeads.reduce((sum, lead) => {
        if (lead.paymentHistory) {
          return (
            sum +
            parsePaymentHistory(lead.paymentHistory).reduce(
              (s, ph) => s + (ph.approved ? parseFloat(ph.amount || '0') : 0),
              0
            )
          );
        }
        return sum;
      }, 0);
      return { name: rm.displayName, sales };
    });

  const recentActivity = [
    ...filteredUsers.slice(-3).reverse().map(u => ({
      icon: '👤',
      title: `New user: ${u.displayName}`,
      timestamp: 'Recently',
    })),
    ...filteredLeads.slice(-3).reverse().map(l => ({
      icon: '💼',
      title: `New lead: ${l.fullName}`,
      timestamp: 'Recently',
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">📊 CRM Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total Leads" value={totalLeads} icon="💼" color="from-green-500 to-green-700" />
        <StatCard title="Paid Clients" value={paidClients} icon="🤑" color="from-blue-500 to-blue-700" />
        <StatCard title="Total Sales" value={`₹${totalSales}`} icon="💰" color="from-yellow-500 to-yellow-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">🏅 Top Teams</h2>
          <div className="space-y-6">
            {topTeams.map((team, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${team.avatarColor} text-center text-white font-bold`}>
                      {team.name.charAt(0)}
                    </div>
                    <span>{team.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">{team.clients} clients</span>
                </div>
                <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${team.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">🤝 Relationship Manager Sales</h2>
          <ul className="space-y-4 max-h-60 overflow-y-auto">
            {rmSales.map((rm, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <span>{rm.name}</span>
                <span>{rm.sales}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">🕒 Recent Activity</h2>
          <ul className="space-y-5">
            {recentActivity.map((item, index) => (
              <li key={index} className="flex items-start gap-4">
                <div className="text-2xl">{item.icon}</div>
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-400">{item.timestamp}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) => (
  <div
    className="bg-gradient-to-br rounded-xl p-6 shadow-lg flex justify-between items-center text-white transition-transform hover:scale-[1.02] duration-200"
    style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
  >
    <div>
      <p className="text-sm uppercase tracking-wide text-white/70">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
    <div className={`text-4xl ${color}`}>{icon}</div>
  </div>
);

export default Dashboard;
