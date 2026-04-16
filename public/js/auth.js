// UI Helpers
function showMessage(msg, isError = false) {
    const el = document.getElementById('authMessage');
    el.textContent = msg;
    el.className = 'message ' + (isError ? 'error' : 'success');

    // Auto hide after 5 seconds
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function switchTab(tabId) {
    // Reset tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Set active
    if (tabId === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

// Authentication Handlers
async function handleAuth(event, type) {
    event.preventDefault();

    const isLogin = type === 'login';
    const prefix = isLogin ? 'login' : 'reg';

    const username = document.getElementById(`${prefix}Username`).value;
    const password = document.getElementById(`${prefix}Password`).value;
    const btn = document.getElementById(`${prefix}Btn`);

    // Loading state
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loader" style="width: 1rem; height: 1rem; border-width: 2px;"></span> Processing...';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Request failed');
        }

        if (isLogin) {
            // Redirect to dashboard on successful login
            window.location.href = '/dashboard.html';
        } else {
            showMessage(data.message);
            // Switch to login tab after successful registration
            switchTab('login');
            document.getElementById('loginUsername').value = username;
        }
    } catch (err) {
        showMessage(err.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
