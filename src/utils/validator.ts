// src/utils/validator.ts
export class Validator {
  // Valider un email
  static isValidEmail(email: string): boolean {
    // TODO : utilise regex pour valider email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Valider un nom de joueur
  static isValidPlayerName(name: string): boolean {
    // TODO : vérifie que le nom a entre 3 et 20 caractères
    return name.length >= 3 && name.length <= 20;
  }
  
  // Valider une mise
  static isValidStake(stake: number, playerPoints: number): boolean {
    // TODO : vérifie que la mise est valide
    return stake >= 200 && stake <= playerPoints;
  }
}
