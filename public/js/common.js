document.addEventListener('DOMContentLoaded', () => {
  const userNameDisplay = document.getElementById('userNameDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  // Load user name from local storage
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (user && userNameDisplay) {
    userNameDisplay.textContent = user.name;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('loggedInUser');
      // Redirect to login
      window.location.href = 'index.html';
    });
  }
});

// --- Scanner Logic ---
let html5QrcodeScanner = null;

window.openScannerModal = () => {
    document.getElementById('scannerModal').classList.remove('hidden');
    document.getElementById('scanResult').classList.add('hidden');
    document.getElementById('resumeScanBtn').classList.add('hidden');
    
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            /* verbose= */ false);
            
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
};

window.closeScannerModal = () => {
    document.getElementById('scannerModal').classList.add('hidden');
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error("Failed to clear scanner", e));
        html5QrcodeScanner = null;
    }
};

window.resumeScanner = () => {
    document.getElementById('scanResult').classList.add('hidden');
    document.getElementById('resumeScanBtn').classList.add('hidden');
    if (html5QrcodeScanner) {
        html5QrcodeScanner.resume();
    }
};

function onScanSuccess(decodedText, decodedResult) {
    if(html5QrcodeScanner) html5QrcodeScanner.pause(true);
    
    const resultDiv = document.getElementById('scanResult');
    const statusEl = document.getElementById('scanStatus');
    const detailsEl = document.getElementById('scanDetails');
    const resumeBtn = document.getElementById('resumeScanBtn');
    
    resultDiv.classList.remove('hidden');
    resumeBtn.classList.remove('hidden');
    
    try {
        const urlParams = new URL(decodedText).searchParams;
        const eventId = urlParams.get('eventId');
        const name = urlParams.get('name');
        const title = urlParams.get('title') || 'Event';
        
        if (!eventId || !name) {
            throw new Error("Invalid ticket format");
        }
        
        // Verify in DB
        const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        const validTicket = tickets.find(t => {
            if (t.eventId !== eventId) return false;
            // Since ticket only stores email, we need to match the name.
            const user = users.find(u => u.email === t.userEmail);
            return user && user.name === name;
        });
        
        if (validTicket) {
            if (validTicket.scanned) {
                resultDiv.style.backgroundColor = 'rgba(234, 179, 8, 0.2)'; // Yellow
                statusEl.textContent = "ALREADY SCANNED";
                statusEl.style.color = "#facc15"; 
                detailsEl.innerHTML = `<strong>Attendee:</strong> ${name}<br><strong>Event:</strong> ${title}<br><span style="color:#facc15;">This ticket has already been used for entry.</span>`;
            } else {
                // Mark as scanned
                validTicket.scanned = true;
                localStorage.setItem('userTickets', JSON.stringify(tickets));
                
                resultDiv.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; // Green
                statusEl.textContent = "VALID TICKET";
                statusEl.style.color = "#4ade80"; 
                detailsEl.innerHTML = `<strong>Attendee:</strong> ${name}<br><strong>Event:</strong> ${title}<br><span style="color:#4ade80;">Ticket verified and marked as used.</span>`;
            }
        } else {
            resultDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Red
            statusEl.textContent = "INVALID TICKET";
            statusEl.style.color = "#f87171"; 
            detailsEl.innerHTML = "No matching ticket found for this event and user.";
        }
    } catch (e) {
        resultDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        statusEl.textContent = "READ ERROR";
        statusEl.style.color = "#f87171";
        detailsEl.innerHTML = "QR code does not contain valid Eventra ticket data.";
    }
}

function onScanFailure(error) {
    // Ignore routine scan failures
}
