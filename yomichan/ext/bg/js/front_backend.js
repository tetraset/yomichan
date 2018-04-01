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
