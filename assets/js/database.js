// --- CONFIGURAÇÃO DO FIREBASE ---
// A variável firebaseConfig é carregada a partir de firebase-config.js
// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ATENÇÃO: Substitua pela URL do seu script publicado no Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOPOIFMlLnM_iZxkEogKzlAj8kZcse6wj3aoJr2XOyWvMKLH_Iq2hKNxjDAl1ZANBn/exec';

// Domínio falso para criar e-mails a partir de nomes de usuário
const FAKE_EMAIL_DOMAIN = '@seu-olhar.app';

let photos = {};

/**
 * Registra um novo usuário no Firebase Authentication e armazena seus dados no Firestore.
 * Apenas para administradores.
 */
async function registerNewUser(email, password, role) {
    try {
        const username = email.toLowerCase();
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
                action: 'registerUser', 
                payload: { username, password, role } 
            }),
            mode: 'cors'
        });

        const result = await response.json();
        // O backend retorna a mensagem dentro de um objeto 'data'.
        if (result.status === 'success' && result.data) {
            return { status: 'success', message: result.data.message };
        }
        return result;
    } catch (error) {
        console.error("Erro ao chamar o backend para registrar usuário:", error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Busca todos os usuários cadastrados no Firestore.
 */
async function fetchUsers() {
    try {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Erro ao buscar usuários do Firestore:", error);
        throw error;
    }
}

/**
 * Deleta um usuário do Firebase Auth e Firestore via backend.
 */
async function deleteUser(usernameToDelete, loggedInUsername) {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ 
            action: 'deleteUser', 
            payload: { usernameToDelete, loggedInUsername } }),
        mode: 'cors'
    });
    return response.json();
}

/**
 * Realiza o login do usuário com Firebase Authentication.
 */
async function loginUser(email, password) {
    const username = email.toLowerCase();
    const internalEmail = username + FAKE_EMAIL_DOMAIN;
    try {
        const userCredential = await auth.signInWithEmailAndPassword(internalEmail, password);
        const user = userCredential.user;

        // Busca a função (role) do usuário no Firestore.
        // Após o login, o `user` objeto contém o e-mail usado para autenticar.
        // No entanto, nosso documento de usuário no Firestore usa o `username` como ID.
        // Portanto, continuamos a usar o `username` (que derivamos do input do formulário) para buscar o documento.
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            throw new Error("Dados do usuário não encontrados no banco de dados.");
        }
        const userData = userDoc.data();

        return {
            status: 'success',
            user: {
                username: userData.username,
                role: userData.role
            }
        };
    } catch (error) {
        console.error('Erro durante o login:', error.code, error.message);
        // Fornece uma mensagem mais amigável para o usuário final
        if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            return { status: 'error', message: 'Usuário ou senha inválidos. Verifique os dados e tente novamente.' };
        }
        // Para outros erros, mostra a mensagem do Firebase
        return { status: 'error', message: `Erro de login: ${error.message}` };
    }
}

/**
 * Busca todas as fotos e suas avaliações do Firestore.
 */
async function fetchPhotos() {
    try {
        const snapshot = await db.collection('photos').get();
        const allPhotos = snapshot.docs.map(doc => doc.data());
        photos = {}; // Limpa o objeto de fotos
 
        allPhotos.forEach(photo => {
            const category = photo.category; // ex: 'fauna'
            if (!photos[category]) {
                photos[category] = [];
            }
            photos[category].push({
                ...photo,
                url: `https://lh3.googleusercontent.com/d/${photo.id}`,
                ratings: photo.ratings || [] // Garante que 'ratings' seja sempre um array
            });
        });

   
    } catch (error) {
        console.error('Erro ao buscar fotos do Firestore:', error);
        alert('Não foi possível carregar as fotos. Verifique a configuração do Firebase.');
        throw error;
    }
}

/**
 * Salva uma avaliação no documento da foto correspondente no Firestore.
 */
async function saveEvaluation(evaluation) {
    try {
        const photoRef = db.collection('photos').doc(evaluation.photoId);

        // Usa uma transação para garantir a atomicidade da operação
        await db.runTransaction(async (transaction) => {
            const photoDoc = await transaction.get(photoRef);
            if (!photoDoc.exists) {
                throw "Documento da foto não encontrado!";
            }

            const data = photoDoc.data();
            const ratings = data.ratings || [];

            // Verifica se o avaliador já avaliou esta foto
            const existingEvalIndex = ratings.findIndex(r => r.evaluator === evaluation.evaluator);

            if (existingEvalIndex > -1) {
                // Atualiza a avaliação existente
                ratings[existingEvalIndex] = evaluation;
            } else {
                // Adiciona uma nova avaliação
                ratings.push(evaluation);
            }

            transaction.update(photoRef, { ratings: ratings });
        });

        return { status: 'success' };
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        alert('Ocorreu um erro ao salvar sua avaliação. Tente novamente.');
        throw error;
    }
}

/**
 * Chama o Google Apps Script para sincronizar fotos do Drive para o Firestore.
 */
async function syncPhotosWithDrive() {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'syncPhotos' }),
        mode: 'cors'
    });
    return response.json();
}