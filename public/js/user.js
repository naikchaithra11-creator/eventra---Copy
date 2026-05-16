document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('userEventsContainer');
  const searchInput = document.getElementById('searchLocation');
  const paymentModal = document.getElementById('paymentModal');
  const ticketModal = document.getElementById('ticketModal');
  const qrImage = document.getElementById('qrImage');
  const ticketTitle = document.getElementById('ticketTitle');

  // Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'user') {
    window.location.href = 'index.html';
    return;
  }

  // Load and render events (with search filter)
  const loadUserEvents = (filterLocation = "") => {
    let events = JSON.parse(localStorage.getItem('events')) || [];
    
    let approvedEvents = events.filter(e => e.status === 'published');

    if (filterLocation) {
      approvedEvents = approvedEvents.filter(e => e.location && e.location.toLowerCase().includes(filterLocation.toLowerCase()));
    }

    // Tickets count logic
    const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
    const myTickets = tickets.filter(t => t.userEmail === loggedInUser.email);
    const ticketCountEl = document.getElementById('ticketCount');
    if (ticketCountEl) {
      ticketCountEl.textContent = myTickets.length;
    }

    eventsContainer.innerHTML = '';
    if (approvedEvents.length === 0) {
      eventsContainer.innerHTML = '<p style="color: var(--text-muted);">No matching events found.</p>';
      return;
    }

    approvedEvents.forEach(evt => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.style.padding = '1.5rem';
      
      const evtTicketsCount = tickets.filter(t => t.eventId === evt.id).length;
      const capacity = evt.capacity || 100;
      const isSoldOut = evtTicketsCount >= capacity;
      
      let imgHtml = '';
      if (Array.isArray(evt.images) && evt.images.length > 0) {
        imgHtml = `<div style="display:flex; overflow-x: auto; gap: 10px; margin-bottom: 1rem; padding-bottom: 5px;">`;
        evt.images.forEach(img => {
          imgHtml += `<img src="${img}" style="width:200px; height:150px; object-fit:cover; border-radius:12px; flex-shrink: 0;">`;
        });
        imgHtml += `</div>`;
      } else if (evt.image) {
        imgHtml = `<img src="${evt.image}" style="width:100%; height:150px; object-fit:cover; border-radius:12px; margin-bottom:1rem;">`;
      }

      const alreadyHaveTicket = myTickets.find(t => t.eventId === evt.id);
      
      let btnHtml = '';
      if (isSoldOut && !alreadyHaveTicket) {
        const waitlists = JSON.parse(localStorage.getItem('waitlists')) || [];
        const isOnWaitlist = waitlists.find(w => w.eventId === evt.id && w.userEmail === loggedInUser.email);
        
        if (isOnWaitlist) {
          btnHtml = `<button class="btn btn-outline" disabled style="width: 100%; padding:0.8rem; border-color: #f59e0b; color: #f59e0b; cursor: not-allowed;">Joined Waitlist</button>`;
        } else {
          btnHtml = `<button class="btn btn-outline waitlist-btn" data-id="${evt.id}" style="width: 100%; padding:0.8rem; border-color: #f59e0b; color: #f59e0b; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.1)'" onmouseout="this.style.background='transparent'">Join Waitlist (Sold Out)</button>`;
        }
      } else {
        btnHtml = alreadyHaveTicket 
          ? `<button class="btn btn-primary buy-btn" data-id="${evt.id}" data-price="${evt.price || 0}" style="width: 100%; padding:0.8rem; background:linear-gradient(135deg, #3b82f6, #2563eb);">Buy Another Ticket</button>`
          : `<button class="btn btn-primary buy-btn" data-id="${evt.id}" data-price="${evt.price || 0}" style="width: 100%; padding:0.8rem;">Select & Pay - ${capacity - evtTicketsCount} spots left</button>`;
      }
      
      if (alreadyHaveTicket) {
        btnHtml += `<div style="margin-top: 10px; width: 100%;">
          <button class="btn matchmake-btn" data-id="${evt.id}" style="width: 100%; padding:0.6rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #d8b4fe; border-radius: 6px; transition: all 0.2s;" onmouseover="this.style.background='rgba(139, 92, 246, 0.4)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'"><i class="fa-solid fa-users"></i> See who's going</button>
        </div>`;
      }

      const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(evt.location || '')}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

      // Event Reviews logic
      const allEventReviews = JSON.parse(localStorage.getItem('eventReviews')) || [];
      const thisEventReviews = allEventReviews.filter(r => r.eventId === evt.id);
      
      let avgRating = 0;
      if(thisEventReviews.length > 0) {
        avgRating = (thisEventReviews.reduce((sum, r) => sum + parseInt(r.rating, 10), 0) / thisEventReviews.length).toFixed(1);
      }

      let reviewSectionHtml = `<div style="margin-top: 1.5rem; border-top: 1px solid rgba(233, 213, 255, 0.4); padding-top: 1rem;">`;
      reviewSectionHtml += `<h4 style="margin-bottom: 0.5rem;"><i class="fa-solid fa-star" style="color: gold;"></i> Reviews (${avgRating} avg, ${thisEventReviews.length} total)</h4>`;
      
      // Show add review box for all users
      reviewSectionHtml += `
        <div style="display:flex; gap: 10px; margin-bottom: 1rem; align-items:center;">
           <select class="form-control review-rating-${evt.id}" style="width: 70px;">
              <option value="5">5 ⭐</option><option value="4">4 ⭐</option><option value="3">3 ⭐</option><option value="2">2 ⭐</option><option value="1">1 ⭐</option>
           </select>
           <input type="text" class="form-control review-text-${evt.id}" placeholder="Write a review..." style="flex-grow:1;">
           <button class="btn btn-primary submit-review-btn" data-id="${evt.id}" style="padding: 0.5rem 1rem;">Post</button>
        </div>
      `;
      
      // List existing reviews
      if (thisEventReviews.length > 0) {
        reviewSectionHtml += `<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">`;
        thisEventReviews.slice().reverse().forEach(r => {
          reviewSectionHtml += `
            <div style="background: rgba(255,255,255,0.4); padding: 8px; border-radius: 8px; font-size: 0.85rem;">
               <strong>${r.userName}</strong> (${r.rating} ⭐)
               <p style="margin: 3px 0 0 0;">${r.text}</p>
            </div>
          `;
        });
        reviewSectionHtml += `</div>`;
      }
      reviewSectionHtml += `</div>`;

      card.innerHTML = `
        ${imgHtml}
        <h3 style="margin-bottom: 0.2rem; color: #00f2fe;">${evt.title}</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">📍 ${evt.location} | 📅 ${evt.date} @ ${evt.time} | 🎟️ ₹${evt.price || 'Free'}</p>
        <p style="margin-bottom: 1.5rem; font-size: 0.95rem;">${evt.description}</p>
        
        <div style="margin-bottom: 1rem;">
          <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;"><i class="fa-solid fa-map-location-dot"></i> Live Tracking Target</h4>
          <iframe width="100%" height="150" src="${mapUrl}" frameborder="0" style="border:0; border-radius: 8px;" allowfullscreen></iframe>
        </div>

        ${btnHtml}
        ${reviewSectionHtml}
      `;
      eventsContainer.appendChild(card);
    });

    document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', openPaymentModal));
    document.querySelectorAll('.submit-review-btn').forEach(btn => btn.addEventListener('click', submitReview));
    document.querySelectorAll('.waitlist-btn').forEach(btn => btn.addEventListener('click', joinWaitlist));
    document.querySelectorAll('.matchmake-btn').forEach(btn => btn.addEventListener('click', openMatchmakingModal));
  };

  const joinWaitlist = (e) => {
    const eventId = e.target.getAttribute('data-id');
    const waitlists = JSON.parse(localStorage.getItem('waitlists')) || [];
    waitlists.push({
      eventId: eventId,
      userEmail: loggedInUser.email,
      userName: loggedInUser.name || loggedInUser.email,
      timestamp: new Date().getTime()
    });
    localStorage.setItem('waitlists', JSON.stringify(waitlists));
    loadUserEvents(searchInput.value);
  };

  const matchmakingModal = document.getElementById('matchmakingModal');
  const optInMatchmaking = document.getElementById('optInMatchmaking');
  let currentMatchmakeEventId = null;

  const userProfile = JSON.parse(localStorage.getItem('userProfile_' + loggedInUser.email)) || { optInMatchmaking: false };
  if (optInMatchmaking) {
    optInMatchmaking.checked = userProfile.optInMatchmaking;
    optInMatchmaking.addEventListener('change', (e) => {
      userProfile.optInMatchmaking = e.target.checked;
      localStorage.setItem('userProfile_' + loggedInUser.email, JSON.stringify(userProfile));
      if (currentMatchmakeEventId) {
        // Re-open with same event ID to refresh list
        const dummyEvent = { target: { getAttribute: () => currentMatchmakeEventId, closest: () => ({ getAttribute: () => currentMatchmakeEventId }) } };
        openMatchmakingModal(dummyEvent);
      }
    });
  }

  const openMatchmakingModal = (e) => {
    const target = e.target.closest('.matchmake-btn') || e.target;
    const eventId = target.getAttribute('data-id');
    currentMatchmakeEventId = eventId;
    
    const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
    const eventTickets = tickets.filter(t => t.eventId === eventId);
    const uniqueEmails = [...new Set(eventTickets.map(t => t.userEmail))];
    
    const listContainer = document.getElementById('matchmakingList');
    if(listContainer) {
      listContainer.innerHTML = '';
      let matchCount = 0;
      
      uniqueEmails.forEach(email => {
        if (email === loggedInUser.email) return;
        
        const profile = JSON.parse(localStorage.getItem('userProfile_' + email)) || { optInMatchmaking: false };
        if (profile.optInMatchmaking) {
          matchCount++;
          const name = email.split('@')[0];
          
          listContainer.innerHTML += `
            <div class="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold uppercase flex-shrink-0">
                ${name.charAt(0)}
              </div>
              <div class="flex-grow">
                <p class="font-bold text-white text-sm">${name}</p>
                <p class="text-[10px] text-stone-400">Attendee</p>
              </div>
              <button class="bg-white/10 hover:bg-white/20 p-2 rounded text-violet-300 transition-colors dm-btn" data-email="${email}" data-name="${name}" title="Message">
                <span class="material-symbols-outlined text-[18px]">chat</span>
              </button>
            </div>
          `;
        }
      });
      
      if (matchCount === 0) {
        listContainer.innerHTML = `<p class="text-stone-500 text-sm italic text-center p-4">No other attendees have opted into matchmaking yet.</p>`;
      }
      
      document.querySelectorAll('.dm-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const btnEl = ev.target.closest('.dm-btn');
          currentChatTarget = btnEl.getAttribute('data-email');
          currentChatName = 'Chat with ' + btnEl.getAttribute('data-name');
          matchmakingModal.classList.add('hidden');
          const chatWidget = document.getElementById('chatWidget');
          if (chatWidget) chatWidget.classList.remove('collapsed');
          loadChat();
        });
      });
    }
    
    if (matchmakingModal) matchmakingModal.classList.remove('hidden');
  };

  const submitReview = (e) => {
    const eventId = e.target.getAttribute('data-id');
    const ratingInput = document.querySelector(`.review-rating-${eventId}`);
    const textInput = document.querySelector(`.review-text-${eventId}`);
    
    if(!ratingInput || !textInput || !textInput.value.trim()) return;

    const allEventReviews = JSON.parse(localStorage.getItem('eventReviews')) || [];
    allEventReviews.push({
      eventId: eventId,
      userName: loggedInUser.name || loggedInUser.email,
      rating: ratingInput.value,
      text: textInput.value.trim(),
      timestamp: new Date().getTime()
    });

    localStorage.setItem('eventReviews', JSON.stringify(allEventReviews));
    loadUserEvents(searchInput.value); // Re-render to show new review
  };

  searchInput.addEventListener('input', (e) => loadUserEvents(e.target.value));

  const openPaymentModal = (e) => {
    const eventId = e.target.getAttribute('data-id');
    const priceStr = e.target.getAttribute('data-price');
    const price = parseInt(priceStr, 10) || 0;
    
    document.getElementById('payEventId').value = eventId;
    document.getElementById('payEventPrice').value = price;
    
    const qtyInput = document.getElementById('ticketQuantity');
    if (qtyInput) qtyInput.value = 1;
    
    updateTotalAmount(1, price);
    
    document.getElementById('processingText').classList.add('hidden');
    document.querySelectorAll('.wallet-btn').forEach(b => b.style.display = 'block');
    paymentModal.classList.remove('hidden');
  };

  const updateTotalAmount = (qty, price) => {
    document.getElementById('checkoutPrice').textContent = `₹${price}`;
    document.getElementById('checkoutTotal').textContent = `₹${qty * price}`;
  };

  document.getElementById('ticketQuantity').addEventListener('input', (e) => {
    let qty = parseInt(e.target.value, 10) || 1;
    if (qty > 10) { qty = 10; e.target.value = 10; }
    const price = parseInt(document.getElementById('payEventPrice').value, 10) || 0;
    updateTotalAmount(qty, price);
  });

  const processPayment = () => {
    document.querySelectorAll('.wallet-btn').forEach(b => b.style.display = 'none');
    document.getElementById('processingText').classList.remove('hidden');

    const eventId = document.getElementById('payEventId').value;
    
    let quantity = 1;
    const qtyInput = document.getElementById('ticketQuantity');
    if (qtyInput) {
      quantity = parseInt(qtyInput.value, 10);
      if (isNaN(quantity) || quantity < 1) quantity = 1;
      if (quantity > 10) quantity = 10;
    }
    
    // Get Event Info for QR
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const evt = events.find(el => el.id === eventId);
    
    // Trigger Email Notification & Schedule Reminder
    fetch('/api/book-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: loggedInUser.email,
        userName: loggedInUser.name,
        eventTitle: evt.title,
        eventDate: evt.date,
        eventId: eventId,
        eventLocation: evt.location || 'Online'
      })
    })
    .then(async res => {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON from server: " + text.substring(0, 50));
      }
    })
    .then(data => {
      // Fake payment success. Save to ticket storage.
      try {
        const tickets = JSON.parse(localStorage.getItem('userTickets')) || [];
        for (let i = 0; i < quantity; i++) {
          tickets.push({ userEmail: loggedInUser.email, eventId: eventId, ticketId: data.ticketId });
        }
        localStorage.setItem('userTickets', JSON.stringify(tickets));
      } catch (e) {
        console.warn("Could not save ticket to localStorage, possibly QuotaExceededError.", e);
      }

      // Navigate to the newly generated ticket page
      if (data.ticketId) {
        window.location.href = `/ticket/${data.ticketId}`;
      } else {
        alert("Ticket booked successfully! (No ticket ID from server)");
        paymentModal.classList.add('hidden');
        loadUserEvents(document.getElementById('searchLocation').value);
      }
    })
    .catch(err => {
      console.error('Failed to notify server of booking:', err);
      alert('There was an error processing your ticket:\n' + err.message);
      document.querySelectorAll('.wallet-btn').forEach(b => b.style.display = 'block');
      document.getElementById('processingText').classList.add('hidden');
    });
  };

  document.getElementById('gpayBtn').addEventListener('click', processPayment);
  document.getElementById('phonepeBtn').addEventListener('click', processPayment);

  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const element = document.getElementById('ticketContentToDownload');
      const opt = {
        margin:       10,
        filename:     'Eventra_Ticket.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // Use html2pdf if it's loaded
      if (typeof html2pdf !== 'undefined') {
          html2pdf().set(opt).from(element).save();
      } else {
          alert('PDF generation library not loaded yet. Please try again.');
      }
    });
  }


  // --------------- FEEDBACK LOGIC ---------------
  const feedbackText = document.getElementById('feedbackText');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
  const feedbackAlert = document.getElementById('feedbackAlert');

  if (submitFeedbackBtn && feedbackText) {
    submitFeedbackBtn.addEventListener('click', () => {
      const text = feedbackText.value.trim();
      if (!text) return;

      const feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
      feedbacks.push({
        userName: loggedInUser.name || loggedInUser.email,
        userEmail: loggedInUser.email,
        text: text,
        timestamp: new Date().getTime()
      });

      localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
      feedbackText.value = '';
      
      feedbackAlert.classList.remove('hidden');
      setTimeout(() => feedbackAlert.classList.add('hidden'), 3000);
      loadUserFeedbackList();
    });
  }
  
  const loadUserFeedbackList = () => {
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
    const container = document.getElementById('userCommunityFeedback');
    if (container) {
      container.innerHTML = '';
      if (feedbacks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No community feedback yet.</p>';
      } else {
        feedbacks.slice().reverse().forEach((f) => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 1rem; border-bottom: 1px solid rgba(233, 213, 255, 0.4); background: rgba(255,255,255,0.7); margin-bottom: 10px; border-radius: 8px;';
          div.innerHTML = `
            <div style="font-weight:bold; color: #6366F1; margin-bottom: 5px;">${f.userName}</div>
            <div style="font-size: 0.95rem; margin-bottom: 5px;">${f.text}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right;">${new Date(f.timestamp).toLocaleString()}</div>
          `;
          container.appendChild(div);
        });
      }
    }
  };

  loadUserFeedbackList();

  // --------------- CHAT LOGIC ---------------
  let currentChatTarget = 'bot';
  let currentChatName = 'Eventra Chatbooth';

  const loadChat = () => {
    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    let myMessages = [];
    
    if (currentChatTarget === 'bot') {
      myMessages = allMessages.filter(m => m.hostId === loggedInUser.email && (m.receiver === 'bot' || m.sender === 'bot'));
    } else {
      myMessages = allMessages.filter(m => 
        (m.sender === loggedInUser.email && m.receiver === currentChatTarget) ||
        (m.sender === currentChatTarget && m.receiver === loggedInUser.email)
      );
    }
    
    chatMessages.innerHTML = '';
    myMessages.forEach(msg => {
      const div = document.createElement('div');
      const isSelf = msg.sender === loggedInUser.email;
      div.className = `chat-message ${isSelf ? 'self' : 'other'}`;
      div.textContent = msg.text;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const headerEl = document.querySelector('#chatWidget .chat-header span:first-child');
    const iconEl = document.querySelector('#chatWidget .chat-header span:last-child');
    if (headerEl) headerEl.textContent = currentChatName;
    if (iconEl) {
      if (currentChatTarget !== 'bot') {
        iconEl.innerHTML = `<span style="font-size:12px; font-weight:normal; text-decoration:underline; margin-right:8px;" id="backToBot">Back to Bot</span> 💬`;
        const backBtn = document.getElementById('backToBot');
        if(backBtn) {
           backBtn.addEventListener('click', (e) => {
             e.stopPropagation(); // prevent toggling the collapse
             currentChatTarget = 'bot';
             currentChatName = 'Eventra Chatbooth';
             loadChat();
           });
        }
      } else {
        iconEl.textContent = '🤖';
      }
    }
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
      receiver: currentChatTarget,
      text: text,
      timestamp: new Date().getTime()
    });
    localStorage.setItem('messages', JSON.stringify(allMessages));
    chatInput.value = '';
    loadChat();

    // Chatbot auto-reply logic using API
    if (currentChatTarget === 'bot') {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      .then(res => res.json())
      .then(data => {
        const messages = JSON.parse(localStorage.getItem('messages')) || [];
        messages.push({
          hostId: loggedInUser.email,
          sender: 'bot',
          receiver: loggedInUser.email,
          text: data.reply || "Sorry, I couldn't process that.",
          timestamp: new Date().getTime()
        });
        localStorage.setItem('messages', JSON.stringify(messages));
        loadChat();
      })
      .catch(err => console.error('Chat error:', err));
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'messages') loadChat();
    // Use .includes to catch userTickets and eventReviews
    if (e.key === 'events' || e.key === 'userTickets' || e.key === 'eventReviews') loadUserEvents(searchInput.value);
    if (e.key === 'feedbacks') loadUserFeedbackList();
  });

  // Initial bot greeting if empty
  const initBot = () => {
    const allMessages = JSON.parse(localStorage.getItem('messages')) || [];
    const myMessages = allMessages.filter(m => m.hostId === loggedInUser.email);
    if (myMessages.length === 0) {
      allMessages.push({
        hostId: loggedInUser.email,
        sender: 'bot',
        receiver: loggedInUser.email,
        text: "Hi! I'm the Eventra Chatbooth 🤖. Let me know if you need any help!",
        timestamp: new Date().getTime()
      });
      localStorage.setItem('messages', JSON.stringify(allMessages));
    }
  };
  initBot();

  // --------------- TIME-BASED THEME ---------------
  const applyTimeBasedTheme = () => {
    const hour = new Date().getHours();
    document.body.classList.remove('theme-morning', 'theme-afternoon', 'theme-night');
    if (hour >= 6 && hour < 12) {
      document.body.classList.add('theme-morning');
    } else if (hour >= 12 && hour < 18) {
      document.body.classList.add('theme-afternoon');
    } else {
      // Night theme is default (no class or could add theme-night)
    }
  };
  applyTimeBasedTheme();

  // --------------- AUDIO & MICRO-ANIMATIONS ---------------
  const soundClick = document.getElementById('soundClick');
  const soundSuccess = document.getElementById('soundSuccess');
  const soundSwipe = document.getElementById('soundSwipe');

  const playSound = (audioEl) => {
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(e => console.log('Audio play blocked until user interaction'));
    }
  };

  document.body.addEventListener('mousedown', (e) => {
    const target = e.target.closest('button, .btn, a, .modal-close');
    if (target) {
      playSound(soundClick);
      target.classList.add('btn-press');
      setTimeout(() => target.classList.remove('btn-press'), 150);
    }
  });

  // --------------- VIBE DISCOVERY ---------------
  let vibeEvents = [];
  const vibeDeckContainer = document.getElementById('vibeDeckContainer');
  const vibeEmptyState = document.getElementById('vibeEmptyState');
  const vibeSkipBtn = document.getElementById('vibeSkipBtn');
  const vibeLikeBtn = document.getElementById('vibeLikeBtn');

  const renderVibeDeck = () => {
    if(!vibeDeckContainer) return;
    
    // Clear old cards (except empty state)
    Array.from(vibeDeckContainer.children).forEach(child => {
        if (child.id !== 'vibeEmptyState') child.remove();
    });

    if (vibeEvents.length === 0) {
      vibeEmptyState.classList.remove('hidden');
      if(vibeSkipBtn) vibeSkipBtn.style.display = 'none';
      if(vibeLikeBtn) vibeLikeBtn.style.display = 'none';
      return;
    }

    vibeEmptyState.classList.add('hidden');
    if(vibeSkipBtn) vibeSkipBtn.style.display = 'flex';
    if(vibeLikeBtn) vibeLikeBtn.style.display = 'flex';

    // Render cards (top card is last in DOM)
    vibeEvents.forEach((evt, index) => {
      const card = document.createElement('div');
      card.className = 'vibe-card glass-ui p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing border border-white/10';
      card.style.zIndex = index;
      card.dataset.id = evt.id;
      
      // Calculate scale to create a stack effect
      const reverseIndex = vibeEvents.length - 1 - index;
      const scale = Math.max(1 - (reverseIndex * 0.05), 0.8);
      const translateY = reverseIndex * 15;
      card.style.transform = `scale(${scale}) translateY(-${translateY}px)`;
      if (reverseIndex > 3) card.style.opacity = '0'; // hide cards deep in stack

      let imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/681px-Placeholder_view_vector.svg.png';
      if (Array.isArray(evt.images) && evt.images.length > 0) imgUrl = evt.images[0];
      else if (evt.image) imgUrl = evt.image;

      card.innerHTML = `
        <div class="w-full h-48 rounded-xl overflow-hidden mb-4 bg-black/20">
            <img src="${imgUrl}" class="w-full h-full object-cover" alt="Vibe image">
        </div>
        <h3 class="text-2xl font-bold text-violet-400 mb-2">${evt.title}</h3>
        <p class="text-sm text-stone-400 mb-4 line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${evt.description}</p>
        <div class="inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full text-xs text-white">
            <span class="material-symbols-outlined text-sm">location_on</span>
            ${evt.location}
        </div>
      `;
      vibeDeckContainer.appendChild(card);
    });
  };

  const loadVibeDiscovery = () => {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    
    // Filter events not in wishlist and published
    vibeEvents = events.filter(e => {
      if (e.status !== 'published' || wishlist.includes(e.id)) return false;
      return true;
    });
    renderVibeDeck();
  };

  const handleSwipe = (direction) => {
    if (vibeEvents.length === 0) return;
    
    playSound(soundSwipe);
    
    // The top card is the LAST one in the DOM
    const topCardElement = vibeDeckContainer.lastElementChild;
    if (topCardElement.id === 'vibeEmptyState') return;

    const topEvent = vibeEvents.pop(); // Remove from our logic array

    // Animate out
    topCardElement.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');
    
    if (direction === 'right') {
        playSound(soundSuccess);
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        if (!wishlist.includes(topEvent.id)) {
            wishlist.push(topEvent.id);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }
    }

    setTimeout(() => {
        renderVibeDeck();
    }, 400); // Wait for animation to finish
  };

  if (vibeSkipBtn) vibeSkipBtn.addEventListener('click', () => handleSwipe('left'));
  if (vibeLikeBtn) vibeLikeBtn.addEventListener('click', () => handleSwipe('right'));

  try {
    loadVibeDiscovery();
    loadUserEvents();
  } catch (err) {
    console.error(err);
    document.getElementById('userEventsContainer').innerHTML = `<p style="color:red;">Failed to load events: ${err.message}</p>`;
  }

  try {
    loadChat();
  } catch (err) {
    console.error(err);
  }
});
