import re

with open('public/admin_dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add view switching JS before the end of the file
js = """
// View Switching Logic
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetId = item.getAttribute('data-target');
      if (!targetId) return; // For links like scanner that do something else
      
      e.preventDefault();
      // Update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update active section
      sections.forEach(sec => {
        sec.classList.add('hidden');
        if (sec.id === targetId) sec.classList.remove('hidden');
      });
    });
  });
});
</script>
"""
content = content.replace('</script>\n\n<script src="js/common.js"></script>', js + '\n<script src="js/common.js"></script>')

# 2. Add data-targets to sidebar links
content = content.replace('<a class="nav-item active" href="#">\n    <span class="nav-icon">📊</span> Dashboard', '<a class="nav-item active" href="#" data-target="dashboardView">\n    <span class="nav-icon">📊</span> Dashboard')
content = content.replace('<a class="nav-item" href="#">\n    <span class="nav-icon">🎪</span> Events', '<a class="nav-item" href="#" data-target="eventsView">\n    <span class="nav-icon">🎪</span> Events')
content = content.replace('<a class="nav-item" href="#">\n    <span class="nav-icon">🎫</span> Bookings', '<a class="nav-item" href="#" data-target="bookingsView">\n    <span class="nav-icon">🎫</span> Bookings')
content = content.replace('<a class="nav-item" href="#">\n    <span class="nav-icon">👥</span> Users', '<a class="nav-item" href="#" data-target="usersView">\n    <span class="nav-icon">👥</span> Users')

# 3. Restructure content
# We will wrap the existing stat-grid and chart-row in #dashboardView
content = content.replace('<!-- STAT CARDS -->', '<div id="dashboardView" class="view-section">\n    <!-- STAT CARDS -->')

# We will close dashboardView before PHASE SECTIONS and open eventsView
content = content.replace('<!-- PHASE SECTIONS -->', '</div>\n\n    <div id="eventsView" class="view-section hidden">\n    <!-- PHASE SECTIONS -->')

# We will close eventsView before USERS & BOOKINGS and open usersView and bookingsView
users_bookings_replacement = """</div>

    <div id="usersView" class="view-section hidden">
      <div class="card">
        <div class="table-header">👤 Registered Users</div>
        <div id="adminUsersList" style="max-height: 500px; overflow-y:auto;">
          <div class="no-data">Loading users...</div>
        </div>
      </div>
    </div>

    <div id="bookingsView" class="view-section hidden">
      <div class="card">
        <div class="table-header">🎫 All Bookings</div>
        <div id="adminBookingsList" style="max-height: 500px; overflow-y:auto;">
          <div class="no-data">Loading bookings...</div>
        </div>
      </div>
    </div>
"""

# Find the USERS & BOOKINGS TABLE and replace it entirely
start_idx = content.find('<!-- USERS & BOOKINGS TABLE -->')
end_idx = content.find('</div><!-- /content -->')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + users_bookings_replacement + content[end_idx:]

with open('public/admin_dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated admin_dashboard.html")
