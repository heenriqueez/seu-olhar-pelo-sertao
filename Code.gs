// -----------------------------------------------------------------------------
// ARQUIVO: Code.gs (Versão Refatorada)
// -----------------------------------------------------------------------------

// 1. ID da pasta principal no Google Drive que contém as subpastas de categorias.
const ROOT_FOLDER_ID = '1jiT-RhFQLgeZLwVqAIaGIkPmr1heEgDY'; // Substitua se for diferente

// 2. Crie uma nova Planilha Google para armazenar as avaliações.
//    Pegue o ID da URL da planilha. Ex: .../spreadsheets/d/ID_DA_PLANILHA/edit
const SPREADSHEET_ID = '1zQ_oVCntIxANtZhECbNejCqsAFI8htISgTpG5y4uKJo'; // <<< ATENÇÃO: SUBSTITUA ESTE VALOR
const SHEET_NAME = 'Avaliacoes'; // Nome da aba onde os dados serão salvos

// Função principal que trata as requisições GET
function doGet(e) {
  try {    
    const action = e.parameter.action;
    if (action === 'getPhotos') {
      const photos = getPhotosFromDrive();
      const evaluations = getEvaluationsFromSheet();
      const photosWithRatings = mergeEvaluations(photos, evaluations);
      return createJsonResponse(photosWithRatings);
    }
    return createJsonResponse({ status: 'error', message: 'Ação GET inválida.' }, 400);
  } catch (error) {
    Logger.log(`Erro em doGet: ${error.message}\n${error.stack}`);
    return createJsonResponse({ status: 'error', message: 'Erro no servidor ao buscar dados: ' + error.message }, 500);
  }
}

// Função principal que trata as requisições POST
function doPost(e) {
  try {
    // Apps Script com POST simples (Content-Type: text/plain) recebe os dados diretamente em e.postData.contents
    // Não é necessário um e.parameter.postData como na simulação GET.
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Requisição POST inválida ou sem conteúdo.");
    }
    const requestData = JSON.parse(e.postData.contents);    
    const action = requestData.action;

    if (action === 'saveEvaluation') {
      const payload = requestData.payload;
      saveEvaluationToSheet(payload);
      return createJsonResponse({ status: 'success', message: 'Avaliação salva com sucesso.' });
    }

    return createJsonResponse({ status: 'error', message: 'Ação POST inválida.' }, 400);
  } catch (error) {
    Logger.log(`Erro em doPost: ${error.message}\n${error.stack}\nConteúdo recebido: ${e.postData ? e.postData.contents : 'N/A'}`);
    return createJsonResponse({ status: 'error', message: 'Erro no servidor ao processar a requisição: ' + error.toString() }, 500);
  }
}

// --- Função Auxiliar de Resposta ---

/**
 * Cria uma resposta JSON padrão com cabeçalhos CORS.
 * @param {object} data - O objeto a ser convertido para JSON.
 * @param {number} [statusCode=200] - O código de status HTTP (não usado diretamente, mas bom para referência).
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(data, statusCode = 200) {
  // Cria a resposta de texto e define o tipo MIME.
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);

  // Define os cabeçalhos CORS para permitir requisições de qualquer origem
  response.setHeader('Access-Control-Allow-Origin', '*');
  // Adiciona o cabeçalho 'Access-Control-Allow-Headers' para requisições com 'Content-Type'
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); 
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

// --- Funções Auxiliares ---

function getPhotosFromDrive() {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const categoryFolders = rootFolder.getFolders();
  const photos = {};

  while (categoryFolders.hasNext()) {
    const categoryFolder = categoryFolders.next();
    const categoryName = categoryFolder.getName();
    photos[categoryName] = [];

    const files = categoryFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      const participantName = fileName.split('.')[0].trim(); // Extrai o nome do participante do nome do arquivo

      photos[categoryName].push({
        id: file.getId(),
        url: `https://lh3.googleusercontent.com/d/${file.getId()}`, // URL direta para visualização
        participant: participantName,
        ratings: [] // Inicializa sem avaliações
      });
    }
  }
  return photos;
}

function getEvaluationsFromSheet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // Se só tiver o cabeçalho ou estiver vazia

    const headers = data[0].map(h => h.toString().trim());
    const evaluations = [];

    const photoIdIndex = headers.indexOf('photoId');
    const evaluatorIndex = headers.indexOf('evaluator');
    const commentsIndex = headers.indexOf('comments');

    if (photoIdIndex === -1 || evaluatorIndex === -1) {
      throw new Error("A planilha de avaliações não contém as colunas obrigatórias 'photoId' e 'evaluator'.");
    }

    // Itera pelas linhas de dados (começando da segunda linha)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const evaluation = {
        photoId: row[photoIdIndex],
        evaluator: row[evaluatorIndex],
        comments: commentsIndex > -1 ? row[commentsIndex] : '',
        scores: {}
      };

      // Itera sobre os cabeçalhos para preencher os scores dinamicamente
      headers.forEach((header, j) => {
        if (j !== photoIdIndex && j !== evaluatorIndex && j !== commentsIndex) {
          evaluation.scores[header] = row[j];
        }
      });
      evaluations.push(evaluation);
    }
    return evaluations;
  } catch (e) {
    Logger.log(`Erro ao ler a planilha: ${e.message}`);
    throw new Error("Não foi possível ler os dados da planilha de avaliações.");
  }
}

function mergeEvaluations(photos, evaluations) {
  evaluations.forEach(evaluation => {
    for (const category in photos) {
      // Compara IDs como strings para evitar problemas de tipo (número vs texto)
      const photo = photos[category].find(p => p.id.toString() === evaluation.photoId.toString());
      if (photo) {
        const { photoId, ...ratingData } = evaluation; // Remove o photoId antes de adicionar
        photo.ratings.push(ratingData);
        break;
      }
    }
  });
  return photos;
}


function saveEvaluationToSheet(evaluation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Espera até 30 segundos para obter o lock

  let sheet; // Declara a variável sheet fora do try
  try {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      // Se a aba não existe, cria uma nova
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
      Logger.log(`Aba '${SHEET_NAME}' não encontrada. Criando uma nova.`);
    }

    // Cria o cabeçalho apenas se a planilha estiver completamente vazia
    if (sheet.getLastRow() === 0) {
      const headers = ['photoId', 'evaluator', 'comments', ...Object.keys(evaluation.scores)];
      sheet.appendRow(headers);
      Logger.log('Cabeçalho da planilha de avaliações criado.');
    }

    const rowData = [
      evaluation.photoId,
      evaluation.evaluator,
      evaluation.comments,
      ...Object.values(evaluation.scores)
    ];

    sheet.appendRow(rowData);
    Logger.log(`Avaliação salva para a foto ID: ${evaluation.photoId} pelo avaliador: ${evaluation.evaluator}`);

  } finally {
    lock.releaseLock();
  }
}