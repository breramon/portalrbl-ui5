// util/Firebase.js
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "portalrbl/app/ui5/util/Config"
], function(JSONModel,Config) {
    "use strict";

    var firebaseConfig = Config.firebase;

    console.log(firebaseConfig);
    
    var firebaseApp;
    
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
        firebaseApp = firebase.app();
    }

    var firestore = firebaseApp.firestore();
    var auth = firebaseApp.auth();
    
    // Instancia o provedor do Google necessário para o login social
    var googleProvider = new firebase.auth.GoogleAuthProvider();

    var oFirebase = {
        firestore: firestore,
        auth: auth,
        googleProvider: googleProvider // Adicionado aqui para o controller usar
    };

    return new JSONModel(oFirebase);
});