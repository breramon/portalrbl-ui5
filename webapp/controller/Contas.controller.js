sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/format/NumberFormat"
], function (Controller, History, JSONModel, MessageToast, MessageBox, NumberFormat) {
    "use strict";

    return Controller.extend("portalrbl.app.ui5.controller.Contas", {

        // URL OFICIAL DO SEU BANCO
        _sFirebaseUrl: "https://portalrbl-ui5-default-rtdb.firebaseio.com/expenses.json",

        onInit: function () {
            // 1. Inicializa o modelo local
            var oModel = new JSONModel({
                expenses: []
            });
            this.getView().setModel(oModel, "localModel");

            // 2. Define data atual no DatePicker por padrão
            this.getView().byId("idDataLancamento").setDateValue(new Date());

            var oRouter = this.getOwnerComponent().getRouter();

            this._loadFirebaseData();

        },

        /**
         * Carrega os dados do Firebase e atualiza o total automaticamente
         */
        _loadFirebaseData: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var that = this;

            fetch(this._sFirebaseUrl)
                .then(response => {
                    if (!response.ok) throw new Error("Erro na rede.");
                    return response.json();
                })
                .then(data => {
                    if (data) {
                        var aLoadedExpenses = Object.keys(data).map(function (key) {
                            var oItem = data[key];
                            oItem.id = key;
                            return oItem;
                        });

                        // --- SORTING LOGIC START ---
                        aLoadedExpenses.sort(function (a, b) {
                        // Use 'new Date()' to ensure accurate chronological comparison
                        return new Date(a.date) - new Date(b.date);
                     });
                        // --- SORTING LOGIC END ---


                        oModel.setProperty("/expenses", aLoadedExpenses);

                    } else {
                        oModel.setProperty("/expenses", []);
                    }

                    // CHAMA O CÁLCULO AUTOMÁTICO APÓS CARREGAR
                    that._updateTotal();
                })
                .catch(error => {
                    console.error("Erro ao carregar:", error);
                    MessageToast.show("Erro ao conectar com o banco de dados.");
                });
        },

        /**
         * Função Centralizada para Cálculo de Total Mensal
         */
        _updateTotal: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses") || [];

            // Pega a data do DatePicker para saber qual mês somar
            var oRefDate = oView.byId("idDataLancamento").getDateValue() || new Date();
            var iMonth = oRefDate.getMonth();
            var iYear = oRefDate.getFullYear();

            // Filtra e soma
            var fTotal = aExpenses.reduce(function (acc, item) {
                var oItemDate = new Date(item.date);
                if (oItemDate.getMonth() === iMonth && oItemDate.getFullYear() === iYear) {
                    return acc + parseFloat(item.value || 0);
                }
                return acc;
            }, 0);
            // Formata para R$ (Padrão Brasileiro)
            var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                currencyCode: false,
                customCurrencies: {
                    "BRL": { "symbol": "R$" }
                }
            });

            var sFormattedTotal = "R$ " + NumberFormat.getFloatInstance({ minFractionDigits: 2,
    maxFractionDigits: 2 }).format(fTotal);
            oView.byId("idTotalMes").setText(sFormattedTotal);
        },

        /**
         * Evento do botão "Calcular Mês" (caso queira recalcular manualmente ao trocar data)
         */
        onCalculateMonthlyTotal: function () {
            this._updateTotal();
            MessageToast.show("Total atualizado com base na data selecionada.");
        },

        onAddExpense: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses");
            var that = this;

            var oNewExpense = {
                date: oView.byId("idDataLancamento").getDateValue(),
                value: parseFloat(oView.byId("idValorDespesa").getValue()),
                description: oView.byId("idDescricaoDespesa").getValue()
            };

            if (!oNewExpense.value || !oNewExpense.description) {
                MessageToast.show("Preencha valor e descrição.");
                return;
            }

            fetch(this._sFirebaseUrl, {
                method: 'POST',
                body: JSON.stringify(oNewExpense)
            })
                .then(response => response.json())
                .then(data => {
                    oNewExpense.id = data.name;
                    aExpenses.push(oNewExpense);
                    oModel.setProperty("/expenses", aExpenses);

                    // Limpa campos e ATUALIZA O TOTAL
                    oView.byId("idValorDespesa").setValue("");
                    oView.byId("idDescricaoDespesa").setValue("");
                    that._updateTotal();

                    MessageToast.show("Salvo com sucesso!");
                });
        },

        onDeleteExpense: function (oEvent) {
            var oModel = this.getView().getModel("localModel");
            var oItemContext = oEvent.getSource().getBindingContext("localModel");
            var oItem = oItemContext.getObject();
            var sPath = oItemContext.getPath();
            var that = this;

            var sDeleteUrl = this._sFirebaseUrl.replace(".json", "/") + oItem.id + ".json";

            MessageBox.confirm("Deseja eliminar este lançamento?", {
                onClose: function (sAction) {
                    if (sAction === "OK") {
                        fetch(sDeleteUrl, { method: 'DELETE' })
                            .then(() => {
                                var aExpenses = oModel.getProperty("/expenses");
                                var iIndex = parseInt(sPath.split("/").pop());
                                aExpenses.splice(iIndex, 1);
                                oModel.setProperty("/expenses", aExpenses);

                                // ATUALIZA O TOTAL APÓS APAGAR
                                that._updateTotal();
                                MessageToast.show("Eliminado.");
                            });
                    }
                }
            });
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("main", {}, true);
            }
        }
    });
});