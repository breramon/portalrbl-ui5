// Login.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "../util/Firebase" // Importa a fábrica que retorna o JSONModel do Firebase
], function (Controller, MessageToast, UIComponent, Firebase) {
    "use strict";

    return Controller.extend("portalrbl.app.ui5.controller.Login", {

        onInit: function () {
            // Garante que o modelo Firebase seja carregado especificamente nesta view
            // Nota: Se você registrou isso no Component.js, esta linha no onInit pode ser omitida.
            var oFirebaseModel = Firebase;
            this.getView().setModel(oFirebaseModel, "firebase");
        },

        // Função de login por E-mail/Senha (já existente e funcionando)
        onLogin: function () {
            // ... (sua lógica existente de E-mail/Senha)
        },
        
        // Método para navegação manual para a tela principal
        onNavigateToMain: function() {
            // Obtém o roteador e navega para a rota 'home'
            UIComponent.getRouterFor(this).navTo("main");
        },

        // FUNÇÃO CORRIGIDA: Login com o Google
        onGoogleLogin: function () {
            var oFirebaseModel = this.getView().getModel("firebase");
            
            if (!oFirebaseModel) {
                MessageToast.show("Erro: Modelo do Firebase não foi carregado na View.");
                return;
            }

            // 1. Obtém as referências direto das propriedades do seu JSONModel customizado
            var oAuth = oFirebaseModel.getProperty("/auth");
            var oProvider = oFirebaseModel.getProperty("/googleProvider");

            // Validação de segurança caso o modelo não tenha sido preenchido corretamente no util
            if (!oAuth || !oProvider) {
                MessageToast.show("Erro: Serviço de autenticação do Firebase indisponível.");
                return;
            }

            // 2. Abre a janela pop-up para o usuário fazer login no Google
            // Usando Arrow Functions ( => ) para manter o contexto correto do 'this' do Controller
            oAuth.signInWithPopup(oProvider)
                .then((result) => {
                    // Login bem-sucedido!
                    var oUser = result.user;
                    MessageToast.show("Bem-vindo, " + oUser.displayName + "!");
                    
                      //this.onNavigateToMain();
                })
                .catch((error) => {
                    // Trata erros (ex: usuário fechou o popup antes de logar, problemas de rede, etc.)
                    MessageToast.show("Erro no login com Google: " + error.message);
                    console.error("Erro detalhado no Google Sign-In:", error);
                });
        } 
    });
});