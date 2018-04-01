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


function formRead() {
    const optionsOld = optionsLoad();
    const optionsNew = $.extend(true, {}, optionsOld);

    optionsNew.general.showGuide = $('#show-usage-guide').prop('checked');
    optionsNew.general.compactTags = $('#compact-tags').prop('checked');
    optionsNew.general.compactGlossaries = $('#compact-glossaries').prop('checked');
    optionsNew.general.resultOutputMode = $('#result-output-mode').val();
    optionsNew.general.audioSource = $('#audio-playback-source').val();
    optionsNew.general.audioVolume = parseFloat($('#audio-playback-volume').val());
    optionsNew.general.debugInfo = $('#show-debug-info').prop('checked');
    optionsNew.general.showAdvanced = $('#show-advanced-options').prop('checked');
    optionsNew.general.maxResults = parseInt($('#max-displayed-results').val(), 10);
    optionsNew.general.popupWidth = parseInt($('#popup-width').val(), 10);
    optionsNew.general.popupHeight = parseInt($('#popup-height').val(), 10);
    optionsNew.general.popupOffset = parseInt($('#popup-offset').val(), 10);

    optionsNew.scanning.middleMouse = $('#middle-mouse-button-scan').prop('checked');
    optionsNew.scanning.selectText = $('#select-matched-text').prop('checked');
    optionsNew.scanning.alphanumeric = $('#search-alphanumeric').prop('checked');
    optionsNew.scanning.autoHideResults = $('#auto-hide-results').prop('checked');
    optionsNew.scanning.delay = parseInt($('#scan-delay').val(), 10);
    optionsNew.scanning.length = parseInt($('#scan-length').val(), 10);
    optionsNew.scanning.modifier = $('#scan-modifier-key').val();

    optionsNew.anki.enable = $('#anki-enable').prop('checked');
    optionsNew.anki.tags = $('#card-tags').val().split(/[,; ]+/);
    optionsNew.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
    optionsNew.anki.server = $('#interface-server').val();
    optionsNew.anki.fieldTemplates = $('#field-templates').val();

    if (optionsOld.anki.enable && !ankiErrorShown()) {
        optionsNew.anki.terms.deck = $('#anki-terms-deck').val();
        optionsNew.anki.terms.model = $('#anki-terms-model').val();
        optionsNew.anki.terms.fields = ankiFieldsToDict($('#terms .anki-field-value'));
        optionsNew.anki.kanji.deck = $('#anki-kanji-deck').val();
        optionsNew.anki.kanji.model = $('#anki-kanji-model').val();
        optionsNew.anki.kanji.fields = ankiFieldsToDict($('#kanji .anki-field-value'));
    }

    optionsNew.general.mainDictionary = $('#dict-main').val();
    $('.dict-group').each((index, element) => {
        const dictionary = $(element);
        optionsNew.dictionaries[dictionary.data('title')] = {
            priority: parseInt(dictionary.find('.dict-priority').val(), 10),
            enabled: dictionary.find('.dict-enabled').prop('checked'),
            allowSecondarySearches: dictionary.find('.dict-allow-secondary-searches').prop('checked')
        };
    });

    return {optionsNew, optionsOld};
}

function formUpdateVisibility(options) {
    const general = $('#anki-general');
    if (options.anki.enable) {
        general.show();
    } else {
        general.hide();
    }

    const advanced = $('.options-advanced');
    if (options.general.showAdvanced) {
        advanced.show();
    } else {
        advanced.hide();
    }

    const mainGroup = $('#dict-main-group');
    if (options.general.resultOutputMode === 'merge') {
        mainGroup.show();
    } else {
        mainGroup.hide();
    }

    const debug = $('#debug');
    if (options.general.debugInfo) {
        const temp = utilIsolate(options);
        temp.anki.fieldTemplates = '...';
        const text = JSON.stringify(temp, null, 4);
        debug.html(handlebarsEscape(text));
        debug.show();
    } else {
        debug.hide();
    }
}

function formMainDictionaryOptionsPopulate(options) {
    const select = $('#dict-main').empty();
    select.append($('<option class="text-muted" value="">Not selected</option>'));

    let mainDictionary = '';
    for (const dictRow of utilDatabaseSummarize()) {
        if (dictRow.sequenced) {
            select.append($(`<option value="${dictRow.title}">${dictRow.title}</option>`));
            if (dictRow.title === options.general.mainDictionary) {
                mainDictionary = dictRow.title;
            }
        }
    }

    select.val(mainDictionary);
}

function onFormOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    const {optionsNew, optionsOld} = formRead();
    optionsSave(optionsNew);
    formUpdateVisibility(optionsNew);

    try {
        const ankiUpdated =
            optionsNew.anki.enable !== optionsOld.anki.enable ||
            optionsNew.anki.server !== optionsOld.anki.server;

        if (ankiUpdated) {
            ankiSpinnerShow(true);
            ankiDeckAndModelPopulate(optionsNew);
            ankiErrorShow();
        }
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
}

