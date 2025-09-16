
// ATENÇÃO: Substitua pela URL do seu script publicado no Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA1NjkAe8U9QhQkDO0I_BPTvl8jzQTsUikvkqYbr9nJUaSniUd0xJqRgQBY8JgCtDm/exec';

let photos = {};

async function loginUser(username, password) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'login',
                payload: { username, password }
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error('Falha na comunicação com o servidor de autenticação.');
        }

        return await response.json();
    } catch (error) {
        console.error('Erro durante o login:', error);
        return { status: 'error', message: error.message };
    }
}

async function fetchPhotos() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPhotos`);
        if (!response.ok) {
            throw new Error('Falha ao buscar fotos. Verifique a URL do Google Apps Script e as permissões.');
        }
        const photosData = await response.json();

        // Limpa o objeto de fotos antigo
        photos = {}; 

        // Processa os dados recebidos e padroniza as categorias para minúsculas
        for (const categoryName in photosData) {
            const normalizedCategory = categoryName.toLowerCase(); // Ex: "Agua" -> "agua"
            if (!photos[normalizedCategory]) {
                photos[normalizedCategory] = [];
            }
            
            photosData[categoryName].forEach(photo => {
                // Constrói a URL da imagem e adiciona ao objeto 'photos' com a chave normalizada
                const processedPhoto = { ...photo, url: `https://lh3.googleusercontent.com/d/${photo.id}` };
                photos[normalizedCategory].push(processedPhoto);
            });
        }

    } catch (error) {
        console.error('Erro ao buscar fotos:', error);
        // Em caso de falha, exibe um alerta para o usuário.
        alert('Não foi possível carregar as fotos do Google Drive. Verifique sua conexão e se o serviço está configurado corretamente.');
        throw error;
    }
}

async function saveEvaluation(evaluation) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // Apps Script com POST simples funciona melhor com text/plain
            },
            body: JSON.stringify({
                action: 'saveEvaluation',
                payload: evaluation
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar avaliação: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        alert('Ocorreu um erro ao salvar sua avaliação. Tente novamente.');
        throw error;
    }
}