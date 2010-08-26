require.paths.unshift('./support');
require.paths.unshift('./support/connect/lib');

require('proto');

var log = require('./lib/util/log').from(__filename),
    Express = require('express'),
    Assets = require('./lib/assets'),

    objToHTML = require('./lib/util/prettyJSON'),

    Content = require('./lib/content'),
    Jobs = require('./lib/jobs'),

    viewsDir = __dirname + '/views',
    publicDir = __dirname + '/public',
    port = parseInt(process.env.PORT || 3000),
    public_host = 'www.opowerjobs.com',
    Server = module.exports = Express.createServer();


//hack for testing poduction settings.  slug == heroku.
if (port != 3000 || __dirname.indexOf('slug') !== -1) {
    app.set('env', 'production');
}

//in case of crash. I've never seen this used, got it from somebody else's code.
process.title = 'opowerjobs.com';
process.addListener('uncaughtException', function (err, stack) {
    log('*************************************');
    log('************EXCEPTION****************');
    log('*************************************');
    log(err);
    log('*************************************');
});

function production(){
    Server.use(Express.conditionalGet());
    Server.use(Express.cache(1000 * 60 * 60));
    Server.use(Express.gzip());

    log('running in production mode');
    Assets.compress(true);
    Jobs.autoUpdate();
}

function development() {
    Server.use(Express.conditionalGet());
    Server.use(Express.cache(1000 * 2));
    Server.use(Express.gzip());


    log('running in development mode');
    //Server.use(Express.errorHandler({ dumpExceptions: true, showStack: true }));
}


function common() {
    Server.set('views', viewsDir);

    Server.helpers({
        debug: objToHTML,
        log: log
    });
    Server.use(Express.bodyDecoder());
    Server.use(Express.favicon(publicDir + '/favicon.ico'));
    Server.use(Assets.handler(publicDir));
    Server.use(Express.staticProvider(publicDir));
    Server.use(Server.router);

    Server.helpers({assets: Assets, currentPageID: false, pages: []});
}


Server.configure('development', development);
Server.configure('production', production);
Server.configure(common);

Server.error(function(err, req, res, next){
        log('*************************************');
        log('****************ERROR****************');
        log('*************************************');
        log(err);
        log('*************************************');
        res.render('error.ejs', { locals: { title: 'Error', message: objToHTML(err) } });
});


// Redirect other servers to the main one
Server.get(/.*/, function(req, res, next){
    var host = req.headers.host.split(':')[0];
    if (host != 'localhost' && host != public_host) {
        res.redirect('http://' + public_host + req.originalUrl);
    } else {
        next();
    }
});

Content.addHandlers( {Server: Server });
Jobs.addHandlers( { Server: Server});

//For Google Web Master
Server.get('/google97924ebf42be7c40.html', function(req, res) {
    res.send('google-site-verification: google97924ebf42be7c40.html');
    res.end();
});

// Required for 404's to return something
Server.get('/*', function(req, res){
    log('404: ' + req.url);
    var host = req.headers.host.split(':')[0];
    if (host == 'localhost') {
        res.render('error.ejs', { locals: { message: "404, man, 404. <br /> When in production the server will autmoatically redirect to an appropriate page." } });
    } else {
        var array = req.url.split('/');
        array.pop();
        res.redirect(array.join('/'));
    }
});

Server.listen(port, null);
log('Starting OPOWER JOBS on ' + port + '...');


