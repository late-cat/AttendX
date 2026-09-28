'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import WebcamCapture from '@/components/WebcamCapture';
import API_BASE_URL from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils'; // Imported utilities
import { db, doc, onSnapshot } from '@/lib/firebase'; // For sync version listener
import {
  HomeIcon, CameraIcon, CalendarIcon, LogsIcon, UsersIcon, SettingsIcon,
  CheckCircleIcon, MonitorIcon, BellIcon,
  VideoIcon, UploadIcon, DownloadIcon, TrashIcon, FileIcon,
  CloseIcon, MenuIcon, ConstructionIcon, InfoIcon
} from '@/lib/icons';

// Imported Components
import StatCard from '@/components/StatCard';
import CircularProgress from '@/components/CircularProgress';
import SystemStatusCard from '@/components/SystemStatusCard';
import AttendanceTable from '@/components/AttendanceTable';
import LogItem from '@/components/LogItem';
import StudentManagementTab from '@/components/StudentManagementTab';
import TeacherManagementTab from '@/components/TeacherManagementTab';
import SyncStatusBanner from '@/components/SyncStatusBanner';
import AboutTab from '@/components/AboutTab';

// --- SVG ICONS (Local mapping for convenience in TABS and Props) ---
const Icons = {
  // Sidebar icons
  home: <HomeIcon />,
  camera: <CameraIcon size="sm" />,
  calendar: <CalendarIcon size="sm" />,
  logs: <LogsIcon />,
  users: <UsersIcon size="sm" />,
  settings: <SettingsIcon />,
  info: <InfoIcon />,
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
  { id: 'teachers', label: 'Teacher Mgmt', icon: Icons.users },
  { id: 'teacher_checkin', label: 'Teacher Check-in', icon: Icons.users },
  { id: 'settings', label: 'Settings', icon: Icons.settings },
  { id: 'about', label: 'About', icon: Icons.info },
];

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [stats, setStats] = useState({ present: 0, total_students: 0, system_status: 'Checking...' });
  const [todayLogs, setTodayLogs] = useState([]);
  const [teacherTodayLogs, setTeacherTodayLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [teacherAllLogs, setTeacherAllLogs] = useState([]);
  const [logsViewType, setLogsViewType] = useState('students'); // 'students' | 'teachers'
  const [logsFilter, setLogsFilter] = useState('today'); // 'today', '7days', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterSection, setFilterSection] = useState('All');

  // Cache state - tracks what data has been loaded and when
  const [cache, setCache] = useState({
    overview: { loaded: false, timestamp: null },
    logs: { loaded: false, filter: null, timestamp: null },
  });
  const CACHE_DURATION = 60 * 1000; // 60 seconds (was 30s)

  // Sync state - for real-time updates across devices
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'new-updates'
  const localVersionRef = useRef(0); // Track version without causing re-renders

  // Upload/Live State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showWebcam, setShowWebcam] = useState(false);
  const [captureMode, setCaptureMode] = useState('student'); // 'student' | 'teacher'
  const [scanResult, setScanResult] = useState(null); // { status: 'success'|'error', faces: [...] }
  const [imagePreview, setImagePreview] = useState(null);

  // Contextual Attendance & Review State
  const [sessionClass, setSessionClass] = useState("");
  const [sessionSection, setSessionSection] = useState("");
  const [sessionSubject, setSessionSubject] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [missingStudents, setMissingStudents] = useState([]);
  const [manualOverrides, setManualOverrides] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // URL Routing for Tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && TABS.find(t => t.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `?tab=${tabId}`);
    }
    setSidebarOpen(false);
  };

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // --- SYNC VERSION LISTENER (Real-time updates across devices) ---
  useEffect(() => {
    if (!user) return;

    // Listen to the sync version document in Firestore
    const unsubscribe = onSnapshot(
      doc(db, 'metadata', 'sync'),
      (docSnap) => {
        if (docSnap.exists()) {
          const newVersion = docSnap.data()?.version || 0;

          // If we have a previous version and it changed, show update banner
          if (localVersionRef.current > 0 && newVersion > localVersionRef.current) {
            console.log(`🔔 Sync version changed: ${localVersionRef.current} → ${newVersion}`);
            setSyncStatus('new-updates');
          }

          localVersionRef.current = newVersion;
        }
      },
      (error) => {
        console.error('Sync listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- CACHE HELPERS ---
  const isCacheValid = (cacheEntry) => {
    if (!cacheEntry?.loaded || !cacheEntry?.timestamp) return false;
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  };

  const invalidateCache = () => {
    setCache({
      overview: { loaded: false, timestamp: null },
      logs: { loaded: false, filter: null, timestamp: null },
    });
  };

  // Handle manual refresh (when user clicks "New updates available")
  const handleSyncRefresh = async () => {
    setSyncStatus('syncing');
    invalidateCache();

    // Refresh data based on current tab
    switch (activeTab) {
      case 'overview':
      case 'today':
        await fetchOverviewData(true);
        break;
      case 'logs':
        await fetchLogsData(logsFilter, true);
        break;
      default:
        // For other tabs, just refresh overview (affects stats)
        await fetchOverviewData(true);
    }

    setSyncStatus('synced');
  };

  // --- DATA FETCHING (Lazy Loading) ---
  const fetchOverviewData = async (force = false) => {
    // Skip if cache is valid and not forcing refresh
    if (!force && isCacheValid(cache.overview)) {
      console.log('📦 Using cached overview data');
      return;
    }

    try {
      // System status
      const resStatus = await fetch(`${API_BASE_URL}/system/status`);
      setStats(prev => ({ ...prev, system_status: resStatus.ok ? 'Online' : 'Offline' }));

      // Stats (student count)
      if (resStatus.ok) {
        const resStats = await fetch(`${API_BASE_URL}/stats`);
        if (resStats.ok) {
          const statsData = await resStats.json();
          setStats(prev => ({ ...prev, total_students: statsData.total_students }));
        }
      }

      // Today's student attendance
      const resToday = await fetch(`${API_BASE_URL}/attendance/today`);
      const dataToday = await resToday.json();
      setTodayLogs(dataToday.logs || []);
      setStats(prev => ({ ...prev, present: dataToday.stats?.present || 0 }));

      // Today's teacher attendance
      const resTeacherToday = await fetch(`${API_BASE_URL}/attendance/teacher/today`);
      if (resTeacherToday.ok) {
        const dataTeacherToday = await resTeacherToday.json();
        setTeacherTodayLogs(dataTeacherToday.logs || []);
      }

      // Update cache
      setCache(prev => ({ ...prev, overview: { loaded: true, timestamp: Date.now() } }));
    } catch (e) {
      console.error("Overview fetch error:", e);
      setStats(prev => ({ ...prev, system_status: 'Offline' }));
    }
  };

  const fetchLogsData = async (filter, force = false) => {
    // Skip if cache is valid for this filter and not forcing refresh
    if (!force && cache.logs.loaded && cache.logs.filter === filter && isCacheValid(cache.logs)) {
      console.log(`📦 Using cached logs for filter: ${filter}`);
      return;
    }

    try {
      let url = `${API_BASE_URL}/attendance/logs`;

      // Build query based on filter - backend handles the filtering!
      if (filter === 'today') {
        // Use local date (IST), not UTC - toISOString() returns UTC which is wrong at midnight IST
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        url += `?date=${today}`;
      } else if (filter === '7days') {
        url += `?days=7`;
      } else {
        url += `?days=15`;  // 'all' = max 15 days
      }

      const res = await fetch(url);
      const data = await res.json();
      setAllLogs(data.logs || []);

      const tRes = await fetch(`${API_BASE_URL}/attendance/teacher/logs`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeacherAllLogs(tData.logs || []);
      }

      // Update cache
      setCache(prev => ({ ...prev, logs: { loaded: true, filter, timestamp: Date.now() } }));
    } catch (e) {
      console.error("Logs fetch error:", e);
    }
  };

  // --- TAB-SPECIFIC DATA LOADING ---
  useEffect(() => {
    if (loading || !user) return;

    // Load data based on which tab is active
    switch (activeTab) {
      case 'overview':
      case 'today':
        // Both tabs share today's data
        fetchOverviewData();
        break;
      case 'logs':
        // Fetch logs based on current filter
        fetchLogsData(logsFilter);
        break;
      // 'live', 'students', 'settings' don't need data from here
    }
  }, [activeTab, loading, user]);

  // Fetch all students for contextual attendance
  useEffect(() => {
    if (!loading && user) {
      fetch(`${API_BASE_URL}/students`).then(res => res.json()).then(data => {
        setAllStudents(data.students || []);
      }).catch(err => console.error("Failed to fetch students", err));
    }
  }, [loading, user]);

  // Re-fetch logs when filter changes (only if on logs tab)
  useEffect(() => {
    if (activeTab === 'logs' && !loading && user) {
      fetchLogsData(logsFilter);
    }
  }, [logsFilter]);


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

    if (captureMode === 'teacher') {
       processTeacherCheckIn(blob);
    } else {
       processImage(file);
    }
  };

  const processImage = async (file) => {
    setIsUploading(true);
    setUploadStatus("Analyzing...");
    setScanResult(null);

    try {
      if (!sessionClass || !sessionSection || !sessionSubject) {
         alert("Please enter Class, Section, and Subject first.");
         setIsUploading(false);
         return;
      }
        
      const formData = new FormData();
      formData.append('file', file);
      formData.append('save', 'false');

      const res = await fetch(`${API_BASE_URL}/recognize`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

      if (data.details && data.details.length > 0) {
        const detectedFaces = data.details.filter(d => d.status === 'detected' || d.status === 'present' || d.status === 'marked');
        
        setScanResult({
          status: detectedFaces.length > 0 ? 'success' : 'error',
          faces: data.details
        });
        
        if (detectedFaces.length > 0) {
           const detectedNames = detectedFaces.map(f => f.name);
           const classStudents = allStudents.filter(s => s.class_name == sessionClass && s.section == sessionSection);
           const missing = classStudents.filter(s => !detectedNames.includes(s.name));
           
           setMissingStudents(missing);
           setReviewMode(true);
        }
      } else {
        setScanResult({ status: 'error', faces: [{ name: 'Unknown', message: data.message || 'No face detected' }] });
      }
    } catch (e) {
      setScanResult({ status: 'error', faces: [{ name: 'Connection Error', message: "Check backend server" }] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizeAttendance = async () => {
     setIsUploading(true);
     setUploadStatus("Saving...");
     try {
        const detectedFaces = scanResult.faces.filter(f => f.status === 'detected' || f.status === 'present' || f.status === 'marked').map(f => f.name);
        
        const records = [
           ...detectedFaces.map(name => ({ name, source: "AI_Camera" })),
           ...manualOverrides.map(name => ({ name, source: "Manual_Override" }))
        ];
        
        if (records.length === 0) {
           alert("No students to mark present.");
           setIsUploading(false);
           return;
        }
        
        const res = await fetch(`${API_BASE_URL}/attendance/finalize`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               class_name: sessionClass,
               section: sessionSection,
               subject: sessionSubject,
               records
           })
        });
        
        if (res.ok) {
           setReviewMode(false);
           setScanResult(null);
           setImagePreview(null);
           setManualOverrides([]);
           alert("Attendance finalized successfully!");
           
           // Invalidate cache and refresh
           invalidateCache();
           localVersionRef.current += 1;
           setSyncStatus('syncing');
           setTimeout(async () => {
             await fetchOverviewData(true);
             setSyncStatus('synced');
           }, 1000);
        } else {
           alert("Error saving attendance.");
        }
     } catch (e) {
        console.error(e);
        alert("Failed to connect to server.");
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
        // Invalidate cache and refresh after clearing
        invalidateCache();
        fetchOverviewData(true);
      } else {
        alert('Error: Server error - Could not clear attendance');
      }
    } catch (e) {
      alert('Error: Failed to clear attendance - Network error');
    }
  };

  // Filter logs - date filtering is now done by backend, only search filtering here
  const getFilteredLogs = () => {
    if (logsViewType === 'teachers') {
      let logs = [...teacherAllLogs];
      if (searchQuery.trim()) {
        logs = logs.filter(log => log.Name?.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return logs;
    }

    let logs = [...allLogs];

    if (filterClass !== 'All') logs = logs.filter(log => log.Class == filterClass);
    if (filterSection !== 'All') logs = logs.filter(log => log.Section == filterSection);

    if (searchQuery.trim()) {
      logs = logs.filter(log =>
        log.Name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return logs;
  };
  
  const getFilteredTodayLogs = () => {
    if (logsViewType === 'teachers') return [...teacherTodayLogs];
    
    let logs = [...todayLogs];
    
    if (filterClass !== 'All') logs = logs.filter(log => log.Class == filterClass);
    if (filterSection !== 'All') logs = logs.filter(log => log.Section == filterSection);

    return logs.reverse();
  };



  const processTeacherCheckIn = (blob) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(blob); 
    reader.onloadend = () => {
        const base64data = reader.result;
        
        setIsUploading(true);
        setUploadStatus("Getting location...");
        
        navigator.geolocation.getCurrentPosition(async (position) => {
           try {
              setUploadStatus("Verifying identity & location...");
              const res = await fetch(`${API_BASE_URL}/attendance/teacher/check-in`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    teacher_id: user?.email || "Unknown_Teacher",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    image: base64data
                 })
              });
              
              const data = await res.json();
              if (res.ok) {
                 alert(data.message);
                 setImagePreview(null);
              } else {
                 alert(data.detail || "Check-in failed.");
              }
           } catch (err) {
              console.error(err);
              alert("Network error.");
           } finally {
              setIsUploading(false);
           }
        }, (error) => {
           alert(`Error getting location: ${error.message}`);
           setIsUploading(false);
        }, {
           enableHighAccuracy: true,
           timeout: 5000,
           maximumAge: 0
        });
    }
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
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                    {Icons.bellLg}
                  </div>
                  <h3 className="text-base font-semibold m-0">Recent Activity</h3>
                </div>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
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
        if (reviewMode) {
           return (
              <div className="glass-panel p-8 text-center animate-in max-w-4xl mx-auto">
                 <h2 className="m-0 mb-6 text-2xl font-bold">Review Attendance</h2>
                 <p className="text-secondary mb-8">Please verify the detected students and manually add any missed students.</p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {/* Detected Students Column */}
                    <div className="bg-white/5 border border-glass-border rounded-xl p-6">
                       <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                          <CheckCircleIcon /> Detected as Present ({scanResult.faces.filter(f => f.status === 'detected' || f.status === 'present' || f.status === 'marked').length})
                       </h3>
                       <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
                          {scanResult.faces.filter(f => f.status === 'detected' || f.status === 'present' || f.status === 'marked').map((face, idx) => (
                             <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <span className="font-medium">{face.name}</span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">AI Detected</span>
                             </div>
                          ))}
                          {scanResult.faces.filter(f => f.status === 'detected' || f.status === 'present' || f.status === 'marked').length === 0 && (
                             <p className="text-secondary text-sm">No students detected.</p>
                          )}
                       </div>
                    </div>
                    
                    {/* Missing Students Column */}
                    <div className="bg-white/5 border border-glass-border rounded-xl p-6">
                       <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                          <CloseIcon /> Not Detected / Absent ({missingStudents.length})
                       </h3>
                       <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
                          {missingStudents.map((student, idx) => (
                             <label key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                                <span className="font-medium">{student.name}</span>
                                <input 
                                   type="checkbox" 
                                   className="w-5 h-5 rounded border-white/20 bg-black/20 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                   checked={manualOverrides.includes(student.name)}
                                   onChange={(e) => {
                                      if (e.target.checked) {
                                         setManualOverrides(prev => [...prev, student.name]);
                                      } else {
                                         setManualOverrides(prev => prev.filter(n => n !== student.name));
                                      }
                                   }}
                                />
                             </label>
                          ))}
                          {missingStudents.length === 0 && (
                             <p className="text-secondary text-sm">All students from this class are present!</p>
                          )}
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex justify-end gap-4">
                    <button 
                       onClick={() => { setReviewMode(false); setScanResult(null); setImagePreview(null); }}
                       className="btn btn-secondary px-6"
                       disabled={isUploading}
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={handleFinalizeAttendance}
                       className="btn btn-primary px-8"
                       disabled={isUploading}
                    >
                       {isUploading ? "Saving..." : "Finalize Attendance"}
                    </button>
                 </div>
              </div>
           );
        }

        return (
          <div className="glass-panel p-8 text-center animate-in max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                {Icons.cameraLg}
              </div>
              <h2 className="m-0">Live Attendance Station</h2>
            </div>
            <p className="text-secondary mb-8">Setup the session and take a photo to mark attendance.</p>
            
            <div className="grid grid-cols-3 gap-4 mb-8 text-left max-w-md mx-auto">
               <div className="relative">
                  <label className="block text-sm font-bold mb-2 text-slate-700">Class</label>
                  <select
                     value={sessionClass}
                     onChange={(e) => setSessionClass(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm cursor-pointer appearance-none"
                  >
                     <option value="" disabled>Select Class</option>
                     {[5, 6, 7, 8, 9, 10, 11, 12].map(c => (
                         <option key={c} value={c}>Class {c}</option>
                     ))}
                  </select>
                  <div className="absolute right-3 top-10 pointer-events-none text-slate-400">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
               </div>
               <div className="relative">
                  <label className="block text-sm font-bold mb-2 text-slate-700">Section</label>
                  <select
                     value={sessionSection}
                     onChange={(e) => setSessionSection(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm cursor-pointer appearance-none"
                  >
                     <option value="" disabled>Select Section</option>
                     {['A', 'B', 'C', 'D', 'E'].map(s => (
                         <option key={s} value={s}>Section {s}</option>
                     ))}
                  </select>
                  <div className="absolute right-3 top-10 pointer-events-none text-slate-400">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
               </div>
               <div className="relative">
                  <label className="block text-sm font-bold mb-2 text-slate-700">Subject</label>
                  <select
                     value={sessionSubject}
                     onChange={(e) => setSessionSubject(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm cursor-pointer appearance-none"
                  >
                     <option value="" disabled>Select Subject</option>
                     {['Math', 'English', 'Science', 'History', 'Geography', 'Computer Science', 'Physical Education', 'Arts'].map(sub => (
                         <option key={sub} value={sub}>{sub}</option>
                     ))}
                  </select>
                  <div className="absolute right-3 top-10 pointer-events-none text-slate-400">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button onClick={() => { setCaptureMode('student'); setShowWebcam(true); }} className="btn btn-primary justify-center flex items-center gap-2">
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
          </div>
        );

      case 'teacher_checkin':
        return (
           <div className="glass-panel p-8 text-center animate-in max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-2">
                 <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                    <UsersIcon size="lg" strokeColor="currentColor" />
                 </div>
                 <h2 className="m-0 text-2xl font-bold">Teacher Check-In</h2>
              </div>
              <p className="text-secondary mb-8">Verify your presence inside the school premises to log your attendance.</p>
              
              <div className="flex flex-col items-center gap-6">
                 <div className="p-6 bg-white/5 border border-glass-border rounded-xl max-w-md w-full">
                    <h3 className="font-semibold text-lg mb-2">Instructions</h3>
                    <ul className="text-sm text-secondary text-left list-disc list-inside">
                       <li>Ensure location services are enabled on your device.</li>
                       <li>You must be within 200 meters of the school premises.</li>
                       <li>Your check-in timestamp and location will be audited.</li>
                    </ul>
                 </div>
                 
                 <button 
                    onClick={() => { setCaptureMode('teacher'); setShowWebcam(true); }}
                    disabled={isUploading}
                    className="btn px-8 py-4 text-lg w-full max-w-sm flex items-center justify-center gap-3 bg-green-600 text-white rounded-2xl font-bold shadow-md hover:bg-green-700 transition-colors"
                 >
                    <CheckCircleIcon size="lg" />
                    {isUploading ? uploadStatus : "Check In Now (Face Scan)"}
                 </button>
              </div>
           </div>
        );

      case 'today':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                  {Icons.calendarLg}
                </div>
                <h2 className="m-0">Today's Attendance</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                 {/* Toggle View */}
                 <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                       onClick={() => setLogsViewType('students')} 
                       className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all ${logsViewType === 'students' ? 'bg-[var(--color-cotton-blue)] text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                       Students
                    </button>
                    <button 
                       onClick={() => setLogsViewType('teachers')} 
                       className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all ${logsViewType === 'teachers' ? 'bg-[var(--color-cotton-blue)] text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                       Teachers
                    </button>
                 </div>

                 {/* Filters (Students Only) */}
                 {logsViewType === 'students' && (
                     <>
                        <div className="relative">
                           <select
                              value={filterClass}
                              onChange={(e) => setFilterClass(e.target.value)}
                              className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 pr-8 text-sm text-slate-800 focus:outline-none shadow-sm cursor-pointer appearance-none"
                           >
                              <option value="All">All Classes</option>
                              {[5, 6, 7, 8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
                           </select>
                           <div className="absolute right-2.5 top-2 pointer-events-none text-slate-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                           </div>
                        </div>
                        <div className="relative">
                           <select
                              value={filterSection}
                              onChange={(e) => setFilterSection(e.target.value)}
                              className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 pr-8 text-sm text-slate-800 focus:outline-none shadow-sm cursor-pointer appearance-none"
                           >
                              <option value="All">All Sections</option>
                              {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>Section {s}</option>)}
                           </select>
                           <div className="absolute right-2.5 top-2 pointer-events-none text-slate-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                           </div>
                        </div>
                     </>
                 )}
                 
                <button onClick={clearTodayAttendance} className="btn text-sm px-3 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-2xl flex items-center gap-2 font-bold shadow-sm">
                  {Icons.trashLg} Clear
                </button>
                <button onClick={exportCSV} className="btn btn-secondary text-sm flex items-center gap-2 rounded-2xl">{Icons.downloadLg} Export CSV</button>
              </div>
            </div>
            <AttendanceTable data={getFilteredTodayLogs()} viewType={logsViewType} />
          </div>
        );

      case 'logs':
        return (
          <div className="glass-panel p-6 animate-in">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                  {Icons.fileLg}
                </div>
                <h2 className="m-0">Attendance Logs</h2>
              </div>
              <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                 {/* Toggle View */}
                 <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                       onClick={() => setLogsViewType('students')} 
                       className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all ${logsViewType === 'students' ? 'bg-[var(--color-cotton-blue)] text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                       Students
                    </button>
                    <button 
                       onClick={() => setLogsViewType('teachers')} 
                       className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all ${logsViewType === 'teachers' ? 'bg-[var(--color-cotton-blue)] text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                       Teachers
                    </button>
                 </div>
                 
                {/* Filter Dropdown Date */}
                <div className="relative">
                  <select
                    value={logsFilter}
                    onChange={(e) => setLogsFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2 pr-9 text-sm text-slate-800 cursor-pointer shadow-sm focus:outline-none appearance-none"
                  >
                    <option value="today">Today</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="all">All Time</option>
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>

                {/* Filter Dropdowns (Students Only) */}
                {logsViewType === 'students' && (
                    <>
                       <div className="relative">
                          <select
                             value={filterClass}
                             onChange={(e) => setFilterClass(e.target.value)}
                             className="bg-white border border-slate-200 rounded-2xl px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none shadow-sm cursor-pointer appearance-none"
                          >
                             <option value="All">All Classes</option>
                             {[5, 6, 7, 8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
                          </select>
                          <div className="absolute right-2.5 top-3 pointer-events-none text-slate-400">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                       </div>

                       <div className="relative">
                          <select
                             value={filterSection}
                             onChange={(e) => setFilterSection(e.target.value)}
                             className="bg-white border border-slate-200 rounded-2xl px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none shadow-sm cursor-pointer appearance-none"
                          >
                             <option value="All">All Sections</option>
                             {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>Section {s}</option>)}
                          </select>
                          <div className="absolute right-2.5 top-3 pointer-events-none text-slate-400">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                       </div>
                    </>
                )}

                {/* Search Input */}
                <div className="relative flex-1 sm:flex-none">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-44 bg-white border border-slate-200 rounded-2xl pl-10 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
            <AttendanceTable data={getFilteredLogs()} viewType={logsViewType} />
          </div>
        );


      case 'students':
        return <StudentManagementTab onDataChange={invalidateCache} />;

      case 'teachers':
        return <TeacherManagementTab onDataChange={invalidateCache} />;

      case 'about':
        return <AboutTab />;

      default:
        return <div className="p-10 text-center text-secondary flex flex-col items-center gap-3">{Icons.constructionLg} Feature coming soon</div>;
    }
  };

  return (
    <main
      className="flex min-h-screen font-sans"
    >
      {showWebcam && <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />}

      {/* MOBILE HEADER - Glass Style */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-[var(--color-cotton-lavender)] border-b border-slate-300/30 shadow-sm">
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

      {/* SIDEBAR - Soft Veil Navigation */}
      <aside className={`
        w-64 fixed h-full z-30 flex flex-col
        bg-[var(--color-cotton-lavender)] sidebar-paper
        border-r border-slate-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.03)]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-300/30 relative z-10">
          <div className="flex items-center gap-3">
            <img src="/attendx_logo.png" alt="AttendX" className="w-11 h-11 rounded-xl object-contain" />
            <div>
              <h1 className="text-xl font-semibold m-0 tracking-tight">AttendX</h1>
              <p className="text-xs text-slate-500 mt-0.5">Smart Attendance v2.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto relative z-10">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[0.95rem] font-bold transition-all ${activeTab === tab.id
                ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                : 'text-slate-500 hover:bg-white/40 hover:text-slate-800 border border-transparent'
                }`}
            >
              <div
                className={`w-[36px] h-[36px] rounded-[12px] flex items-center justify-center ${activeTab === tab.id ? 'bg-[var(--color-cotton-blue)] text-slate-800 border border-slate-200/50' : 'text-slate-400'}`}
              >
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-300/30 relative z-10">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 border border-white/50 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center font-bold text-purple-600">
              {user?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600 text-left">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto pt-24 md:pt-8">
        {/* Top Header - Welcome only on Overview */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8 gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-semibold m-0">{TABS.find(t => t.id === activeTab)?.label}</h2>
            {activeTab === 'overview' && (
              <p className="text-xs md:text-sm text-secondary">Welcome back, Administrator.</p>
            )}
          </div>
          {/* Sync Status Banner - Only on Overview where aggregated data matters */}
          {activeTab === 'overview' && (
            <SyncStatusBanner status={syncStatus} onRefresh={handleSyncRefresh} />
          )}
        </header>

        {renderContent()}
      </div>
    </main >
  );
}
