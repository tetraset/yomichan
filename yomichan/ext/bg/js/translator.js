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

var database = require("./database");
var deinfl = require("./deinflector");
var dict = require("./dictionary");
var api = require("./api");
const fs = require('fs');
const path = require('path');
var jap = require("./../../mixed/js/japanese");

class Translator {
    constructor() {
        this.database = null;
        this.deinflector = null;
    }

    async prepare() {
        if (!this.database) {
            this.database = new database.Database();
            await this.database.prepare();
        }

        if (!this.deinflector) {
            const reasons = JSON.parse(fs.readFileSync(path.resolve('yomichan/ext/bg/lang/deinflect.json'), 'utf8'));
            this.deinflector = new deinfl.Deinflector(reasons);
        }
    }

    async findTermsGrouped(text, dictionaries, alphanumeric, lang) {
        const options = await api.apiOptionsGet();
        const titles = Object.keys(dictionaries);
        const {length, definitions} = await this.findTerms(text, dictionaries, alphanumeric, lang);

        const definitionsGrouped = dict.dictTermsGroup(definitions, dictionaries);
        for (const definition of definitionsGrouped) {
            await this.buildTermFrequencies(definition, titles);
        }

        if (options.general.compactTags) {
            for (const definition of definitionsGrouped) {
                dict.dictTermsCompressTags(definition.definitions);
            }
        }

        return {length, definitions: definitionsGrouped};
    }

    async findTermsMerged(text, dictionaries, alphanumeric, lang=null) {
        const options = await api.apiOptionsGet();
        const secondarySearchTitles = Object.keys(options.dictionaries).filter(dict => options.dictionaries[dict].allowSecondarySearches);
        const titles = Object.keys(dictionaries);
        const {length, definitions} = await this.findTerms(text, dictionaries, alphanumeric, lang);

        const definitionsBySequence = dict.dictTermsMergeBySequence(definitions, options.general.mainDictionary);

        const definitionsMerged = [];
        const mergedByTermIndices = new Set();
        for (const sequence in definitionsBySequence) {
            if (sequence < 0) {
                continue;
            }

            const result = definitionsBySequence[sequence];

            const rawDefinitionsBySequence = await this.database.findTermsBySequence(Number(sequence), options.general.mainDictionary);

            for (const definition of rawDefinitionsBySequence) {
                const tags = await this.expandTags(definition.definitionTags, definition.dictionary);
                tags.push(dict.dictTagBuildSource(definition.dictionary));
                definition.definitionTags = tags;
            }

            const definitionsByGloss = dict.dictTermsMergeByGloss(result, rawDefinitionsBySequence);

            const secondarySearchResults = [];
            if (secondarySearchTitles.length > 0) {
                for (const expression of result.expressions.keys()) {
                    if (expression === text) {
                        continue;
                    }

                    for (const reading of result.expressions.get(expression).keys()) {
                        for (const definition of await this.database.findTermsExact(expression, reading, secondarySearchTitles)) {
                            const tags = await this.expandTags(definition.definitionTags, definition.dictionary);
                            tags.push(dict.dictTagBuildSource(definition.dictionary));
                            definition.definitionTags = tags;
                            secondarySearchResults.push(definition);
                        }
                    }
                }
            }

            dict.dictTermsMergeByGloss(result, definitionsBySequence['-1'].concat(secondarySearchResults), definitionsByGloss, mergedByTermIndices);

            for (const gloss in definitionsByGloss) {
                const definition = definitionsByGloss[gloss];
                dict.dictTagsSort(definition.definitionTags);
                result.definitions.push(definition);
            }

            dict.dictTermsSort(result.definitions, dictionaries, lang);

            const expressions = [];
            for (const expression of result.expressions.keys()) {
                for (const reading of result.expressions.get(expression).keys()) {
                    const tags = await this.expandTags(result.expressions.get(expression).get(reading), result.dictionary);
                    expressions.push({
                        expression: expression,
                        reading: reading,
                        termTags: dict.dictTagsSort(tags),
                        termFrequency: (score => {
                            if (score > 0) {
                                return 'popular';
                            } else if (score < 0) {
                                return 'rare';
                            } else {
                                return 'normal';
                            }
                        })(tags.map(tag => tag.score).reduce((p, v) => p + v, 0))
                    });
                }
            }

            result.expressions = expressions;

            result.expression = Array.from(result.expression);
            result.reading = Array.from(result.reading);

            definitionsMerged.push(result);
        }

        const strayDefinitions = definitionsBySequence['-1'].filter((definition, index) => !mergedByTermIndices.has(index));
        for (const groupedDefinition of dict.dictTermsGroup(strayDefinitions, dictionaries)) {
            groupedDefinition.expressions = [{expression: groupedDefinition.expression, reading: groupedDefinition.reading}];
            definitionsMerged.push(groupedDefinition);
        }

        for (const definition of definitionsMerged) {
            await this.buildTermFrequencies(definition, titles);
        }

        if (options.general.compactTags) {
            for (const definition of definitionsMerged) {
                dict.dictTermsCompressTags(definition.definitions);
            }
        }

        return {length, definitions: dict.dictTermsSort(definitionsMerged, null, lang)};
    }

