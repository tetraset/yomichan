
require("./backend");
var api = require("./api");
var md5 = require('md5');
var Memcached = require('memcached');
Memcached.config.poolSize = 25;
var memcached = new Memcached();

class Search {
    async searchTerms(word, lang) {
        try {
            if (word === '') {
                throw new Error('empty term');
            }
            var v = 'v1_terms_';
            var result = await this.getFromCache(v, word, lang);

            if (result) {
                return result;
            }

            const {length, definitions} = await api.apiTermsFind(word, lang);
            result = {length: length, definitions: definitions};
            this.setDataToCache(v, word, lang, result);

            return result;
        } catch (e) {
            this.onError(e);
            return {length: 0, definitions: []};
        }
    }

    async searchKanji(word, lang) {
        try {
            if (word === '') {
                throw new Error('empty kanji');
            }
            var v = 'v1_kanji_';
            var result = await this.getFromCache(v, word, lang);

            if (result) {
                return result;
            }

            const definitions = await api.apiKanjiFind(word, lang);
            this.setDataToCache(v, word, lang, definitions);

            return definitions;
        } catch (e) {
            this.onError(e);
            return [];
        }
    }

    onError(error) {
        console.log('Error');
        console.log(error);
    }

    async getFromCache(v, word, lang) {
        return new Promise((resolve, reject) => {
            memcached.get(v + md5(word) + lang, function (err, data) {
                if (err) {
                    reject(new Error(err));
                }

                resolve(data);
            });
        });
    }

    setDataToCache(v, word, lang, data) {
        memcached.set(v + md5(word) + lang, data, 0, function(err) {
            if (err) {
                console.log('memcache error');
                console.log(err);
            }
        });
    }
}

global.searchEngine = new Search();
module.exports.Search = Search;

