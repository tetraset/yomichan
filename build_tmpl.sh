#!/bin/sh
handlebars ./yomichan/tmpl/*.html -f ./yomichan/ext/bg/js/templates.js \
&& echo "var Handlebars = require('./../../mixed/lib/handlebars.min');" | cat - ./yomichan/ext/bg/js/templates.js > ./temp && mv ./temp ./yomichan/ext/bg/js/templates.js \
&& echo "module.exports.templates = Handlebars.templates || {};" >> ./yomichan/ext/bg/js/templates.js