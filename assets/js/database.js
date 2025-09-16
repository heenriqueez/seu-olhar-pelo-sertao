
// ATENÇÃO: Substitua pela URL do seu script publicado no Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA1NjkAe8U9QhQkDO0I_BPTvl8jzQTsUikvkqYbr9nJUaSniUd0xJqRgQBY8JgCtDm/exec';

const users = [
    {
        username: 'admin',
        password: 'adminpassword',
        role: 'admin'
    },
    {
        username: 'Carlos Henrique',
        password: 'avaliadorpassword1',
        role: 'evaluator'
    },
    {
        username: 'avaliador2',
        password: 'avaliadorpassword2',
        role: 'evaluator'
    }
];

let photos = {};

async function fetchPhotos() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPhotos`);
        if (!response.ok) {
            throw new Error('Falha ao buscar fotos. Verifique a URL do Google Apps Script e as permissões.');
        }
        const photosData = await response.json();
        photos = photosData;
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