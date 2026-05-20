// util/Firebase.js
sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function(JSONModel) {
    "use strict";

    var firebaseConfig = {
        apiKey: "AIzaSyD_r5ysuyDZ_TXnl13WDgkSwvnzyB1JA18",
        authDomain: "portalrbl-ui5.firebaseapp.com",
        projectId: "portalrbl-ui5",
        storageBucket: "portalrbl-ui5.firebasestorage.app",
        messagingSenderId: "87339604566",
        appId: "1:87339604566:web:cca88eb0d683852191b9f7",
        measurementId: "G-KS3CTWSQWR"
    };
    
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