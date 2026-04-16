import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function WebView() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="bg-[#1e3a8a] text-white p-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">agaramdhines.lk</h1>
      </div>
      <iframe
        src="https://agaramdhines.lk"
        className="flex-1 w-full border-none"
        title="Agaram Dhines Academy Website"
      />
    </div>
  );
}
