var dict = require("./dictionary");
var MongoClient = require('mongodb').MongoClient;

var JSZip = require("./../../mixed/lib/jszip.min");

const fs = require('fs');
const path = require('path');
var util = require("./util");

class Database {
    constructor() {
        this.db = null;
        this.tagCache = {};
        this.importedDicts = [];
    }

    async prepare() {
        console.log('database prepare....');
        if (this.db) {
            throw 'Database already initialized';
        }

        this.dbname = global.db_name;
        this.debug = !global.env || global.env !== 'prod';
        this.db_link = global.db_link;
        const database = await MongoClient.connect(this.db_link);
        this.db = await database.db(this.dbname);
        await this.addIndexes();

        var self = this;

        await self.importDbs();
    }

    async addIndexes() {
        await this.db.collection('terms').ensureIndex({expression: 1, reading: 1, dictionary: 1, score: 1, sequence: 1, lang: 1}, { unique: true });
        await this.db.collection('terms').ensureIndex({expression: 1 });
        await this.db.collection('terms').ensureIndex({reading: 1 });
        await this.db.collection('terms').ensureIndex({sequence: 1 });
        await this.db.collection('kanji').ensureIndex({character: 1, dictionary: 1, onyomi:1, kunyomi:1, tags: 1, lang: 1}, { unique: true });
        await this.db.collection('kanji').ensureIndex({character: 1 });

        await this.db.collection('kanjiMeta').ensureIndex({character: 1 });
        await this.db.collection('tagMeta').ensureIndex({name: 1 });
    }

    async importDbs() {
        const dictFiles = global.dictFiles;
        const self = this;

        dictFiles.en.forEach(async item => {
            console.log("Import en dictionary: " + item);

            try {
                await self.importDictionary(fs.readFileSync(path.resolve(item)), 'en', function (total, current) {
                    console.log("Dictionary: " + item + ", Total: " + total + ', current: ' + current);
                });
            } catch(e) {
                console.log(e.message);
            }
        });

        dictFiles.ru.forEach(async item => {
            console.log("Import ru dictionary: " + item);

            try {
                await self.importDictionary(fs.readFileSync(path.resolve(item)), 'ru', function (total, current) {
                    console.log("Dictionary: " + item + ", Total: " + total + ', current: ' + current);
                });
            } catch(e) {
                console.log(e.message);
            }
        });
    }

    async _truncate(db, callback) {
        await db.collection.remove({});
        callback();
    }

    async purge() {
        if (!this.db) {
            throw 'Database not initialized';
        }
        var self = this;

        await MongoClient.connect(this.db_link, async (err, db) => {
            if(err) throw err;

            await self._truncate(db, function() {
                db.close();
            });
        });
        this.db = null;
        this.tagCache = {};

        await this.prepare();
    }

    async getMany(collection, query, callback, debug) {
        if (!this.db) {
            throw 'Database not initialized';
        }
        const results = [];

        if (debug && this.debug) {
            console.log(debug);
        }

        const cursor = await this.db.collection(collection).find(query);

        for (let row = await cursor.next(); row != null; row = await cursor.next()) {
            results.push(callback(row));
        }

        return results;
    }

    async findTerms(term, titles) {
        return this.getMany(
            'terms',
            { $or: [ { expression: term }, { reading: term } ] },
            function(row) {
                return {
                    expression: row.expression,
                    reading: row.reading,
                    definitionTags: dict.dictFieldSplit(row.definitionTags || row.tags || ''),
                    termTags: dict.dictFieldSplit(row.termTags || ''),
                    rules: dict.dictFieldSplit(row.rules),
                    glossary: row.glossary,
                    score: row.score,
                    dictionary: row.dictionary,
                    id: row._id,
                    sequence: !row.sequence ? -1 : row.sequence,
                    lang: row.lang
                };
            },
            'findTerms: ' + term
        );
    }

    async findTermsExact(term, reading, titles) {
        return this.getMany(
            'terms',
            { expression: term },
            function(row) {
                if (row.reading === reading && titles.includes(row.dictionary)) {
                    return {
                        expression: row.expression,
                        reading: row.reading,
                        definitionTags: dict.dictFieldSplit(row.definitionTags || row.tags || ''),
                        termTags: dict.dictFieldSplit(row.termTags || ''),
                        rules: dict.dictFieldSplit(row.rules),
                        glossary: row.glossary,
                        score: row.score,
                        dictionary: row.dictionary,
                        id: row._id,
                        sequence: !row.sequence ? -1 : row.sequence,
                        lang: row.lang
                    };
                }
                return null;
            },
            'findTermsExact: ' + term
        );
    }

