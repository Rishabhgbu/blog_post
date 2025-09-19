const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
        return res.status(400).json({ msg: 'Username and password are required' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ msg: 'Username must be at least 3 characters long' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }
    
    try {
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ username, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
        return res.status(400).json({ msg: 'Username and password are required' });
    }
    
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) {
                console.error('JWT signing error:', err);
                return res.status(500).json({ msg: 'Error generating token' });
            }
            console.log('Token generated successfully for user:', user.username);
            res.json({ 
                token,
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

module.exports = router;