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
            // Inicializa a classe pai
            UIComponent.prototype.init.apply(this, arguments);

            // Carrega folha de estilo customizada
            includeStylesheet("css/styles.css");

            // Inicializa o roteador do App
            this.getRouter().initialize();

            // Configura os modelos e escuta o estado da autenticação
            this._setupAuthentication();
        },

        /**
         * Inicializa o Firebase, define os modelos e monitora o Login/Logout
         */
        _setupAuthentication: function () {
            var oRouter = this.getRouter();
            
            // 1. Vincula o modelo utilitário do Firebase que você criou
            this.setModel(Firebase, "firebase");

            // 2. Resgata o modelo 'usuarioLogado' que foi declarado no manifest.json
            var oUsuarioModel = this.getModel("usuarioLogado");
            
            // 3. Pega a instância do Auth do Firebase
            var oAuth = Firebase.getProperty("/auth");

            if (!oAuth) {
                console.error("Serviço de autenticação do Firebase não foi inicializado.");
                return;
            }

            // Monitora o estado de login do usuário em tempo real
            oAuth.onAuthStateChanged((user) => {
                if (user) {
                    
                    // Usuário está autenticado! Agora buscamos a URL base do banco para ler o nó 'usuarios'
                    var sBaseUrl = this.getModel("config").getProperty("/firebaseUrl");
                    var sUrlUsuarios = sBaseUrl + "/usuarios/" + user.uid + ".json";

                    // Requisição para buscar os grupos deste usuário no banco NoSQL
                    jQuery.ajax({
                        url: sUrlUsuarios,
                        type: "GET",
                        success: (oDadosBanco) => {
                            
                            
                            // Se o usuário existir na tabela do banco, extrai os grupos, senão aplica padrões
                            var sGrupoGlobal = oDadosBanco && oDadosBanco.grupos ? oDadosBanco.grupos[0] : "0";
                            var sGrupoPessoal = oDadosBanco && oDadosBanco.grupos ? oDadosBanco.grupos[1] : "1";

                            // Alimenta o modelo global centralizado
                            oUsuarioModel.setData({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                grupoGlobal: sGrupoGlobal,
                                grupoPessoal: sGrupoPessoal,
                                grupoAtivo: sGrupoGlobal // O app inicializa lançando no Global ("0")
                            });

                            // Redireciona para a home
                            oRouter.navTo("main", {}, true);
                        },
                        error: (oError) => {
                            console.error("Erro ao recuperar permissões do usuário no banco:", oError);
                            // Mesmo com erro na busca do grupo, permite o login com dados básicos
                            oUsuarioModel.setData({ uid: user.uid, email: user.email, grupoAtivo: "9" });
                            oRouter.navTo("main", {}, true);
                        }
                    });

                } else {
                    // Usuário realizou logout ou não está autenticado
                    oUsuarioModel.setData(null);
                    oRouter.navTo("login", {}, true);
                }
            });
        }
    });
});