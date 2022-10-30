var express = require("express")
var router = express.Router()
const cookieParser = require('cookie-parser');

// Google Auth
const {
    OAuth2Client
} = require('google-auth-library');
const CLIENT_ID = '655324710350-evlfdc95u22slcve3648t9bmf1prvia6.apps.googleusercontent.com'
const client = new OAuth2Client(CLIENT_ID);

router.use(express.json());
router.use(cookieParser());

router.get("/", checkAuthenticated, function (req, res) {
    if (req.user) {
        res.render("index", {
            loggedIn: true,
            email: req.user.email
        });
    } else {
        res.render("index", {
            loggedIn: false,
            email: "-"
        });
    }

});

router.get("/guest", function (req, res) {
    res.render("index", {
        loggedIn: false,
        email: "-"
    });
})

router.post('/login', (req, res) => {
    let token = req.body.token;
    let user = {};
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
    }
    verify()
        .then(() => {
            res.cookie('session-token', token);
            res.send(user)
        })
        .catch(console.error);
})

router.get('/logout', (req, res) => {
    res.clearCookie('session-token');
    res.redirect('/');
})

function checkAuthenticated(req, res, next) {
    let token = req.cookies['session-token'];
    let user = {};
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
        user.picture = payload.picture;
    }
    verify()
        .then(() => {
            req.user = user;
            next();
        })
        .catch(err => {
            res.redirect('/guest')
        })
}

module.exports = router