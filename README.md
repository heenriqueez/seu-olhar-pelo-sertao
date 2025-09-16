 # Seu Olhar Pelo Sertão - Plataforma de Avaliação de Concurso Fotográfico
 
 ![Logo UFJ](assets/cropped-LOGO_ICON.png)
 
 ## 📝 Sobre o Projeto
 
 **Seu Olhar Pelo Sertão** é uma aplicação web exclusiva desenvolvida para a **Universidade Federal de Jataí (UFJ)**. Sua finalidade é servir como plataforma para a avaliação de fotografias submetidas a um concurso cultural, permitindo que avaliadores qualificados deem notas e feedback de forma estruturada e centralizada.
 
 O sistema possui duas interfaces principais:
 
 1.  **Painel do Administrador:** Permite a sincronização das fotos a partir de uma pasta no Google Drive, visualização de todas as imagens, acompanhamento do ranking em tempo real por categoria e exportação dos dados de classificação em formato CSV.
 2.  **Painel do Avaliador:** Oferece uma interface focada para que os avaliadores naveguem entre as fotos de diferentes categorias, atribuam notas de 1 a 10 para múltiplos critérios e adicionem comentários.
 
 ## 🚀 Arquitetura e Tecnologias
 
 A aplicação é construída com tecnologias web front-end e utiliza o **Google Apps Script** como um backend simplificado para interagir com o **Google Drive** e o **Google Sheets**.
 
 -   **Front-end:** HTML5, CSS3, JavaScript (Vanilla JS)
 -   **Backend (Serverless):** Google Apps Script
 -   **Banco de Dados/Armazenamento:** Google Drive (para as imagens) e Google Sheets (para armazenar as avaliações).
 
 ## 🛠️ Configuração e Uso
 
 1.  **Backend (Google Apps Script):**
     -   É necessário ter um script no Google Apps Script que gerencia a busca de fotos no Google Drive e o salvamento das avaliações em uma Planilha Google.
     -   Após publicar o script como um aplicativo web, a URL gerada deve ser inserida na constante `GOOGLE_SCRIPT_URL` no arquivo `assets/js/database.js`.
 
 2.  **Front-end:**
     -   Basta hospedar os arquivos (HTML, CSS, JS) em qualquer servidor web. A aplicação pode ser acessada diretamente pelo navegador.
     -   Os usuários e senhas são gerenciados (atualmente de forma insegura) no arquivo `assets/js/database.js`.
 