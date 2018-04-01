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
var api = require("./api");
var popup = require("./popup");
var doc = require("./document");

class Frontend {
    constructor() {
        this.popup = new popup.Popup();
        this.popupTimer = null;
        this.mouseDownLeft = false;
        this.mouseDownMiddle = false;
        this.textSourceLast = null;
        this.pendingLookup = false;
        this.options = null;
    }

    async prepare() {
        try {
            this.options = await global.yomichan_backend.getOptions();
            this.isTouchDevice = document.body.clientWidth < 400;

            if (this.isTouchDevice) {
                window.addEventListener('click', this.onMouseMove.bind(this), false);
            } else {
                window.addEventListener('mousedown', this.onMouseDown.bind(this), false);
                window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
                window.addEventListener('mouseover', this.onMouseOver.bind(this), false);
                window.addEventListener('mouseup', this.onMouseUp.bind(this), false);
            }

            window.addEventListener('mousedown', this.onMouseDown.bind(this), false);
            window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
            window.addEventListener('mouseover', this.onMouseOver.bind(this), false);
            window.addEventListener('mouseup', this.onMouseUp.bind(this), false);
            window.addEventListener('message', this.onFrameMessage.bind(this));
            window.addEventListener('resize', this.onResize.bind(this));

        } catch (e) {
            this.onError(e);
        }
    }

    onMouseOver(e) {
        if (e.target === this.popup.container && this.popupTimer) {
            this.popupTimerClear();
        }
    }

    onMouseMove(e) {
        this.popupTimerClear();

        if (!this.options.general.enable) {
            return;
        }

        if (this.mouseDownLeft) {
            return;
        }

        if (this.pendingLookup) {
            return;
        }

        const mouseScan = this.mouseDownMiddle && this.options.scanning.middleMouse;
        const keyScan =
            this.options.scanning.modifier === 'alt' && e.altKey ||
            this.options.scanning.modifier === 'ctrl' && e.ctrlKey ||
            this.options.scanning.modifier === 'shift' && e.shiftKey ||
            this.options.scanning.modifier === 'none';

        if (!keyScan && !mouseScan) {
            return;
        }

        const search = () => {
            try {
                this.searchAt({x: e.clientX, y: e.clientY});
            } catch (e) {
                this.onError(e);
            }
        };

        if (this.options.scanning.modifier === 'none') {
            this.popupTimerSet(search);
        } else {
            search();
        }
    }

    onMouseDown(e) {
        this.mousePosLast = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();
        this.searchClear();

        if (e.which === 1) {
            this.mouseDownLeft = true;
        } else if (e.which === 2) {
            this.mouseDownMiddle = true;
        }
    }

    onMouseUp(e) {
        if (e.which === 1) {
            this.mouseDownLeft = false;
        } else if (e.which === 2) {
            this.mouseDownMiddle = false;
        }
    }

    onFrameMessage(e) {
        const handlers = {
            popupClose: () => {
                this.searchClear();
            },

            selectionCopy: () => {
                doc.execCommand('copy');
            },
            
            errorMessage: () => {
                var msg = localStorage.getItem("errorMessage");
                alert(msg && msg !== 'undefined' ? msg : 'Server error');
            },
        };

        const handler = handlers[e.data];
        if (handler) {
            handler();
        }
    }

    onResize() {
        this.searchClear();
    }

    onBgMessage({action, params}, sender, callback) {
        const handlers = {
            optionsSet: options => {
                this.options = options;
                if (!this.options.enable) {
                    this.searchClear();
                }
            }
        };

        const handler = handlers[action];
        if (handler) {
            handler(params);
        }

        callback();
    }

    onError(error) {
        window.alert(`Error: ${error.toString ? error.toString() : error}`);
    }

    popupTimerSet(callback) {
        this.popupTimerClear();
        this.popupTimer = window.setTimeout(callback, this.options.scanning.delay);
    }

    popupTimerClear() {
        if (this.popupTimer) {
            window.clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
    }

    async searchAt(point) {
        if (this.pendingLookup || this.popup.containsPoint(point)) {
            return;
        }

        const textSource = doc.docRangeFromPoint(point);
        let hideResults = !textSource || !textSource.containsPoint(point);

        try {
            if (!hideResults && (!this.textSourceLast || !this.textSourceLast.equals(textSource))) {
                this.pendingLookup = true;
                hideResults = await !this.searchTerms(textSource) && await !this.searchKanji(textSource);
            }
        } catch (e) {
            if (window.yomichan_orphaned) {
                if (textSource && this.options.scanning.modifier !== 'none') {
                    this.popup.showOrphaned(textSource.getRect(), this.options);
                }
            } else {
                this.onError(e);
            }
        } finally {
            if (hideResults && this.options.scanning.autoHideResults) {
                this.searchClear();
            } else {
                doc.docImposterDestroy();
            }

            this.pendingLookup = false;
        }
    }

    async searchTerms(textSource) {
        textSource.setEndOffset(this.options.scanning.length);

        const result = await api.apiTermsFind(textSource.text());
        if (!result.definitions || result.definitions.length === 0) {
            return false;
        }

        textSource.setEndOffset(result.length);

        const sentence = doc.docSentenceExtract(textSource, this.options.anki.sentenceExt);
        const url = window.location.href;
        await this.popup.termsShow(
            textSource.getRect(),
            result.definitions,
            this.options,
            {sentence, url},
            this.isTouchDevice
        );

        this.textSourceLast = textSource;
        if (this.options.scanning.selectText) {
            textSource.select();
        }

        return true;
    }

    async searchKanji(textSource) {
        textSource.setEndOffset(1);

        const definitions = await api.apiKanjiFind(textSource.text());
        if (definitions.length === 0) {
            return false;
        }

        const sentence = doc.docSentenceExtract(textSource, this.options.anki.sentenceExt);
        const url = window.location.href;
        this.popup.kanjiShow(
            textSource.getRect(),
            definitions,
            this.options,
            {sentence, url}
        );

        this.textSourceLast = textSource;
        if (this.options.scanning.selectText) {
            textSource.select();
        }

        return true;
    }

    searchClear() {
        doc.docImposterDestroy();
        this.popup.hide();

        if (this.options.scanning.selectText && this.textSourceLast) {
            this.textSourceLast.deselect();
        }

        this.textSourceLast = null;
    }

    onMessage({action, params}, sender, callback) {

        var callbackFunc;
        if (typeof callbackFunc !== 'function') {
            callbackFunc = function (r) {}
        }

        if (action !== 'termsFind' && action !== 'kanjiFind') {
            global.yomichan_backend.onMessage({action, params}, sender, callbackFunc);
            return true;
        }

        const forward = (promise, callbackFunc) => {
            return promise.then(result => {
               callbackFunc({result});
            }).catch(error => {
                callbackFunc({error: error.toString ? error.toString() : error});
            });
        };

        const handlers = {
            kanjiFind: ({text, callbackFunc}) => {
                forward(api.apiKanjiFind(text), callbackFunc);
            },
            termsFind: ({text, callbackFunc}) => {
                forward(api.apiTermsFind(text), callbackFunc);
            }
        };

        const handler = handlers[action];
        if (handler) {
            params.callback = callbackFunc;
            handler(params);
        }

        return true;
    }
}

window.yomichan_frontend = new Frontend();