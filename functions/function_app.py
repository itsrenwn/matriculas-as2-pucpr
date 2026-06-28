import azure.functions as func
import logging
import json
import os
import base64
import pymssql
from azure.storage.blob import BlobServiceClient
from azure.storage.queue import QueueServiceClient

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Pegando as strings de conexão configuradas nas variáveis de ambiente
AZURE_STORAGE_CONNECTION = os.environ.get("AzureWebJobsStorage")

# =====================================================================
# FUNÇÃO 1: Recebe os dados do formulário (HTTP) e joga na Fila/Blob
# =====================================================================
@app.route(route="SubmitMatricula", methods=["POST"])
def SubmitMatricula(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Processando nova requisição de matrícula assíncrona.')

    try:
        nome = req.form.get('nome')
        curso = req.form.get('curso')
        comprovante = req.form.get('comprovante')
        file = req.files.get('documento')

        if not nome or not curso or not comprovante or not file:
            return func.HttpResponse(
                json.dumps({"error": "Todos os campos e o documento são obrigatórios."}),
                status_code=400,
                mimetype="application/json"
            )

        # ETAPA A: SALVAR DOCUMENTO NO BLOB STORAGE
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION)
        container_client = blob_service_client.get_container_client("documentos")
        if not container_client.exists():
            container_client.create_container()

        filename = f"id_{nome.lower().replace(' ', '_')}_{file.filename}"
        blob_client = container_client.get_blob_client(filename)
        
        blob_client.upload_blob(file.stream.read(), overwrite=True)
        blob_url = blob_client.url
        logging.info(f"Arquivo enviado para o Blob com sucesso: {blob_url}")

        # ETAPA B: ENVIAR DADOS CADASTRAIS PARA A FILA
        queue_service_client = QueueServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION)
        queue_client = queue_service_client.get_queue_client("fila-matriculas")
        
        try:
            queue_client.create_queue()
        except Exception as queue_error:
            if "QueueAlreadyExists" not in str(queue_error):
                logging.info("A fila já existe ou foi criada com sucesso.")

        dados_matricula = {
            "nome": nome,
            "curso": curso,
            "comprovante_pix": comprovante,
            "documento_url": blob_url
        }

        mensagem_json = json.dumps(dados_matricula)
        mensagem_b64 = base64.b64encode(mensagem_json.encode('utf-8')).decode('utf-8')

        queue_client.send_message(mensagem_b64)
        logging.info("Dados da matrícula adicionados à fila com sucesso.")

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

# =====================================================================
# FUNÇÃO 2: Acorda sozinha quando chega mensagem na Fila e insere no SQL
# =====================================================================
@app.queue_trigger(arg_name="msg", queue_name="fila-matriculas", connection="AzureWebJobsStorage")
def ProcessarMatriculaFila(msg: func.QueueMessage) -> None:
    logging.info('Uma nova mensagem foi detectada na fila! Iniciando processamento...')

    try:
        # 1. Lê os bytes da fila e decodifica o conteúdo
        dados_brutos = msg.get_body().decode('utf-8')
        dados = json.loads(dados_brutos)

        logging.info(f"Conectando via pymssql ao banco para persistir a matrícula de: {dados['nome']}")

        # 2. Conexão direta com o Banco SQL Azure usando pymssql
        # Nota técnica fora da caixa: Para evitar falhas de variáveis de ambiente locais/remotas,
        # o pymssql se conecta quebrando os dados diretamente nos parâmetros do servidor.
        conn = pymssql.connect(
            server='srv-as2pucpr.database.windows.net',
            user='admin-as2',
            password='Mufasa00!',  # <--- APAGUE E DIGITE A SUA SENHA REAL DO BANCO AQUI
            database='free-sql-db-9312692'
        )

        with conn:
            with conn.cursor() as cursor:
                # O pymssql mapeia parâmetros usando '%s' em vez de '?'
                query = """
                    INSERT INTO Matriculas (Nome, Curso, ComprovantePix, DocumentoUrl)
                    VALUES (%s, %s, %s, %s)
                """
                cursor.execute(query, (dados['nome'], dados['curso'], dados['comprovante_pix'], dados['documento_url']))
                conn.commit()
                
        logging.info(f"Sucesso absoluto via pymssql! Aluno {dados['nome']} persistido no SQL.")

    except Exception as e:
        logging.error(f"Erro ao processar mensagem da fila e salvar no SQL via pymssql: {str(e)}")