// এলিমেন্টসমূহ সিলেক্ট করা
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');

const brushSizeInput = document.getElementById('brushSize');
const colorBtns = document.querySelectorAll('.color-btn');
const eraserBtn = document.getElementById('eraserBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

// স্টেট ভ্যারিয়েবলসমূহ
let currentColor = '#000000';
let currentBrushSize = 5;
let isEraser = false;
let lastX = null;
let lastY = null;

// ক্যানভাসের সাইজ উইন্ডোজের সাথে রিসাইজ করার ফাংশন
function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// কালার পরিবর্তন করার লজিক
colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        colorBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentColor = e.target.getAttribute('data-color');
        isEraser = false;
        eraserBtn.classList.remove('active');
    });
});

// ব্রাশ সাইজ আপডেট
brushSizeInput.addEventListener('input', (e) => {
    currentBrushSize = e.target.value;
});

// ইরেজার মোড ট্রিগার
eraserBtn.addEventListener('click', () => {
    isEraser = !isEraser;
    eraserBtn.classList.toggle('active', isEraser);
});

// ক্লিয়ার ক্যানভাস
clearBtn.addEventListener('click', () => {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
});

// ড্রয়িং সেভ করা (PNG)
saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'air-draw-masterpiece.png';
    link.href = canvasElement.toDataURL();
    link.click();
});

// --- MediaPipe Hands সেটআপ ---

function onResults(results) {
    // ক্যানভাস সাইজ ঠিক রাখা
    if (canvasElement.width !== canvasElement.clientWidth || canvasElement.height !== canvasElement.clientHeight) {
        resizeCanvas();
    }

    // প্রতি ফ্রেমে ক্যানভাস পরিষ্কার না করে আগের আঁকা ধরে রাখার জন্য 
    // আমরা শুধু হ্যান্ড ট্র্যাকিং এবং ড্রয়িং লজিক এখানে চালাব।
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]; // প্রথম হাতটি ট্র্যাক করা হচ্ছে

        // তর্জনীর ডগা (Index Finger Tip) হলো ল্যান্ডমার্ক ইনডেক্স ৮
        const indexFingerTip = landmarks[8];
        const thumbTip = landmarks[4]; // বৃদ্ধাঙ্গুলি (ইন্টারেকশন চেক করার জন্য)

        // ক্যানভাসের পিক্সেল মাপে রূপান্তর
        const x = indexFingerTip.x * canvasElement.width;
        const y = indexFingerTip.y * canvasElement.height;

        // এখানে আমরা অঙ্গভঙ্গি যাচাই করে ড্রয়িং লজিক লিখব (ধাপ ৫)
        handleDrawing(x, y, landmarks);
    } else {
        // হাত স্ক্রিনে না থাকলে আগের পজিশন রিসেট করা
        lastX = null;
        lastY = null;
    }
}

// বেসিক ড্রয়িং লজিক ফাংশন (ধাপ ৫ এর প্রস্তুতি)
function handleDrawing(x, y, landmarks) {
    // উদাহরণস্বরূপ: তর্জনী ও বৃদ্ধাঙ্গুলির দূরত্ব মেপে ড্রয়িং কন্ট্রোল করা যেতে পারে
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    // পিন্চ বা চিমটি কাটা দূরত্ব বের করা (ড্র করার শর্ত হিসেবে ব্যবহার করতে পারেন)
    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

    // যদি দূরত্ব কম হয় (পিন্চ করে ধরে রাখা), তবে আঁকবে
    if (distance < 0.05) { 
        if (lastX === null || lastY === null) {
            lastX = x;
            lastY = y;
        }

        canvasCtx.beginPath();
        canvasCtx.moveTo(lastX, lastY);
        canvasCtx.lineTo(x, y);
        canvasCtx.strokeStyle = isEraser ? '#000000' : currentColor; // ইরেজার হলে ব্যাকগ্রাউন্ড কালার বা ক্লিয়ার করবে
        canvasCtx.lineWidth = currentBrushSize;
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
        
        if (isEraser) {
            canvasCtx.globalCompositeOperation = 'destination-out'; // মোছার জন্য
        } else {
            canvasCtx.globalCompositeOperation = 'source-over'; // সাধারণ আঁকার জন্য
        }
        
        canvasCtx.stroke();

        lastX = x;
        lastY = y;
    } else {
        // হাত তুললে বা পিন্চ না করলে ড্রয়িং লাইন ব্রেক হবে
        lastX = null;
        lastY = null;
    }
}

// MediaPipe Hands অবজেক্ট ডিক্লেয়ার ও কনফিগারেশন
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// ওয়েবক্যাম চালু করা
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});

camera.start();