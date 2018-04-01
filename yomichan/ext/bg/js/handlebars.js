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
