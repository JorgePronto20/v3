// app.js — lógica global da V3

console.log("FaturaLite V3 carregada.");

// Função global para gerar blocos de 4 caracteres
export function bloco() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < 4; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}

// Função global para gerar licenças
export function gerarLicenca() {
    return `${bloco()}-${bloco()}-${bloco()}-${bloco()}`;
}

// Função global para mostrar alertas bonitos (futuro)
export function notify(msg) {
    alert(msg);
}
