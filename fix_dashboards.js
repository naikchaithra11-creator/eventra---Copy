const fs = require('fs');

// Fix host_dashboard.html
let host = fs.readFileSync('public/host_dashboard.html', 'utf8');

// Inject hidden elements
const hiddenElements = `
<!-- Hidden Elements to support host.js logic without crashing -->
<div style="display:none;">
    <div id="chatMessages"></div>
    <input id="chatInput">
    <button id="chatSend"></button>
</div>
`;
if (!host.includes('id="chatMessages"')) {
    host = host.replace('<!-- Scanner Modal -->', hiddenElements + '\n<!-- Scanner Modal -->');
}

// Replace layout-row
const hostReplacement = `
    <!-- CHARTS & FORM ROW -->
    <div class="layout-row reveal">
      
      <!-- Left: Chart & Proposals -->
      <div style="display:flex; flex-direction:column; gap:18px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">📈</span> Attendance Trends</div>
          </div>
          <div style="height: 180px; position:relative;">
            <canvas id="hostAttendeesChart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">🎪</span> Your Proposals</div>
          </div>
          <div id="hostEventsContainer" style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto;">
            <div class="no-data">Loading proposals...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">💬</span> Audience Feedback</div>
          </div>
          <div id="hostFeedbackList" style="display:flex; flex-direction:column; gap:10px; max-height:200px; overflow-y:auto;">
            <div class="no-data">No feedback yet.</div>
          </div>
        </div>
      </div>

      <!-- Right: Proposal Form -->
      <div>
        <div class="card" style="position: sticky; top: 90px;">
          <div class="card-header" style="flex-direction:column; align-items:center; text-align:center;">
            <span class="icon" style="font-size:2rem; color:var(--purple); margin-bottom:10px;">✨</span>
            <div class="card-title" style="font-size:1.1rem;">Start Proposal (Phase 1)</div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:5px;">Send an initial proposal to admin for approval.</p>
          </div>
          
          <form id="proposalForm">
            <div class="form-group">
              <label class="form-label" for="eventTitle">EVENT TITLE</label>
              <input id="eventTitle" class="form-input" placeholder="e.g. Kinetic Light Opera" type="text" required/>
            </div>
            <div class="form-group">
              <label class="form-label" for="eventDate">PROPOSED DATE</label>
              <input id="eventDate" class="form-input" type="date" required/>
            </div>
            <div class="form-group">
              <label class="form-label" for="eventPrice">TICKET PRICE (₹)</label>
              <input id="eventPrice" class="form-input" placeholder="e.g. 500" type="number" required/>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; padding:14px; margin-top:10px;">Send Request ↗</button>
          </form>
        </div>
      </div>

    </div>
`;
const startIdx = host.indexOf('<!-- CHARTS & FORM ROW -->');
const endIdx = host.indexOf('</div><!-- /content -->');
if (startIdx !== -1 && endIdx !== -1) {
    host = host.substring(0, startIdx) + hostReplacement + host.substring(endIdx);
}
fs.writeFileSync('public/host_dashboard.html', host);


// Fix user_dashboard.html
let user = fs.readFileSync('public/user_dashboard.html', 'utf8');

// Fix the views structure and inject all missing elements that user.js needs
// We need to inject ticketModal, matchmakingModal, paymentModal, chatMessages.
const userMissingElements = `
<!-- Hidden Elements to support user.js logic without crashing -->
<div style="display:none;">
    <div id="chatMessages"></div>
    <input id="chatInput">
    <button id="chatSend"></button>
    <div id="ticketCount">0</div>
    <div id="chatWidget"></div>
</div>

<!-- Modals for User -->
<div id="paymentModal" class="modal-overlay hidden">
    <div class="modal-content">
      <button class="modal-close" onclick="document.getElementById('paymentModal').classList.add('hidden')">✖</button>
      <h2 style="font-size:1.4rem; color:var(--text-primary); margin-bottom:10px;">Checkout</h2>
      <input type="hidden" id="payEventId">
      <input type="hidden" id="payEventPrice">
      <div class="form-group">
        <label class="form-label">Quantity</label>
        <input type="number" id="ticketQuantity" class="form-input" value="1" min="1" max="10">
      </div>
      <p style="margin-top:10px; font-weight:bold;">Total: <span id="checkoutTotal">₹0</span> (<span id="checkoutPrice">₹0</span> each)</p>
      <div id="processingText" class="hidden" style="color:var(--teal); margin-top:10px;">Processing payment...</div>
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button id="gpayBtn" class="btn-primary" style="flex:1;">Pay via GPay</button>
        <button id="phonepeBtn" class="btn-primary" style="flex:1;">Pay via PhonePe</button>
      </div>
    </div>
</div>

<div id="ticketModal" class="modal-overlay hidden">
    <div class="modal-content text-center">
      <button class="modal-close" onclick="document.getElementById('ticketModal').classList.add('hidden')">✖</button>
      <h2 id="ticketTitle" style="font-size:1.4rem; color:var(--text-primary); margin-bottom:10px;">Event Title</h2>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">Show this QR code at the entrance.</p>
      <img id="qrImage" src="" style="width:200px; height:200px; margin:0 auto; display:block;">
    </div>
</div>

<div id="matchmakingModal" class="modal-overlay hidden">
    <div class="modal-content">
      <button class="modal-close" onclick="document.getElementById('matchmakingModal').classList.add('hidden')">✖</button>
      <h2 style="font-size:1.4rem; color:var(--text-primary); margin-bottom:10px;">Attendee Network</h2>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <span style="font-size:0.85rem;">Be visible to others?</span>
        <button id="optInMatchmaking" class="btn-outline">Opt-In</button>
      </div>
      <div id="matchmakingList" style="display:flex; flex-direction:column; gap:10px; max-height:250px; overflow-y:auto;"></div>
    </div>
</div>
`;

