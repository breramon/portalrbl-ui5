sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";
  return Controller.extend("portalrbl.app.ui5.controller.Main", {
    onPressWhatsApp: function () {
      const sUrl = "https://wa.me/5541995442034";

      window.open(sUrl, "_blank");
    },
    onPressGastos: function () {
      // Obtém o roteador do componente e navega para a rota definida no manifest
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("RouteFinancial");
    },
    onLanguageChange: function (oEvent) {
      var sKey = oEvent.getParameter("item").getKey(); // "EN" ou "PT"
      var sLocale = sKey.toLowerCase(); // "en" ou "pt"

      // 1. Define o novo idioma no Core
      var oConfig = sap.ui.getCore().getConfiguration();
      oConfig.setLanguage(sLocale);

      // 2. Opcional: Recarregar o model i18n explicitamente 
      var oBundle = jQuery.sap.resources({
        url: "i18n/i18n.properties",
        locale: sLocale
      });

      // Isso força o refresh dos textos vinculados
      this.getOwnerComponent().getModel("i18n").refresh();

      //sap.m.MessageToast.show("Language changed to: " + sKey);
    },
  });
}); 
