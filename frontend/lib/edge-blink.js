/*
 * Small, browser-only blink tracker for a single HTMLVideoElement.
 *
 * MediaPipe is initialized once from the self-hosted files under /blink. No
 * request is made while detect() is sampling a frame. This is a coaching and
 * presence signal, not spoof-proof liveness or identity verification.
 */

const DEFAULTS = {
    wasmPath: '/blink/wasm',
    modelPath: '/blink/models/face_landmarker.task',
    sampleHz: 12,
    openThreshold: 0.21,
    closedThreshold: 0.16,
    minClosedMs: 55,
    maxClosedMs: 700,
    minFaceWidth: 0.08,
};

// MediaPipe Face Mesh landmark indices. The points are ordered around each eye
// so EAR is stable even when the camera mirrors the displayed video.
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const average = (points) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

const isBenignMediaPipeLog = (args) => {
    const message = args.map((value) => String(value)).join(' ');
    return /created (?:tensorflow lite|.*delegate)/i.test(message) ||
        /info:\s*created/i.test(message);
};

// The WASM/TFLite bridge sometimes writes informational startup lines through
// console.error/console.warn. Next dev treats those as runtime failures.
const quiet = (original) => (...args) => {
    if (!isBenignMediaPipeLog(args)) original(...args);
};

if (typeof window !== 'undefined') {
    console.error = quiet(console.error);
    console.warn = quiet(console.warn);
    console.info = quiet(console.info);
    console.log = quiet(console.log);
}

function eyeAspectRatio(landmarks, indices) {
    const points = indices.map((index) => landmarks[index]).filter(Boolean);
    if (points.length !== 6) return null;
    return (distance(points[1], points[5]) + distance(points[2], points[4])) /
        (2 * Math.max(distance(points[0], points[3]), Number.EPSILON));
}

function eyePosition(landmarks, indices) {
    const points = indices.map((index) => landmarks[index]).filter(Boolean);
    return points.length === indices.length ? average(points) : null;
}

