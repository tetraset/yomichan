(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var request = require("./request");

/*
 * AnkiConnect
 */

class AnkiConnect {
    constructor(server) {
        this.server = server;
    }

    async addNote(note) {
        var res = await
        this.ankiInvoke('addNote', {note}, 'POST');
        if (res.error) {
            this.error(res.error);
            return false;
        }
        return res.result;
    }

    async canAddNotes(notes) {
        var answerArr = [];
        if (notes.length) {
            for(var i = 0; i < notes.length; i++) {
                answerArr.push(true);
            }
        }
        return answerArr;
    }

    async getDeckNames() {
        try {
            var res = await this.ankiInvoke('deckNames', {}, 'GET');
            if (res.error) {
                this.error(res.error);
                return false;
            }
            return res.result;
        } catch(e) {
            this.error(e.message);
        }
    }

    async getModelNames() {
        return ["Basic"];
    }

    async getModelFieldNames(modelName) {
        return ["Front", "Back"];
    }

    async guiBrowse(noteId) {
        return [noteId];
    }

    async ankiInvoke(action, params, method) {
        if (method === 'GET') {
            var url = this.server + '?' + 'action=' + action + '&params=' + JSON.stringify(params);
            return await request.requestJson(url, method);
        }
        return await request.requestJson(this.server, method, {action:action, params:params});
    }

    error(msg) {
        throw msg;
    }
}


/*
 * AnkiNull
 */

class AnkiNull {
    async addNote(note) {
        return null;
    }

    async canAddNotes(notes) {
        return [];
    }

    async getDeckNames() {
        return [];
    }

    async getModelNames() {
        return [];
    }

    async getModelFieldNames(modelName) {
        return [];
    }

    async guiBrowse(query) {
        return [];
    }
}

module.exports.AnkiConnect = AnkiConnect;
module.exports.AnkiNull = AnkiNull;
},{"./request":8}],2:[function(require,module,exports){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var util = require("./util");
var dict = require("./dictionary");
var audio = require("./audio");
var handlebars = require("./handlebars");
var opt = require("./options");

async function apiOptionsSet(options) {
    util.utilBackend().onOptionsUpdated(options);
}

async function apiOptionsGet() {
    return util.utilBackend().options;
}

async function apiTermsFind(text, lang=null) {
    const options = util.utilBackend().options;
    const translator = util.utilBackend().translator;

    const searcher = {
        'merge': translator.findTermsMerged,
        'split': translator.findTermsSplit,
        'group': translator.findTermsGrouped
    }[options.general.resultOutputMode].bind(translator);

    const {definitions, length} = await searcher(
        text,
        dict.dictEnabledSet(options),
        options.scanning.alphanumeric,
        lang
    );

    return {
        length,
        definitions: definitions.slice(0, options.general.maxResults)
    };
}

async function apiKanjiFind(text, lang=null) {
    const options = util.utilBackend().options;
    const definitions = await util.utilBackend().translator.findKanji(text, dict.dictEnabledSet(options), lang);
    return definitions.slice(0, options.general.maxResults);
}

async function apiDefinitionAdd(definition, mode) {
    const options = util.utilBackend().options;

    if (mode !== 'kanji') {
        await audio.audioInject(
            definition,
            options.anki.terms.fields,
            options.general.audioSource
        );
    }

    const note = await dict.dictNoteFormat(definition, mode, options);
    return await util.utilBackend().anki.addNote(note);
}

async function apiDefinitionsAddable(definitions, modes) {
    const states = [];

    try {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                const note = await dict.dictNoteFormat(definition, mode, util.utilBackend().options);
                notes.push(note);
            }
        }

        const results = await util.utilBackend().anki.canAddNotes(notes);
        for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
            const state = {};
            for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                state[modes[modeOffset]] = results[resultBase + modeOffset];
            }

            states.push(state);
        }
    } catch (e) {
        console.log(e);
    }

    return states;
}

async function apiNoteView(noteId) {
    return util.utilBackend().anki.guiBrowse(noteId);
}

async function apiTemplateRender(template, data, dynamic) {
    if (dynamic) {
        return handlebars.handlebarsRenderDynamic(template, data);
    } else {
        return handlebars.handlebarsRenderStatic(template, data);
    }
}

async function apiCommandExec(command) {
    const handlers = {
        search: () => {
            console.log('search tab');
            //chrome.tabs.create({url: chrome.extension.getURL('/bg/search.html')});
        },

        help: () => {
            console.log('help tab');
            //chrome.tabs.create({url: 'https://foosoft.net/projects/yomichan/'});
        },

        options: () => {
            console.log('options tab');
            //chrome.runtime.openOptionsPage();
        },

        toggle: async () => {
            const options = util.utilBackend().options;
            options.general.enable = !options.general.enable;
            await opt.optionsSave(options);
            await apiOptionsSet(options);
        }
    };

    const handler = handlers[command];
    if (handler) {
        handler();
    }
}

async function apiAudioGetUrl(definition, source) {
    return audio.audioBuildUrl(definition, source);
}

module.exports.apiOptionsSet = apiOptionsSet;
module.exports.apiOptionsGet = apiOptionsGet;
module.exports.apiTermsFind = apiTermsFind;
module.exports.apiKanjiFind = apiKanjiFind;
module.exports.apiDefinitionAdd = apiDefinitionAdd;
module.exports.apiNoteView = apiNoteView;
module.exports.apiTemplateRender = apiTemplateRender;
module.exports.apiCommandExec = apiCommandExec;
module.exports.apiAudioGetUrl = apiAudioGetUrl;
module.exports.apiDefinitionsAddable = apiDefinitionsAddable;

},{"./audio":3,"./dictionary":4,"./handlebars":6,"./options":7,"./util":10}],3:[function(require,module,exports){
/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const wanakana = require('./../../mixed/lib/wanakana.min');

async function audioBuildUrl(definition, mode, cache={}) {
    if (mode === 'jpod101') {
        let kana = definition.reading;
        let kanji = definition.expression;

        if (!kana && wanakana.isHiragana(kanji)) {
            kana = kanji;
            kanji = null;
        }

        const params = [];
        if (kanji) {
            params.push(`kanji=${encodeURIComponent(kanji)}`);
        }
        if (kana) {
            params.push(`kana=${encodeURIComponent(kana)}`);
        }

        const url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.join('&')}`;
        return Promise.resolve(url);
    } else if (mode === 'jpod101-alternate') {
        return new Promise((resolve, reject) => {
            const response = cache[definition.expression];
            if (response) {
                resolve(response);
            } else {
                const data = {
                    post: 'dictionary_reference',
                    match_type: 'exact',
                    search_query: definition.expression
                };

                const params = [];
                for (const key in data) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
                }

                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.addEventListener('error', () => reject('Failed to scrape audio data'));
                xhr.addEventListener('load', () => {
                    cache[definition.expression] = xhr.responseText;
                    resolve(xhr.responseText);
                });

                xhr.send(params.join('&'));
            }
        }).then(response => {
            const dom = new DOMParser().parseFromString(response, 'text/html');
            for (const row of dom.getElementsByClassName('dc-result-row')) {
                try {
                    const url = row.getElementsByClassName('ill-onebuttonplayer').item(0).getAttribute('data-url');
                    const reading = row.getElementsByClassName('dc-vocab_kana').item(0).innerText;
                    if (url && reading && (!definition.reading || definition.reading === reading)) {
                        return url;
                    }
                } catch (e) {
                    // NOP
                }
            }
        });
    } else if (mode === 'jisho') {
        return new Promise((resolve, reject) => {
            const response = cache[definition.expression];
            if (response) {
                resolve(response);
            } else {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `http://jisho.org/search/${definition.expression}`);
                xhr.addEventListener('error', () => reject('Failed to scrape audio data'));
                xhr.addEventListener('load', () => {
                    cache[definition.expression] = xhr.responseText;
                    resolve(xhr.responseText);
                });

                xhr.send();
            }
        }).then(response => {
            try {
                const dom = new DOMParser().parseFromString(response, 'text/html');
                const audio = dom.getElementById(`audio_${definition.expression}:${definition.reading}`);
                if (audio) {
                    return audio.getElementsByTagName('source').item(0).getAttribute('src');
                }
            } catch (e) {
                // NOP
            }
        });
    }
    else {
        return Promise.resolve();
    }
}

function audioBuildFilename(definition) {
    if (definition.reading || definition.expression) {
        let filename = 'yomichan';
        if (definition.reading) {
            filename += `_${definition.reading}`;
        }
        if (definition.expression) {
            filename += `_${definition.expression}`;
        }

        return filename += '.mp3';
    }
}

async function audioInject(definition, fields, mode) {
    let usesAudio = false;
    for (const name in fields) {
        if (fields[name].includes('{audio}')) {
            usesAudio = true;
            break;
        }
    }

    if (!usesAudio) {
        return true;
    }

    try {
        let audioSourceDefinition = definition;
        if (definition.hasOwnProperty('expressions')) {
            audioSourceDefinition = definition.expressions[0];
        }

        const url = await audioBuildUrl(audioSourceDefinition, mode);
        const filename = audioBuildFilename(audioSourceDefinition);

        if (url && filename) {
            definition.audio = {url, filename};
        }

        return true;
    } catch (e) {
        return false;
    }
}

