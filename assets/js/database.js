
// ATENÇÃO: Substitua pela URL do seu script publicado no Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6srFsvizqR0RbbTLYKkB2j-2g_QCNhj8Lnas_XGTNGeZybhPivahwAUPuozRJAG_F/exec';

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
        // Para contornar o redirecionamento CORS do Google Apps Script em requisições POST,
        // usamos o modo 'no-cors'. Isso significa que não receberemos uma resposta direta
        // do fetch, mas a requisição será enviada e processada pelo script.
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveEvaluation',
                payload: evaluation
            }),
            redirect: 'follow',
            mode: 'no-cors', // Essencial para evitar o erro de CORS no POST
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        // Com 'no-cors', a resposta é "opaca" e não podemos verificar o status.
        // Assumimos sucesso se não houver erro de rede.
        // A confirmação real virá da atualização dos dados na interface.
        return { status: 'success', message: 'Avaliação enviada para processamento.' };
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        alert('Ocorreu um erro ao salvar sua avaliação. Tente novamente.');
        throw error;
    }
}