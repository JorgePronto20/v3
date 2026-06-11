function gerarPedido() {
    const empresa = document.getElementById("empresa").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const dias = parseInt(document.getElementById("dias").value);

    if (!empresa || !email || !telefone || !dias) {
        alert("Preencha todos os campos.");
        return;
    }

    const resultado = document.getElementById("resultado");
    resultado.style.display = "block";

    resultado.innerHTML = `
        <b>Pedido criado!</b><br><br>
        Envie o valor para o MB WAY:<br>
        <b>${telefone}</b><br><br>
        Após confirmar o pagamento, clique em "Gerar Licença" no painel.
    `;
}
