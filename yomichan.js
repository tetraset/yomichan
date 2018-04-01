"use strict";

// global config, you can change it
global.env = 'prod';
global.db_name = global.env && global.env == 'prod' ? 'jp_dict' : 'jp_dict_dev';
global.db_link = 'mongodb://localhost:27017/' + global.db_name;
global.dictFiles = {
    'en': [
        // add here jp-en dictionaries
    ],
    'ru': [
        'yomichan/dict/大日本語辞典.zip'
        // add here jp-ru dictionaries
    ]
};
// it must be identical to the port in a ./example/index.html page and ./yomichan/ext/fg/float.html page
global.port = 4101;
const hostname = 'localhost';

const http = require('http');
require("./yomichan/ext/bg/js/backend_search");
const url = require('url');

console.log('start server');

const server = http.createServer(async (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', 'http://' + hostname + ':8888');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    var q = url.parse(req.url, true).query;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    var lang = q && q.lang ? q.lang : 'en';
    var kanji = q && q.kanji ? q.kanji : null;
    var term = q && q.text ? q.text : null;
    var result = null;

    if (term) {
        result = await global.searchEngine.searchTerms(term, lang);
    } else if (kanji) {
        result = await global.searchEngine.searchKanji(kanji, lang);
    }

    if (result) {
        res.end(JSON.stringify(result));
    } else {
        res.end('{}');
    }
});


server.listen(global.port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