function onReady() {
    const options = optionsLoad();

    $('#show-usage-guide').prop('checked', options.general.showGuide);
    $('#compact-tags').prop('checked', options.general.compactTags);
    $('#compact-glossaries').prop('checked', options.general.compactGlossaries);
    $('#result-output-mode').val(options.general.resultOutputMode);
    $('#audio-playback-source').val(options.general.audioSource);
    $('#audio-playback-volume').val(options.general.audioVolume);
    $('#show-debug-info').prop('checked', options.general.debugInfo);
    $('#show-advanced-options').prop('checked', options.general.showAdvanced);
    $('#max-displayed-results').val(options.general.maxResults);
    $('#popup-width').val(options.general.popupWidth);
    $('#popup-height').val(options.general.popupHeight);
    $('#popup-offset').val(options.general.popupOffset);

    $('#middle-mouse-button-scan').prop('checked', options.scanning.middleMouse);
    $('#select-matched-text').prop('checked', options.scanning.selectText);
    $('#search-alphanumeric').prop('checked', options.scanning.alphanumeric);
    $('#auto-hide-results').prop('checked', options.scanning.autoHideResults);
    $('#scan-delay').val(options.scanning.delay);
    $('#scan-length').val(options.scanning.length);
    $('#scan-modifier-key').val(options.scanning.modifier);

    $('#dict-purge-link').click(utilAsync(onDictionaryPurge));
    $('#dict-file').change(utilAsync(onDictionaryImport));

    $('#anki-enable').prop('checked', options.anki.enable);
    $('#card-tags').val(options.anki.tags.join(' '));
    $('#sentence-detection-extent').val(options.anki.sentenceExt);
    $('#interface-server').val(options.anki.server);
    $('#field-templates').val(options.anki.fieldTemplates);
    $('#field-templates-reset').click(utilAsync(onAnkiFieldTemplatesReset));
    $('input, select, textarea').not('.anki-model').change(utilAsync(onFormOptionsChanged));
    $('.anki-model').change(utilAsync(onAnkiModelChanged));

    try {
        dictionaryGroupsPopulate(options);
        formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    }

    try {
        ankiDeckAndModelPopulate(options);
    } catch (e) {
        ankiErrorShow(e);
    }

    formUpdateVisibility(options);
}

$(document).ready(utilAsync(onReady));


/*
 * Dictionary
 */

function dictionaryErrorShow(error) {
    const dialog = $('#dict-error');
    if (error) {
        const overrides = [
            [
                'A mutation operation was attempted on a database that did not allow mutations.',
                'Access to IndexedDB appears to be restricted. Firefox seems to require that the history preference is set to "Remember history" before IndexedDB use of any kind is allowed.'
            ],
            [
                'The operation failed for reasons unrelated to the database itself and not covered by any other error code.',
                'Unable to access IndexedDB due to a possibly corrupt user profile. Try using the "Refresh Firefox" feature to reset your user profile.'
            ],
            [
                'BulkError',
                'Unable to finish importing dictionary data into IndexedDB. This may indicate that you do not have sufficient disk space available to complete this operation.'
            ]
        ];

        if (error.toString) {
            error = error.toString();
        }

        for (const [match, subst] of overrides) {
            if (error.includes(match)) {
                error = subst;
                break;
            }
        }

        dialog.show().text(error);
    } else {
        dialog.hide();
    }
}

