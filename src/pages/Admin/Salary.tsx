import React, { useState, useEffect } from 'react';
import { getStaffs, saveStaffs } from '../../lib/db';
import { Search, DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function Salary() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    loadStaffs();
  }, []);

  const loadStaffs = async () => {
    const data = await getStaffs();
    setStaffs(data || []);
  };

  const handlePaySalary = async (staffId: string) => {
    const amount = prompt("Enter amount to pay:");
    if (!amount || isNaN(Number(amount))) return;

    const updatedStaffs = staffs.map(staff => {
      if (staff.id === staffId) {
        const payments = [...(staff.payments || [])];
        payments.push({
          id: Date.now().toString(),
          month,
          amount: Number(amount),
          date: new Date().toISOString(),
          status: 'Paid'
        });
        return { ...staff, payments };
      }
      return staff;
    });

    await saveStaffs(updatedStaffs);
    setStaffs(updatedStaffs);
    alert('Salary paid successfully!');
  };

  const filteredStaff = staffs.filter(staff => 
    staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    staff.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Salary Management</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Select Month:</label>
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status ({month})</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => {
                  const paymentForMonth = (staff.payments || []).find((p: any) => p.month === month);
                  
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.role || 'Teacher'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        Rs. {staff.salary || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {paymentForMonth ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} className="mr-1" /> Paid (Rs. {paymentForMonth.amount})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock size={12} className="mr-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {!paymentForMonth && (
                          <button 
                            onClick={() => handlePaySalary(staff.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <DollarSign size={14} className="mr-1" /> Pay Salary
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
