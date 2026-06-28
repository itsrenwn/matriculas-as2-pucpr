// 1. Registro do Service Worker para o funcionamento do PWA (Mantido intacto)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('PWA: Service Worker registrado com sucesso!', reg.scope))
            .catch((err) => console.error('PWA: Falha ao registrar o Service Worker:', err));
    });
}

// 2. Manipulação da Interface, Abas e Formulário
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE ALTERNÂNCIA DE ABAS ---
    const btnRealizar = document.getElementById('btn-realizar');
    const btnConsultar = document.getElementById('btn-consultar');
    const abaRealizar = document.getElementById('realizar');
    const abaConsultar = document.getElementById('consultar');

    if (btnRealizar && btnConsultar) {
        btnRealizar.addEventListener('click', () => {
            btnConsultar.classList.remove('active');
            abaConsultar.classList.remove('active');
            btnRealizar.classList.add('active');
            abaRealizar.classList.add('active');
        });

        btnConsultar.addEventListener('click', () => {
            btnRealizar.classList.remove('active');
            abaRealizar.classList.remove('active');
            btnConsultar.classList.add('active');
            abaConsultar.classList.add('active');
            
            // Dispara a busca automática de notificações ao entrar na aba
            carregarTodasNotificacoes();
        });
    }

    // --- MANIPULAÇÃO DO FORMULÁRIO DE MATRÍCULA ---
    const form = document.getElementById('formMatricula');
    const statusMessage = document.getElementById('msgRealizar');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede a página de recarregar

            // Captura dos campos preenchidos pelo aluno
            const nome = document.getElementById('nome').value;
            const curso = document.getElementById('curso').value;
            const comprovantePagamento = document.getElementById('comprovante').value;
            const documentoFile = document.getElementById('documento').files[0];

            // Exibe feedback visual inicial de processamento
            statusMessage.textContent = 'Processando sua matrícula nos servidores da nuvem...';
            statusMessage.className = 'notification info'; 
            statusMessage.style.display = 'block';

            // Cria o FormData estruturado exatamente como o back-end espera receber
            const formData = new FormData();
            formData.append('nome', nome);
            formData.append('curso', curso);
            formData.append('comprovante', comprovantePagamento); 
            if (documentoFile) {
                formData.append('documento', documentoFile);
            }

            try {
                // Envio real para a Azure Function
                const response = await fetch('https://fn-matriculas-pucpr-bwfva7dneqgtfdfd.brazilsouth-01.azurewebsites.net/api/SubmitMatricula', {
                    method: 'POST',
                    body: formData 
                });

                const resultado = await response.json();

                if (response.ok) {
                    // Mensagem de sucesso vinda diretamente da Azure Function
                    statusMessage.textContent = resultado.message || `Parabéns, ${nome}! Seus dados foram enviados com sucesso.`;
                    statusMessage.className = 'notification success';
                    
                    // Limpa o formulário após o sucesso
                    form.reset();
                } else {
                    // Trata erros de validação retornados pela Function
                    statusMessage.textContent = `Erro no cadastro: ${resultado.error}`;
                    statusMessage.className = 'notification error';
                }

            } catch (error) {
                console.error('Erro no fluxo:', error);
                statusMessage.textContent = 'Erro ao processar matrícula. Não foi possível conectar ao servidor.';
                statusMessage.className = 'notification error';
            }
        });
    }
});

// --- LÓGICA ASSÍNCRONA: CARREGAR TODAS AS NOTIFICAÇÕES AUTOMATICAMENTE ---
async function carregarTodasNotificacoes() {
    const lista = document.getElementById('listaNotificacoes');
    if (!lista) return;

    // Coloca o estado visual de carregamento inicial
    lista.innerHTML = '<div class="notification info">A carregar notificações dos servidores...</div>';

    try {
        // Faz a chamada GET para a nossa rota do Azure (que configuraremos a seguir)
        const response = await fetch('https://fn-matriculas-pucpr-bwfva7dneqgtfdfd.brazilsouth-01.azurewebsites.net/api/ConsultarMatricula');
        const matriculas = await response.json();

        // Limpa o container
        lista.innerHTML = '';

        if (matriculas && matriculas.length > 0) {
            // Percorre todas as matrículas devolvidas pelo banco e renderiza cada notificação
            matriculas.forEach(aluno => {
                const card = document.createElement('div');
                card.className = 'notification success';
                card.style.marginBottom = '10px';
                card.textContent = `🔔 NOTIFICAÇÃO: Boas-vindas! A matrícula de ${aluno.nome} no curso de ${aluno.curso} foi processada com sucesso!`;
                lista.appendChild(card);
            });
        } else {
            lista.innerHTML = '<div class="notification info">Nenhuma matrícula concluída no momento.</div>';
        }

    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        lista.innerHTML = '<div class="notification error">Não foi possível carregar o mural de notificações.</div>';
    }
}