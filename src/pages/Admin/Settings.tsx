import React, { useState, useEffect, useRef } from "react";
import { getAdminSettings, saveAdminSettings } from "../../lib/db";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function Settings() {
  const [settings, setSettings] = useState({
    username: "",
    password: "",
    email: "",
    profileImage: "",
    instituteName: "DINESHKUMAR AGARAM DHINES"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAdminSettings().then(data => {
      if (data) setSettings(data);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveAdminSettings(settings);
    setSuccessMessage(true);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async () => {
    if (!settings.email) {
      alert("Please set a registered email address first.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Simulate sending an email
    alert(`[SIMULATED EMAIL] Sent to ${settings.email}\n\nYour password reset code is: ${code}`);
    
    const enteredCode = prompt("Enter the 6-digit confirmation code sent to your email:");
    if (enteredCode === code) {
      const newPassword = prompt("Enter your new password:");
      if (newPassword) {
        const updatedSettings = { ...settings, password: newPassword };
        setSettings(updatedSettings);
        await saveAdminSettings(updatedSettings);
        alert("Password changed successfully!");
      }
    } else if (enteredCode !== null) {
      alert("Invalid confirmation code.");
    }
  };

  const handleDownloadQrImage = async () => {
    if (qrRef.current) {
      try {
        const url = await toPng(qrRef.current, { pixelRatio: 3, backgroundColor: 'transparent' });
        const link = document.createElement("a");
        link.download = "admin-login-qr.png";
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async () => {
    if (qrRef.current) {
      try {
        const imgData = await toPng(qrRef.current, { pixelRatio: 3, backgroundColor: 'transparent' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save("admin-login-qr.pdf");
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Admin Profile Settings</h2>
        <button 
          onClick={() => setShowQr(true)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm bg-indigo-50 px-3 py-1.5 rounded-lg"
        >
          <QrCode size={16} /> Login QR
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-2 border-2 border-blue-500 group cursor-pointer">
            <img 
              src={settings.profileImage || "https://picsum.photos/seed/admin/100/100"} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
            <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-medium">Change</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1 w-full text-center">
            Profile Image
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Institute Name
          </label>
          <input
            type="text"
            value={settings.instituteName}
            onChange={(e) => setSettings({...settings, instituteName: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Username
          </label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => setSettings({...settings, username: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registered Email
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({...settings, email: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Admin Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={settings.password}
              onChange={(e) => setSettings({...settings, password: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="pt-4 flex flex-col items-center gap-3">
          {successMessage && (
            <div className="text-emerald-600 font-medium text-sm bg-emerald-50 px-4 py-2 rounded-md w-full text-center border border-emerald-200">
              Success! Settings saved successfully.
            </div>
          )}
          <button
            type="submit"
            className="bg-pink-600 text-white px-8 py-2 rounded-md hover:bg-pink-700 transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </form>

      {showQr && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Admin Login QR Code</h3>
            
            <div ref={qrRef} className="bg-white p-6 rounded-2xl border-4 border-indigo-600 flex-col items-center w-80 shadow-lg mb-6">
              <h3 className="font-black text-2xl text-indigo-800 mb-1 tracking-wider text-center">AGARAM</h3>
              <p className="text-sm font-bold text-gray-500 mb-4 tracking-widest uppercase text-center">Academy</p>
              
              <div className="bg-white p-3 rounded-xl shadow-inner border-2 border-gray-100 mb-6 flex justify-center">
                <QRCodeSVG 
                  value={`ADMIN_LOGIN:${settings.username}:${settings.password}`} 
                  size={180} 
                  level={"H"}
                />
              </div>
              
              <div className="w-full bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-bold text-lg text-gray-900 text-center mb-2">ADMIN LOGIN</h4>
                
                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Username:</span>
                    <span className="font-mono font-bold text-indigo-700">{settings.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Password:</span>
                    <span className="font-mono font-bold text-indigo-700">{settings.password || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={handleDownloadQrImage}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Download size={16} /> Image
              </button>
              <button 
                onClick={handleDownloadQrPdf}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Download size={16} /> PDF
              </button>
            </div>
            
            <button 
              onClick={() => setShowQr(false)}
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
