document.addEventListener('DOMContentLoaded', () => {
  const proposalForm = document.getElementById('proposalForm');
  const phase2Form = document.getElementById('phase2Form');
  const hostEventsContainer = document.getElementById('hostEventsContainer');
  const detailsModal = document.getElementById('detailsModal');
  
  // Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'host') {
    window.location.href = 'index.html';
    return;
  }

  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

  let hostAttendeesChart = null;

  // --------------- EVENTS LOGIC ---------------
  const loadEvents = () => {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const myEvents = events.filter(e => e.hostEmail === loggedInUser.email);
    const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
    
    const myEventsEl = document.getElementById('hostMyEvents');
    if (myEventsEl) myEventsEl.textContent = myEvents.length;
    
    let totalTickets = 0;
    let totalRevenue = 0;
    const eventLabels = [];
    const attendeeData = [];

    myEvents.forEach(evt => {
      const evtTickets = tickets.filter(t => t.eventId === evt.id).length;
      totalTickets += evtTickets;
      totalRevenue += evtTickets * (parseInt(evt.price, 10) || 0);
      eventLabels.push(evt.title);
      attendeeData.push(evtTickets);
    });

    const ticketsEl = document.getElementById('hostTotalTickets');
    if (ticketsEl) ticketsEl.textContent = totalTickets;
    
    const revenueEl = document.getElementById('hostTotalRevenue');
    if (revenueEl) revenueEl.textContent = `₹${totalRevenue}`;

    if(hostAttendeesChart) hostAttendeesChart.destroy();
    const ctxA = document.getElementById('hostAttendeesChart');
    if (ctxA) {
      hostAttendeesChart = new Chart(ctxA, {
        type: 'bar',
        data: {
          labels: eventLabels,
          datasets: [{
            label: 'Attendees',
            data: attendeeData,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    hostEventsContainer.innerHTML = '';
    
    if (myEvents.length === 0) {
      hostEventsContainer.innerHTML = '<p style="color: var(--text-muted);">No proposals found.</p>';
      return;
    }

    myEvents.forEach(evt => {
      let statusString = evt.status;
      let statusColor = '#eab308'; // Default yellow
      let extraAction = '';

      if (evt.status === 'stage1_pending') { statusString = 'Phase 1: Pending Approval'; }
      if (evt.status === 'stage1_approved') { 
        statusString = 'Phase 2: Needs Details'; 
        statusColor = '#3b82f6'; // Blue
        extraAction = `<button class="btn btn-primary p2-btn" data-id="${evt.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Submit Phase 2 Details</button>`;
      }
      if (evt.status === 'stage2_pending') { statusString = 'Phase 2: Pending Final Publish'; statusColor = '#eab308'; }
      if (evt.status === 'published') { statusString = 'Live'; statusColor = '#22c55e'; }
      if (evt.status === 'rejected') { statusString = 'Rejected by Admin'; statusColor = '#ef4444'; }

      const attendeeCount = tickets.filter(t => t.eventId === evt.id).length;
      const waitlists = JSON.parse(localStorage.getItem('waitlists')) || [];
      const waitlistCount = waitlists.filter(w => w.eventId === evt.id).length;
      
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.padding = '1rem';
      const priceDisplay = evt.price ? ` | 🎟️ ₹${evt.price}` : '';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap:10px;">
          <div>
            <h3 style="margin-bottom: 0.2rem;">${evt.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">${evt.date} ${evt.time || ''}${priceDisplay} | 👥 Attendees: ${attendeeCount} ${waitlistCount > 0 ? `<span class="text-amber-400">| 🕒 Waitlist: ${waitlistCount}</span>` : ''}</p>
          </div>
          <span style="background: ${statusColor}; color: #000; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-align: center;">${statusString}</span>
        </div>
        ${evt.location ? `<p style="font-size:0.85rem; margin-top:0.5rem;">📍 ${evt.location}</p>` : ''}
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
          ${extraAction}
          <button class="btn btn-outline delete-btn" data-id="${evt.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.5);">Delete</button>
        </div>
      `;
      hostEventsContainer.appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteEvent));
    document.querySelectorAll('.p2-btn').forEach(btn => btn.addEventListener('click', openPhase2Modal));
    
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
    const feedbackListContainer = document.getElementById('hostFeedbackList');
    if (feedbackListContainer) {
      feedbackListContainer.innerHTML = '';
      if (feedbacks.length === 0) {
        feedbackListContainer.innerHTML = '<p style="color: var(--text-muted);">No feedback has been submitted yet.</p>';
      } else {
        feedbacks.slice().reverse().forEach((f) => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 1rem; border-bottom: 1px solid rgba(233, 213, 255, 0.4); background: rgba(255,255,255,0.7); margin-bottom: 10px; border-radius: 8px;';
          div.innerHTML = `
            <div style="font-weight:bold; color: #6366F1; margin-bottom: 5px;">${f.userName} <span style="font-size:0.8rem; color:var(--text-muted);">(${f.userEmail})</span></div>
            <div style="font-size: 0.95rem;">${f.text}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; text-align: right;">${new Date(f.timestamp).toLocaleString()}</div>
          `;
          feedbackListContainer.appendChild(div);
        });
      }
    }
  };

  // Phase 1 Request
  proposalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('eventTitle').value;
    const dateStr = document.getElementById('eventDate').value;
    const priceStr = document.getElementById('eventPrice').value;
    let events = JSON.parse(localStorage.getItem('events')) || [];

    events.push({
      id: generateId(),
      title,
      date: dateStr,
      price: priceStr,
      hostEmail: loggedInUser.email,
      hostName: loggedInUser.name,
      status: 'stage1_pending'
    });
    localStorage.setItem('events', JSON.stringify(events));
    proposalForm.reset();
    loadEvents();
  });

  // Open Phase 2 Modal
  const openPhase2Modal = (e) => {
    const id = e.target.getAttribute('data-id');
    document.getElementById('p2EventId').value = id;
    detailsModal.classList.remove('hidden');
    
    // Add event listener for live image preview if not added yet
    const p2ImageInput = document.getElementById('p2Image');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (p2ImageInput && !p2ImageInput.dataset.previewAttached) {
      p2ImageInput.dataset.previewAttached = "true";
      p2ImageInput.addEventListener('change', (e) => {
        imagePreviewContainer.innerHTML = '';
        Array.from(e.target.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = 'w-16 h-16 object-cover rounded border border-white/20 flex-shrink-0';
            imagePreviewContainer.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      });
    }
  };

  // AI Generator Logic
  const aiGenBtn = document.getElementById('aiGenBtn');
  if (aiGenBtn) {
    aiGenBtn.addEventListener('click', () => {
      const id = document.getElementById('p2EventId').value;
      let events = JSON.parse(localStorage.getItem('events')) || [];
      const evt = events.find(e => e.id === id);
      const title = evt ? evt.title : 'The Event';
      
      const descriptions = [
        `Immerse yourself in the captivating experience of ${title}. This is not just an event; it's a carefully curated journey designed to awaken your senses and redefine your expectations. Prepare for an unforgettable evening.`,
        `Step into a world of visionary aesthetics with ${title}. We've blended cutting-edge design, ambient soundscapes, and unparalleled networking opportunities. Secure your spot at the frontier of culture.`,
        `Join us for ${title}, an exclusive gathering of taste-makers and innovators. Experience a seamless fusion of art, technology, and community in a breathtaking environment.`
      ];
      const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const p2Desc = document.getElementById('p2Description');
      
      p2Desc.value = '';
      let i = 0;
      aiGenBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[14px] mr-1">sync</span> Generating...';
      aiGenBtn.disabled = true;
      
      const typeWriter = setInterval(() => {
        p2Desc.value += randomDesc.charAt(i);
        i++;
        if (i >= randomDesc.length) {
          clearInterval(typeWriter);
          aiGenBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] mr-1">auto_awesome</span> Generated';
          setTimeout(() => {
             aiGenBtn.disabled = false;
             aiGenBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] mr-1">auto_awesome</span> Generate';
          }, 2000);
        }
      }, 20);
    });
  }

  // Phase 2 Submit (Multiple Images + Capacity)
  phase2Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('p2EventId').value;
    const location = document.getElementById('p2Location').value;
    const capacity = parseInt(document.getElementById('p2Capacity').value, 10) || 100;
    const desc = document.getElementById('p2Description').value;
    const time = document.getElementById('p2Time').value;
    const imgFiles = document.getElementById('p2Image').files;

    // Read and compress all selected images to prevent localStorage QuotaExceededError
    const promises = Array.from(imgFiles).map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIMENSION = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIMENSION) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
              }
            } else {
              if (height > MAX_DIMENSION) {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // Compress heavily for localStorage: 50% quality JPEG
            resolve(canvas.toDataURL('image/jpeg', 0.5));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    });

    const base64Images = await Promise.all(promises);

    let events = JSON.parse(localStorage.getItem('events')) || [];
    const index = events.findIndex(evt => evt.id === id);
    if (index > -1) {
      events[index].location = location;
      events[index].capacity = capacity;
      events[index].description = desc;
      events[index].time = time;
      events[index].images = base64Images; // Array of images
      // Fallback for parts of code that expect single image:
      if (base64Images.length > 0) events[index].image = base64Images[0];
      
      events[index].status = 'stage2_pending';
      try {
        localStorage.setItem('events', JSON.stringify(events));
        detailsModal.classList.add('hidden');
        phase2Form.reset();
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        loadEvents();
      } catch (err) {
        alert('Storage limit exceeded! Even with compression, these images are too large for the browser memory. Please try selecting fewer images.');
        console.error('LocalStorage QuotaExceededError:', err);
      }
    } else {
      detailsModal.classList.add('hidden');
    }
  });

  const deleteEvent = (e) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const id = e.target.getAttribute('data-id');
    let events = JSON.parse(localStorage.getItem('events')) || [];
    events = events.filter(evt => evt.id !== id);
    localStorage.setItem('events', JSON.stringify(events));
    loadEvents();
  };


  // --------------- CHAT LOGIC ---------------
  const loadChat = () => {
    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    // For Host, fetch messages where sender or receiver is this host.
    const myMessages = allMessages.filter(m => m.hostId === loggedInUser.email);
    
    chatMessages.innerHTML = '';
    myMessages.forEach(msg => {
      const div = document.createElement('div');
      const isSelf = msg.sender === loggedInUser.email;
      div.className = `chat-message ${isSelf ? 'self' : 'other'}`;
      div.textContent = msg.text;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      chatSend.click();
    }
  });

  chatSend.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (!text) return;

    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    allMessages.push({
      hostId: loggedInUser.email,
      sender: loggedInUser.email,
      receiver: 'admin', // sending to admin
      text: text,
      timestamp: new Date().getTime()
    });
    localStorage.setItem('messages', JSON.stringify(allMessages));
    chatInput.value = '';
    loadChat();
  });

  // Listen to cross-tab updates (for real-time chat feel)
  window.addEventListener('storage', (e) => {
    if (e.key === 'messages') loadChat();
    if (e.key === 'events' || e.key === 'userTickets' || e.key === 'feedbacks') loadEvents();
  });

  loadEvents();
  loadChat();
});
