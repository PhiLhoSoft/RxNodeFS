angular.module('sampleApp')
.controller('TemplateLeftPanelController',
[
    '$scope', '$log', 'DispatchService', 'ActionFactory', 'SideBarManager', 'SideBarModel',
    function($scope, $log, DispatchService, ActionFactory, SideBarManager, SideBarModel)
    {
        'use strict';

        var ctrl = this;
        DispatchService.createSubscriberInformation('TemplateLeftPanelController', $scope);

        ctrl.barStyle = SideBarModel.SideBarStyle.DUAL;

        ctrl._activate = function()
        {
            SideBarManager.registerSideBar($scope._subscriberId, ctrl.barStyle,
                [
                    { id: 'template-list', state: SideBarModel.SideBoxState.EXPANDED },
                    { id: 'template-instance-list', state: SideBarModel.SideBoxState.COLLAPSED },
                ]
            );
        };

        ctrl._activate();
    }
]);
