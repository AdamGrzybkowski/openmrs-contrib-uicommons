/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */

var template = require('./openmrs-list.html');
var openmrs = require('../../src/scss/images/inprogress.gif');
import openmrsRest from './../openmrs-rest/openmrs-rest.js';

export default angular.module('openmrs-contrib-uicommons.list', ['openmrs-contrib-uicommons.rest'])
    .component('openmrsList', {
        template: template,
        controller: openmrsList,
        controllerAs: 'vm',
        bindings: {
            resource: '<',
            columns: '<',
            type: '<',
            actions: '<',
            enableSearch: '<',
            limit: '<',
            listAll: '<'
        }
    }).name;

openmrsList.$inject = ['openmrsRest', '$scope', '$location'];

function openmrsList(openmrsRest, $scope, $location) {
    var vm = this;

    //Initial loading logo
    vm.logo = openmrs;

    //Initial data and query
    vm.data = [];
    vm.query = '';

    vm.entriesPerPage;

    //Default icon values
    vm.icon =
    {
        edit : "icon-pencil edit-action",
        retire : "icon-remove delete-action",
        unretire : "icon-reply edit-action",
        purge  : "icon-trash delete-action",
        view : "icon-eye-open edit-action"
    };

    function resolveDefaultAttributes() {
        vm.getType = getType;
        function getType() {
            if (angular.isUndefined(vm.type)) {
                return 'table'
            }
            else {
                return vm.type;
            }
        }

        vm.getActions = getActions;
        function getActions() {
            if (angular.isUndefined(vm.actions)) {
                return [{"action":"view", "label":"View"}]
            }
            else {
                return vm.actions;
            }
        }
        vm.actionsBackup = vm.getActions();
        vm.getSearchPanel = getSearchPanel;
        function getSearchPanel() {
            if (angular.isUndefined(vm.enableSearch)) {
                return false;
            }
            else {
                return vm.enableSearch;
            }
        }
        vm.getLimit = getLimit;
        function getLimit() {
            if (angular.isUndefined(vm.limit)) {
                return 10;
            }
            else {
                return vm.limit;
            }
        }
        vm.entriesPerPage = vm.getLimit();

        vm.getListAll = getListAll;
        function getListAll() {
            if (angular.isUndefined(vm.listAll)) {
                return false;
            }
            else {
                return vm.listAll;
            }
        }
    }
    resolveDefaultAttributes();

    vm.isTextClickable = false;
    vm.resolveDefaultClickLink = resolveDefaultClickLink;

    function resolveDefaultClickLink() {

        var dataSet = vm.getActions();

        for(var i = 0; i < dataSet.length; i++) {
            if (dataSet[i].action === 'view') {
                vm.isTextClickable = true;
                if (angular.isDefined(dataSet[i].link)) {
                    vm.link = dataSet[i].link;
                }
                else {
                    vm.link = '#/' + vm.resource + '/';
                }
            }
            else if (dataSet[i].action === 'edit') {
                vm.isTextClickable = true;
                if (angular.isDefined(dataSet[i].link)) {
                    vm.link = dataSet[i].link;
                }
                else {
                    vm.link = '#/' + vm.resource + '/edit/';
                }
            }
        }
    }
    resolveDefaultClickLink();

    //Resolves default redirect links to edit/view pages
    vm.resolveRedirectLinks = resolveRedirectLinks;
    function resolveRedirectLinks(item) {
        if (vm.link.indexOf('{uuid}') > -1) {
            return vm.link.replace('{uuid}', item.uuid)
        }
        else {
            return vm.link + item.uuid
        }
    }

    //Manage custom icons and labels values
    function resolveCustomIcons() {
        if (angular.isDefined(vm.actions)) {
            for (var i = 0; i < vm.actions.length; i++) {
                if (angular.isDefined(vm.actions[i].icon)) {
                    vm.icon[vm.actions[i].action] = vm.actions[i].icon;
                }
            }
        }
    }
    function resolveCustomLabels() {
        if (angular.isDefined(vm.columns)) {
            for (var i = 0; i < vm.columns.length; i++) {
                if (angular.isUndefined(vm.columns[i].label)) {
                    vm.columns[i].label = vm.columns[i].property;
                }
            }
        }
    }
    resolveCustomIcons();
    resolveCustomLabels();

    //Find out which action button to put - retire or unretire
    vm.resolveRetireButtons = function(object, activity) {
        return !((object.retired && activity === 'retire')
        || (!object.retired && activity === 'unretire'));
    };

    //Button onClicks
    vm.performAction = function(object, activity) {
        switch (activity) {
            case 'edit' :
                edit(object);
                break;
            case 'view' :
                edit(object);
                break;
            case 'retire' :
                showRetireAlert(object);
                break;
            case 'unretire' :
                unretire(object);
                break;
            case 'purge' :
                showDeleteAlert(object);
                break;
            default:
                console.log('There is no action for activity  \"' + activity + '\"')
        }
    };

    //Direct REST calls for actions
    function retire(item) {
        openmrsRest.retire(vm.resource, {uuid: item.uuid}).then(function(response) {
            getData(true);
        });
    }
    function unretire(item) {
        
        openmrsRest.unretire(vm.resource, {uuid: item.uuid}).then(function(response) {
            getData(true);
        });
    }
    function purge(item) {
        openmrsRest.purge(vm.resource, {uuid: item.uuid}).then(function(response) {
            getData(true);
        });
    }
    function edit(item) {
        //Slice is to delete hash ($location.path handles it)
        $location.path(resolveRedirectLinks(item).slice(2));
    }

    //Delete and retire alerts logic
    vm.updateDeleteConfirmation = function updateDeleteConfirmation(isConfirmed) {
        if (isConfirmed) {
            purge(vm.deleteItem);
        }
        vm.deleteClicked = false;
    };
    vm.updateRetireConfirmation = function updateDeleteConfirmation(retireReason, isConfirmed) {
        if (isConfirmed) {
            //TODO: Do something with reason and retire (REST services needs to work)
            retire(vm.retireItem);
        }
        vm.retireClicked = false;
    };
    function showDeleteAlert(item) {
        vm.deleteItem = item;
        vm.deleteClicked = true;
    }
    function showRetireAlert(item) {
        vm.retireItem = item;
        vm.retireClicked = true;
    }

    // Method used to prevent app from querying server with every letter input into search query panel
    vm.timeoutRefresh = timeoutRefresh;
    var timeout = null;
    function timeoutRefresh() {
        clearTimeout(timeout);
        vm.isUserTyping = true;
        timeout = setTimeout(function () {
            vm.getData();
        }, 250);
    }

    //Main REST call
    vm.getData = getData;
    function getData() {
        firstPage();
        //For search panel
        if (vm.query.length>0 || vm.getSearchPanel() == false) {
            vm.loadingInitialPage = true;
            var paramsFirst = {
                limit: vm.getLimit(),
                includeAll: true
            };
            if (vm.query.length>0) {
                paramsFirst['q'] = vm.query;
            }
            openmrsRest.listFull(vm.resource, paramsFirst).then(function (firstResponse) {
                vm.loadingInitialPage = false;
                vm.isUserTyping = false;
                vm.data = firstResponse.results;

                vm.isThisOnePageSet = vm.data.length < vm.entriesPerPage;
                resolveComplexProperties();

                //Check for more data
                if (!vm.isThisOnePageSet) {
                    vm.loadingMorePages = true;

                    var paramsMore = {
                        includeAll: true
                    };
                    if (vm.query.length>0) {
                        paramsMore['q'] = vm.query;
                    }

                    openmrsRest.listFull(vm.resource, paramsMore).then(function (response) {
                        vm.data = response.results;
                        vm.isThisOnePageSet = vm.data.length === vm.entriesPerPage;
                        resolveComplexProperties();
                        vm.loadingMorePages = false;
                    });
                }
            });
        }
        //Reset status
        else {
            if (vm.isUserTyping) {
                vm.isUserTyping = false;
                $scope.$apply(function () {
                    vm.data = '';
                })
            }
        }
    }

    /**
     * That method solves problem where column got "property in property" value
     * i.e. vm.columns = [{"property" : "names.name"}]
     */
    function resolveComplexProperties() {
        vm.items = [];
        for (var k = 0; k < vm.data.length; k++) {
            vm.items.push({"uuid": vm.data[k].uuid});
            for (var j = 0; j < vm.columns.length; j++) {
                var properties = vm.columns[j].property.split(".");
                var propertyValue = vm.data[k][properties[0]];
                for (var i = 1; i < properties.length; i++) {
                    propertyValue = propertyValue[properties[i]];
                }
                vm.items[k][vm.columns[j].property] = propertyValue;
            }
            vm.items[k].retired = vm.data[k].retired;
        }
    }

    //Initial data catch (non-search panel only)
    function getInitialData() {
        if (vm.getSearchPanel() == false) {
            getData();
        }
    }
    getInitialData();

    //Paging logic:
    vm.sliceFrom = sliceFrom;
    vm.sliceTo = sliceTo;
    vm.page = 1;
    vm.nextPage = nextPage;
    vm.prevPage = prevPage;
    vm.firstPage = firstPage;
    vm.lastPage = lastPage;
    vm.loadingMorePages = false;
    vm.totalPages = totalPages;
    vm.loadingInitialPage = false;

    function sliceFrom() {
        return vm.page * vm.entriesPerPage - vm.entriesPerPage;
    }
    function sliceTo() {
        return vm.page * vm.entriesPerPage;
    }
    function nextPage() {
        vm.page++;
    }
    function prevPage() {
        vm.page--;
    }
    function firstPage() {
        vm.page = 1;
    }
    function lastPage() {
        if (vm.data.length % vm.entriesPerPage == 0) {
            vm.page = Math.floor(vm.data.length / vm.entriesPerPage);
        }
        else {
            vm.page = Math.floor(vm.data.length / vm.entriesPerPage) + 1;
        }
    }
    function totalPages() {

        if (vm.data.length % vm.entriesPerPage == 0) {
            return Math.floor(vm.data.length / vm.entriesPerPage);
        }
        else {
            return Math.floor(vm.data.length / vm.entriesPerPage) + 1;
        }
    }

    //ng-disabled logic
    vm.isPrevPagePossible = isPrevPagePossible;
    vm.isNextPagePossible = isNextPagePossible;
    vm.isFirstPagePossible = isFirstPagePossible;
    vm.isLastPagePossible = isLastPagePossible;

    function isPrevPagePossible() {
        return vm.page > 1;
    }
    function isNextPagePossible() {
        return vm.sliceTo() < vm.data.length;
    }
    function isFirstPagePossible() {
        return vm.page > 1
    }
    function isLastPagePossible() {
        if (vm.data.length % vm.entriesPerPage == 0) {
            return vm.page < Math.floor(vm.data.length / vm.entriesPerPage);
        }
        else {
            return vm.page < Math.floor(vm.data.length / vm.entriesPerPage) + 1;
        }
    }

    //ng-show logic
    vm.isSearchPanelVisible = isSearchPanelVisible;
    vm.isWholeNavigationPanelVisible = isWholeNavigationPanelVisible;
    vm.isSecondLoaderNotificationVisible =isSecondLoaderNotificationVisible;
    vm.isInitialLoaderImageNotificationVisible = isInitialLoaderImageNotificationVisible;
    vm.isButtonPanelVisible = isButtonPanelVisible;
    vm.notificationEmptyQuery = notificationEmptyQuery;
    vm.notificationNoEntriesFound = notificationNoEntriesFound;
    vm.notificationLoading = notificationLoading;
    vm.showTable = showTable;
    vm.showList = showList;

    function showList() {
        return vm.getType() == 'list'
            && vm.data.length > 0
            && vm.query.length > 0
            || vm.getSearchPanel() == false
            && vm.getType() == 'list'
            && vm.data.length > 0;
    }
    function showTable() {
        return vm.getType() == 'table'
            && vm.data.length > 0
            && vm.query.length > 0
            || vm.getSearchPanel()
            == false && vm.getType()
            == 'table' && vm.data.length > 0;
    }
    function notificationLoading() {
        return vm.isUserTyping
            && vm.query.length > 0;
    }
    function notificationNoEntriesFound() {
        return vm.query.length > 0
            && vm.data.length == 0
            && !vm.isUserTyping;
    }
    function notificationEmptyQuery() {
        return vm.query.length == 0
            && vm.data.length == 0
            && vm.getSearchPanel() == true
    }
    function isSearchPanelVisible() {
        return vm.getSearchPanel();
    }
    function isWholeNavigationPanelVisible() {
        return (!vm.isThisOnePageSet && !vm.getSearchPanel())
            && (!vm.loadingMorePages || !vm.loadingInitialPage);
    }
    function isSecondLoaderNotificationVisible() {
        return vm.loadingMorePages;
    }
    function isInitialLoaderImageNotificationVisible() {
        return vm.loadingInitialPage;
    }
    function isButtonPanelVisible() {
        return !isSecondLoaderNotificationVisible()
            && !isInitialLoaderImageNotificationVisible()
            && vm.data.length > 0;
    }
}