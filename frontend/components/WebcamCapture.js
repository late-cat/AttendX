
'use client';
import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="glass-panel p-6 max-w-lg w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400">✕</button>

                <h2 className="text-xl font-bold mb-4 text-center">Capture Live Photo</h2>

                <div className="rounded-xl overflow-hidden bg-black aspect-video mb-4 relative border border-glass-border">
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

                <div className="flex justify-center gap-4">
                    {!imgSrc ? (
                        <button onClick={capture} className="btn btn-primary w-full">
                            📸 Capture
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setImgSrc(null)} className="btn btn-secondary flex-1">
                                Retake
                            </button>
                            <button onClick={confirmUpload} className="btn btn-primary flex-1">
                                ✅ Upload & Process
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
