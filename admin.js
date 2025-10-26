import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, collection, getDocs, deleteDoc, doc, query, where, onSnapshot, Timestamp 
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
const auth = getAuth(app);
const db = getFirestore(app);

// Login
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadDashboard();
  } catch (error) {
    alert('Login gagal: ' + error.message);
  }
};

// Logout
document.getElementById('logoutBtn').onclick = async () => {
  await signOut(auth);
  location.reload();
};

// Load Dashboard Data
async function loadDashboard() {
  // Total Employees
  const empSnapshot = await getDocs(collection(db, 'employees'));
  document.getElementById('totalEmp').textContent = empSnapshot.size;

  // Today's Check-ins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayQuery = query(
    collection(db, 'attendance'),
    where('timestamp', '>=', Timestamp.fromDate(today))
  );
  
  const todaySnapshot = await getDocs(todayQuery);
  document.getElementById('todayCheckin').textContent = todaySnapshot.size;

  // Employee List
  const empList = document.getElementById('employeeList');
  empList.innerHTML = '';
  
  empSnapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded';
    div.innerHTML = `
      <span class="font-medium">${data.name}</span>
      <button onclick="deleteEmployee('${doc.id}')" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
        Hapus
      </button>
    `;
    empList.appendChild(div);
  });

  // Real-time Attendance Log
  onSnapshot(collection(db, 'attendance'), (snapshot) => {
    const logDiv = document.getElementById('attendanceLog');
    logDiv.innerHTML = '';
    
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    
    logs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    
    logs.forEach(log => {
      const date = log.timestamp.toDate();
      const div = document.createElement('div');
      div.className = 'flex justify-between p-3 bg-gray-50 rounded';
      div.innerHTML = `
        <span class="font-medium">${log.name}</span>
        <span>${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}</span>
        <span class="text-xs text-gray-500">📍 ${log.location.lat.toFixed(4)}, ${log.location.lng.toFixed(4)}</span>
      `;
      logDiv.appendChild(div);
    });
  });
}

// Export CSV
document.getElementById('exportBtn').onclick = async () => {
  const snapshot = await getDocs(collection(db, 'attendance'));
  let csv = 'Name,Date,Time,Latitude,Longitude\n';
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.timestamp.toDate();
    csv += `${data.name},${date.toLocaleDateString()},${date.toLocaleTimeString()},${data.location.lat},${data.location.lng}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${new Date().toISOString()}.csv`;
  a.click();
};

// Make deleteEmployee global
window.deleteEmployee = async (id) => {
  if (confirm('Hapus employee ini?')) {
    await deleteDoc(doc(db, 'employees', id));
    loadDashboard();
  }
};
