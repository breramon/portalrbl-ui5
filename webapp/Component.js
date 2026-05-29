sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "./util/Firebase",
    "./util/FirebaseService", // Módulo de serviço centralizado
    "sap/ui/dom/includeStylesheet"
], function (UIComponent, JSONModel, Firebase, FirebaseService, includeStylesheet) {
    "use strict";

    return UIComponent.extend("portalrbl.app.ui5.Component", {
        metadata: { manifest: "json" },

        // ... seus sap.ui.define existentes ...
        init: function () {
            // 1. Cria e exibe o bloqueio de tela imediatamente ao abrir o app
            this._oBusyDialog = new sap.m.BusyDialog({
                text: "Carregando o aplicativo...",
                title: "Por favor, aguarde"
            });
            this._oBusyDialog.open();

            // Inicializa a classe pai do SAPUI5
            UIComponent.prototype.init.apply(this, arguments);

            // Carrega a folha de estilo customizada
            includeStylesheet("css/styles.css");

            // Inicializa o roteador do App
            this.getRouter().initialize();

            // Configura a validação de segurança e login
            this._setupAuthentication();
        },

        _setupAuthentication: function () {
            var oRouter = this.getRouter();
            this.setModel(Firebase, "firebase");
            var oUsuarioModel = this.getModel("usuarioLogado");
            var oAuth = Firebase.getProperty("/auth");

            if (!oAuth) {
                if (this._oBusyDialog) this._oBusyDialog.close(); // Destrava se houver erro grave
                return;
            }

            oAuth.onAuthStateChanged((user) => {
                if (user) {
                    user.getIdToken().then((sToken) => {
                        FirebaseService.getUsuarios(this, sToken)
                            .then((aUsuarios) => {
                                var oDadosBanco = null;

                                if (aUsuarios) {
                                    oDadosBanco = Object.values(aUsuarios).find(u => u && (u.uid === user.uid || u.username === user.email));
                                }

                                if (oDadosBanco) {
                                    var sGrupoGlobal = oDadosBanco.grupos ? oDadosBanco.grupos[0] : "0";
                                    var sGrupoPessoal = oDadosBanco.grupos ? oDadosBanco.grupos[1] : "1";

                                    oUsuarioModel.setData({
                                        uid: user.uid,
                                        token: sToken,
                                        email: user.email,
                                        displayName: user.displayName,
                                        photoURL: user.photoURL,
                                        grupoGlobal: sGrupoGlobal,
                                        grupoPessoal: sGrupoPessoal,
                                        grupoAtivo: sGrupoGlobal
                                    });
                                } else {
                                    oUsuarioModel.setData({ uid: user.uid, token: sToken, email: user.email, grupoAtivo: "0", grupoGlobal: "0", grupoPessoal: "1" });
                                }

                                this.getEventBus().publish("Component", "UserAuthenticated");
                                oRouter.navTo("main", {}, true);

                                // 2. SUCESSO LOGADO: Fecha o BusyDialog e libera a tela direto na Main
                                if (this._oBusyDialog) {
                                    this._oBusyDialog.close();
                                }
                            })
                            .catch(err => {
                                console.error(err);
                                oRouter.navTo("login", {}, true);
                                // 3. ERRO: Fecha o BusyDialog para permitir o login manual
                                if (this._oBusyDialog) this._oBusyDialog.close();
                            });
                    }).catch((oError) => {
                        console.error(oError);
                        if (this._oBusyDialog) this._oBusyDialog.close();
                    });

                } else {
                    oUsuarioModel.setData(null);
                    oRouter.navTo("login", {}, true);

                    // 4. DESLOGADO: Usuário realmente precisa logar, então fecha o diálogo e libera a tela de login
                    if (this._oBusyDialog) {
                        this._oBusyDialog.close();
                    }
                }
            });
        }
    });
});