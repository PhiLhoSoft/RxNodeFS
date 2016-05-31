angular.module('sampleApp')
.controller('TemplateCreationController',
[
    '$scope', '$log', 'rx', 'RxJSService', 'RestService', 'ActionFactory',
    function($scope, $log, rx, rxjsS, RestService, ActionFactory)
    {
        'use strict';

        var ctrl = this;
        rxjsS.createSubscriberInformation('TemplateCreationController', $scope);

        ctrl.template = { name: '' };
        ctrl.waitingForResult = false;
        ctrl.isTemplateNameUsed = false;

        ctrl.onOk = function()
        {
            if (ctrl.isFormError() || ctrl.waitingForResult)
                return;

            $scope.closeThisDialog(ctrl.template);
        };

        ctrl.onCancel = function()
        {
            // Close dialog with Cancel information (undefined value)
            $scope.closeThisDialog();
        };

        ctrl.isFormError = function()
        {
            return ctrl.form.templateName.$error.required || ctrl.form.templateName.$error.pattern || ctrl.isTemplateNameUsed;
        };

        rxjsS.recordSubcription($scope,
            rxjsS.observeOnScope($scope, function() { return ctrl.template.name; })
                .tap(function init()
                {
                    ctrl.isTemplateNameUsed = false;
                    ctrl.waitingForResult = true;
                })
                // Wait 500 ms of no more events before taking in account user input
                .debounce(500)
                // Map change (oldValue, newValue) to the value itself
                .map(function getValue(change)
                {
                    return change.newValue || '';
                })
                // Only if the value has changed
                .distinctUntilChanged()
                // And if it is not empty
                .filter(_.negate(_.isEmpty))
                // Take another observable, feed with result, and map this observable to its result; discard previous request if didn't come yet
                .flatMapLatest(getTemplateByName)
                .safeApply($scope, function onNext(result)
                {
                    ctrl.isTemplateNameUsed = result.total > 0;
                    ctrl.waitingForResult = false;
                })
                .subscribe(
                    undefined,
                    function onError(e) { $log.error('Error getting template by name', e); }
                )
        );

        function getTemplateByName(name)
        {
            var action = ActionFactory.createAction('listTemplatesByName').from($scope).withPaging(1, 0).withParams(name);
            // TODO Send an action instead!
            return rx.Observable.fromPromise(RestService.listTemplatesByName(action));
        }
    }
]);
