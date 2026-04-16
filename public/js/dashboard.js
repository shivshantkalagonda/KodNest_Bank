// UI Helpers
function showMessage(msg, isError = false) {
    const el = document.getElementById('dashboardMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'message ' + (isError ? 'error' : 'success');

    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// API Interactions
async function fetchBalance() {
    const display = document.getElementById('balanceDisplay');
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Checking...';
    }

    display.innerHTML = '<div class="loader"></div>';

    try {
        const res = await fetch('/api/balance');

        if (res.status === 401) {
            // Unauthorized, redirect to login
            window.location.href = '/index.html';
            return;
        }

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch balance');

        // Formatted to currency
        display.innerHTML = `$${parseFloat(data.balance).toFixed(2)}`;
        document.getElementById('welcomeText').textContent = `Welcome, ${data.username}`;
    } catch (err) {
        display.innerHTML = `<span style="font-size: 1rem; color: var(--error)">Error loading balance</span>`;
        if (refreshBtn) refreshBtn.disabled = false;
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Check Balance';
        }
    }
}

async function handleTransfer(event) {
    event.preventDefault();

    const recipientUsername = document.getElementById('recipientUsername').value;
    const amount = document.getElementById('transferAmount').value;
    const btn = document.getElementById('transferBtn');

    btn.innerHTML = '<span class="loader" style="width: 1rem; height: 1rem; border-width: 2px;"></span> Processing...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientUsername, amount })
        });

        const data = await res.json();

        if (res.status === 401) {
            window.location.href = '/index.html';
            return;
        }

        if (!res.ok) throw new Error(data.error || 'Transfer failed');

        showMessage(data.message);

        // Reset form
        document.getElementById('recipientUsername').value = '';
        document.getElementById('transferAmount').value = '';

        // Refresh balance
        fetchBalance();

    } catch (err) {
        showMessage(err.message, true);
    } finally {
        btn.innerHTML = 'Send Securely';
        btn.disabled = false;
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (err) {
        console.error('Logout error', err);
        window.location.href = '/index.html'; // redirect anyway
    }
}

// Initial initialization when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    fetchBalance();
});
