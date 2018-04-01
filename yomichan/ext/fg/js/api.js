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