module.exports.audioBuildUrl = audioBuildUrl;
module.exports.audioInject = audioInject;
module.exports.audioBuildFilename = audioBuildFilename;

},{"./../../mixed/lib/wanakana.min":16}],4:[function(require,module,exports){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var api = require("./api");

function dictEnabledSet(options) {
    const dictionaries = {};
    for (const title in options.dictionaries) {
        const dictionary = options.dictionaries[title];
        if (dictionary.enabled) {
            dictionaries[title] = dictionary;
        }
    }

    return dictionaries;
}

function dictConfigured(options) {
    for (const title in options.dictionaries) {
        if (options.dictionaries[title].enabled) {
            return true;
        }
    }

    return false;
}

function dictRowsSort(rows, options) {
    return rows.sort((ra, rb) => {
        const pa = (options.dictionaries[ra.title] || {}).priority || 0;
        const pb = (options.dictionaries[rb.title] || {}).priority || 0;
        if (pa > pb) {
            return -1;
        } else if (pa < pb) {
            return 1;
        } else {
            return 0;
        }
    });
}

function dictTermsSort(definitions, dictionaries=null, lang=null) {
    var definitionsLangFilter = definitions.filter(function (v) {
        return lang !== null ? v && (v.lang == lang || v.lang == 'en') : v;
    });

    if (definitionsLangFilter.length === 0) {
        definitionsLangFilter = definitions.filter(function (v) {
            return v;
        });
    }

    return definitionsLangFilter.sort((v1, v2) => {
        if (dictionaries !== null) {
            const p1 = (dictionaries[v1.dictionary] || {}).priority || 0;
            const p2 = (dictionaries[v2.dictionary] || {}).priority || 0;
            if (p1 > p2) {
                return -1;
            } else if (p1 < p2) {
                return 1;
            }
        }

        const sl1 = v1.source.length;
        const sl2 = v2.source.length;
        if (sl1 > sl2) {
            return -1;
        }
        else if (sl1 < sl2) {
            return 1;
        }

        if (lang !== null) {
            if (v1.lang == lang && v2.lang != lang) {
                return -1;
            } else if (v2.lang == lang && v1.lang != lang) {
                return 1;
            }
        }

        const rl1 = v1.reasons.length;
        const rl2 = v2.reasons.length;
        if (rl1 < rl2) {
            return -1;
        }
        else if (rl1 > rl2) {
            return 1;
        }

        const s1 = v1.score;
        const s2 = v2.score;
        if (s1 > s2) {
            return -1;
        }
        else if (s1 < s2) {
            return 1;
        }

        return v2.expression.toString().localeCompare(v1.expression.toString());
    });
}

function dictTermsUndupe(definitions) {
    const definitionGroups = {};
    for (const definition of definitions) {
        const definitionExisting = definitionGroups[definition.id];
        if (!definitionGroups.hasOwnProperty(definition.id) || definition.expression.length > definitionExisting.expression.length) {
            definitionGroups[definition.id] = definition;
        }
    }

    const definitionsUnique = [];
    for (const key in definitionGroups) {
        definitionsUnique.push(definitionGroups[key]);
    }

    return definitionsUnique;
}

function dictTermsCompressTags(definitions) {
    let lastDictionary = '';
    let lastPartOfSpeech = '';

    for (const definition of definitions) {
        const dictionary = JSON.stringify(definition.definitionTags.filter(tag => tag.category === 'dictionary').map(tag => tag.name).sort());
        const partOfSpeech = JSON.stringify(definition.definitionTags.filter(tag => tag.category === 'partOfSpeech').map(tag => tag.name).sort());

        const filterOutCategories = [];

        if (lastDictionary === dictionary) {
            filterOutCategories.push('dictionary');
        } else {
            lastDictionary = dictionary;
            lastPartOfSpeech = '';
        }

        if (lastPartOfSpeech === partOfSpeech) {
            filterOutCategories.push('partOfSpeech');
        } else {
            lastPartOfSpeech = partOfSpeech;
        }

        definition.definitionTags = definition.definitionTags.filter(tag => !filterOutCategories.includes(tag.category));
    }
}

function dictTermsGroup(definitions, dictionaries) {
    const groups = {};
    for (const definition of definitions) {
        const key = [definition.source, definition.expression].concat(definition.reasons);
        if (definition.reading) {
            key.push(definition.reading);
        }

        const group = groups[key];
        if (group) {
            group.push(definition);
        } else {
            groups[key] = [definition];
        }
    }

    const results = [];
    for (const key in groups) {
        const groupDefs = groups[key];
        const firstDef = groupDefs[0];
        dictTermsSort(groupDefs, dictionaries);
        results.push({
            definitions: groupDefs,
            expression: firstDef.expression,
            reading: firstDef.reading,
            reasons: firstDef.reasons,
            termTags: groupDefs[0].termTags,
            score: groupDefs.reduce((p, v) => v.score > p ? v.score : p, Number.MIN_SAFE_INTEGER),
            source: firstDef.source
        });
    }

    return dictTermsSort(results);
}

function dictTermsMergeBySequence(definitions, mainDictionary) {
    const definitionsBySequence = {'-1': []};
    for (const definition of definitions) {
        if (mainDictionary === definition.dictionary && definition.sequence >= 0) {
            if (!definitionsBySequence[definition.sequence]) {
                definitionsBySequence[definition.sequence] = {
                    reasons: definition.reasons,
                    score: Number.MIN_SAFE_INTEGER,
                    expression: new Set(),
                    reading: new Set(),
                    expressions: new Map(),
                    source: definition.source,
                    dictionary: definition.dictionary,
                    definitions: []
                };
            }
            const score = Math.max(definitionsBySequence[definition.sequence].score, definition.score);
            definitionsBySequence[definition.sequence].score = score;
        } else {
            definitionsBySequence['-1'].push(definition);
        }
    }

    return definitionsBySequence;
}

function dictTermsMergeByGloss(result, definitions, appendTo, mergedIndices) {
    const definitionsByGloss = appendTo || {};
    for (const [index, definition] of definitions.entries()) {
        if (appendTo) {
            let match = false;
            for (const expression of result.expressions.keys()) {
                if (definition.expression === expression) {
                    for (const reading of result.expressions.get(expression).keys()) {
                        if (definition.reading === reading) {
                            match = true;
                            break;
                        }
                    }
                }
                if (match) {
                    break;
                }
            }

            if (!match) {
                continue;
            } else if (mergedIndices) {
                mergedIndices.add(index);
            }
        }

        const gloss = JSON.stringify(definition.glossary.concat(definition.dictionary));
        if (!definitionsByGloss[gloss]) {
            definitionsByGloss[gloss] = {
                expression: new Set(),
                reading: new Set(),
                definitionTags: [],
                glossary: definition.glossary,
                source: result.source,
                reasons: [],
                score: definition.score,
                id: definition.id,
                dictionary: definition.dictionary
            };
        }

        definitionsByGloss[gloss].expression.add(definition.expression);
        definitionsByGloss[gloss].reading.add(definition.reading);

        result.expression.add(definition.expression);
        result.reading.add(definition.reading);

        // result->expressions[ Expression1[ Reading1[ Tag1, Tag2 ] ], Expression2, ... ]
        if (!result.expressions.has(definition.expression)) {
            result.expressions.set(definition.expression, new Map());
        }
        if (!result.expressions.get(definition.expression).has(definition.reading)) {
            result.expressions.get(definition.expression).set(definition.reading, new Set());
        }

        for (const tag of definition.definitionTags) {
            if (!definitionsByGloss[gloss].definitionTags.find(existingTag => existingTag.name === tag.name)) {
                definitionsByGloss[gloss].definitionTags.push(tag);
            }
        }

        for (const tag of definition.termTags) {
            result.expressions.get(definition.expression).get(definition.reading).add(tag);
        }
    }

    for (const gloss in definitionsByGloss) {
        const definition = definitionsByGloss[gloss];
        definition.only = [];
        if (!utilSetEqual(definition.expression, result.expression)) {
            for (const expression of utilSetIntersection(definition.expression, result.expression)) {
                definition.only.push(expression);
            }
        }
        if (!utilSetEqual(definition.reading, result.reading)) {
            for (const reading of utilSetIntersection(definition.reading, result.reading)) {
                definition.only.push(reading);
            }
        }
    }

    return definitionsByGloss;
}

function dictTagBuildSource(name) {
    return dictTagSanitize({name, category: 'dictionary', order: 100});
}

function dictTagSanitize(tag) {
    tag.name = tag.name || 'untitled';
    tag.category = tag.category || 'default';
    tag.notes = tag.notes || '';
    tag.order = tag.order || 0;
    tag.score = tag.score || 0;
    return tag;
}

function dictTagsSort(tags) {
    return tags.sort((v1, v2) => {
        const order1 = v1.order;
        const order2 = v2.order;
        if (order1 < order2) {
            return -1;
        } else if (order1 > order2) {
            return 1;
        }

        const name1 = v1.name;
        const name2 = v2.name;
        if (name1 < name2) {
            return -1;
        } else if (name1 > name2) {
            return 1;
        }

        return 0;
    });
}

function dictFieldSplit(field) {
    return field.length === 0 ? [] : field.split(' ');
}

async function dictFieldFormat(field, definition, mode, options) {
    const markers = [
        'audio',
        'character',
        'cloze-body',
        'cloze-prefix',
        'cloze-suffix',
        'dictionary',
        'expression',
        'furigana',
        'furigana-plain',
        'glossary',
        'glossary-brief',
        'kunyomi',
        'onyomi',
        'reading',
        'sentence',
        'tags',
        'url'
    ];

    for (const marker of markers) {
        const data = {
            marker,
            definition,
            group: options.general.resultOutputMode === 'group',
            merge: options.general.resultOutputMode === 'merge',
            modeTermKanji: mode === 'term-kanji',
            modeTermKana: mode === 'term-kana',
            modeKanji: mode === 'kanji',
            compactGlossaries: options.general.compactGlossaries
        };

        const html = await api.apiTemplateRender(options.anki.fieldTemplates, data, true);
        field = field.replace(`{${marker}}`, html);
    }

    return field;
}

async function dictNoteFormat(definition, mode, options) {
    const note = {fields: {}, tags: options.anki.tags};
    let fields = [];

    if (mode === 'kanji') {
        fields = options.anki.kanji.fields;
        note.deckName = options.anki.kanji.deck;
        note.modelName = options.anki.kanji.model;
    } else {
        fields = options.anki.terms.fields;
        note.deckName = options.anki.terms.deck;
        note.modelName = options.anki.terms.model;

        if (definition.audio) {
            const audio = {
                url: definition.audio.url,
                filename: definition.audio.filename,
                skipHash: '7e2c2f954ef6051373ba916f000168dc',
                fields: []
            };

            for (const name in fields) {
                if (fields[name].includes('{audio}')) {
                    audio.fields.push(name);
                }
            }

            if (audio.fields.length > 0) {
                note.audio = audio;
            }
        }
    }

    for (const name in fields) {
        note.fields[name] = await dictFieldFormat(fields[name], definition, mode, options);
    }

    return note;
}

module.exports.dictEnabledSet = dictEnabledSet;
module.exports.dictConfigured = dictConfigured;
module.exports.dictRowsSort = dictRowsSort;
module.exports.dictTermsSort = dictTermsSort;
module.exports.dictTermsUndupe = dictTermsUndupe;
module.exports.dictTermsCompressTags = dictTermsCompressTags;
module.exports.dictTermsGroup = dictTermsGroup;
module.exports.dictTermsMergeBySequence = dictTermsMergeBySequence;
module.exports.dictTermsMergeByGloss = dictTermsMergeByGloss;
module.exports.dictTagBuildSource = dictTagBuildSource;
module.exports.dictTagSanitize = dictTagSanitize;
module.exports.dictTagsSort = dictTagsSort;
module.exports.dictFieldSplit = dictFieldSplit;
module.exports.dictFieldFormat = dictFieldFormat;
module.exports.dictNoteFormat = dictNoteFormat;
},{"./api":2}],5:[function(require,module,exports){
(function (global){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var ank = require("./anki");
var api = require("./api");
var opt = require("./options");
var util = require("./util");

class Backend {
    constructor() {
        this.anki = new ank.AnkiNull();
        this.options = null;
    }

    async prepare() {
        await api.apiOptionsSet(await opt.optionsLoad());
    }

    async getOptions() {
        return await api.apiOptionsGet();
    }

    onOptionsUpdated(options) {
        this.options = util.utilIsolate(options);

        if (options.anki.enable) {
            this.anki = new ank.AnkiConnect(options.anki.server);
        } else {
            this.anki = new ank.AnkiNull();
        }
    }

    onCommand(command) {
        api.apiCommandExec(command);
    }

    onMessage({action, params}, sender, callback) {
        const forward = (promise, callback) => {
            return promise.then(result => {
                callback({result});
            }).catch(error => {
                callback({error: error.toString ? error.toString() : error});
            });
        };

        const handlers = {
            optionsGet: ({callback}) => {
                forward(api.apiOptionsGet(), callback);
            },

            optionsSet: ({options, callback}) => {
                forward(api.apiOptionsSet(options), callback);
            },

            definitionAdd: ({definition, mode, callback}) => {
                forward(api.apiDefinitionAdd(definition, mode), callback);
            },

            definitionsAddable: ({definitions, modes, callback}) => {
                forward(api.apiDefinitionsAddable(definitions, modes), callback);
            },

            noteView: ({noteId}) => {
                forward(api.apiNoteView(noteId), callback);
            },

            templateRender: ({template, data, dynamic, callback}) => {
                forward(api.apiTemplateRender(template, data, dynamic), callback);
            },

            commandExec: ({command, callback}) => {
                forward(api.apiCommandExec(command), callback);
            },

            audioGetUrl: ({definition, source, callback}) => {
                forward(api.apiAudioGetUrl(definition, source), callback);
            }
        };

        const handler = handlers[action];
        if (handler) {
            params.callback = callback;
            handler(params);
        }

        return true;
    }
}

global.yomichan_backend = new Backend();
global.yomichan_backend.prepare();

module.exports.yomichan_backend = global.yomichan_backend;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./anki":1,"./api":2,"./options":7,"./util":10}],6:[function(require,module,exports){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var jap = require("./../../mixed/js/japanese");
var Handlebars = require('./../../mixed/lib/handlebars.min');
var templ = require("./templates");

Handlebars.templates = templ.templates;

function handlebarsEscape(text) {
    return Handlebars.Utils.escapeExpression(text);
}

function handlebarsDumpObject(options) {
    const dump = JSON.stringify(options.fn(this), null, 4);
    return handlebarsEscape(dump);
}

function handlebarsFurigana(options) {
    const definition = options.fn(this);
    const segs = jap.jpDistributeFurigana(definition.expression, definition.reading);

    let result = '';
    for (const seg of segs) {
        if (seg.furigana) {
            result += `<ruby>${seg.text}<rt>${seg.furigana}</rt></ruby>`;
        } else {
            result += seg.text;
        }
    }

    return result;
}

function handlebarsFuriganaPlain(options) {
    const definition = options.fn(this);
    const segs = jap.jpDistributeFurigana(definition.expression, definition.reading);

    let result = '';
    for (const seg of segs) {
        if (seg.furigana) {
            result += `${seg.text}[${seg.furigana}]`;
        } else {
            result += seg.text;
        }
    }

    return result;
}

function handlebarsKanjiLinks(options) {
    let result = '';
    for (const c of options.fn(this)) {
        if (jap.jpIsKanji(c)) {
            result += `<a href="#" class="kanji-link">${c}</a>`;
        } else {
            result += c;
        }
    }

    return result;
}

function handlebarsMultiLine(options) {
    return options.fn(this).split('\n').join('<br>');
}

function handlebarsRegisterHelpers() {
    if (Handlebars.partials !== Handlebars.templates) {
        Handlebars.partials = Handlebars.templates;
        Handlebars.registerHelper('dumpObject', handlebarsDumpObject);
        Handlebars.registerHelper('furigana', handlebarsFurigana);
        Handlebars.registerHelper('furiganaPlain', handlebarsFuriganaPlain);
        Handlebars.registerHelper('kanjiLinks', handlebarsKanjiLinks);
        Handlebars.registerHelper('multiLine', handlebarsMultiLine);
    }
}

function handlebarsRenderStatic(name, data) {
    handlebarsRegisterHelpers();
    return Handlebars.templates[name + '.html'](data).trim();
}

function handlebarsRenderDynamic(template, data) {
    handlebarsRegisterHelpers();

    Handlebars.yomichan_cache = Handlebars.yomichan_cache || {};
    let instance = Handlebars.yomichan_cache[template];
    if (!instance) {
        instance = Handlebars.yomichan_cache[template] = Handlebars.compile(template);
    }

    return instance(data).trim();
}

module.exports.handlebarsEscape = handlebarsEscape;
module.exports.handlebarsDumpObject = handlebarsDumpObject;
module.exports.handlebarsFurigana = handlebarsFurigana;
module.exports.handlebarsFuriganaPlain = handlebarsFuriganaPlain;
module.exports.handlebarsKanjiLinks = handlebarsKanjiLinks;
module.exports.handlebarsMultiLine = handlebarsMultiLine;
module.exports.handlebarsRegisterHelpers = handlebarsRegisterHelpers;
module.exports.handlebarsRenderStatic = handlebarsRenderStatic;
module.exports.handlebarsRenderDynamic = handlebarsRenderDynamic;

},{"./../../mixed/js/japanese":14,"./../../mixed/lib/handlebars.min":15,"./templates":9}],7:[function(require,module,exports){
/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var api = require("./api");
var util = require("./util");

function optionsFieldTemplates() {
    return `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#if definitionTags~}}<i>({{#each definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})</i> {{/if~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if glossary.[1]~}}
        {{~#if compactGlossaries~}}
            {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{#unless @last}} | {{/unless}}{{/each}}
        {{~else~}}
            <ul>{{#each glossary}}<li>{{#multiLine}}{{.}}{{/multiLine}}</li>{{/each}}</ul>
        {{~/if~}}
    {{~else~}}
        {{~#multiLine}}{{glossary.[0]}}{{/multiLine~}}
    {{~/if~}}
{{/inline}}

{{#*inline "audio"}}{{/inline}}

{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{#*inline "dictionary"}}
    {{~definition.dictionary~}}
{{/inline}}

{{#*inline "expression"}}
    {{~#if merge~}}
        {{~#if modeTermKana~}}
            {{~#each definition.reading~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~else~}}
                {{~#each definition.expression~}}
                    {{{.}}}
                    {{~#unless @last}}、{{/unless~}}
                {{~/each~}}
            {{~/each~}}
        {{~else~}}
            {{~#each definition.expression~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~/each~}}
        {{~/if~}}
    {{~else~}}
        {{~#if modeTermKana~}}
            {{~#if definition.reading~}}
                {{definition.reading}}
            {{~else~}}
                {{definition.expression}}
            {{~/if~}}
        {{~else~}}
            {{definition.expression}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}

{{#*inline "furigana"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~#furigana}}{{{.}}}{{/furigana~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{#furigana}}{{{definition}}}{{/furigana}}
    {{~/if~}}
{{/inline}}

{{#*inline "furigana-plain"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~#furiganaPlain}}{{{.}}}{{/furiganaPlain~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{#furiganaPlain}}{{{definition}}}{{/furiganaPlain}}
    {{~/if~}}
{{/inline}}

{{#*inline "glossary"}}
    <div style="text-align: left;">
    {{~#if modeKanji~}}
        {{~#if definition.glossary.[1]~}}
            <ol>{{#each definition.glossary}}<li>{{.}}</li>{{/each}}</ol>
        {{~else~}}
            {{definition.glossary.[0]}}
        {{~/if~}}
    {{~else~}}
        {{~#if group~}}
            {{~#if definition.definitions.[1]~}}
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries~}}
            {{~/if~}}
        {{~else if merge~}}
            {{~#if definition.definitions.[1]~}}
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries~}}
            {{~/if~}}
        {{~else~}}
            {{~> glossary-single definition brief=brief compactGlossaries=compactGlossaries~}}
        {{~/if~}}
    {{~/if~}}
    </div>
{{/inline}}

{{#*inline "glossary-brief"}}
    {{~> glossary brief=true ~}}
{{/inline}}

{{#*inline "kunyomi"}}
    {{~#each definition.kunyomi}}{{.}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "onyomi"}}
    {{~#each definition.onyomi}}{{.}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "reading"}}
    {{~#unless modeTermKana~}}
        {{~#if merge~}}
            {{~#each definition.reading~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~/each~}}
        {{~else~}}
            {{~definition.reading~}}
        {{~/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "sentence"}}
    {{~#if definition.cloze}}{{definition.cloze.sentence}}{{/if~}}
{{/inline}}

{{#*inline "cloze-prefix"}}
    {{~#if definition.cloze}}{{definition.cloze.prefix}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body"}}
    {{~#if definition.cloze}}{{definition.cloze.body}}{{/if~}}
{{/inline}}

{{#*inline "cloze-suffix"}}
    {{~#if definition.cloze}}{{definition.cloze.suffix}}{{/if~}}
{{/inline}}

{{#*inline "tags"}}
    {{~#each definition.definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "url"}}
    <a href="{{definition.url}}">{{definition.url}}</a>
{{/inline}}

{{~> (lookup . "marker") ~}}
`.trim();
}

function optionsSetDefaults(options) {
    const defaults = {
        general: {
            enable: true,
            audioSource: 'jpod101',
            audioVolume: 100,
            resultOutputMode: 'split',
            debugInfo: false,
            maxResults: 32,
            showAdvanced: false,
            popupWidth: 400,
            popupHeight: 250,
            popupOffset: 10,
            showGuide: true,
            compactTags: false,
            compactGlossaries: false,
            mainDictionary: '',
            groupResults: true
        },

        scanning: {
            middleMouse: true,
            selectText: true,
            alphanumeric: true,
            autoHideResults: false,
            delay: 20,
            length: 10,
            modifier: 'none'
        },

        dictionaries: {},

        // Here you can enable user dictionary logic. Pay attention on server side implementation
        anki: {
            enable: false,
            server: '/api/mydictionary',
            tags: ['yomichan'],
            sentenceExt: 200,
            terms: {deck: '', model: '', fields: {'audio':'{audio}','cloze-body':'{cloze-body}','cloze-prefix':'{cloze-prefix}','cloze-suffix':'{cloze-suffix}','dictionary':'{dictionary}','expression':'{expression}','furigana':'{furigana}','furigana-plain':'{furigana-plain}','glossary':'{glossary}','reading':'{reading}','sentence':'{sentence}','tags':'{tags}','url':'{url}'}},
            kanji: {deck: '', model: '', fields: {'character':'{character}','cloze-body':'{cloze-body}','cloze-prefix':'{cloze-prefix}','cloze-suffix':'{cloze-suffix}','dictionary':'{dictionary}','glossary':'{glossary}','kunyomi':'{kunyomi}','onyomi':'{onyomi}','sentence':'{sentence}','url':'{url}'}},
            fieldTemplates: optionsFieldTemplates()
        }
    };

    const combine = (target, source) => {
        for (const key in source) {
            if (!target.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    };

    combine(options, defaults);
    combine(options.general, defaults.general);
    combine(options.scanning, defaults.scanning);
    combine(options.anki, defaults.anki);
    combine(options.anki.terms, defaults.anki.terms);
    combine(options.anki.kanji, defaults.anki.kanji);

    return options;
}

function optionsVersion(options) {
    const fixups = [
        () => {},
        () => {},
        () => {},
        () => {},
        () => {
            if (options.general.audioPlayback) {
                options.general.audioSource = 'jpod101';
            } else {
                options.general.audioSource = 'disabled';
            }
        },
        () => {
            options.general.showGuide = false;
        },
        () => {
            if (options.scanning.requireShift) {
                options.scanning.modifier = 'shift';
            } else {
                options.scanning.modifier = 'none';
            }
        },
        () => {
            if (options.general.groupResults) {
                options.general.resultOutputMode = 'group';
            } else {
                options.general.resultOutputMode = 'split';
            }
            if (util.utilStringHashCode(options.anki.fieldTemplates) !== -805327496) {
                options.anki.fieldTemplates = `{{#if merge}}${optionsFieldTemplates()}{{else}}${options.anki.fieldTemplates}{{/if}}`;
            } else {
                options.anki.fieldTemplates = optionsFieldTemplates();
            }
        },
        () => {
            options.anki.fieldTemplates = optionsFieldTemplates();
        }
    ];

    optionsSetDefaults(options);
    if (!options.hasOwnProperty('version')) {
        options.version = fixups.length;
    }

    while (options.version < fixups.length) {
        fixups[options.version++]();
    }

    return options;
}

function optionsLoad() {
    return optionsVersion({});
}

function optionsSave(options) {
    api.apiOptionsSet(options);
}

module.exports.optionsFieldTemplates = optionsFieldTemplates;
module.exports.optionsSetDefaults = optionsSetDefaults;
module.exports.optionsVersion = optionsVersion;
module.exports.optionsLoad = optionsLoad;
module.exports.optionsSave = optionsSave;

},{"./api":2,"./util":10}],8:[function(require,module,exports){
/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


async function requestJson(url, action, params) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            contentType: 'application/json',
            data: action !== 'GET' && params ? JSON.stringify(params) : {},
            dataType: 'json',
            method: action,
            timeout: 5*1000
        }).done(function(data) {
            resolve(data)
        }).fail(function(jqXHR, textStatus, errorThrown) {
            reject(textStatus)
        });
    }).then(data => {
        return data;
    });
}

module.exports.requestJson = requestJson;

},{}],9:[function(require,module,exports){
var Handlebars = require('./../../mixed/lib/handlebars.min');
(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['dictionary.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "    <p class=\"text-warning\">This dictionary is outdated and may not support new extension features; please import the latest version.</p>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "checked";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"dict-group well well-sm\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">\n    <h4><span class=\"text-muted glyphicon glyphicon-book\"></span> "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + " <small>rev."
    + alias4(((helper = (helper = helpers.revision || (depth0 != null ? depth0.revision : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"revision","hash":{},"data":data}) : helper)))
    + "</small></h4>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.outdated : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"checkbox\">\n        <label><input type=\"checkbox\" class=\"dict-enabled\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.enabled : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Enable search</label>\n    </div>\n    <div class=\"checkbox options-advanced\">\n        <label><input type=\"checkbox\" class=\"dict-allow-secondary-searches\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.allowSecondarySearches : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Allow secondary searches</label>\n    </div>\n    <div class=\"form-group options-advanced\">\n        <label for=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">Result priority</label>\n        <input type=\"number\" value=\""
    + alias4(((helper = (helper = helpers.priority || (depth0 != null ? depth0.priority : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"priority","hash":{},"data":data}) : helper)))
    + "\" id=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\" class=\"form-control dict-priority\">\n    </div>\n</div>\n";
},"useData":true});
templates['kanji.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(8, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<table class=\"info-output\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</table>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <tr>\n        <th>"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.notes : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data})) != null ? stack1 : "")
    + "</th>\n        <td>"
    + container.escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "</td>\n    </tr>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"notes","hash":{},"data":data}) : helper)));
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data}) : helper)));
},"8":function(container,depth0,helpers,partials,data) {
    return "No data found\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"kanji\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.source : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/yomichan/ext/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n    <div class=\"glyph\">"
    + container.escapeExpression(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <table class=\"table table-condensed glyph-data\">\n        <tr>\n            <th>Glossary</th>\n            <th>Readings</th>\n            <th>Statistics</th>\n        </tr>\n        <tr>\n            <td class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(21, data, 0),"inverse":container.program(24, data, 0),"data":data})) != null ? stack1 : "")
    + "            </td>\n            <td class=\"reading\">\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.onyomi : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.kunyomi : depth0),{"name":"if","hash":{},"fn":container.program(29, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n            </td>\n            <td>"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.misc : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Classifications</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1["class"] : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Codepoints</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.code : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Dictionary Indices</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.index : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n    </table>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(31, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/yomichan/ext/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"kanji\"><img src=\"/yomichan/ext/mixed/img/add-kanji.png\" title=\"Add Kanji (Alt + K)\" alt></a>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"source-term\"><img src=\"/yomichan/ext/mixed/img/source-term.png\" title=\"Source term (Alt + B)\" alt></a>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <ol>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ol>\n";
},"22":function(container,depth0,helpers,partials,data) {
    return "<li><span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span></li>";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0))
    + "</span>\n";
},"26":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.onyomi : depth0),{"name":"each","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"27":function(container,depth0,helpers,partials,data) {
    return "<dd>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</dd>";
},"29":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.kunyomi : depth0),{"name":"each","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"31":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(32, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"32":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"34":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(35, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(36, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.kanji,depth0,{"name":"kanji","hash":{"root":(depths[1] != null ? depths[1].root : depths[1]),"source":(depths[1] != null ? depths[1].source : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"36":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"38":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.program(38, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["table"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"args":["kanji"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['model.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "                    <li><a class=\"marker-link\" href=\"#\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</a></li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<tr>\n    <td class=\"col-sm-2\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</td>\n    <td class=\"col-sm-10\">\n        <div class=\"input-group\">\n            <input type=\"text\" class=\"anki-field-value form-control\" data-field=\""
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\" value=\""
    + alias4(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "\">\n            <div class=\"input-group-btn\">\n                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\">\n                    <span class=\"caret\"></span>\n                </button>\n                <ul class=\"dropdown-menu dropdown-menu-right\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.markers : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </ul>\n            </div>\n        </div>\n    </td>\n</tr>\n";
},"useData":true});
templates['terms.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(17, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-info\"";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n    ("
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"each","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    only)\n</div>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    return ", ";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<ul "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n";
},"12":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-glossary\"";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <li><span class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "<div class=\"glossary-item "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"18":function(container,depth0,helpers,partials,data) {
    return "compact-glossary";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0)) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"term\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(23, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"unless","hash":{},"fn":container.program(25, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/yomichan/ext/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(28, data, 0, blockParams, depths),"inverse":container.program(42, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reasons : depth0),{"name":"if","hash":{},"fn":container.program(46, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(50, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.grouped : depth0),{"name":"if","hash":{},"fn":container.program(53, data, 0, blockParams, depths),"inverse":container.program(59, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(62, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"23":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/yomichan/ext/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kanji\"><img src=\"/yomichan/ext/mixed/img/add-term-kanji.png\" title=\"Add expression (Alt + E)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kana\"><img src=\"/yomichan/ext/mixed/img/add-term-kana.png\" title=\"Add reading (Alt + R)\" alt></a>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.playback : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-play-audio\"><img src=\"/yomichan/ext/mixed/img/play-audio.png\" title=\"Play audio (Alt + P)\" alt></a>\n";
},"28":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.expressions : depth0),{"name":"each","hash":{},"fn":container.program(29, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"29":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", buffer = 
  "<div class=\"expression\"><span class=\"expression-"
    + container.escapeExpression(((helper = (helper = helpers.termFrequency || (depth0 != null ? depth0.termFrequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"termFrequency","hash":{},"data":data}) : helper)))
    + "\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : alias2),(options={"name":"kanjiLinks","hash":{},"fn":container.program(30, data, 0, blockParams, depths),"inverse":container.noop,"data":data}),(typeof helper === alias3 ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span><div class=\"peek-wrapper\">"
    + ((stack1 = helpers["if"].call(alias1,(depths[1] != null ? depths[1].playback : depths[1]),{"name":"if","hash":{},"fn":container.program(32, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(37, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div><span class=\""
    + ((stack1 = helpers["if"].call(alias1,(data && data.last),{"name":"if","hash":{},"fn":container.program(40, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">、</span></div>";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options;

  stack1 = ((helper = (helper = helpers.furigana || (depth0 != null ? depth0.furigana : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"furigana","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.furigana) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { return stack1; }
  else { return ''; }
},"32":function(container,depth0,helpers,partials,data) {
    return "<a href=\"#\" class=\"action-play-audio\"><img src=\"/yomichan/ext/mixed/img/play-audio.png\" title=\"Play audio\" alt></a>";
},"34":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"tags\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(35, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"35":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"37":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"frequencies\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(38, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"38":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"40":function(container,depth0,helpers,partials,data) {
    return "invisible";
},"42":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "    <div class=\"expression\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"kanjiLinks","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(43, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"43":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div style=\"display: inline-block;\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(44, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"44":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"46":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div class=\"reasons\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.reasons : depth0),{"name":"each","hash":{},"fn":container.program(47, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"47":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <span class=\"reasons\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span> "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(48, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"48":function(container,depth0,helpers,partials,data) {
    return "&laquo;";
},"50":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(51, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"51":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"53":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(54, data, 0, blockParams, depths),"inverse":container.program(57, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"54":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "        <ol>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(55, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ol>\n";
},"55":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "            <li>"
    + ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>\n";
},"57":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["0"] : stack1),{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"59":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(53, data, 0, blockParams, depths),"inverse":container.program(60, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"60":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "        ";
},"62":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"64":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(65, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"65":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(66, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1]),"playback":(depths[1] != null ? depths[1].playback : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"merged":(depths[1] != null ? depths[1].merged : depths[1]),"grouped":(depths[1] != null ? depths[1].grouped : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"66":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"68":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found.</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(64, data, 0, blockParams, depths),"inverse":container.program(68, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["definition"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();module.exports.templates = Handlebars.templates || {};

},{"./../../mixed/lib/handlebars.min":15}],10:[function(require,module,exports){
(function (global){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function utilAsync(func) {
    return function(...args) {
        func.apply(this, args);
    };
}

function utilIsolate(data) {
    return JSON.parse(JSON.stringify(data));
}

function utilSetEqual(setA, setB) {
    if (setA.size !== setB.size) {
        return false;
    }

    for (const value of setA) {
        if (!setB.has(value)) {
            return false;
        }
    }

    return true;
}

function utilSetIntersection(setA, setB) {
    return new Set(
        [...setA].filter(value => setB.has(value))
    );
}

function utilSetDifference(setA, setB) {
    return new Set(
        [...setA].filter(value => !setB.has(value))
    );
}

function utilStringHashCode(string) {
    let hashCode = 0;

    for (let i = 0, charCode = string.charCodeAt(i); i < string.length; charCode = string.charCodeAt(++i)) {
        hashCode = ((hashCode << 5) - hashCode) + charCode;
        hashCode |= 0;
    }

    return hashCode;
}

function utilBackend() {
    return global.yomichan_backend;
}

function utilAnkiGetModelNames() {
    return utilBackend().anki.getModelNames();
}

function utilAnkiGetDeckNames() {
    return utilBackend().anki.getDeckNames();
}

function utilDatabaseSummarize() {
    return utilBackend().translator.database.summarize();
}

function utilAnkiGetModelFieldNames(modelName) {
    return utilBackend().anki.getModelFieldNames(modelName);
}

function utilDatabasePurge() {
    return utilBackend().translator.database.purge();
}

function utilDatabaseImport(data, progress) {
    return utilBackend().translator.database.importDictionary(data, progress);
}

module.exports.utilAsync = utilAsync;
module.exports.utilIsolate = utilIsolate;
module.exports.utilSetEqual = utilSetEqual;
module.exports.utilSetIntersection = utilSetIntersection;
module.exports.utilSetDifference = utilSetDifference;
module.exports.utilBackend = utilBackend;
module.exports.utilAnkiGetModelNames = utilAnkiGetModelNames;
module.exports.utilStringHashCode = utilStringHashCode;
module.exports.utilAnkiGetDeckNames = utilAnkiGetDeckNames;
module.exports.utilDatabaseSummarize = utilDatabaseSummarize;
module.exports.utilAnkiGetModelFieldNames = utilAnkiGetModelFieldNames;
module.exports.utilDatabasePurge = utilDatabasePurge;
module.exports.utilDatabaseImport = utilDatabaseImport;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
(function (global){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var request = require("./../../bg/js/request");
var apiBack = require("./../../bg/js/api");
var termsCache = [];
var kanjiCache = [];
var audioCache = [];

async function apiOptionsSet(options) {
    await apiBack.apiOptionsSet(options);
}

async function apiOptionsGet() {
    return await apiBack.apiOptionsGet();
}

async function apiTermsFind(text) {
    var lang = window.lang ? window.lang : 'en';
    var protocol = location.protocol;
    var slashes = protocol.concat("//");
    var host = slashes.concat(window.location.hostname);
    if (!termsCache[text+lang]) {
        var result = await request.requestJson(host+':'+global.port+'/?text='+text+'&lang='+lang, 'GET');
        termsCache[text+lang] = result;
    }
    return termsCache[text+lang];
}

async function apiKanjiFind(text) {
    var lang = window.lang ? window.lang : 'en';
    var protocol = location.protocol;
    var slashes = protocol.concat("//");
    var host = slashes.concat(window.location.hostname);
    if (!kanjiCache[text+lang]) {
        var result = await request.requestJson(host+':'+global.port+'/?kanji='+text+'&lang='+lang, 'GET');
        kanjiCache[text+lang] = result;
    }
    return kanjiCache[text+lang];
}

async function apiDefinitionAdd(definition, mode) {
    return await apiBack.apiDefinitionAdd(definition, mode);
}

async function apiDefinitionsAddable(definitions, modes) {
    return await apiBack.apiDefinitionsAddable(definitions, modes);
}

async function apiNoteView(noteId) {
    return await apiBack.apiNoteView(noteId);
}

async function apiTemplateRender(template, data, dynamic) {
    return await apiBack.apiTemplateRender(template, data, dynamic);
}

async function apiCommandExec(command) {
    await apiBack.apiCommandExec(command);
}

async function apiAudioGetUrl(definition, source) {
    if (!audioCache[definition.source+source]) {
        var result = await apiBack.apiAudioGetUrl(definition, source);
        audioCache[definition.source+source] = result;
    }
    return audioCache[definition.source+source];
}

module.exports.apiOptionsSet = apiOptionsSet;
module.exports.apiOptionsGet = apiOptionsGet;
module.exports.apiTermsFind = apiTermsFind;
module.exports.apiKanjiFind = apiKanjiFind;
module.exports.apiDefinitionAdd = apiDefinitionAdd;
module.exports.apiDefinitionsAddable = apiDefinitionsAddable;
module.exports.apiNoteView = apiNoteView;
module.exports.apiTemplateRender = apiTemplateRender;
module.exports.apiCommandExec = apiCommandExec;
module.exports.apiAudioGetUrl = apiAudioGetUrl;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./../../bg/js/api":2,"./../../bg/js/request":8}],12:[function(require,module,exports){
/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

require("./../../bg/js/front_backend");
var display = require("./../../mixed/js/display");

class DisplayFloat extends display.Display {
    constructor() {
        super($('#spinner'), $('#definitions'));
        $(window).on('message', function(e){
            window.yomichan_display.onMessage(e);
        });
    }

    onError(error) {
        console.log(error);
        if (window.yomichan_orphaned) {
            this.onOrphaned();
        } else {
            this.onErrorMessage(typeof error == 'object' ? error.toString() : error);
        }
    }
    
    onErrorMessage(message) {
        localStorage.setItem("errorMessage", message);
        window.parent.postMessage('errorMessage', '*');
    }

    onOrphaned() {
        $('#definitions').hide();
        $('#error-orphaned').show();
    }

    onSearchClear() {
        window.parent.postMessage('popupClose', '*');
    }

    onSelectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    onMessage(e) {
        const handlers = {
            termsShow: async ({definitions, options, context}) => {
                await this.termsShow(definitions, options, context);
            },

            kanjiShow: async ({definitions, options, context}) => {
                await this.kanjiShow(definitions, options, context);
            },

            orphaned: () => {
                this.onOrphaned();
            }
        };

        const {action, params} = e.originalEvent.data;
        const handler = handlers[action];
        if (handler) {
            handler(params);
        }
    }

    onKeyDown(e) {
        const handlers = {
            67: /* c */ () => {
                if (e.ctrlKey && !window.getSelection().toString()) {
                    this.onSelectionCopy();
                    return true;
                }
            }
        };

        const handler = handlers[e.keyCode];
        if (handler && handler()) {
            e.preventDefault();
        } else {
            super.onKeyDown(e);
        }
    }
}

window.yomichan_display = new DisplayFloat();

},{"./../../bg/js/front_backend":5,"./../../mixed/js/display":13}],13:[function(require,module,exports){
/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var api = require("./../../fg/js/api");

class Display {
    constructor(spinner, container) {
        this.spinner = spinner;
        this.container = container;
        this.definitions = [];
        this.options = null;
        this.context = null;
        this.sequence = 0;
        this.index = 0;
        this.audioCache = {};

        $(document).keydown(this.onKeyDown.bind(this));
        $(document).on('wheel', this.onWheel.bind(this));
    }

    onError(error) {
        throw 'Ovveride me';
    }

    onSearchClear() {
        throw 'Override me';
    }

    onSourceTermView(e) {
        e.preventDefault();
        this.sourceTermView();
    }

    async onKanjiLookup(e) {
        try {
            e.preventDefault();

            const link = $(e.target);
            const context = {
                source: {
                    definitions: this.definitions,
                    index: Display.entryIndexFind(link)
                }
            };

            if (this.context) {
                context.sentence = this.context.sentence;
                context.url = this.context.url;
            }

            const kanjiDefs = await api.apiKanjiFind(link.text());
            await this.kanjiShow(kanjiDefs, this.options, context);
        } catch (e) {
            this.onError(e);
        }
    }

    onAudioPlay(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const definitionIndex = Display.entryIndexFind(link);
        const expressionIndex = link.closest('.entry').find('.expression .action-play-audio').index(link);
        this.audioPlay(this.definitions[definitionIndex], expressionIndex);
    }

    onNoteAdd(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const index = Display.entryIndexFind(link);
        this.noteAdd(this.definitions[index], link.data('mode'));
    }

    onNoteView(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const index = Display.entryIndexFind(link);
        api.apiNoteView(link.data('noteId'));
    }

    onKeyDown(e) {
        const noteTryAdd = mode => {
            const button = Display.adderButtonFind(this.index, mode);
            if (button.length !== 0 && !button.hasClass('disabled')) {
                this.noteAdd(this.definitions[this.index], mode);
            }
        };

        const noteTryView = mode => {
            const button = Display.viewerButtonFind(this.index);
            if (button.length !== 0 && !button.hasClass('disabled')) {
                api.apiNoteView(button.data('noteId'));
            }
        };

        const handlers = {
            27: /* escape */ () => {
                this.onSearchClear();
                return true;
            },

            33: /* page up */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 3, true);
                    return true;
                }
            },

            34: /* page down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 3, true);
                    return true;
                }
            },

            35: /* end */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.definitions.length - 1, true);
                    return true;
                }
            },

            36: /* home */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(0, true);
                    return true;
                }
            },

            38: /* up */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 1, true);
                    return true;
                }
            },

            40: /* down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 1, true);
                    return true;
                }
            },

            66: /* b */ () => {
                if (e.altKey) {
                    this.sourceTermView();
                    return true;
                }
            },

            69: /* e */ () => {
                if (e.altKey) {
                    noteTryAdd('term-kanji');
                    return true;
                }
            },

            75: /* k */ () => {
                if (e.altKey) {
                    noteTryAdd('kanji');
                    return true;
                }
            },

            82: /* r */ () => {
                if (e.altKey) {
                    noteTryAdd('term-kana');
                    return true;
                }
            },

            80: /* p */ () => {
                if (e.altKey) {
                    if ($('.entry').eq(this.index).data('type') === 'term') {
                        const expressionIndex = this.options.general.resultOutputMode === 'merge' ? 0 : -1;
                        this.audioPlay(this.definitions[this.index], expressionIndex);
                    }

                    return true;
                }
            },

            86: /* v */ () => {
                if (e.altKey) {
                    noteTryView();
                }
            }
        };

        const handler = handlers[e.keyCode];
        if (handler && handler()) {
            e.preventDefault();
        }
    }

    onWheel(e) {
        const event = e.originalEvent;
        const handler = () => {
            if (event.altKey) {
                if (event.deltaY < 0) { // scroll up
                    this.entryScrollIntoView(this.index - 1, true);
                    return true;
                } else if (event.deltaY > 0) { // scroll down
                    this.entryScrollIntoView(this.index + 1, true);
                    return true;
                }
            }
        };

        if (handler()) {
            event.preventDefault();
        }
    }

    async termsShow(definitions, options, context) {
        try {
            window.focus();

            this.definitions = definitions;
            this.options = options;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                addable: options.anki.enable,
                grouped: options.general.resultOutputMode === 'group',
                merged: options.general.resultOutputMode === 'merge',
                playback: options.general.audioSource !== 'disabled',
                compactGlossaries: options.general.compactGlossaries,
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence, definition.source);
                    }

                    definition.url = context.url;
                }
            }

            const content = await api.apiTemplateRender('terms', params);
            this.container.html(content);
            this.entryScrollIntoView(context && context.index || 0);

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.action-play-audio').click(this.onAudioPlay.bind(this));
            $('.kanji-link').click(this.onKanjiLookup.bind(this));
            $('.glossary-item  a').click(function (e) {
                e.preventDefault();
                var win = window.open($(this).attr('href'), '_blank');
                win.focus();
            });

            this.adderButtonUpdate(['term-kanji', 'term-kana'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async kanjiShow(definitions, options, context) {
        try {
            window.focus();

            this.definitions = definitions;
            this.options = options;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                source: context && context.source,
                addable: options.anki.enable,
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence);
                    }

                    definition.url = context.url;
                }
            }

            const content = await api.apiTemplateRender('kanji', params);
            this.container.html(content);
            this.entryScrollIntoView(context && context.index || 0);

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.source-term').click(this.onSourceTermView.bind(this));

            this.adderButtonUpdate(['kanji'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async adderButtonUpdate(modes, sequence) {
        try {
            const states = await api.apiDefinitionsAddable(this.definitions, modes);
            if (!states || sequence !== this.sequence) {
                return;
            }

            for (let i = 0; i < states.length; ++i) {
                const state = states[i];
                for (const mode in state) {
                    const button = Display.adderButtonFind(i, mode);
                    if (state[mode]) {
                        button.removeClass('disabled');
                    } else {
                        button.addClass('disabled');
                    }

                    button.removeClass('pending');
                }
            }
        } catch (e) {
            this.onError(e);
        }
    }

    entryScrollIntoView(index, smooth) {
        index = Math.min(index, this.definitions.length - 1);
        index = Math.max(index, 0);

        $('.current').hide().eq(index).show();

        const container = $('html,body').stop();
        const entry = $('.entry').eq(index);
        const target = index === 0 ? 0 : entry.offset().top;

        if (smooth) {
            container.animate({scrollTop: target}, 200);
        } else {
            container.scrollTop(target);
        }

        this.index = index;
    }

    async sourceTermView() {
        if (this.context && this.context.source) {
            const context = {
                url: this.context.source.url,
                sentence: this.context.source.sentence,
                index: this.context.source.index
            };

            await this.termsShow(this.context.source.definitions, this.options, context);
        }
    }

    async noteAdd(definition, mode) {
        try {
            this.spinner.show();

            const noteId = await api.apiDefinitionAdd(definition, mode);
            if (noteId) {
                const index = this.definitions.indexOf(definition);
                Display.adderButtonFind(index, mode).addClass('disabled');
                Display.viewerButtonFind(index).removeClass('pending disabled').data('noteId', noteId);
            } else {
                throw 'Note could note be added';
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    async audioPlay(definition, expressionIndex) {
        try {
            this.spinner.show();

            const expression = expressionIndex === -1 ? definition : definition.expressions[expressionIndex];
            let url = await api.apiAudioGetUrl(expression, this.options.general.audioSource);
            if (!url) {
                url = '/yomichan/ext/mixed/mp3/button.mp3';
            }

            for (const key in this.audioCache) {
                this.audioCache[key].pause();
            }

            let audio = this.audioCache[url];
            if (audio) {
                audio.currentTime = 0;
                audio.volume = this.options.general.audioVolume / 100.0;
                audio.play();
            } else {
                audio = new Audio(url);
                audio.onloadeddata = () => {
                    if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                        audio = new Audio('/yomichan/ext/mixed/mp3/button.mp3');
                    }

                    this.audioCache[url] = audio;
                    audio.volume = this.options.general.audioVolume / 100.0;
                    audio.play();
                };
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    static clozeBuild(sentence, source) {
        const result = {
            sentence: sentence.text.trim()
        };

        if (source) {
            result.prefix = sentence.text.substring(0, sentence.offset).trim();
            result.body = source.trim();
            result.suffix = sentence.text.substring(sentence.offset + source.length).trim();
        }

        return result;
    }

    static entryIndexFind(element) {
        return $('.entry').index(element.closest('.entry'));
    }

    static adderButtonFind(index, mode) {
        return $('.entry').eq(index).find(`.action-add-note[data-mode="${mode}"]`);
    }

    static viewerButtonFind(index) {
        return $('.entry').eq(index).find('.action-view-note');
    }
}

module.exports.Display = Display;

},{"./../../fg/js/api":11}],14:[function(require,module,exports){
/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const wanakana = require('./../lib/wanakana.min');

function jpIsKanji(c) {
    const code = c.charCodeAt(0);
    return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
}

function jpIsKana(c) {
    return wanakana.isKana(c);
}

function jpKatakanaToHiragana(text) {
    let result = '';
    for (const c of text) {
        if (wanakana.isKatakana(c)) {
            result += wanakana.toHiragana(c);
        } else {
            result += c;
        }
    }

    return result;
}

function jpDistributeFurigana(expression, reading) {
    const fallback = [{furigana: reading, text: expression}];
    if (!reading) {
        return fallback;
    }

    const segmentize = (reading, groups) => {
        if (groups.length === 0) {
            return [];
        }

        const group = groups[0];
        if (group.mode === 'kana') {
            if (reading.startsWith(group.text)) {
                const readingUsed = reading.substring(0, group.text.length);
                const readingLeft = reading.substring(group.text.length);
                const segs = segmentize(readingLeft, groups.splice(1));
                if (segs) {
                    return [{text: readingUsed}].concat(segs);
                }
            }
        } else {
            for (let i = reading.length; i >= group.text.length; --i) {
                const readingUsed = reading.substring(0, i);
                const readingLeft = reading.substring(i);
                const segs = segmentize(readingLeft, groups.slice(1));
                if (segs) {
                    return [{text: group.text, furigana: readingUsed}].concat(segs);
                }
            }
        }
    };

    const groups = [];
    let modePrev = null;
    for (const c of expression) {
        const modeCurr = jpIsKanji(c) || c.charCodeAt(0) === 0x3005 /* noma */ ? 'kanji' : 'kana';
        if (modeCurr === modePrev) {
            groups[groups.length - 1].text += c;
        } else {
            groups.push({mode: modeCurr, text: c});
            modePrev = modeCurr;
        }
    }

    return segmentize(reading, groups) || fallback;
}

module.exports.jpIsKanji = jpIsKanji;
module.exports.jpIsKana = jpIsKana;
module.exports.jpKatakanaToHiragana = jpKatakanaToHiragana;
module.exports.jpDistributeFurigana = jpDistributeFurigana;
},{"./../lib/wanakana.min":16}],15:[function(require,module,exports){
/**!

 @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt Expat
 handlebars v4.0.6

Copyright (C) 2011-2016 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
!function(a,b){"object"==typeof exports&&"object"==typeof module?module.exports=b():"function"==typeof define&&define.amd?define([],b):"object"==typeof exports?exports.Handlebars=b():a.Handlebars=b()}(this,function(){return function(a){function b(d){if(c[d])return c[d].exports;var e=c[d]={exports:{},id:d,loaded:!1};return a[d].call(e.exports,e,e.exports,b),e.loaded=!0,e.exports}var c={};return b.m=a,b.c=c,b.p="",b(0)}([function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(){var a=r();return a.compile=function(b,c){return k.compile(b,c,a)},a.precompile=function(b,c){return k.precompile(b,c,a)},a.AST=i["default"],a.Compiler=k.Compiler,a.JavaScriptCompiler=m["default"],a.Parser=j.parser,a.parse=j.parse,a}b.__esModule=!0;var f=c(1),g=d(f),h=c(19),i=d(h),j=c(20),k=c(25),l=c(26),m=d(l),n=c(23),o=d(n),p=c(18),q=d(p),r=g["default"].create,s=e();s.create=e,q["default"](s),s.Visitor=o["default"],s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b["default"]=a,b}function f(){var a=new h.HandlebarsEnvironment;return n.extend(a,h),a.SafeString=j["default"],a.Exception=l["default"],a.Utils=n,a.escapeExpression=n.escapeExpression,a.VM=p,a.template=function(b){return p.template(b,a)},a}b.__esModule=!0;var g=c(2),h=e(g),i=c(16),j=d(i),k=c(4),l=d(k),m=c(3),n=e(m),o=c(17),p=e(o),q=c(18),r=d(q),s=f();s.create=f,r["default"](s),s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a,b,c){this.helpers=a||{},this.partials=b||{},this.decorators=c||{},i.registerDefaultHelpers(this),j.registerDefaultDecorators(this)}b.__esModule=!0,b.HandlebarsEnvironment=e;var f=c(3),g=c(4),h=d(g),i=c(5),j=c(13),k=c(15),l=d(k),m="4.0.6";b.VERSION=m;var n=7;b.COMPILER_REVISION=n;var o={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:"== 1.x.x",5:"== 2.0.0-alpha.x",6:">= 2.0.0-beta.1",7:">= 4.0.0"};b.REVISION_CHANGES=o;var p="[object Object]";e.prototype={constructor:e,logger:l["default"],log:l["default"].log,registerHelper:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple helpers");f.extend(this.helpers,a)}else this.helpers[a]=b},unregisterHelper:function(a){delete this.helpers[a]},registerPartial:function(a,b){if(f.toString.call(a)===p)f.extend(this.partials,a);else{if("undefined"==typeof b)throw new h["default"]('Attempting to register a partial called "'+a+'" as undefined');this.partials[a]=b}},unregisterPartial:function(a){delete this.partials[a]},registerDecorator:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple decorators");f.extend(this.decorators,a)}else this.decorators[a]=b},unregisterDecorator:function(a){delete this.decorators[a]}};var q=l["default"].log;b.log=q,b.createFrame=f.createFrame,b.logger=l["default"]},function(a,b){"use strict";function c(a){return i[a]}function d(a){for(var b=1;b<arguments.length;b++)for(var c in arguments[b])Object.prototype.hasOwnProperty.call(arguments[b],c)&&(a[c]=arguments[b][c]);return a}function e(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return c;return-1}function f(a){if("string"!=typeof a){if(a&&a.toHTML)return a.toHTML();if(null==a)return"";if(!a)return a+"";a=""+a}return k.test(a)?a.replace(j,c):a}function g(a){return a||0===a?!(!n(a)||0!==a.length):!0}function h(a){var b=d({},a);return b._parent=a,b}b.__esModule=!0,b.extend=d,b.indexOf=e,b.escapeExpression=f,b.isEmpty=g,b.createFrame=h;var i={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;","=":"&#x3D;"},j=/[&<>"'`=]/g,k=/[&<>"'`=]/,l=Object.prototype.toString;b.toString=l;var m=function(a){return"function"==typeof a};m(/x/)&&(b.isFunction=m=function(a){return"function"==typeof a&&"[object Function]"===l.call(a)}),b.isFunction=m;var n=Array.isArray||function(a){return a&&"object"==typeof a?"[object Array]"===l.call(a):!1};b.isArray=n},function(a,b){"use strict";function c(a,b){var e=b&&b.loc,f=void 0,g=void 0;e&&(f=e.start.line,g=e.start.column,a+=" - "+f+":"+g);for(var h=Error.prototype.constructor.call(this,a),i=0;i<d.length;i++)this[d[i]]=h[d[i]];Error.captureStackTrace&&Error.captureStackTrace(this,c);try{e&&(this.lineNumber=f,Object.defineProperty?Object.defineProperty(this,"column",{value:g,enumerable:!0}):this.column=g)}catch(j){}}b.__esModule=!0;var d=["description","fileName","lineNumber","message","name","number","stack"];c.prototype=new Error,b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a){g["default"](a),i["default"](a),k["default"](a),m["default"](a),o["default"](a),q["default"](a),s["default"](a)}b.__esModule=!0,b.registerDefaultHelpers=e;var f=c(6),g=d(f),h=c(7),i=d(h),j=c(8),k=d(j),l=c(9),m=d(l),n=c(10),o=d(n),p=c(11),q=d(p),r=c(12),s=d(r)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(3);b["default"]=function(a){a.registerHelper("blockHelperMissing",function(b,c){var e=c.inverse,f=c.fn;return b===!0?f(this):b===!1||null==b?e(this):d.isArray(b)?b.length>0?a.helpers.each(b,c):e(this):f(b,c)})},a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}b.__esModule=!0;var e=c(3),f=c(4),g=d(f);b["default"]=function(a){a.registerHelper("each",function(a,b){function c(b,c,e){j&&(j.key=b,j.index=c,j.first=0===c,j.last=!!e),i+=d(a[b],{data:j,blockParams:[a[b],b]})}if(!b)throw new g["default"]("Must pass iterator to #each");var d=b.fn,f=b.inverse,h=0,i="",j=void 0;if(e.isFunction(a)&&(a=a.call(this)),b.data&&(j=e.createFrame(b.data)),a&&"object"==typeof a)if(e.isArray(a))for(var k=a.length;k>h;h++)h in a&&c(h,h,h===a.length-1);else{var l=void 0;for(var m in a)a.hasOwnProperty(m)&&(void 0!==l&&c(l,h-1),l=m,h++);void 0!==l&&c(l,h-1,!0)}return 0===h&&(i=f(this)),i})},a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}b.__esModule=!0;var e=c(4),f=d(e);b["default"]=function(a){a.registerHelper("helperMissing",function(){if(1!==arguments.length)throw new f["default"]('Missing helper: "'+arguments[arguments.length-1].name+'"')})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(3);b["default"]=function(a){a.registerHelper("if",function(a,b){return d.isFunction(a)&&(a=a.call(this)),!b.hash.includeZero&&!a||d.isEmpty(a)?b.inverse(this):b.fn(this)}),a.registerHelper("unless",function(b,c){return a.helpers["if"].call(this,b,{fn:c.inverse,inverse:c.fn,hash:c.hash})})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("log",function(){for(var b=[void 0],c=arguments[arguments.length-1],d=0;d<arguments.length-1;d++)b.push(arguments[d]);var e=1;null!=c.hash.level?e=c.hash.level:c.data&&null!=c.data.level&&(e=c.data.level),b[0]=e,a.log.apply(a,b)})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("lookup",function(a,b){return a&&a[b]})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(3);b["default"]=function(a){a.registerHelper("with",function(a,b){d.isFunction(a)&&(a=a.call(this));var c=b.fn;if(d.isEmpty(a))return b.inverse(this);var e=b.data;return c(a,{data:e,blockParams:[a]})})},a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a){g["default"](a)}b.__esModule=!0,b.registerDefaultDecorators=e;var f=c(14),g=d(f)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(3);b["default"]=function(a){a.registerDecorator("inline",function(a,b,c,e){var f=a;return b.partials||(b.partials={},f=function(e,f){var g=c.partials;c.partials=d.extend({},g,b.partials);var h=a(e,f);return c.partials=g,h}),b.partials[e.args[0]]=e.fn,f})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(3),e={methodMap:["debug","info","warn","error"],level:"info",lookupLevel:function(a){if("string"==typeof a){var b=d.indexOf(e.methodMap,a.toLowerCase());a=b>=0?b:parseInt(a,10)}return a},log:function(a){if(a=e.lookupLevel(a),"undefined"!=typeof console&&e.lookupLevel(e.level)<=a){var b=e.methodMap[a];console[b]||(b="log");for(var c=arguments.length,d=Array(c>1?c-1:0),f=1;c>f;f++)d[f-1]=arguments[f];console[b].apply(console,d)}}};b["default"]=e,a.exports=b["default"]},function(a,b){"use strict";function c(a){this.string=a}b.__esModule=!0,c.prototype.toString=c.prototype.toHTML=function(){return""+this.string},b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b["default"]=a,b}function f(a){var b=a&&a[0]||1,c=r.COMPILER_REVISION;if(b!==c){if(c>b){var d=r.REVISION_CHANGES[c],e=r.REVISION_CHANGES[b];throw new q["default"]("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+d+") or downgrade your runtime to an older version ("+e+").")}throw new q["default"]("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+a[1]+").")}}function g(a,b){function c(c,d,e){e.hash&&(d=o.extend({},d,e.hash)),c=b.VM.resolvePartial.call(this,c,d,e);var f=b.VM.invokePartial.call(this,c,d,e);if(null==f&&b.compile&&(e.partials[e.name]=b.compile(c,a.compilerOptions,b),f=e.partials[e.name](d,e)),null!=f){if(e.indent){for(var g=f.split("\n"),h=0,i=g.length;i>h&&(g[h]||h+1!==i);h++)g[h]=e.indent+g[h];f=g.join("\n")}return f}throw new q["default"]("The partial "+e.name+" could not be compiled when running in runtime-only mode")}function d(b){function c(b){return""+a.main(f,b,f.helpers,f.partials,g,i,h)}var d=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],g=d.data;e(d),!d.partial&&a.useData&&(g=l(b,g));var h=void 0,i=a.useBlockParams?[]:void 0;return a.useDepths&&(h=d.depths?b!=d.depths[0]?[b].concat(d.depths):d.depths:[b]),(c=m(a.main,c,f,d.depths||[],g,i))(b,d)}function e(c){c.partial?(f.helpers=c.helpers,f.partials=c.partials,f.decorators=c.decorators):(f.helpers=f.merge(c.helpers,b.helpers),a.usePartial&&(f.partials=f.merge(c.partials,b.partials)),(a.usePartial||a.useDecorators)&&(f.decorators=f.merge(c.decorators,b.decorators)))}if(!b)throw new q["default"]("No environment passed to template");if(!a||!a.main)throw new q["default"]("Unknown template object: "+typeof a);a.main.decorator=a.main_d,b.VM.checkRevision(a.compiler);var f={strict:function(a,b){if(!(b in a))throw new q["default"]('"'+b+'" not defined in '+a);return a[b]},lookup:function(a,b){for(var c=a.length,d=0;c>d;d++)if(a[d]&&null!=a[d][b])return a[d][b]},lambda:function(a,b){return"function"==typeof a?a.call(b):a},escapeExpression:o.escapeExpression,invokePartial:c,fn:function(b){var c=a[b];return c.decorator=a[b+"_d"],c},programs:[],program:function(a,b,c,d,e){var f=this.programs[a],g=this.fn(a);return b||e||d||c?f=h(this,a,g,b,c,d,e):f||(f=this.programs[a]=h(this,a,g)),f},data:function(a,b){for(;a&&b--;)a=a._parent;return a},merge:function(a,b){var c=a||b;return a&&b&&a!==b&&(c=o.extend({},b,a)),c},nullContext:Object.seal({}),noop:b.VM.noop,compilerInfo:a.compiler};return d.isTop=!0,d}function h(a,b,c,d,e,f,g){function h(b){var e=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],h=g;return!g||b==g[0]||b===a.nullContext&&null===g[0]||(h=[b].concat(g)),c(a,b,a.helpers,a.partials,e.data||d,f&&[e.blockParams].concat(f),h)}return h=m(c,h,a,g,d,f),h.program=b,h.depth=g?g.length:0,h.blockParams=e||0,h}function i(a,b,c){return a?a.call||c.name||(c.name=a,a=c.partials[a]):a="@partial-block"===c.name?c.data["partial-block"]:c.partials[c.name],a}function j(a,b,c){var d=c.data&&c.data["partial-block"];c.partial=!0;var e=void 0;if(c.fn&&c.fn!==k&&!function(){c.data=r.createFrame(c.data);var a=c.fn;e=c.data["partial-block"]=function(b,c){return c.data=r.createFrame(c.data),c.data["partial-block"]=d,a(b,c)},a.partials&&(c.partials=o.extend({},c.partials,a.partials))}(),void 0===a&&e&&(a=e),void 0===a)throw new q["default"]("The partial "+c.name+" could not be found");return a instanceof Function?a(b,c):void 0}function k(){return""}function l(a,b){return b&&"root"in b||(b=b?r.createFrame(b):{},b.root=a),b}function m(a,b,c,d,e,f){if(a.decorator){var g={};b=a.decorator(b,g,c,d&&d[0],e,f,d),o.extend(b,g)}return b}b.__esModule=!0,b.checkRevision=f,b.template=g,b.wrapProgram=h,b.resolvePartial=i,b.invokePartial=j,b.noop=k;var n=c(3),o=e(n),p=c(4),q=d(p),r=c(2)},function(a,b){(function(c){"use strict";b.__esModule=!0,b["default"]=function(a){var b="undefined"!=typeof c?c:window,d=b.Handlebars;a.noConflict=function(){return b.Handlebars===a&&(b.Handlebars=d),a}},a.exports=b["default"]}).call(b,function(){return this}())},function(a,b){"use strict";b.__esModule=!0;var c={helpers:{helperExpression:function(a){return"SubExpression"===a.type||("MustacheStatement"===a.type||"BlockStatement"===a.type)&&!!(a.params&&a.params.length||a.hash)},scopedId:function(a){return/^\.|this\b/.test(a.original)},simpleId:function(a){return 1===a.parts.length&&!c.helpers.scopedId(a)&&!a.depth}}};b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b["default"]=a,b}function e(a){return a&&a.__esModule?a:{"default":a}}function f(a,b){if("Program"===a.type)return a;h["default"].yy=n,n.locInfo=function(a){return new n.SourceLocation(b&&b.srcName,a)};var c=new j["default"](b);return c.accept(h["default"].parse(a))}b.__esModule=!0,b.parse=f;var g=c(21),h=e(g),i=c(22),j=e(i),k=c(24),l=d(k),m=c(3);b.parser=h["default"];var n={};m.extend(n,l)},function(a,b){"use strict";b.__esModule=!0;var c=function(){function a(){this.yy={}}var b=function(a,b,c,d){for(c=c||{},d=a.length;d--;c[a[d]]=b);return c},c=[2,46],d=[1,20],e=[5,14,15,19,29,34,39,44,47,48,51,55,60],f=[1,35],g=[1,28],h=[1,29],i=[1,30],j=[1,31],k=[1,32],l=[1,34],m=[14,15,19,29,34,39,44,47,48,51,55,60],n=[14,15,19,29,34,44,47,48,51,55,60],o=[1,44],p=[14,15,19,29,34,47,48,51,55,60],q=[33,65,72,80,81,82,83,84,85],r=[23,33,54,65,68,72,75,80,81,82,83,84,85],s=[1,51],t=[23,33,54,65,68,72,75,80,81,82,83,84,85,87],u=[2,45],v=[54,65,72,80,81,82,83,84,85],w=[1,58],x=[1,59],y=[15,18],z=[1,67],A=[33,65,72,75,80,81,82,83,84,85],B=[23,65,72,80,81,82,83,84,85],C=[1,79],D=[65,68,72,80,81,82,83,84,85],E=[33,75],F=[23,33,54,68,72,75],G=[1,109],H=[1,121],I=[72,77],J={trace:function(){},yy:{},symbols_:{error:2,root:3,program:4,EOF:5,program_repetition0:6,statement:7,mustache:8,block:9,rawBlock:10,partial:11,partialBlock:12,content:13,COMMENT:14,CONTENT:15,openRawBlock:16,rawBlock_repetition_plus0:17,END_RAW_BLOCK:18,OPEN_RAW_BLOCK:19,helperName:20,openRawBlock_repetition0:21,openRawBlock_option0:22,CLOSE_RAW_BLOCK:23,openBlock:24,block_option0:25,closeBlock:26,openInverse:27,block_option1:28,OPEN_BLOCK:29,openBlock_repetition0:30,openBlock_option0:31,openBlock_option1:32,CLOSE:33,OPEN_INVERSE:34,openInverse_repetition0:35,openInverse_option0:36,openInverse_option1:37,openInverseChain:38,OPEN_INVERSE_CHAIN:39,openInverseChain_repetition0:40,openInverseChain_option0:41,openInverseChain_option1:42,inverseAndProgram:43,INVERSE:44,inverseChain:45,inverseChain_option0:46,OPEN_ENDBLOCK:47,OPEN:48,mustache_repetition0:49,mustache_option0:50,OPEN_UNESCAPED:51,mustache_repetition1:52,mustache_option1:53,CLOSE_UNESCAPED:54,OPEN_PARTIAL:55,partialName:56,partial_repetition0:57,partial_option0:58,openPartialBlock:59,OPEN_PARTIAL_BLOCK:60,openPartialBlock_repetition0:61,openPartialBlock_option0:62,param:63,sexpr:64,OPEN_SEXPR:65,sexpr_repetition0:66,sexpr_option0:67,CLOSE_SEXPR:68,hash:69,hash_repetition_plus0:70,hashSegment:71,ID:72,EQUALS:73,blockParams:74,OPEN_BLOCK_PARAMS:75,blockParams_repetition_plus0:76,CLOSE_BLOCK_PARAMS:77,path:78,dataName:79,STRING:80,NUMBER:81,BOOLEAN:82,UNDEFINED:83,NULL:84,DATA:85,pathSegments:86,SEP:87,$accept:0,$end:1},terminals_:{2:"error",5:"EOF",14:"COMMENT",15:"CONTENT",18:"END_RAW_BLOCK",19:"OPEN_RAW_BLOCK",23:"CLOSE_RAW_BLOCK",29:"OPEN_BLOCK",33:"CLOSE",34:"OPEN_INVERSE",39:"OPEN_INVERSE_CHAIN",44:"INVERSE",47:"OPEN_ENDBLOCK",48:"OPEN",51:"OPEN_UNESCAPED",54:"CLOSE_UNESCAPED",55:"OPEN_PARTIAL",60:"OPEN_PARTIAL_BLOCK",65:"OPEN_SEXPR",68:"CLOSE_SEXPR",72:"ID",73:"EQUALS",75:"OPEN_BLOCK_PARAMS",77:"CLOSE_BLOCK_PARAMS",80:"STRING",81:"NUMBER",82:"BOOLEAN",83:"UNDEFINED",84:"NULL",85:"DATA",87:"SEP"},productions_:[0,[3,2],[4,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[13,1],[10,3],[16,5],[9,4],[9,4],[24,6],[27,6],[38,6],[43,2],[45,3],[45,1],[26,3],[8,5],[8,5],[11,5],[12,3],[59,5],[63,1],[63,1],[64,5],[69,1],[71,3],[74,3],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[56,1],[56,1],[79,2],[78,1],[86,3],[86,1],[6,0],[6,2],[17,1],[17,2],[21,0],[21,2],[22,0],[22,1],[25,0],[25,1],[28,0],[28,1],[30,0],[30,2],[31,0],[31,1],[32,0],[32,1],[35,0],[35,2],[36,0],[36,1],[37,0],[37,1],[40,0],[40,2],[41,0],[41,1],[42,0],[42,1],[46,0],[46,1],[49,0],[49,2],[50,0],[50,1],[52,0],[52,2],[53,0],[53,1],[57,0],[57,2],[58,0],[58,1],[61,0],[61,2],[62,0],[62,1],[66,0],[66,2],[67,0],[67,1],[70,1],[70,2],[76,1],[76,2]],performAction:function(a,b,c,d,e,f,g){var h=f.length-1;switch(e){case 1:return f[h-1];case 2:this.$=d.prepareProgram(f[h]);break;case 3:case 4:case 5:case 6:case 7:case 8:case 20:case 27:case 28:case 33:case 34:case 40:case 41:this.$=f[h];break;case 9:this.$={type:"CommentStatement",value:d.stripComment(f[h]),strip:d.stripFlags(f[h],f[h]),loc:d.locInfo(this._$)};break;case 10:this.$={type:"ContentStatement",original:f[h],value:f[h],loc:d.locInfo(this._$)};break;case 11:this.$=d.prepareRawBlock(f[h-2],f[h-1],f[h],this._$);break;case 12:this.$={path:f[h-3],params:f[h-2],hash:f[h-1]};break;case 13:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!1,this._$);break;case 14:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!0,this._$);break;case 15:this.$={open:f[h-5],path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 16:case 17:this.$={path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 18:this.$={strip:d.stripFlags(f[h-1],f[h-1]),program:f[h]};break;case 19:var i=d.prepareBlock(f[h-2],f[h-1],f[h],f[h],!1,this._$),j=d.prepareProgram([i],f[h-1].loc);j.chained=!0,this.$={strip:f[h-2].strip,program:j,chain:!0};break;case 21:this.$={path:f[h-1],strip:d.stripFlags(f[h-2],f[h])};break;case 22:case 23:this.$=d.prepareMustache(f[h-3],f[h-2],f[h-1],f[h-4],d.stripFlags(f[h-4],f[h]),this._$);break;case 24:this.$={type:"PartialStatement",name:f[h-3],params:f[h-2],hash:f[h-1],indent:"",strip:d.stripFlags(f[h-4],f[h]),loc:d.locInfo(this._$)};break;case 25:this.$=d.preparePartialBlock(f[h-2],f[h-1],f[h],this._$);break;case 26:this.$={path:f[h-3],params:f[h-2],hash:f[h-1],strip:d.stripFlags(f[h-4],f[h])};break;case 29:this.$={type:"SubExpression",path:f[h-3],params:f[h-2],hash:f[h-1],loc:d.locInfo(this._$)};break;case 30:this.$={type:"Hash",pairs:f[h],loc:d.locInfo(this._$)};break;case 31:this.$={type:"HashPair",key:d.id(f[h-2]),value:f[h],loc:d.locInfo(this._$)};break;case 32:this.$=d.id(f[h-1]);break;case 35:this.$={type:"StringLiteral",value:f[h],original:f[h],loc:d.locInfo(this._$)};break;case 36:this.$={type:"NumberLiteral",value:Number(f[h]),original:Number(f[h]),loc:d.locInfo(this._$)};break;case 37:this.$={type:"BooleanLiteral",value:"true"===f[h],original:"true"===f[h],loc:d.locInfo(this._$)};break;case 38:this.$={type:"UndefinedLiteral",original:void 0,value:void 0,loc:d.locInfo(this._$)};break;case 39:this.$={type:"NullLiteral",original:null,value:null,loc:d.locInfo(this._$)};break;case 42:this.$=d.preparePath(!0,f[h],this._$);break;case 43:this.$=d.preparePath(!1,f[h],this._$);break;case 44:f[h-2].push({part:d.id(f[h]),original:f[h],separator:f[h-1]}),this.$=f[h-2];break;case 45:this.$=[{part:d.id(f[h]),original:f[h]}];break;case 46:case 50:case 58:case 64:case 70:case 78:case 82:case 86:case 90:case 94:this.$=[];break;case 47:case 49:case 51:case 59:case 65:case 71:case 79:case 83:case 87:case 91:case 95:case 99:case 101:f[h-1].push(f[h]);break;case 48:case 98:case 100:this.$=[f[h]]}},table:[b([5,14,15,19,29,34,48,51,55,60],c,{3:1,4:2,6:3}),{1:[3]},{5:[1,4]},b([5,39,44,47],[2,2],{7:5,8:6,9:7,10:8,11:9,12:10,13:11,24:15,27:16,16:17,59:19,14:[1,12],15:d,19:[1,23],29:[1,21],34:[1,22],48:[1,13],51:[1,14],55:[1,18],60:[1,24]}),{1:[2,1]},b(e,[2,47]),b(e,[2,3]),b(e,[2,4]),b(e,[2,5]),b(e,[2,6]),b(e,[2,7]),b(e,[2,8]),b(e,[2,9]),{20:25,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{20:36,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(m,c,{6:3,4:37}),b(n,c,{6:3,4:38}),{13:40,15:d,17:39},{20:42,56:41,64:43,65:o,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(p,c,{6:3,4:45}),b([5,14,15,18,19,29,34,39,44,47,48,51,55,60],[2,10]),{20:46,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{20:47,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{20:48,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{20:42,56:49,64:43,65:o,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(q,[2,78],{49:50}),b(r,[2,33]),b(r,[2,34]),b(r,[2,35]),b(r,[2,36]),b(r,[2,37]),b(r,[2,38]),b(r,[2,39]),b(r,[2,43],{87:s}),{72:f,86:52},b(t,u),b(v,[2,82],{52:53}),{25:54,38:56,39:w,43:57,44:x,45:55,47:[2,54]},{28:60,43:61,44:x,47:[2,56]},{13:63,15:d,18:[1,62]},b(y,[2,48]),b(q,[2,86],{57:64}),b(q,[2,40]),b(q,[2,41]),{20:65,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{26:66,47:z},b(A,[2,58],{30:68}),b(A,[2,64],{35:69}),b(B,[2,50],{21:70}),b(q,[2,90],{61:71}),{20:75,33:[2,80],50:72,63:73,64:76,65:o,69:74,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{72:[1,80]},b(r,[2,42],{87:s}),{20:75,53:81,54:[2,84],63:82,64:76,65:o,69:83,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{26:84,47:z},{47:[2,55]},b(m,c,{6:3,4:85}),{47:[2,20]},{20:86,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(p,c,{6:3,4:87}),{26:88,47:z},{47:[2,57]},b(e,[2,11]),b(y,[2,49]),{20:75,33:[2,88],58:89,63:90,64:76,65:o,69:91,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(D,[2,94],{66:92}),b(e,[2,25]),{20:93,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(E,[2,60],{78:26,79:27,86:33,20:75,64:76,70:77,71:78,31:94,63:95,69:96,65:o,72:C,80:g,81:h,82:i,83:j,84:k,85:l}),b(E,[2,66],{78:26,79:27,86:33,20:75,64:76,70:77,71:78,36:97,63:98,69:99,65:o,72:C,80:g,81:h,82:i,83:j,84:k,85:l}),{20:75,22:100,23:[2,52],63:101,64:76,65:o,69:102,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{20:75,33:[2,92],62:103,63:104,64:76,65:o,69:105,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{33:[1,106]},b(q,[2,79]),{33:[2,81]},b(r,[2,27]),b(r,[2,28]),b([23,33,54,68,75],[2,30],{71:107,72:[1,108]}),b(F,[2,98]),b(t,u,{73:G}),b(t,[2,44]),{54:[1,110]},b(v,[2,83]),{54:[2,85]},b(e,[2,13]),{38:56,39:w,43:57,44:x,45:112,46:111,47:[2,76]},b(A,[2,70],{40:113}),{47:[2,18]},b(e,[2,14]),{33:[1,114]},b(q,[2,87]),{33:[2,89]},{20:75,63:116,64:76,65:o,67:115,68:[2,96],69:117,70:77,71:78,72:C,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},{33:[1,118]},{32:119,33:[2,62],74:120,75:H},b(A,[2,59]),b(E,[2,61]),{33:[2,68],37:122,74:123,75:H},b(A,[2,65]),b(E,[2,67]),{23:[1,124]},b(B,[2,51]),{23:[2,53]},{33:[1,125]},b(q,[2,91]),{33:[2,93]},b(e,[2,22]),b(F,[2,99]),{73:G},{20:75,63:126,64:76,65:o,72:f,78:26,79:27,80:g,81:h,82:i,83:j,84:k,85:l,86:33},b(e,[2,23]),{47:[2,19]},{47:[2,77]},b(E,[2,72],{78:26,79:27,86:33,20:75,64:76,70:77,71:78,41:127,63:128,69:129,65:o,72:C,80:g,81:h,82:i,83:j,84:k,85:l}),b(e,[2,24]),{68:[1,130]},b(D,[2,95]),{68:[2,97]},b(e,[2,21]),{33:[1,131]},{33:[2,63]},{72:[1,133],76:132},{33:[1,134]},{33:[2,69]},{15:[2,12]},b(p,[2,26]),b(F,[2,31]),{33:[2,74],42:135,74:136,75:H},b(A,[2,71]),b(E,[2,73]),b(r,[2,29]),b(m,[2,15]),{72:[1,138],77:[1,137]},b(I,[2,100]),b(n,[2,16]),{33:[1,139]},{33:[2,75]},{33:[2,32]},b(I,[2,101]),b(m,[2,17])],defaultActions:{4:[2,1],55:[2,55],57:[2,20],61:[2,57],74:[2,81],83:[2,85],87:[2,18],91:[2,89],102:[2,53],105:[2,93],111:[2,19],112:[2,77],117:[2,97],120:[2,63],123:[2,69],124:[2,12],136:[2,75],137:[2,32]},parseError:function(a,b){if(!b.recoverable){var c=function(a,b){this.message=a,this.hash=b};throw c.prototype=new Error,new c(a,b)}this.trace(a)},parse:function(a){var b=this,c=[0],d=[null],e=[],f=this.table,g="",h=0,i=0,j=0,k=2,l=1,m=e.slice.call(arguments,1),n=Object.create(this.lexer),o={yy:{}};for(var p in this.yy)Object.prototype.hasOwnProperty.call(this.yy,p)&&(o.yy[p]=this.yy[p]);n.setInput(a,o.yy),o.yy.lexer=n,o.yy.parser=this,"undefined"==typeof n.yylloc&&(n.yylloc={});var q=n.yylloc;e.push(q);var r=n.options&&n.options.ranges;"function"==typeof o.yy.parseError?this.parseError=o.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;for(var s,t,u,v,w,x,y,z,A,B=function(){var a;return a=n.lex()||l,"number"!=typeof a&&(a=b.symbols_[a]||a),a},C={};;){if(u=c[c.length-1],this.defaultActions[u]?v=this.defaultActions[u]:(null!==s&&"undefined"!=typeof s||(s=B()),v=f[u]&&f[u][s]),"undefined"==typeof v||!v.length||!v[0]){var D="";A=[];for(x in f[u])this.terminals_[x]&&x>k&&A.push("'"+this.terminals_[x]+"'");D=n.showPosition?"Parse error on line "+(h+1)+":\n"+n.showPosition()+"\nExpecting "+A.join(", ")+", got '"+(this.terminals_[s]||s)+"'":"Parse error on line "+(h+1)+": Unexpected "+(s==l?"end of input":"'"+(this.terminals_[s]||s)+"'"),this.parseError(D,{text:n.match,token:this.terminals_[s]||s,line:n.yylineno,loc:q,expected:A})}if(v[0]instanceof Array&&v.length>1)throw new Error("Parse Error: multiple actions possible at state: "+u+", token: "+s);switch(v[0]){case 1:c.push(s),d.push(n.yytext),e.push(n.yylloc),c.push(v[1]),s=null,t?(s=t,t=null):(i=n.yyleng,g=n.yytext,h=n.yylineno,q=n.yylloc,j>0&&j--);break;case 2:if(y=this.productions_[v[1]][1],C.$=d[d.length-y],C._$={first_line:e[e.length-(y||1)].first_line,last_line:e[e.length-1].last_line,first_column:e[e.length-(y||1)].first_column,last_column:e[e.length-1].last_column},r&&(C._$.range=[e[e.length-(y||1)].range[0],e[e.length-1].range[1]]),w=this.performAction.apply(C,[g,i,h,o.yy,v[1],d,e].concat(m)),"undefined"!=typeof w)return w;y&&(c=c.slice(0,-1*y*2),d=d.slice(0,-1*y),e=e.slice(0,-1*y)),c.push(this.productions_[v[1]][0]),d.push(C.$),e.push(C._$),z=f[c[c.length-2]][c[c.length-1]],c.push(z);break;case 3:return!0}}return!0}},K=function(){var a={EOF:1,parseError:function(a,b){if(!this.yy.parser)throw new Error(a);this.yy.parser.parseError(a,b)},setInput:function(a,b){return this.yy=b||this.yy||{},this._input=a,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var a=this._input[0];this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a;var b=a.match(/(?:\r\n?|\n).*/g);return b?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},unput:function(a){var b=a.length,c=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-b),this.offset-=b;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),c.length-1&&(this.yylineno-=c.length-1);var e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:c?(c.length===d.length?this.yylloc.first_column:0)+d[d.length-c.length].length-c[0].length:this.yylloc.first_column-b},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-b]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){return this.options.backtrack_lexer?(this._backtrack=!0,this):this.parseError("Lexical error on line "+(this.yylineno+1)+". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},less:function(a){this.unput(this.match.slice(a))},pastInput:function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var a=this.pastInput(),b=new Array(a.length+1).join("-");return a+this.upcomingInput()+"\n"+b+"^"},test_match:function(a,b){var c,d,e;if(this.options.backtrack_lexer&&(e={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(e.yylloc.range=this.yylloc.range.slice(0))),d=a[0].match(/(?:\r\n?|\n).*/g),d&&(this.yylineno+=d.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:d?d[d.length-1].length-d[d.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+a[0].length},this.yytext+=a[0],this.match+=a[0],this.matches=a,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(a[0].length),this.matched+=a[0],c=this.performAction.call(this,this.yy,this,b,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),c)return c;if(this._backtrack){for(var f in e)this[f]=e[f];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var a,b,c,d;this._more||(this.yytext="",this.match="");for(var e=this._currentRules(),f=0;f<e.length;f++)if(c=this._input.match(this.rules[e[f]]),c&&(!b||c[0].length>b[0].length)){if(b=c,d=f,this.options.backtrack_lexer){if(a=this.test_match(c,e[f]),a!==!1)return a;if(this._backtrack){b=!1;continue}return!1}if(!this.options.flex)break}return b?(a=this.test_match(b,e[d]),a!==!1?a:!1):""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var a=this.next();return a?a:this.lex()},begin:function(a){this.conditionStack.push(a)},popState:function(){var a=this.conditionStack.length-1;return a>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(a){return a=this.conditionStack.length-1-Math.abs(a||0),a>=0?this.conditionStack[a]:"INITIAL"},pushState:function(a){this.begin(a)},stateStackSize:function(){return this.conditionStack.length},options:{},performAction:function(a,b,c,d){function e(a,c){return b.yytext=b.yytext.substr(a,b.yyleng-c)}switch(c){case 0:if("\\\\"===b.yytext.slice(-2)?(e(0,1),this.begin("mu")):"\\"===b.yytext.slice(-1)?(e(0,1),this.begin("emu")):this.begin("mu"),b.yytext)return 15;break;case 1:return 15;case 2:return this.popState(),
15;case 3:return this.begin("raw"),15;case 4:return this.popState(),"raw"===this.conditionStack[this.conditionStack.length-1]?15:(b.yytext=b.yytext.substr(5,b.yyleng-9),18);case 5:return 15;case 6:return this.popState(),14;case 7:return 65;case 8:return 68;case 9:return 19;case 10:return this.popState(),this.begin("raw"),23;case 11:return 55;case 12:return 60;case 13:return 29;case 14:return 47;case 15:return this.popState(),44;case 16:return this.popState(),44;case 17:return 34;case 18:return 39;case 19:return 51;case 20:return 48;case 21:this.unput(b.yytext),this.popState(),this.begin("com");break;case 22:return this.popState(),14;case 23:return 48;case 24:return 73;case 25:return 72;case 26:return 72;case 27:return 87;case 28:break;case 29:return this.popState(),54;case 30:return this.popState(),33;case 31:return b.yytext=e(1,2).replace(/\\"/g,'"'),80;case 32:return b.yytext=e(1,2).replace(/\\'/g,"'"),80;case 33:return 85;case 34:return 82;case 35:return 82;case 36:return 83;case 37:return 84;case 38:return 81;case 39:return 75;case 40:return 77;case 41:return 72;case 42:return b.yytext=b.yytext.replace(/\\([\\\]])/g,"$1"),72;case 43:return"INVALID";case 44:return 5}},rules:[/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{(?=[^\/]))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{)))/,/^(?:[\s\S]*?--(~)?\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#>)/,/^(?:\{\{(~)?#\*?)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^\s*(~)?\}\})/,/^(?:\{\{(~)?\s*else\s*(~)?\}\})/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{(~)?!--)/,/^(?:\{\{(~)?![\s\S]*?\}\})/,/^(?:\{\{(~)?\*?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)|])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:undefined(?=([~}\s)])))/,/^(?:null(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:as\s+\|)/,/^(?:\|)/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/,/^(?:\[(\\\]|[^\]])*\])/,/^(?:.)/,/^(?:$)/],conditions:{mu:{rules:[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],inclusive:!1},emu:{rules:[2],inclusive:!1},com:{rules:[6],inclusive:!1},raw:{rules:[3,4,5],inclusive:!1},INITIAL:{rules:[0,1,44],inclusive:!0}}};return a}();return J.lexer=K,a.prototype=J,J.Parser=a,new a}();b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(){var a=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];this.options=a}function f(a,b,c){void 0===b&&(b=a.length);var d=a[b-1],e=a[b-2];return d?"ContentStatement"===d.type?(e||!c?/\r?\n\s*?$/:/(^|\r?\n)\s*?$/).test(d.original):void 0:c}function g(a,b,c){void 0===b&&(b=-1);var d=a[b+1],e=a[b+2];return d?"ContentStatement"===d.type?(e||!c?/^\s*?\r?\n/:/^\s*?(\r?\n|$)/).test(d.original):void 0:c}function h(a,b,c){var d=a[null==b?0:b+1];if(d&&"ContentStatement"===d.type&&(c||!d.rightStripped)){var e=d.value;d.value=d.value.replace(c?/^\s+/:/^[ \t]*\r?\n?/,""),d.rightStripped=d.value!==e}}function i(a,b,c){var d=a[null==b?a.length-1:b-1];if(d&&"ContentStatement"===d.type&&(c||!d.leftStripped)){var e=d.value;return d.value=d.value.replace(c?/\s+$/:/[ \t]+$/,""),d.leftStripped=d.value!==e,d.leftStripped}}b.__esModule=!0;var j=c(23),k=d(j);e.prototype=new k["default"],e.prototype.Program=function(a){var b=!this.options.ignoreStandalone,c=!this.isRootSeen;this.isRootSeen=!0;for(var d=a.body,e=0,j=d.length;j>e;e++){var k=d[e],l=this.accept(k);if(l){var m=f(d,e,c),n=g(d,e,c),o=l.openStandalone&&m,p=l.closeStandalone&&n,q=l.inlineStandalone&&m&&n;l.close&&h(d,e,!0),l.open&&i(d,e,!0),b&&q&&(h(d,e),i(d,e)&&"PartialStatement"===k.type&&(k.indent=/([ \t]+$)/.exec(d[e-1].original)[1])),b&&o&&(h((k.program||k.inverse).body),i(d,e)),b&&p&&(h(d,e),i((k.inverse||k.program).body))}}return a},e.prototype.BlockStatement=e.prototype.DecoratorBlock=e.prototype.PartialBlockStatement=function(a){this.accept(a.program),this.accept(a.inverse);var b=a.program||a.inverse,c=a.program&&a.inverse,d=c,e=c;if(c&&c.chained)for(d=c.body[0].program;e.chained;)e=e.body[e.body.length-1].program;var j={open:a.openStrip.open,close:a.closeStrip.close,openStandalone:g(b.body),closeStandalone:f((d||b).body)};if(a.openStrip.close&&h(b.body,null,!0),c){var k=a.inverseStrip;k.open&&i(b.body,null,!0),k.close&&h(d.body,null,!0),a.closeStrip.open&&i(e.body,null,!0),!this.options.ignoreStandalone&&f(b.body)&&g(d.body)&&(i(b.body),h(d.body))}else a.closeStrip.open&&i(b.body,null,!0);return j},e.prototype.Decorator=e.prototype.MustacheStatement=function(a){return a.strip},e.prototype.PartialStatement=e.prototype.CommentStatement=function(a){var b=a.strip||{};return{inlineStandalone:!0,open:b.open,close:b.close}},b["default"]=e,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(){this.parents=[]}function f(a){this.acceptRequired(a,"path"),this.acceptArray(a.params),this.acceptKey(a,"hash")}function g(a){f.call(this,a),this.acceptKey(a,"program"),this.acceptKey(a,"inverse")}function h(a){this.acceptRequired(a,"name"),this.acceptArray(a.params),this.acceptKey(a,"hash")}b.__esModule=!0;var i=c(4),j=d(i);e.prototype={constructor:e,mutating:!1,acceptKey:function(a,b){var c=this.accept(a[b]);if(this.mutating){if(c&&!e.prototype[c.type])throw new j["default"]('Unexpected node type "'+c.type+'" found when accepting '+b+" on "+a.type);a[b]=c}},acceptRequired:function(a,b){if(this.acceptKey(a,b),!a[b])throw new j["default"](a.type+" requires "+b)},acceptArray:function(a){for(var b=0,c=a.length;c>b;b++)this.acceptKey(a,b),a[b]||(a.splice(b,1),b--,c--)},accept:function(a){if(a){if(!this[a.type])throw new j["default"]("Unknown type: "+a.type,a);this.current&&this.parents.unshift(this.current),this.current=a;var b=this[a.type](a);return this.current=this.parents.shift(),!this.mutating||b?b:b!==!1?a:void 0}},Program:function(a){this.acceptArray(a.body)},MustacheStatement:f,Decorator:f,BlockStatement:g,DecoratorBlock:g,PartialStatement:h,PartialBlockStatement:function(a){h.call(this,a),this.acceptKey(a,"program")},ContentStatement:function(){},CommentStatement:function(){},SubExpression:f,PathExpression:function(){},StringLiteral:function(){},NumberLiteral:function(){},BooleanLiteral:function(){},UndefinedLiteral:function(){},NullLiteral:function(){},Hash:function(a){this.acceptArray(a.pairs)},HashPair:function(a){this.acceptRequired(a,"value")}},b["default"]=e,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a,b){if(b=b.path?b.path.original:b,a.path.original!==b){var c={loc:a.path.loc};throw new q["default"](a.path.original+" doesn't match "+b,c)}}function f(a,b){this.source=a,this.start={line:b.first_line,column:b.first_column},this.end={line:b.last_line,column:b.last_column}}function g(a){return/^\[.*\]$/.test(a)?a.substr(1,a.length-2):a}function h(a,b){return{open:"~"===a.charAt(2),close:"~"===b.charAt(b.length-3)}}function i(a){return a.replace(/^\{\{~?\!-?-?/,"").replace(/-?-?~?\}\}$/,"")}function j(a,b,c){c=this.locInfo(c);for(var d=a?"@":"",e=[],f=0,g=0,h=b.length;h>g;g++){var i=b[g].part,j=b[g].original!==i;if(d+=(b[g].separator||"")+i,j||".."!==i&&"."!==i&&"this"!==i)e.push(i);else{if(e.length>0)throw new q["default"]("Invalid path: "+d,{loc:c});".."===i&&f++}}return{type:"PathExpression",data:a,depth:f,parts:e,original:d,loc:c}}function k(a,b,c,d,e,f){var g=d.charAt(3)||d.charAt(2),h="{"!==g&&"&"!==g,i=/\*/.test(d);return{type:i?"Decorator":"MustacheStatement",path:a,params:b,hash:c,escaped:h,strip:e,loc:this.locInfo(f)}}function l(a,b,c,d){e(a,c),d=this.locInfo(d);var f={type:"Program",body:b,strip:{},loc:d};return{type:"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:f,openStrip:{},inverseStrip:{},closeStrip:{},loc:d}}function m(a,b,c,d,f,g){d&&d.path&&e(a,d);var h=/\*/.test(a.open);b.blockParams=a.blockParams;var i=void 0,j=void 0;if(c){if(h)throw new q["default"]("Unexpected inverse block on decorator",c);c.chain&&(c.program.body[0].closeStrip=d.strip),j=c.strip,i=c.program}return f&&(f=i,i=b,b=f),{type:h?"DecoratorBlock":"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:b,inverse:i,openStrip:a.strip,inverseStrip:j,closeStrip:d&&d.strip,loc:this.locInfo(g)}}function n(a,b){if(!b&&a.length){var c=a[0].loc,d=a[a.length-1].loc;c&&d&&(b={source:c.source,start:{line:c.start.line,column:c.start.column},end:{line:d.end.line,column:d.end.column}})}return{type:"Program",body:a,strip:{},loc:b}}function o(a,b,c,d){return e(a,c),{type:"PartialBlockStatement",name:a.path,params:a.params,hash:a.hash,program:b,openStrip:a.strip,closeStrip:c&&c.strip,loc:this.locInfo(d)}}b.__esModule=!0,b.SourceLocation=f,b.id=g,b.stripFlags=h,b.stripComment=i,b.preparePath=j,b.prepareMustache=k,b.prepareRawBlock=l,b.prepareBlock=m,b.prepareProgram=n,b.preparePartialBlock=o;var p=c(4),q=d(p)},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(){}function f(a,b,c){void 0===b&&(b={}),h(a,b);var d=i(a,b,c);return(new c.JavaScriptCompiler).compile(d,b)}function g(a,b,c){function d(){var d=i(a,b,c),e=(new c.JavaScriptCompiler).compile(d,b,void 0,!0);return c.template(e)}void 0===b&&(b={}),h(a,b);var e=void 0;return function(a,b){return e||(e=d()),e.call(this,a,b)}}function h(a,b){if(null==a||"string"!=typeof a&&"Program"!==a.type)throw new m["default"]("You must pass a string or Handlebars AST to Handlebars.compile. You passed "+a);if(b.trackIds||b.stringParams)throw new m["default"]("TrackIds and stringParams are no longer supported. See Github #1145");"data"in b||(b.data=!0),b.compat&&(b.useDepths=!0)}function i(a,b,c){var d=c.parse(a,b);return(new c.Compiler).compile(d,b)}function j(a,b){if(a===b)return!0;if(n.isArray(a)&&n.isArray(b)&&a.length===b.length){for(var c=0;c<a.length;c++)if(!j(a[c],b[c]))return!1;return!0}}function k(a){if(!a.path.parts){var b=a.path;a.path={type:"PathExpression",data:!1,depth:0,parts:[b.original+""],original:b.original+"",loc:b.loc}}}b.__esModule=!0,b.Compiler=e,b.precompile=f,b.compile=g;var l=c(4),m=d(l),n=c(3),o=c(19),p=d(o),q=[].slice;e.prototype={compiler:e,equals:function(a){var b=this.opcodes.length;if(a.opcodes.length!==b)return!1;for(var c=0;b>c;c++){var d=this.opcodes[c],e=a.opcodes[c];if(d.opcode!==e.opcode||!j(d.args,e.args))return!1}b=this.children.length;for(var c=0;b>c;c++)if(!this.children[c].equals(a.children[c]))return!1;return!0},guid:0,compile:function(a,b){this.sourceNode=[],this.opcodes=[],this.children=[],this.options=b,b.blockParams=b.blockParams||[];var c=b.knownHelpers;if(b.knownHelpers={helperMissing:!0,blockHelperMissing:!0,each:!0,"if":!0,unless:!0,"with":!0,log:!0,lookup:!0},c)for(var d in c)d in c&&(b.knownHelpers[d]=c[d]);return this.accept(a)},compileProgram:function(a){var b=new this.compiler,c=b.compile(a,this.options),d=this.guid++;return this.usePartial=this.usePartial||c.usePartial,this.children[d]=c,this.useDepths=this.useDepths||c.useDepths,d},accept:function(a){if(!this[a.type])throw new m["default"]("Unknown type: "+a.type,a);this.sourceNode.unshift(a);var b=this[a.type](a);return this.sourceNode.shift(),b},Program:function(a){this.options.blockParams.unshift(a.blockParams);for(var b=a.body,c=b.length,d=0;c>d;d++)this.accept(b[d]);return this.options.blockParams.shift(),this.isSimple=1===c,this.blockParams=a.blockParams?a.blockParams.length:0,this},BlockStatement:function(a){k(a);var b=a.program,c=a.inverse;b=b&&this.compileProgram(b),c=c&&this.compileProgram(c);var d=this.classifySexpr(a);"helper"===d?this.helperSexpr(a,b,c):"simple"===d?(this.simpleSexpr(a),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("blockValue",a.path.original)):(this.ambiguousSexpr(a,b,c),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("ambiguousBlockValue")),this.opcode("append")},DecoratorBlock:function(a){var b=a.program&&this.compileProgram(a.program),c=this.setupFullMustacheParams(a,b,void 0),d=a.path;this.useDecorators=!0,this.opcode("registerDecorator",c.length,d.original)},PartialStatement:function(a){this.usePartial=!0;var b=a.program;b&&(b=this.compileProgram(a.program));var c=a.params;if(c.length>1)throw new m["default"]("Unsupported number of partial arguments: "+c.length,a);c.length||(this.options.explicitPartialContext?this.opcode("pushLiteral","undefined"):c.push({type:"PathExpression",parts:[],depth:0}));var d=a.name.original,e="SubExpression"===a.name.type;e&&this.accept(a.name),this.setupFullMustacheParams(a,b,void 0,!0);var f=a.indent||"";this.options.preventIndent&&f&&(this.opcode("appendContent",f),f=""),this.opcode("invokePartial",e,d,f),this.opcode("append")},PartialBlockStatement:function(a){this.PartialStatement(a)},MustacheStatement:function(a){this.SubExpression(a),a.escaped&&!this.options.noEscape?this.opcode("appendEscaped"):this.opcode("append")},Decorator:function(a){this.DecoratorBlock(a)},ContentStatement:function(a){a.value&&this.opcode("appendContent",a.value)},CommentStatement:function(){},SubExpression:function(a){k(a);var b=this.classifySexpr(a);"simple"===b?this.simpleSexpr(a):"helper"===b?this.helperSexpr(a):this.ambiguousSexpr(a)},ambiguousSexpr:function(a,b,c){var d=a.path,e=d.parts[0],f=null!=b||null!=c;this.opcode("getContext",d.depth),this.opcode("pushProgram",b),this.opcode("pushProgram",c),d.strict=!0,this.accept(d),this.opcode("invokeAmbiguous",e,f)},simpleSexpr:function(a){var b=a.path;b.strict=!0,this.accept(b),this.opcode("resolvePossibleLambda")},helperSexpr:function(a,b,c){var d=this.setupFullMustacheParams(a,b,c),e=a.path,f=e.parts[0];if(this.options.knownHelpers[f])this.opcode("invokeKnownHelper",d.length,f);else{if(this.options.knownHelpersOnly)throw new m["default"]("You specified knownHelpersOnly, but used the unknown helper "+f,a);e.strict=!0,e.falsy=!0,this.accept(e),this.opcode("invokeHelper",d.length,e.original,p["default"].helpers.simpleId(e))}},PathExpression:function(a){this.addDepth(a.depth),this.opcode("getContext",a.depth);var b=a.parts[0],c=p["default"].helpers.scopedId(a),d=!a.depth&&!c&&this.blockParamIndex(b);d?this.opcode("lookupBlockParam",d,a.parts):b?a.data?(this.options.data=!0,this.opcode("lookupData",a.depth,a.parts,a.strict)):this.opcode("lookupOnContext",a.parts,a.falsy,a.strict,c):this.opcode("pushContext")},StringLiteral:function(a){this.opcode("pushString",a.value)},NumberLiteral:function(a){this.opcode("pushLiteral",a.value)},BooleanLiteral:function(a){this.opcode("pushLiteral",a.value)},UndefinedLiteral:function(){this.opcode("pushLiteral","undefined")},NullLiteral:function(){this.opcode("pushLiteral","null")},Hash:function(a){var b=a.pairs,c=0,d=b.length;for(this.opcode("pushHash");d>c;c++)this.pushParam(b[c].value);for(;c--;)this.opcode("assignToHash",b[c].key);this.opcode("popHash")},opcode:function(a){this.opcodes.push({opcode:a,args:q.call(arguments,1),loc:this.sourceNode[0].loc})},addDepth:function(a){a&&(this.useDepths=!0)},classifySexpr:function(a){var b=p["default"].helpers.simpleId(a.path),c=b&&!!this.blockParamIndex(a.path.parts[0]),d=!c&&p["default"].helpers.helperExpression(a),e=!c&&(d||b);if(e&&!d){var f=a.path.parts[0],g=this.options;g.knownHelpers[f]?d=!0:g.knownHelpersOnly&&(e=!1)}return d?"helper":e?"ambiguous":"simple"},pushParams:function(a){for(var b=0,c=a.length;c>b;b++)this.pushParam(a[b])},pushParam:function(a){this.accept(a)},setupFullMustacheParams:function(a,b,c,d){var e=a.params;return this.pushParams(e),this.opcode("pushProgram",b),this.opcode("pushProgram",c),a.hash?this.accept(a.hash):this.opcode("emptyHash",d),e},blockParamIndex:function(a){for(var b=0,c=this.options.blockParams.length;c>b;b++){var d=this.options.blockParams[b],e=d&&n.indexOf(d,a);if(d&&e>=0)return[b,e]}}}},function(a,b,c){"use strict";function d(a){return a&&a.__esModule?a:{"default":a}}function e(a){this.value=a}function f(){}function g(a,b,c,d){var e=b.popStack(),f=0,g=c.length;for(a&&g--;g>f;f++)e=b.nameLookup(e,c[f],d);return a?[b.aliasable("container.strict"),"(",e,", ",b.quotedString(c[f]),")"]:e}b.__esModule=!0;var h=c(2),i=c(4),j=d(i),k=c(3),l=c(27),m=d(l);f.prototype={nameLookup:function(a,b){return f.isValidJavaScriptVariableName(b)?[a,".",b]:[a,"[",JSON.stringify(b),"]"]},depthedLookup:function(a){return[this.aliasable("container.lookup"),'(depths, "',a,'")']},compilerInfo:function(){var a=h.COMPILER_REVISION,b=h.REVISION_CHANGES[a];return[a,b]},appendToBuffer:function(a,b,c){return k.isArray(a)||(a=[a]),a=this.source.wrap(a,b),this.environment.isSimple?["return ",a,";"]:c?["buffer += ",a,";"]:(a.appendToBuffer=!0,a)},initializeBuffer:function(){return this.quotedString("")},compile:function(a,b,c,d){this.environment=a,this.options=b,this.precompile=!d,this.name=this.environment.name,this.isChild=!!c,this.context=c||{decorators:[],programs:[],environments:[]},this.preamble(),this.stackSlot=0,this.stackVars=[],this.aliases={},this.registers={list:[]},this.hashes=[],this.compileStack=[],this.inlineStack=[],this.blockParams=[],this.compileChildren(a,b),this.useDepths=this.useDepths||a.useDepths||a.useDecorators||this.options.compat,this.useBlockParams=this.useBlockParams||a.useBlockParams;var e=a.opcodes,f=void 0,g=void 0,h=void 0,i=void 0;for(h=0,i=e.length;i>h;h++)f=e[h],this.source.currentLocation=f.loc,g=g||f.loc,this[f.opcode].apply(this,f.args);if(this.source.currentLocation=g,this.pushSource(""),this.stackSlot||this.inlineStack.length||this.compileStack.length)throw new j["default"]("Compile completed with content left on stack");this.decorators.isEmpty()?this.decorators=void 0:(this.useDecorators=!0,this.decorators.prepend("var decorators = container.decorators;\n"),this.decorators.push("return fn;"),d?this.decorators=Function.apply(this,["fn","props","container","depth0","data","blockParams","depths",this.decorators.merge()]):(this.decorators.prepend("function(fn, props, container, depth0, data, blockParams, depths) {\n"),this.decorators.push("}\n"),this.decorators=this.decorators.merge()));var k=this.createFunctionContext(d);if(this.isChild)return k;var l={compiler:this.compilerInfo(),main:k};this.decorators&&(l.main_d=this.decorators,l.useDecorators=!0);var m=this.context,n=m.programs,o=m.decorators;for(h=0,i=n.length;i>h;h++)n[h]&&(l[h]=n[h],o[h]&&(l[h+"_d"]=o[h],l.useDecorators=!0));return this.environment.usePartial&&(l.usePartial=!0),this.options.data&&(l.useData=!0),this.useDepths&&(l.useDepths=!0),this.useBlockParams&&(l.useBlockParams=!0),this.options.compat&&(l.compat=!0),d?l.compilerOptions=this.options:(l.compiler=JSON.stringify(l.compiler),this.source.currentLocation={start:{line:1,column:0}},l=this.objectLiteral(l),b.srcName?(l=l.toStringWithSourceMap({file:b.destName}),l.map=l.map&&l.map.toString()):l=l.toString()),l},preamble:function(){this.lastContext=0,this.source=new m["default"](this.options.srcName),this.decorators=new m["default"](this.options.srcName)},createFunctionContext:function(a){var b="",c=this.stackVars.concat(this.registers.list);c.length>0&&(b+=", "+c.join(", "));var d=0;for(var e in this.aliases){var f=this.aliases[e];this.aliases.hasOwnProperty(e)&&f.children&&f.referenceCount>1&&(b+=", alias"+ ++d+"="+e,f.children[0]="alias"+d)}var g=["container","depth0","helpers","partials","data"];(this.useBlockParams||this.useDepths)&&g.push("blockParams"),this.useDepths&&g.push("depths");var h=this.mergeSource(b);return a?(g.push(h),Function.apply(this,g)):this.source.wrap(["function(",g.join(","),") {\n  ",h,"}"])},mergeSource:function(a){var b=this.environment.isSimple,c=!this.forceBuffer,d=void 0,e=void 0,f=void 0,g=void 0;return this.source.each(function(a){a.appendToBuffer?(f?a.prepend("  + "):f=a,g=a):(f&&(e?f.prepend("buffer += "):d=!0,g.add(";"),f=g=void 0),e=!0,b||(c=!1))}),c?f?(f.prepend("return "),g.add(";")):e||this.source.push('return "";'):(a+=", buffer = "+(d?"":this.initializeBuffer()),f?(f.prepend("return buffer + "),g.add(";")):this.source.push("return buffer;")),a&&this.source.prepend("var "+a.substring(2)+(d?"":";\n")),this.source.merge()},blockValue:function(a){var b=this.aliasable("helpers.blockHelperMissing"),c=[this.contextName(0)];this.setupHelperArgs(a,0,c);var d=this.popStack();c.splice(1,0,d),this.push(this.source.functionCall(b,"call",c))},ambiguousBlockValue:function(){var a=this.aliasable("helpers.blockHelperMissing"),b=[this.contextName(0)];this.setupHelperArgs("",0,b,!0),this.flushInline();var c=this.topStack();b.splice(1,0,c),this.pushSource(["if (!",this.lastHelper,") { ",c," = ",this.source.functionCall(a,"call",b),"}"])},appendContent:function(a){this.pendingContent?a=this.pendingContent+a:this.pendingLocation=this.source.currentLocation,this.pendingContent=a},append:function(){if(this.isInline())this.replaceStack(function(a){return[" != null ? ",a,' : ""']}),this.pushSource(this.appendToBuffer(this.popStack()));else{var a=this.popStack();this.pushSource(["if (",a," != null) { ",this.appendToBuffer(a,void 0,!0)," }"]),this.environment.isSimple&&this.pushSource(["else { ",this.appendToBuffer("''",void 0,!0)," }"])}},appendEscaped:function(){this.pushSource(this.appendToBuffer([this.aliasable("container.escapeExpression"),"(",this.popStack(),")"]))},getContext:function(a){this.lastContext=a},pushContext:function(){this.pushStackLiteral(this.contextName(this.lastContext))},lookupOnContext:function(a,b,c,d){var e=0;d||!this.options.compat||this.lastContext?this.pushContext():this.push(this.depthedLookup(a[e++])),this.resolvePath("context",a,e,b,c)},lookupBlockParam:function(a,b){this.useBlockParams=!0,this.push(["blockParams[",a[0],"][",a[1],"]"]),this.resolvePath("context",b,1)},lookupData:function(a,b,c){a?this.pushStackLiteral("container.data(data, "+a+")"):this.pushStackLiteral("data"),this.resolvePath("data",b,0,!0,c)},resolvePath:function(a,b,c,d,e){var f=this;if(this.options.strict||this.options.assumeObjects)return void this.push(g(this.options.strict&&e,this,b,a));for(var h=b.length;h>c;c++)this.replaceStack(function(e){var g=f.nameLookup(e,b[c],a);return d?[" && ",g]:[" != null ? ",g," : ",e]})},resolvePossibleLambda:function(){this.push([this.aliasable("container.lambda"),"(",this.popStack(),", ",this.contextName(0),")"])},emptyHash:function(a){this.pushStackLiteral(a?"undefined":"{}")},pushHash:function(){this.hash&&this.hashes.push(this.hash),this.hash={values:{}}},popHash:function(){var a=this.hash;this.hash=this.hashes.pop(),this.push(this.objectLiteral(a.values))},pushString:function(a){this.pushStackLiteral(this.quotedString(a))},pushLiteral:function(a){this.pushStackLiteral(a)},pushProgram:function(a){null!=a?this.pushStackLiteral(this.programExpression(a)):this.pushStackLiteral(null)},registerDecorator:function(a,b){var c=this.nameLookup("decorators",b,"decorator"),d=this.setupHelperArgs(b,a);this.decorators.push(["fn = ",this.decorators.functionCall(c,"",["fn","props","container",d])," || fn;"])},invokeHelper:function(a,b,c){var d=this.popStack(),e=this.setupHelper(a,b),f=c?[e.name," || "]:"",g=["("].concat(f,d);this.options.strict||g.push(" || ",this.aliasable("helpers.helperMissing")),g.push(")"),this.push(this.source.functionCall(g,"call",e.callParams))},invokeKnownHelper:function(a,b){var c=this.setupHelper(a,b);this.push(this.source.functionCall(c.name,"call",c.callParams))},invokeAmbiguous:function(a,b){this.useRegister("helper");var c=this.popStack();this.emptyHash();var d=this.setupHelper(0,a,b),e=this.lastHelper=this.nameLookup("helpers",a,"helper"),f=["(","(helper = ",e," || ",c,")"];this.options.strict||(f[0]="(helper = ",f.push(" != null ? helper : ",this.aliasable("helpers.helperMissing"))),this.push(["(",f,d.paramsInit?["),(",d.paramsInit]:[],"),","(typeof helper === ",this.aliasable('"function"')," ? ",this.source.functionCall("helper","call",d.callParams)," : helper))"])},invokePartial:function(a,b,c){var d=[],e=this.setupParams(b,1,d);a&&(b=this.popStack(),delete e.name),c&&(e.indent=JSON.stringify(c)),e.helpers="helpers",e.partials="partials",e.decorators="container.decorators",a?d.unshift(b):d.unshift(this.nameLookup("partials",b,"partial")),this.options.compat&&(e.depths="depths"),e=this.objectLiteral(e),d.push(e),this.push(this.source.functionCall("container.invokePartial","",d))},assignToHash:function(a){this.hash.values[a]=this.popStack()},compiler:f,compileChildren:function(a,b){for(var c=a.children,d=void 0,e=void 0,f=0,g=c.length;g>f;f++){d=c[f],e=new this.compiler;var h=this.matchExistingProgram(d);if(null==h){this.context.programs.push("");var i=this.context.programs.length;d.index=i,d.name="program"+i,this.context.programs[i]=e.compile(d,b,this.context,!this.precompile),this.context.decorators[i]=e.decorators,this.context.environments[i]=d,this.useDepths=this.useDepths||e.useDepths,this.useBlockParams=this.useBlockParams||e.useBlockParams,d.useDepths=this.useDepths,d.useBlockParams=this.useBlockParams}else d.index=h.index,d.name="program"+h.index,this.useDepths=this.useDepths||h.useDepths,this.useBlockParams=this.useBlockParams||h.useBlockParams}},matchExistingProgram:function(a){for(var b=0,c=this.context.environments.length;c>b;b++){var d=this.context.environments[b];if(d&&d.equals(a))return d}},programExpression:function(a){var b=this.environment.children[a],c=[b.index,"data",b.blockParams];return(this.useBlockParams||this.useDepths)&&c.push("blockParams"),this.useDepths&&c.push("depths"),"container.program("+c.join(", ")+")"},useRegister:function(a){this.registers[a]||(this.registers[a]=!0,this.registers.list.push(a))},push:function(a){return a instanceof e||(a=this.source.wrap(a)),this.inlineStack.push(a),a},pushStackLiteral:function(a){this.push(new e(a))},pushSource:function(a){this.pendingContent&&(this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent),this.pendingLocation)),this.pendingContent=void 0),a&&this.source.push(a)},replaceStack:function(a){var b=["("],c=void 0,d=void 0,f=void 0;if(!this.isInline())throw new j["default"]("replaceStack on non-inline");var g=this.popStack(!0);if(g instanceof e)c=[g.value],b=["(",c],f=!0;else{d=!0;var h=this.incrStack();b=["((",this.push(h)," = ",g,")"],c=this.topStack()}var i=a.call(this,c);f||this.popStack(),d&&this.stackSlot--,this.push(b.concat(i,")"))},incrStack:function(){return this.stackSlot++,this.stackSlot>this.stackVars.length&&this.stackVars.push("stack"+this.stackSlot),this.topStackName()},topStackName:function(){return"stack"+this.stackSlot},flushInline:function(){var a=this.inlineStack;this.inlineStack=[];for(var b=0,c=a.length;c>b;b++){var d=a[b];if(d instanceof e)this.compileStack.push(d);else{var f=this.incrStack();this.pushSource([f," = ",d,";"]),this.compileStack.push(f)}}},isInline:function(){return this.inlineStack.length},popStack:function(a){var b=this.isInline(),c=(b?this.inlineStack:this.compileStack).pop();if(!a&&c instanceof e)return c.value;if(!b){if(!this.stackSlot)throw new j["default"]("Invalid stack pop");this.stackSlot--}return c},topStack:function(){var a=this.isInline()?this.inlineStack:this.compileStack,b=a[a.length-1];return b instanceof e?b.value:b},contextName:function(a){return this.useDepths&&a?"depths["+a+"]":"depth"+a},quotedString:function(a){return this.source.quotedString(a)},objectLiteral:function(a){return this.source.objectLiteral(a)},aliasable:function(a){var b=this.aliases[a];return b?(b.referenceCount++,b):(b=this.aliases[a]=this.source.wrap(a),b.aliasable=!0,b.referenceCount=1,b)},setupHelper:function(a,b,c){var d=[],e=this.setupHelperArgs(b,a,d,c),f=this.nameLookup("helpers",b,"helper"),g=this.aliasable(this.contextName(0)+" != null ? "+this.contextName(0)+" : (container.nullContext || {})");return{params:d,paramsInit:e,name:f,callParams:[g].concat(d)}},setupParams:function(a,b,c){var d={},e=!c,f=void 0;e&&(c=[]),d.name=this.quotedString(a),d.hash=this.popStack();var g=this.popStack(),h=this.popStack();(h||g)&&(d.fn=h||"container.noop",d.inverse=g||"container.noop");for(var i=b;i--;)f=this.popStack(),c[i]=f;return e&&(d.args=this.source.generateArray(c)),this.options.data&&(d.data="data"),this.useBlockParams&&(d.blockParams="blockParams"),d},setupHelperArgs:function(a,b,c,d){var e=this.setupParams(a,b,c);return e=this.objectLiteral(e),d?(this.useRegister("options"),c.push("options"),["options=",e]):c?(c.push(e),""):e}},function(){for(var a="break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield null true false".split(" "),b=f.RESERVED_WORDS={},c=0,d=a.length;d>c;c++)b[a[c]]=!0}(),f.isValidJavaScriptVariableName=function(a){return!f.RESERVED_WORDS[a]&&/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(a)},b["default"]=f,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b,c){if(f.isArray(a)){for(var d=[],e=0,g=a.length;g>e;e++)d.push(b.wrap(a[e],c));return d}return"boolean"==typeof a||"number"==typeof a?a+"":a}function e(a){this.srcFile=a,this.source=[]}b.__esModule=!0;var f=c(3),g=void 0;try{}catch(h){}g||(g=function(a,b,c,d){this.src="",d&&this.add(d)},g.prototype={add:function(a){f.isArray(a)&&(a=a.join("")),this.src+=a},prepend:function(a){f.isArray(a)&&(a=a.join("")),this.src=a+this.src},toStringWithSourceMap:function(){return{code:this.toString()}},toString:function(){return this.src}}),e.prototype={isEmpty:function(){return!this.source.length},prepend:function(a,b){this.source.unshift(this.wrap(a,b))},push:function(a,b){this.source.push(this.wrap(a,b))},merge:function(){var a=this.empty();return this.each(function(b){a.add(["  ",b,"\n"])}),a},each:function(a){for(var b=0,c=this.source.length;c>b;b++)a(this.source[b])},empty:function(){var a=this.currentLocation||{start:{}};return new g(a.start.line,a.start.column,this.srcFile)},wrap:function(a){var b=arguments.length<=1||void 0===arguments[1]?this.currentLocation||{start:{}}:arguments[1];return a instanceof g?a:(a=d(a,this,b),new g(b.start.line,b.start.column,this.srcFile,a))},functionCall:function(a,b,c){return c=this.generateList(c),this.wrap([a,b?"."+b+"(":"(",c,")"])},quotedString:function(a){return'"'+(a+"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")+'"'},objectLiteral:function(a){var b=[];for(var c in a)if(a.hasOwnProperty(c)){var e=d(a[c],this);"undefined"!==e&&b.push([this.quotedString(c),":",e])}var f=this.generateList(b);return f.prepend("{"),f.add("}"),f},generateList:function(a){for(var b=this.empty(),c=0,e=a.length;e>c;c++)c&&b.add(","),b.add(d(a[c],this));return b},generateArray:function(a){var b=this.generateList(a);return b.prepend("["),b.add("]"),b}},b["default"]=e,a.exports=b["default"]}])});
// @license-end

},{}],16:[function(require,module,exports){
!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports):"function"==typeof define&&define.amd?define(["exports"],n):n(e.wanakana=e.wanakana||{})}(this,function(e){"use strict";function n(e){return"string"!=typeof e||!e.length}function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments[1],a=arguments[2];if(n(e))return!1;var r=e.charCodeAt(0);return r>=t&&a>=r}function a(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return[].concat(le(e)).map(function(e,n){var a=e.charCodeAt(0),r=t(e,re,oe),o=t(e,ie,ue);return r?String.fromCharCode(a-re+V):o?String.fromCharCode(a-ie+W):e}).join("")}function r(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=1>=arguments.length||void 0===arguments[1]||arguments[1];if(n(e))return!1;var a=t?/[bcdfghjklmnpqrstvwxyz]/:/[bcdfghjklmnpqrstvwxz]/;return-1!==e.toLowerCase().charAt(0).search(a)}function o(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&t(e,W,Y)}function i(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;return Math.min(e,n)}function u(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,t=arguments[2];return e.slice(n,t)}function y(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=1>=arguments.length||void 0===arguments[1]||arguments[1];if(n(e))return!1;var a=t?/[aeiouy]/:/[aeiou]/;return-1!==e.toLowerCase().charAt(0).search(a)}function c(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&e.charCodeAt(0)===ye}function h(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&e.charCodeAt(0)===ce}function s(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(!!c(e)||t(e,Z,$))}function f(){var e=[];return(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"").split("").forEach(function(n){if(c(n)||h(n))e.push(n);else if(s(n)){var t=n.charCodeAt(0)+(ee-Z),a=String.fromCharCode(t);e.push(a)}else e.push(n)}),e.join("")}function d(){return t(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",ee,ne)}function v(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(s(e)||d(e))}function l(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(v)}function g(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},a=arguments.length>2&&void 0!==arguments[2]&&arguments[2],c=Object.assign({},X,n),h=[],s=0,d=e.length,v=3,g="",w="";d>s;){var p=null;for(v=i(3,d-s);v>0;){if(g=u(e,s,s+v),w=g.toLowerCase(),se.includes(w)&&d-s>=4)w=(g=u(e,s,s+(v+=1))).toLowerCase();else{if("n"===w.charAt(0)){if(2===v){if(!c.IMEMode&&" "===w.charAt(1)){p="ん ";break}if(c.IMEMode&&"n'"===w){p="ん";break}}r(w.charAt(1),!1)&&y(w.charAt(2))&&(w=(g=u(e,s,s+(v=1))).toLowerCase())}"n"!==w.charAt(0)&&r(w.charAt(0))&&g.charAt(0)===g.charAt(1)&&(v=1,t(g.charAt(0),W,Y)?(w="ッ",g="ッ"):(w="っ",g="っ"))}if(null!=(p=fe[w]))break;v-=4===v?2:1}null==p&&(p=g),c.useObsoleteKana&&("wi"===w&&(p="ゐ"),"we"===w&&(p="ゑ")),c.IMEMode&&"n"===w.charAt(0)&&("y"===e.charAt(s+1).toLowerCase()&&!1===y(e.charAt(s+2))||s===d-1||l(e.charAt(s+1)))&&(p=g.charAt(0)),a||o(g.charAt(0))&&(p=f(p)),h.push(p),s+=v||1}return h.join("")}function w(e){var n=m(arguments.length>1&&void 0!==arguments[1]?arguments[1]:{});if(e instanceof Element&&ge.includes(e.nodeName)){var t=be();e.setAttribute("data-wanakana-id",t),e.autocapitalize="none",e.addEventListener("compositionupdate",b),e.addEventListener("input",n),we=k(n,t)}else console.warn("Input provided to wanakana.bind was not a valid input field.")}function p(e){var n=j(e);null!=n?(e.removeAttribute("data-wanakana-id"),e.removeEventListener("compositionupdate",b),e.removeEventListener("input",n.handler),we=A(n)):console.warn("Input had no listener registered.")}function m(e){var n=Object.assign({},X,e);return function(e){var t=e.target;if(me)me=!1;else{var r=a(t.value),o=g(x(r,n.IMEMode),Object.assign({},n,{IMEMode:!0}));if(r!==o){if(t.value=o,null!=t.setSelectionRange&&"number"==typeof t.selectionStart)return void t.setSelectionRange(t.value.length,t.value.length);if(null!=t.createTextRange){t.focus();var i=t.createTextRange();i.collapse(!1),i.select()}}}}}function b(e){var n=e.data||e.detail&&e.detail.data,t=n&&n.slice(-2).split("")||[],o="n"===t[0],i=t.every(function(e){return r(a(e))});me=!o&&i}function k(e,n){return we.concat({id:n,handler:e})}function j(e){return e&&we.find(function(n){return n.id===e.getAttribute("data-wanakana-id")})}function A(e){var n=e.id;return we.filter(function(e){return e.id!==n})}function x(e,n){switch(!0){case"toHiragana"===n:return e.toLowerCase();case"toKatakana"===n:return e.toUpperCase();default:return e}}function q(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&F.test(e)}function C(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(function(e){return q(e)})}function z(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(function(e){return B.test(e)})}function E(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(s)}function M(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(d)}function K(){return t(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",te,ae)}function L(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&[].concat(le(e)).every(K)}function O(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{passKanji:!0},t=[].concat(le(e)),a=!1;return n.passKanji||(a=t.some(L)),(t.some(E)||t.some(M))&&t.some(C)&&!a}function I(){for(var e=[],n="",t=(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"").split(""),a=0;t.length>a;a+=1){var r=t[a],o=[h(r),c(r)],i=o[0],u=o[1];if(i||u&&1>a)e.push(r);else if(u&&a>0){var y=de[n].slice(-1);e.push(he[y])}else if(d(r)){var s=r.charCodeAt(0)+(Z-ee),f=String.fromCharCode(s);e.push(f),n=f}else e.push(r),n=""}return e.join("")}function R(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},X,n),a=e.length,r=[],o=0,y=2,c="",h="",s=void 0;a>o;){y=i(2,a-o);for(var f=!1;y>0;){if(c=u(e,o,o+y),M(c)&&(f=t.upcaseKatakana,c=I(c)),"っ"===c.charAt(0)&&1===y&&a-1>o){s=!0,h="";break}if(null!=(h=de[c])&&s&&(h=h.charAt(0).concat(h),s=!1),null!=h)break;y-=1}null==h&&(h=c),f&&(h=h.toUpperCase()),r.push(h),o+=y||1}return r.join("")}function S(){return g(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},!0)}function T(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},X,n);return t.passRomaji?I(e):C(e)?S(e,t):O(e,{passKanji:!0})?S(I(e),t):I(e)}function H(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},X,n);return f(t.passRomaji?e:C(e)||O(e)?S(e,t):e)}function P(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&G.some(function(n){var a=ve(n,2);return t(e,a[0],a[1])})}function U(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return Q.some(function(n){var a=ve(n,2);return t(e,a[0],a[1])})}function D(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return!n(e)&&(P(e)||U(e))}function N(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{all:!1};if(n(e)||!z(e)||l(e))return e;var a=[].concat(le(e));if(t.all)return a.filter(function(e){return!v(e)}).join("");for(var r=a.reverse(),o=0,i=r.length;i>o;o+=1){var u=r[o];if(!D(u)){if(L(u))break;r[o]=""}}return r.reverse().join("")}function _(e){switch(!0){case U(e):return"japanesePunctuation";case K(e):return"kanji";case s(e):return"hiragana";case d(e):return"katakana";default:return"romaji"}}function J(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";if(n(e))return[""];var t=[].concat(le(e)),a=t.shift(),r=_(a);return t.reduce(function(e,n){var t=_(n)===r;if(r=_(n),t){var a=e.pop();return e.concat(a.concat(n))}return e.concat(n)},[a])}var X={useObsoleteKana:!1,passRomaji:!1,upcaseKatakana:!1,IMEMode:!1},B=/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff01-\uff0f\u4e00-\u9faf\u3400-\u4dbf]/,F=/[\u0000-\u007f\u0100-\u0101\u0112-\u0113\u012a-\u012b\u014c-\u014d\u016a-\u016b\u2018-\u2019\u201C-\u201D]/,G=[[33,47],[58,63],[91,96],[123,126],[8216,8217],[8220,8221]],Q=[[12289,12350],[12539,12540],[65281,65295],[65306,65311],[65339,65343],[65371,65376]],V=97,W=65,Y=90,Z=12353,$=12438,ee=12449,ne=12540,te=19968,ae=40879,re=65345,oe=65370,ie=65313,ue=65338,ye=12540,ce=12539,he={a:"あ",i:"い",u:"う",e:"え",o:"う"},se=["lts","chy","shy"],fe={".":"。",",":"、",":":"：","/":"・","!":"！","?":"？","~":"〜","-":"ー","‘":"「","’":"」","“":"『","”":"』","[":"［","]":"］","(":"（",")":"）","{":"｛","}":"｝",a:"あ",i:"い",u:"う",e:"え",o:"お",yi:"い",wu:"う",whu:"う",xa:"ぁ",xi:"ぃ",xu:"ぅ",xe:"ぇ",xo:"ぉ",xyi:"ぃ",xye:"ぇ",ye:"いぇ",wha:"うぁ",whi:"うぃ",whe:"うぇ",who:"うぉ",wi:"うぃ",we:"うぇ",va:"ゔぁ",vi:"ゔぃ",vu:"ゔ",ve:"ゔぇ",vo:"ゔぉ",vya:"ゔゃ",vyi:"ゔぃ",vyu:"ゔゅ",vye:"ゔぇ",vyo:"ゔょ",ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",lka:"ヵ",lke:"ヶ",xka:"ヵ",xke:"ヶ",kya:"きゃ",kyi:"きぃ",kyu:"きゅ",kye:"きぇ",kyo:"きょ",ca:"か",ci:"き",cu:"く",ce:"け",co:"こ",lca:"ヵ",lce:"ヶ",xca:"ヵ",xce:"ヶ",qya:"くゃ",qyu:"くゅ",qyo:"くょ",qwa:"くぁ",qwi:"くぃ",qwu:"くぅ",qwe:"くぇ",qwo:"くぉ",qa:"くぁ",qi:"くぃ",qe:"くぇ",qo:"くぉ",kwa:"くぁ",qyi:"くぃ",qye:"くぇ",ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",gya:"ぎゃ",gyi:"ぎぃ",gyu:"ぎゅ",gye:"ぎぇ",gyo:"ぎょ",gwa:"ぐぁ",gwi:"ぐぃ",gwu:"ぐぅ",gwe:"ぐぇ",gwo:"ぐぉ",sa:"さ",si:"し",shi:"し",su:"す",se:"せ",so:"そ",za:"ざ",zi:"じ",zu:"ず",ze:"ぜ",zo:"ぞ",ji:"じ",sya:"しゃ",syi:"しぃ",syu:"しゅ",sye:"しぇ",syo:"しょ",sha:"しゃ",shu:"しゅ",she:"しぇ",sho:"しょ",shya:"しゃ",shyu:"しゅ",shye:"しぇ",shyo:"しょ",swa:"すぁ",swi:"すぃ",swu:"すぅ",swe:"すぇ",swo:"すぉ",zya:"じゃ",zyi:"じぃ",zyu:"じゅ",zye:"じぇ",zyo:"じょ",ja:"じゃ",ju:"じゅ",je:"じぇ",jo:"じょ",jya:"じゃ",jyi:"じぃ",jyu:"じゅ",jye:"じぇ",jyo:"じょ",ta:"た",ti:"ち",tu:"つ",te:"て",to:"と",chi:"ち",tsu:"つ",ltu:"っ",xtu:"っ",tya:"ちゃ",tyi:"ちぃ",tyu:"ちゅ",tye:"ちぇ",tyo:"ちょ",cha:"ちゃ",chu:"ちゅ",che:"ちぇ",cho:"ちょ",cya:"ちゃ",cyi:"ちぃ",cyu:"ちゅ",cye:"ちぇ",cyo:"ちょ",chya:"ちゃ",chyu:"ちゅ",chye:"ちぇ",chyo:"ちょ",tsa:"つぁ",tsi:"つぃ",tse:"つぇ",tso:"つぉ",tha:"てゃ",thi:"てぃ",thu:"てゅ",the:"てぇ",tho:"てょ",twa:"とぁ",twi:"とぃ",twu:"とぅ",twe:"とぇ",two:"とぉ",da:"だ",di:"ぢ",du:"づ",de:"で",do:"ど",dya:"ぢゃ",dyi:"ぢぃ",dyu:"ぢゅ",dye:"ぢぇ",dyo:"ぢょ",dha:"でゃ",dhi:"でぃ",dhu:"でゅ",dhe:"でぇ",dho:"でょ",dwa:"どぁ",dwi:"どぃ",dwu:"どぅ",dwe:"どぇ",dwo:"どぉ",na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",nya:"にゃ",nyi:"にぃ",nyu:"にゅ",nye:"にぇ",nyo:"にょ",ha:"は",hi:"ひ",hu:"ふ",he:"へ",ho:"ほ",fu:"ふ",hya:"ひゃ",hyi:"ひぃ",hyu:"ひゅ",hye:"ひぇ",hyo:"ひょ",fya:"ふゃ",fyu:"ふゅ",fyo:"ふょ",fwa:"ふぁ",fwi:"ふぃ",fwu:"ふぅ",fwe:"ふぇ",fwo:"ふぉ",fa:"ふぁ",fi:"ふぃ",fe:"ふぇ",fo:"ふぉ",fyi:"ふぃ",fye:"ふぇ",ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",bya:"びゃ",byi:"びぃ",byu:"びゅ",bye:"びぇ",byo:"びょ",pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",pya:"ぴゃ",pyi:"ぴぃ",pyu:"ぴゅ",pye:"ぴぇ",pyo:"ぴょ",ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",mya:"みゃ",myi:"みぃ",myu:"みゅ",mye:"みぇ",myo:"みょ",ya:"や",yu:"ゆ",yo:"よ",xya:"ゃ",xyu:"ゅ",xyo:"ょ",ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",rya:"りゃ",ryi:"りぃ",ryu:"りゅ",rye:"りぇ",ryo:"りょ",la:"ら",li:"り",lu:"る",le:"れ",lo:"ろ",lya:"りゃ",lyi:"りぃ",lyu:"りゅ",lye:"りぇ",lyo:"りょ",wa:"わ",wo:"を",lwe:"ゎ",xwa:"ゎ",n:"ん",nn:"ん","n'":"ん","n ":"ん",xn:"ん",ltsu:"っ"},de={"　":" ","！":"!","？":"?","。":".","：":":","・":"/","、":",","〜":"~","ー":"-","「":"‘","」":"’","『":"“","』":"”","［":"[","］":"]","（":"(","）":")","｛":"{","｝":"}","あ":"a","い":"i","う":"u","え":"e","お":"o","ゔぁ":"va","ゔぃ":"vi","ゔ":"vu","ゔぇ":"ve","ゔぉ":"vo","か":"ka","き":"ki","きゃ":"kya","きぃ":"kyi","きゅ":"kyu","く":"ku","け":"ke","こ":"ko","が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go","ぎゃ":"gya","ぎぃ":"gyi","ぎゅ":"gyu","ぎぇ":"gye","ぎょ":"gyo","さ":"sa","す":"su","せ":"se","そ":"so","ざ":"za","ず":"zu","ぜ":"ze","ぞ":"zo","し":"shi","しゃ":"sha","しゅ":"shu","しょ":"sho","じ":"ji","じゃ":"ja","じゅ":"ju","じょ":"jo","た":"ta","ち":"chi","ちゃ":"cha","ちゅ":"chu","ちょ":"cho","つ":"tsu","て":"te","と":"to","だ":"da","ぢ":"di","づ":"du","で":"de","ど":"do","な":"na","に":"ni","にゃ":"nya","にゅ":"nyu","にょ":"nyo","ぬ":"nu","ね":"ne","の":"no","は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho","ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo","ふぁ":"fa","ふぃ":"fi","ふぇ":"fe","ふぉ":"fo","ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo","びゃ":"bya","びゅ":"byu","びょ":"byo","ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po","ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo","ま":"ma","み":"mi","む":"mu","め":"me","も":"mo","みゃ":"mya","みゅ":"myu","みょ":"myo","や":"ya","ゆ":"yu","よ":"yo","ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro","りゃ":"rya","りゅ":"ryu","りょ":"ryo","わ":"wa","を":"wo","ん":"n","ゐ":"wi","ゑ":"we","きぇ":"kye","きょ":"kyo","じぃ":"jyi","じぇ":"jye","ちぃ":"cyi","ちぇ":"che","ひぃ":"hyi","ひぇ":"hye","びぃ":"byi","びぇ":"bye","ぴぃ":"pyi","ぴぇ":"pye","みぇ":"mye","みぃ":"myi","りぃ":"ryi","りぇ":"rye","にぃ":"nyi","にぇ":"nye","しぃ":"syi","しぇ":"she","いぇ":"ye","うぁ":"wha","うぉ":"who","うぃ":"wi","うぇ":"we","ゔゃ":"vya","ゔゅ":"vyu","ゔょ":"vyo","すぁ":"swa","すぃ":"swi","すぅ":"swu","すぇ":"swe","すぉ":"swo","くゃ":"qya","くゅ":"qyu","くょ":"qyo","くぁ":"qwa","くぃ":"qwi","くぅ":"qwu","くぇ":"qwe","くぉ":"qwo","ぐぁ":"gwa","ぐぃ":"gwi","ぐぅ":"gwu","ぐぇ":"gwe","ぐぉ":"gwo","つぁ":"tsa","つぃ":"tsi","つぇ":"tse","つぉ":"tso","てゃ":"tha","てぃ":"thi","てゅ":"thu","てぇ":"the","てょ":"tho","とぁ":"twa","とぃ":"twi","とぅ":"twu","とぇ":"twe","とぉ":"two","ぢゃ":"dya","ぢぃ":"dyi","ぢゅ":"dyu","ぢぇ":"dye","ぢょ":"dyo","でゃ":"dha","でぃ":"dhi","でゅ":"dhu","でぇ":"dhe","でょ":"dho","どぁ":"dwa","どぃ":"dwi","どぅ":"dwu","どぇ":"dwe","どぉ":"dwo","ふぅ":"fwu","ふゃ":"fya","ふゅ":"fyu","ふょ":"fyo","ぁ":"a","ぃ":"i","ぇ":"e","ぅ":"u","ぉ":"o","ゃ":"ya","ゅ":"yu","ょ":"yo","っ":"","ゕ":"ka","ゖ":"ka","ゎ":"wa","んあ":"n'a","んい":"n'i","んう":"n'u","んえ":"n'e","んお":"n'o","んや":"n'ya","んゆ":"n'yu","んよ":"n'yo"},ve=function(){function e(e,n){var t=[],a=!0,r=!1,o=void 0;try{for(var i,u=e[Symbol.iterator]();!(a=(i=u.next()).done)&&(t.push(i.value),!n||t.length!==n);a=!0);}catch(e){r=!0,o=e}finally{try{!a&&u.return&&u.return()}finally{if(r)throw o}}return t}return function(n,t){if(Array.isArray(n))return n;if(Symbol.iterator in Object(n))return e(n,t);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),le=function(e){if(Array.isArray(e)){for(var n=0,t=Array(e.length);e.length>n;n++)t[n]=e[n];return t}return Array.from(e)},ge=["TEXTAREA","INPUT"],we=[],pe=0,me=!1,be=function(){return pe+=1,""+Date.now()+pe};e.bind=w,e.unbind=p,e.isRomaji=C,e.isJapanese=z,e.isKana=l,e.isHiragana=E,e.isKatakana=M,e.isMixed=O,e.isKanji=L,e.toRomaji=R,e.toKana=g,e.toHiragana=T,e.toKatakana=H,e.stripOkurigana=N,e.tokenize=J,Object.defineProperty(e,"__esModule",{value:!0})});

},{}]},{},[12]);
