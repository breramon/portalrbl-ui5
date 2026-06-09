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
                if (this._oBusyDialog) this._oBusyDialog.close();
                return;
            }

            // Mantém o escopo correto guardando o 'this' do Componente em uma variável fixa
            var oComponent = this;

            oAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        // 1. Aguarda a geração do Token JWT
                        var sToken = await user.getIdToken();

                        // 2. Aguarda a resposta do banco NoSQL através do Service
                        var aUsuarios = await FirebaseService.getUsuarios(oComponent, sToken);

                        var oDadosBanco = null;

                        if (aUsuarios) {
                            // Pegamos a chave real (o UID que está no nó do Firebase)
                            var sUserKey = Object.keys(aUsuarios).find(function (sKey) {
                                // sKey vai receber "mfnpcPB5ibc..." na primeira volta e "xj8r1Kkh..." na segunda
                                return sKey === user.uid;
                            });

                            // Se encontrou a chave correspondente ao UID logado
                            if (sUserKey) {
                                oDadosBanco = aUsuarios[sUserKey];
                                // Injeta o UID para garantir que o resto do código funcione se precisar dele
                                oDadosBanco.uid = sUserKey;
                            } else {
                                // Fallback caso queira buscar pelo username igual ao e-mail (como estava antes)
                                oDadosBanco = Object.values(aUsuarios).find(function (u) {
                                    return u && u.username === user.email;
                                });
                            }
                        }

                        if (oDadosBanco) {
                            var sGrupoGlobal = oDadosBanco.grupos ? oDadosBanco.grupos[0] : "0";
                            var sGrupoPessoal = oDadosBanco.grupos ? oDadosBanco.grupos[1] : "1";
                            
                            // Parametros
                            var bRangeData = oDadosBanco.param ? oDadosBanco.param[0]: false;

                            oUsuarioModel.setData({
                                uid: user.uid,
                                token: sToken,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                grupoGlobal: sGrupoGlobal,
                                grupoPessoal: sGrupoPessoal,
                                grupoAtivo: sGrupoGlobal,
                                rangeData: bRangeData
                            });
                        } else {
                            console.warn("Usuário não encontrado na base cadastral. Aplicando padrão.");
                            oUsuarioModel.setData({
                                uid: user.uid,
                                token: sToken,
                                email: user.email,
                                grupoAtivo: "9",
                                grupoGlobal: "9",
                                grupoPessoal: "9"
                            });
                        }

                        // 3. Dispara o sinal usando 'oComponent' (Garante o escopo correto do SAPUI5)
                        oComponent.getEventBus().publish("Component", "UserAuthenticated");

                        // Navega para a tela principal
                        oRouter.navTo("main", {}, true);

                    } catch (err) {
                        console.error("Erro no fluxo de autenticação/carga de dados:", err);
                        oRouter.navTo("login", {}, true);
                    } finally {
                        // Executa SEMPRE no final (sucesso ou erro) para destravar a tela do usuário
                        if (oComponent._oBusyDialog) {
                            oComponent._oBusyDialog.close();
                        }
                    }

                } else {
                    // Usuário deslogado
                    oUsuarioModel.setData(null);
                    oRouter.navTo("login", {}, true);
                    if (oComponent._oBusyDialog) {
                        oComponent._oBusyDialog.close();
                    }
                }
            });
        }
    });
});