function dictionarySpinnerShow(show) {
    const spinner = $('#dict-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function dictionaryGroupsSort() {
    const dictGroups = $('#dict-groups');
    const dictGroupChildren = dictGroups.children('.dict-group').sort((ca, cb) => {
        const pa = parseInt($(ca).find('.dict-priority').val(), 10);
        const pb = parseInt($(cb).find('.dict-priority').val(), 10);
        if (pa < pb) {
            return 1;
        } else if (pa > pb) {
            return -1;
        } else {
            return 0;
        }
    });

    dictGroups.append(dictGroupChildren);
}

function dictionaryGroupsPopulate(options) {
    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    const dictRows = utilDatabaseSummarize();
    if (dictRows.length === 0) {
        dictWarning.show();
    }

    for (const dictRow of dictRowsSort(dictRows, options)) {
        const dictOptions = options.dictionaries[dictRow.title] || {
            enabled: false,
            priority: 0,
            allowSecondarySearches: false
        };

        const dictHtml = apiTemplateRender('dictionary', {
            enabled: dictOptions.enabled,
            priority: dictOptions.priority,
            allowSecondarySearches: dictOptions.allowSecondarySearches,
            title: dictRow.title,
            version: dictRow.version,
            revision: dictRow.revision,
            outdated: dictRow.version < 3
        });

        dictGroups.append($(dictHtml));
    }

    formUpdateVisibility(options);

    $('.dict-enabled, .dict-priority, .dict-allow-secondary-searches').change(e => {
        dictionaryGroupsSort();
        onFormOptionsChanged(e);
    });
}

function onDictionaryPurge(e) {
    e.preventDefault();

    const dictControls = $('#dict-importer, #dict-groups, #dict-main-group').hide();
    const dictProgress = $('#dict-purge').show();

    try {
        dictionaryErrorShow();
        dictionarySpinnerShow(true);

        utilDatabasePurge();
        const options = optionsLoad();
        options.dictionaries = {};
        options.general.mainDictionary = '';
        optionsSave(options);

        dictionaryGroupsPopulate(options);
        formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    } finally {
        dictionarySpinnerShow(false);

        dictControls.show();
        dictProgress.hide();
    }
}

function onDictionaryImport(e) {
    const dictFile = $('#dict-file');
    const dictControls = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();

    try {
        dictionaryErrorShow();
        dictionarySpinnerShow(true);

        const setProgress = percent => dictProgress.find('.progress-bar').css('width', `${percent}%`);
        const updateProgress = (total, current) => setProgress(current / total * 100.0);
        setProgress(0.0);

        const options = optionsLoad();
        const summary = utilDatabaseImport(e.target.files[0], updateProgress);
        options.dictionaries[summary.title] = {enabled: true, priority: 0, allowSecondarySearches: false};
        if (summary.sequenced && options.general.mainDictionary === '') {
            options.general.mainDictionary = summary.title;
        }
        optionsSave(options);

        dictionaryGroupsPopulate(options);
        formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    } finally {
        dictionarySpinnerShow(false);

        dictFile.val('');
        dictControls.show();
        dictProgress.hide();
    }
}


/*
 * Anki
 */

function ankiSpinnerShow(show) {
    const spinner = $('#anki-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function ankiErrorShow(error) {
    const dialog = $('#anki-error');
    if (error) {
        dialog.show().text(error);
    }
    else {
        dialog.hide();
    }
}

function ankiErrorShown() {
    return $('#anki-error').is(':visible');
}

function ankiFieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

function ankiDeckAndModelPopulate(options) {
    const ankiFormat = $('#anki-format').hide();

    const deckNames = utilAnkiGetDeckNames();
    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    deckNames.sort().forEach(name => ankiDeck.append($('<option/>', {value: name, text: name})));

    const modelNames = utilAnkiGetModelNames();
    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    modelNames.sort().forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

    $('#anki-terms-deck').val(options.anki.terms.deck);
    ankiFieldsPopulate($('#anki-terms-model').val(options.anki.terms.model), options);

    $('#anki-kanji-deck').val(options.anki.kanji.deck);
    ankiFieldsPopulate($('#anki-kanji-model').val(options.anki.kanji.model), options);

    ankiFormat.show();
}

function ankiFieldsPopulate(element, options) {
    const modelName = element.val();
    if (!modelName) {
        return;
    }

    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();

    const markers = {
        'terms': [
            'audio',
            'cloze-body',
            'cloze-prefix',
            'cloze-suffix',
            'dictionary',
            'expression',
            'furigana',
            'furigana-plain',
            'glossary',
            'glossary-brief',
            'reading',
            'sentence',
            'tags',
            'url'
        ],
        'kanji': [
            'character',
            'dictionary',
            'glossary',
            'kunyomi',
            'onyomi',
            'sentence',
            'tags',
            'url'
        ]
    }[tabId] || {};

    for (const name of utilAnkiGetModelFieldNames(modelName)) {
        const value = options.anki[tabId].fields[name] || '';
        const html = Handlebars.templates['model']({name, markers, value});
        container.append($(html));
    }

    tab.find('.anki-field-value').change(utilAsync(onFormOptionsChanged));
    tab.find('.marker-link').click(onAnkiMarkerClicked);
}

function onAnkiMarkerClicked(e) {
    e.preventDefault();
    const link = e.target;
    $(link).closest('.input-group').find('.anki-field-value').val(`{${link.text}}`).trigger('change');
}

function onAnkiModelChanged(e) {
    try {
        if (!e.originalEvent) {
            return;
        }

        const element = $(this);
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');

        const {optionsNew, optionsOld} = formRead();
        optionsNew.anki[tabId].fields = {};
        optionsSave(optionsNew);

        ankiSpinnerShow(true);
        ankiFieldsPopulate(element, optionsNew);
        ankiErrorShow();
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
}

function onAnkiFieldTemplatesReset(e) {
    try {
        e.preventDefault();
        const options = optionsLoad();
        $('#field-templates').val(options.anki.fieldTemplates = optionsFieldTemplates());
        optionsSave(options);
    } catch (e) {
        ankiErrorShow(e);
    }
}
