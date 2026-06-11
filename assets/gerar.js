import { gerarLicenca } from "./app.js";

const WORKER_URL = "https://faturalite-licenses.jorgepronto20.workers.dev";

let licencas = JSON.parse(localStorage.getItem("licencas")) || [];

function guardar() {
    localStorage.setItem("licencas", JSON.stringify(licencas));
}

function atualizarTabela() {
    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    licencas.forEach((item, index) => {
        lista.innerHTML += `
        <tr>
            <td>${item.empresa}</td>
            <td>${item.licenca}</td>
            <td>${item.criacao}</td>
            <td>${item.validade}</td>
            <td>
                <button class="small-btn copy" onclick="copiarLicenca('${item.licenca}')">Copiar</button>
                <button class="small-btn" style="background:#2ecc71;color:white" onclick="enviarServidor(${index})">Enviar</button>
                <button class="small-btn delete" onclick="remover(${index})">Remover</button>
            </td>
        </tr>
        `;
    });

    document.getElementById("total").innerText = licencas.length;
}

window.gerar = function () {
    const empresa = document.getElementById("empresa").value.trim();
    const dias = parseInt(document.getElementById("dias").value);

    if (!empresa || !dias) {
        alert("Preencha todos os campos.");
        return;
    }

    const hoje = new Date();
    const validade = new Date();
    validade.setDate(hoje.getDate() + dias);

    const novaLicenca = {
        empresa,
        licenca: gerarLicenca(),
        criacao: hoje.toISOString().slice(0, 10),
        validade: validade.toISOString().slice(0, 10)
    };

    licencas.push(novaLicenca);

    guardar();
    atualizarTabela();

    document.getElementById("empresa").value = "";
    document.getElementById("dias").value = "";
};

window.copiarLicenca = function (codigo) {
    navigator.clipboard.writeText(codigo);
    alert("Licença copiada!");
};

window.remover = function (index) {
    if (!confirm("Remover licença?")) return;

    licencas.splice(index, 1);
    guardar();
    atualizarTabela();
};

window.limparTudo = function () {
    if (!confirm("Apagar todas as licenças?")) return;

    licencas = [];
    guardar();
    atualizarTabela();
};

window.exportarTXT = function () {
    if (licencas.length === 0) {
        alert("Nenhuma licença para exportar.");
        return;
    }

    let texto = "";

    licencas.forEach(item => {
        texto +=
`Empresa: ${item.empresa}
Licença: ${item.licenca}
Criação: ${item.criacao}
Validade: ${item.validade}
------------------------------------
`;
    });

    const blob = new Blob([texto], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "licencas.txt";
    a.click();
};

window.enviarServidor = async function (index) {
    const adminSecret = prompt("Introduza o ADMIN_SECRET para enviar ao servidor:");

    if (!adminSecret) {
        alert("Operação cancelada.");
        return;
    }

    const item = licencas[index];

    const payload = {
        action: "create",
        key: item.licenca,
        name: item.empresa,
        expiry: item.validade,
        plan: "standard",
        email: "",
        adminSecret
    };

    try {
        const resposta = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (dados.ok) {
            alert("Licença enviada e criada no servidor!");
        } else {
            alert("Erro ao enviar: " + JSON.stringify(dados));
        }
    } catch (e) {
        alert("Erro de comunicação com o servidor.");
        console.error(e);
    }
};

atualizarTabela();
