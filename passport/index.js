const passport = require('passport');
const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
const User = require('../models/user');
const Post = require('../models/post');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findOne({
            where: {id},
            include: [{
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followers'
            }, {
                model: User,
                attributes: ['id', 'nick'],
                as: 'Followings',
            }, {
                model: Post,
                attributes: ['id'],
                as: 'Likes',
            }],
        })
            .then(user => done(null, user))
            .catch(err => done(err));
    });

    local();
    kakao();
};