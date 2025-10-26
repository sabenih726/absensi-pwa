import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const status = document.getElementById('status');
const regModal = document.getElementById('regModal');
const nameInput = document.getElementById('nameInput');
const registerBtn = document.getElementById('registerBtn');
const captureBtn = document.getElementById('captureBtn');
const closeRegBtn = document.getElementById('closeRegBtn');

let labeledDescriptors = [];
let faceMatcher = null;

// Voice Feedback
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  speechSynthesis.speak(utterance);
}

// Load Face API Models
async function loadModels() {
  const MODEL_URL = '/models';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  status.textContent = 'Model AI siap';
}

// Start Camera
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  video.srcObject = stream;
}

// Load Registered Faces
async function loadFaces() {
  const snapshot = await getDocs(collection(db, 'employees'));
  const users = [];
  snapshot.forEach(doc => users.push(doc.data()));
  
  labeledDescriptors = users.map(user => {
    const descriptors = user.descriptors.map(d => new Float32Array(d));
    return new faceapi.LabeledFaceDescriptors(user.name, descriptors);
  });
  
  if (labeledDescriptors.length > 0) {
    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  }
}

// Face Recognition Loop
video.addEventListener('play', () => {
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  faceapi.matchDimensions(canvas, displaySize);
  
  setInterval(async () => {
    if (!faceMatcher) return;
    
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    resizedDetections.forEach(detection => {
      const match = faceMatcher.findBestMatch(detection.descriptor);
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: match.toString(),
        boxColor: match.label === 'unknown' ? 'red' : 'green'
      });
      drawBox.draw(canvas);
      
      // Auto redirect if face recognized
      if (match.label !== 'unknown') {
        status.textContent = `Terdeteksi: ${match.label}`;
        speak(`Selamat datang ${match.label}`);
        localStorage.setItem('currentEmployee', match.label);
        setTimeout(() => {
          window.location.href = 'employee.html';
        }, 2000);
      }
    });
  }, 500);
});

// Registration
registerBtn.onclick = () => regModal.classList.remove('hidden');
closeRegBtn.onclick = () => regModal.classList.add('hidden');

captureBtn.onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Masukkan nama');
  
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) return alert('Wajah tidak terdeteksi');
  
  await addDoc(collection(db, 'employees'), {
    name: name,
    descriptors: [Array.from(detection.descriptor)],
    registeredAt: new Date()
  });
  
  speak(`Registrasi berhasil untuk ${name}`);
  alert('Registrasi berhasil!');
  regModal.classList.add('hidden');
  loadFaces();
};

// Initialize
(async () => {
  await loadModels();
  await startCamera();
  await loadFaces();
})();

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
