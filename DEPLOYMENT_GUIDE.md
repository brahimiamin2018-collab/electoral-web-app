# Guide de Déploiement : Application Web de Gestion Électorale

Ce document contient les instructions complètes pour exécuter l'application localement en 1 clic ou la publier gratuitement sur Internet (Cloud).

---

## Option 1 : Utilisation Locale en 1 Clic (Sur votre PC)

Le projet intègre un exécutable Windows automatique :

1. Ouvrez le dossier du projet :
   `C:\Users\93SAL\.gemini\antigravity\scratch\electoral_web_app`
2. Double-cliquez sur le fichier **`START_APP.bat`**.
3. Le serveur se lance automatiquement et votre navigateur web s'ouvre directement sur :
   👉 **http://localhost:5000**

---

## Option 2 : Mise en Ligne Gratuite sur Internet (Render.com / Cloud)

Pour donner accès à l'application à vos encadrants à distance depuis leur smartphone ou PC portable (sans VPN) :

### Étape 1 : Publier le code sur GitHub (Privé ou Public)
1. Créez un compte sur [GitHub.com](https://github.com).
2. Créez un nouveau dépôt nommé `electoral-web-app`.
3. Envoyez les fichiers du dossier `electoral_web_app` vers votre dépôt GitHub.

### Étape 2 : Déploiement 1-Clic sur Render (Gratuit)
1. Allez sur [Render.com](https://render.com) et créez un compte gratuit.
2. Cliquez sur **New +** -> **Web Service**.
3. Connectez votre compte GitHub et sélectionnez le dépôt `electoral-web-app`.
4. Render détectera automatiquement le fichier `render.yaml` :
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node server.js`
5. Cliquez sur **Create Web Service**.

En moins de 2 minutes, votre application sera en ligne avec une URL sécurisée HTTPS du type :
👉 `https://electoral-web-app.onrender.com`

---

## Caractéristiques Techniques de Production
- **Base de Données** : SQLite locale indexée `electoral.db` (150 367 électeurs).
- **Serveur Unifié** : Express.js sur le port 5000 servant à la fois l'API REST et le bundle React compilé (`dist/`).
- **Rôles & Sécurité** : Mode Administrateur (`admin123`) vs Mode Utilisateur simple.
