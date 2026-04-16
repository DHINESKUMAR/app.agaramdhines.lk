import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft } from "lucide-react";
import { getAdminSettings } from "../lib/db";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    getAdminSettings().then(data => {
      if (data) setSettings(data);
    });
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            {settings?.profileImage ? (
              <img src={settings.profileImage} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0">
                <BookOpen className="text-white" size={24} />
              </div>
            )}
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-800 tracking-tight">
              {settings?.instituteName || "Agaram Dhines Academy"}
            </span>
          </div>
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-semibold transition-colors"
          >
            <ChevronLeft size={20} /> Back to Home
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
            
            <p>
              At <strong>{settings?.instituteName || "Agaram Dhines Academy"}</strong>, we take your privacy seriously. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our website and services.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">1. Information We Collect</h3>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and grade level when you register for an account or enroll in a course.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform, including login times, course progress, and device information.</li>
              <li><strong>Payment Information:</strong> When you make a purchase, payment details are processed securely by our payment gateway providers. We do not store full credit card numbers.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">2. How We Use Your Information</h3>
            <p>We use the collected information for various purposes, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve our educational services.</li>
              <li>To process transactions and send related information, including confirmations and receipts.</li>
              <li>To communicate with you about courses, updates, security alerts, and support messages.</li>
              <li>To personalize your learning experience and deliver content relevant to your interests.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">3. Data Security</h3>
            <p>
              We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">4. Sharing Your Information</h3>
            <p>
              We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and trusted affiliates.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">5. Your Rights</h3>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. If you wish to exercise these rights, please contact us.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">6. Changes to This Privacy Policy</h3>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Contact Us</h3>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <strong>Email:</strong> support@agaramdhines.lk
              <br />
              <strong>Phone:</strong> +94 77 805 4232
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
