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
