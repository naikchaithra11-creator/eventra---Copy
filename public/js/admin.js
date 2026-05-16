document.addEventListener('DOMContentLoaded', () => {
  const pendingContainer = document.getElementById('pendingProposalsContainer');
  const finalContainer = document.getElementById('finalReviewContainer');
  const approvedContainer = document.getElementById('approvedEventsContainer');
  
  // Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const chatUserList = document.getElementById('chatUserList');
  let currentChatUser = null;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  let adminAttendeesChart = null;
  let adminRevenueChart = null;

  const loadAnalyticsAndUsers = () => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
    const events = JSON.parse(localStorage.getItem('events')) || [];

    document.getElementById('adminTotalUsers').textContent = users.length;
    document.getElementById('adminTotalBookings').textContent = tickets.length;
    
    let revenue = 0;
    
    // For Charts
    const eventLabels = [];
    const attendeeData = [];
    const revenueData = [];

    const publishedEvents = events.filter(e => e.status === 'published');
    
    publishedEvents.forEach(evt => {
      eventLabels.push(evt.title);
      const evtTickets = tickets.filter(t => t.eventId === evt.id);
      attendeeData.push(evtTickets.length);
      const evtRevenue = evtTickets.length * (parseInt(evt.price, 10) || 0);
      revenueData.push(evtRevenue);
      revenue += evtRevenue;
    });
    
    document.getElementById('adminTotalRevenue').textContent = `₹${revenue}`;

    // Render Attendees Chart
    if(adminAttendeesChart) adminAttendeesChart.destroy();
    const ctxA = document.getElementById('adminAttendeesChart');
    if (ctxA) {
      adminAttendeesChart = new Chart(ctxA, {
        type: 'bar',
        data: {
          labels: eventLabels,
          datasets: [{
            label: 'Attendees',
            data: attendeeData,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // Render Revenue Chart
    if(adminRevenueChart) adminRevenueChart.destroy();
    const ctxR = document.getElementById('adminRevenueChart');
    if (ctxR) {
      adminRevenueChart = new Chart(ctxR, {
        type: 'doughnut',
        data: {
          labels: eventLabels,
          datasets: [{
            label: 'Revenue (₹)',
            data: revenueData,
            backgroundColor: [
              'rgba(99, 102, 241, 0.6)',
              'rgba(34, 197, 94, 0.6)',
              'rgba(234, 179, 8, 0.6)',
              'rgba(239, 68, 68, 0.6)',
              'rgba(168, 85, 247, 0.6)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    const usersListContainer = document.getElementById('adminUsersList');
    usersListContainer.innerHTML = '';
    if (users.length === 0) {
      usersListContainer.innerHTML = '<p style="color: var(--text-muted);">No users found.</p>';
    } else {
      users.forEach(u => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 0.5rem; border-bottom: 1px solid rgba(233, 213, 255, 0.4); display: flex; justify-content: space-between;';
        div.innerHTML = `<span><strong>${u.name}</strong> (${u.email})</span> <span style="text-transform: capitalize; font-size: 0.8rem; background: var(--teal); color: white; padding: 2px 8px; border-radius: 12px;">${u.role}</span>`;
        usersListContainer.appendChild(div);
      });
    }

    const bookingsListContainer = document.getElementById('adminBookingsList');
    bookingsListContainer.innerHTML = '';
    if (tickets.length === 0) {
      bookingsListContainer.innerHTML = '<p style="color: var(--text-muted);">No bookings found.</p>';
    } else {
      tickets.forEach((t) => {
        const evt = events.find(e => e.id === t.eventId);
        const eventTitle = evt ? evt.title : 'Deleted Event';
        const div = document.createElement('div');
        div.style.cssText = 'padding: 0.5rem; border-bottom: 1px solid rgba(233, 213, 255, 0.4);';
        div.innerHTML = `<strong>${t.userEmail}</strong> booked ticket for <strong>${eventTitle}</strong>`;
        bookingsListContainer.appendChild(div);
      });
    }

    const feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
    const eventReviews = JSON.parse(localStorage.getItem('eventReviews')) || [];
    const feedbackListContainer = document.getElementById('adminFeedbackList');
    if (feedbackListContainer) {
      feedbackListContainer.innerHTML = '';
      
      const allReviewsAndFeedback = [
        ...feedbacks.map(f => ({...f, type: 'Platform Feedback'})),
        ...eventReviews.map(r => {
           const evt = events.find(e => e.id === r.eventId);
           return {...r, type: `Event Review: ${evt ? evt.title : 'Unknown Event'}`};
        })
      ].sort((a, b) => b.timestamp - a.timestamp);

      if (allReviewsAndFeedback.length === 0) {
        feedbackListContainer.innerHTML = '<p style="color: var(--text-muted);">No feedback or reviews have been submitted yet.</p>';
      } else {
        allReviewsAndFeedback.forEach((f) => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 1rem; border-bottom: 1px solid rgba(233, 213, 255, 0.4); background: rgba(255,255,255,0.7); margin-bottom: 10px; border-radius: 8px;';
          
          let ratingHtml = '';
          if (f.rating) {
            ratingHtml = `<span style="color: gold; margin-left: 10px;">${'⭐'.repeat(f.rating)}</span>`;
          }

          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
               <div style="font-weight:bold; color: #6366F1;">${f.userName} <span style="font-size:0.8rem; color:var(--text-muted);">${f.userEmail ? '('+f.userEmail+')' : ''}</span>${ratingHtml}</div>
               <div style="font-size:0.75rem; background: var(--surface2); padding: 2px 8px; border-radius: 12px; color: var(--text-muted);">${f.type}</div>
            </div>
            <div style="font-size: 0.95rem;">${f.text}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; text-align: right;">${new Date(f.timestamp).toLocaleString()}</div>
          `;
          feedbackListContainer.appendChild(div);
        });
      }
    }
  };

  // --------------- EVENTS LOGIC ---------------
  const loadAdminEvents = () => {
    loadAnalyticsAndUsers();
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
    const stage1Events = events.filter(e => e.status === 'stage1_pending');
    const stage2Events = events.filter(e => e.status === 'stage2_pending');
    const publishedEvents = events.filter(e => e.status === 'published');

    // Phase 1 Rendering
    const pendingCount = stage1Events.length + stage2Events.length;
    const notifBadge = document.querySelector('.badge-notif');
    if (notifBadge) {
      if (pendingCount > 0) {
        notifBadge.style.display = 'inline-block';
        notifBadge.textContent = `⚠ ${pendingCount} pending`;
      } else {
        notifBadge.style.display = 'none';
      }
    }

    pendingContainer.innerHTML = '';
    if (stage1Events.length === 0) {
      pendingContainer.innerHTML = '<p style="color: var(--text-muted);">No initial requests.</p>';
    } else {
      stage1Events.forEach(evt => {
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '1rem';
        card.innerHTML = `
          <h3 style="margin-bottom: 0.2rem; color: #eab308;">${evt.title}</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">By ${evt.hostEmail} | Proposed Date: ${evt.date} | 🎟️ ₹${evt.price || 'Free'}</p>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary accept-s1-btn" data-id="${evt.id}" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Approve Phase 1</button>
            <button class="btn btn-outline reject-btn" data-id="${evt.id}" style="padding: 0.4rem 1rem; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.5);">Reject</button>
          </div>
        `;
        pendingContainer.appendChild(card);
      });
    }

    // Phase 2 Rendering
    finalContainer.innerHTML = '';
    if (stage2Events.length === 0) {
      finalContainer.innerHTML = '<p style="color: var(--text-muted);">No final submissions waiting.</p>';
    } else {
      stage2Events.forEach(evt => {
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '1rem';
        card.innerHTML = `
          <h3 style="margin-bottom: 0.2rem; color: #3b82f6;">${evt.title}</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.2rem;">By ${evt.hostEmail}</p>
          <p style="font-size: 0.85rem; margin-bottom: 0.2rem;">📍 ${evt.location} | 📅 ${evt.date} at ${evt.time} | 🎟️ ₹${evt.price || 'Free'}</p>
          <p style="margin-bottom: 1rem; font-size: 0.9rem;">${evt.description}</p>
          ${evt.images && evt.images.length > 0 ? `<div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:1rem;">` + evt.images.map(img => `<img src="${img}" style="height:100px; border-radius:8px; flex-shrink:0;">`).join('') + `</div>` : (evt.image ? `<img src="${evt.image}" style="max-height:100px; border-radius:8px; margin-bottom: 1rem;">` : '')}
          <br>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary publish-btn" data-id="${evt.id}" style="padding: 0.4rem 1rem; font-size: 0.8rem; background: #22c55e;">Publish to Live Site</button>
            <button class="btn btn-outline reject-btn" data-id="${evt.id}" style="padding: 0.4rem 1rem; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.5);">Reject</button>
          </div>
        `;
        finalContainer.appendChild(card);
      });
    }

    // Published Rendering
    approvedContainer.innerHTML = '';
    if (publishedEvents.length === 0) {
      approvedContainer.innerHTML = '<p style="color: var(--text-muted);">No published events.</p>';
    } else {
      publishedEvents.forEach(evt => {
        const attendeeCount = tickets.filter(t => t.eventId === evt.id).length;
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '1rem';
        card.innerHTML = `
          <h3 style="margin-bottom: 0.5rem; color: #22c55e;">${evt.title}</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">📍 ${evt.location} | 🎟️ ₹${evt.price || 'Free'} | 👥 Attendees: ${attendeeCount}</p>
          <button class="btn btn-outline admin-delete-btn" data-id="${evt.id}" style="width: 100%; padding: 0.4rem; font-size: 0.8rem; color: #ef4444;">Force Delete Location</button>
        `;
        approvedContainer.appendChild(card);
      });
    }

    document.querySelectorAll('.accept-s1-btn').forEach(btn => btn.addEventListener('click', approvePhase1));
    document.querySelectorAll('.publish-btn').forEach(btn => btn.addEventListener('click', publishEvent));
    document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', rejectEvent));
    document.querySelectorAll('.admin-delete-btn').forEach(btn => btn.addEventListener('click', deleteEvent));
  };

  const approvePhase1 = (e) => {
    const id = e.target.getAttribute('data-id');
    let events = JSON.parse(localStorage.getItem('events')) || [];
    const index = events.findIndex(evt => evt.id === id);
    if (index > -1) {
      events[index].status = 'stage1_approved';
      localStorage.setItem('events', JSON.stringify(events));
      loadAdminEvents();
    }
  };

  const publishEvent = (e) => {
    const id = e.target.getAttribute('data-id');
    let events = JSON.parse(localStorage.getItem('events')) || [];
    const index = events.findIndex(evt => evt.id === id);
    if (index > -1) {
      events[index].status = 'published';
      localStorage.setItem('events', JSON.stringify(events));
      loadAdminEvents();
    }
  };

  const rejectEvent = (e) => {
    if (!confirm('Are you sure you want to reject this event request?')) return;
    const id = e.target.getAttribute('data-id');
    let events = JSON.parse(localStorage.getItem('events')) || [];
    const index = events.findIndex(evt => evt.id === id);
    if (index > -1) {
      events[index].status = 'rejected';
      localStorage.setItem('events', JSON.stringify(events));
      loadAdminEvents();
    }
  };

  const deleteEvent = (e) => {
    if (!confirm('Force delete this live event?')) return;
    const id = e.target.getAttribute('data-id');
    let events = JSON.parse(localStorage.getItem('events')) || [];
    events = events.filter(evt => evt.id !== id);
    localStorage.setItem('events', JSON.stringify(events));
    loadAdminEvents();
  };


  // --------------- CHAT LOGIC ---------------
  const loadChat = () => {
    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Find unique users who sent a message
    const uniqueUsers = [...new Set(allMessages.map(m => m.hostId))].filter(u => u);
    
    chatUserList.innerHTML = '';
    uniqueUsers.forEach(u => {
      const btn = document.createElement('div');
      
      const userObj = users.find(userData => userData.email === u);
      const displayName = userObj ? userObj.name : u;
      
      const userMsgs = allMessages.filter(m => m.hostId === u);
      const lastMsg = userMsgs[userMsgs.length - 1];
      const preview = lastMsg ? (lastMsg.text.length > 25 ? lastMsg.text.substring(0, 25) + '...' : lastMsg.text) : '';
      
      btn.innerHTML = `<div style="font-weight:bold;">${displayName}</div><div style="font-size:0.75rem; color:var(--text-muted);">${preview}</div>`;
      btn.style.cssText = 'padding: 10px; border-bottom: 1px solid rgba(233, 213, 255, 0.4); cursor: pointer; transition: 0.3s;';
      if (currentChatUser === u) {
        btn.style.background = 'rgba(233, 213, 255, 0.5)';
        btn.style.borderLeft = '4px solid #6366F1';
      }

      btn.addEventListener('click', () => {
        currentChatUser = u;
        const activeUserObj = users.find(userData => userData.email === u);
        const headerName = activeUserObj ? activeUserObj.name : u;
        document.getElementById('chatActiveUserHeader').textContent = `Chatting with: ${headerName} (${u})`;
        loadChat(); // Reload to render their messages
      });
      chatUserList.appendChild(btn);
    });

    chatMessages.innerHTML = '';
    if (!currentChatUser) {
      chatMessages.innerHTML = '<p style="text-align:center; color:gray; font-size: 0.8rem; margin-top: 2rem;">Select a user from the left to begin chatting</p>';
      return;
    }

    const conversation = allMessages.filter(m => m.hostId === currentChatUser);
    conversation.forEach(msg => {
      const div = document.createElement('div');
      const isSelf = msg.sender === 'admin';
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
    if (!text || !currentChatUser) return;

    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    allMessages.push({
      hostId: currentChatUser,
      sender: 'admin',
      receiver: currentChatUser,
      text: text,
      timestamp: new Date().getTime()
    });
    localStorage.setItem('messages', JSON.stringify(allMessages));
    chatInput.value = '';
    loadChat();
  });

  const chatAiBtn = document.getElementById('chatAiBtn');
  if (chatAiBtn) {
    chatAiBtn.addEventListener('click', () => {
      if (!currentChatUser) return;
      chatAiBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem; animation: spin 1s linear infinite;">sync</span> Thinking...`;
      
      setTimeout(() => {
        chatAiBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">auto_awesome</span> AI Reply`;
        
        // Analyze recent messages to generate contextual reply
        const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
        const conversation = allMessages.filter(m => m.hostId === currentChatUser);
        const lastUserMsg = conversation.reverse().find(m => m.sender !== 'admin');
        
        let aiReply = "Thank you for reaching out! I've reviewed your request and everything looks good. Let me know if you need further assistance.";
        
        if (lastUserMsg) {
            const text = lastUserMsg.text.toLowerCase();
            if (text.includes('refund') || text.includes('cancel')) {
                aiReply = "I understand you're inquiring about a cancellation. I can process a refund for your ticket within the next 24 hours. Would you like me to proceed?";
            } else if (text.includes('approve') || text.includes('publish') || text.includes('proposal')) {
                aiReply = "Your proposal looks fantastic! I've gone ahead and reviewed the details. You should see it published on the live site momentarily.";
            } else if (text.includes('ticket') || text.includes('booking')) {
                aiReply = "Your ticket booking is confirmed and secure! You can view your QR code directly from your dashboard.";
            }
        }
        
        chatInput.value = aiReply;
      }, 600);
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'messages') loadChat();
    if (e.key === 'events' || e.key === 'userTickets' || e.key === 'users' || e.key === 'feedbacks' || e.key === 'eventReviews') {
      loadAdminEvents();
    }
  });

  loadAdminEvents();
  loadChat();
});
