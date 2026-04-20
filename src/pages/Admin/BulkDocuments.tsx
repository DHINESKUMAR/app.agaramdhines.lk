import React, { useState, useEffect, useRef } from "react";
import { getStudents, getClasses } from "../../lib/db";
import { Printer, CheckSquare, Square, Search, Award, FileText, CreditCard, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function BulkDocuments() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const [printMode, setPrintMode] = useState<'idcard' | 'certificate' | null>(null);

  useEffect(() => {
    getStudents().then(data => setStudents(data || []));
    getClasses().then(data => setClasses(data || []));
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesGrade = selectedGrade ? s.grade === selectedGrade : true;
    const matchesSearch = searchQuery 
      ? s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.id?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesGrade && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handlePrint = (mode: 'idcard' | 'certificate') => {
    if (selectedIds.size === 0) {
      alert("Please select at least one student.");
      return;
    }
    setPrintMode(mode);
    setIsGenerating(true);
    
    // Give React time to render the hidden print area
    setTimeout(() => {
      const content = printRef.current;
      if (!content) {
        setIsGenerating(false);
        setPrintMode(null);
        return;
      }

      // Instead of window.open, use a hidden iframe to avoid popup blockers in Electron/Nativefier
      let printIframe = document.getElementById('bulk-print-iframe') as HTMLIFrameElement;
      if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'bulk-print-iframe';
        printIframe.style.position = 'absolute';
        printIframe.style.top = '-9999px';
        printIframe.style.left = '-9999px';
        printIframe.title = 'Print Frame';
        document.body.appendChild(printIframe);
      }

      const printDoc = printIframe.contentWindow?.document;
      
      if (printDoc) {
        printDoc.open();
        printDoc.write(`
          <html>
            <head>
              <title>Bulk Print ${mode === 'idcard' ? 'ID Cards' : 'Certificates'}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  .page-break { page-break-after: always; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .id-grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
                .cert-container { display: flex; flex-direction: column; align-items: center; gap: 40px; }
              </style>
            </head>
            <body class="p-8 bg-white">
              ${content.innerHTML}
            </body>
          </html>
        `);
        printDoc.close();
        
        // Wait for Tailwind scripts to inject styles before printing
        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setIsGenerating(false);
          setPrintMode(null);
        }, 1500);
      } else {
        setIsGenerating(false);
        setPrintMode(null);
        alert("Unable to generate print document. Please check your browser's security settings.");
      }
    }, 500);
  };

  const selectedStudentsData = students.filter(s => selectedIds.has(s.id));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bulk Document Generator</h1>
          <p className="text-gray-500 text-sm mt-1">Generate ID Cards and Certificates for multiple students</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => handlePrint('idcard')}
            disabled={selectedIds.size === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {isGenerating && printMode === 'idcard' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CreditCard size={18} />
            )}
            Generate ID Cards ({selectedIds.size})
          </button>
          <button
            onClick={() => handlePrint('certificate')}
            disabled={selectedIds.size === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {isGenerating && printMode === 'certificate' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileText size={18} />
            )}
            Generate Certificates ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="sm:w-64">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <button 
                    onClick={handleSelectAll}
                    className="flex items-center text-gray-500 hover:text-indigo-600"
                  >
                    {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(student.id) ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => toggleSelect(student.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {selectedIds.has(student.id) ? (
                        <CheckSquare size={20} className="text-indigo-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                          {student.image ? (
                            <img className="h-10 w-10 object-cover" src={student.image} alt="" />
                          ) : (
                            <span className="text-gray-500 font-medium text-lg">{student.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{student.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.phone || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No students found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef}>
          {printMode === 'idcard' && (
            <div className="id-grid">
              {selectedStudentsData.map(student => (
                <div key={student.id} className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-0 relative overflow-hidden text-white shadow-lg print:shadow-none break-inside-avoid shrink-0" style={{ pageBreakInside: 'avoid' }}>
                  {/* Background patterns */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

                  <div className="flex h-full">
                    {/* Left side - Photo & QR */}
                    <div className="w-[35%] bg-white/10 backdrop-blur-sm p-2 flex flex-col items-center justify-center border-r border-white/20">
                      <div className="w-14 h-14 bg-white rounded-full mb-2 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {student.image ? (
                          <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} className="text-indigo-600" />
                        )}
                      </div>
                      <div className="bg-white p-1 rounded shadow-sm">
                        <QRCodeSVG value={student.id} size={55} level="H" includeMargin={false} />
                      </div>
                    </div>

                    {/* Right side - Details */}
                    <div className="w-[65%] p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1 border-b border-white/20 pb-1">Agaram Academy</h3>
                        <h2 className="text-sm font-bold leading-tight mb-1 truncate">{student.name}</h2>
                        <div className="text-[9px] space-y-0.5 opacity-90">
                          <p>Grade: <span className="font-semibold">{student.grade}</span></p>
                          <p>Roll No: <span className="font-semibold">{student.rollNo || 'N/A'}</span></p>
                          <p>Phone: <span className="font-semibold">{student.phone || 'N/A'}</span></p>
                        </div>
                      </div>
                      
                      <div className="mt-auto bg-black/25 p-1.5 rounded text-[8px] font-mono leading-tight">
                        <p className="flex justify-between"><span>User:</span> <span className="font-bold">{student.username}</span></p>
                        <p className="flex justify-between"><span>Pass:</span> <span className="font-bold">{student.password}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {printMode === 'certificate' && (
            <div className="cert-container">
              {selectedStudentsData.map(student => (
                <div key={student.id} className="w-[11in] h-[8.5in] bg-white p-8 relative break-inside-avoid shrink-0" style={{ pageBreakInside: 'avoid' }}>
                  {/* Colorful Border */}
                  <div className="absolute inset-4 border-[12px] border-double border-indigo-900 rounded-2xl"></div>
                  <div className="absolute inset-8 border-2 border-yellow-500 rounded-xl opacity-50"></div>

                  {/* Background Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                    <Award size={500} />
                  </div>

                  <div className="relative h-full flex flex-col items-center justify-center text-center px-20">
                    <h1 className="text-6xl font-serif font-black text-indigo-900 mb-2 tracking-wide">Certificate of Excellence</h1>
                    <p className="text-2xl text-yellow-600 font-serif italic mb-12 font-semibold">Agaram Dhines Academy</p>

                    <p className="text-xl text-gray-600 mb-4 font-medium tracking-wide uppercase">This is proudly presented to</p>
                    <h2 className="text-5xl font-bold text-gray-900 mb-8 border-b-4 border-indigo-200 pb-4 inline-block px-12">{student.name}</h2>

                    <p className="text-2xl text-gray-700 mb-12 max-w-4xl leading-relaxed font-serif">
                      For outstanding academic performance and dedication in <span className="font-bold text-indigo-800">Grade {student.grade}</span>.
                      Your commitment to excellence is truly commendable.
                    </p>

                    <div className="flex justify-between items-end w-full mt-auto pt-10 px-10">
                      <div className="text-center">
                        <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                        <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Director</p>
                      </div>

                      {/* QR and Details */}
                      <div className="flex items-center gap-5 text-left bg-gray-50/80 p-5 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm z-10">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                          <QRCodeSVG value={student.id} size={90} level="H" includeMargin={false} />
                        </div>
                        <div className="text-sm text-gray-700 space-y-1.5 font-medium">
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Roll No:</span> {student.rollNo || 'N/A'}</p>
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Phone:</span> {student.phone || 'N/A'}</p>
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">User:</span> <span className="font-mono">{student.username}</span></p>
                          <p><span className="font-bold text-indigo-900 w-16 inline-block">Pass:</span> <span className="font-mono">{student.password}</span></p>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                        <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
