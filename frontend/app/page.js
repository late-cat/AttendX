'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import WebcamCapture from '@/components/WebcamCapture';
import API_BASE_URL from '@/lib/api';

// --- ICONS (Using Emojis for simplicity/hackathon speed) ---
const TABS = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'live', label: 'Live Attendance', icon: '📷' },
  { id: 'today', label: "Today's Attendance", icon: '🗓️' },
  { id: 'logs', label: 'Attendance Logs', icon: '🧾' },
  { id: 'students', label: 'Student Mgmt', icon: '👨‍🎓' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [stats, setStats] = useState({ present: 0, total_students: 0, system_status: 'Checking...' });
  const [todayLogs, setTodayLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);

  // Upload/Live State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showWebcam, setShowWebcam] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { status: 'success'|'error', faces: [...] }
  const [imagePreview, setImagePreview] = useState(null);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);


  // --- DATA FETCHING ---
  const fetchDashboardData = async () => {
    try {
      // 1. Fetch System Status & Stats
      try {
        const resStatus = await fetch(`${API_BASE_URL}/system/status`);
        const resStats = await fetch(`${API_BASE_URL}/stats`);
        if (resStatus.ok) {
          setStats(prev => ({ ...prev, system_status: 'Online 🟢' }));
          if (resStats.ok) {
            const statsData = await resStats.json();
            setStats(prev => ({ ...prev, total_students: statsData.total_students }));
          }
        } else {
          setStats(prev => ({ ...prev, system_status: 'Offline 🔴' }));
        }
      } catch { setStats(prev => ({ ...prev, system_status: 'Offline 🔴' })); }

      // 2. Fetch Today's Data
      const resToday = await fetch(`${API_BASE_URL}/attendance/today`);
      const dataToday = await resToday.json();
      setTodayLogs(dataToday.logs || []);
      setStats(prev => ({ ...prev, present: dataToday.stats?.present || 0 }));

      // 3. Fetch All Logs (only if on Logs tab to save bandwidth)
      if (activeTab === 'logs') {
        const resLogs = await fetch(`${API_BASE_URL}/attendance/logs`);
        const dataLogs = await resLogs.json();
        setAllLogs(dataLogs.logs || []);
      }

    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  };

  // Initial Fetch & Polling
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [activeTab]);


  // --- HANDLERS ---
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    processImage(file);
  };

  const handleWebcamCapture = (blob) => {
    setShowWebcam(false);
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    processImage(file);
  };

  const processImage = async (file) => {
    setIsUploading(true);
    setUploadStatus("Analyzing...");
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/recognize`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

      // Handle response with details array
      if (data.details && data.details.length > 0) {
        const hasSuccess = data.details.some(d => d.status === 'present' || d.status === 'marked');
        setScanResult({
          status: hasSuccess ? 'success' : 'error',
          faces: data.details
        });
        if (hasSuccess) setTimeout(() => fetchDashboardData(), 1000);
      } else {
        setScanResult({ status: 'error', faces: [{ name: 'Unknown', message: data.message || 'No face detected' }] });
      }
    } catch (e) {
      setScanResult({ status: 'error', faces: [{ name: 'Connection Error', message: "Check backend server" }] });
    } finally {
      setIsUploading(false);
    }
  };

  const exportCSV = () => {
    const csvContent = "Name,Date,Time\n" +
      todayLogs.map(log => `${log.Name},${log.Date},${log.Time}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };



  if (loading || !user) return null;

  // --- RENDER CONTENT BASED ON TAB ---
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in">
            <StatCard label="Total Students" value={stats.total_students} icon="👨‍🎓" color="blue" />
            <StatCard label="Present Today" value={stats.present} icon="✅" color="green" />
            <StatCard label="Attendance %" value={`${((stats.present / stats.total_students) * 100).toFixed(1)}%`} icon="📈" color="purple" />
            <StatCard label="System Status" value={stats.system_status} icon="🖥️" color="gray" />

            <div className="col-span-full md:col-span-2 glass-panel p-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3>📢 Recent Activity</h3>
                <button onClick={() => setActiveTab('logs')} className="text-sm text-blue-400">View All</button>
              </div>
              <div className="flex flex-col gap-3">
                {todayLogs.slice(0, 5).map((log, i) => (
                  <LogItem key={i} log={log} />
                ))}
                {todayLogs.length === 0 && <p className="text-secondary text-center">No activity today.</p>}
              </div>
            </div>
          </div>
        );

      case 'live':
        return (
          <div className="glass-panel p-8 text-center animate-in max-w-2xl mx-auto">
            <h2 className="mb-2">📷 Live Attendance Station</h2>
            <p className="text-secondary mb-8">Take a photo or upload an image to mark attendance instantly.</p>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button onClick={() => setShowWebcam(true)} className="btn btn-primary justify-center">
                🎥 Start Camera
              </button>
              <span className="text-xs text-secondary text-center">- OR -</span>
              <label className="btn btn-secondary justify-center cursor-pointer">
                📤 Upload Photo
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
            </div>

            {imagePreview && (
              <div className="mt-4 max-w-xs mx-auto">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-48 object-cover rounded-lg border border-glass-border"
                />
              </div>
            )}

            {isUploading && (
              <div className="mt-8 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20 animate-pulse">
                <p className="font-bold text-lg text-blue-400">🔍 {uploadStatus}</p>
              </div>
            )}

            {!isUploading && scanResult && (
              <div className="mt-8 flex flex-col gap-4">
                {scanResult.faces.map((face, idx) => (
                  <div key={idx} className={`p-6 rounded-xl border flex flex-col items-center gap-2 ${face.status === 'present' || face.status === 'marked'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                    }`}>
                    <div className={`text-4xl ${face.status === 'present' || face.status === 'marked' ? 'text-green-500' : 'text-red-500'}`}>
                      {face.status === 'present' || face.status === 'marked' ? '✅' : '❌'}
                    </div>
                    <h3 className="text-xl font-bold">{face.name}</h3>
                    <p className={`text-sm font-medium ${face.status === 'present' || face.status === 'marked' ? 'text-green-400' : 'text-red-400'}`}>
                      {face.message}
                    </p>
                    {face.distance !== undefined && (
                      <p className="text-xs text-secondary">Confidence: {(100 - face.distance * 100).toFixed(1)}%</p>
                    )}
                    {(face.status === 'present' || face.status === 'marked') && <p className="text-xs text-secondary mt-2">✓ Attendance Recorded</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'today':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex justify-between items-center mb-6">
              <h2>🗓️ Today's Attendance</h2>
              <button onClick={exportCSV} className="btn btn-secondary text-sm">📥 Export CSV</button>
            </div>
            <AttendanceTable data={todayLogs} />
          </div>
        );

      case 'logs':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex justify-between items-center mb-6">
              <h2>🧾 Full Attendance Logs</h2>
              <input type="text" placeholder="Search student..." className="bg-white/5 border border-glass-border rounded px-3 py-2 text-sm" />
            </div>
            <AttendanceTable data={allLogs} />
          </div>
        );


      case 'students':
        return <StudentManagementTab />;

      default:
        return <div className="p-10 text-center text-secondary">🚧 Feature coming soon</div>;
    }
  };

  return (
    <main className="flex min-h-screen bg-[var(--bg-dark)] text-white font-sans">
      {showWebcam && <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />}

      {/* MOBILE HEADER - Only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-sm border-b border-glass-border p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AttendX
        </h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-2xl p-2"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        w-64 border-r border-glass-border bg-black/90 backdrop-blur-sm flex flex-col fixed h-full z-30
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-glass-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent m-0">
            AttendX
          </h1>
          <p className="text-xs text-secondary mt-1">Smart Attendance v2.0</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-secondary hover:bg-white/5 hover:text-white'
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-glass-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-black border-2 border-white/20">
              {user?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 text-left">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto pt-20 md:pt-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-semibold m-0">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-xs md:text-sm text-secondary">Welcome back, Administrator.</p>
          </div>
        </header>

        {renderContent()}
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    gray: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  }[color] || "bg-white/5";

  return (
    <div className={`p-4 md:p-6 rounded-xl border ${colors} flex flex-col gap-2`}>
      <div className="text-2xl md:text-3xl">{icon}</div>
      <div>
        <p className="text-secondary text-xs md:text-sm font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl md:text-2xl font-bold break-words">{value}</p>
      </div>
    </div>
  );
}

function AttendanceTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-glass-border rounded-lg bg-white/5">
        <p className="text-secondary">No records found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-glass-border">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-secondary uppercase bg-white/5 font-medium">
          <tr>
            <th className="px-6 py-4">Student Name</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Time</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-glass-border bg-black/20">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-xs border border-blue-500/30">
                  {row.Name?.[0]}
                </div>
                {row.Name}
              </td>
              <td className="px-6 py-4 text-secondary">{row.Date}</td>
              <td className="px-6 py-4 font-mono text-secondary">{row.Time}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                  Present
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogItem({ log }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-transparent hover:border-glass-border transition-all">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
          {log.Name?.[0]}
        </div>
        <div>
          <p className="font-medium text-sm">{log.Name}</p>
          <p className="text-xs text-secondary">{log.Time}</p>
        </div>
      </div>
      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Verified</span>
    </div>
  );
}

function StudentManagementTab() {
  const [studentName, setStudentName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentName || selectedFiles.length === 0) {
      setMessage('❌ Please provide name and at least one image');
      return;
    }

    setIsRegistering(true);
    setMessage('🔄 Registering student...');

    try {
      const formData = new FormData();
      formData.append('name', studentName);
      selectedFiles.forEach(file => formData.append('files', file));

      const res = await fetch(`${API_BASE_URL}/register-student`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Registration failed');

      const data = await res.json();
      setMessage(`✅ ${data.message}`);
      setStudentName('');
      setSelectedFiles([]);
    } catch (e) {
      setMessage('❌ Registration failed. Check console for details.');
      console.error(e);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="glass-panel p-8 animate-in max-w-2xl mx-auto">
      <h2 className="mb-2">👨‍🎓 Register New Student</h2>
      <p className="text-secondary mb-8">Add student photos to enable face recognition</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Student Name</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded px-4 py-3 focus:outline-none focus:border-blue-500"
            placeholder="Enter full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload Photos (3-5 recommended)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full bg-white/5 border border-glass-border rounded px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            required
          />
          {selectedFiles.length > 0 && (
            <p className="text-sm text-secondary mt-2">{selectedFiles.length} file(s) selected</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isRegistering}
          className="btn btn-primary justify-center"
        >
          {isRegistering ? '⏳ Processing...' : '✓ Register Student'}
        </button>

        {message && (
          <div className="p-4 bg-white/5 rounded-lg border border-glass-border text-center">
            <p className="font-medium">{message}</p>
          </div>
        )}
      </form>
    </div>
  );
}
