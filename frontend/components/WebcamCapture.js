
'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraIcon, CheckIcon, RefreshIcon, CloseIcon } from '@/lib/icons';
import { createBlinkTracker } from '@/lib/edge-blink';

const FlipCameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4"/>
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
    </svg>
);

export default function WebcamCapture({ onCapture, onClose, locationStatus, locationMessage, livenessMode = false, livenessAction = 'check in' }) {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [queuedPhotos, setQueuedPhotos] = useState([]);
    const [retakePhotoId, setRetakePhotoId] = useState(null);
    const nextPhotoIdRef = useRef(1);
    const [cameraError, setCameraError] = useState('');
    const [livenessState, setLivenessState] = useState(livenessMode ? 'monitoring' : 'idle');
    const [trackingState, setTrackingState] = useState({ state: 'align_face', face_box: null, eye_points: [] });
    const [manualCapturePreview, setManualCapturePreview] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (rear)
    const [devices, setDevices] = useState([]);
    const blinkTrackerRef = useRef(null);
    const manualCaptureRef = useRef(null);
    const submissionStartedRef = useRef(false);
    const onCaptureRef = useRef(onCapture);

    onCaptureRef.current = onCapture;

    const handleDevices = useCallback(
        (mediaDevices) => setDevices(mediaDevices.filter(({ kind }) => kind === 'videoinput')),
        [setDevices]
    );

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    const convertFramesToBlobs = useCallback(async (sources) => Promise.all(sources.map(async source => {
        const res = await fetch(source);
        return res.blob();
    })), []);

    const capture = useCallback(async () => {
        if (!webcamRef.current) return;

        if (livenessMode) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;
            if (livenessState === 'tracking_error') {
                submissionStartedRef.current = true;
                setLivenessState('submitting');
                const [blob] = await convertFramesToBlobs([imageSrc]);
                onCaptureRef.current([blob], { livenessState: 'manual_fallback', blinkDetected: false });
                return;
            }
            manualCaptureRef.current = imageSrc;
            setManualCapturePreview(imageSrc);
            setLivenessState('waiting_blink');
            return;
        }

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const photoId = nextPhotoIdRef.current++;
        setQueuedPhotos(previous => {
            if (retakePhotoId !== null && previous.some(photo => photo.id === retakePhotoId)) {
                return previous.map(photo => photo.id === retakePhotoId ? { ...photo, src: imageSrc } : photo);
            }
            if (previous.length >= 3) return previous;
            return [...previous, { id: photoId, src: imageSrc }];
        });
        setRetakePhotoId(null);
    }, [livenessMode, retakePhotoId]);

    const confirmUpload = async () => {
        const sources = livenessMode
            ? (imgSrc ? [imgSrc] : [])
            : queuedPhotos.map(photo => photo.src);
        if (sources.length === 0) return;
        const blobs = await convertFramesToBlobs(sources);
        onCapture(blobs);
    };

    const removeQueuedPhoto = (id) => {
        setQueuedPhotos(previous => previous.filter(photo => photo.id !== id));
        if (retakePhotoId === id) setRetakePhotoId(null);
    };

    const selectRetake = (id) => {
        setRetakePhotoId(id);
        setCameraError('');
    };

    useEffect(() => {
        if (!livenessMode) return undefined;

        let cancelled = false;
        let timer = null;
        const start = async () => {
            try {
                const video = webcamRef.current?.video;
                if (!video) {
                    if (!cancelled) setTimeout(start, 120);
                    return;
                }
                const tracker = createBlinkTracker({ sampleHz: 12 });
                await tracker.init(video);
                if (cancelled) {
                    tracker.close();
                    return;
                }
                blinkTrackerRef.current = tracker;
                timer = setInterval(async () => {
                    if (cancelled || submissionStartedRef.current) return;
                    const result = tracker.detect();
                    if (!result) return;
                    setLivenessState(result.state || 'monitoring');
                    setTrackingState({
                        ...result,
                        face_box: result.faceBox || result.face_box,
                        eye_points: result.eyePositions || result.eye_points || [],
                    });
                    if (result.blinkDetected && !submissionStartedRef.current) {
                        submissionStartedRef.current = true;
                        setLivenessState('submitting');
                        const currentFrame = webcamRef.current?.getScreenshot();
                        if (!currentFrame) return;
                        const blobs = await convertFramesToBlobs([currentFrame]);
                        onCaptureRef.current(blobs, { livenessState: 'client_blink', blinkDetected: true });
                    }
                }, 80);
            } catch (error) {
                if (!cancelled) setLivenessState('tracking_error');
            }
        };
        start();
        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
            blinkTrackerRef.current?.close();
            blinkTrackerRef.current = null;
        };
    }, [convertFramesToBlobs, livenessMode]);

    const toggleCamera = () => {
        setCameraError('');
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const livenessMessage = {
        monitoring: `Blink to automatically ${livenessAction}.`,
        align_face: 'Please align your face',
        eyes_not_visible: 'Make sure your eyes are visible',
        ready_to_blink: 'Blink to verify',
        waiting_blink: 'Waiting for a natural blink...',
        blink_detected: 'Blink detected. Verifying identity and location...',
        submitting: 'Blink detected. Verifying identity and location...',
        tracking_error: 'Eye tracking unavailable — Capture manually to continue',
    }[livenessState] || `Blink to automatically ${livenessAction}.`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in p-2 sm:p-4">
            <div className="relative flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-xl sm:h-[calc(100dvh-2rem)] sm:rounded-[32px] sm:border-slate-200 sm:p-5">

                <button
                    onClick={onClose}
                    aria-label="Close camera"
                    className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 sm:right-5 sm:top-5"
                >
                    <CloseIcon />
                </button>

                <div className="flex shrink-0 flex-col items-center gap-2 p-3 pb-2 sm:mb-4 sm:p-0">
                    <h2 className="m-0 text-xl font-bold text-slate-800 sm:text-2xl">{livenessMode ? 'Live Presence Verification' : 'Capture Live Photo'}</h2>

                    {!livenessMode && <p className="m-0 text-center text-sm font-semibold text-slate-500">Add up to 3 photos</p>}

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

                <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-slate-900 rounded-t-3xl border-t border-slate-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:mb-4 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm">
                    {livenessMode && imgSrc ? (
                        <img src={imgSrc} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={0.78}
                                videoConstraints={{ facingMode }}
                                onUserMedia={() => setCameraError('')}
                                onUserMediaError={() => {
                                    setCameraError('This camera is unavailable. Try switching back or check browser permissions.');
                                    setFacingMode('user');
                                }}
                                className="w-full h-full object-cover"
                            />

                            <div className="pointer-events-none absolute inset-0">
                                {livenessMode && <>
                                    <div className="absolute inset-x-[18%] bottom-[16%] top-[16%] rounded-[32%] border-2 border-dashed border-amber-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]" />
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-semibold text-white">Keep your face inside the guide and blink naturally</div>
                                </>}
                                {livenessMode && trackingState.face_box && (
                                    <>
                                        <svg 
                                            viewBox={`0 0 ${trackingState.videoWidth || 1280} ${trackingState.videoHeight || 720}`} 
                                            preserveAspectRatio="xMidYMid slice" 
                                            className="absolute inset-0 z-10 h-full w-full pointer-events-none"
                                        >
                                            {(() => {
                                                if (!trackingState.eye_points || trackingState.eye_points.length === 0) return null;
                                                const center = trackingState.eye_points[0];
                                                
                                                const cx = center.x * (trackingState.videoWidth || 1280);
                                                const cy = center.y * (trackingState.videoHeight || 720);
                                                return (
                                                    <g className="transition-all duration-75">
                                                        <circle 
                                                            cx={cx} 
                                                            cy={cy} 
                                                            r="6" 
                                                            fill="none" 
                                                            stroke="rgba(255, 255, 255, 0.95)" 
                                                            strokeWidth="1.5" 
                                                            strokeDasharray="4 3" 
                                                            className="drop-shadow-sm"
                                                        />
                                                    </g>
                                                );
                                            })()}
                                        </svg>
                                        <span 
                                            className="absolute z-20 whitespace-nowrap rounded-full bg-slate-950/80 px-4 py-2 text-sm font-bold text-cyan-200 shadow-md backdrop-blur-md transition-all duration-150" 
                                            style={{ 
                                                left: `${(trackingState.face_box.x + trackingState.face_box.w / 2) * 100}%`, 
                                                top: `${(trackingState.face_box.y) * 100}%`,
                                                transform: 'translate(-50%, -150%)'
                                            }}
                                        >
                                            {livenessMessage}
                                        </span>
                                    </>
                                )}
                                {manualCapturePreview && livenessState === 'waiting_blink' && <img src={manualCapturePreview} alt="Captured reference" className="absolute right-3 top-3 h-16 w-24 rounded-lg border-2 border-amber-300 object-cover shadow-lg" />}
                            </div>
                        </>
                    )}
                    {!livenessMode && queuedPhotos.length > 0 && (
                        <div className="absolute bottom-24 left-3 right-3 flex items-end gap-2" aria-label="Queued classroom photos">
                            {queuedPhotos.map((photo, index) => (
                                <div key={photo.id} className="relative h-20 w-20 shrink-0 rounded-xl bg-slate-900/80 p-1 shadow-lg sm:h-24 sm:w-24">
                                    <button type="button" onClick={() => selectRetake(photo.id)} aria-label={`Retake photo ${index + 1}`} title="Tap to retake" className={`h-full w-full overflow-hidden rounded-lg border-2 ${retakePhotoId === photo.id ? 'border-amber-400 ring-2 ring-amber-300' : 'border-white/80'}`}>
                                        <img src={photo.src} alt={`Classroom photo ${index + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                    <button type="button" onClick={() => removeQueuedPhoto(photo.id)} aria-label={`Remove photo ${index + 1}`} title="Remove photo" className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-slate-900 text-lg leading-none text-white shadow-md hover:bg-rose-600">×</button>
                                </div>
                            ))}
                            {retakePhotoId !== null && <span className="rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white">Tap Retake Photo to replace</span>}
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-3 pb-3 pt-16 sm:px-5 sm:pb-5">
                        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 sm:gap-4">
                            <button
                                onClick={toggleCamera}
                                title="Switch Camera"
                                aria-label="Switch Camera"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:bg-white/30 hover:border-white active:scale-95"
                            >
                                <FlipCameraIcon />
                            </button>
                            <div className="flex min-w-0 flex-1 justify-center gap-2">
                                {livenessMode ? (
                                    livenessState === 'tracking_error' ? (
                                        <button
                                            onClick={capture}
                                            disabled={locationStatus === 'verifying'}
                                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/50 bg-white px-5 py-3.5 font-bold text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:bg-slate-50 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <CameraIcon size="md" /> Capture Manually
                                        </button>
                                    ) : null
                                ) : (
                                    <>
                                        {(queuedPhotos.length < 3 || retakePhotoId !== null) && (
                                            <button
                                                onClick={capture}
                                                disabled={locationStatus === 'verifying'}
                                                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/50 bg-white px-4 py-3.5 font-bold text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:bg-slate-50 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <CameraIcon size="md" /> {retakePhotoId !== null ? 'Retake Photo' : 'Add Photo'}
                                            </button>
                                        )}
                                        {queuedPhotos.length > 0 && (
                                            <button
                                                onClick={confirmUpload}
                                                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-500 px-4 py-3.5 font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all hover:bg-emerald-600 active:scale-[.98]"
                                            >
                                                <CheckIcon size="md" /> Process {queuedPhotos.length}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="h-12 w-12 shrink-0" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                {cameraError && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm font-semibold text-rose-700">{cameraError}</p>}

            </div>
        </div>
    );
}
