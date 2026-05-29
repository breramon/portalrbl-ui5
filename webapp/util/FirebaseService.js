// util/FirebaseService.js
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Retorna a URL base configurada no manifest.json
         */
        _getBaseUrl: function (oComponent) {
            return oComponent.getModel("config").getProperty("/firebaseUrl");
        },

        /**
         * Retorna o token do usuário logado armazenado no modelo global
         */
        _getToken: function (oComponent) {
            var oUsuarioModel = oComponent.getModel("usuarioLogado");
            return oUsuarioModel ? oUsuarioModel.getProperty("/token") : "";
        },

        /**
         * Busca a lista completa de usuários (Utilizado no Component.js)
         */
        getUsuarios: function (oComponent, sToken) {
                       
            var sUrl = this._getBaseUrl(oComponent) + "/usuarios.json?auth=" + sToken;
            
            return new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url: sUrl,
                    type: "GET",
                    success: function (data) { resolve(data); },
                    error: function (err) { reject(err); }
                });
            });
        },

        /**
         * Busca todas as despesas (Utilizado no Contas.controller.js)
         */
        getExpenses: function (oComponent) {
            var sUrl = this._getBaseUrl(oComponent) + "/expenses.json?auth=" + this._getToken(oComponent);
            
            return fetch(sUrl).then(function (response) {
                if (!response.ok) throw new Error("Erro ao buscar despesas.");
                return response.json();
            });
        },

        /**
         * Cria uma nova despesa
         */
        createExpense: function (oComponent, oExpenseData) {
            var sUrl = this._getBaseUrl(oComponent) + "/expenses.json?auth=" + this._getToken(oComponent);
            
            return fetch(sUrl, {
                method: "POST",
                body: JSON.stringify(oExpenseData)
            }).then(function (response) {
                return response.json();
            });
        },

        /**
         * Deleta uma despesa pelo ID
         */
        deleteExpense: function (oComponent, sExpenseId) {
            var sUrl = this._getBaseUrl(oComponent) + "/expenses/" + sExpenseId + ".json?auth=" + this._getToken(oComponent);
            
            return fetch(sUrl, { method: "DELETE" });
        }
    };
});