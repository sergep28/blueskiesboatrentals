import { trpc } from '../../lib/trpc';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function AdminPartners() {
  const { data: partners, refetch } = trpc.partners.list.useQuery();
  const updateStatus = trpc.partners.updateStatus.useMutation({ onSuccess: () => refetch() });

  return (
    <div>
      <h1 className="font-heading text-3xl font-normal text-slate-900 mb-8">Partners</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Business</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-center px-4 py-3 font-medium">Referrals</th>
              <th className="text-right px-4 py-3 font-medium">Revenue</th>
              <th className="text-right px-4 py-3 font-medium">Commission</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {partners?.map(p => (
              <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{p.businessName}</td>
                <td className="px-4 py-3 text-slate-500">{p.contactName}</td>
                <td className="px-4 py-3 capitalize">{p.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-mono text-sky-600 text-xs">{p.referralCode}</td>
                <td className="px-4 py-3 text-center">{p.totalReferrals}</td>
                <td className="px-4 py-3 text-right">${p.totalRevenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">${p.totalCommission.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={e => updateStatus.mutate({ id: p.id, status: e.target.value as any })}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[p.status]}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
