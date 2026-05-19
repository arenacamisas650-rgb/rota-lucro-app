/**
 * RotaLucro - Módulo de Backup Protetor e Integridade
 * Gerencia importação, exportação de dados com verificação de integridade e criptografia local leve.
 */

// Chave XOR de criptografia estática para obfuscação dos dados locais no backup JSON
const BACKUP_SECRET_KEY = 'rotalucro_premium_backup_protection';

const xorCipher = (text, key) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

export const BackupService = {
  // Exporta backup criptografado ou em formato legível
  exportBackup(state, encrypt = true) {
    const rawData = {
      user: state.user,
      onboardingDone: state.onboardingDone,
      vehicles: state.vehicles,
      activeVehicleId: state.activeVehicleId,
      runs: state.runs,
      rides: state.rides,
      shifts: state.shifts,
      activeShift: state.activeShift,
      goals: state.goals,
      fuelLogs: state.fuelLogs,
      maintenanceLogs: state.maintenanceLogs,
      syncSettings: state.syncSettings,
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };

    const jsonString = JSON.stringify(rawData, null, 2);
    let finalContent = jsonString;
    let fileName = `rotalucro_backup_${new Date().toISOString().split('T')[0]}.json`;

    if (encrypt) {
      // Obfusca com base64 e XOR
      const obfuscated = xorCipher(jsonString, BACKUP_SECRET_KEY);
      finalContent = btoa(unescape(encodeURIComponent(obfuscated)));
      fileName = `rotalucro_secure_backup_${new Date().toISOString().split('T')[0]}.rlb`;
    }

    const blob = new Blob([finalContent], { type: encrypt ? 'application/octet-stream' : 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Lê e valida arquivo de backup importado
  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result.trim();
          let parsedData = null;

          // Tenta ler como JSON simples primeiro
          try {
            parsedData = JSON.parse(content);
          } catch (jsonErr) {
            // Se falhar, tenta desencriptar como arquivo obfuscado (.rlb)
            try {
              const decodedBase64 = decodeURIComponent(escape(atob(content)));
              const decrypted = xorCipher(decodedBase64, BACKUP_SECRET_KEY);
              parsedData = JSON.parse(decrypted);
            } catch (decryptionErr) {
              throw new Error('Arquivo de backup inválido ou corrompido.');
            }
          }

          // Validação de Integridade do Schema
          if (!parsedData || typeof parsedData !== 'object') {
            throw new Error('Formato de dados do backup inválido.');
          }

          const requiredKeys = ['vehicles', 'runs', 'rides', 'goals'];
          const missingKeys = requiredKeys.filter(k => !Object.hasOwn(parsedData, k));

          if (missingKeys.length > 0) {
            throw new Error(`Dados de backup incompletos. Chaves ausentes: ${missingKeys.join(', ')}`);
          }

          // Retorna os dados prontos para a store
          resolve({ success: true, data: parsedData });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo físico.'));
      
      if (file.name.endsWith('.rlb')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  }
};
