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
