sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "./util/Firebase",
    "sap/ui/dom/includeStylesheet"
], function (UIComponent, JSONModel, Firebase, includeStylesheet) {
    "use strict";
    
    return UIComponent.extend("portalrbl.app.ui5.Component", {
        metadata: { manifest: "json" },
        
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

includeStylesheet("css/styles.css");

            this.getRouter().initialize();

            // Setar o modelo do Firebase no Core
            var oFirebaseModel = Firebase;
            this.setModel(oFirebaseModel, "firebase");

            // Lógica de verificação de autenticação
            var oAuth = oFirebaseModel.getProperty("/auth");
            var oRouter = this.getRouter();

            var oUserModel = new JSONModel();
            this.setModel(oUserModel, "user");

            // CORREÇÃO 2: Usando Arrow Function (user) => para manter o escopo correto
            // Se usássemos function(user), o 'this' lá de dentro perderia o acesso ao Componente SAPUI5
            if (oAuth) {
                oAuth.onAuthStateChanged((user) => {
                    if (user) {
                        oUserModel.setData(user);

                        // Usuário logado - Navega para a página principal
                        oRouter.navTo("main", {}, true); 
                    } else {
                        // Usuário deslogado
                        oUserModel.setData(null);
                        
                        // Navega para a página de login
                        oRouter.navTo("login", {}, true); 
                    }
                });
            } else {
                console.error("Serviço de autenticação do Firebase não foi inicializado.");
            }
        }
    });
});