    async findTermsSplit(text, dictionaries, alphanumeric, lang=null) {
        const titles = Object.keys(dictionaries);
        const {length, definitions} = await this.findTerms(text, dictionaries, alphanumeric, lang);

        for (const definition of definitions) {
            await this.buildTermFrequencies(definition, titles);
        }

        return {length, definitions};
    }

    async findTerms(text, dictionaries, alphanumeric, lang=null) {
        if (!alphanumeric && text.length > 0) {
            const c = text[0];
            if (!jap.jpIsKana(c) && !jap.jpIsKanji(c)) {
                return {length: 0, definitions: []};
            }
        }

        const cache = {};
        const titles = Object.keys(dictionaries);

        let deinflections = await this.findTermDeinflections(text, titles, cache);
        const textHiragana = jap.jpKatakanaToHiragana(text);
        if (text !== textHiragana) {
            deinflections = deinflections.concat(await this.findTermDeinflections(textHiragana, titles, cache));
        }

        let definitions = [];

        for (const deinflection of deinflections) {
            for (const definition of deinflection.definitions) {
                const definitionTags = await this.expandTags(definition.definitionTags, definition.dictionary);
                definitionTags.push(dict.dictTagBuildSource(definition.dictionary));
                const termTags = await this.expandTags(definition.termTags, definition.dictionary);

                definitions.push({
                    source: deinflection.source,
                    reasons: deinflection.reasons,
                    score: definition.score,
                    id: definition.id,
                    dictionary: definition.dictionary,
                    expression: definition.expression,
                    reading: definition.reading,
                    glossary: definition.glossary,
                    definitionTags: dict.dictTagsSort(definitionTags),
                    termTags: dict.dictTagsSort(termTags),
                    sequence: definition.sequence,
                    lang: definition.lang
                });
            }
        }

        definitions = dict.dictTermsUndupe(definitions);
        definitions = dict.dictTermsSort(definitions, dictionaries, lang);

        let length = 0;
        for (const definition of definitions) {
            length = Math.max(length, definition.source.length);
        }

        return {length, definitions};
    }

    async findTermDeinflections(text, titles, cache) {
        const definer = async term => {
            if (cache.hasOwnProperty(term)) {
                return cache[term];
            } else {
                return cache[term] = await this.database.findTerms(term, titles);
            }
        };

        let deinflections = [];
        for (let i = text.length; i > 0; --i) {
            const textSlice = text.slice(0, i);
            deinflections = deinflections.concat(await this.deinflector.deinflect(textSlice, definer));
        }

        return deinflections;
    }

    async findKanji(text, dictionaries, lang=null) {
        var definitions = [];
        const processed = {};
        const titles = Object.keys(dictionaries);
        for (const c of text) {
            if (!processed[c]) {
                definitions = definitions.concat(await this.database.findKanji(c, titles));
                processed[c] = true;
            }
        }

        definitions = definitions.filter(function (v) {
            return lang !== null ? v && (v.lang == lang || v.lang == 'en') : v;
        });

        for (const definition of definitions) {
            const tags = await this.expandTags(definition.tags, definition.dictionary);
            tags.push(dict.dictTagBuildSource(definition.dictionary));

            definition.tags = dict.dictTagsSort(tags);
            definition.stats = await this.expandStats(definition.stats, definition.dictionary);

            definition.frequencies = [];
            for (const meta of await this.database.findKanjiMeta(definition.character, titles)) {
                if (meta.mode === 'freq') {
                    definition.frequencies.push({
                        character: meta.character,
                        frequency: meta.data,
                        dictionary: meta.dictionary,
                        lang: meta.lang
                    });
                }
            }
        }

        return definitions;
    }

    async buildTermFrequencies(definition, titles) {
        let terms = [];
        if (definition.expressions) {
            terms = terms.concat(definition.expressions);
        } else {
            terms.push(definition);
        }

        for (const term of terms) {
            term.frequencies = [];
            for (const meta of await this.database.findTermMeta(term.expression, titles)) {
                if (meta && meta.mode === 'freq') {
                    term.frequencies.push({
                        expression: meta.expression,
                        frequency: meta.data,
                        dictionary: meta.dictionary,
                        lang: meta.lang
                    });
                }
            }
        }
    }

    async expandTags(names, title) {
        const tags = [];
        for (const name of names) {
            const base = name.split(':')[0];
            const meta = await this.database.findTagForTitle(base, title);

            const tag = {name};
            for (const prop in meta || {}) {
                if (prop !== 'name') {
                    tag[prop] = meta[prop];
                }
            }

            tags.push(dict.dictTagSanitize(tag));
        }

        return tags;
    }

    async expandStats(items, title) {
        const stats = {};
        for (const name in items) {
            const base = name.split(':')[0];
            const meta = await this.database.findTagForTitle(base, title);
            const group = stats[meta.category] = stats[meta.category] || [];

            const stat = {name, value: items[name]};
            for (const prop in meta || {}) {
                if (prop !== 'name') {
                    stat[prop] = meta[prop];
                }
            }

            group.push(dict.dictTagSanitize(stat));
        }

        for (const category in stats) {
            stats[category].sort((a, b) => {
                if (a.notes < b.notes) {
                    return -1;
                } else if (a.notes > b.notes) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }

        return stats;
    }
}

module.exports.Translator = Translator;