document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');
  
  const loginAlert = document.getElementById('loginAlert');
  const registerAlert = document.getElementById('registerAlert');

  // Toggle Forms
  showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginAlert.classList.add('hidden');
  });

  showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerAlert.classList.add('hidden');
  });

  // Helper Function for Alerts
  const showAlert = (el, message, isError) => {
    el.textContent = message;
    el.classList.remove('hidden', 'alert-error', 'alert-success');
    el.classList.add(isError ? 'alert-error' : 'alert-success');
  };

  // -------------------------------------------------------------
  // FALLBACK IMPLEMENTATION (Using LocalStorage instead of SQLite)
  // -------------------------------------------------------------

  // Login Submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      showAlert(loginAlert, 'Login Successful! Redirecting...', false);
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      
      // Redirect based on role
      setTimeout(() => {
        window.location.href = `${user.role}_dashboard.html`;
      }, 1000);
    } else {
      showAlert(loginAlert, 'Invalid email or password.', true);
    }
  });

  // Register Submit
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    const users = JSON.parse(localStorage.getItem('users')) || [];

    if (users.find(u => u.email === email)) {
      showAlert(registerAlert, 'Email already in use.', true);
      return;
    }

    users.push({ name, email, password, role });
    localStorage.setItem('users', JSON.stringify(users));

    showAlert(registerAlert, 'Registration Successful! You can now log in.', false);
    setTimeout(() => {
      registerForm.reset();
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      registerAlert.classList.add('hidden');
    }, 2000);
  });
});