function faceBox(landmarks) {
    const visible = landmarks.filter(Boolean);
    if (!visible.length) return null;
    const xs = visible.map((point) => point.x);
    const ys = visible.map((point) => point.y);
    const x = clamp(Math.min(...xs));
    const y = clamp(Math.min(...ys));
    const right = clamp(Math.max(...xs));
    const bottom = clamp(Math.max(...ys));
    return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

function emptyResult(state = 'tracking_error', error = null) {
    return {
        state,
        blinkDetected: false,
        blink_detected: false,
        faceBox: null,
        face_box: null,
        eyePositions: [],
        eye_points: [],
        eyeAspectRatio: null,
        ear: null,
        videoWidth: 1280,
        videoHeight: 720,
        error,
        // Detection is deliberately not presented as spoof-proof liveness.
        spoofProof: false,
    };
}

/**
 * Create a tracker. Call `await tracker.init(video)` before `detect()`.
 *
 * @param {object} [options]
 * @param {number} [options.sampleHz=12] Target sampling rate (10-15 is ideal).
 * @param {(result: object) => void} [options.onResult] Optional per-detection callback.
 * @returns {{init(video: HTMLVideoElement): Promise<object>, detect(now?: number): object|null, close(): void}}
 */
export function createBlinkTracker(options = {}) {
    const config = { ...DEFAULTS, ...options };
    const lowSpec = options.lowSpec ?? (
        typeof navigator !== 'undefined' &&
        ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
            (navigator.deviceMemory && navigator.deviceMemory <= 4))
    );
    const sampleHz = clamp(Number(config.sampleHz) || 12, 10, 15);
    const intervalMs = 1000 / (lowSpec ? Math.min(sampleHz, 10) : sampleHz);

    let landmarker = null;
    let video = null;
    let initPromise = null;
    let closed = false;
    let lastTimestamp = -Infinity;
    let lastResult = emptyResult('align_face');
    // A blink must begin after an observed open state; this prevents a tracker
    // that starts while the subject's eyes are closed from false-triggering.
    let blinkPhase = 'unknown';
    let closedAt = 0;

    const resetBlink = (phase = 'open') => {
        blinkPhase = phase;
        closedAt = 0;
    };

    const init = async (videoElement) => {
        if (closed) throw new Error('Blink tracker is closed');
        if (!(videoElement instanceof HTMLVideoElement)) {
            throw new TypeError('createBlinkTracker.init() expects an HTMLVideoElement');
        }
        video = videoElement;
        if (landmarker) return tracker;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
            const fileset = await FilesetResolver.forVisionTasks(config.wasmPath);
            if (closed) return tracker;
            const taskOptions = {
                baseOptions: {
                    modelAssetPath: config.modelPath,
                    delegate: lowSpec ? 'CPU' : 'GPU',
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                minFaceDetectionConfidence: 0.55,
                minFacePresenceConfidence: 0.55,
                minTrackingConfidence: 0.5,
            };
            try {
                landmarker = await FaceLandmarker.createFromOptions(fileset, taskOptions);
            } catch (error) {
                // WebGL can be unavailable even on devices that are not
                // obviously low-spec. Retry once on CPU rather than failing
                // the camera flow altogether.
                if (lowSpec) throw error;
                landmarker = await FaceLandmarker.createFromOptions(fileset, {
                    ...taskOptions,
                    baseOptions: { ...taskOptions.baseOptions, delegate: 'CPU' },
                });
            }
            return tracker;
        })().catch((error) => {
            initPromise = null;
            lastResult = emptyResult('tracking_error', error instanceof Error ? error.message : String(error));
            throw error;
        });
        return initPromise;
    };

    const detect = (now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) => {
        if (closed || !landmarker || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
        if (now - lastTimestamp < intervalMs) return lastResult;
        lastTimestamp = now;

        try {
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result?.faceLandmarks?.[0];
            if (!landmarks) {
                resetBlink('unknown');
                lastResult = emptyResult('align_face');
                config.onResult?.(lastResult);
                return lastResult;
            }

            const box = faceBox(landmarks);
            const leftEye = eyePosition(landmarks, LEFT_EYE);
            const rightEye = eyePosition(landmarks, RIGHT_EYE);
            const leftEar = eyeAspectRatio(landmarks, LEFT_EYE);
            const rightEar = eyeAspectRatio(landmarks, RIGHT_EYE);
            const ear = leftEar !== null && rightEar !== null ? (leftEar + rightEar) / 2 : null;
            const eyePoints = [leftEye, rightEye].filter(Boolean);
            if (!box || box.w < config.minFaceWidth || !leftEye || !rightEye || ear === null) {
                resetBlink('unknown');
                lastResult = emptyResult('eyes_not_visible');
                lastResult.faceBox = box;
                lastResult.face_box = box;
                lastResult.eyePositions = eyePoints;
                lastResult.eye_points = eyePoints;
                config.onResult?.(lastResult);
                return lastResult;
            }

            const currentlyClosed = ear <= config.closedThreshold;
            const currentlyOpen = ear >= config.openThreshold;
            let state = currentlyClosed ? 'eyes_closed' : (currentlyOpen ? 'ready_to_blink' : 'monitoring');
            let didBlink = false;

            if (currentlyOpen && blinkPhase === 'unknown') {
                blinkPhase = 'open';
            } else if (currentlyClosed && blinkPhase === 'open') {
                blinkPhase = 'closed';
                closedAt = now;
            } else if (currentlyOpen && blinkPhase === 'closed') {
                const duration = now - closedAt;
                didBlink = duration >= config.minClosedMs && duration <= config.maxClosedMs;
                resetBlink();
                if (didBlink) state = 'blink_detected';
            } else if (blinkPhase === 'closed' && now - closedAt > config.maxClosedMs) {
                resetBlink('unknown');
            }

            lastResult = {
                state,
                blinkDetected: didBlink,
                blink_detected: didBlink,
                faceBox: box,
                face_box: box,
                eyePositions: eyePoints,
                eye_points: eyePoints,
                eyeAspectRatio: ear,
                ear,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                spoofProof: false,
                lowSpec,
            };
            config.onResult?.(lastResult);
            return lastResult;
        } catch (error) {
            lastResult = emptyResult('tracking_error', error instanceof Error ? error.message : String(error));
            config.onResult?.(lastResult);
            return lastResult;
        }
    };

    const close = () => {
        closed = true;
        video = null;
        blinkPhase = 'unknown';
        closedAt = 0;
        if (landmarker) {
            try {
                landmarker.close();
            } catch (e) {
                // Ignore cleanup errors
            }
            landmarker = null;
        }
        initPromise = null;
    };

    const tracker = { init, detect, close, get sampleIntervalMs() { return intervalMs; } };
    return tracker;
}

export default createBlinkTracker;

// Short alias for integrations that prefer a create/init/detect/close naming
// convention while keeping the descriptive export available.
export const create = createBlinkTracker;
