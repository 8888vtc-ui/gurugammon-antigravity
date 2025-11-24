// src/services/gnubgRunnerDebug.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class GNUBGRunnerDebug {
  
  // Test simple pour voir le output brut de GNUBG
  static async testRawOutput() {
    try {
      // Créer un fichier de test simple
      const inputContent = `
new game
set position 1:2 24:-2
set player 0 human
set player 1 human
set dice 3 5
show board
hint
quit
      `.trim();
      
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const inputFile = path.join(tempDir, 'test_gnubg.txt');
      fs.writeFileSync(inputFile, inputContent);
      
      try {
        // Exécuter GNUBG avec chemin complet Windows
        const command = '"C:\\Program Files (x86)\\gnubg\\gnubg-cli.exe" -t < "' + inputFile + '"';
        console.log('Exécution de la commande:', command);
        
        const { stdout, stderr } = await execAsync(command, { 
          timeout: 10000,
          cwd: tempDir
        });
        
        console.log('=== STDOUT ===');
        console.log(stdout);
        console.log('=== STDERR ===');
        console.log(stderr);
        
        return { stdout, stderr };
        
      } finally {
        // Nettoyer
        if (fs.existsSync(inputFile)) {
          fs.unlinkSync(inputFile);
        }
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  }
}
