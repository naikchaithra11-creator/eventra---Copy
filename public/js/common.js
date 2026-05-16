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

// --- Quick Switch Logic ---
window.switchRole = (role) => {
  let user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (user) {
    user.role = role;
    if (role === 'admin') user.name = 'eventra Admin';
    if (role === 'host') user.name = 'Host User';
    if (role === 'user') user.name = 'Test User';
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    window.location.href = `${role}_dashboard.html`;
  } else {
    // If no user is logged in, just create a dummy one for the quick switch
    let dummyUser = { email: `test@${role}.com`, role: role, name: role.toUpperCase() + ' User' };
    localStorage.setItem('loggedInUser', JSON.stringify(dummyUser));
    window.location.href = `${role}_dashboard.html`;
  }
};

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
        const urlObj = new URL(decodedText);
        let ticketId = null;
        let eventId = null;
        let name = null;

        // Support both old query params format and new URL pathname format
        if (urlObj.pathname.startsWith('/ticket/')) {
            ticketId = urlObj.pathname.split('/')[2];
        } else {
            eventId = urlObj.searchParams.get('e') || urlObj.searchParams.get('eventId');
            name = urlObj.searchParams.get('n') || urlObj.searchParams.get('name');
        }

        const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const events = JSON.parse(localStorage.getItem('events')) || [];

        let validTicket = null;

        if (ticketId) {
            validTicket = tickets.find(t => t.ticketId === ticketId);
            if (validTicket) {
                eventId = validTicket.eventId;
                const u = users.find(u => u.email === validTicket.userEmail);
                name = u ? u.name : 'User';
            }
        } else if (eventId && name) {
            validTicket = tickets.find(t => {
                if (t.eventId !== eventId) return false;
                const user = users.find(u => u.email === t.userEmail);
                return user && user.name === name;
            });
        }
        
        if (!validTicket) {
            throw new Error("Invalid ticket format or ticket not found");
        }

        const evt = events.find(e => e.id === eventId) || {};
        const title = evt.title || 'Event';
        const date = evt.date || '';
        const time = evt.time || '';
        const loc = evt.location || '';
        const price = evt.price || '';
        
        if (validTicket) {
            if (validTicket.scanned) {
                resultDiv.style.backgroundColor = 'rgba(234, 179, 8, 0.2)'; // Yellow
                statusEl.textContent = "ALREADY SCANNED";
                statusEl.style.color = "#facc15"; 
                detailsEl.innerHTML = `<strong>Attendee:</strong> ${name}<br><strong>Event:</strong> ${title}<br><strong>Location:</strong> ${loc}<br><strong>Date:</strong> ${date} ${time}<br><span style="color:#facc15; font-weight:bold; display:inline-block; margin-top:10px;">⚠️ This ticket has already been used for entry.</span>`;
            } else {
                // Mark as scanned
                validTicket.scanned = true;
                localStorage.setItem('userTickets', JSON.stringify(tickets));
                
                resultDiv.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; // Green
                statusEl.textContent = "VALID TICKET - PAID & ELIGIBLE";
                statusEl.style.color = "#4ade80"; 
                detailsEl.innerHTML = `<strong>Attendee:</strong> ${name}<br><strong>Event:</strong> ${title}<br><strong>Location:</strong> ${loc}<br><strong>Date:</strong> ${date} ${time}<br><strong>Price:</strong> ₹${price}<br><span style="color:#4ade80; font-weight:bold; display:inline-block; margin-top:10px;">✅ Ticket verified and marked as used. Attendee is paid and eligible to enter.</span>`;
                
                // Trigger API to send notification to the user
                fetch('/api/notify-scan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userEmail: validTicket.userEmail,
                    userName: name,
                    eventTitle: title,
                    eventDate: date,
                    eventLocation: loc
                  })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.previewUrl) {
                    console.log('Scan Notification Email sent. Preview URL:', data.previewUrl);
                  }
                })
                .catch(err => console.error('Failed to notify scan:', err));
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
