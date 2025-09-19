const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');

// @route   POST /comments
router.post('/', auth, async (req, res) => {
    try {
        const newComment = new Comment({
            content: req.body.content,
            post: req.body.post_id,
            author: req.user.id,
            emoji: req.body.emoji || '💬'
        });
        const comment = await newComment.save();
        await comment.populate('author', ['username']);
        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /comments
router.get('/', async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.query.post_id }).populate('author', ['username']);
        res.json(comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT /comments/:id
router.put('/:id', auth, async (req, res) => {
    try {
        let comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Comment not found' });
        if (comment.author.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        comment = await Comment.findByIdAndUpdate(req.params.id, { $set: { content: req.body.content } }, { new: true });
        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /comments/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Comment not found' });
        if (comment.author.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        await comment.deleteOne();
        res.json({ msg: 'Comment removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /comments/:id/like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Comment not found' });

        // Check if user already liked this comment
        const alreadyLiked = comment.likes.find(like => like.user.toString() === req.user.id);
        
        if (alreadyLiked) {
            // Unlike the comment
            comment.likes = comment.likes.filter(like => like.user.toString() !== req.user.id);
        } else {
            // Like the comment
            comment.likes.push({ user: req.user.id });
        }

        await comment.save();
        await comment.populate('author', ['username']);
        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT /comments/:id/emoji
router.put('/:id/emoji', auth, async (req, res) => {
    try {
        let comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ msg: 'Comment not found' });
        if (comment.author.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        comment = await Comment.findByIdAndUpdate(
            req.params.id, 
            { $set: { emoji: req.body.emoji, updatedAt: Date.now() } }, 
            { new: true }
        ).populate('author', ['username']);
        
        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /comments/filter
router.get('/filter', async (req, res) => {
    try {
        const { post_id, emoji } = req.query;
        let filter = { post: post_id };
        
        if (emoji && emoji !== 'all') {
            filter.emoji = emoji;
        }
        
        const comments = await Comment.find(filter)
            .populate('author', ['username'])
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;