const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const url = require('url');

const {verifyToken, apiLimiter, apiLimiter_P} = require('./middlewares');
const {Domain, User, Post, Hashtag} = require('../models');

const router = express.Router();

router.use(async (req, res, next) => {
    const domain = await Domain.findOne({
        where: {host: url.parse(req.get('origin')).host},
    });
    if(domain) {
        if(domain.type === 'free'){
            req.type = 'free';
        }else{
            req.type = 'premium';
        }
        cors({
            origin: req.get('origin'),
            credentials: true,
        })(req, res, next);
    }else {
        next();
    }
});

router.post('/token', apiLimiter, async (req, res) => {
    const {clientSecret} = req.body;
    try {
        const domain = await Domain.findOne({
            where: {clientSecret},
            include: {
                model: User,
                attributes: ['id', 'nick'],
            },
        });
        if(!domain) {
            return res.status(401).json({
                code: 401,
                message: '권한 없음',
            });
        }
        const token = jwt.sign({
            id: domain.User.id,
            nick: domain.User.nick,
        }, process.env.JWT_SECRET, {
            expiresIn: '30m',
            issuer: 'nodebird',
        },);
        return res.json({
            code: 200,
            message: '토큰 발급',
            token,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            code: 500,
            message: '서버 에러',
        });
    }
});

router.get('/test', verifyToken, apiLimiter, (req, res) => {
    res.json(req.decoded);
});

router.get('/posts/my', verifyToken, apiLimiter, (req, res) => {
    Post.findAll({where: {UserId: req.decoded.id}})
        .then((posts) => {
            console.log(posts);
            res.json({
                code: 200,
                payload: posts,
            });
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({
                code: 500,
                message: '서버 에러',
            });
        });
});

router.get('/posts/hashtag/:hashtag', verifyToken, apiLimiter, async (req, res) => {
    try {
        const hashtag = await Hashtag.findOne({where: {title: req.params.title}});
        if(!hashtag) {
            return res.status(404).json({
                code: 404,
                message: '검색 결과가 없습니다',
            });
        }
        const posts = hashtag.getPosts();
        return res.json({
            code: 200,
            payload: posts,
        });
    } catch(err) {
        console.error(err);
        return res.status(500).json({
            code: 500,
            message: '서버 에러',
        });
    }
});

router.get('/:nick/follow', verifyToken, apiLimiter, async (req, res) => {
    try {
        const user = await User.findOne({
            where: {nick: req.params.nick},
            include: [{
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followers',
            }, {
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followings',
            },],
        });
        if(!user) {
            return res.status(404).json({
                code: 404,
                message: '검색 결과가 없습니다.',
            });
        }
        const followers = user.Followers;
        const followings = user.Followings;
        return res.json({
            code: 200,
            payload: {
                followers,
                followings,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500),json({
            code: 500,
            message: '서버 에러',
        });
    }
});

module.exports = router;