    async findTermsBySequence(sequence, mainDictionary) {
        return this.getMany(
            'terms',
            { sequence: sequence },
            function(row) {
                if (row.dictionary === mainDictionary) {
                    return {
                        expression: row.expression,
                        reading: row.reading,
                        definitionTags: dict.dictFieldSplit(row.definitionTags || row.tags || ''),
                        termTags: dict.dictFieldSplit(row.termTags || ''),
                        rules: dict.dictFieldSplit(row.rules),
                        glossary: row.glossary,
                        score: row.score,
                        dictionary: row.dictionary,
                        id: row._id,
                        sequence: !row.sequence ? -1 : row.sequence,
                        lang: row.lang
                    };
                }
                return null;
            },
            'findTermsBySequence: ' + sequence
        );
    }

    async findTermMeta(term, titles) {
        return this.getMany(
            'terms',
            { expression: term },
            function(row) {
                if (titles.includes(row.dictionary)) {
                    return {
                        mode: row.mode,
                        data: row.data,
                        dictionary: row.dictionary,
                        lang: row.lang
                    };
                }
                return null;
            },
            'findTermMeta: ' + term
        );
    }

    async findKanji(kanji, titles) {
        return this.getMany(
            'kanji',
            { character: kanji },
            function(row) {
                if (titles.includes(row.dictionary)) {
                    return {
                        character: row.character,
                        onyomi: dict.dictFieldSplit(row.onyomi),
                        kunyomi: dict.dictFieldSplit(row.kunyomi),
                        tags: dict.dictFieldSplit(row.tags),
                        glossary: row.meanings,
                        stats: row.stats,
                        dictionary: row.dictionary,
                        lang: row.lang,
                        source: [],
                        reasons: [],
                        score: 0,
                        expression: row.character
                    };
                }
                return null;
            },
            'findKanji: ' + kanji
        );
    }

    async findKanjiMeta(kanji, titles) {
        return this.getMany(
            'kanjiMeta',
            { character: kanji },
            function(row) {
                if (titles.includes(row.dictionary)) {
                    return {
                        mode: row.mode,
                        data: row.data,
                        dictionary: row.dictionary,
                        lang: row.lang
                    };
                }
                return null;
            },
            'findKanjiMeta: ' + kanji
        );
    }

    async findTagForTitle(name, title) {
        if (!this.db) {
            throw 'Database not initialized';
        }

        this.tagCache[title] = this.tagCache[title] || {};

        if (this.debug) {
            console.log('findTagForTitle(' + name + ', ' + title + ')');
        }

        let result = this.tagCache[title][name];
        if (!result) {

            const cursor = await this.db.collection('tagMeta').find({name: name});

            for (let row = await cursor.next(); row != null; row = await cursor.next()) {
                if (title === row.dictionary) {
                    result = row;
                }
            }

            this.tagCache[title][name] = result;
        }

        return result;
    }

    async summarize() {
        return this.getMany(
            'dictionaries',
            {},
            function(row) {
                return row;
            },
            'summarize'
        );
    }

    async insertMany(collection, entities) {
        await this.db.collection(collection).insertMany(entities);
    }

    async importDictionary(archive, lang, callback) {
        if (!this.db) {
            throw 'Database not initialized';
        }

        const indexDataLoaded = async summary => {
            if (summary.version > 3) {
                throw 'Unsupported dictionary version';
            }

            var self = this;

            await MongoClient.connect(this.db_link, async (err, database) => {

                if(err) throw err;

                const db = database.db(self.dbname);

                const options = util.utilBackend().options;

                const count = await db.collection('dictionaries').find({title: summary.title}).count();
                options.dictionaries[summary.title] = {enabled: true, allowSecondarySearches: true};

                if (count > 0) {
                    self.importedDicts.push(summary.title);

                    console.log('Dictionary `'+summary.title+'` is already imported');
                }

                await db.collection('dictionaries').insertOne(summary, async (err, res) => {
                    if(err) throw err;
                    await database.close();
                });

            });
        };

        const termDataLoaded = async (summary, entries, total, current) => {
            if (this.importedDicts.indexOf(summary.title) !== -1) {
                return;
            }
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            if (summary.version === 1) {
                for (const [expression, reading, definitionTags, rules, score, ...glossary] of entries) {
                    rows.push({
                        expression,
                        reading,
                        definitionTags,
                        rules,
                        score,
                        glossary,
                        dictionary: summary.title,
                        lang: summary.lang
                    });
                }
            } else {
                for (const [expression, reading, definitionTags, rules, score, glossary, sequence, termTags] of entries) {
                    rows.push({
                        expression,
                        reading,
                        definitionTags,
                        rules,
                        score,
                        glossary,
                        sequence,
                        termTags,
                        dictionary: summary.title,
                        lang: summary.lang
                    });
                }
            }

            await this.insertMany('terms', rows);
        };

        const termMetaDataLoaded = async (summary, entries, total, current) => {
            if (this.importedDicts.indexOf(summary.title) !== -1) {
                return;
            }
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [expression, mode, data] of entries) {
                rows.push({
                    expression,
                    mode,
                    data,
                    dictionary: summary.title,
                    lang: summary.lang
                });
            }

            await this.insertMany('termMeta', rows);
        };

