
'use client';
import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { CameraIcon, CheckIcon, RefreshIcon, CloseIcon } from '@/lib/icons';


export default function WebcamCapture({ onCapture, onClose }) {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
            <div
                className="p-6 max-w-lg w-full relative rounded-[24px] bg-white/[0.08] border border-white/[0.15]"
                style={{
                    backdropFilter: 'blur(60px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(60px) saturate(200%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 16px 48px rgba(0,0,0,0.4)'
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.1] border border-white/[0.15] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition-all"
                    style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15)' }}
                >
                    <CloseIcon />
                </button>

                <h2 className="text-xl font-bold mb-4 text-center text-white">Capture Live Photo</h2>

                <div
                    className="rounded-xl overflow-hidden bg-black aspect-video mb-5 relative border border-white/[0.12]"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    {imgSrc ? (
                        <img src={imgSrc} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="flex justify-center gap-3">
                    {!imgSrc ? (
                        <button
                            onClick={capture}
                            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.9))',
                                border: '1px solid rgba(168, 85, 247, 0.5)',
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 4px 16px rgba(139, 92, 246, 0.4)'
                            }}
                        >
                            <CameraIcon size="md" /> Capture Photo
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setImgSrc(null)}
                                className="flex-1 py-3.5 px-5 rounded-xl font-semibold text-white/90 flex items-center justify-center gap-2 transition-all duration-200 hover:bg-white/[0.12]"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                                }}
                            >
                                <RefreshIcon /> Retake
                            </button>
                            <button
                                onClick={confirmUpload}
                                className="flex-1 py-3.5 px-5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(34, 197, 94, 0.9))',
                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 4px 16px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                <CheckIcon size="md" /> Upload & Process
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
