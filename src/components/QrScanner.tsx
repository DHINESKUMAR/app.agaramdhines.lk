import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'camera') {
      const scanner = new Html5Qrcode("qr-reader-custom");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scanner.isScanning) {
            scanner.stop().then(() => onScan(decodedText)).catch(console.error);
          }
        },
        (err) => {
          // Ignore continuous scanning errors
        }
      ).catch(err => {
        console.error("Camera start error:", err);
        setError("Camera access denied or not available. Please use 'Upload Image' instead.");
      });

      return () => {
        if (scanner.isScanning) {
          scanner.stop().catch(console.error);
        }
      };
    }
  }, [mode, onScan]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const scanner = new Html5Qrcode("qr-reader-custom-file");
      try {
        const decodedText = await scanner.scanFile(file, true);
        onScan(decodedText);
      } catch (err) {
        setError("Could not find a valid QR code in the image. Please try another one.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Scan QR Code</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'camera' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setMode('camera'); setError(''); }}
          >
            <Camera size={18} /> Camera
          </button>
          <button
            className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'file' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setMode('file'); setError(''); }}
          >
            <Upload size={18} /> Upload Image
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {mode === 'camera' && (
            <div className="rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center relative shadow-inner">
              <div id="qr-reader-custom" className="w-full h-full"></div>
              {/* Overlay scanning frame */}
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40"></div>
            </div>
          )}

          {mode === 'file' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} />
              </div>
              <p className="text-gray-700 font-medium mb-2 text-center px-4">Select an image containing a QR code</p>
              <p className="text-gray-500 text-sm mb-6 text-center px-4">Supports PNG, JPG, JPEG</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Choose Image
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div id="qr-reader-custom-file" className="hidden"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
