# 🗄️ Configuration Base de Données - GuruGammon

## Recommandation : Supabase (PostgreSQL)

### Pourquoi Supabase ?
- ✅ **Fiable** : Backed by PostgreSQL 15
- ✅ **Gratuit** : 500MB, 2 projets gratuits pour toujours
- ✅ **Auto-géré** : Backups, migrations, scaling
- ✅ **Open Source** : Pas de vendor lock-in
- ✅ **Dashboard** : Interface web pour gérer les données

---

## 📋 Configuration en 5 minutes

### Étape 1 : Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Cliquer "Start your project" (connexion GitHub/Google)
3. Créer un nouveau projet "gurugammon"
4. Choisir une région (eu-west pour France)
5. Définir un mot de passe fort

### Étape 2 : Récupérer l'URL de connexion

1. Dans le dashboard Supabase, aller dans **Settings > Database**
2. Copier "Connection string" (URI)
3. Format : `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

### Étape 3 : Configurer le projet

1. Copier `.env.example` vers `.env`
2. Remplacer `DATABASE_URL` par votre connection string

```bash
DATABASE_URL="postgresql://postgres:VotreMDP@db.xxxxx.supabase.co:5432/postgres"
```

### Étape 4 : Appliquer les migrations

```bash
npx prisma db push
```

---

## 🔧 Configuration automatique

### Option A : Script de setup
```bash
# Créer le fichier .env avec votre URL
echo 'DATABASE_URL="VOTRE_URL_SUPABASE"' > .env
npx prisma generate
npx prisma db push
```

### Option B : Variables d'environnement (Production)
```bash
# Fly.io
fly secrets set DATABASE_URL="postgresql://..."

# Render
# Dashboard > Environment > Add DATABASE_URL

# Vercel
vercel env add DATABASE_URL
```

---

## 📊 Schéma actuel

Le projet contient **25+ tables** prêtes :

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs, ELO, stats |
| `games` | Parties de backgammon |
| `game_moves` | Historique des coups |
| `matches` | Matches avec cube |
| `tournaments` | Système de tournois |
| `analyses` | Analyses GuruBot IA |
| `subscriptions` | Abonnements Stripe |
| `user_achievements` | Badges et succès |
| `season_leaderboard` | Classements |

---

## 🔐 Sécurité

### Variables sensibles
```
DATABASE_URL=...         # Ne jamais commit
JWT_SECRET=...           # Générer avec: openssl rand -base64 32
CLERK_SECRET_KEY=...     # Dashboard Clerk
STRIPE_SECRET_KEY=...    # Dashboard Stripe
```

### Row Level Security (RLS)
Supabase supporte RLS pour sécuriser les accès aux données directement dans PostgreSQL.

---

## 🚀 Production Checklist

- [ ] Créer projet Supabase
- [ ] Configurer DATABASE_URL
- [ ] `npx prisma db push`
- [ ] Vérifier les tables dans le dashboard
- [ ] Configurer les backups (auto avec Supabase)
- [ ] Activer RLS si accès direct

---

## 🆘 Support

### Problèmes courants

**Erreur : Connection refused**
```
Vérifiez que DATABASE_URL est correct et que l'IP n'est pas bloquée
```

**Erreur : Permission denied**
```
Vérifiez le mot de passe dans l'URL
```

**Erreur : Table does not exist**
```
Exécutez: npx prisma db push
```

---

*Documentation mise à jour le 18/12/2025*
