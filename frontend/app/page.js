'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import WebcamCapture from '@/components/WebcamCapture';
import API_BASE_URL from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils'; // Imported utilities
import {
  HomeIcon, CameraIcon, CalendarIcon, LogsIcon, UsersIcon, SettingsIcon,
  CheckCircleIcon, MonitorIcon, BellIcon,
  VideoIcon, UploadIcon, DownloadIcon, TrashIcon, FileIcon,
  CloseIcon, MenuIcon, ConstructionIcon
} from '@/lib/icons';

// Imported Components
import StatCard from '@/components/StatCard';
import CircularProgress from '@/components/CircularProgress';
import SystemStatusCard from '@/components/SystemStatusCard';
import AttendanceTable from '@/components/AttendanceTable';
import LogItem from '@/components/LogItem';
import StudentManagementTab from '@/components/StudentManagementTab';

// --- SVG ICONS (Local mapping for convenience in TABS and Props) ---
const Icons = {
  // Sidebar icons
  home: <HomeIcon />,
  camera: <CameraIcon size="sm" />,
  calendar: <CalendarIcon size="sm" />,
  logs: <LogsIcon />,
  users: <UsersIcon size="sm" />,
  settings: <SettingsIcon />,
  // Stat card icons
  usersLg: <UsersIcon size="lg" strokeColor="white" />,
  checkLg: <CheckCircleIcon />,
  monitorLg: <MonitorIcon />,
  bellLg: <BellIcon />,
  // Action icons
  videoLg: <VideoIcon />,
  uploadLg: <UploadIcon />,
  calendarLg: <CalendarIcon size="md" />,
  trashLg: <TrashIcon />,
  downloadLg: <DownloadIcon />,
  fileLg: <FileIcon />,
  constructionLg: <ConstructionIcon />,
  cameraLg: <CameraIcon size="md" />,
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Icons.home },
  { id: 'live', label: 'Live Attendance', icon: Icons.camera },
  { id: 'today', label: "Today's Attendance", icon: Icons.calendar },
  { id: 'logs', label: 'Attendance Logs', icon: Icons.logs },
  { id: 'students', label: 'Student Mgmt', icon: Icons.users },
  { id: 'settings', label: 'Settings', icon: Icons.settings },
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
  const [logsFilter, setLogsFilter] = useState('today'); // 'today', '7days', 'all'
  const [searchQuery, setSearchQuery] = useState('');

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

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);


  // --- DATA FETCHING ---
  const fetchDashboardData = async () => {
    try {
      // 1. Fetch System Status & Stats
      try {
        const resStatus = await fetch(`${API_BASE_URL}/system/status`);
        const resStats = await fetch(`${API_BASE_URL}/stats`);
        if (resStatus.ok) {
          setStats(prev => ({ ...prev, system_status: 'Online' }));
          if (resStats.ok) {
            const statsData = await resStats.json();
            setStats(prev => ({ ...prev, total_students: statsData.total_students }));
          }
        } else {
          setStats(prev => ({ ...prev, system_status: 'Offline' }));
        }
      } catch { setStats(prev => ({ ...prev, system_status: 'Offline' })); }

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

  // Fetch on tab switch - Only when authenticated
  useEffect(() => {
    // Don't fetch until auth is complete and user is logged in
    if (loading || !user) return;

    fetchDashboardData();
  }, [activeTab, loading, user]);


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
      todayLogs.map(log => `${log.Name},${formatDate(log.Date)},${formatTime(log.Time)}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const clearTodayAttendance = async () => {
    if (!confirm('Are you sure you want to clear today\'s attendance? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/clear/today`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        alert(`Success: ${data.message}`);
        fetchDashboardData();
      } else {
        alert('Error: Server error - Could not clear attendance');
      }
    } catch (e) {
      alert('Error: Failed to clear attendance - Network error');
    }
  };

  // Filter logs based on selected filter
  const getFilteredLogs = () => {
    let logs = [...allLogs].reverse();
    const today = new Date();

    if (logsFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      logs = logs.filter(log => log.Date === todayStr);
    } else if (logsFilter === '7days') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      logs = logs.filter(log => {
        const logDate = new Date(log.Date);
        return logDate >= weekAgo;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      logs = logs.filter(log =>
        log.Name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return logs;
  };



  if (loading || !user) return null;

  // --- RENDER CONTENT BASED ON TAB ---
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in">
            <StatCard label="Total Students" value={stats.total_students} icon={Icons.usersLg} />
            <StatCard label="Present Today" value={stats.present} icon={Icons.checkLg} />
            <CircularProgress percentage={stats.total_students > 0 ? Math.min(100, (stats.present / stats.total_students) * 100) : 0} label="Attendance" />
            <SystemStatusCard status={stats.system_status} />

            <div className="col-span-full md:col-span-2 glass-panel p-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/[0.12] border border-white/[0.12] rounded-[11px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                    {Icons.bellLg}
                  </div>
                  <h3 className="text-base font-semibold m-0">Recent Activity</h3>
                </div>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-sm font-medium text-violet-300 hover:text-white px-4 py-1.5 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                  }}
                >
                  View All
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {[...todayLogs].reverse().slice(0, 5).map((log, i) => (
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
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/[0.12] border border-white/[0.15] rounded-[12px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                {Icons.cameraLg}
              </div>
              <h2 className="m-0">Live Attendance Station</h2>
            </div>
            <p className="text-secondary mb-8">Take a photo or upload an image to mark attendance instantly.</p>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button onClick={() => setShowWebcam(true)} className="btn btn-primary justify-center flex items-center gap-2">
                {Icons.videoLg} Start Camera
              </button>
              <span className="text-xs text-secondary text-center">- OR -</span>
              <label className="btn btn-secondary justify-center cursor-pointer flex items-center gap-2">
                {Icons.uploadLg} Upload Photo
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
                <p className="font-bold text-lg text-blue-400">Processing: {uploadStatus}</p>
              </div>
            )}

            {!isUploading && scanResult && (
              <div className="mt-8 flex flex-col gap-4">
                {scanResult.faces.map((face, idx) => (
                  <div key={idx} className={`p-6 rounded-xl border flex flex-col items-center gap-2 ${face.status === 'present' || face.status === 'marked'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                    }`}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                      backgroundColor: face.status === 'present' || face.status === 'marked' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${face.status === 'present' || face.status === 'marked' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      {face.status === 'present' || face.status === 'marked' ? (
                        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-green-400 fill-none" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-red-400 fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                    </div>
                    <h3 className="text-xl font-bold">{face.name}</h3>
                    <p className={`text-sm font-medium ${face.status === 'present' || face.status === 'marked' ? 'text-green-400' : 'text-red-400'}`}>
                      {face.message}
                    </p>
                    {face.distance !== undefined && (
                      <p className="text-xs text-secondary">Confidence: {(100 - face.distance * 100).toFixed(1)}%</p>
                    )}
                    {(face.status === 'present' || face.status === 'marked') && <p className="text-xs text-secondary mt-2 flex items-center gap-1 justify-center"><svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Attendance Recorded</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'today':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/[0.12] border border-white/[0.12] rounded-[11px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                  {Icons.calendarLg}
                </div>
                <h2 className="m-0">Today's Attendance</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={clearTodayAttendance} className="btn text-sm px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-lg flex items-center gap-2">
                  {Icons.trashLg} Clear
                </button>
                <button onClick={exportCSV} className="btn btn-secondary text-sm flex items-center gap-2">{Icons.downloadLg} Export CSV</button>
              </div>
            </div>
            <AttendanceTable data={[...todayLogs].reverse()} />
          </div>
        );

      case 'logs':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/[0.12] border border-white/[0.12] rounded-[11px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                  {Icons.fileLg}
                </div>
                <h2 className="m-0">Attendance Logs</h2>
              </div>
              <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={logsFilter}
                    onChange={(e) => setLogsFilter(e.target.value)}
                    className="appearance-none bg-white/[0.08] border border-violet-500/30 rounded-lg px-4 py-2.5 pr-10 text-sm text-white/90 cursor-pointer transition-all hover:bg-white/[0.12] hover:border-violet-400/40 focus:outline-none focus:border-violet-400/50"
                    style={{
                      backdropFilter: 'blur(12px)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    <option value="today" className="bg-[#1a1625] text-white">Today</option>
                    <option value="7days" className="bg-[#1a1625] text-white">Past 7 Days</option>
                    <option value="all" className="bg-[#1a1625] text-white">All Time</option>
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {/* Search Input - Responsive */}
                <div className="relative flex-1 sm:flex-none">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-44 bg-white/[0.08] border border-violet-500/30 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white/90 placeholder:text-white/40 transition-all hover:bg-white/[0.12] hover:border-violet-400/40 focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.12]"
                    style={{
                      backdropFilter: 'blur(12px)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>
            </div>
            <AttendanceTable data={getFilteredLogs()} />
          </div>
        );


      case 'students':
        return <StudentManagementTab />;

      default:
        return <div className="p-10 text-center text-secondary flex flex-col items-center gap-3">{Icons.constructionLg} Feature coming soon</div>;
    }
  };

  return (
    <main
      className="flex min-h-screen text-white font-sans"
      style={{
        background: '#0a0812',
        backgroundImage: `
          radial-gradient(ellipse at 10% 20%, rgba(102, 126, 234, 0.5), transparent 45%),
          radial-gradient(ellipse at 90% 30%, rgba(192, 38, 211, 0.35), transparent 45%),
          radial-gradient(ellipse at 50% 95%, rgba(139, 92, 246, 0.4), transparent 40%),
          radial-gradient(ellipse at 50% 50%, rgba(102, 126, 234, 0.1), transparent 70%)
        `
      }}
    >
      {showWebcam && <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />}

      {/* MOBILE HEADER - Glass Style */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-white/[0.06] backdrop-blur-[60px] saturate-[200%] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <img src="/attendx_logo.png" alt="AttendX" className="w-8 h-8 rounded-lg object-contain" />
          <h1 className="text-lg font-semibold">AttendX</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2"
        >
          {sidebarOpen ? <CloseIcon size="md" /> : <MenuIcon />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR - Deep Liquid Glass */}
      <aside className={`
        w-64 fixed h-full z-30 flex flex-col
        bg-white/[0.06] backdrop-blur-[60px] saturate-[200%]
        border-r border-white/[0.08]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `} style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05), 4px 0 24px rgba(0,0,0,0.15)' }}>
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img src="/attendx_logo.png" alt="AttendX" className="w-11 h-11 rounded-xl object-contain" />
            <div>
              <h1 className="text-xl font-semibold m-0 tracking-tight">AttendX</h1>
              <p className="text-xs text-white/50 mt-0.5">Smart Attendance v2.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[0.88rem] font-medium transition-all ${activeTab === tab.id
                ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                : 'text-white/60 hover:bg-white/[0.08] hover:text-white/95 border border-transparent'
                }`}
              style={activeTab === tab.id ? { boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.08)' } : {}}
            >
              {/* Glass icon container */}
              <div
                className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.1] flex items-center justify-center"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.08] border border-white/[0.1]"
            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 2px 12px rgba(0,0,0,0.1)' }}>
            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center font-bold text-purple-600">
              {user?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <button onClick={logout} className="text-xs text-white/40 hover:text-white/60 text-left">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto pt-24 md:pt-8">
        {/* Top Header - Welcome only on Overview */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-1">
          <div>
            <h2 className="text-lg md:text-xl font-semibold m-0">{TABS.find(t => t.id === activeTab)?.label}</h2>
            {activeTab === 'overview' && (
              <p className="text-xs md:text-sm text-secondary">Welcome back, Administrator.</p>
            )}
          </div>
        </header>

        {renderContent()}
      </div>
    </main >
  );
}
