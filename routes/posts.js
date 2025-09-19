const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');

// @route   POST /posts
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, tags, imageUrl, videoUrl } = req.body;
        
        // Validation
        if (!title || !content) {
            return res.status(400).json({ msg: 'Title and content are required' });
        }
        
        const newPost = new Post({
            title: title.trim(),
            content: content.trim(),
            author: req.user.id,
            tags: tags ? tags.map(tag => tag.trim().toLowerCase()) : [],
            imageUrl: imageUrl ? String(imageUrl).trim() : '',
            videoUrl: videoUrl ? String(videoUrl).trim() : ''
        });
        
        const post = await newPost.save();
        await post.populate('author', ['username']);
        res.json(post);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ msg: 'Validation Error', errors });
        }
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   GET /posts/mine
// @desc    Get posts created by the authenticated user
// @access  Private
router.get('/mine', auth, async (req, res) => {
    try {
        console.log('[GET /api/posts/mine] user.id =', req.user?.id);
        const posts = await Post.find({ author: req.user.id })
            .populate('author', ['username'])
            .sort({ createdAt: -1 });
        console.log('[GET /api/posts/mine] count =', posts.length);
        return res.json(posts);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

// @route   GET /posts
router.get('/', async (req, res) => {
    try {
        const { authorId } = req.query;
        if (authorId) {
            console.log('[GET /api/posts] filter by authorId =', authorId);
        } else {
            console.log('[GET /api/posts] no author filter (all posts)');
        }
        const query = authorId ? { author: authorId } : {};
        const posts = await Post.find(query)
            .populate('author', ['username'])
            .sort({ createdAt: -1 });
        console.log('[GET /api/posts] count =', posts.length);
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /posts/:id
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author', ['username']);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT /posts/:id
router.put('/:id', auth, async (req, res) => {
    try {
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.author.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        const update = {
            ...req.body,
            updatedAt: Date.now()
        };
        if (typeof update.title === 'string') update.title = update.title.trim();
        if (typeof update.content === 'string') update.content = update.content.trim();
        if (Array.isArray(update.tags)) update.tags = update.tags.map(t => String(t).trim().toLowerCase());
        if (typeof update.imageUrl === 'string') update.imageUrl = update.imageUrl.trim();
        if (typeof update.videoUrl === 'string') update.videoUrl = update.videoUrl.trim();

        post = await Post.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).populate('author', ['username']);
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /posts/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        if (post.author.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        await post.deleteOne();
        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        // Check if user already liked this post
        const alreadyLiked = post.likes.find(like => like.user.toString() === req.user.id);
        
        if (alreadyLiked) {
            // Unlike the post
            post.likes = post.likes.filter(like => like.user.toString() !== req.user.id);
        } else {
            // Like the post
            post.likes.push({ user: req.user.id });
        }

        await post.save();
        await post.populate('author', ['username']);
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;