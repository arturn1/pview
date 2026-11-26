import ExcelJS from 'exceljs';
import { RequestError } from '../http/helpers';
import { normalizeEmail } from '../domain/validation';

export type ImportTask = { taskNumber: number; title: string; email: string; name: string; plannedMinutes: number | null; devOpsUrl: string | null };

export async function parseDevOpsWorkbook(bytes: Buffer): Promise<ImportTask[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(new Uint8Array(bytes).buffer);
  } catch {
    throw new RequestError(400, 'Não foi possível ler o arquivo XLSX.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new RequestError(400, 'A planilha não contém abas.');
  if (sheet.rowCount > 5001) throw new RequestError(400, 'A planilha excede o limite de 5.000 linhas.');
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, index) => {
    const key = String(cell.text).trim().toLowerCase();
    if (columns.has(key)) throw new RequestError(400, `Coluna duplicada: ${cell.text}.`);
    columns.set(key, index);
  });
  for (const column of ['title', 'id', 'assigned to', 'original estimate']) {
    if (!columns.has(column)) throw new RequestError(400, `Coluna obrigatória ausente: ${column}.`);
  }
  const tasks: ImportTask[] = [];
  const seen = new Set<number>();
  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    if (!row.hasValues) continue;
    const get = (column: string) => String(row.getCell(columns.get(column)!).text).trim();
    const title = get('title');
    const idText = get('id');
    const taskNumber = Number(idText);
    const idCell = row.getCell(columns.get('id')!);
    const devOpsUrl = idCell.isHyperlink ? idCell.hyperlink : null;
    if (devOpsUrl !== null) {
      let parsed: URL;
      try { parsed = new URL(devOpsUrl); }
      catch { throw new RequestError(400, `Linha ${index}: o hiperlink do ID é inválido.`); }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new RequestError(400, `Linha ${index}: o hiperlink do ID deve ser uma URL HTTP ou HTTPS válida.`);
    }
    const assigned = get('assigned to');
    const match = /^(.*?)\s*<([^<>]+)>$/.exec(assigned);
    let email: string | null;
    try { email = normalizeEmail(match ? match[2] : assigned); }
    catch { throw new RequestError(400, `Linha ${index}: Assigned To deve conter um e-mail válido.`); }
    const name = match?.[1].trim() || email;
    const estimate = get('original estimate');
    const hours = estimate && /^\d+(?:[.,]\d+)?$/.test(estimate) ? Number(estimate.replace(',', '.')) : NaN;
    const rawMinutes = hours * 60;
    const rounded = Math.round(rawMinutes);
    if (!title || !/^\d+$/.test(idText) || !Number.isSafeInteger(taskNumber) || taskNumber <= 0 || !email || !name) {
      throw new RequestError(400, `Linha ${index}: informe Title, ID positivo e Assigned To com e-mail.`);
    }
    if (estimate && (!Number.isSafeInteger(rounded) || rounded < 0 || Math.abs(rawMinutes - rounded) > 1e-8)) {
      throw new RequestError(400, `Linha ${index}: Original Estimate deve ser não negativo e ter precisão de minutos.`);
    }
    if (seen.has(taskNumber)) throw new RequestError(400, `Linha ${index}: ID ${taskNumber} duplicado na planilha.`);
    seen.add(taskNumber);
    tasks.push({ taskNumber, title, email, name, plannedMinutes: estimate ? rounded : null, devOpsUrl });
  }
  if (!tasks.length) throw new RequestError(400, 'A planilha não contém tarefas.');
  return tasks;
}
