# 🆓 Como Configurar Google Fit API (GRATUITA!)

Este guia passo-a-passo mostra como configurar a integração **100% gratuita** com Google Fit.

---

## ✅ Pré-requisitos

- Conta Google (gmail)
- Navegador moderno (Chrome, Edge, Firefox)
- Dispositivo Android com Google Fit OU smartwatch compatível

---

## 📋 Passo 1: Criar Projeto no Google Cloud

1. **Acesse** [Google Cloud Console](https://console.cloud.google.com/)

2. **Crie um novo projeto:**
   - Clique em "Select a project" (topo da página)
   - Clique em "NEW PROJECT"
   - Nome do projeto: `CardioRisk AI`
   - Clique em "CREATE"

3. **Aguarde** a criação do projeto (~30 segundos)

---

## 🔌 Passo 2: Ativar Google Fit API

1. **No menu lateral**, vá em: **APIs & Services** → **Library**

2. **Pesquise** por "Fitness API"

3. **Clique** em "Fitness API"

4. **Clique** em "ENABLE" (Ativar)

5. **Aguarde** a ativação (~10 segundos)

---

## 🔑 Passo 3: Criar Credenciais OAuth 2.0

### 3.1. Configurar Tela de Consentimento

1. **No menu lateral**, vá em: **APIs & Services** → **OAuth consent screen**

2. **Escolha** "External" (externo)

3. **Clique** em "CREATE"

4. **Preencha as informações:**
   - **App name**: CardioRisk AI
   - **User support email**: seu-email@gmail.com
   - **Developer contact**: seu-email@gmail.com

5. **Clique** em "SAVE AND CONTINUE"

6. **Em Scopes**, clique em "ADD OR REMOVE SCOPES"

7. **Procure e selecione** estes scopes:
   ```
   .../auth/fitness.activity.read
   .../auth/fitness.heart_rate.read
   .../auth/fitness.sleep.read
   .../auth/fitness.body.read
   .../auth/fitness.location.read
   .../auth/fitness.oxygen_saturation.read
   .../auth/fitness.blood_pressure.read
   ```

8. **Clique** em "UPDATE" → "SAVE AND CONTINUE"

9. **Em Test users**, adicione seu email do Gmail

10. **Clique** em "SAVE AND CONTINUE" → "BACK TO DASHBOARD"

### 3.2. Criar Client ID

1. **No menu lateral**, vá em: **APIs & Services** → **Credentials**

2. **Clique** em "CREATE CREDENTIALS" → "OAuth client ID"

3. **Application type**: Web application

4. **Name**: CardioRisk AI - Web Client

5. **Authorized JavaScript origins**:
   ```
   http://localhost:8080
   http://127.0.0.1:8080
   ```
   
   *(Se você for hospedar online, adicione também seu domínio, ex: `https://seusite.com`)*

6. **Authorized redirect URIs**:
   ```
   http://localhost:8080/oauth_callback.html
   http://127.0.0.1:8080/oauth_callback.html
   ```
   
   *(Se você for hospedar online, adicione também: `https://seusite.com/oauth_callback.html`)*

7. **Clique** em "CREATE"

8. **COPIE** o **Client ID** que aparece (algo como: `123456789-abc.apps.googleusercontent.com`)

---

## ⚙️ Passo 4: Configurar o Código

1. **Abra** o arquivo [`google_fit_config.js`](file:///c:/Users/Rin6/app%20cardiaco/google_fit_config.js)

2. **Substitua** `'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'` pelo Client ID que você copiou:

```javascript
CLIENT_ID: '123456789-abc.apps.googleusercontent.com',  // ← Cole aqui
```

3. **Se necessário**, ajuste o `REDIRECT_URI` caso esteja hospedando em outro lugar:

```javascript
REDIRECT_URI: window.location.origin + '/oauth_callback.html',
```

4. **Salve** o arquivo

---

## 🚀 Passo 5: Rodar o Servidor Local

Você precisa servir os arquivos via HTTP (não funciona abrindo diretamente no navegador).

### Opção A: Python (Recomendado)

```bash
# Se você tem Python 3
cd "c:\Users\Rin6\app cardiaco"
python -m http.server 8080
```

### Opção B: Node.js (http-server)

```bash
# Instalar (apenas uma vez)
npm install -g http-server

# Rodar
cd "c:\Users\Rin6\app cardiaco"
http-server -p 8080
```

### Opção C: VS Code Live Server

1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

---

## 🔗 Passo 6: Conectar Google Fit

1. **Abra o navegador** em: `http://localhost:8080/wearable_setup.html`

2. **Clique** em "Conectar Google Fit"

3. **Faça login** com sua conta Google

4. **Autorize** o acesso aos dados do Google Fit

5. **Aguarde** o redirecionamento automático

6. **Pronto!** Seus dados serão sincronizados automaticamente

---

## 📱 Passo 7: Garantir que Google Fit Está Rastreando

### No Android:

1. Abra o app **Google Fit**
2. Vá em **Perfil** (ícone de pessoa)
3. Toque em **Configurações** ⚙️
4. Ative:
   - ✅ Rastreamento de atividades
   - ✅ Frequência cardíaca (~se disponível)
   - ✅ Sono (~se disponível)

### Com Smartwatch (Wear OS):

1. Pareie seu smartwatch com o celular
2. Abra **Google Fit** no relógio
3. Permita rastreamento contínuo

---

## 🔍 Verificar se Está Funcionando

1. Abra o **Console do Navegador** (F12)
2. Vá para a aba **Console**
3. Você deve ver:
   ```
   Wearable devices connected, starting sync...
   Sincronizando dados do Google Fit...
   ```

4. Se aparecerem dados de FC, passos ou sono, **ESTÁ FUNCIONANDO!** ✅

---

## ❓ Problemas Comuns

### "API não configurada"
→ Verifique se você colocou o Client ID correto em `google_fit_config.js`

### "Redirect URI mismatch"
→ Certifique-se de que adicionou `http://localhost:8080/oauth_callback.html` nas URIs autorizadas no Google Cloud Console

### "Access denied"
→ Adicione seu email como "test user" na tela de consentimento OAuth

### "Nenhum dado aparece"
→ Verifique se o Google Fit app está rastreando dados no seu celular/relógio

### "Token expirado"
→ Tokens duram 1 hora. Basta reconectar clicando novamente em "Conectar Google Fit"

---

## 📊 Dados Disponíveis

Com Google Fit API (gratuita), você terá acesso a:

✅ **Frequência Cardíaca** (se dispositivo compatível)  
✅ **Passos**  
✅ **Calorias**  
✅ **Distância**  
✅ **Sono** (se rastreado)  
✅ **Atividades** (corrida, ciclismo, etc.)  
⚠️ **HRV**: Não disponível via REST API (apenas via Android SDK)  
⚠️ **SpO2**: Limitado (depende do dispositivo)  
⚠️ **Pressão Arterial**: Requer entrada manual no app

---

## 🎯 Próximos Passos

1. ✅ Configurar Google Fit (você acabou de fazer!)
2. 🔄 Deixar o app aberto sincronizando por alguns dias
3. 📊 Visualizar alertas baseados nos seus dados reais
4. 🚀 (Opcional) Hospedar online para acesso de qualquer lugar

---

## 🌐 Hospedagem Online (Opcional)

Se você quiser usar de qualquer lugar (não apenas localhost):

### Opção 1: GitHub Pages (Gratuito)

```bash
# Já está no GitHub! Basta ativar Pages:
# 1. Vá em Settings → Pages
# 2. Source: Deploy from branch "main"
# 3. Acesse em: https://nayr-rc.github.io/app-cardiaco
```

Depois, adicione nas **Authorized JavaScript origins** e **Redirect URIs**:
```
https://nayr-rc.github.io
https://nayr-rc.github.io/app-cardiaco/oauth_callback.html
```

### Opção 2: Netlify/Vercel (Gratuito)

1. Importe o repositório GitHub
2. Deploy automático
3. Adicione o domínio nas configurações OAuth

---

## 💰 Custos

**Google Fit API: 100% GRATUITA!** 🎉

- ✅ 10.000 requests/dia (mais que suficiente)
- ✅ Sem custo mensal
- ✅ Sem taxas por usuário
- ✅ Sem limite de dispositivos

---

## 🔒 Privacidade

- Seus dados ficam armazenados localmente no navegador (localStorage)
- Nunca enviamos dados para servidores externos
- Google Fit só compartilha dados que você autorizar
- Você pode desconectar a qualquer momento

---

## 📚 Documentação Oficial

- [Google Fit REST API Docs](https://developers.google.com/fit/rest)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Data Types Reference](https://developers.google.com/fit/datatypes)

---

**Precisa de ajuda?** Abra uma issue no GitHub! 🚀
