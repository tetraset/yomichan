var Handlebars = require('./../../mixed/lib/handlebars.min');
(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['dictionary.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "    <p class=\"text-warning\">This dictionary is outdated and may not support new extension features; please import the latest version.</p>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "checked";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"dict-group well well-sm\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">\n    <h4><span class=\"text-muted glyphicon glyphicon-book\"></span> "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + " <small>rev."
    + alias4(((helper = (helper = helpers.revision || (depth0 != null ? depth0.revision : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"revision","hash":{},"data":data}) : helper)))
    + "</small></h4>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.outdated : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"checkbox\">\n        <label><input type=\"checkbox\" class=\"dict-enabled\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.enabled : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Enable search</label>\n    </div>\n    <div class=\"checkbox options-advanced\">\n        <label><input type=\"checkbox\" class=\"dict-allow-secondary-searches\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.allowSecondarySearches : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Allow secondary searches</label>\n    </div>\n    <div class=\"form-group options-advanced\">\n        <label for=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">Result priority</label>\n        <input type=\"number\" value=\""
    + alias4(((helper = (helper = helpers.priority || (depth0 != null ? depth0.priority : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"priority","hash":{},"data":data}) : helper)))
    + "\" id=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\" class=\"form-control dict-priority\">\n    </div>\n</div>\n";
},"useData":true});
templates['kanji.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(8, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<table class=\"info-output\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</table>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <tr>\n        <th>"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.notes : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data})) != null ? stack1 : "")
    + "</th>\n        <td>"
    + container.escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "</td>\n    </tr>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"notes","hash":{},"data":data}) : helper)));
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data}) : helper)));
},"8":function(container,depth0,helpers,partials,data) {
    return "No data found\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"kanji\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.source : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/yomichan/ext/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n    <div class=\"glyph\">"
    + container.escapeExpression(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <table class=\"table table-condensed glyph-data\">\n        <tr>\n            <th>Glossary</th>\n            <th>Readings</th>\n            <th>Statistics</th>\n        </tr>\n        <tr>\n            <td class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(21, data, 0),"inverse":container.program(24, data, 0),"data":data})) != null ? stack1 : "")
    + "            </td>\n            <td class=\"reading\">\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.onyomi : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.kunyomi : depth0),{"name":"if","hash":{},"fn":container.program(29, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n            </td>\n            <td>"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.misc : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Classifications</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1["class"] : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Codepoints</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.code : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Dictionary Indices</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.index : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n    </table>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(31, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/yomichan/ext/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"kanji\"><img src=\"/yomichan/ext/mixed/img/add-kanji.png\" title=\"Add Kanji (Alt + K)\" alt></a>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"source-term\"><img src=\"/yomichan/ext/mixed/img/source-term.png\" title=\"Source term (Alt + B)\" alt></a>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <ol>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ol>\n";
},"22":function(container,depth0,helpers,partials,data) {
    return "<li><span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span></li>";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0))
    + "</span>\n";
},"26":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.onyomi : depth0),{"name":"each","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"27":function(container,depth0,helpers,partials,data) {
    return "<dd>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</dd>";
},"29":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.kunyomi : depth0),{"name":"each","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"31":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(32, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"32":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"34":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(35, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(36, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.kanji,depth0,{"name":"kanji","hash":{"root":(depths[1] != null ? depths[1].root : depths[1]),"source":(depths[1] != null ? depths[1].source : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"36":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"38":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.program(38, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["table"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"args":["kanji"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['model.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "                    <li><a class=\"marker-link\" href=\"#\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</a></li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<tr>\n    <td class=\"col-sm-2\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</td>\n    <td class=\"col-sm-10\">\n        <div class=\"input-group\">\n            <input type=\"text\" class=\"anki-field-value form-control\" data-field=\""
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\" value=\""
    + alias4(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "\">\n            <div class=\"input-group-btn\">\n                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\">\n                    <span class=\"caret\"></span>\n                </button>\n                <ul class=\"dropdown-menu dropdown-menu-right\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.markers : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </ul>\n            </div>\n        </div>\n    </td>\n</tr>\n";
},"useData":true});
templates['terms.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(17, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-info\"";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n    ("
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"each","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    only)\n</div>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    return ", ";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<ul "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n";
},"12":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-glossary\"";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <li><span class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "<div class=\"glossary-item "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"18":function(container,depth0,helpers,partials,data) {
    return "compact-glossary";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0)) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"term\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(23, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"unless","hash":{},"fn":container.program(25, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/yomichan/ext/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(28, data, 0, blockParams, depths),"inverse":container.program(42, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reasons : depth0),{"name":"if","hash":{},"fn":container.program(46, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(50, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.grouped : depth0),{"name":"if","hash":{},"fn":container.program(53, data, 0, blockParams, depths),"inverse":container.program(59, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(62, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"23":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/yomichan/ext/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kanji\"><img src=\"/yomichan/ext/mixed/img/add-term-kanji.png\" title=\"Add expression (Alt + E)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kana\"><img src=\"/yomichan/ext/mixed/img/add-term-kana.png\" title=\"Add reading (Alt + R)\" alt></a>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.playback : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-play-audio\"><img src=\"/yomichan/ext/mixed/img/play-audio.png\" title=\"Play audio (Alt + P)\" alt></a>\n";
},"28":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.expressions : depth0),{"name":"each","hash":{},"fn":container.program(29, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"29":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", buffer = 
  "<div class=\"expression\"><span class=\"expression-"
    + container.escapeExpression(((helper = (helper = helpers.termFrequency || (depth0 != null ? depth0.termFrequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"termFrequency","hash":{},"data":data}) : helper)))
    + "\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : alias2),(options={"name":"kanjiLinks","hash":{},"fn":container.program(30, data, 0, blockParams, depths),"inverse":container.noop,"data":data}),(typeof helper === alias3 ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span><div class=\"peek-wrapper\">"
    + ((stack1 = helpers["if"].call(alias1,(depths[1] != null ? depths[1].playback : depths[1]),{"name":"if","hash":{},"fn":container.program(32, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(37, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div><span class=\""
    + ((stack1 = helpers["if"].call(alias1,(data && data.last),{"name":"if","hash":{},"fn":container.program(40, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">、</span></div>";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options;

  stack1 = ((helper = (helper = helpers.furigana || (depth0 != null ? depth0.furigana : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"furigana","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.furigana) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { return stack1; }
  else { return ''; }
},"32":function(container,depth0,helpers,partials,data) {
    return "<a href=\"#\" class=\"action-play-audio\"><img src=\"/yomichan/ext/mixed/img/play-audio.png\" title=\"Play audio\" alt></a>";
},"34":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"tags\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(35, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"35":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"37":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"frequencies\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(38, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"38":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"40":function(container,depth0,helpers,partials,data) {
    return "invisible";
},"42":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "    <div class=\"expression\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"kanjiLinks","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(43, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"43":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div style=\"display: inline-block;\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(44, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"44":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"46":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div class=\"reasons\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.reasons : depth0),{"name":"each","hash":{},"fn":container.program(47, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"47":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <span class=\"reasons\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span> "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(48, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"48":function(container,depth0,helpers,partials,data) {
    return "&laquo;";
},"50":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(51, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"51":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"53":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(54, data, 0, blockParams, depths),"inverse":container.program(57, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"54":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "        <ol>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(55, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ol>\n";
},"55":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "            <li>"
    + ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>\n";
},"57":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["0"] : stack1),{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"59":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(53, data, 0, blockParams, depths),"inverse":container.program(60, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"60":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "        ";
},"62":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"64":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(65, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"65":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(66, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1]),"playback":(depths[1] != null ? depths[1].playback : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"merged":(depths[1] != null ? depths[1].merged : depths[1]),"grouped":(depths[1] != null ? depths[1].grouped : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"66":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"68":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found.</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(64, data, 0, blockParams, depths),"inverse":container.program(68, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["definition"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();module.exports.templates = Handlebars.templates || {};
