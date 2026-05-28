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

        // URL Raiz do seu banco (buscaremos o link dinâmico via manifest futuramente, mas mantive por compatibilidade)
        _sFirebaseUrl: "https://portalrbl-ui5-default-rtdb.firebaseio.com/expenses.json",

        onInit: function () {
            // 1. Inicializa o modelo local
            var oModel = new JSONModel({
                expenses: []
            });
            this.getView().setModel(oModel, "localModel");

            // 2. Define data atual no DatePicker por padrão
            this.getView().byId("idDataLancamento").setDateValue(new Date());

            var oDate = this.getView().byId("idDataLancamento").getDateValue();

            // 3. Aguarda o SAPUI5 carregar os modelos globais antes de tentar puxar dados
            this.getOwnerComponent().getModel("usuarioLogado").dataLoaded().then(() => {
                this._loadFirebaseData(oDate);
            }).catch(() => {
                // Caso queira garantir o disparo se dataLoaded não estiver disponível
                this._loadFirebaseData(oDate);
            });
        },

        /**
         * Carrega os dados do Firebase e filtra por mês/ano E pelo grupo ativo do usuário
         */
        _loadFirebaseData: function (oDate) {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var that = this;

            if (!oDate) {
                oDate = new Date();
            }
            // Pega o grupo selecionado atualmente no modelo global centralizado
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");
            var sGrupoAtivo = oUsuarioModel ? oUsuarioModel.getProperty("/grupoAtivo") : "0";

            fetch(this._sFirebaseUrl)
                .then(response => {
                    if (!response.ok) throw new Error("Erro na rede.");
                    return response.json();
                })
                .then(data => {
                    if (data) {
                        // 1. Mapeia o objeto do Firebase para Array
                        var aAllExpenses = Object.keys(data).map(function (key) {
                            var oItem = data[key];
                            oItem.id = key;
                            return oItem;
                        });

                        var iSelectedMonth = oDate.getMonth();
                        var iSelectedYear = oDate.getFullYear();

                        // 2. Filtra por Mês, Ano E pelo Grupo Ativo ("0" ou o Pessoal)
                        var aLoadedExpenses = aAllExpenses.filter(function (oItem) {
                            if (!oItem.date) {
                                return false;
                            }

                            var oItemDate = new Date(oItem.date);

                            // Conversão para String garante a validação correta mesmo se gravado como número
                            var sItemGrupo = oItem.grupo !== undefined ? String(oItem.grupo) : "0";

                            return oItemDate.getMonth() === iSelectedMonth &&
                                oItemDate.getFullYear() === iSelectedYear &&
                                sItemGrupo === String(sGrupoAtivo); // <--- FILTRO POR GRUPO AQUI
                        });

                        // 3. Ordenação Cronológica
                        aLoadedExpenses.sort(function (a, b) {
                            return new Date(b.date) - new Date(a.date);
                        });

                        oModel.setProperty("/expenses", aLoadedExpenses);

                    } else {
                        oModel.setProperty("/expenses", []);
                    }

                    that._updateTotal();
                })
                .catch(error => {
                    console.error("Erro ao carregar:", error);
                    MessageToast.show("Erro ao conectar com o banco de dados.");
                });
        },

        /**
         * Função Centralizada para Cálculo de Total Mensal (Apenas do grupo exibido)
         */
        _updateTotal: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses") || [];

            // Soma apenas os itens que passaram pelo filtro anterior
            var fTotal = aExpenses.reduce(function (acc, item) {
                return acc + parseFloat(item.value || 0);
            }, 0);

            // Divisão proporcional fixa fictícia (exemplo mantido conforme original)
            var fTotalF = fTotal / 3;
            var fTotalR = fTotal - fTotalF;

            var fTotalF_txt = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotalF);
            var fTotalR_txt = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotalR);
            var sFormattedTotal = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotal);

            oView.byId("idTotalMes").setText("R$ " + sFormattedTotal);
            oView.byId("idTotalR").getTileContent()[0].getContent().setNumber(fTotalR_txt);
            oView.byId("idTotalF").getTileContent()[0].getContent().setNumber(fTotalF_txt);
        },

        onDatePickerChange: function (event) {
            var oDate = this.getView().byId("idDataLancamento").getDateValue();
            this._loadFirebaseData(oDate);
        },

        onAddExpense: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses");
            var that = this;

            // Pega o grupo ativo atual direto do modelo unificado
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");
            var sGrupoAtivo = oUsuarioModel.getProperty("/grupoAtivo");

            var oNewExpense = {
                date: oView.byId("idDataLancamento").getDateValue(),
                value: parseFloat(oView.byId("idValorDespesa").getValue()),
                description: oView.byId("idDescricaoDespesa").getValue(),
                grupo: sGrupoAtivo // Salva de forma dinâmica baseado em quem está logado
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

                    // Força a data do objeto local a ser a String ISO (igualzinho ao banco)
                    // antes de injetar o registro na tabela da tela
                    if (oNewExpense.date instanceof Date) {
                        oNewExpense.date = oNewExpense.date.toISOString();
                    }
                    // ---------------------

                    var oRefDate = oView.byId("idDataLancamento").getDateValue() || new Date();
                    var oCurrentItemDate = new Date(oNewExpense.date); // Cria uma instância temporária para o IF abaixo

                    // Valida se o novo item pertence ao mês visualizado
                    if (oCurrentItemDate.getMonth() === oRefDate.getMonth() &&
                        oCurrentItemDate.getFullYear() === oRefDate.getFullYear()) {

                        aExpenses.push(oNewExpense);

                        // Garante que a lista local permaneça ordenada por data
                        aExpenses.sort(function (a, b) {
                            return new Date(b.date) - new Date(a.date);
                        });

                        oModel.setProperty("/expenses", aExpenses);
                    } else {
                        // Se o usuário adicionou um item de outro mês, recarrega os dados daquele mês
                        that._loadFirebaseData(oRefDate);
                    }

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
        },

        /**
         * Evento executado ao alternar o ToggleButton de tipo de despesa
         */
        onToggleTipoDespesa: function (oEvent) {
            var bPressed = oEvent.getParameter("pressed");
            var oButton = oEvent.getSource();

            // Pega o modelo centralizado mapeado no Component.js
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");

            if (bPressed) {
                // Modo PESSOAL (muda ícone e altera grupo ativo para o id pessoal dele vindo do banco - ex: "1")
                oButton.setIcon("sap-icon://private");
                var sPessoal = oUsuarioModel.getProperty("/grupoPessoal");
                oUsuarioModel.setProperty("/grupoAtivo", sPessoal);
            } else {
                // Modo GLOBAL (retorna o ícone e altera grupo ativo para o id global do banco - "0")
                oButton.setIcon("sap-icon://role");
                var sGlobal = oUsuarioModel.getProperty("/grupoGlobal");
                oUsuarioModel.setProperty("/grupoAtivo", sGlobal);
            }

            // Força a atualização da tabela relendo e refiltrando os dados com o novo grupo ativo
            var oDate = this.getView().byId("idDataLancamento").getDateValue();
            this._loadFirebaseData(oDate);
        }
    });
});