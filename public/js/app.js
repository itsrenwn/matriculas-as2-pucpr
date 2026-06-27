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

        try {
            // Simulando um pequeno delay para fins visuais de teste local antes do Azure assumir
            await new Promise(resolve => setTimeout(resolve, 1500));

            // EXIBIÇÃO DE LOG NO CONSOLE PARA AS EVIDÊNCIAS DE TESTE
            console.log('--- DADOS DA MATRÍCULA CAPTURADOS ---');
            console.log('Estudante:', nome);
            console.log('Curso Escolhido:', curso);
            console.log('Fluxo 1 (Fila de Pagamentos) -> Token:', comprovantePagamento);
            console.log('Fluxo 2 (Fila de Documentos/Blob) -> Arquivo:', documentoFile.name);

            // Mensagem de sucesso final para o aluno
            statusMessage.textContent = `Parabéns, ${nome}! Seus dados foram enviados com sucesso para o fluxo assíncrono de matrículas da PUCPR.`;
            
            // Limpa o formulário após o sucesso
            form.reset();

        } catch (error) {
            console.error('Erro no fluxo:', error);
            statusMessage.textContent = 'Erro ao processar matrícula. Verifique a conexão.';
            statusMessage.className = 'status-box error'; // Usa a cor vermelha do CSS
        }
    });
});