(function () {

    function loadScript(src) {

        return new Promise(function (resolve, reject) {

            const script = document.createElement("script");

            script.src = src;

            script.onload = resolve;

            script.onerror = reject;

            document.head.appendChild(script);

        });

    }

    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    loadScript("localconfig.js")
        .then(function () {

            console.log("Config carregada.");

        })
        .catch(function () {

            console.warn("localconfig.js não encontrado.");

            window.localConfig = {
                firebase: {}
            };

        });

})();