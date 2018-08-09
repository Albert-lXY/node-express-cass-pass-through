const express = require('express');
const path = require('path');
const ConnectCas = require('connect-cas2');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MemoryStore = require('session-memory-store')(session);
const proxy = require('http-proxy-middleware');
const app = express();

app.use(cookieParser());
app.use(session({
    name: 'NSESSIONID',
    secret: 'Hello I am a long long long secret',
    resave: true,//添加这行
    saveUninitialized: true,//添加这行
    store: new MemoryStore()  // or other session store
}));

const casClient = new ConnectCas({
    ignore: [
        /\/ignore/
    ],
    match: [],
    servicePrefix: 'http://192.168.111.233:3000',
    serverPath: 'http://192.168.111.212:8080',
    paths: {
        validate: '/cas/validate',
        serviceValidate: '/cas/serviceValidate',
        // proxy: '/cas/proxy',
        login: '/cas/login',
        logout: '/cas/logout',
        proxyCallback: ''
    },
    redirect: false,
    gateway: false,
    renew: false,
    slo: true,
    cache: {
        enable: false,
        ttl: 5 * 60 * 1000,
        filter: []
    },
    fromAjax: {
        header: 'x-client-ajax',
        status: 418
    }
});

app.use(casClient.core());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));

//拦截所有/api请求添加头信息后转发
app.all('/api\*', function (req, res) {
    let superagent = require('superagent');
    let path = req.path.replace('/api', '');
    let url = 'http://192.168.111.190:7300' + path;
    var sreq;
    if (req.method == 'GET') {
        sreq = superagent.get(url);
        sreq
            .query(req.query);
    } else if (req.method == 'HEAD') {
        sreq = superagent.head(url);
        sreq
            .query(req.query)
    } else if (req.method == 'POST') {
        sreq = superagent.post(url);
        sreq
            .send(req.body);
    } else if (req.method == 'PUT') {
        sreq = superagent.put(url);
        sreq
            .send(req.body);
    } else if (req.method == 'PATCH') {
        sreq = superagent.patch(url);
        sreq
            .send(req.body);
    }
    sreq
        .set('auth_id', 'dd')
        .set('auth_user', req.session.cas.user)
        .pipe(res)
        .on('end', function () {
            console.log(`请求${path}已完成！`);
        });
});

//登出cas
app.get('/logout', casClient.logout());

//把路由交给angular管理
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname + '/dist/index.html'));
})

app.listen(3000);
