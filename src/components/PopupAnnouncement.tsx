import React, { useState, useEffect } from "react";
import { getAnnouncements } from "../lib/db";
import { X, Megaphone } from "lucide-react";

export default function PopupAnnouncement({ userRole }: { userRole: string }) {
  const [activeAd, setActiveAd] = useState<any | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      const ads = await getAnnouncements();
      
      // Filter active ads targeted to this user role or "All"
      const relevantAds = ads.filter(ad => 
        ad.isActive && 
        (ad.targetAudience === "All" || ad.targetAudience === userRole)
      );

      if (relevantAds.length > 0) {
        // Sort by newest first
        relevantAds.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        
        const latestAd = relevantAds[0];
        
        // Check if user has already dismissed this specific ad
        const dismissedAds = JSON.parse(localStorage.getItem("dismissedAds") || "[]");
        if (!dismissedAds.includes(latestAd.id)) {
          setActiveAd(latestAd);
        }
      }
    };

    fetchAds();
  }, [userRole]);

  const handleDismiss = () => {
    if (activeAd) {
      const dismissedAds = JSON.parse(localStorage.getItem("dismissedAds") || "[]");
      localStorage.setItem("dismissedAds", JSON.stringify([...dismissedAds, activeAd.id]));
      setActiveAd(null);
    }
  };

  if (!activeAd) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full">
            <Megaphone size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight">Announcement</h2>
            <p className="text-orange-100 text-sm font-medium">Important update for you</p>
          </div>
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          {activeAd.imageUrl && (
            <div className="w-full h-48 mb-6 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
              <img src={activeAd.imageUrl} alt={activeAd.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-800 mb-3">{activeAd.title}</h3>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{activeAd.message}</p>
          
          <button 
            onClick={handleDismiss}
            className="mt-8 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