        const kanjiDataLoaded = async (summary, entries, total, current)  => {
            if (this.importedDicts.indexOf(summary.title) !== -1) {
                return;
            }
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            if (summary.version === 1) {
                for (const [character, onyomi, kunyomi, tags, ...meanings] of entries) {
                    rows.push({
                        character,
                        onyomi,
                        kunyomi,
                        tags,
                        meanings,
                        dictionary: summary.title,
                        lang: summary.lang
                    });
                }
            } else {
                for (const [character, onyomi, kunyomi, tags, meanings, stats] of entries) {
                    rows.push({
                        character,
                        onyomi,
                        kunyomi,
                        tags,
                        meanings,
                        stats,
                        dictionary: summary.title,
                        lang: summary.lang
                    });
                }
            }

            await this.insertMany('kanji', rows);
        };

        const kanjiMetaDataLoaded = async (summary, entries, total, current) => {
            if (this.importedDicts.indexOf(summary.title) !== -1) {
                return;
            }
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [character, mode, data] of entries) {
                rows.push({
                    character,
                    mode,
                    data,
                    dictionary: summary.title,
                    lang: summary.lang
                });
            }

            await this.insertMany('kanjiMeta', rows);
        };

        const tagDataLoaded = async (summary, entries, total, current) => {
            if (this.importedDicts.indexOf(summary.title) !== -1) {
                return;
            }
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [name, category, order, notes, score] of entries) {
                const row = dict.dictTagSanitize({
                    name,
                    category,
                    order,
                    notes,
                    score,
                    dictionary: summary.title,
                    lang: summary.lang
                });

                rows.push(row);
            }

            await this.insertMany('tagMeta', rows);
        };

        return Database.importDictionaryZip(
            archive,
            lang,
            indexDataLoaded,
            termDataLoaded,
            termMetaDataLoaded,
            kanjiDataLoaded,
            kanjiMetaDataLoaded,
            tagDataLoaded
        );
    }

    static async importDictionaryZip(
        archive,
        lang,
        indexDataLoaded,
        termDataLoaded,
        termMetaDataLoaded,
        kanjiDataLoaded,
        kanjiMetaDataLoaded,
        tagDataLoaded
    ) {
        const zip = await JSZip.loadAsync(archive);

        const indexFile = zip.files['index.json'];
        if (!indexFile) {
            throw 'No dictionary index found in archive';
        }

        const index = JSON.parse(await indexFile.async('string'));
        if (!index.title || !index.revision) {
            throw 'Unrecognized dictionary format';
        }

        const summary = {
            title: index.title,
            revision: index.revision,
            sequenced: index.sequenced,
            version: index.format || index.version,
            lang: lang
        };

        try {
            await indexDataLoaded(summary);
        } catch(e) {
            console.log(e.message);
            return summary;
        }

        const buildTermBankName      = index => `term_bank_${index + 1}.json`;
        const buildTermMetaBankName  = index => `term_meta_bank_${index + 1}.json`;
        const buildKanjiBankName     = index => `kanji_bank_${index + 1}.json`;
        const buildKanjiMetaBankName = index => `kanji_meta_bank_${index + 1}.json`;
        const buildTagBankName       = index => `tag_bank_${index + 1}.json`;

        const countBanks = namer => {
            let count = 0;
            while (zip.files[namer(count)]) {
                ++count;
            }

            return count;
        };

        const termBankCount      = countBanks(buildTermBankName);
        const termMetaBankCount  = countBanks(buildTermMetaBankName);
        const kanjiBankCount     = countBanks(buildKanjiBankName);
        const kanjiMetaBankCount = countBanks(buildKanjiMetaBankName);
        const tagBankCount       = countBanks(buildTagBankName);

        let bankLoadedCount = 0;
        let bankTotalCount =
            termBankCount +
            termMetaBankCount +
            kanjiBankCount +
            kanjiMetaBankCount +
            tagBankCount;

        if (tagDataLoaded && index.tagMeta) {
            const bank = [];
            for (const name in index.tagMeta) {
                const tag = index.tagMeta[name];
                bank.push([name, tag.category, tag.order, tag.notes, tag.score]);
            }

            tagDataLoaded(summary, bank, ++bankTotalCount, bankLoadedCount++);
        }

        const loadBank = async (summary, namer, count, callback) => {
            if (callback) {
                for (let i = 0; i < count; ++i) {
                    const bankFile = zip.files[namer(i)];
                    const bank = JSON.parse(await bankFile.async('string'));
                    await callback(summary, bank, bankTotalCount, bankLoadedCount++);
                }
            }
        };

        await loadBank(summary, buildTermBankName, termBankCount, termDataLoaded);
        await loadBank(summary, buildTermMetaBankName, termMetaBankCount, termMetaDataLoaded);
        await loadBank(summary, buildKanjiBankName, kanjiBankCount, kanjiDataLoaded);
        await loadBank(summary, buildKanjiMetaBankName, kanjiMetaBankCount, kanjiMetaDataLoaded);
        await loadBank(summary, buildTagBankName, tagBankCount, tagDataLoaded);

        return summary;
    }
}

global.db = new Database();
module.exports.Database = Database;