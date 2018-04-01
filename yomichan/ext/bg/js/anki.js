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