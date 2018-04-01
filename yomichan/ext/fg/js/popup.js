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


class Popup {
    constructor() {
        this.container = document.createElement('iframe');
        this.container.id = 'yomichan-float';
        this.container.addEventListener('mousedown', e => e.stopPropagation());
        this.container.addEventListener('scroll', e => e.stopPropagation());
        this.container.setAttribute('src', '/yomichan/ext/fg/float.html');
        this.container.style.width = '0px';
        this.container.style.height = '0px';
        this.injected = null;
    }

    async inject() {
        if (!this.injected) {
            this.injected = new Promise((resolve, reject) => {
                this.container.addEventListener('load', resolve);
                document.body.appendChild(this.container);
            });
        }

        return this.injected;
    }

    async show(elementRect, options, isTouchDevice=false) {
        await this.inject();

        const containerStyle = window.getComputedStyle(this.container);
        const containerHeight = parseInt(containerStyle.height);
        const containerWidth = parseInt(containerStyle.width);

        const limitX = document.body.clientWidth;
        const limitY = window.innerHeight;

        let x = elementRect.left;
        let width = Math.max(containerWidth, options.general.popupWidth);
        const overflowX = Math.max(x + width - limitX, 0);
        if (overflowX > 0) {
            if (x >= overflowX) {
                x -= overflowX;
            } else {
                width = limitX;
                x = 0;
            }
        }

        let y = 0;
        let height = Math.max(containerHeight, options.general.popupHeight);
        const yBelow = elementRect.bottom + options.general.popupOffset;
        const yAbove = elementRect.top - options.general.popupOffset;
        const overflowBelow = Math.max(yBelow + height - limitY, 0);
        const overflowAbove = Math.max(height - yAbove, 0);
        if (overflowBelow > 0 || overflowAbove > 0) {
            if (overflowBelow < overflowAbove) {
                height = Math.max(height - overflowBelow, 0);
                y = yBelow;
            } else {
                height = Math.max(height - overflowAbove, 0);
                y = Math.max(yAbove - height, 0);
            }
        } else {
            y = yBelow;
        }

        if (isTouchDevice) {
            x = 0;
            width = 200;
            height = 250;
            this.container.style.bottom = 0;
            this.container.style.position = 'fixed';
            this.container.style.zIndex = 20;
            this.container.style.backgroundColor = '#fff';
        } else {
            this.container.style.top = y + 'px';
        }

        this.container.style.left = x + 'px';

        this.container.style.width = width +'px';
        this.container.style.height = height + 'px';
        this.container.style.visibility = 'visible';
    }

    async showOrphaned(elementRect, options) {
        await this.show(elementRect, options);
        this.invokeApi('orphaned');
    }

    hide() {
        this.container.style.visibility = 'hidden';
    }

    isVisible() {
        return this.injected && this.container.style.visibility !== 'hidden';
    }

    containsPoint(point) {
        if (!this.isVisible()) {
            return false;
        }

        const rect = this.container.getBoundingClientRect();
        const contained =
            point.x >= rect.left &&
            point.y >= rect.top &&
            point.x < rect.right &&
            point.y < rect.bottom;

        return contained;
    }

    async termsShow(elementRect, definitions, options, context, isTouchDevice=false) {
        await this.show(elementRect, options, isTouchDevice);
        await this.invokeApi('termsShow', {definitions, options, context});
    }

    async kanjiShow(elementRect, definitions, options, context) {
        await this.show(elementRect, options);
        await this.invokeApi('kanjiShow', {definitions, options, context});
    }

    async invokeApi(action, params={}) {
        await this.container.contentWindow.postMessage({action, params}, '*');
    }
}

module.exports.Popup = Popup;