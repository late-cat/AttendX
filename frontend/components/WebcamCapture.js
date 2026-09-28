
'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraIcon, CheckIcon, RefreshIcon, CloseIcon } from '@/lib/icons';

// Adding a simple Flip Camera SVG icon inline
const FlipCameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4"/>
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
    </svg>
);

export default function WebcamCapture({ onCapture, onClose, locationStatus, locationMessage }) {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (rear)
    const [devices, setDevices] = useState([]);

    const handleDevices = useCallback(
        (mediaDevices) => setDevices(mediaDevices.filter(({ kind }) => kind === 'videoinput')),
        [setDevices]
    );

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
    }, [webcamRef]);

    const confirmUpload = async () => {
        if (!imgSrc) return;
        // Convert base64 to blob
        const res = await fetch(imgSrc);
        const blob = await res.blob();
        onCapture(blob); // Send back to parent
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? { exact: 'environment' } : 'user');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in p-4">
            <div className="p-6 md:p-8 max-w-4xl w-full relative rounded-[32px] bg-white border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                >
                    <CloseIcon />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 m-0 mb-2">Capture Live Photo</h2>
                    
                    {/* Location Status Indicator */}
                    {locationStatus && (
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                            locationStatus === 'verified' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                            locationStatus === 'verifying' ? 'bg-amber-50 border border-amber-100 text-amber-700 animate-pulse' :
                            'bg-red-50 border border-red-100 text-red-700'
                        }`}>
                            {locationStatus === 'verified' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            {locationStatus === 'verifying' && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                            {locationStatus === 'error' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                            <span>{locationMessage || (locationStatus === 'verifying' ? 'Verifying location...' : locationStatus === 'verified' ? 'Location Verified' : 'Location Error')}</span>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-video mb-6 relative border border-slate-200 shadow-sm w-full">
                    {imgSrc ? (
                        <img src={imgSrc} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode, width: 1280, height: 720 }}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="flex justify-between items-center gap-4">
                    {/* Camera Flip Button (Only show if not captured and has multiple cameras) */}
                    <div className="w-12 h-12 flex-shrink-0">
                        {!imgSrc && devices.length > 1 && (
                            <button
                                onClick={toggleCamera}
                                title="Flip Camera"
                                className="w-full h-full rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <FlipCameraIcon />
                            </button>
                        )}
                    </div>

                    <div className="flex justify-center gap-3 flex-1 max-w-sm">
                        {!imgSrc ? (
                            <button
                                onClick={capture}
                                disabled={locationStatus === 'verifying'}
                                className={`w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all duration-200 ${
                                    locationStatus === 'verifying' ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'btn-primary'
                                }`}
                            >
                                <CameraIcon size="md" /> Capture Photo
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setImgSrc(null)}
                                    className="flex-1 py-3.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 btn-secondary"
                                >
                                    <RefreshIcon /> Retake
                                </button>
                                <button
                                    onClick={confirmUpload}
                                    className="flex-1 py-3.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)]"
                                >
                                    <CheckIcon size="md" /> Process
                                </button>
                            </>
                        )}
                    </div>
                    
                    {/* Placeholder to balance the flip button on the left */}
                    <div className="w-12 h-12 flex-shrink-0"></div>
                </div>
            </div>
        </div>
    );
}
