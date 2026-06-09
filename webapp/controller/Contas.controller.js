sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "../util/FirebaseService", // <-- Declaração da dependência com caminho relativo
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/format/NumberFormat"
], function (Controller, History, FirebaseService, JSONModel, MessageToast, MessageBox, NumberFormat) {
    "use strict";

    return Controller.extend("portalrbl.app.ui5.controller.Contas", {

        onInit: function () {
            // 1. Inicializa o modelo local para a tabela da tela
            var oModel = new JSONModel({
                expenses: []
            });
            this.getView().setModel(oModel, "localModel");

            // 2. Define a data atual no DatePicker por padrão
            this.getView().byId("idDataLancamento").setDateValue(new Date());

            var oDate = this.getView().byId("idDataLancamento").getDateValue();
            var oDate2 = this.getView().byId("idDataLancamento2").getDateValue();

            // 3. CORREÇÃO: Pega o modelo de usuário
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");

            // Se o token já existir (o usuário mudou de tela e já estava logado)
            if (oUsuarioModel && oUsuarioModel.getProperty("/token")) {
                this._loadFirebaseData(oDate, oDate2);
            } else {
                // Se o token ainda não existe (o app acabou de iniciar), criamos um listener na propriedade
                // para disparar o carregamento assim que o Component.js injetar o token ali!
                oUsuarioModel.attachPropertyChange(function (oEvent) {
                    if (oEvent.getParameter("path") === "/token" && oEvent.getParameter("value")) {
                        this._loadFirebaseData(oDate, oDate2);
                    }
                }, this);

                // Como garantia secundária, se o modelo atualizar o objeto inteiro de uma vez via .setData():
                this.getOwnerComponent().getEventBus().subscribe("Component", "UserAuthenticated", function () {
                    this._loadFirebaseData(oDate, oDate2);
                }, this);
            }
        },

        /**
         * Carrega os dados através do Service centralizado e aplica os filtros de tela
         */
        _loadFirebaseData: function (oDate, oDate2) {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var that = this;

            if (!oDate) {
                oDate = new Date();
            }

            // Resgata o grupo ativo do modelo global para saber o que filtrar
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");
            var sGrupoAtivo = oUsuarioModel ? oUsuarioModel.getProperty("/grupoAtivo") : "0";

            // Consome o método centralizado do Service passando o Componente do App
            FirebaseService.getExpenses(this.getOwnerComponent())
                .then(data => {
                    if (data) {
                        // 1. Mapeia o objeto NoSQL para o formato de Array
                        var aAllExpenses = Object.keys(data).map(function (key) {
                            var oItem = data[key];
                            oItem.id = key;
                            return oItem;
                        });

                        var iSelectedMonth = oDate.getMonth();
                        var iSelectedYear = oDate.getFullYear();

                        if (!oDate2) {

                            // 2. Filtra mantendo apenas o mês/ano e o grupo ativo selecionado
                            var aLoadedExpenses = aAllExpenses.filter(function (oItem) {
                                if (!oItem.date) {
                                    return false;
                                }
                                var oItemDate = new Date(oItem.date);
                                var sItemGrupo = oItem.grupo !== undefined ? String(oItem.grupo) : "0";

                                return oItemDate.getMonth() === iSelectedMonth &&
                                    oItemDate.getFullYear() === iSelectedYear &&
                                    sItemGrupo === String(sGrupoAtivo);
                            });

                        } else {

                            aLoadedExpenses = aAllExpenses.filter(function (oItem) {
                                if (!oItem.date) {
                                    return false;
                                }
                                var oItemDate = new Date(oItem.date);
                                var sItemGrupo = oItem.grupo !== undefined ? String(oItem.grupo) : "0";

                                return (oItemDate >= oDate && oItemDate <= oDate2) && sItemGrupo === String(sGrupoAtivo);
                            });
                        }

                        // 3. Ordenação Decrescente (Mais recente no topo)
                        aLoadedExpenses.sort(function (a, b) {
                            return new Date(b.date) - new Date(a.date);
                        });

                        oModel.setProperty("/expenses", aLoadedExpenses);

                    } else {
                        oModel.setProperty("/expenses", []);
                    }

                    // Recalcula os totais na tela
                    that._updateTotal();
                })
                .catch(error => {
                    console.error("Erro ao carregar despesas via Service:", error);
                    MessageToast.show("Erro ao conectar com o banco de dados.");
                });
        },

        /**
         * Função Centralizada para Cálculo de Total Mensal (Apenas dos itens visíveis no grupo)
         */
        _updateTotal: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses") || [];

            // Soma os valores mapeados na tabela local
            var fTotal = aExpenses.reduce(function (acc, item) {
                return acc + parseFloat(item.value || 0);
            }, 0);

            // Regra de negócio de divisão (Proporções mantidas do seu código original)
            var fTotalF = fTotal / 3;
            var fTotalR = fTotal - fTotalF;

            var fTotalF_txt = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotalF);
            var fTotalR_txt = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotalR);
            var sFormattedTotal = NumberFormat.getFloatInstance({ minFractionDigits: 2, maxFractionDigits: 2 }).format(fTotal);

            oView.byId("idTotalMes").setText("R$ " + sFormattedTotal);
            oView.byId("idTotalR").getTileContent()[0].getContent().setNumber(fTotalR_txt);
            oView.byId("idTotalF").getTileContent()[0].getContent().setNumber(fTotalF_txt);
        },

        /**
         * Disparado quando o usuário altera o mês/ano no DatePicker
         */
        onDatePickerChange: function (event) {
            var oDate = this.getView().byId("idDataLancamento").getDateValue();
            var oDate2 = this.getView().byId("idDataLancamento2").getDateValue();

            this._loadFirebaseData(oDate, oDate2);
        },

        /**
         * Adiciona um novo lançamento utilizando a camada de serviço
         */
        onAddExpense: function () {
            var oView = this.getView();
            var oModel = oView.getModel("localModel");
            var aExpenses = oModel.getProperty("/expenses");
            var that = this;

            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");
            var sGrupoAtivo = oUsuarioModel.getProperty("/grupoAtivo");

            var oNewExpense = {
                date: oView.byId("idDataLancamento").getDateValue(),
                value: parseFloat(oView.byId("idValorDespesa").getValue()),
                description: oView.byId("idDescricaoDespesa").getValue(),
                grupo: sGrupoAtivo
            };

            if (!oNewExpense.value || !oNewExpense.description) {
                MessageToast.show("Preencha valor e descrição.");
                return;
            }

            // Envia para o Firebase através do Service isolado
            FirebaseService.createExpense(this.getOwnerComponent(), oNewExpense)
                .then(data => {
                    oNewExpense.id = data.name;

                    // Padroniza o tipo da data para String ISO antes de injetar na tabela da tela
                    if (oNewExpense.date instanceof Date) {
                        oNewExpense.date = oNewExpense.date.toISOString();
                    }

                    var oRefDate = oView.byId("idDataLancamento").getDateValue() || new Date();
                    var oCurrentItemDate = new Date(oNewExpense.date);

                    // Valida se o item inserido pertence ao mês que está sendo visualizado na tela
                    if (oCurrentItemDate.getMonth() === oRefDate.getMonth() &&
                        oCurrentItemDate.getFullYear() === oRefDate.getFullYear()) {

                        aExpenses.push(oNewExpense);

                        // Reordena de forma decrescente
                        aExpenses.sort(function (a, b) {
                            return new Date(b.date) - new Date(a.date);
                        });

                        oModel.setProperty("/expenses", aExpenses);
                    } else {
                        // Se for de outro mês, força o recarregamento com a data alvo
                        that._loadFirebaseData(oRefDate, null);
                    }

                    // Limpa os inputs da tela e recalcula o cabeçalho de totais
                    oView.byId("idValorDespesa").setValue("");
                    oView.byId("idDescricaoDespesa").setValue("");
                    that._updateTotal();

                    MessageToast.show("Salvo com sucesso!");
                });
        },

        /**
         * Remove um registro do banco e da tabela da View
         */
        onDeleteExpense: function (oEvent) {
            var oModel = this.getView().getModel("localModel");
            var oItemContext = oEvent.getSource().getBindingContext("localModel");
            var oItem = oItemContext.getObject();
            var sPath = oItemContext.getPath();
            var that = this;

            MessageBox.confirm("Deseja eliminar este lançamento?", {
                onClose: function (sAction) {
                    if (sAction === "OK") {
                        // Executa a deleção chamando o módulo de serviço
                        FirebaseService.deleteExpense(that.getOwnerComponent(), oItem.id)
                            .then(() => {
                                var aExpenses = oModel.getProperty("/expenses");
                                var iIndex = parseInt(sPath.split("/").pop());

                                aExpenses.splice(iIndex, 1);
                                oModel.setProperty("/expenses", aExpenses);

                                that._updateTotal();
                                MessageToast.show("Eliminado.");
                            })
                            .catch(oError => {
                                console.error("Erro ao deletar registro:", oError);
                                MessageToast.show("Não foi possível excluir o registro.");
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
         * Alterna visualização e gravação entre o Grupo Global ("0") e Pessoal ("1", "2")
         */
        onToggleTipoDespesa: function (oEvent) {
            var bPressed = oEvent.getParameter("pressed");
            var oButton = oEvent.getSource();
            var oUsuarioModel = this.getOwnerComponent().getModel("usuarioLogado");

            if (bPressed) {
                oButton.setIcon("sap-icon://private");
                var sPessoal = oUsuarioModel.getProperty("/grupoPessoal");
                oUsuarioModel.setProperty("/grupoAtivo", sPessoal);
            } else {
                oButton.setIcon("sap-icon://role");
                var sGlobal = oUsuarioModel.getProperty("/grupoGlobal");
                oUsuarioModel.setProperty("/grupoAtivo", sGlobal);
            }

            // Recarrega e filtra instantaneamente a tabela com base no novo grupo ativo selecionado
            var oDate = this.getView().byId("idDataLancamento").getDateValue();
            this._loadFirebaseData(oDate);
        }
    });
});