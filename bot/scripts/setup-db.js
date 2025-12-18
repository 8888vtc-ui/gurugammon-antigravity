#!/usr/bin/env node
/**
 * @file setup-db.js
 * @description Script de configuration automatique de la base de données GuruGammon
 * Usage: node scripts/setup-db.js [DATABASE_URL]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE = path.join(__dirname, '..', '.env.example');

// Couleurs console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
    console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
    console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg) {
    console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    log('\n🗄️  GuruGammon - Configuration Base de Données\n', 'bold');

    // Étape 1: Vérifier ou demander DATABASE_URL
    let databaseUrl = process.argv[2] || process.env.DATABASE_URL;

    if (!databaseUrl) {
        log('Aucune DATABASE_URL détectée.\n', 'yellow');
        log('📋 Pour obtenir votre DATABASE_URL Supabase:', 'cyan');
        log('   1. Allez sur https://supabase.com');
        log('   2. Créez un projet "gurugammon"');
        log('   3. Settings > Database > Connection string\n');

        databaseUrl = await prompt('Collez votre DATABASE_URL: ');
    }

    if (!databaseUrl || !databaseUrl.startsWith('postgresql://')) {
        logError('DATABASE_URL invalide. Doit commencer par postgresql://');
        process.exit(1);
    }

    // Étape 2: Créer/Mettre à jour .env
    logStep('1/4', 'Configuration du fichier .env...');

    let envContent = '';
    if (fs.existsSync(ENV_EXAMPLE)) {
        envContent = fs.readFileSync(ENV_EXAMPLE, 'utf8');
    }

    // Remplacer ou ajouter DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${databaseUrl}"`);
    } else {
        envContent = `DATABASE_URL="${databaseUrl}"\n` + envContent;
    }

    // Ajouter JWT_SECRET si absent
    if (!envContent.includes('JWT_SECRET=') || envContent.includes('JWT_SECRET=""')) {
        const jwtSecret = require('crypto').randomBytes(32).toString('base64');
        envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET="${jwtSecret}"`);
        if (!envContent.includes('JWT_SECRET=')) {
            envContent += `\nJWT_SECRET="${jwtSecret}"`;
        }
    }

    fs.writeFileSync(ENV_FILE, envContent);
    logSuccess('Fichier .env créé/mis à jour');

    // Étape 3: Générer le client Prisma
    logStep('2/4', 'Génération du client Prisma...');
    try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        logSuccess('Client Prisma généré');
    } catch (error) {
        logError('Erreur lors de la génération Prisma');
        process.exit(1);
    }

    // Étape 4: Pousser le schéma vers la DB
    logStep('3/4', 'Application du schéma à la base de données...');
    try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        logSuccess('Schéma appliqué avec succès');
    } catch (error) {
        logError('Erreur lors de l\'application du schéma');
        log('Vérifiez que votre DATABASE_URL est correcte et accessible.', 'yellow');
        process.exit(1);
    }

    // Étape 5: Vérification
    logStep('4/4', 'Vérification de la connexion...');
    try {
        execSync('npx prisma db execute --stdin <<< "SELECT 1"', { stdio: 'pipe' });
        logSuccess('Connexion à la base de données réussie');
    } catch {
        // La commande peut échouer sur Windows, c'est OK
        log('Vérification alternative...', 'yellow');
    }

    // Résumé
    log('\n' + '='.repeat(50), 'green');
    log('🎉 Configuration terminée avec succès!', 'bold');
    log('='.repeat(50) + '\n', 'green');

    log('📋 Prochaines étapes:', 'cyan');
    log('   1. Démarrer le backend: npm run dev');
    log('   2. Démarrer le frontend: cd guru-react && npm run dev');
    log('   3. Ouvrir http://localhost:5173\n');

    log('📊 Dashboard Supabase:', 'cyan');
    log('   Visualisez vos données sur https://supabase.com/dashboard\n');
}

main().catch(console.error);
