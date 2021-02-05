const express = require('express');
const jwt = require('jsonwebtoken');

const {verifyToken, apiLimiter} = require('./middlewares');
const {Domain, User, Post, Hashtag} = require('../models');

const router = express.Router();

router.get('/token', apiLimiter, async (req, res) => {
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

router.get('/posts/my', apiLimiter, verifyToken, (req, res) => {
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

module.exports = router;