if (!user.includes('id="chatMessages"')) {
    user = user.replace('</div><!-- /content -->', '</div><!-- /content -->\n' + userMissingElements);
}

// Ensure the user content has searchLocation and userEventsContainer
const userReplacement = `
    <!-- MAIN DISCOVERY ROW -->
    <div class="discover-row reveal" id="dashboardView">
      
      <!-- Left: Curated List -->
      <div style="display:flex; flex-direction:column; gap:18px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">🎟️</span> Curated Events</div>
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <input id="searchLocation" class="form-input" placeholder="Search by location..." type="text"/>
          </div>
          <div id="userEventsContainer" style="display:flex; flex-direction:column; gap:10px; max-height:500px; overflow-y:auto;">
            <div class="no-data">Loading events...</div>
          </div>
        </div>
      </div>

      <!-- Right: AI Chatbot / Feedback -->
      <div style="display:flex; flex-direction:column; gap:18px;">
        <div class="card" style="position: sticky; top: 90px;">
          <div class="card-header" style="flex-direction:column; align-items:center; text-align:center;">
            <span class="icon" style="font-size:2.5rem; margin-bottom:10px;">🤖</span>
            <div class="card-title" style="font-size:1.2rem;">Eventra Assistant</div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:5px;">Ask about your tickets, upcoming events, or general info.</p>
          </div>
          <div id="chatMessages" style="height:150px; overflow-y:auto; background:var(--surface2); padding:10px; border-radius:8px; margin-bottom:10px; font-size:0.85rem;">
             <p style="color:var(--text-muted);">Hi! I'm your Eventra assistant. How can I help?</p>
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" id="chatInput" class="form-input" placeholder="Type a message...">
            <button id="chatSend" class="btn-primary" style="padding:0 15px;">Send</button>
          </div>
        </div>

        <div class="card">
           <div class="card-title" style="margin-bottom:10px;">Community Feedback</div>
           <div id="userCommunityFeedback" style="max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:10px;">
             <div class="no-data">No feedback yet.</div>
           </div>
           <textarea id="feedbackText" class="form-input" rows="2" placeholder="Share your experience..."></textarea>
           <button id="submitFeedbackBtn" class="btn-primary" style="width:100%; margin-top:10px;">Submit Feedback</button>
           <div id="feedbackAlert" class="hidden" style="color:green; font-size:0.8rem; margin-top:5px;">Feedback sent!</div>
        </div>
      </div>
    </div>
`;
const userStart = user.indexOf('<!-- MAIN DISCOVERY ROW -->');
const userEnd = user.indexOf('</div><!-- /content -->');
if (userStart !== -1 && userEnd !== -1) {
    user = user.substring(0, userStart) + userReplacement + user.substring(userEnd);
}

// Add fake vibe elements just to prevent user.js from crashing if it uses them
const vibeElements = `
<div style="display:none;">
    <button id="soundClick"></button>
    <button id="soundSuccess"></button>
    <button id="soundSwipe"></button>
    <div id="vibeDeckContainer"></div>
    <div id="vibeEmptyState"></div>
    <button id="vibeSkipBtn"></button>
    <button id="vibeLikeBtn"></button>
    <button id="backToBot"></button>
</div>
`;
user = user.replace('</div><!-- /content -->', vibeElements + '\n</div><!-- /content -->');

fs.writeFileSync('public/user_dashboard.html', user);

console.log("Done");
