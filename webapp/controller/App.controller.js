sap.ui.define([ 
  "sap/ui/core/mvc/Controller", 
  "sap/m/MessageToast" 
], function (Controller, MessageToast) { 
  "use strict"; 
  return Controller.extend("portalrbl.app.ui5.controller.App", { 
    onPressButton: function () { 
      MessageToast.show("Bem-vindo ao SAPUI5!"); 
    } 
  }); 
}); 
