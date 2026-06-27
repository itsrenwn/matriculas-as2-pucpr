import azure.functions as func
import logging
import json
import os
from azure.storage.blob import BlobServiceClient
from azure.storage.queue import QueueServiceClient

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Pegando as strings de conexão que configuraremos nas variáveis de ambiente do Azure
AZURE_STORAGE_CONNECTION = os.environ.get("AzureWebJobsStorage")

@app.route(route="SubmitMatricula", methods=["POST"])
def SubmitMatricula(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Processando nova requisição de matrícula assíncrona.')

    try:
        # 1. Capturar os campos de texto enviados via FormData
        nome = req.form.get('nome')
        curso = req.form.get('curso')
        comprovante = req.form.get('comprovante')
        
        # 2. Capturar o arquivo de identidade anexado
        file = req.files.get('documento')

        if not nome or not curso or not comprovante or not file:
            return func.HttpResponse(
                json.dumps({"error": "Todos os campos e o documento são obrigatórios."}),
                status_code=400,
                mimetype="application/json"
            )

        # ---------- ETAPA A: SALVAR DOCUMENTO NO BLOB STORAGE ----------
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION)
        # Cria ou obtém o container "documentos"
        container_client = blob_service_client.get_container_client("documentos")
        if not container_client.exists():
            container_client.create_container()

        # Define um nome único para o arquivo usando o nome do aluno
        filename = f"id_{nome.lower().replace(' ', '_')}_{file.filename}"
        blob_client = container_client.get_blob_client(filename)
        
        # Faz o upload dos bytes do arquivo bruto
        blob_client.upload_blob(file.stream.read(), overwrite=True)
        blob_url = blob_client.url
        logging.info(f"Arquivo enviado para o Blob com sucesso: {blob_url}")

        # ---------- ETAPA B: ENVIAR DADOS CADASTRAIS PARA A FILA ----------
        queue_service_client = QueueServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION)
        # Cria ou obtém a fila "fila-matriculas"
        queue_client = queue_service_client.get_queue_client("fila-matriculas")
        if not queue_client.exists():
            queue_client.create_queue()

        # Monta a mensagem que o fluxo assíncrono vai ler depois
        dados_matricula = {
            "nome": nome,
            "curso": curso,
            "comprovante_pix": comprovante,
            "documento_url": blob_url
        }

        # Transforma em string JSON e joga na fila
        queue_client.send_message(json.dumps(dados_matricula))
        logging.info("Dados da matrícula adicionados à fila com sucesso.")

        # Retorna resposta de sucesso para o Frontend
        return func.HttpResponse(
            json.dumps({
                "message": f"Parabéns, {nome}! Seus dados foram enviados com sucesso para o fluxo assíncrono.",
                "status": "success"
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Erro ao processar matrícula: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": "Ocorreu um erro interno no servidor ao processar os dados."}),
            status_code=500,
            mimetype="application/json"
        )