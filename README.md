# Yomichan's web-service fork #
## Backend [Nodejs + mongodb] -><- Frontend [jquery + yomichan] ##

Yomichan turns your web browser into a tool for building Japanese language literacy by helping you to decipher texts
which would be otherwise too difficult tackle. This extension is similar to
[Rikaichan](https://addons.mozilla.org/en-US/firefox/addon/rikaichan/) for Firefox and
[Rikaikun](https://chrome.google.com/webstore/detail/rikaikun/jipdnfibhldikgcjhfnomkfpcebammhp?hl=en) for Chrome, but it
stands apart in its goal of being a all-encompassing learning tool as opposed to a mere browser-based dictionary.

### [About yomichan](https://github.com/FooSoft/yomichan#readme). Read this before you begin ###

## Service version ##

Here you can see yomichan's service version fork that consists of backend and frontentd parts. As a backend server we use NodeJS and mongodb as a database. Frontend part is made of frontend.js and float.js. And we added jquery a bit.

## Backend part ##

First of all run `npm install`. Then install these dependences to your computer: NodeJS, memcached, mongodb, [handlebars compile tool](http://handlebarsjs.com/precompilation.html), [browserify](http://browserify.org/). That's all. To start server running you can execute `node yomichan.js`.

## Frontend part ##

An example of frontend locates in ./example/index.html. It's better to see it and everything becomes clear. If you change templates, run `bash ./build_tmpl.sh` after that. If you change frontentd's scripts, run `bash build_front.sh` after all.

## Live example ##

Live usage of this web-service you can find on the [anisub.tv](http://anisub.tv/) site. 

## License ##

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
