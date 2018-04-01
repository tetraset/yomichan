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