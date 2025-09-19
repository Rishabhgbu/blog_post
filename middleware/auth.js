const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        console.log('JWT_SECRET being used:', process.env.JWT_SECRET);
        console.log('Token received:', token.substring(0, 20) + '...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        console.log('Token decoded successfully:', decoded.user);
        next();
    } catch (e) {
        console.error('Token validation error:', e.message);
        console.error('Full error:', e);
        res.status(401).json({ msg: 'Token is not valid - please login again' });
    }
};