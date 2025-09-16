// -----------------------------------------------------------------------------
// ARQUIVO: Code.gs (Para ser criado no Google Apps Script)
// -----------------------------------------------------------------------------

// 1. ID da pasta principal no Google Drive que contém as subpastas de categorias.
const ROOT_FOLDER_ID = '1jiT-RhFQLgeZLwVqAIaGIkPmr1heEgDY'; // Substitua se for diferente

// 2. Crie uma nova Planilha Google para armazenar as avaliações.
//    Pegue o ID da URL da planilha. Ex: .../spreadsheets/d/ID_DA_PLANILHA/edit
const SPREADSHEET_ID = '1zQ_oVCntIxANtZhECbNejCqsAFI8htISgTpG5y4uKJo';
const SHEET_NAME = 'Avaliações - Seu Olhar sobre o Sertão'; // Nome da aba onde os dados serão salvos

// Função principal que trata as requisições GET
function doGet(e) {
  // const action = e.parameter.action;
  const action = 'getPhotos';
 
  if (action === 'getPhotos') {
    try {
      const photos = getPhotosFromDrive();
      const evaluations = getEvaluationsFromSheet();
      const photosWithRatings = mergeEvaluations(photos, evaluations);

      return ContentService
        .createTextOutput(JSON.stringify(photosWithRatings))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'Ação inválida.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função principal que trata as requisições POST
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    if (action === 'saveEvaluation') {
      const payload = requestData.payload;
      saveEvaluationToSheet(payload);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Avaliação salva com sucesso.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Ação POST inválida.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Erro no POST: ' + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// --- Funções Auxiliares ---

function getPhotosFromDrive() {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const photos = {};
  const files = rootFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    // Remove a extensão do arquivo para extrair nomes
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const parts = nameWithoutExt.split('-').map(part => part.trim());

    if (parts.length < 2) continue; // Pula arquivos que não seguem o padrão "Participante - Categoria"

    const participantName = parts[0].replace(/_/g, ' '); // Substitui underscores por espaços
    const categoryName = parts[1]; // A categoria é a segunda parte

    // Se a categoria ainda não existe no objeto 'photos', inicializa-a
    if (!photos[categoryName]) {
      photos[categoryName] = [];
    }
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Garante que o arquivo seja público

    photos[categoryName].push({
      id: file.getId(),
      participant: participantName,
      ratings: [] // Inicializa sem avaliações
    });
  }
  return photos;
}

function getEvaluationsFromSheet() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Se só tiver o cabeçalho

  const headers = data[0];
  const evaluations = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const evaluation = {
      photoId: row[headers.indexOf('photoId')],
      evaluator: row[headers.indexOf('evaluator')],
      comments: row[headers.indexOf('comments')],
      scores: {}
    };
    // Assumindo que os scores começam após as 3 primeiras colunas
    for (let j = 3; j < headers.length; j++) {
      evaluation.scores[headers[j]] = row[j];
    }
    evaluations.push(evaluation);
  }
  return evaluations;
}

function mergeEvaluations(photos, evaluations) {
  evaluations.forEach(evaluation => {
    for (const category in photos) {
      const photo = photos[category].find(p => p.id === evaluation.photoId);
      if (photo) {
        // Remove o photoId do objeto de avaliação antes de adicioná-lo
        const { photoId, ...ratingData } = evaluation;
        photo.ratings.push(ratingData);
        break;
      }
    }
  });
  return photos;
}


function saveEvaluationToSheet(evaluation) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  // Cria o cabeçalho se a planilha estiver vazia
  if (sheet.getLastRow() === 0) {
    const headers = ['photoId', 'evaluator', 'comments', ...Object.keys(evaluation.scores)];
    sheet.appendRow(headers);
  }

  const rowData = [
    evaluation.photoId,
    evaluation.evaluator,
    evaluation.comments,
    ...Object.values(evaluation.scores)
  ];

  sheet.appendRow(rowData);
}