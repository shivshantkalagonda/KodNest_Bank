const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./database');
const { authenticate, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// 1. Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, balance) VALUES (?, ?, ?)', [username, hashedPassword, 1000.0], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'User registered successfully. Initial balance: $1000' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        // Store token in DB
        db.run('INSERT INTO tokens (user_id, token) VALUES (?, ?)', [user.id, token], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to create session' });

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 3600000 // 1 hour
            });
            res.json({ message: 'Login successful' });
        });
    });
});

// 3. Logout
app.post('/api/logout', authenticate, (req, res) => {
    const token = req.cookies.token;
    db.run('DELETE FROM tokens WHERE token = ?', [token], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        res.clearCookie('token');
        res.json({ message: 'Logout successful' });
    });
});

// 4. Check Balance
app.get('/api/balance', authenticate, (req, res) => {
    db.get('SELECT balance, username FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json({ balance: user.balance, username: user.username });
    });
});

// 5. Transfer Money
app.post('/api/transfer', authenticate, (req, res) => {
    const { recipientUsername, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (!recipientUsername || isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ error: 'Invalid transfer parameters' });
    }

    // Get current user and recipient
    db.serialize(() => {
        db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, sender) => {
            if (err || !sender) return res.status(404).json({ error: 'Sender not found' });

            if (sender.balance < transferAmount) {
                return res.status(400).json({ error: 'Insufficient funds' });
            }

            db.get('SELECT * FROM users WHERE username = ?', [recipientUsername], (err, recipient) => {
                if (err || !recipient) return res.status(404).json({ error: 'Recipient not found' });

                // Execute transfer (Using a simple serial process for this mock application)
                db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [transferAmount, sender.id], (err) => {
                    if (err) return res.status(500).json({ error: 'Transfer failed' });

                    db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [transferAmount, recipient.id], (err) => {
                        if (err) return res.status(500).json({ error: 'Transfer failed during recipient update' });

                        res.json({ message: `Successfully transferred $${transferAmount} to ${recipient.username}` });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
