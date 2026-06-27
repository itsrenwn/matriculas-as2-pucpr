// 1. Registro do Service Worker para o funcionamento do PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('PWA: Service Worker registrado com sucesso!', reg.scope))
            .catch((err) => console.error('PWA: Falha ao registrar o Service Worker:', err));
    });
}

// 2. Manipulação do Formulário de Matrícula
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-matricula');
    const statusMessage = document.getElementById('status-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede a página de recarregar

        // Captura dos campos preenchidos pelo aluno
        const nome = document.getElementById('nome').value;
        const curso = document.getElementById('curso').value;
        const comprovantePagamento = document.getElementById('comprovante-pagamento').value;
        const documentoFile = document.getElementById('documento').files[0];

        // Exibe feedback visual inicial de processamento
        statusMessage.textContent = 'Processando sua matrícula nos servidores da nuvem...';
        statusMessage.className = 'status-box success'; // Usa a cor verde do CSS
        statusMessage.classList.remove('hidden');

        // Cria o FormData estruturado exatamente como o back-end espera receber
        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('curso', curso);
        formData.append('comprovante', comprovantePagamento); // Mapeado para bater com a Function
        if (documentoFile) {
            formData.append('documento', documentoFile);
        }

        try {
            // Envio real para a Azure Function
            const response = await fetch('https://fn-matriculas-pucpr-bwfva7dneqgtfdfd.brazilsouth-01.azurewebsites.net/api/SubmitMatricula', {
                method: 'POST',
                body: formData // Envia o formulário com o arquivo sem precisar de Headers manuais
            });

            const resultado = await response.json();

            if (response.ok) {
                // Mensagem de sucesso vinda diretamente da Azure Function
                statusMessage.textContent = resultado.message || `Parabéns, ${nome}! Seus dados foram enviados com sucesso.`;
                statusMessage.className = 'status-box success';
                
                // Limpa o formulário após o sucesso
                form.reset();
            } else {
                // Trata erros de validação retornados pela Function (ex: campos ausentes)
                statusMessage.textContent = `Erro no cadastro: ${resultado.error}`;
                statusMessage.className = 'status-box error';
            }

        } catch (error) {
            console.error('Erro no fluxo:', error);
            statusMessage.textContent = 'Erro ao processar matrícula. Não foi possível conectar ao servidor.';
            statusMessage.className = 'status-box error'; // Usa a cor vermelha do CSS
        }
    });
});