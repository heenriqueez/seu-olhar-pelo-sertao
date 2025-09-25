document.addEventListener('DOMContentLoaded', function () {
    const page = window.location.pathname.split('/').pop();
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    
    if (!loggedInUser && page !== 'login.html') {
        window.location.href = 'login.html';
        return;
    }

    if (loggedInUser) {
        if (page === 'login.html') {
            const targetPage = loggedInUser.role === 'admin' ? 'admin.html' : 'avaliacao.html';
            window.location.href = targetPage;
            return;
        }
        if (loggedInUser.role === 'admin' && page !== 'admin.html') {
            window.location.href = 'admin.html';
            return;
        }
        else if (loggedInUser.role === 'evaluator' && page !== 'avaliacao.html') {
            window.location.href = 'avaliacao.html';
            return;
        }
    }

    // Page specific logic
    switch (page) {
        case 'login.html':
            handleLoginPage();
            break;
        case 'admin.html':
            handleAdminPage();
            break;
        case 'avaliacao.html':
            handleEvaluationPage();
            break;
    }

    const customAlert = document.getElementById('custom-alert');
    const customAlertMessage = document.getElementById('custom-alert-message');
    let customAlertClose = document.getElementById('custom-alert-close');

    function showCustomAlert(message, onOk) {
        customAlertMessage.textContent = message;
        customAlert.style.display = 'flex';
        setTimeout(() => customAlert.classList.add('visible'), 10);
 
        // Remove previous listener to avoid multiple triggers
        const newOk = customAlertClose.cloneNode(true); // Use cloneNode to easily remove old listeners
        if (customAlertClose.parentNode) {
            customAlertClose.parentNode.replaceChild(newOk, customAlertClose);
        }
        customAlertClose = newOk; // Update reference
 
        const okClickHandler = () => {
            customAlert.classList.remove('visible');
            setTimeout(() => customAlert.style.display = 'none', 300);
            if (onOk) onOk(); 
        };
        customAlertClose.addEventListener('click', okClickHandler, { once: true }); // Use {once: true} to auto-remove listener
    }

    const customConfirm = document.getElementById('custom-confirm');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    let customConfirmOk = document.getElementById('custom-confirm-ok');
    const customConfirmCancel = document.getElementById('custom-confirm-cancel');

    function showCustomConfirm(message, onConfirm) {
        customConfirmMessage.textContent = message;
        customConfirm.style.display = 'flex';
        setTimeout(() => customConfirm.classList.add('visible'), 10);

        // Remove previous listener to avoid multiple triggers
        const newOk = customConfirmOk.cloneNode(true); // Use cloneNode to easily remove old listeners
        if (customConfirmOk.parentNode) {
            customConfirmOk.parentNode.replaceChild(newOk, customConfirmOk);
        }
        customConfirmOk = newOk; // Update reference
        customConfirmOk.addEventListener('click', () => {
            closeConfirm();
            onConfirm();
        }, { once: true }); // Use {once: true} to auto-remove listener
    }

    const closeConfirm = () => {
        customConfirm.classList.remove('visible');
        setTimeout(() => customConfirm.style.display = 'none', 300);
    };

    if (customConfirmCancel) {
        customConfirmCancel.addEventListener('click', closeConfirm);
    }

    function handleLoginPage() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const username = e.target.username.value; // Agora é o email
                const password = e.target.password.value; 

                const result = await loginUser(username, password);

                if (result.status === 'success' && result.user) {
                    localStorage.setItem('loggedInUser', JSON.stringify(result.user));
                    if (result.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'avaliacao.html';
                    }
                } else {
                    const errorMessage = result.message || 'Usuário ou senha inválidos!';
                    showCustomAlert(errorMessage);
                }
            });
        }
    }

    async function handleAdminPage() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.addEventListener('click', logout);

        // --- Variáveis e Funções de Gerenciamento de Usuários ---
        const loggedInUsername = loggedInUser.username; // Obtém o nome de usuário do admin logado
        // --- Gerenciamento de Usuários ---
        const addUserForm = document.getElementById('add-user-form');
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target['user-email'].value;
            const password = e.target['user-password'].value;
            const role = e.target['user-role'].value;

            if (password.length < 6) {
                showCustomAlert('A senha deve ter no mínimo 6 caracteres.');
                return;
            }

            showCustomAlert('Registrando usuário...');
            const result = await registerNewUser(email, password, role);
            
            if (result.status === 'success') {
                showCustomAlert(result.message || 'Usuário registrado com sucesso!');
                addUserForm.reset();
            } else {
                showCustomAlert(`Erro ao registrar usuário: ${result.message}`);
            }
            renderUsers(); // Re-renderiza a lista de usuários após adicionar um novo
        });
        const rankingCategorySelect = document.getElementById('ranking-category-select');        
        const allCategories = ['fauna', 'flora', 'agua', 'destruicao', 'pesquisas', 'religiosidade', 'povos'];
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            // Mapeia as chaves para nomes formatados e acentuados
            const categoryDisplayNames = {
                'fauna': 'Fauna',
                'flora': 'Flora',
                'agua': 'Água',
                'destruicao': 'Destruição do Cerrado',
                'pesquisas': 'Pesquisas Científicas',
                'religiosidade': 'Religiosidade',
                'povos': 'Povos Tradicionais'
            };
            const formattedName = categoryDisplayNames[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            option.textContent = formattedName;
            rankingCategorySelect.appendChild(option);
        });

        rankingCategorySelect.addEventListener('change', renderRanking);

        const exportCsvBtn = document.getElementById('export-csv-btn');
        exportCsvBtn.addEventListener('click', exportRankingToCSV);

        const syncPhotosBtn = document.getElementById('sync-photos-btn');
        const photoListContainer = document.getElementById('photo-list-container');

        syncPhotosBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            showCustomAlert('Sincronizando com o Google Drive...');
            const result = await syncPhotosWithDrive();
            await fetchPhotos(); // Recarrega as fotos do Firestore
            renderPhotos();
            renderRanking(); // Recarrega o ranking com as novas fotos
            showCustomAlert('Sincronização concluída!');
        });
        

        // --- Gerenciamento de Usuários (Listagem e Exclusão) ---
        const usersTableBody = document.querySelector('#users-table tbody');

        async function renderUsers() {
            usersTableBody.innerHTML = ''; // Limpa as linhas existentes
            const users = await fetchUsers(); // Busca todos os usuários do Firestore

            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhum usuário cadastrado.</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = usersTableBody.insertRow();
                row.insertCell(0).textContent = user.username;
                row.insertCell(1).textContent = user.role === 'admin' ? 'Administrador' : 'Avaliador';

                const actionsCell = row.insertCell(2);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.className = 'btn remove-btn';
                deleteButton.dataset.username = user.username;

                // Regras de exclusão (exibição no frontend)
                if (user.username === 'admin' && loggedInUsername !== 'admin') {
                    // Outros admins não podem deletar o admin principal
                    deleteButton.disabled = true;
                    deleteButton.title = 'Você não pode deletar o administrador principal.';
                } else if (user.username === loggedInUsername) {
                    // Admins não podem deletar a si mesmos
                    deleteButton.disabled = true;
                    deleteButton.title = 'Você não pode deletar sua própria conta.';
                }

                deleteButton.addEventListener('click', async () => {
                    showCustomConfirm(`Tem certeza que deseja excluir o usuário '${user.username}'?`, async () => {
                        showCustomAlert('Excluindo usuário...');
                        try {
                            const result = await deleteUser(user.username, loggedInUsername);
                            if (result.status === 'success') {
                                showCustomAlert(result.message || `Usuário '${user.username}' excluído com sucesso!`);
                                renderUsers(); // Re-renderiza a lista de usuários
                            } else {
                                showCustomAlert(`Erro ao excluir usuário: ${result.message}`);
                            }
                        } catch (error) {
                            console.error('Erro ao excluir usuário:', error);
                            showCustomAlert(`Erro inesperado ao excluir usuário: ${error.message}`);
                        }
                    });
                });
                actionsCell.appendChild(deleteButton);
            });
        }

        // Renderização inicial dos usuários
        await renderUsers();

        // --- Lógica de Abas ---
        const tabButtons = document.querySelectorAll('.tab-navigation .tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        function showTab(tabId) {
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            tabButtons.forEach(button => {
                button.classList.remove('active');
            });

            document.getElementById(tabId).classList.add('active');
            document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

            // Render content based on active tab
            if (tabId === 'user-management-tab') {
                renderUsers(); // Garante que a lista de usuários esteja atualizada
            } else if (tabId === 'photos-ranking-tab') {
                renderPhotos();
                renderRanking();
            }
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                showTab(button.dataset.tab);
            });
        });

        // Carrega todos os dados iniciais
        await fetchPhotos(); // Busca todas as fotos do Firestore uma vez
        await fetchUsers(); // Busca todos os usuários do Firestore uma vez
        showTab('user-management-tab'); // Define a aba de gerenciamento de usuários como padrão
        
        function renderPhotos() {
            photoListContainer.innerHTML = '';
            let allPhotos = [];

            for (const category in photos) {
                // Acessa o array de fotos para cada categoria e adiciona ao array geral
                allPhotos.push(...photos[category]);
            }

            if (allPhotos.length === 0) {
                photoListContainer.innerHTML = '<p style="text-align: center; width: 100%;">Nenhuma foto sincronizada ainda.</p>';
                return;
            }

            const track = document.createElement('div');
            track.className = 'carousel-track';

            const allPhotosDoubled = [...allPhotos, ...allPhotos];

            allPhotosDoubled.forEach(photo => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'carousel-item';
                itemDiv.innerHTML = `<img src="${photo.url}" alt="Foto de ${photo.participant || 'concurso'}">`;
                itemDiv.addEventListener('click', () => showAdminImageModal(photo));
                track.appendChild(itemDiv);
            });

            photoListContainer.appendChild(track);
        }

        async function renderRanking() {
            const rankingList = document.getElementById('ranking-list');
            const selectedCategory = rankingCategorySelect.value;
            const criteriaKeys = ['enquadramento', 'criatividade', 'contexto', 'composicao-foto', 'composicao-cores', 'identificacao', 'resolucao'];
            rankingList.innerHTML = '';

            let allPhotos = [];
            for (const category in photos) {
                if (selectedCategory === 'all' || selectedCategory === category) {
                    allPhotos.push(...photos[category]);
                }
            }

            const rankedPhotos = allPhotos.map(photo => {
                const numEvaluations = photo.ratings.length;
                const criteriaScores = Object.fromEntries(criteriaKeys.map(key => [key, 0]));
                let totalAverageSum = 0; // Soma das médias de cada avaliação
                
                photo.ratings.forEach(ev => {
                    let evaluationScoreSum = 0;
                    let criteriaCount = 0;
                    
                    for (const crit in ev.scores) { 
                        // Agora os scores já vêm normalizados do backend
                        if (Object.prototype.hasOwnProperty.call(criteriaScores, crit)) {
                            const score = parseInt(ev.scores[crit], 10);
                            evaluationScoreSum += score;
                            criteriaScores[crit] += score;
                            criteriaCount++;
                        }
                    }
                    totalAverageSum += (criteriaCount > 0 ? (evaluationScoreSum / criteriaCount) : 0);
                    
                });
                const overallAverage = numEvaluations > 0 ? (totalAverageSum / numEvaluations) : 0;
                
                return { ...photo, average: overallAverage, numEvaluations: numEvaluations, criteriaScores: criteriaScores };
            });

            rankedPhotos.sort((a, b) => {
                if (b.average !== a.average) {
                    return b.average - a.average;
                }
                const tieBreakerCriteria = ['composicao-foto', 'criatividade', 'enquadramento', 'contexto', 'composicao-cores', 'identificacao', 'resolucao'];
                for (const crit of tieBreakerCriteria) {
                    // Garante que se um critério não existir, seu valor seja 0 para evitar NaN.
                    const totalScoreA = a.criteriaScores[crit] || 0;
                    const totalScoreB = b.criteriaScores[crit] || 0;
                    const scoreA = a.numEvaluations > 0 ? (totalScoreA / a.numEvaluations) : 0;
                    const scoreB = b.numEvaluations > 0 ? (totalScoreB / b.numEvaluations) : 0;
                    if (scoreB !== scoreA) return scoreB - scoreA;
                }

                return 0;
            });

            if (rankedPhotos.length === 0) {
                rankingList.innerHTML = '<li>Nenhuma foto cadastrada para esta categoria.</li>';
                return;
            }

            rankedPhotos.forEach((photo, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'photo-item';

                const detailsHtml = `
                    <div class="evaluation-details-container">
                        <div class="average-scores">
                            <h4>Médias Gerais</h4>
                        </div>
                        <div class="individual-evaluations">
                        </div>
                    </div>
                `;


                listItem.innerHTML = `
                    <div class="photo-item-header">
                         <span class="rank-position">${index + 1}</span>
                         <img src="${photo.url}" alt="Foto de ${photo.participant}">
                         <div class="photo-item-info">
                            <p><strong>Média Geral:</strong> ${photo.average.toFixed(2)}</p>
                            <p><strong>Participante:</strong> ${photo.participant || 'Não informado'}</p>
                            <p><strong>Avaliações:</strong> ${photo.numEvaluations}</p>
                         </div>
                         <div class="photo-item-category">${photo.category.replace(/_/g, ' ')}</div>
                        <button class="details-btn" data-photoid="rank-${photo.id}">Ver Detalhes</button>
                        <button class="remove-btn" data-id="${photo.id}" data-category="${photo.category}">Remover</button>

                    </div>
                    <div class="photo-details" id="details-rank-${photo.id}">
                        ${detailsHtml}
                    </div>
                `;
                rankingList.appendChild(listItem);
            });

            rankingList.querySelectorAll('.details-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const detailsPanel = document.getElementById(`details-${this.dataset.photoid}`);
                    detailsPanel.classList.toggle('open');

                    if (detailsPanel.classList.contains('open') && !detailsPanel.dataset.detailsLoaded) {
                        const photoId = this.dataset.photoid.replace('rank-', '');
                        const photo = rankedPhotos.find(p => p.id === photoId);
                        
                        renderEvaluationDetails(detailsPanel, photo, criteriaKeys);
                        detailsPanel.dataset.detailsLoaded = 'true';
                    }
                });
            });
        }

        async function exportRankingToCSV() {
            showCustomAlert('Gerando CSV...');
            
            const selectedCategory = rankingCategorySelect.value;
            const criteriaKeys = ['enquadramento', 'criatividade', 'contexto', 'composicao-foto', 'composicao-cores', 'identificacao', 'resolucao'];
            
            let allPhotos = [];
            for (const category in photos) {
                if (selectedCategory === 'all' || selectedCategory === category) {
                    allPhotos.push(...photos[category]);
                }
            }

            const rankedPhotos = allPhotos.map(photo => {
                const numEvaluations = photo.ratings.length;
                const criteriaScores = Object.fromEntries(criteriaKeys.map(key => [key, 0]));
                let totalAverageSum = 0;

                photo.ratings.forEach(ev => {
                    let evaluationScoreSum = 0;
                    let criteriaCount = 0;

                    for (const crit in ev.scores) { // Agora os scores já vêm normalizados do backend
                        if (Object.prototype.hasOwnProperty.call(criteriaScores, crit)) {
                            const score = parseInt(ev.scores[crit], 10);
                            evaluationScoreSum += score;
                            criteriaScores[crit] += score;
                            criteriaCount++;
                        }
                    }
                    totalAverageSum += (criteriaCount > 0 ? (evaluationScoreSum / criteriaCount) : 0);
                });
                const overallAverage = numEvaluations > 0 ? (totalAverageSum / numEvaluations) : 0;
                return { ...photo, average: overallAverage, numEvaluations: numEvaluations, criteriaScores: criteriaScores };
            }).sort((a, b) => b.average - a.average);

            if (rankedPhotos.length === 0) {
                showCustomAlert('Não há dados para exportar.');
                return;
            }

            const headers = ['Posição', 'Participante', 'Categoria', 'Média Geral', 'Nº de Avaliações', ...criteriaKeys.map(formatCriterionName)];
            let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n';

            rankedPhotos.forEach((photo, index) => {
                const row = [
                    index + 1,
                    `"${photo.participant}"`,
                    photo.category,
                    photo.average.toFixed(2),
                    photo.numEvaluations,
                    ...criteriaKeys.map(crit => (photo.criteriaScores[crit] / (photo.numEvaluations || 1)).toFixed(2))
                ];
                csvContent += row.join(',') + '\n';
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `ranking_${selectedCategory}_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function formatCriterionName(name) {
            // Substitui hífens por espaços e capitaliza a primeira letra de cada palavra de forma segura.
            // Agora lida com espaços diretamente e capitaliza.
            return name.replace(/-/g, ' ').replace(/(^\w|\s\w)/g, char => char.toUpperCase());
        }

        function renderEvaluationDetails(detailsPanel, photo, criteriaKeys) {
            let carouselHtml = `
                <div class="details-carousel-wrapper">
                    <div class="details-carousel-track">
            `;

            // Slide 1: Médias Gerais
            carouselHtml += '<div class="details-carousel-slide">';
            carouselHtml += '<h4>Médias Gerais</h4>';
            if (photo.numEvaluations > 0) {
                carouselHtml += '<table class="details-table"><tbody>';
                criteriaKeys.forEach(crit => {
                    const totalScoreForCrit = photo.criteriaScores[crit] || 0;
                    const averageScore = (totalScoreForCrit / photo.numEvaluations).toFixed(2);
                    carouselHtml += `<tr><td>${formatCriterionName(crit)}</td><td>${averageScore}</td></tr>`;
                });
                carouselHtml += '</tbody></table>';
            } else {
                carouselHtml += '<p>Nenhuma avaliação ainda.</p>';
            }
            carouselHtml += '</div>';
            
            if (photo.numEvaluations > 0) {
                // Slides seguintes: Avaliações Individuais
                photo.ratings.forEach((evaluation, index) => {
                    carouselHtml += '<div class="details-carousel-slide">';
                    carouselHtml += `<h4>Avaliação de: ${evaluation.evaluator}</h4>`;
                    carouselHtml += '<table class="details-table"><tbody>';
                    for (const crit in evaluation.scores) { // Agora os scores já vêm normalizados
                        carouselHtml += `<tr><td>${formatCriterionName(crit)}</td><td>${evaluation.scores[crit]}</td></tr>`;
                    }
                    carouselHtml += '</tbody></table>';
                    carouselHtml += `<p><strong>Comentários:</strong> ${evaluation.comments || 'Nenhum'}</p>`;
                    carouselHtml += '</div>';
                });
            }

            carouselHtml += `
                    </div>
                </div>
            `;

            if (photo.numEvaluations > 0) {
                carouselHtml += `
                    <div class="details-carousel-navigation">
                        <button class="evaluator-nav-btn prev-evaluator" disabled>&lt;</button>
                        <button class="evaluator-nav-btn next-evaluator">&gt;</button>
                    </div>
                `;
            }

            detailsPanel.innerHTML = carouselHtml;

            if (photo.numEvaluations > 0) {
                const track = detailsPanel.querySelector('.details-carousel-track');
                const prevBtn = detailsPanel.querySelector('.prev-evaluator');
                const nextBtn = detailsPanel.querySelector('.next-evaluator');
                const totalSlides = photo.numEvaluations + 1;
                let currentIndex = 0;

                function updateCarousel() {
                    track.style.transform = `translateX(-${currentIndex * 100}%)`;
                    prevBtn.disabled = currentIndex === 0;
                    nextBtn.disabled = currentIndex === totalSlides - 1;
                }

                prevBtn.addEventListener('click', () => {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateCarousel();
                    }
                });

                nextBtn.addEventListener('click', () => {
                    if (currentIndex < totalSlides - 1) {
                        currentIndex++;
                        updateCarousel();
                    }
                });
            }
        }

        function showAdminImageModal(photo) {
            const modal = document.getElementById('image-modal-admin');
            const modalImg = document.getElementById('modal-image-content-admin');
            const captionText = document.getElementById('modal-image-caption-admin');
            const closeSpan = modal.querySelector('.image-modal-close');

            modal.style.display = 'flex';
            modalImg.src = photo.url;
          
            const categoryDisplayNames = {
                'fauna': 'Fauna', 'flora': 'Flora', 'agua': 'Água',
                'destruicao': 'Destruição do Cerrado', 'pesquisas': 'Pesquisas Científicas',
                'religiosidade': 'Religiosidade', 'povos': 'Povos Tradicionais'
            };
            const formattedCategory = categoryDisplayNames[photo.category] || photo.category.replace(/_/g, ' ');

            captionText.innerHTML = `<span>${photo.participant}</span><span> Categoria: ${formattedCategory}</span>`;

            const closeModal = () => modal.style.display = "none";
            
            closeSpan.onclick = closeModal;
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            };
        }
    }

    async function handleEvaluationPage() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.addEventListener('click', logout);

        const categorySelect = document.getElementById('category-select');
        const photoImg = document.getElementById('photo-to-evaluate');
        const photoInfo = document.getElementById('photo-info');
        const prevBtn = document.getElementById('prev-photo');
        const nextBtn = document.getElementById('next-photo');
        const evaluationForm = document.getElementById('evaluation-form');
        const sliders = document.querySelectorAll('.criterion input[type="range"]');
        const categoryTitle = document.getElementById('current-category-title');
        const evaluatedMessageDiv = document.getElementById('already-evaluated-message');

        let currentCategory = categorySelect.value;
        let currentPhotoIndex = 0;

        const categoryDisplayNames = {
            'fauna': 'Fauna',
            'flora': 'Flora',
            'agua': 'Água',
            'destruicao': 'Destruição do Cerrado',
            'pesquisas': 'Pesquisas Científicas',
            'religiosidade': 'Religiosidade',
            'povos': 'Povos Tradicionais'
        };
        function displayPhoto(category, index) {
            const photosInCategory = photos[category];
            if (photosInCategory && photosInCategory.length > 0) {
                photoImg.src = photosInCategory[index].url;
                photoInfo.textContent = `Foto ${index + 1} de ${photosInCategory.length}`;
                prevBtn.disabled = index === 0;
                categoryTitle.textContent = categoryDisplayNames[category] || category.replace(/_/g, ' ');
                nextBtn.disabled = index === photosInCategory.length - 1;
            } else {
                photoImg.src = 'https://placehold.co/400x300/grey/white?text=Sem+fotos';
                photoInfo.textContent = 'Nenhuma foto nesta categoria.';
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                setFormState(true, 'Nenhuma foto para avaliar');
                return;
            }

            const currentPhoto = photosInCategory ? photosInCategory[index] : null;
            const existingEvaluation = currentPhoto ? currentPhoto.ratings.find(r => r.evaluator === loggedInUser.username) : null;

            if (existingEvaluation) {
                for (const crit in existingEvaluation.scores) {
                    const slider = document.getElementById(crit);
                    const valueSpan = document.getElementById(`${crit}-value`);
                    if (slider && valueSpan) {
                        slider.value = existingEvaluation.scores[crit];
                        valueSpan.textContent = slider.value;
                    }
                }
                document.getElementById('comments').value = existingEvaluation.comments || '';

                setFormState(true, 'Você já avaliou esta foto!');
                evaluationForm.classList.add('evaluated');
                evaluatedMessageDiv.textContent = 'Você já avaliou esta foto!';
                evaluatedMessageDiv.style.display = 'block';
            } else {
                resetForm();
                setFormState(false, 'Enviar Avaliação');
                evaluationForm.classList.remove('evaluated');
                evaluatedMessageDiv.style.display = 'none';
            }
        }

        function preloadCategoryImages(category) {
            const photosInCategory = photos[category];
            if (photosInCategory) {
                
                photosInCategory.forEach(photo => {
                    new Image().src = photo.url;
                });
            }
        }

        function setFormState(disabled, buttonText) {
            sliders.forEach(slider => slider.disabled = disabled);
            document.getElementById('comments').disabled = disabled;
            evaluationForm.querySelector('button[type="submit"]').disabled = disabled;
            evaluationForm.querySelector('button[type="submit"]').textContent = buttonText;
        }

        function resetForm() {
            evaluationForm.reset();
            sliders.forEach(slider => {
                const valueSpan = document.getElementById(`${slider.id}-value`);
                if (valueSpan) {
                    valueSpan.textContent = slider.value;
                }
            });
        }

        categorySelect.addEventListener('change', () => {
            currentCategory = categorySelect.value;
            photoImg.src = 'https://placehold.co/400x300/grey/white?text=Carregando...';
            currentPhotoIndex = 0;
            displayPhoto(currentCategory, currentPhotoIndex);
            preloadCategoryImages(currentCategory);
        });

        nextBtn.addEventListener('click', () => {
            if (currentPhotoIndex < photos[currentCategory].length - 1) {
                currentPhotoIndex++;
                photoImg.src = 'https://placehold.co/400x300/grey/white?text=Carregando...';
                displayPhoto(currentCategory, currentPhotoIndex);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentPhotoIndex > 0) {
                currentPhotoIndex--;
                photoImg.src = 'https://placehold.co/400x300/grey/white?text=Carregando...';
                displayPhoto(currentCategory, currentPhotoIndex);
            }
        });

        sliders.forEach(slider => {
            slider.addEventListener('input', () => {
                const valueSpan = document.getElementById(`${slider.id}-value`);
                if (valueSpan) {
                    valueSpan.textContent = slider.value;
                }
            });
        });

        evaluationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            showCustomConfirm('Tem certeza que deseja enviar esta avaliação?', async () => {
                const currentPhoto = photos[currentCategory][currentPhotoIndex];
                
                const evaluation = {
                    photoId: currentPhoto.id,
                    participant: currentPhoto.participant,
                    category: currentCategory,
                    evaluator: loggedInUser.username,
                    scores: {},
                    comments: document.getElementById('comments').value
                };

                sliders.forEach(slider => {
                    evaluation.scores[slider.id] = slider.value;
                });

                try {
                    // Salva a avaliação diretamente no Firestore
                    const result = await saveEvaluation(evaluation);

                    if (result.status !== 'success') throw new Error(result.message || 'Falha ao enviar avaliação para o servidor.');

                    const index = currentPhoto.ratings.findIndex(r => r.evaluator === loggedInUser.username);
                    if (index > -1) {
                        currentPhoto.ratings[index] = evaluation;
                    } else {
                        currentPhoto.ratings.push(evaluation);
                    }

                    displayPhoto(currentCategory, currentPhotoIndex);

                    // Lógica de navegação após o sucesso da avaliação
                    const isLastPhotoInCategory = currentPhotoIndex >= photos[currentCategory].length - 1;

                    if (isLastPhotoInCategory) {
                        const currentCategoryIndex = Array.from(categorySelect.options).findIndex(opt => opt.value === currentCategory);
                        const isLastCategory = currentCategoryIndex >= categorySelect.options.length - 1;

                        if (isLastCategory) {
                            showCustomAlert('Parabéns! Você avaliou todas as fotos de todas as categorias.');
                        } else {
                            showCustomAlert('Você avaliou todas as fotos desta categoria! Avançando para a próxima...', () => {
                                const nextCategoryIndex = currentCategoryIndex + 1;
                                categorySelect.selectedIndex = nextCategoryIndex;
                                categorySelect.dispatchEvent(new Event('change'));
                            });
                        }
                    } else {
                        showCustomAlert('Sua avaliação foi registrada com sucesso!', () => {
                            nextBtn.click(); // Avança para a próxima foto na mesma categoria
                        });
                    }

                } catch (error) {
                    console.error('Erro ao enviar avaliação:', error);
                    showCustomAlert('Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
                }
            });
        });

        await fetchPhotos();
        displayPhoto(currentCategory, currentPhotoIndex);
        preloadCategoryImages(currentCategory);

        const imageModal = document.getElementById('image-modal');
        const modalImageContent = document.getElementById('modal-image-content');
        const closeModal = imageModal.querySelector('.image-modal-close');

        photoImg.addEventListener('click', () => {
            imageModal.style.display = 'flex';
            modalImageContent.src = photoImg.src;
        });

        const closeImageModal = () => {
            imageModal.style.display = 'none';
        };

        closeModal.addEventListener('click', closeImageModal);
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) closeImageModal();
        });
    }

    function logout() {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    }
});