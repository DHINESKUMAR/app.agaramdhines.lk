import React, { useState, useEffect } from "react";
import { getStaffs, saveStaffs } from "../../lib/db";
import { Plus, Edit, Trash2, Search, Eye, Download, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function Staffs() {
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrModal, setShowQrModal] = useState<{show: boolean, staff: any | null}>({show: false, staff: null});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const staffData = await getStaffs();
    setStaffs(staffData || []);
  };

  const handleEdit = (staff: any) => {
    navigate(`/admin/edit-employee/${staff.id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      const updatedStaffs = staffs.filter(s => s.id !== id);
      await saveStaffs(updatedStaffs);
      setStaffs(updatedStaffs);
    }
  };

  const handleDownloadQrImage = async (staffId: string, staffName: string) => {
    const qrElement = document.getElementById(`qr-staff-${staffId}`);
    if (qrElement) {
      try {
        const url = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const link = document.createElement("a");
        link.download = `${staffName}-qr.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async (staffId: string, staffName: string) => {
    const qrElement = document.getElementById(`qr-staff-${staffId}`);
    if (qrElement) {
      try {
        const imgData = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save(`${staffName}-qr.pdf`);
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
        <button
          onClick={() => navigate('/admin/add-employee')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Add Staff
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search Employee..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button 
          onClick={() => setSearchQuery("")}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
        >
          All
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
        {staffs.filter(staff => 
          staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (staff.role && staff.role.toLowerCase().includes(searchQuery.toLowerCase()))
        ).length === 0 ? (
          <div className="text-center text-gray-500 py-8 col-span-full bg-white rounded-lg shadow-sm">No staff members found.</div>
        ) : (
          staffs.filter(staff => 
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (staff.role && staff.role.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map(staff => (
            <div key={staff.id} className="border border-gray-100 rounded-xl text-center p-6 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4 overflow-hidden border-2 border-gray-100">
                {staff.image ? (
                  <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-bold text-2xl">{staff.name.charAt(0)}</span>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-1">{staff.name}</h3>
              <p className="text-blue-600 text-sm font-medium mb-5">{staff.role || "Teacher"}</p>
              
              <div className="flex justify-center gap-3 mt-auto w-full pt-4 border-t border-gray-50">
                <button className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title="View">
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(staff)}
                  className="w-10 h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-full text-blue-600 transition-colors" 
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => setShowQrModal({show: true, staff})}
                  className="w-10 h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors" 
                  title="QR Code"
                >
                  <QrCode size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(staff.id)}
                  className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-full text-red-600 transition-colors" 
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showQrModal.show && showQrModal.staff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Staff Login QR Code</h3>
            
            <div id={`qr-staff-${showQrModal.staff.id}`} className="bg-white p-6 rounded-2xl border-4 border-indigo-600 flex-col items-center w-80 shadow-lg mb-6">
              <h3 className="font-black text-2xl text-indigo-800 mb-1 tracking-wider text-center">AGARAM</h3>
              <p className="text-sm font-bold text-gray-500 mb-4 tracking-widest uppercase text-center">Academy</p>
              
              <div className="bg-white p-3 rounded-xl shadow-inner border-2 border-gray-100 mb-6 flex justify-center">
                <QRCodeSVG 
                  value={showQrModal.staff.id} 
                  size={180} 
                  level={"H"}
                />
              </div>
              
              <div className="w-full bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-bold text-lg text-gray-900 text-center mb-2">{showQrModal.staff.name}</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">Role:</div>
                  <div className="font-semibold text-gray-900 text-right">{showQrModal.staff.role || 'Staff'}</div>
                  
                  <div className="text-gray-500">Staff ID:</div>
                  <div className="font-semibold text-gray-900 text-right text-xs truncate">{showQrModal.staff.id}</div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Username:</span>
                    <span className="font-mono font-bold text-indigo-700">{showQrModal.staff.email || showQrModal.staff.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Password:</span>
                    <span className="font-mono font-bold text-indigo-700">{showQrModal.staff.password || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => handleDownloadQrImage(showQrModal.staff.id, showQrModal.staff.name)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Download size={16} /> Image
              </button>
              <button 
                onClick={() => handleDownloadQrPdf(showQrModal.staff.id, showQrModal.staff.name)}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Download size={16} /> PDF
              </button>
            </div>
            
            <button 
              onClick={() => setShowQrModal({show: false, staff: null})}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
