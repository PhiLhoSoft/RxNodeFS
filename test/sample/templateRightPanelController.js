angular.module('sampleApp')
.controller('TemplateRightPanelController',
[
    '$scope', 'DispatchService', 'ActionFactory', 'SideBarManager', 'SideBarModel',
    function($scope, DispatchService, ActionFactory, SideBarManager, SideBarModel)
    {
        'use strict';

        var ctrl = this;
        DispatchService.createSubscriberInformation('TemplateRightPanelController', $scope);

        ctrl.barStyle = SideBarModel.SideBarStyle.ACCORDION;

        ctrl._onNodeSelection = function()
        {
            $scope.isCollapsed = false; // Act on the divider's directive: open the panel
        };

        ctrl._onTemplateSelection = function()
        {
            $scope.isCollapsed = true;
        };

        ctrl._activate = function()
        {
            SideBarManager.registerSideBar($scope._subscriberId, ctrl.barStyle,
                [
                    { id: 'collection-information', state: SideBarModel.SideBoxState.EXPANDED },
                    { id: 'mapping-list', state: SideBarModel.SideBoxState.COLLAPSED },
                    { id: 'node-attributes', state: SideBarModel.SideBoxState.COLLAPSED },
                ]
            );

            $scope.isCollapsed = true; // Initially closed; must be on $scope for the two-way binding to work...
            DispatchService.subscribeAction(ActionFactory.Action.NODE_SELECTION, ctrl._onNodeSelection, $scope);
            DispatchService.subscribeAction(ActionFactory.Action.TEMPLATE_SELECTION, ctrl._onTemplateSelection, $scope);
            DispatchService.subscribeAction(ActionFactory.Action.TEMPLATE_INSTANCE_SELECTION, ctrl._onTemplateSelection, $scope);
        };

        ctrl._activate();
    }
]);
