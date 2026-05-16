import re

with open('public/host_dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add hidden elements to support JS
hidden_elements = """
<!-- Hidden Elements to support host.js logic without crashing -->
<div style="display:none;">
    <div id="chatMessages"></div>
    <input id="chatInput">
    <button id="chatSend"></button>
</div>
"""

# Insert hidden elements before the Scanner Modal
content = content.replace('<!-- Scanner Modal -->', hidden_elements + '\n<!-- Scanner Modal -->')

# Now fix the proposal form and events list
# Find layout-row reveal and replace it
replacement = """
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
"""

start_idx = content.find('<!-- CHARTS & FORM ROW -->')
end_idx = content.find('</div><!-- /content -->')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + content[end_idx:]

with open('public/host_dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated host_dashboard.html")
